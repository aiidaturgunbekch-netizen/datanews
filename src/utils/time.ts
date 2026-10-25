/**
 * Время Кыргызстана (UTC+6, без перехода на летнее время).
 * Даты в данных записаны как местное время Бишкека: 'YYYY-MM-DDTHH:mm' или 'YYYY-MM-DD'.
 * Для сравнения с «сейчас» их всегда разбираем как UTC+6 — независимо от часового пояса посетителя.
 */
export const KG_OFFSET_MS = 6 * 3600_000;

/** Метка времени (мс) для даты из данных, понимаемой как время Бишкека */
export const kgTs = (s?: string): number => {
  if (!s) return NaN;
  const iso = s.length === 10 ? `${s}T00:00:00+06:00` : `${s.slice(0, 16)}:00+06:00`;
  return Date.parse(iso);
};

/** Календарная дата в Бишкеке: 'YYYY-MM-DD' */
export const kgDateStr = (ts: number = Date.now()) => new Date(ts + KG_OFFSET_MS).toISOString().slice(0, 10);

/** Сколько календарных дней (по Бишкеку) от сегодня до даты из данных: 0 — сегодня, 1 — завтра, -1 — вчера */
export const kgDaysUntil = (s: string, now: number = Date.now()) =>
  Math.round((Date.parse(`${s.slice(0, 10)}T00:00:00Z`) - Date.parse(`${kgDateStr(now)}T00:00:00Z`)) / 86400_000);

/** Сдвиг календарной даты 'YYYY-MM-DD' на n дней */
export const addDaysStr = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** Текущий момент как локальное время Бишкека «YYYY-MM-DDTHH:mm» (в таком виде хранятся даты публикаций) */
export const kgNowLocal = (ts: number = Date.now()) => new Date(ts + KG_OFFSET_MS).toISOString().slice(0, 16);

/**
 * Дата и время по Бишкеку в одном формате для всей панели («24 окт. 2026 г., 18:36»).
 * Метки с часовым поясом (…Z, +06:00) переводятся в бишкекское время; метки без пояса уже бишкекские.
 */
export const formatKgDateTime = (s?: string) => {
  if (!s) return '—';
  const ts = /(?:[zZ]|[+-]\d\d:?\d\d)$/.test(s) ? Date.parse(s) : kgTs(s);
  if (Number.isNaN(ts)) return s;
  return new Date(ts).toLocaleString('ru-RU', {
    timeZone: 'Asia/Bishkek',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
