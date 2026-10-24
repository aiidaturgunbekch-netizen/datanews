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

/**
 * Значимость раздела для блока «Главное» (меньше — выше): сначала решения государства и то, что касается всех жителей,
 * затем деловые и образовательные события, затем досуг. Внутри уровня порядок — по свежести.
 */
const IMPORTANCE: Partial<Record<CategoryId, number>> = {
  state: 0,
  gov: 0,
  laws: 0,
  hazard: 1,
  roads: 1,
  water: 1,
  electricity: 1,
  repairs: 1,
  education: 2,
  fairs: 2,
  exhibitions: 2,
  festivals: 3,
  culture: 3,
  concerts: 4,
  cinema: 4,
  sport: 4,
};
export const importanceOf = (category: CategoryId) => IMPORTANCE[category] ?? 3;

/** Рубрика раздела (для разнообразия блока «Главное») */
export const rubricIdOf = (category: CategoryId) => RUBRICS.find((r) => r.categories.includes(category))?.id || category;

/**
 * Разнообразная подборка: идём по уже упорядоченному списку и берём не больше `perRubric` материалов одной рубрики;
 * если разнообразных не хватает — добираем по порядку.
 */
export const diversePick = <T extends { id: string; category: CategoryId }>(sorted: T[], count: number, perRubric = 2): T[] => {
  const picked: T[] = [];
  const used = new Map<string, number>();
  for (const a of sorted) {
    if (picked.length >= count) break;
    const r = rubricIdOf(a.category);
    if ((used.get(r) || 0) >= perRubric) continue;
    used.set(r, (used.get(r) || 0) + 1);
    picked.push(a);
  }
  for (const a of sorted) {
    if (picked.length >= count) break;
    if (!picked.includes(a)) picked.push(a);
  }
  return picked;
};
