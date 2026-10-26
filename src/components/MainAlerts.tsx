import React from 'react';
import { Announcement, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatWhen } from '../utils/dates';
import { UrgencyBadge } from './UrgencyBadge';
import { PushToggle } from './PushToggle';
import { placeText } from '../utils/place';

const T = {
  title: { ru: 'Предупреждения', kg: 'Эскертүүлөр', en: 'Warnings' },
  none: {
    ru: 'Сейчас действующих предупреждений нет.',
    kg: 'Азыр күчүндөгү эскертүүлөр жок.',
    en: 'There are no active warnings right now.',
  },
  all: { ru: 'Все предупреждения и архив', kg: 'Баардык эскертүүлөр жана архив', en: 'All warnings and archive' },
  more: { ru: 'ещё', kg: 'дагы', en: 'more' },
};

/**
 * «Главное» на первом экране: действующие предупреждения выбранного места — коротким списком,
 * подробности и архив — на странице «Предупреждения». Те же данные, что в разделе «Предупреждения».
 */
export const MainAlerts: React.FC<{
  lang: Language;
  alerts: Announcement[];
  city: CityId;
  onOpen: (a: Announcement) => void;
  onOpenAll: () => void;
}> = ({ lang, alerts, city, onOpen, onOpenAll }) => {
  const { t } = getTranslation(lang);
  const shown = alerts.slice(0, 4);
  const rest = alerts.length - shown.length;

  return (
    <section aria-labelledby="main-alerts-title" className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="main-alerts-title" className="text-xl font-extrabold text-[#0f1b33] flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#12327A]">warning</span>
            {T.title[lang]}
            <span className="text-sm font-bold text-[#12327A] tabular-nums">{alerts.length}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t(`cities.${city}`)}</p>
        </div>
        <PushToggle lang={lang} city={city} />
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-sm text-gray-600 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#12327A]">check_circle</span>
          {T.none[lang]}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-1">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen(a)}
                className="w-full text-left px-1 py-3.5 flex items-start gap-3 rounded-lg hover:bg-[#f6f8fd] focus-visible:ring-2 focus-visible:ring-[#12327A]"
              >
                <span className="mt-1 w-2 h-2 rounded-full bg-[#12327A] shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#12327A]">{t(`categories.${a.category}`)}</span>
                    <UrgencyBadge item={a} lang={lang} />
                  </span>
                  <span className="block font-bold text-[15px] leading-snug text-[#0f1b33] line-clamp-2 [overflow-wrap:anywhere]">
                    {a.title[lang] || a.title.ru}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1 [overflow-wrap:anywhere]">
                    {[formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay), placeText(a, lang)].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onOpenAll}
        className="pt-4 self-start text-sm font-bold text-[#12327A] hover:underline inline-flex items-center gap-1"
      >
        {T.all[lang]}
        {rest > 0 && <span className="text-gray-500 font-semibold">(+{rest} {T.more[lang]})</span>}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </section>
  );
};
