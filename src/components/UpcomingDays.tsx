import React from 'react';
import type { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatTime } from '../utils/dates';
import { kgTs } from '../utils/time';
import { placeText } from '../utils/place';
import { BUCKET_LABEL, BUCKETS, bucketOf, DayBucket, homeScore } from '../utils/timeline';
import { DateBadge, SectionHeader } from './cards';
import { PaidBadge } from './PaidBadge';

const T = {
  kicker: { ru: 'Знай дату — планируй день', kg: 'Күндү бил — күнүңдү пландаштыр', en: 'Know the date, plan your day' },
  title: { ru: 'Ближайшие даты', kg: 'Жакынкы даталар', en: 'Coming up' },
  calendar: { ru: 'Весь календарь', kg: 'Толук календарь', en: 'Full calendar' },
  allDay: { ru: 'весь день', kg: 'күн бою', en: 'all day' },
  tba: { ru: 'время уточняется', kg: 'убакыт такталууда', en: 'time TBA' },
  more: { ru: 'ещё', kg: 'дагы', en: 'more' },
};

const PER_GROUP = 4;

/**
 * Что покажет блок: группы по дням (не больше четырёх) и по 4 материала в группе.
 * Тот же отбор использует главная, чтобы лента ниже не повторяла эти материалы.
 */
export const pickUpcoming = (items: Announcement[], now = Date.now()) => {
  const groups = new Map<DayBucket, Announcement[]>();
  for (const a of items) {
    const b = bucketOf(a, now);
    if (b) groups.set(b, [...(groups.get(b) || []), a]);
  }
  // Внутри группы — по времени начала, при равенстве — по важности
  for (const [b, list] of groups) groups.set(b, list.sort((x, y) => kgTs(x.startDate) - kgTs(y.startDate) || homeScore(y, now) - homeScore(x, now)));
  // Не больше четырёх колонок: «Позднее» — только если ближе ничего мало
  const shown = BUCKETS.filter((b) => groups.get(b)?.length).slice(0, 4);
  const shownIds = new Set(shown.flatMap((b) => groups.get(b)!.slice(0, PER_GROUP).map((a) => a.id)));
  return { groups, shown, shownIds };
};

/**
 * Главное отличие DataNews — что предстоит: события по дням (сегодня, завтра, ближайшие дни, неделя, позднее).
 * Только настоящие даты публикаций; пустые группы не показываются; предупреждения — в своём блоке.
 */
export const UpcomingDays: React.FC<{
  lang: Language;
  items: Announcement[];
  onOpen: (a: Announcement) => void;
  onOpenCalendar: () => void;
}> = ({ lang, items, onOpen, onOpenCalendar }) => {
  const { t } = getTranslation(lang);
  const { groups, shown } = pickUpcoming(items);
  if (shown.length === 0) return null;

  const when = (a: Announcement, b: DayBucket) => {
    if (a.allDay) return T.allDay[lang];
    if (a.timeTBA) return T.tba[lang];
    return b === 'today' || b === 'tomorrow' ? formatTime(a.startDate) : '';
  };

  return (
    <section className="dn-section bg-white border-t border-line" aria-labelledby="upcoming-title">
      <div className="dn-container">
        <SectionHeader id="upcoming-title" kicker={T.kicker[lang]} title={T.title[lang]} action={{ label: T.calendar[lang], onClick: onOpenCalendar }} />
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${shown.length >= 4 ? 'lg:grid-cols-4' : shown.length === 3 ? 'lg:grid-cols-3' : ''} gap-x-8 gap-y-8`}>
          {shown.map((b) => {
            const list = groups.get(b)!;
            return (
              <div key={b} className="min-w-0">
                <h3 className="flex items-baseline justify-between gap-2 pb-2 mb-1 border-b-2 border-ink">
                  <span className={`text-[15px] font-extrabold ${b === 'today' ? 'text-brand-blue' : 'text-ink'}`}>{BUCKET_LABEL[b][lang]}</span>
                  <span className="text-xs font-semibold text-meta tabular-nums">{list.length}</span>
                </h3>
                <ul className="divide-y divide-line">
                  {list.slice(0, PER_GROUP).map((a) => {
                    const time = when(a, b);
                    const place = placeText(a, lang);
                    return (
                      <li key={a.id}>
                        <button type="button" onClick={() => onOpen(a)} className="group w-full text-left py-3 flex gap-3 items-start">
                          <DateBadge date={a.startDate} lang={lang} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="dn-card-title-sm block line-clamp-3 group-hover:text-brand-blue group-hover:underline underline-offset-2">
                              {a.title[lang] || a.title.ru}
                            </span>
                            <span className="dn-meta block mt-1">
                              {[time, t(`categories.${a.category}`), place].filter(Boolean).join(' · ')}
                            </span>
                            <PaidBadge item={a} lang={lang} className="mt-1.5" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.length > PER_GROUP && (
                  <button type="button" onClick={onOpenCalendar} className="mt-1 text-xs font-bold text-brand-blue hover:underline">
                    + {list.length - PER_GROUP} {T.more[lang]}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
