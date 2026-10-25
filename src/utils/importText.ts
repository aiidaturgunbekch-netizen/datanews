// Разбор текста официального сообщения в черновик публикации — по правилам, без ИИ.
// Берётся только то, что прямо написано в тексте; всё остальное редактор заполняет сам.
import type { Announcement, CategoryId, CityId, UrgencyType } from '../types';
import { parsePlaces } from '../lib/botEngine';
import { DISTRICTS, inDistrict } from '../config/districts';
import { kgDateStr } from './time';

const MONTH_STEMS = ['январ', 'феврал', 'март', 'апрел', 'ма[йяе]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
const MONTH_RE = MONTH_STEMS.join('|');

const CATEGORY_RULES: [RegExp, CategoryId][] = [
  [/закон|кодекс/, 'laws'],
  [/постановлени|указ(?![а-я]*тел)|распоряжени|кабинет[а-я]* министров|жогорку кенеш/, 'state'],
  [/водоснабж|водопровод|подач[а-я]* (холодной |горячей )?вод|без воды|отключени[а-я]* (холодной |горячей )?вод/, 'water'],
  [/электроэнерги|электроснабж|отключени[а-я]* (электричества|света)|без света/, 'electricity'],
  [/перевал|автодорог|трасс|дорожн|движени[а-я]* (транспорта|автомобил)|перекрыти/, 'roads'],
  [/заморозк|снегопад|сел[ья]|лавин|сильн[а-я]* ветер|гроз|ливн|метел|гололед|паводк|землетрясени|аномальн[а-я]* жар/, 'hazard'],
  [/ремонт/, 'repairs'],
];

const PLANNED: CategoryId[] = ['water', 'electricity', 'roads', 'repairs'];

const pad = (n: number | string) => String(n).padStart(2, '0');

export interface ImportResult {
  draft: Partial<Announcement>;
  /** Что удалось найти в тексте — показываем редактору */
  found: string[];
  /** Что не найдено — заполнить вручную */
  missing: string[];
}

/** Все даты из текста: «17 октября», «17–18 октября», «с 17 по 18 октября», «17.10.2026» */
const findDates = (s: string, year: number): string[] => {
  const out: string[] = [];
  const re = new RegExp(`(\\d{1,2})(?:\\s*(?:[-–—]|по|до)\\s*(\\d{1,2}))?\\s+(${MONTH_RE})`, 'g');
  for (const m of s.matchAll(re)) {
    const mi = MONTH_STEMS.findIndex((x) => new RegExp(`^${x}`).test(m[3]));
    if (mi < 0) continue;
    for (const d of [m[1], m[2]].filter(Boolean)) if (Number(d) >= 1 && Number(d) <= 31) out.push(`${year}-${pad(mi + 1)}-${pad(d)}`);
  }
  for (const m of s.matchAll(/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(20\d\d)(?![\d])/g)) {
    if (Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 1 && Number(m[1]) <= 31) out.push(`${m[3]}-${pad(m[2])}-${pad(m[1])}`);
  }
  return [...new Set(out)].sort();
};

/** Время «09:00», «9.30», в том числе в конце предложения («в 10:00.»), но не часть даты 17.10.2026 */
const findTimes = (s: string): string[] =>
  [...s.matchAll(/(?<![\d.])([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d|\.\d)/g)].map((m) => `${pad(m[1])}:${m[2]}`);

export const parseNotice = (text: string, sourceUrl = '', sourceName = '', today = kgDateStr()): ImportResult => {
  const raw = text.replace(/\r/g, '').trim();
  const s = raw.toLowerCase().replace(/ё/g, 'е');
  const found: string[] = [];
  const missing: string[] = [];
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  // Заголовок — первая строка, если она короткая; иначе первое предложение
  const first = lines[0] || '';
  const title = (first.length <= 160 ? first : first.split(/(?<=[.!?])\s/)[0]).slice(0, 160).replace(/[.:]$/, '');
  const body = first.length <= 160 ? lines.slice(1).join('\n') : raw;
  const summary = (body.split(/(?<=[.!?])\s/)[0] || '').slice(0, 300);

  const yearInText = s.match(/\b(20\d\d)\s*(?:г|год)/);
  const year = yearInText ? Number(yearInText[1]) : Number(today.slice(0, 4));
  const dates = findDates(s, year);
  const times = findTimes(s);

  const category = CATEGORY_RULES.find(([re]) => re.test(s))?.[1];

  // Район: ищем по названиям районов во всём тексте; область — по району или по названию города/области
  const districtHits = Object.entries(DISTRICTS).flatMap(([city, ds]) => (ds || []).filter((d) => inDistrict({ district: s }, d)).map((d) => ({ city: city as CityId, d })));
  const places = parsePlaces(s).filter((c) => c !== 'karakol');
  let city: CityId | undefined;
  if (districtHits.length === 1) city = districtHits[0].city;
  else if (places.length === 1) city = places[0];
  else if (places.length > 1) city = 'all';

  // Адрес — первая строка с улицей, микрорайоном или селом
  const locLine = lines.find((l) => /(ул\.|улиц|пр\.|проспект|мкр|микрорайон|ж\/м|по адресу|\bс\.\s|\bсело\b)/i.test(l));

  const draft: Partial<Announcement> = {
    title: { ru: title, kg: title, en: title },
    summary: { ru: summary, kg: summary, en: summary },
    description: { ru: raw, kg: raw, en: raw },
    eventSourceUrl: sourceUrl.trim() || undefined,
    sourceName: sourceName.trim() || undefined,
    eventDetails: sourceName.trim() ? { organizer: sourceName.trim() } : undefined,
  };
  if (title) found.push('заголовок');

  if (dates.length) {
    const startT = times[0] || '00:00';
    const endT = times.length > 1 ? times[times.length - 1] : '';
    draft.startDate = `${dates[0]}T${startT}`;
    if (dates.length > 1 || endT) draft.endDate = `${dates[dates.length - 1]}T${endT || '23:59'}`;
    draft.allDay = !times.length;
    found.push(dates.length > 1 ? `даты ${dates[0]} — ${dates[dates.length - 1]}` : `дата ${dates[0]}`);
    if (times.length) found.push(`время ${times[0]}${times.length > 1 ? `–${times[times.length - 1]}` : ''}`);
    if (!yearInText && !/\d\.\d{1,2}\.20\d\d/.test(s)) missing.push(`год в тексте не указан — подставлен ${year}, проверьте`);
  } else missing.push('дата');

  if (category) {
    draft.category = category;
    found.push('раздел');
    // «Плановое» — только если так и написано
    if (PLANNED.includes(category) && /планов/.test(s)) draft.urgency = 'planned' as UrgencyType;
  } else missing.push('раздел');

  if (city) {
    draft.city = city;
    found.push(city === 'all' ? 'несколько областей' : 'город / область');
  } else missing.push('город / область');
  if (districtHits.length === 1) {
    draft.district = districtHits[0].d.ru;
    found.push(`район: ${districtHits[0].d.ru}`);
  }

  if (locLine) {
    draft.location = { ru: locLine.slice(0, 300), kg: locLine.slice(0, 300), en: locLine.slice(0, 300) };
    found.push('адрес');
  } else missing.push('место / адрес');

  if (!sourceName.trim()) missing.push('организация');
  if (!sourceUrl.trim()) missing.push('ссылка на первоисточник');
  return { draft, found, missing };
};
