import { Announcement, LocalizedString } from '../types';

/** Фото с Wikimedia Commons (свободная лицензия) нужного размера */
const commons = (file: string, width = 1600) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
/** Страница файла на Commons — первоисточник фото, автор и лицензия */
const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

const SHAKIRA_PHOTO = 'Las Mujeres Ya No Lloran World Tour - Rio de Janeiro (8).jpg';
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
    sourceName: 'Economist.kg • Управление делами Президента КР',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://economist.kg/society/2026/09/30/shakira-bishkek-bilety-mesta-pravila/',
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
    imageUrl: commons(SHAKIRA_PHOTO),
    imageSourceUrl: commonsPage(SHAKIRA_PHOTO),
    imageAlt: 'Шакира на концерте тура Las Mujeres Ya No Lloran, Рио-де-Жанейро, 2025',
    imageCredit: 'Фото: Priscila Bruder / Wikimedia Commons — тур Las Mujeres Ya No Lloran, 2025',
    imageFit: 'contain',
    ticketUrl: 'https://ticket.gov.kg/ru/event/shakira-vpervye-vystupit-v-tsentralnoy-azii-mirovaya-zvezda-priezzhaet-v-bishkek-116',
    ticketUrlVerified: true,
    artistUrl: 'https://www.shakira.com/',
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
    sourceName: 'Economist.kg • Управление делами Президента КР',
    sourceOrgType: 'СМИ',
    eventSourceUrl: 'https://economist.kg/transport/2026/10/09/shakira-besplatnye-avtobusy/',
    isVerified: true,
    publishedAt: '2026-10-09T12:02',
    updatedAt: '2026-10-09T12:02',
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
    sourceName: 'Мэрия г. Бишкек • Kaktus.media',
    sourceOrgType: 'МБ',
    eventSourceUrl: 'https://kaktus.media/doc/554823_v_bishkeke_13_oktiabria_na_15_chasov_otkluchat_vody._spisok_rayonov_i_ylic.html',
    isVerified: true,
    publishedAt: '2026-10-12T15:00',
    updatedAt: '2026-10-12T15:00',
    emergencyContacts: [
      { name: 'Бишкекводоканал', phone: '1533', isTollFree: true, icon: 'water_drop' },
      { name: 'Колл-центр мэрии Бишкека', phone: '1840', isTollFree: true, icon: 'support_agent' },
    ],
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
    sourceName: 'Бишкекское ПЭС • Kaktus.media',
    sourceOrgType: 'НЭ',
    eventSourceUrl: 'https://kaktus.media/doc/554879_14_oktiabria_v_chasti_bishkeka_otkluchat_svet_spisok_ylic.html',
    isVerified: true,
    publishedAt: '2026-10-13T10:00',
    updatedAt: '2026-10-13T10:00',
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
    sourceName: 'Мэрия г. Бишкек • Knews.kg',
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
    location: L('г. Бишкек, все районы', 'Бишкек ш., бардык райондор', 'Bishkek, all districts'),
    startDate: '2026-10-13T08:00',
    endDate: '2026-10-13T23:59',
    urgency: 'regular',
    status: 'active',
    isUrgentTicker: false,
    sourceName: 'Мэрия г. Бишкек • For.kg',
    sourceOrgType: 'МБ',
    eventSourceUrl: 'https://www.for.kg/news-930432-ru.html',
    isVerified: true,
    publishedAt: '2026-10-12T12:00',
    updatedAt: '2026-10-12T12:00',
    emergencyContacts: [
      { name: 'Бишкектеплосеть', phone: '1980', isTollFree: true, icon: 'heat' },
      { name: 'Колл-центр мэрии Бишкека', phone: '1840', isTollFree: true, icon: 'support_agent' },
    ],
    isDemo: false,
  },

  // ───────────── Концерты ─────────────
  {
    id: 'ann-arbenina-2026-10-13',
    protocolCode: '#KG-EV-ARBENINA',
    title: L(
      'Диана Арбенина и «Ночные снайперы» в Nomad Arena',
      'Диана Арбенина жана «Ночные снайперы» Nomad Arenaда',
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
    sourceName: 'Минводсельпром КР • Kaktus.media',
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
    category: 'fairs',
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
    isDemo: false,
  },
];
