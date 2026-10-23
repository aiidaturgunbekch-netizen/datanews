import React from 'react';
import { Announcement, Language } from '../types';
import { alertLevel } from '../utils/urgency';
import { kgDaysUntil, kgTs } from '../utils/time';

const T = {
  now: { ru: 'Действует сейчас', kg: 'Азыр күчүндө', en: 'In effect now' },
  today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
  tomorrow: { ru: 'Завтра', kg: 'Эртең', en: 'Tomorrow' },
  inDays: { ru: 'Через {n} дн.', kg: '{n} күндөн кийин', en: 'In {n} days' },
};

/** Подпись срочности: «Сегодня», «Завтра», «Через 3 дн.» */
export const urgencyLabel = (a: Announcement, lang: Language, now = Date.now()) => {
  if (kgTs(a.startDate) <= now) return T.now[lang];
  const d = kgDaysUntil(a.startDate, now);
  if (d <= 0) return T.today[lang];
  if (d === 1) return T.tomorrow[lang];
  return T.inDays[lang].replace('{n}', String(d));
};

/**
 * Бейдж срочности предупреждения: красный мигающий за 0–3 дня до начала (и пока действует),
 * жёлтый — если до начала больше 3 дней. Для событий и завершённых предупреждений ничего не выводит.
 */
export const UrgencyBadge: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) => {
  const level = alertLevel(item);
  if (level !== 'urgent' && level !== 'soon') return null;
  const urgent = level === 'urgent';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
        urgent ? 'bg-red-600 text-white' : 'bg-amber-300 text-[#3b2a00]'
      } ${className}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-white dn-urgent-blink' : 'bg-[#3b2a00]'}`} aria-hidden="true" />
      <span className={urgent ? 'dn-urgent-blink' : ''}>{urgencyLabel(item, lang)}</span>
    </span>
  );
};

/** Цвет точки предупреждения в календаре */
export const alertDotClass = (item: Announcement) => {
  const level = alertLevel(item);
  if (level === 'urgent') return 'bg-red-600 dn-urgent-blink';
  if (level === 'soon') return 'bg-amber-400';
  return '';
};
