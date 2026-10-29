import type { Language, LocalizedString } from '../types';

/**
 * Реклама DataNews — общая модель для сервера, сайта, панели администратора и тестов.
 *
 * Форматы (каталог; цены и описания администратор меняет в панели — здесь только начальные значения):
 *   A — «Главный баннер»: главная, между разделами;
 *   B — «Боковой баннер»: правая колонка главной и страницы новости (на узких экранах — между блоками);
 *   C — «Рекламная карточка»: в общей ленте между карточками, с изображением, заголовком, текстом и кнопкой;
 *   D — «Тематический баннер»: только в выбранном разделе.
 *
 * Кампания показывается на сайте, только если одновременно: статус «Активна», оплата подтверждена администратором
 * и сейчас (по Бишкеку) внутри оплаченного периода. Оплата не принимается сайтом — только ручное подтверждение.
 * Цена кампании фиксируется при создании: изменение цены в каталоге не меняет созданные и оплаченные заказы.
 */
export type AdFormatId = 'A' | 'B' | 'C' | 'D';
export const AD_FORMAT_IDS: AdFormatId[] = ['A', 'B', 'C', 'D'];

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
  /** Цена за период, сом */
  price: number;
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
  /** Для карточки C */
  title?: string;
  text?: string;
  cta?: string;
  /** Начало и окончание по Бишкеку, 'YYYY-MM-DDTHH:mm' */
  start: string;
  end: string;
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
  priority: number;
  start: string;
}

/** 'YYYY-MM-DDTHH:mm' (Бишкек) + дни */
export const addDaysLocal = (local: string, days: number) => {
  const ms = Date.parse(`${local.slice(0, 16)}:00Z`) + days * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 16);
};
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
  `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ${lang === 'kg' ? 'сом' : lang === 'en' ? 'KGS' : 'сомов'}`;
