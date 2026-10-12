import { Announcement, Language } from '../types';

export type DisplayStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'rescheduled';

/**
 * Returns the effective lifecycle status of an announcement for October 2026 demonstration period.
 * Accurately prevents past/expired items from being shown as upcoming or active.
 */
export function getAnnouncementDisplayStatus(
  ann: Announcement,
  referenceDate: Date = new Date()
): DisplayStatus {
  // Explicit administrative overrides take precedence
  if (ann.status === 'cancelled') return 'cancelled';
  if (ann.status === 'rescheduled') return 'rescheduled';
  if (ann.status === 'completed' || ann.status === 'archived') return 'completed';

  const refTime = referenceDate.getTime();
  const startTime = new Date(ann.startDate).getTime();
  const endTime = ann.endDate ? new Date(ann.endDate).getTime() : startTime + 4 * 3600 * 1000;

  if (refTime > endTime) {
    return 'completed';
  }
  if (refTime >= startTime && refTime <= endTime) {
    return 'active';
  }
  return 'upcoming';
}

export function getStatusBadgeConfig(status: DisplayStatus, language: Language) {
  switch (status) {
    case 'active':
      return {
        label:
          language === 'kg'
            ? 'Действует (Иштеп жатат)'
            : language === 'en'
            ? 'Active'
            : 'Действует сейчас',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500 animate-pulse',
        icon: 'play_arrow',
      };
    case 'upcoming':
      return {
        label:
          language === 'kg'
            ? 'Предстоящее (Алдыдагы)'
            : language === 'en'
            ? 'Upcoming'
            : 'Предстоящее',
        bg: 'bg-blue-50',
        text: 'text-[#12327A]',
        border: 'border-blue-200',
        dot: 'bg-[#12327A]',
        icon: 'event',
      };
    case 'completed':
      return {
        label:
          language === 'kg'
            ? 'Завершено (Аяктады)'
            : language === 'en'
            ? 'Completed'
            : 'Завершено (В архиве)',
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        icon: 'check_circle',
      };
    case 'cancelled':
      return {
        label:
          language === 'kg'
            ? 'Отменено (Жокко чыгарылды)'
            : language === 'en'
            ? 'Cancelled'
            : 'Отменено',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500',
        icon: 'cancel',
      };
    case 'rescheduled':
      return {
        label:
          language === 'kg'
            ? 'Перенесено (Жылдырылды)'
            : language === 'en'
            ? 'Rescheduled'
            : 'Перенесено',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        icon: 'update',
      };
  }
}
