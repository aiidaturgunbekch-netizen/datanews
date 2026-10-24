import React from 'react';
import { Language } from '../types';
import { CONTACTS, telegramUrl } from '../config/contacts';

const L = {
  wa: { ru: 'Написать в WhatsApp', kg: 'WhatsAppка жазуу', en: 'Message on WhatsApp' },
  tg: { ru: 'Написать в Telegram', kg: 'Telegramга жазуу', en: 'Message on Telegram' },
  ig: { ru: 'Instagram DataNews', kg: 'Instagram DataNews', en: 'Instagram DataNews' },
};

/** Кнопки связи с редакцией: WhatsApp, Telegram, Instagram (ссылки открываются в новой вкладке / приложении) */
export const ContactButtons: React.FC<{ lang: Language; compact?: boolean; className?: string }> = ({ lang, compact, className = '' }) => {
  const items = [
    { href: CONTACTS.whatsappUrl, label: L.wa[lang], sub: CONTACTS.phone, bg: 'bg-[#0f8072] hover:bg-[#0c6b60] text-white', icon: 'chat' },
    {
      href: telegramUrl(),
      label: L.tg[lang],
      sub: CONTACTS.telegramUsername ? `@${CONTACTS.telegramUsername}` : CONTACTS.phone,
      bg: 'bg-[#1877a8] hover:bg-[#14648f] text-white',
      icon: 'send',
    },
    { href: CONTACTS.instagramUrl, label: L.ig[lang], sub: CONTACTS.instagramHandle, bg: 'bg-gradient-to-r from-[#c2410c] via-[#c13584] to-[#8134af] text-white hover:brightness-95', icon: 'photo_camera' },
  ];
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${i.label} (${i.sub})`}
          className={`inline-flex items-center gap-2 rounded-xl font-bold transition ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${i.bg}`}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {i.icon}
          </span>
          <span className="flex flex-col leading-tight text-left">
            <span>{i.label}</span>
            {!compact && <span className="text-[11px] font-semibold opacity-90">{i.sub}</span>}
          </span>
        </a>
      ))}
    </div>
  );
};

/** Однотонные значки соцсетей (цвет задаётся родителем через currentColor) */
const SOCIAL_ICONS: Record<'wa' | 'tg' | 'ig', React.ReactNode> = {
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
    { key: 'wa', href: CONTACTS.whatsappUrl, label: `WhatsApp ${CONTACTS.phone}` },
    { key: 'tg', href: telegramUrl(), label: `Telegram ${CONTACTS.telegramUsername ? `@${CONTACTS.telegramUsername}` : CONTACTS.phone}` },
    { key: 'ig', href: CONTACTS.instagramUrl, label: `Instagram ${CONTACTS.instagramHandle}` },
  ];
  return (
    <ul className={`flex items-center gap-3 ${className}`} aria-label={lang === 'kg' ? 'Социалдык тармактар' : lang === 'en' ? 'Social media' : 'Социальные сети'}>
      {items.map((i) => (
        <li key={i.key}>
          <a
            href={i.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={i.label}
            title={i.label}
            className="w-11 h-11 rounded-full border border-[#12327A]/25 text-[#12327A] hover:bg-[#12327A] hover:text-white focus-visible:ring-2 focus-visible:ring-[#12327A] transition-colors flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              {SOCIAL_ICONS[i.key]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
};
