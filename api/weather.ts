/**
 * /api/weather — автоматический прогноз по городам и перевалам (MET Norway) + состояние обновления.
 *   GET                 официальный прогноз, внесённый редакцией (без обращения к MET Norway)
 *   GET ?model=1        плюс автоматический прогноз MET Norway; если ему больше 3 часов — сервер обновляет его
 *                       (одновременно только один запрос обновления, блокировка в Redis)
 *   GET ?refresh=1      принудительное обновление (только администратор)
 *   POST                официальный прогноз Кыргызгидромета на день, внесённый редакцией (только администратор)
 *   DELETE              убрать официальный прогноз (только администратор)
 *
 * Данные хранятся в Redis (dn:weather:v1), поэтому не теряются и видны всем посетителям.
 * Если источник недоступен, старые данные остаются, а в ответе есть lastError — сайт пишет
 * «Не удалось обновить данные» и не выдаёт устаревший прогноз за актуальный.
 */
import { cmd, hgetJson } from './_lib/kv';
import { handler, HttpError, json, readBody, readSession, requireAdmin } from './_lib/http';
import { kgDateStr } from '../src/utils/time';
import { OfficialForecast, upcomingForecasts } from '../src/config/weather';
import { fetchSnapshot, PointForecast, WeatherSnapshot } from './_lib/weather';
import { recordAttempt, SourceStatus } from './_lib/sources';
import { OFFICIAL_DAYS_KEY, OFFICIAL_KEY, saveOfficial } from './_lib/officialWeather';

export const config = { runtime: 'edge' };

const KEY = 'dn:weather:v1';
const REFRESH_AFTER_MS = 3 * 3600_000;

export default handler(async (req) => {
  if (req.method === 'POST') {
    await requireAdmin(req);
    const official = await saveOfficial(await readBody<Partial<OfficialForecast>>(req, 20_000));
    return json({ official });
  }
  if (req.method === 'DELETE') {
    await requireAdmin(req);
    await cmd('DEL', OFFICIAL_KEY);
    await cmd('DEL', OFFICIAL_DAYS_KEY);
    return json({ ok: true });
  }
  const url = new URL(req.url);
  const raw = await cmd<string | null>('GET', KEY);
  let snap: WeatherSnapshot | null = raw ? JSON.parse(raw) : null;

  const force = url.searchParams.get('refresh') === '1' && (await readSession(req))?.role === 'admin';
  // Автоматический прогноз на сайте сейчас не показывается — MET Norway запрашивается только по ?model=1
  const wantModel = url.searchParams.get('model') === '1';
  const old = !snap || Date.now() - Date.parse(snap.fetchedAt) > REFRESH_AFTER_MS;
  if (force || (wantModel && old)) {
    const lock = await cmd<string | null>('SET', 'dn:weather:lock', '1', 'NX', 'EX', 60);
    if (lock === 'OK') {
      try {
        const fresh = await fetchSnapshot();
        const okPoints = fresh.points.filter((p) => !p.error);
        // Точки, которые не обновились, сохраняют прежние данные (со своим временем получения)
        const merged: PointForecast[] = fresh.points.map((p) =>
          p.error ? { ...(snap?.points.find((o) => o.id === p.id) || { id: p.id, days: [] }), error: p.error } : p
        );
        if (okPoints.length > 0) {
          snap = { ...fresh, points: merged };
          await cmd('SET', KEY, JSON.stringify(snap));
        } else if (snap) {
          snap = { ...snap, points: merged };
        }
        const failed = fresh.points.length - okPoints.length;
        await recordAttempt(
          'met-norway',
          okPoints.length > 0,
          okPoints.length === 0 ? fresh.points[0]?.error : failed ? `${failed} точек не обновились` : undefined,
          okPoints.length
        );
      } catch (e) {
        await recordAttempt('met-norway', false, (e as Error).message);
      } finally {
        await cmd('DEL', 'dn:weather:lock');
      }
    }
  }

  const status = await hgetJson<SourceStatus>('dn:src:status', 'met-norway');
  const offRaw = await cmd<string | null>('GET', OFFICIAL_KEY);
  const offParsed: OfficialForecast | null = offRaw ? JSON.parse(offRaw) : null;
  // Прогноз на прошедшую дату не показываем
  const official = offParsed && offParsed.date >= kgDateStr() ? offParsed : null;
  const daysRaw = await cmd<string | null>('GET', OFFICIAL_DAYS_KEY);
  const officialDays = upcomingForecasts([...(daysRaw ? (JSON.parse(daysRaw) as OfficialForecast[]) : []), ...(official ? [official] : [])], kgDateStr());
  return json(
    { officialDays, snapshot: wantModel || force ? snap : null, status: wantModel || force ? status : null, official, refreshAfterHours: 3, staleAfterHours: 12 },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' }
  );
});
