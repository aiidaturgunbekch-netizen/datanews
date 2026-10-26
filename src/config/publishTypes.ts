import type { Announcement, CategoryId, PlanId } from '../types';
import { PLANS } from './site';

/**
 * Типы публикаций в простой форме личного кабинета и разделы сайта, в которые они попадают.
 * Используется и формой (какие карточки показать), и сервером (что разрешено) — правила одни.
 *
 *  - Мероприятие и онлайн-мероприятие — разделы афиши; онлайн отличается только тем,
 *    что в поле «Площадка» стоит «Онлайн», а физического адреса нет.
 *  - Предупреждение — отключения и дороги; уровень опасности и срочность ставит только редакция.
 *  - Объявление — раздел «Объявления».
 *  - Новость — официальные разделы, только подтверждённым госорганам;
 *    театрам на тарифе «Культура и театр» — новость своего театра в разделе «Театр и культура».
 */
export type PublishType = 'event' | 'online' | 'alert' | 'notice' | 'news';
export const PUBLISH_TYPES: PublishType[] = ['event', 'online', 'alert', 'notice', 'news'];

export const EVENT_CATS: CategoryId[] = ['concerts', 'festivals', 'fairs', 'exhibitions', 'culture', 'sport', 'cinema', 'education'];
export const ALERT_CATS: CategoryId[] = ['water', 'electricity', 'roads', 'repairs'];
/** Официальные разделы — публиковать в них могут только подтверждённые госорганы */
export const OFFICIAL_CATS: CategoryId[] = ['state', 'gov', 'laws', 'hazard'];
const NEWS_CATS: CategoryId[] = ['state', 'gov', 'laws'];

export const ONLINE_VENUE = 'Онлайн';
export const isOnline = (a: Pick<Announcement, 'eventDetails'>) => /^(онлайн|online)$/i.test((a.eventDetails?.venue || '').trim());

export interface Publisher {
  plan: PlanId;
  govVerified: boolean;
}

/** Разделы, разрешённые пользователю: ограничение тарифа («Культура и театр») и роль (официальные — только госорганам) */
export const allowedCategories = (p: Publisher): CategoryId[] => {
  const plan = PLANS[p.plan].categories;
  const all: CategoryId[] = [...EVENT_CATS, ...ALERT_CATS, 'notices', ...(p.govVerified ? NEWS_CATS : [])];
  return plan ? all.filter((c) => plan.includes(c)) : all;
};

/** Разделы для типа публикации с учётом прав пользователя (пусто — тип недоступен) */
export const categoriesFor = (type: PublishType, p: Publisher): CategoryId[] => {
  const allowed = allowedCategories(p);
  const plan = PLANS[p.plan].categories;
  switch (type) {
    case 'event':
    case 'online':
      return EVENT_CATS.filter((c) => allowed.includes(c));
    case 'alert':
      return ALERT_CATS.filter((c) => allowed.includes(c));
    case 'notice':
      return allowed.includes('notices') ? ['notices'] : [];
    case 'news':
      if (p.govVerified) return NEWS_CATS.filter((c) => allowed.includes(c));
      // театр на тарифе «Культура и театр» — новость своего театра в своём разделе
      return plan && plan.includes('culture') ? ['culture'] : [];
  }
};

export const availableTypes = (p: Publisher): PublishType[] => PUBLISH_TYPES.filter((t) => categoriesFor(t, p).length > 0);

/** Тип уже сохранённой публикации (для правки). Новость театра в разделе «Театр и культура» откроется как мероприятие. */
export const typeOf = (a: Pick<Announcement, 'category' | 'eventDetails'>): PublishType => {
  if (ALERT_CATS.includes(a.category)) return 'alert';
  if (a.category === 'notices') return 'notice';
  if (NEWS_CATS.includes(a.category)) return 'news';
  return isOnline(a) ? 'online' : 'event';
};
