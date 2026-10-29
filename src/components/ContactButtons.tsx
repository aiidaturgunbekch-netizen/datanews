import React from 'react';
import { Language } from '../types';
import { CONTACTS, telegramUrl } from '../config/contacts';

const L = {
  wa: { ru: 'Написать в WhatsApp', kg: 'WhatsAppка жазуу', en: 'Message on WhatsApp' },
  tg: { ru: 'Написать в Telegram', kg: 'Telegramга жазуу', en: 'Message on Telegram' },
  ig: { ru: 'Instagram DataNews', kg: 'Instagram DataNews', en: 'Instagram DataNews' },
};

/** Кнопки связи с редакцией: WhatsApp, Telegram, Instagram — в едином сдержанном стиле (ссылки открываются в новой вкладке / приложении) */
export const ContactButtons: React.FC<{ lang: Language; compact?: boolean; className?: string }> = ({ lang, compact, className = '' }) => {
  // Номера телефонов на кнопках не показываем — их видно после перехода в WhatsApp / Telegram
  const items: { key: 'wa' | 'tg' | 'ig'; href: string; label: string; sub?: string }[] = [
    { key: 'wa', href: CONTACTS.whatsappUrl, label: L.wa[lang] },
    { key: 'tg', href: telegramUrl(), label: L.tg[lang], sub: CONTACTS.telegramUsername ? `@${CONTACTS.telegramUsername}` : undefined },
    { key: 'ig', href: CONTACTS.instagramUrl, label: L.ig[lang], sub: CONTACTS.instagramHandle },
  ];
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={i.sub ? `${i.label} (${i.sub})` : i.label}
          className={`inline-flex items-center gap-2 rounded-xl font-bold transition border border-[#12327A]/20 bg-white text-[#12327A] hover:bg-[#12327A] hover:text-white ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            {SOCIAL_ICONS[i.key]}
          </svg>
          <span className="flex flex-col leading-tight text-left">
            <span>{i.label}</span>
            {!compact && i.sub && <span className="text-[11px] font-semibold opacity-90">{i.sub}</span>}
          </span>
        </a>
      ))}
    </div>
  );
};

/** Однотонные значки соцсетей (цвет задаётся родителем через currentColor) */
export const SOCIAL_ICONS: Record<'wa' | 'tg' | 'ig' | 'th' | 'fb' | 'x', React.ReactNode> = {
  // Facebook и X — простые однотонные значки (без сторонних библиотек)
  fb: <path d="M13.5 21.9v-7.6h2.6l.4-3h-3V9.4c0-.9.3-1.5 1.5-1.5h1.6V5.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6v7.6a10 10 0 1 1 3.1 0Z" />,
  x: <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />,
  // Threads — значок из набора Simple Icons (CC0)
  th: (
    <path d="M12.19 24h-.01c-3.58-.02-6.33-1.2-8.18-3.51C2.35 18.44 1.5 15.59 1.47 12.01v-.02c.03-3.58.88-6.43 2.53-8.48C5.85 1.2 8.6.02 12.18 0h.01c2.75.02 5.04.73 6.83 2.1 1.68 1.29 2.86 3.13 3.51 5.47l-2.04.57c-1.1-3.96-3.9-5.98-8.3-6.02-2.91.02-5.11.94-6.54 2.72C4.31 6.5 3.62 8.91 3.59 12c.03 3.09.72 5.5 2.06 7.16 1.43 1.78 3.63 2.7 6.54 2.72 2.62-.02 4.36-.63 5.8-2.05 1.65-1.61 1.62-3.59 1.09-4.8-.31-.71-.87-1.3-1.63-1.75-.19 1.35-.62 2.45-1.28 3.27-.89 1.1-2.14 1.7-3.73 1.79-1.2.07-2.36-.22-3.26-.8-1.06-.69-1.69-1.74-1.75-2.96-.07-1.19.41-2.29 1.33-3.08.88-.76 2.12-1.21 3.58-1.29a13.85 13.85 0 0 1 3.02.14c-.13-.74-.38-1.33-.75-1.76-.51-.59-1.31-.88-2.36-.89h-.03c-.84 0-1.99.23-2.72 1.32L7.73 7.85c.98-1.45 2.57-2.26 4.48-2.26h.04c3.2.02 5.1 1.98 5.29 5.39.11.05.22.09.32.14 1.49.7 2.58 1.76 3.15 3.07.8 1.82.87 4.79-1.55 7.16-1.85 1.81-4.09 2.63-7.28 2.65Zm1-11.69c-.24 0-.49.01-.74.02-1.84.1-2.98.95-2.92 2.14.07 1.26 1.45 1.84 2.78 1.77 1.22-.07 2.82-.54 3.09-3.71a10.5 10.5 0 0 0-2.22-.22Z" />
  ),
  wa: (
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  ),
  tg: <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13.2 1.7 11.7c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.5 1.2Z" />,
  ig: (
    <path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.8a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6-8a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.9 8.2c-.1-1.6-.4-3-1.6-4.2-1.2-1.2-2.6-1.5-4.2-1.6H7.9c-1.6.1-3 .4-4.2 1.6C2.5 5.2 2.2 6.6 2.1 8.2v7.6c.1 1.6.4 3 1.6 4.2 1.2 1.2 2.6 1.5 4.2 1.6h8.2c1.6-.1 3-.4 4.2-1.6 1.2-1.2 1.5-2.6 1.6-4.2V8.2Zm-2.1 9.6a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.2.4-6 .4s-4.7.1-6-.4a3.2 3.2 0 0 1-1.8-1.8c-.5-1.3-.4-4.2-.4-6s-.1-4.7.4-6a3.2 3.2 0 0 1 1.8-1.8c1.3-.5 4.2-.4 6-.4s4.7-.1 6 .4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.2.4 6s.1 4.7-.4 6Z" />
  ),
};

/** Ссылки на соцсети только значками — для подвала сайта */
export const SocialLinks: React.FC<{ lang: Language; className?: string }> = ({ lang, className = '' }) => {
  const items: { key: 'wa' | 'tg' | 'ig'; href: string; label: string }[] = [
    // Только значки: номера и адреса не повторяются рядом (подпись для чтения с экрана — без номера)
    { key: 'wa', href: CONTACTS.whatsappUrl, label: 'WhatsApp DataNews' },
    { key: 'tg', href: telegramUrl(), label: 'Telegram DataNews' },
    { key: 'ig', href: CONTACTS.instagramUrl, label: 'Instagram DataNews' },
  ];
  return (
    <ul className={`flex items-center gap-2.5 ${className}`} aria-label={lang === 'kg' ? 'Социалдык тармактар' : lang === 'en' ? 'Social media' : 'Социальные сети'}>
      {items.map((i) => (
        <li key={i.key}>
          <a
            href={i.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={i.label}
            title={i.label}
            className="w-10 h-10 rounded-full border border-line bg-white text-meta hover:text-brand-navy hover:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-[#12327A] transition-colors flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              {SOCIAL_ICONS[i.key]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
};
