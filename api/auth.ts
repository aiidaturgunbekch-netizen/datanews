/**
 * /api/auth — регистрация и вход.
 *   POST { action: 'register', name, email, phone, organization?, password, plan, paymentRef? }
 *   POST { action: 'login', email, password }
 *   POST { action: 'admin-login', password }
 *   POST { action: 'payment', paymentRef }   (пользователь сообщает номер платежа)
 *   GET                                       (текущий пользователь по токену)
 *   GET ?check=storage                        (проверка подключения к базе, без секретов; вне Production — подробный отчёт)
 */
import { cmd, describeRestUrl, hgetJson, hsetJson, isConfigured, isMemoryMode, StorageError } from './_lib/kv';
import { describeValue, env, rawEnv, redisSources } from './_lib/env';
import {
  checkAdminPassword,
  handler,
  hashPassword,
  HttpError,
  json,
  randomId,
  rateLimit,
  readBody,
  readSession,
  requireUser,
  signSession,
  verifyPassword,
} from './_lib/http';
import { newUser, StoredUser, toPublic, USERS_KEY } from './_lib/users';
import { normalizePlan, PLANS } from '../src/config/site';
import { getUsage, periodsOf } from './_lib/quota';

export const config = { runtime: 'edge' };

const clean = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

/**
 * Отчёт о подключении к Upstash для Preview: какие имена переменных использованы, формат адреса и токена,
 * HTTP-статус и короткий текст ответа Upstash. Значений переменных в отчёте нет.
 */
const storageReport = async () => {
  const sources = redisSources();
  const urlRaw = rawEnv('KV_REST_API_URL');
  const urlValue = describeValue(urlRaw);
  const token = describeValue(rawEnv('KV_REST_API_TOKEN'));
  const url = {
    ...describeRestUrl(urlRaw),
    whitespaceAtEdges: urlValue.whitespaceAtEdges,
    quoted: urlValue.quoted,
    variableNamePasted: urlValue.variableNamePasted,
  };

  let upstash: Record<string, unknown>;
  if (!isConfigured()) upstash = { result: 'storage_not_configured' };
  else {
    try {
      await cmd('PING');
      upstash = { result: 'ok', httpStatus: 200 };
    } catch (e) {
      if (!(e instanceof StorageError)) throw e;
      upstash = { result: e.code, ...e.facts, message: e.message };
    }
  }

  // Короткий вывод по фактам — что именно не так
  const notes: string[] = [];
  if (isMemoryMode()) notes.push('Локальный режим разработки: база в памяти, Upstash не используется.');
  else if (!sources.url || !sources.token) notes.push('Сборка не получила адрес и/или токен: проверьте окружение и ветку переменных и сделайте Redeploy.');
  if (url.hostType === 'upstash-console-page') notes.push('В адресе — страница консоли Upstash, а не REST-адрес базы.');
  if (url.hostType === 'redis-connection-string') notes.push('В адресе — строка redis://…, а не REST-адрес https://…upstash.io.');
  if (url.hasPath) notes.push('В адресе есть путь после домена — REST-адрес должен заканчиваться на .upstash.io.');
  if (url.variableNamePasted || token.variableNamePasted) notes.push('В значение вставлено имя переменной («ИМЯ=…») — нужно только значение.');
  if (token.lineBreakInside || token.whitespaceInside) notes.push('Внутри токена есть пробел или перенос строки — токен вставлен не целиком одной строкой.');
  if (token.nonAsciiChars > 0) notes.push(`В токене ${token.nonAsciiChars} нелатинских или невидимых символов (например, маска •••).`);
  if (upstash.result === 'storage_auth_failed' && notes.length === 0) {
    notes.push(
      `Адрес и токен оформлены правильно, но Upstash ответил HTTP ${upstash.httpStatus}: этот токен не от базы по этому адресу (или токен был пересоздан в Upstash после копирования).`
    );
  }
  if (upstash.result === 'ok') notes.push('Подключение работает.');

  return {
    storage: upstash.result,
    deployment: {
      environment: env('VERCEL_ENV') || (isMemoryMode() ? 'local' : 'unknown'),
      branch: env('VERCEL_GIT_COMMIT_REF') || 'unknown',
      commit: (env('VERCEL_GIT_COMMIT_SHA') || '').slice(0, 7) || 'unknown',
    },
    variables: { urlFrom: sources.url, tokenFrom: sources.token, presentNames: sources.present },
    url,
    token,
    upstash,
    conclusion: notes,
  };
};

const authHandler = handler(async (req) => {
  if (req.method === 'GET') {
    // Проверка подключения к базе без пароля: /api/auth?check=storage → { storage: 'ok' } или код ошибки (без секретов)
    if (new URL(req.url).searchParams.get('check') === 'storage') {
      await cmd('PING');
      return json({ storage: 'ok' });
    }
    const s = await readSession(req);
    if (!s) return json({ role: 'guest' });
    if (s.role === 'admin') return json({ role: 'admin' });
    const u = await hgetJson<StoredUser>(USERS_KEY, s.sub);
    return u ? json({ role: 'user', user: { ...toPublic(u), periods: periodsOf(u) }, usage: await getUsage(u) }) : json({ role: 'guest' });
  }
  if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);

  const body = await readBody<Record<string, unknown>>(req, 20_000);
  const action = clean(body.action, 20);

  if (action === 'admin-login') {
    await rateLimit(req, 'admin', 5);
    if (!checkAdminPassword(String(body.password ?? ''))) throw new HttpError('wrong_password', 401, 'Неверный пароль');
    return json({ role: 'admin', token: await signSession('admin', 'admin', 7) });
  }

  if (action === 'register') {
    await rateLimit(req, 'register', 5);
    const user = await newUser(body);
    await hsetJson(USERS_KEY, user.email, user);
    return json({ role: 'user', user: toPublic(user), token: await signSession(user.email, 'user') }, 201);
  }

  if (action === 'login') {
    await rateLimit(req, 'login', 10);
    const email = clean(body.email, 120).toLowerCase();
    const u = await hgetJson<StoredUser>(USERS_KEY, email);
    if (!u || !(await verifyPassword(String(body.password ?? ''), u.salt, u.hash))) {
      throw new HttpError('wrong_credentials', 401, 'Неверный e-mail или пароль');
    }
    return json({ role: 'user', user: toPublic(u), usage: await getUsage(u), token: await signSession(email, 'user', 30, u.sessionVersion) });
  }

  if (action === 'logout') {
    // Выход пользователя: все его прежние входы (на всех устройствах) перестают действовать.
    // Вход администратора хранится только в браузере и удаляется там же.
    const s = await readSession(req);
    if (s?.role === 'user') {
      const u = await hgetJson<StoredUser>(USERS_KEY, s.sub);
      if (u) await hsetJson(USERS_KEY, s.sub, { ...u, sessionVersion: (u.sessionVersion || 0) + 1 });
    }
    return json({ ok: true });
  }

  if (action === 'payment') {
    const s = await requireUser(req);
    const u = await hgetJson<StoredUser>(USERS_KEY, s.sub);
    if (!u) throw new HttpError('not_found', 404);
    // Оплату можно заявить в любой момент: продление заранее начнётся после окончания текущего периода
    const paymentRef = clean(body.paymentRef, 120);
    if (!paymentRef) throw new HttpError('bad_payment_ref', 400, 'Укажите номер/код платежа');
    const plan = body.plan ? normalizePlan(body.plan) : normalizePlan(u.plan);
    // Тариф только для госорганов не выбирается без подачи заявки на подтверждение статуса
    if (PLANS[plan].govOnly && u.govStatus !== 'verified' && u.govStatus !== 'pending') {
      throw new HttpError('gov_request_required', 409, 'Сначала подайте заявку на подтверждение статуса госоргана');
    }
    const next: StoredUser = { ...u, plan, paymentRef, paymentStatus: 'pending' };
    await hsetJson(USERS_KEY, s.sub, next);
    return json({ user: toPublic(next), usage: await getUsage(next) });
  }

  if (action === 'gov-request') {
    // Заявка на подтверждение официального статуса. Статус НЕ присваивается автоматически
    // (ни по названию, ни по e-mail) — его подтверждает администратор после проверки.
    const s = await requireUser(req);
    await rateLimit(req, 'gov', 5, 3600, s.sub);
    const u = await hgetJson<StoredUser>(USERS_KEY, s.sub);
    if (!u) throw new HttpError('not_found', 404);
    if (u.govStatus === 'verified') return json({ user: toPublic(u), usage: await getUsage(u) });
    const orgName = clean(body.orgName, 200);
    const position = clean(body.position, 160);
    const officialSite = clean(body.officialSite, 300);
    const officialEmail = clean(body.officialEmail, 120).toLowerCase();
    const documentRef = clean(body.documentRef, 300);
    if (orgName.length < 3 || position.length < 2 || documentRef.length < 3) throw new HttpError('missing_field', 400, 'Заполните обязательные поля');
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(officialSite)) throw new HttpError('bad_url', 400, 'Укажите адрес официального сайта');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) throw new HttpError('bad_email', 400, 'Проверьте e-mail');
    const next: StoredUser = {
      ...u,
      govStatus: 'pending',
      gov: { orgName, position, officialSite, officialEmail, documentRef, requestedAt: new Date().toISOString() },
    };
    await hsetJson(USERS_KEY, s.sub, next);
    return json({ user: toPublic(next), usage: await getUsage(next) });
  }

  throw new HttpError('unknown_action', 400);
});

/** На Production — краткий ответ через общий обработчик; на Preview и локально — подробный отчёт без секретов */
export default async function authRoute(req: Request): Promise<Response> {
  const isCheck = req.method === 'GET' && new URL(req.url).searchParams.get('check') === 'storage';
  const detailed = env('VERCEL_ENV') === 'preview' || env('VERCEL_ENV') === 'development' || (!env('VERCEL_ENV') && isMemoryMode());
  if (isCheck && detailed) {
    try {
      return json(await storageReport());
    } catch (e) {
      console.error('[storage-report]', e instanceof Error ? e.name : 'unknown error');
      return json({ storage: 'report_failed' }, 500);
    }
  }
  return authHandler(req);
}
