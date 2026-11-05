import React from 'react';
import { Announcement, Language } from '../types';
import { VENUES } from '../config/theatres';
import { formatDayMonth } from '../utils/dates';
import { freshOrder, isFresh } from '../utils/statusUtils';

const L = {
  title: { ru: 'Театры и филармония: афиша', kg: 'Театрлар жана филармония: афиша', en: 'Theatres & Philharmonic: schedule' },
  none: {
    ru: 'Ближайших спектаклей и концертов пока нет.',
    kg: 'Жакынкы спектаклдер жана концерттер азырынча жок.',
    en: 'No upcoming performances yet.',
  },
  upcoming: { ru: 'Ближайшие события', kg: 'Жакынкы иш-чаралар', en: 'Coming up' },
  // Служебная пометка — только для редакции (читатель её не видит)
  noContacts: { ru: 'Для редакции: контакты площадки не заполнены — пришлите адрес и телефон из официального источника', kg: 'Редакция үчүн: байланыштар толтурулган эмес', en: 'Editors: venue contacts are missing' },
  tba: { ru: 'время уточняется', kg: 'убактысы такталууда', en: 'time TBA' },
};

/** Номер для набора: «+996 550 …», «(0312) …», «0312 …» → tel:+996… */
const tel = (s: string) => {
  const d = s.replace(/\D/g, '');
  return `tel:+${d.startsWith('996') ? d : `996${d.replace(/^0/, '')}`}`;
};

/** Карточки площадок: свежие спектакли/концерты каждой площадки и подтверждённые контакты */
export const TheatreVenues: React.FC<{
  lang: Language;
  items: Announcement[];
  onOpen: (a: Announcement) => void;
  /** Редакция (админ/редактор): видит служебные пометки о незаполненном */
  editorView?: boolean;
}> = ({ lang, items, onOpen, editorView = false }) => (
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
            <h4 className="text-sm font-extrabold text-[#0f1b33] leading-snug mb-1">{v.name[lang]}</h4>
            {/* Контакты площадки — сразу под названием; если их нет, читатель ничего не видит, редакция — пометку */}
            {v.address || v.phone || v.phones?.length ? (
              <div className="text-xs text-gray-600 mb-2 space-y-0.5">
                {v.address && (
                  <p>
                    <span className="material-symbols-outlined text-[14px] align-[-2px] mr-0.5 text-[#12327A]" aria-hidden="true">location_on</span>
                    {v.address[lang]}
                  </p>
                )}
                {[...(v.phone ? [{ number: v.phone, label: undefined }] : []), ...(v.phones || [])].length > 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="material-symbols-outlined text-[14px] text-[#12327A]" aria-hidden="true">call</span>
                    {[...(v.phone ? [{ number: v.phone, label: undefined }] : []), ...(v.phones || [])].map((p) => (
                      <a key={p.number} href={tel(p.number)} className="font-bold text-[#12327A] hover:underline whitespace-nowrap">
                        {p.number}
                        {p.label && <span className="font-normal text-gray-500"> ({p.label[lang]})</span>}
                      </a>
                    ))}
                  </p>
                )}
                {v.site && (
                  <p>
                    <a href={v.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[#12327A] hover:underline">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{/instagram/.test(v.site) ? 'photo_camera' : 'language'}</span>
                      {/instagram/.test(v.site) ? `Instagram @${v.site.replace(/.*instagram\.com\//, '').replace(/\/$/, '')}` : v.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              editorView && <p className="text-[11px] mb-2 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">{L.noContacts[lang]}</p>
            )}
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{L.upcoming[lang]}</p>
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
          </section>
        );
      })}
    </div>
  </div>
);
