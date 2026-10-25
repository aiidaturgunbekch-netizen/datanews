/**
 * /api/push — push-уведомления о срочных предупреждениях (Web Push, VAPID, без платных сервисов).
 *   GET                       { publicKey, configured } — включены ли уведомления на сервере
 *   GET ?last=1               последнее отправленное уведомление (его забирает service worker)
 *   POST { subscription, city }   подписаться (любой посетитель; не чаще 10 раз за 10 минут с IP)
 *   DELETE { endpoint }       отписаться
 *   GET ?stats=1              число подписчиков (админ)
 *   PATCH { annId }           разослать предупреждение подписчикам его города / области (админ)
 *
 * Хранится только адрес подписки браузера и выбранный город — без имён, телефонов и email.
 */
import type { Announcement, CityId, LocalizedString } from '../src/types';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';
import { cmd, hgetJson, hsetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, rateLimit, readBody, requireAdmin } from './_lib/http';
import { ANN_KEY, saveAnnouncement, withHistory } from './_lib/announcements';
import { isPushConfigured, isPushEndpoint, sendPush, vapidPublicKey } from './_lib/push';
import { env } from './_lib/env';
import { isAlert, isExpired } from '../src/utils/urgency';
import { kgNowLocal } from '../src/utils/time';
import { isCheckOnlyCopy } from '../src/utils/mergeAnnouncements';

export const config = { runtime: 'edge' };

const SUBS_KEY = 'dn:push:subs';
const LAST_KEY = 'dn:push:last';
const CITIES: (CityId | 'all')[] = ['all', 'bishkek', 'osh', 'chui', 'osh_region', 'issykkul', 'jalalabad', 'talas', 'naryn', 'batken'];

interface Sub {
  endpoint: string;
  city: CityId | 'all';
  at: string;
}
export interface PushMessage {
  id: string;
  at: string;
  title: LocalizedString;
  body: LocalizedString;
  url: string;
}

const idOf = async (endpoint: string) => {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default handler(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    if (url.searchParams.get('last')) return json({ message: await cmd<string | null>('GET', LAST_KEY).then((s) => (s ? JSON.parse(s) : null)) });
    if (url.searchParams.get('stats')) {
      await requireAdmin(req);
      const subs = await hvalsJson<Sub>(SUBS_KEY);
      const byCity: Record<string, number> = {};
      subs.forEach((s) => (byCity[s.city] = (byCity[s.city] || 0) + 1));
      return json({ configured: isPushConfigured(), total: subs.length, byCity, last: await cmd<string | null>('GET', LAST_KEY).then((s) => (s ? JSON.parse(s) : null)) });
    }
    return json({ configured: isPushConfigured(), publicKey: isPushConfigured() ? vapidPublicKey() : null });
  }

  if (req.method === 'POST') {
    if (!isPushConfigured()) throw new HttpError('push_not_configured', 503, 'Уведомления пока не настроены');
    await rateLimit(req, 'push-sub', 10, 600);
    const body = await readBody<{ subscription?: { endpoint?: string }; city?: string }>(req, 5000);
    const endpoint = String(body.subscription?.endpoint || '');
    if (endpoint.length > 1000 || !isPushEndpoint(endpoint)) throw new HttpError('bad_subscription', 400);
    const city = CITIES.includes(body.city as CityId) ? (body.city as CityId | 'all') : 'all';
    await hsetJson(SUBS_KEY, await idOf(endpoint), { endpoint, city, at: kgNowLocal() } satisfies Sub);
    return json({ ok: true, city }, 201);
  }

  if (req.method === 'DELETE') {
    const body = await readBody<{ endpoint?: string }>(req, 5000);
    if (body.endpoint) await cmd('HDEL', SUBS_KEY, await idOf(String(body.endpoint)));
    return json({ ok: true });
  }

  if (req.method === 'PATCH') {
    await requireAdmin(req);
    if (!isPushConfigured()) throw new HttpError('push_not_configured', 503, 'Добавьте ключи VAPID в настройки Vercel');
    const body = await readBody<{ annId?: string }>(req, 2000);
    const id = String(body.annId || '');
    const raw = await hgetJson<Announcement>(ANN_KEY, id);
    const stored = raw && !isCheckOnlyCopy(raw) ? raw : null;
    const a = stored || INITIAL_ANNOUNCEMENTS.find((x) => x.id === id);
    if (!a) throw new HttpError('not_found', 404);
    if (!isAlert(a) || isExpired(a)) throw new HttpError('not_alert', 400, 'Уведомление можно отправить только по действующему предупреждению');

    const message: PushMessage = { id: a.id, at: kgNowLocal(), title: a.title, body: a.summary, url: `/#/n/${a.id}` };
    await cmd('SET', LAST_KEY, JSON.stringify(message));

    const subs = (await hvalsJson<Sub>(SUBS_KEY)).filter((s) => s.city === 'all' || a.city === 'all' || s.city === a.city || (s.city === 'issykkul' && a.city === 'karakol'));
    const subject = env('VAPID_SUBJECT')?.trim() || url.origin;
    let sent = 0;
    let removed = 0;
    let failed = 0;
    for (let i = 0; i < subs.length; i += 25) {
      const results = await Promise.all(subs.slice(i, i + 25).map((s) => sendPush(s.endpoint, subject)));
      for (const [j, r] of results.entries()) {
        if (r === 'ok') sent++;
        else if (r === 'gone') {
          removed++;
          await cmd('HDEL', SUBS_KEY, await idOf(subs[i + j].endpoint));
        } else failed++;
      }
    }
    if (stored) await saveAnnouncement(withHistory(stored, 'admin', 'edited', `Push-уведомление: доставлено ${sent}`));
    return json({ sent, removed, failed, total: subs.length });
  }

  throw new HttpError('method_not_allowed', 405);
});
