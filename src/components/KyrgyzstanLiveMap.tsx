import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { feature, merge } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { CityId, Language } from '../types';
import { WEATHER_POINTS } from '../config/weather';
import { getTranslation } from '../locales/translations';

/** Цвета областей — как у плиток регионов */
const REGION_COLORS: Record<string, string> = {
  chui: '#0369a1',
  osh_region: '#166534',
  jalalabad: '#0f766e',
  issykkul: '#4338ca',
  talas: '#7e22ce',
  naryn: '#a21caf',
  batken: '#be123c',
};

/** Административные центры областей */
const CAPITAL: Record<string, Record<Language, string>> = {
  chui: { ru: 'Бишкек', kg: 'Бишкек', en: 'Bishkek' },
  osh_region: { ru: 'Ош', kg: 'Ош', en: 'Osh' },
  jalalabad: { ru: 'Джалал-Абад', kg: 'Жалал-Абад', en: 'Jalal-Abad' },
  issykkul: { ru: 'Каракол', kg: 'Каракол', en: 'Karakol' },
  talas: { ru: 'Талас', kg: 'Талас', en: 'Talas' },
  naryn: { ru: 'Нарын', kg: 'Нарын', en: 'Naryn' },
  batken: { ru: 'Баткен', kg: 'Баткен', en: 'Batken' },
};

type DistrictProps = { code: string; ru: string; kg: string; en: string };
type GeoData = { attribution: string; regions: Record<string, Topology> };

const T = {
  title: { ru: 'Карта Кыргызстана', kg: 'Кыргызстандын картасы', en: 'Map of Kyrgyzstan' },
  hint: {
    ru: 'Нажмите на область — карта приблизится и покажет районы. Колёсико мыши работает после клика по карте.',
    kg: 'Облусту басыңыз — карта жакындап, райондорду көрсөтөт. Чычкандын дөңгөлөгү картаны баскандан кийин иштейт.',
    en: 'Tap a region to zoom in and see its districts. Mouse-wheel zoom works after clicking the map.',
  },
  all: { ru: 'Вся страна', kg: 'Бүт өлкө', en: 'Whole country' },
  open: { ru: 'Открыть ленту', kg: 'Тасманы ачуу', en: 'Open feed' },
  districts: { ru: 'Районы', kg: 'Райондор', en: 'Districts' },
  centre: { ru: 'Центр', kg: 'Борбору', en: 'Centre' },
  loading: { ru: 'Загрузка карты…', kg: 'Карта жүктөлүүдө…', en: 'Loading map…' },
  failed: { ru: 'Не удалось загрузить карту', kg: 'Картаны жүктөө мүмкүн болгон жок', en: 'Could not load the map' },
};

const pubs = (n: number, lang: Language) => {
  if (lang === 'kg') return `${n} жарыя`;
  if (lang === 'en') return `${n} post${n === 1 ? '' : 's'}`;
  const m10 = n % 10;
  const m100 = n % 100;
  return `${n} ${m10 === 1 && m100 !== 11 ? 'публикация' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'публикации' : 'публикаций'}`;
};

/**
 * Настоящая карта: подложка OpenStreetMap, реальные границы 7 областей и 41 района (geoBoundaries),
 * города — по координатам. Нажатие на область приближает её и показывает районы;
 * кнопка «Открыть ленту» включает фильтр этого региона на сайте.
 */
const KyrgyzstanLiveMap: React.FC<{ lang: Language; counts: (id: CityId) => number; onSelect: (id: CityId) => void }> = ({ lang, counts, onSelect }) => {
  const { t } = getTranslation(lang);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ regions: Record<string, L.GeoJSON>; districts: L.LayerGroup } | null>(null);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/geo/kg-districts.topo.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setGeo)
      .catch(() => setFailed(true));
  }, []);

  // Границы областей (объединённые районы) и районы каждой области
  const shapes = useMemo(() => {
    if (!geo) return null;
    return Object.entries(geo.regions).map(([id, topo]) => {
      const obj = topo.objects.districts as GeometryCollection<DistrictProps>;
      return {
        id,
        outline: merge(topo, obj.geometries as never) as Geometry,
        districts: feature(topo, obj) as FeatureCollection<Geometry, DistrictProps>,
      };
    });
  }, [geo]);

  useEffect(() => {
    if (!box.current || !shapes || mapRef.current) return;
    const map = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 5, maxZoom: 9 });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    mapRef.current = map;
    // Только Кыргызстан, без мировой подложки: области, районы и города на собственном фоне
    map.attributionControl.addAttribution('границы &copy; <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> (ODbL)');
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    // Всё, что за границей Кыргызстана, закрыто маской — соседние страны не видны
    const outerRings: L.LatLngExpression[][] = [];
    shapes.forEach((s) => {
      const polys = s.outline.type === 'MultiPolygon' ? s.outline.coordinates : s.outline.type === 'Polygon' ? [s.outline.coordinates] : [];
      polys.forEach((poly) => outerRings.push(poly[0].map(([lon, lat]) => [lat, lon] as [number, number])));
    });
    L.polygon(
      [
        [[-89, -179], [-89, 179], [89, 179], [89, -179]],
        ...outerRings,
      ],
      { stroke: false, fillColor: '#e8eef7', fillOpacity: 1, interactive: false }
    ).addTo(map);

    // «Дыры» внутри областей: озеро Иссык-Куль — вода; территории Бишкека и Оша — цветом области
    shapes.forEach((s) => {
      const polys = s.outline.type === 'MultiPolygon' ? s.outline.coordinates : s.outline.type === 'Polygon' ? [s.outline.coordinates] : [];
      polys.forEach((poly) =>
        poly.slice(1).forEach((ring) => {
          // анклавы соседних стран (Сох, Ворух в Баткенской обл.) не закрашиваем
          if (!['issykkul', 'chui', 'osh_region'].includes(s.id)) return;
          const lake = s.id === 'issykkul';
          const hole = L.polygon(
            ring.map(([lon, lat]) => [lat, lon] as [number, number]),
            lake
              ? { stroke: false, fillColor: '#7cb7e8', fillOpacity: 1, interactive: false }
              : { stroke: false, fillColor: REGION_COLORS[s.id], fillOpacity: 0.6, interactive: false }
          ).addTo(map);
          if (lake && !poly.slice(1).indexOf(ring)) hole.bindTooltip(lang === 'en' ? 'Lake Issyk-Kul' : lang === 'kg' ? 'Ысык-Көл' : 'оз. Иссык-Куль', { permanent: true, direction: 'center', className: 'dn-town-label' });
        })
      );
    });

    const districts = L.layerGroup().addTo(map);
    const regions: Record<string, L.GeoJSON> = {};
    const all = L.featureGroup();
    shapes.forEach((s) => {
      const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: s.outline } as Feature, {
        style: { color: REGION_COLORS[s.id], weight: 2.5, fillColor: REGION_COLORS[s.id], fillOpacity: 0.6 },
      });
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.8 }));
      layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.6 }));
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(s.id);
      });
      layer.addTo(map);
      all.addLayer(layer);
      regions[s.id] = layer;
    });
    layersRef.current = { regions, districts };
    // Карта только Кыргызстана: дальше границ страны не уводит и не отдаляется
    const kg = all.getBounds();
    map.fitBounds(kg, { padding: [10, 10] });
    map.setMinZoom(map.getZoom());
    map.setMaxBounds(kg.pad(0.08));
    map.options.maxBoundsViscosity = 1;

    // Города: Бишкек и Ош — отдельные города, остальные — центры областей и крупные города
    const big: { id: CityId; lat: number; lon: number }[] = [
      { id: 'bishkek', lat: 42.8746, lon: 74.5698 },
      { id: 'osh', lat: 40.5283, lon: 72.7985 },
    ];
    big.forEach((c) =>
      L.circleMarker([c.lat, c.lon], { radius: 8, color: '#ffffff', weight: 2.5, fillColor: '#20C7B5', fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(`<b>${t(`cities.${c.id}`)}</b>`, { permanent: true, direction: 'right', className: 'dn-city-label', offset: [8, 0] })
        .on('click', () => onSelect(c.id))
    );
    WEATHER_POINTS.filter((p) => p.kind === 'city' && p.id !== 'bishkek' && p.id !== 'osh').forEach((p) =>
      L.circleMarker([p.lat, p.lon], { radius: 4.5, color: '#ffffff', weight: 1.5, fillColor: '#0f1b33', fillOpacity: 0.9 })
        .addTo(map)
        .bindTooltip(p.name[lang], { permanent: true, direction: 'top', offset: [0, -4], className: 'dn-town-label' })
    );

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // карта создаётся один раз; язык и счётчики обновляются отдельно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  // Подсказки областей — на текущем языке и с актуальным числом публикаций
  useEffect(() => {
    const l = layersRef.current;
    if (!l) return;
    Object.entries(l.regions).forEach(([id, layer]) => {
      layer.unbindTooltip();
      layer.bindTooltip(`<b>${t(`cities.${id}`)}</b><br>${pubs(counts(id as CityId), lang)}`, { sticky: true });
    });
  }, [lang, counts, t, shapes]);

  // Выбранная область: приблизить и показать её районы
  useEffect(() => {
    const map = mapRef.current;
    const l = layersRef.current;
    if (!map || !l || !shapes) return;
    l.districts.clearLayers();
    Object.entries(l.regions).forEach(([id, layer]) =>
      layer.setStyle({ fillOpacity: selected && id !== selected ? 0.25 : 0.6, weight: id === selected ? 3.5 : 2.5 })
    );
    if (!selected) {
      const all = L.featureGroup(Object.values(l.regions));
      map.flyToBounds(all.getBounds(), { padding: [10, 10], duration: 0.6 });
      return;
    }
    const s = shapes.find((x) => x.id === selected);
    if (!s) return;
    L.geoJSON(s.districts, {
      style: { color: '#ffffff', weight: 1.2, dashArray: '4 3', fillOpacity: 0 },
      onEachFeature: (f, layer) => {
        const p = f.properties as DistrictProps;
        layer.bindTooltip(p[lang] || p.ru, { sticky: true });
      },
    }).addTo(l.districts);
    map.flyToBounds(l.regions[selected].getBounds(), { padding: [20, 20], duration: 0.6 });
  }, [selected, shapes, lang]);

  const sel = selected ? shapes?.find((s) => s.id === selected) : null;

  return (
    <figure className="mt-8 rounded-2xl border border-gray-100 bg-[#f6f8fd] p-3 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-extrabold text-[#0f1b33] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#12327A]">map</span>
          {T.title[lang]}
        </span>
        <span className="text-xs text-gray-500">{T.hint[lang]}</span>
      </figcaption>

      {/* Быстрый выбор области — работает и с клавиатуры */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button
          onClick={() => setSelected(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${!selected ? 'bg-[#12327A] text-white border-[#12327A]' : 'bg-white text-[#0f1b33] border-gray-200'}`}
        >
          {T.all[lang]}
        </button>
        {Object.keys(REGION_COLORS).map((id) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${selected === id ? 'text-white' : 'bg-white text-[#0f1b33] border-gray-200'}`}
            style={selected === id ? { background: REGION_COLORS[id], borderColor: REGION_COLORS[id] } : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: REGION_COLORS[id] }} />
            {t(`cities.${id}`)}
          </button>
        ))}
      </div>

      <div className="relative">
        <div ref={box} className="w-full h-[360px] sm:h-[460px] rounded-xl overflow-hidden bg-[#e8eef7] z-0" />
        {!shapes && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">{failed ? T.failed[lang] : T.loading[lang]}</div>
        )}
        {sel && (
          <div className="absolute left-2 bottom-2 right-2 sm:right-auto sm:max-w-xs z-[500] rounded-xl bg-white/95 shadow-lg border border-gray-100 p-3 text-sm">
            <div className="font-extrabold text-[#0f1b33]">{t(`cities.${sel.id}`)}</div>
            <div className="text-xs text-gray-600">
              {T.centre[lang]}: {CAPITAL[sel.id][lang]} • {T.districts[lang]}: {sel.districts.features.length}
            </div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {sel.districts.features.map((f) => f.properties[lang] || f.properties.ru).join(', ')}
            </div>
            <button
              onClick={() => onSelect(sel.id as CityId)}
              className="mt-2 w-full px-3 py-1.5 rounded-lg bg-[#12327A] text-white text-xs font-bold hover:bg-[#0d2459]"
            >
              {T.open[lang]} · {pubs(counts(sel.id as CityId), lang)}
            </button>
          </div>
        )}
      </div>
    </figure>
  );
};

export default KyrgyzstanLiveMap;
