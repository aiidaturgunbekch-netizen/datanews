// Районы областей — из границ geoBoundaries (ODbL), public/geo/kg-districts.topo.json, плюс 4 района Бишкека.
// Используются в форме публикации (выбор района) и в фильтре ленты.
import type { CityId, LocalizedString } from '../types';

export interface District extends LocalizedString {
  code: string;
}

export const DISTRICTS: Partial<Record<CityId, District[]>> = {
  bishkek: [
    { code: 'KG-GB-LENIN', ru: 'Ленинский район', kg: 'Ленин району', en: 'Leninsky District' },
    { code: 'KG-GB-OKTYABR', ru: 'Октябрьский район', kg: 'Октябрь району', en: 'Oktyabrsky District' },
    { code: 'KG-GB-PERVOMAY', ru: 'Первомайский район', kg: 'Биринчи Май району', en: 'Pervomaysky District' },
    { code: 'KG-GB-SVERDLOV', ru: 'Свердловский район', kg: 'Свердлов району', en: 'Sverdlovsky District' },
  ],
  chui: [
    { code: 'KG-C-ALAMUDUN', ru: 'Аламудунский район', kg: 'Аламүдүн району', en: 'Alamüdün District' },
    { code: 'KG-C-JAYYL', ru: 'Жайыльский район', kg: 'Жайыл району', en: 'Jayyl District' },
    { code: 'KG-C-KEMIN', ru: 'Кеминский район', kg: 'Кемин району', en: 'Kemin District' },
    { code: 'KG-C-MOSKVA', ru: 'Московский район', kg: 'Москва району', en: 'Moskva District' },
    { code: 'KG-C-PANFILOV', ru: 'Панфиловский район', kg: 'Панфилов району', en: 'Panfilov District' },
    { code: 'KG-C-SOKULUK', ru: 'Сокулукский район', kg: 'Сокулук району', en: 'Sokuluk District' },
    { code: 'KG-C-CITY-OF-TOMOK', ru: 'Токмок', kg: 'Токмок шаары', en: 'Tokmok' },
    { code: 'KG-C-CHUY', ru: 'Чуйский район', kg: 'Чүй району', en: 'Chüy District' },
    { code: 'KG-C-YSYK-ATA', ru: 'Ыссык-Атинский район', kg: 'Ысык-Ата району', en: 'Ysyk-Ata District' },
  ],
  osh_region: [
    { code: 'KG-O-ALAY', ru: 'Алайский район', kg: 'Алай району', en: 'Alay District' },
    { code: 'KG-O-ARAVAN', ru: 'Араванский район', kg: 'Араван району', en: 'Aravan District' },
    { code: 'KG-O-KARA-KULJA', ru: 'Кара-Кульджинский район', kg: 'Кара-Кулжа району', en: 'Kara-Kulja District' },
    { code: 'KG-O-KARA-SUU', ru: 'Кара-Сууский район', kg: 'Кара-Суу району', en: 'Kara-Suu District' },
    { code: 'KG-O-NOOKAT', ru: 'Ноокатский район', kg: 'Ноокат району', en: 'Nookat District' },
    { code: 'KG-O-UZGEN', ru: 'Узгенский район', kg: 'Өзгөн району', en: 'Uzgen District' },
    { code: 'KG-O-CHONG-ALAY', ru: 'Чон-Алайский район', kg: 'Чоң-Алай району', en: 'Chong-Alay District' },
  ],
  jalalabad: [
    { code: 'KG-J-AKSY', ru: 'Аксыйский район', kg: 'Аксы району', en: 'Aksy District' },
    { code: 'KG-J-ALA-BUKA', ru: 'Ала-Букинский район', kg: 'Ала-Бука району', en: 'Ala-Buka District' },
    { code: 'KG-J-BAZAR-KORGON', ru: 'Базар-Коргонский район', kg: 'Базар-Коргон району', en: 'Bazar-Korgon District' },
    { code: 'KG-J-NOOKEN', ru: 'Ноокенский район', kg: 'Ноокен району', en: 'Nooken District' },
    { code: 'KG-J-SUZAK', ru: 'Сузакский район', kg: 'Сузак району', en: 'Suzak District' },
    { code: 'KG-J-TOGUZ-TORO', ru: 'Тогуз-Тороуский район', kg: 'Тогуз-Торо району', en: 'Toguz-Toro District' },
    { code: 'KG-J-TOKTOGUL', ru: 'Токтогульский район', kg: 'Токтогул району', en: 'Toktogul District' },
    { code: 'KG-J-CHATKAL', ru: 'Чаткальский район', kg: 'Чаткал району', en: 'Chatkal District' },
  ],
  issykkul: [
    { code: 'KG-Y-AK-SUU', ru: 'Ак-Суйский район', kg: 'Ак-Суу району', en: 'Ak-Suu District' },
    { code: 'KG-Y-JETI-OGUZ', ru: 'Жети-Огузский район', kg: 'Жети-Өгүз району', en: 'Jeti-Ögüz District' },
    { code: 'KG-Y-ISSYK-KUL', ru: 'Иссык-Кульский район', kg: 'Ысык-Көл району', en: 'Issyk-Kul District' },
    { code: 'KG-Y-TONG', ru: 'Тонский район', kg: 'Тоң району', en: 'Tong District' },
    { code: 'KG-Y-TUP', ru: 'Тюпский район', kg: 'Түп району', en: 'Tüp District' },
  ],
  talas: [
    { code: 'KG-T-KARA-BUURA', ru: 'Айтматовский район', kg: 'Айтматов району', en: 'Aitmatov District' },
    { code: 'KG-T-BAKAY-ATA', ru: 'Бакай-Атинский район', kg: 'Бакай-Ата району', en: 'Bakay-Ata District' },
    { code: 'KG-T-MANAS', ru: 'Манасский район', kg: 'Манас району', en: 'Manas District' },
    { code: 'KG-T-TALAS', ru: 'Таласский район', kg: 'Талас району', en: 'Talas District' },
  ],
  naryn: [
    { code: 'KG-N-AK-TALAA', ru: 'Ак-Талинский район', kg: 'Ак-Талаа району', en: 'Ak-Talaa District' },
    { code: 'KG-N-AT-BASHY', ru: 'Ат-Башинский район', kg: 'Ат-Башы району', en: 'At-Bashy District' },
    { code: 'KG-N-JUMGAL', ru: 'Жумгальский район', kg: 'Жумгал району', en: 'Jumgal District' },
    { code: 'KG-N-KOCHKOR', ru: 'Кочкорский район', kg: 'Кочкор району', en: 'Kochkor District' },
    { code: 'KG-N-NARYN', ru: 'Нарынский район', kg: 'Нарын району', en: 'Naryn District' },
  ],
  batken: [
    { code: 'KG-B-BATKEN', ru: 'Баткенский район', kg: 'Баткен району', en: 'Batken District' },
    { code: 'KG-B-KADAMJAY', ru: 'Кадамжайский район', kg: 'Кадамжай району', en: 'Kadamjay District' },
    { code: 'KG-B-LEILEK', ru: 'Лейлекский район', kg: 'Лейлек району', en: 'Leilek District' },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const L = 'а-яөүңa-z';

/**
 * Шаблон района: «Ыссык-Атинский район» ловит «Ыссык-Атинский р-н» и «Ысык-Ата району»,
 * но не «Иссык-Кульской обл.» (нужно слово «район»). Город без «района» (Токмок) — по слову.
 */
const pattern = (name: string) => {
  const [first, ...rest] = norm(name).split(/\s+/);
  const stem = first.replace(/(ский|цкий|ской)$/, '');
  if (!rest.length || rest[0] === 'шаары') return new RegExp(`(^|[^${L}])${esc(stem)}([^${L}]|$)`);
  return new RegExp(`(^|[^${L}])${esc(stem)}[${L}-]*\\s+(район|р-н|р\\.|району|district)`);
};

/** Относится ли публикация к району — по полям «Район» и «Населённый пункт» */
export const inDistrict = (a: { district?: string; locality?: string }, d: District) => {
  const text = norm(`${a.district || ''} ${a.locality || ''}`);
  return Boolean(text) && [d.ru, d.kg, d.en].some((n) => pattern(n).test(text));
};
