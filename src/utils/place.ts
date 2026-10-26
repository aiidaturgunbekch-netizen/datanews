import type { Announcement, CategoryId, Language } from '../types';

/**
 * Место публикации — только то, что известно из источника.
 *  - location — точный адрес / место проведения / улицы / участок дороги (может быть пустым);
 *  - eventDetails.venue — название площадки, для онлайн-мероприятия — «Онлайн» (не адрес, на карту не попадает);
 *  - locality / district / city — территория (населённый пункт, район, область).
 * Ничего не подставляется: если адреса нет, строка места не показывается.
 */

/** Афиши: место проведения желательно, но не обязательно */
export const EVENT_CATEGORIES: CategoryId[] = ['concerts', 'festivals', 'fairs', 'exhibitions', 'culture', 'sport', 'cinema', 'education'];
/** Предупреждения: важна территория — районы, улицы, участок дороги */
export const TERRITORY_CATEGORIES: CategoryId[] = ['water', 'electricity', 'roads', 'repairs', 'hazard'];

/** Адрес, а если его нет — название площадки (например, «Онлайн»); иначе пусто */
export const placeText = (a: Pick<Announcement, 'location' | 'eventDetails'>, lang: Language = 'ru') =>
  (a.location?.[lang] || a.location?.ru || '').trim() || (a.eventDetails?.venue || '').trim();

/** Есть ли точный адрес, по которому можно искать на карте */
export const hasAddress = (a: Pick<Announcement, 'location'>) => Boolean((a.location?.ru || '').trim());

export interface PlaceFields {
  category: CategoryId;
  location: string;
  venue: string;
  locality: string;
  district: string;
}

/**
 * Подсказка редактору о месте. Это только подсказка — сохранение никогда не запрещается,
 * чтобы не приходилось вписывать выдуманный адрес. Тексты подсказок — в locales/account.ts (fHintEvent, fHintTerritory).
 */
export const placeHint = (f: PlaceFields): 'event' | 'territory' | null => {
  const has = (s: string) => Boolean(s.trim());
  if (EVENT_CATEGORIES.includes(f.category)) return has(f.location) || has(f.venue) ? null : 'event';
  if (TERRITORY_CATEGORIES.includes(f.category)) return has(f.location) || has(f.locality) || has(f.district) ? null : 'territory';
  // Новости госорганов, решения, законы, общие объявления — адрес не нужен
  return null;
};
