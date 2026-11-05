import React, { useEffect } from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatWhen } from '../utils/dates';
import { EventImage } from './EventImage';
import { isPaid, PaidBadge } from './PaidBadge';
import { AD_LABEL } from '../config/ads';
import { adClickUrl, observeAdView } from '../services/ads';

const T = {
  title: { ru: 'Главное', kg: 'Башкы жаңылыктар', en: 'Top stories' },
};

/**
 * Верх главной — мозаика, как у крупных редакций: одна большая новость слева и две маленькие справа.
 * Рамки выровнены: высота большой = две маленькие + промежуток; фото заполняет рамку, заголовок — поверх фото.
 * На узком экране — столбиком, у всех рамок одинаковые пропорции.
 * Порядок даёт homeScore (срочность, близость даты, свежесть, значимость), по одной новости на рубрику.
 */
export const TopStories: React.FC<{
  lang: Language;
  stories: Announcement[];
  onOpen: (a: Announcement) => void;
  /** Подпись «Главное» стоит над обеими колонками страницы — здесь её не повторяем */
  hideTitle?: boolean;
  /** Что поставить сразу под мозаикой (рекламное место A, погода) */
  afterLead?: React.ReactNode;
  /** Закреплённая платная новость (реклама формата P): метка «Партнёрский материал», учёт показов и переходов */
  pinned?: { adId: string; ann: Announcement } | null;
}> = ({ lang, stories, onOpen, hideTitle = false, afterLead, pinned }) => {
  const { t } = getTranslation(lang);
  useEffect(() => {
    if (!pinned) return;
    const el = document.querySelector(`[data-pinned="${pinned.adId}"]`);
    return el ? observeAdView(el, pinned.adId) : undefined;
  }, [pinned?.adId]);
  if (stories.length === 0) return null;
  const isPin = (a: Announcement) => pinned?.ann.id === a.id;
  const open = (a: Announcement) => {
    // переход по закреплённой новости засчитывается в статистику кампании
    if (isPin(a)) fetch(adClickUrl(pinned!.adId), { redirect: 'manual', keepalive: true }).catch(() => {});
    onOpen(a);
  };
  const [lead, ...others] = stories;
  const side = others.slice(0, 2);

  const Tile: React.FC<{ a: Announcement; big?: boolean; className?: string }> = ({ a, big = false, className = '' }) => (
    <button
      type="button"
      onClick={() => open(a)}
      data-pinned={isPin(a) ? pinned!.adId : undefined}
      // Рамка держит пропорции, но если длинный заголовок (крупный шрифт, узкий экран) не помещается — становится выше, а не обрезает текст
      className={`group relative flex w-full flex-col justify-end rounded-xl bg-[#0d2459] text-left focus-visible:outline-offset-2 ${className}`}
      data-top-tile={big ? 'lead' : 'side'}
    >
      <span className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
        <span className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02]">
          <EventImage item={a} lang={lang} compact fill className="w-full h-full" />
        </span>
        <span className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
      </span>
      {isPin(a) ? (
        // закреплённая новость: значок булавки и маленькое неяркое «Реклама» (закон КР «О рекламе»)
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/35 text-[10px] text-white/80">
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
            push_pin
          </span>
          {AD_LABEL.ad[lang]}
        </span>
      ) : (
        isPaid(a) && (
          <span className="absolute top-3 left-3">
            <PaidBadge item={a} lang={lang} />
          </span>
        )
      )}
      <span className={`relative block ${big ? 'p-4 sm:p-6' : 'p-3 sm:p-4'}`}>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-white/85">{t(`categories.${a.category}`)}</span>
        <span
          className={`mt-1 block font-serif font-bold text-white group-hover:underline decoration-2 underline-offset-4 ${
            big ? 'text-[1.5rem] leading-tight sm:text-[2rem] line-clamp-3' : 'text-[1.0625rem] leading-snug line-clamp-3'
          }`}
        >
          {a.title[lang] || a.title.ru}
        </span>
        <time dateTime={a.startDate} className="mt-1.5 block text-xs font-semibold text-white/80">
          {formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}
        </time>
      </span>
    </button>
  );

  return (
    <section aria-labelledby={hideTitle ? undefined : 'top-stories-title'} aria-label={hideTitle ? T.title[lang] : undefined}>
      {!hideTitle && (
        <h2 id="top-stories-title" className="dn-kicker text-meta mb-4">
          {T.title[lang]}
        </h2>
      )}
      <div className="@container" data-top-mosaic>
        {side.length === 0 ? (
          <Tile a={lead} big className="aspect-[16/9]" />
        ) : (
          <div
            className={`grid grid-cols-1 gap-3 ${
              side.length === 2
                ? '@[44rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @[44rem]:grid-rows-2 @[44rem]:aspect-[16/8.5]'
                : '@[44rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @[44rem]:aspect-[16/7]'
            }`}
          >
            <Tile a={lead} big className={`aspect-[4/3] @[44rem]:aspect-auto ${side.length === 2 ? '@[44rem]:row-span-2' : ''}`} />
            {side.map((a) => (
              <Tile key={a.id} a={a} className="aspect-[16/9] @[44rem]:aspect-auto" />
            ))}
          </div>
        )}
      </div>
      {afterLead}
    </section>
  );
};
