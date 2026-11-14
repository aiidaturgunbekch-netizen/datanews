import type { Announcement, Language } from '../types';
import { kgDaysUntil, kgTs } from './time';
import { endTs } from './urgency';
import { importanceOf } from '../config/rubrics';
import { isFresh } from './statusUtils';

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


/**
 * «Главное» — три материала наверху главной. Порядок постоянный (не случайный, одинаковый у всех читателей):
 *  1) закреплённые редакцией («В Главное», пока не истёк срок) — сначала последние закреплённые;
 *  2) срочное (аварийные предупреждения и «бегущая строка»);
 *  3) остальное по оценке: близость даты, свежесть, значимость + прочтения читателей (самое читаемое поднимается выше).
 * Автоматически — по одному материалу на рубрику, чтобы «Главное» не состояло из трёх концертов; закреплённые — без этого ограничения.
 */
export const pickTopStories = <T extends Announcement>(
  pool: T[],
  reads: Record<string, number>,
  rubricOf: (a: T) => string,
  now = Date.now(),
  count = 3
): T[] => {
  const nowLocal = new Date(now + 6 * 3600_000).toISOString().slice(0, 16);
  const featured = pool
    .filter((a) => a.featuredUntil && a.featuredUntil > nowLocal)
    .sort((x, y) => (y.featuredUntil || '').localeCompare(x.featuredUntil || ''));
  const score = (a: T) => homeScore(a, now) + Math.min(30, (reads[a.id] || 0) * 2);
  const rest = pool.filter((a) => !featured.includes(a)).sort((x, y) => score(y) - score(x) || x.id.localeCompare(y.id));
  const picked: T[] = featured.slice(0, count);
  const used = new Set(picked.map(rubricOf));
  for (const a of rest) {
    if (picked.length >= count) break;
    if (used.has(rubricOf(a))) continue;
    used.add(rubricOf(a));
    picked.push(a);
  }
  for (const a of rest) {
    if (picked.length >= count) break;
    if (!picked.includes(a)) picked.push(a);
  }
  return picked;
};

/**
 * «Актуальные новости» рядом с открытой публикацией: только актуальные (не прошедшие) материалы,
 * без исключённых (текущая и «Читайте также»), по homeScore, сначала по одному из каждой рубрики, без повторов.
 */
export const pickSideNews = <T extends Announcement>(all: T[], exclude: Set<string>, rubricOf: (a: T) => string, now = Date.now(), count = 5): T[] => {
  const seen = new Set<string>();
  const pool = all
    .filter((x) => !exclude.has(x.id) && isFresh(x, new Date(now)) && !seen.has(x.id) && (seen.add(x.id), true))
    .sort((x, y) => homeScore(y, now) - homeScore(x, now));
  const picked: T[] = [];
  const used = new Set<string>();
  for (const x of pool) {
    if (picked.length >= count) break;
    if (used.has(rubricOf(x))) continue;
    used.add(rubricOf(x));
    picked.push(x);
  }
  for (const x of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(x)) picked.push(x);
  }
  return picked;
};
