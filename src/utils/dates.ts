import { Language } from '../types';

/**
 * Единое форматирование дат для RU / KG / EN.
 * Браузерная локаль не используется: в ней нет надёжной поддержки кыргызского,
 * а '[]' даёт 12-часовой формат у части посетителей.
 *
 * Кыргызский формат: «13-октябрь», «2026-жыл», «13-октябрь, шейшемби».
 */

export const MONTHS: Record<Language, string[]> = {
  ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  kg: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Родительный падеж для русского: «13 октября» */
const MONTHS_RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export const MONTHS_SHORT: Record<Language, string[]> = {
  ru: ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'],
  kg: ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

/** Индекс = Date.getDay() (0 — воскресенье) */
export const WEEKDAYS: Record<Language, string[]> = {
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  kg: ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const WEEKDAYS_SHORT: Record<Language, string[]> = {
  ru: ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
  kg: ['ЖК', 'ДШ', 'ШШ', 'ШР', 'БШ', 'ЖМ', 'ИШ'],
  en: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));

/** «Октябрь 2026» / «October 2026» — заголовок календаря */
export const formatMonthYear = (year: number, month: number, lang: Language) => `${cap(MONTHS[lang][month])} ${year}`;

/** «13 октября» / «13-октябрь» / «13 October» */
export const formatDayMonth = (v: string | Date, lang: Language) => {
  const d = toDate(v);
  if (lang === 'kg') return `${d.getDate()}-${MONTHS.kg[d.getMonth()]}`;
  if (lang === 'en') return `${d.getDate()} ${MONTHS.en[d.getMonth()]}`;
  return `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]}`;
};

/** «13 октября 2026 г.» / «13-октябрь, 2026-жыл» / «13 October 2026» */
export const formatDate = (v: string | Date, lang: Language) => {
  const d = toDate(v);
  if (lang === 'kg') return `${formatDayMonth(d, 'kg')}, ${d.getFullYear()}-жыл`;
  if (lang === 'en') return `${formatDayMonth(d, 'en')} ${d.getFullYear()}`;
  return `${formatDayMonth(d, 'ru')} ${d.getFullYear()} г.`;
};

/** «вторник, 13 октября 2026 г.» / «13-октябрь, 2026-жыл, шейшемби» / «Tuesday, 13 October 2026» */
export const formatDateLong = (v: string | Date, lang: Language) => {
  const d = toDate(v);
  const wd = WEEKDAYS[lang][d.getDay()];
  if (lang === 'kg') return `${formatDate(d, 'kg')}, ${wd}`;
  return `${wd}, ${formatDate(d, lang)}`;
};

/** «19:00» — всегда 24-часовой формат */
export const formatTime = (v: string | Date) => {
  const d = toDate(v);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** «13 октября, 19:00» / «13-октябрь, 19:00» */
export const formatDayMonthTime = (v: string | Date, lang: Language) => `${formatDayMonth(v, lang)}, ${formatTime(v)}`;

/**
 * Диапазон дат без повторов: «17–18 октября», «17–18-октябрь», «31 октября – 1 ноября»,
 * «31-октябрь – 1-ноябрь».
 */
export const formatDayRange = (from: Date, to: Date, lang: Language) => {
  if (from.getMonth() === to.getMonth()) {
    if (lang === 'kg') return `${from.getDate()}–${to.getDate()}-${MONTHS.kg[to.getMonth()]}`;
    if (lang === 'en') return `${from.getDate()}–${to.getDate()} ${MONTHS.en[to.getMonth()]}`;
    return `${from.getDate()}–${to.getDate()} ${MONTHS_RU_GEN[to.getMonth()]}`;
  }
  return `${formatDayMonth(from, lang)} – ${formatDayMonth(to, lang)}`;
};

/** Ближайшие суббота и воскресенье (если сегодня воскресенье — вчера и сегодня) */
export const nearestWeekend = (now = new Date()) => {
  const sat = new Date(now);
  const dow = now.getDay();
  sat.setDate(now.getDate() + (dow === 0 ? -1 : 6 - dow));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [sat, sun] as const;
};

/**
 * Период события одной строкой:
 *  «13 октября 2026 г., 10:00–20:00», «23 октября, 09:00 — 25 октября, 18:00»,
 *  «13-октябрь, 2026-жыл, 10:00–20:00».
 * `long` добавляет день недели.
 */
const TIME_TBA = { ru: 'время уточняется', kg: 'убактысы такталат', en: 'time TBA' };

export const formatWhen = (start: string, end: string | undefined, lang: Language, long = false, timeTBA = false, allDay = false) => {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const day = long ? formatDateLong(s, lang) : formatDate(s, lang);
  if (timeTBA || allDay) {
    // Время не объявлено или событие на весь день — показываем только даты
    const suffix = timeTBA ? ` · ${TIME_TBA[lang]}` : '';
    if (e && !isNaN(e.getTime()) && e.toDateString() !== s.toDateString()) {
      const sameYear = e.getFullYear() === s.getFullYear();
      return `${sameYear ? formatDayRange(s, e, lang) : `${formatDate(s, lang)} – ${formatDate(e, lang)}`}${suffix}`;
    }
    return `${day}${suffix}`;
  }
  if (!e || isNaN(e.getTime())) return `${day}, ${formatTime(s)}`;
  if (e.toDateString() === s.toDateString()) return `${day}, ${formatTime(s)}–${formatTime(e)}`;
  return `${formatDayMonthTime(s, lang)} — ${formatDayMonthTime(e, lang)}`;
};
