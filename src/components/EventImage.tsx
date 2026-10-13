import React, { useState } from 'react';
import { Announcement } from '../types';

const CATEGORY_STYLE: Record<string, { icon: string; bg: string }> = {
  concerts: { icon: 'music_note', bg: 'from-[#3b1d8f] via-[#6d28d9] to-[#db2777]' },
  festivals: { icon: 'festival', bg: 'from-[#0f766e] via-[#14b8a6] to-[#facc15]' },
  fairs: { icon: 'storefront', bg: 'from-[#365314] via-[#65a30d] to-[#facc15]' },
  cinema: { icon: 'movie', bg: 'from-[#111827] via-[#7f1d1d] to-[#dc2626]' },
  education: { icon: 'school', bg: 'from-[#0c4a6e] via-[#0284c7] to-[#22d3ee]' },
  gov: { icon: 'campaign', bg: 'from-[#0d2459] via-[#12327A] to-[#6366f1]' },
  water: { icon: 'water_drop', bg: 'from-[#0c4a6e] via-[#0369a1] to-[#38bdf8]' },
  electricity: { icon: 'bolt', bg: 'from-[#78350f] via-[#d97706] to-[#fde047]' },
  roads: { icon: 'traffic', bg: 'from-[#064e3b] via-[#059669] to-[#34d399]' },
  repairs: { icon: 'construction', bg: 'from-[#7c2d12] via-[#ea580c] to-[#fdba74]' },
};

/**
 * Фото / баннер события. Если фото нет или оно не загрузилось —
 * показывается фирменная заставка категории.
 */
export const EventImage: React.FC<{ item: Announcement; className?: string; showCredit?: boolean }> = ({
  item,
  className = '',
  showCredit = false,
}) => {
  const [failed, setFailed] = useState(false);
  const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.gov;

  if (item.imageUrl && !failed) {
    return (
      <div className={`relative overflow-hidden bg-[#0d2459] ${className}`}>
        <img
          src={item.imageUrl}
          alt={item.title.ru}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {showCredit && item.imageCredit && (
          <span className="absolute bottom-1.5 right-2 text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
            {item.imageCredit}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${style.bg} flex items-center justify-center ${className}`}>
      <span className="material-symbols-outlined text-white/85 text-[48px]">{style.icon}</span>
      <span className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
      <span className="absolute -left-4 -top-8 w-20 h-20 rounded-full bg-white/10" />
    </div>
  );
};
