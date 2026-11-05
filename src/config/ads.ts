import type { Language, LocalizedString } from '../types';

/**
 * Реклама DataNews — общая модель для сервера, сайта, панели администратора и тестов.
 *
 * Форматы (каталог; цены и описания администратор меняет в панели — здесь только начальные значения):
 *   A — «Главный баннер»: главная, между разделами;
 *   B — «Боковой баннер»: правая колонка главной и страницы новости (на узких экранах — между блоками);
 *   C — «Рекламная карточка»: в общей ленте между карточками, с изображением, заголовком, текстом и кнопкой;
 *   D — «Тематический баннер»: только в выбранном разделе.
 *   T — «Бегущая строка»: короткий текст в движущейся строке под шапкой (как на ТВ), несколько рекламодателей подряд.
 *   P — «Закреплённая новость»: платная публикация закреплена в блоке «Главное» на главной на выбранные дни.
 *
 * Кампания показывается на сайте, только если одновременно: статус «Активна», оплата подтверждена администратором
 * и сейчас (по Бишкеку) внутри оплаченного периода. Оплата не принимается сайтом — только ручное подтверждение.
 * Цена кампании фиксируется при создании: изменение цены в каталоге не меняет созданные и оплаченные заказы.
 */
export type AdFormatId = 'A' | 'B' | 'C' | 'D' | 'T' | 'P';
export const AD_FORMAT_IDS: AdFormatId[] = ['A', 'B', 'C', 'D', 'T', 'P'];
/** Форматы без изображения: бегущая строка (текст) и закреплённая новость (фото самой новости) */
export const NO_IMAGE_FORMATS: AdFormatId[] = ['T', 'P'];
export const TICKER_MAX = 120;

export interface AdSize {
  w: number;
  h: number;
}

export interface AdFormat {
  id: AdFormatId;
  name: LocalizedString;
  /** Короткая подпись карточки каталога */
  caption: LocalizedString;
  /** Где показывается */
  placement: LocalizedString;
  /** Преимущества — по одному на строку */
  benefits: LocalizedString;
  /** Рекомендуемый исходный размер для компьютера */
  desktop: AdSize;
  /** Рекомендуемый размер для телефона (null — то же изображение) */
  mobile: AdSize | null;
  /** Цена за период, сом (за 30 дней) */
  price: number;
  /** Показывать в каталоге цену за день (короткие размещения: бегущая строка, закрепление) */
  perDay?: boolean;
  periodDays: number;
  updatedAt?: string;
}

const L = (ru: string, kg: string, en: string): LocalizedString => ({ ru, kg, en });

/** Стартовые тарифы запуска DataNews (не обещание трафика). Администратор меняет их в панели «Реклама → Каталог». */
export const DEFAULT_AD_FORMATS: Record<AdFormatId, AdFormat> = {
  A: {
    id: 'A',
    name: L('Главный баннер', 'Башкы баннер', 'Main banner'),
    caption: L(
      'Заметное размещение на главной странице для продвижения бренда, продукта или мероприятия',
      'Бренд, продукт же иш-чара үчүн башкы беттеги көрүнүктүү жайгаштыруу',
      'A prominent spot on the home page to promote a brand, product or event'
    ),
    placement: L(
      'Главная страница, между основными информационными блоками. Не перекрывает меню, заголовки и карточки новостей.',
      'Башкы бет, негизги маалымат блокторунун ортосунда. Менюну, аталыштарды жана жаңылык карточкаларын жаппайт.',
      'Home page, between the main content blocks. Never covers the menu, headlines or story cards.'
    ),
    benefits: L(
      'Первое, что видит читатель после главных новостей\nОтдельная картинка для телефона\nМетка «Реклама»',
      'Окурман башкы жаңылыктардан кийин биринчи көрөт\nТелефон үчүн өзүнчө сүрөт\n«Жарнама» белгиси',
      'Seen right after the top stories\nSeparate image for phones\n“Advertisement” label'
    ),
    desktop: { w: 1200, h: 300 },
    mobile: { w: 750, h: 300 },
    price: 10000,
    periodDays: 30,
  },
  B: {
    id: 'B',
    name: L('Боковой баннер', 'Капталдагы баннер', 'Side banner'),
    caption: L('Реклама рядом с новостями и актуальными материалами', 'Жаңылыктардын жана актуалдуу материалдардын жанындагы жарнама', 'Advertising next to news and the latest stories'),
    placement: L(
      'Правая колонка главной страницы и страница отдельной новости рядом с блоком «Актуальные новости». На узких экранах — между блоками, без обрезки.',
      'Башкы беттин оң мамычасы жана «Актуалдуу жаңылыктар» блогунун жанындагы жаңылык бети. Тар экрандарда — блоктордун ортосунда, кесилбейт.',
      'Right column of the home page and of each story page, next to “Latest news”. On narrow screens it moves between blocks, uncropped.'
    ),
    benefits: L(
      'Виден на главной и на каждой странице новости\nНа телефоне — отдельная широкая картинка\nМетка «Реклама»',
      'Башкы бетте жана ар бир жаңылык бетинде көрүнөт\nТелефондо — өзүнчө кең сүрөт\n«Жарнама» белгиси',
      'Shown on the home page and every story page\nSeparate wide image on phones\n“Advertisement” label'
    ),
    // 300×400 в двойном размере — чётко на экранах высокой плотности (колонка новости — 320 px)
    desktop: { w: 600, h: 800 },
    mobile: { w: 750, h: 300 },
    price: 5000,
    periodDays: 30,
  },
  C: {
    id: 'C',
    name: L('Рекламная карточка', 'Жарнамалык карточка', 'Sponsored card'),
    caption: L('Рекламная карточка в новостной ленте с отдельной маркировкой', 'Жаңылыктар тасмасындагы өзүнчө белгиленген жарнамалык карточка', 'A sponsored card in the news feed with its own label'),
    placement: L(
      'Общая лента публикаций на главной — между обычными карточками: первая после 4-го материала, дальше не чаще одной на 8.',
      'Башкы беттеги жалпы тасма — кадимки карточкалардын ортосунда, 8 материалга бирден көп эмес.',
      'The main feed on the home page — between regular cards, at most one per 8 stories.'
    ),
    benefits: L(
      'Изображение, заголовок, короткий текст и кнопка\nВ потоке, который читают целиком\nМетка «Реклама», не выдаётся за новость',
      'Сүрөт, аталыш, кыска текст жана баскыч\nТолугу менен окулган тасмада\n«Жарнама» белгиси, жаңылык катары көрсөтүлбөйт',
      'Image, headline, short text and a button\nInside the feed people read in full\n“Advertisement” label, never passed off as news'
    ),
    desktop: { w: 1200, h: 675 },
    mobile: null,
    price: 4000,
    periodDays: 30,
  },
  D: {
    id: 'D',
    name: L('Тематический баннер', 'Тематикалык баннер', 'Section banner'),
    caption: L('Продвижение среди читателей выбранной тематики', 'Тандалган теманын окурмандарына жылдыруу', 'Reach readers of the section you choose'),
    placement: L(
      'Над списком материалов одного выбранного раздела (например, «ИИ и IT-технологии» или «Спорт»). В других разделах не показывается.',
      'Бир тандалган бөлүмдүн материалдар тизмесинин үстүндө (мисалы, «Жасалма интеллект жана IT-технологиялар» же «Спорт»). Башка бөлүмдөрдө көрсөтүлбөйт.',
      'Above the list of one chosen section (e.g. “AI & IT Technologies” or “Sport”). Not shown in other sections.'
    ),
    benefits: L(
      'Только читатели нужной темы\nОтдельная картинка для телефона\nМетка «Реклама»',
      'Керектүү теманын окурмандары гана\nТелефон үчүн өзүнчө сүрөт\n«Жарнама» белгиси',
      'Only readers of that topic\nSeparate image for phones\n“Advertisement” label'
    ),
    desktop: { w: 1200, h: 300 },
    mobile: { w: 750, h: 300 },
    price: 3000,
    periodDays: 30,
  },
  T: {
    id: 'T',
    name: L('Бегущая строка', 'Жүгүрмө сап', 'News ticker'),
    caption: L(
      'Короткое объявление в движущейся строке под шапкой сайта — как на телевидении',
      'Сайттын башындагы жылып турган саптагы кыска жарыя — телевидениедегидей',
      'A short message in the moving line under the site header — like on TV'
    ),
    placement: L(
      'Узкая движущаяся строка сразу под шапкой — на всех страницах сайта. В строке идут подряд несколько рекламодателей; при наведении строка останавливается.',
      'Шапканын астындагы ичке жылып турган сап — сайттын бардык беттеринде. Бир нече жарнама берүүчү катары менен өтөт; курсор менен токтойт.',
      'A narrow moving line right under the header — on every page. Several advertisers run one after another; it pauses on hover.'
    ),
    benefits: L(
      'Виден на каждой странице сайта\nТекст до 120 знаков и ссылка\nМетка «Реклама»',
      'Сайттын ар бир бетинде көрүнөт\n120 белгиге чейинки текст жана шилтеме\n«Жарнама» белгиси',
      'Visible on every page\nUp to 120 characters and a link\n“Advertisement” label'
    ),
    desktop: { w: 0, h: 0 },
    mobile: null,
    price: 9000,
    perDay: true,
    periodDays: 30,
  },
  P: {
    id: 'P',
    name: L('Закреплённая новость', 'Бекитилген жаңылык', 'Pinned story'),
    caption: L(
      'Ваша новость закреплена в блоке «Главное» на главной странице на выбранные дни',
      'Сиздин жаңылык башкы беттеги «Башкы жаңылыктар» блогунда тандалган күндөргө бекитилет',
      'Your story is pinned in “Top stories” on the home page for the days you choose'
    ),
    placement: L(
      'Главная страница, блок «Главное» — одно из двух мест рядом с главной новостью. С пометкой «Партнёрский материал».',
      'Башкы бет, «Башкы жаңылыктар» блогу — башкы жаңылыктын жанындагы эки орундун бири. «Өнөктөштүк материал» белгиси менен.',
      'Home page, “Top stories” — one of the two spots next to the lead story. Marked “Partner content”.'
    ),
    benefits: L(
      'Самое видное место сайта\nФото и заголовок вашей новости\nМетка «Партнёрский материал»',
      'Сайттын эң көрүнүктүү орду\nЖаңылыгыңыздын сүрөтү жана аталышы\n«Өнөктөштүк материал» белгиси',
      'The most visible spot on the site\nYour story’s photo and headline\n“Partner content” label'
    ),
    desktop: { w: 0, h: 0 },
    mobile: null,
    price: 30000,
    perDay: true,
    periodDays: 30,
  },
};

export type AdCampaignStatus = 'draft' | 'awaiting_payment' | 'active' | 'paused' | 'completed';
export type AdPaymentStatus = 'unpaid' | 'pending' | 'confirmed';

export const AD_STATUS_LABEL: Record<AdCampaignStatus, string> = {
  draft: 'Черновик',
  awaiting_payment: 'Ожидает оплаты',
  active: 'Активна',
  paused: 'Приостановлена',
  completed: 'Завершена',
};
export const AD_PAYMENT_LABEL: Record<AdPaymentStatus, string> = {
  unpaid: 'Не оплачено',
  pending: 'Ожидает подтверждения',
  confirmed: 'Оплата подтверждена',
};

export interface AdCampaign {
  id: string;
  name: string;
  advertiser: string;
  contact: string;
  format: AdFormatId;
  /** Раздел для формата D (id рубрики) */
  rubric?: string;
  /** Подпись: 'ad' — «Реклама», 'partner' — «Партнёрский материал» */
  label: 'ad' | 'partner';
  imageDesktop: string;
  imageMobile?: string;
  /** Фактические размеры загруженных изображений (для пропорций места без скачка макета) */
  imageDesktopSize?: AdSize;
  imageMobileSize?: AdSize;
  alt: string;
  href: string;
  /** Для карточки C; text — также текст бегущей строки T */
  title?: string;
  text?: string;
  cta?: string;
  /** Закреплённая новость P: id публикации */
  annId?: string;
  /** Начало и окончание по Бишкеку, 'YYYY-MM-DDTHH:mm' */
  start: string;
  end: string;
  /** Срок: в днях или в месяцах (1 месяц = 30 дней) и сколько; days — итого дней */
  unit?: DurationUnit;
  amount?: number;
  days?: number;
  /** Число месяцев (старые кампании — только месяцы); у кампаний «в днях» — округлённо вверх */
  periods: number;
  priority: number;
  /** Цена на момент создания (сом за период) и итог — не меняются при смене цены в каталоге */
  pricePerPeriod: number;
  total: number;
  payment: { status: AdPaymentStatus; ref?: string; confirmedAt?: string; note?: string };
  status: AdCampaignStatus;
  createdAt: string;
  updatedAt: string;
  history: { at: string; action: string; note?: string }[];
}

/** То, что видит посетитель сайта: без контакта, оплаты и истории */
export interface LiveAd {
  id: string;
  format: AdFormatId;
  rubric?: string;
  label: 'ad' | 'partner';
  advertiser: string;
  imageDesktop: string;
  imageMobile?: string;
  imageDesktopSize?: AdSize;
  imageMobileSize?: AdSize;
  alt: string;
  title?: string;
  text?: string;
  cta?: string;
  /** Закреплённая новость P */
  annId?: string;
  priority: number;
  start: string;
}

/** Цена за день для форматов с перDay (округление до сома) */
export const pricePerDay = (f: Pick<AdFormat, 'price' | 'periodDays'>) => Math.round(f.price / (f.periodDays || 30));

/** 'YYYY-MM-DDTHH:mm' (Бишкек) + дни */
export const addDaysLocal = (local: string, days: number) => {
  const ms = Date.parse(`${local.slice(0, 16)}:00Z`) + days * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 16);
};
export type DurationUnit = 'days' | 'months';
/** Пределы срока: от 1 до 365 дней или от 1 до 12 месяцев */
export const DURATION_LIMITS: Record<DurationUnit, { min: number; max: number }> = { days: { min: 1, max: 365 }, months: { min: 1, max: 12 } };
export const clampAmount = (unit: DurationUnit, n: unknown) => {
  const { min, max } = DURATION_LIMITS[unit];
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
};
/** Итого дней: дни как есть, месяцы × 30 */
export const durationDays = (unit: DurationUnit, amount: number, periodDays = 30) => (unit === 'days' ? amount : amount * periodDays);
/**
 * Стоимость срока: месяцы — цена за 30 дней × месяцы; дни — цена за 30 дней ÷ 30 × дни (до целого сома).
 * Цена за 30 дней берётся из каталога на момент создания кампании.
 */
export const durationPrice = (pricePer30: number, unit: DurationUnit, amount: number, periodDays = 30) =>
  unit === 'months' ? pricePer30 * amount : Math.round((pricePer30 * amount) / periodDays);
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
/** «10 дней», «1 месяц (30 дней)», «2 месяца (60 дней)» */
export const durationText = (unit: DurationUnit, amount: number, periodDays = 30) =>
  unit === 'days'
    ? `${amount} ${plural(amount, 'день', 'дня', 'дней')}`
    : `${amount} ${plural(amount, 'месяц', 'месяца', 'месяцев')} (${amount * periodDays} ${plural(amount * periodDays, 'день', 'дня', 'дней')})`;

/** Окончание: начало + 30 дней × число периодов */
export const campaignEnd = (start: string, periods: number, periodDays = 30) => addDaysLocal(start, periodDays * Math.max(1, Math.floor(periods)));

/** Статус с учётом даты: активная или приостановленная после окончания периода — завершена */
export const effectiveStatus = (c: Pick<AdCampaign, 'status' | 'end'>, nowLocal: string): AdCampaignStatus =>
  (c.status === 'active' || c.status === 'paused') && nowLocal >= c.end ? 'completed' : c.status;

/** Показывается ли сейчас: «Активна» + оплата подтверждена + внутри оплаченного периода */
export const isLive = (c: Pick<AdCampaign, 'status' | 'payment' | 'start' | 'end'>, nowLocal: string) =>
  c.status === 'active' && c.payment.status === 'confirmed' && c.start <= nowLocal && nowLocal < c.end;

/** Порядок на одном месте: приоритет, затем кто раньше начал, затем id — без случайностей и без дублей */
export const byPriority = (a: Pick<LiveAd, 'priority' | 'start' | 'id'>, b: Pick<LiveAd, 'priority' | 'start' | 'id'>) =>
  b.priority - a.priority || a.start.localeCompare(b.start) || a.id.localeCompare(b.id);

/** Одна кампания для места (A, B, D-раздела) — с наибольшим приоритетом */
export const pickAd = (ads: LiveAd[], format: AdFormatId, rubric?: string): LiveAd | null =>
  ads.filter((a) => a.format === format && (format !== 'D' || a.rubric === rubric)).sort(byPriority)[0] || null;

/**
 * Карточки C в ленте: каждая кампания — один раз; первая — после 4-го материала (лента сначала показывает 6),
 * следующие — через каждые `every` материалов (не чаще одной на 8).
 */
export const FEED_AD_EVERY = 8;
export const FEED_AD_FIRST = 4;
export const feedAdPositions = (feedLength: number, adsCount: number, every = FEED_AD_EVERY, first = FEED_AD_FIRST) => {
  const out: number[] = [];
  for (let pos = first; pos <= feedLength && out.length < adsCount; pos += every) out.push(pos);
  return out;
};

/** Подпись рекламы на трёх языках */
export const AD_LABEL: Record<'ad' | 'partner', Record<Language, string>> = {
  ad: { ru: 'Реклама', kg: 'Жарнама', en: 'Advertisement' },
  partner: { ru: 'Партнёрский материал', kg: 'Өнөктөштүк материал', en: 'Partner content' },
};

/** Проверка пропорций изображения: допуск ±8% от рекомендуемой */
export const ratioOk = (w: number, h: number, want: AdSize, tolerance = 0.08) => {
  if (!w || !h) return false;
  const r = w / h;
  const t = want.w / want.h;
  return Math.abs(r - t) / t <= tolerance;
};

/** Цена в сомах: «10 000 сомов» */
export const formatSom = (n: number, lang: Language = 'ru') =>
  `${n.toLocaleString('ru-RU').replace(/[\s\u202f]/g, '\u00a0')}\u00a0${lang === 'kg' ? 'сом' : lang === 'en' ? 'KGS' : 'сомов'}`;
