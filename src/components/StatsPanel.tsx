import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, CategoryId, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { CATEGORY_IDS, REGIONS } from '../config/regions';
import { EventImage } from './EventImage';
import { UrgencyBadge } from './UrgencyBadge';
import { formatWhen, MONTHS } from '../utils/dates';
import { alertLevel, isListed } from '../utils/urgency';
import { addDaysStr, kgDateStr, kgTs } from '../utils/time';

export type StatsMode = 'all' | 'alerts' | 'regions';

const NATIONWIDE = '__nationwide';

const T = {
  allTitle: { ru: 'Все публикации', kg: 'Бардык жарыялар', en: 'All posts' },
  alertsTitle: { ru: 'Актуальные предупреждения', kg: 'Актуалдуу эскертүүлөр', en: 'Current alerts' },
  regionsTitle: { ru: 'Области Кыргызстана', kg: 'Кыргызстандын облустары', en: 'Regions of Kyrgyzstan' },
  category: { ru: 'Категория', kg: 'Категория', en: 'Category' },
  period: { ru: 'Период', kg: 'Мезгил', en: 'Period' },
  any: { ru: 'Все', kg: 'Бардыгы', en: 'All' },
  today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
  week: { ru: 'Ближайшие 7 дней', kg: 'Жакынкы 7 күн', en: 'Next 7 days' },
  upcoming: { ru: 'Предстоящие', kg: 'Алдыдагылар', en: 'Upcoming' },
  found: { ru: 'Найдено', kg: 'Табылды', en: 'Found' },
  none: {
    ru: 'По выбранным условиям публикаций нет',
    kg: 'Тандалган шарттар боюнча жарыялар жок',
    en: 'No posts match these filters',
  },
  noAlerts: {
    ru: 'Сейчас нет действующих предупреждений',
    kg: 'Азыр күчүндөгү эскертүүлөр жок',
    en: 'There are no current alerts',
  },
  alertsHint: {
    ru: 'Красным мигает то, что начнётся в ближайшие 3 дня или уже действует; жёлтым — позже. Завершённые не показываются.',
    kg: 'Жакынкы 3 күндө башталуучу же азыр күчүндөгүлөр кызыл түстө жымыңдайт; кийинкилер — сары. Аяктагандар көрсөтүлбөйт.',
    en: 'Red (blinking): starts within 3 days or in effect now; yellow: later. Finished alerts are hidden.',
  },
  chooseRegion: { ru: 'Выберите область', kg: 'Облусту тандаңыз', en: 'Choose a region' },
  nationwide: { ru: 'Весь Кыргызстан', kg: 'Бүт Кыргызстан', en: 'All of Kyrgyzstan' },
  withNationwide: {
    ru: 'События области и общие для всей страны',
    kg: 'Облустун жана бүт өлкөгө тиешелүү окуялар',
    en: 'Regional events plus nationwide ones',
  },
  posts: { ru: 'публикаций', kg: 'жарыя', en: 'posts' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
  back: { ru: 'Все области', kg: 'Бардык облустар', en: 'All regions' },
};

/** Строка публикации в списках: миниатюра, бейджи, дата, место */
export const ItemRow: React.FC<{ item: Announcement; lang: Language; onOpen: (a: Announcement) => void }> = ({ item, lang, onOpen }) => {
  const { t } = getTranslation(lang);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full text-left flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-[#12327A]/30 hover:shadow-sm transition-all"
    >
      <EventImage item={item} lang={lang} compact className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44] text-[10px] font-bold">{t(`categories.${item.category}`)}</span>
          {item.city === 'all' && (
            <span className="px-2 py-0.5 rounded-full bg-[#eef2f9] text-[#12327A] text-[10px] font-bold">{T.nationwide[lang]}</span>
          )}
          <UrgencyBadge item={item} lang={lang} />
        </div>
        <div className="font-bold text-sm text-[#0f1b33] leading-snug break-words">{item.title[lang] || item.title.ru}</div>
        <div className="text-xs text-gray-500 mt-0.5 break-words">
          {formatWhen(item.startDate, item.endDate, lang, false, item.timeTBA, item.allDay)} · {item.location[lang] || item.location.ru}
        </div>
      </div>
    </button>
  );
};

const byStart = (a: Announcement, b: Announcement) => kgTs(a.startDate) - kgTs(b.startDate);

interface Props {
  mode: StatsMode;
  lang: Language;
  announcements: Announcement[];
  onOpen: (a: Announcement) => void;
  onClose: () => void;
}

/** Панель, которая открывается по нажатию на показатели в шапке главной страницы */
export const StatsPanel: React.FC<Props> = ({ mode, lang, announcements, onOpen, onClose }) => {
  const { t } = getTranslation(lang);
  const [category, setCategory] = useState<CategoryId>('all');
  const [period, setPeriod] = useState<string>('upcoming');
  const [region, setRegion] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const listed = useMemo(() => announcements.filter((a) => isListed(a)).sort(byStart), [announcements]);

  // Месяцы, в которых есть публикации — для фильтра «Период»
  const months = useMemo(() => [...new Set(listed.map((a) => a.startDate.slice(0, 7)))].sort(), [listed]);

  const inPeriod = (a: Announcement) => {
    const today = kgDateStr();
    const start = a.startDate.slice(0, 10);
    const end = (a.endDate || a.startDate).slice(0, 10);
    if (period === 'upcoming') return end >= today;
    if (period === 'today') return start <= today && end >= today;
    if (period === 'week') return start <= addDaysStr(today, 7) && end >= today;
    if (/^\d{4}-\d{2}$/.test(period)) return start.slice(0, 7) <= period && end.slice(0, 7) >= period;
    return true;
  };

  const regionCities = (id: string) => REGIONS.find((r) => r.id === id)?.cities || [];
  // Внутри области показываем и её события, и общереспубликанские; на плитке считаем только местные
  const inRegion = (a: Announcement, id: string) =>
    id === NATIONWIDE ? a.city === 'all' : a.city === 'all' || regionCities(id).includes(a.city as CityId);
  const localTo = (a: Announcement, id: string) => regionCities(id).includes(a.city as CityId);

  const items = useMemo(() => {
    if (mode === 'alerts') return listed.filter((a) => alertLevel(a) === 'urgent' || alertLevel(a) === 'soon');
    if (mode === 'regions') return region ? listed.filter((a) => inRegion(a, region) && inPeriod(a) && (category === 'all' || a.category === category)) : [];
    return listed.filter((a) => inPeriod(a) && (category === 'all' || a.category === category));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, listed, category, period, region]);

  const title = mode === 'alerts' ? T.alertsTitle[lang] : mode === 'regions' ? T.regionsTitle[lang] : T.allTitle[lang];
  const monthLabel = (ym: string) => `${MONTHS[lang][Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
  const selectCls = 'px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-[#0f1b33]';

  const filters = (
    <div className="flex flex-wrap gap-2">
      <label className="flex flex-col text-[11px] font-bold uppercase tracking-wider text-gray-500 gap-1">
        {T.category[lang]}
        <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
          <option value="all">{T.any[lang]}</option>
          {CATEGORY_IDS.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-[11px] font-bold uppercase tracking-wider text-gray-500 gap-1">
        {T.period[lang]}
        <select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="upcoming">{T.upcoming[lang]}</option>
          <option value="today">{T.today[lang]}</option>
          <option value="week">{T.week[lang]}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
          <option value="all">{T.any[lang]}</option>
        </select>
      </label>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-[#0d2459]/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full sm:max-w-3xl max-h-[92vh] flex flex-col bg-[#F5F7FB] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0d2459] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="font-extrabold text-lg">
            {title}
            {(mode !== 'regions' || region) && <span className="ml-2 text-sm font-semibold text-white/70">· {items.length}</span>}
          </div>
          <button onClick={onClose} aria-label={T.close[lang]} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {mode === 'alerts' && <p className="text-xs text-gray-600">{T.alertsHint[lang]}</p>}

          {mode === 'all' && filters}

          {mode === 'regions' && !region && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...REGIONS.map((r) => ({ id: r.id, name: r.name[lang] })), { id: NATIONWIDE, name: T.nationwide[lang] }].map((r) => {
                const n = listed.filter((a) => (r.id === NATIONWIDE ? a.city === 'all' : localTo(a, r.id)) && inPeriod(a)).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRegion(r.id)}
                    className="text-left p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#12327A]/40 flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-sm text-[#0f1b33]">{r.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#eef2f9] text-[#12327A] text-xs font-bold whitespace-nowrap">
                      {n} {T.posts[lang]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'regions' && region && (
            <>
              <button onClick={() => setRegion(null)} className="text-xs font-bold text-[#12327A] hover:underline inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                {T.back[lang]}
              </button>
              <div className="font-extrabold text-[#0f1b33]">
                {region === NATIONWIDE ? T.nationwide[lang] : REGIONS.find((r) => r.id === region)?.name[lang]}
              </div>
              {region !== NATIONWIDE && <div className="text-xs text-gray-500 -mt-2">{T.withNationwide[lang]}</div>}
              {filters}
            </>
          )}

          {(mode !== 'regions' || region) &&
            (items.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 bg-white rounded-2xl">
                {mode === 'alerts' ? T.noAlerts[lang] : T.none[lang]}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <ItemRow key={a.id} item={a} lang={lang} onOpen={onOpen} />
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/** Полный список выбранной категории — те же публикации, что учтены в счётчике на чипе */
export const CategoryResults: React.FC<{
  lang: Language;
  category: CategoryId;
  items: Announcement[];
  onOpen: (a: Announcement) => void;
  onReset: () => void;
}> = ({ lang, category, items, onOpen, onReset }) => {
  const { t } = getTranslation(lang);
  const sorted = [...items].sort(byStart);
  const empty = {
    ru: 'Пока нет опубликованных событий в этой категории',
    kg: 'Бул категорияда азырынча жарыяланган окуялар жок',
    en: 'No published events in this category yet',
  };
  const all = { ru: 'Показать все категории', kg: 'Бардык категорияларды көрсөтүү', en: 'Show all categories' };
  return (
    <section className="w-full py-8 bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f1b33]">
            {t(`categories.${category}`)} <span className="text-gray-400 font-bold">· {items.length}</span>
          </h2>
          <button onClick={onReset} className="text-sm font-bold text-[#12327A] hover:underline">
            {all[lang]}
          </button>
        </div>
        {sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500 bg-[#f8fafc] rounded-2xl">{empty[lang]}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sorted.map((a) => (
              <ItemRow key={a.id} item={a} lang={lang} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
