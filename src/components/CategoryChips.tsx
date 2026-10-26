import React from 'react';
import { CategoryId, Language } from '../types';
import { getTranslation } from '../locales/translations';

interface CategoryChipsProps {
  currentLanguage: Language;
  selectedCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  categoryCounts: Record<CategoryId, number>;
  /** sidebar — вертикальное меню разделов сбоку (компьютер); bar — одна строка с прокруткой */
  variant?: 'bar' | 'sidebar';
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  currentLanguage,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  variant = 'bar',
}) => {
  const { t } = getTranslation(currentLanguage);

  // Иконки разделов — в один тон, цвет логотипа (без разноцветных значков)
  const categories: { id: CategoryId; label: string; icon: string }[] = [
    { id: 'all', label: t('categories.all'), icon: 'grid_view' },
    { id: 'hazard', label: t('categories.hazard'), icon: 'thunderstorm' },
    { id: 'water', label: t('categories.water'), icon: 'water_drop' },
    { id: 'electricity', label: t('categories.electricity'), icon: 'bolt' },
    { id: 'roads', label: t('categories.roads'), icon: 'traffic' },
    { id: 'repairs', label: t('categories.repairs'), icon: 'construction' },
    { id: 'concerts', label: t('categories.concerts'), icon: 'theater_comedy' },
    { id: 'festivals', label: t('categories.festivals'), icon: 'festival' },
    { id: 'fairs', label: t('categories.fairs'), icon: 'storefront' },
    { id: 'exhibitions', label: t('categories.exhibitions'), icon: 'museum' },
    { id: 'culture', label: t('categories.culture'), icon: 'theaters' },
    { id: 'sport', label: t('categories.sport'), icon: 'sports_soccer' },
    { id: 'cinema', label: t('categories.cinema'), icon: 'movie' },
    { id: 'education', label: t('categories.education'), icon: 'school' },
    { id: 'gov', label: t('categories.gov'), icon: 'campaign' },
    { id: 'state', label: t('categories.state'), icon: 'account_balance' },
    { id: 'laws', label: t('categories.laws'), icon: 'gavel' },
    { id: 'notices', label: t('categories.notices'), icon: 'campaign' },
  ];

  if (variant === 'sidebar') {
    return (
      <nav aria-label={t('categories.all')}>
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {currentLanguage === 'kg' ? 'Бөлүмдөр' : currentLanguage === 'en' ? 'Sections' : 'Разделы'}
        </div>
        <ul className="space-y-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-left transition-colors ${
                    isSelected ? 'bg-[#12327A] text-white' : 'text-[#0f1b33] hover:bg-[#f3f6fc]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-white' : 'text-[#12327A]'}`}>{cat.icon}</span>
                  <span className="flex-1 leading-tight">{cat.label}</span>
                  <span className={`text-xs font-bold tabular-nums ${isSelected ? 'text-white/85' : count ? 'text-[#12327A]' : 'text-gray-500'}`}>{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <section className="w-full py-2.5 bg-white border-b border-gray-100">
      {/* Одна строка с горизонтальной прокруткой — не закрывает страницу */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 whitespace-nowrap min-w-max py-0.5 pr-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#12327A] text-white shadow-sm ring-2 ring-[#12327A]/20'
                    : 'bg-[#f3f6fc] text-[#0f1b33] hover:bg-[#e6ecf8]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isSelected ? 'text-white' : 'text-[#12327A]'
                  }`}
                >
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
