import { Announcement, LocalizedString } from '../types';

/** Фото с Wikimedia Commons (свободная лицензия) нужного размера */
const commons = (file: string, width = 1600) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
/** Страница файла на Commons — первоисточник фото, автор и лицензия */
const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

/** Тематическая иллюстрация DataNews (не фотография события) из public/illustrations */
const illus = (name: string, alt: string) => ({
  imageUrl: `/illustrations/${name}.svg`,
  imageAlt: alt,
  imageCredit: 'Иллюстрация DataNews — не фото события',
  imageFit: 'cover' as const,
});

/** Реальное архивное фото объекта (не снимок конкретного события) с Wikimedia Commons */
const archivePhoto = (file: string, alt: string, credit: string) => ({
  imageUrl: commons(file),
  imageSourceUrl: commonsPage(file),
  imageAlt: alt,
  imageCredit: `Архивное фото: ${credit}, Wikimedia Commons — не снимок этого события`,
  imageFit: 'cover' as const,
});

/**
 * Фото артиста со свободной лицензией (Wikimedia Commons) — когда официальная афиша концерта недоступна.
 * Показывается целиком (contain), лицо не обрезается; подпись честно говорит, что это не афиша.
 */
const artistPhoto = (file: string, alt: string, credit: string) => ({
  imageUrl: commons(file),
  imageSourceUrl: commonsPage(file),
  imageAlt: alt,
  imageCredit: `Фото артиста: ${credit}, Wikimedia Commons — не афиша этого концерта`,
  imageFit: 'contain' as const,
});

/** Официальные сайты ведомств (сами сайты; конкретное сообщение там может отсутствовать) */
const BISHKEK_CITY_HALL = 'https://bishkek.gov.kg/';
const CEC_SITE = 'https://shailoo.gov.kg/';

/** Отметка редакции: запись внесена вручную по источнику, дата последней проверки */
const checked = (at: string) => ({ lastCheckedAt: at, dataOrigin: 'manual' as const });

const ARBENINA_PHOTO = 'Diana Arbenina.jpg';

const L = (ru: string, kg: string, en: string): LocalizedString => ({ ru, kg, en });

/**
 * Только проверенные публикации с указанием источников.
 * Новые объявления добавляются через панель администратора.
 */
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-shakira-bishkek-arena',
    protocolCode: '#KG-EV-SHAKIRA',
    title: {
      ru: 'Концерт Шакиры на стадионе «Бишкек Арена»',
      kg: 'Шакиранын «Бишкек Арена» стадиондогу концерти',
      en: 'Shakira live at Bishkek Arena',
    },
    summary: {
      ru: 'Первый концерт колумбийской певицы в Кыргызстане и Центральной Азии в рамках мирового тура Las Mujeres Ya No Lloran.',
      kg: 'Колумбиялык ырчынын Кыргызстандагы жана Борбор Азиядагы биринчи концерти — Las Mujeres Ya No Lloran дүйнөлүк турунун алкагында.',
      en: "The Colombian star's first concert in Kyrgyzstan and Central Asia, part of the Las Mujeres Ya No Lloran World Tour.",
    },
    description: {
      ru: 'Шакира выступит на стадионе «Бишкек Арена» 18 октября 2026 года в 19:00. В программе хиты разных лет, среди которых Hips Don’t Lie, Whenever, Wherever, Waka Waka и She Wolf, а также песни нового альбома. Сцена расположена у восточной трибуны, трибуны за сценой закрыты. Вход на стадион по QR-билету. Возрастное ограничение 7+. Билеты продаются на государственном портале GovTicket, по данным Управления делами Президента КР, билеты купили жители 28 стран.',
      kg: 'Шакира 2026-жылдын 18-октябрында саат 19:00дө «Бишкек Арена» стадионунда концерт берет. Программада ар кайсы жылдардагы хиттер жана жаңы альбомдун ырлары. Сахна чыгыш трибунанын жанында жайгашкан, сахнанын аркасындагы трибуналар жабык. Стадионго QR-билет менен кирилет. Жаш чеги: 7+. Билеттер GovTicket мамлекеттик порталында сатылат.',
      en: 'Shakira performs at Bishkek Arena on 18 October 2026 at 19:00. The set features hits from across her career, including Hips Don’t Lie, Whenever, Wherever, Waka Waka and She Wolf, plus songs from her new album. The stage is set up by the east stand and the stands behind it are closed. Entry is by QR ticket; age 7+. Tickets are sold on the state GovTicket portal.',
    },
    category: 'concerts',
    city: 'bishkek',
    location: {
      ru: 'Стадион «Бишкек Арена», ул. Алтын-Бешик, 77/2а',
      kg: '«Бишкек Арена» стадиону, Алтын-Бешик көч., 77/2а',
      en: 'Bishkek Arena stadium, 77/2a Altyn-Beshik St',
    },
    startDate: '2026-10-18T19:00',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: true,
    sourceName: 'GovTicket • Управление делами Президента КР • Economist.kg',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://ticket.gov.kg/ru/event/shakira-vpervye-vystupit-v-tsentralnoy-azii-mirovaya-zvezda-priezzhaet-v-bishkek-116',
    sourceKind: 'official',
    additionalSourceUrl: 'https://economist.kg/society/2026/09/30/shakira-bishkek-bilety-mesta-pravila/',
    isVerified: true,
    publishedAt: '2026-09-30T06:50',
    updatedAt: '2026-10-09T12:02',
    eventDetails: {
      priceText: {
        ru: 'от 12 000 до 40 000 сом',
        kg: '12 000 — 40 000 сомдон',
        en: '12,000 – 40,000 KGS',
      },
      venue: 'Стадион «Бишкек Арена»',
      timeRange: '19:00 • 7+',
    },
    // Официальная афиша бишкекского концерта не найдена в открытом доступе — используется фото этого же тура
    // Официальная афиша концерта в Бишкеке (предоставлена владельцем сайта); хранится в public/posters
    imageUrl: '/posters/shakira-bishkek-2026.jpg',
    imageAlt: 'Официальная афиша: Shakira, Las Mujeres Ya No Lloran World Tour, 18 октября, Bishkek Arena',
    imageCredit: 'Официальная афиша концерта в Бишкеке (Gov.ticket, 2Live Entertainment, Baltic Music Group)',
    imageFit: 'contain',
    ticketUrl: 'https://ticket.gov.kg/ru/event/shakira-vpervye-vystupit-v-tsentralnoy-azii-mirovaya-zvezda-priezzhaet-v-bishkek-116',
    ticketUrlVerified: true,
    artistUrl: 'https://www.shakira.com/',
    ...checked('2026-10-14T10:00'),
    isDemo: false,
  },
  {
    id: 'ann-shakira-free-shuttles',
    protocolCode: '#KG-TR-SHAKIRA',
    title: {
      ru: 'Бесплатные автобусы к «Бишкек Арене» на концерт Шакиры',
      kg: 'Шакиранын концертине «Бишкек Аренага» акысыз автобустар',
      en: 'Free shuttle buses to Bishkek Arena for the Shakira concert',
    },
    summary: {
      ru: 'Шесть бесплатных маршрутов, отправление с 15:00 до 18:00 по мере заполнения, интервал 4–6 минут.',
      kg: 'Алты акысыз каттам, саат 15:00дөн 18:00гө чейин, автобус толгон сайын жөнөйт, интервал 4–6 мүнөт.',
      en: 'Six free routes, running 15:00–18:00 and departing as they fill, every 4–6 minutes.',
    },
    description: {
      ru: '18 октября для зрителей концерта Шакиры запустят шесть бесплатных автобусных маршрутов к «Бишкек Арене» и обратно. Автобусы будут курсировать к стадиону с 15:00 до 18:00 и отправляться по мере заполнения с интервалом 4–6 минут. Для посадки нужно предъявить QR-код билета на концерт. Концерт начнётся в 19:00.',
      kg: '18-октябрда Шакиранын концертине келгендер үчүн «Бишкек Аренага» жана кайра алты акысыз автобус каттамы иштейт. Автобустар стадионго саат 15:00дөн 18:00гө чейин каттайт, толгон сайын 4–6 мүнөттүк интервал менен жөнөйт. Автобуска түшүү үчүн концерттин билетинин QR-кодун көрсөтүү керек.',
      en: 'On 18 October six free bus routes will take Shakira concert-goers to Bishkek Arena and back. Buses run to the stadium from 15:00 to 18:00 and depart as they fill, every 4–6 minutes. Show the QR code of your concert ticket to board. The concert starts at 19:00.',
    },
    category: 'roads',
    city: 'bishkek',
    location: {
      ru: 'Шесть точек отправления в Бишкеке → стадион «Бишкек Арена»',
      kg: 'Бишкектеги алты жөнөө чекити → «Бишкек Арена» стадиону',
      en: 'Six departure points in Bishkek → Bishkek Arena stadium',
    },
    startDate: '2026-10-18T15:00',
    endDate: '2026-10-18T18:00',
    urgency: 'planned',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Economist.kg (со ссылкой на Управление делами Президента КР)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://economist.kg/transport/2026/10/09/shakira-besplatnye-avtobusy/',
    isVerified: true,
    publishedAt: '2026-10-09T12:02',
    updatedAt: '2026-10-09T12:02',
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    ...archivePhoto('Bishkek City.jpg', 'Центральная улица Бишкека с автомобильным движением', 'улица в центре Бишкека'),
    isDemo: false,
  },

  // ───────────── Предупреждения муниципальных служб ─────────────
  {
    id: 'ann-water-bishkek-2026-10-13',
    protocolCode: '#KG-WT-1310',
    title: L(
      'Отключение питьевой воды в части Бишкека 13 октября',
      'Бишкектин бир бөлүгүндө 13-октябрда ичүүчү суу өчүрүлөт',
      'Drinking water cut-off in part of Bishkek on 13 October'
    ),
    summary: L(
      'Подача воды прекращается с 09:00 до 24:00 (около 15 часов) из-за ремонтных работ. Запаситесь водой заранее.',
      'Суу 09:00дөн 24:00гө чейин (болжол менен 15 саат) оңдоо иштерине байланыштуу берилбейт. Сууну алдын ала камдап алыңыз.',
      'Water is off from 09:00 to 24:00 (about 15 hours) for repair works. Store water in advance.'
    ),
    description: L(
      'По сообщению мэрии Бишкека, 13 октября с 09:00 до 24:00 будет прекращена подача питьевой воды в части города в связи с ремонтными работами на водопроводных сетях. Отключение коснётся жилых домов, школ, детских садов и социальных объектов. Полный список районов и улиц — в источнике. Справки и аварийные заявки: единый колл-центр «Бишкекводоканала» 1533.',
      'Бишкек мэриясынын маалыматы боюнча, 13-октябрда саат 09:00дөн 24:00гө чейин суу түтүктөрүндөгү оңдоо иштерине байланыштуу шаардын бир бөлүгүндө ичүүчү суу берилбейт. Көчөлөрдүн толук тизмеси булакта. Маалымат: «Бишкекводоканалдын» бирдиктүү колл-борбору 1533.',
      'According to the Bishkek City Hall, on 13 October from 09:00 to 24:00 drinking water supply will be cut off in part of the city due to repairs on the water network. The full list of districts and streets is in the source. Hotline: Bishkekvodokanal call centre 1533.'
    ),
    category: 'water',
    city: 'bishkek',
    location: L('Часть г. Бишкек — список улиц в источнике', 'Бишкек ш. бир бөлүгү — көчөлөрдүн тизмеси булакта', 'Part of Bishkek — street list in the source'),
    startDate: '2026-10-13T09:00',
    endDate: '2026-10-13T23:59',
    durationBadge: '15 ч',
    urgency: 'planned',
    status: 'active',
    isUrgentTicker: false,
    sourceName: 'Kaktus.media (со ссылкой на мэрию Бишкека)',
    sourceOrgType: 'МБ',
    eventSourceUrl: 'https://kaktus.media/doc/554823_v_bishkeke_13_oktiabria_na_15_chasov_otkluchat_vody._spisok_rayonov_i_ylic.html',
    isVerified: true,
    publishedAt: '2026-10-12T15:00',
    updatedAt: '2026-10-12T15:00',
    emergencyContacts: [
      { name: 'Бишкекводоканал', phone: '1533', isTollFree: true, icon: 'water_drop' },
      { name: 'Колл-центр мэрии Бишкека', phone: '1840', isTollFree: true, icon: 'support_agent' },
    ],
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    authorityUrl: BISHKEK_CITY_HALL,
    ...archivePhoto('Drinking water.jpg', 'Вода из водопроводного крана', 'водопроводный кран'),
    isDemo: false,
  },
  {
    id: 'ann-power-bishkek-2026-10-14',
    protocolCode: '#KG-EL-1410',
    title: L(
      'Плановые отключения электричества в Бишкеке 14 октября',
      'Бишкекте 14-октябрда пландуу жарык өчүрүү',
      'Planned power outages in Bishkek on 14 October'
    ),
    summary: L(
      'Бишкекское предприятие электрических сетей проводит ремонт: отключения в Восточном и Западном РЭС с 09:00–09:30 до 12:00–17:00.',
      'Бишкек электр тармактары ишканасы оңдоо жүргүзөт: Чыгыш жана Батыш РЭСтерде 09:00–09:30дан 12:00–17:00гө чейин жарык өчүрүлөт.',
      'Bishkek Electric Grid is doing repairs: outages in the Eastern and Western districts from 09:00–09:30 until 12:00–17:00.'
    ),
    description: L(
      '14 октября в части Бишкека временно отключат электроэнергию в связи с плановыми ремонтными работами. В Восточном РЭС отключения пройдут с 09:30 до 12:00 и с 09:30 до 17:00 по отдельным улицам, в Западном РЭС — с 09:00 до 13:00 и с 09:00 до 17:00. Точный список улиц — в источнике. Время окончания работ может измениться.',
      '14-октябрда пландуу оңдоо иштерине байланыштуу Бишкектин бир бөлүгүндө электр энергиясы убактылуу өчүрүлөт. Чыгыш РЭСте 09:30дан 12:00гө жана 09:30дан 17:00гө чейин, Батыш РЭСте 09:00дөн 13:00гө жана 09:00дөн 17:00гө чейин. Көчөлөрдүн тизмеси булакта.',
      'On 14 October power will be temporarily cut in parts of Bishkek for planned repairs. Eastern district: 09:30–12:00 and 09:30–17:00 on certain streets; Western district: 09:00–13:00 and 09:00–17:00. Street list in the source.'
    ),
    category: 'electricity',
    city: 'bishkek',
    location: L('Восточный и Западный РЭС, г. Бишкек', 'Чыгыш жана Батыш РЭС, Бишкек ш.', 'Eastern & Western grid districts, Bishkek'),
    startDate: '2026-10-14T09:00',
    endDate: '2026-10-14T17:00',
    durationBadge: 'до 8 ч',
    urgency: 'planned',
    status: 'scheduled',
    isUrgentTicker: true,
    sourceName: 'Kaktus.media (со ссылкой на Бишкекское ПЭС)',
    sourceOrgType: 'НЭ',
    eventSourceUrl: 'https://kaktus.media/doc/554879_14_oktiabria_v_chasti_bishkeka_otkluchat_svet_spisok_ylic.html',
    isVerified: true,
    publishedAt: '2026-10-13T10:00',
    updatedAt: '2026-10-13T10:00',
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    ...archivePhoto('High voltage transmission towers and lines.jpg', 'Опоры и провода линии электропередачи', 'линия электропередачи'),
    isDemo: false,
  },
  {
    id: 'ann-water-bishkek-2026-10-15',
    protocolCode: '#KG-WT-1510',
    title: L(
      'Отключение воды 15 октября: район пр. Айтматова и ул. Бакаева',
      '15-октябрда суу өчүрүү: Айтматов пр. жана Бакаев көч. аймагы',
      'Water cut-off on 15 October: Aitmatov Ave & Bakaev St area'
    ),
    summary: L(
      'С 10:00 до 20:00 — ремонт водопровода диаметром 300 мм. Без воды останутся дома, школы, детсады и больницы в квартале.',
      '10:00дөн 20:00гө чейин — диаметри 300 мм суу түтүгүн оңдоо. Кварталдагы үйлөр, мектептер, бала бакчалар суусуз калат.',
      '10:00–20:00 — repair of a 300 mm water main. Homes, schools, kindergartens and clinics in the area will be without water.'
    ),
    description: L(
      'Мэрия Бишкека сообщает: 15 октября с 10:00 до 20:00 будет прекращена подача питьевой воды в жилые дома, школы, детские дошкольные учреждения, объекты здравоохранения и другие объекты в границах улиц Балтагулова, Юдахина, Алтымышева, Бакаева и проспекта Айтматова. Причина — ремонт водопровода диаметром 300 мм.',
      'Бишкек мэриясы билдирет: 15-октябрда 10:00дөн 20:00гө чейин Балтагулов, Юдахин, Алтымышев, Бакаев көчөлөрү жана Айтматов проспектинин чегиндеги турак үйлөргө, мектептерге, бала бакчаларга жана саламаттык сактоо объекттерине ичүүчү суу берилбейт. Себеби — диаметри 300 мм суу түтүгүн оңдоо.',
      'Bishkek City Hall: on 15 October from 10:00 to 20:00 drinking water will be cut off for homes, schools, kindergartens, clinics and other facilities within Baltagulov, Yudakhin, Altymyshev, Bakaev streets and Aitmatov Avenue. Reason: repair of a 300 mm water main.'
    ),
    category: 'water',
    city: 'bishkek',
    district: 'Октябрьский район',
    location: L(
      'Ул. Балтагулова — ул. Юдахина — ул. Алтымышева — ул. Бакаева — пр. Айтматова',
      'Балтагулов көч. — Юдахин көч. — Алтымышев көч. — Бакаев көч. — Айтматов пр.',
      'Baltagulov St — Yudakhin St — Altymyshev St — Bakaev St — Aitmatov Ave'
    ),
    startDate: '2026-10-15T10:00',
    endDate: '2026-10-15T20:00',
    durationBadge: '10 ч',
    urgency: 'planned',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Knews.kg, Economist.kg (со ссылкой на мэрию Бишкека и «Бишкекводоканал»)',
    sourceOrgType: 'МБ',
    eventSourceUrl: 'https://knews.kg/2026/10/13/v-chasti-bishkeka-15-oktyabrya-vremenno-ne-budet-vody',
    isVerified: true,
    publishedAt: '2026-10-13T11:00',
    updatedAt: '2026-10-13T11:00',
    workType: L('Ремонт водопровода Ø300 мм', 'Ø300 мм суу түтүгүн оңдоо', 'Repair of Ø300 mm water main'),
    emergencyContacts: [
      { name: 'Бишкекводоканал', phone: '1533', isTollFree: true, icon: 'water_drop' },
      { name: 'Колл-центр мэрии Бишкека', phone: '1840', isTollFree: true, icon: 'support_agent' },
    ],
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    authorityUrl: BISHKEK_CITY_HALL,
    additionalSourceUrl: 'https://economist.kg/society/2026/10/13/bishkek-voda-15-oktyabrya/',
    ...archivePhoto('Drinking water.jpg', 'Вода из водопроводного крана', 'водопроводный кран'),
    isDemo: false,
  },
  {
    id: 'ann-heating-bishkek-2026',
    protocolCode: '#KG-GOV-HEAT',
    title: L(
      'Отопительный сезон 2026–2027 в Бишкеке: дата ещё не объявлена',
      'Бишкекте 2026–2027-жылдардагы жылытуу мезгили: дата али жарыялана элек',
      'Bishkek heating season 2026–2027: start date not yet announced'
    ),
    summary: L(
      'Мэрия включает отопление распоряжением, когда среднесуточная температура 5 дней подряд не выше +8°C.',
      'Мэрия жылытууну орточо суткалык температура 5 күн катары менен +8 градустан жогору болбогондо буйрук менен киргизет.',
      'City Hall starts heating by decree once the average daily temperature stays at or below +8°C for 5 days in a row.'
    ),
    description: L(
      'На 12 октября официальная дата начала отопительного сезона в Бишкеке не объявлена. Решение принимает мэрия своим распоряжением с учётом прогноза погоды: тепло дают, когда среднесуточная температура воздуха пять суток подряд не поднимается выше +8°C. ТЭЦ и «Бишкектеплосеть» завершают ремонт оборудования и сетей. В прошлом сезоне отопление включили 3 ноября 2025 года. Вопросы по теплу и горячей воде: «Бишкектеплосеть» 1980, колл-центр мэрии 1840 / 1850.',
      '12-октябрга карата Бишкекте жылытуу мезгилинин расмий башталыш датасы жарыялана элек. Чечимди мэрия аба ырайынын болжолун эске алуу менен кабыл алат: орточо суткалык температура беш күн катары менен +8 градустан жогору көтөрүлбөсө, жылуулук берилет. Өткөн сезондо жылытуу 2025-жылдын 3-ноябрында киргизилген. Суроолор: «Бишкектеплосеть» 1980, мэриянын колл-борбору 1840 / 1850.',
      'As of 12 October the official start of the heating season in Bishkek has not been announced. City Hall decides by decree based on the forecast: heating starts when the average daily temperature stays at or below +8°C for five days in a row. Last season heating started on 3 November 2025. Questions: Bishkekteploset 1980, City Hall call centre 1840 / 1850.'
    ),
    category: 'gov',
    city: 'bishkek',
    location: L('г. Бишкек, все районы', 'Бишкек ш., баардык райондор', 'Bishkek, all districts'),
    startDate: '2026-10-13T08:00',
    endDate: '2026-10-13T23:59',
    urgency: 'regular',
    status: 'active',
    isUrgentTicker: false,
    sourceName: 'For.kg (со ссылкой на мэрию Бишкека)',
    sourceOrgType: 'МБ',
    eventSourceUrl: 'https://www.for.kg/news-930432-ru.html',
    isVerified: true,
    publishedAt: '2026-10-12T12:00',
    updatedAt: '2026-10-12T12:00',
    emergencyContacts: [
      { name: 'Бишкектеплосеть', phone: '1980', isTollFree: true, icon: 'heat' },
      { name: 'Колл-центр мэрии Бишкека', phone: '1840', isTollFree: true, icon: 'support_agent' },
    ],
    ...checked('2026-10-14T10:00'),
    sourceKind: 'media',
    authorityUrl: BISHKEK_CITY_HALL,
    ...archivePhoto('Bishkek 03-2016 img17 CHP.jpg', 'ТЭЦ-1 Бишкека', 'ТЭЦ-1 Бишкека, A.Savin (Free Art License)'),
    isDemo: false,
  },

  // ───────────── Концерты ─────────────
  {
    id: 'ann-arbenina-2026-10-13',
    protocolCode: '#KG-EV-ARBENINA',
    title: L(
      'Диана Арбенина и «Ночные снайперы» в Nomad Arena',
      'Диана Арбенина жана «Ночные снайперы» «Nomad Arena» аянтчасында',
      'Diana Arbenina & Night Snipers at Nomad Arena'
    ),
    summary: L(
      'Большой концерт рок-группы «Ночные снайперы» и её лидера Дианы Арбениной. Продолжительность — около 2 часов.',
      '«Ночные снайперы» рок-тобунун жана анын лидери Диана Арбенинанын чоң концерти. Узактыгы — болжол менен 2 саат.',
      'A full concert by the rock band Night Snipers and frontwoman Diana Arbenina. Approx. 2 hours.'
    ),
    description: L(
      'Диана Арбенина и группа «Ночные снайперы» выступят в Бишкеке 13 октября 2026 года в 19:00 на площадке Nomad Arena (ул. Виноградная, 1/3). В программе — песни разных лет. Продолжительность концерта около 2 часов. Билеты от 3 300 до 11 000 сом продаются на Ticket.kg.',
      'Диана Арбенина жана «Ночные снайперы» тобу 2026-жылдын 13-октябрында саат 19:00дө Бишкектеги Nomad Arena аянтчасында (Виноградная көч., 1/3) концерт беришет. Концерттин узактыгы болжол менен 2 саат. Билеттер 3 300дөн 11 000 сомго чейин Ticket.kg сайтында сатылат.',
      'Diana Arbenina and Night Snipers play Bishkek on 13 October 2026 at 19:00 at Nomad Arena (1/3 Vinogradnaya St). About 2 hours. Tickets 3,300–11,000 KGS on Ticket.kg.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L('Nomad Arena, ул. Виноградная, 1/3', 'Nomad Arena, Виноградная көч., 1/3', 'Nomad Arena, 1/3 Vinogradnaya St'),
    startDate: '2026-10-13T19:00',
    endDate: '2026-10-13T21:00',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Ticket.kg',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://ticket.kg/event/kontsert-pevitsy-diany-arbeninoi-i-gruppy-nochnye-snaipery',
    isVerified: true,
    publishedAt: '2026-09-15T10:00',
    updatedAt: '2026-10-10T10:00',
    eventDetails: {
      priceText: L('от 3 300 до 11 000 сом', '3 300 — 11 000 сом', '3,300 – 11,000 KGS'),
      venue: 'Nomad Arena',
      timeRange: '19:00',
    },
    imageUrl: commons(ARBENINA_PHOTO),
    imageSourceUrl: commonsPage(ARBENINA_PHOTO),
    imageAlt: 'Диана Арбенина на сцене',
    imageCredit: 'Фото: Roman Boldyrev / Wikimedia Commons, CC BY-SA 4.0',
    imageFit: 'contain',
    ticketUrl: 'https://ticket.kg/event/kontsert-pevitsy-diany-arbeninoi-i-gruppy-nochnye-snaipery',
    ticketUrlVerified: true,
    ...checked('2026-10-13T18:00'),
    isDemo: false,
  },
  {
    id: 'ann-jony-2026-11-08',
    protocolCode: '#KG-EV-JONY',
    title: L('JONY: сольный концерт в «Жаштык Арене»', 'JONY: «Жаштык Аренадагы» жеке концерт', 'JONY solo concert at Zhashtyk Arena'),
    summary: L(
      'Большой сольный концерт исполнителя хитов «Комета», «Аллея» и «Камин».',
      '«Комета», «Аллея» жана «Камин» хиттеринин аткаруучусунун чоң жеке концерти.',
      'A big solo show by the singer behind “Kometa”, “Alleya” and “Kamin”.'
    ),
    description: L(
      'JONY выступит с сольной программой в Бишкеке в воскресенье, 8 ноября 2026 года, в 19:00. Площадка — «Жаштык Арена», ул. Тоголок Молдо, 17/7. Билеты продаются на Kassir.kg; цены уточняйте при покупке.',
      'JONY 2026-жылдын 8-ноябрында, жекшембиде, саат 19:00дө Бишкекте жеке программа менен чыгат. Аянтча — «Жаштык Арена», Тоголок Молдо көч., 17/7. Билеттер Kassir.kg сайтында.',
      'JONY performs a solo show in Bishkek on Sunday, 8 November 2026, at 19:00 at Zhashtyk Arena, 17/7 Togolok Moldo St. Tickets on Kassir.kg.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L('«Жаштык Арена», ул. Тоголок Молдо, 17/7', '«Жаштык Арена», Тоголок Молдо көч., 17/7', 'Zhashtyk Arena, 17/7 Togolok Moldo St'),
    startDate: '2026-11-08T19:00',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Kassir.kg',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://kassir.kg/ru/session/4318-jony-v-bishkeke-8-noiabria-zhashtyk-arena',
    ticketUrl: 'https://kassir.kg/ru/session/4318-jony-v-bishkeke-8-noiabria-zhashtyk-arena',
    ticketUrlVerified: true,
    isVerified: true,
    publishedAt: '2026-09-20T10:00',
    updatedAt: '2026-10-10T10:00',
    eventDetails: {
      venue: '«Жаштык Арена»',
      timeRange: '19:00',
    },
    ...checked('2026-10-13T18:00'),
    ...artistPhoto('Jony на VK Fest 2022 (2).jpg', 'JONY на сцене VK Fest 2022', 'JONY на VK Fest 2022'),
    isDemo: false,
  },
  {
    id: 'ann-zimmer-2026-11-28',
    protocolCode: '#KG-EV-ZIMMER',
    title: L(
      'The Music of Hans Zimmer — симфоническое шоу в филармонии',
      'The Music of Hans Zimmer — филармониядагы симфониялык шоу',
      'The Music of Hans Zimmer — symphonic show at the Philharmonic'
    ),
    summary: L(
      'Музыка из «Интерстеллара», «Гладиатора», «Пиратов Карибского моря» и «Короля Льва» в живом исполнении оркестра.',
      '«Интерстеллар», «Гладиатор», «Кариб деңизинин каракчылары» жана «Арстан падыша» тасмаларынын музыкасы оркестрдин жандуу аткаруусунда.',
      'Music from Interstellar, Gladiator, Pirates of the Caribbean and The Lion King performed live by an orchestra.'
    ),
    description: L(
      'Шоу «The Music of Hans Zimmer» пройдёт 28 ноября 2026 года (суббота) в 18:30 в Кыргызской национальной филармонии им. Т. Сатылганова, пр. Чуй, 253. Билеты от 1 700 сом. Касса филармонии: (0312) 61-40-15.',
      '«The Music of Hans Zimmer» шоусу 2026-жылдын 28-ноябрында (ишемби) саат 18:30да Т. Сатылганов атындагы Кыргыз улуттук филармониясында, Чүй пр., 253, өтөт. Билеттер 1 700 сомдон. Филармониянын кассасы: (0312) 61-40-15.',
      'The Music of Hans Zimmer takes place on Saturday 28 November 2026 at 18:30 at the T. Satylganov Kyrgyz National Philharmonic, 253 Chui Ave. Tickets from 1,700 KGS. Box office: (0312) 61-40-15.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L(
      'Филармония им. Т. Сатылганова, пр. Чуй, 253',
      'Т. Сатылганов атн. филармония, Чүй пр., 253',
      'T. Satylganov Philharmonic, 253 Chui Ave'
    ),
    startDate: '2026-11-28T18:30',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Bishkek.events',
    sourceOrgType: 'БИЛ',
    // Дата 28.11 подтверждена только афишей bishkek.events; страница продажи билетов не найдена
    eventSourceUrl: 'https://bishkek.events/events/category/concerts/',
    isVerified: false,
    publishedAt: '2026-10-01T10:00',
    updatedAt: '2026-10-10T10:00',
    eventDetails: {
      priceText: L('от 1 700 сом', '1 700 сомдон', 'from 1,700 KGS'),
      venue: 'Филармония им. Т. Сатылганова',
      timeRange: '18:30',
      contactPhone: '(0312) 61-40-15',
    },
    ...illus('concert', 'Пустая концертная сцена с микрофоном'),
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    isDemo: false,
  },

  // ───────────── Ярмарки и выставки ─────────────
  {
    id: 'ann-altyn-kuz-2026',
    protocolCode: '#KG-FR-ALTYNKUZ',
    title: L(
      'Ярмарка «Алтын күз» и выставка «АгроТехЭкспо — 2026»',
      '«Алтын күз» жарманкеси жана «АгроТехЭкспо — 2026» көргөзмөсү',
      '“Altyn Kuz” fair & AgroTechExpo 2026'
    ),
    summary: L(
      'Сельхозпродукция от фермеров по доступным ценам, техника, агродроны и первый кыргызстанский спутник. Вход свободный.',
      'Дыйкандардан арзан баадагы айыл чарба азыктары, техника, агродрондор жана биринчи кыргызстандык спутник. Кирүү акысыз.',
      'Farm produce at fair prices, machinery, agro-drones and Kyrgyzstan’s first satellite. Free entry.'
    ),
    description: L(
      'С 23 по 25 октября на площади им. Турдакуна Усубалиева (Старая площадь) пройдут республиканская выставка «АгроТехЭкспо — 2026» и сельскохозяйственная ярмарка «Алтын күз», приуроченные ко Дню работников сельского хозяйства. Организатор — Министерство водных ресурсов, сельского хозяйства и перерабатывающей промышленности КР. Главная тема выставки — инновации: мультиспектральный дрон для мониторинга пастбищ, первый кыргызстанский спутник, современная техника. На ярмарке — продукция фермеров напрямую. Время работы уточняйте у организатора (по разным данным 09:00–18:00 или 10:00–17:00).',
      '23–25-октябрь күндөрү Турдакун Усубалиев атындагы аянтта (Эски аянт) Айыл чарба кызматкерлеринин күнүнө карата «АгроТехЭкспо — 2026» республикалык көргөзмөсү жана «Алтын күз» айыл чарба жарманкеси өтөт. Уюштуруучу — КР Суу ресурстары, айыл чарба жана кайра иштетүү өнөр жайы министрлиги. Көргөзмөдө жайыттарды көзөмөлдөөчү мультиспектралдык дрон жана биринчи кыргызстандык спутник көрсөтүлөт.',
      'From 23 to 25 October, Turdakun Usubaliev Square (Old Square) hosts the national AgroTechExpo 2026 exhibition and the “Altyn Kuz” farmers’ fair for Agriculture Workers’ Day, organised by the Ministry of Water Resources, Agriculture and Processing Industry. Highlights: a multispectral pasture-monitoring drone and Kyrgyzstan’s first satellite.'
    ),
    category: 'fairs',
    city: 'bishkek',
    location: L(
      'Площадь им. Т. Усубалиева (Старая площадь), Бишкек',
      'Т. Усубалиев атн. аянт (Эски аянт), Бишкек',
      'T. Usubaliev Square (Old Square), Bishkek'
    ),
    startDate: '2026-10-23T09:00',
    endDate: '2026-10-25T18:00',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Kaktus.media (со ссылкой на Минводсельпром КР)',
    sourceOrgType: 'ГОС',
    eventSourceUrl: 'https://kaktus.media/doc/554163_v_bishkeke_vnov_proydyt_selhozvystavka_agrotehekspo_i_iarmarka_altyn_kyz._prihodite.html',
    isVerified: true,
    publishedAt: '2026-09-29T10:00',
    updatedAt: '2026-10-08T10:00',
    eventDetails: {
      priceText: L('Вход свободный', 'Кирүү акысыз', 'Free entry'),
      organizer: 'Минводсельпром КР',
      venue: 'Старая площадь',
    },
    ...checked('2026-10-13T18:00'),
    sourceKind: 'media',
    ...archivePhoto('Osh Bazaar in Bishkek, Kyrgyzstan- dried fruits and nuts.jpg', 'Сухофрукты и орехи на прилавке Ошского базара', 'прилавок Ошского базара в Бишкеке, neiljs'),
    isDemo: false,
  },
  {
    id: 'ann-transl-2026',
    protocolCode: '#KG-FR-TRANSLOG',
    title: L(
      'Выставки KyrgyzTransLogistic и Interior Expo 2026',
      'KyrgyzTransLogistic жана Interior Expo 2026 көргөзмөлөрү',
      'KyrgyzTransLogistic & Interior Expo 2026'
    ),
    summary: L(
      'Международные выставки транспорта, логистики, строительства и интерьера во Дворце спорта им. Кожомкула.',
      'Кожомкул атындагы Спорт сарайында транспорт, логистика, курулуш жана интерьер боюнча эл аралык көргөзмөлөр.',
      'International transport, logistics, construction and interior expos at the Kozhomkul Sports Palace.'
    ),
    description: L(
      'С 27 по 29 октября 2026 года в Бишкеке пройдут выставки KyrgyzTransLogistic 2026 (транспорт и логистика) и Interior Expo 2026 (строительство и интерьер). Площадка KyrgyzTransLogistic — Дворец спорта им. Кожомкула. Для специалистов, перевозчиков, застройщиков и всех, кто делает ремонт.',
      '2026-жылдын 27–29-октябрында Бишкекте KyrgyzTransLogistic 2026 (транспорт жана логистика) жана Interior Expo 2026 (курулуш жана интерьер) көргөзмөлөрү өтөт. KyrgyzTransLogistic аянтчасы — Кожомкул атындагы Спорт сарайы.',
      'KyrgyzTransLogistic 2026 (transport & logistics) and Interior Expo 2026 (construction & interiors) run 27–29 October 2026 in Bishkek. KyrgyzTransLogistic venue: Kozhomkul Sports Palace.'
    ),
    category: 'exhibitions',
    city: 'bishkek',
    location: L('Дворец спорта им. Кожомкула, Бишкек', 'Кожомкул атн. Спорт сарайы, Бишкек', 'Kozhomkul Sports Palace, Bishkek'),
    startDate: '2026-10-27T10:00',
    endDate: '2026-10-29T18:00',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'WorldExpo.pro',
    sourceOrgType: 'ОРГ',
    eventSourceUrl: 'https://worldexpo.pro/region/bishkek/exhibitions',
    isVerified: true,
    publishedAt: '2026-09-01T10:00',
    updatedAt: '2026-10-05T10:00',
    eventDetails: { venue: 'Дворец спорта им. Кожомкула' },
    ...illus('exhibition', 'Выставочные стенды'),
    ...checked('2026-10-13T18:00'),
    isDemo: false,
  },

  // ───────────── Кино ─────────────
  {
    id: 'ann-street-fighter-2026',
    protocolCode: '#KG-CN-STREETF',
    title: L('Премьера: «Уличный боец» (Street Fighter)', 'Премьера: «Street Fighter»', 'Premiere: Street Fighter'),
    summary: L(
      'Новая экранизация культовой игры с Джейсоном Момоа выходит в кинотеатрах Бишкека.',
      'Джейсон Момоа ойногон культтук оюндун жаңы экранизациясы Бишкектин кинотеатрларында.',
      'The new adaptation of the cult game, starring Jason Momoa, opens in Bishkek cinemas.'
    ),
    description: L(
      'Мировая премьера фильма «Уличный боец» (Street Fighter) — 16 октября 2026 года; в кинотеатре «Манас» фильм заявлен в разделе «Скоро» с 15 октября. Расписание сеансов и цены — на сайтах кинотеатров. Закрытые и специальные показы появятся здесь после подтверждения организаторами.',
      '«Street Fighter» тасмасынын дүйнөлүк премьерасы — 2026-жылдын 16-октябры; «Манас» кинотеатрында 15-октябрдан тартып «Жакында» бөлүмүндө. Сеанстар жана баалар — кинотеатрлардын сайттарында.',
      'Street Fighter opens worldwide on 16 October 2026; Manas cinema lists it as “Coming soon” from 15 October. Showtimes and prices on cinema websites.'
    ),
    category: 'cinema',
    city: 'bishkek',
    location: L('Кинотеатр «Манас» и кинотеатры Бишкека', '«Манас» кинотеатры жана Бишкектин кинотеатрлары', 'Manas cinema and other Bishkek cinemas'),
    startDate: '2026-10-15T10:00',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Кинотеатр «Манас»',
    sourceOrgType: 'КИНО',
    eventSourceUrl: 'https://manascinema.com/',
    isVerified: false,
    publishedAt: '2026-10-10T10:00',
    updatedAt: '2026-10-10T10:00',
    eventDetails: { venue: 'Кинотеатры Бишкека' },
    ...illus('cinema', 'Кинохлопушка'),
    ...checked('2026-10-13T18:00'),
    sourceKind: 'organizer',
    isDemo: false,
  },

  // ───────────── Добавлено 14.10.2026: подтверждённые события и объявления до 31.12.2026 ─────────────
  {
    id: 'ann-expo-eurasia-2026',
    protocolCode: '#KG-EX-EXPOEURASIA',
    title: L(
      'EXPO EURASIA KYRGYZSTAN 2026 и Бишкекский бизнес-форум',
      'EXPO EURASIA KYRGYZSTAN 2026 көргөзмөсү жана Бишкек бизнес-форуму',
      'EXPO EURASIA KYRGYZSTAN 2026 & Bishkek Business Forum'
    ),
    summary: L(
      'Вторая международная промышленная выставка с конференцией и круглыми столами.',
      'Конференция жана тегерек столдор менен экинчи эл аралык өнөр жай көргөзмөсү.',
      'The second international industrial exhibition with a conference and round tables.'
    ),
    description: L(
      'С 15 по 17 октября 2026 года в ВСК «Жаштык Арена» проходит вторая международная промышленная выставка EXPO EURASIA KYRGYZSTAN 2026 и Бишкекский бизнес-форум. В программе — экспозиция компаний, конференция и круглые столы. Время работы уточняйте у организаторов.',
      '2026-жылдын 15–17-октябрында «Жаштык Арена» спорт комплексинде EXPO EURASIA KYRGYZSTAN 2026 экинчи эл аралык өнөр жай көргөзмөсү жана Бишкек бизнес-форуму өтөт. Программада компаниялардын экспозициясы, конференция жана тегерек столдор. Иштөө убактысын уюштуруучулардан тактаңыз.',
      'The second international industrial exhibition EXPO EURASIA KYRGYZSTAN 2026 and the Bishkek Business Forum take place at Zhashtyk Arena on 15–17 October 2026, with company stands, a conference and round tables. Check opening hours with the organisers.'
    ),
    category: 'exhibitions',
    city: 'bishkek',
    location: L('ВСК «Жаштык Арена», ул. Тоголок Молдо, 17/7', '«Жаштык Арена», Тоголок Молдо көч., 17/7', 'Zhashtyk Arena, 17/7 Togolok Moldo St'),
    startDate: '2026-10-15T00:00',
    endDate: '2026-10-17T23:59',
    timeTBA: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Elec.ru — календарь выставок',
    sourceOrgType: 'ОРГ',
    eventSourceUrl: 'https://www.elec.ru/events/2026/expo-eurasia-kyrgyzstan.html',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { venue: 'Жаштык Арена' },
    ...illus('exhibition', 'Выставочные стенды'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-philharmonic-90-season',
    protocolCode: '#KG-CU-FIL90',
    title: L(
      'Открытие 90-го концертного сезона Национальной филармонии',
      'Улуттук филармониянын 90-концерттик сезонунун ачылышы',
      'National Philharmonic opens its 90th concert season'
    ),
    summary: L(
      'Выступит Академический оркестр народных инструментов имени К. Орозова.',
      'К. Орозов атындагы академиялык элдик аспаптар оркестри чыгат.',
      'The K. Orozov Academic Orchestra of Folk Instruments performs.'
    ),
    description: L(
      'По сообщению пресс-службы Министерства культуры, 19 октября 2026 года Кыргызская национальная филармония им. Т. Сатылганова открывает 90-й концертный сезон. На открытии выступит Академический оркестр народных инструментов имени К. Орозова. Время начала и условия входа уточняйте в кассе филармонии.',
      'Маданият министрлигинин басма сөз кызматынын маалыматы боюнча, 2026-жылдын 19-октябрында Т. Сатылганов атындагы Кыргыз улуттук филармониясы 90-концерттик сезонун ачат. Ачылышта К. Орозов атындагы академиялык элдик аспаптар оркестри чыгат. Башталыш убактысын жана кирүү шарттарын филармониянын кассасынан тактаңыз.',
      'According to the Ministry of Culture, the T. Satylganov Kyrgyz National Philharmonic opens its 90th concert season on 19 October 2026 with the K. Orozov Academic Orchestra of Folk Instruments. Check the start time and entry at the box office.'
    ),
    category: 'culture',
    city: 'bishkek',
    location: L('Филармония им. Т. Сатылганова, пр. Чуй, 253', 'Т. Сатылганов атн. филармония, Чүй пр., 253', 'T. Satylganov Philharmonic, 253 Chui Ave'),
    startDate: '2026-10-19T00:00',
    endDate: '',
    timeTBA: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Минкультуры КР • АКИpress Культура',
    sourceOrgType: 'ГОС',
    eventSourceUrl: 'https://culture.akipress.org/news:2548332',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { venue: 'Национальная филармония', contactPhone: '(0312) 61-40-15' },
    ...illus('culture', 'Театральные маски и занавес'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-malika-dina-2026-10-31',
    protocolCode: '#KG-EV-MALIKADINA',
    title: L('MALIKA DINA: большой сольный концерт', 'MALIKA DINA: чоң жеке концерт', 'MALIKA DINA: big solo concert'),
    summary: L(
      'Известные хиты, новые песни, живой вокал и световое шоу. Около двух часов.',
      'Белгилүү хиттер, жаңы ырлар, жандуу вокал жана жарык шоусу. Болжол менен эки саат.',
      'Best-known hits, new songs, live vocals and a light show. About two hours.'
    ),
    description: L(
      'Сольный концерт MALIKA DINA пройдёт в субботу, 31 октября 2026 года, в 19:00 в «Жаштык Арене» (ул. Тоголок Молдо, 17/7). Продолжительность — около двух часов. Билеты от 1 500 сом продаются на Kassir.kg.',
      'MALIKA DINA ырчынын жеке концерти 2026-жылдын 31-октябрында, ишемби күнү, саат 19:00дө «Жаштык Аренада» (Тоголок Молдо көч., 17/7) өтөт. Узактыгы — болжол менен эки саат. Билеттер 1 500 сомдон Kassir.kg сайтында сатылат.',
      'MALIKA DINA performs on Saturday 31 October 2026 at 19:00 at Zhashtyk Arena (17/7 Togolok Moldo St). About two hours. Tickets from 1,500 KGS on Kassir.kg.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L('«Жаштык Арена», ул. Тоголок Молдо, 17/7', '«Жаштык Арена», Тоголок Молдо көч., 17/7', 'Zhashtyk Arena, 17/7 Togolok Moldo St'),
    startDate: '2026-10-31T19:00',
    endDate: '2026-10-31T21:00',
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Kassir.kg • Bishkek.events',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://bishkek.events/event/malika-dina/',
    ticketUrl: 'https://kassir.kg/ru/session/4316-malika-dina-bolshoi-solnyi-kontsert',
    ticketUrlVerified: true,
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { priceText: L('от 1 500 сом', '1 500 сомдон', 'from 1,500 KGS'), venue: '«Жаштык Арена»', timeRange: '19:00' },
    // Фото артистки предоставлено владельцем сайта; хранится в public/posters. Это не официальная афиша концерта.
    imageUrl: '/posters/malika-dina.jpg',
    imageAlt: 'MALIKA DINA в образе из красных лепестков на тёмно-красном фоне',
    imageCredit: 'Фото артистки MALIKA DINA — не афиша этого концерта',
    imageFit: 'contain' as const,
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-futsal-kg-vn-2026-11-03',
    protocolCode: '#KG-SP-FUTSAL1',
    title: L(
      'Футзал: Кыргызстан — Вьетнам, товарищеский матч (1-й)',
      'Футзал: Кыргызстан — Вьетнам, жолдоштук беттеш (1-)',
      'Futsal: Kyrgyzstan v Vietnam, friendly (match 1)'
    ),
    summary: L(
      'Сборная Кыргызстана по футзалу проведёт в Бишкеке два матча с Вьетнамом — 3 и 5 ноября.',
      'Кыргызстандын футзал боюнча курама командасы Бишкекте Вьетнам менен эки беттеш өткөрөт — 3 жана 5-ноябрда.',
      'Kyrgyzstan’s futsal team hosts Vietnam in Bishkek for two friendlies on 3 and 5 November.'
    ),
    description: L(
      'Товарищеские матчи национальных сборных Кыргызстана и Вьетнама по футзалу пройдут в Бишкеке на площадке новой «Мурас Арены» 3 и 5 ноября 2026 года. Время начала и продажа билетов пока не объявлены — следите за сообщениями Кыргызского футбольного союза.',
      'Кыргызстан менен Вьетнамдын футзал боюнча курама командаларынын жолдоштук беттештери 2026-жылдын 3 жана 5-ноябрында Бишкектеги жаңы «Мурас Аренада» өтөт. Башталыш убактысы жана билет сатуу азырынча жарыялана элек — Кыргыз футбол союзунун кабарларын көз салыңыз.',
      'Kyrgyzstan and Vietnam play two futsal friendlies at the new Muras Arena in Bishkek on 3 and 5 November 2026. Kick-off times and ticket sales have not been announced yet — follow the Kyrgyz Football Union.'
    ),
    category: 'sport',
    city: 'bishkek',
    location: L('«Мурас Арена», Бишкек', '«Мурас Арена», Бишкек', 'Muras Arena, Bishkek'),
    startDate: '2026-11-03T00:00',
    endDate: '',
    timeTBA: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Sport АКИpress • Новости.кг',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://sport.akipress.org/news:2542299',
    organizerUrl: 'https://www.kfu.kg/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { venue: 'Мурас Арена' },
    ...illus('sport', 'Футбольный мяч и ворота'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-futsal-kg-vn-2026-11-05',
    protocolCode: '#KG-SP-FUTSAL2',
    title: L(
      'Футзал: Кыргызстан — Вьетнам, товарищеский матч (2-й)',
      'Футзал: Кыргызстан — Вьетнам, жолдоштук беттеш (2-)',
      'Futsal: Kyrgyzstan v Vietnam, friendly (match 2)'
    ),
    summary: L(
      'Второй товарищеский матч сборных по футзалу в «Мурас Арене».',
      'Курама командалардын «Мурас Аренадагы» экинчи жолдоштук беттеши.',
      'The second futsal friendly at Muras Arena.'
    ),
    description: L(
      'Второй из двух товарищеских матчей сборных Кыргызстана и Вьетнама по футзалу — 5 ноября 2026 года в «Мурас Арене» (Бишкек). Время начала и билеты пока не объявлены.',
      'Кыргызстан менен Вьетнамдын футзал боюнча эки жолдоштук беттешинин экинчиси — 2026-жылдын 5-ноябрында «Мурас Аренада» (Бишкек). Башталыш убактысы жана билеттер азырынча жарыялана элек.',
      'The second of two Kyrgyzstan v Vietnam futsal friendlies — 5 November 2026 at Muras Arena, Bishkek. Kick-off time and tickets not announced yet.'
    ),
    category: 'sport',
    city: 'bishkek',
    location: L('«Мурас Арена», Бишкек', '«Мурас Арена», Бишкек', 'Muras Arena, Bishkek'),
    startDate: '2026-11-05T00:00',
    endDate: '',
    timeTBA: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Новости.кг • Sport АКИpress',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://novosti.kg/2026/09/kyrgyzstan-i-vetnam-sygrayut-v-futzal-v-bishkeke/',
    organizerUrl: 'https://www.kfu.kg/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { venue: 'Мурас Арена' },
    ...illus('sport', 'Футбольный мяч и ворота'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-history-memory-days-2026',
    protocolCode: '#KG-GOV-TARYH',
    title: L(
      'Дни истории и памяти предков',
      'Тарых жана ата-бабаларды эскерүү күндөрү',
      'Days of History and Commemoration of Ancestors'
    ),
    summary: L(
      '7–8 ноября — праздничные дни в календаре Кыргызстана. Режим работы организаций уточняйте.',
      '7–8-ноябрь — Кыргызстандын календарындагы майрам күндөрү. Мекемелердин иш тартибин тактаңыз.',
      '7–8 November are public commemoration days in Kyrgyzstan. Check opening hours of organisations.'
    ),
    description: L(
      '7 и 8 ноября в Кыргызстане отмечаются Дни истории и памяти предков. В 2026 году эти даты выпадают на субботу и воскресенье. Источники расходятся в том, будут ли они нерабочими: по сообщению Sputnik Кыргызстан, по новому Трудовому кодексу 7 и 8 ноября остаются праздничными, но рабочими днями. Уточняйте режим работы у своего работодателя и в учреждениях.',
      'Кыргызстанда 7 жана 8-ноябрда Тарых жана ата-бабаларды эскерүү күндөрү белгиленет. 2026-жылы бул даталар ишемби жана жекшембиге туура келет. Алардын эс алуу күнү болушу боюнча булактар ар башка: Sputnik Кыргызстандын маалыматы боюнча, жаңы Эмгек кодексине ылайык 7 жана 8-ноябрь майрам, бирок жумуш күндөрү бойдон калат. Иш тартибин иш берүүчүдөн жана мекемелерден тактаңыз.',
      'Kyrgyzstan marks the Days of History and Commemoration of Ancestors on 7 and 8 November; in 2026 they fall on a Saturday and Sunday. Sources differ on whether they are days off: Sputnik Kyrgyzstan reports that under the new Labour Code they remain holidays but working days. Check with your employer.'
    ),
    category: 'gov',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-11-07T00:00',
    endDate: '2026-11-08T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'scheduled',
    sourceName: 'Кабар • Sputnik Кыргызстан',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://ru.kabar.kg/news/kakie-prazdniki-i-kanikuly-zhdut-kyrgyzstancev-v-2026-godu/',
    organizerUrl: 'https://ru.sputnik.kg/20260121/calendar-2026-prazdniki-vyhodnye-1099270899.html',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('holiday', 'Страница календаря с орнаментом'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-u17-qualifiers-2026',
    protocolCode: '#KG-SP-U17',
    title: L(
      'Отбор Кубка Азии U-17: группа F в Кыргызстане',
      'U-17 Азия кубогунун тандоосу: F тайпасы Кыргызстанда',
      'AFC U-17 Asian Cup qualifiers: Group F in Kyrgyzstan'
    ),
    summary: L(
      'Сборная Кыргызстана U-17 сыграет с Йеменом, Туркменистаном, Монголией и Северными Марианскими островами.',
      'Кыргызстандын U-17 курамасы Йемен, Түркмөнстан, Монголия жана Түндүк Мариан аралдары менен ойнойт.',
      'Kyrgyzstan U-17 face Yemen, Turkmenistan, Mongolia and the Northern Mariana Islands.'
    ),
    description: L(
      'По данным AKIpress, матчи отборочного раунда Кубка Азии (U-17) в группе F стартуют 8 ноября 2026 года и пройдут в Кыргызстане. Соперники сборной Кыргызстана (тренер Игорь Кудренко) — Йемен, Туркменистан, Монголия и Северные Марианские острова. Расписание матчей и стадион пока не опубликованы.',
      'AKIpress агенттигинин маалыматы боюнча, Азия кубогунун (U-17) тандоо айлампасынын F тайпасындагы беттештер 2026-жылдын 8-ноябрында башталып, Кыргызстанда өтөт. Кыргызстан курамасынын (машыктыруучу Игорь Кудренко) атаандаштары — Йемен, Түркмөнстан, Монголия жана Түндүк Мариан аралдары. Беттештердин графиги жана стадион азырынча жарыялана элек.',
      'According to AKIpress, AFC U-17 Asian Cup qualifying Group F starts on 8 November 2026 in Kyrgyzstan. Kyrgyzstan (coach Igor Kudrenko) face Yemen, Turkmenistan, Mongolia and the Northern Mariana Islands. The fixture list and stadium have not been published yet.'
    ),
    category: 'sport',
    city: 'all',
    location: L('Кыргызстан — стадион будет объявлен', 'Кыргызстан — стадион кийин жарыяланат', 'Kyrgyzstan — stadium to be announced'),
    startDate: '2026-11-08T00:00',
    endDate: '',
    timeTBA: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Sport АКИpress',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://sport.akipress.org/news:2523610',
    organizerUrl: 'https://www.kfu.kg/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('sport', 'Футбольный мяч и ворота'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-xcho-2026-11-11',
    protocolCode: '#KG-EV-XCHO',
    title: L('XCHO в Бишкеке', 'XCHO Бишкекте', 'XCHO in Bishkek'),
    summary: L(
      'Концерт исполнителя XCHO в Nomad Arena. Билеты продают несколько билетных сервисов.',
      'XCHO аткаруучусунун «Nomad Arena» аянтчасындагы концерти. Билеттерди бир нече билет кызматы сатат.',
      'XCHO live at Nomad Arena. Tickets are sold by several ticket services.'
    ),
    description: L(
      'Концерт XCHO пройдёт 11 ноября 2026 года в 19:00 в Nomad Arena (ул. Виноградная, 1/3). По данным афиши Bishkek.events, билеты продаются на Kassir.kg, Ticket.kg и Ticketon.kg; цены в разных сервисах указаны по-разному — проверяйте при покупке.',
      'XCHO аткаруучусунун концерти 2026-жылдын 11-ноябрында саат 19:00дө «Nomad Arena» аянтчасында (Виноградная көч., 1/3) өтөт. Bishkek.events афишасынын маалыматы боюнча, билеттер Kassir.kg, Ticket.kg жана Ticketon.kg сайттарында сатылат; баалар ар кайсы кызматта ар башка — сатып алууда текшериңиз.',
      'XCHO performs on 11 November 2026 at 19:00 at Nomad Arena (1/3 Vinogradnaya St). According to Bishkek.events, tickets are on Kassir.kg, Ticket.kg and Ticketon.kg; prices differ between services — check when buying.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L('Nomad Arena, ул. Виноградная, 1/3', 'Nomad Arena, Виноградная көч., 1/3', 'Nomad Arena, 1/3 Vinogradnaya St'),
    startDate: '2026-11-11T19:00',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Bishkek.events',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://bishkek.events/event/xcho/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { venue: 'Nomad Arena', timeRange: '19:00' },
    ...checked('2026-10-14T12:00'),
    ...artistPhoto('Խաչիկ Դունամալյան.jpg', 'Портрет исполнителя XCHO', 'XCHO (Хачик Дунамалян)'),
    isDemo: false,
  },
  {
    id: 'ann-cec-nomination-end-2026',
    protocolCode: '#KG-GOV-CEC1',
    title: L(
      'Выборы президента: завершение выдвижения кандидатов',
      'Президенттик шайлоо: талапкерлерди көрсөтүүнүн аякташы',
      'Presidential election: candidate nomination closes'
    ),
    summary: L(
      'По календарному плану ЦИК выдвижение кандидатов на выборы 27 января 2027 года завершается 13 ноября.',
      'БШКнын календардык планы боюнча 2027-жылдын 27-январындагы шайлоого талапкерлерди көрсөтүү 13-ноябрда аяктайт.',
      'Under the CEC calendar, nominations for the 27 January 2027 election close on 13 November.'
    ),
    description: L(
      'Выборы президента Кыргызской Республики назначены на 27 января 2027 года. Согласно календарному плану, утверждённому ЦИК, выдвижение кандидатов завершается 13 ноября 2026 года.',
      'Кыргыз Республикасынын Президентин шайлоо 2027-жылдын 27-январына дайындалган. БШК бекиткен календардык планга ылайык, талапкерлерди көрсөтүү 2026-жылдын 13-ноябрында аяктайт.',
      'The presidential election is set for 27 January 2027. Under the calendar plan approved by the Central Election Commission, candidate nomination closes on 13 November 2026.'
    ),
    category: 'gov',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-11-13T00:00',
    endDate: '2026-11-13T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'scheduled',
    sourceName: 'Reporter.kg (календарный план ЦИК КР)',
    sourceOrgType: 'ГОС',
    eventSourceUrl: 'https://reporter.kg/ru/klyuchevye-daty-utverzhdennogo-tsik-kalendarya-prezidentskikh-vyborov-podrobno/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('election', 'Урна для голосования и бюллетень'),
    ...checked('2026-10-14T12:00'),
    sourceKind: 'media',
    authorityUrl: CEC_SITE,
    isDemo: false,
  },
  {
    id: 'ann-cec-voter-lists-2026',
    protocolCode: '#KG-GOV-CEC2',
    title: L(
      'Проверьте свои данные в списках избирателей',
      'Шайлоочулардын тизмесинен өз маалыматыңызды текшериңиз',
      'Check your details in the voter lists'
    ),
    summary: L(
      'С 18 ноября 2026 по 12 января 2027 года можно подать заявление об уточнении данных в списках избирателей.',
      '2026-жылдын 18-ноябрынан 2027-жылдын 12-январына чейин шайлоочулардын тизмесиндеги маалыматты тактоо үчүн арыз берсе болот.',
      'From 18 November 2026 to 12 January 2027 you can apply to correct your voter-list details.'
    ),
    description: L(
      'По календарному плану ЦИК к выборам президента 27 января 2027 года избиратели могут с 18 ноября 2026 года по 12 января 2027 года подать заявление об уточнении своих данных в списках избирателей, если обнаружили ошибки или неточности.',
      '2027-жылдын 27-январындагы президенттик шайлоого карата БШКнын календардык планына ылайык, шайлоочулар 2026-жылдын 18-ноябрынан 2027-жылдын 12-январына чейин тизмеден ката же так эмес маалымат тапса, аны тактоо үчүн арыз бере алышат.',
      'Under the CEC calendar for the 27 January 2027 presidential election, voters can apply from 18 November 2026 to 12 January 2027 to correct errors in their voter-list details.'
    ),
    category: 'gov',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-11-18T00:00',
    endDate: '2027-01-12T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'scheduled',
    sourceName: 'Reporter.kg (календарный план ЦИК КР)',
    sourceOrgType: 'ГОС',
    eventSourceUrl: 'https://reporter.kg/ru/klyuchevye-daty-utverzhdennogo-tsik-kalendarya-prezidentskikh-vyborov-podrobno/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('election', 'Урна для голосования и бюллетень'),
    ...checked('2026-10-14T12:00'),
    sourceKind: 'media',
    authorityUrl: CEC_SITE,
    isDemo: false,
  },
  {
    id: 'ann-lokel-2026-11-26',
    protocolCode: '#KG-EV-LOKEL',
    title: L('Марьяна Локель: «Нано тур»', 'Марьяна Локель: «Нано тур»', 'Maryana Lokel: Nano Tour'),
    summary: L(
      'Концерт Марьяны Локель в Nomad Arena в рамках «Нано тура». Около полутора часов.',
      'Марьяна Локелдин «Нано тур» алкагында «Nomad Arena» аянтчасында өтүүчү концерти. Болжол менен бир жарым саат.',
      'Maryana Lokel’s Nano Tour concert at Nomad Arena. About an hour and a half.'
    ),
    description: L(
      'Марьяна Локель выступит в Бишкеке в четверг, 26 ноября 2026 года, в 19:00 в Nomad Arena (ул. Виноградная, 1/3). Продолжительность — около полутора часов. Билеты от 2 500 сом на Kassir.kg; концерт указан и на официальном сайте артистки.',
      'Марьяна Локель 2026-жылдын 26-ноябрында, бейшемби күнү, саат 19:00дө Бишкектеги «Nomad Arena» аянтчасында (Виноградная көч., 1/3) концерт берет. Узактыгы — болжол менен бир жарым саат. Билеттер Kassir.kg сайтында 2 500 сомдон; концерт артисттин расмий сайтында да көрсөтүлгөн.',
      'Maryana Lokel performs in Bishkek on Thursday 26 November 2026 at 19:00 at Nomad Arena (1/3 Vinogradnaya St). About an hour and a half. Tickets from 2,500 KGS on Kassir.kg; the show is also listed on her official site.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L('Nomad Arena, ул. Виноградная, 1/3', 'Nomad Arena, Виноградная көч., 1/3', 'Nomad Arena, 1/3 Vinogradnaya St'),
    startDate: '2026-11-26T19:00',
    endDate: '2026-11-26T20:30',
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Kassir.kg • maryanalokel.ru',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://kassir.kg/ru/session/4587-lokel',
    ticketUrl: 'https://kassir.kg/ru/session/4587-lokel',
    ticketUrlVerified: true,
    artistUrl: 'https://maryanalokel.ru/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { priceText: L('от 2 500 сом', '2 500 сомдон', 'from 2,500 KGS'), venue: 'Nomad Arena', timeRange: '19:00' },
    ...illus('concert', 'Пустая концертная сцена с микрофоном'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-lisevsky-2026-12-05',
    protocolCode: '#KG-EV-LISEVSKY',
    title: L('Богдан Лисевский: новый стендап-концерт', 'Богдан Лисевский: жаңы стендап-концерт', 'Bogdan Lisevsky: new stand-up show'),
    summary: L(
      'Стендап в Кыргызском академическом драмтеатре им. Т. Абдумомунова. 18+.',
      'Т. Абдумомунов атындагы Кыргыз академиялык драма театрындагы стендап. 18+.',
      'Stand-up at the T. Abdumomunov Kyrgyz Academic Drama Theatre. 18+.'
    ),
    description: L(
      'Стендап-концерт Богдана Лисевского — 5 декабря 2026 года в Кыргызском академическом драматическом театре им. Т. Абдумомунова (ул. Абдумомунова, 230). Длительность — 1,5 часа, возраст 18+. Билеты от 2 000 сом на Kassir.kg. В карточке продажи указано начало в 20:00, а в описании — 19:00: уточните время на странице билетов.',
      'Богдан Лисевскийдин стендап-концерти — 2026-жылдын 5-декабрында Т. Абдумомунов атындагы Кыргыз академиялык драма театрында (Абдумомунов көч., 230). Узактыгы — 1,5 саат, жаш чеги 18+. Билеттер Kassir.kg сайтында 2 000 сомдон. Сатуу баракчасында башталышы 20:00, сүрөттөмөдө 19:00 деп көрсөтүлгөн: убакытты билет баракчасынан тактаңыз.',
      'Bogdan Lisevsky’s stand-up show is on 5 December 2026 at the T. Abdumomunov Kyrgyz Academic Drama Theatre (230 Abdumomunov St). 1.5 hours, 18+. Tickets from 2,000 KGS on Kassir.kg. The listing says 20:00 but the description says 19:00 — check the ticket page.'
    ),
    category: 'concerts',
    city: 'bishkek',
    location: L(
      'Драмтеатр им. Т. Абдумомунова, ул. Абдумомунова, 230',
      'Т. Абдумомунов атн. драма театры, Абдумомунов көч., 230',
      'T. Abdumomunov Drama Theatre, 230 Abdumomunov St'
    ),
    startDate: '2026-12-05T20:00',
    endDate: '2026-12-05T21:30',
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Kassir.kg • bogdanlisevskii.com',
    sourceOrgType: 'БИЛ',
    eventSourceUrl: 'https://kassir.kg/ru/session/4175-bogdan-lisevskii-novyi-stand-up-kontsert',
    ticketUrl: 'https://kassir.kg/ru/session/4175-bogdan-lisevskii-novyi-stand-up-kontsert',
    ticketUrlVerified: true,
    artistUrl: 'https://bogdanlisevskii.com/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    eventDetails: { priceText: L('от 2 000 сом', '2 000 сомдон', 'from 2,000 KGS'), venue: 'Драмтеатр им. Т. Абдумомунова', timeRange: '20:00 (уточняйте) • 18+' },
    ...illus('culture', 'Театральные маски и занавес'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-cec-registration-2026',
    protocolCode: '#KG-GOV-CEC3',
    title: L(
      'Выборы президента: регистрация кандидатов и старт агитации',
      'Президенттик шайлоо: талапкерлерди каттоо жана үгүттүн башталышы',
      'Presidential election: candidates registered, campaigning begins'
    ),
    summary: L(
      '23 декабря завершается регистрация кандидатов и начинается предвыборная агитация.',
      '23-декабрда талапкерлерди каттоо аяктап, шайлоо алдындагы үгүт башталат.',
      'On 23 December candidate registration ends and campaigning begins.'
    ),
    description: L(
      'По календарному плану ЦИК к выборам президента 27 января 2027 года окончательная регистрация кандидатов — 23 декабря 2026 года. С этого же дня начинается предвыборная агитация; она разрешена до 8:00 26 января 2027 года.',
      '2027-жылдын 27-январындагы президенттик шайлоого карата БШКнын календардык планына ылайык, талапкерлерди акыркы каттоо — 2026-жылдын 23-декабры. Ушул күндөн тартып шайлоо алдындагы үгүт башталат; ал 2027-жылдын 26-январындагы саат 8:00гө чейин уруксат.',
      'Under the CEC calendar for the 27 January 2027 presidential election, final candidate registration is on 23 December 2026, and campaigning starts the same day, allowed until 08:00 on 26 January 2027.'
    ),
    category: 'gov',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-12-23T00:00',
    endDate: '2026-12-23T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'scheduled',
    sourceName: 'Reporter.kg (календарный план ЦИК КР)',
    sourceOrgType: 'ГОС',
    eventSourceUrl: 'https://reporter.kg/ru/klyuchevye-daty-utverzhdennogo-tsik-kalendarya-prezidentskikh-vyborov-podrobno/',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('election', 'Урна для голосования и бюллетень'),
    ...checked('2026-10-14T12:00'),
    sourceKind: 'media',
    authorityUrl: CEC_SITE,
    isDemo: false,
  },
  {
    id: 'ann-dec31-short-day-2026',
    protocolCode: '#KG-GOV-DEC31',
    title: L(
      '31 декабря — сокращённый предпраздничный рабочий день',
      '31-декабрь — майрам алдындагы кыскартылган жумуш күнү',
      '31 December — shortened pre-holiday working day'
    ),
    summary: L(
      'В производственном календаре 2026 года 31 декабря — предпраздничный сокращённый день.',
      '2026-жылдын өндүрүштүк календарында 31-декабрь — майрам алдындагы кыскартылган күн.',
      'In the 2026 working calendar, 31 December is a shortened pre-holiday day.'
    ),
    description: L(
      'По данным Sputnik Кыргызстан о производственном календаре на 2026 год, предпраздничными сокращёнными днями названы 20 марта, 30 апреля и 31 декабря. Режим работы конкретных учреждений уточняйте отдельно.',
      'Sputnik Кыргызстандын 2026-жылдын өндүрүштүк календары тууралуу маалыматы боюнча, майрам алдындагы кыскартылган күндөр — 20-март, 30-апрель жана 31-декабрь. Мекемелердин иш тартибин өзүнчө тактаңыз.',
      'According to Sputnik Kyrgyzstan’s report on the 2026 working calendar, 20 March, 30 April and 31 December are shortened pre-holiday days. Check the hours of specific institutions.'
    ),
    category: 'gov',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-12-31T00:00',
    endDate: '2026-12-31T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'scheduled',
    sourceName: 'Sputnik Кыргызстан',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://ru.sputnik.kg/20260121/calendar-2026-prazdniki-vyhodnye-1099270899.html',
    isVerified: true,
    publishedAt: '2026-10-14T12:00',
    updatedAt: '2026-10-14T12:00',
    ...illus('holiday', 'Страница календаря с орнаментом'),
    ...checked('2026-10-14T12:00'),
    isDemo: false,
  },
  {
    id: 'ann-kul-cinematica-2026-10-29',
    protocolCode: '#KG-CI-KUL',
    title: L('«Кул» (14+) — в прокате с 29 октября', '«Кул» (14+) — 29-октябрдан тартып прокатта', '“Kul” (14+) — in cinemas from 29 October'),
    summary: L(
      'Новый кыргызский фильм «Кул» выходит в прокат в кинотеатрах сети «Синематика».',
      '«Кул» жаңы кыргыз тасмасы «Синематика» кинотеатрлар тармагында прокатка чыгат.',
      'The new Kyrgyz film “Kul” opens at Cinematica cinemas.'
    ),
    description: L(
      'По афише сети кинотеатров «Синематика», фильм «Кул» (возрастное ограничение 14+) идёт в прокате с 29 октября; год на странице не указан — дата требует подтверждения. Расписание сеансов и цены публикуются на сайте кинотеатра ближе к дате — уточняйте там. Специальные и закрытые показы с участием создателей на момент проверки не объявлены.',
      '«Синематика» кинотеатрлар тармагынын афишасы боюнча, «Кул» тасмасы (жаш чеги 14+) 29-октябрдан тартып прокатта; баракчада жылы көрсөтүлгөн эмес — дата тактоону талап кылат. Көрсөтүүлөрдүн графиги жана баалар датага жакындаганда кинотеатрдын сайтында жарыяланат — ошол жерден тактаңыз. Жаратуучулардын катышуусундагы атайын жана жабык көрсөтүүлөр текшерүү учурунда жарыялана элек.',
      'According to the Cinematica cinema chain’s listings, “Kul” (age 14+) opens on 29 October; the year is not shown on the page, so the date still needs confirmation. Showtimes and prices are published on the cinema’s website closer to the date. No special or closed screenings with the filmmakers had been announced at the time of checking.'
    ),
    category: 'cinema',
    city: 'bishkek',
    location: L('Кинотеатры сети «Синематика», Бишкек', '«Синематика» кинотеатрлары, Бишкек', 'Cinematica cinemas, Bishkek'),
    startDate: '2026-10-29T00:00',
    endDate: '2026-10-29T23:59',
    allDay: true,
    urgency: 'event',
    status: 'scheduled',
    sourceName: 'Синематика (афиша кинотеатра)',
    sourceOrgType: 'КИНО',
    eventSourceUrl: 'https://cinematica.kg/',
    sourceKind: 'organizer',
    venueUrl: 'https://cinematica.kg/',
    isVerified: false,
    publishedAt: '2026-10-14T16:00',
    updatedAt: '2026-10-14T16:00',
    eventDetails: { venue: 'Синематика', timeRange: '14+' },
    ...checked('2026-10-14T16:00'),
    ...illus('cinema', 'Кинозал с экраном и кинолентой'),
    isDemo: false,
  },
  {
    id: 'ann-frost-warning-2026-10-17',
    protocolCode: '#KG-HZ-FROST1718',
    title: L(
      'Штормовое предупреждение: заморозки до 0…−2° 17–18 октября',
      'Бороондук эскертүү: 17–18-октябрда 0…−2° чейин үшүк',
      'Storm warning: frost down to 0…−2° on 17–18 October'
    ),
    summary: L(
      'Ночью и утром заморозки на севере Чуйской области, в Таласской и Иссык-Кульской областях. Опасно для урожая.',
      'Түнкүсүн жана эртең менен Чүй облусунун түндүгүндө, Талас жана Ысык-Көл облустарында үшүк. Түшүмгө коркунучтуу.',
      'Night and morning frost in northern Chui, Talas and Issyk-Kul regions. Risk to crops.'
    ),
    description: L(
      'По сообщению МЧС (со ссылкой на Кыргызгидромет), 17–18 октября ночью и утром ожидаются заморозки до 0…−2 °C в северной части Чуйской области, в Таласской области и в Тюпском районе Иссык-Кульской области. Для Таласской области источники называют разные районы: Айтматовский (АКИpress, Kaktus.media) и Кара-Бууринский (For.kg). Заморозки опасны для фруктов, овощей, выкопанного картофеля и сахарной свёклы. Уточняйте на meteo.kg.',
      'ӨКМдин билдирүүсү боюнча (Кыргызгидрометке шилтеме менен), 17–18-октябрда түнкүсүн жана эртең менен Чүй облусунун түндүк бөлүгүндө, Талас облусунда жана Ысык-Көл облусунун Түп районунда 0…−2 °C чейин үшүк күтүлөт. Талас облусу боюнча булактар ар кайсы райондорду атайт: Айтматов (АКИpress, Kaktus.media) жана Кара-Буура (For.kg). Үшүк жемиштерге, жашылчаларга, казылган картошкага жана кант кызылчасына коркунучтуу. meteo.kg сайтынан тактаңыз.',
      'According to the Emergency Ministry (citing Kyrgyzhydromet), night and morning frost down to 0…−2 °C is expected on 17–18 October in northern Chui Region, Talas Region and Tup District of Issyk-Kul Region. Sources name different districts of Talas Region: Aitmatov (AKIpress, Kaktus.media) and Kara-Buura (For.kg). Frost endangers fruit, vegetables, dug potatoes and sugar beet. Check meteo.kg.'
    ),
    category: 'hazard',
    city: 'all',
    locality: 'север Чуйской обл.; Таласская обл.; Тюпский р-н Иссык-Кульской обл.',
    location: L(
      'Север Чуйской области, Таласская область, Тюпский район Иссык-Кульской области',
      'Чүй облусунун түндүгү, Талас облусу, Ысык-Көл облусунун Түп району',
      'Northern Chui Region, Talas Region, Tup District of Issyk-Kul Region'
    ),
    startDate: '2026-10-17T00:00',
    endDate: '2026-10-18T10:00',
    urgency: 'planned',
    status: 'scheduled',
    dangerLevel: 'warning',
    sourceName: 'Kaktus.media, АКИpress (со ссылкой на МЧС и Кыргызгидромет)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://kaktus.media/doc/555082_mchs_rasprostranilo_shtormovoe_predyprejdenie_na_17_i_18_oktiabria.html',
    sourceKind: 'media',
    additionalSourceUrl: 'https://eco.akipress.org/news:2551324',
    authorityUrl: 'https://www.meteo.kg/ru/',
    isVerified: true,
    publishedAt: '2026-10-15T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('hazard', 'Грозовая туча — погодное предупреждение'),
    ...checked('2026-10-15T14:00'),
    isDemo: false,
  },
  {
    id: 'ann-too-ashuu-minibus-2026',
    protocolCode: '#KG-RD-TOOASHUU',
    title: L(
      'Перевал Тоо-Ашуу: до 15 мая ограничен проезд пассажирских микроавтобусов',
      'Төө-Ашуу ашуусу: 15-майга чейин жүргүнчү микроавтобустарынын өтүүсү чектелди',
      'Too-Ashuu Pass: passenger minibuses restricted until 15 May'
    ),
    summary: L(
      'На трассе Бишкек — Ош введено сезонное ограничение для пассажирских микроавтобусов.',
      'Бишкек — Ош трассасында жүргүнчү микроавтобустары үчүн мезгилдик чектөө киргизилди.',
      'A seasonal restriction for passenger minibuses applies on the Bishkek – Osh road.'
    ),
    description: L(
      'По данным Kaktus.media и For.kg со ссылкой на УОБДД МВД, на перевале Тоо-Ашуу (трасса Бишкек — Ош) введено временное ограничение движения пассажирских микроавтобусов; оно продлится до 15 мая 2027 года. Подробности (исключения, участки, посты) уточняйте в официальных сообщениях УОБДД и Минтранса. Водителям советуют планировать поездки заранее.',
      'Kaktus.media жана For.kg ИИМдин ЖКККБсына шилтеме кылып билдиргендей, Төө-Ашуу ашуусунда (Бишкек — Ош трассасы) жүргүнчү микроавтобустарынын кыймылына убактылуу чектөө киргизилди; ал 2027-жылдын 15-майына чейин уланат. Чоо-жайын (өзгөчөлүктөр, участоктор, посттор) ЖКККБ жана Минтранстын расмий билдирүүлөрүнөн тактаңыз.',
      'Kaktus.media and For.kg, citing the road safety department of the Interior Ministry, report a temporary restriction on passenger minibuses over Too-Ashuu Pass (Bishkek – Osh road) until 15 May 2027. Check official road police and Transport Ministry notices for details.'
    ),
    category: 'roads',
    city: 'chui',
    locality: 'перевал Тоо-Ашуу, трасса Бишкек — Ош',
    location: L('Перевал Тоо-Ашуу, трасса Бишкек — Ош', 'Төө-Ашуу ашуусу, Бишкек — Ош трассасы', 'Too-Ashuu Pass, Bishkek – Osh road'),
    startDate: '2026-10-15T00:00',
    endDate: '2027-05-15T23:59',
    allDay: true,
    urgency: 'planned',
    status: 'active',
    dangerLevel: 'info',
    sourceName: 'Kaktus.media, For.kg (со ссылкой на УОБДД МВД)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://kaktus.media/doc/555085_do_maia_vvedeno_ogranichenie_na_dvijenie_passajirskih_bysov_po_doroge_bishkek_osh.html',
    sourceKind: 'media',
    additionalSourceUrl: 'https://www.for.kg/news-930514-ru.html',
    authorityUrl: 'https://mtd.gov.kg/',
    isVerified: true,
    publishedAt: '2026-10-15T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('pass', 'Горная дорога через перевал'),
    ...checked('2026-10-15T14:00'),
    isDemo: false,
  },
  {
    id: 'ann-pensions-indexation-2026-10',
    protocolCode: '#KG-LAW-PENSION601',
    title: L(
      'С 1 октября проиндексированы страховые части пенсий (коэффициент 1,20)',
      '1-октябрдан тартып пенсиялардын камсыздандыруу бөлүгү индексацияланды (1,20 коэффициенти)',
      'Insurance part of pensions indexed by 1.20 from 1 October'
    ),
    summary: L(
      'Постановление Кабинета Министров № 601 от 5 сентября 2026 года. Прибавка — от 1 000 до 10 000 сомов.',
      'Министрлер Кабинетинин 2026-жылдын 5-сентябрындагы № 601 токтому. Кошумча — 1 000ден 10 000 сомго чейин.',
      'Cabinet of Ministers Resolution No. 601 of 5 September 2026. Increase from 1,000 to 10,000 KGS.'
    ),
    description: L(
      'Кабинет Министров постановлением № 601 от 5 сентября 2026 года установил коэффициент индексации страховых частей пенсий 1,20; постановление вступило в силу 1 октября 2026 года. Базовая часть пенсии не индексируется, поэтому вся выплата вырастает меньше чем на 20% (по оценке Economist.kg — около 15%).',
      'Министрлер Кабинети 2026-жылдын 5-сентябрындагы № 601 токтому менен пенсиялардын камсыздандыруу бөлүктөрүн индексациялоо коэффициентин 1,20 деп белгиледи; токтом 2026-жылдын 1-октябрында күчүнө кирди. Пенсиянын базалык бөлүгү индексацияланбайт, ошондуктан бүт төлөм 20%дан азыраак өсөт (Economist.kg баалоосу боюнча — болжол менен 15%).',
      'By Resolution No. 601 of 5 September 2026 the Cabinet set an indexation factor of 1.20 for the insurance part of pensions, in force from 1 October 2026. The base part is not indexed, so the total payment rises by less than 20% (about 15%, according to Economist.kg).'
    ),
    category: 'laws',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-10-01T00:00',
    endDate: '2026-10-01T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'completed',
    newsKind: 'decision',
    legal: {
      docTitle: L('Постановление Кабинета Министров КР № 601 от 5 сентября 2026 года', 'КР Министрлер Кабинетинин 2026-жылдын 5-сентябрындагы № 601 токтому', 'Cabinet of Ministers Resolution No. 601 of 5 September 2026'),
      adoptedAt: '2026-09-05',
      effectiveFrom: '2026-10-01',
      whatChanged: L(
        'Страховые части пенсий умножены на 1,20. Прибавка к одной пенсии — не меньше 1 000 и не больше 10 000 сомов. Общий размер пенсии после перерасчёта — не ниже 8 800 сомов (без надбавок).',
        'Пенсиялардын камсыздандыруу бөлүктөрү 1,20га көбөйтүлдү. Бир пенсияга кошумча — 1 000 сомдон кем эмес жана 10 000 сомдон ашпайт. Кайра эсептөөдөн кийин пенсиянын жалпы өлчөмү — 8 800 сомдон кем эмес (кошумчаларсыз).',
        'Insurance parts of pensions are multiplied by 1.20. The increase per pension is at least 1,000 and at most 10,000 KGS. After recalculation a pension is at least 8,800 KGS (excluding supplements).'
      ),
      whoAffected: L('Получатели пенсий по государственному социальному страхованию.', 'Мамлекеттик социалдык камсыздандыруу боюнча пенсия алуучулар.', 'Recipients of state social insurance pensions.'),
      whatToDo: L(
        'Ничего подавать не нужно — перерасчёт делает Социальный фонд. Вопросы — в отделение Соцфонда по месту получения пенсии.',
        'Эч нерсе тапшыруунун кереги жок — кайра эсептөөнү Социалдык фонд жүргүзөт. Суроолор — пенсия алган жердеги Соцфонддун бөлүмүнө.',
        'Nothing to file — the Social Fund recalculates automatically. Questions: your local Social Fund office.'
      ),
    },
    sourceName: 'Economist.kg (по постановлению Кабинета Министров № 601)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://economist.kg/pravo-znat/2026/10/01/pensii-1-oktyabrya-kak-poschitat/',
    sourceKind: 'media',
    additionalSourceUrl: 'https://economist.kg/society/2026/09/07/strahovaya-chast-pensii-20-protsentov/',
    authorityUrl: 'https://www.gov.kg/',
    isVerified: true,
    publishedAt: '2026-09-07T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('law', 'Документ с печатью — нормативный акт'),
    ...checked('2026-10-15T15:00'),
    isDemo: false,
  },
  {
    id: 'ann-law-personal-data-fines-2026',
    protocolCode: '#KG-LAW-PDATA150',
    title: L(
      'Штрафы до 140 000 сомов за нарушения при работе с персональными данными: закон подписан',
      'Жеке маалыматтар менен иштөөдөгү бузуулар үчүн 140 000 сомго чейин айып: мыйзамга кол коюлду',
      'Fines of up to 140,000 KGS for personal-data violations: law signed'
    ),
    summary: L(
      'Поправки в Кодекс о правонарушениях. Вступят в силу через 10 дней после официального опубликования.',
      'Укук бузуулар жөнүндө кодекске өзгөртүүлөр. Расмий жарыялангандан 10 күн өткөндөн кийин күчүнө кирет.',
      'Amendments to the Code of Offences, in force 10 days after official publication.'
    ),
    description: L(
      'Президент подписал закон № 150 от 9 октября 2026 года о поправках в Кодекс о правонарушениях: вводятся штрафы за нарушения при обработке и защите персональных данных — для юридических лиц до 80 000 сомов, при повторных нарушениях и нарушениях с данными детей — до 140 000 сомов. Жогорку Кенеш одобрил закон 16 сентября 2026 года. Суммы для отдельных составов в СМИ приводятся по-разному — точные цифры сверяйте с официальным текстом.',
      'Президент Укук бузуулар жөнүндө кодекске өзгөртүүлөр тууралуу 2026-жылдын 9-октябрындагы № 150 мыйзамга кол койду: жеке маалыматтарды иштетүүдө жана коргоодо бузуулар үчүн айыптар киргизилет — юридикалык жактар үчүн 80 000 сомго чейин, кайталап бузганда жана балдардын маалыматтары менен бузууда — 140 000 сомго чейин. Жогорку Кеңеш мыйзамды 2026-жылдын 16-сентябрында жактырган. Айрым курамдар боюнча суммалар ЖМКда ар башка берилет — так сандарды расмий тексттен текшериңиз.',
      'The President signed Law No. 150 of 9 October 2026 amending the Code of Offences: fines for violations in processing and protecting personal data — up to 80,000 KGS for legal entities and up to 140,000 KGS for repeat violations and violations involving children’s data. Parliament approved it on 16 September 2026. Media report different amounts for some offences — check the official text.'
    ),
    category: 'laws',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-10-09T00:00',
    endDate: '2026-10-09T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'completed',
    newsKind: 'law',
    legal: {
      docTitle: L('Закон КР № 150 от 9 октября 2026 года (изменения в Кодекс о правонарушениях)', 'КР 2026-жылдын 9-октябрындагы № 150 мыйзамы (Укук бузуулар жөнүндө кодекске өзгөртүүлөр)', 'Law No. 150 of 9 October 2026 (amendments to the Code of Offences)'),
      adoptedAt: '2026-10-09',
      whatChanged: L(
        'Появились штрафы за нарушения при обработке, защите и передаче за границу персональных данных; повышенная ответственность — за повторные нарушения и данные детей.',
        'Жеке маалыматтарды иштетүүдө, коргоодо жана чет өлкөгө берүүдө бузуулар үчүн айыптар киргизилди; кайталап бузуу жана балдардын маалыматтары үчүн жоопкерчилик жогорулатылды.',
        'Fines for violations in processing, protecting and transferring personal data abroad; higher liability for repeat violations and children’s data.'
      ),
      whoAffected: L(
        'Компании, госорганы и ИП, которые собирают и хранят данные клиентов и сотрудников; их должностные лица.',
        'Кардарлардын жана кызматкерлердин маалыматтарын чогулткан жана сактаган компаниялар, мамлекеттик органдар жана ЖИ; алардын кызмат адамдары.',
        'Companies, state bodies and sole traders that collect and store customer or staff data, and their officials.'
      ),
      whatToDo: L(
        'Проверить, на каком основании собираются данные, кто к ним имеет доступ и передаются ли они за границу.',
        'Маалыматтар кандай негизде чогултулуп жатканын, ага кимдин жетүүсү бар экенин жана чет өлкөгө берилип жатабы — текшерүү.',
        'Check the legal basis for collecting data, who has access, and whether data is transferred abroad.'
      ),
      transitional: L(
        'Вступает в силу через 10 дней после официального опубликования (по данным naq.media); дата опубликования на момент проверки не найдена.',
        'Расмий жарыялангандан 10 күн өткөндөн кийин күчүнө кирет (naq.media маалыматы боюнча); текшерүү учурунда жарыяланган күнү табылган жок.',
        'Comes into force 10 days after official publication (per naq.media); the publication date had not been found at the time of checking.'
      ),
    },
    sourceName: 'Economist.kg, Reporter.kg (со ссылкой на пресс-службу Президента)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://economist.kg/vlast/2026/10/13/personalnye-dannye-shtrafy-140-tys-2/',
    sourceKind: 'media',
    additionalSourceUrl: 'https://reporter.kg/ru/v-kyrgyzstane-vveli-shtrafy-do-140-tysyach-somov-za-utechku-personalnykh-dannykh/',
    authorityUrl: 'https://www.president.kg/',
    isVerified: true,
    publishedAt: '2026-10-13T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('law', 'Документ с печатью — нормативный акт'),
    ...checked('2026-10-15T15:00'),
    isDemo: false,
  },
  {
    id: 'ann-law-littering-public-works-2026',
    protocolCode: '#KG-LAW-MUSOR',
    title: L(
      'За повторный выброс и сжигание мусора — до 30 часов общественных работ: закон подписан',
      'Таштандыны кайталап ыргытуу жана өрттөө үчүн — 30 саатка чейин коомдук иштер: мыйзамга кол коюлду',
      'Up to 30 hours of community service for repeat littering and rubbish burning: law signed'
    ),
    summary: L(
      'Поправки в Кодекс о правонарушениях: общественные работы за повторные нарушения правил чистоты в течение года.',
      'Укук бузуулар жөнүндө кодекске өзгөртүүлөр: бир жылдын ичинде тазалык эрежелерин кайталап бузгандыгы үчүн коомдук иштер.',
      'Code of Offences amendments: community service for repeat cleanliness violations within a year.'
    ),
    description: L(
      'Президент подписал закон о поправках в Кодекс о правонарушениях (Жогорку Кенеш одобрил его 16 сентября 2026 года; о подписании сообщено 7 октября). За повторное в течение года нарушение правил благоустройства — 20 часов общественных работ, за повторный выброс, складирование или сжигание мусора в неустановленных местах — от 20 до 30 часов. Дата вступления в силу в найденных публикациях не указана.',
      'Президент Укук бузуулар жөнүндө кодекске өзгөртүүлөр тууралуу мыйзамга кол койду (Жогорку Кеңеш аны 2026-жылдын 16-сентябрында жактырган; кол коюлганы 7-октябрда билдирилген). Бир жылдын ичинде абаттандыруу эрежелерин кайталап бузганы үчүн — 20 саат коомдук иштер, таштандыны белгиленбеген жерге кайталап ыргытуу, сактоо же өрттөө үчүн — 20дан 30 саатка чейин. Күчүнө кирген күнү табылган жарыяларда көрсөтүлгөн эмес.',
      'The President signed amendments to the Code of Offences (approved by Parliament on 16 September 2026; signing reported on 7 October): 20 hours of community service for a repeat breach of public-amenity rules within a year, and 20–30 hours for repeat dumping, storing or burning of rubbish in unauthorised places. The entry-into-force date is not given in the reports found.'
    ),
    category: 'laws',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-10-07T00:00',
    endDate: '2026-10-07T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'completed',
    newsKind: 'law',
    legal: {
      docTitle: L('Закон о внесении изменений в Кодекс о правонарушениях (благоустройство, мусор)', 'Укук бузуулар жөнүндө кодекске өзгөртүүлөрдү киргизүү тууралуу мыйзам (абаттандыруу, таштанды)', 'Law amending the Code of Offences (public amenities, rubbish)'),
      whatChanged: L(
        'Повторное в течение года нарушение (после уже наложенного штрафа) наказывается общественными работами: 20 часов — за нарушение правил благоустройства, 20–30 часов — за выброс или сжигание мусора в неустановленных местах. Работы не проводятся ночью.',
        'Бир жылдын ичинде кайталап бузуу (мурда айып салынгандан кийин) коомдук иштер менен жазаланат: абаттандыруу эрежелерин бузганы үчүн — 20 саат, таштандыны белгиленбеген жерге ыргытуу же өрттөө үчүн — 20–30 саат. Иштер түнкүсүн жүргүзүлбөйт.',
        'A repeat violation within a year (after a fine) is punished with community service: 20 hours for breaching public-amenity rules, 20–30 hours for dumping or burning rubbish in unauthorised places. No night work.'
      ),
      whoAffected: L('Граждане, которые повторно нарушают правила чистоты в населённых пунктах.', 'Калктуу конуштарда тазалык эрежелерин кайталап бузган жарандар.', 'People who repeatedly break cleanliness rules in towns and villages.'),
      transitional: L(
        'Исключения: женщины старше 55 лет, мужчины старше 60 лет, беременные, женщины с детьми до 3 лет, лица с инвалидностью I и II групп — им назначается другое наказание или штраф. Дата вступления в силу — уточняйте в официальном тексте.',
        'Өзгөчөлүктөр: 55 жаштан улуу аялдар, 60 жаштан улуу эркектер, кош бойлуулар, 3 жашка чейинки балдары бар аялдар, I жана II топтогу майыптыгы бар адамдар — аларга башка жаза же айып дайындалат. Күчүнө кирген күнүн расмий тексттен тактаңыз.',
        'Exceptions: women over 55, men over 60, pregnant women, women with children under 3, people with group I or II disabilities — they get another penalty or a fine. Check the official text for the date of entry into force.'
      ),
    },
    sourceName: 'Kaktus.media, АКИpress (со ссылкой на пресс-службу Президента)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://kaktus.media/doc/554774_nesobludaushie_chistoty_bydyt_rabotat._sadyr_japarov_podpisal_zakon.html',
    sourceKind: 'media',
    additionalSourceUrl: 'https://eco.akipress.org/news:2546444',
    authorityUrl: 'https://www.president.kg/',
    isVerified: true,
    publishedAt: '2026-10-07T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('law', 'Документ с печатью — нормативный акт'),
    ...checked('2026-10-15T15:00'),
    isDemo: false,
  },
  {
    id: 'ann-decree-taxpayers-343-2026',
    protocolCode: '#KG-ST-UKAZ343',
    title: L(
      'Указ Президента о защите добросовестных налогоплательщиков',
      'Ак ниеттүү салык төлөөчүлөрдү коргоо тууралуу Президенттин Жарлыгы',
      'Presidential decree on protecting honest taxpayers'
    ),
    summary: L(
      'Указ № 343 от 8 октября 2026 года: реестр недобросовестных налогоплательщиков, ограничения для них и снижение налоговой нагрузки.',
      '2026-жылдын 8-октябрындагы № 343 Жарлык: ак ниетсиз салык төлөөчүлөрдүн реестри, аларга чектөөлөр жана салык жүгүн азайтуу.',
      'Decree No. 343 of 8 October 2026: a register of dishonest taxpayers, restrictions on them and lower tax burden.'
    ),
    description: L(
      'Президент подписал указ № 343 «О мерах по совершенствованию правовых гарантий защиты добросовестных налогоплательщиков» от 8 октября 2026 года. Указ поручает подготовить меры: ведение Государственной налоговой службой реестра недобросовестных налогоплательщиков, ограничения на регистрацию и перерегистрацию компаний и ИП для включённых в реестр, ответственность фактических бенефициаров, контроль доверенностей и электронных подписей, а также поэтапное снижение налоговой нагрузки. Это поручения: конкретные нормы появятся после принятия соответствующих актов.',
      'Президент 2026-жылдын 8-октябрындагы «Ак ниеттүү салык төлөөчүлөрдү коргоонун укуктук кепилдиктерин өркүндөтүү чаралары жөнүндө» № 343 Жарлыкка кол койду. Жарлык чараларды даярдоону тапшырат: Мамлекеттик салык кызматы ак ниетсиз салык төлөөчүлөрдүн реестрин жүргүзөт, реестрге киргендерге компания жана ЖИ каттоого жана кайра каттоого чектөөлөр, иш жүзүндөгү бенефициарлардын жоопкерчилиги, ишеним каттарды жана электрондук колдорду көзөмөлдөө, ошондой эле салык жүгүн этап менен азайтуу. Булар тапшырмалар: конкреттүү ченемдер тиешелүү актылар кабыл алынгандан кийин пайда болот.',
      'The President signed Decree No. 343 of 8 October 2026 “On measures to improve legal guarantees for honest taxpayers”. It instructs the government to prepare measures: a register of dishonest taxpayers kept by the State Tax Service, bans on registering or re-registering companies and sole traders for those listed, liability for beneficial owners, control over powers of attorney and e-signatures, and gradual reduction of the tax burden. These are instructions: specific rules will follow in separate acts.'
    ),
    category: 'state',
    city: 'all',
    location: L('Весь Кыргызстан', 'Бүт Кыргызстан', 'All of Kyrgyzstan'),
    startDate: '2026-10-08T00:00',
    endDate: '2026-10-08T23:59',
    allDay: true,
    urgency: 'regular',
    status: 'completed',
    newsKind: 'instruction',
    legal: {
      docTitle: L('Указ Президента КР № 343 от 8 октября 2026 года', 'КР Президентинин 2026-жылдын 8-октябрындагы № 343 Жарлыгы', 'Presidential Decree No. 343 of 8 October 2026'),
      adoptedAt: '2026-10-08',
      whoAffected: L('Предприниматели и компании; налоговые органы.', 'Ишкерлер жана компаниялар; салык органдары.', 'Businesses and companies; tax authorities.'),
      whatToDo: L(
        'Сейчас действий не требуется: конкретные правила (реестр, ограничения) будут установлены отдельными актами — следите за публикациями ГНС.',
        'Азыр эч нерсе кылуунун кереги жок: конкреттүү эрежелер (реестр, чектөөлөр) өзүнчө актылар менен белгиленет — МСКнын жарыяларын көз салыңыз.',
        'No action needed yet: the specific rules (register, restrictions) will be set by separate acts — follow the State Tax Service.'
      ),
    },
    sourceName: 'Knews.kg, Tazabek (со ссылкой на пресс-службу Президента)',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://knews.kg/2026/10/09/sadyr-zhaparov-podpisal-ukaz-o-zashhite-dobrosovestnyh-nalogoplatelshhikov/',
    sourceKind: 'media',
    additionalSourceUrl: 'https://www.tazabek.kg/news:2547854',
    authorityUrl: 'https://www.president.kg/',
    isVerified: true,
    publishedAt: '2026-10-09T12:00',
    updatedAt: '2026-10-15T12:00',
    ...illus('gov', 'Здание государственного учреждения'),
    ...checked('2026-10-15T15:00'),
    isDemo: false,
  },
];
