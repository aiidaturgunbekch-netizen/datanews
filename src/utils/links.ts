import { Announcement } from '../types';

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
