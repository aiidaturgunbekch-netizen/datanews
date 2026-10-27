import type { Announcement, Language } from '../types';
import { kgDaysUntil, kgTs } from './time';
import { endTs } from './urgency';
import { importanceOf } from '../config/rubrics';

/**
 * Временная логика главной DataNews: «что, когда и насколько скоро».
 * Все расчёты — по календарю Бишкека (UTC+6). Даты берутся только из публикации, ничего не придумывается.
 */

/** Идёт сейчас: начало уже наступило, окончание — ещё нет */
export const isOngoing = (a: Announcement, now = Date.now()) => kgTs(a.startDate) <= now && endTs(a) >= now;

const ruDays = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'дня' : 'дней');

/**
 * Относительный день события: «Сегодня», «Завтра», «Через 3 дня», «Идёт сейчас».
 * Только для начала в пределах недели или уже идущего; иначе null (тогда показывается обычная дата).
 */
export const relativeDay = (a: Announcement, lang: Language, now = Date.now()): string | null => {
  const d = kgDaysUntil(a.startDate, now);
  if (d < 0) return isOngoing(a, now) ? { ru: 'Идёт сейчас', kg: 'Азыр жүрүп жатат', en: 'Ongoing' }[lang] : null;
  if (d === 0) return { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' }[lang];
  if (d === 1) return { ru: 'Завтра', kg: 'Эртең', en: 'Tomorrow' }[lang];
  if (d <= 7) return { ru: `Через ${d} ${ruDays(d)}`, kg: `${d} күндөн кийин`, en: `In ${d} days` }[lang];
  return null;
};

export type DayBucket = 'today' | 'tomorrow' | 'soon' | 'week' | 'later';
export const BUCKETS: DayBucket[] = ['today', 'tomorrow', 'soon', 'week', 'later'];
export const BUCKET_LABEL: Record<DayBucket, Record<Language, string>> = {
  today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
  tomorrow: { ru: 'Завтра', kg: 'Эртең', en: 'Tomorrow' },
  soon: { ru: 'В ближайшие дни', kg: 'Жакынкы күндөрү', en: 'Next few days' },
  week: { ru: 'На этой неделе', kg: 'Ушул жумада', en: 'This week' },
  later: { ru: 'Позднее', kg: 'Кийинчерээк', en: 'Later' },
};

/** Группа по дате начала (идущее сейчас — «Сегодня»); дальше 30 дней и прошедшее — null */
export const bucketOf = (a: Announcement, now = Date.now()): DayBucket | null => {
  const d = kgDaysUntil(a.startDate, now);
  if (d < 0) return isOngoing(a, now) ? 'today' : null;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 3) return 'soon';
  if (d <= 7) return 'week';
  if (d <= 30) return 'later';
  return null;
};

/**
 * Важность материала для главной — не по одной категории, а по сумме признаков:
 *  1) реальная срочность (срочная строка, высокий официальный уровень опасности);
 *  2) близость по времени: идёт сейчас, сегодня, завтра, в ближайшие дни;
 *  3) свежесть публикации;
 *  4) общественная значимость раздела — небольшой вес, а не первое место «по умолчанию»;
 *  5) подтверждение по первоисточнику.
 * Старое сообщение не поднимается наверх только из-за раздела.
 */
export const homeScore = (a: Announcement, now = Date.now()): number => {
  let s = 0;
  if (a.isUrgentTicker) s += 100;
  if (a.dangerLevel === 'high') s += 30;
  const d = kgDaysUntil(a.startDate, now);
  if (isOngoing(a, now)) s += 40;
  else if (d === 0) s += 45;
  else if (d === 1) s += 38;
  else if (d >= 2 && d <= 7) s += 30 - d * 2;
  else if (d > 7 && d <= 30) s += 10;
  const age = (now - kgTs(a.publishedAt || a.startDate)) / 86400_000;
  if (age >= 0) s += age < 1 ? 20 : age < 3 ? 12 : age < 7 ? 6 : 0;
  s += (4 - Math.min(4, importanceOf(a.category))) * 3;
  if (a.isVerified) s += 4;
  return s;
};
