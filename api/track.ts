/**
 * /api/track — счётчик посещений (вызывается сайтом при открытии каждой страницы).
 * Хранит только агрегаты: число просмотров, уникальных посетителей (HyperLogLog),
 * разделы, источники переходов, тип устройства, язык и город (по IP от Vercel).
 *   POST { annId }        прочтение публикации (открыта её карточка) — для блока «Самое читаемое»
 *   GET ?popular=1        самые читаемые публикации за 7 дней: [{ id, reads }] (без личных данных)
 *
 * Реклама (публичная часть; управление — /api/stats?ads=1, только администратор):
 *   GET ?ads=1            кампании, которые сейчас можно показывать (активна + оплата подтверждена + внутри периода)
 *   GET ?adformats=1      каталог рекламных форматов и цен (для страницы «Реклама»)
 *   GET ?ad=<id>&go=1     переход по рекламе: клик засчитывается, затем перенаправление на сайт рекламодателя
 *   POST { adView: id }   баннер появился на экране (сайт присылает один раз за открытие страницы)
 */
import { pipeline, toCountMap } from './_lib/kv';
import { handler, HttpError, json, readBody } from './_lib/http';
import { dayKey, K, STATS_TTL } from './_lib/stats';
import { getFormats, liveAds, recordClick, recordView } from './_lib/ads';

export const config = { runtime: 'edge' };

const PAGES = ['home', 'calendar', 'alerts', 'events', 'cities', 'organizations', 'pricing', 'advertising'];

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|telegrambot|whatsapp/i;

const clean = (v: unknown, max = 60) =>
  String(v ?? '')
    .trim()
    .slice(0, max)
    .replace(/[^\p{L}\p{N}._:/\- ]/gu, '') || 'unknown';

const POPULAR_DAYS = 7;

export default handler(async (req) => {
  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams;
    if (q.get('ads')) return json({ ads: await liveAds() }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120' });
    if (q.get('adformats')) return json({ formats: await getFormats() }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=300' });
    if (q.get('ad') && q.get('go')) {
      const id = String(q.get('ad'));
      const ua = req.headers.get('user-agent') || '';
      const target = /^[\w-]{3,40}$/.test(id) ? (BOT.test(ua) ? null : await recordClick(req, id)) : null;
      // кампания не идёт (закончилась, приостановлена) — на главную DataNews, а не на устаревшую рекламу
      return new Response(null, { status: 302, headers: { Location: target || '/', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    if (!q.get('popular')) throw new HttpError('bad_request', 400);
    const today = Date.now();
    const days = Array.from({ length: POPULAR_DAYS }, (_, i) => dayKey(new Date(today - i * 86400_000)));
    const maps = (await pipeline(days.map((d) => ['HGETALL', K.reads(d)]))).map(toCountMap);
    const total: Record<string, number> = {};
    maps.forEach((m) => Object.entries(m).forEach(([id, n]) => (total[id] = (total[id] || 0) + n)));
    const items = Object.entries(total)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([id, reads]) => ({ id, reads }));
    return json({ days: POPULAR_DAYS, items }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' });
  }
  if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);
  const ua = req.headers.get('user-agent') || '';
  if (BOT.test(ua)) return json({ ok: true, skipped: 'bot' });

  const body = await readBody<{ path?: string; visitorId?: string; referrer?: string; lang?: string; annId?: string; adView?: string }>(req, 4000);

  // Не больше 120 просмотров в минуту с одного IP — защита статистики от накрутки
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const rlKey = `dn:rl:track:${ip}:${Math.floor(Date.now() / 60000)}`;
  const [hits] = await pipeline([['INCR', rlKey], ['EXPIRE', rlKey, 120]]);
  if (Number(hits) > 120) return json({ ok: true, skipped: 'rate' });

  // Показ рекламы — отдельный счётчик кампании (повторы за 30 минут не засчитываются)
  if (body.adView !== undefined) {
    const id = String(body.adView);
    if (!/^[\w-]{3,40}$/.test(id)) throw new HttpError('bad_id', 400);
    return json({ ok: true, counted: await recordView(req, id) });
  }

  // Прочтение публикации — отдельный счётчик, просмотры разделов не меняются
  if (body.annId !== undefined) {
    const id = String(body.annId);
    if (!/^[\w-]{3,80}$/.test(id)) throw new HttpError('bad_id', 400);
    const day = dayKey(new Date());
    await pipeline([
      ['HINCRBY', K.reads(day), id, 1],
      ['EXPIRE', K.reads(day), 30 * 86400],
    ]);
    return json({ ok: true });
  }

  // Учитываем только известные разделы и языки сайта
  const path = PAGES.includes(String(body.path)) ? String(body.path) : 'other';
  const lang = ['ru', 'kg', 'en'].includes(String(body.lang)) ? String(body.lang) : 'other';
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
    ['HINCRBY', K.pages(day), path, 1],
    ['HINCRBY', K.refs(day), clean(ref, 60), 1],
    ['HINCRBY', K.devices(day), device, 1],
    ['HINCRBY', K.langs(day), lang, 1],
    ['HINCRBY', K.cities(day), place, 1],
    ...keys.map((k) => ['EXPIRE', k, STATS_TTL] as (string | number)[]),
  ]);
  return json({ ok: true });
});
