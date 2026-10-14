import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales/translations';
import { PLAN_IDS, PLANS, planTerms } from '../config/site';

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

  const lang = currentLanguage;
  const tx = {
    badge: { ru: 'Гражданская платформа Кыргызстана', kg: 'Кыргызстандын жарандык платформасы', en: 'Civic platform of Kyrgyzstan' },
    intro: {
      ru: 'Платформа DataNews создана для того, чтобы жители Бишкека, Оша и всех регионов Кыргызстана заранее узнавали о перекрытиях дорог, отключениях воды и света и интересных событиях — без слухов и дезинформации.',
      kg: 'DataNews платформасы Бишкектин, Оштун жана Кыргызстандын бардык аймактарынын тургундары жолдордун жабылышы, суу жана жарык өчүрүү, кызыктуу иш-чаралар тууралуу алдын ала, ушак-айыңсыз жана жалган маалыматсыз билиши үчүн түзүлгөн.',
      en: 'DataNews helps people in Bishkek, Osh and every region of Kyrgyzstan learn about road closures, water and power outages and events in advance — without rumours or misinformation.',
    },
    plansTitle: { ru: 'Тарифы', kg: 'Тарифтер', en: 'Plans' },
    plansDesc: {
      ru: 'Регистрация для размещения событий платная. Каждая публикация проходит проверку модератором перед выходом на сайт.',
      kg: 'Иш-чараларды жайгаштыруу үчүн каттоо акылуу. Ар бир жарыя сайтка чыкканга чейин модератордун текшерүүсүнөн өтөт.',
      en: 'Registration to post events is paid. Every post is reviewed by a moderator before it appears on the site.',
    },
    recommended: { ru: 'Рекомендуем', kg: 'Сунуштайбыз', en: 'Recommended' },
    som: { ru: 'сом', kg: 'сом', en: 'KGS' },
    choose: { ru: 'Зарегистрироваться', kg: 'Катталуу', en: 'Sign up' },
    manual: {
      ru: 'Оформление вручную: онлайн-оплата на сайте пока не подключена. После регистрации администратор пришлёт реквизиты, проверит платёж и откроет доступ.',
      kg: 'Кол менен тариздөө: сайтта онлайн төлөм азырынча туташтырылган эмес. Катталгандан кийин администратор реквизиттерди жөнөтүп, төлөмдү текшерип, уруксат берет.',
      en: 'Manual sign-up: online payment is not connected yet. After you register, the administrator sends payment details, checks the payment and enables posting.',
    },
    terms: { ru: 'Срок / лимит', kg: 'Мөөнөт / чек', en: 'Term / limit' },
  };

  const tiers = PLAN_IDS.map((id) => ({
    id,
    name: PLANS[id].name[lang],
    audience: PLANS[id].audience[lang],
    terms: planTerms(id, lang),
    price: `${PLANS[id].priceSom.toLocaleString('ru-RU')} ${tx.som[lang]}`,
    unit: PLANS[id].priceUnit[lang],
    features: PLANS[id].features.map((f) => f[lang]),
    isPopular: id === 'organizer',
    ctaText: tx.choose[lang],
  }));

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
            <span>{tx.badge[lang]}</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
            {t('forOrg.title')}
          </h1>
          <p className="text-sm sm:text-base text-[#dbe1ff] leading-relaxed mb-6">
            {tx.intro[lang]}
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
          <h2 className="text-2xl font-bold text-[#0f1b33] mb-2">{tx.plansTitle[lang]}</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {tx.plansDesc[lang]}
          </p>
          <p className="mt-3 inline-flex items-start gap-1.5 text-left text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">info</span>
            <span>{tx.manual[lang]}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                tier.isPopular
                  ? 'bg-white border-2 border-[#12327A] shadow-xl relative'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {tx.terms[lang]}
                  </span>
                  {tier.isPopular && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#12327A] text-white text-[10px] font-bold uppercase tracking-wider">
                      {tx.recommended[lang]}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-[#0f1b33] mb-1 break-words">{tier.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{tier.audience}</p>
                <div className="text-2xl font-black text-[#12327A]">
                  {tier.price} <span className="text-xs font-semibold text-gray-500">{tier.unit}</span>
                </div>
                <div className="text-xs font-bold text-[#0f766e] mt-1 mb-6">{tier.terms}</div>

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
