import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PLACE_IDS } from '../config/regions';
import { Language, CityId, ViewMode, Announcement } from '../types';
import { getTranslation } from '../locales/translations';
import { BrandLogo } from './BrandLogo';
import { WEEKDAYS, formatDayMonth } from '../utils/dates';
import { RUBRICS } from '../config/rubrics';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  selectedCity: CityId;
  onCityChange: (city: CityId) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenSearch: () => void;
  onOpenUrgentNotice: () => void;
  featuredNotice?: Announcement | null;
  role: 'guest' | 'user' | 'admin';
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenPublish: () => void;
  /** Открыть выдвижную панель «Разделы» */
  onOpenSections: () => void;
  /** Выбранная рубрика строки навигации (null — главная без фильтра) */
  activeRubric: string | null;
  onSelectRubric: (id: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  selectedCity,
  onCityChange,
  currentView,
  onViewChange,
  onOpenSearch,
  onOpenUrgentNotice,
  featuredNotice,
  role,
  onOpenAdmin,
  onOpenAccount,
  onOpenPublish,
  onOpenSections,
  activeRubric,
  onSelectRubric,
}) => {
  const { t } = getTranslation(currentLanguage);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  const cityLabels = Object.fromEntries([...PLACE_IDS, 'karakol'].map((id) => [id, t(`cities.${id}`)])) as Record<CityId, string>;

  // Высота шапки меняется (строка рубрик переносится на узких экранах) — сообщаем её странице через CSS-переменную
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Телефон: при прокрутке вниз служебная строка (дата, языки) уезжает вверх, при прокрутке вверх — возвращается
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (window.innerWidth >= 768 || y < 120) setTucked(false);
      else if (y > lastY + 4) setTucked(true);
      else if (y < lastY - 4) setTucked(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Дата и время — по Кыргызстану (UTC+6), независимо от часового пояса компьютера; часы обновляются каждые 15 секунд
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const kg = new Date(nowTs + 6 * 3600_000); // поля UTC этой даты = местное время Бишкека
  const today = new Date(kg.getUTCFullYear(), kg.getUTCMonth(), kg.getUTCDate());
  const weekday = WEEKDAYS[currentLanguage][today.getDay()];
  const todayLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDayMonth(today, currentLanguage)}`;
  const timeLabel = `${String(kg.getUTCHours()).padStart(2, '0')}:${String(kg.getUTCMinutes()).padStart(2, '0')}`;
  const kgTimeName = currentLanguage === 'kg' ? 'КР убактысы' : currentLanguage === 'en' ? 'Kyrgyzstan time' : 'время КР';
  const sectionsLabel = currentLanguage === 'kg' ? 'Бөлүмдөр' : currentLanguage === 'en' ? 'Sections' : 'Разделы';

  return (
    <header
      ref={headerRef}
      onFocus={() => setTucked(false)}
      style={tucked ? { transform: 'translateY(-36px)' } : undefined}
      className="fixed top-0 inset-x-0 z-50 text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] transition-transform duration-200 motion-reduce:transition-none"
    >
      {/* Служебная строка: дата, для организаций, язык */}
      <div className="h-9 bg-[#031639] border-b border-white/10">
        <div className="h-full max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-4 text-xs">
          <span className="text-[#c8d2ee]">
            <span className="hidden sm:inline">{todayLabel} · </span>
            <time dateTime={`${kg.toISOString().slice(0, 16)}+06:00`} className="font-semibold text-white tabular-nums">
              {timeLabel}
            </time>{' '}
            <span>({kgTimeName})</span>
          </span>
          <div className="flex items-center gap-4 sm:gap-6 ml-auto">
            <button
              onClick={() => onViewChange('organizations')}
              className={`font-semibold transition-colors ${currentView === 'organizations' ? 'text-white' : 'text-[#c8d2ee] hover:text-white'}`}
            >
              {t('nav.forOrg')}
            </button>
            <span className="w-px h-4 bg-white/15" aria-hidden="true" />
            <div className="flex items-center gap-1" role="group" aria-label={currentLanguage === 'kg' ? 'Тил' : currentLanguage === 'en' ? 'Language' : 'Язык'}>
              {(['ru', 'kg', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  aria-pressed={currentLanguage === lang}
                  className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wide transition-colors ${
                    currentLanguage === lang ? 'text-[#0d2459] bg-[#20C7B5]' : 'text-[#c8d2ee] hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Основная строка */}
      <div className="bg-brand-navy">
      <div className="h-14 lg:h-16 max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sections, Brand Logo */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <button
            onClick={onOpenSections}
            aria-label={sectionsLabel}
            title={sectionsLabel}
            className="inline-flex items-center gap-1.5 p-2 sm:pl-2 sm:pr-3 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
            <span className="hidden xl:inline text-sm font-semibold">{sectionsLabel}</span>
          </button>
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#20C7B5]"
            aria-label="DataNews Home"
          >
            {/* Утверждённый горизонтальный логотип, вариант без фона — на тёмно-синей шапке */}
            {/* Очень узкие экраны (до 360 px) — пропорционально меньше, чтобы не касаться поиска */}
            <BrandLogo height={27} className="min-[360px]:hidden" />
            <BrandLogo height={32} className="hidden min-[360px]:block sm:hidden" />
            <BrandLogo height={38} className="hidden sm:block lg:hidden" />
            <BrandLogo height={44} className="hidden lg:block" />
          </button>
          {/* Девиз — рядом с логотипом на широких экранах */}
          <span className="hidden lg:block pl-5 ml-1 border-l border-white/20 text-sm font-semibold text-[#20C7B5] whitespace-nowrap">
            {t('motto')}
          </span>

        </div>

        {/* Right: City Selector, Language Picker, Search, Post Button & Admin */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* City Selector Dropdown (на телефоне город выбирается в фильтре на главной) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors border border-white/10"
              title={currentLanguage === 'kg' ? 'Шаарды тандоо' : currentLanguage === 'en' ? 'Choose city' : 'Выбрать город'}
            >
              <span className="material-symbols-outlined text-[16px] text-[#20C7B5]">location_on</span>
              <span className="truncate max-w-[90px] sm:max-w-[110px]">{cityLabels[selectedCity]}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {isCityDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCityDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-gray-800 text-sm">
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t('search.whereLabel')}
                  </div>
                  {(PLACE_IDS as CityId[]).map(
                    (cityId) => (
                      <button
                        key={cityId}
                        onClick={() => {
                          onCityChange(cityId);
                          setIsCityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                          selectedCity === cityId ? 'font-bold text-[#12327A] bg-blue-50/60' : ''
                        }`}
                      >
                        <span>{cityLabels[cityId]}</span>
                        {selectedCity === cityId && (
                          <span className="material-symbols-outlined text-[16px] text-[#20C7B5]">check</span>
                        )}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="p-2 text-[#dbe1ff] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {/* "Разместить" CTA Button */}
          <button
            onClick={onOpenPublish}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#20C7B5] text-[#002f29] hover:bg-[#1bb3a2] font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{t('nav.publishBtn')}</span>
          </button>

          {/* Панель управления видна только администратору, гостю — личный кабинет */}
          {role === 'admin' ? (
            <button
              onClick={onOpenAdmin}
              aria-label="Admin panel"
              title="Панель управления"
              className="w-8 h-8 rounded-full bg-[#20C7B5] hover:bg-[#1bb3a2] flex items-center justify-center transition-colors text-[#002f29]"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            </button>
          ) : (
            // Гость — «Войти» (вход в личный кабинет), вошедший пользователь — «Кабинет»
            <button
              onClick={onOpenAccount}
              title={t('nav.account')}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors border border-white/20 text-white text-xs sm:text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px] text-[#20C7B5]" aria-hidden="true">
                {role === 'user' ? 'account_circle' : 'login'}
              </span>
              <span>{role === 'user' ? t('nav.cabinetBtn') : t('nav.loginBtn')}</span>
            </button>
          )}

        </div>
      </div>

      </div>

      {/* Строка рубрик: главные страницы и рубрики, сгруппированные по смыслу (на телефоне — прокрутка вбок) */}
      <nav
        aria-label={currentLanguage === 'kg' ? 'Рубрикалар' : currentLanguage === 'en' ? 'Sections' : 'Рубрики'}
        className="relative bg-white border-b border-line text-ink after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none"
      >
        {/* Всегда одна строка постоянной высоты: на узких экранах — прокрутка вбок; полный список — в «Разделах» */}
        <div className="max-w-[1280px] mx-auto px-1 sm:px-2 md:px-4 overflow-x-auto scrollbar-none">
          <ul className="flex items-stretch min-w-max">
            {[
              { key: 'home', label: t('nav.home'), active: currentView === 'home' && !activeRubric, onClick: () => { onSelectRubric(null); onViewChange('home'); } },
              // Календарь — сразу после главной: главное отличие DataNews — что и когда предстоит
              { key: 'calendar', label: t('nav.calendar'), active: currentView === 'calendar', onClick: () => { onSelectRubric(null); onViewChange('calendar'); } },
              { key: 'alerts', label: t('nav.alerts'), active: currentView === 'alerts', onClick: () => { onSelectRubric(null); onViewChange('alerts'); } },
              ...RUBRICS.map((r) => ({ key: r.id, label: r.label[currentLanguage], active: currentView === 'home' && activeRubric === r.id, onClick: () => onSelectRubric(r.id) })),
            ].map((item) => (
              <li key={item.key} className="flex h-11">
                <button
                  type="button"
                  onClick={item.onClick}
                  aria-current={item.active ? 'page' : undefined}
                  className={`group h-full px-2.5 flex items-center text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
                    item.active ? 'text-brand-blue' : 'text-ink hover:text-brand-blue'
                  }`}
                >
                  {/* Линия активного раздела — прямо под текстом, по ширине названия; кнопка остаётся во всю высоту строки */}
                  <span className="relative pb-[5px]">
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-colors ${
                        item.active ? 'bg-brand-teal' : 'bg-transparent group-hover:bg-brand-blue/30'
                      }`}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};
