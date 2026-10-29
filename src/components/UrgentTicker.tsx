import React from 'react';
import { Announcement, Language } from '../types';
import { formatWhen } from '../utils/dates';
import { kgTs } from '../utils/time';
import { urgencyLabel } from './UrgencyBadge';

interface UrgentTickerProps {
  currentLanguage: Language;
  notice: Announcement | null;
  onOpenNotice: () => void;
}


const CTA = { ru: 'Подробнее', kg: 'Толугураак', en: 'Details' };

export const UrgentTicker: React.FC<UrgentTickerProps> = ({ currentLanguage, notice, onOpenNotice }) => {
  if (!notice) return null;
  const when = formatWhen(notice.startDate, notice.endDate, currentLanguage, false, notice.timeTBA, notice.allDay);
  // «Действует сейчас» / «Сегодня» / «Завтра» / «Через N дн.» — по времени Бишкека
  const label = urgencyLabel(notice, currentLanguage);
  const live = kgTs(notice.startDate) <= Date.now();

  return (
    <button
      onClick={onOpenNotice}
      className="w-full text-left bg-[#12327A] text-white py-3 hover:bg-[#0d2459] border-b border-[#20C7B5]/60 transition-colors"
    >
      <div className="dn-container flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black tracking-wider uppercase flex-shrink-0 ${
            live ? 'bg-red-600' : 'bg-white/20'
          }`}
        >
          {live && <span className="w-1.5 h-1.5 rounded-full bg-white dn-urgent-blink" />}
          {label}
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
