import React from 'react';
import { Language, ViewMode } from '../types';
import { getTranslation } from '../locales/translations';
import { Logo } from './Logo';

interface FooterProps {
  currentLanguage: Language;
  onNavigate: (view: ViewMode) => void;
  onOpenAccount: () => void;
}

export const Footer: React.FC<FooterProps> = ({ currentLanguage, onNavigate, onOpenAccount }) => {
  const { t } = getTranslation(currentLanguage);

  return (
    <footer className="w-full bg-[#f1f4fa] border-t border-gray-200">
      {/* Prototype Verification / Civic Tech Disclaimer Banner */}
      <div className="w-full bg-white py-3 border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-center gap-2 text-gray-500 text-xs sm:text-sm text-center">
          <span className="material-symbols-outlined text-[#12327A] text-[18px] flex-shrink-0">
            info
          </span>
          <span>{t('disclaimer.bannerText')}</span>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Slogan */}
          <div>
            <div className="mb-4">
              <Logo className="h-10" />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
              {t('appSlogan')}. {t('appHeroDesc')}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-gray-700 text-xs font-bold border border-gray-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#20C7B5]" />
              <span>Civic Data Network</span>
            </div>
          </div>

          {/* Col 2: Sections */}
          <div>
            <h4 className="text-xs font-bold text-[#0f1b33] mb-4 uppercase tracking-wider">
              {currentLanguage === 'kg' ? 'Бөлүмдөр' : currentLanguage === 'en' ? 'Sections' : 'Разделы'}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {t('nav.calendar')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('alerts')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {t('nav.alerts')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {t('nav.events')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('cities')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {t('nav.cities')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: For Organizations */}
          <div>
            <h4 className="text-xs font-bold text-[#0f1b33] mb-4 uppercase tracking-wider">
              {t('nav.forOrg')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('organizations')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {currentLanguage === 'kg' ? 'Жарыяларды жайгаштыруу' : currentLanguage === 'en' ? 'Notice Publication' : 'Публикация объявлений'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('pricing')}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {t('nav.pricing')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="hover:text-[#12327A] transition-colors text-left"
                >
                  {currentLanguage === 'kg' ? 'Жеке кабинет' : currentLanguage === 'en' ? 'My account' : 'Личный кабинет'}
                </button>
              </li>
              <li>
                <span className="text-gray-400">
                  {currentLanguage === 'kg' ? 'Модерация регламенти' : currentLanguage === 'en' ? 'Moderation Policy' : 'Регламент модерации'}
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Contacts & Channels */}
          <div>
            <h4 className="text-xs font-bold text-[#0f1b33] mb-4 uppercase tracking-wider">
              {currentLanguage === 'kg' ? 'Байланыштар жана каналдар' : currentLanguage === 'en' ? 'Contacts & Channels' : 'Контакты и каналы'}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 mb-4">
              <li>
                {/* Ссылки на каналы появятся после их создания — ведущие в никуда адреса убраны */}
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="material-symbols-outlined text-[16px] text-[#0088cc]">send</span>
                  <span>
                    {currentLanguage === 'kg' ? 'Telegram-бот (жакында)' : currentLanguage === 'en' ? 'Telegram bot (soon)' : 'Telegram-бот (скоро)'}
                  </span>
                </span>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="material-symbols-outlined text-[16px] text-[#25d366]">chat</span>
                  <span>
                    {currentLanguage === 'kg' ? 'WhatsApp-канал (жакында)' : currentLanguage === 'en' ? 'WhatsApp channel (soon)' : 'WhatsApp-канал (скоро)'}
                  </span>
                </span>
              </li>
              <li className="text-gray-400 text-xs">
                {currentLanguage === 'kg' ? 'Жарыялоо эрежелери' : currentLanguage === 'en' ? 'Publishing Rules' : 'Правила публикации'}
              </li>
              <li className="text-gray-400 text-xs">
                {currentLanguage === 'kg' ? 'Купуялуулук саясаты' : currentLanguage === 'en' ? 'Privacy Policy' : 'Политика конфиденциальности'}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-center">
            <span>{t('disclaimer.footerNotice')}</span>
          </div>
          <div>{t('disclaimer.copyright')}</div>
        </div>
      </div>
    </footer>
  );
};
