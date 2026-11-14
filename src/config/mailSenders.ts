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
