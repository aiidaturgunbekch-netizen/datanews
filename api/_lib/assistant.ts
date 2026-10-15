/**
 * Поиск по данным сайта для ассистента DataNews: подбирает публикации, относящиеся к вопросу,
 * и собирает справочные сведения (тарифы, контакты, источники). Работает и без ИИ.
 */
import type { Announcement, Language } from '../../src/types';
import { INITIAL_ANNOUNCEMENTS } from '../../src/data/initialAnnouncements';
import { PLANS, PLAN_IDS } from '../../src/config/site';
import { EMERGENCY_NUMBERS, KYRGYZHYDROMET } from '../../src/config/weather';
import { CONTACTS } from '../../src/config/contacts';
import { REGIONS } from '../../src/config/regions';
import { addDaysStr, kgDateStr } from '../../src/utils/time';
import { isListed } from '../../src/utils/urgency';
import { cmd, hvalsJson } from './kv';
import { ANN_KEY, HIDDEN_KEY, publicView } from './announcements';

/** Все опубликованные материалы: встроенные + одобренные из базы (как на сайте) */
export const loadPublished = async (): Promise<Announcement[]> => {
  const stored = (await hvalsJson<Announcement>(ANN_KEY)).filter((a) => !a.moderationStatus || a.moderationStatus === 'approved');
  const hidden = new Set(((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[]);
  const byId = new Map<string, Announcement>();
  INITIAL_ANNOUNCEMENTS.forEach((a) => byId.set(a.id, a));
  stored.forEach((a) => byId.set(a.id, publicView(a)));
  hidden.forEach((id) => byId.delete(id));
  return [...byId.values()];
};

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

/** Даты, о которых спрашивают: «сегодня», «завтра», «на этой неделе», «18 октября», «2026-10-18» */
const askedDates = (q: string): [string, string] | null => {
  const t = kgDateStr();
  const s = q.toLowerCase();
  if (/сегодня|бүгүн|today/.test(s)) return [t, t];
  if (/завтра|эртең|tomorrow/.test(s)) return [addDaysStr(t, 1), addDaysStr(t, 1)];
  if (/недел|жума|week/.test(s)) return [t, addDaysStr(t, 7)];
  const iso = s.match(/(20\d\d)-(\d\d)-(\d\d)/);
  if (iso) return [iso[0], iso[0]];
  const months = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
  const m = s.match(/(\d{1,2})[\s-]*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/);
  if (m) {
    const mi = months.findIndex((x) => m[2].startsWith(x));
    if (mi >= 0) {
      const d = `${t.slice(0, 4)}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return [d, d];
    }
  }
  return null;
};

const overlaps = (a: Announcement, from: string, to: string) => {
  const s = a.startDate.slice(0, 10);
  const e = (a.endDate || a.startDate).slice(0, 10);
  return s <= to && e >= from;
};

/** Подбор публикаций по вопросу: совпадение слов, места, категории и дат; действующие предупреждения — выше */
export const searchItems = (all: Announcement[], q: string, limit = 10) => {
  const qw = words(q);
  const dates = askedDates(q);
  const ql = q.toLowerCase();
  const placeHit = (a: Announcement) =>
    REGIONS.some((r) => (r.cities as string[]).includes(a.city) && Object.values(r.name).some((n) => ql.includes(n.toLowerCase().split(' ')[0].slice(0, 5))));
  const scored = all
    .filter((a) => isListed(a))
    .map((a) => {
      const hay = words(
        [a.title.ru, a.title.kg, a.title.en, a.summary.ru, a.location.ru, a.locality, a.district, a.category, a.sourceName].filter(Boolean).join(' ')
      );
      let score = qw.reduce((n, w) => n + (hay.some((h) => h.startsWith(w.slice(0, Math.max(4, w.length - 2)))) ? 2 : 0), 0);
      if (dates && overlaps(a, dates[0], dates[1])) score += 4;
      if (dates && a.startDate.slice(0, 10) >= dates[0] && a.startDate.slice(0, 10) <= dates[1]) score += 3; // начинается в этот день
      if (placeHit(a)) score += 2;
      if (/предупрежд|опасн|шторм|лавин|эскерт|warning|hazard|перекр|дорог|перевал/.test(ql) && ['hazard', 'roads', 'water', 'electricity', 'repairs'].includes(a.category)) score += 3;
      if (/закон|мыйзам|law|вступ/.test(ql) && a.category === 'laws') score += 3;
      if (/решени|указ|кабинет|президент|чечим|decision/.test(ql) && a.category === 'state') score += 3;
      if (/билет|концерт|кино|афиш|ticket|concert|film/.test(ql) && ['concerts', 'cinema', 'culture', 'festivals'].includes(a.category)) score += 2;
      if (a.category === 'hazard' && a.dangerLevel === 'high') score += 1;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.a.startDate.localeCompare(y.a.startDate));
  return scored.slice(0, limit).map((x) => x.a);
};

/** Компактное представление публикации для контекста ИИ */
export const brief = (a: Announcement, lang: Language) => ({
  id: a.id,
  title: a.title[lang] || a.title.ru,
  category: a.category,
  place: [a.city, a.locality, a.location[lang] || a.location.ru].filter(Boolean).join(' | '),
  start: a.startDate,
  end: a.endDate || undefined,
  timeNotAnnounced: a.timeTBA || undefined,
  summary: a.summary[lang] || a.summary.ru,
  dangerLevel: a.dangerLevel,
  newsKind: a.newsKind,
  legal: a.legal
    ? { adopted: a.legal.adoptedAt, published: a.legal.officialPublishedAt, effectiveFrom: a.legal.effectiveFrom ?? 'не указано', doc: a.legal.docUrl }
    : undefined,
  price: a.eventDetails?.priceText?.ru,
  ticketUrl: a.ticketUrl && a.ticketUrlVerified ? a.ticketUrl : undefined,
  source: a.sourceName,
  sourceUrl: a.eventSourceUrl || a.sourceUrl,
  sourceType: a.sourceKind,
  lastChecked: a.lastCheckedAt,
});

/** Справочные сведения о сайте — всегда в контексте */
export const siteFacts = () => ({
  today: kgDateStr(),
  timezone: 'Asia/Bishkek (UTC+6)',
  tariffs: PLAN_IDS.map((id) => ({
    name: PLANS[id].name.ru,
    priceSom: PLANS[id].priceSom,
    periodDays: PLANS[id].periodDays,
    postLimit: PLANS[id].postLimit ?? 'без лимита',
    dailyLimit: PLANS[id].dailyLimit ?? undefined,
    govOnly: PLANS[id].govOnly || undefined,
  })),
  howToPost:
    'Зарегистрироваться в «Личном кабинете», выбрать тариф, оплатить (оплата вручную — администратор подтверждает), заполнить форму публикации; публикации проходят модерацию (подтверждённые госорганы публикуют сразу).',
  editorialContacts: CONTACTS,
  weather: {
    officialSource: KYRGYZHYDROMET.site,
    contactsPage: KYRGYZHYDROMET.contactsPage,
    forecasterPhones: KYRGYZHYDROMET.forecasterPhones,
    note: 'В разделе «Погода и безопасность» — официальные предупреждения и официальный прогноз Кыргызгидромета по областям, если редакция его внесла. Автоматического прогноза на сайте нет.',
  },
  emergencyNumbers: EMERGENCY_NUMBERS.map((e) => `${e.phone} — ${e.name.ru}`),
});
