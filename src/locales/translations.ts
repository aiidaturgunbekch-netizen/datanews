import { Language } from '../types';

export const translations = {
  // Brand & Slogan
  appName: {
    ru: 'DataNews',
    kg: 'DataNews',
    en: 'DataNews',
  },
  appSubtitle: {
    ru: 'Кыргызстан',
    kg: 'Кыргызстан',
    en: 'Kyrgyzstan',
  },
  appSlogan: {
    ru: 'Знай, что, где и когда',
    kg: 'Эмне, кайда жана качан болорун бил',
    en: 'Know What, Where and When in Kyrgyzstan',
  },
  officialSlogan: {
    ru: 'Знай дату — планируй день',
    kg: 'Датаны бил — күнүңдү пландаштыр',
    en: 'Know the date — plan your day',
  },
  appHeroDesc: {
    ru: 'Единая цифровая платформа актуальных дат, городских предупреждений, муниципальных графиков, афиши и официальных уведомлений по всей стране.',
    kg: 'Бүт өлкө боюнча актуалдуу даталардын, шаардык эскертүүлөрдүн, муниципалдык графиктердин, афишалардын жана расмий билдирүүлөрдүн бирдиктүү санариптик платформасы.',
    en: 'Unified digital platform for public dates, municipal alerts, utility schedules, cultural events, and official notifications across Kyrgyzstan.',
  },

  // Navigation
  nav: {
    home: { ru: 'Главная', kg: 'Башкы бет', en: 'Home' },
    calendar: { ru: 'Календарь', kg: 'Календарь', en: 'Calendar' },
    alerts: { ru: 'Предупреждения', kg: 'Эскертүүлөр', en: 'Alerts' },
    events: { ru: 'Афиша', kg: 'Афиша', en: 'Events' },
    cities: { ru: 'Города', kg: 'Шаарлар', en: 'Cities' },
    forOrg: { ru: 'Для организаций', kg: 'Уюмдарга', en: 'For Organizations' },
    pricing: { ru: 'Тарифы и подписка', kg: 'Тарифтер жана жазылуу', en: 'Pricing' },
    admin: { ru: 'Управление', kg: 'Башкаруу', en: 'Admin' },
    publishBtn: { ru: 'Разместить', kg: 'Жайгаштыруу', en: 'Publish' },
    account: { ru: 'Личный кабинет', kg: 'Жеке кабинет', en: 'My account' },
    more: { ru: 'Подробнее', kg: 'Толугураак', en: 'Details' },
    viewMap: { ru: 'Смотреть схему объезда', kg: 'Айланып өтүү схемасын көрүү', en: 'View detour map' },
  },

  // Urgent Banner
  urgentTicker: {
    badge: { ru: 'СРОЧНО', kg: 'ШАШЫЛЫШ', en: 'URGENT' },
    prefix: { ru: 'Внимание водителям:', kg: 'Айдоочулардын көңүлүнө:', en: 'Notice to drivers:' },
  },

  // Search & Filter
  search: {
    whatLabel: { ru: 'Что ищем?', kg: 'Эмне издейсиз?', en: 'What are you looking for?' },
    whatPlaceholder: {
      ru: 'Найдите событие, дату, улицу или объявление...',
      kg: 'Окуяны, датаны, көчөнү же билдирүүнү издеңиз...',
      en: 'Search event, date, street or notice...',
    },
    whenLabel: { ru: 'Когда?', kg: 'Качан?', en: 'When?' },
    whereLabel: { ru: 'Где?', kg: 'Кайда?', en: 'Where?' },
    findBtn: { ru: 'Найти', kg: 'Издөө', en: 'Search' },
    today: { ru: 'Сегодня', kg: 'Бүгүн', en: 'Today' },
    tomorrow: { ru: 'Завтра', kg: 'Эртең', en: 'Tomorrow' },
    weekend: { ru: 'Выходные', kg: 'Дем алыш күндөрү', en: 'Weekend' },
    thisWeek: { ru: 'Ближайшие 7 дней', kg: 'Жакынкы 7 күн', en: 'Next 7 days' },
    allDates: { ru: 'Все даты', kg: 'Бардык күндөр', en: 'All Dates' },
    popularTags: { ru: 'Популярное:', kg: 'Популярдуу:', en: 'Trending:' },
    eventsOnDate: { ru: 'Публикации', kg: 'Жарыялар', en: 'Posts' },
    activeAlerts: { ru: 'Предупреждения', kg: 'Эскертүүлөр', en: 'Alerts' },
    regionsCount: { ru: 'Регионов', kg: 'Аймак', en: 'Regions' },
  },

  // Categories
  categories: {
    all: { ru: 'Все события', kg: 'Бардык окуялар', en: 'All Events' },
    water: { ru: 'Отключение воды', kg: 'Суу өчүрүү', en: 'Water Outage' },
    electricity: { ru: 'Отключение электричества', kg: 'Жарык өчүрүү', en: 'Power Outage' },
    roads: { ru: 'Дороги и транспорт', kg: 'Жолдор жана транспорт', en: 'Roads & Traffic' },
    repairs: { ru: 'Ремонтные работы', kg: 'Оңдоо иштери', en: 'Repairs & Works' },
    concerts: { ru: 'Концерты и шоу', kg: 'Концерттер жана шоу', en: 'Concerts & Shows' },
    festivals: { ru: 'Фестивали', kg: 'Фестивалдар', en: 'Festivals' },
    fairs: { ru: 'Ярмарки', kg: 'Жарманкелер', en: 'Fairs' },
    exhibitions: { ru: 'Выставки и форумы', kg: 'Көргөзмөлөр жана форумдар', en: 'Exhibitions & Forums' },
    culture: { ru: 'Театр и культура', kg: 'Театр жана маданият', en: 'Theatre & Culture' },
    sport: { ru: 'Спорт', kg: 'Спорт', en: 'Sport' },
    cinema: { ru: 'Кино и показы', kg: 'Кино жана көрсөтүүлөр', en: 'Cinema & Screenings' },
    education: { ru: 'Лекции и IT', kg: 'Лекциялар жана IT', en: 'Lectures & Tech' },
    gov: { ru: 'Гос. оповещения', kg: 'Мамлекеттик билдирүүлөр', en: 'Gov Notices' },
    hazard: { ru: 'Погода и опасные явления', kg: 'Аба ырайы жана коркунучтуу кубулуштар', en: 'Weather & Hazards' },
    state: { ru: 'Государство и решения', kg: 'Мамлекет жана чечимдер', en: 'State & Decisions' },
    laws: { ru: 'Законы и правила', kg: 'Мыйзамдар жана эрежелер', en: 'Laws & Rules' },
  },

  // Cities
  cities: {
    all: { ru: 'Весь Кыргызстан', kg: 'Бүт Кыргызстан', en: 'All of Kyrgyzstan' },
    bishkek: { ru: 'г. Бишкек', kg: 'Бишкек ш.', en: 'Bishkek' },
    osh: { ru: 'г. Ош', kg: 'Ош ш.', en: 'Osh City' },
    chui: { ru: 'Чуйская обл.', kg: 'Чүй облусу', en: 'Chui Region' },
    osh_region: { ru: 'Ошская обл.', kg: 'Ош облусу', en: 'Osh Region' },
    issykkul: { ru: 'Иссык-Кульская обл.', kg: 'Ысык-Көл облусу', en: 'Issyk-Kul Region' },
    jalalabad: { ru: 'Джалал-Абадская обл.', kg: 'Жалал-Абад облусу', en: 'Jalal-Abad Region' },
    talas: { ru: 'Таласская обл.', kg: 'Талас облусу', en: 'Talas Region' },
    naryn: { ru: 'Нарынская обл.', kg: 'Нарын облусу', en: 'Naryn Region' },
    batken: { ru: 'Баткенская обл.', kg: 'Баткен облусу', en: 'Batken Region' },
    karakol: { ru: 'Иссык-Кульская обл.', kg: 'Ысык-Көл облусу', en: 'Issyk-Kul Region' },
  },

  // Section Headers
  sections: {
    urgentAlertsTitle: { ru: 'Срочные и важные предупреждения', kg: 'Шашылыш жана маанилүү эскертүүлөр', en: 'Urgent & Important Alerts' },
    urgentAlertsSubtitle: {
      ru: 'Оперативная лента коммунальных служб и муниципалитетов',
      kg: 'Муниципалитеттердин жана коммуналдык кызматтардын ыкчам тасмасы',
      en: 'Real-time feed from municipal utilities and local authorities',
    },
    upcomingTitle: { ru: 'Ближайшие события и афиша', kg: 'Жакынкы окуялар жана афиша', en: 'Upcoming Events & Public Schedule' },
    upcomingSubtitle: { ru: 'Городская афиша', kg: 'Шаардык афиша', en: 'City schedule & events' },
    citiesTitle: { ru: 'Обзор по городам Кыргызстана', kg: 'Кыргызстандын шаарлары боюнча сереп', en: 'Overview by Cities of Kyrgyzstan' },
    citiesSubtitle: {
      ru: 'Выберите ваш город, чтобы следовать исключительно за локальными коммунальными графиками и культурными мероприятиями.',
      kg: 'Жергиликтүү коммуналдык графиктерди жана маданий иш-чараларды көрүү үчүн шаарыңызды тандаңыз.',
      en: 'Select your city to track local municipal schedules and cultural happenings.',
    },
    viewAllCities: { ru: 'Смотреть все города и регионы', kg: 'Бардык шаарларды жана аймактарды көрүү', en: 'View all cities & regions' },
    loadMore: { ru: 'Показать ещё события', kg: 'Дагы окуяларды көрсөтүү', en: 'Show more events' },
  },

  // Views & Controls
  views: {
    list: { ru: 'Список', kg: 'Тизме', en: 'List' },
    grid: { ru: 'Сетка', kg: 'Торчо', en: 'Grid' },
    calendar: { ru: 'Календарь', kg: 'Календарь', en: 'Calendar' },
    monthYear: { ru: 'Октябрь 2026', kg: 'Октябрь 2026', en: 'October 2026' },
    calendarHelp: { ru: 'Выберите число для быстрой сводки', kg: 'Ыкчам маалымат үчүн күндү тандаңыз', en: 'Select date for instant summary' },
    legendEmergency: { ru: 'Срочно (0–3 дня)', kg: 'Шашылыш (0–3 күн)', en: 'Urgent (0–3 days)' },
    legendPlanned: { ru: 'Предупреждения', kg: 'Эскертүүлөр', en: 'Alerts' },
    legendEvents: { ru: 'События', kg: 'Окуялар', en: 'Events' },
    selectedDate: { ru: 'Выбрано', kg: 'Тандалган күн', en: 'Selected' },
    recordsCount: { ru: 'записей', kg: 'жазуу', en: 'records' },
  },

  // Days of week short — только для узких заголовков календаря (полное название — во всплывающей подсказке daysFull)
  days: {
    mon: { ru: 'ПН', kg: 'ДШ', en: 'MO' },
    tue: { ru: 'ВТ', kg: 'ШШ', en: 'TU' },
    wed: { ru: 'СР', kg: 'ШР', en: 'WE' },
    thu: { ru: 'ЧТ', kg: 'БШ', en: 'TH' },
    fri: { ru: 'ПТ', kg: 'ЖМ', en: 'FR' },
    sat: { ru: 'СБ', kg: 'ИШ', en: 'SA' },
    sun: { ru: 'ВС', kg: 'ЖК', en: 'SU' },
  },
  daysFull: {
    mon: { ru: 'Понедельник', kg: 'Дүйшөмбү', en: 'Monday' },
    tue: { ru: 'Вторник', kg: 'Шейшемби', en: 'Tuesday' },
    wed: { ru: 'Среда', kg: 'Шаршемби', en: 'Wednesday' },
    thu: { ru: 'Четверг', kg: 'Бейшемби', en: 'Thursday' },
    fri: { ru: 'Пятница', kg: 'Жума', en: 'Friday' },
    sat: { ru: 'Суббота', kg: 'Ишемби', en: 'Saturday' },
    sun: { ru: 'Воскресенье', kg: 'Жекшемби', en: 'Sunday' },
  },

  // Announcement Detail Specifics (from Image 5)
  details: {
    protocol: { ru: 'ОПЕРАТИВНЫЙ ПРОТОКОЛ', kg: 'ЫКЧАМ ПРОТОКОЛ', en: 'OPERATIONAL PROTOCOL' },
    statusActive: { ru: 'Действует', kg: 'Күчүндө', en: 'Active' },
    statusScheduled: { ru: 'Запланировано', kg: 'Пландаштырылган', en: 'Scheduled' },
    statusCompleted: { ru: 'Завершено', kg: 'Аяктады', en: 'Completed' },
    statusCancelled: { ru: 'Отменено', kg: 'Жокко чыгарылды', en: 'Cancelled' },
    statusRescheduled: { ru: 'Перенесено', kg: 'Жылдырылды', en: 'Rescheduled' },
    statusArchived: { ru: 'В архиве', kg: 'Архивде', en: 'Archived' },
    verifiedBadge: { ru: 'Проверенный муниципальный источник', kg: 'Текшерилген муниципалдык булак', en: 'Verified Municipal Source' },
    syncCalendar: { ru: 'Синхронизировать', kg: 'Синхрондоштуруу', en: 'Sync to Calendar' },
    syncReminder: { ru: 'Напоминание за 2 часа', kg: '2 саат мурун эскертүү', en: 'Reminder 2h before' },
    published: { ru: 'Опубликовано:', kg: 'Жарыяланды:', en: 'Published:' },
    updated: { ru: 'Обновлено:', kg: 'Жаңыртылды:', en: 'Updated:' },
    sourceLabel: { ru: 'Источник:', kg: 'Булак:', en: 'Source:' },
    timeCardTitle: { ru: 'ПАРАМЕТР ВРЕМЕНИ / КОГДА / КАЧАН', kg: 'УБАКЫТ ПАРАМЕТРИ / КАЧАН / КОГДА', en: 'TIME PARAMETERS / WHEN' },
    locationCardTitle: { ru: 'ЛОКАЦИЯ И ЗОНА / ГДЕ / КАЙДА', kg: 'ЛОКАЦИЯ ЖАНА АЙМАК / КАЙДА / ГДЕ', en: 'LOCATION & ZONE / WHERE' },
    workCardTitle: { ru: 'ПРИЧИНА И РАБОТЫ / ЧТО / ЭМНЕ', kg: 'СЕБЕБИ ЖАНА ИШТЕР / ЭМНЕ / ЧТО', en: 'PURPOSE & WORK / WHAT' },
    workStart: { ru: 'СТАРТ РАБОТ:', kg: 'ИШТИН БАШТАЛЫШЫ:', en: 'START TIME:' },
    workEnd: { ru: 'ЗАВЕРШЕНИЕ И ОТКРЫТИЕ:', kg: 'АЯКТАШЫ ЖАНА АЧЫЛЫШЫ:', en: 'END & REOPENING:' },
    adminDistrict: { ru: 'АДМИНИСТРАТИВНЫЙ ОКРУГ:', kg: 'АДМИНИСТРАТИВДИК РАЙОН:', en: 'DISTRICT:' },
    closedSegment: { ru: 'ЗАКРЫТЫЙ ОТРЕЗОК:', kg: 'ЖАБЫЛГАН ТИЛКЕ:', en: 'CLOSED SECTION:' },
    workTypeLabel: { ru: 'ХАРАКТЕР РАБОТ:', kg: 'ИШТИН МҮНӨЗҮ:', en: 'WORK TYPE:' },
    workGoalLabel: { ru: 'ЦЕЛЬ РЕКОНСТРУКЦИИ:', kg: 'ОҢДООНУН МАКСАТЫ:', en: 'PROJECT GOAL:' },
    contractorLabel: { ru: 'Подрядчик:', kg: 'Подрядчик:', en: 'Contractor:' },
    interactiveMapTitle: { ru: 'СХЕМА ОРГАНИЗАЦИИ ДВИЖЕНИЯ', kg: 'КЫЙМЫЛДЫ УЮШТУРУУ СХЕМАСЫ', en: 'TRAFFIC DETOUR DIAGRAM' },
    interactiveMapSubtitle: { ru: 'Интерактивная карта перекрытия и объезда', kg: 'Жабуу жана айланып өтүүнүн интерактивдүү картасы', en: 'Interactive Closure & Detour Map' },
    fullscreen: { ru: 'На весь экран', kg: 'Толук экранга', en: 'Fullscreen' },
    closedRoute: { ru: 'Закрыто', kg: 'Жабылган', en: 'Closed' },
    detourRoute: { ru: 'Объезд', kg: 'Айланып өтүү', en: 'Detour' },
    recommendedDetour: { ru: 'Южный объезд (Рекомендуемый)', kg: 'Түштүк айланып өтүү (Сунушталат)', en: 'South Detour (Recommended)' },
    northDetour: { ru: 'Северный объезд', kg: 'Түндүк айланып өтүү', en: 'North Detour' },
    transportHeader: { ru: 'ГОРОДСКОЙ ТРАНСПОРТ И РЕЗИДЕНТЫ', kg: 'ШААРДЫК ТРАНСПОРТ ЖАНА ЖАШООЧУЛАР', en: 'PUBLIC TRANSIT & RESIDENTS' },
    transportTitle: { ru: 'Изменения в работе транспорта и доступ к домам', kg: 'Транспорттун ишиндеги өзгөрүүлөр жана үйлөргө кирүү', en: 'Transit Route Changes & Access to Houses' },
    officialStatementTitle: { ru: 'Официальное заявление мэрии Бишкека', kg: 'Бишкек шаарынын мэриясынын расмий билдирүүсү', en: 'Official Statement of the Mayor’s Office' },
    originalDoc: { ru: 'ПЕРВОИСТОЧНИК ДОКУМЕНТА:', kg: 'ДОКУМЕНТТИН ТҮП БУЛАГЫ:', en: 'ORIGINAL DOCUMENT SOURCE:' },
    verifiedByDataNews: { ru: 'Верифицировано DataNews', kg: 'DataNews тарабынан текшерилди', en: 'Verified by DataNews' },
    emergencyHotlines: { ru: 'Дежурные службы', kg: 'Нөөмөт кызматтары', en: 'Emergency Hotlines' },
    emergencyDesc: { ru: 'Круглосуточный прием обращений', kg: 'Күнү-түнү кайрылууларды кабыл алуу', en: '24/7 Citizen hotline service' },
    callCenterFree: { ru: 'Бесплатно', kg: 'Акысыз', en: 'Free call' },
    shareNotice: { ru: 'Оперативное оповещение', kg: 'Ыкчам кабарлоо', en: 'Quick Share' },
    sharesCount: { ru: '1,420 пересылок', kg: '1,420 бөлүшүү', en: '1,420 shares' },
    shareTelegram: { ru: 'Поделиться в Telegram', kg: 'Telegram аркылуу бөлүшүү', en: 'Share on Telegram' },
    shareWhatsApp: { ru: 'Поделиться в WhatsApp', kg: 'WhatsApp аркылуу бөлүшүү', en: 'Share on WhatsApp' },
    copyLink: { ru: 'Скопировать прямую ссылку', kg: 'Түз шилтемени көчүрүү', en: 'Copy direct link' },
    saveFavorite: { ru: 'Сохранить в избранное', kg: 'Тандалгандарга сактоо', en: 'Save to Favorites' },
    googleCalendar: { ru: 'Google Календарь', kg: 'Google Календарь', en: 'Google Calendar' },
    nearbyTitle: { ru: 'Рядом в этом районе', kg: 'Бул райондо жакын жерде', en: 'Nearby in this district' },
    allAlertsCity: { ru: 'Все предупреждения Бишкека', kg: 'Бишкектин бардык эскертүүлөрү', en: 'All Bishkek alerts' },
  },

  // For Organizations Section
  forOrg: {
    tag: { ru: 'Для муниципалитетов и бизнеса', kg: 'Муниципалитеттер жана бизнес үчүн', en: 'For Municipalities & Business' },
    title: { ru: 'Ваши объявления увидят вовремя и по нужному адресу', kg: 'Билдирүүлөрүңүз өз убагында жана керектүү дарекке жетет', en: 'Your Notices Seen on Time and at the Right Address' },
    desc: {
      ru: 'Муниципальные службы, коммунальные предприятия, организаторы концертов, государственные ведомства и образовательные центры публикуют верифицированные анонсы с точной привязкой ко времени и локации.',
      kg: 'Муниципалдык кызматтар, коммуналдык ишканалар, концерт уюштуруучулары, мамлекеттик мекемелер жана билим берүү борборлору убакытка жана жерге так байланган текшерилген анонсторду жарыялашат.',
      en: 'Municipal authorities, utilities, event promoters, state agencies, and educational hubs publish verified notices strictly targeted by time and location.',
    },
    p1Title: { ru: 'Точный геотаргетинг', kg: 'Так геотаргетинг', en: 'Precise Geo-Targeting' },
    p1Desc: { ru: 'Уведомление увидят только жители конкретной улицы или района города.', kg: 'Билдирүүнү белгилүү бир көчөнүн же райондун тургундары гана көрүшөт.', en: 'Notices are delivered only to residents of specific streets or city sectors.' },
    p2Title: { ru: 'Статус проверенного источника', kg: 'Текшерилген булак статусу', en: 'Verified Source Badge' },
    p2Desc: { ru: 'Официальная синяя галочка ведомства защищает от слухов и фейковых графиков.', kg: 'Ведомствонун расмий көк белгиси имиш-имиштерден жана жалган графиктерден коргойт.', en: 'Official civic badge prevents misinformation and fake emergency alerts.' },
    p3Title: { ru: 'Каналы Telegram & WhatsApp', kg: 'Telegram & WhatsApp каналдары', en: 'Instant Telegram & WhatsApp' },
    p3Desc: { ru: 'Автоматическая рассылка подписчикам вашего городского округа за 1 минуту.', kg: 'Шаардык округдун жазылуучуларына 1 мүнөттө автоматтык түрдө жөнөтүү.', en: 'Instant push dispatches to subscribed neighborhood chats within 1 minute.' },
    p4Title: { ru: 'Детальная аналитика охвата', kg: 'Көрүүлөрдүн толук аналитикасы', en: 'Detailed Reach Analytics' },
    p4Desc: { ru: 'Прозрачная статистика прочтений, скачиваний схем объезда и переходов на билеты.', kg: 'Окуулардын, айланып өтүү схемаларын жүктөп алуулардын жана билеттерге өтүүлөрдүн ачык статистикасы.', en: 'Transparent counters for reads, detour diagram downloads, and ticket links.' },
    ctaPost: { ru: 'Разместить объявление', kg: 'Билдирүү жайгаштыруу', en: 'Post an Announcement' },
    ctaPricing: { ru: 'Тарифы и партнерство PRO', kg: 'Тарифтер жана PRO өнөктөштүк', en: 'Plans & PRO Partnership' },
  },

  // Admin Dashboard
  admin: {
    title: { ru: 'Панель управления DataNews', kg: 'DataNews башкаруу панели', en: 'DataNews Admin Dashboard' },
    subtitle: { ru: 'Управление объявлениями, модерация и публикации', kg: 'Билдирүүлөрдү башкаруу, модерация жана жарыялоо', en: 'Announcement management, moderation, and publishing' },
    loginTitle: { ru: 'Вход для администратора', kg: 'Администратордун кирүүсү', en: 'Admin Access Login' },
    loginDesc: { ru: 'Введите пароль администратора для управления публикациями', kg: 'Жарыяларды башкаруу үчүн администратор сырсөзүн киргизиңиз', en: 'Enter administrator credentials to manage records' },
    passwordLabel: { ru: 'Пароль администратора', kg: 'Администратор сырсөзү', en: 'Admin Password' },
    loginBtn: { ru: 'Войти в панель', kg: 'Панелге кирүү', en: 'Sign In to Dashboard' },
    logoutBtn: { ru: 'Выйти', kg: 'Чыгуу', en: 'Log Out' },
    authNote: { ru: 'Введите пароль администратора', kg: 'Администратордун сырсөзүн киргизиңиз', en: 'Enter the administrator password' },
    newAnnouncement: { ru: 'Создать объявление', kg: 'Жаңы билдирүү түзүү', en: 'New Announcement' },
    editAnnouncement: { ru: 'Редактировать', kg: 'Оңдоо', en: 'Edit' },
    deleteAnnouncement: { ru: 'Удалить', kg: 'Өчүрүү', en: 'Delete' },
    archiveBtn: { ru: 'В архив', kg: 'Архивге', en: 'Archive' },
    publishNowBtn: { ru: 'Опубликовать', kg: 'Жарыялоо', en: 'Publish Now' },
    saveBtn: { ru: 'Сохранить изменения', kg: 'Өзгөртүүлөрдү сактоо', en: 'Save Changes' },
    cancelBtn: { ru: 'Отмена', kg: 'Жокко чыгаруу', en: 'Cancel' },
    filterAll: { ru: 'Все статусы', kg: 'Бардык статустар', en: 'All Statuses' },
    statusActive: { ru: 'Активные', kg: 'Активдүү', en: 'Active' },
    statusScheduled: { ru: 'Запланированные', kg: 'Пландалган', en: 'Scheduled' },
    statusCompleted: { ru: 'Завершенные', kg: 'Аяктагандар', en: 'Completed' },
    statusCancelled: { ru: 'Отмененные', kg: 'Жокко чыгарылгандар', en: 'Cancelled' },
    statusRescheduled: { ru: 'Перенесенные', kg: 'Жылдырылгандар', en: 'Rescheduled' },
    statusArchived: { ru: 'В архиве', kg: 'Архивде', en: 'Archived' },
    resetDefaults: { ru: 'Сбросить к исходным данным', kg: 'Баштапкы маалыматтарга кайтаруу', en: 'Reset to Sample Data' },
    resetConfirm: { ru: 'Вы уверены? Добавленные вами объявления будут удалены, останутся только проверенные публикации.', kg: 'Ишенесизби? Сиз кошкон билдирүүлөр өчүрүлүп, текшерилген жарыялар гана калат.', en: 'Remove added announcements and restore the verified set?' },
    successSaved: { ru: 'Объявление успешно сохранено!', kg: 'Билдирүү ийгиликтүү сакталды!', en: 'Announcement saved successfully!' },
    titleRu: { ru: 'Заголовок (RU)', kg: 'Аталышы (RU)', en: 'Title (RU)' },
    titleKg: { ru: 'Заголовок (KG)', kg: 'Аталышы (KG)', en: 'Title (KG)' },
    titleEn: { ru: 'Заголовок (EN)', kg: 'Аталышы (EN)', en: 'Title (EN)' },
    summaryRu: { ru: 'Краткое описание (RU)', kg: 'Кыскача маалымат (RU)', en: 'Summary (RU)' },
    locationRu: { ru: 'Локация / Улица (RU)', kg: 'Локация / Көчө (RU)', en: 'Location / Street (RU)' },
    categoryLabel: { ru: 'Категория', kg: 'Категория', en: 'Category' },
    cityLabel: { ru: 'Город', kg: 'Шаар', en: 'City' },
    startDateLabel: { ru: 'Дата и время начала', kg: 'Башталуу күнү жана убактысы', en: 'Start Date & Time' },
    endDateLabel: { ru: 'Дата и время окончания', kg: 'Аяктоо күнү жана убактысы', en: 'End Date & Time' },
    urgencyLabel: { ru: 'Тип срочности', kg: 'Шашылыш түрү', en: 'Urgency Type' },
    sourceNameLabel: { ru: 'Официальный источник', kg: 'Расмий булак', en: 'Official Source Organization' },
    isTickerLabel: { ru: 'Показывать в срочной бегущей строке вверху', kg: 'Жогорку шашылыш сапта көрсөтүү', en: 'Display in Urgent Top Ticker' },
    fictionalNoticeBadge: { ru: 'Учебный демонстрационный образец', kg: 'Окуу-демонстрациялык үлгүсү', en: 'Educational Demo Sample' },
  },

  // Disclaimer
  disclaimer: {
    bannerText: {
      ru: 'Публикации основаны на открытых источниках. Перед поездкой проверяйте информацию у организаторов и в официальных каналах.',
      kg: 'Жарыялар ачык булактардын негизинде даярдалган. Жолго чыгаардан мурун маалыматты уюштуруучулардан жана расмий каналдардан тактаңыз.',
      en: 'Notices are based on public sources. Please confirm details with organisers before you go.',
    },
    footerNotice: {
      ru: 'КЫРГЫЗСТАН • DataNews — что, где и когда',
      kg: 'КЫРГЫЗСТАН • DataNews — эмне, кайда, качан',
      en: 'KYRGYZSTAN • DataNews — what, where, when',
    },
    copyright: {
      ru: '© 2026 DataNews Kyrgyzstan. Открытые общественные данные.',
      kg: '© 2026 DataNews Кыргызстан. Ачык коомдук маалыматтар.',
      en: '© 2026 DataNews Kyrgyzstan. Open Public Data.',
    },
  },
};

export const getTranslation = (lang: Language) => {
  return {
    t: (keyPath: string): string => {
      const parts = keyPath.split('.');
      let current: any = translations;
      for (const p of parts) {
        if (!current || typeof current !== 'object') return keyPath;
        current = current[p];
      }
      if (current && typeof current === 'object' && current[lang]) {
        return current[lang];
      }
      if (current && typeof current === 'object' && current['ru']) {
        return current['ru'];
      }
      return typeof current === 'string' ? current : keyPath;
    },
  };
};
