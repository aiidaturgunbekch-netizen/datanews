import React, { useEffect, useRef } from 'react';
import type { Language } from '../types';
import { AD_LABEL, byPriority, LiveAd } from '../config/ads';
import { adClickUrl, observeAdView, useLiveAds } from '../services/ads';

/** Один текст строки: переход через сайт (клик засчитывается), показ — когда текст виден на экране */
const Item: React.FC<{ ad: LiveAd; track: boolean }> = ({ ad, track }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => (track && ref.current ? observeAdView(ref.current, ad.id) : undefined), [ad.id, track]);
  return (
    <a
      ref={ref}
      href={adClickUrl(ad.id)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 font-semibold text-white hover:underline underline-offset-2 whitespace-nowrap"
      tabIndex={track ? 0 : -1}
    >
      <span className="text-[#20C7B5]" aria-hidden="true">
        ◆
      </span>
      {ad.text}
      <span className="font-normal text-white/60">· {ad.advertiser}</span>
    </a>
  );
};

/**
 * Рекламная бегущая строка (формат T) — под шапкой на всех страницах, как на телевидении: тексты рекламодателей
 * идут подряд и непрерывно. Останавливается при наведении и фокусе; при «уменьшить движение» не двигается
 * (тексты можно прокрутить вбок). Нет идущих кампаний — строки нет совсем.
 */
export const AdTicker: React.FC<{ lang: Language }> = ({ lang }) => {
  const ads = useLiveAds()
    .filter((a) => a.format === 'T' && a.text)
    .sort(byPriority);
  if (!ads.length) return null;
  // Скорость не зависит от количества текстов: ~ 90 px в секунду
  const len = ads.reduce((n, a) => n + (a.text || '').length + a.advertiser.length + 8, 0);
  const seconds = Math.max(18, Math.round((len * 8) / 90));
  return (
    <aside aria-label={AD_LABEL.ad[lang]} data-ad="T" className="w-full bg-[#0d2459] text-sm border-b border-white/10">
      <div className="flex items-stretch">
        <span className="shrink-0 flex items-center px-3 bg-[#20C7B5] text-[#0d2459] text-[10.5px] font-extrabold uppercase tracking-wider">
          {AD_LABEL.ad[lang]}
        </span>
        <div className="dn-ticker relative flex-1 overflow-hidden py-2">
          <div className="dn-ticker-track inline-flex" style={{ animationDuration: `${seconds}s` }}>
            {/* Два одинаковых ряда подряд — строка идёт без разрыва */}
            <span className="inline-flex">{ads.map((a) => <Item key={a.id} ad={a} track />)}</span>
            <span className="inline-flex" aria-hidden="true">
              {ads.map((a) => (
                <Item key={a.id} ad={a} track={false} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
