import React from 'react';
import { Language, CityId } from '../types';
import { getTranslation } from '../locales/translations';

interface CityMosaicProps {
  currentLanguage: Language;
  onSelectCity: (cityId: CityId) => void;
  onOpenAllCities: () => void;
}

export const CityMosaic: React.FC<CityMosaicProps> = ({
  currentLanguage,
  onSelectCity,
  onOpenAllCities,
}) => {
  const { t } = getTranslation(currentLanguage);

  const cityCards = [
    {
      id: 'bishkek' as CityId,
      colSpan: 'lg:col-span-2',
      name: currentLanguage === 'kg' ? 'Бишкек шаары' : currentLanguage === 'en' ? 'Bishkek City' : 'г. Бишкек',
      subtitle: currentLanguage === 'kg' ? 'Борбор калаа, 4 район: Ленин, Биринчи май, Свердлов, Октябрь' : currentLanguage === 'en' ? 'Capital municipality, 4 districts' : 'Столичный муниципалитет, 4 района: Ленинский, Первомайский, Свердловский, Октябрьский',
      alerts: '12 предупреждений',
      events: '78 событий',
      bgGradient: 'from-[#0d2459] to-[#1e3a8a]',
    },
    {
      id: 'osh' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Ош шаары' : currentLanguage === 'en' ? 'Osh City' : 'г. Ош',
      subtitle: currentLanguage === 'kg' ? 'Түштүк борбор • Сулайман-Тоо' : currentLanguage === 'en' ? 'Southern Capital • Sulaiman-Too' : 'Южная столица • Сулайман-Тоо',
      alerts: '5 предупреждений',
      events: '24 события',
      bgGradient: 'from-[#07173d] to-[#1e293b]',
    },
    {
      id: 'jalalabad' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Жалал-Абад' : currentLanguage === 'en' ? 'Jalal-Abad' : 'Жалал-Абад',
      subtitle: currentLanguage === 'kg' ? 'Курорттук аймак жана өнөр жай' : currentLanguage === 'en' ? 'Resort Valley & Industry' : 'Курортная зона и индустрия',
      events: '14 событий',
      bgGradient: 'from-[#004d40] to-[#0f766e]',
    },
    {
      id: 'karakol' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Каракол' : currentLanguage === 'en' ? 'Karakol' : 'Каракол',
      subtitle: currentLanguage === 'kg' ? 'Ысык-Көл • Тоо кластери' : currentLanguage === 'en' ? 'Issyk-Kul • Alpine Hub' : 'Ысык-Көл • Горный кластер',
      events: '18 событий',
      bgGradient: 'from-[#1e1b4b] to-[#312e81]',
    },
    {
      id: 'talas' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Талас' : currentLanguage === 'en' ? 'Talas' : 'Талас',
      subtitle: currentLanguage === 'kg' ? 'Манас Ордосу • Түндүк-батыш' : currentLanguage === 'en' ? 'Manas Ordo • North-West' : 'Манас Ордосу • Северо-запад',
      events: '6 событий',
      bgGradient: 'from-[#3b1259] to-[#581c87]',
    },
    {
      id: 'naryn' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Нарын' : currentLanguage === 'en' ? 'Naryn' : 'Нарын',
      subtitle: currentLanguage === 'kg' ? 'Теңир-Тоо • Тоолуу облус' : currentLanguage === 'en' ? 'Tengir-Too • Mountain Basin' : 'Теңир-Тоо • Горная область',
      events: '9 событий',
      bgGradient: 'from-[#701a75] to-[#86198f]',
    },
    {
      id: 'batken' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Баткен' : currentLanguage === 'en' ? 'Batken' : 'Баткен',
      subtitle: currentLanguage === 'kg' ? 'Айгүл тоосу • Түштүк-батыш' : currentLanguage === 'en' ? 'Aigul Mountain • South-West' : 'Айгүл тоосу • Юго-запад',
      events: '5 событий',
      bgGradient: 'from-[#831843] to-[#9f1239]',
    },
  ];

  return (
    <section className="w-full py-12 bg-white border-t border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[#00897b] text-xs font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>
                {currentLanguage === 'kg'
                  ? 'Аймактык маалымат тасмалары'
                  : currentLanguage === 'en'
                  ? 'Regional Civic Feeds'
                  : 'Региональные ленты данных'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f1b33] tracking-tight">
              {t('sections.citiesTitle')}
            </h2>
            <p className="text-sm text-gray-500 max-w-xl mt-1">
              {t('sections.citiesSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAllCities}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#12327A] hover:text-[#0a1e4a] transition-colors"
          >
            <span>{t('sections.viewAllCities')}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cityCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onSelectCity(card.id)}
              className={`${card.colSpan} relative rounded-2xl overflow-hidden min-h-[190px] shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer border border-gray-100 bg-gradient-to-br ${card.bgGradient}`}
            >
              <div className="relative z-10 p-5 h-full flex flex-col justify-end text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {card.alerts && (
                    <span className="px-2 py-0.5 rounded-md bg-[#dc2626] text-[10px] font-bold uppercase tracking-wider">
                      {card.alerts}
                    </span>
                  )}
                  {card.events && (
                    <span className="px-2 py-0.5 rounded-md bg-[#20C7B5] text-[#002f29] text-[10px] font-bold uppercase tracking-wider">
                      {card.events}
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mb-0.5 text-white">
                  {card.name}
                </h3>
                <p className="text-xs text-[#dbe1ff] mb-3 line-clamp-1">
                  {card.subtitle}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs font-bold text-[#68f9e5]">
                  <span>
                    {currentLanguage === 'kg'
                      ? 'Тасмага өтүү'
                      : currentLanguage === 'en'
                      ? 'View city feed'
                      : 'Перейти к ленте'}
                  </span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
