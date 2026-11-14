/**
 * Языки публикаций: русская версия сайта показывает только русские тексты, кыргызская — только кыргызские.
 * Тексты разных языков никогда не смешиваются: если у публикации нет текста на языке сайта, в этой версии её нет
 * (английская версия при отсутствии перевода показывает русский текст).
 */
import type { Announcement, Language } from '../types';

/** Буквы, которых нет в русском: ң, ө, ү */
const KG_LETTERS = /[ңөүҢӨҮ]/g;

/**
 * Текст на кыргызском: заметная доля букв ң, ө, ү (одно-два вхождения в русском тексте — например, «Алтын күз» —
 * кыргызским его не делают)
 */
export const looksKyrgyz = (s = '') => {
  const n = (s.match(KG_LETTERS) || []).length;
  const letters = (s.match(/[а-яёңөү]/gi) || []).length;
  return n >= 3 && n / Math.max(1, letters) >= 0.008;
};

/** Язык текста (для черновика из письма или кабинета): кыргызский или русский */
export const detectLang = (s = ''): 'ru' | 'kg' => (looksKyrgyz(s) ? 'kg' : 'ru');

type Texts = Pick<Announcement, 'title' | 'description'>;
const t = (a: Texts, k: 'title' | 'description', lang: Language) => (a[k]?.[lang] || '').trim();

/** Есть ли у публикации свой текст на этом языке (не копия другого языка) */
export const hasLangText = (a: Texts, lang: Language): boolean => {
  const title = t(a, 'title', lang);
  const desc = t(a, 'description', lang);
  if (!title || !desc) return false;
  if (lang === 'ru') return !looksKyrgyz(`${title}\n${desc}`);
  if (lang === 'kg') return looksKyrgyz(desc) || desc !== t(a, 'description', 'ru');
  return desc !== t(a, 'description', 'ru') && !looksKyrgyz(desc);
};

/** Показывать ли публикацию в этой версии сайта */
export const visibleIn = (a: Texts, lang: Language) => (lang === 'en' ? hasLangText(a, 'en') || hasLangText(a, 'ru') : hasLangText(a, lang));

/** Каких переводов не хватает (для пометок в панели): «RU», «KG» */
export const missingLangs = (a: Texts): ('RU' | 'KG')[] => [
  ...(hasLangText(a, 'ru') ? [] : (['RU'] as const)),
  ...(hasLangText(a, 'kg') ? [] : (['KG'] as const)),
];
