import React from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatWhen } from '../utils/dates';
import { EventImage } from './EventImage';
import { PaidBadge } from './PaidBadge';

const T = {
  title: { ru: 'Главное', kg: 'Башкы жаңылыктар', en: 'Top stories' },
  source: { ru: 'Источник', kg: 'Булагы', en: 'Source' },
};

/** Время и источник — у каждой новости, как на крупных новостных сайтах */
const Meta: React.FC<{ a: Announcement; lang: Language; className?: string }> = ({ a, lang, className = '' }) => (
  <p className={`text-xs text-gray-600 [overflow-wrap:anywhere] ${className}`}>
    <time dateTime={a.startDate}>{formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}</time>
    {a.sourceName && (
      <>
        {' · '}
        <span>
          {T.source[lang]}: {a.sourceName}
        </span>
      </>
    )}
  </p>
);

/**
 * Верх главной: одна главная история и несколько важных рядом (как у Washington Post / BBC).
 * Порядок — тот же, что в ленте: срочная строка, затем идущие сейчас и самые свежие.
 */
export const TopStories: React.FC<{ lang: Language; stories: Announcement[]; onOpen: (a: Announcement) => void }> = ({ lang, stories, onOpen }) => {
  const { t } = getTranslation(lang);
  if (stories.length === 0) return null;
  const [lead, ...rest] = stories;
  const label = (a: Announcement) => (
    <span className="text-[11px] font-bold uppercase tracking-wider text-[#12327A]">{t(`categories.${a.category}`)}</span>
  );

  return (
    <section aria-labelledby="top-stories-title">
      <h2 id="top-stories-title" className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-4">
        {T.title[lang]}
      </h2>
      <div>
        {/* Главная история — на всю ширину колонки */}
        <article>
          <button type="button" onClick={() => onOpen(lead)} className="group w-full text-left focus-visible:outline-none">
            <EventImage item={lead} lang={lang} className="w-full aspect-[16/9] rounded-xl mb-4" />
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {label(lead)}
              <PaidBadge item={lead} lang={lang} />
            </div>
            <h3 className="text-2xl sm:text-[28px] font-extrabold leading-tight text-[#0f1b33] group-hover:text-[#12327A] group-hover:underline decoration-2 underline-offset-4 [overflow-wrap:anywhere]">
              {lead.title[lang] || lead.title.ru}
            </h3>
            {(lead.summary[lang] || lead.summary.ru) && (
              <p className="mt-3 text-base leading-7 text-[#3b4252] line-clamp-3">{lead.summary[lang] || lead.summary.ru}</p>
            )}
            <Meta a={lead} lang={lang} className="mt-3" />
          </button>
        </article>

        {/* Важные — под главной, в две колонки */}
        {rest.length > 0 && (
          <ul className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {rest.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onOpen(a)} className="group w-full text-left flex gap-4">
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2 mb-1">
                      {label(a)}
                      <PaidBadge item={a} lang={lang} />
                    </span>
                    <span className="block font-bold text-base leading-snug text-[#0f1b33] group-hover:text-[#12327A] group-hover:underline underline-offset-2 line-clamp-3 [overflow-wrap:anywhere]">
                      {a.title[lang] || a.title.ru}
                    </span>
                    <Meta a={a} lang={lang} className="mt-1.5" />
                  </span>
                  <EventImage item={a} lang={lang} compact className="w-24 h-20 sm:w-28 sm:h-20 rounded-lg shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
