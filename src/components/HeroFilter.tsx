import React from 'react';
import { Language, CityId } from '../types';
import { getTranslation } from '../locales/translations';
import { formatDayMonth, formatDayRange, nearestWeekend } from '../utils/dates';

interface HeroFilterProps {
  currentLanguage: Language;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedCity: CityId;
  onCityChange: (c: CityId) => void;
  dateFilter: string;
  onDateFilterChange: (d: string) => void;
  onSearchSubmit: () => void;
  onTagClick: (tag: string) => void;
  stats: { publications: number; activeAlerts: number; regions: number };
  onOpenStats: (mode: 'all' | 'alerts' | 'regions') => void;
}

export const HeroFilter: React.FC<HeroFilterProps> = ({
  currentLanguage,
  searchQuery,
  onSearchQueryChange,
  selectedCity,
  onCityChange,
  dateFilter,
  onDateFilterChange,
  onSearchSubmit,
  onTagClick,
  stats,
  onOpenStats,
}) => {
  const { t } = getTranslation(currentLanguage);

  const cityOptions: { id: CityId; label: string }[] = [
    { id: 'all', label: t('cities.all') },
    { id: 'bishkek', label: t('cities.bishkek') },
    { id: 'osh', label: t('cities.osh') },
    { id: 'jalalabad', label: t('cities.jalalabad') },
    { id: 'karakol', label: t('cities.karakol') },
    { id: 'talas', label: t('cities.talas') },
    { id: 'naryn', label: t('cities.naryn') },
    { id: 'batken', label: t('cities.batken') },
  ];

  // Подписи с реальными датами: «Сегодня, 13 октября» / «Бүгүн, 13-октябрь»
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const [sat, sun] = nearestWeekend(now);
  const dateOptions = [
    { id: 'all', label: t('search.allDates') },
    { id: 'today', label: `${t('search.today')}, ${formatDayMonth(now, currentLanguage)}` },
    { id: 'tomorrow', label: `${t('search.tomorrow')}, ${formatDayMonth(tomorrow, currentLanguage)}` },
    { id: 'weekend', label: `${t('search.weekend')}, ${formatDayRange(sat, sun, currentLanguage)}` },
    { id: 'week', label: t('search.thisWeek') },
  ];

  const tagLabels: Record<string, { ru: string; kg: string; en: string }> = {
    '#ОтключениеСвета': { ru: '#ОтключениеСвета', kg: '#ЖарыкӨчүрүү', en: '#PowerOutage' },
    '#РемонтДорог': { ru: '#РемонтДорог', kg: '#ЖолОңдоо', en: '#RoadWorks' },
    '#Концерты': { ru: '#Концерты', kg: '#Концерттер', en: '#Concerts' },
    '#Ярмарки': { ru: '#Ярмарки', kg: '#Жарманкелер', en: '#Fairs' },
    '#Кино': { ru: '#Кино', kg: '#Кино', en: '#Cinema' },
    '#МэрияБишкек': { ru: '#МэрияБишкека', kg: '#БишкекМэриясы', en: '#BishkekCityHall' },
    '#ОшМэриясы': { ru: '#МэрияОша', kg: '#ОшМэриясы', en: '#OshCityHall' },
  };
  const popularTags = Object.entries(tagLabels).map(([key, l]) => ({ key, label: l[currentLanguage] }));

  return (
    <section className="w-full relative overflow-hidden bg-[#eef2f9] py-8 lg:py-12 border-b border-gray-200">
      {/* Soft Civic Background Lighting */}
      <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#20C7B5]/15 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-[#12327A]/10 blur-2xl pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            {/* Civic Purpose Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[#12327A] font-bold text-xs tracking-wide shadow-sm mb-3 border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-[#20C7B5] animate-ping" />
              <span>{t('appSlogan')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0f1b33] tracking-tight leading-tight mb-2">
              {currentLanguage === 'kg'
                ? 'Кыргызстанда эмне, кайда жана качан?'
                : currentLanguage === 'en'
                ? 'What, Where and When in Kyrgyzstan?'
                : 'Что, где и когда в Кыргызстане?'}
            </h1>

            {/* Official Brand Slogan (TASK 2) */}
            <div className="mt-1.5 mb-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-[#20C7B5]/40 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#20C7B5] flex-shrink-0 animate-pulse" />
              <p className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-[#12327A]">
                {currentLanguage === 'kg' ? (
                  <>
                    <span>Датаны бил</span> <span className="text-[#20C7B5]">—</span> <span>күнүңдү пландаштыр</span>
                  </>
                ) : currentLanguage === 'en' ? (
                  <>
                    <span>Know the date</span> <span className="text-[#20C7B5]">—</span> <span>plan your day</span>
                  </>
                ) : (
                  <>
                    <span>Знай дату</span> <span className="text-[#20C7B5]">—</span> <span>планируй день</span>
                  </>
                )}
              </p>
            </div>

            <p className="text-base sm:text-lg text-[#444651] max-w-2xl leading-relaxed">
              {t('appHeroDesc')}
            </p>
          </div>

          {/* Показатели по фактическим данным — каждый открывает список */}
          <div className="flex items-stretch gap-1 sm:gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
            {(
              [
                { mode: 'all', value: stats.publications, label: t('search.eventsOnDate'), color: 'text-[#12327A]' },
                { mode: 'alerts', value: stats.activeAlerts, label: t('search.activeAlerts'), color: 'text-[#dc2626]' },
                { mode: 'regions', value: stats.regions, label: t('search.regionsCount'), color: 'text-[#00897b]' },
              ] as const
            ).map((m, i) => (
              <React.Fragment key={m.mode}>
                {i > 0 && <div className="w-px bg-gray-200 my-2" />}
                <button
                  type="button"
                  onClick={() => onOpenStats(m.mode)}
                  className="text-left px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#eef2f9] focus-visible:ring-2 focus-visible:ring-[#12327A] transition-colors group"
                >
                  <div className={`text-2xl font-bold ${m.color} flex items-center gap-1`}>
                    {m.value}
                    <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-[#12327A]">open_in_full</span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium underline decoration-dotted underline-offset-2">{m.label}</div>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Advanced Civic Filter Box */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-md border border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center"
          >
            {/* Search Input (What) */}
            <div className="md:col-span-5 relative">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {t('search.whatLabel')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder={t('search.whatPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f3f6fc] text-[#0f1b33] text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#20C7B5] transition-all border border-transparent focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Selector (When) */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {t('search.whenLabel')}
              </label>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => onDateFilterChange(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#f3f6fc] text-[#0f1b33] text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#20C7B5] transition-all cursor-pointer border border-transparent"
                >
                  {dateOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-gray-500 pointer-events-none text-[20px]">
                  calendar_month
                </span>
              </div>
            </div>

            {/* City Selector (Where) */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {t('search.whereLabel')}
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => onCityChange(e.target.value as CityId)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#f3f6fc] text-[#0f1b33] text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#20C7B5] transition-all cursor-pointer border border-transparent"
                >
                  {cityOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-gray-500 pointer-events-none text-[20px]">
                  location_on
                </span>
              </div>
            </div>

            {/* Search CTA */}
            <div className="md:col-span-2 pt-1 md:pt-5">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-sm hover:bg-[#1bb3a2] transition-all shadow-sm active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span>{t('search.findBtn')}</span>
              </button>
            </div>
          </form>

          {/* Quick Query Tags */}
          <div className="mt-4 pt-3 flex flex-wrap items-center gap-1.5 text-gray-600 border-t border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1">
              {t('search.popularTags')}
            </span>
            {popularTags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => onTagClick(tag.key.replace('#', ''))}
                className="px-2.5 py-1 rounded-full bg-[#f3f6fc] text-[#0f1b33] text-xs font-medium hover:bg-[#12327A] hover:text-white transition-colors"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
