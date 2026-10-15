/**
 * Реестр источников данных и состояние их интеграции.
 * Для каждого источника хранится: ведомство, официальный URL, тип, можно ли получать автоматически,
 * способ получения, частота проверки и — для автоматических — время последней попытки,
 * последнего успешного обновления и текст последней ошибки (в Redis, ключ dn:src:status).
 *
 * Статус «автоматически» ставится только источникам, для которых реально написан и работает код получения.
 */
import { hgetJson, hsetJson, hvalsJson } from './kv';

export type SourceMethod = 'api' | 'rss' | 'manual' | 'link';

export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  type: string;
  /** Есть ли разрешённый машинный способ получения */
  automatic: boolean;
  method: SourceMethod;
  /** Частота проверки (человекочитаемо) */
  frequency: string;
  note?: string;
}

export interface SourceStatus {
  id: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  items?: number;
}

const STATUS_KEY = 'dn:src:status';

export const SOURCES: SourceInfo[] = [
  {
    id: 'met-norway',
    name: 'MET Norway (Норвежский метеорологический институт) — Locationforecast 2.0',
    url: 'https://api.met.no/weatherapi/locationforecast/2.0/',
    type: 'Численный прогноз погоды (открытые данные, CC BY 4.0)',
    automatic: true,
    method: 'api',
    frequency: 'не чаще 1 раза в 3 часа при обращении к сайту',
    note: 'Не официальный прогноз Кыргызгидромета. Используется как автоматический прогноз по точкам; официальный прогноз — meteo.kg.',
  },
  {
    id: 'kyrgyzhydromet',
    name: 'Кыргызгидромет (Гидрометеорологическая служба при МЧС КР)',
    url: 'https://www.meteo.kg/ru/',
    type: 'Официальный прогноз, штормовые предупреждения, лавинная и гидрологическая опасность',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную (редакция)',
    note: 'Публичного API или RSS не найдено. Предупреждения вносит редакция со ссылкой на сообщение.',
  },
  {
    id: 'mchs',
    name: 'Министерство чрезвычайных ситуаций КР',
    url: 'https://www.mchs.gov.kg/ru/',
    type: 'Штормовые предупреждения, ЧС, лавинная опасность',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
  },
  {
    id: 'mtd',
    name: 'Министерство транспорта и коммуникаций КР (Минтрансдор)',
    url: 'https://mtd.gov.kg/',
    type: 'Ограничения движения, состояние перевалов и дорог',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную; зимой — при каждом сообщении',
  },
  {
    id: 'uobdd',
    name: 'УОБДД МВД КР (безопасность дорожного движения)',
    url: 'https://mvd.gov.kg/',
    type: 'Ограничения для транспорта, перекрытия',
    automatic: false,
    method: 'manual',
    frequency: 'при появлении сообщений',
  },
  {
    id: 'president',
    name: 'Президент Кыргызской Республики',
    url: 'https://www.president.kg/',
    type: 'Указы, законы (подписание), встречи и визиты, заявления',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
    note: 'Автоматический сбор не подключён: нужен проверенный RSS / API; доступ с сервера разработки заблокирован, проверить нельзя.',
  },
  {
    id: 'cabinet',
    name: 'Кабинет Министров КР',
    url: 'https://www.gov.kg/',
    type: 'Постановления, решения Кабинета Министров',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
  },
  {
    id: 'kenesh',
    name: 'Жогорку Кенеш КР',
    url: 'https://kenesh.kg/',
    type: 'Законопроекты, принятые законы, заседания',
    automatic: false,
    method: 'manual',
    frequency: 'по дням заседаний',
  },
  {
    id: 'minjust-cbd',
    name: 'Централизованный банк данных правовой информации (Минюст КР)',
    url: 'https://cbd.minjust.gov.kg/',
    type: 'Официальные тексты законов и нормативных актов',
    automatic: false,
    method: 'link',
    frequency: 'при публикации новости о законе',
    note: 'Используется как ссылка на официальный текст документа.',
  },
  {
    id: 'cec',
    name: 'Центральная избирательная комиссия КР',
    url: 'https://shailoo.gov.kg/',
    type: 'Календарь выборов, решения ЦИК',
    automatic: false,
    method: 'manual',
    frequency: 'по мере решений',
  },
  {
    id: 'bishkek-city',
    name: 'Мэрия города Бишкек',
    url: 'https://bishkek.gov.kg/',
    type: 'Отключения, ремонт, перекрытия, городские объявления',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
  },
  {
    id: 'osh-city',
    name: 'Мэрия города Ош',
    url: 'https://oshcity.gov.kg/',
    type: 'Городские объявления г. Ош',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
  },
  {
    id: 'media',
    name: 'Проверенные СМИ (Kaktus.media, 24.kg, АКИpress, Economist.kg, Kabar и др.)',
    url: 'https://kaktus.media/',
    type: 'Дополнительный источник, если официального сообщения нет',
    automatic: false,
    method: 'manual',
    frequency: 'ежедневно вручную',
    note: 'В карточке всегда помечается как СМИ, а не как официальное сообщение.',
  },
];

export const getStatuses = async () => {
  const list = await hvalsJson<SourceStatus>(STATUS_KEY);
  return Object.fromEntries(list.map((s) => [s.id, s]));
};

export const recordAttempt = async (id: string, ok: boolean, error?: string, items?: number) => {
  const prev = (await hgetJson<SourceStatus>(STATUS_KEY, id)) || { id };
  const now = new Date().toISOString();
  await hsetJson(STATUS_KEY, id, {
    ...prev,
    lastAttemptAt: now,
    ...(ok
      ? { lastSuccessAt: now, lastError: error ? `частично: ${error}`.slice(0, 300) : undefined, items }
      : { lastError: (error || 'unknown').slice(0, 300) }),
  });
};
