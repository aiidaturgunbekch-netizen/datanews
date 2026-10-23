import React from 'react';
import { Announcement, Language } from '../types';

/**
 * Платное размещение — публикация пользователя по тарифу (не редакционная и не от подтверждённого госоргана).
 * Редакционные материалы и сообщения госорганов меткой не помечаются.
 */
export const isPaid = (a: Announcement) => a.dataOrigin === 'user' && !a.publishedByGov;

const LABEL: Record<Language, string> = { ru: 'Платное размещение', kg: 'Акылуу жайгаштыруу', en: 'Paid placement' };
const HINT: Record<Language, string> = {
  ru: 'Публикация организатора по тарифу DataNews. Прошла модерацию; за сведения отвечает организатор.',
  kg: 'Уюштуруучунун DataNews тарифи боюнча жарыясы. Модерациядан өткөн; маалымат үчүн уюштуруучу жооп берет.',
  en: 'Organiser’s post under a DataNews plan. Moderated; the organiser is responsible for the details.',
};

export const PaidBadge: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) =>
  isPaid(item) ? (
    <span
      title={HINT[lang]}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[10.5px] font-bold uppercase tracking-wide ${className}`}
    >
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        sell
      </span>
      {LABEL[lang]}
    </span>
  ) : null;

export const PaidNote: React.FC<{ item: Announcement; lang: Language }> = ({ item, lang }) =>
  isPaid(item) ? (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        sell
      </span>
      <span>
        <b>{LABEL[lang]}.</b> {HINT[lang]}
      </span>
    </div>
  ) : null;
