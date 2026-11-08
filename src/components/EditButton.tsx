import React, { createContext, useContext } from 'react';
import type { Announcement, Language } from '../types';

/**
 * «Исправить» прямо на сайте: администратору — любая публикация, сотруднику редакции — редакционные материалы
 * своих разделов (кроме платных и госпубликаций; это же проверяет сервер). Читатели кнопку не видят.
 */
export interface EditApi {
  canEdit: (a: Announcement) => boolean;
  edit: (a: Announcement) => void;
}
export const EditContext = createContext<EditApi>({ canEdit: () => false, edit: () => {} });
export const useEdit = () => useContext(EditContext);

const LABEL: Record<Language, string> = { ru: 'Исправить', kg: 'Оңдоо', en: 'Edit' };

export const EditButton: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) => {
  const { canEdit, edit } = useEdit();
  if (!canEdit(item)) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        edit(item);
      }}
      className={`relative z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#12327A]/30 bg-white text-[11px] font-bold text-[#12327A] hover:bg-[#eef2f9] ${className}`}
      data-edit-button
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        edit
      </span>
      {LABEL[lang]}
    </button>
  );
};
