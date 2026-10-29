import type { Announcement } from '../types';
import { translations } from '../locales/translations';
import { RUBRICS } from '../config/rubrics';

/**
 * Поиск по публикациям — один для строки поиска на главной и окна поиска.
 *  - Регистр не важен: «аба», «АБА», «Аба» — одно и то же (в том числе для Ө Ү Ң).
 *  - Кыргызские буквы можно набрать без кыргызской раскладки: ө ≈ о, ү ≈ у, ң ≈ н; ё ≈ е.
 *  - Слова запроса ищутся в начале слов текста (окончания и словоформы): «бороон» найдёт «Бороондук»,
 *    но «аба» не найдёт «Кабар»; короткое слово (до 4 букв) — только с окончанием до 4 букв. Если слов несколько — все должны найтись (в любом порядке).
 *  - Ищем по заголовку, кратко, тексту, месту, району, источнику и названию раздела — на трёх языках;
 *    исходный текст публикаций не меняется.
 */
export const normalizeSearch = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ө/g, 'о')
    .replace(/ү/g, 'у')
    .replace(/ң/g, 'н')
    .replace(/\s+/g, ' ')
    .trim();

const categoryLabels = (a: Announcement): string[] => {
  const cat = (translations.categories as Record<string, Record<string, string>>)[a.category];
  const rubric = RUBRICS.find((r) => !r.aggregate && r.categories.includes(a.category));
  return [...(cat ? Object.values(cat) : []), ...(rubric ? Object.values(rubric.label) : [])];
};

/** Весь текст публикации для поиска (уже нормализованный) */
export const searchText = (a: Announcement) =>
  normalizeSearch(
    [
      ...Object.values(a.title || {}),
      ...Object.values(a.summary || {}),
      ...Object.values(a.description || {}),
      ...Object.values(a.location || {}),
      a.district,
      a.locality,
      a.protocolCode,
      a.sourceName,
      a.eventDetails?.venue,
      ...categoryLabels(a),
    ]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join(' \n ')
  );

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Подходит ли публикация под запрос (пустой запрос — подходит всё) */
export const matchesSearch = (a: Announcement, query: string, text = searchText(a)) => {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  // слово в начале слова текста: перед ним начало строки или не буква/цифра.
  // Короткое слово (до 4 букв) — только с обычным окончанием (до 4 букв): «аба» → «абада», «абанын», но не «абаттандыруу»
  return words.every((w) => {
    const tail = w.length <= 4 ? '\\p{L}{0,4}(?![\\p{L}\\p{N}])' : '';
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w)}${tail}`, 'u').test(text);
  });
};
