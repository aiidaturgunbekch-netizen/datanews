/**
 * Реклама: каталог форматов, кампании, ручное подтверждение оплаты, показы и клики.
 *
 * Upstash:
 *   dn:ads:formats          формат (A–D) → изменённые администратором поля каталога (без записи — начальные значения из кода)
 *   dn:ads:campaigns        id кампании → кампания (AdCampaign)
 *   dn:ads:stats:<id>       'v:YYYY-MM-DD' / 'c:YYYY-MM-DD' → показы / клики за день
 *   dn:ads:seen:<id>:<h>    отметка «показ уже засчитан» (h — хэш IP, кампании и дня; живёт 30 минут)
 * Картинки — в общем хранилище фото сайта (dn:img, /api/image).
 */
import {
  AD_FORMAT_IDS,
  AdCampaign,
  AdCampaignStatus,
  AdFormat,
  AdFormatId,
  campaignEnd,
  DEFAULT_AD_FORMATS,
  effectiveStatus,
  isLive,
  LiveAd,
  ratioOk,
} from '../../src/config/ads';
import { RUBRICS } from '../../src/config/rubrics';
import { kgNowLocal } from '../../src/utils/time';
import { cmd, hgetJson, hsetJson, hvalsJson, pipeline, toCountMap } from './kv';
import { HttpError } from './http';
import { storeImage } from './announcements';

export const FORMATS_KEY = 'dn:ads:formats';
export const CAMPAIGNS_KEY = 'dn:ads:campaigns';
export const statsKey = (id: string) => `dn:ads:stats:${id}`;
const SEEN_TTL = 30 * 60;
const CLICK_TTL = 30;

const str = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const dayOf = (local: string) => local.slice(0, 10);

// ---------- каталог ----------
export const getFormats = async (): Promise<Record<AdFormatId, AdFormat>> => {
  const stored = await pipeline(AD_FORMAT_IDS.map((id) => ['HGET', FORMATS_KEY, id]));
  const out = {} as Record<AdFormatId, AdFormat>;
  AD_FORMAT_IDS.forEach((id, i) => {
    const s = stored[i] ? (JSON.parse(String(stored[i])) as Partial<AdFormat>) : {};
    out[id] = { ...DEFAULT_AD_FORMATS[id], ...s, id };
  });
  return out;
};

const loc3 = (v: unknown, max: number, base: { ru: string; kg: string; en: string }) => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const ru = str(o.ru, max) || base.ru;
  return { ru, kg: str(o.kg, max) || base.kg, en: str(o.en, max) || base.en };
};
const size = (v: unknown, base: { w: number; h: number }) => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const w = Math.round(Number(o.w));
  const h = Math.round(Number(o.h));
  return w >= 100 && w <= 4000 && h >= 100 && h <= 4000 ? { w, h } : base;
};

/** Изменить формат каталога (цена, размеры, описание, место). Созданные кампании не меняются: у них своя цена */
export const updateFormat = async (raw: Record<string, unknown>) => {
  const id = raw.id as AdFormatId;
  if (!AD_FORMAT_IDS.includes(id)) throw new HttpError('bad_format', 400, 'Неизвестный формат');
  const cur = (await getFormats())[id];
  const price = Math.round(Number(raw.price));
  if (raw.price !== undefined && !(price > 0 && price <= 10_000_000)) throw new HttpError('bad_price', 400, 'Цена — целое число сомов больше нуля');
  const next: AdFormat = {
    ...cur,
    name: loc3(raw.name, 60, cur.name),
    caption: loc3(raw.caption, 200, cur.caption),
    placement: loc3(raw.placement, 400, cur.placement),
    benefits: loc3(raw.benefits, 600, cur.benefits),
    desktop: size(raw.desktop, cur.desktop),
    mobile: raw.mobile === null ? null : raw.mobile ? size(raw.mobile, cur.mobile || cur.desktop) : cur.mobile,
    price: raw.price !== undefined ? price : cur.price,
    updatedAt: kgNowLocal(),
  };
  await hsetJson(FORMATS_KEY, id, next);
  return next;
};

// ---------- изображения ----------
/** Ширина и высота по заголовку файла (PNG, JPEG, WEBP) — без декодирования картинки */
export const imageSize = (dataUrl: string): { w: number; h: number } | null => {
  const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2].slice(0, 400_000));
  const b = (i: number) => bin.charCodeAt(i) & 0xff;
  const u16be = (i: number) => (b(i) << 8) | b(i + 1);
  const u16le = (i: number) => b(i) | (b(i + 1) << 8);
  if (m[1] === 'png') return bin.slice(12, 16) === 'IHDR' ? { w: (u16be(16) << 16) | u16be(18), h: (u16be(20) << 16) | u16be(22) } : null;
  if (m[1] === 'jpeg') {
    let i = 2;
    while (i < bin.length - 9) {
      if (b(i) !== 0xff) return null;
      const marker = b(i + 1);
      const len = u16be(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: u16be(i + 5), w: u16be(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  // WEBP
  if (bin.slice(0, 4) !== 'RIFF' || bin.slice(8, 12) !== 'WEBP') return null;
  const chunk = bin.slice(12, 16);
  if (chunk === 'VP8 ') return { w: u16le(26) & 0x3fff, h: u16le(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const n = b(21) | (b(22) << 8) | (b(23) << 16) | (b(24) << 24);
    return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { w: 1 + (b(24) | (b(25) << 8) | (b(26) << 16)), h: 1 + (b(27) | (b(28) << 8) | (b(29) << 16)) };
  return null;
};

/** Новая картинка: тип (JPG/PNG/WEBP), размер файла (общая проверка) и пропорции рекламного места */
const takeImage = async (data: unknown, want: { w: number; h: number }, what: string): Promise<{ url: string; size: { w: number; h: number } }> => {
  const d = String(data || '');
  const s = imageSize(d);
  if (!s) throw new HttpError('bad_image', 400, `${what}: поддерживаются JPG, PNG, WEBP`);
  if (!ratioOk(s.w, s.h, want)) throw new HttpError('bad_ratio', 400, `${what}: пропорции ${s.w}×${s.h} не подходят — нужен формат ${want.w}×${want.h}`);
  if (s.w < want.w / 2) throw new HttpError('image_too_small', 400, `${what}: слишком маленькое изображение (${s.w}×${s.h}), нужно не меньше ${Math.round(want.w / 2)} px в ширину`);
  return { url: await storeImage(d), size: { w: s.w, h: s.h } };
};

// ---------- кампании ----------
const randomId = () => `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const checkHref = (v: unknown) => {
  const s = str(v, 500);
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') throw new Error();
    return u.toString();
  } catch {
    throw new HttpError('bad_href', 400, 'Ссылка рекламодателя — полный адрес, начинающийся с https://');
  }
};
const checkStart = (v: unknown) => {
  const s = str(v, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}:00Z`))) throw new HttpError('bad_start', 400, 'Укажите дату и время начала');
  return s;
};

const withHistory = (c: AdCampaign, action: string, note?: string): AdCampaign => ({
  ...c,
  updatedAt: kgNowLocal(),
  history: [...(c.history || []), { at: kgNowLocal(), action, ...(note ? { note } : {}) }].slice(-50),
});

/** Все кампании; просроченные активные/приостановленные — сохраняются как «Завершена» (статистика остаётся) */
export const listCampaigns = async (): Promise<AdCampaign[]> => {
  const now = kgNowLocal();
  const all = await hvalsJson<AdCampaign>(CAMPAIGNS_KEY);
  const out: AdCampaign[] = [];
  for (const c of all) {
    const st = effectiveStatus(c, now);
    if (st !== c.status) {
      const done = withHistory({ ...c, status: st }, 'completed', 'Период размещения закончился');
      await hsetJson(CAMPAIGNS_KEY, c.id, done);
      out.push(done);
    } else out.push(c);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** Создание из каталога: формат, место, размеры и текущая цена подставляются; статус — только черновик или «ожидает оплаты» */
export const createCampaign = async (raw: Record<string, unknown>) => {
  const format = raw.format as AdFormatId;
  if (!AD_FORMAT_IDS.includes(format)) throw new HttpError('bad_format', 400, 'Выберите рекламный формат');
  const f = (await getFormats())[format];
  const name = str(raw.name, 120);
  const advertiser = str(raw.advertiser, 120);
  const contact = str(raw.contact, 160);
  const alt = str(raw.alt, 200);
  if (!name || !advertiser || !contact || !alt) throw new HttpError('missing_field', 400, 'Заполните название, рекламодателя, контакт и описание изображения');
  const rubric = format === 'D' ? str(raw.rubric, 40) : undefined;
  if (format === 'D' && !RUBRICS.some((r) => r.id === rubric)) throw new HttpError('bad_rubric', 400, 'Выберите раздел для тематического баннера');
  const title = format === 'C' ? str(raw.title, 90) : undefined;
  if (format === 'C' && !title) throw new HttpError('missing_field', 400, 'Для рекламной карточки нужен заголовок');
  const periods = Math.min(12, Math.max(1, Math.floor(Number(raw.periods) || 1)));
  const start = checkStart(raw.start);
  const status: AdCampaignStatus = raw.status === 'awaiting_payment' ? 'awaiting_payment' : 'draft';
  const href = checkHref(raw.href);
  const imageDesktop = await takeImage(raw.imageDesktopData, f.desktop, 'Изображение для компьютера');
  const imageMobile = raw.imageMobileData ? await takeImage(raw.imageMobileData, f.mobile || f.desktop, 'Изображение для телефона') : undefined;
  const now = kgNowLocal();
  const c: AdCampaign = {
    id: randomId(),
    name,
    advertiser,
    contact,
    format,
    ...(rubric ? { rubric } : {}),
    label: raw.label === 'partner' ? 'partner' : 'ad',
    imageDesktop: imageDesktop.url,
    imageDesktopSize: imageDesktop.size,
    ...(imageMobile ? { imageMobile: imageMobile.url, imageMobileSize: imageMobile.size } : {}),
    alt,
    href,
    ...(format === 'C' ? { title, text: str(raw.text, 200), cta: str(raw.cta, 30) } : {}),
    start,
    end: campaignEnd(start, periods, f.periodDays),
    periods,
    priority: Math.min(100, Math.max(0, Math.round(Number(raw.priority) || 0))),
    pricePerPeriod: f.price,
    total: f.price * periods,
    payment: { status: status === 'awaiting_payment' ? 'pending' : 'unpaid' },
    status,
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, action: 'created', note: `${f.name.ru}, ${f.price} сом × ${periods}` }],
  };
  await hsetJson(CAMPAIGNS_KEY, c.id, c);
  return c;
};

const getCampaign = async (id: unknown) => {
  const c = await hgetJson<AdCampaign>(CAMPAIGNS_KEY, str(id, 40));
  if (!c) throw new HttpError('not_found', 404, 'Кампания не найдена');
  return c;
};

/**
 * Действия администратора:
 *   edit           правка (после подтверждения оплаты период и цена не меняются)
 *   submit         черновик → «Ожидает оплаты»
 *   confirm        подтвердить оплату (номер платежа обязателен) — кампания ещё не показывается
 *   activate       показать на сайте: только после подтверждённой оплаты и до окончания периода
 *   pause / resume приостановить / возобновить
 *   complete       завершить досрочно
 *   delete         удалить — только неоплаченный черновик или «ожидает оплаты»
 */
export const campaignAction = async (raw: Record<string, unknown>) => {
  const c = await getCampaign(raw.id);
  const now = kgNowLocal();
  const status = effectiveStatus(c, now);
  const action = String(raw.action || '');
  let next: AdCampaign;
  switch (action) {
    case 'edit': {
      if (status === 'completed') throw new HttpError('locked', 409, 'Завершённая кампания не редактируется');
      const f = (await getFormats())[c.format];
      const paid = c.payment.status === 'confirmed';
      next = {
        ...c,
        name: str(raw.name ?? c.name, 120) || c.name,
        advertiser: str(raw.advertiser ?? c.advertiser, 120) || c.advertiser,
        contact: str(raw.contact ?? c.contact, 160) || c.contact,
        alt: str(raw.alt ?? c.alt, 200) || c.alt,
        href: raw.href !== undefined ? checkHref(raw.href) : c.href,
        label: raw.label === 'partner' ? 'partner' : raw.label === 'ad' ? 'ad' : c.label,
        priority: raw.priority !== undefined ? Math.min(100, Math.max(0, Math.round(Number(raw.priority) || 0))) : c.priority,
        ...(c.format === 'C' ? { title: str(raw.title ?? c.title, 90) || c.title, text: str(raw.text ?? c.text, 200), cta: str(raw.cta ?? c.cta, 30) } : {}),
      };
      if (raw.imageDesktopData) {
        const img = await takeImage(raw.imageDesktopData, f.desktop, 'Изображение для компьютера');
        next = { ...next, imageDesktop: img.url, imageDesktopSize: img.size };
      }
      if (raw.imageMobileData) {
        const img = await takeImage(raw.imageMobileData, f.mobile || f.desktop, 'Изображение для телефона');
        next = { ...next, imageMobile: img.url, imageMobileSize: img.size };
      }
      // Период и цена — только до подтверждения оплаты (цена — по текущему каталогу на момент правки)
      if (!paid && (raw.start !== undefined || raw.periods !== undefined)) {
        const start = raw.start !== undefined ? checkStart(raw.start) : c.start;
        const periods = raw.periods !== undefined ? Math.min(12, Math.max(1, Math.floor(Number(raw.periods) || 1))) : c.periods;
        next = { ...next, start, periods, end: campaignEnd(start, periods, f.periodDays), pricePerPeriod: f.price, total: f.price * periods };
      } else if (paid && (raw.start !== undefined || raw.periods !== undefined)) {
        throw new HttpError('locked', 409, 'Период оплаченной кампании не меняется');
      }
      next = withHistory(next, 'edited');
      break;
    }
    case 'submit':
      if (status !== 'draft') throw new HttpError('bad_state', 409, 'Отправить на оплату можно только черновик');
      next = withHistory({ ...c, status: 'awaiting_payment', payment: { ...c.payment, status: c.payment.status === 'confirmed' ? 'confirmed' : 'pending' } }, 'awaiting_payment');
      break;
    case 'confirm': {
      const ref = str(raw.ref, 80);
      if (!ref) throw new HttpError('missing_ref', 400, 'Укажите номер платежа или документа — оплата подтверждается только по факту');
      if (status === 'completed') throw new HttpError('bad_state', 409, 'Кампания уже завершена');
      next = withHistory({ ...c, payment: { status: 'confirmed', ref, confirmedAt: now, note: str(raw.note, 200) || undefined } }, 'payment_confirmed', `Платёж ${ref}`);
      break;
    }
    case 'activate':
      if (c.payment.status !== 'confirmed') throw new HttpError('not_paid', 409, 'Кампанию можно активировать только после подтверждения оплаты');
      if (status === 'completed' || now >= c.end) throw new HttpError('expired', 409, 'Оплаченный период уже закончился');
      next = withHistory({ ...c, status: 'active' }, 'activated');
      break;
    case 'pause':
      if (status !== 'active') throw new HttpError('bad_state', 409, 'Приостановить можно только активную кампанию');
      next = withHistory({ ...c, status: 'paused' }, 'paused');
      break;
    case 'resume':
      if (status !== 'paused') throw new HttpError('bad_state', 409, 'Возобновить можно только приостановленную кампанию');
      if (c.payment.status !== 'confirmed') throw new HttpError('not_paid', 409, 'Оплата не подтверждена');
      next = withHistory({ ...c, status: 'active' }, 'resumed');
      break;
    case 'complete':
      if (status === 'completed') throw new HttpError('bad_state', 409, 'Кампания уже завершена');
      next = withHistory({ ...c, status: 'completed' }, 'completed', 'Завершена администратором');
      break;
    case 'delete':
      if (c.payment.status === 'confirmed' || !['draft', 'awaiting_payment'].includes(status)) throw new HttpError('bad_state', 409, 'Удалить можно только неоплаченный черновик или кампанию, ожидающую оплату');
      await pipeline([
        ['HDEL', CAMPAIGNS_KEY, c.id],
        ['DEL', statsKey(c.id)],
      ]);
      return null;
    default:
      throw new HttpError('bad_action', 400);
  }
  await hsetJson(CAMPAIGNS_KEY, next.id, next);
  return next;
};

// ---------- показ на сайте ----------
export const toLive = (c: AdCampaign): LiveAd => ({
  id: c.id,
  format: c.format,
  ...(c.rubric ? { rubric: c.rubric } : {}),
  label: c.label,
  advertiser: c.advertiser,
  imageDesktop: c.imageDesktop,
  ...(c.imageDesktopSize ? { imageDesktopSize: c.imageDesktopSize } : {}),
  ...(c.imageMobile ? { imageMobile: c.imageMobile, ...(c.imageMobileSize ? { imageMobileSize: c.imageMobileSize } : {}) } : {}),
  alt: c.alt,
  ...(c.format === 'C' ? { title: c.title, text: c.text, cta: c.cta } : {}),
  priority: c.priority,
  start: c.start,
});

/** Кампании, которые сейчас можно показывать (решает сервер; просроченные не попадают никогда) */
export const liveAds = async (): Promise<LiveAd[]> => {
  const now = kgNowLocal();
  return (await hvalsJson<AdCampaign>(CAMPAIGNS_KEY)).filter((c) => isLive(c, now)).map(toLive);
};

// ---------- статистика ----------
const hashKey = async (s: string) => {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const ipOf = (req: Request) => (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

/**
 * Показ: только активной кампании; повторный показ той же кампании с того же адреса в течение 30 минут не засчитывается.
 * Хранится только счётчик по дням; адрес — лишь в виде хэша в отметке, которая сама удаляется через 30 минут.
 */
export const recordView = async (req: Request, id: string) => {
  const c = await hgetJson<AdCampaign>(CAMPAIGNS_KEY, id);
  const now = kgNowLocal();
  if (!c || !isLive(c, now)) return false;
  const h = await hashKey(`${ipOf(req)}|${id}|${dayOf(now)}`);
  const fresh = await cmd<string | null>('SET', `dn:ads:seen:${id}:${h}`, '1', 'NX', 'EX', SEEN_TTL);
  if (!fresh) return false;
  await cmd('HINCRBY', statsKey(id), `v:${dayOf(now)}`, 1);
  return true;
};

/** Клик: засчитывается не чаще раза в 30 секунд с одного адреса; возвращает адрес рекламодателя (или null — кампания не идёт) */
export const recordClick = async (req: Request, id: string): Promise<string | null> => {
  const c = await hgetJson<AdCampaign>(CAMPAIGNS_KEY, id);
  const now = kgNowLocal();
  if (!c || !isLive(c, now)) return null;
  const h = await hashKey(`${ipOf(req)}|${id}|click`);
  const fresh = await cmd<string | null>('SET', `dn:ads:click:${id}:${h}`, '1', 'NX', 'EX', CLICK_TTL);
  if (fresh) await cmd('HINCRBY', statsKey(id), `c:${dayOf(now)}`, 1);
  return c.href;
};

export interface AdStats {
  views: number;
  clicks: number;
  ctr: number | null;
  days: { day: string; views: number; clicks: number }[];
}
export const campaignStats = async (id: string): Promise<AdStats> => {
  const m = toCountMap(await cmd('HGETALL', statsKey(id)));
  const days: Record<string, { views: number; clicks: number }> = {};
  for (const [k, n] of Object.entries(m)) {
    const [kind, day] = k.split(':');
    days[day] ||= { views: 0, clicks: 0 };
    if (kind === 'v') days[day].views += n;
    if (kind === 'c') days[day].clicks += n;
  }
  const list = Object.entries(days)
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const views = list.reduce((s, d) => s + d.views, 0);
  const clicks = list.reduce((s, d) => s + d.clicks, 0);
  return { views, clicks, ctr: views > 0 ? Math.round((clicks / views) * 10000) / 100 : null, days: list };
};

