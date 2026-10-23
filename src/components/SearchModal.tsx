import React, { useEffect, useState, useMemo } from 'react';
import { PLACE_IDS } from '../config/regions';
import { Announcement, CategoryId, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';

interface SearchModalProps {
  currentLanguage: Language;
  announcements: Announcement[];
  onSelectAnnouncement: (ann: Announcement) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  currentLanguage,
  announcements,
  onSelectAnnouncement,
  onClose,
}) => {
  const { t } = getTranslation(currentLanguage);
  const [query, setQuery] = useState('');
  // Esc закрывает окно поиска
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const [selectedCat, setSelectedCat] = useState<CategoryId>('all');
  const [selectedCity, setSelectedCity] = useState<CityId>('all');

  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      if (selectedCat !== 'all' && item.category !== selectedCat) return false;
      if (selectedCity !== 'all' && item.city !== selectedCity) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const titleRu = item.title.ru.toLowerCase();
      const titleKg = (item.title.kg || '').toLowerCase();
      const titleEn = (item.title.en || '').toLowerCase();
      const locRu = item.location.ru.toLowerCase();
      const sumRu = item.summary.ru.toLowerCase();
      const proto = item.protocolCode.toLowerCase();

      return (
        titleRu.includes(q) ||
        titleKg.includes(q) ||
        titleEn.includes(q) ||
        locRu.includes(q) ||
        sumRu.includes(q) ||
        proto.includes(q)
      );
    });
  }, [announcements, query, selectedCat, selectedCity]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-8 shadow-2xl border border-gray-100 overflow-hidden relative text-[#0f1b33]">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#12327A] text-[24px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.whatPlaceholder')}
            className="w-full text-sm sm:text-base text-[#0f1b33] placeholder:text-gray-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-[18px]">clear</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Quick Pills */}
        <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-gray-100 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value as CityId)}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold focus:outline-none"
          >
            {PLACE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`cities.${id}`)}
              </option>
            ))}
          </select>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value as CategoryId)}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold focus:outline-none"
          >
            <option value="all">{t('categories.all')}</option>
            <option value="roads">{t('categories.roads')}</option>
            <option value="water">{t('categories.water')}</option>
            <option value="electricity">{t('categories.electricity')}</option>
            <option value="repairs">{t('categories.repairs')}</option>
            <option value="concerts">{t('categories.concerts')}</option>
            <option value="festivals">{t('categories.festivals')}</option>
            <option value="education">{t('categories.education')}</option>
            <option value="gov">{t('categories.gov')}</option>
          </select>

          <span className="ml-auto text-gray-400 font-medium">
            {currentLanguage === 'kg' ? 'Табылды' : currentLanguage === 'en' ? 'Found' : 'Найдено'}: {filtered.length}
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">
                search_off
              </span>
              <p className="text-xs sm:text-sm">
                {currentLanguage === 'kg'
                  ? 'Сурамыңыз боюнча эч нерсе табылган жок'
                  : currentLanguage === 'en'
                  ? 'Nothing matches your search'
                  : 'По вашему запросу ничего не найдено'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectAnnouncement(item);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-gray-100 hover:border-blue-200 transition-all cursor-pointer flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-[#12327A]">
                      {t(`categories.${item.category}`)}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {item.protocolCode}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      • {t(`cities.${item.city}`)}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0f1b33] group-hover:text-[#12327A] truncate">
                    {item.title[currentLanguage] || item.title.ru}
                  </h4>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.location[currentLanguage] || item.location.ru}
                  </p>
                </div>

                <span className="material-symbols-outlined text-gray-400 group-hover:text-[#12327A] group-hover:translate-x-1 transition-all text-[18px] flex-shrink-0 mt-2">
                  arrow_forward
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
