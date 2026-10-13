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
  | 'cinema'
  | 'education'
  | 'gov';

export type CityId =
  | 'all'
  | 'bishkek'
  | 'osh'
  | 'jalalabad'
  | 'karakol'
  | 'talas'
  | 'naryn'
  | 'batken';

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

  isDemo: boolean;
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'rejected';

export type PlanId = 'basic' | 'business';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  plan: PlanId;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  /** До какого момента действует оплаченный тариф (ISO) */
  paidUntil?: string;
  createdAt: string;
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

export type ViewMode = 'home' | 'calendar' | 'alerts' | 'events' | 'cities' | 'organizations' | 'pricing' | 'admin';
