import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, CityId, Language } from '../types';
import { normalizeCity } from '../config/regions';
import { EMERGENCY_NUMBERS, FORECAST_REGIONS, forecastText, KYRGYZHYDROMET, OfficialForecast, upcomingForecasts } from '../config/weather';
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
  source: { ru: 'Источник', kg: 'Булагы', en: 'Source' },
  todayTitle: { ru: 'Погода на сегодня по областям', kg: 'Бүгүнкү аба ырайы облустар боюнча', en: "Today's weather by region" },
  tomorrow: { ru: 'Погода на завтра по областям', kg: 'Эртеңки аба ырайы облустар боюнча', en: "Tomorrow's weather by region" },
  region: { ru: 'Область / город', kg: 'Облус / шаар', en: 'Region / city' },
  nightCol: { ru: 'Ночью', kg: 'Түнкүсүн', en: 'Night' },
  dayCol: { ru: 'Днём', kg: 'Күндүз', en: 'Day' },
  officialLabel: { ru: 'Официальный прогноз Кыргызгидромета', kg: 'Кыргызгидрометтин расмий божомолу', en: 'Official Kyrgyzhydromet forecast' },
  updated: { ru: 'Обновлено', kg: 'Жаңыртылды', en: 'Updated' },
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

/** Официальные прогнозы Кыргызгидромета на сегодня и позже (один запрос на страницу) */
let daysPromise: Promise<OfficialForecast[]> | null = null;
const loadDays = () =>
  (daysPromise ??= api
    .fetchWeather()
    .then((r) => upcomingForecasts([...(r.officialDays || []), ...(r.official ? [r.official] : [])], kgDateStr()))
    .catch(() => {
      daysPromise = null;
      return [];
    }));
const useOfficialDays = () => {
  const [days, setDays] = useState<OfficialForecast[]>([]);
  useEffect(() => {
    let alive = true;
    loadDays().then((d) => alive && setDays(d));
    return () => {
      alive = false;
    };
  }, []);
  return days;
};

const W: Record<string, L3> = {
  title: { ru: 'Погода', kg: 'Аба ырайы', en: 'Weather' },
  today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
  tomorrow: { ru: 'Завтра', kg: 'Эртең', en: 'Tomorrow' },
  day: { ru: 'днём', kg: 'күндүз', en: 'day' },
  night: { ru: 'ночью', kg: 'түнкүсүн', en: 'night' },
  all: { ru: 'Все области', kg: 'Бардык облустар', en: 'All regions' },
};

/**
 * Блок «Погода» на главной: официальный прогноз Кыргызгидромета открыто, без перехода на другой сайт —
 * выбранный город крупно и все области с температурой (°C) днём и ночью. Дни — только те, на которые прогноз есть
 * (сегодня, завтра, послезавтра). Источник — маленькой серой строкой внизу.
 */
export const WeatherCard: React.FC<{ lang: Language; city: CityId; className?: string }> = ({ lang, city, className = '' }) => {
  const { t } = getTranslation(lang);
  const days = useOfficialDays();
  const today = kgDateStr();
  const tomorrow = addDaysStr(today, 1);
  const shown = days.slice(0, 3);
  const [picked, setPicked] = useState<string | null>(null);
  if (!shown.length) return null;
  const f = shown.find((d) => d.date === picked) || shown[0];
  const want = normalizeCity(city) as CityId;
  const main: CityId = f.regions[want] ? want : f.regions.bishkek ? 'bishkek' : (Object.keys(f.regions)[0] as CityId);
  const v = f.regions[main];
  const text = forecastText(f, lang);
  const dayName = (d: string) => (d === today ? W.today[lang] : d === tomorrow ? W.tomorrow[lang] : '');
  const label = (d: string) => [dayName(d), formatDayMonth(d, lang)].filter(Boolean).join(', ');
  const regions = FORECAST_REGIONS.filter((r) => f.regions[r.id] && r.id !== main);
  return (
    <section className={`rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`} aria-labelledby="weather-card-title" data-weather-card>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="weather-card-title" className="text-lg font-extrabold text-ink flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-[#12327A]" aria-hidden="true">
            partly_cloudy_day
          </span>
          {W.title[lang]}
        </h2>
        {shown.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={W.title[lang]}>
            {shown.map((d) => (
              <button
                key={d.date}
                type="button"
                role="tab"
                aria-selected={d.date === f.date}
                onClick={() => setPicked(d.date)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  d.date === f.date ? 'bg-[#12327A] text-white border-[#12327A]' : 'bg-white text-[#12327A] border-[#12327A]/25 hover:border-[#12327A]'
                }`}
              >
                {dayName(d.date) || formatDayMonth(d.date, lang)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-meta">
            {t(`cities.${main}`)} · {label(f.date)}
          </p>
          {v && (
            <p className="mt-1 text-ink whitespace-nowrap">
              <span className="text-[2.25rem] leading-none font-extrabold">{range(v.dayFrom, v.dayTo)}°</span>{' '}
              <span className="text-sm text-ink-soft">{W.day[lang]}</span>
              <span className="block mt-1 text-sm text-ink-soft">
                {W.night[lang]}: <b className="text-ink">{range(v.nightFrom, v.nightTo)}°</b>
              </span>
            </p>
          )}
        </div>
        {text && <p className="text-[15px] leading-relaxed text-ink">{text}</p>}
      </div>
      {regions.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 min-[24em]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-region-forecast>
          {regions.map((r) => {
            const x = f.regions[r.id]!;
            return (
              <li key={r.id} className="rounded-xl bg-[#f6f8fd] px-3 py-2">
                <p className="text-sm font-bold text-[#0f1b33]">{t(`cities.${r.id}`)}</p>
                <p className="text-sm text-ink">
                  <b>{range(x.dayFrom, x.dayTo).replace('…', '…\u200b')}°</b>
                  <span className="text-ink-soft"> {W.day[lang]} · {range(x.nightFrom, x.nightTo).replace('…', '…\u200b')}° {W.night[lang]}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-gray-500">
        {T.source[lang]}:{' '}
        <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {f.sourceName}
        </a>
        {f.updatedAt && (
          <>
            {' · '}
            {T.updated[lang]}: {formatDayMonthTime(isoToLocal(f.updatedAt), lang)}
          </>
        )}
      </p>
    </section>
  );
};

/** Экстренные службы — отдельный квадрат с номерами и названиями */
export const EmergencyBox: React.FC<{ lang: Language }> = ({ lang }) => (
  <div className="rounded-2xl bg-white border border-gray-200 p-5">
    <h3 className="text-base font-extrabold text-[#0f1b33] mb-4 flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px] text-[#12327A]" aria-hidden="true">
        emergency
      </span>
      {T.emergency[lang]}
    </h3>
    <ul className="grid grid-cols-1 min-[22.5em]:grid-cols-2 gap-3">
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
  const days = useOfficialDays();
  const today = kgDateStr();
  const tomorrow = addDaysStr(today, 1);
  // Официальный прогноз — на завтра, а если на завтра ещё не внесён — на сегодня
  const forecast = days.find((f) => f.date === tomorrow) || days.find((f) => f.date === today) || null;

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
      <div className="dn-container">
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
            <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5">
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
              {forecastText(forecast, lang) && <p className="text-sm text-gray-700 mb-2">{forecastText(forecast, lang)}</p>}
              {/* Области — плиткой на всю ширину: без пустого места справа */}
              <ul className="grid grid-cols-1 min-[24em]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5" data-region-forecast>
                {FORECAST_REGIONS.filter((r) => forecast.regions[r.id]).map((r) => {
                  const v = forecast.regions[r.id]!;
                  return (
                    <li key={r.id} className="rounded-xl bg-[#f6f8fd] border border-gray-100 px-3 py-2.5">
                      <p className="text-sm font-bold text-[#0f1b33]">{t(`cities.${r.id}`)}</p>
                      <p className="mt-0.5 text-sm">
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">{T.dayCol[lang]}</span>{' '}
                        <b>{range(v.dayFrom, v.dayTo).replace('…', '…\u200b')}°</b>
                        <span className="text-gray-400"> · </span>
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">{T.nightCol[lang]}</span>{' '}
                        {range(v.nightFrom, v.nightTo).replace('…', '…\u200b')}°
                      </p>
                    </li>
                  );
                })}
              </ul>
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
