import { Announcement } from '../types';
import { kgDaysUntil, kgTs } from './time';

/** Категории-предупреждения (коммунальные и дорожные) */
const ALERT_CATEGORIES = ['water', 'electricity', 'roads', 'repairs', 'hazard'];

/** Публикация — предупреждение (отключение, перекрытие, срочное/плановое уведомление) */
export const isAlert = (a: Announcement) =>
  a.urgency === 'emergency' || a.urgency === 'planned' || ALERT_CATEGORIES.includes(a.category);

/** Время окончания: endDate, а если его нет — конец дня начала (для предупреждений) или +4 часа (для событий) */
export const endTs = (a: Announcement) => {
  const end = a.endDate && a.endDate.length === 10 ? kgTs(`${a.endDate}T23:59`) : kgTs(a.endDate);
  if (!isNaN(end)) return end;
  const start = kgTs(a.startDate);
  return isAlert(a) || a.timeTBA || a.allDay ? kgTs(`${a.startDate.slice(0, 10)}T23:59`) : start + 4 * 3600_000;
};

/** Срок действия истёк (или публикация отменена/в архиве) */
export const isExpired = (a: Announcement, now = Date.now()) =>
  a.status === 'cancelled' || a.status === 'archived' || a.status === 'completed' || endTs(a) < now;

/**
 * Уровень предупреждения:
 *  - 'urgent'  — идёт сейчас или начнётся в ближайшие 0–3 календарных дня по Бишкеку (красный, мигает);
 *  - 'soon'    — до начала больше 3 дней (жёлтый, без мигания);
 *  - 'expired' — срок действия закончился (не показывается как актуальное);
 *  - null      — это не предупреждение.
 */
export type AlertLevel = 'urgent' | 'soon' | 'expired' | null;

export const alertLevel = (a: Announcement, now = Date.now()): AlertLevel => {
  if (!isAlert(a)) return null;
  if (isExpired(a, now)) return 'expired';
  // Официальный уровень опасности важнее близости даты: красный — только для высокой опасности
  if (a.dangerLevel === 'high') return 'urgent';
  if (a.dangerLevel === 'warning') return 'soon';
  if (a.dangerLevel === 'info') return null;
  if (kgTs(a.startDate) <= now) return 'urgent';
  return kgDaysUntil(a.startDate, now) <= 3 ? 'urgent' : 'soon';
};

/** Видна ли публикация в общих списках: завершённые предупреждения скрываются, события остаются в архиве */
export const isListed = (a: Announcement, now = Date.now()) => !(isAlert(a) && isExpired(a, now));
