import React from 'react';
import { Announcement, Language } from '../types';
import { formatDayMonthTime } from '../utils/dates';

interface UrgentTickerProps {
  currentLanguage: Language;
  notice: Announcement | null;
  onOpenNotice: () => void;
}

const LABEL = { ru: 'Скоро', kg: 'Жакында', en: 'Coming up' };
const CTA = { ru: 'Подробнее', kg: 'Толугураак', en: 'Details' };

export const UrgentTicker: React.FC<UrgentTickerProps> = ({ currentLanguage, notice, onOpenNotice }) => {
  if (!notice) return null;
  const when = formatDayMonthTime(notice.startDate, currentLanguage);

  return (
    <button
      onClick={onOpenNotice}
      className="w-full text-left bg-gradient-to-r from-[#12327A] via-[#1d4ed8] to-[#20C7B5] text-white px-4 md:px-6 py-3 hover:brightness-110 transition"
    >
      <div className="max-w-[1280px] mx-auto flex items-center gap-3">
        <span className="inline-flex px-2 py-0.5 rounded bg-white/20 text-[11px] font-black tracking-wider uppercase flex-shrink-0">
          {LABEL[currentLanguage]}
        </span>
        <p className="text-xs sm:text-sm font-semibold truncate flex-1">
          {notice.title[currentLanguage]} — {when}
        </p>
        <span className="hidden sm:inline-flex items-center gap-1 text-sm font-bold flex-shrink-0">
          {CTA[currentLanguage]}
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </span>
      </div>
    </button>
  );
};
