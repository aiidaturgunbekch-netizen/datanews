import React from 'react';
import { PLACE_IDS } from '../config/regions';
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
  /** Больше не используется: быстрые ссылки заменены панелью «Разделы» */
  onTagClick?: (tag: string) => void;
  stats: { publications: number; activeAlerts: number; regions: number };
  onOpenStats: (mode: 'all' | 'alerts' | 'regions') => void;
  /** Компактная строка поиска для новостной главной (без большого вступительного блока) */
  compact?: boolean;
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
  stats,
  onOpenStats,
  compact = false,
}) => {
  const { t } = getTranslation(currentLanguage);

  const cityOptions: { id: CityId; label: string }[] = PLACE_IDS.map((id) => ({ id, label: t(`cities.${id}`) }));

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

  const heading =
    currentLanguage === 'kg' ? 'Кыргызстанда эмне, кайда жана качан?' : currentLanguage === 'en' ? 'What, Where and When in Kyrgyzstan?' : 'Что, где и когда в Кыргызстане?';
  const fieldCls =
    'w-full rounded-lg bg-[#f3f6fc] text-[#0f1b33] text-sm border border-gray-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#20C7B5] focus:border-transparent';

  if (compact) {
    const statLine = [
      { mode: 'all' as const, value: stats.publications, label: t('search.eventsOnDate') },
      { mode: 'alerts' as const, value: stats.activeAlerts, label: t('search.activeAlerts') },
      { mode: 'regions' as const, value: stats.regions, label: t('search.regionsCount') },
    ];
    return (
      <section className="w-full bg-white border-b border-gray-200">
        <h1 className="sr-only">{heading}</h1>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="flex-1 grid grid-cols-2 sm:grid-cols-12 gap-2"
          >
            <label className="col-span-2 sm:col-span-6 relative">
              <span className="sr-only">{t('search.whatLabel')}</span>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={t('search.whatPlaceholder')}
                className={`${fieldCls} pl-10 pr-3 py-2.5`}
              />
            </label>
            <label className="sm:col-span-3">
              <span className="sr-only">{t('search.whenLabel')}</span>
              <select value={dateFilter} onChange={(e) => onDateFilterChange(e.target.value)} className={`${fieldCls} px-3 py-2.5 font-semibold cursor-pointer`}>
                {dateOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-3">
              <span className="sr-only">{t('search.whereLabel')}</span>
              <select value={selectedCity} onChange={(e) => onCityChange(e.target.value as CityId)} className={`${fieldCls} px-3 py-2.5 font-semibold cursor-pointer`}>
                {cityOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </form>
          {/* Показатели — тихой строкой, каждый открывает список */}
          <ul className="flex items-center gap-4 text-sm text-gray-600 shrink-0">
            {statLine.map((m) => (
              <li key={m.mode}>
                <button type="button" onClick={() => onOpenStats(m.mode)} className="hover:text-[#12327A] underline decoration-dotted underline-offset-4">
                  <b className="text-[#12327A] tabular-nums">{m.value}</b> {m.label.toLowerCase()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full relative bg-[#eef2f9] py-8 sm:py-14 lg:py-16 border-b border-gray-200">

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 sm:gap-8 mb-8 sm:mb-10">
          <div className="max-w-3xl">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0f1b33] tracking-tight leading-[1.15] mb-4">
              {currentLanguage === 'kg'
                ? 'Кыргызстанда эмне, кайда жана качан?'
                : currentLanguage === 'en'
                ? 'What, Where and When in Kyrgyzstan?'
                : 'Что, где и когда в Кыргызстане?'}
            </h1>

            {/* Official Brand Slogan (TASK 2) */}
            <div className="mb-4">
              <p className="text-lg sm:text-xl font-bold tracking-tight text-[#12327A]">
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

            <p className="hidden sm:block text-base sm:text-lg text-[#444651] max-w-2xl leading-relaxed sm:leading-8">
              {t('appHeroDesc')}
            </p>
          </div>

          {/* Показатели по фактическим данным — каждый открывает список */}
          <div className="flex items-stretch gap-1 sm:gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
            {(
              [
                { mode: 'all', value: stats.publications, label: t('search.eventsOnDate'), color: 'text-[#12327A]' },
                { mode: 'alerts', value: stats.activeAlerts, label: t('search.activeAlerts'), color: 'text-[#12327A]' },
                { mode: 'regions', value: stats.regions, label: t('search.regionsCount'), color: 'text-[#12327A]' },
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
                    <span className="material-symbols-outlined text-[16px] text-gray-500 group-hover:text-[#12327A]">open_in_full</span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium underline decoration-dotted underline-offset-2">{m.label}</div>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Advanced Civic Filter Box */}
        <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-gray-200">
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
                <span className="material-symbols-outlined absolute left-3 text-gray-500 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder={t('search.whatPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f3f6fc] text-[#0f1b33] text-sm placeholder:text-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#20C7B5] transition-all border border-transparent focus:border-transparent"
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

        </div>
      </div>
    </section>
  );
};
