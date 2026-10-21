import React from 'react';
import { Announcement, Language, CityId } from '../types';
import { getTranslation } from '../locales/translations';
import { isFresh } from '../utils/statusUtils';
import { KyrgyzstanMap } from './KyrgyzstanMap';

interface CityMosaicProps {
  announcements: Announcement[];
  currentLanguage: Language;
  onSelectCity: (cityId: CityId) => void;
  onOpenAllCities: () => void;
}

/** «1 предупреждение / 3 предупреждения / 5 предупреждений», «5 эскертүү», «5 alerts» */
const countLabel = (n: number, kind: 'alert' | 'event', lang: Language) => {
  if (lang === 'kg') return `${n} ${kind === 'alert' ? 'эскертүү' : 'иш-чара'}`;
  if (lang === 'en') return `${n} ${kind}${n === 1 ? '' : 's'}`;
  const forms = kind === 'alert' ? ['предупреждение', 'предупреждения', 'предупреждений'] : ['событие', 'события', 'событий'];
  const m10 = n % 10;
  const m100 = n % 100;
  const f = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2;
  return `${n} ${forms[f]}`;
};

export const CityMosaic: React.FC<CityMosaicProps> = ({
  announcements,
  currentLanguage,
  onSelectCity,
  onOpenAllCities,
}) => {
  const { t } = getTranslation(currentLanguage);

  // Реальное число предупреждений и событий по городу (без завершённых и отменённых)
  const counts = (city: CityId) => {
    // только актуальное — как в ленте на главной
    const list = announcements.filter((x) => x.city === city && isFresh(x));
    const isAlert = (x: Announcement) => x.urgency === 'emergency' || x.urgency === 'planned';
    return { alerts: list.filter(isAlert).length, events: list.filter((x) => !isAlert(x)).length };
  };

  const cityCards = [
    {
      id: 'bishkek' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Бишкек шаары' : currentLanguage === 'en' ? 'Bishkek City' : 'г. Бишкек',
      subtitle: currentLanguage === 'kg' ? 'Борбор калаа, 4 район: Ленин, Биринчи Май, Свердлов, Октябрь' : currentLanguage === 'en' ? 'Capital municipality, 4 districts' : 'Столичный муниципалитет, 4 района: Ленинский, Первомайский, Свердловский, Октябрьский',
      bgGradient: 'from-[#0d2459] to-[#1e3a8a]',
    },
    {
      id: 'chui' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Чүй облусу' : currentLanguage === 'en' ? 'Chui Region' : 'Чуйская обл.',
      subtitle: currentLanguage === 'kg' ? '8 район • Бишкектин айланасы' : currentLanguage === 'en' ? '8 districts around Bishkek' : '8 районов вокруг Бишкека',
      bgGradient: 'from-[#0c4a6e] to-[#0369a1]',
    },
    {
      id: 'osh_region' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Ош облусу' : currentLanguage === 'en' ? 'Osh Region' : 'Ошская обл.',
      subtitle: currentLanguage === 'kg' ? '7 район • Памир-Алай' : currentLanguage === 'en' ? '7 districts • Pamir-Alay' : '7 районов • Памиро-Алай',
      bgGradient: 'from-[#14532d] to-[#166534]',
    },
    {
      id: 'jalalabad' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Жалал-Абад облусу' : currentLanguage === 'en' ? 'Jalal-Abad Region' : 'Джалал-Абадская обл.',
      subtitle: currentLanguage === 'kg' ? 'Курорттук аймак жана өнөр жай' : currentLanguage === 'en' ? 'Resort Valley & Industry' : 'Курортная зона и индустрия',
      bgGradient: 'from-[#004d40] to-[#0f766e]',
    },
    {
      id: 'issykkul' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Ысык-Көл облусу' : currentLanguage === 'en' ? 'Issyk-Kul Region' : 'Иссык-Кульская обл.',
      subtitle: currentLanguage === 'kg' ? 'Ысык-Көл • Тоо кластери' : currentLanguage === 'en' ? 'Issyk-Kul • Alpine Hub' : 'Иссык-Куль • Горный кластер',
      bgGradient: 'from-[#1e1b4b] to-[#312e81]',
    },
    {
      id: 'talas' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Талас облусу' : currentLanguage === 'en' ? 'Talas Region' : 'Таласская обл.',
      subtitle: currentLanguage === 'kg' ? 'Манас Ордосу • Түндүк-батыш' : currentLanguage === 'en' ? 'Manas Ordo • North-West' : 'Манас-Ордо • Северо-запад',
      bgGradient: 'from-[#3b1259] to-[#581c87]',
    },
    {
      id: 'naryn' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Нарын облусу' : currentLanguage === 'en' ? 'Naryn Region' : 'Нарынская обл.',
      subtitle: currentLanguage === 'kg' ? 'Теңир-Тоо • Тоолуу облус' : currentLanguage === 'en' ? 'Tengir-Too • Mountain Basin' : 'Тянь-Шань • Горная область',
      bgGradient: 'from-[#701a75] to-[#86198f]',
    },
    {
      id: 'batken' as CityId,
      colSpan: 'lg:col-span-1',
      name: currentLanguage === 'kg' ? 'Баткен облусу' : currentLanguage === 'en' ? 'Batken Region' : 'Баткенская обл.',
      subtitle: currentLanguage === 'kg' ? 'Айгүл тоосу • Түштүк-батыш' : currentLanguage === 'en' ? 'Aigul Mountain • South-West' : 'Гора Айгуль-Тоо • Юго-запад',
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cityCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onSelectCity(card.id)}
              className={`${card.colSpan} relative rounded-2xl overflow-hidden min-h-[150px] sm:min-h-[190px] shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer border border-gray-100 bg-gradient-to-br ${card.bgGradient}`}
            >
              <div className="relative z-10 p-3 sm:p-5 h-full flex flex-col justify-end text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {counts(card.id).alerts > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#dc2626] text-[10px] font-bold uppercase tracking-wider">
                      {countLabel(counts(card.id).alerts, 'alert', currentLanguage)}
                    </span>
                  )}
                  {counts(card.id).events > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#20C7B5] text-[#002f29] text-[10px] font-bold uppercase tracking-wider">
                      {countLabel(counts(card.id).events, 'event', currentLanguage)}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-xl font-extrabold tracking-tight mb-0.5 text-white leading-tight">
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

        <KyrgyzstanMap
          lang={currentLanguage}
          counts={(id) => {
            const c = counts(id);
            return c.alerts + c.events;
          }}
          onSelect={onSelectCity}
        />
      </div>
    </section>
  );
};
