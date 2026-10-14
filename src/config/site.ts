import { LocalizedString, PlanId } from '../types';

/**
 * Тарифы платной регистрации.
 * ЦЕНЫ меняются в поле `priceSom`, названия и описания — в `name` / `features`.
 * Ограничения (`kind`, `periodDays`, `postLimit`, `dailyLimit`) проверяет СЕРВЕР (api/_lib/quota.ts),
 * а не только интерфейс: обновление страницы или повторная отправка их не обходят.
 *
 *  - kind 'period' — доступ на `periodDays` дней с момента подтверждения оплаты;
 *  - kind 'pack'   — пакет из `postLimit` публикаций (без ограничения по сроку), после исчерпания нужна новая оплата;
 *  - dailyLimit    — не более N новых публикаций за календарный день по времени Кыргызстана (UTC+6).
 */
export interface PlanConfig {
  name: LocalizedString;
  priceSom: number;
  kind: 'period' | 'pack';
  periodDays: number | null;
  postLimit: number | null;
  dailyLimit: number | null;
  /** «/ 30 дней», «/ месяц», «за пакет» */
  priceUnit: LocalizedString;
  /** Для кого тариф */
  audience: LocalizedString;
  features: LocalizedString[];
}

export const PLAN_IDS: PlanId[] = ['start', 'private', 'organizer', 'gov'];

export const PLANS: Record<PlanId, PlanConfig> = {
  start: {
    name: { ru: 'Старт', kg: 'Старт', en: 'Start' },
    priceSom: 2000,
    kind: 'pack',
    periodDays: null,
    postLimit: 3,
    dailyLimit: null,
    priceUnit: { ru: 'за пакет', kg: 'топтом үчүн', en: 'per pack' },
    audience: { ru: 'Для разового объявления', kg: 'Бир жолку жарыя үчүн', en: 'For a one-off announcement' },
    features: [
      { ru: 'До 3 публикаций', kg: '3 жарыяга чейин', en: 'Up to 3 posts' },
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      { ru: 'Каждая публикация проходит модерацию', kg: 'Ар бир жарыя модерациядан өтөт', en: 'Every post is moderated' },
    ],
  },
  private: {
    name: { ru: 'Частный', kg: 'Жеке', en: 'Private' },
    priceSom: 5000,
    kind: 'pack',
    periodDays: null,
    postLimit: 8,
    dailyLimit: null,
    priceUnit: { ru: 'за пакет', kg: 'топтом үчүн', en: 'per pack' },
    audience: { ru: 'Для частных лиц и небольших мероприятий', kg: 'Жеке адамдар жана чакан иш-чаралар үчүн', en: 'For individuals and small events' },
    features: [
      { ru: 'До 8 публикаций', kg: '8 жарыяга чейин', en: 'Up to 8 posts' },
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      { ru: 'Каждая публикация проходит модерацию', kg: 'Ар бир жарыя модерациядан өтөт', en: 'Every post is moderated' },
    ],
  },
  organizer: {
    name: { ru: 'Организатор', kg: 'Уюштуруучу', en: 'Organiser' },
    priceSom: 10000,
    kind: 'period',
    periodDays: 30,
    postLimit: null,
    dailyLimit: 1,
    priceUnit: { ru: '/ 30 дней', kg: '/ 30 күн', en: '/ 30 days' },
    audience: { ru: 'Для организаторов концертов, фестивалей и выставок', kg: 'Концерт, фестиваль жана көргөзмө уюштуруучулары үчүн', en: 'For concert, festival and exhibition organisers' },
    features: [
      { ru: 'Срок действия — 30 дней', kg: 'Мөөнөтү — 30 күн', en: 'Valid for 30 days' },
      { ru: 'Без ограничения общего количества публикаций', kg: 'Жарыялардын жалпы саны чектелбейт', en: 'No cap on the total number of posts' },
      { ru: 'Не более 1 новой публикации в день (по времени Кыргызстана)', kg: 'Күнүнө 1ден ашпаган жаңы жарыя (Кыргызстан убактысы боюнча)', en: 'At most 1 new post per day (Kyrgyzstan time)' },
      { ru: 'Каждая публикация проходит модерацию', kg: 'Ар бир жарыя модерациядан өтөт', en: 'Every post is moderated' },
    ],
  },
  gov: {
    name: { ru: 'Муниципалитет / государственный орган', kg: 'Муниципалитет / мамлекеттик орган', en: 'Municipality / government body' },
    priceSom: 2000,
    kind: 'period',
    periodDays: 30,
    postLimit: null,
    dailyLimit: null,
    priceUnit: { ru: '/ месяц', kg: '/ ай', en: '/ month' },
    audience: {
      ru: 'Мэрии, айыл окмоту, министерства, госслужбы и Администрация Президента',
      kg: 'Мэриялар, айыл өкмөттөрү, министрликтер, мамлекеттик кызматтар жана Президенттин Администрациясы',
      en: 'City halls, local councils, ministries, state services and the Presidential Administration',
    },
    features: [
      { ru: 'Срок действия — 30 дней', kg: 'Мөөнөтү — 30 күн', en: 'Valid for 30 days' },
      { ru: 'Без ограничения количества публикаций', kg: 'Жарыялардын саны чектелбейт', en: 'Unlimited posts' },
      { ru: 'Предупреждения: вода, свет, дороги, ремонт', kg: 'Эскертүүлөр: суу, жарык, жолдор, оңдоо', en: 'Alerts: water, power, roads, repairs' },
      { ru: 'Каждая публикация проходит модерацию', kg: 'Ар бир жарыя модерациядан өтөт', en: 'Every post is moderated' },
    ],
  },
};

/** Старые id тарифов (до октября 2026) → новые */
export const normalizePlan = (p: unknown): PlanId => {
  if (p === 'start' || p === 'private' || p === 'organizer' || p === 'gov') return p;
  if (p === 'basic') return 'private';
  if (p === 'business') return 'organizer';
  return 'start';
};

/** «30 дней» / «30 күн» / «30 days» */
export const planPeriod = (days: number, lang: keyof LocalizedString) =>
  lang === 'kg' ? `${days} күн` : lang === 'en' ? `${days} days` : `${days} дней`;

const ruPosts = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? 'публикация' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'публикации' : 'публикаций';

/** Короткая строка «срок / лимит» для карточки тарифа */
export const planTerms = (id: PlanId, lang: keyof LocalizedString) => {
  const p = PLANS[id];
  if (p.kind === 'pack') {
    return lang === 'kg' ? `${p.postLimit} жарыя, мөөнөтсүз` : lang === 'en' ? `${p.postLimit} posts, no expiry` : `${p.postLimit} ${ruPosts(p.postLimit!)}, без срока`;
  }
  const daily = p.dailyLimit
    ? lang === 'kg' ? `, күнүнө ${p.dailyLimit}` : lang === 'en' ? `, ${p.dailyLimit} per day` : `, ${p.dailyLimit} в день`
    : '';
  const unl = lang === 'kg' ? 'чексиз' : lang === 'en' ? 'unlimited' : 'безлимитно';
  return `${planPeriod(p.periodDays!, lang)}, ${unl}${daily}`;
};

/**
 * РЕКВИЗИТЫ для оплаты регистрации (MBank / O!Деньги / Элсом / карта).
 * Пока строка пустая, гостю показывается «Администратор свяжется с вами и пришлёт реквизиты».
 * Пример: 'MBank: 0700 000 000 (получатель — Айида Т.)'
 */
export const PAYMENT_DETAILS = '';

/** Максимальный размер загружаемого фото (после сжатия в браузере) */
export const MAX_IMAGE_BYTES = 450_000;
