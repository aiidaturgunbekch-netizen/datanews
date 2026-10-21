import type { Language } from '../types';
import type { BotIntent } from '../types/bot';

/** Названия тем бота (кнопки) на трёх языках — общие для сервера и интерфейса */
export const INTENT_LABEL: Record<BotIntent, Record<Language, string>> = {
  today: { ru: 'Новости сегодня', kg: 'Бүгүнкү жаңылыктар', en: "Today's news" },
  regions: { ru: 'Новости по регионам', kg: 'Аймактар боюнча жаңылыктар', en: 'News by region' },
  weather: { ru: 'Погода', kg: 'Аба ырайы', en: 'Weather' },
  storm: { ru: 'Штормовые предупреждения', kg: 'Бороон эскертүүлөрү', en: 'Storm warnings' },
  passes: { ru: 'Погода на перевалах', kg: 'Ашуулардагы аба ырайы', en: 'Mountain passes' },
  state: { ru: 'Государственные новости', kg: 'Мамлекеттик жаңылыктар', en: 'Government news' },
  laws: { ru: 'Изменения законов', kg: 'Мыйзамдардагы өзгөрүүлөр', en: 'Law changes' },
  shows: { ru: 'Концерты и кинопоказы', kg: 'Концерттер жана кино', en: 'Concerts & cinema' },
  tickets: { ru: 'Купить билет', kg: 'Билет сатып алуу', en: 'Buy a ticket' },
  howto: { ru: 'Как разместить объявление', kg: 'Жарыяны кантип жайгаштыруу', en: 'How to post a notice' },
  tariffs: { ru: 'Тарифы публикации', kg: 'Жарыялоо тарифтери', en: 'Posting plans' },
  contact: { ru: 'Связаться с DataNews', kg: 'DataNews менен байланышуу', en: 'Contact DataNews' },
  help: { ru: 'Что умеет бот', kg: 'Бот эмне кыла алат', en: 'What the bot can do' },
  search: { ru: 'Поиск', kg: 'Издөө', en: 'Search' },
};
