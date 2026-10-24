import React from 'react';
import { Announcement, Language } from '../types';
import { RUBRICS } from '../config/rubrics';
import { isFresh } from '../utils/statusUtils';

/** Боковой указатель рубрик рядом с лентой: сколько актуального в каждой, переход по нажатию */
export const RubricIndex: React.FC<{
  lang: Language;
  announcements: Announcement[];
  /** Те же правила видимости, что у ленты (город, дата, поиск) */
  inScope: (a: Announcement) => boolean;
  onSelect: (id: string) => void;
}> = ({ lang, announcements, inScope, onSelect }) => {
  const fresh = announcements.filter((a) => inScope(a) && isFresh(a));
  return (
    <nav aria-labelledby="rubric-index-title" className="rounded-2xl bg-white border border-gray-200 p-5">
      <h3 id="rubric-index-title" className="text-base font-extrabold text-[#0f1b33] mb-3">
        {lang === 'kg' ? 'Рубрикалар' : lang === 'en' ? 'Sections' : 'Рубрики'}
      </h3>
      <ul className="divide-y divide-gray-100">
        {RUBRICS.map((r) => {
          const n = fresh.filter((a) => r.categories.includes(a.category)).length;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-sm font-semibold text-[#0f1b33] hover:text-[#12327A] text-left"
              >
                <span>{r.label[lang]}</span>
                <span className={`tabular-nums text-xs font-bold ${n ? 'text-[#12327A]' : 'text-gray-500'}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
