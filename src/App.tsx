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
import { StorageService } from './services/storage';
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
  const [calendarSelectedDate, setCalendarSelectedDate] = useState('2026-10-10');

  // Data Store
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Modals
  const [activeNoticeDetail, setActiveNoticeDetail] = useState<Announcement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Load persistent announcements on mount
  const refreshData = () => {
    const list = StorageService.getAnnouncements();
    setAnnouncements(list);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // City filter
      if (selectedCity !== 'all' && item.city !== selectedCity) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Dynamic real-time date filters for October 2026
      const itemStart = item.startDate.split('T')[0];
      const itemEnd = item.endDate ? item.endDate.split('T')[0] : itemStart;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const tomDate = new Date(now);
      tomDate.setDate(now.getDate() + 1);
      const tomorrowStr = `${tomDate.getFullYear()}-${String(tomDate.getMonth() + 1).padStart(2, '0')}-${String(tomDate.getDate()).padStart(2, '0')}`;

      if (dateFilter === 'today') {
        const isToday = itemStart === todayStr || (itemStart <= todayStr && itemEnd >= todayStr);
        if (!isToday) return false;
      } else if (dateFilter === 'tomorrow') {
        const isTomorrow = itemStart === tomorrowStr || (itemStart <= tomorrowStr && itemEnd >= tomorrowStr);
        if (!isTomorrow) return false;
      } else if (dateFilter === 'weekend') {
        // Weekend is October 10–11, 2026
        const isWeekend =
          itemStart === '2026-10-10' ||
          itemStart === '2026-10-11' ||
          (itemStart <= '2026-10-11' && itemEnd >= '2026-10-10');
        if (!isWeekend) return false;
      } else if (dateFilter === 'week') {
        // Current demonstration week in October 2026
        const inWeek = itemStart >= '2026-10-05' && itemStart <= '2026-10-18';
        if (!inWeek) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleRu = item.title.ru.toLowerCase();
        const titleKg = (item.title.kg || '').toLowerCase();
        const titleEn = (item.title.en || '').toLowerCase();
        const loc = item.location.ru.toLowerCase();
        const proto = item.protocolCode.toLowerCase();
        const sum = item.summary.ru.toLowerCase();

        if (
          !titleRu.includes(q) &&
          !titleKg.includes(q) &&
          !titleEn.includes(q) &&
          !loc.includes(q) &&
          !proto.includes(q) &&
          !sum.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [announcements, selectedCity, selectedCategory, dateFilter, searchQuery]);

  // Split into Alerts vs Events
  const alertsList = useMemo(() => {
    return filteredAnnouncements.filter(
      (a) =>
        a.urgency === 'emergency' ||
        a.urgency === 'planned' ||
        a.category === 'roads' ||
        a.category === 'water' ||
        a.category === 'electricity' ||
        a.category === 'repairs'
    );
  }, [filteredAnnouncements]);

  const eventsList = useMemo(() => {
    return filteredAnnouncements.filter(
      (a) =>
        a.urgency === 'event' ||
        a.category === 'concerts' ||
        a.category === 'festivals' ||
        a.category === 'education' ||
        a.category === 'gov'
    );
  }, [filteredAnnouncements]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const baseList = selectedCity === 'all'
      ? announcements
      : announcements.filter((a) => a.city === selectedCity);

    const counts: Record<CategoryId, number> = {
      all: baseList.length,
      water: baseList.filter((a) => a.category === 'water').length,
      electricity: baseList.filter((a) => a.category === 'electricity').length,
      roads: baseList.filter((a) => a.category === 'roads').length,
      repairs: baseList.filter((a) => a.category === 'repairs').length,
      concerts: baseList.filter((a) => a.category === 'concerts').length,
      festivals: baseList.filter((a) => a.category === 'festivals').length,
      education: baseList.filter((a) => a.category === 'education').length,
      gov: baseList.filter((a) => a.category === 'gov').length,
    };
    return counts;
  }, [announcements, selectedCity]);

  // Handler to open the primary urgent notice (Kyiv street closure from Image 5)
  const handleOpenUrgentKyivNotice = () => {
    const kyivNotice =
      announcements.find((a) => a.id === 'ann-kyiv-street-closure') ||
      announcements[0];
    if (kyivNotice) {
      setActiveNoticeDetail(kyivNotice);
    }
  };

  const handleTagClick = (tag: string) => {
    if (tag.includes('Света') || tag.includes('Өчүрүү')) {
      setSelectedCategory('electricity');
    } else if (tag.includes('Дорог') || tag.includes('Жол')) {
      setSelectedCategory('roads');
    } else if (tag.includes('Концерт')) {
      setSelectedCategory('concerts');
    } else if (tag.includes('Ярмарк')) {
      setSelectedCategory('festivals');
    } else if (tag.includes('Бишкек')) {
      setSelectedCity('bishkek');
    } else if (tag.includes('Ош')) {
      setSelectedCity('osh');
    }
    setSearchQuery('');
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
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main Content Area (padding-top accounts for header + urgent ticker) */}
      <main className="flex-1 w-full pt-[90px] sm:pt-[94px]">
        {/* VIEW: HOME */}
        {currentView === 'home' && (
          <div className="w-full flex flex-col">
            {/* Urgent Real-Time Alert Ticker Bar */}
            <UrgentTicker
              currentLanguage={currentLanguage}
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
              totalEventsCount={eventsList.length + alertsList.length}
              totalAlertsCount={alertsList.length}
            />

            {/* Quick Category Filter Chips Bar */}
            <CategoryChips
              currentLanguage={currentLanguage}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categoryCounts={categoryCounts}
            />

            {/* Urgent & Important Alerts Section */}
            <AlertsGrid
              currentLanguage={currentLanguage}
              alerts={alertsList}
              selectedCity={selectedCity}
              onCityFilterChange={setSelectedCity}
              onSelectAnnouncement={setActiveNoticeDetail}
            />

            {/* Upcoming Events Feed & Interactive Calendar Mosaic */}
            <section className="w-full py-10 sm:py-14 bg-[#eef2f9] border-t border-gray-200">
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

            {/* Browse by City / Regional Portals Mosaic */}
            <CityMosaic
              currentLanguage={currentLanguage}
              onSelectCity={(cityId) => {
                setSelectedCity(cityId);
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              onOpenAllCities={() => setCurrentView('cities')}
            />

            {/* For Municipalities & Organizations Section */}
            <ForOrganizationsSection
              currentLanguage={currentLanguage}
              onOpenPublish={() => setIsAdminOpen(true)}
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
              <span>Главная</span>
            </button>
            <CategoryChips
              currentLanguage={currentLanguage}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categoryCounts={categoryCounts}
            />
            <AlertsGrid
              currentLanguage={currentLanguage}
              alerts={alertsList}
              selectedCity={selectedCity}
              onCityFilterChange={setSelectedCity}
              onSelectAnnouncement={setActiveNoticeDetail}
            />
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
              <span>Главная</span>
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
            onOpenPublish={() => setIsAdminOpen(true)}
            onBackToHome={() => setCurrentView('home')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer currentLanguage={currentLanguage} onNavigate={setCurrentView} />

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

      {/* 3. Secure Admin Portal Modal */}
      {isAdminOpen && (
        <AdminPortal
          currentLanguage={currentLanguage}
          announcements={announcements}
          onRefreshData={refreshData}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}
