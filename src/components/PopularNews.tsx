import React from 'react';
import { Announcement, Language } from '../types';
import { formatWhen } from '../utils/dates';
import { EventImage } from './EventImage';

const T = {
  popular: { ru: 'Самое читаемое', kg: 'Эң көп окулгандар', en: 'Most read' },
  popularHint: { ru: 'за 7 дней', kg: '7 күндө', en: 'last 7 days' },
  soon: { ru: 'Скоро', kg: 'Жакында', en: 'Coming up' },
  soonHint: { ru: 'ближайшие по дате', kg: 'датасы жакын', en: 'nearest dates' },
  reads: { ru: 'прочт.', kg: 'окулду', en: 'reads' },
};

/**
 * Боковой блок рядом с лентой: самые читаемые актуальные публикации (по реальным прочтениям за неделю).
 * Пока прочтений нет — честно называется «Скоро» и показывает ближайшие по дате актуальные события.
 */
export const PopularNews: React.FC<{
  lang: Language;
  items: Announcement[];
  mode: 'popular' | 'soon';
  reads: Record<string, number>;
  onOpen: (a: Announcement) => void;
}> = ({ lang, items, mode, reads, onOpen }) => {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="popular-title" className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 id="popular-title" className="text-base font-extrabold text-[#0f1b33]">
          {mode === 'popular' ? T.popular[lang] : T.soon[lang]}
        </h3>
        <span className="text-xs text-gray-500">{mode === 'popular' ? T.popularHint[lang] : T.soonHint[lang]}</span>
      </div>
      <ol className="divide-y divide-gray-100">
        {items.map((a, i) => (
          <li key={a.id}>
            <button type="button" onClick={() => onOpen(a)} className="group w-full text-left flex items-start gap-3 py-3">
              <span className="w-5 shrink-0 pt-0.5 text-lg font-extrabold leading-none text-[#12327A] tabular-nums">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-serif text-[15px] font-semibold leading-snug text-[#0f1b33] group-hover:text-[#12327A] group-hover:underline underline-offset-2 line-clamp-3 [overflow-wrap:anywhere]">
                  {a.title[lang] || a.title.ru}
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  {formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}
                  {mode === 'popular' && reads[a.id] ? ` · ${reads[a.id]} ${T.reads[lang]}` : ''}
                </span>
              </span>
              <EventImage item={a} lang={lang} compact className="w-16 h-12 rounded-md shrink-0" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};
