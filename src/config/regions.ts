import { CategoryId, CityId, LocalizedString } from '../types';

/** Все категории публикаций (кроме служебной 'all') — в порядке показа */
export const CATEGORY_IDS: Exclude<CategoryId, 'all'>[] = [
  'hazard',
  'water',
  'electricity',
  'roads',
  'repairs',
  'gov',
  'concerts',
  'festivals',
  'fairs',
  'exhibitions',
  'culture',
  'sport',
  'cinema',
  'education',
  'state',
  'laws',
  'news',
  'business',
  'tech',
  'notices',
];

/**
 * Места для фильтров: Бишкек и Ош (города республиканского значения) отдельно от областей,
 * затем семь областей. Публикации с city = 'all' относятся ко всей стране и видны везде.
 */
export const PLACE_IDS: Exclude<CityId, 'karakol'>[] = [
  'all',
  'bishkek',
  'osh',
  'chui',
  'osh_region',
  'issykkul',
  'jalalabad',
  'talas',
  'naryn',
  'batken',
];

/** Старые значения → новые */
export const normalizeCity = (c: string | undefined): CityId => (c === 'karakol' ? 'issykkul' : ((c as CityId) || 'bishkek'));

/** Регионы для статистики: 2 города республиканского значения и 7 областей (без «Весь Кыргызстан») */
export const REGIONS: { id: string; name: LocalizedString; cities: CityId[] }[] = [
  { id: 'bishkek', name: { ru: 'г. Бишкек', kg: 'Бишкек ш.', en: 'Bishkek City' }, cities: ['bishkek'] },
  { id: 'chui', name: { ru: 'Чуйская область', kg: 'Чүй облусу', en: 'Chui Region' }, cities: ['chui'] },
  // Регионы в сводках: 7 областей и Бишкек; г. Ош учитывается вместе с Ошской областью
  { id: 'osh_region', name: { ru: 'Ошская область и г. Ош', kg: 'Ош облусу жана Ош ш.', en: 'Osh Region & Osh City' }, cities: ['osh_region', 'osh'] },
  { id: 'issykkul', name: { ru: 'Иссык-Кульская область', kg: 'Ысык-Көл облусу', en: 'Issyk-Kul Region' }, cities: ['issykkul', 'karakol'] },
  { id: 'jalalabad', name: { ru: 'Джалал-Абадская область', kg: 'Жалал-Абад облусу', en: 'Jalal-Abad Region' }, cities: ['jalalabad'] },
  { id: 'talas', name: { ru: 'Таласская область', kg: 'Талас облусу', en: 'Talas Region' }, cities: ['talas'] },
  { id: 'naryn', name: { ru: 'Нарынская область', kg: 'Нарын облусу', en: 'Naryn Region' }, cities: ['naryn'] },
  { id: 'batken', name: { ru: 'Баткенская область', kg: 'Баткен облусу', en: 'Batken Region' }, cities: ['batken'] },
];
