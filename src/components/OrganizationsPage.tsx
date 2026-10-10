import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales/translations';

interface OrganizationsPageProps {
  currentLanguage: Language;
  onOpenPublish: () => void;
  onBackToHome: () => void;
}

export const OrganizationsPage: React.FC<OrganizationsPageProps> = ({
  currentLanguage,
  onOpenPublish,
  onBackToHome,
}) => {
  const { t } = getTranslation(currentLanguage);

  const tiers = [
    {
      name: 'Базовый (Бесплатно)',
      badge: 'Для госструктур и НКО',
      price: '0 сом / мес',
      features: [
        'Публикация аварийных и плановых отключений',
        'Официальная верификация ведомства',
        'Автоматический геотаргетинг по району',
        'Прикрепление схем перекрытий и документов',
        'Публикация до 10 объявлений в месяц',
      ],
      isPopular: false,
      ctaText: 'Подключить ведомство',
    },
    {
      name: 'Муниципальный PRO',
      badge: 'Скоро • Фаза 2',
      price: 'Партнерская программа',
      features: [
        'Безлимитные публикации с приоритетным ранжированием',
        'Интеграция с Telegram-ботом и WhatsApp рассылками за 60 секунд',
        'Срочные push-уведомления жителям конкретных улиц',
        'Прямой экспорт в Google Карты и Яндекс Навигатор',
        'Персональный менеджер верификации 24/7',
        'Расширенная статистика прочтений и скачиваний схем',
      ],
      isPopular: true,
      ctaText: 'Оставить заявку на участие',
    },
    {
      name: 'Организаторам мероприятий',
      badge: 'Культура & Афиша',
      price: 'По запросу',
      features: [
        'Размещение концертов, форумов и фестивалей',
        'Кнопка прямой покупки билетов (Ticket.kg / Kaspi)',
        'Размещение в календаре и виджетах даты',
        'Фото- и видео-галереи событий',
        'Анонсы в еженедельном дайджесте столицы',
      ],
      isPopular: false,
      ctaText: 'Связаться с редакцией',
    },
  ];

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
      {/* Back button */}
      <button
        onClick={onBackToHome}
        className="text-xs font-bold text-[#12327A] hover:underline flex items-center gap-1 mb-4"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>{t('nav.home')}</span>
      </button>

      {/* Hero */}
      <div className="bg-[#0d2459] text-white rounded-3xl p-8 sm:p-12 mb-12 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#68f9e5] text-xs font-bold uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Civic Tech платформа Кыргызстана</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
            {t('forOrg.title')}
          </h1>
          <p className="text-sm sm:text-base text-[#dbe1ff] leading-relaxed mb-6">
            Платформа DataNews создана для того, чтобы жители Бишкека, Оша и всех регионов Кыргызстана узнавали о перекрытиях дорог, отключениях воды, света и ярких событиях заранее, без слухов и дезинформации.
          </p>
          <button
            onClick={onOpenPublish}
            className="px-6 py-3 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-sm hover:bg-[#1bb3a2] transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>{t('forOrg.ctaPost')}</span>
          </button>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="mb-12">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-[#0f1b33] mb-2">Тарифы и партнерские программы</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Муниципальные службы и госорганы публикуют важные предупреждения бесплатно. Платные подписки будут добавлены на следующем этапе развития.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                tier.isPopular
                  ? 'bg-white border-2 border-[#12327A] shadow-xl relative'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {tier.badge}
                  </span>
                  {tier.isPopular && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#12327A] text-white text-[10px] font-bold uppercase tracking-wider">
                      Рекомендуем
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-[#0f1b33] mb-2">{tier.name}</h3>
                <div className="text-xl font-black text-[#12327A] mb-6">{tier.price}</div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f, fIdx) => (
                    <li key={fIdx} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#00897b] text-[16px] flex-shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onOpenPublish}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-colors text-center ${
                  tier.isPopular
                    ? 'bg-[#12327A] text-white hover:bg-[#07173d]'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
