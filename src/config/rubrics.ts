import type { CategoryId, LocalizedString } from '../types';

/**
 * Рубрики для строки навигации под шапкой: 17 разделов сгруппированы по смыслу, как у крупных новостных сайтов.
 * Полный список разделов остаётся в выдвижной панели «Разделы».
 */
export interface Rubric {
  id: string;
  label: LocalizedString;
  categories: CategoryId[];
}

export const RUBRICS: Rubric[] = [
  { id: 'weather', label: { ru: 'Погода', kg: 'Аба ырайы', en: 'Weather' }, categories: ['hazard'] },
  {
    id: 'utilities',
    label: { ru: 'Отключения и ремонт', kg: 'Өчүрүүлөр жана оңдоо', en: 'Outages & repairs' },
    categories: ['water', 'electricity', 'repairs'],
  },
  { id: 'roads', label: { ru: 'Дороги', kg: 'Жолдор', en: 'Roads' }, categories: ['roads'] },
  { id: 'state', label: { ru: 'Государство', kg: 'Мамлекет', en: 'Government' }, categories: ['gov', 'state', 'laws'] },
  {
    id: 'culture',
    label: { ru: 'Культура и афиша', kg: 'Маданият жана афиша', en: 'Culture & events' },
    categories: ['concerts', 'festivals', 'culture', 'cinema'],
  },
  { id: 'sport', label: { ru: 'Спорт', kg: 'Спорт', en: 'Sport' }, categories: ['sport'] },
  {
    id: 'business',
    label: { ru: 'Выставки и ярмарки', kg: 'Көргөзмөлөр жана жарманкелер', en: 'Expos & fairs' },
    categories: ['exhibitions', 'fairs'],
  },
  { id: 'education', label: { ru: 'Образование', kg: 'Билим берүү', en: 'Education' }, categories: ['education'] },
];

export const rubricOf = (id: string | null | undefined) => RUBRICS.find((r) => r.id === id) || null;
