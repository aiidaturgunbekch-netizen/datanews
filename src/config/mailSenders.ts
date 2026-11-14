/**
 * Известные отправители редакционной почты (datanews.kg7@gmail.com).
 * Заполняет редакция: адрес целиком («press@mchs.gov.kg») или домен («@mchs.gov.kg»).
 * Совпадение означает только «письмо пришло от этой организации» — не подтверждение сведений:
 * отметку «Подтверждено по первоисточнику» ставит редактор после сверки.
 * Адреса сюда вносятся только по данным самой организации — не придумывать.
 */
export interface KnownSender {
  /** Адрес целиком или домен, начинающийся с «@» */
  match: string;
  /** Название организации так, как его показывать в источнике */
  orgName: string;
  /** Тип источника для карточки: 'ГОС', 'МУН', 'ОРГ' */
  orgType?: string;
}

export const KNOWN_SENDERS: KnownSender[] = [];

/** Домен государственного органа Кыргызстана: *.gov.kg — признак, но не подтверждение подлинности */
export const isGovDomain = (domain: string) => /(^|\.)gov\.kg$/i.test(domain);

export const findKnownSender = (address: string, list: KnownSender[] = KNOWN_SENDERS) => {
  const a = address.toLowerCase();
  return (
    list.find((s) => !s.match.startsWith('@') && s.match.toLowerCase() === a) ||
    list.find((s) => s.match.startsWith('@') && a.endsWith(s.match.toLowerCase()))
  );
};

/** Тестовое письмо: в теме или тексте есть «TEST DataNews» / «ТЕСТ DataNews». Материалы из него нельзя опубликовать. */
export const TEST_MARK_RE = /(?:TEST|ТЕСТ)\s+DataNews/i;

/**
 * Служебные письма сервисов (регистрации, счета, уведомления сайтов, рассылки) — не новости.
 * Сайт сразу кладёт их в «Отклонённые»; из «Отклонённых» письмо можно «Вернуть в новые».
 * Не касается известных отправителей, адресов *.gov.kg и пакетов сборщиков.
 */
export const SERVICE_DOMAINS = [
  'google.com', 'googlemail.com', 'youtube.com',
  'upstash.com', 'vercel.com', 'github.com', 'githubusercontent.com',
  'anthropic.com', 'claude.ai', 'claude.com',
  'cctld.kg', 'apple.com', 'microsoft.com', 'facebookmail.com', 'instagram.com', 'linkedin.com',
  'telegram.org', 'canva.com', 'stripe.com', 'paypal.com',
];
const SERVICE_LOCAL_RE = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|notify|alerts?|newsletter|news-?letter|marketing|billing|invoice)([+._-].*)?$/i;

export const isServiceSender = (address: string) => {
  const a = address.toLowerCase();
  const [local = '', domain = ''] = a.split('@');
  if (!domain || isGovDomain(domain) || findKnownSender(a)) return false;
  if (SERVICE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return true;
  return SERVICE_LOCAL_RE.test(local);
};
