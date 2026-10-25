import { PaidNote } from './PaidBadge';
import React, { useEffect, useRef, useState } from 'react';
import { Announcement, Language } from '../types';
import { getAnnouncementDisplayStatus, getStatusBadgeConfig } from '../utils/statusUtils';
import { EventImage } from './EventImage';
import { Logo } from './Logo';
import { SHARE_TITLE, ShareMenu } from './ShareMenu';
import { rubricIdOf } from '../config/rubrics';
import { getTranslation } from '../locales/translations';
import { formatDate, formatDayMonthTime, formatWhen } from '../utils/dates';
import { eventSource, groupedSources, hostOf, isGovTicket, SourceLink, ticketLink } from '../utils/links';
import * as api from '../services/api';
import { Report } from '../types';

/** Подписи для истории исправлений */
const CORR: Record<string, Record<Language, string>> = {
  title: { ru: 'Исправления', kg: 'Оңдоолор', en: 'Corrections' },
  changed: { ru: 'изменено', kg: 'өзгөртүлдү', en: 'changed' },
  date: { ru: 'дата и время', kg: 'дата жана убакыт', en: 'date and time' },
  place: { ru: 'место', kg: 'жер', en: 'place' },
  title_: { ru: 'заголовок', kg: 'аталыш', en: 'title' },
  price: { ru: 'цена', kg: 'баа', en: 'price' },
  status: { ru: 'статус', kg: 'статус', en: 'status' },
  tickets: { ru: 'ссылка на билеты', kg: 'билет шилтемеси', en: 'ticket link' },
  effective: { ru: 'дата вступления в силу', kg: 'күчүнө кирген күнү', en: 'entry-into-force date' },
};
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
  related: { ru: 'Читайте также', kg: 'Дагы окуңуз', en: 'Read also' },
  back: { ru: 'Назад', kg: 'Артка', en: 'Back' },
  brief: { ru: 'Коротко', kg: 'Кыскача', en: 'At a glance' },
  published: { ru: 'Опубликовано', kg: 'Жарыяланды', en: 'Published' },
  document: { ru: 'Документ', kg: 'Документ', en: 'Document' },
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
  // Дата последней сверки редакцией — не подтверждение события (подтверждение — отдельная отметка «Проверено»)
  checkedAt: { ru: 'дата сверки редакцией', kg: 'редакция салыштырган күн', en: 'last reviewed by editors' },
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
  // Меню «Поделиться» в верхней строке; Escape сначала закрывает меню, потом статью
  const [shareOpen, setShareOpen] = useState(false);
  const shareOpenRef = useRef(false);
  shareOpenRef.current = shareOpen;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shareOpenRef.current) setShareOpen(false);
      else onClose();
    };
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
  const corrections = (a.history || []).filter((h) => h.action === 'edited' && h.changes?.length).slice(-5);
  const [reason, setReason] = useState<Report['reason']>('false');
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [reportState, setReportState] = useState<'' | 'sending' | 'ok' | 'fail'>('');
  useEffect(() => {
    // при переходе к другому событию форма жалобы начинается заново
    setReportOpen(false);
    setShareOpen(false);
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
  // «Читайте также»: только ещё не завершившиеся; сначала та же рубрика в том же городе, затем та же рубрика, затем тот же город
  const rubric = rubricIdOf(a.category);
  const relScore = (x: Announcement) => (rubricIdOf(x.category) === rubric ? 0 : 2) + (x.city === a.city ? 0 : 1);
  const related = allAnnouncements
    .filter((x) => x.id !== a.id && !isExpired(x) && (rubricIdOf(x.category) === rubric || x.city === a.city))
    .sort((x, y) => relScore(x) - relScore(y) || kgTs(x.startDate) - kgTs(y.startDate))
    .slice(0, 4);

  // Страница статьи прокручивается сама; при переходе к другой новости — в начало, фокус на саму страницу
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
    pageRef.current?.focus({ preventScroll: true });
  }, [a.id]);

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

  // Ссылка на саму публикацию DataNews — мессенджеры покажут заголовок, описание и картинку (api/share.ts)
  const shareUrl = `${window.location.origin}/n/${a.id}${lang === 'ru' ? '' : `?lang=${lang}`}`;

  const cityLabel = t(`cities.${a.city === 'karakol' ? 'issykkul' : a.city}`);
  const title = a.title[lang] || a.title.ru;
  const summary = a.summary[lang] || a.summary.ru;
  const body = a.description[lang] || a.description.ru;

  /** Одна строка блока «Коротко» */
  const Fact = ({ icon, label, children, wide = false }: { icon: string; label: string; children: React.ReactNode; wide?: boolean }) => (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        <span className="material-symbols-outlined text-[16px] text-[#12327A]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-[15px] leading-snug font-semibold text-[#0f1b33] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-serif text-xl font-bold text-[#0f1b33] mb-3">{children}</h2>
  );
  const btn = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors';

  return (
    <div ref={pageRef} tabIndex={-1} className="fixed inset-0 z-[100] bg-white overflow-y-auto overscroll-contain outline-none" role="dialog" aria-modal="true" aria-labelledby="article-title">
      {/* Верхняя строка страницы статьи: назад, логотип, поделиться */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 -ml-1 px-1 py-1 rounded-lg text-sm font-bold text-[#12327A] hover:underline focus-visible:ring-2 focus-visible:ring-[#12327A]"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            {L.back[lang]}
          </button>
          <button type="button" onClick={onClose} aria-label={L.close[lang]} className="hidden sm:block">
            <Logo className="h-8" lang={lang} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              aria-expanded={shareOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-[#12327A] hover:bg-[#eef2f9]"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span className="hidden min-[400px]:inline">{L.share[lang]}</span>
            </button>
            {shareOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setShareOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-gray-200 shadow-xl p-2 z-10">
                  <ShareMenu url={shareUrl} title={title} lang={lang} variant="menu" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <article className="max-w-[720px] mx-auto px-4 md:px-6 pt-6 sm:pt-10 pb-16">
        {/* Рубрика и город */}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#12327A]">
          {t(`categories.${a.category}`)}
          <span className="text-gray-400"> · </span>
          <span className="text-gray-600">{cityLabel}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          {a.isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eef2f9] text-[#12327A] text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              {L.verified[lang]}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-[#5c3d00] text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">help</span>
              {L.needsCheck[lang]}
            </span>
          )}
        </div>

        <h1 id="article-title" className="mt-4 font-serif text-[30px] sm:text-[42px] leading-[1.12] font-bold text-[#0f1b33] [overflow-wrap:anywhere]">
          {title}
        </h1>
        {summary && <p className="mt-4 text-lg sm:text-xl leading-relaxed text-[#3b4252]">{summary}</p>}

        {/* Строка доверия: кто сообщил и когда */}
        <div className="mt-6 py-3 border-y border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>
            {L.source[lang]}:{' '}
            {source ? (
              <a href={source} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline">
                {a.sourceName}
              </a>
            ) : (
              <b className="text-[#0f1b33]">{a.sourceName}</b>
            )}
          </span>
          <span>
            {L.published[lang]}: <time dateTime={a.publishedAt}>{formatDayMonthTime(a.publishedAt, lang)}</time>
          </span>
          {a.updatedAt && a.updatedAt !== a.publishedAt && (
            <span>
              {L.updated[lang]}: <time dateTime={a.updatedAt}>{formatDayMonthTime(a.updatedAt, lang)}</time>
            </span>
          )}
        </div>

        <EventImage
          item={a}
          lang={lang}
          showCredit
          className={`mt-6 w-full rounded-xl ${a.imageFit === 'cover' ? 'aspect-[16/9]' : 'h-[52vh] max-h-[560px] min-h-[220px]'}`}
        />

        {/* Коротко: главное о событии одним взглядом */}
        <section aria-labelledby="brief-title" className="mt-8 rounded-2xl bg-[#f3f6fc] p-5 sm:p-6">
          <h2 id="brief-title" className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-4">
            {L.brief[lang]}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Fact icon="event" label={L.when[lang]}>
              {whenText}
            </Fact>
            <Fact icon="location_on" label={L.where[lang]}>
              {a.location[lang] || a.location.ru}
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                {[a.locality, a.district, cityLabel].filter(Boolean).join(' • ')}
              </span>
            </Fact>
            {a.dangerLevel && (
              <Fact icon="emergency_home" label={L.dangerLevel[lang]}>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    a.dangerLevel === 'high' ? 'bg-red-600 text-white' : a.dangerLevel === 'warning' ? 'bg-amber-300 text-[#3b2a00]' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {L[`danger_${a.dangerLevel}` as const][lang]}
                </span>
              </Fact>
            )}
            {a.newsKind && (
              <Fact icon="label" label={L.kind[lang]}>
                {L[`kind_${a.newsKind}` as const][lang]}
              </Fact>
            )}
            {a.legal?.whoAffected && (
              <Fact icon="group" label={L.whoAffected[lang]} wide>
                {a.legal.whoAffected[lang]}
              </Fact>
            )}
            {a.legal?.whatToDo && (
              <Fact icon="task_alt" label={L.whatToDo[lang]} wide>
                {a.legal.whatToDo[lang]}
              </Fact>
            )}
            {a.eventDetails?.priceText && (
              <Fact icon="confirmation_number" label={L.price[lang]}>
                {a.eventDetails.priceText[lang]}
              </Fact>
            )}
            {a.eventDetails?.timeRange && (
              <Fact icon="schedule" label={lang === 'en' ? 'Time & age' : lang === 'kg' ? 'Убактысы жана жаш чеги' : 'Время и возраст'}>
                {a.eventDetails.timeRange}
              </Fact>
            )}
            {a.eventDetails?.organizer && (
              <Fact icon="groups" label={L.organizer[lang]}>
                {a.eventDetails.organizer}
              </Fact>
            )}
            {a.eventDetails?.contactPhone && (
              <Fact icon="call" label={lang === 'en' ? 'Phone' : lang === 'kg' ? 'Маалымат үчүн телефон' : 'Телефон для справок'}>
                <a className="text-[#12327A] hover:underline" href={`tel:${a.eventDetails.contactPhone.replace(/[^\d+]/g, '')}`}>
                  {a.eventDetails.contactPhone}
                </a>
              </Fact>
            )}
            {a.emergencyContacts && a.emergencyContacts.length > 0 && (
              <Fact icon="support_agent" label={lang === 'en' ? 'Hotlines' : lang === 'kg' ? 'Кайда чалуу керек' : 'Куда звонить'} wide>
                <span className="flex flex-wrap gap-2 mt-1">
                  {a.emergencyContacts.map((c) => (
                    <a
                      key={c.phone + c.name}
                      href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#12327A] text-xs font-bold hover:bg-[#dbe1ff]"
                    >
                      {c.name}: {c.phone}
                    </a>
                  ))}
                </span>
              </Fact>
            )}
          </dl>

          <div className="mt-5 pt-5 border-t border-[#12327A]/10 flex flex-wrap gap-2">
            {tickets.url && tickets.verified && (
              <a href={tickets.url} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#20C7B5] text-[#002f29] font-extrabold hover:bg-[#1bb3a2]`}>
                <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                {L.buy[lang]}
                <span className="text-[11px] font-semibold opacity-75">· {govTicket ? 'GovTicket' : hostOf(tickets.url)}</span>
              </a>
            )}
            <button type="button" onClick={downloadIcs} className={`${btn} bg-[#12327A] text-white hover:bg-[#0d2459]`}>
              <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
              {L.ics[lang]}
            </button>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${btn} bg-white text-[#12327A] hover:bg-[#dbe1ff]`}>
              <span className="material-symbols-outlined text-[18px]">map</span>
              {L.map[lang]}
            </a>
          </div>
        </section>

        {/* Текст новости: крупный шрифт, удобная длина строки */}
        {body && body !== summary && (
          <div className="mt-8 text-[18px] leading-[1.75] text-[#1f2937] whitespace-pre-line [overflow-wrap:anywhere]">{body}</div>
        )}

        {/* Поделиться — сразу после текста, где читатель решает, отправить ли новость */}
        <section aria-label={SHARE_TITLE[lang]} className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 mb-3">{SHARE_TITLE[lang]}</h2>
          <ShareMenu url={shareUrl} title={title} lang={lang} />
        </section>

        {a.legal && (
          <section className="mt-10 pt-6 border-t border-gray-200">
            <SectionTitle>{a.legal.docTitle ? a.legal.docTitle[lang] : L.document[lang]}</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {a.legal.adoptedAt && (
                <div>
                  <dt className="text-gray-500">{L.adopted[lang]}</dt>
                  <dd className="font-bold">{formatDate(a.legal.adoptedAt, lang)}</dd>
                </div>
              )}
              {a.legal.officialPublishedAt && (
                <div>
                  <dt className="text-gray-500">{L.officialPub[lang]}</dt>
                  <dd className="font-bold">{formatDate(a.legal.officialPublishedAt, lang)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">{L.effective[lang]}</dt>
                <dd className={`font-bold ${a.legal.effectiveFrom && a.legal.effectiveFrom > kgDateStr() ? 'text-amber-700' : ''}`}>
                  {a.legal.effectiveFrom
                    ? `${formatDate(a.legal.effectiveFrom, lang)}${a.legal.effectiveFrom > kgDateStr() ? ` — ${L.notYet[lang]}` : ''}`
                    : L.notSet[lang]}
                </dd>
              </div>
            </dl>
            {(['whatChanged', 'transitional'] as const).map((k) =>
              a.legal?.[k] ? (
                <div key={k} className="mt-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{L[k][lang]}</h3>
                  <p className="mt-1 text-base leading-7 text-gray-800">{a.legal[k]![lang]}</p>
                </div>
              ) : null
            )}
            {a.legal.docUrl && (
              <a href={a.legal.docUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-[#12327A] font-bold hover:underline">
                <span className="material-symbols-outlined text-[16px]">description</span>
                {L.docText[lang]} — {hostOf(a.legal.docUrl)}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </section>
        )}

        <div className="mt-8 space-y-3 empty:hidden">
          <PaidNote item={a} lang={lang} />
          {a.publishedByGov && (
            <p className="p-3 rounded-xl bg-[#eef2f9] text-sm text-[#0f1b33] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#12327A]">account_balance</span>
              <span>{L.govPost[lang]}</span>
            </p>
          )}
        </div>

        {/* Источники: официальный, организатор, билеты, дополнительный — отдельными ссылками */}
        {(isEvent || sections.length > 0 || tickets.url) && (
          <section className="mt-10 pt-6 border-t border-gray-200 space-y-4">
            <SectionTitle>{L.links[lang]}</SectionTitle>
            {groups.mediaOnly && !isEvent && (
              <p className="text-sm text-amber-900 bg-amber-50 rounded-xl p-3 flex gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                {L.mediaOnly[lang]}
              </p>
            )}
            {sections.map((sec) => (
              <div key={sec.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{sec.title}</h3>
                <ul className="space-y-1 text-sm">
                  {sec.items.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#12327A] font-semibold hover:underline break-all">
                        <span className="material-symbols-outlined text-[16px]">{LINK_META[l.label].icon}</span>
                        <span>{LINK_META[l.label].text}</span>
                        <span className="text-gray-500 font-normal">— {hostOf(l.href)}</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(tickets.url || (isEvent && !freeEntry)) && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{L.ticketsTitle[lang]}</h3>
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
          </section>
        )}

        {/* Происхождение сведений, исправления и жалоба — мелко, в конце статьи */}
        <div className="mt-8 space-y-3 text-xs text-gray-500">
          {(a.dataOrigin || a.lastCheckedAt) && (
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">fact_check</span>
              <span>
                {a.dataOrigin === 'auto' ? L.originAuto[lang] : a.dataOrigin === 'user' ? L.originUser[lang] : L.originManual[lang]}
                {a.lastCheckedAt && ` • ${L.checkedAt[lang]} ${formatDayMonthTime(a.lastCheckedAt, lang)}`}
              </span>
            </p>
          )}

          {/* Публичная история существенных исправлений (без внутренних заметок) */}
          {corrections.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-[#f8fafc] p-3 text-gray-700">
              <div className="font-bold text-[#0f1b33] flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  edit_note
                </span>
                {CORR.title[lang]}
              </div>
              <ul className="space-y-0.5">
                {corrections.map((h, i) => (
                  <li key={i}>
                    {formatDayMonthTime(h.at, lang)} — {CORR.changed[lang]}: {(h.changes || []).map((c) => CORR[c === 'title' ? 'title_' : c]?.[lang] || c).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!reportOpen ? (
            <button type="button" onClick={() => setReportOpen(true)} className="font-bold text-gray-500 hover:text-red-700 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">flag</span>
              {L.report[lang]}
            </button>
          ) : reportState === 'ok' ? (
            <p className="font-bold text-emerald-700">{L.reportThanks[lang]}</p>
          ) : (
            <form onSubmit={sendReport} className="p-3 rounded-xl border border-gray-200 space-y-2 text-sm text-[#0f1b33]">
              <div className="font-bold">{L.reportTitle[lang]}</div>
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

        {/* Читайте также: та же рубрика и тот же город */}
        {related.length > 0 && onSelectOtherNotice && (
          <section aria-labelledby="related-title" className="mt-12 pt-6 border-t-2 border-[#0f1b33]">
            <h2 id="related-title" className="font-serif text-2xl font-bold text-[#0f1b33] mb-5">
              {L.related[lang]}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              {related.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => onSelectOtherNotice(n)} className="group w-full text-left">
                    <EventImage item={n} lang={lang} compact className="w-full aspect-[16/9] rounded-lg mb-3" />
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#12327A]">{t(`categories.${n.category}`)}</span>
                    <span className="block mt-1 font-serif text-lg font-semibold leading-snug text-[#0f1b33] group-hover:text-[#12327A] group-hover:underline underline-offset-2 line-clamp-3 [overflow-wrap:anywhere]">
                      {n.title[lang] || n.title.ru}
                    </span>
                    <span className="block mt-1 text-xs text-gray-500">{formatWhen(n.startDate, n.endDate, lang, false, n.timeTBA, n.allDay)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
};
