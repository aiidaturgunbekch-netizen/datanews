import React, { useEffect, useRef } from 'react';
import { CategoryId, Language, ViewMode } from '../types';
import { getTranslation } from '../locales/translations';
import { CategoryChips } from './CategoryChips';
import { Logo } from './Logo';

interface SectionsDrawerProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  categoryCounts: Record<CategoryId, number>;
  onOpenPublish: () => void;
}

/**
 * Выдвижная панель «Разделы»: по умолчанию скрыта, чтобы лента новостей занимала весь экран.
 * Открывается кнопкой в шапке; закрывается крестиком, клавишей Esc, нажатием мимо панели или выбором раздела.
 */
export const SectionsDrawer: React.FC<SectionsDrawerProps> = ({
  open,
  onClose,
  lang,
  currentView,
  onViewChange,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  onOpenPublish,
}) => {
  const { t } = getTranslation(lang);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const pages: { view: ViewMode; label: string; icon: string }[] = [
    { view: 'home', label: t('nav.home'), icon: 'home' },
    { view: 'calendar', label: t('nav.calendar'), icon: 'calendar_month' },
    { view: 'alerts', label: t('nav.alerts'), icon: 'warning' },
    { view: 'events', label: t('nav.events'), icon: 'event' },
    { view: 'cities', label: t('nav.cities'), icon: 'location_city' },
    { view: 'organizations', label: t('nav.forOrg'), icon: 'apartment' },
  ];
  const title = lang === 'kg' ? 'Бөлүмдөр' : lang === 'en' ? 'Sections' : 'Разделы';

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-[#0d2459]/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 left-0 w-[86vw] max-w-[340px] bg-white shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 shrink-0 px-4 flex items-center justify-between border-b border-gray-100">
          <Logo className="h-9" lang={lang} />
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={lang === 'kg' ? 'Жабуу' : lang === 'en' ? 'Close' : 'Закрыть'}
            className="w-10 h-10 rounded-full hover:bg-[#f3f6fc] flex items-center justify-center text-[#12327A]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Страницы сайта */}
          <nav aria-label={lang === 'kg' ? 'Сайттын беттери' : lang === 'en' ? 'Site pages' : 'Страницы сайта'}>
            <ul className="space-y-0.5">
              {pages.map((p) => (
                <li key={p.view}>
                  <button
                    onClick={() => {
                      onViewChange(p.view);
                      onClose();
                    }}
                    aria-current={currentView === p.view ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-semibold text-left transition-colors ${
                      currentView === p.view ? 'bg-[#e6ecf8] text-[#12327A]' : 'text-[#0f1b33] hover:bg-[#f3f6fc]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#12327A]">{p.icon}</span>
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Новостные разделы */}
          <CategoryChips
            variant="sidebar"
            currentLanguage={lang}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              onClose();
            }}
            categoryCounts={categoryCounts}
          />
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100">
          <button
            onClick={() => {
              onOpenPublish();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-sm hover:bg-[#1bb3a2]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            {t('nav.publishBtn')}
          </button>
        </div>
      </aside>
    </div>
  );
};
