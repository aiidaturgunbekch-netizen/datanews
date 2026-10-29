import React from 'react';
import type { Language } from '../../types';
import type { AdFormat, AdFormatId } from '../../config/ads';
import { formatSom } from '../../config/ads';
import { NAV_RUBRICS } from '../../config/rubrics';
import { BrandLogo } from '../BrandLogo';

export type MockDevice = 'desktop' | 'tablet' | 'phone';

const T = {
  sample: { ru: 'Пример рекламного баннера', kg: 'Жарнамалык баннердин үлгүсү', en: 'Sample ad banner' },
  ad: { ru: 'Реклама', kg: 'Жарнама', en: 'Advertisement' },
  top: { ru: 'Главное', kg: 'Башкы жаңылыктар', en: 'Top stories' },
  side: { ru: 'Актуальные новости', kg: 'Актуалдуу жаңылыктар', en: 'Latest news' },
  feed: { ru: 'Афиша, новости и объявления', kg: 'Афиша, жаңылыктар жана жарыялар', en: 'Events, news & notices' },
  per: { ru: '30 дней', kg: '30 күн', en: '30 days' },
};

/** Серые полосы вместо текста — «новость» в макете */
const Lines: React.FC<{ n?: number; w?: string[] }> = ({ n = 2, w = ['92%', '70%', '84%'] }) => (
  <span className="block space-y-1">
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className="block h-[5px] rounded-full bg-[#cfd6e4]" style={{ width: w[i % w.length] }} />
    ))}
  </span>
);
const NewsCard: React.FC<{ img?: boolean; tone?: string }> = ({ img = true, tone = '#dfe6f3' }) => (
  <span className="flex gap-1.5 items-start py-1.5 border-b border-[#e3e8f0] last:border-0">
    <span className="flex-1 min-w-0">
      <span className="block h-[4px] w-8 rounded-full bg-[#12327A]/50 mb-1" />
      <Lines />
    </span>
    {img && <span className="shrink-0 w-[22%] aspect-[4/3] rounded" style={{ background: tone }} />}
  </span>
);

/** Место рекламы в макете: рамка, нейтральный пример баннера, размер в пикселях */
const Slot: React.FC<{ f: AdFormat; lang: Language; mobile?: boolean; className?: string; card?: boolean }> = ({ f, lang, mobile, className = '', card }) => {
  const size = mobile && f.mobile ? f.mobile : f.desktop;
  return (
    <span className={`relative block ${className}`} data-mock-slot={f.id}>
      <span className="block text-[7px] font-bold uppercase tracking-wider text-[#7a4b00] mb-0.5">{T.ad[lang]}</span>
      <span
        className="relative flex flex-col items-center justify-center rounded-md border-2 border-dashed border-[#20c7b5] bg-gradient-to-br from-[#e6faf7] via-white to-[#fff6e5] text-center overflow-hidden"
        style={{ aspectRatio: card ? '16 / 6' : `${size.w} / ${size.h}` }}
      >
        <span className="text-[9px] sm:text-[10px] font-bold text-[#0b7a70] leading-tight px-1">{T.sample[lang]}</span>
        <span className="text-[8px] font-semibold text-[#5b6475] tabular-nums">
          {size.w} × {size.h} px
        </span>
        {card && (
          <span className="mt-0.5 inline-block px-1.5 py-[1px] rounded bg-white border border-[#7a4b00]/30 text-[7px] font-bold text-[#7a4b00]">
            {lang === 'kg' ? 'Толугураак' : lang === 'en' ? 'Learn more' : 'Подробнее'}
          </span>
        )}
      </span>
    </span>
  );
};

/** Шапка DataNews: тёмно-синяя полоса с утверждённым логотипом и строка рубрик */
const Header: React.FC<{ lang: Language; phone?: boolean }> = ({ lang, phone }) => (
  <span className="block">
    <span className="flex items-center justify-between bg-[#041e52] px-2 py-1.5">
      <BrandLogo height={phone ? 12 : 14} />
      <span className="flex gap-1">
        {!phone && <span className="w-10 h-2.5 rounded bg-[#20c7b5]" />}
        <span className="w-6 h-2.5 rounded border border-white/40" />
      </span>
    </span>
    <span className="flex gap-2 bg-white border-b border-[#e3e8f0] px-2 py-1 overflow-hidden whitespace-nowrap text-[6.5px] font-semibold text-[#0f1b33]">
      {NAV_RUBRICS.slice(0, phone ? 3 : 9).map((r, i) => (
        <span key={r.id} className={i === 0 ? 'text-[#12327A] underline decoration-[#20c7b5] decoration-2 underline-offset-2' : ''}>
          {r.label[lang]}
        </span>
      ))}
    </span>
  </span>
);

/**
 * Макет страницы DataNews с выделенным местом рекламы (A — главный баннер, B — боковой, C — карточка в ленте,
 * D — баннер в разделе). Собран из цветов, шапки, логотипа и рубрик сайта; внутри места — нейтральный пример баннера.
 */
export const AdMockup: React.FC<{ format: AdFormat; device: MockDevice; lang: Language; rubricLabel?: string }> = ({ format: f, device, lang, rubricLabel }) => {
  const phone = device === 'phone';
  const tablet = device === 'tablet';
  const id: AdFormatId = f.id;
  const two = !phone && !tablet; // компьютер: основная колонка + правая
  const frame = phone ? 'w-[200px] rounded-[18px] border-[5px] border-[#0f1b33]' : tablet ? 'w-[300px] rounded-[14px] border-[5px] border-[#0f1b33]' : 'w-full rounded-lg border border-[#cfd6e4]';

  const mainCol = (
    <span className="block min-w-0 flex-1">
      {id === 'D' ? (
        <>
          <span className="block text-[8px] font-bold text-[#0f1b33] mb-1">{rubricLabel || NAV_RUBRICS.find((r) => r.id === 'tech')?.label[lang]}</span>
          <Slot f={f} lang={lang} mobile={!two} className="mb-1.5" />
          <NewsCard />
          <NewsCard tone="#e6faf7" />
          <NewsCard />
        </>
      ) : (
        <>
          <span className="block text-[6.5px] font-bold uppercase tracking-wider text-[#12327A] mb-1">{T.top[lang]}</span>
          <span className="block rounded bg-[#d5dded] mb-1" style={{ aspectRatio: two ? '16 / 7' : '16 / 9' }} />
          <Lines n={3} />
          {id === 'A' && <Slot f={f} lang={lang} mobile={!two} className="my-2" />}
          <span className="block text-[6.5px] font-bold uppercase tracking-wider text-[#12327A] mt-2 mb-0.5">{T.feed[lang]}</span>
          <NewsCard />
          <NewsCard tone="#fde8e8" />
          {id === 'C' && <Slot f={f} lang={lang} card className="my-1.5" />}
          <NewsCard />
          {/* B на телефоне и планшете — между блоками, под лентой */}
          {id === 'B' && !two && <Slot f={f} lang={lang} mobile className="my-1.5" />}
          <NewsCard tone="#e6faf7" />
        </>
      )}
    </span>
  );

  return (
    <figure className="m-0 flex flex-col items-center" data-mock-device={device} data-mock-format={id}>
      <span className={`block overflow-hidden bg-[#f5f7fb] shadow-sm ${frame}`}>
        <Header lang={lang} phone={phone} />
        <span className={`flex gap-2 p-2 bg-white ${phone ? 'min-h-[300px]' : ''}`}>
          {mainCol}
          {two && (
            <span className="block w-[30%] shrink-0">
              {id === 'B' && <Slot f={f} lang={lang} className="mb-1.5" />}
              <span className="block text-[6.5px] font-bold text-[#0f1b33] border-b border-[#0f1b33] pb-0.5 mb-0.5">{T.side[lang]}</span>
              <NewsCard img={false} />
              <NewsCard img={false} />
              <NewsCard img={false} />
            </span>
          )}
        </span>
      </span>
      <figcaption className="mt-2 text-center text-xs text-[#5b6475]">
        <b className="text-[#0f1b33]">{f.name[lang]}</b> · {formatSom(f.price, lang)} / {T.per[lang]}
      </figcaption>
    </figure>
  );
};
