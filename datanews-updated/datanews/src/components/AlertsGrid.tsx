import React from 'react';
import { Announcement, Language, CityId } from '../types';
import { getTranslation } from '../locales/translations';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';

interface AlertsGridProps {
  currentLanguage: Language;
  alerts: Announcement[];
  selectedCity: CityId;
  onCityFilterChange: (city: CityId) => void;
  onSelectAnnouncement: (announcement: Announcement) => void;
}

export const AlertsGrid: React.FC<AlertsGridProps> = ({
  currentLanguage,
  alerts,
  selectedCity,
  onCityFilterChange,
  onSelectAnnouncement,
}) => {
  const { t } = getTranslation(currentLanguage);

  const getUrgencyConfig = (ann: Announcement) => {
    const displayStatus = getAnnouncementDisplayStatus(ann);

    if (displayStatus === 'completed') {
      return {
        barColor: 'bg-gray-400',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        badgeLabel: currentLanguage === 'kg' ? 'Аяктады / Архив' : currentLanguage === 'en' ? 'Completed Works' : 'Завершено / Архив',
        icon: 'task_alt',
        iconColor: 'text-gray-500',
        btnText: currentLanguage === 'kg' ? 'Маалымат' : currentLanguage === 'en' ? 'Details' : 'Подробнее',
      };
    }

    if (displayStatus === 'cancelled') {
      return {
        barColor: 'bg-red-400',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        badgeLabel: currentLanguage === 'kg' ? 'Жокко чыгарылды' : currentLanguage === 'en' ? 'Cancelled' : 'Отменено',
        icon: 'cancel',
        iconColor: 'text-red-500',
        btnText: currentLanguage === 'kg' ? 'Себеби' : currentLanguage === 'en' ? 'Reason' : 'Причина',
      };
    }

    if (displayStatus === 'rescheduled') {
      return {
        barColor: 'bg-amber-400',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        badgeLabel: currentLanguage === 'kg' ? 'Жылдырылды' : currentLanguage === 'en' ? 'Rescheduled' : 'Перенесено',
        icon: 'update',
        iconColor: 'text-amber-600',
        btnText: currentLanguage === 'kg' ? 'Жаңы дата' : currentLanguage === 'en' ? 'New Date' : 'Новая дата',
      };
    }

    if (ann.urgency === 'emergency') {
      return {
        barColor: 'bg-[#dc2626]',
        badgeBg: 'bg-[#fee2e2]',
        badgeText: 'text-[#991b1b]',
        badgeLabel: currentLanguage === 'kg' ? 'Шашылыш / Авария' : currentLanguage === 'en' ? 'Urgent / Outage' : 'Срочно / Авария',
        icon: 'warning',
        iconColor: 'text-[#dc2626]',
        btnText: t('nav.more'),
      };
    }

    if (ann.category === 'roads' || ann.category === 'repairs') {
      return {
        barColor: 'bg-[#00897b]',
        badgeBg: 'bg-[#d0f7f2]',
        badgeText: 'text-[#004d44]',
        badgeLabel: currentLanguage === 'kg' ? 'Кыймыл схемасы' : currentLanguage === 'en' ? 'Detour Route' : 'Схема движения',
        icon: 'alt_route',
        iconColor: 'text-[#00897b]',
        btnText: currentLanguage === 'kg' ? 'Айланып өтүү схемасы' : currentLanguage === 'en' ? 'Detour Route' : 'Схема объезда',
      };
    }

    return {
      barColor: 'bg-[#d97706]',
      badgeBg: 'bg-[#ffedd5]',
      badgeText: 'text-[#7c2d12]',
      badgeLabel: currentLanguage === 'kg' ? 'Пландуу иштер' : currentLanguage === 'en' ? 'Scheduled Works' : 'Плановые работы',
      icon: 'engineering',
      iconColor: 'text-[#d97706]',
      btnText: currentLanguage === 'kg' ? 'Көчөлөр графиги' : currentLanguage === 'en' ? 'Street Schedule' : 'График улиц',
    };
  };

  return (
    <section className="w-full py-8 md:py-12 bg-white" id="alerts-feed">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#dc2626] text-[24px]">
                notification_important
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0f1b33]">
                {t('sections.urgentAlertsTitle')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              {t('sections.urgentAlertsSubtitle')}
            </p>
          </div>

          {/* Geo Scope Toggle */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onCityFilterChange('bishkek')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCity === 'bishkek'
                  ? 'bg-white text-[#12327A] shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {t('cities.bishkek')}
            </button>
            <button
              type="button"
              onClick={() => onCityFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCity === 'all'
                  ? 'bg-white text-[#12327A] shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {t('cities.all')}
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-[#f8fafc] rounded-2xl border border-gray-100 p-6">
            <span className="material-symbols-outlined text-gray-400 text-4xl mb-2">check_circle</span>
            <p className="text-gray-600 font-medium">
              {currentLanguage === 'kg'
                ? 'Бул категория же шаар боюнча активдүү авариялык эскертүүлөр жок.'
                : currentLanguage === 'en'
                ? 'No active disruptions found for this category or region.'
                : 'По выбранным критериям срочных предупреждений не обнаружено.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {alerts.slice(0, 6).map((ann) => {
              const cfg = getUrgencyConfig(ann);
              const displayStatus = getAnnouncementDisplayStatus(ann);
              const statusCfg = getStatusBadgeConfig(displayStatus, currentLanguage);

              const title = ann.title[currentLanguage] || ann.title.ru;
              const summary = ann.summary[currentLanguage] || ann.summary.ru;
              const location = ann.location[currentLanguage] || ann.location.ru;

              return (
                <article
                  key={ann.id}
                  onClick={() => onSelectAnnouncement(ann)}
                  className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between border cursor-pointer group ${
                    displayStatus === 'completed'
                      ? 'border-gray-200 opacity-90'
                      : 'border-gray-100'
                  }`}
                >
                  {/* Left Colored Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.barColor}`} />

                  <div className="pl-1">
                    {/* Card Header Badge & Lifecycle Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${cfg.badgeBg} ${cfg.badgeText} text-[11px] font-bold uppercase tracking-wide`}
                      >
                        {ann.urgency === 'emergency' && displayStatus === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-ping" />
                        )}
                        <span className={`material-symbols-outlined text-[14px] ${cfg.iconColor}`}>
                          {cfg.icon}
                        </span>
                        <span>{cfg.badgeLabel}</span>
                      </span>

                      {/* Explicit Status Pill (Active / Upcoming / Completed / Cancelled / Rescheduled) */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <h3 className="text-base sm:text-[17px] font-bold text-[#0f1b33] mb-2 leading-snug group-hover:text-[#12327A] transition-colors">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-2">
                      {summary}
                    </p>

                    {/* Metadata Box with 2026 Dates */}
                    <div className="space-y-2 mb-4 bg-[#f8fafc] p-3 rounded-xl border border-gray-100 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-[#0f1b33]">
                        <span className={`material-symbols-outlined ${cfg.iconColor} text-[18px]`}>
                          {ann.category === 'electricity'
                            ? 'bolt'
                            : ann.category === 'water'
                            ? 'water_drop'
                            : 'event_busy'}
                        </span>
                        <span className="truncate">
                          {new Date(ann.startDate).toLocaleDateString(
                            currentLanguage === 'en' ? 'en-US' : 'ru-RU',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                          ,{' '}
                          {new Date(ann.startDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          —{' '}
                          {new Date(ann.endDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="material-symbols-outlined text-gray-400 text-[18px] flex-shrink-0">
                          location_on
                        </span>
                        <span className="truncate">{location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Agency Source & CTA */}
                  <div className="pl-1 pt-2 flex items-center justify-between mt-auto border-t border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-[#12327A] flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-blue-100">
                        {ann.sourceOrgType || 'KG'}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[140px]">
                        {ann.sourceName}
                      </span>
                    </div>

                    <span className="px-3 py-1.5 rounded-lg bg-[#f0f4fc] text-[#12327A] group-hover:bg-[#12327A] group-hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1">
                      <span>{cfg.btnText}</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
