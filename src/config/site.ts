import { LocalizedString, PlanId } from '../types';

/**
 * Настройки платной регистрации.
 * ЦЕНЫ меняются в поле `priceSom`, названия и описания — в `name` / `features`.
 * Они показываются гостю в «Личном кабинете», на странице «Тарифы» и в панели администратора.
 */
export const PLANS: Record<PlanId, { name: LocalizedString; priceSom: number; periodDays: number; limit: number | null; features: LocalizedString[] }> = {
  basic: {
    name: { ru: 'Частный', kg: 'Жеке', en: 'Individual' },
    priceSom: 500,
    periodDays: 30,
    limit: 5,
    features: [
      { ru: 'До 5 публикаций за 30 дней', kg: '30 күндө 5ке чейин жарыя', en: 'Up to 5 posts per 30 days' },
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      { ru: 'Проверка модератором', kg: 'Модератордун текшерүүсү', en: 'Moderator review' },
    ],
  },
  business: {
    name: { ru: 'Организатор', kg: 'Уюштуруучу', en: 'Organiser' },
    priceSom: 2000,
    periodDays: 30,
    limit: null,
    features: [
      { ru: 'Без лимита публикаций', kg: 'Жарыялардын саны чектелбейт', en: 'Unlimited posts' },
      { ru: 'Фото или афиша к событию', kg: 'Окуяга сүрөт же афиша', en: 'Photo or poster for each event' },
      { ru: 'Проверка модератором', kg: 'Модератордун текшерүүсү', en: 'Moderator review' },
      { ru: 'Бегущая строка — по согласованию', kg: 'Жылма сап — макулдашуу боюнча', en: 'Top ticker — on request' },
    ],
  },
};

/** «30 дней» / «30 күн» / «30 days» */
export const planPeriod = (days: number, lang: keyof LocalizedString) =>
  lang === 'kg' ? `${days} күн` : lang === 'en' ? `${days} days` : `${days} дней`;

/**
 * РЕКВИЗИТЫ для оплаты регистрации (MBank / O!Деньги / Элсом / карта).
 * Пока строка пустая, гостю показывается «Администратор свяжется с вами и пришлёт реквизиты».
 * Пример: 'MBank: 0700 000 000 (получатель — Айида Т.)'
 */
export const PAYMENT_DETAILS = '';

/** Максимальный размер загружаемого фото (после сжатия в браузере) */
export const MAX_IMAGE_BYTES = 450_000;
