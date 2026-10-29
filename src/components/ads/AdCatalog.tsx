import React, { useEffect, useState } from 'react';
import type { Language } from '../../types';
import { AD_FORMAT_IDS, AdFormat, AdFormatId, formatSom } from '../../config/ads';
import { AdMockup, MockDevice } from './AdMockup';

const T = {
  per: { ru: '30 дней', kg: '30 күн', en: '30 days' },
  desktop: { ru: 'Компьютер', kg: 'Компьютер', en: 'Desktop' },
  phoneSize: { ru: 'Телефон', kg: 'Телефон', en: 'Phone' },
  sameImage: { ru: 'то же изображение', kg: 'ошол эле сүрөт', en: 'same image' },
  where: { ru: 'Где показывается', kg: 'Кайда көрсөтүлөт', en: 'Where it appears' },
  preview: { ru: 'Посмотреть размещение', kg: 'Жайгашуусун көрүү', en: 'See placement' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
  devices: {
    desktop: { ru: 'Компьютер / ноутбук', kg: 'Компьютер / ноутбук', en: 'Desktop / laptop' },
    tablet: { ru: 'Планшет', kg: 'Планшет', en: 'Tablet' },
    phone: { ru: 'Телефон', kg: 'Телефон', en: 'Phone' },
  },
  previewNote: {
    ru: 'Это предварительный просмотр: макет страницы DataNews с местом рекламы. Реклама не публикуется.',
    kg: 'Бул алдын ала көрүү: жарнама орду көрсөтүлгөн DataNews бетинин макети. Жарнама жарыяланбайт.',
    en: 'This is only a preview: a mock-up of a DataNews page with the ad spot. Nothing is published.',
  },
  terms: {
    ru: [
      'Цена — за одно рекламное место на 30 календарных дней.',
      'Размещение начинается после подтверждения оплаты администратором.',
      'Изготовление рекламного макета в стоимость не входит.',
      'Количество показов, просмотров и переходов не гарантируется: подтверждённой статистики посещаемости пока нет.',
      'Все рекламные материалы помечаются «Реклама» или «Партнёрский материал».',
    ],
    kg: [
      'Баасы — бир жарнама орду үчүн 30 календардык күнгө.',
      'Жайгаштыруу администратор төлөмдү тастыктагандан кийин башталат.',
      'Жарнамалык макетти даярдоо баага кирбейт.',
      'Көрсөтүүлөрдүн, көрүүлөрдүн жана өтүүлөрдүн саны кепилденбейт: тастыкталган статистика азырынча жок.',
      'Бардык жарнамалык материалдар «Жарнама» же «Өнөктөштүк материал» деп белгиленет.',
    ],
    en: [
      'The price is for one ad spot for 30 calendar days.',
      'The placement starts after an administrator confirms the payment.',
      'Making the ad creative is not included.',
      'Impressions, views and clicks are not guaranteed: there are no confirmed traffic figures yet.',
      'All ads are labelled “Advertisement” or “Partner content”.',
    ],
  },
};

/** Предварительный просмотр размещения: макет страницы с переключателем «компьютер / планшет / телефон» */
export const AdPreviewModal: React.FC<{ format: AdFormat; lang: Language; onClose: () => void; rubricLabel?: string }> = ({ format, lang, onClose, rubricLabel }) => {
  const [device, setDevice] = useState<MockDevice>('desktop');
  // Escape закрывает только этот просмотр (перехватываем раньше панели администратора, чтобы не закрыть её)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[130] bg-black/60 flex items-start sm:items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${T.preview[lang]}: ${format.name[lang]}`} className="w-full max-w-3xl bg-white rounded-2xl p-4 sm:p-6 my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0b7a70]">{T.preview[lang]}</p>
            <h3 className="text-lg font-bold text-[#0f1b33]">{format.name[lang]}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={T.close[lang]} className="w-9 h-9 rounded-full hover:bg-gray-100 inline-flex items-center justify-center">
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <div role="tablist" aria-label={T.preview[lang]} className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#f3f6fc] mb-4">
          {(['desktop', 'tablet', 'phone'] as MockDevice[]).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={device === d}
              onClick={() => setDevice(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${device === d ? 'bg-[#12327A] text-white' : 'text-[#12327A] hover:bg-white'}`}
            >
              {T.devices[d][lang]}
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <AdMockup format={format} device={device} lang={lang} rubricLabel={rubricLabel} />
        </div>
        <p className="mt-4 text-xs text-[#5b6475]">{T.previewNote[lang]}</p>
      </div>
    </div>
  );
};

const sizeText = (s: { w: number; h: number }) => `${s.w} × ${s.h} px`;

/**
 * Каталог рекламных форматов: карточки с макетом-примером, размерами, местом, ценой за 30 дней и преимуществами.
 * Цены и тексты — из панели администратора (dn:ads:formats), а не из кода страницы.
 * action — кнопка карточки: «Создать кампанию» (панель) или «Обсудить размещение» (страница «Реклама»).
 */
export const AdCatalog: React.FC<{
  formats: Record<AdFormatId, AdFormat>;
  lang: Language;
  action?: { label: string; onClick: (id: AdFormatId) => void; href?: (id: AdFormatId) => string };
}> = ({ formats, lang, action }) => {
  const [preview, setPreview] = useState<AdFormatId | null>(null);
  return (
    <div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AD_FORMAT_IDS.map((id) => {
          const f = formats[id];
          return (
            <li key={id} className="flex flex-col rounded-2xl border border-[#e3e8f0] bg-white p-4 sm:p-5" data-ad-format-card={id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0b7a70]">
                    {lang === 'en' ? 'Format' : 'Формат'} {id}
                  </p>
                  <h3 className="text-lg font-bold text-[#0f1b33]">{f.name[lang]}</h3>
                </div>
                <p className="text-right shrink-0">
                  <span className="block text-xl sm:text-2xl font-extrabold text-[#12327A] tabular-nums whitespace-nowrap" data-ad-price>
                    {formatSom(f.price, lang)}
                  </span>
                  <span className="block text-xs text-[#5b6475]">/ {T.per[lang]}</span>
                </p>
              </div>
              <p className="mt-1 text-sm text-[#3b4558]">{f.caption[lang]}</p>
              {/* Пример и схема расположения — уменьшенный макет страницы DataNews */}
              <button type="button" onClick={() => setPreview(id)} className="mt-3 block w-full rounded-xl bg-[#f5f7fb] p-3 hover:ring-2 hover:ring-[#20c7b5]" aria-label={`${T.preview[lang]}: ${f.name[lang]}`}>
                <AdMockup format={f} device="desktop" lang={lang} />
              </button>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[#f3f6fc] p-2">
                  <dt className="font-bold text-[#5b6475]">{T.desktop[lang]}</dt>
                  <dd className="font-bold text-[#0f1b33] tabular-nums" data-ad-size="desktop">
                    {sizeText(f.desktop)}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#f3f6fc] p-2">
                  <dt className="font-bold text-[#5b6475]">{T.phoneSize[lang]}</dt>
                  <dd className="font-bold text-[#0f1b33] tabular-nums" data-ad-size="mobile">
                    {f.mobile ? sizeText(f.mobile) : T.sameImage[lang]}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-[#3b4558]">
                <b className="text-[#0f1b33]">{T.where[lang]}:</b> {f.placement[lang]}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-[#3b4558]">
                {f.benefits[lang]
                  .split('\n')
                  .filter(Boolean)
                  .map((b) => (
                    <li key={b} className="flex gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-[#0b7a70]" aria-hidden="true">
                        check_circle
                      </span>
                      {b}
                    </li>
                  ))}
              </ul>
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPreview(id)} className="px-3 py-2 rounded-xl border border-[#12327A]/30 text-sm font-bold text-[#12327A] hover:bg-[#eef2f9]">
                  {T.preview[lang]}
                </button>
                {action &&
                  (action.href ? (
                    <a href={action.href(id)} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-[#20c7b5] text-sm font-bold text-[#002f29] hover:bg-[#1bb3a2]">
                      {action.label}
                    </a>
                  ) : (
                    <button type="button" onClick={() => action.onClick(id)} className="px-3 py-2 rounded-xl bg-[#20c7b5] text-sm font-bold text-[#002f29] hover:bg-[#1bb3a2]">
                      {action.label}
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
      <ul className="mt-5 space-y-1 text-xs text-[#5b6475] list-disc pl-5">
        {T.terms[lang].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {preview && <AdPreviewModal format={formats[preview]} lang={lang} onClose={() => setPreview(null)} />}
    </div>
  );
};
