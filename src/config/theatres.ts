import { LocalizedString } from '../types';

/**
 * Главные площадки раздела «Театр и культура». match — как узнать площадку по месту проведения публикации.
 * Контакты — только подтверждённые источником (source). Неизвестное не заполняется.
 */
export interface Venue {
  id: string;
  name: LocalizedString;
  match: RegExp;
  /** Фото здания (предоставлено редакцией) */
  photo?: string;
  address?: LocalizedString;
  phone?: string;
  site?: string;
  source?: string;
}

export const VENUES: Venue[] = [
  {
    id: 'drama-abdumomunov',
    name: {
      ru: 'Кыргызский национальный академический драматический театр им. Т. Абдумомунова',
      kg: 'Т. Абдумомунов атындагы Кыргыз улуттук академиялык драма театры',
      en: 'T. Abdumomunov Kyrgyz National Academic Drama Theatre',
    },
    photo: '/venues/drama-abdumomunov.jpg',
    match: /Абдумомун|драм[а-я]* театр[а-я]* им[а-я.]* Т\.|Kyrgyz.*Drama/i,
  },
  {
    id: 'opera-maldybaev',
    name: {
      ru: 'Кыргызский национальный академический театр оперы и балета им. А. Малдыбаева',
      kg: 'А. Малдыбаев атындагы Кыргыз улуттук академиялык опера жана балет театры',
      en: 'A. Maldybaev Kyrgyz National Academic Opera and Ballet Theatre',
    },
    photo: '/venues/opera-maldybaev.jpg',
    match: /Малдыба|опер[а-я]* и балет|Opera and Ballet/i,
  },
  {
    id: 'philharmonic',
    name: {
      ru: 'Кыргызская национальная филармония им. Т. Сатылганова',
      kg: 'Т. Сатылганов атындагы Кыргыз улуттук филармониясы',
      en: 'T. Satylganov Kyrgyz National Philharmonic',
    },
    photo: '/venues/philharmonic.jpg',
    match: /Филармони|Philharmon/i,
    address: { ru: 'Бишкек, пр. Чуй, 253', kg: 'Бишкек, Чүй пр., 253', en: '253 Chui Ave, Bishkek' },
    phone: '(0312) 61-40-15',
    source: 'https://culture.akipress.org/news:2548332',
  },
];

export const venueOf = (text: string) => VENUES.find((v) => v.match.test(text));
