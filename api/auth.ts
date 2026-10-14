/**
 * /api/auth — регистрация и вход.
 *   POST { action: 'register', name, email, phone, organization?, password, plan, paymentRef? }
 *   POST { action: 'login', email, password }
 *   POST { action: 'admin-login', password }
 *   POST { action: 'payment', paymentRef }   (пользователь сообщает номер платежа)
 *   GET                                       (текущий пользователь по токену)
 */
import { cmd, hgetJson, hsetJson } from './_lib/kv';
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
import { StoredUser, toPublic, USERS_KEY } from './_lib/users';
import { normalizePlan, PLANS } from '../src/config/site';
import { getUsage, periodsOf } from './_lib/quota';

export const config = { runtime: 'edge' };

const clean = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export default handler(async (req) => {
  if (req.method === 'GET') {
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
    const email = clean(body.email, 120).toLowerCase();
    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const password = String(body.password ?? '');
    const plan = normalizePlan(body.plan);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('bad_email', 400, 'Проверьте e-mail');
    if (name.length < 2) throw new HttpError('bad_name', 400, 'Укажите имя');
    if (phone.replace(/\D/g, '').length < 9) throw new HttpError('bad_phone', 400, 'Укажите телефон');
    if (password.length < 6) throw new HttpError('weak_password', 400, 'Пароль — не короче 6 символов');
    if (await hgetJson(USERS_KEY, email)) throw new HttpError('email_taken', 409, 'Этот e-mail уже зарегистрирован');

    const paymentRef = clean(body.paymentRef, 120);
    const user: StoredUser = {
      id: randomId('usr'),
      name,
      email,
      phone,
      organization: clean(body.organization, 160) || undefined,
      plan,
      paymentStatus: paymentRef ? 'pending' : 'unpaid',
      paymentRef: paymentRef || undefined,
      createdAt: new Date().toISOString(),
      ...(await hashPassword(password)),
    };
    await hsetJson(USERS_KEY, email, user);
    return json({ role: 'user', user: toPublic(user), token: await signSession(email, 'user') }, 201);
  }

  if (action === 'login') {
    await rateLimit(req, 'login', 10);
    const email = clean(body.email, 120).toLowerCase();
    const u = await hgetJson<StoredUser>(USERS_KEY, email);
    if (!u || !(await verifyPassword(String(body.password ?? ''), u.salt, u.hash))) {
      throw new HttpError('wrong_credentials', 401, 'Неверный e-mail или пароль');
    }
    return json({ role: 'user', user: toPublic(u), usage: await getUsage(u), token: await signSession(email, 'user') });
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
