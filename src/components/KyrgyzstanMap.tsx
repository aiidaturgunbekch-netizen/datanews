import React, { useState } from 'react';
import { CityId, Language } from '../types';
import { KG_CITY_POINTS, KG_REGION_LABEL_AT, KG_REGION_PATHS } from '../config/kgMap';
import { getTranslation } from '../locales/translations';

/** Цвета областей — как у плиток регионов */
export const REGION_COLORS: Record<string, string> = {
  chui: '#0369a1',
  osh_region: '#166534',
  jalalabad: '#0f766e',
  issykkul: '#312e81',
  talas: '#581c87',
  naryn: '#86198f',
  batken: '#9f1239',
};

const SHORT: Record<string, Record<Language, string>> = {
  chui: { ru: 'Чуйская', kg: 'Чүй', en: 'Chui' },
  osh_region: { ru: 'Ошская', kg: 'Ош', en: 'Osh' },
  jalalabad: { ru: 'Джалал-Абадская', kg: 'Жалал-Абад', en: 'Jalal-Abad' },
  issykkul: { ru: 'Иссык-Кульская', kg: 'Ысык-Көл', en: 'Issyk-Kul' },
  talas: { ru: 'Таласская', kg: 'Талас', en: 'Talas' },
  naryn: { ru: 'Нарынская', kg: 'Нарын', en: 'Naryn' },
  batken: { ru: 'Баткенская', kg: 'Баткен', en: 'Batken' },
};

/**
 * Карта Кыргызстана по областям: нажатие на область (или на точку Бишкека / Оша)
 * открывает ленту этого региона.
 */
export const KyrgyzstanMap: React.FC<{ lang: Language; counts: (id: CityId) => number; onSelect: (id: CityId) => void }> = ({ lang, counts, onSelect }) => {
  const { t } = getTranslation(lang);
  const [hover, setHover] = useState<string | null>(null);
  const hint = { ru: 'Нажмите на область, чтобы открыть её ленту', kg: 'Тасмасын ачуу үчүн облусту басыңыз', en: 'Tap a region to open its feed' };
  const pubs = (n: number) => (lang === 'kg' ? `${n} жарыя` : lang === 'en' ? `${n} posts` : `${n} публ.`);

  return (
    <figure className="mt-8 rounded-2xl border border-gray-100 bg-[#f6f8fd] p-3 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-extrabold text-[#0f1b33] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#12327A]">map</span>
          {lang === 'kg' ? 'Кыргызстандын картасы' : lang === 'en' ? 'Map of Kyrgyzstan' : 'Карта Кыргызстана'}
        </span>
        <span className="text-xs text-gray-500">{hint[lang]}</span>
      </figcaption>
      <svg viewBox="-6 -6 804 401" className="w-full h-auto" role="img" aria-label={lang === 'en' ? 'Map of Kyrgyzstan by region' : 'Карта Кыргызстана по областям'}>
        {Object.entries(KG_REGION_PATHS).map(([id, d]) => (
          <path
            key={id}
            d={d}
            fill={REGION_COLORS[id]}
            fillOpacity={hover === id ? 1 : 0.82}
            stroke="#ffffff"
            strokeWidth={hover === id ? 2.5 : 1.5}
            strokeLinejoin="round"
            className="cursor-pointer transition-[fill-opacity]"
            tabIndex={0}
            role="button"
            aria-label={`${t(`cities.${id}`)}: ${pubs(counts(id as CityId))}`}
            onMouseEnter={() => setHover(id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(id)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect(id as CityId)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id as CityId)}
          >
            <title>{`${t(`cities.${id}`)} — ${pubs(counts(id as CityId))}`}</title>
          </path>
        ))}
        {Object.entries(KG_REGION_LABEL_AT).map(([id, [x, y]]) => (
          <g key={id} pointerEvents="none" textAnchor="middle" fontFamily="inherit">
            <text x={x} y={y} fontSize="15" fontWeight="800" fill="#ffffff">
              {SHORT[id][lang]}
            </text>
            <text x={x} y={y + 17} fontSize="12" fontWeight="700" fill="#d1fae5">
              {pubs(counts(id as CityId))}
            </text>
          </g>
        ))}
        {KG_CITY_POINTS.map((c) => (
          <g
            key={c.id}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${t(`cities.${c.id}`)}: ${pubs(counts(c.id))}`}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(c.id)}
          >
            <circle cx={c.at[0]} cy={c.at[1]} r={c.id === 'bishkek' ? 9 : 7} fill="#20C7B5" stroke="#ffffff" strokeWidth={2.5} />
            <text
              x={c.id === 'bishkek' ? c.at[0] - 13 : c.at[0] + 13}
              y={c.id === 'bishkek' ? c.at[1] - 4 : c.at[1] + 5}
              textAnchor={c.id === 'bishkek' ? 'end' : 'start'}
              fontSize="14" fontWeight="800" fill="#0f1b33" stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
              {t(`cities.${c.id}`)} · {counts(c.id)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
};
