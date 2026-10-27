import { SocialLinks } from './ContactButtons';
import React from 'react';
import { Language, ViewMode } from '../types';
import { getTranslation } from '../locales/translations';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  currentLanguage: Language;
  onNavigate: (view: ViewMode) => void;
  onOpenAccount: () => void;
}

type Link = { label: Record<Language, string>; onClick: () => void };

/** Колонка ссылок подвала */
const Column: React.FC<{ title: string; links: Link[]; lang: Language }> = ({ title, links, lang }) => (
  <div>
    <h4 className="text-[11px] font-bold text-[#0f1b33] mb-3 uppercase tracking-wider">{title}</h4>
    <ul className="space-y-2 text-[13px] leading-snug text-gray-600">
      {links.map((l) => (
        <li key={l.label.ru}>
          <button type="button" onClick={l.onClick} className="hover:text-[#12327A] transition-colors text-left">
            {l.label[lang]}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export const Footer: React.FC<FooterProps> = ({ currentLanguage: lang, onNavigate, onOpenAccount }) => {
  const { t } = getTranslation(lang);
  const nav = (v: ViewMode) => () => onNavigate(v);

  const sections: Link[] = [
    { label: { ru: t('nav.calendar'), kg: t('nav.calendar'), en: t('nav.calendar') }, onClick: nav('calendar') },
    { label: { ru: t('nav.alerts'), kg: t('nav.alerts'), en: t('nav.alerts') }, onClick: nav('alerts') },
    { label: { ru: t('nav.events'), kg: t('nav.events'), en: t('nav.events') }, onClick: nav('events') },
    { label: { ru: t('nav.cities'), kg: t('nav.cities'), en: t('nav.cities') }, onClick: nav('cities') },
  ];
  const forOrg: Link[] = [
    { label: { ru: 'Публикация объявлений', kg: 'Жарыяларды жайгаштыруу', en: 'Notice publication' }, onClick: nav('organizations') },
    { label: { ru: 'Тарифы и подписка', kg: 'Тарифтер жана жазылуу', en: 'Pricing' }, onClick: nav('pricing') },
    { label: { ru: 'Личный кабинет', kg: 'Жеке кабинет', en: 'My account' }, onClick: onOpenAccount },
  ];
  const about: Link[] = [
    { label: { ru: 'О проекте', kg: 'Долбоор жөнүндө', en: 'About' }, onClick: nav('about') },
    { label: { ru: 'Источники информации', kg: 'Маалымат булактары', en: 'Information sources' }, onClick: nav('sources') },
    { label: { ru: 'Правила публикации', kg: 'Жарыялоо эрежелери', en: 'Publishing rules' }, onClick: nav('rules') },
    { label: { ru: 'Политика конфиденциальности', kg: 'Купуялуулук саясаты', en: 'Privacy policy' }, onClick: nav('privacy') },
  ];

  return (
    <footer className="w-full bg-[#f1f4fa] border-t border-gray-200">
      {/* Снизу запас под плавающую кнопку чат-бота, чтобы она не закрывала текст */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-x-6 gap-y-8 lg:gap-8 mb-8">
          {/* Бренд */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <BrandLogo size={132} className="mb-4" />
            <p className="text-[13px] font-semibold text-[#12327A] leading-snug max-w-xs">{t('motto')}</p>
            <p className="text-[13px] text-gray-600 leading-snug max-w-xs mt-1">{t('appSlogan')}</p>
          </div>

          <div className="lg:col-span-2">
            <Column title={lang === 'kg' ? 'Бөлүмдөр' : lang === 'en' ? 'Sections' : 'Разделы'} links={sections} lang={lang} />
          </div>
          <div className="lg:col-span-2">
            <Column title={t('nav.forOrg')} links={forOrg} lang={lang} />
          </div>
          <div className="lg:col-span-2">
            <Column title={lang === 'kg' ? 'Долбоор жөнүндө' : lang === 'en' ? 'About' : 'О проекте'} links={about} lang={lang} />
          </div>

          {/* Контакты — только значки соцсетей */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-bold text-[#0f1b33] mb-3 uppercase tracking-wider">
              {lang === 'kg' ? 'Байланыштар' : lang === 'en' ? 'Contacts' : 'Контакты'}
            </h4>
            <SocialLinks lang={lang} />
          </div>
        </div>

        {/* Нижняя строка: обе фразы одного размера, выровнены по одному краю */}
        <div className="pt-5 border-t border-gray-200 space-y-1 text-xs leading-relaxed text-gray-600">
          <p>{t('disclaimer.bannerText')}</p>
          <p>{t('disclaimer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
