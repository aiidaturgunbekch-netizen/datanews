import React, { lazy, Suspense, useState } from 'react';
import { Announcement, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { formatDayMonth } from '../utils/dates';

// Интерактивная карта (перенесена сюда с главной вместе с удалённым блоком «Обзор по городам»)
const KyrgyzstanLiveMap = lazy(() => import('./KyrgyzstanLiveMap'));

interface CitiesPageProps {
  currentLanguage: Language;
  announcements: Announcement[];
  onSelectCityFilter: (city: CityId) => void;
  onSelectAnnouncement: (ann: Announcement) => void;
  onBackToHome: () => void;
}

export const CitiesPage: React.FC<CitiesPageProps> = ({
  currentLanguage,
  announcements,
  onSelectCityFilter,
  onSelectAnnouncement,
  onBackToHome,
}) => {
  const { t } = getTranslation(currentLanguage);
  const [activeCityTab, setActiveCityTab] = useState<CityId>('bishkek');

  type Tr = { ru: string; kg: string; en: string };
  const regions: { id: CityId; regionTitle: Tr; population: Tr; desc: Tr; mayorInfo: Tr }[] = [
    {
      id: 'bishkek',
      regionTitle: { ru: 'Столица Кыргызской Республики • Чуйская долина', kg: 'Кыргыз Республикасынын борбору • Чүй өрөөнү', en: 'Capital of the Kyrgyz Republic • Chui Valley' },
      population: { ru: '1 150 000+ жителей', kg: '1 150 000+ тургун', en: '1,150,000+ residents' },
      desc: {
        ru: 'Главный административный, экономический и научно-культурный центр страны. Включает Первомайский, Ленинский, Свердловский и Октябрьский административные районы.',
        kg: 'Өлкөнүн негизги административдик, экономикалык, илимий жана маданий борбору. Биринчи Май, Ленин, Свердлов жана Октябрь райондорунан турат.',
        en: 'The country’s main administrative, economic, scientific and cultural centre, made up of the Pervomaisky, Leninsky, Sverdlovsky and Oktyabrsky districts.',
      },
      mayorInfo: {
        ru: 'Мэрия города Бишкек • Колл-центр 1840 / 1850 (круглосуточно) • WhatsApp 0554 182 185',
        kg: 'Бишкек шаарынын мэриясы • Колл-борбор 1840 / 1850 (күнү-түнү) • WhatsApp 0554 182 185',
        en: 'Bishkek City Hall • Call centre 1840 / 1850 (24/7) • WhatsApp 0554 182 185',
      },
    },
    {
      id: 'osh',
      regionTitle: { ru: 'Южная столица • Ошская область', kg: 'Түштүк борбор • Ош облусу', en: 'Southern capital • Osh Region' },
      population: { ru: '360 000+ жителей', kg: '360 000+ тургун', en: '360,000+ residents' },
      desc: {
        ru: 'Древнейший город на Великом шелковом пути у подножия священной горы Сулайман-Тоо. Крупнейший промышленный и транспортный узел юга республики.',
        kg: 'Улуу Жибек жолундагы ыйык Сулайман-Тоонун этегинде жайгашкан байыркы шаар. Республиканын түштүгүндөгү эң ири өнөр жай жана транспорт түйүнү.',
        en: 'An ancient Silk Road city at the foot of the sacred Sulaiman-Too mountain and the largest industrial and transport hub in the south.',
      },
      mayorInfo: {
        ru: 'Мэрия города Ош • ул. Ленина, 221 • oshcity.gov.kg',
        kg: 'Ош шаарынын мэриясы • Ленин көч., 221 • oshcity.gov.kg',
        en: 'Osh City Hall • 221 Lenin St • oshcity.gov.kg',
      },
    },
    {
      id: 'chui',
      regionTitle: { ru: 'Окружает г. Бишкек • 8 районов', kg: 'Бишкек шаарын курчайт • 8 район', en: 'Surrounds Bishkek • 8 districts' },
      population: { ru: 'Аламудунский, Жайыльский, Кеминский, Московский, Панфиловский, Сокулукский, Ысык-Атинский, Чуйский районы', kg: 'Аламүдүн, Жайыл, Кемин, Москва, Панфилов, Сокулук, Ысык-Ата, Чүй райондору', en: 'Alamudun, Jaiyl, Kemin, Moskva, Panfilov, Sokuluk, Ysyk-Ata and Chui districts' },
      desc: {
        ru: 'Самая населённая область страны. Здесь — пригородные сёла и айылные аймаки вокруг Бишкека, трассы на Талас, Иссык-Куль и в Казахстан.',
        kg: 'Өлкөнүн эң калктуу облусу: Бишкектин айланасындагы айылдар жана айыл аймактар, Таласка, Ысык-Көлгө жана Казакстанга кеткен трассалар.',
        en: 'The most populous region: the villages and aiyl aimaks around Bishkek and the roads to Talas, Issyk-Kul and Kazakhstan.',
      },
      mayorInfo: { ru: 'Полномочное представительство Президента в Чуйской области', kg: 'Президенттин Чүй облусундагы ыйгарым укуктуу өкүлчүлүгү', en: 'Presidential Plenipotentiary Office in Chui Region' },
    },
    {
      id: 'osh_region',
      regionTitle: { ru: 'Отдельно от г. Ош • 7 районов', kg: 'Ош шаарынан өзүнчө • 7 район', en: 'Separate from Osh City • 7 districts' },
      population: { ru: 'Алайский, Араванский, Кара-Кульджинский, Кара-Суйский, Ноокатский, Узгенский, Чон-Алайский районы', kg: 'Алай, Араван, Кара-Кулжа, Кара-Суу, Ноокат, Өзгөн, Чоң-Алай райондору', en: 'Alay, Aravan, Kara-Kulja, Kara-Suu, Nookat, Uzgen and Chon-Alay districts' },
      desc: {
        ru: 'Горные районы юга страны, трасса Ош — Сары-Таш — Иркештам и перевалы Памиро-Алая. Объявления города Ош смотрите отдельно.',
        kg: 'Өлкөнүн түштүгүндөгү тоолуу райондор, Ош — Сары-Таш — Эркечтам трассасы жана Памир-Алайдын ашуулары. Ош шаарынын жарыяларын өзүнчө караңыз.',
        en: 'The mountain districts of the south, the Osh – Sary-Tash – Irkeshtam road and the Pamir-Alay passes. Osh City notices are listed separately.',
      },
      mayorInfo: { ru: 'Полномочное представительство Президента в Ошской области', kg: 'Президенттин Ош облусундагы ыйгарым укуктуу өкүлчүлүгү', en: 'Presidential Plenipotentiary Office in Osh Region' },
    },
    {
      id: 'jalalabad',
      regionTitle: { ru: 'Жалал-Абадская область • Курортный кластер', kg: 'Жалал-Абад облусу • Курорттук аймак', en: 'Jalal-Abad Region • Resort cluster' },
      population: { ru: '120 000+ жителей', kg: '120 000+ тургун', en: '120,000+ residents' },
      desc: {
        ru: 'Известен своими бальнеологическими санаториями, минеральными источниками, орехово-плодовыми лесами Арсланбоба и промышленными предприятиями.',
        kg: 'Бальнеологиялык санаторийлери, минералдык булактары, Арстанбаптын жаңгак-мөмө токойлору жана өнөр жай ишканалары менен белгилүү.',
        en: 'Known for its spa sanatoriums, mineral springs, the walnut forests of Arslanbob and its industry.',
      },
      mayorInfo: { ru: 'Мэрия города Жалал-Абад', kg: 'Жалал-Абад шаарынын мэриясы', en: 'Jalal-Abad City Hall' },
    },
    {
      id: 'issykkul',
      regionTitle: { ru: 'Административный центр — г. Каракол', kg: 'Административдик борбору — Каракол ш.', en: 'Administrative centre: Karakol' },
      population: { ru: 'Каракол: 85 000+ жителей', kg: 'Каракол: 85 000+ тургун', en: 'Karakol: 85,000+ residents' },
      desc: {
        ru: 'Туристическая столица восточного Тянь-Шаня, отправная точка для треккинговых маршрутов, горнолыжной базы Каракол и ущелий Ала-Куль и Алтын-Арашан.',
        kg: 'Чыгыш Теңир-Тоонун туристтик борбору: треккинг маршруттарынын, Каракол тоо лыжа базасынын, Ала-Көл жана Алтын-Арашан капчыгайларынын башталышы.',
        en: 'The tourist capital of the eastern Tian Shan and the gateway to trekking routes, the Karakol ski base and the Ala-Kul and Altyn-Arashan gorges.',
      },
      mayorInfo: { ru: 'Мэрия города Каракол', kg: 'Каракол шаарынын мэриясы', en: 'Karakol City Hall' },
    },
    {
      id: 'talas',
      regionTitle: { ru: 'Таласская область • Северо-западная долина', kg: 'Талас облусу • Түндүк-батыш өрөөнү', en: 'Talas Region • North-western valley' },
      population: { ru: '40 000+ жителей', kg: '40 000+ тургун', en: '40,000+ residents' },
      desc: {
        ru: 'Родина легендарного эпоса «Манас» и комплекса «Манас Ордо». Центр фасолевого растениеводства и садоводства.',
        kg: '«Манас» эпосунун мекени жана «Манас Ордо» комплекси жайгашкан жер. Төө буурчак өстүрүүнүн жана багбанчылыктын борбору.',
        en: 'Homeland of the Manas epic and the Manas Ordo complex, and a centre of bean growing and horticulture.',
      },
      mayorInfo: { ru: 'Мэрия города Талас', kg: 'Талас шаарынын мэриясы', en: 'Talas City Hall' },
    },
    {
      id: 'naryn',
      regionTitle: { ru: 'Нарынская область • Внутренний Тянь-Шань', kg: 'Нарын облусу • Ички Теңир-Тоо', en: 'Naryn Region • Inner Tian Shan' },
      population: { ru: '42 000+ жителей', kg: '42 000+ тургун', en: '42,000+ residents' },
      desc: {
        ru: 'Высокогорный город на берегах бурной реки Нарын. Важный транзитный узел трассы Бишкек — Торугарт в направлении Китая.',
        kg: 'Шардуу Нарын дарыясынын жээгиндеги бийик тоолуу шаар. Кытайды көздөй кеткен Бишкек — Торугарт трассасындагы маанилүү транзиттик түйүн.',
        en: 'A high-mountain town on the fast-flowing Naryn River and a key transit point on the Bishkek – Torugart road to China.',
      },
      mayorInfo: { ru: 'Мэрия города Нарын', kg: 'Нарын шаарынын мэриясы', en: 'Naryn City Hall' },
    },
    {
      id: 'batken',
      regionTitle: { ru: 'Баткенская область • Юго-западный рубеж', kg: 'Баткен облусу • Түштүк-батыш чек ара', en: 'Batken Region • South-western frontier' },
      population: { ru: '30 000+ жителей', kg: '30 000+ тургун', en: '30,000+ residents' },
      desc: {
        ru: 'Славится цветком Айгуль, плантациями сладкого урюка и уникальными горными хребтами Памиро-Алая.',
        kg: 'Айгүл гүлү, таттуу өрүк бактары жана Памир-Алайдын өзгөчө тоо кыркалары менен даңазалуу.',
        en: 'Famous for the Aigul flower, sweet apricot orchards and the striking ranges of the Pamir-Alay.',
      },
      mayorInfo: {
        ru: 'Полномочное представительство Президента в Баткенской области',
        kg: 'Президенттин Баткен облусундагы ыйгарым укуктуу өкүлчүлүгү',
        en: 'Presidential Plenipotentiary Office in Batken Region',
      },
    },
  ];
  const regionsData = regions.map((r) => ({
    id: r.id,
    name: t(`cities.${r.id}`),
    regionTitle: r.regionTitle[currentLanguage],
    population: r.population[currentLanguage],
    desc: r.desc[currentLanguage],
    mayorInfo: r.mayorInfo[currentLanguage],
  }));

  const ui = {
    subtitle: {
      ru: 'Муниципальные ленты открытых данных, коммунальные предупреждения и афиша по регионам Кыргызстана',
      kg: 'Кыргызстандын аймактары боюнча муниципалдык ачык маалыматтар, коммуналдык эскертүүлөр жана афиша',
      en: 'Municipal open-data feeds, utility alerts and events across the regions of Kyrgyzstan',
    },
    showFeed: { ru: 'Показать ленту', kg: 'Тасманы көрсөтүү', en: 'Show feed' },
    alerts: { ru: 'Предупреждения и ремонтные работы', kg: 'Эскертүүлөр жана оңдоо иштери', en: 'Alerts & repair works' },
    noAlerts: {
      ru: 'В этом городе нет коммунальных аварий или перекрытий дорог.',
      kg: 'Бул шаарда коммуналдык авариялар же жол жабуулар жок.',
      en: 'No utility outages or road closures in this city.',
    },
    events: { ru: 'Афиша и городские события', kg: 'Афиша жана шаардык иш-чаралар', en: 'Events & city life' },
    noEvents: {
      ru: 'На ближайшие дни в городе нет зарегистрированных мероприятий.',
      kg: 'Жакынкы күндөрү шаарда катталган иш-чаралар жок.',
      en: 'No events registered in this city for the coming days.',
    },
  };

  const currentRegion = regionsData.find((r) => r.id === activeCityTab) || regionsData[0];
  const cityItems = announcements.filter((a) => a.city === activeCityTab);
  const alertItems = cityItems.filter((a) => a.urgency === 'emergency' || a.urgency === 'planned');
  const eventItems = cityItems.filter((a) => a.urgency === 'event' || a.urgency === 'regular');

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBackToHome}
          className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-2"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>{t('nav.home')}</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1b33]">
          {t('sections.citiesTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {ui.subtitle[currentLanguage]}
        </p>
      </div>

      <Suspense fallback={<div className="mb-8 h-[460px] rounded-2xl bg-[#f6f8fd] border border-gray-100" />}>
        <div className="mb-8 [&>figure]:mt-0">
          <KyrgyzstanLiveMap
            lang={currentLanguage}
            announcements={announcements}
            onSelect={(id) => {
              onSelectCityFilter(id);
            }}
            onOpen={onSelectAnnouncement}
          />
        </div>
      </Suspense>

      {/* City Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-6">
        {regionsData.map((reg) => {
          const isSelected = activeCityTab === reg.id;
          const count = announcements.filter((a) => a.city === reg.id).length;

          return (
            <button
              key={reg.id}
              onClick={() => setActiveCityTab(reg.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#12327A] text-white shadow-sm ring-2 ring-[#12327A]/20'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{reg.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* City Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00796b] block mb-1">
              {currentRegion.regionTitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f1b33] mb-2">
              {currentRegion.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
              {currentRegion.desc}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-gray-500">group</span>
                <span>{currentRegion.population}</span>
              </span>
              <span className="flex items-center gap-1 text-[#12327A]">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{currentRegion.mayorInfo}</span>
              </span>
            </div>
          </div>

          <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                onSelectCityFilter(activeCityTab);
                onBackToHome();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-xs sm:text-sm hover:bg-[#1bb3a2] transition-colors shadow-2xs flex-1 sm:flex-none text-center"
            >
              {ui.showFeed[currentLanguage]}: {currentRegion.name}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Announcements for Selected City */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Alerts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-[#0f1b33] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#dc2626] text-[20px]">
                warning
              </span>
              <span>{ui.alerts[currentLanguage]}</span>
            </h3>
            <span className="text-xs text-gray-500 font-bold">{alertItems.length}</span>
          </div>

          {alertItems.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-500">
              {ui.noAlerts[currentLanguage]}
            </div>
          ) : (
            <div className="space-y-3">
              {alertItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAnnouncement(item)}
                  className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#dc2626] uppercase text-[10px]">
                      {t(`categories.${item.category}`)}
                    </span>
                    <span className="text-gray-500">
                      {formatDayMonth(item.startDate, currentLanguage)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f1b33] group-hover:text-[#12327A] mb-1">
                    {item.title[currentLanguage] || item.title.ru}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.summary[currentLanguage] || item.summary.ru}
                  </p>
                  <span className="text-xs font-semibold text-[#12327A] group-hover:underline flex items-center gap-1">
                    <span>{t('nav.more')}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-[#0f1b33] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00796b] text-[20px]">
                event
              </span>
              <span>{ui.events[currentLanguage]}</span>
            </h3>
            <span className="text-xs text-gray-500 font-bold">{eventItems.length}</span>
          </div>

          {eventItems.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-500">
              {ui.noEvents[currentLanguage]}
            </div>
          ) : (
            <div className="space-y-3">
              {eventItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAnnouncement(item)}
                  className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#00796b] uppercase text-[10px]">
                      {t(`categories.${item.category}`)}
                    </span>
                    <span className="text-gray-500">
                      {formatDayMonth(item.startDate, currentLanguage)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f1b33] group-hover:text-[#12327A] mb-1">
                    {item.title[currentLanguage] || item.title.ru}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.summary[currentLanguage] || item.summary.ru}
                  </p>
                  <span className="text-xs font-semibold text-[#12327A] group-hover:underline flex items-center gap-1">
                    <span>{t('nav.more')}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
