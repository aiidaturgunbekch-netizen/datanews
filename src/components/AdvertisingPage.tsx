import React from 'react';
import type { Language } from '../types';
import { getTranslation } from '../locales/translations';
import { CONTACTS } from '../config/contacts';

/** Кнопка «Обсудить рекламу» — WhatsApp редакции (тот же номер, что в подвале и на странице «Контакты») с готовым текстом */
export const adWhatsappUrl = (text: string) => `${CONTACTS.whatsappUrl}?text=${encodeURIComponent(text)}`;

const WHY = [
  { key: 'dates', icon: 'event_upcoming' },
  { key: 'geo', icon: 'location_on' },
  { key: 'sections', icon: 'category' },
  { key: 'formats', icon: 'confirmation_number' },
  { key: 'languages', icon: 'translate' },
  { key: 'labels', icon: 'sell' },
] as const;
const WHO = ['organizers', 'venues', 'education', 'companies', 'expos', 'services'] as const;
const WHAT = ['events', 'services', 'offers', 'business', 'partner'] as const;
const TYPES = [
  { key: 'news', icon: 'newspaper', tone: 'bg-wash text-brand-blue' },
  { key: 'notices', icon: 'campaign', tone: 'bg-wash text-brand-teal-ink' },
  { key: 'ads', icon: 'sell', tone: 'bg-partner-wash text-partner' },
] as const;

/**
 * Публичная страница для рекламодателей: что даёт DataNews, кому подходит, что можно продвигать
 * и как отличаются новости, объявления и реклама. Без цифр охвата, отзывов и обещаний продаж —
 * только то, что сайт действительно умеет. Тарифы и оплата остаются в личном кабинете.
 */
export const AdvertisingPage: React.FC<{ lang: Language; onOpenContacts: () => void }> = ({ lang, onOpenContacts }) => {
  const { t } = getTranslation(lang);
  const a = (k: string) => t(`advertising.${k}`);
  const wa = adWhatsappUrl(a('whatsappText'));

  const CtaButton: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-teal text-[#002f29] font-bold text-[15px] hover:bg-[#1bb3a2] transition-colors focus-visible:outline-offset-4 ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        forum
      </span>
      {label}
    </a>
  );

  return (
    <div className="w-full">
      {/* 1. Главный оффер */}
      <section className="bg-brand-navy text-white">
        <div className="dn-container py-12 sm:py-16 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-teal mb-4">{a('kicker')}</p>
          <h1 className="font-serif font-bold text-[30px] leading-[1.12] sm:text-[42px] lg:text-[52px] max-w-4xl text-balance">{a('title')}</h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-white/85 max-w-3xl">{a('subtitle')}</p>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <CtaButton label={a('heroCta')} />
            <span className="text-sm text-white/70">{a('ctaHint')}</span>
          </div>
        </div>
      </section>

      {/* 2. Почему DataNews */}
      <section className="dn-section bg-white" aria-labelledby="ad-why">
        <div className="dn-container">
          <h2 id="ad-why" className="dn-section-title mb-6 sm:mb-8">
            {a('whyTitle')}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {WHY.map(({ key, icon }) => (
              <li key={key} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <span className="inline-flex w-10 h-10 rounded-xl bg-wash text-brand-blue items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                    {icon}
                  </span>
                </span>
                <h3 className="text-[17px] font-bold text-ink mb-1.5">{a(`why.${key}.title`)}</h3>
                <p className="dn-body text-[15px] text-ink-soft">{a(`why.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3–4. Кому подходит и что можно продвигать */}
      <section className="dn-section bg-wash border-y border-line">
        <div className="dn-container grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {[
            { id: 'ad-who', title: a('whoTitle'), items: WHO.map((k) => a(`who.${k}`)), icon: 'groups' },
            { id: 'ad-what', title: a('whatTitle'), items: WHAT.map((k) => a(`what.${k}`)), icon: 'campaign' },
          ].map((col) => (
            <div key={col.id} aria-labelledby={col.id}>
              <h2 id={col.id} className="dn-section-title mb-5">
                {col.title}
              </h2>
              <ul className="divide-y divide-line border-y border-line">
                {col.items.map((label) => (
                  <li key={label} className="flex items-start gap-3 py-3">
                    <span className="material-symbols-outlined text-[20px] text-brand-teal-ink mt-px" aria-hidden="true">
                      check_circle
                    </span>
                    <span className="text-[15px] font-semibold text-ink leading-snug">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Новости, объявления и реклама — разные вещи */}
      <section className="dn-section bg-white" aria-labelledby="ad-types">
        <div className="dn-container">
          <h2 id="ad-types" className="dn-section-title mb-6">
            {a('typesTitle')}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TYPES.map(({ key, icon, tone }) => (
              <li key={key} className="flex gap-3 rounded-2xl border border-line p-5">
                <span className={`shrink-0 inline-flex w-9 h-9 rounded-lg items-center justify-center ${tone}`}>
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {icon}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink">{a(`types.${key}.title`)}</span>
                  <span className="block text-sm text-ink-soft leading-relaxed mt-0.5">{a(`types.${key}.text`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-meta">{a('typesNote')}</p>
        </div>
      </section>

      {/* 5–6. Призыв к действию и прозрачность условий */}
      <section className="dn-section bg-white pt-0" aria-labelledby="ad-cta">
        <div className="dn-container">
          <div className="rounded-3xl bg-brand-navy text-white px-6 py-10 sm:px-10 sm:py-12 lg:px-14 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
            <h2 id="ad-cta" className="font-serif font-bold text-[24px] sm:text-[30px] leading-tight flex-1 text-balance">
              {a('ctaTitle')}
            </h2>
            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <CtaButton label={a('ctaButton')} className="w-full sm:w-auto" />
              <button type="button" onClick={onOpenContacts} className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4 self-start lg:self-end">
                {a('otherContacts')}
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-meta max-w-3xl">{a('terms')}</p>
        </div>
      </section>
    </div>
  );
};
