import React from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales/translations';

interface ForOrganizationsSectionProps {
  currentLanguage: Language;
  onOpenPublish: () => void;
  onOpenPricing: () => void;
}

export const ForOrganizationsSection: React.FC<ForOrganizationsSectionProps> = ({
  currentLanguage,
  onOpenPublish,
  onOpenPricing,
}) => {
  const { t } = getTranslation(currentLanguage);

  const pillars = [
    {
      icon: 'pin_drop',
      title: t('forOrg.p1Title'),
      desc: t('forOrg.p1Desc'),
    },
    {
      icon: 'verified_user',
      title: t('forOrg.p2Title'),
      desc: t('forOrg.p2Desc'),
    },
    {
      icon: 'forward_to_inbox',
      title: t('forOrg.p3Title'),
      desc: t('forOrg.p3Desc'),
    },
    {
      icon: 'monitoring',
      title: t('forOrg.p4Title'),
      desc: t('forOrg.p4Desc'),
    },
  ];

  return (
    <section className="w-full py-12 lg:py-16 bg-[#e3e8f4]">
      <div className="dn-container">
        <div className="bg-[#0d2459] text-white rounded-3xl p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-xl border border-white/10">
          {/* Subtle gradient shape */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#20C7B5]/15 to-transparent pointer-events-none" />

          <div className="max-w-3xl relative z-10">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#68f9e5] text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>{t('forOrg.tag')}</span>
            </div>

            {/* Heading & Subtitle */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 text-white leading-tight">
              {t('forOrg.title')}
            </h2>
            <p className="text-sm sm:text-base text-[#dbe1ff] mb-8 leading-relaxed">
              {t('forOrg.desc')}
            </p>

            {/* 4 Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {pillars.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-[#68f9e5] border border-white/10">
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-xs text-[#dbe1ff]/80 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenPublish}
                className="px-5 py-3 rounded-xl bg-[#20C7B5] text-[#002f29] hover:bg-[#1bb3a2] font-bold text-sm transition-all shadow-md inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>{t('forOrg.ctaPost')}</span>
              </button>
              <button
                type="button"
                onClick={onOpenPricing}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15 inline-flex items-center gap-2"
              >
                <span>{t('forOrg.ctaPricing')}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
