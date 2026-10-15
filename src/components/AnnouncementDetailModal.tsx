import React, { useEffect, useState } from 'react';
import { Announcement, Language } from '../types';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';
import { EventImage } from './EventImage';
import { getTranslation } from '../locales/translations';
import { formatDate, formatDayMonthTime, formatWhen } from '../utils/dates';
import { eventSource, groupedSources, hostOf, isGovTicket, SourceLink, ticketLink } from '../utils/links';
import * as api from '../services/api';
import { Report } from '../types';
import { isExpired } from '../utils/urgency';
import { kgDateStr, kgTs } from '../utils/time';

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
  buy: { ru: 'Купить билет', kg: 'Билеттерди сатып алуу', en: 'Buy tickets' },
  ticketUnverified: {
    ru: 'Ссылка на билеты от организатора пока не подтверждена',
    kg: 'Уюштуруучунун билет шилтемеси азырынча тастыктала элек',
    en: 'Organiser’s ticket link is not yet verified',
  },
  noTickets: {
    ru: 'Ссылка на покупку билетов пока не подтверждена',
    kg: 'Билет сатып алуучу шилтеме азырынча тастыктала элек',
    en: 'Ticket link not yet confirmed',
  },
  links: { ru: 'Первоисточники', kg: 'Түпкү булактар', en: 'Primary sources' },
  eventSource: { ru: 'Источник информации', kg: 'Маалымат булагы', en: 'Information source' },
  artist: { ru: 'Официальный сайт артиста', kg: 'Артисттин расмий сайты', en: 'Artist’s official site' },
  organizer: { ru: 'Организатор', kg: 'Уюштуруучу', en: 'Organiser' },
  venue: { ru: 'Площадка', kg: 'Аянтча', en: 'Venue' },
  imageSource: { ru: 'Источник фото', kg: 'Сүрөттүн булагы', en: 'Photo source' },
  needsCheck: { ru: 'Требует проверки', kg: 'Текшерүүнү талап кылат', en: 'Needs verification' },
  originManual: { ru: 'Внесено вручную редакцией', kg: 'Редакция кол менен киргизген', en: 'Added manually by the editors' },
  originUser: { ru: 'Публикация организатора, прошла модерацию', kg: 'Уюштуруучунун жарыясы, модерациядан өткөн', en: 'Organiser’s post, moderated' },
  originAuto: { ru: 'Собрано автоматически', kg: 'Автоматтык түрдө чогултулган', en: 'Collected automatically' },
  checkedAt: { ru: 'проверено', kg: 'текшерилген', en: 'checked' },
  official: { ru: 'Официальный источник', kg: 'Расмий булак', en: 'Official source' },
  authority: { ru: 'Официальный сайт ведомства', kg: 'Мекеменин расмий сайты', en: 'Official website of the agency' },
  dangerLevel: { ru: 'Уровень опасности (по данным ведомства)', kg: 'Коркунучтун деңгээли (мекеменин маалыматы боюнча)', en: 'Danger level (per the agency)' },
  danger_high: { ru: 'Высокая / непосредственная опасность', kg: 'Жогорку / түз коркунуч', en: 'High / immediate danger' },
  danger_warning: { ru: 'Потенциальная опасность — предупреждение', kg: 'Мүмкүн болгон коркунуч — эскертүү', en: 'Potential danger — warning' },
  danger_info: { ru: 'Информация, опасность не установлена', kg: 'Маалымат, коркунуч белгиленген эмес', en: 'Information, no danger declared' },
  kind: { ru: 'Тип сообщения', kg: 'Билдирүүнүн түрү', en: 'Type' },
  kind_decision: { ru: 'Принятое решение', kg: 'Кабыл алынган чечим', en: 'Decision taken' },
  kind_statement: { ru: 'Заявление (не решение)', kg: 'Билдирүү (чечим эмес)', en: 'Statement (not a decision)' },
  kind_instruction: { ru: 'Поручение / обещание (ещё не выполнено)', kg: 'Тапшырма / убада (али аткарыла элек)', en: 'Instruction / promise (not yet carried out)' },
  kind_meeting: { ru: 'Встреча / визит', kg: 'Жолугушуу / сапар', en: 'Meeting / visit' },
  kind_session: { ru: 'Заседание', kg: 'Жыйын', en: 'Session' },
  kind_law: { ru: 'Закон / нормативный акт', kg: 'Мыйзам / ченемдик акт', en: 'Law / regulation' },
  kind_program: { ru: 'Государственная программа', kg: 'Мамлекеттик программа', en: 'State programme' },
  publishedOn: { ru: 'Дата публикации', kg: 'Жарыяланган күнү', en: 'Published' },
  adopted: { ru: 'Принят / подписан', kg: 'Кабыл алынган / кол коюлган', en: 'Adopted / signed' },
  officialPub: { ru: 'Официально опубликован', kg: 'Расмий жарыяланган', en: 'Officially published' },
  effective: { ru: 'Вступает в силу', kg: 'Күчүнө кирет', en: 'In force from' },
  notYet: { ru: 'ещё не действует', kg: 'азырынча күчүндө эмес', en: 'not yet in force' },
  notSet: { ru: 'не указано в источнике', kg: 'булакта көрсөтүлгөн эмес', en: 'not stated in the source' },
  whatChanged: { ru: 'Что изменилось', kg: 'Эмне өзгөрдү', en: 'What changed' },
  whoAffected: { ru: 'Кого касается', kg: 'Кимге тиешелүү', en: 'Who is affected' },
  whatToDo: { ru: 'Что делать на практике', kg: 'Иш жүзүндө эмне кылуу керек', en: 'What to do' },
  transitional: { ru: 'Переходный период и исключения', kg: 'Өткөөл мезгил жана өзгөчөлүктөр', en: 'Transition period & exceptions' },
  docText: { ru: 'Официальный текст документа', kg: 'Документтин расмий тексти', en: 'Official text of the document' },
  authorityTitle: { ru: 'Ответственное ведомство', kg: 'Жооптуу мекеме', en: 'Responsible agency' },
  additional: { ru: 'Дополнительный источник', kg: 'Кошумча булак', en: 'Additional source' },
  media: { ru: 'Публикация СМИ / афиши', kg: 'ЖМКнын / афишанын жарыясы', en: 'News or listings report' },
  ticketPage: { ru: 'Страница события в билетном сервисе', kg: 'Билет кызматындагы окуянын баракчасы', en: 'Event page on the ticket service' },
  ticketsTitle: { ru: 'Купить билет', kg: 'Билет сатып алуу', en: 'Buy tickets' },
  govTicket: { ru: 'GovTicket — государственный билетный сервис', kg: 'GovTicket — мамлекеттик билет кызматы', en: 'GovTicket — state ticketing service' },
  privateTicket: { ru: 'частный билетный сервис', kg: 'жеке билет кызматы', en: 'private ticketing service' },
  mediaOnly: {
    ru: 'Официальное сообщение в открытом доступе не найдено — сведения взяты из СМИ. Уточняйте у ответственной службы.',
    kg: 'Расмий билдирүү ачык булактарда табылган жок — маалымат ЖМКдан алынды. Жооптуу кызматтан тактаңыз.',
    en: 'No official notice was found publicly — this information comes from the media. Check with the responsible service.',
  },
  govPost: {
    ru: 'Официальная публикация организации. Организация самостоятельно отвечает за достоверность сведений.',
    kg: 'Уюмдун расмий жарыясы. Маалыматтын тактыгы үчүн уюм өзү жооп берет.',
    en: 'Official post by the organisation, which is responsible for the accuracy of the information.',
  },
  report: { ru: 'Пожаловаться', kg: 'Даттануу', en: 'Report' },
  reportTitle: { ru: 'Сообщить о проблеме с публикацией', kg: 'Жарыядагы көйгөй тууралуу билдирүү', en: 'Report a problem with this post' },
  reportComment: { ru: 'Что не так? (необязательно)', kg: 'Эмне туура эмес? (милдеттүү эмес)', en: 'What is wrong? (optional)' },
  reportContact: { ru: 'Ваш контакт для ответа (необязательно)', kg: 'Жооп үчүн байланышыңыз (милдеттүү эмес)', en: 'Your contact for a reply (optional)' },
  reportSend: { ru: 'Отправить жалобу', kg: 'Даттанууну жөнөтүү', en: 'Send report' },
  reportThanks: { ru: 'Спасибо! Администратор проверит публикацию.', kg: 'Рахмат! Администратор жарыяны текшерет.', en: 'Thank you! The administrator will review the post.' },
  reportFail: { ru: 'Не удалось отправить жалобу. Попробуйте позже.', kg: 'Даттанууну жөнөтүү мүмкүн болгон жок. Кийинчерээк аракет кылыңыз.', en: 'Could not send the report. Please try later.' },
};

const REASONS: { id: Report['reason']; ru: string; kg: string; en: string }[] = [
  { id: 'false', ru: 'Недостоверная информация', kg: 'Туура эмес маалымат', en: 'False information' },
  { id: 'outdated', ru: 'Устаревшие сведения', kg: 'Эскирген маалымат', en: 'Outdated information' },
  { id: 'offensive', ru: 'Оскорбительное содержание', kg: 'Кордогон мазмун', en: 'Offensive content' },
  { id: 'spam', ru: 'Спам / реклама', kg: 'Спам / жарнама', en: 'Spam / advertising' },
  { id: 'other', ru: 'Другое', kg: 'Башка', en: 'Other' },
];

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

  const { t } = getTranslation(lang);
  const status = getAnnouncementDisplayStatus(a);
  const badge = getStatusBadgeConfig(status, lang);
  const isEvent = a.urgency === 'event';
  const mapQuery = a.coordinates ? `${a.coordinates.lat},${a.coordinates.lng}` : encodeURIComponent(a.location.ru);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const tickets = ticketLink(a);
  // Свободный вход — билеты не нужны, пометку «ссылка не подтверждена» не показываем
  const freeEntry = /свободный|бесплатн|акысыз|free/i.test(a.eventDetails?.priceText?.ru || '');
  const source = eventSource(a);
  const groups = groupedSources(a);
  const govTicket = tickets.url ? isGovTicket(tickets.url) : false;
  const LINK_META: Record<SourceLink['label'], { text: string; icon: string }> = {
    official: { text: L.official[lang], icon: 'verified' },
    authority: { text: L.authority[lang], icon: 'account_balance' },
    organizer: { text: L.organizer[lang], icon: 'groups' },
    artist: { text: L.artist[lang], icon: 'star' },
    venue: { text: L.venue[lang], icon: 'stadium' },
    media: { text: L.media[lang], icon: 'newspaper' },
    ticketPage: { text: L.ticketPage[lang], icon: 'confirmation_number' },
    additional: { text: L.additional[lang], icon: 'article' },
    image: { text: L.imageSource[lang], icon: 'photo_camera' },
  };
  const sections = [
    {
      // только сайт ведомства (само сообщение там не найдено) — не называем это официальным источником
      title: groups.official.some((o) => o.label === 'official') ? L.official[lang] : L.authorityTitle[lang],
      items: groups.official,
    },
    { title: L.organizer[lang], items: groups.organizer },
    { title: L.additional[lang], items: groups.additional },
  ].filter((x) => x.items.length > 0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<Report['reason']>('false');
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [reportState, setReportState] = useState<'' | 'sending' | 'ok' | 'fail'>('');
  useEffect(() => {
    // при переходе к другому событию форма жалобы начинается заново
    setReportOpen(false);
    setReportState('');
    setComment('');
  }, [a.id]);
  const sendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportState('sending');
    try {
      await api.submitReport(a.id, reason, comment.trim() || undefined, contact.trim() || undefined);
      setReportState('ok');
    } catch {
      setReportState('fail');
    }
  };
  // Только ещё не завершившиеся, ближайшие по дате
  const nearby = allAnnouncements
    .filter((x) => x.id !== a.id && x.city === a.city && !isExpired(x))
    .sort((x, y) => kgTs(x.startDate) - kgTs(y.startDate))
    .slice(0, 3);

  const whenText = formatWhen(a.startDate, a.endDate, lang, true, a.timeTBA, a.allDay);

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
    // Ссылка на саму публикацию DataNews — мессенджеры покажут заголовок, описание и картинку (api/share.ts)
    const data = { title: a.title[lang], text: a.summary[lang], url: `${window.location.origin}/n/${a.id}` };
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
        <EventImage item={a} lang={lang} showCredit className={`w-full sm:rounded-t-3xl rounded-t-3xl ${a.imageFit === "cover" ? "aspect-[16/9]" : "h-[58vh] max-h-[620px] min-h-[240px]"}`} />
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
            {!a.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/90 text-[#3b2a00] text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">help</span>
                {L.needsCheck[lang]}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{a.title[lang]}</h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">{a.summary[lang]}</p>
        </div>

        <div className="px-6 py-4">
          <Row icon="event" label={L.when[lang]}>{whenText}</Row>
          <Row icon="location_on" label={L.where[lang]}>
            {a.location[lang]}
            {(a.locality || a.district) && (
              <span className="block text-xs text-gray-500">{[a.locality, a.district].filter(Boolean).join(' • ')}</span>
            )}
            <span className="block text-xs text-gray-500">{t(`cities.${a.city === 'karakol' ? 'issykkul' : a.city}`)}</span>
          </Row>
          {a.dangerLevel && (
            <Row icon="emergency_home" label={L.dangerLevel[lang]}>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  a.dangerLevel === 'high' ? 'bg-red-600 text-white' : a.dangerLevel === 'warning' ? 'bg-amber-300 text-[#3b2a00]' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {L[`danger_${a.dangerLevel}` as const][lang]}
              </span>
            </Row>
          )}
          {a.newsKind && <Row icon="label" label={L.kind[lang]}>{L[`kind_${a.newsKind}` as const][lang]}</Row>}
          {a.publishedAt && <Row icon="history_edu" label={L.publishedOn[lang]}>{formatDayMonthTime(a.publishedAt, lang)}</Row>}
          {a.legal && (
            <div className="my-3 p-4 rounded-2xl bg-[#f6f8fd] border border-[#12327A]/10 space-y-2 text-sm">
              {a.legal.docTitle && <div className="font-extrabold text-[#0f1b33]">{a.legal.docTitle[lang]}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {a.legal.adoptedAt && (
                  <div>
                    <div className="text-gray-500">{L.adopted[lang]}</div>
                    <b>{formatDate(a.legal.adoptedAt, lang)}</b>
                  </div>
                )}
                {a.legal.officialPublishedAt && (
                  <div>
                    <div className="text-gray-500">{L.officialPub[lang]}</div>
                    <b>{formatDate(a.legal.officialPublishedAt, lang)}</b>
                  </div>
                )}
                <div>
                  <div className="text-gray-500">{L.effective[lang]}</div>
                  <b className={a.legal.effectiveFrom && a.legal.effectiveFrom > kgDateStr() ? 'text-amber-700' : ''}>
                    {a.legal.effectiveFrom
                      ? `${formatDate(a.legal.effectiveFrom, lang)}${a.legal.effectiveFrom > kgDateStr() ? ` — ${L.notYet[lang]}` : ''}`
                      : L.notSet[lang]}
                  </b>
                </div>
              </div>
              {(['whatChanged', 'whoAffected', 'whatToDo', 'transitional'] as const).map((k) =>
                a.legal?.[k] ? (
                  <div key={k}>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{L[k][lang]}</div>
                    <p className="text-gray-800">{a.legal[k]![lang]}</p>
                  </div>
                ) : null
              )}
              {a.legal.docUrl && (
                <a href={a.legal.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#12327A] font-bold hover:underline">
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  {L.docText[lang]} — {hostOf(a.legal.docUrl)}
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              )}
            </div>
          )}
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
          {tickets.url && tickets.verified && (
            <a
              href={tickets.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold hover:bg-[#1bb3a2] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
              {L.buy[lang]}
              <span className="text-[11px] font-semibold opacity-75">· {govTicket ? 'GovTicket' : hostOf(tickets.url)}</span>
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
          {source && (
            <a href={source} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline inline-flex items-center gap-1">
              {L.openSource[lang]}
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          )}
        </div>

        {a.publishedByGov && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-[#eef2f9] text-xs text-[#0f1b33] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#12327A]">account_balance</span>
            <span>{L.govPost[lang]}</span>
          </div>
        )}

        {/* Источники: официальный, организатор, билеты, дополнительный — отдельными ссылками */}
        {(isEvent || sections.length > 0 || tickets.url) && (
          <div className="mx-6 mb-6 space-y-3">
            <h3 className="text-sm font-extrabold text-[#0f1b33]">{L.links[lang]}</h3>
            {groups.mediaOnly && !isEvent && (
              <p className="text-xs text-amber-900 bg-amber-50 rounded-xl p-2.5 flex gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                {L.mediaOnly[lang]}
              </p>
            )}
            {sections.map((sec) => (
              <div key={sec.title}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{sec.title}</div>
                <ul className="space-y-1 text-sm">
                  {sec.items.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#12327A] font-semibold hover:underline break-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">{LINK_META[l.label].icon}</span>
                        <span>{LINK_META[l.label].text}</span>
                        <span className="text-gray-400 font-normal">— {hostOf(l.href)}</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(tickets.url || (isEvent && !freeEntry)) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{L.ticketsTitle[lang]}</div>
                <ul className="space-y-1 text-sm">
                  {tickets.url && tickets.verified && (
                    <li>
                      <a href={tickets.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#12327A] font-semibold hover:underline break-all">
                        <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                        <span>{govTicket ? L.govTicket[lang] : `${hostOf(tickets.url)} (${L.privateTicket[lang]})`}</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    </li>
                  )}
                  {tickets.url && !tickets.verified && (
                    <li className="flex flex-wrap items-center gap-1.5 text-gray-600">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">help</span>
                      <span>{L.ticketUnverified[lang]}:</span>
                      <a href={tickets.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 underline break-all">
                        {hostOf(tickets.url)}
                      </a>
                    </li>
                  )}
                  {!tickets.url && (
                    <li className="flex items-center gap-1.5 text-gray-500">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>{L.noTickets[lang]}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {(a.dataOrigin || a.lastCheckedAt) && (
          <p className="mx-6 mb-6 -mt-3 text-xs text-gray-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">fact_check</span>
            <span>
              {a.dataOrigin === 'auto' ? L.originAuto[lang] : a.dataOrigin === 'user' ? L.originUser[lang] : L.originManual[lang]}
              {a.lastCheckedAt && ` • ${L.checkedAt[lang]} ${formatDayMonthTime(a.lastCheckedAt, lang)}`}
            </span>
          </p>
        )}

        <div className="mx-6 mb-6">
          {!reportOpen ? (
            <button onClick={() => setReportOpen(true)} className="text-xs font-bold text-gray-500 hover:text-red-700 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">flag</span>
              {L.report[lang]}
            </button>
          ) : reportState === 'ok' ? (
            <p className="text-xs font-bold text-emerald-700">{L.reportThanks[lang]}</p>
          ) : (
            <form onSubmit={sendReport} className="p-3 rounded-xl border border-gray-200 space-y-2 text-sm">
              <div className="font-bold text-[#0f1b33]">{L.reportTitle[lang]}</div>
              <select value={reason} onChange={(e) => setReason(e.target.value as Report['reason'])} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r[lang]}
                  </option>
                ))}
              </select>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={2} placeholder={L.reportComment[lang]} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder={L.reportContact[lang]} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              {reportState === 'fail' && <p className="text-xs font-bold text-red-700">{L.reportFail[lang]}</p>}
              <div className="flex gap-2">
                <button disabled={reportState === 'sending'} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60">
                  {L.reportSend[lang]}
                </button>
                <button type="button" onClick={() => setReportOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                  {L.close[lang]}
                </button>
              </div>
            </form>
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
