import React, { useEffect } from 'react';
import { Language, ViewMode } from '../types';
import { ContactButtons } from './ContactButtons';

/** Публичные информационные страницы. «Источники информации» и «Политика конфиденциальности» из интерфейса убраны */
export type InfoView = 'about' | 'rules' | 'contacts';
type L3 = Record<Language, string>;

const TITLES: Record<InfoView, L3> = {
  about: { ru: 'О проекте', kg: 'Долбоор жөнүндө', en: 'About' },
  rules: { ru: 'Правила публикации', kg: 'Жарыялоо эрежелери', en: 'Publishing rules' },
  contacts: { ru: 'Связаться с DataNews', kg: 'DataNews менен байланышуу', en: 'Contact DataNews' },
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
      <P>
        DataNews Kyrgyzstan — информационная платформа: предупреждения об отключениях и опасной погоде, ограничения на дорогах и перевалах,
        государственные решения и изменения законов, события и афиша по всем регионам страны.
      </P>
      <P>
        DataNews не является государственным органом. Первоисточник официальных решений, предупреждений и прогнозов — соответствующее
        государственное учреждение; у каждой публикации указаны источник, дата публикации и дата последней проверки.
      </P>
      <H>Как мы работаем</H>
      <UL
        items={[
          'Официальные источники (мэрии, министерства, Кыргызгидромет, МЧС) — в приоритете; сведения СМИ помечаются как СМИ.',
          'Мы не публикуем выдуманные события и не выдаём заявления или обещания за принятые решения.',
          'Устаревшие предупреждения автоматически уходят из списка действующих, но остаются в архиве.',
          'Нашли ошибку? Нажмите «Пожаловаться» в карточке или напишите редакции.',
        ]}
      />
    </>
  ),
  kg: (
    <>
      <P>
        DataNews Kyrgyzstan — маалымат платформасы: өчүрүүлөр жана коркунучтуу аба ырайы тууралуу эскертүүлөр, жолдордогу жана ашуулардагы
        чектөөлөр, мамлекеттик чечимдер жана мыйзам өзгөрүүлөрү, өлкөнүн баардык аймактарындагы иш-чаралар.
      </P>
      <P>
        DataNews мамлекеттик орган эмес. Расмий чечимдердин, эскертүүлөрдүн жана божомолдордун түпкү булагы — тиешелүү мамлекеттик мекеме;
        ар бир жарыяда булак, жарыяланган күнү жана акыркы текшерүү күнү көрсөтүлөт.
      </P>
      <H>Кантип иштейбиз</H>
      <UL
        items={[
          'Расмий булактар (мэриялар, министрликтер, Кыргызгидромет, ӨКМ) — биринчи кезекте; ЖМКнын маалыматы ЖМК катары белгиленет.',
          'Ойдон чыгарылган окуяларды жарыяланбайбыз жана билдирүүлөрдү же убадаларды кабыл алынган чечим катары көрсөтпөйбүз.',
          'Мөөнөтү бүткөн эскертүүлөр күчүндөгүлөрдүн тизмесинен автоматтык түрдө чыгат, бирок архивде калат.',
          'Ката таптыңызбы? Карточкадагы «Даттануу» баскычын басыңыз же редакцияга жазыңыз.',
        ]}
      />
    </>
  ),
  en: (
    <>
      <P>
        DataNews Kyrgyzstan is an information platform: outage and severe-weather warnings, road and mountain-pass restrictions, government decisions
        and law changes, and events across every region of the country.
      </P>
      <P>
        DataNews is not a government body. The primary source of official decisions, warnings and forecasts is the responsible state institution; every post
        shows its source, publication date and the date it was last checked.
      </P>
      <H>How we work</H>
      <UL
        items={[
          'Official sources (city halls, ministries, Kyrgyzhydromet, Emergency Ministry) come first; media reports are labelled as media.',
          'We do not publish invented events, and we never present statements or promises as decisions taken.',
          'Expired warnings leave the active list automatically but stay in the archive.',
          'Found a mistake? Press “Report” on the card or message the editors.',
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

export const InfoPage: React.FC<{ view: InfoView; lang: Language; onNavigate: (v: ViewMode) => void }> = ({ view, lang, onNavigate }) => {
  useEffect(() => {
    document.title = `${TITLES[view][lang]} — DataNews Kyrgyzstan`;
    window.scrollTo(0, 0);
  }, [view, lang]);
  const tabs: InfoView[] = ['about', 'rules', 'contacts'];
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
