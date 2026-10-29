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

/** Число 0…1 из строки (FNV-1a): одинаковое для одной и той же пары «посещение + публикация» */
const unitHash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

/**
 * Три материала для «Главного» на главной.
 *  - Кандидаты — самые актуальные по homeScore (срочность, близость даты, свежесть, значимость, проверка);
 *    в ротацию идут только сильные кандидаты (до 8 лучших, не ниже 40% лучшей оценки), а не любые публикации.
 *  - Срочное (бегущая строка, высокая опасность) всегда остаётся наверху и не ротируется.
 *  - Внутри сильных кандидатов порядок перемешивается по `seed` — номеру посещения (оценка × 0,5…1,5, поэтому
 *    более актуальные выигрывают чаще, но первое место не закреплено за одной публикацией): после обновления страницы
 *    состав может смениться, а пока страница открыта, он не меняется (seed один на посещение).
 *  - Не больше одного материала из рубрики, пока есть материалы других рубрик; без повторов.
 */
export const pickTopStories = <T extends Announcement>(pool: T[], seed: number, rubricOf: (a: T) => string, now = Date.now(), count = 3): T[] => {
  const scored = pool.map((a) => ({ a, s: homeScore(a, now) })).sort((x, y) => y.s - x.s);
  if (scored.length === 0) return [];
  const urgent = scored.filter((x) => x.s >= 100);
  const best = scored.find((x) => x.s < 100)?.s ?? 0;
  const rotating = scored
    .filter((x) => x.s < 100 && x.s >= best * 0.4)
    .slice(0, 8)
    .map((x) => ({ ...x, k: x.s * (0.5 + unitHash(`${seed}:${x.a.id}`)) }))
    .sort((x, y) => y.k - x.k);
  const inRotation = new Set(rotating.map((x) => x.a.id));
  const order = [...urgent, ...rotating, ...scored.filter((x) => x.s < 100 && !inRotation.has(x.a.id))].map((x) => x.a);
  const picked: T[] = [];
  const used = new Set<string>();
  for (const a of order) {
    if (picked.length >= count) break;
    if (used.has(rubricOf(a))) continue;
    used.add(rubricOf(a));
    picked.push(a);
  }
  for (const a of order) {
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
