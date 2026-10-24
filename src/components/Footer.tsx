import { SocialLinks } from './ContactButtons';
import React from 'react';
import { Language, ViewMode } from '../types';
import { getTranslation } from '../locales/translations';
import { Logo } from './Logo';

interface FooterProps {
  currentLanguage: Language;
  onNavigate: (view: ViewMode) => void;
  onOpenAccount: () => void;
}

type Link = { label: Record<Language, string>; onClick: () => void };

/** Колонка ссылок подвала */
const Column: React.FC<{ title: string; links: Link[]; lang: Language }> = ({ title, links, lang }) => (
  <div>
    <h4 className="text-xs font-bold text-[#0f1b33] mb-5 uppercase tracking-wider">{title}</h4>
    <ul className="space-y-3 text-sm text-gray-600">
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
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          {/* Бренд */}
          <div className="lg:col-span-4">
            <Logo className="h-10 mb-5" lang={lang} />
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{t('appSlogan')}</p>
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
            <h4 className="text-xs font-bold text-[#0f1b33] mb-5 uppercase tracking-wider">
              {lang === 'kg' ? 'Байланыштар' : lang === 'en' ? 'Contacts' : 'Контакты'}
            </h4>
            <SocialLinks lang={lang} />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-gray-600">
          <p className="max-w-2xl leading-relaxed">{t('disclaimer.bannerText')}</p>
          <p className="shrink-0">{t('disclaimer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
