import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales/translations';

interface UrgentTickerProps {
  currentLanguage: Language;
  onOpenNotice: () => void;
}

export const UrgentTicker: React.FC<UrgentTickerProps> = ({ currentLanguage, onOpenNotice }) => {
  const { t } = getTranslation(currentLanguage);

  const tickerText =
    currentLanguage === 'kg'
      ? 'Айдоочулардын көңүлүнө: Киев көчөсүнүн Манас проспектисинен Логвиненко көчөсүнө чейин жабылышы 10-октябрь 08:00дөн 12-октябрь 20:00гө чейин (МП «Бишкектеплосеть»)'
      : currentLanguage === 'en'
      ? 'Attention Drivers: Closure of Kyiv St from Manas Ave to Logvinenko St from Oct 10, 08:00 to Oct 12, 20:00, 2026 (Bishkekteploset ME)'
      : 'Внимание водителям: Перекрытие ул. Киевская от ул. Манаса до ул. Логвиненко с 10 октября 08:00 по 12 октября 20:00 2026 года (МП «Бишкектеплосеть»)';

  return (
    <div className="w-full bg-[#fee2e2] text-[#991b1b] px-4 md:px-6 py-2.5 shadow-sm border-b border-[#fecaca]">
      <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div
          onClick={onOpenNotice}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#dc2626] text-white text-[11px] font-black tracking-wider uppercase flex-shrink-0 animate-pulse">
            {t('urgentTicker.badge')}
          </span>
          <span className="material-symbols-outlined text-[#dc2626] text-[18px] flex-shrink-0">fmd_bad</span>
          <p className="text-xs sm:text-sm font-semibold text-[#0f1b33] truncate group-hover:text-[#dc2626] transition-colors">
            {tickerText}
          </p>
        </div>
        <button
          onClick={onOpenNotice}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#dc2626] hover:text-[#991b1b] transition-colors ml-auto sm:ml-0 underline decoration-[#dc2626]/50 underline-offset-4"
        >
          <span>{t('nav.viewMap')}</span>
          <span className="material-symbols-outlined text-[16px]">map</span>
        </button>
      </div>
    </div>
  );
};
