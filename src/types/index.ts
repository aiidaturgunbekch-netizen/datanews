export type Language = 'ru' | 'kg' | 'en';

export type CategoryId =
  | 'all'
  | 'water'
  | 'electricity'
  | 'roads'
  | 'repairs'
  | 'concerts'
  | 'festivals'
  | 'fairs'
  | 'exhibitions'
  | 'culture'
  | 'sport'
  | 'cinema'
  | 'education'
  | 'gov'
  | 'hazard'
  | 'state'
  | 'laws';

/**
 * Где действует публикация. Бишкек и Ош — города республиканского значения, отдельно от областей;
 * остальные — области (конкретный город, район или айыл аймак указывается в district / locality).
 * 'karakol' — устаревшее значение, приводится к 'issykkul' (normalizeCity).
 */
export type CityId =
  | 'all'
  | 'bishkek'
  | 'osh'
  | 'chui'
  | 'osh_region'
  | 'issykkul'
  | 'jalalabad'
  | 'talas'
  | 'naryn'
  | 'batken'
  | 'karakol';

export type UrgencyType = 'emergency' | 'planned' | 'regular' | 'event';

export type AnnouncementStatus =
  | 'active'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'archived';

export interface LocalizedString {
  ru: string;
  kg: string;
  en: string;
}

export interface TransportImpact {
  title: LocalizedString;
  routes: string[];
  status: 'changed' | 'suspended' | 'normal';
  description: LocalizedString;
}

export interface DetourRoute {
  name: LocalizedString;
  description: LocalizedString;
  type: 'recommended' | 'alternative';
}

export interface EmergencyContact {
  name: string;
  phone: string;
  isTollFree?: boolean;
  icon?: string;
  label?: string;
}

export interface EventDetails {
  priceText?: LocalizedString;
  ticketUrl?: string;
  organizer?: string;
  venue?: string;
  timeRange?: string;
  contactPhone?: string;
}

export interface Announcement {
  id: string;
  protocolCode: string;
  title: LocalizedString;
  summary: LocalizedString;
  description: LocalizedString;
  category: CategoryId;
  city: CityId;
  /** Населённый пункт: город, село, айыл аймак (например, «Чолпон-Ата», «Кара-Кульджинский айыл аймак») */
  locality?: string;
  district?: string;
  location: LocalizedString;
  coordinates?: {
    lat: number;
    lng: number;
  };
  startDate: string; // ISO string or YYYY-MM-DDTHH:mm
  endDate: string;
  durationBadge?: string; // e.g. "60 ч"
  urgency: UrgencyType;
  status: AnnouncementStatus;
  isUrgentTicker?: boolean;
  sourceName: string;
  sourceOrgType: string; // 'ВК' | 'МБ' | 'НЭ' | 'УП' | 'ФК'
  /** Устаревшее имя поля источника — читается через eventSource() для совместимости */
  sourceUrl?: string;
  isVerified: boolean;
  publishedAt: string;
  updatedAt: string;
  
  // Specific civic detail parameters (as seen in Image 5)
  workType?: LocalizedString;
  workGoal?: LocalizedString;
  contractor?: LocalizedString;
  workMode?: LocalizedString; // e.g. "круглосуточно (3 смены)"
  intersectionsNote?: LocalizedString; // e.g. "Включая перекресток с ул. Исанова"
  
  officialStatement?: {
    title: LocalizedString;
    text: LocalizedString;
    quoteSource?: string;
    originalDocUrl?: string;
    verificationDate?: string;
  };

  transportImpact?: TransportImpact[];
  detourRoutes?: DetourRoute[];
  emergencyContacts?: EmergencyContact[];
  eventDetails?: EventDetails;
  waterSupplyStatus?: LocalizedString;
  residentialAccess?: LocalizedString;
  
  /** Изображение события: ссылка на файл (или /api/image?id=… для загруженных) */
  imageUrl?: string;
  /** Страница-первоисточник изображения (например, файл на Wikimedia Commons) */
  imageSourceUrl?: string;
  /** Описание изображения для доступности (alt) */
  imageAlt?: string;
  /** Автор / лицензия изображения */
  imageCredit?: string;
  /**
   * Как вписывать изображение: 'contain' (по умолчанию) — целиком, без обрезки, с размытым фоном;
   * 'cover' — заполнить рамку (подходит для широких баннеров без важных деталей по краям).
   */
  imageFit?: 'contain' | 'cover';
  /** Точка фокуса для 'cover', CSS object-position (например, 'center 20%') */
  imagePosition?: string;

  /** Источник информации о событии (статья, официальная страница) */
  eventSourceUrl?: string;
  /**
   * Чем является eventSourceUrl: 'official' — официальный сайт госоргана / мэрии / службы или GovTicket,
   * 'organizer' — официальная страница организатора или площадки, 'ticket' — страница билетного сервиса,
   * 'media' — публикация СМИ (используется, только если официального сообщения нет в открытом доступе).
   * Если не задано — определяется по адресу (utils/links.ts → sourceKindOf).
   */
  sourceKind?: SourceKind;
  /** Дополнительный источник (обычно СМИ), когда основной — официальный */
  additionalSourceUrl?: string;
  /** Официальный сайт ответственного ведомства (мэрия, служба) — когда само сообщение там не найдено */
  authorityUrl?: string;
  /** Страница покупки билетов на конкретное событие */
  ticketUrl?: string;
  /** true — ссылка на билеты проверена администратором */
  ticketUrlVerified?: boolean;
  /** Официальный сайт организатора */
  organizerUrl?: string;
  /** Официальный сайт артиста */
  artistUrl?: string;
  /** Официальный сайт площадки */
  venueUrl?: string;

  /** Модерация: публикации пользователей видны только после одобрения админом */
  moderationStatus?: ModerationStatus;
  moderationNote?: string;
  submittedBy?: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    organization?: string;
  };

  /** Время начала ещё не объявлено — показывается только дата */
  timeTBA?: boolean;
  /** Событие на весь день (праздник, срок кампании) — показываются только даты */
  allDay?: boolean;
  /** Когда редакция последний раз проверила информацию (ISO, время Бишкека) */
  lastCheckedAt?: string;
  /**
   * Откуда запись: 'manual' — внесена редакцией вручную по источнику, 'user' — прислал организатор через кабинет,
   * 'auto' — зарезервировано для будущего автоматического сбора (сейчас не используется).
   */
  dataOrigin?: 'manual' | 'user' | 'auto';

  /**
   * Официальный уровень опасности (только по сообщению ответственного ведомства):
   * 'high' — высокая / непосредственная опасность (красный), 'warning' — потенциальная (жёлтый), 'info' — без опасности (нейтральный).
   */
  dangerLevel?: 'high' | 'warning' | 'info';
  /** Вид госновости: решение, заявление, поручение / обещание, встреча / визит, заседание, закон / акт */
  newsKind?: 'decision' | 'statement' | 'instruction' | 'meeting' | 'session' | 'law' | 'program';
  /** Юридические подробности для «Законы и изменения правил» и решений */
  legal?: LegalInfo;

  /** Опубликовано подтверждённым госорганом без предварительной модерации; организация отвечает за сведения сама */
  publishedByGov?: boolean;
  /** История изменений (создание, правки, модерация, жалобы, снятие) */
  history?: HistoryEntry[];
  /** Количество поступивших жалоб */
  reportsCount?: number;

  isDemo: boolean;
}

export interface LegalInfo {
  /** Название и номер документа */
  docTitle?: LocalizedString;
  /** Даты: принятие / подписание, официальное опубликование, вступление в силу (YYYY-MM-DD) */
  adoptedAt?: string;
  officialPublishedAt?: string;
  effectiveFrom?: string;
  /** Что изменилось, кого касается, что делать на практике, переходный период / исключения */
  whatChanged?: LocalizedString;
  whoAffected?: LocalizedString;
  whatToDo?: LocalizedString;
  transitional?: LocalizedString;
  /** Ссылка на официальный текст документа */
  docUrl?: string;
}

export type SourceKind = 'official' | 'organizer' | 'ticket' | 'media';

export interface HistoryEntry {
  at: string;
  by: 'admin' | 'author' | 'reader' | 'system';
  action: 'created' | 'published' | 'edited' | 'approved' | 'rejected' | 'withdrawn' | 'restored' | 'reported';
  note?: string;
  /** Что существенно изменилось при правке: дата, место, заголовок, цена, статус, билеты, вступление в силу */
  changes?: HistoryChange[];
}

export type HistoryChange = 'date' | 'place' | 'title' | 'price' | 'status' | 'tickets' | 'effective';

/** 'withdrawn' — снято с публикации (автором-госорганом или администратором), на сайте не показывается */
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface Report {
  id: string;
  annId: string;
  annTitle: string;
  reason: 'false' | 'outdated' | 'offensive' | 'spam' | 'other';
  comment?: string;
  contact?: string;
  at: string;
  status: 'open' | 'resolved';
  resolution?: string;
}

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'rejected';

/** Все тарифы — на 30 дней. Старые 'basic' / 'business' приводятся normalizePlan() */
export type PlanId = 'start' | 'private' | 'culture' | 'organizer' | 'gov';

/** Оплаченный 30-дневный период (история платежей хранится полностью) */
export interface PlanPeriod {
  id: string;
  plan: PlanId;
  /** Начало и конец периода (ISO, UTC) */
  start: string;
  end: string;
  paymentRef?: string;
  priceSom: number;
  confirmedAt: string;
  /** Период досрочно остановлен администратором */
  suspendedAt?: string;
}

export type GovStatus = 'none' | 'pending' | 'verified' | 'rejected';

/** Заявка на подтверждение официального статуса госоргана / муниципалитета */
export interface GovVerification {
  orgName: string;
  position: string;
  officialSite: string;
  officialEmail: string;
  documentRef: string;
  requestedAt: string;
  verifiedAt?: string;
  note?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  plan: PlanId;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  /** Конец последнего оплаченного периода (ISO) */
  paidUntil?: string;
  /** Все оплаченные периоды — история платежей */
  periods?: PlanPeriod[];
  /** Статус государственного аккаунта: публикует без предварительной модерации только 'verified' */
  govStatus?: GovStatus;
  gov?: GovVerification;
  createdAt: string;
}

/** Использование тарифа — считает сервер (GET /api/auth) */
export interface PlanUsage {
  plan: PlanId;
  active: boolean;
  /** Почему публиковать сейчас нельзя */
  reason?: 'payment_required' | 'period_expired' | 'pack_exhausted' | 'daily_limit_reached';
  /** Текущий период (если есть) */
  periodStart?: string;
  periodEnd?: string;
  /** Следующий уже оплаченный период (продление заранее) */
  nextPeriodStart?: string;
  postLimit: number | null;
  postsUsed: number;
  /** Осталось публикаций в текущем периоде (null — без лимита) */
  postsLeft: number | null;
  /** Публикации подтверждённого госоргана выходят без предварительной модерации */
  skipsModeration: boolean;
  dailyLimit: number | null;
  postedToday: boolean;
  /** Дата по Бишкеку, когда снова можно публиковать (при дневном лимите) */
  nextAllowedDate?: string;
}

export interface DayStats {
  date: string;
  views: number;
  visitors: number;
}

export interface SiteStats {
  days: DayStats[];
  totals: { views: number; visitors: number; todayViews: number; todayVisitors: number };
  topPages: { key: string; count: number }[];
  topReferrers: { key: string; count: number }[];
  devices: { key: string; count: number }[];
  languages: { key: string; count: number }[];
  cities: { key: string; count: number }[];
}

export type ViewMode = 'home' | 'calendar' | 'alerts' | 'events' | 'cities' | 'organizations' | 'pricing' | 'admin' | 'about' | 'sources' | 'privacy' | 'rules' | 'contacts';
