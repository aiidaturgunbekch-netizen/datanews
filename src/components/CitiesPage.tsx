import React, { useState } from 'react';
import { Announcement, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';

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

  const regionsData: { id: CityId; name: string; regionTitle: string; population: string; desc: string; mayorInfo: string }[] = [
    {
      id: 'bishkek',
      name: t('cities.bishkek'),
      regionTitle: 'Столица Кыргызской Республики • Чуйская долина',
      population: '1 150 000+ жителей',
      desc: 'Главный административный, экономический и научно-культурный центр страны. Включает Первомайский, Ленинский, Свердловский и Октябрьский административные районы.',
      mayorInfo: 'Мэрия города Бишкек • Колл-центр 1840 / 1850 (круглосуточно) • WhatsApp 0554 182 185',
    },
    {
      id: 'osh',
      name: t('cities.osh'),
      regionTitle: 'Южная столица • Ошская область',
      population: '360 000+ жителей',
      desc: 'Древнейший город на Великом шелковом пути у подножия священной горы Сулайман-Тоо. Крупнейший промышленный и транспортный узел юга республики.',
      mayorInfo: 'Мэрия города Ош • ул. Ленина, 221 • oshcity.gov.kg',
    },
    {
      id: 'jalalabad',
      name: t('cities.jalalabad'),
      regionTitle: 'Жалал-Абадская область • Курортный кластер',
      population: '120 000+ жителей',
      desc: 'Известен своими бальнеологическими санаториями, минеральными источниками, орехово-плодовыми лесами Арсланбоба и промышленными предприятиями.',
      mayorInfo: 'Мэрия города Жалал-Абад',
    },
    {
      id: 'karakol',
      name: t('cities.karakol'),
      regionTitle: 'Иссык-Кульская область • Восточное Прииссыккулье',
      population: '85 000+ жителей',
      desc: 'Туристическая столица восточного Тянь-Шаня, отправная точка для треккинговых маршрутов, горнолыжной базы Каракол и ущелий Ала-Куль и Алтын-Арашан.',
      mayorInfo: 'Мэрия города Каракол • Визит-центр Ысык-Көл',
    },
    {
      id: 'talas',
      name: t('cities.talas'),
      regionTitle: 'Таласская область • Северо-западная долина',
      population: '40 000+ жителей',
      desc: 'Родина легендарного эпоса «Манас» и комплекса «Манас Ордо». Центр фасолевого растениеводства и садоводства.',
      mayorInfo: 'Мэрия города Талас',
    },
    {
      id: 'naryn',
      name: t('cities.naryn'),
      regionTitle: 'Нарынская область • Внутренний Тянь-Шань',
      population: '42 000+ жителей',
      desc: 'Высокогорный город на берегах бурной реки Нарын. Важный транзитный узел трассы Бишкек — Торугарт в направлении Китая.',
      mayorInfo: 'Мэрия города Нарын',
    },
    {
      id: 'batken',
      name: t('cities.batken'),
      regionTitle: 'Баткенская область • Юго-западный рубеж',
      population: '30 000+ жителей',
      desc: 'Славится цветком Айгүл, плантациями сладкого урюка и уникальными горными хребтами Памиро-Алая.',
      mayorInfo: 'Полномочное представительство в Баткенской области',
    },
  ];

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
          Муниципальные ленты открытых данных, коммунальные предупреждения и афиша по регионам Кыргызстана
        </p>
      </div>

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
            <span className="text-xs font-bold uppercase tracking-wider text-[#00897b] block mb-1">
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
                <span className="material-symbols-outlined text-[16px] text-gray-400">group</span>
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
              Показать ленту {currentRegion.name}
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
              <span>Предупреждения и ремонтные работы</span>
            </h3>
            <span className="text-xs text-gray-400 font-bold">{alertItems.length}</span>
          </div>

          {alertItems.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
              В данном городе нет активных коммунальных аварий или дорожных перекрытий.
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
                    <span className="text-gray-400">
                      {new Date(item.startDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f1b33] group-hover:text-[#12327A] mb-1">
                    {item.title[currentLanguage] || item.title.ru}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.summary[currentLanguage] || item.summary.ru}
                  </p>
                  <span className="text-xs font-semibold text-[#12327A] group-hover:underline flex items-center gap-1">
                    <span>Подробнее</span>
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
              <span className="material-symbols-outlined text-[#00897b] text-[20px]">
                event
              </span>
              <span>Афиша и городские события</span>
            </h3>
            <span className="text-xs text-gray-400 font-bold">{eventItems.length}</span>
          </div>

          {eventItems.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
              На ближайшие дни в городе нет зарегистрированных культурных мероприятий.
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
                    <span className="font-bold text-[#00897b] uppercase text-[10px]">
                      {t(`categories.${item.category}`)}
                    </span>
                    <span className="text-gray-400">
                      {new Date(item.startDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f1b33] group-hover:text-[#12327A] mb-1">
                    {item.title[currentLanguage] || item.title.ru}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.summary[currentLanguage] || item.summary.ru}
                  </p>
                  <span className="text-xs font-semibold text-[#12327A] group-hover:underline flex items-center gap-1">
                    <span>Подробнее</span>
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
