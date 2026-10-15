import { CityId, LocalizedString } from '../types';

/**
 * Точки автоматического прогноза. Координаты — центры городов и седловины перевалов
 * (перевалы: по данным Википедии, Ала-Бел — по nomadsland.travel).
 * Для перевалов передаётся высота — модель пересчитывает температуру на эту высоту.
 */
export interface WeatherPoint {
  id: string;
  name: LocalizedString;
  kind: 'city' | 'pass';
  region: CityId;
  lat: number;
  lon: number;
  altitude?: number;
  /** Дорога, на которой находится перевал */
  road?: LocalizedString;
}

export const WEATHER_POINTS: WeatherPoint[] = [
  { id: 'bishkek', name: { ru: 'Бишкек', kg: 'Бишкек', en: 'Bishkek' }, kind: 'city', region: 'bishkek', lat: 42.8746, lon: 74.5698 },
  { id: 'osh', name: { ru: 'Ош', kg: 'Ош', en: 'Osh' }, kind: 'city', region: 'osh', lat: 40.5283, lon: 72.7985 },
  { id: 'karabalta', name: { ru: 'Кара-Балта', kg: 'Кара-Балта', en: 'Kara-Balta' }, kind: 'city', region: 'chui', lat: 42.8142, lon: 73.8481 },
  { id: 'tokmok', name: { ru: 'Токмок', kg: 'Токмок', en: 'Tokmok' }, kind: 'city', region: 'chui', lat: 42.8417, lon: 75.2917 },
  { id: 'jalalabad', name: { ru: 'Жалал-Абад', kg: 'Жалал-Абад', en: 'Jalal-Abad' }, kind: 'city', region: 'jalalabad', lat: 40.9333, lon: 73.0 },
  { id: 'karakol', name: { ru: 'Каракол', kg: 'Каракол', en: 'Karakol' }, kind: 'city', region: 'issykkul', lat: 42.4907, lon: 78.3936 },
  { id: 'cholponata', name: { ru: 'Чолпон-Ата', kg: 'Чолпон-Ата', en: 'Cholpon-Ata' }, kind: 'city', region: 'issykkul', lat: 42.6494, lon: 77.0822 },
  { id: 'naryn', name: { ru: 'Нарын', kg: 'Нарын', en: 'Naryn' }, kind: 'city', region: 'naryn', lat: 41.4287, lon: 75.9911 },
  { id: 'talas', name: { ru: 'Талас', kg: 'Талас', en: 'Talas' }, kind: 'city', region: 'talas', lat: 42.5228, lon: 72.2427 },
  { id: 'uzgen', name: { ru: 'Узген', kg: 'Өзгөн', en: 'Uzgen' }, kind: 'city', region: 'osh_region', lat: 40.7699, lon: 73.3007 },
  { id: 'batken', name: { ru: 'Баткен', kg: 'Баткен', en: 'Batken' }, kind: 'city', region: 'batken', lat: 40.0628, lon: 70.8194 },
  {
    id: 'too-ashuu',
    name: { ru: 'Перевал Тоо-Ашуу (3 586 м)', kg: 'Төө-Ашуу ашуусу (3 586 м)', en: 'Too-Ashuu Pass (3,586 m)' },
    kind: 'pass',
    region: 'chui',
    lat: 42.3436,
    lon: 73.8067,
    altitude: 3586,
    road: { ru: 'Бишкек — Ош', kg: 'Бишкек — Ош', en: 'Bishkek – Osh' },
  },
  {
    id: 'ala-bel',
    name: { ru: 'Перевал Ала-Бел (3 175 м)', kg: 'Ала-Бел ашуусу (3 175 м)', en: 'Ala-Bel Pass (3,175 m)' },
    kind: 'pass',
    region: 'jalalabad',
    lat: 42.244,
    lon: 73.069,
    altitude: 3175,
    road: { ru: 'Бишкек — Ош', kg: 'Бишкек — Ош', en: 'Bishkek – Osh' },
  },
  {
    id: 'dolon',
    name: { ru: 'Перевал Долон (3 030 м)', kg: 'Долоон ашуусу (3 030 м)', en: 'Dolon Pass (3,030 m)' },
    kind: 'pass',
    region: 'naryn',
    lat: 41.8401,
    lon: 75.7416,
    altitude: 3030,
    road: { ru: 'Бишкек — Нарын — Торугарт', kg: 'Бишкек — Нарын — Торугарт', en: 'Bishkek – Naryn – Torugart' },
  },
  {
    id: 'taldyk',
    name: { ru: 'Перевал Талдык (3 615 м)', kg: 'Талдык ашуусу (3 615 м)', en: 'Taldyk Pass (3,615 m)' },
    kind: 'pass',
    region: 'osh_region',
    lat: 39.765,
    lon: 73.1683,
    altitude: 3615,
    road: { ru: 'Ош — Сары-Таш', kg: 'Ош — Сары-Таш', en: 'Osh – Sary-Tash' },
  },
];

/**
 * Прогноз «на завтра по областям» — в том же порядке, что и в сводках Кыргызгидромета.
 * points — точки автоматического прогноза, по которым считается диапазон для области.
 */
export const FORECAST_REGIONS: { id: CityId; points: string[] }[] = [
  { id: 'chui', points: ['karabalta', 'tokmok'] },
  { id: 'talas', points: ['talas'] },
  { id: 'osh_region', points: ['uzgen'] },
  { id: 'batken', points: ['batken'] },
  { id: 'jalalabad', points: ['jalalabad'] },
  { id: 'issykkul', points: ['cholponata', 'karakol'] },
  { id: 'naryn', points: ['naryn'] },
  { id: 'osh', points: ['osh'] },
  { id: 'bishkek', points: ['bishkek'] },
];

/** Официальный прогноз Кыргызгидромета на день, внесённый редакцией (температура в °C) */
export interface OfficialForecast {
  /** На какую дату прогноз, YYYY-MM-DD */
  date: string;
  sourceName: string;
  sourceUrl: string;
  /** Общий текст: осадки, ветер (как в сводке) */
  text?: string;
  regions: Partial<Record<CityId, { nightFrom: number; nightTo: number; dayFrom: number; dayTo: number }>>;
  updatedAt?: string;
}

/** Официальные контакты Кыргызгидромета (meteo.kg/ru/pages/contacts, проверено 15.10.2026) */
export const KYRGYZHYDROMET = {
  site: 'https://www.meteo.kg/ru/',
  contactsPage: 'https://www.meteo.kg/ru/pages/contacts',
  forecasterPhones: ['+996 (312) 31-46-88', '+996 (312) 31-62-27'],
  forecasterEmail: 'synop@meteo.kg',
  reception: '+996 (312) 31-47-45',
  generalDept: '+996 (312) 31-46-63',
  generalEmail: 'meteo@meteo.kg',
  address: { ru: 'Бишкек, ул. К. Керимбекова, 1', kg: 'Бишкек, К. Керимбеков көч., 1', en: '1 K. Kerimbekov St, Bishkek' },
  hours: { ru: 'Пн–Пт, 09:00–18:00', kg: 'Дш–Жм, 09:00–18:00', en: 'Mon–Fri, 09:00–18:00' },
};

/** Экстренные номера (по данным МЧС КР и справочника 2ГИС; при сомнении — уточняйте на mchs.gov.kg) */
export const EMERGENCY_NUMBERS: { phone: string; name: LocalizedString }[] = [
  { phone: '112', name: { ru: 'Единая служба экстренного реагирования (МЧС)', kg: 'Өзгөчө кырдаалдарга бирдиктүү кызмат (ӨКМ)', en: 'Unified emergency service (Emergency Ministry)' } },
  { phone: '101', name: { ru: 'Пожарная служба', kg: 'Өрт өчүрүү кызматы', en: 'Fire service' } },
  { phone: '102', name: { ru: 'Милиция', kg: 'Милиция', en: 'Police' } },
  { phone: '103', name: { ru: 'Скорая помощь', kg: 'Тез жардам', en: 'Ambulance' } },
];
