import type { Announcement } from '../types';
import { INITIAL_ANNOUNCEMENTS } from '../data/initialAnnouncements';

/** Пометка в истории, которую ставит кнопка «Проверено сегодня» */
export const CHECK_NOTE = 'Сверено с первоисточником';

const BUILTIN = new Map(INITIAL_ANNOUNCEMENTS.map((a) => [a.id, a]));

/**
 * Полная копия встроенной публикации, сохранённая только ради даты проверки (старое поведение «Проверено сегодня»):
 * сверх истории встроенной версии в ней лишь отметки проверки. Такие копии не должны заменять версию из кода.
 */
export const isCheckOnlyCopy = (a: Announcement) => {
  const builtin = BUILTIN.get(a.id);
  if (!builtin) return false;
  const extra = (a.history || []).slice((builtin.history || []).length);
  return extra.length > 0 && extra.every((h) => h.action === 'edited' && h.note === CHECK_NOTE && !h.changes?.length);
};

/** Более поздняя из двух меток времени (обе — бишкекское время YYYY-MM-DDTHH:mm, сравниваются как строки) */
const later = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * Встроенные публикации + публикации и правки из базы. Для встроенных без правок берётся версия из кода,
 * а из базы — только дата последней проверки (checked: id → дата).
 */
export const mergeAnnouncements = (server: Announcement[], hidden: string[] = [], checked: Record<string, string> = {}) => {
  const byId = new Map<string, Announcement>();
  INITIAL_ANNOUNCEMENTS.forEach((a) => {
    const at = later(a.lastCheckedAt, checked[a.id]);
    byId.set(a.id, at && at !== a.lastCheckedAt ? { ...a, lastCheckedAt: at } : a);
  });
  server.forEach((a) => byId.set(a.id, a));
  hidden.forEach((id) => byId.delete(id));
  return [...byId.values()];
};
