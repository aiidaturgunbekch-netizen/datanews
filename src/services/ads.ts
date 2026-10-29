import { useEffect, useState } from 'react';
import type { AdFormat, AdFormatId, LiveAd } from '../config/ads';

/**
 * Реклама на сайте: список идущих кампаний (решает сервер — активна, оплата подтверждена, внутри периода),
 * учёт показов (один раз за открытие страницы, когда баннер действительно появился на экране) и адрес перехода.
 */
let livePromise: Promise<LiveAd[]> | null = null;
export const fetchLiveAds = (): Promise<LiveAd[]> => {
  if (!livePromise) {
    livePromise = fetch('/api/track?ads=1')
      .then((r) => (r.ok ? r.json() : { ads: [] }))
      .then((d: { ads?: LiveAd[] }) => (Array.isArray(d.ads) ? d.ads : []))
      .catch(() => []);
  }
  return livePromise;
};

/** Идущие кампании; пока список не пришёл или кампаний нет — пустой список (рекламных блоков нет) */
export const useLiveAds = (): LiveAd[] => {
  const [ads, setAds] = useState<LiveAd[]>([]);
  useEffect(() => {
    let alive = true;
    fetchLiveAds().then((a) => alive && setAds(a));
    return () => {
      alive = false;
    };
  }, []);
  return ads;
};

let formatsPromise: Promise<Record<AdFormatId, AdFormat> | null> | null = null;
/** Каталог форматов и цен для страницы «Реклама» */
export const fetchAdFormats = () => {
  if (!formatsPromise) {
    formatsPromise = fetch('/api/track?adformats=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { formats?: Record<AdFormatId, AdFormat> } | null) => d?.formats || null)
      .catch(() => null);
  }
  return formatsPromise;
};

/** Показы, уже отправленные за это открытие страницы (повторная отрисовка не считается) */
const viewed = new Set<string>();
export const trackAdView = (id: string) => {
  if (viewed.has(id)) return;
  viewed.add(id);
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adView: id }), keepalive: true }).catch(() => {});
};
/** Для тестов */
export const _resetViewed = () => viewed.clear();

/** Переход по рекламе — через сайт (клик засчитывается), затем на сайт рекламодателя */
export const adClickUrl = (id: string) => `/api/track?ad=${encodeURIComponent(id)}&go=1`;

/**
 * Наблюдение за появлением баннера: показ засчитывается, когда видно не меньше половины баннера не меньше секунды.
 * Возвращает функцию отключения.
 */
export const observeAdView = (el: Element, id: string, onSeen: (id: string) => void = trackAdView) => {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5);
      if (visible && !timer) {
        timer = setTimeout(() => {
          onSeen(id);
          io.disconnect();
        }, 1000);
      } else if (!visible && timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    { threshold: [0, 0.5, 1] }
  );
  io.observe(el);
  return () => {
    if (timer) clearTimeout(timer);
    io.disconnect();
  };
};
