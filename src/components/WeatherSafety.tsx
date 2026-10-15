import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, CityId, Language } from '../types';
import { normalizeCity } from '../config/regions';
import { EMERGENCY_NUMBERS, FORECAST_REGIONS, KYRGYZHYDROMET, WEATHER_POINTS } from '../config/weather';
import { formatDayMonth, formatDayMonthTime, formatWhen } from '../utils/dates';
import { addDaysStr, kgDateStr, kgNowLocal } from '../utils/time';
import { isListed } from '../utils/urgency';
import { eventSource, hostOf } from '../utils/links';
import { getTranslation } from '../locales/translations';
import * as api from '../services/api';

type L3 = Record<Language, string>;
const T: Record<string, L3> = {
  title: { ru: 'Погода и безопасность', kg: 'Аба ырайы жана коопсуздук', en: 'Weather & safety' },
  subtitle: {
    ru: 'Официальные предупреждения, прогноз по регионам и перевалам, контакты служб',
    kg: 'Расмий эскертүүлөр, аймактар жана ашуулар боюнча божомол, кызматтардын байланыштары',
    en: 'Official warnings, regional and mountain-pass forecasts, service contacts',
  },
  warnings: { ru: 'Действующие официальные предупреждения', kg: 'Күчүндөгү расмий эскертүүлөр', en: 'Active official warnings' },
  noWarnings: {
    ru: 'На сайте сейчас нет действующих официальных предупреждений. Последние сообщения — на meteo.kg и mchs.gov.kg.',
    kg: 'Сайтта азыр күчүндөгү расмий эскертүүлөр жок. Акыркы билдирүүлөр — meteo.kg жана mchs.gov.kg сайттарында.',
    en: 'There are no active official warnings on the site right now. Latest notices: meteo.kg and mchs.gov.kg.',
  },
  level_high: { ru: 'Высокая опасность', kg: 'Жогорку коркунуч', en: 'High danger' },
  level_warning: { ru: 'Предупреждение', kg: 'Эскертүү', en: 'Warning' },
  level_info: { ru: 'Информация', kg: 'Маалымат', en: 'Information' },
  source: { ru: 'Источник', kg: 'Булак', en: 'Source' },
  todayTitle: { ru: 'Погода на сегодня по областям', kg: 'Бүгүнкү аба ырайы облустар боюнча', en: "Today's weather by region" },
  tomorrow: { ru: 'Погода на завтра по областям', kg: 'Эртеңки аба ырайы облустар боюнча', en: "Tomorrow's weather by region" },
  region: { ru: 'Область / город', kg: 'Облус / шаар', en: 'Region / city' },
  nightCol: { ru: 'Ночью', kg: 'Түнкүсүн', en: 'Night' },
  dayCol: { ru: 'Днём', kg: 'Күндүз', en: 'Day' },
  skyCol: { ru: 'Осадки, ветер', kg: 'Жаан-чачын, шамал', en: 'Precipitation, wind' },
  officialLabel: {
    ru: 'Официальный прогноз Кыргызгидромета',
    kg: 'Кыргызгидрометтин расмий божомолу',
    en: 'Official Kyrgyzhydromet forecast',
  },
  modelLabel: {
    ru: 'Автоматический прогноз (модель MET Norway). Официальный прогноз редакция добавит, когда его опубликует Кыргызгидромет.',
    kg: 'Автоматтык божомол (MET Norway модели). Кыргызгидромет жарыялаганда редакция расмий божомолду кошот.',
    en: 'Automatic forecast (MET Norway model). The editors add the official forecast once Kyrgyzhydromet publishes it.',
  },
  forecast: { ru: 'Прогноз по городам', kg: 'Шаарлар боюнча божомол', en: 'Forecast by town' },
  place: { ru: 'Населённый пункт', kg: 'Калктуу пункт', en: 'Place' },
  modelNote: {
    ru: 'Автоматический численный прогноз модели MET Norway (открытые данные), не официальный прогноз Кыргызгидромета. Официальный прогноз — на meteo.kg.',
    kg: 'MET Norway моделинин автоматтык сандык божомолу (ачык маалыматтар), Кыргызгидрометтин расмий божомолу эмес. Расмий божомол — meteo.kg сайтында.',
    en: 'Automatic numerical forecast from the MET Norway model (open data), not the official Kyrgyzhydromet forecast. Official forecast: meteo.kg.',
  },
  updated: { ru: 'Обновлено', kg: 'Жаңыланды', en: 'Updated' },
  loading: { ru: 'Загрузка прогноза…', kg: 'Божомол жүктөлүүдө…', en: 'Loading forecast…' },
  failed: {
    ru: 'Не удалось обновить данные прогноза. Смотрите официальный прогноз на сайте Кыргызгидромета.',
    kg: 'Божомолдун маалыматын жаңыртуу мүмкүн болгон жок. Расмий божомолду Кыргызгидрометтин сайтынан караңыз.',
    en: 'Could not update the forecast. See the official forecast on the Kyrgyzhydromet website.',
  },
  stale: {
    ru: 'Данные устарели (последнее успешное обновление — {time}) и не показываются как актуальные.',
    kg: 'Маалымат эскирди (акыркы ийгиликтүү жаңыртуу — {time}) жана актуалдуу катары көрсөтүлбөйт.',
    en: 'Data is out of date (last successful update {time}) and is not shown as current.',
  },
  day: { ru: 'днём до', kg: 'күндүз', en: 'day up to' },
  night: { ru: 'ночью до', kg: 'түнкүсүн', en: 'night down to' },
  precip: { ru: 'Осадки', kg: 'Жаан-чачын', en: 'Precipitation' },
  wind: { ru: 'Ветер до', kg: 'Шамал', en: 'Wind up to' },
  mm: { ru: 'мм', kg: 'мм', en: 'mm' },
  ms: { ru: 'м/с', kg: 'м/с', en: 'm/s' },
  passes: { ru: 'Погода на перевалах и безопасность дорог', kg: 'Ашуулардагы аба ырайы жана жол коопсуздугу', en: 'Mountain passes & road safety' },
  passesNote: {
    ru: 'Закрытие или ограничение движения показывается только по сообщению ответственного ведомства (Минтранс, МЧС, УОБДД). Плохой прогноз сам по себе не означает закрытия дороги.',
    kg: 'Жолдун жабылышы же чектелиши жооптуу мекеменин (Минтранс, ӨКМ, ЖКККБ) билдирүүсү боюнча гана көрсөтүлөт. Начар божомол жолдун жабылышын билдирбейт.',
    en: 'Closures and restrictions are shown only when the responsible agency (Transport Ministry, Emergency Ministry, road police) reports them. A bad forecast alone does not mean a road is closed.',
  },
  restrictions: { ru: 'Подтверждённые ограничения', kg: 'Тастыкталган чектөөлөр', en: 'Confirmed restrictions' },
  noRestrictions: { ru: 'Подтверждённых сообщений об ограничениях на сайте нет', kg: 'Тастыкталган чектөөлөр тууралуу билдирүү сайтта жок', en: 'No confirmed restriction reports on the site' },
  official: { ru: 'Официальный источник и контакты', kg: 'Расмий булак жана байланыштар', en: 'Official source & contacts' },
  forecaster: { ru: 'Дежурный синоптик', kg: 'Нөөмөттөгү синоптик', en: 'Duty forecaster' },
  reception: { ru: 'Приёмная', kg: 'Кабылдама', en: 'Reception' },
  general: { ru: 'Общий отдел', kg: 'Жалпы бөлүм', en: 'General office' },
  allContacts: { ru: 'Все контакты на meteo.kg', kg: 'Бардык байланыштар meteo.kg сайтында', en: 'All contacts on meteo.kg' },
  notEmergency: {
    ru: 'Кыргызгидромет — не экстренная служба. В опасной ситуации звоните:',
    kg: 'Кыргызгидромет — шашылыш кызмат эмес. Коркунучтуу кырдаалда чалыңыз:',
    en: 'Kyrgyzhydromet is not an emergency service. In an emergency call:',
  },
  flag_frost: { ru: 'заморозки', kg: 'үшүк', en: 'frost' },
  flag_snow: { ru: 'снег', kg: 'кар', en: 'snow' },
  flag_heavy_precip: { ru: 'сильные осадки', kg: 'катуу жаан-чачын', en: 'heavy precipitation' },
  flag_strong_wind: { ru: 'сильный ветер', kg: 'катуу шамал', en: 'strong wind' },
  flag_temp_drop: { ru: 'резкое похолодание', kg: 'кескин суук', en: 'sharp cooling' },
  flagNote: { ru: 'по модели, не официальное предупреждение', kg: 'модель боюнча, расмий эскертүү эмес', en: 'model signal, not an official warning' },
};

const SYMBOL: { re: RegExp; icon: string; label: L3 }[] = [
  { re: /thunder/, icon: 'thunderstorm', label: { ru: 'гроза', kg: 'чагылган', en: 'thunder' } },
  { re: /sleet/, icon: 'weather_mix', label: { ru: 'мокрый снег', kg: 'нымдуу кар', en: 'sleet' } },
  { re: /snow/, icon: 'weather_snowy', label: { ru: 'снег', kg: 'кар', en: 'snow' } },
  { re: /rain/, icon: 'rainy', label: { ru: 'дождь', kg: 'жамгыр', en: 'rain' } },
  { re: /fog/, icon: 'foggy', label: { ru: 'туман', kg: 'туман', en: 'fog' } },
  { re: /cloudy$/, icon: 'cloud', label: { ru: 'облачно', kg: 'булуттуу', en: 'cloudy' } },
  { re: /partlycloudy|fair/, icon: 'partly_cloudy_day', label: { ru: 'переменная облачность', kg: 'өзгөрмөлүү булут', en: 'partly cloudy' } },
  { re: /clearsky/, icon: 'sunny', label: { ru: 'ясно', kg: 'ачык', en: 'clear' } },
];
const symbolOf = (code?: string) => SYMBOL.find((s) => code && s.re.test(code));

const PASS_RE = /перевал|ашуу|pass|тоннел|Тоо-Ашуу|Төө-Ашуу|Ала-Бел|Талдык|Долон|Торугарт/i;

const levelStyle = (lvl?: string) =>
  lvl === 'high'
    ? { box: 'border-red-300 bg-red-50', badge: 'bg-red-600 text-white' }
    : lvl === 'warning'
    ? { box: 'border-amber-300 bg-amber-50', badge: 'bg-amber-300 text-[#3b2a00]' }
    : { box: 'border-gray-200 bg-white', badge: 'bg-gray-200 text-gray-800' };

const fmt = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Температура со знаком, как в сводках: +5, 0, −3 */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const range = (a: number, b: number) => (a === b ? signed(a) : `${signed(a)}…${signed(b)}`);

const isoToLocal = (iso: string) => kgNowLocal(Date.parse(iso));

export const WeatherSafety: React.FC<{ lang: Language; announcements: Announcement[]; city: CityId; onOpen: (a: Announcement) => void }> = ({
  lang,
  announcements,
  city,
  onOpen,
}) => {
  const { t } = getTranslation(lang);
  const [data, setData] = useState<api.WeatherResponse | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [place, setPlace] = useState('bishkek');

  useEffect(() => {
    api
      .fetchWeather()
      .then(setData)
      .catch(() => setLoadErr(true));
  }, []);

  const today = kgDateStr();
  const warnings = useMemo(
    () =>
      announcements
        // предупреждения выбранного места и общереспубликанские
        .filter((a) => a.category === 'hazard' && isListed(a) && (city === 'all' || a.city === 'all' || normalizeCity(a.city) === city))
        .sort((a, b) => (a.dangerLevel === 'high' ? -1 : 0) - (b.dangerLevel === 'high' ? -1 : 0) || a.startDate.localeCompare(b.startDate)),
    [announcements, city]
  );
  // перевалы — независимо от выбранного города: ими пользуются жители всех регионов
  const passNotices = useMemo(
    () =>
      announcements.filter(
        (a) => (a.category === 'roads' || a.category === 'hazard') && isListed(a) && PASS_RE.test(`${a.title.ru} ${a.location.ru} ${a.locality || ''}`)
      ),
    [announcements]
  );

  const staleMs = (data?.staleAfterHours || 12) * 3600_000;
  const pointData = (id: string) => data?.snapshot?.points.find((p) => p.id === id);
  const fresh = (id: string) => {
    const p = pointData(id);
    return Boolean(p?.fetchedAt && Date.now() - Date.parse(p.fetchedAt) < staleMs && p.days.length);
  };
  const lastOk = data?.status?.lastSuccessAt;

  const tomorrow = addDaysStr(today, 1);
  // Официальный прогноз — на завтра, а если на завтра ещё не внесён — на сегодня
  const official = data?.official && (data.official.date === tomorrow || data.official.date === today) ? data.official : null;
  const tableDate = official ? official.date : tomorrow;
  // Автоматический прогноз на завтра: по каждой области диапазон по её точкам
  const modelRows = FORECAST_REGIONS.map((r) => {
    const days = r.points
      .filter(fresh)
      .map((id) => pointData(id)!.days.find((d) => d.date === tomorrow))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (!days.length) return { id: r.id, days };
    const nights = days.map((d) => d.tNight ?? d.tMin);
    const highs = days.map((d) => d.tDay ?? d.tMax);
    return {
      id: r.id,
      days,
      night: range(Math.min(...nights), Math.max(...nights)),
      day: range(Math.min(...highs), Math.max(...highs)),
      symbol: days[0].symbol,
      precip: Math.max(...days.map((d) => d.precip)),
      wind: Math.max(...days.map((d) => d.windMax)),
    };
  });
  const modelUpdated = FORECAST_REGIONS.flatMap((r) => r.points)
    .filter(fresh)
    .map((id) => pointData(id)!.fetchedAt!)
    .sort()[0];

  const cities = WEATHER_POINTS.filter((p) => p.kind === 'city');
  const passes = WEATHER_POINTS.filter((p) => p.kind === 'pass');
  const cur = pointData(place);

  const DayCard: React.FC<{ d: NonNullable<typeof cur>['days'][number]; compact?: boolean }> = ({ d, compact }) => {
    const sym = symbolOf(d.symbol);
    return (
      <div className={`rounded-xl bg-white border border-gray-100 ${compact ? 'p-2' : 'p-3'} text-xs`}>
        <div className="font-bold text-[#0f1b33]">{d.date === today ? (lang === 'kg' ? 'Бүгүн' : lang === 'en' ? 'Today' : 'Сегодня') : formatDayMonth(d.date, lang)}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {sym && <span className="material-symbols-outlined text-[22px] text-[#12327A]" aria-hidden="true">{sym.icon}</span>}
          <span className="text-lg font-black text-[#0f1b33]">{d.tMax > 0 ? '+' : ''}{d.tMax}°</span>
          <span className="text-gray-500">/ {d.tMin > 0 ? '+' : ''}{d.tMin}°</span>
        </div>
        {sym && <div className="text-gray-600">{sym.label[lang]}</div>}
        {!compact && (
          <div className="text-gray-600 mt-1 space-y-0.5">
            <div>
              {T.precip[lang]}: {d.precip} {T.mm[lang]}
            </div>
            <div>
              {T.wind[lang]} {d.windMax} {T.ms[lang]}
            </div>
          </div>
        )}
        {d.flags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1" title={T.flagNote[lang]}>
            {d.flags.map((f) => (
              <span key={f} className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold">
                {T[`flag_${f}`][lang]}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="weather-safety" className="w-full py-8 md:py-10 bg-[#f6f8fd] border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#12327A] text-[24px]">partly_cloudy_day</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f1b33]">{T.title[lang]}</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">{T.subtitle[lang]}</p>
        </div>

        {/* 1. Официальные предупреждения — выше всего остального */}
        <div>
          <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-red-600">emergency_home</span>
            {T.warnings[lang]}
          </h3>
          {warnings.length === 0 ? (
            <p className="text-sm text-gray-600 bg-white rounded-xl border border-gray-100 p-3">{T.noWarnings[lang]}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {warnings.map((w) => {
                const st = levelStyle(w.dangerLevel);
                const src = eventSource(w);
                return (
                  <article key={w.id} className={`rounded-2xl border-2 p-4 ${st.box}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.badge}`}>{T[`level_${w.dangerLevel || 'info'}`][lang]}</span>
                      <span className="text-xs text-gray-600">{formatWhen(w.startDate, w.endDate, lang, false, w.timeTBA, w.allDay)}</span>
                    </div>
                    <button onClick={() => onOpen(w)} className="text-left font-extrabold text-[#0f1b33] hover:underline">
                      {w.title[lang]}
                    </button>
                    <p className="text-sm text-gray-700 mt-1">{w.summary[lang]}</p>
                    <div className="text-xs text-gray-600 mt-1">
                      {t(`cities.${w.city}`)}
                      {w.locality ? ` • ${w.locality}` : ''}
                    </div>
                    {src && (
                      <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#12327A] hover:underline">
                        {T.source[lang]}: {w.sourceName || hostOf(src)}
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Погода на завтра по областям */}
        <div>
          <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#12327A]">thermostat</span>
            {tableDate === today ? T.todayTitle[lang] : T.tomorrow[lang]} — {formatDayMonth(tableDate, lang)}
          </h3>
          {official ? (
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">{T.officialLabel[lang]}</span>
                <a href={official.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#12327A] hover:underline">
                  {T.source[lang]}: {official.sourceName}
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
              {official.text && <p className="text-sm text-gray-700 mb-2">{official.text}</p>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-1 font-bold">{T.region[lang]}</th>
                    <th className="py-1 font-bold">{T.nightCol[lang]}</th>
                    <th className="py-1 font-bold">{T.dayCol[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {FORECAST_REGIONS.filter((r) => official.regions[r.id]).map((r) => {
                    const v = official.regions[r.id]!;
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
              {official.updatedAt && (
                <p className="text-[11px] text-gray-500 mt-2">
                  {T.updated[lang]}: {formatDayMonthTime(isoToLocal(official.updatedAt), lang)}
                </p>
              )}
            </div>
          ) : !data && !loadErr ? (
            <p className="text-sm text-gray-500">{T.loading[lang]}</p>
          ) : modelRows.every((r) => !r.days.length) ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <b>{T.failed[lang]}</b>{' '}
              <a href={KYRGYZHYDROMET.site} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline">
                meteo.kg
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 p-3 sm:p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="py-1 font-bold">{T.region[lang]}</th>
                    <th className="py-1 font-bold">{T.nightCol[lang]}</th>
                    <th className="py-1 font-bold">{T.dayCol[lang]}</th>
                    <th className="py-1 font-bold hidden sm:table-cell">{T.skyCol[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.map((r) => {
                    const sym = 'symbol' in r ? symbolOf(r.symbol) : undefined;
                    return (
                      <tr key={r.id} className="border-t border-gray-100 align-middle">
                        <td className="py-1.5 pr-2 font-semibold text-[#0f1b33]">
                          <span className="inline-flex items-center gap-1">
                            {sym && (
                              <span className="material-symbols-outlined text-[18px] text-[#12327A]" title={sym.label[lang]} aria-label={sym.label[lang]}>
                                {sym.icon}
                              </span>
                            )}
                            {t(`cities.${r.id}`)}
                          </span>
                        </td>
                        {'night' in r ? (
                          <>
                            <td className="py-1.5 pr-2 whitespace-nowrap">{r.night} °C</td>
                            <td className="py-1.5 pr-2 whitespace-nowrap font-bold">{r.day} °C</td>
                            <td className="py-1.5 text-xs text-gray-600 hidden sm:table-cell">
                              {sym?.label[lang]}
                              {sym ? ', ' : ''}
                              {r.precip} {T.mm[lang]}, {T.wind[lang].toLowerCase()} {r.wind} {T.ms[lang]}
                            </td>
                          </>
                        ) : (
                          <td colSpan={3} className="py-1.5 text-xs text-amber-800">
                            {T.failed[lang]}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[11px] text-gray-500 mt-2">
                {modelUpdated && `${T.updated[lang]}: ${formatDayMonthTime(isoToLocal(modelUpdated), lang)} • `}
                {T.modelLabel[lang]}{' '}
                <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer" className="underline">
                  Based on data from MET Norway
                </a>
              </p>
            </div>
          )}
        </div>

        {/* 3. Прогноз по городам */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-extrabold text-[#0f1b33]">{T.forecast[lang]}</h3>
            <label className="text-xs text-gray-600 flex items-center gap-2">
              {T.place[lang]}
              <select value={place} onChange={(e) => setPlace(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold">
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[lang]} — {t(`cities.${c.region}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!data && !loadErr ? (
            <p className="text-sm text-gray-500">{T.loading[lang]}</p>
          ) : !fresh(place) ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <b>{T.failed[lang]}</b>
              {cur?.fetchedAt && <div className="text-xs mt-1">{fmt(T.stale[lang], { time: formatDayMonthTime(isoToLocal(cur.fetchedAt), lang) })}</div>}
              <a href={KYRGYZHYDROMET.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 font-bold text-[#12327A] hover:underline">
                meteo.kg <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cur!.days
                  .filter((d) => d.date >= today)
                  .map((d) => (
                    <DayCard key={d.date} d={d} />
                  ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                {T.updated[lang]}: {formatDayMonthTime(isoToLocal(cur!.fetchedAt!), lang)} • {T.modelNote[lang]}{' '}
                <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer" className="underline">
                  Based on data from MET Norway
                </a>
              </p>
            </>
          )}
        </div>

        {/* 4. Перевалы */}
        <div>
          <h3 className="text-sm font-extrabold text-[#0f1b33] mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#12327A]">landscape</span>
            {T.passes[lang]}
          </h3>
          <p className="text-xs text-gray-600 mb-2">{T.passesNote[lang]}</p>
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{T.restrictions[lang]}</div>
            {passNotices.length === 0 ? (
              <p className="text-sm text-gray-600">{T.noRestrictions[lang]}</p>
            ) : (
              <ul className="space-y-2">
                {passNotices.map((n) => {
                  const st = levelStyle(n.dangerLevel);
                  return (
                    <li key={n.id} className={`rounded-xl border p-3 text-sm ${st.box}`}>
                      <button onClick={() => onOpen(n)} className="text-left font-bold text-[#0f1b33] hover:underline">
                        {n.title[lang]}
                      </button>
                      <div className="text-xs text-gray-600">
                        {formatWhen(n.startDate, n.endDate, lang, false, n.timeTBA, n.allDay)} • {n.sourceName}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {passes.map((p) => {
              const pd = pointData(p.id);
              return (
                <div key={p.id} className="rounded-2xl bg-white border border-gray-100 p-3">
                  <div className="font-bold text-sm text-[#0f1b33]">{p.name[lang]}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {p.road?.[lang]} • {t(`cities.${p.region}`)}
                  </div>
                  {fresh(p.id) ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {pd!.days
                        .filter((d) => d.date >= today)
                        .slice(0, 2)
                        .map((d) => (
                          <DayCard key={d.date} d={d} compact />
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800">{data || loadErr ? T.failed[lang] : T.loading[lang]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Официальный источник и контакты */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-extrabold text-[#0f1b33] mb-2">{T.official[lang]}</h3>
            <div className="font-semibold">Кыргызгидромет</div>
            <a href={KYRGYZHYDROMET.site} target="_blank" rel="noopener noreferrer" className="text-[#12327A] font-bold hover:underline">
              www.meteo.kg
            </a>
            <ul className="mt-2 space-y-1 text-gray-700">
              <li>
                {T.forecaster[lang]}:{' '}
                {KYRGYZHYDROMET.forecasterPhones.map((ph, i) => (
                  <React.Fragment key={ph}>
                    {i > 0 && ', '}
                    <a className="text-[#12327A] font-semibold hover:underline" href={`tel:${ph.replace(/[^\d+]/g, '')}`}>
                      {ph}
                    </a>
                  </React.Fragment>
                ))}
                ,{' '}
                <a className="text-[#12327A] font-semibold hover:underline" href={`mailto:${KYRGYZHYDROMET.forecasterEmail}`}>
                  {KYRGYZHYDROMET.forecasterEmail}
                </a>
              </li>
              <li>
                {T.reception[lang]}:{' '}
                <a className="text-[#12327A] font-semibold hover:underline" href={`tel:${KYRGYZHYDROMET.reception.replace(/[^\d+]/g, '')}`}>
                  {KYRGYZHYDROMET.reception}
                </a>
              </li>
              <li>
                {T.general[lang]}:{' '}
                <a className="text-[#12327A] font-semibold hover:underline" href={`tel:${KYRGYZHYDROMET.generalDept.replace(/[^\d+]/g, '')}`}>
                  {KYRGYZHYDROMET.generalDept}
                </a>
                ,{' '}
                <a className="text-[#12327A] font-semibold hover:underline" href={`mailto:${KYRGYZHYDROMET.generalEmail}`}>
                  {KYRGYZHYDROMET.generalEmail}
                </a>
              </li>
              <li className="text-gray-500 text-xs">
                {KYRGYZHYDROMET.address[lang]} • {KYRGYZHYDROMET.hours[lang]}
              </li>
            </ul>
            <a href={KYRGYZHYDROMET.contactsPage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#12327A] hover:underline">
              {T.allContacts[lang]} <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-2">{T.notEmergency[lang]}</p>
            <ul className="grid grid-cols-2 gap-2">
              {EMERGENCY_NUMBERS.map((e) => (
                <li key={e.phone}>
                  <a href={`tel:${e.phone}`} className="flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 px-3 py-2">
                    <span className="text-lg font-black text-red-700">{e.phone}</span>
                    <span className="text-xs text-gray-700 leading-tight">{e.name[lang]}</span>
                  </a>
                </li>
              ))}
            </ul>
            {lastOk && (
              <p className="text-[11px] text-gray-500 mt-3">
                {T.updated[lang]} (MET Norway): {formatDayMonthTime(isoToLocal(lastOk), lang)}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
