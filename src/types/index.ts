export type Language = 'ru' | 'kg' | 'en';

export type CategoryId =
  | 'all'
  | 'water'
  | 'electricity'
  | 'roads'
  | 'repairs'
  | 'concerts'
  | 'festivals'
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
  
  isDemo: boolean;
}

export type ViewMode = 'home' | 'calendar' | 'alerts' | 'events' | 'cities' | 'organizations' | 'pricing' | 'admin';
