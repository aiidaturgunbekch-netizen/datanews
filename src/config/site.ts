import { CategoryId, LocalizedString, PlanId } from '../types';

/**
 * Тарифы платной регистрации. ВСЕ тарифы действуют 30 дней, оплата ежемесячная.
 * ЦЕНЫ меняются в поле `priceSom`, названия и описания — в `name` / `features`.
 * Ограничения (`periodDays`, `postLimit`, `dailyLimit`) проверяет СЕРВЕР (api/_lib/quota.ts),
 * а не только интерфейс: обновление страницы или повторная отправка их не обходят.
 *
 *  - период — 30 дней с момента подтверждения оплаты (или с конца текущего периода при продлении заранее);
 *  - postLimit — публикаций за период; неиспользованные сгорают, новый период начинается с полным лимитом;
 *  - dailyLimit — не более N новых публикаций за календарный день по времени Кыргызстана (UTC+6);
 *  - лимит НЕ сбрасывается 1-го числа — только с началом нового оплаченного периода.
 */
export interface PlanConfig {
  name: LocalizedString;
  priceSom: number;
  periodDays: number;
  postLimit: number | null;
  dailyLimit: number | null;
  /** Только для подтверждённых госорганов и муниципалитетов */
  govOnly?: boolean;
  /** Только эти разделы (проверяет сервер); не задано — любые */
  categories?: CategoryId[];
  /** Для кого тариф */
  audience: LocalizedString;
  features: LocalizedString[];
}

export const PLAN_IDS: PlanId[] = ['start', 'private', 'culture', 'organizer', 'gov'];

const MODERATED = { ru: 'Каждая публикация проходит модерацию', kg: 'Ар бир жарыя модерациядан өтөт', en: 'Every post is moderated' };
const BURN = {
  ru: 'Неиспользованные публикации не переносятся на следующий период',
  kg: 'Колдонулбаган жарыялар кийинки мезгилге өтпөйт',
  en: 'Unused posts do not carry over to the next period',
};

export const PLANS: Record<PlanId, PlanConfig> = {
  start: {
    name: { ru: 'Старт', kg: 'Старт', en: 'Start' },
    priceSom: 2000,
    periodDays: 30,
    postLimit: 3,
    dailyLimit: null,
    audience: { ru: 'Для разовых объявлений', kg: 'Бир жолку жарыялар үчүн', en: 'For occasional announcements' },
    features: [
      { ru: 'До 3 публикаций за 30 дней', kg: '30 күндө 3 жарыяга чейин', en: 'Up to 3 posts per 30 days' },
      BURN,
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      MODERATED,
    ],
  },
  private: {
    name: { ru: 'Частный', kg: 'Жеке', en: 'Private' },
    priceSom: 5000,
    periodDays: 30,
    postLimit: 8,
    dailyLimit: null,
    audience: { ru: 'Для частных лиц и небольших мероприятий', kg: 'Жеке адамдар жана чакан иш-чаралар үчүн', en: 'For individuals and small events' },
    features: [
      { ru: 'До 8 публикаций за 30 дней', kg: '30 күндө 8 жарыяга чейин', en: 'Up to 8 posts per 30 days' },
      BURN,
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      MODERATED,
    ],
  },
  culture: {
    name: { ru: 'Культура и театр', kg: 'Маданият жана театр', en: 'Culture & theatre' },
    priceSom: 1000,
    periodDays: 30,
    postLimit: null,
    dailyLimit: null,
    categories: ['culture'],
    audience: {
      ru: 'Для театров, филармонии и учреждений культуры',
      kg: 'Театрлар, филармония жана маданият мекемелери үчүн',
      en: 'For theatres, the philharmonic and cultural institutions',
    },
    features: [
      { ru: 'Без ограничения количества публикаций за 30 дней', kg: '30 күндө жарыялардын саны чектелбейт', en: 'Unlimited posts for 30 days' },
      {
        ru: 'Только раздел «Театр и культура»: спектакли, концерты, сеансы, новости театра',
        kg: '«Театр жана маданият» бөлүмү гана: спектаклдер, концерттер, сеанстар, театрдын жаңылыктары',
        en: '"Theatre & culture" section only: performances, concerts, showtimes, theatre news',
      },
      { ru: 'Фото или афиша к каждому спектаклю', kg: 'Ар бир спектаклге сүрөт же афиша', en: 'Photo or poster for each performance' },
      MODERATED,
    ],
  },
  organizer: {
    name: { ru: 'Организатор', kg: 'Уюштуруучу', en: 'Organiser' },
    priceSom: 10000,
    periodDays: 30,
    postLimit: null,
    dailyLimit: 1,
    audience: { ru: 'Для организаторов концертов, фестивалей и выставок', kg: 'Концерт, фестиваль жана көргөзмө уюштуруучулары үчүн', en: 'For concert, festival and exhibition organisers' },
    features: [
      { ru: 'Без ограничения общего количества публикаций за 30 дней', kg: '30 күндө жарыялардын жалпы саны чектелбейт', en: 'No cap on the total number of posts in 30 days' },
      { ru: 'Не более 1 новой публикации в день (по времени Кыргызстана)', kg: 'Күнүнө 1ден ашпаган жаңы жарыя (Кыргызстан убактысы боюнча)', en: 'At most 1 new post per day (Kyrgyzstan time)' },
      { ru: 'После 30 дней тариф нужно продлить', kg: '30 күндөн кийин тарифти узартуу керек', en: 'Renew after 30 days' },
      MODERATED,
    ],
  },
  gov: {
    name: { ru: 'Муниципалитет / государственный орган', kg: 'Муниципалитет / мамлекеттик орган', en: 'Municipality / government body' },
    priceSom: 2000,
    periodDays: 30,
    postLimit: null,
    dailyLimit: null,
    govOnly: true,
    audience: {
      ru: 'Мэрии, айыл окмоту, министерства, госучреждения и Администрация Президента КР',
      kg: 'Мэриялар, айыл өкмөттөрү, министрликтер, мамлекеттик мекемелер жана КР Президентинин Администрациясы',
      en: 'City halls, local councils, ministries, state institutions and the Presidential Administration',
    },
    features: [
      { ru: 'Без ограничения количества публикаций за 30 дней', kg: '30 күндө жарыялардын саны чектелбейт', en: 'Unlimited posts for 30 days' },
      {
        ru: 'После подтверждения статуса — публикация без предварительной модерации',
        kg: 'Статус тастыкталгандан кийин — алдын ала модерациясыз жарыялоо',
        en: 'Once status is verified — posts go live without pre-moderation',
      },
      {
        ru: 'Организация сама отвечает за достоверность сведений',
        kg: 'Маалыматтын тактыгы үчүн уюм өзү жооп берет',
        en: 'The organisation is responsible for its information',
      },
      { ru: 'Требуется подтверждение официального статуса', kg: 'Расмий статусту тастыктоо талап кылынат', en: 'Official status verification required' },
    ],
  },
};

/** Старые id тарифов (до октября 2026) → новые */
export const normalizePlan = (p: unknown): PlanId => {
  if (p === 'start' || p === 'private' || p === 'culture' || p === 'organizer' || p === 'gov') return p;
  if (p === 'basic') return 'private';
  if (p === 'business') return 'organizer';
  return 'start';
};

/** «30 дней» / «30 күн» / «30 days» */
export const planPeriod = (days: number, lang: keyof LocalizedString) =>
  lang === 'kg' ? `${days} күн` : lang === 'en' ? `${days} days` : `${days} дней`;

const ruPosts = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? 'публикация' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'публикации' : 'публикаций';

/** «/ 30 дней» */
export const planUnit = (lang: keyof LocalizedString) => (lang === 'kg' ? '/ 30 күн' : lang === 'en' ? '/ 30 days' : '/ 30 дней');

/** Короткая строка «срок / лимит» для карточки тарифа */
export const planTerms = (id: PlanId, lang: keyof LocalizedString) => {
  const p = PLANS[id];
  const period = planPeriod(p.periodDays, lang);
  if (p.postLimit !== null) {
    const n = p.postLimit;
    return lang === 'kg' ? `${period}, ${n} жарыя` : lang === 'en' ? `${period}, ${n} posts` : `${period}, ${n} ${ruPosts(n)}`;
  }
  const daily = p.dailyLimit
    ? lang === 'kg' ? `, күнүнө ${p.dailyLimit}` : lang === 'en' ? `, ${p.dailyLimit} per day` : `, ${p.dailyLimit} в день`
    : '';
  const unl = lang === 'kg' ? 'чексиз' : lang === 'en' ? 'unlimited' : 'безлимитно';
  return `${period}, ${unl}${daily}`;
};

/**
 * РЕКВИЗИТЫ для оплаты регистрации (MBank / O!Деньги / Элсом / карта).
 * Пока строка пустая, гостю показывается «Администратор свяжется с вами и пришлёт реквизиты».
 * Пример: 'MBank: 0700 000 000 (получатель — Айида Т.)'
 */
export const PAYMENT_DETAILS = '';

/**
 * Фото / афиша автора до этого размера сохраняется как есть (оригинал, без перекодирования).
 * Больше — уменьшается технически с сохранением пропорций (без обрезки).
 */
export const ORIGINAL_MAX_BYTES = 650_000; // в base64 ≈ 890 КБ — укладывается в лимит запроса Upstash Free (1 МБ)

/** Максимальный размер загружаемого фото (после сжатия в браузере) */
export const MAX_IMAGE_BYTES = 450_000;
