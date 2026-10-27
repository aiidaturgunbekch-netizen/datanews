/**
 * Рекламные места главной — точка расширения без работающей рекламной системы.
 *
 * Сейчас список ПУСТ: реклама показывается только по реальным договорам и материалам рекламодателя.
 * Пока места пустые, на сайте их нет совсем (без пустых прямоугольников и без скачков макета).
 * Оплата, управление кампаниями и статистика показов не реализованы — здесь их не имитируем.
 *
 * Форматы:
 *  - 'wide' (A) — большой горизонтальный баннер между разделами главной:
 *      компьютер 1200×200 (6:1), телефон — отдельная картинка 600×300 (2:1), если есть, иначе та же 6:1;
 *  - 'side' (B) — компактный боковой баннер в правой колонке: 300×250 (6:5);
 *      на телефоне и планшете переносится под ленту (полная ширина, до 360 px).
 */
export type AdSlotId = 'wide' | 'side';

export interface AdCreative {
  id: string;
  slot: AdSlotId;
  /** Название рекламодателя — для подписи «Реклама · …» */
  advertiser: string;
  /** Подпись: 'ad' — «Реклама», 'partner' — «Партнёр» */
  label: 'ad' | 'partner';
  imageUrl: string;
  /** Отдельная картинка для телефона (только 'wide') */
  mobileImageUrl?: string;
  alt: string;
  href: string;
  /** Период кампании, YYYY-MM-DD (время Бишкека) */
  start: string;
  end: string;
  status: 'active' | 'paused';
  /** Чем больше, тем выше, если на одно место несколько кампаний */
  priority: number;
}

export const ADS: AdCreative[] = [];

/** Кампания, идущая сейчас, для места (одна — с наибольшим приоритетом) */
export const activeAd = (slot: AdSlotId, today: string, list: AdCreative[] = ADS): AdCreative | null =>
  list
    .filter((a) => a.slot === slot && a.status === 'active' && a.start <= today && today <= a.end && a.imageUrl && a.href)
    .sort((a, b) => b.priority - a.priority)[0] || null;
