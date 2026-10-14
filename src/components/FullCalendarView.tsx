import React, { useState } from 'react';
import { Announcement, CategoryId, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { alertLevel } from '../utils/urgency';
import { formatDateLong, formatMonthYear, formatTime } from '../utils/dates';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';

interface FullCalendarViewProps {
  currentLanguage: Language;
  announcements: Announcement[];
  onSelectAnnouncement: (ann: Announcement) => void;
  onBackToHome: () => void;
}

export const FullCalendarView: React.FC<FullCalendarViewProps> = ({
  currentLanguage,
  announcements,
  onSelectAnnouncement,
  onBackToHome,
}) => {
  const { t } = getTranslation(currentLanguage);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => now.getMonth()); // 9 = October
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear()); // 2026
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedCity, setSelectedCity] = useState<CityId>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; });

  // Filter announcements
  const filtered = announcements.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (selectedCity !== 'all' && a.city !== selectedCity) return false;
    return true;
  });

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  // Monday is index 0
  const startOffset = (firstDay + 6) % 7;

  // Group by date (handling multi-day spans)
  const eventsByDay: Record<string, Announcement[]> = {};
  filtered.forEach((a) => {
    const startStr = a.startDate.split('T')[0];
    const endStr = a.endDate ? a.endDate.split('T')[0] : startStr;

    if (!eventsByDay[startStr]) eventsByDay[startStr] = [];
    if (!eventsByDay[startStr].some((x) => x.id === a.id)) {
      eventsByDay[startStr].push(a);
    }

    if (endStr && endStr !== startStr) {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const cur = new Date(s);
      cur.setDate(cur.getDate() + 1);
      while (cur <= e) {
        const curStr = cur.toISOString().split('T')[0];
        if (!eventsByDay[curStr]) eventsByDay[curStr] = [];
        if (!eventsByDay[curStr].some((x) => x.id === a.id)) {
          eventsByDay[curStr].push(a);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  const selectedDayItems = eventsByDay[selectedDateStr] || [];

  const [sy, sm, sd] = selectedDateStr.split('-').map(Number);
  const selectedDateObj = new Date(sy, (sm || 1) - 1, sd || 1);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBackToHome}
            className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-2"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{t('nav.home')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1b33]">
            {t('nav.calendar')} — {formatMonthYear(selectedYear, selectedMonth, currentLanguage)}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            {t('appSlogan')}
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
          <button
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <span className="font-bold text-sm px-3 text-[#0f1b33]">
            {formatMonthYear(selectedYear, selectedMonth, currentLanguage)}
          </span>
          <button
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {t('search.whereLabel')}
          </span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value as CityId)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#20C7B5]"
          >
            <option value="all">{t('cities.all')}</option>
            <option value="bishkek">{t('cities.bishkek')}</option>
            <option value="osh">{t('cities.osh')}</option>
            <option value="jalalabad">{t('cities.jalalabad')}</option>
            <option value="karakol">{t('cities.karakol')}</option>
            <option value="talas">{t('cities.talas')}</option>
            <option value="naryn">{t('cities.naryn')}</option>
            <option value="batken">{t('cities.batken')}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {t('search.whatLabel')}
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CategoryId)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#20C7B5]"
          >
            <option value="all">{t('categories.all')}</option>
            <option value="roads">{t('categories.roads')}</option>
            <option value="water">{t('categories.water')}</option>
            <option value="electricity">{t('categories.electricity')}</option>
            <option value="repairs">{t('categories.repairs')}</option>
            <option value="concerts">{t('categories.concerts')}</option>
            <option value="festivals">{t('categories.festivals')}</option>
            <option value="education">{t('categories.education')}</option>
            <option value="gov">{t('categories.gov')}</option>
          </select>
        </div>
      </div>

      {/* Main Calendar Matrix Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 8 cols monthly grid */}
        <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          {/* Weekday Header */}
          <div
            className={`grid grid-cols-7 gap-2 text-center font-extrabold text-gray-400 mb-3 ${
              currentLanguage === 'kg' ? 'text-[8px] sm:text-xs tracking-tighter sm:tracking-normal whitespace-nowrap max-sm:h-9 max-sm:items-end' : 'text-xs uppercase tracking-wider'
            }`}
          >
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((d) => (
              <span
                key={d}
                className={`${d === 'sat' || d === 'sun' ? 'text-[#dc2626]' : ''} ${
                  currentLanguage === 'kg' ? 'block max-sm:-rotate-[35deg] max-sm:origin-center max-sm:translate-y-1' : ''
                }`}
              >
                {t(`days.${d}`)}
              </span>
            ))}
          </div>

          {/* Month Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset tiles for previous month */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[88px] rounded-xl bg-gray-50/50 p-2 border border-dashed border-gray-100" />
            ))}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const padMonth = String(selectedMonth + 1).padStart(2, '0');
              const padDay = String(dayNum).padStart(2, '0');
              const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
              const items = eventsByDay[dateStr] || [];
              const isSelected = selectedDateStr === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[88px] rounded-xl p-2 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#12327A] bg-[#12327A]/5 shadow-sm ring-2 ring-[#12327A]/20'
                      : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-extrabold rounded-md w-6 h-6 flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#12327A] text-white'
                          : 'text-[#0f1b33]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-bold text-gray-400">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Micro list of item titles */}
                  <div className="space-y-1 overflow-hidden">
                    {items.slice(0, 2).map((item) => {
                      const displayStatus = getAnnouncementDisplayStatus(item);
                      const bgDot =
                        displayStatus === 'completed'
                          ? 'bg-gray-400'
                          : displayStatus === 'cancelled'
                          ? 'bg-red-500'
                          : displayStatus === 'rescheduled'
                          ? 'bg-amber-500'
                          : alertLevel(item) === 'urgent'
                          ? 'bg-red-600 dn-urgent-blink'
                          : alertLevel(item) === 'soon'
                          ? 'bg-amber-400'
                          : 'bg-[#00897b]';

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-1 text-[10px] text-gray-600 truncate"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${bgDot} flex-shrink-0`} />
                          <span className="truncate">
                            {item.title[currentLanguage] || item.title.ru}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Events Feed (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm sticky top-28">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <span className="text-[11px] font-bold text-[#00897b] uppercase tracking-wider block">
                {t('views.selectedDate')}
              </span>
              <h3 className="font-extrabold text-base text-[#0f1b33]">
                {formatDateLong(selectedDateObj, currentLanguage)}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#12327A] font-bold text-xs">
              {selectedDayItems.length} {t('views.recordsCount')}
            </span>
          </div>

          {selectedDayItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="material-symbols-outlined text-3xl mb-1">calendar_today</span>
              <p className="text-xs">
                {currentLanguage === 'kg'
                  ? 'Бул күнгө жазуулар табылган жок'
                  : currentLanguage === 'en'
                  ? 'No records for this date'
                  : 'На эту дату записей не найдено'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDayItems.map((item) => {
                const displayStatus = getAnnouncementDisplayStatus(item);
                const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectAnnouncement(item)}
                    className="p-3.5 rounded-2xl bg-[#f8fafc] hover:bg-blue-50/50 border border-gray-100 transition-all cursor-pointer group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-gray-200 text-[#12327A]">
                          {t(`categories.${item.category}`)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-semibold">
                        {formatTime(item.startDate)}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#0f1b33] group-hover:text-[#12327A] transition-colors line-clamp-2 mb-1">
                      {item.title[currentLanguage] || item.title.ru}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{item.location[currentLanguage] || item.location.ru}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
