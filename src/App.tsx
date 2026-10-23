/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Announcement,
  CategoryId,
  CityId,
  Language,
  ViewMode,
} from './types';
import { INITIAL_ANNOUNCEMENTS } from './data/initialAnnouncements';
import * as api from './services/api';
import { trackView } from './services/analytics';
import { addDaysStr, kgDateStr, kgTs } from './utils/time';
import { alertLevel, isAlert, isExpired, isListed } from './utils/urgency';
import { CATEGORY_IDS, normalizeCity, REGIONS } from './config/regions';
import { Header } from './components/Header';
import { UrgentTicker } from './components/UrgentTicker';
import { HeroFilter } from './components/HeroFilter';
import { CategoryChips } from './components/CategoryChips';
import { AlertsGrid } from './components/AlertsGrid';
import { EventsFeed } from './components/EventsFeed';
import { InteractiveCalendar } from './components/InteractiveCalendar';
import { CityMosaic } from './components/CityMosaic';
import { ForOrganizationsSection } from './components/ForOrganizationsSection';
import { Footer } from './components/Footer';
import { AnnouncementDetailModal } from './components/AnnouncementDetailModal';
import { FullCalendarView } from './components/FullCalendarView';
import { CitiesPage } from './components/CitiesPage';
import { OrganizationsPage } from './components/OrganizationsPage';
import { AdminPortal } from './components/AdminPortal';
import { SearchModal } from './components/SearchModal';
import { AccountPortal } from './components/AccountPortal';
import { CategoryResults, StatsMode, StatsPanel } from './components/StatsPanel';
import { EmergencyBox, HydrometLine, WeatherSafety } from './components/WeatherSafety';
import { TheatreVenues } from './components/TheatreVenues';
import { isFresh } from './utils/statusUtils';
import { TheatreSchedule } from './components/TheatreSchedule';
import { ChatWidget } from './components/ChatWidget';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InfoPage, InfoView } from './components/InfoPages';

/** Встроенные проверенные события + одобренные публикации с сервера */
const mergeAnnouncements = (server: Announcement[], hidden: string[]) => {
  const byId = new Map<string, Announcement>();
  INITIAL_ANNOUNCEMENTS.forEach((a) => byId.set(a.id, a));
  server.forEach((a) => byId.set(a.id, a));
  hidden.forEach((id) => byId.delete(id));
  return [...byId.values()];
};

const isAdminHash = () => window.location.hash.replace('#', '').toLowerCase() === 'admin';


export default function App() {
  // Multilingual State
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    return (localStorage.getItem('datanews_kg_lang') as Language) || 'ru';
  });

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('datanews_kg_lang', lang);
  };

  // Navigation View Mode
  const [currentView, setCurrentView] = useState<ViewMode>('home');

  // Filters
  const [selectedCity, setSelectedCity] = useState<CityId>('bishkek');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => kgDateStr());

  // Data Store: встроенные события показываются сразу, публикации с сервера догружаются
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);

  // Роль: гость / зарегистрированный пользователь / администратор
  const [role, setRole] = useState<api.Role>(() => api.getSession()?.role || 'guest');

  // Modals
  const [activeNoticeDetail, setActiveNoticeDetail] = useState<Announcement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Панель управления открывается только по адресу сайта с #admin и только после входа админа
  const [isAdminOpen, setIsAdminOpen] = useState(isAdminHash);
  const [accountMode, setAccountMode] = useState<null | 'cabinet' | 'publish'>(null);
  const [statsMode, setStatsMode] = useState<StatsMode | null>(null);

  const refreshData = () => {
    api
      .fetchPublicAnnouncements()
      .then((r) =>
        // Неполные записи (без заголовка, места, даты или раздела) не показываем — одна такая запись не должна ломать сайт
        setAnnouncements(
          mergeAnnouncements(
            (Array.isArray(r.items) ? r.items : []).filter((a) => a && a.id && a.title?.ru && a.location && typeof a.startDate === 'string' && a.category),
            Array.isArray(r.hidden) ? r.hidden : []
          )
        )
      )
      .catch(() => setAnnouncements(INITIAL_ANNOUNCEMENTS));
  };

  useEffect(() => {
    refreshData();
    if (api.getSession()) {
      api
        .me()
        .then((r) => setRole(r.role))
        .catch(() => {});
    }
    const onHash = () => isAdminHash() && setIsAdminOpen(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Язык страницы для браузера, программ чтения с экрана и поисковиков
  useEffect(() => {
    document.documentElement.lang = currentLanguage === 'kg' ? 'ky' : currentLanguage;
  }, [currentLanguage]);

  // Отдельная ссылка на каждую публикацию: /#/n/<id> (короткая ссылка для мессенджеров — /n/<id>, см. api/share.ts)
  useEffect(() => {
    const openFromHash = () => {
      const m = window.location.hash.match(/^#\/n\/([\w-]+)/);
      if (m) {
        const found = announcements.find((a) => a.id === m[1]);
        if (found) setActiveNoticeDetail(found);
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [announcements]);
  useEffect(() => {
    const base = window.location.pathname + window.location.search;
    if (activeNoticeDetail) {
      if (window.location.hash !== `#/n/${activeNoticeDetail.id}`) history.replaceState(null, '', `${base}#/n/${activeNoticeDetail.id}`);
      document.title = `${activeNoticeDetail.title[currentLanguage]} — DataNews Kyrgyzstan`;
    } else {
      if (window.location.hash.startsWith('#/n/')) history.replaceState(null, '', base);
      if (currentView === 'home') document.title = 'DataNews Кыргызстан — Что, где и когда в Кыргызстане';
    }
  }, [activeNoticeDetail, currentLanguage, currentView]);

  // Статистика посещений: один просмотр на каждый открытый раздел (админа не считаем)
  useEffect(() => {
    if (role !== 'admin') trackView(currentView, currentLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const closeAdmin = () => {
    setIsAdminOpen(false);
    if (isAdminHash()) history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  /**
   * Один общий фильтр для счётчиков и списков (город, дата, поиск) — чтобы число на чипе категории
   * всегда совпадало с тем, что открывается по нажатию. Завершённые предупреждения не показываются.
   */
  const matchesScope = (item: Announcement, ignoreCategory = false) => {
    if (!isListed(item)) return false;
    // Город: публикации «Весь Кыргызстан» (city = 'all') видны в любом городе
    const city = normalizeCity(item.city);
    if (selectedCity !== 'all' && city !== selectedCity && city !== 'all') return false;
    if (!ignoreCategory && selectedCategory !== 'all' && item.category !== selectedCategory) return false;

    // Даты считаются по календарю Бишкека
    const itemStart = item.startDate.slice(0, 10);
    const itemEnd = item.endDate ? item.endDate.slice(0, 10) : itemStart;
    const overlaps = (from: string, to: string) => itemStart <= to && itemEnd >= from;
    const today = kgDateStr();
    if (dateFilter === 'today' && !overlaps(today, today)) return false;
    if (dateFilter === 'tomorrow' && !overlaps(addDaysStr(today, 1), addDaysStr(today, 1))) return false;
    if (dateFilter === 'weekend') {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
      const sat = addDaysStr(today, dow === 0 ? -1 : 6 - dow);
      if (!overlaps(sat, addDaysStr(sat, 1))) return false;
    }
    if (dateFilter === 'week' && !overlaps(today, addDaysStr(today, 7))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = [item.title.ru, item.title.kg, item.title.en, item.location.ru, item.district, item.locality, item.protocolCode, item.summary.ru, item.description.ru, item.sourceName]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filteredAnnouncements = useMemo(
    () => announcements.filter((a) => matchesScope(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [announcements, selectedCity, selectedCategory, dateFilter, searchQuery]
  );

  // Предупреждения и афиша делят список без пропусков: всё, что не предупреждение, — в афише
  const alertsList = useMemo(() => filteredAnnouncements.filter(isAlert), [filteredAnnouncements]);
  // Завершённые предупреждения выбранного места — архив в разделе «Предупреждения» (новые сверху)
  const archivedAlerts = useMemo(
    () =>
      announcements
        .filter((a) => isAlert(a) && !isListed(a))
        .filter((a) => selectedCity === 'all' || a.city === 'all' || normalizeCity(a.city) === selectedCity)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [announcements, selectedCity]
  );
  const eventsList = useMemo(() => filteredAnnouncements.filter((a) => !isAlert(a)), [filteredAnnouncements]);

  // Счётчики категорий — по тем же правилам, что и список (кроме самой категории)
  const categoryCounts = useMemo(() => {
    // Счётчики — только актуальное; прошедшее лежит в архиве раздела
    const base = announcements.filter((a) => matchesScope(a, true) && isFresh(a));
    const counts = { all: base.length } as Record<CategoryId, number>;
    CATEGORY_IDS.forEach((c) => (counts[c] = base.filter((a) => a.category === c).length));
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, selectedCity, dateFilter, searchQuery]);

  // Показатели в шапке — по фактическим данным
  const heroStats = useMemo(() => {
    const scoped = announcements.filter(
      (a) => isListed(a) && (selectedCity === 'all' || normalizeCity(a.city) === selectedCity || a.city === 'all')
    );
    return {
      publications: scoped.length,
      activeAlerts: scoped.filter((a) => alertLevel(a) === 'urgent' || alertLevel(a) === 'soon').length,
      regions: REGIONS.length,
    };
  }, [announcements, selectedCity]);

  // Featured notice for the top strip: nearest non-finished item flagged for the ticker
  const featuredNotice = useMemo(() => {
    const nowTs = Date.now();
    const pool = announcements
      .filter((a) => a.isUrgentTicker && a.status !== 'cancelled' && a.status !== 'archived' && a.status !== 'completed')
      .filter((a) => !isExpired(a, nowTs))
      .sort((x, y) => kgTs(x.startDate) - kgTs(y.startDate));
    return pool[0] || null;
  }, [announcements]);

  const handleOpenUrgentKyivNotice = () => {
    if (featuredNotice) setActiveNoticeDetail(featuredNotice);
  };

  /** Быстрые переходы под поиском */
  const handleTagClick = (key: string) => {
    const scrollTo = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    setSearchQuery('');
    if (key === 'today' || key === 'tomorrow' || key === 'week') {
      setDateFilter(key);
      setSelectedCategory('all');
      scrollTo(alertsList.length ? 'alerts-feed' : 'events-feed');
    } else if (key === 'alerts') {
      setSelectedCategory('all');
      scrollTo(alertsList.length ? 'alerts-feed' : 'events-feed');
    } else if (key === 'weather') {
      // Раздел «Погода и опасные явления»: предупреждения и контакт Кыргызгидромета
      setSelectedCategory('hazard');
      scrollTo('category-results');
    } else if (key === 'state' || key === 'laws') {
      setSelectedCategory(key);
      scrollTo('category-results');
    } else if (key === 'shows') {
      setSelectedCategory('all');
      setCurrentView('events');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-[#0f1b33]">
      {/* Fixed Header */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenUrgentNotice={handleOpenUrgentKyivNotice}
        featuredNotice={featuredNotice}
        role={role}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAccount={() => setAccountMode('cabinet')}
        onOpenPublish={() => (role === 'admin' ? setIsAdminOpen(true) : setAccountMode('publish'))}
      />

      {/* Main Content Area (padding-top accounts for header + urgent ticker) */}
      <main className="flex-1 w-full pt-16">
        {/* VIEW: HOME */}
        {currentView === 'home' && (
          <div className="w-full flex flex-col">
            {/* Urgent Real-Time Alert Ticker Bar */}
            <UrgentTicker
              currentLanguage={currentLanguage}
              notice={featuredNotice}
              onOpenNotice={handleOpenUrgentKyivNotice}
            />

            {/* Hero & Advanced Civic Filter Box */}
            <HeroFilter
              currentLanguage={currentLanguage}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              onSearchSubmit={() => {}}
              onTagClick={handleTagClick}
              stats={heroStats}
              onOpenStats={setStatsMode}
            />

            {/* Разделы: на компьютере — меню сбоку, на телефоне — одна строка с прокруткой */}
            <div className="lg:max-w-[1440px] lg:mx-auto lg:flex lg:items-start lg:gap-2 lg:pl-4">
            <aside className="hidden lg:block w-60 shrink-0 sticky top-28 self-start py-6 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none">
              <CategoryChips
                variant="sidebar"
                currentLanguage={currentLanguage}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                categoryCounts={categoryCounts}
              />
            </aside>
            <div className="flex-1 min-w-0">
            <div className="lg:hidden">
              <CategoryChips
                currentLanguage={currentLanguage}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                categoryCounts={categoryCounts}
              />
            </div>

            {/* Выбрана категория — показываем ровно те публикации, что учтены в счётчике чипа */}
            {selectedCategory !== 'all' && (
              <CategoryResults
                lang={currentLanguage}
                category={selectedCategory}
                items={filteredAnnouncements}
                onOpen={setActiveNoticeDetail}
                onReset={() => setSelectedCategory('all')}
                extra={
                  selectedCategory === 'hazard' ? (
                    <HydrometLine lang={currentLanguage} />
                  ) : selectedCategory === 'culture' || selectedCategory === 'concerts' ? (
                    <TheatreVenues lang={currentLanguage} items={announcements} onOpen={setActiveNoticeDetail} />
                  ) : undefined
                }
              />
            )}

            {/* Погода и безопасность: официальные предупреждения, прогноз, перевалы — выше обычных новостей */}
            {selectedCategory === 'all' && (
              <WeatherSafety
                lang={currentLanguage}
                announcements={announcements}
                city={selectedCity}
                onOpen={setActiveNoticeDetail}
              />
            )}

            {/* Urgent & Important Alerts Section — только если есть предупреждения */}
            {selectedCategory === 'all' && alertsList.length > 0 && (
            <AlertsGrid
              currentLanguage={currentLanguage}
              alerts={alertsList}
              selectedCity={selectedCity}
              onCityFilterChange={setSelectedCity}
              onSelectAnnouncement={setActiveNoticeDetail}
            />
            )}

            {/* Upcoming Events Feed & Interactive Calendar Mosaic */}
            {selectedCategory === 'all' && (
            <section id="events-feed" className="w-full py-10 sm:py-14 bg-[#eef2f9] border-t border-gray-200 scroll-mt-24">
              <div className="max-w-[1280px] mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left 8 Cols: Date-First Events Feed */}
                  <div className="lg:col-span-8">
                    <EventsFeed
                      currentLanguage={currentLanguage}
                      events={eventsList}
                      onSelectAnnouncement={setActiveNoticeDetail}
                      onOpenFullCalendar={() => setCurrentView('calendar')}
                    />
                  </div>

                  {/* Right 4 Cols: Interactive Calendar Widget Panel */}
                  <div className="lg:col-span-4">
                    <InteractiveCalendar
                      currentLanguage={currentLanguage}
                      announcements={announcements}
                      selectedDate={calendarSelectedDate}
                      onSelectDate={setCalendarSelectedDate}
                      onSelectAnnouncement={setActiveNoticeDetail}
                    />
                  </div>
                </div>
              </div>
            </section>
            )}

            {selectedCategory === 'all' && (
              <TheatreSchedule lang={currentLanguage} announcements={announcements} onOpen={setActiveNoticeDetail} />
            )}
            </div>
            </div>

            {/* Browse by City / Regional Portals Mosaic */}
            <CityMosaic
              announcements={announcements}
              currentLanguage={currentLanguage}
              onSelectCity={(cityId) => {
                setSelectedCity(cityId);
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              onOpenAllCities={() => setCurrentView('cities')}
              onOpenAnnouncement={setActiveNoticeDetail}
            />

            {/* Экстренные службы — внизу, чтобы не отвлекать от свежих новостей */}
            <section className="w-full py-6 bg-white border-t border-gray-100">
              <div className="max-w-[1280px] mx-auto px-4 md:px-6">
                <div className="md:max-w-md">
                  <EmergencyBox lang={currentLanguage} />
                </div>
              </div>
            </section>

            {/* For Municipalities & Organizations Section */}
            <ForOrganizationsSection
              currentLanguage={currentLanguage}
              onOpenPublish={() => (role === 'admin' ? setIsAdminOpen(true) : setAccountMode('publish'))}
              onOpenPricing={() => setCurrentView('pricing')}
            />
          </div>
        )}

        {/* VIEW: CALENDAR */}
        {currentView === 'calendar' && (
          <FullCalendarView
            currentLanguage={currentLanguage}
            announcements={announcements}
            onSelectAnnouncement={setActiveNoticeDetail}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* VIEW: ALERTS ONLY */}
        {currentView === 'alerts' && (
          <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
            <button
              onClick={() => setCurrentView('home')}
              className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-4"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{currentLanguage === 'kg' ? 'Башкы бет' : currentLanguage === 'en' ? 'Home' : 'Главная'}</span>
            </button>
            <CategoryChips
              currentLanguage={currentLanguage}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categoryCounts={categoryCounts}
            />
            {selectedCategory !== 'all' ? (
              <CategoryResults
                lang={currentLanguage}
                category={selectedCategory}
                items={filteredAnnouncements}
                onOpen={setActiveNoticeDetail}
                onReset={() => setSelectedCategory('all')}
                extra={
                  selectedCategory === 'hazard' ? (
                    <HydrometLine lang={currentLanguage} />
                  ) : selectedCategory === 'culture' || selectedCategory === 'concerts' ? (
                    <TheatreVenues lang={currentLanguage} items={announcements} onOpen={setActiveNoticeDetail} />
                  ) : undefined
                }
              />
            ) : (
              <AlertsGrid
                currentLanguage={currentLanguage}
                alerts={alertsList}
                selectedCity={selectedCity}
                onCityFilterChange={setSelectedCity}
                onSelectAnnouncement={setActiveNoticeDetail}
                archived={archivedAlerts}
              />
            )}
          </div>
        )}

        {/* VIEW: EVENTS ONLY (АФИША) */}
        {currentView === 'events' && (
          <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
            <button
              onClick={() => setCurrentView('home')}
              className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-4"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{currentLanguage === 'kg' ? 'Башкы бет' : currentLanguage === 'en' ? 'Home' : 'Главная'}</span>
            </button>
            <EventsFeed
              currentLanguage={currentLanguage}
              events={eventsList}
              onSelectAnnouncement={setActiveNoticeDetail}
              onOpenFullCalendar={() => setCurrentView('calendar')}
            />
          </div>
        )}

        {/* VIEW: CITIES DIRECTORY */}
        {currentView === 'cities' && (
          <CitiesPage
            currentLanguage={currentLanguage}
            announcements={announcements}
            onSelectCityFilter={(cityId) => {
              setSelectedCity(cityId);
              setCurrentView('home');
            }}
            onSelectAnnouncement={setActiveNoticeDetail}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* VIEW: ORGANIZATIONS & PRICING */}
        {(currentView === 'organizations' || currentView === 'pricing') && (
          <OrganizationsPage
            currentLanguage={currentLanguage}
            onOpenPublish={() => (role === 'admin' ? setIsAdminOpen(true) : setAccountMode('publish'))}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* О проекте, источники, правила, конфиденциальность, контакты */}
        {(['about', 'sources', 'privacy', 'rules', 'contacts'] as const).includes(currentView as InfoView) && (
          <InfoPage view={currentView as InfoView} lang={currentLanguage} onNavigate={setCurrentView} />
        )}
      </main>

      {/* Footer */}
      <Footer currentLanguage={currentLanguage} onNavigate={setCurrentView} onOpenAccount={() => setAccountMode('cabinet')} />

      {/* Ассистент DataNews AI — на всех страницах */}
      <ErrorBoundary
        onError={() => {
          try {
            sessionStorage.removeItem('datanews_chat_v1');
          } catch {
            /* нет доступа к хранилищу */
          }
        }}
        fallback={(reset, error) => (
          <button onClick={reset} title={error} className="fixed bottom-4 right-4 z-[90] inline-flex flex-col items-start px-4 py-3 rounded-2xl bg-[#12327A] text-white font-bold shadow-xl max-w-[90vw]">
            <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined" aria-hidden="true">
              refresh
            </span>
            {currentLanguage === 'kg' ? 'Чатты кайра ачуу' : currentLanguage === 'en' ? 'Reopen chat' : 'Открыть чат заново'}
            </span>
            {error && <span className="text-[10px] font-normal text-white/70 text-left break-all">{error.slice(0, 160)}</span>}
          </button>
        )}
      >
      <ChatWidget
        lang={currentLanguage}
        announcements={announcements}
        onOpen={setActiveNoticeDetail}
        onNavigate={(nav) => {
          // Переходы из ответов бота: раздел, категория, регион или форма размещения
          if (nav.publish) {
            if (role === 'admin') setIsAdminOpen(true);
            else setAccountMode('publish');
            return;
          }
          if (nav.view) setCurrentView(nav.view);
          if (nav.category || nav.city) {
            setCurrentView('home');
            if (nav.category) setSelectedCategory(nav.category);
            if (nav.city) {
              setSelectedCategory('all');
              setSelectedCity(nav.city);
            }
            setTimeout(() => document.getElementById(nav.category ? 'category-results' : 'events-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
          } else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
      </ErrorBoundary>

      {/* Modals & Overlays */}
      {/* 1. Full Announcement Detail Modal (Image 5 reference) */}
      {activeNoticeDetail && (
        <AnnouncementDetailModal
          announcement={activeNoticeDetail}
          currentLanguage={currentLanguage}
          onClose={() => setActiveNoticeDetail(null)}
          onSelectOtherNotice={(ann) => setActiveNoticeDetail(ann)}
          allAnnouncements={announcements}
        />
      )}

      {/* 2. Quick Search Popover */}
      {isSearchOpen && (
        <SearchModal
          currentLanguage={currentLanguage}
          announcements={announcements}
          onSelectAnnouncement={(ann) => {
            setActiveNoticeDetail(ann);
            setIsSearchOpen(false);
          }}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* Списки по показателям в шапке */}
      {statsMode && (
        <StatsPanel
          mode={statsMode}
          lang={currentLanguage}
          announcements={announcements.filter((a) => selectedCity === 'all' || a.city === selectedCity || a.city === 'all' || statsMode === 'regions')}
          onOpen={setActiveNoticeDetail}
          onClose={() => setStatsMode(null)}
        />
      )}

      {/* 3. Панель управления — только для администратора */}
      {isAdminOpen && (
        <AdminPortal
          currentLanguage={currentLanguage}
          onRefreshData={refreshData}
          onRoleChange={setRole}
          onClose={closeAdmin}
        />
      )}

      {/* 4. Личный кабинет гостя: регистрация, оплата, публикации на модерацию */}
      {accountMode && (
        <AccountPortal
          lang={currentLanguage}
          initialTab={accountMode}
          onRoleChange={setRole}
          onClose={() => setAccountMode(null)}
        />
      )}
    </div>
  );
}
