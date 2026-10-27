import React from 'react';
import type { Language } from '../types';
import { activeAd, AdSlotId } from '../config/ads';
import { kgDateStr } from '../utils/time';

const LABEL = {
  ad: { ru: 'Реклама', kg: 'Жарнама', en: 'Advertisement' },
  partner: { ru: 'Партнёр', kg: 'Өнөктөш', en: 'Partner' },
};

/**
 * Рекламное место. Нет действующей кампании — ничего не выводится (нет пустых рамок и скачков макета).
 * Есть — баннер с постоянной пропорцией (место резервируется до загрузки) и явной подписью «Реклама».
 */
export const AdSlot: React.FC<{ slot: AdSlotId; lang: Language; className?: string }> = ({ slot, lang, className = '' }) => {
  const ad = activeAd(slot, kgDateStr());
  if (!ad) return null;
  const caption = `${LABEL[ad.label][lang]} · ${ad.advertiser}`;
  return (
    <aside aria-label={caption} className={className}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-meta mb-1.5">{caption}</p>
      <a href={ad.href} target="_blank" rel="sponsored noopener noreferrer" className="block overflow-hidden rounded-xl border border-line bg-wash">
        {slot === 'wide' ? (
          <picture>
            {ad.mobileImageUrl && <source media="(max-width: 639px)" srcSet={ad.mobileImageUrl} />}
            <img
              src={ad.imageUrl}
              alt={ad.alt}
              loading="lazy"
              className={`block w-full h-auto object-cover ${ad.mobileImageUrl ? 'aspect-[2/1] sm:aspect-[6/1]' : 'aspect-[6/1]'}`}
            />
          </picture>
        ) : (
          <img src={ad.imageUrl} alt={ad.alt} loading="lazy" className="block w-full h-auto aspect-[6/5] object-cover" />
        )}
      </a>
    </aside>
  );
};
