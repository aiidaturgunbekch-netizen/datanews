/**
 * Бот DataNews без внешней языковой модели: определяет тему вопроса по ключевым словам,
 * находит даты и место, ищет по опубликованным материалам сайта и собирает ответ из фактических данных.
 * Ничего не придумывает: если данных нет — так и говорит и даёт ссылку на раздел или официальный источник.
 */
import type { Announcement, CategoryId, CityId, Language } from '../types';
import type { BotAction, BotIntent, BotItem, BotLink, BotReply } from '../types/bot';
import { PLANS, PLAN_IDS } from '../config/site';
import { EMERGENCY_NUMBERS, KYRGYZHYDROMET, OfficialForecast } from '../config/weather';
import { CONTACTS } from '../config/contacts';
import { REGIONS } from '../config/regions';
import { addDaysStr, kgDateStr, kgNowLocal } from '../utils/time';
import { isListed } from '../utils/urgency';
import { freshOrder, getAnnouncementDisplayStatus, isFresh } from '../utils/statusUtils';
import { formatDayMonth, formatDayMonthTime, formatWhen } from '../utils/dates';
import { eventSource, ticketLink } from '../utils/links';
import { getTranslation } from '../locales/translations';
import { INTENT_LABEL } from '../config/bot';

type L3 = Record<Language, string>;
const tr = (o: L3, lang: Language) => o[lang] || o.ru;

// ─────────────── Разбор вопроса ───────────────

/** Темы по ключевым словам (RU / KG / EN). Порядок важен: более узкие темы — раньше. */
const INTENT_RE: [BotIntent, RegExp][] = [
  ['contact', /связ|контакт|whatsapp|ватсап|вотсап|инстаграм|instagram|телеграм|telegram|редакц|байланыш|contact/],
  ['tariffs', /тариф|прайс|цен[аыу]|стоимост|сколько сто|баасы|баа(?![а-яөүң])|price|plan|cost/],
  ['howto', /как (раз|добав|опубл|подат)|разместить|подать объяв|кантип жайгаш|жарыя бер|how (to|do i) (post|publish|add)|post an? (ad|notice)/],
  ['tickets', /билет|ticket/],
  ['passes', /перевал|ашуу|ашуу|тоо-ашуу|төө-ашуу|ала-бел|долон|талдык|mountain pass|passes/],
  ['storm', /штормов|предупрежд|опасн|лавин|сел[ья]|заморозк|эскертүү|коркунуч|warning|hazard|storm|avalanche/],
  ['weather', /погод|аба ырай|weather|прогноз|температур|градус|дожд|снег|жамгыр|кар жаа|forecast/],
  ['laws', /закон|мыйзам|кодекс|\blaws?\b|вступа|күчүнө кир|in force/],
  ['state', /госуд|правительств|кабинет|президент|указ|постановлен|решени|жогорку кенеш|мамлекет|өкмөт|чечим|government|decree|state news/],
  ['shows', /концерт|кино|фильм|сеанс|театр|спектакл|опер[аы](?![а-яё])|балет|филармон|шоу|афиш|concert|movie|cinema|film|theat|show/],
  ['regions', /по регион|регион[ыа]|облает|облас|аймак|облус|regions?\b/],
  ['today', /новост|что (сегодня|происход|будет)|жаңылык|эмне болуп|news|what'?s on|happening/],
];

/** Места: город/область → значения поля city публикаций */
const PLACE_RE: [RegExp, CityId[]][] = [
  [/бишкек|bishkek/, ['bishkek']],
  [/ошск|ош облус|osh region/, ['osh_region']],
  [/(^|[^а-яёa-z])ош(е|а|у|ом)?(?![а-яёa-z])|(^|[^a-z])osh(?![a-z])/, ['osh']],
  [/чуйск|чүй|чуй|chu[iy]|токмок|кара-балт|кант(?![а-яё])/, ['chui']],
  [/нарын|naryn/, ['naryn']],
  [/талас|talas/, ['talas']],
  [/баткен|batken/, ['batken']],
  [/иссык|ысык|issyk|каракол|karakol|чолпон|cholpon/, ['issykkul', 'karakol']],
  [/джалал|жалал|jalal/, ['jalalabad']],
];

const MONTHS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS_KG = ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];

const monthRange = (y: number, mi: number): [string, string] => {
  const mm = String(mi + 1).padStart(2, '0');
  const last = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate();
  return [`${y}-${mm}-01`, `${y}-${mm}-${last}`];
};

/** Даты из вопроса: сегодня, завтра, послезавтра, выходные, неделя, месяц, «31 октября», «2026-10-31» */
export const parseDates = (q: string, today = kgDateStr()): [string, string] | null => {
  const s = q.toLowerCase();
  const y = Number(today.slice(0, 4));
  if (/послезавтра|бүрсүгүнү|day after tomorrow/.test(s)) return [addDaysStr(today, 2), addDaysStr(today, 2)];
  if (/сегодня|бүгүн|today|tonight/.test(s)) return [today, today];
  if (/завтра|эртең|tomorrow/.test(s)) return [addDaysStr(today, 1), addDaysStr(today, 1)];
  if (/выходн|дем алыш|weekend/.test(s)) {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 — воскресенье
    const toSat = dow === 0 ? -1 : 6 - dow;
    return [addDaysStr(today, toSat), addDaysStr(today, toSat + 1)];
  }
  if (/следующ[а-я]* недел|кийинки жума|next week/.test(s)) return [addDaysStr(today, 7), addDaysStr(today, 14)];
  if (/недел|жума|week/.test(s)) return [today, addDaysStr(today, 7)];
  if (/этом месяце|этот месяц|этого месяца|ушул ай|this month/.test(s)) return monthRange(y, Number(today.slice(5, 7)) - 1);
  const iso = s.match(/(20\d\d)-(\d\d)-(\d\d)/);
  if (iso) return [iso[0], iso[0]];
  const dm = s.match(/(\d{1,2})[\s.-]*(январ|феврал|март|апрел|ма[йяе]|июн|июл|август|сентябр|октябр|ноябр|декабр)/) || s.match(/(\d{1,2})[\s-]*(-?)(january|february|march|april|may|june|july|august|september|october|november|december)/);
  if (dm) {
    const name = dm[3] || dm[2];
    const mi = MONTHS_EN.indexOf(name) >= 0 ? MONTHS_EN.indexOf(name) : MONTHS.findIndex((x) => name.startsWith(x));
    if (mi >= 0) {
      const d = `${y}-${String(mi + 1).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
      return [d, d];
    }
  }
  const md = s.match(/(\d{1,2})[\s-]*(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр)/);
  if (md) {
    const mi = MONTHS_KG.findIndex((x) => md[2].startsWith(x));
    if (mi >= 0) return [`${y}-${String(mi + 1).padStart(2, '0')}-${md[1].padStart(2, '0')}`, `${y}-${String(mi + 1).padStart(2, '0')}-${md[1].padStart(2, '0')}`];
  }
  const monthOnly = s.match(/(январ|феврал|март|апрел|ма[йяе]|июн|июл|август|сентябр|октябр|ноябр|декабр)|(january|february|march|april|june|july|august|september|october|november|december)/);
  if (monthOnly) {
    const mi = monthOnly[2] ? MONTHS_EN.indexOf(monthOnly[2]) : MONTHS.findIndex((x) => monthOnly[1].startsWith(x));
    if (mi >= 0) return monthRange(y, mi);
  }
  return null;
};

export const parsePlaces = (q: string): CityId[] => {
  const s = q.toLowerCase();
  return [...new Set(PLACE_RE.filter(([re]) => re.test(s)).flatMap(([, ids]) => ids))];
};

export const detectIntent = (q: string): BotIntent => {
  const s = q.toLowerCase();
  return INTENT_RE.find(([, re]) => re.test(s))?.[0] || 'search';
};

// ─────────────── Отбор публикаций ───────────────

const overlaps = (a: Announcement, from: string, to: string) => {
  const s = a.startDate.slice(0, 10);
  const e = (a.endDate || a.startDate).slice(0, 10);
  return s <= to && e >= from;
};

interface Filter {
  cats?: CategoryId[];
  dates?: [string, string] | null;
  places?: CityId[];
  /** true — включая прошедшее */
  past?: boolean;
  test?: (a: Announcement) => boolean;
}

const pick = (all: Announcement[], f: Filter) =>
  all
    .filter((a) => isListed(a))
    .filter((a) => f.past || isFresh(a))
    .filter((a) => !f.cats || f.cats.includes(a.category))
    .filter((a) => !f.dates || overlaps(a, f.dates[0], f.dates[1]))
    .filter((a) => !f.places?.length || f.places.includes(a.city) || a.city === 'all')
    .filter((a) => !f.test || f.test(a))
    .sort((a, b) => freshOrder(a, b));

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

const STOP = new Set(['что', 'где', 'когда', 'какие', 'какой', 'какая', 'есть', 'ли', 'будет', 'будут', 'пройдут', 'the', 'what', 'when', 'where', 'are', 'there', 'эмне', 'кайда', 'качан', 'барбы', 'для', 'про', 'это', 'news', 'новости']);

/** Поиск по словам в заголовке, месте, описании */
const byWords = (all: Announcement[], q: string, past: boolean) => {
  const qw = words(q).filter((w) => !STOP.has(w));
  if (!qw.length) return [];
  return all
    .filter((a) => isListed(a) && (past || isFresh(a)))
    .map((a) => {
      const hay = words([a.title.ru, a.title.kg, a.title.en, a.summary.ru, a.location.ru, a.locality, a.district, a.sourceName, a.eventDetails?.venue].filter(Boolean).join(' '));
      const score = qw.filter((w) => hay.some((h) => h.startsWith(w.slice(0, Math.max(4, w.length - 2))))).length;
      return { a, score };
    })
    .filter((x) => x.score >= Math.min(2, qw.length))
    .sort((x, y) => y.score - x.score || freshOrder(x.a, y.a))
    .map((x) => x.a);
};

const PASS_RE = /перевал|ашуу|pass|тоннел|Тоо-Ашуу|Төө-Ашуу|Ала-Бел|Талдык|Долон|Торугарт/i;

// ─────────────── Оформление ответа ───────────────

const toItem = (a: Announcement, lang: Language, withTicket = false): BotItem => {
  const tl = ticketLink(a);
  let note: string | undefined;
  if (a.legal) {
    const st = getAnnouncementDisplayStatus(a);
    note = a.legal.effectiveFrom
      ? `${tr({ ru: st === 'inForce' ? 'Действует с' : 'Вступает в силу', kg: st === 'inForce' ? 'Күчүндө:' : 'Күчүнө кирет:', en: st === 'inForce' ? 'In force since' : 'Comes into force' }, lang)} ${formatDayMonth(a.legal.effectiveFrom.slice(0, 10), lang)}`
      : tr({ ru: 'Дата вступления в силу не указана', kg: 'Күчүнө кирген күнү көрсөтүлгөн эмес', en: 'Entry-into-force date not stated' }, lang);
  }
  return {
    id: a.id,
    title: a.title[lang] || a.title.ru,
    when: formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay),
    place: a.location[lang] || a.location.ru,
    note,
    sourceUrl: eventSource(a) || undefined,
    sourceName: a.sourceName,
    ticketUrl: withTicket && tl.verified && tl.url ? tl.url : undefined,
  };
};

const L = {
  open: { ru: 'Открыть раздел', kg: 'Бөлүмдү ачуу', en: 'Open section' },
  afisha: { ru: 'Открыть афишу', kg: 'Афишаны ачуу', en: 'Open listings' },
  more: { ru: 'Ещё', kg: 'Дагы', en: 'More' },
  meteo: { ru: 'Кыргызгидромет (meteo.kg)', kg: 'Кыргызгидромет (meteo.kg)', en: 'Kyrgyzhydromet (meteo.kg)' },
  mchs: { ru: 'МЧС КР', kg: 'ӨКМ', en: 'Emergency Ministry' },
  mtd: { ru: 'Минтранс КР', kg: 'Транспорт министрлиги', en: 'Transport Ministry' },
  cbd: { ru: 'Законы: cbd.minjust.gov.kg', kg: 'Мыйзамдар: cbd.minjust.gov.kg', en: 'Laws: cbd.minjust.gov.kg' },
  gov: { ru: 'Кабинет Министров (gov.kg)', kg: 'Министрлер Кабинети (gov.kg)', en: 'Cabinet of Ministers (gov.kg)' },
  pres: { ru: 'Президент (president.kg)', kg: 'Президент (president.kg)', en: 'President (president.kg)' },
};

const placeLabel = (places: CityId[], lang: Language) => {
  const { t } = getTranslation(lang);
  return places.length ? ` — ${places.filter((p) => p !== 'karakol').map((p) => t(`cities.${p}`)).join(', ')}` : '';
};
const dateLabel = (d: [string, string] | null, lang: Language) =>
  !d ? '' : d[0] === d[1] ? ` — ${formatDayMonth(d[0], lang)}` : ` — ${formatDayMonth(d[0], lang)} – ${formatDayMonth(d[1], lang)}`;

/** Кнопки «что ещё можно спросить» */
const follow = (lang: Language, ...ids: BotIntent[]): BotAction[] => ids.map((id) => ({ label: INTENT_LABEL[id][lang], intent: id }));



// ─────────────── Ответ ───────────────

export interface BotInput {
  q?: string;
  intent?: BotIntent;
  lang: Language;
}

/**
 * Собрать ответ. all — опубликованные материалы сайта, official — официальный прогноз Кыргызгидромета,
 * внесённый редакцией (или null).
 */
export const answer = (input: BotInput, source: Announcement[], official: OfficialForecast | null): BotReply => {
  const { lang } = input;
  // Неполные записи (без заголовка, места или даты) пропускаем, чтобы ответ не ломался
  const all = (source || []).filter((a) => a && a.title && a.title.ru && a.location && a.startDate && a.category);
  const { t } = getTranslation(lang);
  const q = (input.q || '').trim();
  const intent: BotIntent = input.intent || (q ? detectIntent(q) : 'help');
  const dates = q ? parseDates(q) : null;
  const places = q ? parsePlaces(q) : [];
  const past = /прошл|архив|был|өткөн|past|archive/.test(q.toLowerCase());
  const today = kgDateStr();
  const items = (list: Announcement[], n = 6, withTicket = false) => list.slice(0, n).map((a) => toItem(a, lang, withTicket));
  const reply = (r: Omit<BotReply, 'mode' | 'intent' | 'links' | 'actions' | 'items'> & Partial<BotReply>): BotReply => {
    const links = (r.links || []).filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i);
    return { mode: 'bot', intent, items: [], actions: [], ...r, links, answer: r.answer.replace(/\.\.(?!\.)/g, '.') };
  };
  const count = (n: number) =>
    lang === 'en' ? `${n}` : lang === 'kg' ? `${n}` : `${n}`;
  const noneMsg = (what: L3) =>
    tr({ ru: `На сайте сейчас нет: ${what.ru}.`, kg: `Сайтта азыр жок: ${what.kg}.`, en: `Nothing on the site right now: ${what.en}.` }, lang);

  switch (intent) {
    case 'help':
      return reply({
        answer: tr(
          {
            ru: 'Здравствуйте! Я бот DataNews. Отвечаю по новостям, афише и предупреждениям, опубликованным на сайте, — без внешнего ИИ. Выберите тему или напишите вопрос, например: «Что сегодня в Бишкеке?», «Концерты на этой неделе», «Предупреждения по Нарынской области».',
            kg: 'Саламатсызбы! Мен DataNews ботумун. Сайтта жарыяланган жаңылыктар, афиша жана эскертүүлөр боюнча жооп берем — тышкы ЖИсиз. Теманы тандаңыз же суроо жазыңыз, мисалы: «Бүгүн Бишкекте эмне болот?», «Ушул жумадагы концерттер».',
            en: 'Hello! I am the DataNews bot. I answer from news, listings and warnings published on the site — no external AI. Pick a topic or type a question, e.g. "What is on today in Bishkek?", "Concerts this week", "Warnings for Naryn region".',
          },
          lang
        ),
        actions: follow(lang, 'today', 'regions', 'weather', 'storm', 'passes', 'state', 'laws', 'shows', 'tickets', 'howto', 'tariffs', 'contact'),
      });

    case 'contact':
      return reply({
        answer: tr(
          {
            ru: `Редакция DataNews:\n• WhatsApp: ${CONTACTS.phone}\n• Instagram: ${CONTACTS.instagramHandle}\n• Telegram: тот же номер ${CONTACTS.phone} (найдите по номеру в Telegram)\nНе экстренная служба: при опасности звоните 112.`,
            kg: `DataNews редакциясы:\n• WhatsApp: ${CONTACTS.phone}\n• Instagram: ${CONTACTS.instagramHandle}\n• Telegram: ошол эле номер ${CONTACTS.phone} (Telegram'дан номер боюнча табыңыз)\nШашылыш кызмат эмес: коркунучта 112ге чалыңыз.`,
            en: `DataNews editors:\n• WhatsApp: ${CONTACTS.phone}\n• Instagram: ${CONTACTS.instagramHandle}\n• Telegram: same number ${CONTACTS.phone} (search by number in Telegram)\nNot an emergency service: in danger call 112.`,
          },
          lang
        ),
        links: [
          { label: 'WhatsApp', href: CONTACTS.whatsappUrl },
          { label: 'Instagram', href: CONTACTS.instagramUrl },
        ],
        actions: [{ label: INTENT_LABEL.contact[lang], nav: { view: 'contacts' } }, ...follow(lang, 'howto', 'tariffs')],
      });

    case 'tariffs': {
      const lines = PLAN_IDS.map((id) => {
        const p = PLANS[id];
        const lim = p.postLimit === null ? tr({ ru: 'без лимита', kg: 'чексиз', en: 'unlimited' }, lang) : `${p.postLimit} ${tr({ ru: 'публ.', kg: 'жарыя', en: 'posts' }, lang)}`;
        const extra = p.dailyLimit ? `, ${tr({ ru: 'не более 1 в день', kg: 'күнүнө 1ден ашпайт', en: 'max 1 a day' }, lang)}` : '';
        const only = p.categories ? `, ${tr({ ru: 'только «Театр и культура»', kg: '«Театр жана маданият» гана', en: '"Theatre & culture" only' }, lang)}` : '';
        const gov = p.govOnly ? `, ${tr({ ru: 'для госорганов', kg: 'мамлекеттик органдар үчүн', en: 'government bodies' }, lang)}` : '';
        return `• ${p.name[lang]} — ${p.priceSom.toLocaleString('ru-RU')} ${lang === 'en' ? 'KGS' : 'сом'} / 30 ${tr({ ru: 'дней', kg: 'күн', en: 'days' }, lang)}: ${lim}${extra}${only}${gov}`;
      });
      return reply({
        answer: `${tr({ ru: 'Тарифы публикации (все — на 30 дней):', kg: 'Жарыялоо тарифтери (баары 30 күнгө):', en: 'Posting plans (all for 30 days):' }, lang)}\n${lines.join('\n')}\n${tr({ ru: 'Оплата пока вручную: администратор присылает реквизиты и подтверждает платёж.', kg: 'Төлөм азырынча кол менен: администратор реквизиттерди жөнөтүп, төлөмдү тастыктайт.', en: 'Payment is manual for now: the admin sends payment details and confirms it.' }, lang)}`,
        actions: [{ label: tr({ ru: 'Открыть тарифы', kg: 'Тарифтерди ачуу', en: 'Open plans' }, lang), nav: { view: 'organizations' } }, ...follow(lang, 'howto', 'contact')],
      });
    }

    case 'howto':
      return reply({
        answer: tr(
          {
            ru: 'Как разместить объявление:\n1. Нажмите «Разместить» и зарегистрируйтесь.\n2. Выберите тариф и оплатите — администратор подтвердит оплату.\n3. Заполните форму: заголовок, дата, место, описание, «Организация или частное лицо», фото или афиша.\n4. Публикация проходит модерацию (подтверждённые госорганы публикуют сразу).\nПравила: только достоверные сведения со ссылкой на источник.',
            kg: 'Жарыяны кантип жайгаштыруу:\n1. «Жайгаштыруу» баскычын басып, катталыңыз.\n2. Тарифти тандап, төлөңүз — администратор тастыктайт.\n3. Форманы толтуруңуз: аталыш, дата, жер, сүрөттөмө, «Уюм же жеке адам», сүрөт же афиша.\n4. Жарыя модерациядан өтөт (тастыкталган мамлекеттик органдар дароо жарыялайт).',
            en: 'How to post a notice:\n1. Tap "Post" and sign up.\n2. Choose a plan and pay — the admin confirms the payment.\n3. Fill in the form: title, date, place, description, "Organisation or individual", photo or poster.\n4. Posts are moderated (verified government bodies publish immediately).',
          },
          lang
        ),
        actions: [
          { label: tr({ ru: 'Разместить объявление', kg: 'Жарыя жайгаштыруу', en: 'Post a notice' }, lang), nav: { publish: true } },
          { label: tr({ ru: 'Правила публикации', kg: 'Жарыялоо эрежелери', en: 'Publishing rules' }, lang), nav: { view: 'rules' } },
          ...follow(lang, 'tariffs'),
        ],
      });

    case 'weather': {
      const fc = official && official.date >= today ? official : null;
      const warnings = pick(all, { cats: ['hazard'], places });
      const links: BotLink[] = [{ label: tr(L.meteo, lang), href: KYRGYZHYDROMET.site }];
      if (!fc) {
        return reply({
          answer: `${tr(
            {
              ru: `Официального прогноза Кыргызгидромета на сайте сейчас нет, поэтому прогноз я не даю. Смотрите meteo.kg или звоните дежурному синоптику: ${KYRGYZHYDROMET.forecasterPhones[0]}.`,
              kg: `Сайтта азыр Кыргызгидрометтин расмий божомолу жок, ошондуктан божомол бербейм. meteo.kg сайтын караңыз же синоптикке чалыңыз: ${KYRGYZHYDROMET.forecasterPhones[0]}.`,
              en: `There is no official Kyrgyzhydromet forecast on the site right now, so I will not give one. See meteo.kg or call the duty forecaster: ${KYRGYZHYDROMET.forecasterPhones[0]}.`,
            },
            lang
          )}${warnings.length ? `\n${tr({ ru: `Действующих официальных предупреждений: ${warnings.length}.`, kg: `Күчүндөгү расмий эскертүүлөр: ${warnings.length}.`, en: `Active official warnings: ${warnings.length}.` }, lang)}` : ''}`,
          links,
          actions: follow(lang, 'storm', 'passes'),
        });
      }
      const ids = Object.keys(fc.regions).filter((id) => !places.length || places.includes(id as CityId) || (places.includes('osh') && id === 'osh'));
      const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
      const rows = (ids.length ? ids : Object.keys(fc.regions)).map((id) => {
        const v = fc.regions[id as CityId]!;
        return `• ${t(`cities.${id}`)}: ${tr({ ru: 'ночью', kg: 'түнкүсүн', en: 'night' }, lang)} ${sign(v.nightFrom)}…${sign(v.nightTo)}, ${tr({ ru: 'днём', kg: 'күндүз', en: 'day' }, lang)} ${sign(v.dayFrom)}…${sign(v.dayTo)} °C`;
      });
      links.unshift({ label: `${tr({ ru: 'Источник', kg: 'Булагы', en: 'Source' }, lang)}: ${fc.sourceName}`, href: fc.sourceUrl });
      return reply({
        answer: `${tr({ ru: 'Официальный прогноз', kg: 'Расмий божомол', en: 'Official forecast' }, lang)} (${fc.sourceName}) — ${formatDayMonth(fc.date, lang)}:\n${rows.join('\n')}${fc.text ? `\n${fc.text}` : ''}${fc.updatedAt ? `\n${tr({ ru: 'Обновлено', kg: 'Жаңыртылды', en: 'Updated' }, lang)}: ${formatDayMonthTime(kgNowLocal(Date.parse(fc.updatedAt)), lang)}` : ''}`,
        links,
        actions: follow(lang, 'storm', 'passes'),
      });
    }

    case 'storm': {
      const list = pick(all, { cats: ['hazard'], places, dates });
      const links = [
        { label: tr(L.meteo, lang), href: KYRGYZHYDROMET.site },
        { label: tr(L.mchs, lang), href: 'https://www.mchs.gov.kg/ru/' },
      ];
      if (!list.length) {
        return reply({
          answer: `${tr({ ru: 'Действующих официальных предупреждений на сайте нет', kg: 'Сайтта күчүндөгү расмий эскертүүлөр жок', en: 'No active official warnings on the site' }, lang)}${placeLabel(places, lang)}${dateLabel(dates, lang)}. ${tr({ ru: 'Проверьте последние сообщения Кыргызгидромета и МЧС. При опасности — 112.', kg: 'Кыргызгидромет жана ӨКМдин акыркы билдирүүлөрүн текшериңиз. Коркунучта — 112.', en: 'Check the latest Kyrgyzhydromet and Emergency Ministry notices. In danger call 112.' }, lang)}`,
          links,
          actions: follow(lang, 'weather', 'passes'),
        });
      }
      return reply({
        answer: `${tr({ ru: 'Официальные предупреждения', kg: 'Расмий эскертүүлөр', en: 'Official warnings' }, lang)}${placeLabel(places, lang)}${dateLabel(dates, lang)}: ${list.length}.`,
        items: items(list),
        links,
        actions: [{ label: tr(L.open, lang), nav: { category: 'hazard' } }, ...follow(lang, 'weather', 'passes')],
      });
    }

    case 'passes': {
      const list = pick(all, { cats: ['roads', 'hazard'], test: (a) => PASS_RE.test(`${a.title.ru} ${a.location.ru} ${a.locality || ''}`) });
      return reply({
        answer: `${tr({ ru: 'Прогноз погоды по перевалам сайт сейчас не публикует — данных нет, поэтому не придумываю. Ограничения движения показываю только по сообщениям ведомств.', kg: 'Сайт азыр ашуулар боюнча аба ырайын жарыялабайт — маалымат жок. Кыймылдагы чектөөлөрдү мекемелердин билдирүүлөрү боюнча гана көрсөтөм.', en: 'The site does not publish pass weather forecasts right now — no data, so I will not make one up. I only show traffic restrictions reported by the authorities.' }, lang)}\n${
            list.length
              ? tr({ ru: `Подтверждённые ограничения: ${list.length}.`, kg: `Тастыкталган чектөөлөр: ${list.length}.`, en: `Confirmed restrictions: ${list.length}.` }, lang)
              : tr({ ru: 'Подтверждённых сообщений об ограничениях на сайте нет.', kg: 'Тастыкталган чектөөлөр тууралуу билдирүү сайтта жок.', en: 'No confirmed restriction reports on the site.' }, lang)
          }`,
        items: items(list),
        links: [
          { label: tr(L.meteo, lang), href: KYRGYZHYDROMET.site },
          { label: tr(L.mtd, lang), href: 'https://mtd.gov.kg/' },
          { label: tr(L.mchs, lang), href: 'https://www.mchs.gov.kg/ru/' },
        ],
        actions: follow(lang, 'storm', 'weather'),
      });
    }

    case 'laws': {
      const laws = pick(all, { cats: ['laws'], past: true });
      // «вступают в силу в этом месяце / в ноябре» — по дате вступления в силу
      const byEff = dates ? laws.filter((a) => a.legal?.effectiveFrom && a.legal.effectiveFrom.slice(0, 10) >= dates[0] && a.legal.effectiveFrom.slice(0, 10) <= dates[1]) : laws;
      const links = [{ label: tr(L.cbd, lang), href: 'https://cbd.minjust.gov.kg/' }];
      if (dates && !byEff.length) {
        return reply({
          answer: `${tr({ ru: 'На сайте нет законов, вступающих в силу', kg: 'Сайтта күчүнө кире турган мыйзамдар жок', en: 'No laws on the site come into force' }, lang)}${dateLabel(dates, lang)}.${laws.length ? ` ${tr({ ru: 'Последние изменения законов на сайте:', kg: 'Сайттагы мыйзамдардын акыркы өзгөрүүлөрү:', en: 'Latest law changes on the site:' }, lang)}` : ''}`,
          items: items(laws, 5),
          links,
          actions: [{ label: tr(L.open, lang), nav: { category: 'laws' } }, ...follow(lang, 'state')],
        });
      }
      if (!byEff.length) return reply({ answer: noneMsg({ ru: 'публикаций об изменениях законов', kg: 'мыйзам өзгөрүүлөрү тууралуу жарыялар', en: 'posts about law changes' }), links, actions: follow(lang, 'state') });
      return reply({
        answer: `${tr({ ru: 'Изменения законов', kg: 'Мыйзамдардагы өзгөрүүлөр', en: 'Law changes' }, lang)}${dateLabel(dates, lang)}: ${byEff.length}. ${tr({ ru: 'У каждого — дата вступления в силу (если известна) и ссылка на источник.', kg: 'Ар биринде — күчүнө кирген күнү (белгилүү болсо) жана булак.', en: 'Each shows the entry-into-force date (if known) and a source.' }, lang)}`,
        items: items(byEff, 6),
        links,
        actions: [{ label: tr(L.open, lang), nav: { category: 'laws' } }, ...follow(lang, 'state')],
      });
    }

    case 'state': {
      let list = pick(all, { cats: ['state', 'gov'], places, dates, past });
      let archive = false;
      if (!list.length && !dates) {
        list = pick(all, { cats: ['state', 'gov'], places, past: true });
        archive = list.length > 0;
      }
      const links = [
        { label: tr(L.pres, lang), href: 'https://www.president.kg/' },
        { label: tr(L.gov, lang), href: 'https://www.gov.kg/' },
      ];
      if (!list.length) return reply({ answer: noneMsg({ ru: 'новостей госорганов по этому запросу', kg: 'бул суроо боюнча мамлекеттик органдардын жаңылыктары', en: 'government news for this request' }), links, actions: follow(lang, 'laws') });
      return reply({
        answer: archive
          ? tr({ ru: 'Свежих новостей госорганов нет. Последние в архиве сайта:', kg: 'Мамлекеттик органдардын жаңы кабарлары жок. Сайттын архивиндеги акыркылар:', en: 'No fresh government news. Latest in the site archive:' }, lang)
          : `${tr({ ru: 'Государственные новости', kg: 'Мамлекеттик жаңылыктар', en: 'Government news' }, lang)}${placeLabel(places, lang)}${dateLabel(dates, lang)}: ${list.length}.`,
        items: items(list),
        links,
        actions: [{ label: tr(L.open, lang), nav: { category: 'state' } }, ...follow(lang, 'laws')],
      });
    }

    case 'shows':
    case 'tickets': {
      const ql = q.toLowerCase();
      const cats: CategoryId[] = /кино|фильм|сеанс|movie|cinema|film/.test(ql)
        ? ['cinema']
        : /театр|спектакл|опер|балет|филармон|theat/.test(ql)
        ? ['culture', 'concerts']
        : /концерт|concert/.test(ql)
        ? ['concerts']
        : ['concerts', 'cinema', 'culture', 'festivals'];
      const theatre = /театр|спектакл|опер|балет|филармон|theat/.test(ql);
      let list = pick(all, {
        cats,
        dates,
        places,
        past,
        test: (a) => (intent !== 'tickets' || (ticketLink(a).verified && Boolean(ticketLink(a).url))) && (!theatre || a.category === 'culture' || /театр|филармон|опер|балет/i.test(`${a.location.ru} ${a.eventDetails?.venue || ''}`)),
      });
      const nearest = !list.length && dates ? pick(all, { cats, places }).filter((a) => a.startDate.slice(0, 10) > dates[1]).slice(0, 3) : [];
      const what = intent === 'tickets' ? { ru: 'событий с проверенной ссылкой на билеты', kg: 'текшерилген билет шилтемеси бар окуялар', en: 'events with a verified ticket link' } : { ru: 'концертов и показов', kg: 'концерттер жана көрсөтүүлөр', en: 'concerts and screenings' };
      if (!list.length) {
        return reply({
          answer: `${noneMsg(what).replace(/\.$/, '')}${placeLabel(places, lang)}${dateLabel(dates, lang)}.${nearest.length ? `\n${tr({ ru: 'Ближайшие после этих дат:', kg: 'Бул даталардан кийинки эң жакынкылар:', en: 'Next after these dates:' }, lang)}` : ''}`,
          items: items(nearest, 3, true),
          actions: [{ label: tr(L.afisha, lang), nav: { view: 'events' } }],
        });
      }
      list = list.slice(0, 8);
      return reply({
        answer: `${intent === 'tickets' ? tr({ ru: 'Билеты можно купить по проверенным ссылкам', kg: 'Билеттерди текшерилген шилтемелер аркылуу сатып алса болот', en: 'Tickets are available via verified links' }, lang) : tr({ ru: 'Концерты и показы', kg: 'Концерттер жана көрсөтүүлөр', en: 'Concerts and screenings' }, lang)}${placeLabel(places, lang)}${dateLabel(dates, lang)}: ${list.length}.`,
        items: items(list, 8, true),
        actions: [{ label: tr(L.afisha, lang), nav: { view: 'events' } }, ...follow(lang, intent === 'tickets' ? 'shows' : 'tickets')],
      });
    }

    case 'regions': {
      if (places.length) break; // конкретный регион — обычный поиск ниже
      const lines = REGIONS.map((r) => `• ${r.name[lang]}: ${pick(all, { places: r.cities as CityId[] }).filter((a) => a.city !== 'all').length}`);
      return reply({
        answer: `${tr({ ru: 'Актуальные публикации по регионам:', kg: 'Аймактар боюнча актуалдуу жарыялар:', en: 'Current posts by region:' }, lang)}\n${lines.join('\n')}\n${tr({ ru: 'Выберите регион:', kg: 'Аймакты тандаңыз:', en: 'Pick a region:' }, lang)}`,
        actions: REGIONS.map((r) => ({ label: r.name[lang], q: `${tr({ ru: 'Новости', kg: 'Жаңылыктар', en: 'News' }, lang)} ${r.name.ru}` })),
      });
    }
    default:
      break;
  }

  // ── Новости / поиск: по датам, месту и словам ──
  const d = dates || (intent === 'today' ? ([today, today] as [string, string]) : null);
  let list: Announcement[];
  if (d || places.length) {
    list = pick(all, { dates: d, places, past });
  } else {
    list = byWords(all, q, past);
    if (!list.length) list = byWords(all, q, true);
  }
  const isToday = Boolean(d && d[0] === today && d[1] === today);
  const head = `${tr({ ru: isToday ? 'Сегодня' : 'Найдено', kg: isToday ? 'Бүгүн' : 'Табылды', en: isToday ? 'Today' : 'Found' }, lang)}${placeLabel(places, lang)}${d && !isToday ? dateLabel(d, lang) : ''}`;
  if (!list.length) {
    const upcoming = d ? pick(all, { places }).filter((a) => a.startDate.slice(0, 10) > d[1]).slice(0, 3) : [];
    return reply({
      answer: `${tr({ ru: 'По вашему запросу на сайте ничего не найдено', kg: 'Сурооңуз боюнча сайттан эч нерсе табылган жок', en: 'Nothing on the site matches your request' }, lang)}${placeLabel(places, lang)}${dateLabel(d, lang)}.${upcoming.length ? `\n${tr({ ru: 'Ближайшее после этих дат:', kg: 'Бул даталардан кийинки эң жакын:', en: 'Next after these dates:' }, lang)}` : `\n${tr({ ru: 'Попробуйте выбрать тему ниже или открыть афишу.', kg: 'Төмөндөгү теманы тандаңыз же афишаны ачыңыз.', en: 'Try a topic below or open the listings.' }, lang)}`}`,
      items: items(upcoming, 3),
      actions: [
        ...(places.length === 1 ? [{ label: tr({ ru: 'Лента региона', kg: 'Аймактын тасмасы', en: 'Region feed' }, lang), nav: { city: places[0] } }] : []),
        { label: tr(L.afisha, lang), nav: { view: 'events' } },
        ...follow(lang, 'regions', 'storm'),
      ],
    });
  }
  const archived = list.every((a) => !isFresh(a));
  if (places.length) {
    // Отдельно: публикации именно этого места и общереспубликанские
    const local = list.filter((a) => a.city !== 'all');
    const national = list.filter((a) => a.city === 'all');
    const nat = national.length
      ? tr({ ru: `Касается всей страны: ${national.length}.`, kg: `Бүт өлкөгө тиешелүү: ${national.length}.`, en: `Nationwide: ${national.length}.` }, lang)
      : '';
    return reply({
      answer: local.length
        ? `${head}: ${local.length}. ${nat}`
        : `${tr({ ru: 'Отдельных публикаций по этому месту нет', kg: 'Бул жер боюнча өзүнчө жарыялар жок', en: 'No posts specifically for this place' }, lang)}${placeLabel(places, lang)}${d && !isToday ? dateLabel(d, lang) : ''}. ${nat}`,
      items: items([...local, ...national], 8),
      actions: [
        ...(places.length === 1 ? [{ label: tr({ ru: 'Лента региона', kg: 'Аймактын тасмасы', en: 'Region feed' }, lang), nav: { city: places[0] } }] : []),
        ...follow(lang, 'storm', 'shows'),
      ],
    });
  }
  return reply({
    answer: archived
      ? tr({ ru: `Актуального нет. В архиве сайта: ${count(list.length)}.`, kg: `Актуалдуу жок. Сайттын архивинде: ${list.length}.`, en: `Nothing current. In the site archive: ${list.length}.` }, lang)
      : `${head}: ${count(list.length)}.`,
    items: items(list, 8),
    actions: [
      ...(places.length === 1 ? [{ label: tr({ ru: 'Лента региона', kg: 'Аймактын тасмасы', en: 'Region feed' }, lang), nav: { city: places[0] } }] : []),
      ...follow(lang, 'storm', 'shows'),
    ],
  });
};

/** Экстренные номера — для подсказки в интерфейсе */
export const emergencyLine = (lang: Language) => EMERGENCY_NUMBERS.map((e) => `${e.phone} — ${e.name[lang]}`).join(', ');
