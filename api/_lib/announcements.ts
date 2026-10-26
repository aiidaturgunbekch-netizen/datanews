import { kgNowLocal } from '../../src/utils/time';
import type { Announcement, CategoryId, CityId, HistoryChange, HistoryEntry, LocalizedString, SourceKind, UrgencyType } from '../../src/types';
import { cmd, hsetJson } from './kv';
import { HttpError, randomId } from './http';
import { isCheckOnlyCopy } from '../../src/utils/mergeAnnouncements';

export const ANN_KEY = 'dn:ann'; // id → JSON объявления (публикации пользователей и правки админа)
export const HIDDEN_KEY = 'dn:ann:hidden'; // id встроенных объявлений, удалённых админом
export const CHECKED_KEY = 'dn:ann:checked'; // id встроенного объявления → дата последней сверки с источником

/**
 * Делит записи из базы: настоящие публикации и правки — отдельно, а для встроенных публикаций берёт только дату проверки.
 * Старые полные копии, сохранённые кнопкой «Проверено сегодня», превращаются в такую дату (сами записи не удаляются).
 */
export const splitChecked = async (stored: Announcement[]) => {
  const checked: Record<string, string> = toStringMap(await cmd<unknown>('HGETALL', CHECKED_KEY));
  const items: Announcement[] = [];
  for (const a of stored) {
    if (isCheckOnlyCopy(a)) {
      if (a.lastCheckedAt && (!checked[a.id] || a.lastCheckedAt > checked[a.id])) checked[a.id] = a.lastCheckedAt;
    } else items.push(a);
  }
  return { items, checked };
};

const toStringMap = (flat: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  const arr = Array.isArray(flat) ? flat : [];
  for (let i = 0; i + 1 < arr.length; i += 2) out[String(arr[i])] = String(arr[i + 1]);
  return out;
};
export const IMG_KEY = 'dn:img'; // id → data:image/...;base64

const CATEGORIES: CategoryId[] = ['water', 'electricity', 'roads', 'repairs', 'concerts', 'festivals', 'fairs', 'exhibitions', 'culture', 'sport', 'cinema', 'education', 'gov', 'hazard', 'state', 'laws', 'notices'];
const CITIES: CityId[] = ['all', 'bishkek', 'osh', 'chui', 'osh_region', 'issykkul', 'jalalabad', 'talas', 'naryn', 'batken'];
const URGENCY: UrgencyType[] = ['emergency', 'planned', 'regular', 'event'];

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

const loc = (v: unknown, max: number, required = false): LocalizedString => {
  const o = (v && typeof v === 'object' ? v : { ru: v }) as Record<string, unknown>;
  const ru = str(o.ru, max);
  if (required && !ru) throw new HttpError('missing_field', 400, 'Заполните обязательные поля');
  return { ru, kg: str(o.kg, max) || ru, en: str(o.en, max) || ru };
};

const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : undefined);
const optLoc = (v: unknown, max: number) => {
  const l = loc(v, max);
  return l.ru ? l : undefined;
};
/** Юридические подробности: даты принятия / опубликования / вступления в силу и пояснения */
const sanitizeLegal = (r: Record<string, unknown>) => {
  const out = {
    docTitle: optLoc(r.docTitle, 300),
    adoptedAt: day(r.adoptedAt),
    officialPublishedAt: day(r.officialPublishedAt),
    effectiveFrom: day(r.effectiveFrom),
    whatChanged: optLoc(r.whatChanged, 2000),
    whoAffected: optLoc(r.whoAffected, 1000),
    whatToDo: optLoc(r.whatToDo, 1000),
    transitional: optLoc(r.transitional, 1000),
    docUrl: httpUrl(r.docUrl) || undefined,
  };
  return Object.values(out).some(Boolean) ? out : undefined;
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
  const rawCity = raw.city === 'karakol' ? 'issykkul' : raw.city;
  // Область не указана — «Весь Кыргызстан» (без привязки к области), а не выдуманный город
  const city = CITIES.includes(rawCity) ? (rawCity as CityId) : base?.city === 'karakol' ? 'issykkul' : base?.city || 'all';
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
    locality: str(raw.locality, 120) || undefined,
    // Адрес необязателен: у новости госоргана или общего объявления его может не быть. Не подставляем выдуманный.
    location: loc(raw.location, 300),
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
    dangerLevel: ['high', 'warning', 'info'].includes(raw.dangerLevel) ? raw.dangerLevel : undefined,
    newsKind: ['decision', 'statement', 'instruction', 'meeting', 'session', 'law', 'program'].includes(raw.newsKind) ? raw.newsKind : undefined,
    legal: raw.legal && typeof raw.legal === 'object' ? sanitizeLegal(raw.legal) : undefined,
    timeTBA: Boolean(raw.timeTBA) || undefined,
    allDay: Boolean(raw.allDay) || undefined,
    // null — убрать точку; не прислано — оставить сохранённую
    geo: raw.geo === null ? undefined : validGeo(raw.geo) || base?.geo,
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

/** Координаты в пределах Кыргызстана (с небольшим запасом), 5 знаков после запятой ≈ 1 м */
const validGeo = (v: unknown): Announcement['geo'] | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const lat = Number((v as { lat?: unknown }).lat);
  const lng = Number((v as { lng?: unknown }).lng);
  if (!(lat >= 39 && lat <= 43.5 && lng >= 69 && lng <= 80.5)) return undefined;
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
};

export const TEST_MATERIAL_MESSAGE = 'Тестовый материал из почты — публикация запрещена';

/** Видна ли публикация читателям: одобрена (или старая без модерации) и не тестовая */
export const isPublicItem = (a: Announcement) => (!a.moderationStatus || a.moderationStatus === 'approved') && !a.testMaterial;

/** Единая точка записи: тестовый материал нельзя сохранить опубликованным — ни «Одобрить», ни прямым запросом */
export const saveAnnouncement = (a: Announcement) => {
  if (a.testMaterial && (!a.moderationStatus || a.moderationStatus === 'approved')) throw new HttpError('test_material', 409, TEST_MATERIAL_MESSAGE);
  return hsetJson(ANN_KEY, a.id, a);
};

/** Для публичной выдачи скрываем личные контакты автора */
/**
 * Публичный вид: без контактов автора; из истории — только существенные исправления
 * (когда и что изменено), без внутренних заметок модерации.
 */
export const publicView = (a: Announcement): Announcement => ({
  ...a,
  submittedBy: a.submittedBy ? { userId: a.submittedBy.userId, name: a.submittedBy.name, email: '', organization: a.submittedBy.organization } : undefined,
  history: (a.history || [])
    .filter((h) => h.action === 'edited' && h.changes?.length)
    .map((h) => ({ at: h.at, by: h.by === 'admin' ? 'admin' : 'author', action: 'edited' as const, changes: h.changes })),
});

/** Существенные изменения между версиями публикации — для публичной истории исправлений */
export const diffFields = (prev: Announcement | null | undefined, next: Announcement): HistoryChange[] => {
  if (!prev || !prev.title) return [];
  const out: HistoryChange[] = [];
  if (prev.startDate !== next.startDate || (prev.endDate || '') !== (next.endDate || '') || Boolean(prev.timeTBA) !== Boolean(next.timeTBA)) out.push('date');
  if (prev.location?.ru !== next.location?.ru || (prev.district || '') !== (next.district || '') || (prev.locality || '') !== (next.locality || '') || JSON.stringify(prev.geo || null) !== JSON.stringify(next.geo || null)) out.push('place');
  if (prev.title?.ru !== next.title?.ru) out.push('title');
  if ((prev.eventDetails?.priceText?.ru || '') !== (next.eventDetails?.priceText?.ru || '')) out.push('price');
  if ((prev.status || '') !== (next.status || '')) out.push('status');
  if ((prev.ticketUrl || '') !== (next.ticketUrl || '')) out.push('tickets');
  if ((prev.legal?.effectiveFrom || '') !== (next.legal?.effectiveFrom || '')) out.push('effective');
  return out;
};

/** Добавляет запись в историю изменений (хранятся последние 50) */
export const withHistory = (a: Announcement, by: HistoryEntry['by'], action: HistoryEntry['action'], note?: string, changes?: HistoryChange[]): Announcement => ({
  ...a,
  history: [...(a.history || []), { at: kgNowLocal(), by, action, ...(note ? { note: note.slice(0, 500) } : {}), ...(changes?.length ? { changes } : {}) }].slice(-50),
});
