import React, { useState } from 'react';
import type { Announcement } from '../types';
import { osmLink, Place, searchPlaces } from '../utils/nominatim';

type Geo = NonNullable<Announcement['geo']>;

/**
 * Точка публикации на карте (только для редактора): поиск адреса в OpenStreetMap по кнопке
 * или ввод координат вручную. Без выбора точка не ставится — координаты не угадываются.
 */
export const GeoPicker: React.FC<{ value: Geo | null; onChange: (g: Geo | null) => void; defaultQuery: string; inputCls: string; labelCls: string }> = ({
  value,
  onChange,
  defaultQuery,
  inputCls,
  labelCls,
}) => {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [manual, setManual] = useState('');

  const find = async () => {
    const query = (q || defaultQuery).trim();
    if (!query || busy) return;
    setBusy(true);
    setErr('');
    setResults([]);
    try {
      const res = await searchPlaces(query, 'ru', 5);
      if (!res.length) setErr('В OpenStreetMap ничего не найдено — уточните адрес или введите координаты');
      setResults(res);
    } catch (e) {
      console.error('[geo] поиск Nominatim', e);
      setErr('Поиск OpenStreetMap сейчас недоступен — можно ввести координаты вручную');
    } finally {
      setBusy(false);
    }
  };

  const applyManual = () => {
    const m = manual.replace(/\s/g, '').match(/^(-?\d+(?:\.\d+)?)[,;](-?\d+(?:\.\d+)?)$/);
    const lat = m ? Number(m[1]) : NaN;
    const lng = m ? Number(m[2]) : NaN;
    if (!(lat >= 39 && lat <= 43.5 && lng >= 69 && lng <= 80.5)) {
      setErr('Координаты вне Кыргызстана или в неверном формате. Пример: 42.8746, 74.5698');
      return;
    }
    setErr('');
    onChange({ lat, lng });
    setManual('');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <span className={labelCls}>Точка на карте (необязательно)</span>
      {value ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-[18px] text-red-600">location_on</span>
          <span className="font-mono">
            {value.lat}, {value.lng}
          </span>
          <a href={osmLink(value.lat, value.lng)} target="_blank" rel="noopener noreferrer" className="text-[#12327A] font-bold hover:underline">
            Проверить на openstreetmap.org
          </a>
          <button type="button" onClick={() => onChange(null)} className="ml-auto px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-red-700">
            Убрать точку
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Точки нет — на карте публикация видна только в списке своей области и района.</p>
      )}
      <div className="flex gap-2">
        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={defaultQuery || 'Адрес или название места'} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), find())} />
        <button type="button" onClick={find} disabled={busy} className="px-3 py-2 rounded-xl bg-[#12327A] text-white text-xs font-extrabold whitespace-nowrap disabled:opacity-60">
          {busy ? 'Поиск…' : 'Найти в OSM'}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: Math.round(r.lat * 1e5) / 1e5, lng: Math.round(r.lon * 1e5) / 1e5 });
                  setResults([]);
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs hover:border-[#12327A]"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input className={inputCls} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="или координаты: 42.8746, 74.5698" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyManual())} />
        <button type="button" onClick={applyManual} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold whitespace-nowrap">
          Поставить
        </button>
      </div>
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
};
