import React, { useState, useMemo } from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { StorageService } from '../services/storage';
import { EventImage } from './EventImage';
import { ticketLink } from '../utils/links';
import { MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT, formatDate } from '../utils/dates';
import { freshOrder, getAnnouncementDisplayStatus, getStatusBadgeConfig, isFresh } from '../utils/statusUtils';

interface EventsFeedProps {
  currentLanguage: Language;
  events: Announcement[];
  onSelectAnnouncement: (announcement: Announcement) => void;
  onOpenFullCalendar: () => void;
}

export const EventsFeed: React.FC<EventsFeedProps> = ({
  currentLanguage,
  events,
  onSelectAnnouncement,
  onOpenFullCalendar,
}) => {
  const { t } = getTranslation(currentLanguage);
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [statusTab, setStatusTab] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [favorites, setFavorites] = useState<string[]>(() => StorageService.getFavorites());
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = StorageService.toggleFavorite(id);
    setFavorites(updated);
  };

  // На кыргызском — полные названия («октябрь», «шейшемби»), на RU/EN — короткие («ОКТ», «ВТ»)
  const isKg = currentLanguage === 'kg';
  const getMonthLabel = (d: Date) => (isKg ? MONTHS.kg[d.getMonth()] : MONTHS_SHORT[currentLanguage][d.getMonth()]);
  const getWeekdayLabel = (d: Date) => (isKg ? WEEKDAYS.kg[d.getDay()] : WEEKDAYS_SHORT[currentLanguage][d.getDay()]);

  // Filter events according to status tab so past events are never mistaken for upcoming events
  const filteredEvents = useMemo(() => {
    const byStartDesc = (a: Announcement, b: Announcement) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    // Актуальные — без старых новостей и прошедших событий, свежее — выше
    if (statusTab === 'upcoming') return events.filter((item) => isFresh(item)).sort((a, b) => freshOrder(a, b));
    if (statusTab === 'completed') return events.filter((item) => !isFresh(item)).sort(byStartDesc);
    return [...events].sort(byStartDesc);
  }, [events, statusTab]);

  return (
    <div>
      {/* Section Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[#00897b] text-xs font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{t('sections.upcomingSubtitle')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f1b33] tracking-tight">
            {t('sections.upcomingTitle')}
          </h2>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setDisplayMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              displayMode === 'list'
                ? 'bg-white text-[#12327A] shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_list</span>
            <span className="hidden sm:inline">{t('views.list')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              displayMode === 'grid'
                ? 'bg-white text-[#12327A] shadow-sm'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span className="hidden sm:inline">{t('views.grid')}</span>
          </button>
          <button
            type="button"
            onClick={onOpenFullCalendar}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-black transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span className="hidden sm:inline">{t('views.calendar')}</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Status Filter Tabs (Ensures past events are not shown as upcoming) */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setStatusTab('upcoming')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            statusTab === 'upcoming'
              ? 'bg-[#12327A] text-white shadow-2xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#20C7B5]" />
          <span>{currentLanguage === 'kg' ? 'Жаңы жана актуалдуу' : currentLanguage === 'en' ? 'Latest & current' : 'Свежие и актуальные'}</span>
        </button>
        <button
          onClick={() => setStatusTab('completed')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            statusTab === 'completed'
              ? 'bg-[#12327A] text-white shadow-2xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span>{currentLanguage === 'kg' ? 'Архив' : currentLanguage === 'en' ? 'Archive' : 'Архив'}</span>
        </button>
      </div>

      {/* Events List / Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
          <span className="material-symbols-outlined text-gray-400 text-4xl mb-2">event_busy</span>
          <p className="text-gray-600 font-medium">
            {currentLanguage === 'kg'
              ? 'Бул категорияда азырынча окуялар жок'
              : currentLanguage === 'en'
              ? 'No events found for this filter'
              : 'В данной категории пока нет событий'}
          </p>
        </div>
      ) : displayMode === 'list' ? (
        <div className="space-y-4">
          {filteredEvents.slice(0, visibleCount).map((item) => {
            const startDate = new Date(item.startDate);
            const isFav = favorites.includes(item.id);
            const dayNum = String(startDate.getDate()).padStart(2, '0');
            const monthStr = getMonthLabel(startDate);
            const weekdayStr = getWeekdayLabel(startDate);

            const displayStatus = getAnnouncementDisplayStatus(item);
            const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);

            const title = item.title[currentLanguage] || item.title.ru;
            const location = item.location[currentLanguage] || item.location.ru;
            const price = item.eventDetails?.priceText
              ? item.eventDetails.priceText[currentLanguage] || item.eventDetails.priceText.ru
              : null;

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnnouncement(item)}
                className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 sm:gap-5 group cursor-pointer border ${
                  displayStatus === 'completed'
                    ? 'border-gray-200 opacity-85'
                    : 'border-gray-100'
                }`}
              >
                {/* Фото / афиша события с датой поверх */}
                <div className="relative w-full sm:w-44 flex-shrink-0">
                  <EventImage item={item} lang={currentLanguage} className="w-full h-40 sm:h-full sm:min-h-32 rounded-xl" />
                  <div className="absolute top-2 left-2 rounded-lg bg-white/95 px-2 py-1 text-center shadow-sm">
                    <div className="text-xl font-black text-[#12327A] leading-none">{dayNum}</div>
                    {isKg ? (
                      <div className="text-[11px] font-bold text-gray-600 leading-tight">
                        <div>{monthStr}</div>
                        <div className="font-semibold text-gray-500">{weekdayStr}</div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold uppercase text-gray-500">
                        {monthStr} • {weekdayStr}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Event Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44] text-[11px] font-bold">
                          {t(`categories.${item.category}`)}
                        </span>

                        {/* Distinct Status Pill */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </span>

                        {item.eventDetails?.timeRange && (
                          <span className="text-xs text-gray-400 font-medium">
                            {item.eventDetails.timeRange}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleFav(e, item.id)}
                        aria-label="Save Favorite"
                        className={`p-1 transition-colors ${
                          isFav ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isFav ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[#0f1b33] mb-2 group-hover:text-[#12327A] transition-colors leading-snug">
                      {title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-gray-500 text-xs sm:text-sm mb-3">
                      <span className="material-symbols-outlined text-[#00897b] text-[18px] flex-shrink-0">
                        location_on
                      </span>
                      <span className="truncate">{location}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-2">
                    <div className="flex items-center gap-2">
                      {price && (
                        <span className="text-xs font-bold text-[#12327A] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {price}
                        </span>
                      )}
                      {ticketLink(item).verified && ticketLink(item).url && (
                        <a
                          href={ticketLink(item).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-extrabold text-[#002f29] bg-[#20C7B5] hover:bg-[#1bb3a2] px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                          {currentLanguage === 'kg' ? 'Билеттерди сатып алуу' : currentLanguage === 'en' ? 'Buy tickets' : 'Купить билет'}
                        </a>
                      )}
                      {item.eventDetails?.organizer && (
                        <span className="text-xs text-gray-400 hidden sm:inline">
                          {item.eventDetails.organizer}
                        </span>
                      )}
                    </div>

                    <span className="px-3.5 py-1.5 rounded-xl bg-[#f0f4fc] text-[#12327A] group-hover:bg-[#12327A] group-hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1">
                      <span>{currentLanguage === 'kg' ? 'Толугураак' : currentLanguage === 'en' ? 'More details' : 'Подробнее'}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid Display Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.slice(0, visibleCount).map((item) => {
            const startDate = new Date(item.startDate);
            const isFav = favorites.includes(item.id);
            const dayNum = String(startDate.getDate()).padStart(2, '0');
            const monthStr = getMonthLabel(startDate);
            const weekdayStr = getWeekdayLabel(startDate);

            const displayStatus = getAnnouncementDisplayStatus(item);
            const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);

            const title = item.title[currentLanguage] || item.title.ru;
            const location = item.location[currentLanguage] || item.location.ru;
            const price = item.eventDetails?.priceText
              ? item.eventDetails.priceText[currentLanguage] || item.eventDetails.priceText.ru
              : null;

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnnouncement(item)}
                className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer border ${
                  displayStatus === 'completed'
                    ? 'border-gray-200 opacity-85'
                    : 'border-gray-100'
                }`}
              >
                <div>
                  <EventImage item={item} lang={currentLanguage} className="w-full h-36 rounded-xl mb-3" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#f3f6fc] group-hover:bg-[#12327A] group-hover:text-white transition-colors px-2.5 py-1 rounded-lg text-center font-bold text-[#12327A] text-xs">
                        <span>{isKg ? formatDate(startDate, 'kg') : `${dayNum} ${monthStr} ${startDate.getFullYear()}`}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44] text-[10px] font-bold">
                        {t(`categories.${item.category}`)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleFav(e, item.id)}
                      className={`p-1 ${isFav ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isFav ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>
                  </div>

                  <div className="mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0f1b33] mb-2 group-hover:text-[#12327A] transition-colors leading-snug">
                    {title}
                  </h3>

                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <span className="material-symbols-outlined text-[16px] text-[#00897b]">location_on</span>
                    <span className="truncate">{location}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#12327A]">{price || ''}</span>
                  <span className="font-semibold text-gray-500 group-hover:text-[#12327A] inline-flex items-center gap-1">
                    <span>{t('nav.more')}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredEvents.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 6)}
            className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-[#12327A] hover:bg-gray-50 font-bold text-xs sm:text-sm shadow-2xs transition-all inline-flex items-center gap-2"
          >
            <span>{t('sections.loadMore')}</span>
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
};
