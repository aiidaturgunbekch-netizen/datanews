import React, { useState } from 'react';
import { Language, CityId, ViewMode, Announcement } from '../types';
import { getTranslation } from '../locales/translations';
import { Logo } from './Logo';

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
}) => {
  const { t } = getTranslation(currentLanguage);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cityLabels: Record<CityId, string> = {
    bishkek: t('cities.bishkek'),
    osh: t('cities.osh'),
    jalalabad: t('cities.jalalabad'),
    karakol: t('cities.karakol'),
    talas: t('cities.talas'),
    naryn: t('cities.naryn'),
    batken: t('cities.batken'),
    all: t('cities.all'),
  };

  const navItems: { view: ViewMode; label: string }[] = [
    { view: 'calendar', label: t('nav.calendar') },
    { view: 'alerts', label: t('nav.alerts') },
    { view: 'events', label: t('nav.events') },
    { view: 'cities', label: t('nav.cities') },
    { view: 'organizations', label: t('nav.forOrg') },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0d2459] shadow-[0_2px_12px_rgba(0,0,0,0.15)] text-white">
      {/* Main Bar */}
      <div className="h-16 max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center text-left focus:outline-none"
            aria-label="DataNews Home"
          >
            <Logo isLightMode={true} className="h-10" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onViewChange(item.view)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-[#dbe1ff] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: City Selector, Language Picker, Search, Post Button & Admin */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* City Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors border border-white/10"
              title="Выбрать город / Шаарды тандоо"
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
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('search.whereLabel')}
                  </div>
                  {(['all', 'bishkek', 'osh', 'jalalabad', 'karakol', 'talas', 'naryn', 'batken'] as CityId[]).map(
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

          {/* Languages: RU | KG | EN Switcher */}
          <div className="flex items-center bg-[#07173d] p-0.5 rounded-lg border border-white/10">
            {(['ru', 'kg', 'en'] as Language[]).map((lang) => {
              const isSelected = currentLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-2 py-1 rounded text-xs font-bold uppercase transition-all ${
                    isSelected
                      ? 'bg-[#20C7B5] text-[#002f29] shadow-sm'
                      : 'text-[#dbe1ff] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
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
            <button
              onClick={onOpenAccount}
              aria-label={t('nav.account')}
              title={t('nav.account')}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors border border-white/20 text-[#20C7B5]"
            >
              <span className="material-symbols-outlined text-[18px]">{role === 'user' ? 'account_circle' : 'person'}</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-white hover:bg-white/10 rounded-lg"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0a1e4a] border-t border-white/10 px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onViewChange(item.view);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                currentView === item.view ? 'bg-white/15 text-white' : 'text-[#dbe1ff] hover:bg-white/5'
              }`}
            >
              <span>{item.label}</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          ))}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => {
                onOpenPublish();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#20C7B5] text-[#002f29] font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>{t('nav.publishBtn')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
