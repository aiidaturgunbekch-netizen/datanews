import { SocialLinks } from './ContactButtons';
import React from 'react';
import type { Language, ViewMode } from '../types';
import { getTranslation } from '../locales/translations';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  currentLanguage: Language;
  onNavigate: (view: ViewMode) => void;
  onOpenAccount: () => void;
  /** Главная без выбранной рубрики и раздела */
  onOpenHome: () => void;
  /** Поиск по всем публикациям (то же окно, что у значка поиска в шапке) */
  onOpenSearch: () => void;
  /** Афиша на вкладке «Архив» — прошедшие события и старые материалы */
  onOpenArchive: () => void;
  /** Рубрика «Новости» */
  onOpenNews: () => void;
}

type Link = { label: string; onClick: () => void };

/** Колонка ссылок подвала */
const Column: React.FC<{ title: string; links: Link[] }> = ({ title, links }) => (
  <div>
    <h4 className="text-[11px] font-bold text-[#0f1b33] mb-3 uppercase tracking-wider">{title}</h4>
    <ul className="space-y-2 text-[13px] leading-snug text-gray-600">
      {links.map((l) => (
        <li key={l.label}>
          <button type="button" onClick={l.onClick} className="hover:text-[#12327A] transition-colors text-left">
            {l.label}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Подвал: короткая навигация (Главное, Поиск, Архив, Новости) — полный список разделов уже есть в строке рубрик и в «Разделах».
 * Для организаций — одна ссылка «Реклама» (страница для рекламодателей) и личный кабинет; тарифы и оплата — в кабинете.
 * Источники информации и политика конфиденциальности из публичного интерфейса убраны.
 */
export const Footer: React.FC<FooterProps> = ({ currentLanguage: lang, onNavigate, onOpenAccount, onOpenHome, onOpenSearch, onOpenArchive, onOpenNews }) => {
  const { t } = getTranslation(lang);
  const nav = (v: ViewMode) => () => onNavigate(v);

  const navigation: Link[] = [
    { label: t('footer.main'), onClick: onOpenHome },
    { label: t('footer.search'), onClick: onOpenSearch },
    { label: t('footer.archive'), onClick: onOpenArchive },
    { label: t('footer.news'), onClick: onOpenNews },
  ];
  const forOrg: Link[] = [
    { label: t('nav.advertising'), onClick: nav('advertising') },
    { label: t('nav.account'), onClick: onOpenAccount },
  ];
  const about: Link[] = [
    { label: t('footer.about'), onClick: nav('about') },
    { label: t('footer.rules'), onClick: nav('rules') },
  ];

  return (
    <footer className="w-full bg-[#f1f4fa] border-t border-gray-200">
      {/* Снизу запас под плавающую кнопку чат-бота, чтобы она не закрывала текст */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-x-6 gap-y-8 lg:gap-8 mb-8">
          {/* Бренд */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            {/* Логотип на его собственном фирменном фоне с просторными полями — не прижат к краям рамки */}
            <div className="inline-flex rounded-2xl bg-[#071B49] px-6 py-5 sm:px-7 sm:py-6 mb-4">
              <BrandLogo height={46} />
            </div>
            <p className="text-[13px] font-semibold text-[#12327A] leading-snug max-w-xs">{t('motto')}</p>
            <p className="text-[13px] text-gray-600 leading-snug max-w-xs mt-1">{t('appSlogan')}</p>
          </div>

          <div className="lg:col-span-2">
            <Column title={t('footer.navTitle')} links={navigation} />
          </div>
          <div className="lg:col-span-2">
            <Column title={t('nav.forOrg')} links={forOrg} />
          </div>
          <div className="lg:col-span-2">
            <Column title={t('footer.about')} links={about} />
          </div>

          {/* Контакты — только значки соцсетей */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-bold text-[#0f1b33] mb-3 uppercase tracking-wider">
              {t('footer.contacts')}
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
