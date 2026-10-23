import type { Language } from '../types';

/** Русские окончания: 1 запись, 2 записи, 5 записей */
export const ruPlural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

/** «2 записи» / «2 жазуу» / «2 records» */
export const recordsLabel = (n: number, lang: Language) =>
  lang === 'kg' ? `${n} жазуу` : lang === 'en' ? `${n} record${n === 1 ? '' : 's'}` : `${n} ${ruPlural(n, 'запись', 'записи', 'записей')}`;
