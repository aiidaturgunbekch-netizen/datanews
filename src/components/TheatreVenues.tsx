import React from 'react';
import { Announcement, Language } from '../types';
import { VENUES } from '../config/theatres';
import { formatDayMonth } from '../utils/dates';
import { freshOrder, isFresh } from '../utils/statusUtils';

const L = {
  title: { ru: 'Театры и филармония: афиша', kg: 'Театрлар жана филармония: афиша', en: 'Theatres & Philharmonic: schedule' },
  none: {
    ru: 'Подтверждённых спектаклей и концертов пока нет на сайте.',
    kg: 'Тастыкталган спектаклдер жана концерттер азырынча сайтта жок.',
    en: 'No confirmed performances on the site yet.',
  },
  contacts: { ru: 'Контакты', kg: 'Байланыштар', en: 'Contacts' },
  noContacts: { ru: 'Контакты будут добавлены после проверки', kg: 'Байланыштар текшерилгенден кийин кошулат', en: 'Contacts will be added once verified' },
  tba: { ru: 'время уточняется', kg: 'убактысы такталууда', en: 'time TBA' },
};

const tel = (s: string) => `tel:+996${s.replace(/\D/g, '').replace(/^0/, '')}`;

/** Карточки площадок: свежие спектакли/концерты каждой площадки и подтверждённые контакты */
export const TheatreVenues: React.FC<{ lang: Language; items: Announcement[]; onOpen: (a: Announcement) => void }> = ({ lang, items, onOpen }) => (
  <div>
    <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2 flex items-center gap-1.5">
      <span className="material-symbols-outlined text-[18px] text-fuchsia-600">theaters</span>
      {L.title[lang]}
    </h3>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {VENUES.map((v) => {
        const shows = items
          .filter((a) => isFresh(a) && v.match.test(`${a.location.ru} ${a.eventDetails?.venue || ''}`))
          .sort((a, b) => freshOrder(a, b))
          .slice(0, 8);
        return (
          <section key={v.id} className="rounded-2xl border border-gray-100 bg-[#fafbfe] p-3 flex flex-col">
            {v.photo && <img src={v.photo} alt={v.name[lang]} loading="lazy" className="w-full h-40 object-cover rounded-xl mb-2" />}
            <h4 className="text-sm font-extrabold text-[#0f1b33] leading-snug mb-2">{v.name[lang]}</h4>
            {shows.length === 0 ? (
              <p className="text-xs text-gray-500 mb-2">{L.none[lang]}</p>
            ) : (
              <ul className="space-y-1.5 mb-2">
                {shows.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => onOpen(a)} className="w-full text-left rounded-xl bg-white border border-gray-100 px-2.5 py-1.5 hover:border-[#12327A]/30">
                      <span className="block text-[11px] font-bold text-[#12327A]">
                        {formatDayMonth(a.startDate.slice(0, 10), lang)} • {a.timeTBA ? L.tba[lang] : a.startDate.slice(11, 16)}
                      </span>
                      <span className="block text-sm font-semibold text-[#0f1b33] leading-snug">{a.title[lang] || a.title.ru}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-2 border-t border-gray-100 text-xs text-gray-600">
              <span className="font-bold text-[#0f1b33]">{L.contacts[lang]}: </span>
              {v.address || v.phone ? (
                <>
                  {v.address?.[lang]}
                  {v.phone && (
                    <>
                      {v.address ? ', ' : ''}
                      <a href={tel(v.phone)} className="font-bold text-[#12327A] hover:underline whitespace-nowrap">
                        {v.phone}
                      </a>
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-500">{L.noContacts[lang]}</span>
              )}
            </div>
          </section>
        );
      })}
    </div>
  </div>
);
