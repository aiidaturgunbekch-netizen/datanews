export const STATS_TTL = 400 * 86400; // храним ~13 месяцев

export const dayKey = (d: Date) => {
  // Время Бишкека (UTC+6), чтобы «сегодня» совпадало с местным днём
  const local = new Date(d.getTime() + 6 * 3600_000);
  return local.toISOString().slice(0, 10);
};

export const K = {
  views: (day: string) => `dn:st:v:${day}`,
  visitors: (day: string) => `dn:st:u:${day}`,
  pages: (day: string) => `dn:st:p:${day}`,
  refs: (day: string) => `dn:st:r:${day}`,
  devices: (day: string) => `dn:st:d:${day}`,
  langs: (day: string) => `dn:st:l:${day}`,
  cities: (day: string) => `dn:st:c:${day}`,
  /** Прочтения публикаций за день: id публикации → число открытий карточки */
  reads: (day: string) => `dn:st:n:${day}`,
  allVisitors: 'dn:st:u:all',
  allViews: 'dn:st:v:all',
};
