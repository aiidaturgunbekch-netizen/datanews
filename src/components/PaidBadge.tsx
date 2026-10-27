import React from 'react';
import { Announcement, Language } from '../types';

/**
 * Платное размещение — публикация пользователя по тарифу (не редакционная и не от подтверждённого госоргана).
 * Редакционные материалы и сообщения госорганов меткой не помечаются.
 */
export const isPaid = (a: Announcement) => a.dataOrigin === 'user' && !a.publishedByGov;

// Коммерческое размещение явно отличается от редакционных материалов (не маскируется под новость)
const LABEL: Record<Language, string> = { ru: 'Партнёрский материал', kg: 'Өнөктөштүк материал', en: 'Partner content' };
const HINT: Record<Language, string> = {
  ru: 'Платное размещение организатора по тарифу DataNews. Прошло модерацию; за сведения отвечает организатор, а не редакция.',
  kg: 'Уюштуруучунун DataNews тарифи боюнча акылуу жайгаштыруусу. Модерациядан өткөн; маалымат үчүн редакция эмес, уюштуруучу жооп берет.',
  en: 'Paid placement by the organiser under a DataNews plan. Moderated; the organiser, not the editors, is responsible for the details.',
};

export const PaidBadge: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) =>
  isPaid(item) ? (
    <span
      title={HINT[lang]}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border border-partner/25 bg-partner-wash text-partner text-[10.5px] font-bold uppercase tracking-wide ${className}`}
    >
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        sell
      </span>
      {LABEL[lang]}
    </span>
  ) : null;

export const PaidNote: React.FC<{ item: Announcement; lang: Language }> = ({ item, lang }) =>
  isPaid(item) ? (
    <div className="p-3 rounded-xl bg-partner-wash border border-partner/25 text-xs text-partner flex items-start gap-2">
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        sell
      </span>
      <span>
        <b>{LABEL[lang]}.</b> {HINT[lang]}
      </span>
    </div>
  ) : null;
