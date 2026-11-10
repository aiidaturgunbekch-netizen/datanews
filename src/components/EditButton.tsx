import React, { createContext, useContext, useState } from 'react';
import type { Announcement, Language } from '../types';
import { kgNowLocal } from '../utils/time';

/**
 * «Исправить» прямо на сайте: администратору — любая публикация, сотруднику редакции — редакционные материалы
 * своих разделов (кроме платных и госпубликаций; это же проверяет сервер). Читатели кнопку не видят.
 */
export interface EditApi {
  canEdit: (a: Announcement) => boolean;
  edit: (a: Announcement) => void;
  canFeature?: (a: Announcement) => boolean;
  feature?: (a: Announcement, on: boolean) => Promise<void>;
}
export const EditContext = createContext<EditApi>({ canEdit: () => false, edit: () => {} });

/** Закреплено ли в «Главном» сейчас (время — по Бишкеку, как на сервере) */
export const isFeatured = (a: Announcement, now = Date.now()) => {
  if (!a.featuredUntil) return false;
  return a.featuredUntil > kgNowLocal(now);
};
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

const PIN: Record<Language, [string, string, string]> = {
  ru: ['В Главное', 'Убрать из Главного', 'Закрепить в «Главном» на 24 часа'],
  kg: ['Башкыга', 'Башкыдан алуу', '«Башкы» бөлүмгө 24 саатка бекитүү'],
  en: ['To top', 'Remove from top', 'Pin to «Top stories» for 24 hours'],
};

/** Кнопка «В Главное» — только администратору и редакции; читатели её не видят */
export const FeatureButton: React.FC<{ item: Announcement; lang: Language; className?: string }> = ({ item, lang, className = '' }) => {
  const { canFeature, feature } = useEdit();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!canFeature || !feature || !canFeature(item)) return null;
  const on = isFeatured(item);
  return (
    <button
      type="button"
      disabled={busy}
      title={on ? `${PIN[lang][1]} (${item.featuredUntil?.replace('T', ' ')})` : PIN[lang][2]}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
          await feature(item, !on);
        } catch {
          setErr('!');
        } finally {
          setBusy(false);
        }
      }}
      className={`relative z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold disabled:opacity-60 ${
        on ? 'border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-[#12327A]/30 bg-white text-[#12327A] hover:bg-[#eef2f9]'
      } ${className}`}
      data-feature-button
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        keep
      </span>
      {on ? PIN[lang][1] : PIN[lang][0]}
      {err && <span className="text-red-600">{err}</span>}
    </button>
  );
};
