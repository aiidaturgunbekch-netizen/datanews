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
  /** Дополнительные телефоны (касса и т. п.) */
  phones?: { number: string; label?: LocalizedString }[];
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
    // Контакты предоставлены редакцией (05.11.2026), сайт театра — teatr.kg
    address: { ru: 'Бишкек, ул. Т. Абдумомунова, 230', kg: 'Бишкек, Т. Абдумомунов көч., 230', en: '230 T. Abdumomunov St, Bishkek' },
    phones: [
      { number: '+996 550 557-255' },
      { number: '(0312) 66-58-02', label: { ru: 'касса', kg: 'касса', en: 'box office' } },
    ],
    site: 'https://teatr.kg/',
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
    // Контакты предоставлены редакцией (05.11.2026); у театра только Instagram
    address: { ru: 'Бишкек, ул. Ж. Абдрахманова, 167', kg: 'Бишкек, Ж. Абдрахманов көч., 167', en: '167 Zh. Abdrakhmanov St, Bishkek' },
    phones: [
      { number: '(0312) 66-18-41', label: { ru: 'касса', kg: 'касса', en: 'box office' } },
      { number: '(0312) 62-16-19', label: { ru: 'касса', kg: 'касса', en: 'box office' } },
    ],
    site: 'https://www.instagram.com/opera.ballet.teatr/',
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
