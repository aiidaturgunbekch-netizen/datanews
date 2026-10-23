import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { feature, merge } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Position } from 'geojson';
import { Announcement, CategoryId, CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { isFresh, freshOrder } from '../utils/statusUtils';
import { formatWhen } from '../utils/dates';
import { Place, searchPlaces } from '../utils/nominatim';
import { DISTRICTS, inDistrict } from '../config/districts';

/**
 * Интерактивная карта Кыргызстана.
 *  • Подложка — тайлы OpenStreetMap (дороги, улицы, реки, населённые пункты; детали появляются при приближении).
 *  • Поверх — административные границы 7 областей и 41 района (geoBoundaries, ODbL) и граница Бишкека
 *    (территория, выделенная в данных geoBoundaries из Чуйской области). Для Оша отдельной границы в данных нет —
 *    город отмечен точкой по координатам.
 *  • Населённый пункт ищется в OpenStreetMap (Nominatim) только по нажатию «Найти» — без автодополнения.
 *  • Публикации DataNews подбираются по их полям «регион», «район», «населённый пункт». Точкой на карте
 *    показываются только публикации с координатами, которые поставил и проверил редактор.
 */

const REGION_IDS = ['chui', 'osh_region', 'jalalabad', 'issykkul', 'talas', 'naryn', 'batken'] as const;
type Territory = (typeof REGION_IDS)[number] | 'bishkek' | 'osh';

const COLORS: Record<string, string> = {
  chui: '#0369a1',
  osh_region: '#166534',
  jalalabad: '#0f766e',
  issykkul: '#4338ca',
  talas: '#7e22ce',
  naryn: '#a21caf',
  batken: '#be123c',
  bishkek: '#0d9488',
  osh: '#0d9488',
};

/** Какие значения поля city публикаций относятся к территории */
const CITY_IDS: Record<Territory, CityId[]> = {
  chui: ['chui'],
  osh_region: ['osh_region'],
  jalalabad: ['jalalabad'],
  issykkul: ['issykkul', 'karakol'],
  talas: ['talas'],
  naryn: ['naryn'],
  batken: ['batken'],
  bishkek: ['bishkek'],
  osh: ['osh'],
};

const OSH: [number, number] = [40.5283, 72.7985];

/** Группы публикаций для панели территории */
const GROUPS: { key: string; cats: CategoryId[]; label: Record<Language, string> }[] = [
  { key: 'alerts', cats: ['hazard'], label: { ru: 'Предупреждения', kg: 'Эскертүүлөр', en: 'Warnings' } },
  { key: 'roads', cats: ['roads', 'repairs'], label: { ru: 'Дорожные ограничения и ремонт', kg: 'Жол чектөөлөрү жана оңдоо', en: 'Road restrictions & repairs' } },
  { key: 'utilities', cats: ['water', 'electricity'], label: { ru: 'Отключения воды и электричества', kg: 'Суу жана жарык өчүрүү', en: 'Water & power outages' } },
  { key: 'news', cats: ['gov', 'state', 'laws'], label: { ru: 'Новости', kg: 'Жаңылыктар', en: 'News' } },
  {
    key: 'events',
    cats: ['concerts', 'festivals', 'fairs', 'exhibitions', 'culture', 'sport', 'cinema', 'education'],
    label: { ru: 'Мероприятия и объявления', kg: 'Иш-чаралар жана жарыялар', en: 'Events & notices' },
  },
];

const T = {
  title: { ru: 'Карта Кыргызстана', kg: 'Кыргызстандын картасы', en: 'Map of Kyrgyzstan' },
  hint: {
    ru: 'Карта OpenStreetMap: приближайте колёсиком (после клика по карте), жестами или кнопками «+ / −» — появятся сёла, дороги и улицы.',
    kg: 'OpenStreetMap картасы: чычкандын дөңгөлөгү (картаны баскандан кийин), манжалар же «+ / −» менен жакындатыңыз — айылдар, жолдор жана көчөлөр көрүнөт.',
    en: 'OpenStreetMap: zoom with the wheel (after clicking the map), pinch or "+ / −" — villages, roads and streets appear.',
  },
  region: { ru: 'Область / город', kg: 'Облус / шаар', en: 'Region / city' },
  all: { ru: 'Весь Кыргызстан', kg: 'Бүт Кыргызстан', en: 'All of Kyrgyzstan' },
  district: { ru: 'Район', kg: 'Район', en: 'District' },
  anyDistrict: { ru: 'Все районы', kg: 'Бардык райондор', en: 'All districts' },
  place: { ru: 'Населённый пункт', kg: 'Калктуу пункт', en: 'Settlement' },
  placePh: { ru: 'Например: Кочкор, Кант, Арсланбоб', kg: 'Мисалы: Кочкор, Кант, Арстанбап', en: 'E.g. Kochkor, Kant, Arslanbob' },
  find: { ru: 'Найти', kg: 'Табуу', en: 'Find' },
  searching: { ru: 'Поиск в OpenStreetMap…', kg: 'OpenStreetMap\'тен издөө…', en: 'Searching OpenStreetMap…' },
  notFound: { ru: 'В OpenStreetMap ничего не найдено в Кыргызстане', kg: 'OpenStreetMap\'тен Кыргызстанда эч нерсе табылган жок', en: 'Nothing found in Kyrgyzstan on OpenStreetMap' },
  searchFail: { ru: 'Поиск по карте сейчас недоступен', kg: 'Карта боюнча издөө азыр жеткиликсиз', en: 'Map search is unavailable right now' },
  none: { ru: 'Пока нет публикаций для выбранной территории.', kg: 'Тандалган аймак үчүн азырынча жарыялар жок.', en: 'No posts for the selected territory yet.' },
  pubs: { ru: 'Публикации DataNews', kg: 'DataNews жарыялары', en: 'DataNews posts' },
  openFeed: { ru: 'Открыть ленту региона', kg: 'Аймактын тасмасын ачуу', en: 'Open region feed' },
  loading: { ru: 'Загрузка границ…', kg: 'Чек аралар жүктөлүүдө…', en: 'Loading boundaries…' },
  failed: { ru: 'Не удалось загрузить границы', kg: 'Чек араларды жүктөө мүмкүн болгон жок', en: 'Could not load boundaries' },
  tilesFail: {
    ru: 'Подложка OpenStreetMap не загрузилась — проверьте интернет. Границы и публикации доступны.',
    kg: 'OpenStreetMap подложкасы жүктөлгөн жок — интернетти текшериңиз. Чек аралар жана жарыялар жеткиликтүү.',
    en: 'OpenStreetMap tiles did not load — check the connection. Boundaries and posts are still available.',
  },
  noOshBorder: {
    ru: 'Отдельной границы г. Ош в открытых данных нет — город отмечен точкой.',
    kg: 'Ачык маалыматтарда Ош шаарынын өзүнчө чек арасы жок — шаар чекит менен белгиленген.',
    en: 'Open data has no separate Osh city boundary — the city is marked with a point.',
  },
  pinsNote: {
    ru: 'Точки — места публикаций, проверенные редакцией; нажмите, чтобы открыть.',
    kg: 'Чекиттер — редакция текшерген жарыялардын жерлери; ачуу үчүн басыңыз.',
    en: 'Dots mark post locations checked by the editors; click to open.',
  },
  districtNote: {
    ru: 'Публикации района — по полям «район» и «населённый пункт» в публикации.',
    kg: 'Райондун жарыялары — жарыядагы «район» жана «калктуу пункт» талаалары боюнча.',
    en: 'District posts are matched by the post’s “district” and “settlement” fields.',
  },
};

/** Цвет точки по группе публикаций */
const PIN_COLORS: Record<string, string> = { alerts: '#dc2626', roads: '#d97706', utilities: '#2563eb', news: '#12327A', events: '#0d9488' };

type DistrictProps = { code: string; ru: string; kg: string; en: string };
type GeoData = { regions: Record<string, Topology> };

/** Основа названия для сопоставления: «Ыссык-Атинский район» → «ыссык-ат», «Кочкор» → «кочко» */
const stem = (s: string) => {
  const w = (s || '').toLowerCase().replace(/ё/g, 'е').split(/[\s,()]+/)[0].replace(/[^a-zа-яөүң-]/g, '');
  return w.slice(0, Math.max(4, w.length - 4));
};

const toLatLng = (ring: Position[]) => ring.map(([lon, lat]) => [lat, lon] as [number, number]);
const polysOf = (g: Geometry): Position[][][] => (g.type === 'MultiPolygon' ? (g as MultiPolygon).coordinates : g.type === 'Polygon' ? [(g as Polygon).coordinates] : []);

const KyrgyzstanLiveMap: React.FC<{
  lang: Language;
  announcements: Announcement[];
  onSelect: (id: CityId) => void;
  onOpen: (a: Announcement) => void;
}> = ({ lang, announcements, onSelect, onOpen }) => {
  const { t } = getTranslation(lang);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<{ regions: Record<string, L.GeoJSON>; bishkek?: L.Polygon; districts: L.LayerGroup; place: L.LayerGroup; pins: L.LayerGroup } | null>(null);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [terr, setTerr] = useState<Territory | null>(null);
  const [district, setDistrict] = useState<string>('');
  const [placeQ, setPlaceQ] = useState('');
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeErr, setPlaceErr] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    fetch('/geo/kg-districts.topo.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setGeo)
      .catch((e) => {
        console.error('[map] границы не загрузились', e);
        setFailed(true);
      });
  }, []);

  // Контуры областей, их районы и граница Бишкека (дыра в контуре Чуйской области)
  const shapes = useMemo(() => {
    if (!geo) return null;
    const regions = REGION_IDS.map((id) => {
      const topo = geo.regions[id];
      const obj = topo.objects.districts as GeometryCollection<DistrictProps>;
      return {
        id,
        outline: merge(topo, obj.geometries as never) as Geometry,
        districts: feature(topo, obj) as FeatureCollection<Geometry, DistrictProps>,
      };
    });
    const chui = regions.find((r) => r.id === 'chui');
    const bishkekRing = chui ? polysOf(chui.outline).flatMap((p) => p.slice(1)).sort((a, b) => b.length - a.length)[0] : undefined;
    return { regions, bishkekRing };
  }, [geo]);

  // ── Создание карты (один раз) ──
  useEffect(() => {
    if (!box.current || !shapes || mapRef.current) return;
    const map = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.5, maxZoom: 18 });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    mapRef.current = map;
    let tileErrors = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        `&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · ${lang === 'en' ? 'boundaries' : lang === 'kg' ? 'чек аралар' : 'границы'} &copy; <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> (ODbL)`,
    })
      .on('tileerror', () => {
        tileErrors += 1;
        if (tileErrors === 6) setTilesFailed(true);
      })
      .on('tileload', () => {
        tileErrors = 0;
        setTilesFailed(false);
      })
      .addTo(map);
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    // Всё за границей страны — приглушено, чтобы Кыргызстан был в фокусе
    const outer = shapes.regions.flatMap((s) => polysOf(s.outline).map((p) => toLatLng(p[0])));
    L.polygon([[[-89, -179], [-89, 179], [89, 179], [89, -179]], ...outer], {
      stroke: false,
      fillColor: '#ffffff',
      fillOpacity: 0.55,
      interactive: false,
    }).addTo(map);

    const regions: Record<string, L.GeoJSON> = {};
    const all = L.featureGroup();
    shapes.regions.forEach((s) => {
      const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: s.outline } as Feature, {
        style: { color: COLORS[s.id], weight: 2.5, fillColor: COLORS[s.id], fillOpacity: 0.07 },
      });
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.18 }));
      layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.07 }));
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setTerr(s.id);
        setDistrict('');
        setPlace(null);
      });
      layer.addTo(map);
      all.addLayer(layer);
      regions[s.id] = layer;
    });

    let bishkek: L.Polygon | undefined;
    if (shapes.bishkekRing) {
      bishkek = L.polygon(toLatLng(shapes.bishkekRing), { color: COLORS.bishkek, weight: 2.5, fillColor: COLORS.bishkek, fillOpacity: 0.12 })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setTerr('bishkek');
          setDistrict('');
          setPlace(null);
        })
        .addTo(map);
    }
    L.circleMarker(OSH, { radius: 8, color: '#ffffff', weight: 2.5, fillColor: COLORS.osh, fillOpacity: 1 })
      .on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setTerr('osh');
        setDistrict('');
        setPlace(null);
      })
      .addTo(map);

    layers.current = { regions, bishkek, districts: L.layerGroup().addTo(map), place: L.layerGroup().addTo(map), pins: L.layerGroup().addTo(map) };
    const kg = all.getBounds();
    map.fitBounds(kg, { padding: [8, 8] });
    map.setMinZoom(Math.max(5, map.getZoom() - 0.5));
    map.setMaxBounds(kg.pad(0.25));
    map.options.maxBoundsViscosity = 1;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layers.current = null;
    };
  }, [shapes]);

  // Подсказки с названиями — на выбранном языке
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    Object.entries(l.regions).forEach(([id, layer]) => {
      layer.unbindTooltip();
      layer.bindTooltip(t(`cities.${id}`), { sticky: true });
    });
    l.bishkek?.unbindTooltip();
    l.bishkek?.bindTooltip(t('cities.bishkek'), { sticky: true });
  }, [lang, t, shapes]);

  const regionShape = terr && terr !== 'bishkek' && terr !== 'osh' ? shapes?.regions.find((r) => r.id === terr) : undefined;
  const districtFeature = regionShape && district ? regionShape.districts.features.find((f) => f.properties.code === district) : undefined;

  // ── Выбор территории: подсветка, районы, приближение ──
  useEffect(() => {
    const map = mapRef.current;
    const l = layers.current;
    if (!map || !l || !shapes) return;
    l.districts.clearLayers();
    Object.entries(l.regions).forEach(([id, layer]) =>
      layer.setStyle({ weight: id === terr ? 3.5 : 2.5, fillOpacity: terr && id !== terr ? 0.03 : 0.07 })
    );
    if (place) return; // приближение к найденному пункту — ниже
    if (!terr) {
      map.flyToBounds(L.featureGroup(Object.values(l.regions)).getBounds(), { padding: [8, 8], duration: 0.6 });
      return;
    }
    if (terr === 'bishkek' && l.bishkek) {
      map.flyToBounds(l.bishkek.getBounds(), { padding: [10, 10], duration: 0.6 });
      return;
    }
    if (terr === 'osh') {
      map.flyTo(OSH, 12, { duration: 0.6 });
      return;
    }
    if (!regionShape) return;
    L.geoJSON(regionShape.districts, {
      style: (f) => ({
        color: '#0f1b33',
        weight: f?.properties.code === district ? 3 : 1.2,
        dashArray: f?.properties.code === district ? undefined : '5 4',
        fillColor: COLORS[regionShape.id],
        fillOpacity: f?.properties.code === district ? 0.18 : 0,
      }),
      onEachFeature: (f, layer) => {
        const p = f.properties as DistrictProps;
        layer.bindTooltip(p[lang] || p.ru, { sticky: true });
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e as L.LeafletEvent);
          setDistrict(p.code);
          setPlace(null);
        });
      },
    }).addTo(l.districts);
    const target = districtFeature ? L.geoJSON(districtFeature).getBounds() : l.regions[regionShape.id].getBounds();
    map.flyToBounds(target, { padding: [16, 16], duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terr, district, shapes, lang, place]);

  // ── Найденный населённый пункт ──
  useEffect(() => {
    const map = mapRef.current;
    const l = layers.current;
    if (!map || !l) return;
    l.place.clearLayers();
    if (!place) return;
    L.circleMarker([place.lat, place.lon], { radius: 9, color: '#ffffff', weight: 3, fillColor: '#dc2626', fillOpacity: 1 })
      .bindTooltip(place.name, { permanent: true, direction: 'right', className: 'dn-city-label', offset: [10, 0] })
      .addTo(l.place);
    if (place.bbox) map.flyToBounds([[place.bbox[0], place.bbox[2]], [place.bbox[1], place.bbox[3]]], { maxZoom: 15, duration: 0.6 });
    else map.flyTo([place.lat, place.lon], 14, { duration: 0.6 });
  }, [place]);

  // ── Точки публикаций: только координаты, подтверждённые редактором ──
  const pinned = useMemo(() => announcements.filter((a) => a?.geo && a.title && isFresh(a)), [announcements]);
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    l.pins.clearLayers();
    pinned.forEach((a) => {
      const group = GROUPS.find((g) => g.cats.includes(a.category))?.key || 'events';
      L.circleMarker([a.geo!.lat, a.geo!.lng], { radius: 7, color: '#ffffff', weight: 2, fillColor: PIN_COLORS[group], fillOpacity: 1 })
        .bindTooltip(a.title[lang] || a.title.ru, { direction: 'top', offset: [0, -6] })
        .on('click', () => onOpen(a))
        .addTo(l.pins);
    });
  }, [pinned, lang, shapes, onOpen]);

  // Поиск населённого пункта в OpenStreetMap (Nominatim) — только по нажатию, не чаще одного запроса
  const findPlace = async () => {
    const q = placeQ.trim();
    if (!q || placeBusy) return;
    setPlaceBusy(true);
    setPlaceErr('');
    setPlaceResults([]);
    try {
      const res = (await searchPlaces(q, lang)).map((x) => ({ ...x, name: x.name.split(',').slice(0, 2).join(',') }));
      if (!res.length) setPlaceErr(T.notFound[lang]);
      else if (res.length === 1) setPlace(res[0]);
      else setPlaceResults(res);
    } catch (e) {
      console.error('[map] поиск Nominatim', e);
      setPlaceErr(T.searchFail[lang]);
    } finally {
      setPlaceBusy(false);
    }
  };

  // ── Публикации выбранной территории (без привязки к выдуманным координатам) ──
  const scope = useMemo(() => {
    const fresh = announcements.filter((a) => a && a.title && a.location && isFresh(a)).sort((a, b) => freshOrder(a, b));
    const text = (a: Announcement) => `${a.district || ''} ${a.locality || ''} ${a.location?.ru || ''} ${a.title?.ru || ''}`.toLowerCase().replace(/ё/g, 'е');
    if (place) {
      const s = stem(place.name);
      return fresh.filter((a) => s.length >= 3 && text(a).includes(s));
    }
    if (!terr) return [];
    const local = fresh.filter((a) => CITY_IDS[terr].includes(a.city));
    if (districtFeature) {
      const d = Object.values(DISTRICTS).flat().find((x) => x?.code === districtFeature.properties.code);
      return d ? local.filter((a) => inDistrict(a, d)) : [];
    }
    return local;
  }, [announcements, terr, districtFeature, place]);

  const name = place
    ? place.name
    : districtFeature
    ? districtFeature.properties[lang] || districtFeature.properties.ru
    : terr
    ? t(`cities.${terr}`)
    : T.all[lang];
  const districts = regionShape ? [...regionShape.districts.features].sort((a, b) => (a.properties[lang] || a.properties.ru).localeCompare(b.properties[lang] || b.properties.ru)) : [];
  const sel = 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm';

  return (
    <figure className="mt-8 rounded-2xl border border-gray-100 bg-[#f6f8fd] p-3 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm font-extrabold text-[#0f1b33] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#12327A]">map</span>
          {T.title[lang]}
        </span>
        <span className="text-xs text-gray-500">
          {T.hint[lang]}
          {pinned.length > 0 ? ` ${T.pinsNote[lang]}` : ''}
        </span>
      </figcaption>

      {/* Фильтр: область → район → населённый пункт */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {T.region[lang]}
          <select
            className={sel}
            value={terr || ''}
            onChange={(e) => {
              setTerr((e.target.value || null) as Territory | null);
              setDistrict('');
              setPlace(null);
              setPlaceResults([]);
            }}
          >
            <option value="">{T.all[lang]}</option>
            {REGION_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`cities.${id}`)}
              </option>
            ))}
            <option value="bishkek">{t('cities.bishkek')}</option>
            <option value="osh">{t('cities.osh')}</option>
          </select>
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {T.district[lang]}
          <select
            className={sel}
            value={district}
            disabled={!districts.length}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPlace(null);
            }}
          >
            <option value="">{T.anyDistrict[lang]}</option>
            {districts.map((f) => (
              <option key={f.properties.code} value={f.properties.code}>
                {f.properties[lang] || f.properties.ru}
              </option>
            ))}
          </select>
        </label>
        <form
          className="text-[11px] font-bold uppercase tracking-wider text-gray-500"
          onSubmit={(e) => {
            e.preventDefault();
            findPlace();
          }}
        >
          {T.place[lang]}
          <div className="flex gap-1.5">
            <input className={sel} value={placeQ} onChange={(e) => setPlaceQ(e.target.value)} placeholder={T.placePh[lang]} maxLength={80} />
            <button disabled={placeBusy || !placeQ.trim()} className="px-3 rounded-xl bg-[#12327A] text-white text-xs font-bold disabled:opacity-50">
              {T.find[lang]}
            </button>
          </div>
        </form>
      </div>
      {(placeBusy || placeErr || placeResults.length > 0) && (
        <div className="mb-3 text-xs">
          {placeBusy && <span className="text-gray-500">{T.searching[lang]}</span>}
          {placeErr && <span className="text-amber-800">{placeErr}</span>}
          {placeResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {placeResults.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPlace(p);
                    setPlaceResults([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-[#12327A] font-semibold text-[#0f1b33]"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div ref={box} className="w-full h-[380px] sm:h-[500px] rounded-xl overflow-hidden bg-[#e8eef7] z-0" />
        {!shapes && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 pointer-events-none">{failed ? T.failed[lang] : T.loading[lang]}</div>
        )}
        {tilesFailed && (
          <div className="absolute top-2 left-14 right-2 z-[500] rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-1.5">{T.tilesFail[lang]}</div>
        )}
      </div>

      {/* Публикации DataNews по выбранной территории */}
      {(terr || place) && (
        <div className="mt-3 rounded-xl bg-white border border-gray-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-extrabold text-[#0f1b33]">{name}</div>
              <div className="text-xs text-gray-500">
                {T.pubs[lang]}: {scope.length}
                {terr === 'osh' && !place ? ` • ${T.noOshBorder[lang]}` : ''}
                {districtFeature && !place ? ` • ${T.districtNote[lang]}` : ''}
              </div>
            </div>
            {terr && !place && (
              <button onClick={() => onSelect(CITY_IDS[terr][0])} className="px-3 py-1.5 rounded-lg bg-[#12327A] text-white text-xs font-bold hover:bg-[#0d2459]">
                {T.openFeed[lang]}
              </button>
            )}
          </div>
          {scope.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">{T.none[lang]}</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {GROUPS.map((g) => {
                const list = scope.filter((a) => g.cats.includes(a.category));
                if (!list.length) return null;
                return (
                  <div key={g.key}>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      {g.label[lang]} · {list.length}
                    </div>
                    <ul className="space-y-1">
                      {list.slice(0, 6).map((a) => (
                        <li key={a.id}>
                          <button onClick={() => onOpen(a)} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-[#f3f6fc]">
                            <span className="block text-sm font-semibold text-[#0f1b33] leading-snug">{a.title[lang] || a.title.ru}</span>
                            <span className="block text-[11px] text-gray-500">{formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </figure>
  );
};

export default KyrgyzstanLiveMap;
