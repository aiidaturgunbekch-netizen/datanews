import type { Announcement } from '../types';
import { isExpired } from './urgency';
import { eventSource, ticketLink } from './links';
import { formatKgDateTime, kgTs } from './time';

/** Сколько времени сверка считается свежей */
export const STALE_MS = 3 * 86400_000;

/**
 * Почему действующую опубликованную запись нужно сверить с первоисточником (пусто — сверять нечего).
 * Дата последней сверки — лишь одна из причин: «Не подтверждено» снимается только явной отметкой редактора.
 */
export const reviewReasons = (a: Announcement, now = Date.now()): string[] => {
  if (isExpired(a, now) || (a.moderationStatus && a.moderationStatus !== 'approved')) return [];
  const r: string[] = [];
  if (!a.lastCheckedAt) r.push('Дата проверки не указана');
  else if (now - kgTs(a.lastCheckedAt) > STALE_MS) r.push(`Проверено давно (${formatKgDateTime(a.lastCheckedAt)})`);
  if (!a.isVerified && !a.publishedByGov) r.push('Не подтверждено');
  if (!eventSource(a)) r.push('Нет ссылки на первоисточник');
  const ticket = ticketLink(a);
  if (ticket.url && !ticket.verified) r.push('Ссылка на билеты не проверена');
  if (a.category === 'laws' || a.category === 'state' || a.legal) {
    if (!a.legal?.docUrl) r.push('Нет ссылки на документ');
    if (!a.legal?.effectiveFrom) r.push('Нет даты вступления в силу');
  }
  return r;
};
