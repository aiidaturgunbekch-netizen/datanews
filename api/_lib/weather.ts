/**
 * Автоматический прогноз по точкам из MET Norway Locationforecast 2.0 (открытые данные, CC BY 4.0).
 * Это численный прогноз модели, а НЕ официальный прогноз Кыргызгидромета — так он и подписывается на сайте.
 *
 * Условия MET Norway: обязательный User-Agent с контактом, не чаще необходимого (кэш 3 часа), атрибуция.
 */
import { WEATHER_POINTS, WeatherPoint } from '../../src/config/weather';
import { KG_OFFSET_MS } from '../../src/utils/time';

export interface DayForecast {
  /** Дата по Бишкеку YYYY-MM-DD */
  date: string;
  tMax: number;
  tMin: number;
  /** Осадки за сутки, мм */
  precip: number;
  /** Максимальная скорость ветра, м/с */
  windMax: number;
  /** Код условий днём (MET symbol_code), например 'rain', 'snow', 'clearsky_day' */
  symbol?: string;
  /** Автоматические признаки модели (не официальные предупреждения) */
  flags: ('frost' | 'snow' | 'heavy_precip' | 'strong_wind' | 'temp_drop')[];
}

export interface PointForecast {
  id: string;
  /** Когда данные этой точки были успешно получены */
  fetchedAt?: string;
  days: DayForecast[];
  /** Время обновления модели у источника */
  modelUpdatedAt?: string;
  error?: string;
}

export interface WeatherSnapshot {
  provider: 'MET Norway';
  fetchedAt: string;
  points: PointForecast[];
}

const UA = 'DataNewsKG/1.0 (+https://github.com/aiidaturgunbekch-netizen/datanews)';

interface MetTimestep {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
}

interface MetResponse {
  properties: { meta?: { updated_at?: string }; timeseries: MetTimestep[] };
}

/** Сутки по Бишкеку из ответа MET: max/min температура, сумма осадков, max ветер, условия днём */
export const aggregateDays = (res: MetResponse, maxDays = 4): DayForecast[] => {
  const byDay = new Map<string, MetTimestep[]>();
  for (const ts of res.properties.timeseries || []) {
    const day = new Date(Date.parse(ts.time) + KG_OFFSET_MS).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(ts);
  }
  const days: DayForecast[] = [];
  for (const [date, steps] of byDay) {
    const temps = steps.map((s) => s.data.instant.details.air_temperature).filter((v): v is number => typeof v === 'number');
    if (temps.length < 3) continue; // неполные сутки в конце ряда не показываем
    const winds = steps.map((s) => s.data.instant.details.wind_speed ?? 0);
    // Осадки: почасовые там, где они есть, иначе 6-часовые без пересечений
    let precip = 0;
    let coveredUntil = 0;
    for (const s of steps) {
      const t = Date.parse(s.time);
      if (t < coveredUntil) continue;
      if (s.data.next_1_hours?.details?.precipitation_amount !== undefined) {
        precip += s.data.next_1_hours.details.precipitation_amount;
        coveredUntil = t + 3600_000;
      } else if (s.data.next_6_hours?.details?.precipitation_amount !== undefined) {
        precip += s.data.next_6_hours.details.precipitation_amount;
        coveredUntil = t + 6 * 3600_000;
      }
    }
    // Условия днём — ближайший к 12:00 по Бишкеку (06:00 UTC) шаг
    const noon = steps.reduce((best, s) => {
      const h = new Date(Date.parse(s.time) + KG_OFFSET_MS).getUTCHours();
      const bh = new Date(Date.parse(best.time) + KG_OFFSET_MS).getUTCHours();
      return Math.abs(h - 12) < Math.abs(bh - 12) ? s : best;
    }, steps[0]);
    const symbol = noon.data.next_6_hours?.summary?.symbol_code || noon.data.next_1_hours?.summary?.symbol_code;
    const day: DayForecast = {
      date,
      tMax: Math.round(Math.max(...temps)),
      tMin: Math.round(Math.min(...temps)),
      precip: Math.round(precip * 10) / 10,
      windMax: Math.round(Math.max(...winds)),
      symbol,
      flags: [],
    };
    if (day.tMin <= 0) day.flags.push('frost');
    if (steps.some((s) => /snow|sleet/.test(s.data.next_1_hours?.summary?.symbol_code || s.data.next_6_hours?.summary?.symbol_code || ''))) day.flags.push('snow');
    if (day.precip >= 10) day.flags.push('heavy_precip');
    if (day.windMax >= 15) day.flags.push('strong_wind');
    days.push(day);
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < days.length; i++) if (days[i - 1].tMax - days[i].tMax >= 8) days[i].flags.push('temp_drop');
  return days.slice(0, maxDays);
};

const fetchPoint = async (p: WeatherPoint): Promise<PointForecast> => {
  const qs = new URLSearchParams({ lat: p.lat.toFixed(4), lon: p.lon.toFixed(4) });
  if (p.altitude) qs.set('altitude', String(p.altitude));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?${qs}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as MetResponse;
    const days = aggregateDays(data);
    if (!days.length) throw new Error('empty forecast');
    return { id: p.id, days, fetchedAt: new Date().toISOString(), modelUpdatedAt: data.properties.meta?.updated_at };
  } catch (e) {
    return { id: p.id, days: [], error: (e as Error).name === 'AbortError' ? 'timeout' : (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
};

/** Запрос всех точек. Ошибка отдельной точки не роняет остальные. */
export const fetchSnapshot = async (): Promise<WeatherSnapshot> => {
  const points = await Promise.all(WEATHER_POINTS.map(fetchPoint));
  return { provider: 'MET Norway', fetchedAt: new Date().toISOString(), points };
};
