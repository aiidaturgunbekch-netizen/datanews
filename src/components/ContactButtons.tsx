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
    { href: CONTACTS.whatsappUrl, label: L.wa[lang], sub: CONTACTS.phone, bg: 'bg-[#25d366] hover:bg-[#1ebe5a] text-white', icon: 'chat' },
    {
      href: telegramUrl(),
      label: L.tg[lang],
      sub: CONTACTS.telegramUsername ? `@${CONTACTS.telegramUsername}` : CONTACTS.phone,
      bg: 'bg-[#229ed9] hover:bg-[#1c8cc2] text-white',
      icon: 'send',
    },
    { href: CONTACTS.instagramUrl, label: L.ig[lang], sub: CONTACTS.instagramHandle, bg: 'bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:brightness-110', icon: 'photo_camera' },
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
