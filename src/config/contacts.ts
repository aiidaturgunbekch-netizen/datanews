/**
 * Контакты редакции DataNews.
 * WhatsApp и Telegram — разные номера: WhatsApp редакции +996 990 000365, Telegram — прежний номер.
 * Telegram: по номеру телефона ссылка t.me/+<номер> открывает чат, только если в настройках
 * конфиденциальности Telegram разрешено находить аккаунт по номеру. Для надёжной ссылки
 * нужен публичный username — впишите его в telegramUsername (без @), и кнопка поведёт на t.me/<username>.
 */
export const CONTACTS = {
  whatsappPhone: '+996 990 000365',
  whatsappUrl: 'https://wa.me/996990000365',
  telegramPhone: '+996 700 230 994',
  telegramUsername: '',
  telegramPhoneUrl: 'https://t.me/+996700230994',
  instagramHandle: '@data.news.kg',
  instagramUrl: 'https://www.instagram.com/data.news.kg/',
};

export const telegramUrl = () => (CONTACTS.telegramUsername ? `https://t.me/${CONTACTS.telegramUsername}` : CONTACTS.telegramPhoneUrl);
