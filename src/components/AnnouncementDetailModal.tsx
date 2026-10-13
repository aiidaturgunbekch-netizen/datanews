import React, { useEffect, useState } from 'react';
import { Announcement, Language } from '../types';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';
import { EventImage } from './EventImage';
import { formatDayMonthTime, formatWhen } from '../utils/dates';

interface Props {
  announcement: Announcement;
  currentLanguage: Language;
  onClose: () => void;
  onSelectOtherNotice?: (a: Announcement) => void;
  allAnnouncements: Announcement[];
}

const L = {
  when: { ru: 'Когда', kg: 'Качан', en: 'When' },
  where: { ru: 'Где', kg: 'Кайда', en: 'Where' },
  price: { ru: 'Стоимость', kg: 'Баасы', en: 'Price' },
  about: { ru: 'Подробности', kg: 'Кеңири маалымат', en: 'Details' },
  source: { ru: 'Источник', kg: 'Булак', en: 'Source' },
  openSource: { ru: 'Открыть источник', kg: 'Булакты ачуу', en: 'Open source' },
  map: { ru: 'Показать на карте', kg: 'Картадан көрсөтүү', en: 'Show on map' },
  ics: { ru: 'Добавить в календарь', kg: 'Календарга кошуу', en: 'Add to calendar' },
  share: { ru: 'Поделиться', kg: 'Бөлүшүү', en: 'Share' },
  copied: { ru: 'Ссылка скопирована', kg: 'Шилтеме көчүрүлдү', en: 'Link copied' },
  verified: { ru: 'Проверено', kg: 'Текшерилген', en: 'Verified' },
  updated: { ru: 'Обновлено', kg: 'Жаңыртылды', en: 'Updated' },
  nearby: { ru: 'Ещё в этом городе', kg: 'Дагы ушул шаарда', en: 'More in this city' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
  until: { ru: 'до', kg: 'чейин', en: 'until' },
};

const toIcsDate = (iso: string) => iso.replace(/[-:]/g, '').slice(0, 15);

export const AnnouncementDetailModal: React.FC<Props> = ({
  announcement: a,
  currentLanguage: lang,
  onClose,
  onSelectOtherNotice,
  allAnnouncements,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const status = getAnnouncementDisplayStatus(a);
  const badge = getStatusBadgeConfig(status, lang);
  const isEvent = a.urgency === 'event';
  const mapQuery = a.coordinates ? `${a.coordinates.lat},${a.coordinates.lng}` : encodeURIComponent(a.location.ru);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const nearby = allAnnouncements.filter((x) => x.id !== a.id && x.city === a.city).slice(0, 3);

  const whenText = formatWhen(a.startDate, a.endDate, lang, true);

  const downloadIcs = () => {
    const end = a.endDate || new Date(new Date(a.startDate).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DataNews KG//RU', 'BEGIN:VEVENT',
      `UID:${a.id}@datanews.kg`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}Z`,
      `DTSTART:${toIcsDate(a.startDate)}00`,
      `DTEND:${toIcsDate(end)}00`,
      `SUMMARY:${a.title[lang]}`,
      `LOCATION:${a.location[lang]}`,
      `DESCRIPTION:${a.summary[lang]}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${a.id}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const data = { title: a.title[lang], text: a.summary[lang], url: a.sourceUrl || window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(`${data.title}\n${data.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* пользователь отменил */
    }
  };

  const Row = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="material-symbols-outlined text-[#12327A] mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-sm font-semibold text-[#0f1b33] break-words">{children}</div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0d2459]/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={a.title[lang]}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {a.imageUrl && <EventImage item={a} showCredit className="w-full aspect-[16/9] sm:rounded-t-3xl rounded-t-3xl" />}
        <div className={`px-6 pt-6 pb-5 text-white ${isEvent ? 'bg-gradient-to-br from-[#12327A] via-[#1d4ed8] to-[#20C7B5]' : 'bg-gradient-to-br from-[#0d2459] to-[#12327A]'}`}>
          <button
            onClick={onClose}
            aria-label={L.close[lang]}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="flex flex-wrap items-center gap-2 mb-3 pr-10">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.bg} ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
            {a.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                {L.verified[lang]}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{a.title[lang]}</h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">{a.summary[lang]}</p>
        </div>

        <div className="px-6 py-4">
          <Row icon="event" label={L.when[lang]}>{whenText}</Row>
          <Row icon="location_on" label={L.where[lang]}>{a.location[lang]}</Row>
          {a.eventDetails?.priceText && (
            <Row icon="confirmation_number" label={L.price[lang]}>{a.eventDetails.priceText[lang]}</Row>
          )}
          {a.eventDetails?.timeRange && (
            <Row icon="schedule" label={lang === "en" ? "Time & age" : lang === "kg" ? "Убактысы жана жаш чеги" : "Время и возраст"}>{a.eventDetails.timeRange}</Row>
          )}
          {a.eventDetails?.organizer && (
            <Row icon="groups" label={lang === 'en' ? 'Organizer' : lang === 'kg' ? 'Уюштуруучу' : 'Организатор'}>{a.eventDetails.organizer}</Row>
          )}
          {a.eventDetails?.contactPhone && (
            <Row icon="call" label={lang === 'en' ? 'Phone' : lang === 'kg' ? 'Маалымат үчүн телефон' : 'Телефон для справок'}>
              <a className="text-[#12327A] hover:underline" href={`tel:${a.eventDetails.contactPhone.replace(/[^\d+]/g, '')}`}>
                {a.eventDetails.contactPhone}
              </a>
            </Row>
          )}
          {a.emergencyContacts && a.emergencyContacts.length > 0 && (
            <Row icon="support_agent" label={lang === 'en' ? 'Hotlines' : lang === 'kg' ? 'Кайда чалуу керек' : 'Куда звонить'}>
              <div className="flex flex-wrap gap-2 mt-1">
                {a.emergencyContacts.map((c) => (
                  <a
                    key={c.phone + c.name}
                    href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#eef2f9] text-[#12327A] text-xs font-bold hover:bg-[#dbe1ff]"
                  >
                    {c.name}: {c.phone}
                  </a>
                ))}
              </div>
            </Row>
          )}
        </div>

        <div className="px-6 pb-2">
          <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2">{L.about[lang]}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{a.description[lang]}</p>
        </div>

        <div className="px-6 py-5 flex flex-wrap gap-2">
          {a.eventDetails?.ticketUrl && (
            <a
              href={a.eventDetails.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold hover:bg-[#1bb3a2] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
              {lang === 'en' ? 'Tickets' : lang === 'kg' ? 'Билеттер' : 'Купить билет'}
            </a>
          )}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#12327A] text-white text-sm font-bold hover:bg-[#0d2459] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            {L.map[lang]}
          </a>
          <button
            onClick={downloadIcs}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold hover:bg-[#dbe1ff] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
            {L.ics[lang]}
          </button>
          <button
            onClick={share}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold hover:bg-[#dbe1ff] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'share'}</span>
            {copied ? L.copied[lang] : L.share[lang]}
          </button>
        </div>

        <div className="mx-6 mb-6 p-4 rounded-2xl bg-[#f8fafc] border border-gray-100 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-[#0f1b33]">{L.source[lang]}:</span> {a.sourceName}
            <div className="text-gray-400 mt-0.5">
              {L.updated[lang]}: {formatDayMonthTime(a.updatedAt, lang)}
            </div>
          </div>
          {a.sourceUrl && (
            <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline inline-flex items-center gap-1">
              {L.openSource[lang]}
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          )}
        </div>

        {nearby.length > 0 && onSelectOtherNotice && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-extrabold text-[#0f1b33] mb-2">{L.nearby[lang]}</h3>
            <div className="space-y-2">
              {nearby.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onSelectOtherNotice(n)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-[#12327A]/30 hover:bg-[#f3f6fc] transition-colors text-sm font-semibold text-[#0f1b33]"
                >
                  {n.title[lang]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
