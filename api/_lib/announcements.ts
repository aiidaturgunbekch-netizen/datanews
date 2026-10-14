import { kgNowLocal } from '../../src/utils/time';
import type { Announcement, CategoryId, CityId, HistoryEntry, LocalizedString, SourceKind, UrgencyType } from '../../src/types';
import { cmd, hsetJson } from './kv';
import { HttpError, randomId } from './http';

export const ANN_KEY = 'dn:ann'; // id → JSON объявления (публикации пользователей и правки админа)
export const HIDDEN_KEY = 'dn:ann:hidden'; // id встроенных объявлений, удалённых админом
export const IMG_KEY = 'dn:img'; // id → data:image/...;base64

const CATEGORIES: CategoryId[] = ['water', 'electricity', 'roads', 'repairs', 'concerts', 'festivals', 'fairs', 'exhibitions', 'culture', 'sport', 'cinema', 'education', 'gov'];
const CITIES: CityId[] = ['all', 'bishkek', 'osh', 'jalalabad', 'karakol', 'talas', 'naryn', 'batken'];
const URGENCY: UrgencyType[] = ['emergency', 'planned', 'regular', 'event'];

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

const loc = (v: unknown, max: number, required = false): LocalizedString => {
  const o = (v && typeof v === 'object' ? v : { ru: v }) as Record<string, unknown>;
  const ru = str(o.ru, max);
  if (required && !ru) throw new HttpError('missing_field', 400, 'Заполните обязательные поля');
  return { ru, kg: str(o.kg, max) || ru, en: str(o.en, max) || ru };
};

/** Краткий текст карточки; если не задан — начало основного описания */
const summaryOf = (summary: unknown, description: unknown) => {
  const s = loc(summary, 400);
  if (s.ru) return s;
  const d = loc(description, 5000, true).ru;
  const cut = d.length <= 300 ? d : `${d.slice(0, 300).replace(/\s+\S*$/, '')}…`;
  return { ru: cut, kg: cut, en: cut };
};

const isoLocal = (v: unknown, required: boolean) => {
  const s = str(v, 16);
  if (!s) {
    if (required) throw new HttpError('missing_date', 400, 'Укажите дату начала');
    return '';
  }
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(s)) throw new HttpError('bad_date', 400, 'Неверный формат даты');
  return s;
};

const httpUrl = (v: unknown) => {
  const s = str(v, 600);
  return /^https?:\/\//i.test(s) || s.startsWith('/api/image?') || /^\/illustrations\/[a-z0-9-]+\.svg$/.test(s) ? s : '';
};

/** Сохраняет загруженное фото отдельно и возвращает ссылку /api/image?id=… */
export const storeImage = async (dataUrl: string) => {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    throw new HttpError('bad_image', 400, 'Поддерживаются JPG, PNG, WEBP');
  }
  if (dataUrl.length > 950_000) throw new HttpError('image_too_large', 413, 'Фото слишком большое');
  const id = randomId('img');
  await cmd('HSET', IMG_KEY, id, dataUrl);
  return `/api/image?id=${id}`;
};

/**
 * Приводит присланный объект к безопасному виду: только известные поля,
 * ограниченные длины, допустимые значения категорий и городов.
 */
export const sanitize = async (raw: Record<string, any>, base?: Announcement): Promise<Announcement> => {
  const category = CATEGORIES.includes(raw.category) ? (raw.category as CategoryId) : base?.category || 'concerts';
  const city = CITIES.includes(raw.city) ? (raw.city as CityId) : base?.city || 'bishkek';
  const urgency = URGENCY.includes(raw.urgency) ? (raw.urgency as UrgencyType) : base?.urgency || 'event';
  const now = kgNowLocal();

  let imageUrl = httpUrl(raw.imageUrl) || undefined;
  if (typeof raw.imageData === 'string' && raw.imageData) imageUrl = await storeImage(raw.imageData);

  const ev = raw.eventDetails && typeof raw.eventDetails === 'object' ? raw.eventDetails : {};
  const priceRu = str(ev.priceText?.ru ?? ev.priceText, 120);

  return {
    ...(base || ({} as Announcement)),
    id: base?.id || randomId('ann'),
    protocolCode: str(raw.protocolCode, 40) || base?.protocolCode || `#KG-${Math.floor(1000 + Math.random() * 9000)}`,
    title: loc(raw.title, 200, true),
    summary: summaryOf(raw.summary, raw.description),
    description: loc(raw.description, 5000, true),
    category,
    city,
    district: str(raw.district, 120) || undefined,
    location: loc(raw.location, 300, true),
    startDate: isoLocal(raw.startDate, true),
    endDate: isoLocal(raw.endDate, false),
    urgency,
    status: (['active', 'scheduled', 'completed', 'cancelled', 'rescheduled', 'archived'] as const).includes(raw.status)
      ? raw.status
      : base?.status || 'scheduled',
    isUrgentTicker: Boolean(raw.isUrgentTicker),
    sourceName: str(raw.sourceName, 200) || base?.sourceName || '',
    sourceOrgType: str(raw.sourceOrgType, 20) || base?.sourceOrgType || 'ОРГ',
    sourceUrl: undefined,
    eventSourceUrl: httpUrl(raw.eventSourceUrl) || httpUrl(raw.sourceUrl) || undefined,
    ticketUrl: httpUrl(raw.ticketUrl) || httpUrl(ev.ticketUrl) || undefined,
    ticketUrlVerified: Boolean(raw.ticketUrlVerified),
    organizerUrl: httpUrl(raw.organizerUrl) || undefined,
    artistUrl: httpUrl(raw.artistUrl) || undefined,
    venueUrl: httpUrl(raw.venueUrl) || undefined,
    isVerified: Boolean(raw.isVerified),
    publishedAt: base?.publishedAt || now,
    updatedAt: now,
    eventDetails: {
      priceText: priceRu ? loc(ev.priceText, 120) : undefined,
      organizer: str(ev.organizer, 160) || undefined,
      venue: str(ev.venue, 160) || undefined,
      timeRange: str(ev.timeRange, 80) || undefined,
      contactPhone: str(ev.contactPhone, 60) || undefined,
    },
    imageUrl,
    imageCredit: str(raw.imageCredit, 200) || undefined,
    imageSourceUrl: httpUrl(raw.imageSourceUrl) || undefined,
    imageAlt: str(raw.imageAlt, 300) || undefined,
    imageFit: raw.imageFit === 'cover' ? 'cover' : 'contain',
    imagePosition: /^[a-z0-9 %.]{1,30}$/i.test(String(raw.imagePosition ?? '')) ? String(raw.imagePosition) : undefined,
    sourceKind: (['official', 'organizer', 'ticket', 'media'] as SourceKind[]).includes(raw.sourceKind) ? raw.sourceKind : undefined,
    additionalSourceUrl: httpUrl(raw.additionalSourceUrl) || undefined,
    authorityUrl: httpUrl(raw.authorityUrl) || undefined,
    timeTBA: Boolean(raw.timeTBA) || undefined,
    allDay: Boolean(raw.allDay) || undefined,
    // когда и кем проверено — выставляют обработчики (админ / модерация), а не присланные данные
    lastCheckedAt: base?.lastCheckedAt,
    dataOrigin: base?.dataOrigin,
    // служебные поля — только из сохранённой версии, не из присланных данных
    history: base?.history,
    reportsCount: base?.reportsCount,
    publishedByGov: base?.publishedByGov,
    isDemo: false,
  };
};

export const saveAnnouncement = (a: Announcement) => hsetJson(ANN_KEY, a.id, a);

/** Для публичной выдачи скрываем личные контакты автора */
export const publicView = (a: Announcement): Announcement =>
  a.submittedBy ? { ...a, submittedBy: { userId: a.submittedBy.userId, name: a.submittedBy.name, email: '', organization: a.submittedBy.organization } } : a;

/** Добавляет запись в историю изменений (хранятся последние 50) */
export const withHistory = (a: Announcement, by: HistoryEntry['by'], action: HistoryEntry['action'], note?: string): Announcement => ({
  ...a,
  history: [...(a.history || []), { at: kgNowLocal(), by, action, ...(note ? { note: note.slice(0, 500) } : {}) }].slice(-50),
});
