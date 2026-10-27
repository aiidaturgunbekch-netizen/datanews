import React from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatWhen } from '../utils/dates';
import { EventImage } from './EventImage';
import { PaidBadge } from './PaidBadge';
import { sourceLabel } from '../utils/links';
import { placeText } from '../utils/place';
import { RelDay } from './cards';

const T = {
  title: { ru: 'Главное', kg: 'Башкы жаңылыктар', en: 'Top stories' },
  source: { ru: 'Источник', kg: 'Булагы', en: 'Source' },
  verified: { ru: 'Подтверждено по первоисточнику', kg: 'Баштапкы булак боюнча тастыкталды', en: 'Verified against the source' },
};

/** Когда, где и откуда — у каждой новости; дата события и источник различаются по смыслу */
const Meta: React.FC<{ a: Announcement; lang: Language; className?: string; withPlace?: boolean }> = ({ a, lang, className = '', withPlace = false }) => {
  const place = withPlace ? placeText(a, lang) : '';
  return (
    <p className={`dn-meta ${className}`}>
      <time dateTime={a.startDate} className="font-semibold text-ink-soft">
        {formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}
      </time>
      {place && <> · {place}</>}
      {a.sourceName && (
        <>
          {' · '}
          {T.source[lang]}: {sourceLabel(a, lang)}
        </>
      )}
    </p>
  );
};

/**
 * Верх главной: одна главная история и важные рядом (иерархия как у крупных редакций).
 * Порядок даёт homeScore: срочность, близость даты, свежесть, значимость — не одна категория.
 */
export const TopStories: React.FC<{
  lang: Language;
  stories: Announcement[];
  onOpen: (a: Announcement) => void;
  /** Подпись «Главное» стоит над обеими колонками страницы — здесь её не повторяем */
  hideTitle?: boolean;
}> = ({ lang, stories, onOpen, hideTitle = false }) => {
  const { t } = getTranslation(lang);
  if (stories.length === 0) return null;
  const [lead, ...rest] = stories;
  const label = (a: Announcement) => <span className="dn-kicker">{t(`categories.${a.category}`)}</span>;

  return (
    <section aria-labelledby={hideTitle ? undefined : 'top-stories-title'} aria-label={hideTitle ? T.title[lang] : undefined}>
      {!hideTitle && (
        <h2 id="top-stories-title" className="dn-kicker text-meta mb-4">
          {T.title[lang]}
        </h2>
      )}
      {/* Главная история */}
      <article>
        <button type="button" onClick={() => onOpen(lead)} className="group w-full text-left">
          <EventImage item={lead} lang={lang} className="w-full aspect-[16/9] rounded-xl mb-4" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            {label(lead)}
            <RelDay item={lead} lang={lang} />
            {lead.isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-teal-ink">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  verified
                </span>
                {T.verified[lang]}
              </span>
            )}
            <PaidBadge item={lead} lang={lang} />
          </div>
          <h3 className="dn-lead-title group-hover:text-brand-blue group-hover:underline decoration-2 underline-offset-4">{lead.title[lang] || lead.title.ru}</h3>
          {(lead.summary[lang] || lead.summary.ru) && <p className="dn-body mt-3 line-clamp-3">{lead.summary[lang] || lead.summary.ru}</p>}
          <Meta a={lead} lang={lang} className="mt-3" withPlace />
        </button>
      </article>

      {/* Важные — под главной, в две колонки, одинаковые по структуре */}
      {rest.length > 0 && (
        <ul className="mt-8 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {rest.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onOpen(a)} className="group w-full text-left flex gap-4">
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                    {label(a)}
                    <RelDay item={a} lang={lang} />
                  </span>
                  <span className="dn-card-title block line-clamp-3 group-hover:text-brand-blue group-hover:underline underline-offset-2">
                    {a.title[lang] || a.title.ru}
                  </span>
                  <Meta a={a} lang={lang} className="mt-1.5" />
                  <PaidBadge item={a} lang={lang} className="mt-1.5" />
                </span>
                <EventImage item={a} lang={lang} compact className="w-24 h-20 sm:w-28 sm:h-[84px] rounded-lg shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
