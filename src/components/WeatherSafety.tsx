import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, CityId, Language } from '../types';
import { normalizeCity } from '../config/regions';
import { EMERGENCY_NUMBERS, FORECAST_REGIONS, KYRGYZHYDROMET } from '../config/weather';
import { formatDayMonth, formatDayMonthTime, formatWhen } from '../utils/dates';
import { addDaysStr, kgDateStr, kgNowLocal } from '../utils/time';
import { isListed } from '../utils/urgency';
import { eventSource, hostOf } from '../utils/links';
import { getTranslation } from '../locales/translations';
import * as api from '../services/api';

type L3 = Record<Language, string>;
const T: Record<string, L3> = {
  title: { ru: 'Погода и безопасность', kg: 'Аба ырайы жана коопсуздук', en: 'Weather & safety' },
  warnings: { ru: 'Официальные предупреждения', kg: 'Расмий эскертүүлөр', en: 'Official warnings' },
  level_high: { ru: 'Высокая опасность', kg: 'Жогорку коркунуч', en: 'High danger' },
  level_warning: { ru: 'Предупреждение', kg: 'Эскертүү', en: 'Warning' },
  level_info: { ru: 'Информация', kg: 'Маалымат', en: 'Information' },
  source: { ru: 'Источник', kg: 'Булак', en: 'Source' },
  todayTitle: { ru: 'Погода на сегодня по областям', kg: 'Бүгүнкү аба ырайы облустар боюнча', en: "Today's weather by region" },
  tomorrow: { ru: 'Погода на завтра по областям', kg: 'Эртеңки аба ырайы облустар боюнча', en: "Tomorrow's weather by region" },
  region: { ru: 'Область / город', kg: 'Облус / шаар', en: 'Region / city' },
  nightCol: { ru: 'Ночью', kg: 'Түнкүсүн', en: 'Night' },
  dayCol: { ru: 'Днём', kg: 'Күндүз', en: 'Day' },
  officialLabel: { ru: 'Официальный прогноз Кыргызгидромета', kg: 'Кыргызгидрометтин расмий божомолу', en: 'Official Kyrgyzhydromet forecast' },
  updated: { ru: 'Обновлено', kg: 'Жаңыланды', en: 'Updated' },
  emergency: { ru: 'Экстренные службы', kg: 'Шашылыш кызматтар', en: 'Emergency' },
  hydromet: { ru: 'Кыргызгидромет — о погоде', kg: 'Кыргызгидромет — аба ырайы боюнча', en: 'Kyrgyzhydromet — weather information' },
  noInfo: {
    ru: 'Сейчас нет действующих официальных предупреждений.',
    kg: 'Азыр күчүндөгү расмий эскертүүлөр жок.',
    en: 'There are no active official warnings right now.',
  },
};

const levelStyle = (lvl?: string) =>
  lvl === 'high'
    ? { box: 'border-red-300 bg-red-50', badge: 'bg-red-600 text-white' }
    : lvl === 'warning'
    ? { box: 'border-amber-300 bg-amber-50', badge: 'bg-amber-300 text-[#3b2a00]' }
    : { box: 'border-gray-200 bg-white', badge: 'bg-gray-200 text-gray-800' };

/** Температура со знаком, как в сводках: +5, 0, −3 */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const range = (a: number, b: number) => (a === b ? signed(a) : `${signed(a)}…${signed(b)}`);

const isoToLocal = (iso: string) => kgNowLocal(Date.parse(iso));
const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, '')}`;

/** Экстренные службы — отдельный квадрат с номерами и названиями */
export const EmergencyBox: React.FC<{ lang: Language }> = ({ lang }) => (
  <div className="rounded-2xl bg-white border border-gray-200 p-5">
    <h3 className="text-base font-extrabold text-[#0f1b33] mb-4 flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px] text-[#12327A]" aria-hidden="true">
        emergency
      </span>
      {T.emergency[lang]}
    </h3>
    <ul className="grid grid-cols-2 gap-3">
      {EMERGENCY_NUMBERS.map((e) => (
        <li key={e.phone}>
          <a
            href={`tel:${e.phone}`}
            className="flex flex-col items-start gap-1 h-full min-w-0 rounded-xl bg-[#f3f6fc] hover:bg-[#e6ecf8] focus-visible:ring-2 focus-visible:ring-[#12327A] px-3 py-2.5"
          >
            {/* Номер сверху, название под ним — длинные названия («…реагирования (МЧС)») остаются внутри плитки */}
            <span className="text-lg font-black text-[#12327A] tabular-nums leading-none">{e.phone}</span>
            <span className="w-full text-xs text-gray-700 leading-snug [overflow-wrap:anywhere] hyphens-auto">{e.name[lang]}</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
);

/** Контакт Кыргызгидромета — одна строка */
export const HydrometLine: React.FC<{ lang: Language }> = ({ lang }) => (
  <p className="text-xs text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
    <span className="material-symbols-outlined text-[16px] text-[#12327A]" aria-hidden="true">
      partly_cloudy_day
    </span>
    {T.hydromet[lang]}:
    <a href={tel(KYRGYZHYDROMET.forecasterPhones[0])} className="font-bold text-[#12327A] hover:underline whitespace-nowrap">
      {KYRGYZHYDROMET.forecasterPhones[0]}
    </a>
    <a href={KYRGYZHYDROMET.site} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline">
      meteo.kg
    </a>
  </p>
);

/**
 * Погода и безопасность на главной: только подтверждённые сведения —
 * официальные предупреждения и официальный прогноз Кыргызгидромета, внесённый редакцией.
 * Если их нет, остаётся одна короткая строка с экстренными номерами.
 */
export const WeatherSafety: React.FC<{
  lang: Language;
  announcements: Announcement[];
  city: CityId;
  onOpen: (a: Announcement) => void;
  /** false — на главной предупреждения уже показаны в блоке «Главное», здесь только официальный прогноз */
  showWarnings?: boolean;
}> = ({ lang, announcements, city, onOpen, showWarnings = true }) => {
  const { t } = getTranslation(lang);
  const [official, setOfficial] = useState<api.WeatherResponse['official']>(null);

  useEffect(() => {
    api
      .fetchWeather()
      .then((r) => setOfficial(r.official || null))
      .catch(() => {});
  }, []);

  const today = kgDateStr();
  const tomorrow = addDaysStr(today, 1);
  // Официальный прогноз — на завтра, а если на завтра ещё не внесён — на сегодня
  const forecast = official && (official.date === tomorrow || official.date === today) ? official : null;

  const warnings = useMemo(
    () =>
      announcements
        .filter((a) => a.category === 'hazard' && isListed(a) && (city === 'all' || a.city === 'all' || normalizeCity(a.city) === city))
        .sort((a, b) => (a.dangerLevel === 'high' ? -1 : 0) - (b.dangerLevel === 'high' ? -1 : 0) || a.startDate.localeCompare(b.startDate)),
    [announcements, city]
  );


  // На главной — только когда есть подтверждённые сведения; экстренные номера — внизу страницы
  if ((!showWarnings || warnings.length === 0) && !forecast) return null;

  return (
    <section id="weather-safety" className="w-full border-b border-gray-100 py-10 bg-[#f6f8fd]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#12327A] text-[22px]">partly_cloudy_day</span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0f1b33]">{T.title[lang]}</h2>
          </div>

          {showWarnings && warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2">{T.warnings[lang]}</h3>
              <ul className="space-y-2">
                {warnings.map((w) => {
                  const st = levelStyle(w.dangerLevel);
                  const src = eventSource(w);
                  return (
                    <li key={w.id} className={`rounded-xl border p-3 text-sm ${st.box}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.badge}`}>{T[`level_${w.dangerLevel || 'info'}`][lang]}</span>
                        <button onClick={() => onOpen(w)} className="text-left font-bold text-[#0f1b33] hover:underline">
                          {w.title[lang]}
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {formatWhen(w.startDate, w.endDate, lang, false, w.timeTBA, w.allDay)} • {t(`cities.${w.city}`)}
                        {src && (
                          <>
                            {' • '}
                            <a href={src} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline">
                              {T.source[lang]}: {w.sourceName || hostOf(src)}
                            </a>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {forecast && (
            <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 max-w-2xl">
              <h3 className="text-sm font-extrabold text-[#0f1b33] mb-1">
                {forecast.date === today ? T.todayTitle[lang] : T.tomorrow[lang]} — {formatDayMonth(forecast.date, lang)}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">{T.officialLabel[lang]}</span>
                <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#12327A] hover:underline">
                  {T.source[lang]}: {forecast.sourceName}
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
              {forecast.text && <p className="text-sm text-gray-700 mb-2">{forecast.text}</p>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-1 font-bold">{T.region[lang]}</th>
                    <th className="py-1 font-bold">{T.nightCol[lang]}</th>
                    <th className="py-1 font-bold">{T.dayCol[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {FORECAST_REGIONS.filter((r) => forecast.regions[r.id]).map((r) => {
                    const v = forecast.regions[r.id]!;
                    return (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="py-1.5 pr-2 font-semibold text-[#0f1b33]">{t(`cities.${r.id}`)}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{range(v.nightFrom, v.nightTo)} °C</td>
                        <td className="py-1.5 whitespace-nowrap font-bold">{range(v.dayFrom, v.dayTo)} °C</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {forecast.updatedAt && (
                <p className="text-[11px] text-gray-500 mt-2">
                  {T.updated[lang]}: {formatDayMonthTime(isoToLocal(forecast.updatedAt), lang)}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
};
