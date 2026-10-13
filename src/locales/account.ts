import { Language, LocalizedString } from '../types';

/**
 * Тексты личного кабинета, формы публикации и сообщения об ошибках сервера (RU / KG / EN).
 * Панель администратора остаётся на русском — ею пользуется только владелец сайта.
 */
const T = {
  cabinet: { ru: 'Личный кабинет', kg: 'Жеке кабинет', en: 'My account' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
  loading: { ru: 'Загрузка…', kg: 'Жүктөлүүдө…', en: 'Loading…' },
  howTitle: { ru: 'Как разместить своё событие', kg: 'Өз иш-чараңызды кантип жайгаштырасыз', en: 'How to post your event' },
  how1: { ru: 'Зарегистрируйтесь и выберите тариф.', kg: 'Катталып, тарифти тандаңыз.', en: 'Sign up and choose a plan.' },
  how2: {
    ru: 'Оплатите регистрацию — администратор подтвердит платёж.',
    kg: 'Каттоо үчүн төлөңүз — администратор төлөмдү тастыктайт.',
    en: 'Pay for registration — the administrator will confirm the payment.',
  },
  how3: {
    ru: 'Добавьте событие с фото — оно уйдёт на модерацию.',
    kg: 'Иш-чараны сүрөтү менен кошуңуз — ал модерацияга жөнөтүлөт.',
    en: 'Add your event with a photo — it goes to moderation.',
  },
  how4: {
    ru: 'После одобрения администратором событие появится на сайте.',
    kg: 'Администратор жактыргандан кийин иш-чара сайтта пайда болот.',
    en: 'Once approved by the administrator, the event appears on the site.',
  },
  register: { ru: 'Регистрация', kg: 'Каттоо', en: 'Sign up' },
  login: { ru: 'Вход', kg: 'Кирүү', en: 'Log in' },
  email: { ru: 'E-mail', kg: 'E-mail', en: 'E-mail' },
  password: { ru: 'Пароль', kg: 'Сырсөз', en: 'Password' },
  signIn: { ru: 'Войти', kg: 'Кирүү', en: 'Log in' },
  signingIn: { ru: 'Вход…', kg: 'Кирүүдө…', en: 'Logging in…' },
  name: { ru: 'Имя и фамилия *', kg: 'Аты-жөнү *', en: 'Full name *' },
  org: { ru: 'Организация (необязательно)', kg: 'Уюм (милдеттүү эмес)', en: 'Organisation (optional)' },
  emailReq: { ru: 'E-mail *', kg: 'E-mail *', en: 'E-mail *' },
  phoneReq: { ru: 'Телефон * (+996 …)', kg: 'Телефон * (+996 …)', en: 'Phone * (+996 …)' },
  passwordReq: { ru: 'Пароль * (не короче 6 символов)', kg: 'Сырсөз * (кеминде 6 белги)', en: 'Password * (at least 6 characters)' },
  planPaid: { ru: 'Тариф (платная регистрация)', kg: 'Тариф (акылуу каттоо)', en: 'Plan (paid registration)' },
  paymentRefOptional: {
    ru: 'Номер транзакции / код чека (если уже оплатили)',
    kg: 'Транзакциянын номери / чектин коду (төлөгөн болсоңуз)',
    en: 'Transaction number / receipt code (if already paid)',
  },
  paymentRef: { ru: 'Номер транзакции / код чека', kg: 'Транзакциянын номери / чектин коду', en: 'Transaction number / receipt code' },
  signUp: { ru: 'Зарегистрироваться', kg: 'Катталуу', en: 'Sign up' },
  signingUp: { ru: 'Регистрация…', kg: 'Катталууда…', en: 'Signing up…' },
  payTitle: { ru: 'Оплата', kg: 'Төлөм', en: 'Payment' },
  payFor: { ru: 'за', kg: '—', en: 'for' },
  payContact: {
    ru: 'Администратор свяжется с вами по телефону или e-mail и пришлёт реквизиты для оплаты.',
    kg: 'Администратор сиз менен телефон же e-mail аркылуу байланышып, төлөм реквизиттерин жөнөтөт.',
    en: 'The administrator will contact you by phone or e-mail with payment details.',
  },
  payAfter: {
    ru: 'После оплаты укажите номер транзакции или код чека — администратор сверит платёж и откроет доступ к публикациям.',
    kg: 'Төлөгөндөн кийин транзакциянын номерин же чектин кодун жазыңыз — администратор төлөмдү текшерип, жарыялоого уруксат берет.',
    en: 'After paying, enter the transaction number or receipt code — the administrator will check it and enable posting.',
  },
  tabProfile: { ru: 'Профиль и оплата', kg: 'Профиль жана төлөм', en: 'Profile & payment' },
  tabPublish: { ru: 'Добавить событие', kg: 'Иш-чара кошуу', en: 'Add event' },
  tabMine: { ru: 'Мои публикации', kg: 'Менин жарыяларым', en: 'My posts' },
  nameLabel: { ru: 'Имя', kg: 'Аты-жөнү', en: 'Name' },
  plan: { ru: 'Тариф', kg: 'Тариф', en: 'Plan' },
  payment: { ru: 'Платёж', kg: 'Төлөм', en: 'Payment' },
  paidUntil: { ru: 'Оплачено до', kg: 'Төлөм мөөнөтү', en: 'Paid until' },
  paidExpired: { ru: 'Срок оплаты истёк', kg: 'Төлөм мөөнөтү бүттү', en: 'Payment expired' },
  paidBtn: { ru: 'Я оплатил(а)', kg: 'Мен төлөдүм', en: 'I have paid' },
  paidThanks: {
    ru: 'Спасибо! Администратор проверит платёж и откроет доступ к публикациям.',
    kg: 'Рахмат! Администратор төлөмдү текшерип, жарыялоого уруксат берет.',
    en: 'Thank you! The administrator will check the payment and enable posting.',
  },
  logout: { ru: 'Выйти', kg: 'Чыгуу', en: 'Log out' },
  lockedTitle: { ru: 'Публикация откроется после оплаты', kg: 'Жарыялоо төлөмдөн кийин ачылат', en: 'Posting opens after payment' },
  lockedStatus: { ru: 'Статус оплаты', kg: 'Төлөмдүн абалы', en: 'Payment status' },
  lockedHint: {
    ru: 'Перейдите в «Профиль и оплата», чтобы указать номер платежа.',
    kg: 'Төлөмдүн номерин жазуу үчүн «Профиль жана төлөм» бөлүмүнө өтүңүз.',
    en: 'Go to “Profile & payment” to enter the payment number.',
  },
  moderationHint: {
    ru: 'Событие появится на сайте только после проверки администратором. Указывайте точные дату, адрес и контакты.',
    kg: 'Иш-чара администратор текшергенден кийин гана сайтта чыгат. Датаны, даректи жана байланыштарды так көрсөтүңүз.',
    en: 'The event appears on the site only after the administrator reviews it. Give the exact date, address and contacts.',
  },
  sendToModeration: { ru: 'Отправить на модерацию', kg: 'Модерацияга жөнөтүү', en: 'Send for moderation' },
  sentToModeration: {
    ru: 'Событие отправлено на модерацию. Статус — во вкладке «Мои публикации».',
    kg: 'Иш-чара модерацияга жөнөтүлдү. Абалын «Менин жарыяларым» бөлүмүнөн көрүңүз.',
    en: 'Your event was sent for moderation. Track it under “My posts”.',
  },
  resubmit: { ru: 'Исправить и отправить повторно', kg: 'Оңдоп, кайра жөнөтүү', en: 'Fix and resubmit' },
  resubmitted: {
    ru: 'Исправленная публикация снова на модерации.',
    kg: 'Оңдолгон жарыя кайрадан модерацияда.',
    en: 'The corrected post is back in moderation.',
  },
  nothingYet: { ru: 'Вы ещё ничего не публиковали.', kg: 'Сиз азырынча эч нерсе жарыялай элексиз.', en: 'You have not posted anything yet.' },
  reason: { ru: 'Причина', kg: 'Себеби', en: 'Reason' },
  edit: { ru: 'Изменить', kg: 'Өзгөртүү', en: 'Edit' },

  // статусы
  modPending: { ru: 'На модерации', kg: 'Модерацияда', en: 'In moderation' },
  modApproved: { ru: 'Опубликовано', kg: 'Жарыяланды', en: 'Published' },
  modRejected: { ru: 'Отклонено', kg: 'Четке кагылды', en: 'Rejected' },
  payUnpaid: { ru: 'Не оплачено', kg: 'Төлөнгөн жок', en: 'Not paid' },
  payPending: { ru: 'Оплата проверяется', kg: 'Төлөм текшерилүүдө', en: 'Payment being checked' },
  payPaid: { ru: 'Оплачено', kg: 'Төлөндү', en: 'Paid' },
  payRejected: { ru: 'Оплата не найдена', kg: 'Төлөм табылган жок', en: 'Payment not found' },

  // форма публикации
  fTitleRu: { ru: 'Название (RU) *', kg: 'Аталышы (орусча) *', en: 'Title (Russian) *' },
  fTitleKg: { ru: 'Название (KG)', kg: 'Аталышы (кыргызча)', en: 'Title (Kyrgyz)' },
  fTitleEn: { ru: 'Название (EN)', kg: 'Аталышы (англисче)', en: 'Title (English)' },
  fSummary: { ru: 'Кратко (1–2 предложения) *', kg: 'Кыскача (1–2 сүйлөм) *', en: 'Short summary (1–2 sentences) *' },
  fDescription: { ru: 'Подробное описание', kg: 'Толук сүрөттөмө', en: 'Full description' },
  fCategory: { ru: 'Категория', kg: 'Категория', en: 'Category' },
  fCity: { ru: 'Город', kg: 'Шаар', en: 'City' },
  fLocation: { ru: 'Адрес / место проведения *', kg: 'Дареги / өтүүчү жери *', en: 'Address / venue *' },
  fLocationPh: {
    ru: 'Например: Филармония им. Т. Сатылганова, пр. Чуй, 253',
    kg: 'Мисалы: Т. Сатылганов атн. филармония, Чүй пр., 253',
    en: 'E.g. T. Satylganov Philharmonic, 253 Chui Ave',
  },
  fStart: { ru: 'Начало *', kg: 'Башталышы *', en: 'Starts *' },
  fEnd: { ru: 'Окончание', kg: 'Аякташы', en: 'Ends' },
  fPrice: { ru: 'Цена', kg: 'Баасы', en: 'Price' },
  fPricePh: { ru: 'от 1 500 сом / Вход свободный', kg: '1 500 сомдон / Кирүү акысыз', en: 'from 1,500 KGS / Free entry' },
  fTime: { ru: 'Время / возраст', kg: 'Убактысы / жаш чеги', en: 'Time / age' },
  fVenue: { ru: 'Площадка', kg: 'Аянтча', en: 'Venue' },
  fOrganizer: { ru: 'Организатор', kg: 'Уюштуруучу', en: 'Organiser' },
  fPhone: { ru: 'Телефон для справок', kg: 'Маалымат үчүн телефон', en: 'Enquiries phone' },
  fTickets: { ru: 'Ссылка на билеты', kg: 'Билеттерге шилтеме', en: 'Ticket link' },
  fSource: { ru: 'Ссылка на источник / официальную страницу', kg: 'Булакка / расмий баракчага шилтеме', en: 'Source / official page link' },
  fPhoto: { ru: 'Фото / афиша события', kg: 'Иш-чаранын сүрөтү / афишасы', en: 'Event photo / poster' },
  fUpload: { ru: 'Загрузить с устройства', kg: 'Түзмөктөн жүктөө', en: 'Upload from device' },
  fImageUrl: { ru: '…или ссылка на изображение https://', kg: '…же сүрөткө шилтеме https://', en: '…or image link https://' },
  fImageCredit: { ru: 'Автор фото / права (необязательно)', kg: 'Сүрөттүн автору / укуктары (милдеттүү эмес)', en: 'Photo credit / rights (optional)' },
  fOrganizerUrl: { ru: 'Сайт организатора', kg: 'Уюштуруучунун сайты', en: 'Organiser website' },
  fArtistUrl: { ru: 'Официальный сайт артиста', kg: 'Артисттин расмий сайты', en: 'Artist’s official site' },
  fVenueUrl: { ru: 'Сайт площадки', kg: 'Аянтчанын сайты', en: 'Venue website' },
  fImageSource: { ru: 'Страница-источник фото https://', kg: 'Сүрөттүн булак баракчасы https://', en: 'Photo source page https://' },
  fImageAlt: { ru: 'Что на фото (для незрячих пользователей)', kg: 'Сүрөттө эмне бар (көрө албагандар үчүн)', en: 'What the photo shows (for screen readers)' },
  fImageCover: {
    ru: 'Заполнить рамку (обрезая края) — только для широких баннеров',
    kg: 'Алкакты толтуруу (четтерин кесип) — кең баннерлер үчүн гана',
    en: 'Fill the frame (crop edges) — wide banners only',
  },
  fRemovePhoto: { ru: 'Убрать фото', kg: 'Сүрөттү алып салуу', en: 'Remove photo' },
  fCancel: { ru: 'Отмена', kg: 'Жокко чыгаруу', en: 'Cancel' },
  fSaving: { ru: 'Сохранение…', kg: 'Сакталууда…', en: 'Saving…' },
  fRequired: {
    ru: 'Заполните название, краткое описание, адрес и дату начала',
    kg: 'Аталышын, кыскача сүрөттөмөнү, даректи жана башталыш датасын толтуруңуз',
    en: 'Fill in the title, summary, address and start date',
  },
  fEndBeforeStart: { ru: 'Дата окончания раньше даты начала', kg: 'Аяктоо датасы башталыш датасынан эрте', en: 'End date is before the start date' },
  fPhotoTooBig: { ru: 'Фото слишком большое, выберите другое', kg: 'Сүрөт өтө чоң, башкасын тандаңыз', en: 'Photo is too large, choose another one' },
  fPhotoBad: { ru: 'Не удалось прочитать изображение', kg: 'Сүрөттү окуу мүмкүн болгон жок', en: 'Could not read the image' },
} satisfies Record<string, LocalizedString>;

export type AccountKey = keyof typeof T;

export const ta = (key: AccountKey, lang: Language) => T[key][lang] || T[key].ru;

/** Сообщения об ошибках сервера по коду ответа */
const ERRORS: Record<string, LocalizedString> = {
  network: { ru: 'Нет связи с сервером', kg: 'Сервер менен байланыш жок', en: 'Cannot reach the server' },
  storage_not_configured: {
    ru: 'Сервер ещё не настроен. Попробуйте позже.',
    kg: 'Сервер азырынча орнотула элек. Кийинчерээк аракет кылыңыз.',
    en: 'The server is not set up yet. Please try later.',
  },
  bad_email: { ru: 'Проверьте e-mail', kg: 'E-mail дарегин текшериңиз', en: 'Check the e-mail address' },
  bad_name: { ru: 'Укажите имя', kg: 'Атыңызды жазыңыз', en: 'Enter your name' },
  bad_phone: { ru: 'Укажите телефон', kg: 'Телефонуңузду жазыңыз', en: 'Enter your phone number' },
  weak_password: { ru: 'Пароль — не короче 6 символов', kg: 'Сырсөз кеминде 6 белгиден турушу керек', en: 'Password must be at least 6 characters' },
  email_taken: { ru: 'Этот e-mail уже зарегистрирован', kg: 'Бул e-mail мурунтан катталган', en: 'This e-mail is already registered' },
  wrong_credentials: { ru: 'Неверный e-mail или пароль', kg: 'E-mail же сырсөз туура эмес', en: 'Wrong e-mail or password' },
  too_many_attempts: {
    ru: 'Слишком много попыток, подождите минуту',
    kg: 'Аракет өтө көп болду, бир мүнөт күтүңүз',
    en: 'Too many attempts, please wait a minute',
  },
  bad_payment_ref: { ru: 'Укажите номер или код платежа', kg: 'Төлөмдүн номерин же кодун жазыңыз', en: 'Enter the payment number or code' },
  payment_required: {
    ru: 'Публикация доступна после подтверждения оплаты регистрации',
    kg: 'Жарыялоо каттоо төлөмү тастыкталгандан кийин жеткиликтүү болот',
    en: 'Posting is available once your registration payment is confirmed',
  },
  limit_reached: {
    ru: 'Достигнут лимит публикаций вашего тарифа за 30 дней',
    kg: 'Тарифиңиздин 30 күндүк жарыя чегине жеттиңиз',
    en: 'You have reached your plan’s 30-day post limit',
  },
  missing_field: { ru: 'Заполните обязательные поля', kg: 'Милдеттүү талааларды толтуруңуз', en: 'Fill in the required fields' },
  missing_date: { ru: 'Укажите дату начала', kg: 'Башталыш датасын көрсөтүңүз', en: 'Enter the start date' },
  bad_date: { ru: 'Неверный формат даты', kg: 'Датанын форматы туура эмес', en: 'Invalid date format' },
  bad_image: { ru: 'Поддерживаются JPG, PNG, WEBP', kg: 'JPG, PNG, WEBP форматтары гана кабыл алынат', en: 'Only JPG, PNG and WEBP are supported' },
  image_too_large: { ru: 'Фото слишком большое', kg: 'Сүрөт өтө чоң', en: 'Photo is too large' },
  payload_too_large: { ru: 'Слишком большой объём данных', kg: 'Маалымат өтө чоң', en: 'Too much data' },
  unauthorized: { ru: 'Войдите в личный кабинет', kg: 'Жеке кабинетке кириңиз', en: 'Please log in' },
  forbidden: { ru: 'Недостаточно прав', kg: 'Укугуңуз жетишсиз', en: 'Not allowed' },
};

/** Переводит ошибку сервера на язык интерфейса (по коду); иначе — текст сервера */
export const errorText = (e: unknown, lang: Language) => {
  const err = e as { code?: string; message?: string };
  const m = err.code ? ERRORS[err.code] : undefined;
  return m ? m[lang] : err.message || ERRORS.network[lang];
};
