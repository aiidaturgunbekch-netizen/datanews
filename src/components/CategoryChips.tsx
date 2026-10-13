import React from 'react';
import { CategoryId, Language } from '../types';
import { getTranslation } from '../locales/translations';

interface CategoryChipsProps {
  currentLanguage: Language;
  selectedCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  categoryCounts: Record<CategoryId, number>;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  currentLanguage,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const { t } = getTranslation(currentLanguage);

  const categories: { id: CategoryId; label: string; icon: string; iconColor?: string }[] = [
    { id: 'all', label: t('categories.all'), icon: 'grid_view' },
    { id: 'water', label: t('categories.water'), icon: 'water_drop', iconColor: 'text-blue-500' },
    { id: 'electricity', label: t('categories.electricity'), icon: 'bolt', iconColor: 'text-amber-500' },
    { id: 'roads', label: t('categories.roads'), icon: 'traffic', iconColor: 'text-emerald-500' },
    { id: 'repairs', label: t('categories.repairs'), icon: 'construction', iconColor: 'text-orange-500' },
    { id: 'concerts', label: t('categories.concerts'), icon: 'theater_comedy', iconColor: 'text-indigo-500' },
    { id: 'festivals', label: t('categories.festivals'), icon: 'festival', iconColor: 'text-teal-500' },
    { id: 'fairs', label: t('categories.fairs'), icon: 'storefront', iconColor: 'text-lime-600' },
    { id: 'cinema', label: t('categories.cinema'), icon: 'movie', iconColor: 'text-rose-500' },
    { id: 'education', label: t('categories.education'), icon: 'school', iconColor: 'text-sky-500' },
    { id: 'gov', label: t('categories.gov'), icon: 'campaign', iconColor: 'text-purple-500' },
  ];

  return (
    <section className="w-full py-3 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] sticky top-24 z-30 backdrop-blur-md bg-white/95 border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 whitespace-nowrap min-w-max py-0.5">
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
                    isSelected ? 'text-white' : cat.iconColor || 'text-gray-500'
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
