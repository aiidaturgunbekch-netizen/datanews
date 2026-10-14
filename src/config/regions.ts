import { CategoryId, CityId, LocalizedString } from '../types';

/** Все категории публикаций (кроме служебной 'all') — в порядке показа */
export const CATEGORY_IDS: Exclude<CategoryId, 'all'>[] = [
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
];

/**
 * Семь областей Кыргызстана и города, которые сайт к ним относит.
 * Бишкек и Ош — города республиканского значения; для удобства они показаны вместе с Чуйской и Ошской областями.
 * Публикации с city = 'all' относятся ко всей стране и видны в каждой области.
 */
export const REGIONS: { id: string; name: LocalizedString; cities: CityId[] }[] = [
  { id: 'chui', name: { ru: 'Чуйская область и г. Бишкек', kg: 'Чүй облусу жана Бишкек ш.', en: 'Chui Region & Bishkek' }, cities: ['bishkek'] },
  { id: 'osh', name: { ru: 'Ошская область и г. Ош', kg: 'Ош облусу жана Ош ш.', en: 'Osh Region & Osh' }, cities: ['osh'] },
  { id: 'jalalabad', name: { ru: 'Джалал-Абадская область', kg: 'Жалал-Абад облусу', en: 'Jalal-Abad Region' }, cities: ['jalalabad'] },
  { id: 'issykkul', name: { ru: 'Иссык-Кульская область', kg: 'Ысык-Көл облусу', en: 'Issyk-Kul Region' }, cities: ['karakol'] },
  { id: 'talas', name: { ru: 'Таласская область', kg: 'Талас облусу', en: 'Talas Region' }, cities: ['talas'] },
  { id: 'naryn', name: { ru: 'Нарынская область', kg: 'Нарын облусу', en: 'Naryn Region' }, cities: ['naryn'] },
  { id: 'batken', name: { ru: 'Баткенская область', kg: 'Баткен облусу', en: 'Batken Region' }, cities: ['batken'] },
];
