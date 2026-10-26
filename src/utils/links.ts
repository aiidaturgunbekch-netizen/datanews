import { Announcement, SourceKind } from '../types';
import { isOnline } from '../config/publishTypes';

/** Ссылка на источник события (новое поле eventSourceUrl или старое sourceUrl) */
export const eventSource = (a: Announcement) => a.eventSourceUrl || a.sourceUrl || '';

/** Ссылка на билеты (новое поле ticketUrl или старое eventDetails.ticketUrl) и её статус */
export const ticketLink = (a: Announcement) => ({
  url: a.ticketUrl || a.eventDetails?.ticketUrl || '',
  verified: Boolean(a.ticketUrlVerified),
});

/** Короткое имя сайта для подписи ссылки: «ticket.gov.kg» */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const TICKET_HOSTS = ['kassir.kg', 'ticket.kg', 'ticketon.kg', 'tickets.kg', 'biletkg.com'];

/** Государственный билетный сервис GovTicket */
export const isGovTicket = (url: string) => /(^|\.)ticket\.gov\.kg$/.test(hostOf(url));

/** Что за источник указан в eventSourceUrl: явное поле или по адресу (сайты *.gov.kg — официальные) */
export const sourceKindOf = (a: Announcement): SourceKind => {
  if (a.sourceKind) return a.sourceKind;
  const host = hostOf(eventSource(a));
  if (/(^|\.)gov\.kg$/.test(host)) return 'official';
  if (TICKET_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 'ticket';
  if (a.publishedByGov) return 'official';
  return 'media';
};

export interface SourceLink {
  href: string;
  label: 'official' | 'authority' | 'organizer' | 'artist' | 'venue' | 'join' | 'media' | 'ticketPage' | 'additional' | 'image';
}

/**
 * Ссылки карточки, разложенные по смыслу:
 * «Официальный источник», «Организатор», «Купить билет» (отдельно), «Дополнительный источник».
 */
export const groupedSources = (a: Announcement) => {
  const src = eventSource(a);
  const kind = sourceKindOf(a);
  const ticket = ticketLink(a).url;
  const official: SourceLink[] = [];
  const organizer: SourceLink[] = [];
  const additional: SourceLink[] = [];
  if (src) {
    if (kind === 'official') official.push({ href: src, label: 'official' });
    else if (kind === 'organizer') organizer.push({ href: src, label: 'organizer' });
    else if (kind === 'ticket') {
      if (src !== ticket) additional.push({ href: src, label: 'ticketPage' });
    } else additional.push({ href: src, label: 'media' });
  }
  if (a.authorityUrl) official.push({ href: a.authorityUrl, label: 'authority' });
  if (a.organizerUrl) organizer.push({ href: a.organizerUrl, label: 'organizer' });
  if (a.artistUrl) organizer.push({ href: a.artistUrl, label: 'artist' });
  // у онлайн-мероприятия «сайт площадки» — это ссылка на участие
  if (a.venueUrl) organizer.push({ href: a.venueUrl, label: isOnline(a) ? 'join' : 'venue' });
  if (a.additionalSourceUrl && a.additionalSourceUrl !== src) additional.push({ href: a.additionalSourceUrl, label: 'additional' });
  if (a.imageSourceUrl) additional.push({ href: a.imageSourceUrl, label: 'image' });
  const dedupe = (l: SourceLink[]) => l.filter((x, i) => l.findIndex((y) => y.href === x.href) === i);
  return {
    kind,
    official: dedupe(official),
    organizer: dedupe(organizer.filter((x) => !official.some((o) => o.href === x.href))),
    additional: dedupe(additional),
    /** Официального сообщения нет — сведения только из СМИ */
    mediaOnly: kind === 'media' && !official.some((o) => o.label === 'official'),
  };
};

/**
 * Название источника для показа. Названия источников записаны по-русски; на кыргызской и английской версиях
 * убираем русские пояснения в скобках («со ссылкой на …», «афиша кинотеатра»), а на английской
 * вместо оставшегося русского названия показываем адрес сайта источника, если он есть.
 */
export const sourceLabel = (a: Announcement, lang: 'ru' | 'kg' | 'en') => {
  const name = a.sourceName || '';
  if (lang === 'ru') return name;
  const short = name.replace(/\s*\([^)]*[а-яё][^)]*\)/gi, '').trim() || name;
  if (lang === 'en' && /[а-яё]/i.test(short)) {
    const src = eventSource(a);
    if (src) return hostOf(src);
  }
  return short;
};

