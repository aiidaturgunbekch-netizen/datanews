/**
 * /api/track — счётчик посещений (вызывается сайтом при открытии каждой страницы).
 * Хранит только агрегаты: число просмотров, уникальных посетителей (HyperLogLog),
 * разделы, источники переходов, тип устройства, язык и город (по IP от Vercel).
 */
import { pipeline } from './_lib/kv';
import { handler, HttpError, json, readBody } from './_lib/http';
import { dayKey, K, STATS_TTL } from './_lib/stats';

export const config = { runtime: 'edge' };

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|telegrambot|whatsapp/i;

const clean = (v: unknown, max = 60) =>
  String(v ?? '')
    .trim()
    .slice(0, max)
    .replace(/[^\p{L}\p{N}._:/\- ]/gu, '') || 'unknown';

export default handler(async (req) => {
  if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);
  const ua = req.headers.get('user-agent') || '';
  if (BOT.test(ua)) return json({ ok: true, skipped: 'bot' });

  const body = await readBody<{ path?: string; visitorId?: string; referrer?: string; lang?: string }>(req, 4000);
  const visitor = clean(body.visitorId, 64);
  const day = dayKey(new Date());
  const device = /ipad|tablet/i.test(ua) ? 'Планшет' : /mobi|android|iphone/i.test(ua) ? 'Телефон' : 'Компьютер';

  let ref = 'Прямой заход';
  try {
    if (body.referrer) {
      const host = new URL(body.referrer).hostname.replace(/^www\./, '');
      if (host && host !== new URL(req.url).hostname) ref = host;
    }
  } catch {
    /* некорректный referrer — считаем прямым */
  }
  let city = req.headers.get('x-vercel-ip-city') || '';
  try {
    city = decodeURIComponent(city);
  } catch {
    /* оставляем как есть */
  }
  const country = req.headers.get('x-vercel-ip-country') || '';
  const place = city ? `${clean(city, 40)}${country ? `, ${country}` : ''}` : country || 'Неизвестно';

  const keys = [K.views(day), K.visitors(day), K.pages(day), K.refs(day), K.devices(day), K.langs(day), K.cities(day)];
  await pipeline([
    ['INCR', K.views(day)],
    ['INCR', K.allViews],
    ['PFADD', K.visitors(day), visitor],
    ['PFADD', K.allVisitors, visitor],
    ['HINCRBY', K.pages(day), clean(body.path, 40), 1],
    ['HINCRBY', K.refs(day), clean(ref, 60), 1],
    ['HINCRBY', K.devices(day), device, 1],
    ['HINCRBY', K.langs(day), clean(body.lang, 4), 1],
    ['HINCRBY', K.cities(day), place, 1],
    ...keys.map((k) => ['EXPIRE', k, STATS_TTL] as (string | number)[]),
  ]);
  return json({ ok: true });
});
