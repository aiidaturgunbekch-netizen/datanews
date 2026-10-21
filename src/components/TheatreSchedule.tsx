import React, { useMemo } from 'react';
import { Announcement, Language } from '../types';
import { formatDayMonth } from '../utils/dates';
import { kgDateStr } from '../utils/time';
import { isFresh } from '../utils/statusUtils';
import { ticketLink } from '../utils/links';
import { getTranslation } from '../locales/translations';

const L = {
  title: { ru: 'Театры: график спектаклей', kg: 'Театрлар: спектаклдердин графиги', en: 'Theatres: performance schedule' },
  sub: {
    ru: 'Ближайшие спектакли театров Кыргызстана — только с подтверждённой датой и источником',
    kg: 'Кыргызстандын театрларынын жакынкы спектаклдери — тастыкталган дата жана булак менен гана',
    en: 'Upcoming performances in Kyrgyzstan theatres — only with a confirmed date and source',
  },
  time: { ru: 'время уточняется', kg: 'убактысы такталууда', en: 'time TBA' },
  tickets: { ru: 'Билеты', kg: 'Билеттер', en: 'Tickets' },
  today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
};

/** Театр — раздел «Театр и культура», место проведения — театр */
const isTheatre = (a: Announcement) =>
  a.category === 'culture' && /театр|theatre|theater/i.test(`${a.location.ru} ${a.eventDetails?.venue || ''} ${a.title.ru}`);

/** Спектакли по датам. Блок не показывается, если подтверждённых спектаклей нет. */
export const TheatreSchedule: React.FC<{ lang: Language; announcements: Announcement[]; onOpen: (a: Announcement) => void }> = ({
  lang,
  announcements,
  onOpen,
}) => {
  const { t } = getTranslation(lang);
  const today = kgDateStr();
  const byDate = useMemo(() => {
    const items = announcements.filter((a) => isTheatre(a) && isFresh(a)).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const m = new Map<string, Announcement[]>();
    items.slice(0, 30).forEach((a) => {
      const d = a.startDate.slice(0, 10);
      m.set(d, [...(m.get(d) || []), a]);
    });
    return [...m.entries()];
  }, [announcements]);

  if (!byDate.length) return null;

  return (
    <section className="w-full py-8 bg-white border-t border-gray-100" aria-labelledby="theatre-title">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-fuchsia-600 text-[24px]">theaters</span>
          <h2 id="theatre-title" className="text-xl sm:text-2xl font-bold text-[#0f1b33]">
            {L.title[lang]}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">{L.sub[lang]}</p>
        <div className="space-y-3">
          {byDate.map(([date, items]) => (
            <div key={date} className="grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr] gap-3">
              <div className="text-sm font-extrabold text-[#12327A] pt-2">{date === today ? L.today[lang] : formatDayMonth(date, lang)}</div>
              <ul className="space-y-2">
                {items.map((a) => {
                  const tl = ticketLink(a);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-[#fafbfe] px-3 py-2">
                      <span className="text-sm font-black text-[#0f1b33] w-12">{a.timeTBA ? '—' : a.startDate.slice(11, 16)}</span>
                      <button onClick={() => onOpen(a)} className="flex-1 min-w-[180px] text-left">
                        <span className="block text-sm font-bold text-[#0f1b33] hover:underline">{a.title[lang] || a.title.ru}</span>
                        <span className="block text-xs text-gray-500">
                          {a.location[lang] || a.location.ru} • {t(`cities.${a.city}`)}
                          {a.timeTBA ? ` • ${L.time[lang]}` : ''}
                        </span>
                      </button>
                      {tl.verified && tl.url && (
                        <a href={tl.url} target="_blank" rel="noopener noreferrer" className="text-xs font-extrabold text-[#002f29] bg-[#20C7B5] hover:bg-[#1bb3a2] px-2.5 py-1 rounded-lg">
                          {L.tickets[lang]}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
