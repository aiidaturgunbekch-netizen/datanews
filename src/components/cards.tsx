import React from 'react';
import type { Announcement, Language } from '../types';
import { MONTHS_SHORT, WEEKDAYS_SHORT } from '../utils/dates';
import { kgDaysUntil } from '../utils/time';
import { relativeDay } from '../utils/timeline';

/**
 * Общие элементы карточек DataNews — одни правила для всех списков главной:
 *  - SectionHeader — надпись, заголовок раздела и действие справа;
 *  - DateBadge — дата события «листком календаря» (день недели, число, месяц), «сегодня» выделено;
 *  - RelDay — «Сегодня», «Завтра», «Через 3 дня» (только если это действительно так по времени Бишкека).
 */

export const SectionHeader: React.FC<{
  id?: string;
  kicker?: string;
  title: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}> = ({ id, kicker, title, action, className = '' }) => (
  <div className={`flex items-end justify-between gap-4 mb-5 sm:mb-6 ${className}`}>
    <div className="min-w-0">
      {kicker && <p className="dn-kicker mb-1">{kicker}</p>}
      <h2 id={id} className="dn-section-title">
        {title}
      </h2>
    </div>
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-bold text-brand-blue hover:underline underline-offset-4"
      >
        {action.label}
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          arrow_forward
        </span>
      </button>
    )}
  </div>
);

/** Дата начала события как листок календаря: ПН / 27 / ОКТ. Время — отдельно в мета-строке карточки. */
export const DateBadge: React.FC<{ date: string; lang: Language; size?: 'md' | 'sm' }> = ({ date, lang, size = 'md' }) => {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const today = kgDaysUntil(date) === 0;
  const box = size === 'md' ? 'w-14 py-1.5' : 'w-12 py-1';
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 self-start ${box} rounded-lg border text-center leading-none tabular-nums ${
        today ? 'bg-brand-blue border-brand-blue text-white' : 'bg-white border-line text-ink'
      }`}
    >
      <span className={`block text-[10px] font-bold tracking-wide ${today ? 'text-white/80' : 'text-meta'}`}>{WEEKDAYS_SHORT[lang][d.getUTCDay()]}</span>
      <span className={`block font-extrabold ${size === 'md' ? 'text-[22px] my-0.5' : 'text-lg'}`}>{d.getUTCDate()}</span>
      <span className={`block text-[10px] font-bold tracking-wide ${today ? 'text-white/80' : 'text-brand-blue'}`}>{MONTHS_SHORT[lang][d.getUTCMonth()]}</span>
    </span>
  );
};

/** «Сегодня» / «Завтра» / «Через 3 дня» / «Идёт сейчас» — только если правда по времени Кыргызстана */
export const RelDay: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) => {
  const label = relativeDay(item, lang);
  if (!label) return null;
  const strong = kgDaysUntil(item.startDate) <= 1;
  return (
    <span className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wide ${strong ? 'text-brand-teal-ink' : 'text-meta'} ${className}`}>
      {label}
    </span>
  );
};
