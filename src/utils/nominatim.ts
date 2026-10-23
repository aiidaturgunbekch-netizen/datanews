import type { Language } from '../types';

export type Place = { name: string; lat: number; lon: number; bbox?: [number, number, number, number] };

/** Поиск в OpenStreetMap (Nominatim) по Кыргызстану — вызывать только по действию пользователя, не на каждый символ */
export const searchPlaces = async (q: string, lang: Language, limit = 6): Promise<Place[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kg&limit=${limit}&addressdetails=0&accept-language=${lang === 'kg' ? 'ky' : lang}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const list = (await r.json()) as { display_name: string; lat: string; lon: string; boundingbox?: string[] }[];
  return list.map((x) => ({
    name: x.display_name.split(',').slice(0, 3).join(','),
    lat: Number(x.lat),
    lon: Number(x.lon),
    bbox: x.boundingbox ? (x.boundingbox.map(Number) as [number, number, number, number]) : undefined,
  }));
};

/** Ссылка, чтобы проверить точку на openstreetmap.org */
export const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
