/**
 * /api/push — push-уведомления (Web Push, VAPID, без платных сервисов).
 *   GET                         { publicKey, configured } — включены ли уведомления на сервере
 *   GET ?inbox=<id подписки>    уведомление для этой подписки (его забирает service worker)
 *   GET ?last=1                 последнее уведомление — для service worker старой версии
 *   POST { subscription, city, lang, topics }  подписаться / изменить темы (любой посетитель; не чаще 10 раз за 10 минут с IP)
 *   DELETE { endpoint }         отписаться
 *   GET ?stats=1                сводка по подписчикам (админ)
 *   GET ?log=1                  журнал последних отправок (админ)
 *   PATCH { annId }             разослать действующее предупреждение подписчикам его города / области (админ)
 *   PATCH { custom: {…} }       своё уведомление на трёх языках: город, тема, ссылка на публикацию или раздел (админ)
 *
 * Хранится только адрес подписки браузера, город, язык, темы, дата подписки и итог доставки — без имён, телефонов и email.
 *
 * Upstash:
 *   dn:push:subs   id подписки → { endpoint, city, lang, topics, at, lastOkAt, fails, lastError }
 *   dn:push:log    id уведомления → текст на трёх языках, ссылка, получатели и итог отправки (последние 200)
 *   dn:push:inbox  id подписки → id уведомления, которое ей отправлено последним
 *   dn:push:last   последнее уведомление (для service worker старой версии)
 * Сигнал приходит без содержимого; service worker по id своей подписки забирает именно своё уведомление —
 * поэтому подписчик одного города не увидит текст, отправленный в другой город.
 */
import type { Announcement, CityId, Language, LocalizedString } from '../src/types';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';
import { cmd, hgetJson, hsetJson, hvalsJson, pipeline } from './_lib/kv';
import { handler, HttpError, json, rateLimit, readBody, requireAdmin } from './_lib/http';
import { ANN_KEY, HIDDEN_KEY, isPublicItem, saveAnnouncement, withHistory } from './_lib/announcements';
import { isPushConfigured, isPushEndpoint, sendPush, vapidPublicKey } from './_lib/push';
import { env } from './_lib/env';
import { isAlert, isExpired } from '../src/utils/urgency';
import { kgNowLocal } from '../src/utils/time';
import { isCheckOnlyCopy } from '../src/utils/mergeAnnouncements';
import { RUBRICS } from '../src/config/rubrics';
import {
  DEFAULT_TOPICS,
  isPushTopic,
  PUSH_BODY_MAX,
  PUSH_DAILY_LIMIT,
  PUSH_LOG_LIMIT,
  PUSH_MIN_INTERVAL_MIN,
  PUSH_TITLE_MAX,
  PushTopic,
} from '../src/config/push';

export const config = { runtime: 'edge' };

export const SUBS_KEY = 'dn:push:subs';
export const LOG_KEY = 'dn:push:log';
export const INBOX_KEY = 'dn:push:inbox';
const LAST_KEY = 'dn:push:last';
const CITIES: (CityId | 'all')[] = ['all', 'bishkek', 'osh', 'chui', 'osh_region', 'issykkul', 'jalalabad', 'talas', 'naryn', 'batken'];
const LANGS: Language[] = ['ru', 'kg', 'en'];

export interface Sub {
  endpoint: string;
  city: CityId | 'all';
  lang?: Language;
  topics?: PushTopic[];
  /** дата подписки (время Бишкека) */
  at: string;
  lastOkAt?: string;
  /** неудачных доставок подряд */
  fails?: number;
  lastError?: string;
  lastErrorAt?: string;
}
export interface PushMessage {
  id: string;
  at: string;
  title: LocalizedString;
  body: LocalizedString;
  url: string;
}
export interface PushLogEntry extends PushMessage {
  kind: 'alert' | 'custom';
  annId?: string;
  city: CityId | 'all';
  topic: PushTopic;
  status: 'sending' | 'done';
  total: number;
  sent: number;
  removed: number;
  failed: number;
  /** ошибки по кодам ответа сервиса доставки (без адресов подписок) */
  errors: Record<string, number>;
}

/** Подписка недействующая: три неудачных доставки подряд (404/410 удаляются сразу) */
const MAX_FAILS = 3;
export const isActiveSub = (s: Sub) => (s.fails || 0) < MAX_FAILS;
const topicsOf = (s: Sub) => (s.topics && s.topics.length ? s.topics : DEFAULT_TOPICS);

export const subId = async (endpoint: string) => {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const str = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const text3 = (v: unknown, max: number, field: string): LocalizedString => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const ru = str(o.ru, max);
  if (!ru) throw new HttpError('missing_field', 400, `Заполните ${field} на русском`);
  return { ru, kg: str(o.kg, max) || ru, en: str(o.en, max) || ru };
};

/** Записи журнала, новые сверху */
const readLog = async () => (await hvalsJson<PushLogEntry>(LOG_KEY)).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));

/** Время Бишкека 'YYYY-MM-DDTHH:mm' → мс */
const kgMs = (local: string) => Date.parse(`${local.slice(0, 16)}:00+06:00`);

/** Защита от частых рассылок: интервал с прошлой рассылкой и предел за сутки */
const checkRate = (log: PushLogEntry[], kind: 'alert' | 'custom') => {
  const now = Date.now();
  const recent = log.filter((e) => now - kgMs(e.at) < 24 * 3600 * 1000);
  if (recent.length >= PUSH_DAILY_LIMIT) throw new HttpError('push_daily_limit', 429, `Не больше ${PUSH_DAILY_LIMIT} рассылок за сутки`);
  const last = log[0];
  const gap = PUSH_MIN_INTERVAL_MIN[kind];
  if (last && now - kgMs(last.at) < gap * 60 * 1000) throw new HttpError('push_too_often', 429, `Следующую рассылку можно отправить через ${gap} мин после предыдущей`);
};

/** Только опубликованная публикация сайта или раздел — произвольные адреса не принимаются */
const checkLink = async (raw: unknown): Promise<string> => {
  const url = str(raw, 200);
  if (url === '/') return url;
  const art = /^\/n\/([\w-]{1,80})$/.exec(url);
  if (art) {
    const id = art[1];
    const stored = await hgetJson<Announcement>(ANN_KEY, id);
    const hidden = await cmd<string | null>('HGET', HIDDEN_KEY, id);
    const ok = stored && !isCheckOnlyCopy(stored) ? isPublicItem(stored) : !hidden && INITIAL_ANNOUNCEMENTS.some((x) => x.id === id);
    if (!ok) throw new HttpError('bad_link', 400, 'Публикация не найдена или не опубликована');
    return url;
  }
  const rub = /^\/\?r=([\w-]{1,40})$/.exec(url);
  if (rub && RUBRICS.some((r) => r.id === rub[1])) return url;
  throw new HttpError('bad_link', 400, 'Ссылка — только на опубликованную новость или раздел сайта');
};

/** Рассылка: текст сохраняется под своим id, каждой подписке — ссылка на её уведомление, итог — в журнал */
const deliver = async (entry: PushLogEntry, origin: string) => {
  const all = await hvalsJson<Sub>(SUBS_KEY);
  const subs = all.filter(
    (s) =>
      topicsOf(s).includes(entry.topic) &&
      (s.city === 'all' || entry.city === 'all' || s.city === entry.city || (s.city === 'issykkul' && (entry.city as string) === 'karakol'))
  );
  entry.total = subs.length;
  const ids = await Promise.all(subs.map((s) => subId(s.endpoint)));
  await hsetJson(LOG_KEY, entry.id, entry);
  // сначала «почтовый ящик» каждой подписки — service worker заберёт именно это уведомление
  for (let i = 0; i < ids.length; i += 200) await pipeline(ids.slice(i, i + 200).map((id) => ['HSET', INBOX_KEY, id, entry.id]));
  await cmd('SET', LAST_KEY, JSON.stringify({ id: entry.id, at: entry.at, title: entry.title, body: entry.body, url: entry.url } satisfies PushMessage));

  const subject = env('VAPID_SUBJECT')?.trim() || origin;
  const at = kgNowLocal();
  for (let i = 0; i < subs.length; i += 25) {
    const results = await Promise.all(subs.slice(i, i + 25).map((s) => sendPush(s.endpoint, subject)));
    for (const [j, r] of results.entries()) {
      const s = subs[i + j];
      const id = ids[i + j];
      if (r.result === 'ok') {
        entry.sent++;
        if (s.lastOkAt !== at || s.fails) await hsetJson(SUBS_KEY, id, { ...s, lastOkAt: at, fails: 0 } satisfies Sub);
      } else if (r.result === 'gone') {
        entry.removed++;
        await pipeline([
          ['HDEL', SUBS_KEY, id],
          ['HDEL', INBOX_KEY, id],
        ]);
      } else {
        entry.failed++;
        const code = r.code || 'unknown';
        entry.errors[code] = (entry.errors[code] || 0) + 1;
        await hsetJson(SUBS_KEY, id, { ...s, fails: (s.fails || 0) + 1, lastError: code, lastErrorAt: at } satisfies Sub);
      }
    }
  }
  entry.status = 'done';
  await hsetJson(LOG_KEY, entry.id, entry);

  // журнал — только последние PUSH_LOG_LIMIT записей
  const keys = await cmd<string[]>('HKEYS', LOG_KEY);
  if (keys.length > PUSH_LOG_LIMIT) {
    const old = (await readLog()).slice(PUSH_LOG_LIMIT).map((e) => e.id);
    for (const id of old) await cmd('HDEL', LOG_KEY, id);
  }
  return entry;
};

const newEntry = (kind: PushLogEntry['kind'], m: Omit<PushMessage, 'id' | 'at'>, city: CityId | 'all', topic: PushTopic, annId?: string): PushLogEntry => ({
  id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  at: kgNowLocal(),
  kind,
  annId,
  city,
  topic,
  ...m,
  status: 'sending',
  total: 0,
  sent: 0,
  removed: 0,
  failed: 0,
  errors: {},
});

const daysAgo = (n: number) => kgNowLocal(Date.now() - n * 86400 * 1000);

export default handler(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const inbox = url.searchParams.get('inbox');
    if (inbox) {
      // id подписки — хэш адреса; по нему узнать сам адрес нельзя
      const msgId = /^[0-9a-f]{32}$/.test(inbox) ? await cmd<string | null>('HGET', INBOX_KEY, inbox) : null;
      const e = msgId ? await hgetJson<PushLogEntry>(LOG_KEY, msgId) : null;
      const message: PushMessage | null = e ? { id: e.id, at: e.at, title: e.title, body: e.body, url: e.url } : null;
      return json({ message });
    }
    if (url.searchParams.get('last')) return json({ message: await cmd<string | null>('GET', LAST_KEY).then((s) => (s ? JSON.parse(s) : null)) });
    if (url.searchParams.get('stats')) {
      await requireAdmin(req);
      const subs = await hvalsJson<Sub>(SUBS_KEY);
      const count = (pick: (s: Sub) => string[]) => {
        const m: Record<string, number> = {};
        subs.forEach((s) => pick(s).forEach((k) => (m[k] = (m[k] || 0) + 1)));
        return m;
      };
      const d7 = daysAgo(7);
      const d30 = daysAgo(30);
      const log = await readLog();
      return json({
        configured: isPushConfigured(),
        // состояние ключей — без значений
        keys: { publicKey: Boolean(vapidPublicKey()), privateKey: Boolean(env('VAPID_PRIVATE_KEY')?.trim()), subject: Boolean(env('VAPID_SUBJECT')?.trim()) },
        total: subs.length,
        active: subs.filter(isActiveSub).length,
        invalid: subs.filter((s) => !isActiveSub(s)).length,
        new7: subs.filter((s) => s.at >= d7).length,
        new30: subs.filter((s) => s.at >= d30).length,
        byCity: count((s) => [s.city]),
        byLang: count((s) => [s.lang || 'ru']),
        byTopic: count((s) => topicsOf(s)),
        sentTotal: log.reduce((n, e) => n + e.sent, 0),
        failedTotal: log.reduce((n, e) => n + e.failed, 0),
        last: log[0] || (await cmd<string | null>('GET', LAST_KEY).then((s) => (s ? JSON.parse(s) : null))),
      });
    }
    if (url.searchParams.get('log')) {
      await requireAdmin(req);
      return json({ entries: (await readLog()).slice(0, PUSH_LOG_LIMIT) });
    }
    return json({ configured: isPushConfigured(), publicKey: isPushConfigured() ? vapidPublicKey() : null });
  }

  if (req.method === 'POST') {
    if (!isPushConfigured()) throw new HttpError('push_not_configured', 503, 'Уведомления пока не настроены');
    await rateLimit(req, 'push-sub', 10, 600);
    const body = await readBody<{ subscription?: { endpoint?: string }; city?: string; lang?: string; topics?: unknown }>(req, 5000);
    const endpoint = String(body.subscription?.endpoint || '');
    if (endpoint.length > 1000 || !isPushEndpoint(endpoint)) throw new HttpError('bad_subscription', 400);
    const city = CITIES.includes(body.city as CityId) ? (body.city as CityId | 'all') : 'all';
    const lang = LANGS.includes(body.lang as Language) ? (body.lang as Language) : 'ru';
    const topics = Array.isArray(body.topics) ? [...new Set(body.topics.filter(isPushTopic))] : [];
    const id = await subId(endpoint);
    const prev = await hgetJson<Sub>(SUBS_KEY, id);
    // повторная подписка того же браузера — смена города, языка или тем; дата подписки и итог доставки сохраняются
    const sub: Sub = { ...(prev || {}), endpoint, city, lang, topics: topics.length ? topics : DEFAULT_TOPICS, at: prev?.at || kgNowLocal() };
    await hsetJson(SUBS_KEY, id, sub);
    return json({ ok: true, city, lang, topics: sub.topics, id }, prev ? 200 : 201);
  }

  if (req.method === 'DELETE') {
    const body = await readBody<{ endpoint?: string }>(req, 5000);
    if (body.endpoint) {
      const id = await subId(String(body.endpoint));
      await pipeline([
        ['HDEL', SUBS_KEY, id],
        ['HDEL', INBOX_KEY, id],
      ]);
    }
    return json({ ok: true });
  }

  if (req.method === 'PATCH') {
    await requireAdmin(req);
    if (!isPushConfigured()) throw new HttpError('push_not_configured', 503, 'Добавьте ключи VAPID в настройки Vercel');
    const body = await readBody<{ annId?: string; custom?: Record<string, unknown> }>(req, 8000);
    const log = await readLog();

    if (body.custom) {
      checkRate(log, 'custom');
      const c = body.custom;
      const city = CITIES.includes(c.city as CityId) ? (c.city as CityId | 'all') : null;
      if (!city) throw new HttpError('bad_city', 400, 'Выберите город или «Весь Кыргызстан»');
      if (!isPushTopic(c.topic)) throw new HttpError('bad_topic', 400, 'Выберите тему');
      const entry = newEntry(
        'custom',
        { title: text3(c.title, PUSH_TITLE_MAX, 'заголовок'), body: text3(c.body, PUSH_BODY_MAX, 'текст'), url: await checkLink(c.url) },
        city,
        c.topic
      );
      return json(await deliver(entry, url.origin));
    }

    // Срочное предупреждение — прежняя логика: только действующее предупреждение, подписчики его города и «Весь Кыргызстан»
    checkRate(log, 'alert');
    const id = String(body.annId || '');
    const raw = await hgetJson<Announcement>(ANN_KEY, id);
    const stored = raw && !isCheckOnlyCopy(raw) ? raw : null;
    const a = stored || INITIAL_ANNOUNCEMENTS.find((x) => x.id === id);
    if (!a) throw new HttpError('not_found', 404);
    if (!isAlert(a) || isExpired(a)) throw new HttpError('not_alert', 400, 'Уведомление можно отправить только по действующему предупреждению');
    const city = (a.city === 'karakol' ? 'issykkul' : a.city) as CityId | 'all';
    const entry = await deliver(newEntry('alert', { title: a.title, body: a.summary, url: `/n/${a.id}` }, city, 'urgent', a.id), url.origin);
    if (stored) await saveAnnouncement(withHistory(stored, 'admin', 'edited', `Push-уведомление: доставлено ${entry.sent}`));
    return json(entry);
  }

  throw new HttpError('method_not_allowed', 405);
});

