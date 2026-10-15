import { EventImage } from './EventImage';
import React, { useState } from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { alertLevel, isAlert } from '../utils/urgency';
import { formatDate, formatMonthYear, formatTime } from '../utils/dates';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';

interface InteractiveCalendarProps {
  currentLanguage: Language;
  announcements: Announcement[];
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  onSelectAnnouncement: (announcement: Announcement) => void;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({
  currentLanguage,
  announcements,
  selectedDate,
  onSelectDate,
  onSelectAnnouncement,
}) => {
  const { t } = getTranslation(currentLanguage);

  // Dynamic real-time calendar initialization: defaults to current year (2026) and current month (October = 9)
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth()); // 9 = October


  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate dynamic days for calendar:
  // For October 2026: October 1, 2026 is Thursday (getDay() = 4; index 3 in 0=Mon..6=Sun)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is 0 (Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6)
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Find announcements map by date string 'YYYY-MM-DD' (handling multi-day ranges)
  const itemsByDate: Record<string, Announcement[]> = {};
  announcements.forEach((ann) => {
    const startStr = ann.startDate.split('T')[0];
    const endStr = ann.endDate ? ann.endDate.split('T')[0] : startStr;

    // Index start date
    if (!itemsByDate[startStr]) itemsByDate[startStr] = [];
    if (!itemsByDate[startStr].some((x) => x.id === ann.id)) {
      itemsByDate[startStr].push(ann);
    }

    // Index subsequent days if multi-day
    if (endStr && endStr !== startStr) {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const cur = new Date(s);
      cur.setDate(cur.getDate() + 1);
      while (cur <= e) {
        const curStr = cur.toISOString().split('T')[0];
        if (!itemsByDate[curStr]) itemsByDate[curStr] = [];
        if (!itemsByDate[curStr].some((x) => x.id === ann.id)) {
          itemsByDate[curStr].push(ann);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  // Filter items for currently selected date
  const selectedItems = itemsByDate[selectedDate] || [];

  // Parse selectedDate safely without timezone shift
  const [selY, selM, selD] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(selY, (selM || 1) - 1, selD || 1);

  // Today string
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-28">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-base sm:text-lg font-bold text-[#0f1b33] block">
            {formatMonthYear(currentYear, currentMonth, currentLanguage)}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {t('views.calendarHelp')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Weekday Names (Monday-start) */}
      <div
        className="grid grid-cols-7 gap-1 text-center font-bold text-gray-400 mb-2 text-[11px] uppercase tracking-wider"
      >
        {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((d) => (
          <span
            key={d}
            className={d === 'sat' || d === 'sun' ? 'text-[#dc2626]' : ''}
                title={t(`daysFull.${d}`)}
          >
            {t(`days.${d}`)}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
        {/* Days from previous month */}
        {Array.from({ length: startOffset }).map((_, idx) => {
          const prevDayNum = daysInPrevMonth - startOffset + idx + 1;
          return (
            <span key={`prev-${idx}`} className="py-2 text-gray-300 font-medium select-none">
              {prevDayNum}
            </span>
          );
        })}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const padMonth = String(currentMonth + 1).padStart(2, '0');
          const padDay = String(dayNum).padStart(2, '0');
          const dateStr = `${currentYear}-${padMonth}-${padDay}`;
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const dayItems = itemsByDate[dateStr] || [];

          // Красная мигающая точка — срочное предупреждение (0–3 дня), жёлтая — предупреждение позже, бирюзовая — событие
          const hasEmergency = dayItems.some((i) => alertLevel(i) === 'urgent');
          const hasPlanned = dayItems.some((i) => alertLevel(i) === 'soon');
          const hasEvent = dayItems.some((i) => !isAlert(i) && i.status !== 'cancelled');

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`py-1.5 rounded-xl font-bold relative flex flex-col items-center transition-all ${
                isSelected
                  ? 'bg-[#12327A] text-white shadow-sm ring-2 ring-[#12327A]/20'
                  : isToday
                  ? 'bg-blue-50 text-[#12327A] ring-1 ring-[#20C7B5]'
                  : 'text-gray-700 hover:bg-[#eef2f9]'
              }`}
            >
              <span>{dayNum}</span>

              {/* Indicator Dots */}
              <span className="flex items-center gap-0.5 mt-0.5 h-1.5">
                {hasEmergency && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full dn-urgent-blink ${
                      isSelected ? 'bg-red-300' : 'bg-red-600'
                    }`}
                  />
                )}
                {hasPlanned && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-amber-200' : 'bg-amber-400'
                    }`}
                  />
                )}
                {hasEvent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-[#68f9e5]' : 'bg-[#20C7B5]'
                    }`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar Color Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mb-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span>{t('views.legendEmergency')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{t('views.legendPlanned')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#20C7B5]" />
          <span>{t('views.legendEvents')}</span>
        </span>
      </div>

      {/* Selected Day Summary Box */}
      <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#12327A]">
            {t('views.selectedDate')}:{' '}
            {formatDate(selectedDateObj, currentLanguage)}
          </span>
          <span className="text-[11px] font-semibold text-gray-400">
            {selectedItems.length} {t('views.recordsCount')}
          </span>
        </div>

        {selectedItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            {currentLanguage === 'kg'
              ? 'Бул күнгө катталган окуялар жок'
              : currentLanguage === 'en'
              ? 'No registered notices on this date'
              : 'На выбранную дату нет зарегистрированных событий'}
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map((item) => {
              const displayStatus = getAnnouncementDisplayStatus(item);
              const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);

              const dotColor =
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
                  : 'bg-[#20C7B5]';

              return (
                <li
                  key={item.id}
                  onClick={() => onSelectAnnouncement(item)}
                  className="p-2.5 rounded-lg bg-white shadow-2xs hover:shadow-sm border border-gray-100 flex items-start gap-2.5 text-xs cursor-pointer group transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <EventImage item={item} lang={currentLanguage} compact className="w-14 h-11 rounded-md" />
                    <span className={`absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${dotColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="font-semibold text-[#0f1b33] leading-snug group-hover:text-[#12327A] truncate">
                        {item.title[currentLanguage] || item.title.ru}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex-shrink-0 ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span>
                        {formatTime(item.startDate)}
                        {item.district ? ` • ${item.district}` : ''}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {t(`categories.${item.category}`)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
