/**
 * /api/weather — автоматический прогноз по городам и перевалам (MET Norway) + состояние обновления.
 *   GET                 последние сохранённые данные; если им больше 3 часов — сервер обновляет их
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
import { FORECAST_REGIONS, OfficialForecast } from '../src/config/weather';
import { fetchSnapshot, PointForecast, WeatherSnapshot } from './_lib/weather';
import { recordAttempt, SourceStatus } from './_lib/sources';

export const config = { runtime: 'edge' };

const KEY = 'dn:weather:v1';
const REFRESH_AFTER_MS = 3 * 3600_000;
const OFFICIAL_KEY = 'dn:weather:official';

const temp = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < -60 || n > 60) throw new HttpError('invalid_field', 400, 'Температура — целое число от −60 до +60 °C');
  return n;
};

/** Проверка официального прогноза: дата, ссылка на источник, диапазоны «от ≤ до» */
const sanitizeOfficial = (b: Partial<OfficialForecast>): OfficialForecast => {
  const date = String(b.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError('invalid_field', 400, 'Укажите дату прогноза');
  const sourceUrl = String(b.sourceUrl || '').trim();
  if (!/^https:\/\/\S+$/.test(sourceUrl)) throw new HttpError('invalid_field', 400, 'Укажите ссылку на сообщение (https://…)');
  const regions: OfficialForecast['regions'] = {};
  for (const { id } of FORECAST_REGIONS) {
    const r = b.regions?.[id];
    if (!r) continue;
    const v = { nightFrom: temp(r.nightFrom), nightTo: temp(r.nightTo), dayFrom: temp(r.dayFrom), dayTo: temp(r.dayTo) };
    if (v.nightFrom > v.nightTo || v.dayFrom > v.dayTo) throw new HttpError('invalid_field', 400, 'В диапазоне «от» должно быть не больше «до»');
    regions[id] = v;
  }
  if (!Object.keys(regions).length) throw new HttpError('invalid_field', 400, 'Заполните температуру хотя бы для одной области');
  return {
    date,
    sourceName: String(b.sourceName || 'Кыргызгидромет').slice(0, 120),
    sourceUrl: sourceUrl.slice(0, 500),
    text: b.text ? String(b.text).slice(0, 1000) : undefined,
    regions,
    updatedAt: new Date().toISOString(),
  };
};

export default handler(async (req) => {
  if (req.method === 'POST') {
    await requireAdmin(req);
    const official = sanitizeOfficial(await readBody<Partial<OfficialForecast>>(req, 20_000));
    await cmd('SET', OFFICIAL_KEY, JSON.stringify(official));
    await recordAttempt('kyrgyzhydromet', true, undefined, Object.keys(official.regions).length);
    return json({ official });
  }
  if (req.method === 'DELETE') {
    await requireAdmin(req);
    await cmd('DEL', OFFICIAL_KEY);
    return json({ ok: true });
  }
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
  const offRaw = await cmd<string | null>('GET', OFFICIAL_KEY);
  const offParsed: OfficialForecast | null = offRaw ? JSON.parse(offRaw) : null;
  // Прогноз на прошедшую дату не показываем
  const official = offParsed && offParsed.date >= kgDateStr() ? offParsed : null;
  return json(
    { snapshot: snap, status, official, refreshAfterHours: 3, staleAfterHours: 12 },
    200,
    { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' }
  );
});
