import type { CategoryId, CityId, ViewMode } from './index';

/** Быстрые темы бота (кнопки в начале диалога) */
export type BotIntent =
  | 'today'
  | 'regions'
  | 'weather'
  | 'storm'
  | 'passes'
  | 'state'
  | 'laws'
  | 'shows'
  | 'tickets'
  | 'howto'
  | 'tariffs'
  | 'contact'
  | 'help'
  | 'search';

export const BOT_INTENTS: Exclude<BotIntent, 'help' | 'search'>[] = [
  'today',
  'regions',
  'weather',
  'storm',
  'passes',
  'state',
  'laws',
  'shows',
  'tickets',
  'howto',
  'tariffs',
  'contact',
];

/** Переход по сайту из ответа бота */
export interface BotNav {
  view?: ViewMode;
  category?: CategoryId;
  city?: CityId;
  publish?: boolean;
}

export interface BotAction {
  label: string;
  intent?: BotIntent;
  /** Вопрос, который бот задаст сам себе (например, «новости Нарынской области») */
  q?: string;
  nav?: BotNav;
}

export interface BotLink {
  label: string;
  href: string;
}

export interface BotItem {
  id: string;
  title: string;
  when: string;
  place: string;
  /** Срок вступления закона в силу / статус */
  note?: string;
  sourceUrl?: string;
  sourceName?: string;
  ticketUrl?: string;
}

export interface BotReply {
  mode: 'bot';
  intent: BotIntent;
  answer: string;
  items: BotItem[];
  links: BotLink[];
  actions: BotAction[];
}
