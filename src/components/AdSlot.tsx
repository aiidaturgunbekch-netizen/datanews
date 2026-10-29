import React, { useEffect, useRef } from 'react';
import type { Language } from '../types';
import { AD_LABEL, AdFormatId, DEFAULT_AD_FORMATS, LiveAd, pickAd } from '../config/ads';
import { adClickUrl, observeAdView, useLiveAds } from '../services/ads';

/** Подпись над рекламой: «Реклама · рекламодатель» */
const AdCaption: React.FC<{ ad: LiveAd; lang: Language }> = ({ ad, lang }) => (
  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-meta mb-1.5">
    {AD_LABEL[ad.label][lang]} · <span className="normal-case tracking-normal">{ad.advertiser}</span>
  </p>
);

/** Засчитать показ, когда баннер действительно появился на экране (один раз за открытие страницы) */
const useViewTracking = (id: string) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => (ref.current ? observeAdView(ref.current, id) : undefined), [id]);
  return ref;
};

const ratio = (s: { w: number; h: number }) => `${s.w} / ${s.h}`;

/**
 * Баннер A, B или D. Пропорции места заданы заранее (без скачка макета); изображение вписывается целиком,
 * без обрезки и растягивания. На телефоне — отдельная картинка, если она загружена.
 * Переход — через сайт (клик засчитывается), ссылка помечена как рекламная (rel="sponsored").
 */
export const AdBanner: React.FC<{ ad: LiveAd; lang: Language; className?: string }> = ({ ad, lang, className = '' }) => {
  const ref = useViewTracking(ad.id);
  const f = DEFAULT_AD_FORMATS[ad.format];
  const desk = ad.imageDesktopSize || f.desktop;
  const mob = ad.imageMobile ? ad.imageMobileSize || f.mobile || desk : null;
  // боковой баннер без картинки для телефона — на узком экране не шире 320 px (вертикальный, не растягивается)
  const narrow = ad.format === 'B' && !mob;
  return (
    <aside ref={ref} aria-label={`${AD_LABEL[ad.label][lang]}: ${ad.advertiser}`} data-ad={ad.format} className={className}>
      <AdCaption ad={ad} lang={lang} />
      <a
        href={adClickUrl(ad.id)}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={`block overflow-hidden rounded-xl border border-line bg-wash ${narrow ? 'max-w-[320px] mx-auto lg:max-w-none' : ''}`}
      >
        {mob && <img src={ad.imageMobile} alt={ad.alt} loading="lazy" className="block lg:hidden w-full h-auto object-contain" style={{ aspectRatio: ratio(mob) }} />}
        <img
          src={ad.imageDesktop}
          alt={ad.alt}
          loading="lazy"
          className={`${mob ? 'hidden lg:block' : 'block'} w-full h-auto object-contain`}
          style={{ aspectRatio: ratio(desk) }}
        />
      </a>
    </aside>
  );
};

/** Место A, B или D: показывается, только если для него есть идущая кампания (иначе — ничего, без пустых рамок) */
export const AdSlot: React.FC<{ format: Exclude<AdFormatId, 'C'>; lang: Language; rubric?: string; className?: string }> = ({ format, lang, rubric, className = '' }) => {
  const ads = useLiveAds();
  const ad = pickAd(ads, format, rubric);
  if (!ad) return null;
  return <AdBanner ad={ad} lang={lang} className={className} />;
};

/**
 * Рекламная карточка C в ленте: изображение, заголовок, короткий текст и кнопка. Своя рамка и метка «Реклама» —
 * не выдаётся за новость.
 */
export const AdFeedCard: React.FC<{ ad: LiveAd; lang: Language; className?: string }> = ({ ad, lang, className = '' }) => {
  const ref = useViewTracking(ad.id);
  const go = { ru: 'Подробнее', kg: 'Толугураак', en: 'Learn more' };
  return (
    <aside ref={ref} aria-label={`${AD_LABEL[ad.label][lang]}: ${ad.advertiser}`} data-ad="C" className={`rounded-2xl border-2 border-partner/30 bg-partner-wash p-3 sm:p-4 ${className}`}>
      <AdCaption ad={ad} lang={lang} />
      <a href={adClickUrl(ad.id)} target="_blank" rel="sponsored noopener noreferrer" className="group flex flex-col sm:flex-row gap-3 sm:gap-4">
        <img
          src={ad.imageDesktop}
          alt={ad.alt}
          loading="lazy"
          className="block w-full sm:w-56 shrink-0 rounded-xl object-contain bg-white"
          style={{ aspectRatio: '16 / 9' }}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[17px] leading-snug text-ink group-hover:underline underline-offset-2">{ad.title}</span>
          {ad.text && <span className="block mt-1 text-sm text-ink-soft">{ad.text}</span>}
          <span className="inline-flex mt-3 items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-partner/30 text-sm font-bold text-partner">
            {ad.cta || go[lang]}
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              open_in_new
            </span>
          </span>
        </span>
      </a>
    </aside>
  );
};
