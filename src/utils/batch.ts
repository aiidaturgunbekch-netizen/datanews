/**
 * Пакет новостей от Claude («Вставить пакет новостей» в «Модерации»).
 *
 * Claude присылает один блок — JSON-массив между строками DATANEWS-BATCH и END-BATCH (или просто JSON-массив).
 * Каждый элемент — либо новая новость (черновик в «Модерацию»), либо перевод уже существующей публикации:
 *
 *   { "kind": "new", "mailId": "<id письма Gmail>"?, "category": "sport", "city": "bishkek",
 *     "startDate": "2026-10-29" | "2026-10-29T18:00", "endDate"?, "allDay"?, "timeTBA"?,
 *     "title": { "ru", "kg", "en"? }, "text": { "ru", "kg", "en"? },
 *     "location"?: { "ru", "kg"?, "en"? }, "district"?, "status"?, "urgency"?,
 *     "sourceName", "sourceUrl"?, "sourceKind"?: "official" | "media", "imageUrl"?, "ticketUrl"?, "price"? }
 *   { "kind": "translate", "id": "<id публикации>", "title": { "kg": … }, "text": { "kg": … } }
 *
 * Здесь — только разбор и проверка (без сети): что пропущено, понятным текстом.
 */
import type { AnnouncementStatus, CategoryId, CityId, Language, UrgencyType } from '../types';
import { CATEGORY_IDS, PLACE_IDS } from '../config/regions';
import { looksKyrgyz } from './lang';

export const BATCH_START = 'DATANEWS-BATCH';
export const BATCH_END = 'END-BATCH';

type L = Partial<Record<Language, string>>;
export interface BatchNew {
  kind: 'new';
  n: number;
  mailId?: string;
  category: CategoryId;
  city: CityId;
  district?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  timeTBA: boolean;
  title: Record<Language, string>;
  text: Record<Language, string>;
  location: L;
  status: AnnouncementStatus;
  urgency?: UrgencyType;
  sourceName: string;
  sourceUrl?: string;
  sourceKind?: 'official' | 'media';
  imageUrl?: string;
  ticketUrl?: string;
  price?: string;
}
export interface BatchTranslate {
  kind: 'translate';
  n: number;
  id: string;
  title: L;
  text: L;
}
export type BatchItem = BatchNew | BatchTranslate;

const STATUSES: AnnouncementStatus[] = ['scheduled', 'active', 'rescheduled', 'cancelled', 'completed', 'archived'];
const URGENCIES: UrgencyType[] = ['emergency', 'planned', 'regular', 'event'];
const s = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lang = (v: unknown, max: number): L => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { ru: s(o.ru, max), kg: s(o.kg, max), en: s(o.en, max) };
};
const https = (v: unknown) => (/^https:\/\/[^\s]+\.[^\s]+$/.test(s(v, 600)) ? s(v, 600) : undefined);
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

/** Вырезать JSON из вставленного текста: между маркерами, из блока ```json или первый […] */
export const extractJson = (input: string): string => {
  const t = input.trim();
  const a = t.indexOf(BATCH_START);
  const b = t.indexOf(BATCH_END);
  let body = a >= 0 ? t.slice(a + BATCH_START.length, b > a ? b : undefined) : t;
  body = body.replace(/```(?:json)?/g, '').trim();
  const i = body.indexOf('[');
  const j = body.lastIndexOf(']');
  return i >= 0 && j > i ? body.slice(i, j + 1) : body;
};

export const parseBatch = (input: string): { items: BatchItem[]; errors: string[] } => {
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(input));
  } catch {
    return { items: [], errors: ['Не удалось прочитать пакет. Вставьте блок от Claude целиком — от строки DATANEWS-BATCH до END-BATCH.'] };
  }
  if (!Array.isArray(raw)) return { items: [], errors: ['В пакете нет списка новостей.'] };
  const items: BatchItem[] = [];
  raw.forEach((r, i) => {
    const n = i + 1;
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const title = lang(o.title, 200);
    const text = lang(o.text ?? o.description, 5000);
    const label = `№${n}${title.ru || title.kg ? ` «${(title.ru || title.kg || '').slice(0, 60)}»` : ''}`;
    if (o.kind === 'translate') {
      const id = s(o.id, 80);
      if (!/^[\w-]{3,80}$/.test(id)) return errors.push(`${label}: нет id публикации для перевода`);
      if (!(['ru', 'kg', 'en'] as Language[]).some((l) => title[l] || text[l])) return errors.push(`${label}: нет текста перевода`);
      items.push({ kind: 'translate', n, id, title, text });
      return;
    }
    const problems: string[] = [];
    const category = s(o.category, 30) as CategoryId;
    if (!CATEGORY_IDS.includes(category as Exclude<CategoryId, 'all'>)) problems.push(`неизвестный раздел «${category || '—'}»`);
    const city = (s(o.city, 30) || 'all') as CityId;
    if (city !== 'all' && !PLACE_IDS.includes(city as Exclude<CityId, 'karakol'>)) problems.push(`неизвестный город «${city}»`);
    const startDate = s(o.startDate, 16);
    if (!DATE_RE.test(startDate)) problems.push('нет даты начала (ГГГГ-ММ-ДД или ГГГГ-ММ-ДДTчч:мм)');
    const endDate = s(o.endDate, 16);
    if (endDate && !DATE_RE.test(endDate)) problems.push('неверная дата окончания');
    for (const l of ['ru', 'kg'] as const) if (!title[l] || !text[l]) problems.push(`нет заголовка или текста на ${l === 'ru' ? 'русском' : 'кыргызском'}`);
    if (text.ru && looksKyrgyz(`${title.ru}\n${text.ru}`)) problems.push('в русском тексте — кыргызский');
    const sourceName = s(o.sourceName, 160);
    if (!sourceName) problems.push('нет источника');
    if (problems.length) return errors.push(`${label}: ${problems.join('; ')}`);
    const timed = startDate.length > 10;
    const status = STATUSES.includes(o.status as AnnouncementStatus) ? (o.status as AnnouncementStatus) : 'scheduled';
    const urgency = URGENCIES.includes(o.urgency as UrgencyType) ? (o.urgency as UrgencyType) : undefined;
    items.push({
      kind: 'new',
      n,
      mailId: /^[A-Za-z0-9_-]{6,64}$/.test(s(o.mailId, 64)) ? s(o.mailId, 64) : undefined,
      category,
      city,
      district: s(o.district, 80) || undefined,
      startDate: timed ? startDate : `${startDate}T00:00`,
      endDate: endDate ? (endDate.length > 10 ? endDate : `${endDate}T23:59`) : undefined,
      allDay: o.allDay === true || (!timed && o.timeTBA !== true),
      timeTBA: o.timeTBA === true,
      title: { ru: title.ru!, kg: title.kg!, en: title.en || '' },
      text: { ru: text.ru!, kg: text.kg!, en: text.en || '' },
      location: lang(o.location, 300),
      status,
      urgency,
      sourceName,
      sourceUrl: https(o.sourceUrl),
      sourceKind: o.sourceKind === 'media' ? 'media' : o.sourceKind === 'official' ? 'official' : undefined,
      imageUrl: https(o.imageUrl),
      ticketUrl: https(o.ticketUrl),
      price: s(o.price, 120) || undefined,
    });
  });
  return { items, errors };
};

/** Краткое описание — первые предложения текста */
export const shortOf = (text: string) => {
  const d = text.trim();
  if (d.length <= 300) return d;
  const cut = d.slice(0, 300);
  return `${cut.slice(0, Math.max(cut.lastIndexOf('. ') + 1, cut.lastIndexOf(' ')))}…`;
};

/** Новая новость из пакета → объект для черновика (сервер проверит и дополнит) */
export const toDraftItem = (b: BatchNew): Record<string, unknown> => ({
  title: b.title,
  summary: { ru: shortOf(b.text.ru), kg: shortOf(b.text.kg), en: b.text.en ? shortOf(b.text.en) : '' },
  description: b.text,
  category: b.category,
  city: b.city,
  district: b.district,
  location: { ru: b.location.ru || '', kg: b.location.kg || '', en: b.location.en || '' },
  startDate: b.startDate,
  endDate: b.endDate || '',
  allDay: b.allDay,
  timeTBA: b.timeTBA,
  status: b.status,
  // Тип — как в форме: по разделу (отключения и дороги — предупреждение), если в пакете не указан явно
  urgency: b.urgency || (['water', 'electricity', 'roads', 'repairs'].includes(b.category) ? 'planned' : 'event'),
  sourceName: b.sourceName,
  sourceKind: b.sourceKind,
  eventSourceUrl: b.sourceUrl,
  imageUrl: b.imageUrl,
  ticketUrl: b.ticketUrl,
  eventDetails: { ticketUrl: b.ticketUrl || '', priceText: b.price ? { ru: b.price } : undefined, organizer: b.sourceName },
  imageFit: 'contain',
});
