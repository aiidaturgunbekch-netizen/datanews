/**
 * /api/weather — автоматический прогноз по городам и перевалам (MET Norway) + состояние обновления.
 *   GET                 последние сохранённые данные; если им больше 3 часов — сервер обновляет их
 *                       (одновременно только один запрос обновления, блокировка в Redis)
 *   GET ?refresh=1      принудительное обновление (только администратор)
 *
 * Данные хранятся в Redis (dn:weather:v1), поэтому не теряются и видны всем посетителям.
 * Если источник недоступен, старые данные остаются, а в ответе есть lastError — сайт пишет
 * «Не удалось обновить данные» и не выдаёт устаревший прогноз за актуальный.
 */
import { cmd, hgetJson } from './_lib/kv';
import { handler, json, readSession } from './_lib/http';
import { fetchSnapshot, PointForecast, WeatherSnapshot } from './_lib/weather';
import { recordAttempt, SourceStatus } from './_lib/sources';

export const config = { runtime: 'edge' };

const KEY = 'dn:weather:v1';
const REFRESH_AFTER_MS = 3 * 3600_000;

export default handler(async (req) => {
  const url = new URL(req.url);
  const raw = await cmd<string | null>('GET', KEY);
  let snap: WeatherSnapshot | null = raw ? JSON.parse(raw) : null;

  const force = url.searchParams.get('refresh') === '1' && (await readSession(req))?.role === 'admin';
  const old = !snap || Date.now() - Date.parse(snap.fetchedAt) > REFRESH_AFTER_MS;
  if (force || old) {
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
  return json(
    { snapshot: snap, status, refreshAfterHours: 3, staleAfterHours: 12 },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' }
  );
});
