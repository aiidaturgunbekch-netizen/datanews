import React, { useEffect } from 'react';
import { Language, ViewMode } from '../types';
import { ContactButtons } from './ContactButtons';
import { EDITORIAL, EDITORIAL_PAGE_VISIBLE } from '../config/site';

/** Публичные информационные страницы. «Источники информации» и «Политика конфиденциальности» из интерфейса убраны */
export type InfoView = 'about' | 'rules' | 'contacts' | 'editorial' | 'privacy';
type L3 = Record<Language, string>;

const TITLES: Record<InfoView, L3> = {
  about: { ru: 'О проекте', kg: 'Долбоор жөнүндө', en: 'About' },
  rules: { ru: 'Правила публикации', kg: 'Жарыялоо эрежелери', en: 'Publishing rules' },
  contacts: { ru: 'Связаться с DataNews', kg: 'DataNews менен байланышуу', en: 'Contact DataNews' },
  editorial: { ru: 'Редакция', kg: 'Редакция', en: 'Editorial team' },
  privacy: { ru: 'Политика конфиденциальности', kg: 'Купуялык саясаты', en: 'Privacy policy' },
};

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-gray-700 leading-relaxed">{children}</p>;
const H: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-base font-extrabold text-[#0f1b33] mt-4">{children}</h3>;
const UL: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

const ABOUT: Record<Language, React.ReactNode> = {
  ru: (
    <>
      <p className="text-lg font-extrabold text-[#12327A] mb-3">Знай дату — планируй день!</p>
      <P>
        <b>DataNews Кыргызстан — информационная платформа о важных датах в Кыргызстане.</b> В одном месте — всё, что каждому нужно знать на
        ближайшие дни: прогноз погоды, предупреждения об отключениях воды, света и тепла, перекрытия дорог, государственные решения и сроки,
        афиша концертов, спектаклей, выставок и ярмарок.
      </P>
      <P>
        А ещё — полезные новости образования, ИИ и технологий, бизнеса и государства: то, что можно применить в повседневной жизни и работе.
      </P>
      <P>В DataNews только важное и с датами, чтобы вы были в курсе и спокойно планировали свой день.</P>
      <H>Как мы работаем</H>
      <UL
        items={[
          'Берём сведения из первоисточников: министерства, мэрии, Кыргызгидромет, МЧС, театры и организаторы. Пишем своими словами — коротко и понятно.',
          'У каждой публикации — источник, дата публикации и дата последней проверки. DataNews не государственный орган: официальные решения принимают сами ведомства.',
          'Не публикуем выдуманные события и не выдаём обещания за принятые решения. Прошедшие предупреждения уходят в архив.',
          'Нашли ошибку? Напишите редакции — контакты на странице «Контакты».',
        ]}
      />
    </>
  ),
  kg: (
    <>
      <p className="text-lg font-extrabold text-[#12327A] mb-3">Убакытты бил — күнүңдү планда!</p>
      <P>
        <b>DataNews Кыргызстан — Кыргызстандагы маанилүү даталар тууралуу маалымат платформасы.</b> Жакынкы күндөрү ар бир адамга керектүү
        маалымат бир жерде: аба ырайынын божомолу, суу, жарык жана жылуулук өчүрүү тууралуу эскертүүлөр, жолдордун жабылышы, мамлекеттик
        чечимдер жана мөөнөттөр, концерттердин, спектаклдердин, көргөзмөлөрдүн жана жарманкелердин афишасы.
      </P>
      <P>
        Ошондой эле — билим берүү, жасалма интеллект жана технологиялар, бизнес жана мамлекет тармагындагы пайдалуу жаңылыктар: күнүмдүк жашоодо
        жана иште колдоно турган маалымат.
      </P>
      <P>DataNews'та маанилүү маалымат гана жана даталары менен — кабардар болуп, күнүңүздү тынч пландаңыз.</P>
      <H>Кантип иштейбиз</H>
      <UL
        items={[
          'Маалыматты түпкү булактардан алабыз: министрликтер, мэриялар, Кыргызгидромет, ӨКМ, театрлар жана уюштуруучулар. Өз сөзүбүз менен — кыска жана түшүнүктүү жазабыз.',
          'Ар бир жарыяда булак, жарыяланган күнү жана акыркы текшерүү күнү көрсөтүлөт. DataNews мамлекеттик орган эмес: расмий чечимдерди мекемелер өздөрү кабыл алат.',
          'Ойдон чыгарылган окуяларды жарыялабайбыз жана убадаларды кабыл алынган чечим катары көрсөтпөйбүз. Өткөн эскертүүлөр архивге кетет.',
          'Ката таптыңызбы? Редакцияга жазыңыз — байланыштар «Байланыш» баракчасында.',
        ]}
      />
    </>
  ),
  en: (
    <>
      <p className="text-lg font-extrabold text-[#12327A] mb-3">Know the date — plan your day!</p>
      <P>
        <b>DataNews Kyrgyzstan is an information platform about the important dates in Kyrgyzstan.</b> Everything you need to know for the
        coming days, in one place: the weather forecast, warnings about water, power and heating outages, road closures, government decisions and
        deadlines, and listings of concerts, plays, exhibitions and fairs.
      </P>
      <P>Plus useful news on education, AI and technology, business and government — things you can apply in everyday life and work.</P>
      <P>DataNews covers what matters, with dates, so you stay informed and can plan your day calmly.</P>
      <H>How we work</H>
      <UL
        items={[
          'We take information from primary sources: ministries, city halls, Kyrgyzhydromet, the Emergency Ministry, theatres and organisers, and write it in our own words — short and clear.',
          'Every post shows its source, publication date and last-checked date. DataNews is not a government body: official decisions are made by the institutions themselves.',
          'We do not publish invented events or present promises as decisions taken. Past warnings move to the archive.',
          'Found a mistake? Message the editors — see the Contacts page.',
        ]}
      />
    </>
  ),
};

const RULES: Record<Language, React.ReactNode> = {
  ru: (
    <UL
      items={[
        'Публиковать можно только реальные события и объявления с датой, местом и контактом.',
        'Фото или афиша — ваши оригинальные или с правом использования; сайт не меняет изображения.',
        'Нельзя выдавать себя за госорган: статус госоргана подтверждает только администрация DataNews.',
        'Запрещены оскорбления, дискриминация, мошенничество, реклама запрещённых товаров и услуг.',
        'Публикации пользователей проходят модерацию; подтверждённые госорганы публикуют сами и отвечают за сведения.',
        'По обоснованной жалобе публикация может быть снята; история изменений сохраняется.',
        'Тарифы действуют 30 дней; оплата подтверждается вручную.',
        'Публикации по тарифам помечены «Партнёрский материал» — так они отличаются от редакционных материалов и сообщений госорганов.',
      ]}
    />
  ),
  kg: (
    <UL
      items={[
        'Датасы, жери жана байланышы бар чыныгы окуяларды жана жарыяларды гана жарыялоого болот.',
        'Сүрөт же афиша — өзүңүздүн оригиналыңыз же колдонуу укугу бар; сайт сүрөттөрдү өзгөртпөйт.',
        'Мамлекеттик органдын атынан чыгууга болбойт: мамлекеттик орган статусун DataNews администрациясы гана тастыктайт.',
        'Кордоо, басмырлоо, алдамчылык, тыюу салынган товарларды жана кызматтарды жарнамалоо тыюу салынат.',
        'Колдонуучулардын жарыялары модерациядан өтөт; тастыкталган мамлекеттик органдар өздөрү жарыялап, маалымат үчүн жооп беришет.',
        'Негиздүү даттануу боюнча жарыя алынышы мүмкүн; өзгөртүүлөрдүн тарыхы сакталат.',
        'Тарифтер 30 күн жарактуу; төлөм кол менен тастыкталат.',
        'Тариф боюнча жарыялар «Өнөктөштүк материал» деп белгиленет — ушундайча алар редакциялык материалдардан жана мамлекеттик органдардын билдирүүлөрүнөн айырмаланат.',
      ]}
    />
  ),
  en: (
    <UL
      items={[
        'Only real events and notices with a date, place and contact may be posted.',
        'Photos or posters must be your own originals or used with permission; the site does not alter images.',
        'Do not pose as a government body: only DataNews administrators verify government status.',
        'No insults, discrimination, fraud or advertising of prohibited goods and services.',
        'User posts are moderated; verified government bodies publish directly and are responsible for their information.',
        'A post may be taken down after a justified report; the change history is kept.',
        'Plans last 30 days; payments are confirmed manually.',
        'Posts under a plan are marked "Partner content" to separate them from editorial content and government notices.',
      ]}
    />
  ),
};

/** «Редакция»: выходные данные, как исправляем ошибки, возрастная маркировка. Имена — только из настроек сайта */
const ED: Record<Language, { rows: [keyof typeof EDITORIAL, string][]; fix: string; fixList: string[]; age: string; ageText: string; contact: string; sources: string; sourcesText: string }> = {
  ru: {
    rows: [
      ['founder', 'Учредитель'],
      ['chiefEditor', 'Главный редактор'],
      ['registration', 'Регистрация СМИ'],
      ['address', 'Адрес редакции'],
    ],
    sources: 'Откуда новости',
    sourcesText:
      'Мы публикуем сведения из официальных источников: сайтов государственных органов, служб и организаторов. У каждого материала указан первоисточник и дата. Материалы по тарифам помечены «Партнёрский материал», реклама — «Реклама».',
    fix: 'Исправление ошибок',
    fixList: [
      'Нашли ошибку в дате, времени, месте или тексте — напишите нам, укажите ссылку на материал.',
      'Проверяем по первоисточнику и исправляем как можно быстрее, обычно в тот же день.',
      'Существенные исправления видны в истории изменений материала.',
      'По обоснованной жалобе материал может быть снят.',
    ],
    age: 'Возрастная маркировка',
    ageText: '16+. Сайт не предназначен для распространения информации, запрещённой для детей.',
    contact: 'Связаться с редакцией:',
  },
  kg: {
    rows: [
      ['founder', 'Негиздөөчү'],
      ['chiefEditor', 'Башкы редактор'],
      ['registration', 'ЖМК катталуусу'],
      ['address', 'Редакциянын дареги'],
    ],
    sources: 'Жаңылыктар кайдан',
    sourcesText:
      'Биз расмий булактардагы маалыматтарды жарыялайбыз: мамлекеттик органдардын, кызматтардын жана уюштуруучулардын сайттарынан. Ар бир материалда баштапкы булагы жана датасы көрсөтүлөт. Тариф боюнча материалдар «Өнөктөштүк материал», жарнама — «Жарнама» деп белгиленет.',
    fix: 'Каталарды оңдоо',
    fixList: [
      'Датада, убакытта, жерде же текстте ката таптыңызбы — бизге жазыңыз, материалдын шилтемесин көрсөтүңүз.',
      'Баштапкы булак боюнча текшерип, мүмкүн болушунча тез, адатта ошол эле күнү оңдойбуз.',
      'Маанилүү оңдоолор материалдын өзгөртүүлөр тарыхында көрүнөт.',
      'Негиздүү даттануу боюнча материал алынышы мүмкүн.',
    ],
    age: 'Курак белгиси',
    ageText: '16+. Сайт балдар үчүн тыюу салынган маалыматты таратууга арналган эмес.',
    contact: 'Редакция менен байланышуу:',
  },
  en: {
    rows: [
      ['founder', 'Founder'],
      ['chiefEditor', 'Editor-in-chief'],
      ['registration', 'Media registration'],
      ['address', 'Editorial address'],
    ],
    sources: 'Where the news comes from',
    sourcesText:
      'We publish information from official sources: websites of government bodies, services and organizers. Every item shows its original source and date. Plan-based posts are marked "Partner content", ads are marked "Ad".',
    fix: 'Corrections',
    fixList: [
      'Found a mistake in a date, time, place or text? Write to us with a link to the item.',
      'We check it against the original source and fix it as soon as possible, usually the same day.',
      'Significant corrections are visible in the item’s change history.',
      'An item may be taken down after a justified report.',
    ],
    age: 'Age rating',
    ageText: '16+. The site is not intended for distributing information prohibited for children.',
    contact: 'Contact the editors:',
  },
};

const Editorial: React.FC<{ lang: Language }> = ({ lang }) => {
  const d = ED[lang];
  const filled = d.rows.filter(([k]) => EDITORIAL[k].trim());
  return (
    <>
      {filled.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-1.5 text-sm" data-imprint>
          {filled.map(([k, label]) => (
            <React.Fragment key={k}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-semibold text-[#0f1b33]">{EDITORIAL[k]}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      <H>{d.sources}</H>
      <P>{d.sourcesText}</P>
      <H>{d.fix}</H>
      <UL items={d.fixList} />
      <H>{d.age}</H>
      <P>{d.ageText}</P>
      <P>{d.contact}</P>
      <ContactButtons lang={lang} />
    </>
  );
};

/**
 * Политика конфиденциальности (Закон КР «Об информации персонального характера»).
 * Черновик редакции — перед запуском его должен проверить юрист. Названия юрлица и адреса здесь нет: они появятся из настроек «Редакции».
 */
type Sec = [string, string[]];
const PRIVACY: Record<Language, { intro: string; secs: Sec[]; updated: string }> = {
  ru: {
    intro:
      'Эта политика объясняет, какие сведения о вас собирает сайт DataNews Кыргызстан, зачем и как мы их защищаем. Мы действуем по Закону Кыргызской Республики «Об информации персонального характера».',
    secs: [
      ['Какие сведения мы собираем', [
        'При регистрации организации или автора: имя, название организации, e-mail, телефон, выбранный тариф и номер платежа (если указан).',
        'При размещении публикации: её текст, фото, место, даты и контакты, которые вы сами указали для читателей.',
        'При обращении к редакции (жалоба, письмо): текст обращения и контакт для ответа.',
        'Читателям регистрироваться не нужно. Для общей статистики сайт учитывает просмотры страниц, тип устройства, язык и примерный город (по IP-адресу, без хранения самого адреса). Эти данные не позволяют узнать, кто вы.',
        'Если вы включили push-уведомления, браузер передаёт нам технический адрес подписки — только для отправки уведомлений.',
      ]],
      ['Зачем', [
        'Чтобы вести ваш личный кабинет, публиковать и модерировать ваши материалы, учитывать тариф и оплату.',
        'Чтобы связаться с вами по поводу публикации, оплаты или жалобы.',
        'Чтобы понимать, какие разделы полезны читателям (только обезличенная статистика).',
        'Мы не продаём и не передаём ваши данные третьим лицам для рекламы.',
      ]],
      ['Что видят другие', [
        'Читатели видят только то, что вы сами разместили в публикации (например, контакт организатора). E-mail и телефон из регистрации на сайте не показываются.',
      ]],
      ['Где и сколько хранятся', [
        'Данные хранятся у облачных поставщиков сайта (хостинг и база данных), серверы которых могут находиться за пределами Кыргызстана. Доступ защищён паролями и шифрованием; пароли хранятся только в зашифрованном (хэшированном) виде.',
        'Сведения аккаунта хранятся, пока аккаунт существует. После удаления аккаунта мы удаляем их, кроме того, что нужно хранить по закону (например, сведения об оплате).',
      ]],
      ['Ваши права', [
        'Узнать, какие сведения о вас хранятся, исправить их или попросить удалить.',
        'Отозвать согласие на обработку данных — тогда мы удалим аккаунт.',
        'Для этого напишите редакции через страницу «Связаться с DataNews».',
      ]],
      ['Согласие', [
        'Регистрируясь, вы подтверждаете, что прочитали эту политику и согласны на обработку ваших персональных данных для целей, указанных выше.',
        'Если политика изменится, мы обновим дату ниже, а о существенных изменениях сообщим зарегистрированным пользователям.',
      ]],
    ],
    updated: 'Редакция от 10 ноября 2026 г.',
  },
  kg: {
    intro:
      'Бул саясат DataNews Кыргызстан сайты сиз тууралуу кандай маалымат чогултарын, эмне үчүн жана аны кантип коргой турганыбызды түшүндүрөт. Биз Кыргыз Республикасынын «Жеке мүнөздөгү маалымат жөнүндө» мыйзамына ылайык иштейбиз.',
    secs: [
      ['Кандай маалымат чогултабыз', [
        'Уюм же автор катталганда: аты, уюмдун аталышы, e-mail, телефон, тандалган тариф жана төлөмдүн номери (көрсөтүлсө).',
        'Жарыя жайгаштырганда: анын тексти, сүрөтү, жери, даталары жана окурмандар үчүн өзүңүз көрсөткөн байланыштар.',
        'Редакцияга кайрылганда (даттануу, кат): кайрылуунун тексти жана жооп берүү үчүн байланыш.',
        'Окурмандарга катталуунун кереги жок. Жалпы статистика үчүн сайт барактардын көрүлүшүн, түзмөктүн түрүн, тилди жана болжолдуу шаарды (IP-дарек боюнча, даректин өзү сакталбайт) эсептейт. Бул маалыматтар сиздин ким экениңизди билүүгө мүмкүнчүлүк бербейт.',
        'Push-билдирүүлөрдү күйгүзсөңүз, браузер бизге жазылуунун техникалык дарегин берет — билдирүү жөнөтүү үчүн гана.',
      ]],
      ['Эмне үчүн', [
        'Жеке кабинетиңизди жүргүзүү, материалдарыңызды жарыялоо жана модерациялоо, тарифти жана төлөмдү эсепке алуу үчүн.',
        'Жарыя, төлөм же даттануу боюнча сиз менен байланышуу үчүн.',
        'Окурмандарга кайсы бөлүмдөр пайдалуу экенин түшүнүү үчүн (жеке маалыматсыз статистика гана).',
        'Биз сиздин маалыматтарыңызды сатпайбыз жана жарнама үчүн үчүнчү тараптарга бербейбиз.',
      ]],
      ['Башкалар эмнени көрөт', [
        'Окурмандар жарыяда өзүңүз жайгаштырганды гана көрөт (мисалы, уюштуруучунун байланышы). Каттоодогу e-mail жана телефон сайтта көрсөтүлбөйт.',
      ]],
      ['Кайда жана канча убакыт сакталат', [
        'Маалыматтар сайттын булут провайдерлеринде (хостинг жана маалымат базасы) сакталат, алардын серверлери Кыргызстандан тышкары жайгашышы мүмкүн. Кирүү сырсөздөр жана шифрлөө менен корголгон; сырсөздөр шифрленген (хэштелген) түрдө гана сакталат.',
        'Аккаунттун маалыматтары аккаунт бар кезде сакталат. Аккаунт өчүрүлгөндөн кийин биз аларды өчүрөбүз, мыйзам боюнча сакталышы керек болгондон тышкары (мисалы, төлөм тууралуу маалымат).',
      ]],
      ['Сиздин укуктарыңыз', [
        'Сиз тууралуу кандай маалымат сакталганын билүү, аны оңдоо же өчүрүүнү суроо.',
        'Маалыматтарды иштетүүгө макулдукту кайтарып алуу — анда биз аккаунтту өчүрөбүз.',
        'Ал үчүн «DataNews менен байланышуу» барагы аркылуу редакцияга жазыңыз.',
      ]],
      ['Макулдук', [
        'Катталуу менен сиз бул саясатты окуганыңызды жана жеке маалыматтарыңызды жогоруда көрсөтүлгөн максаттар үчүн иштетүүгө макул экениңизди тастыктайсыз.',
        'Саясат өзгөрсө, төмөндөгү датаны жаңылайбыз, ал эми маанилүү өзгөрүүлөр тууралуу катталган колдонуучуларга кабарлайбыз.',
      ]],
    ],
    updated: '2026-жылдын 10-ноябрындагы редакция.',
  },
  en: {
    intro:
      'This policy explains what information DataNews Kyrgyzstan collects about you, why, and how we protect it. We act under the Law of the Kyrgyz Republic “On Personal Information”.',
    secs: [
      ['What we collect', [
        'When an organization or author registers: name, organization name, e-mail, phone, chosen plan and payment reference (if given).',
        'When you post: its text, photos, place, dates and the contacts you chose to show readers.',
        'When you contact the editors (report, letter): the message and a contact for the reply.',
        'Readers do not need to register. For overall statistics the site counts page views, device type, language and approximate city (from the IP address, which is not stored). This does not identify you.',
        'If you enable push notifications, your browser gives us a technical subscription address — used only to send notifications.',
      ]],
      ['Why', [
        'To run your account, publish and moderate your posts, and track your plan and payment.',
        'To contact you about a post, payment or report.',
        'To understand which sections help readers (anonymous statistics only).',
        'We do not sell your data or pass it to third parties for advertising.',
      ]],
      ['What others see', ['Readers see only what you put in a post (for example, the organizer contact). Your registration e-mail and phone are not shown on the site.']],
      ['Where and how long', [
        'Data is kept with the site’s cloud providers (hosting and database), whose servers may be outside Kyrgyzstan. Access is protected by passwords and encryption; passwords are stored only hashed.',
        'Account data is kept while the account exists. After deletion we remove it, except what the law requires us to keep (for example, payment records).',
      ]],
      ['Your rights', ['Ask what data we hold, correct it or ask us to delete it.', 'Withdraw consent — we will then delete the account.', 'Write to the editors via “Contact DataNews”.']],
      ['Consent', [
        'By registering you confirm you have read this policy and agree to the processing of your personal data for the purposes above.',
        'If the policy changes, we update the date below and notify registered users of significant changes.',
      ]],
    ],
    updated: 'Version of 10 November 2026.',
  },
};

export const PrivacyText: React.FC<{ lang: Language }> = ({ lang }) => {
  const p = PRIVACY[lang];
  return (
    <div className="space-y-3" data-privacy>
      <P>{p.intro}</P>
      {p.secs.map(([h, items]) => (
        <React.Fragment key={h}>
          <H>{h}</H>
          <UL items={items} />
        </React.Fragment>
      ))}
      <p className="text-xs text-gray-500">{p.updated}</p>
    </div>
  );
};

export const InfoPage: React.FC<{ view: InfoView; lang: Language; onNavigate: (v: ViewMode) => void }> = ({ view, lang, onNavigate }) => {
  useEffect(() => {
    document.title = `${TITLES[view][lang]} — DataNews Kyrgyzstan`;
    window.scrollTo(0, 0);
  }, [view, lang]);
  const tabs: InfoView[] = EDITORIAL_PAGE_VISIBLE ? ['about', 'rules', 'privacy', 'editorial', 'contacts'] : ['about', 'rules', 'privacy', 'contacts'];
  return (
    <div className="w-full max-w-[960px] mx-auto px-4 md:px-6 py-8">
      <button onClick={() => onNavigate('home')} className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-4">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        {lang === 'kg' ? 'Башкы бет' : lang === 'en' ? 'Home' : 'Главная'}
      </button>
      <nav className="flex flex-wrap gap-1 mb-5" aria-label={TITLES.about[lang]}>
        {tabs.map((tb) => (
          <button
            key={tb}
            onClick={() => onNavigate(tb)}
            aria-current={tb === view ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tb === view ? 'bg-[#12327A] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            {TITLES[tb][lang]}
          </button>
        ))}
      </nav>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1b33] mb-4">{TITLES[view][lang]}</h1>
      <div className="space-y-3">
        {view === 'about' && ABOUT[lang]}
        {view === 'rules' && RULES[lang]}
        {view === 'editorial' && EDITORIAL_PAGE_VISIBLE && <Editorial lang={lang} />}
        {view === 'privacy' && <PrivacyText lang={lang} />}
        {view === 'contacts' && (
          <>
            <P>
              {lang === 'kg'
                ? 'Жарыя жайгаштыруу, ката тууралуу билдирүү же кызматташуу боюнча редакцияга жазыңыз:'
                : lang === 'en'
                ? 'Message the editors to post a notice, report a mistake or discuss cooperation:'
                : 'Напишите редакции, чтобы разместить объявление, сообщить об ошибке или обсудить сотрудничество:'}
            </P>
            <ContactButtons lang={lang} />
            <p className="text-xs text-gray-500">
              {lang === 'kg'
                ? 'DataNews — шашылыш кызмат эмес. Коркунучтуу кырдаалда 112 номерине чалыңыз.'
                : lang === 'en'
                ? 'DataNews is not an emergency service. In an emergency call 112.'
                : 'DataNews — не экстренная служба. В опасной ситуации звоните 112.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
