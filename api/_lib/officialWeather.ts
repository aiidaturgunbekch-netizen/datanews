/**
 * Официальный прогноз Кыргызгидромета, внесённый редакцией: проверка и сохранение по дням.
 * Используют /api/weather (панель, «Вставить пакет») и автоприём пакетов из почты.
 */
import { cmd } from './kv';
import { HttpError } from './http';
import { kgDateStr } from '../../src/utils/time';
import { FORECAST_REGIONS, OfficialForecast, upcomingForecasts } from '../../src/config/weather';
import { recordAttempt } from './sources';

export const OFFICIAL_KEY = 'dn:weather:official';
/** Прогнозы по дням (сегодня, завтра…): утренний сбор пишет «сегодня», вечерний — «завтра», одно не стирает другое */
export const OFFICIAL_DAYS_KEY = 'dn:weather:official:days';

const temp = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < -60 || n > 60) throw new HttpError('invalid_field', 400, 'Температура — целое число от −60 до +60 °C');
  return n;
};

/** Проверка официального прогноза: дата, ссылка на источник, диапазоны «от ≤ до» */
export const sanitizeOfficial = (b: Partial<OfficialForecast>): OfficialForecast => {
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
    text: b.text ? String(b.text).slice(0, 1000) : b.texts?.ru ? String(b.texts.ru).slice(0, 1000) : undefined,
    texts: b.texts
      ? Object.fromEntries((['ru', 'kg', 'en'] as const).filter((l) => b.texts?.[l]).map((l) => [l, String(b.texts![l]).trim().slice(0, 1000)]))
      : undefined,
    regions,
    updatedAt: new Date().toISOString(),
  };
};


/** Сохранить прогноз на день (тот же день — заменяется новым) */
export const saveOfficial = async (raw: Partial<OfficialForecast>) => {
  const official = sanitizeOfficial(raw);
  await cmd('SET', OFFICIAL_KEY, JSON.stringify(official));
  const daysRaw = await cmd<string | null>('GET', OFFICIAL_DAYS_KEY);
  const days = upcomingForecasts([...(daysRaw ? (JSON.parse(daysRaw) as OfficialForecast[]) : []), official], kgDateStr()).slice(0, 10);
  await cmd('SET', OFFICIAL_DAYS_KEY, JSON.stringify(days));
  await recordAttempt('kyrgyzhydromet', true, undefined, Object.keys(official.regions).length);
  return official;
};
