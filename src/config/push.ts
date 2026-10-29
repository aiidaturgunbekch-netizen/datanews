import type { Language, LocalizedString } from '../types';

/**
 * Темы push-уведомлений — общие для сервера, сайта и панели администратора.
 * 'urgent' — срочные предупреждения (прежняя подписка: старые подписки без тем считаются подпиской на неё).
 * Остальные — рубрики сайта; ссылка уведомления ведёт на публикацию или раздел.
 */
export type PushTopic = 'urgent' | 'news' | 'state' | 'tech' | 'business' | 'culture' | 'sport' | 'education';
export const PUSH_TOPICS: PushTopic[] = ['urgent', 'news', 'state', 'tech', 'business', 'culture', 'sport', 'education'];

export const PUSH_TOPIC_LABEL: Record<PushTopic, Record<Language, string>> = {
  urgent: { ru: 'Срочные предупреждения', kg: 'Шашылыш эскертүүлөр', en: 'Urgent warnings' },
  news: { ru: 'Новости', kg: 'Жаңылыктар', en: 'News' },
  state: { ru: 'Государство', kg: 'Мамлекет', en: 'Government' },
  tech: { ru: 'ИИ и IT-технологии', kg: 'Жасалма интеллект жана IT-технологиялар', en: 'AI & IT Technologies' },
  business: { ru: 'Бизнес-новости', kg: 'Бизнес жаңылыктары', en: 'Business News' },
  culture: { ru: 'Культура и афиша', kg: 'Маданият жана афиша', en: 'Culture & events' },
  sport: { ru: 'Спорт', kg: 'Спорт', en: 'Sport' },
  education: { ru: 'Образование', kg: 'Билим берүү', en: 'Education' },
};

/** Темы старой подписки (до выбора тем) */
export const DEFAULT_TOPICS: PushTopic[] = ['urgent'];

export const isPushTopic = (v: unknown): v is PushTopic => PUSH_TOPICS.includes(v as PushTopic);

/** Ограничения длины текста уведомления (браузеры обрезают длинные заголовки) */
export const PUSH_TITLE_MAX = 80;
export const PUSH_BODY_MAX = 180;

/** Защита от слишком частых рассылок: интервал между рассылками (мин) и предел за сутки */
export const PUSH_MIN_INTERVAL_MIN = { alert: 1, custom: 5 } as const;
export const PUSH_DAILY_LIMIT = 20;
/** Журнал отправок — последние N записей */
export const PUSH_LOG_LIMIT = 200;

export type PushLang = Language;
export type PushText = LocalizedString;
