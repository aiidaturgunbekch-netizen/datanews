/**
 * Поиск по данным сайта для ассистента DataNews: подбирает публикации, относящиеся к вопросу,
 * и собирает справочные сведения (тарифы, контакты, источники). Работает и без ИИ.
 */
import type { Announcement, Language } from '../../src/types';
import { PLANS, PLAN_IDS } from '../../src/config/site';
import { EMERGENCY_NUMBERS, KYRGYZHYDROMET } from '../../src/config/weather';
import { CONTACTS } from '../../src/config/contacts';
import { REGIONS } from '../../src/config/regions';
import { addDaysStr, kgDateStr } from '../../src/utils/time';
import { isListed } from '../../src/utils/urgency';
import { isFresh } from '../../src/utils/statusUtils';
import { formatWhen } from '../../src/utils/dates';
import { getTranslation } from '../../src/locales/translations';
import { cmd, hvalsJson } from './kv';
import { ANN_KEY, HIDDEN_KEY, publicView, splitChecked } from './announcements';
import { mergeAnnouncements } from '../../src/utils/mergeAnnouncements';

/** Все опубликованные материалы: встроенные + одобренные из базы (как на сайте) */
export const loadPublished = async (): Promise<Announcement[]> => {
  const { items, checked } = await splitChecked(await hvalsJson<Announcement>(ANN_KEY));
  const stored = items.filter((a) => !a.moderationStatus || a.moderationStatus === 'approved').map(publicView);
  const hidden = ((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[];
  return mergeAnnouncements(stored, hidden, checked);
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
  // «в ноябре», «на октябрь» — весь месяц
  const mm = !m && s.match(/(январ|феврал|март|апрел|ма[йея]|июн|июл|август|сентябр|октябр|ноябр|декабр)/);
  if (mm) {
    const mi = months.findIndex((x) => mm[1].startsWith(x));
    if (mi >= 0) {
      const y = t.slice(0, 4);
      const mmStr = String(mi + 1).padStart(2, '0');
      const last = new Date(Date.UTC(Number(y), mi + 1, 0)).getUTCDate();
      return [`${y}-${mmStr}-01`, `${y}-${mmStr}-${last}`];
    }
  }
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

/** Темы вопроса → разделы сайта */
const TOPICS: [RegExp, string[]][] = [
  [/театр|спектак|опер[аы](?![а-яё])|балет|филармон|theatre|theater|ballet/, ['culture', 'concerts']],
  [/концерт|concert|шоу|show/, ['concerts']],
  [/кино|фильм|сеанс|cinema|movie|film/, ['cinema']],
  [/спорт|матч|футбол|футзал|sport|match/, ['sport']],
  [/выстав|форум|exhibit/, ['exhibitions']],
  [/ярмар|fair/, ['fairs']],
  [/фестив|festival/, ['festivals']],
  [/вод[аыуе]|суу(?![а-яөүң])|water/, ['water']],
  [/свет(?:[ау])?(?![а-яё])|электр|жарык|power|electric/, ['electricity']],
  [/ремонт|оңдоо|repair/, ['repairs', 'roads']],
  [/дорог|перевал|перекр|трасс|жол(?![а-яөүң])|ашуу|road|pass\b/, ['roads', 'hazard']],
  [/предупрежд|опасн|шторм|лавин|заморозк|эскерт|warning|hazard/, ['hazard', 'roads', 'water', 'electricity', 'repairs']],
  [/закон|мыйзам|\blaw/, ['laws']],
  [/решени|указ|постановл|кабинет|президент|чечим|decision|decree/, ['state', 'laws']],
  [/лекци|курс|lecture/, ['education']],
  [/погод|аба ырай|weather|прогноз|божомол/, ['hazard']],
];

/**
 * Подбор публикаций по вопросу. Если названа тема (вода, концерты, театр…) — только эта тема;
 * если названы даты (сегодня, завтра, неделя, «31 октября») — только эти даты. Прошедшее — по запросу.
 */
export const searchItems = (all: Announcement[], q: string, limit = 10, includePast = false, ignoreDates = false) => {
  const qw = words(q);
  const dates = ignoreDates ? null : askedDates(q);
  const ql = q.toLowerCase();
  const topics = new Set(TOPICS.filter(([re]) => re.test(ql)).flatMap(([, cats]) => cats));
  const theatreAsked = /театр|спектак|филармон|опер[аы](?![а-яё])|балет|theatre|theater/.test(ql);
  const placeHit = (a: Announcement) =>
    REGIONS.some((r) => (r.cities as string[]).includes(a.city) && Object.values(r.name).some((n) => ql.includes(n.toLowerCase().split(' ')[0].slice(0, 5))));
  const placeAsked = REGIONS.some((r) => Object.values(r.name).some((n) => ql.includes(n.toLowerCase().split(' ')[0].slice(0, 5))));
  const wantPast = includePast || /прошл|архив|был|өткөн|past|archive/.test(ql);
  const scored = all
    .filter((a) => isListed(a) && (wantPast || isFresh(a)))
    .filter((a) => !topics.size || topics.has(a.category))
    .filter((a) => !theatreAsked || /театр|филармон|опер|балет|theatre|philharmon/i.test(`${a.location.ru} ${a.eventDetails?.venue || ''} ${a.title.ru}`) || a.category === 'culture')
    .filter((a) => !dates || overlaps(a, dates[0], dates[1]))
    .filter((a) => !placeAsked || placeHit(a) || a.city === 'all')
    .map((a) => {
      const hay = words(
        [a.title.ru, a.title.kg, a.title.en, a.summary.ru, a.location.ru, a.locality, a.district, a.category, a.sourceName].filter(Boolean).join(' ')
      );
      let score = qw.reduce((n, w) => n + (hay.some((h) => h.startsWith(w.slice(0, Math.max(4, w.length - 2)))) ? 2 : 0), 0);
      if (topics.size) score += 4;
      if (dates) score += 4;
      if (dates && a.startDate.slice(0, 10) >= dates[0] && a.startDate.slice(0, 10) <= dates[1]) score += 3; // начинается в этот день
      if (placeHit(a)) score += 2;
      if (a.category === 'hazard' && a.dangerLevel === 'high') score += 1;
      return { a, score };
    })
    // без темы и дат нужен заметный словесный повод, чтобы не показывать случайное
    // одно слово («Шакира») — достаточно одного совпадения; иначе нужен заметный повод
    .filter((x) => x.score >= Math.min(4, Math.max(2, qw.length * 2)))
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

const L3 = <T extends Record<Language, string>>(o: T, lang: Language) => o[lang] || o.ru;

/**
 * Ответ без ИИ (режим «поиск по сайту»): короткая сводка найденного и ответы на частые вопросы
 * (тарифы, контакты, экстренные номера, погода). Только данные сайта, ничего не придумывается.
 */
export const searchAnswer = (question: string, lang: Language, found: Announcement[], nearest: Announcement[], official: { date: string; sourceName: string; regions: Record<string, { nightFrom: number; nightTo: number; dayFrom: number; dayTo: number }> } | null) => {
  const q = question.toLowerCase();
  const { t } = getTranslation(lang);
  const parts: string[] = [];
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

  if (/тариф|цен|стоим|сколько сто|разме|добав|опубликов|прайс|баа|жайгаш|price|cost|post|publish/.test(q)) {
    const list = PLAN_IDS.map((id) => `• ${PLANS[id].name[lang]} — ${PLANS[id].priceSom.toLocaleString('ru-RU')} ${lang === 'en' ? 'KGS' : 'сом'} / 30 ${lang === 'kg' ? 'күн' : lang === 'en' ? 'days' : 'дней'}`).join('\n');
    parts.push(
      L3({ ru: `Тарифы размещения (оплата раз в 30 дней):\n${list}\nКак разместить: «Разместить» → регистрация → выбор тарифа → оплата (администратор подтверждает) → форма публикации.`, kg: `Жайгаштыруу тарифтери (30 күндө бир төлөм):\n${list}\nКантип жайгаштыруу: «Жайгаштыруу» → каттоо → тариф → төлөм (администратор тастыктайт) → жарыя формасы.`, en: `Posting plans (paid every 30 days):\n${list}\nHow to post: "Post" → sign up → choose a plan → pay (confirmed by the admin) → fill in the form.` }, lang)
    );
  }
  if (/контакт|связ|whatsapp|ватсап|телеграм|telegram|инстаграм|instagram|байланыш|редакц|contact/.test(q)) {
    parts.push(
      L3({ ru: `Связаться с DataNews: WhatsApp и Telegram ${CONTACTS.phone}, Instagram ${CONTACTS.instagramHandle}.`, kg: `DataNews менен байланыш: WhatsApp жана Telegram ${CONTACTS.phone}, Instagram ${CONTACTS.instagramHandle}.`, en: `Contact DataNews: WhatsApp and Telegram ${CONTACTS.phone}, Instagram ${CONTACTS.instagramHandle}.` }, lang)
    );
  }
  if (/112|101|102|103|экстрен|скор|пожар|милиц|полиц|мчс|шашылыш|өрт|emergency|ambulance|police|fire/.test(q)) {
    parts.push(EMERGENCY_NUMBERS.map((e) => `${e.phone} — ${e.name[lang]}`).join('\n'));
  }
  if (/погод|аба ырай|weather|прогноз|температур|градус|божомол/.test(q)) {
    if (official && official.date >= kgDateStr()) {
      const rows = Object.entries(official.regions)
        .map(([id, v]) => `• ${t(`cities.${id}`)}: ${lang === 'en' ? 'night' : lang === 'kg' ? 'түнкүсүн' : 'ночью'} ${sign(v.nightFrom)}…${sign(v.nightTo)}, ${lang === 'en' ? 'day' : lang === 'kg' ? 'күндүз' : 'днём'} ${sign(v.dayFrom)}…${sign(v.dayTo)} °C`)
        .join('\n');
      parts.push(`${L3({ ru: `Официальный прогноз (${official.sourceName}) на ${official.date}:`, kg: `Расмий божомол (${official.sourceName}), ${official.date}:`, en: `Official forecast (${official.sourceName}) for ${official.date}:` }, lang)}\n${rows}`);
    } else {
      parts.push(
        L3({ ru: `Официального прогноза на сайте сейчас нет. Прогноз Кыргызгидромета — meteo.kg, дежурный синоптик ${KYRGYZHYDROMET.forecasterPhones[0]}.`, kg: `Сайтта азыр расмий божомол жок. Кыргызгидрометтин божомолу — meteo.kg, синоптик ${KYRGYZHYDROMET.forecasterPhones[0]}.`, en: `There is no official forecast on the site right now. Kyrgyzhydromet forecast: meteo.kg, forecaster ${KYRGYZHYDROMET.forecasterPhones[0]}.` }, lang)
      );
    }
  }

  if (/^\s*(привет|салам|здравств|добрый|саламатсыз|hello|hi|hey)(?![a-zа-яё])/.test(q) && !found.length) {
    parts.push(
      L3({ ru: 'Здравствуйте! Я ищу по новостям и афише DataNews. Спросите, например: «что будет завтра в Бишкеке», «концерты в ноябре», «отключения воды», «сколько стоит размещение».', kg: 'Саламатсызбы! Мен DataNews жаңылыктары жана афишасы боюнча издейм. Мисалы: «эртең Бишкекте эмне болот», «ноябрдагы концерттер», «тарифтер».', en: 'Hello! I search DataNews news and listings. Try: "what is on tomorrow in Bishkek", "concerts in November", "water outages", "posting prices".' }, lang)
    );
  }
  if (found.length) {
    const isArchive = found.every((a) => !isFresh(a));
    const lines = found.slice(0, 5).map((a, i) => `${i + 1}. ${a.title[lang] || a.title.ru} — ${formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}, ${a.location[lang] || a.location.ru}`);
    const head = isArchive
      ? L3({ ru: `Актуального нет. В архиве сайта (${found.length}):`, kg: `Актуалдуу жок. Сайттын архивинде (${found.length}):`, en: `Nothing current. In the site archive (${found.length}):` }, lang)
      : L3({ ru: `Нашла на сайте (${found.length}):`, kg: `Сайттан табылды (${found.length}):`, en: `Found on the site (${found.length}):` }, lang);
    parts.push(`${head}\n${lines.join('\n')}`);
  } else if (!parts.length) {
    if (askedDates(question)) {
      parts.push(L3({ ru: 'На эти даты подходящих публикаций на сайте нет.', kg: 'Бул даталарга ылайыктуу жарыялар сайтта жок.', en: 'Nothing on the site matches these dates.' }, lang));
      if (nearest.length) {
        const lines = nearest.slice(0, 3).map((a, i) => `${i + 1}. ${a.title[lang] || a.title.ru} — ${formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}, ${a.location[lang] || a.location.ru}`);
        parts.push(`${L3({ ru: 'Ближайшие:', kg: 'Эң жакынкылар:', en: 'Coming up next:' }, lang)}\n${lines.join('\n')}`);
      }
    } else parts.push(
      L3({ ru: 'По вашему вопросу на сайте ничего не найдено. Попробуйте другие слова (например, «концерты на этой неделе», «вода Бишкек», «законы») или напишите редакции.', kg: 'Сурооңуз боюнча сайттан эч нерсе табылган жок. Башка сөздөрдү колдонуп көрүңүз же редакцияга жазыңыз.', en: 'Nothing on the site matches your question. Try other words (e.g. "concerts this week", "water Bishkek", "laws") or message the editors.' }, lang)
      );
  }
  return parts.join('\n\n');
};
