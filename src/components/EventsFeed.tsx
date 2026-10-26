import React, { useEffect, useState, useMemo } from 'react';
import { Announcement, CityId, Language } from '../types';
import { DISTRICTS, inDistrict } from '../config/districts';
import { getTranslation } from '../locales/translations';
import { StorageService } from '../services/storage';
import { EventImage } from './EventImage';
import { PaidBadge } from './PaidBadge';
import { ticketLink } from '../utils/links';
import { MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT, formatDate, formatWhen } from '../utils/dates';
import { freshOrder, getAnnouncementDisplayStatus, getStatusBadgeConfig, isFresh } from '../utils/statusUtils';
import { placeText } from '../utils/place';

interface EventsFeedProps {
  currentLanguage: Language;
  events: Announcement[];
  /** Выбранный город/область — для фильтра по району */
  city?: CityId;
  onSelectAnnouncement: (announcement: Announcement) => void;
  onOpenFullCalendar: () => void;
}

export const EventsFeed: React.FC<EventsFeedProps> = ({
  currentLanguage,
  events: allEvents,
  city,
  onSelectAnnouncement,
  onOpenFullCalendar,
}) => {
  const { t } = getTranslation(currentLanguage);
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [statusTab, setStatusTab] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [favorites, setFavorites] = useState<string[]>(() => StorageService.getFavorites());
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Фильтр по району: список районов выбранной области, сброс при смене области
  const districtList = useMemo(() => (city && DISTRICTS[city]) || [], [city]);
  const [districtCode, setDistrictCode] = useState('');
  useEffect(() => {
    setDistrictCode('');
  }, [city]);
  const districtSel = districtList.find((d) => d.code === districtCode);
  const events = useMemo(() => (districtSel ? allEvents.filter((a) => inDistrict(a, districtSel)) : allEvents), [allEvents, districtSel]);

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
  const archivedCount = useMemo(() => events.filter((item) => !isFresh(item)).length, [events]);
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
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-1">{t('sections.upcomingSubtitle')}</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f1b33]">
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
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-1 text-xs">
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
        {districtList.length > 0 && (
          <select
            value={districtCode}
            onChange={(e) => {
              setDistrictCode(e.target.value);
              setVisibleCount(6);
            }}
            aria-label={currentLanguage === 'kg' ? 'Район' : currentLanguage === 'en' ? 'District' : 'Район'}
            className={`sm:ml-auto px-2 py-1.5 rounded-lg font-bold border max-w-full ${
              districtCode ? 'bg-[#12327A] text-white border-[#12327A]' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <option value="">{currentLanguage === 'kg' ? 'Баардык райондор' : currentLanguage === 'en' ? 'All districts' : 'Все районы'}</option>
            {districtList.map((d) => {
              const n = allEvents.filter((a) => inDistrict(a, d)).length;
              return (
                <option key={d.code} value={d.code}>
                  {(d[currentLanguage] || d.ru) + (n ? ` · ${n}` : '')}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Events List / Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
          <span className="material-symbols-outlined text-gray-500 text-4xl mb-2">event_busy</span>
          <p className="text-gray-600 font-medium">
            {currentLanguage === 'kg'
              ? 'Бул категорияда азырынча окуялар жок'
              : currentLanguage === 'en'
              ? 'No events found for this filter'
              : 'В данной категории пока нет событий'}
          </p>
          {districtSel && (
            <button
              type="button"
              onClick={() => setDistrictCode('')}
              className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-[#12327A] text-xs font-bold hover:bg-gray-200"
            >
              {currentLanguage === 'kg' ? 'Баардык райондорду көрсөтүү' : currentLanguage === 'en' ? 'Show all districts' : 'Показать все районы'}
            </button>
          )}
          {/* В актуальном пусто, а в архиве есть — подсказываем и даём перейти */}
          {statusTab === 'upcoming' && archivedCount > 0 && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-sm text-gray-500">
                {currentLanguage === 'kg'
                  ? `Архивде табылды: ${archivedCount}`
                  : currentLanguage === 'en'
                  ? `Found in the archive: ${archivedCount}`
                  : `Найдено в архиве: ${archivedCount}`}
              </p>
              <button
                type="button"
                onClick={() => setStatusTab('completed')}
                className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-xs font-bold hover:bg-[#0d2459]"
              >
                {currentLanguage === 'kg' ? 'Архивди көрсөтүү' : currentLanguage === 'en' ? 'Show archive' : 'Показать архив'}
              </button>
            </div>
          )}
        </div>
      ) : displayMode === 'list' ? (
        /* Список в стиле новостной ленты: строки без теней, маленькое фото справа, вся строка — ссылка на статью */
        <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200 px-4 sm:px-5">
          {filteredEvents.slice(0, visibleCount).map((item) => {
            const isFav = favorites.includes(item.id);
            const displayStatus = getAnnouncementDisplayStatus(item);
            const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);
            const title = item.title[currentLanguage] || item.title.ru;
            const location = placeText(item, currentLanguage);
            const price = item.eventDetails?.priceText
              ? item.eventDetails.priceText[currentLanguage] || item.eventDetails.priceText.ru
              : null;
            const tickets = ticketLink(item);

            return (
              <li key={item.id} className={`relative group flex gap-4 py-4 sm:py-5 ${displayStatus === 'completed' ? 'opacity-80' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-[11px] font-bold">
                    <span className="uppercase tracking-wider text-[#12327A]">{t(`categories.${item.category}`)}</span>
                    <span className={`inline-flex items-center gap-1 ${statusCfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                    <PaidBadge item={item} lang={currentLanguage} />
                  </div>
                  <h3 className="font-serif text-[17px] sm:text-xl font-semibold leading-snug text-[#0f1b33] line-clamp-3 [overflow-wrap:anywhere]">
                    {/* Растянутая ссылка: нажатие в любом месте строки открывает статью, работает и с клавиатуры */}
                    <button
                      type="button"
                      onClick={() => onSelectAnnouncement(item)}
                      className="text-left group-hover:text-[#12327A] group-hover:underline underline-offset-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#12327A] focus-visible:after:rounded-lg"
                    >
                      {title}
                    </button>
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-gray-600 [overflow-wrap:anywhere]">
                    <time dateTime={item.startDate}>{formatWhen(item.startDate, item.endDate, currentLanguage, false, item.timeTBA, item.allDay)}</time>
                    {location && <span> · {location}</span>}
                  </p>
                  {(price || (tickets.verified && tickets.url)) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {price && <span className="font-bold text-[#12327A]">{price}</span>}
                      {tickets.verified && tickets.url && (
                        <a
                          href={tickets.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 font-extrabold text-[#002f29] bg-[#20C7B5] hover:bg-[#1bb3a2] px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                          {currentLanguage === 'kg' ? 'Билет сатып алуу' : currentLanguage === 'en' ? 'Buy tickets' : 'Купить билет'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative shrink-0 flex flex-col items-end gap-2">
                  <EventImage item={item} lang={currentLanguage} compact className="w-24 h-[72px] sm:w-40 sm:h-[104px] rounded-lg" />
                  <button
                    type="button"
                    onClick={(e) => toggleFav(e, item.id)}
                    aria-label={currentLanguage === 'kg' ? 'Тандалгандарга' : currentLanguage === 'en' ? 'Save to favourites' : 'В избранное'}
                    aria-pressed={isFav}
                    className={`relative z-10 p-1 -m-1 transition-colors ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{isFav ? 'favorite' : 'favorite_border'}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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
            const location = placeText(item, currentLanguage);
            const price = item.eventDetails?.priceText
              ? item.eventDetails.priceText[currentLanguage] || item.eventDetails.priceText.ru
              : null;

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnnouncement(item)}
                className={`bg-white rounded-2xl p-5 hover:border-[#12327A]/30 transition-colors flex flex-col justify-between group cursor-pointer border ${
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
                    <PaidBadge item={item} lang={currentLanguage} />
                  </div>

                  <h3 className="font-serif text-lg font-semibold text-[#0f1b33] mb-2 group-hover:text-[#12327A] transition-colors leading-snug">
                    {title}
                  </h3>

                  {location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <span className="material-symbols-outlined text-[16px] text-[#00796b]">location_on</span>
                      <span className="truncate">{location}</span>
                    </p>
                  )}
                </div>

                {price && <div className="pt-3 border-t border-gray-100 text-xs font-bold text-[#12327A]">{price}</div>}
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
