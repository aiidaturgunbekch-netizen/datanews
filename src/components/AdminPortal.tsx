import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, HistoryEntry, Language, PaymentStatus, Report, SiteStats } from '../types';
import * as api from '../services/api';
import { mergeAnnouncements } from '../utils/mergeAnnouncements';
import { normalizePlan, PLANS } from '../config/site';
import { AnnouncementForm, CATEGORY_OPTIONS, CITY_OPTIONS, inputCls } from './AnnouncementForm';
import { EventImage } from './EventImage';
import { eventSource, ticketLink } from '../utils/links';
import { historyLabel, MODERATION_BADGE, PAYMENT_BADGE } from './AccountPortal';
import { isAlert, isExpired } from '../utils/urgency';
import { addDaysStr, formatKgDateTime, kgDateStr, kgTs } from '../utils/time';
import { FORECAST_REGIONS, OfficialForecast } from '../config/weather';
import { parseOfficialText } from '../utils/officialForecast';
import { ImportResult, parseNotice } from '../utils/importText';
import { getTranslation } from '../locales/translations';

interface AdminPortalProps {
  currentLanguage: Language;
  onRefreshData: () => void;
  onRoleChange: (role: api.Role) => void;
  onClose: () => void;
}

const HISTORY_BY: Record<HistoryEntry['by'], string> = { admin: 'администратор', author: 'автор', reader: 'читатель', system: 'система' };

const REPORT_REASON: Record<Report['reason'], string> = {
  false: 'Недостоверная информация',
  outdated: 'Устаревшие сведения',
  offensive: 'Оскорбительное содержание',
  spam: 'Спам / реклама',
  other: 'Другое',
};

/** Жалобы читателей: проверить, закрыть или снять публикацию */
const ReportsTab: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [err, setErr] = useState('');
  const load = () => api.fetchReports().then(setReports).catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);
  const resolve = async (r: Report, withdraw: boolean) => {
    const resolution = window.prompt(withdraw ? 'Причина снятия (увидит автор):' : 'Итог проверки:', withdraw ? 'Снято по жалобе читателя' : 'Сведения подтверждены');
    if (resolution === null) return;
    try {
      await api.resolveReport(r.id, resolution, withdraw);
      await load();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const open = reports.filter((r) => r.status === 'open');
  return (
    <>
      <h2 className="text-xl font-extrabold text-[#0f1b33]">Жалобы читателей: открыто {open.length}</h2>
      <p className="text-xs text-gray-600">
        Жалобы работают и для публикаций госорганов, выходящих без предварительной модерации. Встроенные редакционные события снимаются кнопкой «Удалить» во вкладке «Публикации».
      </p>
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}
      {reports.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-white rounded-2xl">Жалоб нет</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className={`bg-white rounded-2xl border p-4 text-sm ${r.status === 'open' ? 'border-red-200' : 'border-gray-100 opacity-70'}`}>
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className={`px-2 py-0.5 rounded-full font-bold ${r.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {r.status === 'open' ? 'Открыта' : `Закрыта: ${r.resolution || ''}`}
                </span>
                <b>{REPORT_REASON[r.reason]}</b>
                <span className="text-gray-500">{fmt(r.at)}</span>
              </div>
              <div className="font-bold text-[#0f1b33] mt-1">{r.annTitle}</div>
              {r.comment && <p className="text-gray-700 mt-1 whitespace-pre-line">{r.comment}</p>}
              {r.contact && <div className="text-xs text-gray-500 mt-1">Контакт: {r.contact}</div>}
              {r.status === 'open' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => resolve(r, false)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold">
                    Проверено, оставить
                  </button>
                  <button onClick={() => resolve(r, true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">
                    Снять публикацию
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

type Tab = 'moderation' | 'review' | 'posts' | 'push' | 'users' | 'reports' | 'weather' | 'stats';

/** Дата и время по Бишкеку в одном формате для всей панели */
const fmt = formatKgDateTime;
const STALE_MS = 3 * 86400_000;

/** Почему действующую публикацию нужно сверить с первоисточником (пусто — всё в порядке) */
const reviewReasons = (a: Announcement): string[] => {
  if (isExpired(a) || (a.moderationStatus && a.moderationStatus !== 'approved')) return [];
  const r: string[] = [];
  if (!a.lastCheckedAt) r.push('Дата проверки не указана');
  else if (Date.now() - kgTs(a.lastCheckedAt) > STALE_MS) r.push(`Проверено давно (${fmt(a.lastCheckedAt)})`);
  if (!a.isVerified && !a.publishedByGov) r.push('Не подтверждено');
  if (a.category === 'laws' || a.category === 'state' || a.legal) {
    if (!a.legal?.docUrl) r.push('Нет ссылки на документ');
    if (!a.legal?.effectiveFrom) r.push('Нет даты вступления в силу');
  }
  return r;
};

const catLabel = (id: string) => CATEGORY_OPTIONS.find((c) => c.id === id)?.label || id;
const cityLabel = (id: string) => CITY_OPTIONS.find((c) => c.id === id)?.label || id;

const PAGE_LABELS: Record<string, string> = {
  home: 'Главная',
  calendar: 'Календарь',
  alerts: 'Предупреждения',
  events: 'Афиша',
  cities: 'Города',
  organizations: 'Для организаций',
  pricing: 'Тарифы',
};

// ─────────────────────────── Статистика ───────────────────────────
const StatTile: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-3xl font-black text-[#0f1b33] mt-1 tabular-nums">{value.toLocaleString('ru-RU')}</div>
    {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
  </div>
);

const DailyChart: React.FC<{ days: SiteStats['days'] }> = ({ days }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.views));
  const W = 720;
  const H = 180;
  const step = W / days.length;
  const barW = Math.max(2, step - 2);
  const h = hover !== null ? days[hover] : null;
  const ticks = [...new Set([0, Math.round(max / 2), max])];

  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-extrabold text-sm text-[#0f1b33]">Просмотры по дням</div>
        <div className="text-xs text-gray-600 h-4">
          {h ? (
            <>
              <b>{new Date(h.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</b>: {h.views} просмотров,{' '}
              {h.visitors} посетителей
            </>
          ) : (
            'Наведите на столбец'
          )}
        </div>
      </div>
      <svg viewBox={`0 -8 ${W + 30} ${H + 30}`} className="w-full h-auto" role="img" aria-label="Просмотры сайта по дням">
        {ticks.map((t) => {
          const y = H - (t / max) * H;
          return (
            <g key={t}>
              <line x1={30} x2={W + 30} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={26} y={y + 3} fontSize={10} textAnchor="end" fill="#6b7280">
                {t}
              </text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const bh = (d.views / max) * H;
          const x = 30 + i * step + 1;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={30 + i * step} y={0} width={step} height={H} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${x},${H} V${H - bh + Math.min(4, bh)} q0,-${Math.min(4, bh)} ${Math.min(4, barW / 2)},-${Math.min(4, bh)} H${
                    x + barW - Math.min(4, barW / 2)
                  } q${Math.min(4, barW / 2)},0 ${Math.min(4, barW / 2)},${Math.min(4, bh)} V${H} Z`}
                  fill={hover === i ? '#20C7B5' : '#12327A'}
                />
              )}
              {(i === 0 || i === days.length - 1 || (days.length > 10 && i % Math.ceil(days.length / 6) === 0)) && (
                <text x={x + barW / 2} y={H + 15} fontSize={10} textAnchor="middle" fill="#6b7280">
                  {d.date.slice(8, 10)}.{d.date.slice(5, 7)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TopList: React.FC<{ title: string; items: { key: string; count: number }[]; labels?: Record<string, string> }> = ({
  title,
  items,
  labels,
}) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="font-extrabold text-sm text-[#0f1b33] mb-3">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">Пока нет данных</div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.key} title={`${labels?.[i.key] || i.key}: ${i.count}`}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-[#0f1b33] truncate">{labels?.[i.key] || i.key}</span>
                <span className="font-bold text-[#0f1b33] tabular-nums">{i.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-[#12327A]" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Города и страны посетителей приходят от Vercel по-английски («Bishkek, KG») — показываем по-русски */
const CITY_RU: Record<string, string> = {
  Bishkek: 'Бишкек', Osh: 'Ош', 'Jalal-Abad': 'Джалал-Абад', Karakol: 'Каракол', Tokmok: 'Токмок', Naryn: 'Нарын', Talas: 'Талас',
  Batken: 'Баткен', 'Kara-Balta': 'Кара-Балта', Kant: 'Кант', 'Cholpon-Ata': 'Чолпон-Ата', Uzgen: 'Узген', 'Kara-Suu': 'Кара-Суу',
  Balykchy: 'Балыкчы', 'Kyzyl-Kiya': 'Кызыл-Кия', 'Kara-Kol': 'Кара-Куль', Isfana: 'Исфана', Sokuluk: 'Сокулук', Belovodskoye: 'Беловодское',
  Almaty: 'Алматы', Astana: 'Астана', Tashkent: 'Ташкент', Moscow: 'Москва', 'Saint Petersburg': 'Санкт-Петербург', Novosibirsk: 'Новосибирск',
  Yekaterinburg: 'Екатеринбург', Istanbul: 'Стамбул', Dubai: 'Дубай', Seoul: 'Сеул', Dushanbe: 'Душанбе', Frankfurt: 'Франкфурт',
  'Frankfurt am Main': 'Франкфурт-на-Майне', London: 'Лондон', Amsterdam: 'Амстердам', Ashburn: 'Ашберн',
};
let countryNames: Intl.DisplayNames | null = null;
try {
  countryNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {
  countryNames = null;
}
const placeRu = (key: string) => {
  if (key === 'Неизвестно') return key;
  const [city, country] = key.includes(', ') ? key.split(', ') : ['', key];
  const c = country === 'KG' ? 'Кыргызстан' : country && /^[A-Z]{2}$/.test(country) ? countryNames?.of(country) || country : country;
  return city ? `${CITY_RU[city] || city}, ${c}` : c;
};

const StatsTab: React.FC = () => {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [err, setErr] = useState('');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setErr('');
    api
      .fetchStats(days)
      .then(setStats)
      .catch((e: Error) => setErr(e.message));
  }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${days === d ? 'bg-[#12327A] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            {d} дней
          </button>
        ))}
        <button onClick={() => setShowTable((v) => !v)} className="ml-auto text-xs font-bold text-[#12327A] hover:underline">
          {showTable ? 'Скрыть таблицу' : 'Показать таблицей'}
        </button>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}
      {!stats ? (
        !err && <div className="py-10 text-center text-gray-500">Загрузка статистики…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Посетителей сегодня" value={stats.totals.todayVisitors} />
            <StatTile label="Просмотров сегодня" value={stats.totals.todayViews} />
            <StatTile label={`Посетителей за ${days} дн.`} value={stats.totals.visitors} hint="уникальные браузеры" />
            <StatTile label={`Просмотров за ${days} дн.`} value={stats.totals.views} />
          </div>
          <DailyChart days={stats.days} />
          {showTable && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left p-2">Дата</th>
                    <th className="text-right p-2">Просмотры</th>
                    <th className="text-right p-2">Посетители</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.days].reverse().map((d) => (
                    <tr key={d.date} className="border-t border-gray-100">
                      <td className="p-2">{new Date(d.date).toLocaleDateString('ru-RU')}</td>
                      <td className="p-2 text-right tabular-nums">{d.views}</td>
                      <td className="p-2 text-right tabular-nums">{d.visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TopList title="Популярные разделы" items={stats.topPages} labels={PAGE_LABELS} />
            <TopList title="Откуда приходят" items={stats.topReferrers} />
            <TopList title="Города посетителей" items={stats.cities.map((i) => ({ ...i, key: placeRu(i.key) }))} />
            <TopList title="Устройства" items={stats.devices} />
            <TopList title="Язык сайта" items={stats.languages} labels={{ ru: 'Русский', kg: 'Кыргызский', en: 'Английский', other: 'Другой' }} />
          </div>
          <p className="text-xs text-gray-500">
            Считаются все посетители сайта, кроме вас как администратора и поисковых роботов. Время — бишкекское (UTC+6).
          </p>
        </>
      )}
    </div>
  );
};

// ─────────────── Официальный прогноз Кыргызгидромета ───────────────
type RangeForm = Record<string, { nightFrom: string; nightTo: string; dayFrom: string; dayTo: string }>;
const emptyRanges = (): RangeForm =>
  Object.fromEntries(FORECAST_REGIONS.map((r) => [r.id, { nightFrom: '', nightTo: '', dayFrom: '', dayTo: '' }]));

const WeatherTab: React.FC = () => {
  const { t } = getTranslation('ru');
  const [current, setCurrent] = useState<OfficialForecast | null>(null);
  const [date, setDate] = useState(addDaysStr(kgDateStr(), 1));
  const [sourceName, setSourceName] = useState('Кыргызгидромет');
  const [sourceUrl, setSourceUrl] = useState('');
  const [text, setText] = useState('');
  const [paste, setPaste] = useState('');
  const [ranges, setRanges] = useState<RangeForm>(emptyRanges());
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .fetchWeather()
      .then((r) => setCurrent(r.official || null))
      .catch(() => {});
  }, []);

  const fill = () => {
    const r = parseOfficialText(paste, Number(kgDateStr().slice(0, 4)));
    if (r.date) setDate(r.date);
    const next = emptyRanges();
    Object.entries(r.regions).forEach(([id, v]) => {
      next[id] = { nightFrom: String(v!.nightFrom), nightTo: String(v!.nightTo), dayFrom: String(v!.dayFrom), dayTo: String(v!.dayTo) };
    });
    setRanges(next);
    if (r.rest) setText(r.rest);
    const n = Object.keys(r.regions).length;
    setErr(n ? '' : 'В тексте не найдены строки вида «В Чуйской области ночью +4...+9, днем +17...+22».');
    setMsg(
      n
        ? `Заполнено областей: ${n} из ${FORECAST_REGIONS.length}.${r.date ? ` Дата прогноза из текста: ${r.date}.` : ' Дату в тексте не нашли — укажите вручную.'} Проверьте цифры перед сохранением.`
        : ''
    );
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const regions: OfficialForecast['regions'] = {};
      for (const [id, v] of Object.entries(ranges)) {
        const vals = [v.nightFrom, v.nightTo, v.dayFrom, v.dayTo];
        if (vals.every((x) => x.trim() === '')) continue;
        if (vals.some((x) => x.trim() === '')) throw new Error(`${t(`cities.${id}`)}: заполните все четыре значения`);
        const [nightFrom, nightTo, dayFrom, dayTo] = vals.map((x) => Number(x.replace('−', '-')));
        regions[id as keyof typeof regions] = { nightFrom, nightTo, dayFrom, dayTo };
      }
      const r = await api.saveOfficialForecast({ date, sourceName, sourceUrl, text: text || undefined, regions });
      setCurrent(r.official);
      setMsg('Официальный прогноз сохранён и показан на сайте (обновление у посетителей — в течение 5 минут).');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Убрать официальный прогноз с сайта? Останется автоматический прогноз.')) return;
    try {
      await api.deleteOfficialForecast();
      setCurrent(null);
      setMsg('Официальный прогноз убран.');
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const numCls = 'w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center';
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f1b33]">Официальный прогноз Кыргызгидромета на завтра</h2>
        <p className="text-sm text-gray-600 mt-1">
          Без него на сайте показывается автоматический прогноз MET Norway с пометкой «не официальный». Когда вносите официальный —
          он показывается вместо автоматического на указанную дату. Прогноз на прошедшую дату сайт сам скрывает.
        </p>
        {current && (
          <p className="text-sm mt-2 p-2 rounded-lg bg-emerald-50 text-emerald-800">
            Сейчас на сайте: прогноз на <b>{current.date}</b>, источник — {current.sourceName}.{' '}
            <button onClick={remove} className="underline font-bold">
              Убрать
            </button>
          </p>
        )}
      </div>
      {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <label className="block text-sm font-bold text-[#0f1b33]">1. Вставьте текст сводки (с meteo.kg или из СМИ со ссылкой на Кыргызгидромет)</label>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className={inputCls} placeholder="В Чуйской области ночью +4...+9, днем +17...+22. …" />
        <button type="button" onClick={fill} disabled={!paste.trim()} className="px-4 py-2 rounded-xl bg-[#12327A] text-white font-bold text-sm disabled:opacity-50">
          Заполнить таблицу из текста
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="text-sm font-bold text-[#0f1b33]">2. Проверьте и сохраните</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-gray-600">
            Прогноз на дату
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs font-semibold text-gray-600">
            Источник
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs font-semibold text-gray-600">
            Ссылка на сообщение (обязательно)
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" className={inputCls} />
          </label>
        </div>
        <label className="block text-xs font-semibold text-gray-600">
          Общий текст (осадки, ветер)
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={inputCls} />
        </label>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-gray-500">
                <th className="pr-3 py-1">Область / город</th>
                <th className="pr-3 py-1">Ночью от … до, °C</th>
                <th className="py-1">Днём от … до, °C</th>
              </tr>
            </thead>
            <tbody>
              {FORECAST_REGIONS.map((r) => {
                const v = ranges[r.id];
                const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
                  setRanges((p) => ({ ...p, [r.id]: { ...p[r.id], [k]: e.target.value } }));
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="pr-3 py-1.5 font-semibold whitespace-nowrap">{t(`cities.${r.id}`)}</td>
                    <td className="pr-3 py-1.5 whitespace-nowrap">
                      <input inputMode="numeric" aria-label={`${r.id} ночью от`} value={v.nightFrom} onChange={set('nightFrom')} className={numCls} /> …{' '}
                      <input inputMode="numeric" aria-label={`${r.id} ночью до`} value={v.nightTo} onChange={set('nightTo')} className={numCls} />
                    </td>
                    <td className="py-1.5 whitespace-nowrap">
                      <input inputMode="numeric" aria-label={`${r.id} днём от`} value={v.dayFrom} onChange={set('dayFrom')} className={numCls} /> …{' '}
                      <input inputMode="numeric" aria-label={`${r.id} днём до`} value={v.dayTo} onChange={set('dayTo')} className={numCls} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={save} disabled={busy} className="px-5 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] font-extrabold text-sm disabled:opacity-50">
          {busy ? 'Сохранение…' : 'Сохранить и показать на сайте'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────── Push-уведомления ───────────────────────────
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  let s = '';
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const PushPanel: React.FC<{ items: Announcement[] }> = ({ items }) => {
  const [stats, setStats] = useState<api.PushStats | null>(null);
  const [keys, setKeys] = useState<{ pub: string; priv: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const load = () => api.pushStats().then(setStats).catch((e: Error) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  // Ключи создаются здесь, в браузере, и никуда не отправляются — их копируют в переменные Vercel
  const generate = async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    setKeys({ pub: b64url(raw), priv: jwk.d || '' });
  };

  const active = items.filter((a) => isAlert(a) && !isExpired(a) && (a.moderationStatus || 'approved') === 'approved');
  const send = async (a: Announcement) => {
    if (!window.confirm(`Отправить push-уведомление подписчикам (${cityLabel(a.city)}):\n«${a.title.ru}»?`)) return;
    setBusy(a.id);
    setErr('');
    setMsg('');
    try {
      const r = await api.sendPushFor(a.id);
      setMsg(`Отправлено: ${r.sent} из ${r.total}${r.removed ? `, удалено недействующих подписок: ${r.removed}` : ''}${r.failed ? `, ошибок: ${r.failed}` : ''}`);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const copyBtn = (v: string) => (
    <button type="button" onClick={() => navigator.clipboard?.writeText(v)} className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold">
      Копировать
    </button>
  );

  return (
    <div className="space-y-4">
      {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm space-y-1">
        <div className="font-extrabold text-[#0f1b33]">Состояние</div>
        {stats ? (
          <>
            <div>{stats.configured ? '✅ Ключи для уведомлений (VAPID) подключены — кнопка подписки видна посетителям в разделе «Предупреждения».' : '⚠️ Ключи для уведомлений (VAPID) не заданы — уведомления выключены, кнопка подписки на сайте скрыта.'}</div>
            <div>
              Подписчиков: <b>{stats.total}</b>
              {Object.keys(stats.byCity).length > 0 && ` (${Object.entries(stats.byCity).map(([c, n]) => `${cityLabel(c)}: ${n}`).join(', ')})`}
            </div>
            {stats.last && (
              <div className="text-gray-500">
                Последнее уведомление: {fmt(stats.last.at)} — «{stats.last.title.ru}»
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500">Загрузка…</div>
        )}
      </div>

      {stats?.configured && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="font-extrabold text-[#0f1b33] text-sm">Отправить по действующему предупреждению</div>
          <p className="text-xs text-gray-500">Уведомление получат подписчики города / области предупреждения и подписчики «Весь Кыргызстан». Отправляйте только срочное.</p>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">Действующих предупреждений нет.</p>
          ) : (
            active.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#0f1b33] truncate">{a.title.ru}</div>
                  <div className="text-[11px] text-gray-500">
                    {catLabel(a.category)} • {cityLabel(a.city)} • {fmt(a.startDate)}
                  </div>
                </div>
                <button
                  onClick={() => send(a)}
                  disabled={busy === a.id}
                  className="self-end sm:self-auto px-3 py-2 rounded-xl bg-[#dc2626] text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  {busy === a.id ? 'Отправка…' : 'Отправить push'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 text-sm">
        <div className="font-extrabold text-[#0f1b33]">{stats?.configured ? 'Новые ключи (если нужно заменить)' : 'Как включить уведомления'}</div>
        <ol className="list-decimal pl-5 space-y-1 text-gray-700">
          <li>Нажмите «Создать ключи» — пара ключей создаётся прямо в этом браузере и никуда не отправляется.</li>
          <li>
            Откройте сайт Vercel → проект datanews → «Settings» (настройки) → «Environment Variables» (переменные окружения). Добавьте две переменные: <code>VAPID_PUBLIC_KEY</code> и <code>VAPID_PRIVATE_KEY</code> — значения ниже. Для проверки отметьте только «Preview» (тестовая версия сайта); «Production» (основной сайт) — когда решите запускать.
          </li>
          <li>Необязательно: переменная <code>VAPID_SUBJECT</code> — адрес сайта (https://…) или ваша почта в виде mailto:адрес. Если её нет, берётся адрес сайта.</li>
          <li>Пересоберите сайт: «Deployments» (сборки) → у последней сборки «…» → «Redeploy» (пересобрать). После этого кнопка «Уведомлять о срочном» появится в разделе «Предупреждения».</li>
        </ol>
        <p className="text-xs text-red-700">Закрытый ключ никому не пересылайте и не храните в коде — только в настройках Vercel. При замене ключей старые подписки перестанут работать.</p>
        <button onClick={generate} className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-sm font-extrabold">
          Создать ключи
        </button>
        {keys && (
          <div className="space-y-2">
            <div>
              <div className="text-[11px] font-bold uppercase text-gray-500">VAPID_PUBLIC_KEY</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all text-xs bg-gray-50 p-2 rounded-lg">{keys.pub}</code>
                {copyBtn(keys.pub)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase text-gray-500">VAPID_PRIVATE_KEY (секретный)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all text-xs bg-gray-50 p-2 rounded-lg">{keys.priv}</code>
                {copyBtn(keys.priv)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────── Панель ───────────────────────────
export const AdminPortal: React.FC<AdminPortalProps> = ({ onRefreshData, onRoleChange, onClose }) => {
  const [isAdmin, setIsAdmin] = useState(api.getSession()?.role === 'admin');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>('moderation');
  const [serverItems, setServerItems] = useState<Announcement[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<api.AdminUser[]>([]);
  const [editing, setEditing] = useState<Announcement | null | 'new'>(null);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const load = () => {
    setErr('');
    api
      .fetchAllAnnouncements()
      .then((r) => {
        setServerItems(r.items);
        setHidden(r.hidden);
        setChecked(r.checked || {});
      })
      .catch((e: api.ApiError) => {
        if (e.status === 401 || e.status === 403) {
          setIsAdmin(false);
          onRoleChange('guest');
        }
        setErr(e.message);
      });
    api
      .fetchUsers()
      .then(setUsers)
      .catch(() => {});
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const pending = serverItems.filter((a) => a.moderationStatus === 'pending');
  const unpaid = users.filter((u) => u.paymentStatus === 'pending' || u.govStatus === 'pending');
  const [openReports, setOpenReports] = useState(0);
  useEffect(() => {
    if (isAdmin) api.fetchReports().then((r) => setOpenReports(r.filter((x) => x.status === 'open').length)).catch(() => {});
  }, [isAdmin, tab]);
  const [historyOf, setHistoryOf] = useState<string | null>(null);

  // Импорт из официального сообщения: текст + ссылка → черновик в форме, публикует редактор
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importSource, setImportSource] = useState('');
  const [imported, setImported] = useState<ImportResult | null>(null);
  const runImport = () => {
    const r = parseNotice(importText, importUrl, importSource);
    setImported(r);
    setImportOpen(false);
    setEditing('new');
  };
  const importDraft = imported
    ? ({
        title: { ru: '', kg: '', en: '' },
        summary: { ru: '', kg: '', en: '' },
        description: { ru: '', kg: '', en: '' },
        location: { ru: '', kg: '', en: '' },
        city: 'bishkek',
        category: 'gov',
        startDate: '',
        ...imported.draft,
      } as Announcement)
    : null;

  const merged = useMemo(() => mergeAnnouncements(serverItems, hidden, checked), [serverItems, hidden, checked]);
  const toReview = useMemo(
    () =>
      merged
        .map((a) => ({ a, reasons: reviewReasons(a) }))
        .filter((x) => x.reasons.length)
        .sort((x, y) => (x.a.lastCheckedAt || '').localeCompare(y.a.lastCheckedAt || '')),
    [merged]
  );

  const allPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merged
      .filter((a) => !q || `${a.title.ru} ${a.location.ru} ${a.submittedBy?.name || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [merged, query]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setErr('');
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
      load();
      onRefreshData();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLoginErr('');
    try {
      await api.adminLogin(password);
      setPassword('');
      setIsAdmin(true);
      onRoleChange('admin');
    } catch (ex) {
      const e2 = ex as api.ApiError;
      // Две разные причины — разные подсказки, чтобы было видно, какой переменной не хватает
      setLoginErr(
        e2.code === 'storage_not_configured'
          ? 'Сервер не видит базу данных: для этой версии сайта не заданы KV_REST_API_URL и KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN). Проверьте окружение и ветку переменных в Vercel и сделайте Redeploy. Инструкция — в ADMIN_GUIDE.md.'
          : e2.code === 'admin_not_configured'
          ? 'База данных подключена, но для этой версии сайта не задана переменная ADMIN_PASSWORD. Добавьте её в Vercel для этого окружения и сделайте Redeploy. Инструкция — в ADMIN_GUIDE.md.'
          : e2.message
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    api.logout();
    setIsAdmin(false);
    onRoleChange('guest');
    onClose();
  };

  const reject = (a: Announcement) => {
    const note = window.prompt('Причина отклонения (увидит автор):', 'Не подтверждены дата / адрес / контакты');
    if (note === null) return;
    act(() => api.moderateAnnouncement(a.id, 'reject', note), 'Публикация отклонена, автор увидит причину');
  };

  const tabs: [Tab, string, string, number][] = [
    ['moderation', 'Модерация', 'fact_check', pending.length],
    ['review', 'Сверка с источниками', 'rule', toReview.length],
    ['posts', 'Публикации', 'article', 0],
    ['push', 'Уведомления', 'notifications', 0],
    ['users', 'Пользователи', 'group', unpaid.length],
    ['reports', 'Жалобы', 'flag', openReports],
    ['weather', 'Прогноз погоды', 'thermostat', 0],
    ['stats', 'Статистика', 'monitoring', 0],
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-[#0d2459]/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Панель управления">
      <div className="relative w-full sm:max-w-6xl h-full sm:h-[92vh] bg-[#F5F7FB] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-[#0d2459] text-white px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#20C7B5]">admin_panel_settings</span>
            <span className="font-extrabold">Панель управления DataNews</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold">
                Выйти
              </button>
            )}
            <button onClick={onClose} aria-label="Закрыть" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form onSubmit={login} className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3">
              <div className="text-center">
                <span className="material-symbols-outlined text-[40px] text-[#12327A]">lock</span>
                <h2 className="font-extrabold text-lg text-[#0f1b33]">Вход администратора</h2>
                <p className="text-xs text-gray-500">Доступ только для владельца сайта</p>
              </div>
              <input
                className={inputCls}
                type="password"
                autoFocus
                placeholder="Пароль администратора"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginErr && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{loginErr}</div>}
              <button disabled={busy} className="w-full py-2.5 rounded-xl bg-[#12327A] text-white font-extrabold disabled:opacity-60">
                {busy ? 'Проверка…' : 'Войти'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row min-h-0">
            <nav className="sm:w-52 bg-white border-b sm:border-b-0 sm:border-r border-gray-100 p-2 flex sm:flex-col gap-1 overflow-x-auto">
              {tabs.map(([id, label, icon, badge]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setEditing(null);
                    setMsg('');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                    tab === id ? 'bg-[#12327A] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && <span className="px-1.5 rounded-full bg-amber-400 text-[#0f1b33] text-[11px] font-black">{badge}</span>}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}
              {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

              {editing ? (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-extrabold text-[#0f1b33] mb-4">{editing === 'new' ? (imported ? 'Черновик из сообщения' : 'Новая публикация') : 'Редактирование'}</h3>
                  {editing === 'new' && imported && (
                    <div className="mb-4 p-3 rounded-xl bg-sky-50 text-sky-900 text-xs space-y-1">
                      <div>
                        <b>Найдено в тексте:</b> {imported.found.join(', ') || 'ничего'}
                      </div>
                      {imported.missing.length > 0 && (
                        <div>
                          <b>Заполните вручную:</b> {imported.missing.join(', ')}
                        </div>
                      )}
                      <div>Сверьте каждое поле с первоисточником перед публикацией. Переводы на кыргызский и английский — вручную.</div>
                    </div>
                  )}
                  <AnnouncementForm
                    mode="admin"
                    key={editing === 'new' ? `new-${imported ? 'import' : 'blank'}` : editing.id}
                    initial={editing === 'new' ? importDraft : editing}
                    submitLabel={editing === 'new' ? 'Опубликовать' : 'Сохранить'}
                    onCancel={() => {
                      setEditing(null);
                      setImported(null);
                    }}
                    onSubmit={async (item) => {
                      if (editing === 'new') {
                        try {
                          await api.submitAnnouncement(item);
                        } catch (e) {
                          // Похожая публикация уже есть — спрашиваем, не дубль ли это
                          if ((e as api.ApiError).code === 'duplicate' && window.confirm(`${(e as Error).message}\n\nВсё равно добавить?`)) {
                            await api.submitAnnouncement(item, true);
                          } else throw e;
                        }
                      }
                      else if (serverItems.some((s) => s.id === editing.id)) await api.updateAnnouncement(editing.id, item);
                      else await api.submitAnnouncement({ ...item, id: editing.id }); // правка встроенного события
                      setEditing(null);
                      setImported(null);
                      setMsg('Сохранено');
                      load();
                      onRefreshData();
                    }}
                  />
                </div>
              ) : tab === 'moderation' ? (
                <>
                  <h2 className="text-xl font-extrabold text-[#0f1b33]">Ожидают модерации: {pending.length}</h2>
                  {pending.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 bg-white rounded-2xl">Новых публикаций нет 🎉</div>
                  ) : (
                    pending.map((a) => (
                      <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                        <EventImage item={a} className="md:w-64 h-40 md:h-auto flex-shrink-0" />
                        <div className="p-4 flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44]">{catLabel(a.category)}</span>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{cityLabel(a.city)}</span>
                          </div>
                          <h3 className="font-extrabold text-[#0f1b33]">{a.title.ru}</h3>
                          <p className="text-sm text-gray-700">{a.summary.ru}</p>
                          {a.description.ru !== a.summary.ru && <p className="text-xs text-gray-600 whitespace-pre-line">{a.description.ru}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-700">
                            <div>📅 {fmt(a.startDate)}{a.endDate ? ` — ${fmt(a.endDate)}` : ''}</div>
                            <div>📍 {a.location.ru}</div>
                            {a.eventDetails?.priceText && <div>🎫 {a.eventDetails.priceText.ru}</div>}
                            {a.eventDetails?.contactPhone && <div>☎ {a.eventDetails.contactPhone}</div>}
                            {ticketLink(a).url && (
                              <a className="text-[#12327A] font-bold hover:underline truncate" href={ticketLink(a).url} target="_blank" rel="noopener noreferrer">
                                🎟 Билеты (ссылка автора, не проверена)
                              </a>
                            )}
                            {eventSource(a) && (
                              <a className="text-[#12327A] font-bold hover:underline truncate" href={eventSource(a)} target="_blank" rel="noopener noreferrer">
                                🔗 Источник
                              </a>
                            )}
                          </div>
                          {a.submittedBy && (
                            <div className="text-xs p-2 rounded-lg bg-[#f8fafc] text-gray-700">
                              Автор: <b>{a.submittedBy.name}</b>
                              {a.submittedBy.organization ? ` (${a.submittedBy.organization})` : ''} • {a.submittedBy.email} • {a.submittedBy.phone}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => act(() => api.moderateAnnouncement(a.id, 'approve'), 'Опубликовано на сайте')}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[18px]">check</span>Одобрить
                            </button>
                            <button onClick={() => reject(a)} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[18px]">close</span>Отклонить
                            </button>
                            <button onClick={() => setEditing(a)} className="px-4 py-2 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold">
                              Исправить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : tab === 'review' ? (
                <>
                  <p className="text-xs text-gray-500">
                    Действующие публикации, которые давно не сверялись с первоисточником или где не хватает данных. Сначала — самые давно проверенные. «Проверено сегодня» обновляет только дату проверки; недостающие поля заполняются через «Редактировать».
                  </p>
                  {toReview.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">Всё проверено — список пуст.</div>
                  ) : (
                    <div className="space-y-2">
                      {toReview.map(({ a, reasons }) => {
                        const src = eventSource(a) || a.legal?.docUrl;
                        return (
                          <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-[#0f1b33] truncate">{a.title.ru}</div>
                              <div className="text-[11px] text-gray-500">
                                {catLabel(a.category)} • {fmt(a.startDate)}
                                {a.sourceName ? ` • ${a.sourceName}` : ''}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-bold">
                                {reasons.map((r) => (
                                  <span key={r} className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 self-end sm:self-auto">
                              {src && (
                                <a href={src} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Открыть первоисточник">
                                  <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                </a>
                              )}
                              <button onClick={() => setEditing(a)} className="p-2 rounded-lg hover:bg-gray-100 text-[#12327A]" title="Редактировать">
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button
                                onClick={() => act(() => api.markChecked(a.id), `Отмечено как проверенное: «${a.title.ru}»`)}
                                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1 hover:bg-emerald-100"
                              >
                                <span className="material-symbols-outlined text-[18px]">task_alt</span>Проверено сегодня
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : tab === 'push' ? (
                <PushPanel items={merged} />
              ) : tab === 'posts' ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={`${inputCls} max-w-xs`} placeholder="Поиск по названию, адресу, автору" value={query} onChange={(e) => setQuery(e.target.value)} />
                    <span className="text-xs text-gray-500">
                      Без настоящего фото: {allPosts.filter((a) => !a.imageUrl || a.imageUrl.startsWith('/illustrations/')).length}
                    </span>
                    <button
                      onClick={() => setImportOpen((v) => !v)}
                      className="ml-auto px-4 py-2 rounded-xl bg-white border border-gray-200 text-[#12327A] text-sm font-extrabold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_paste</span>Импорт из сообщения
                    </button>
                    <button
                      onClick={() => {
                        setImported(null);
                        setEditing('new');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">add</span>Новая публикация
                    </button>
                  </div>
                  {importOpen && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                      <p className="text-xs text-gray-500">
                        Вставьте текст официального сообщения (Кыргызгидромет, МЧС, мэрия, «Северэлектро» и т. п.) и ссылку на него. Даты, время, раздел, область, район и адрес подставятся в форму, если они прямо есть в тексте. Ничего не публикуется без вашей проверки.
                      </p>
                      <textarea className={inputCls} rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Текст сообщения" maxLength={5000} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input className={inputCls} value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="Ссылка на первоисточник, https://" />
                        <input className={inputCls} value={importSource} onChange={(e) => setImportSource(e.target.value)} placeholder="Источник, например: Кыргызгидромет" />
                      </div>
                      <button
                        onClick={runImport}
                        disabled={importText.trim().length < 10}
                        className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-sm font-extrabold disabled:opacity-50"
                      >
                        Разобрать в черновик
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {allPosts.map((a) => {
                      const b = MODERATION_BADGE[a.moderationStatus || 'approved'];
                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3 items-center">
                          <EventImage item={a} className="w-20 h-14 rounded-xl flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className={`px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                              {a.publishedByGov && <span className="px-2 py-0.5 rounded-full bg-[#e6ecf8] text-[#12327A]">Госорган, без премодерации</span>}
                              {!isExpired(a) && (!a.lastCheckedAt || Date.now() - kgTs(a.lastCheckedAt) > STALE_MS) && (
                                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800" title="Действующая публикация давно не проверялась: сверьте с первоисточником и обновите дату проверки (кнопка «Редактировать» → «Сохранить»)">
                                  Перепроверить{a.lastCheckedAt ? ` (проверено ${fmt(a.lastCheckedAt)})` : ''}
                                </span>
                              )}
                              {(!a.imageUrl || a.imageUrl.startsWith('/illustrations/')) && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" title="Сейчас показывается иллюстрация. Загрузите официальную афишу или фото через «Редактировать».">
                                  Нужна афиша / фото
                                </span>
                              )}
                              {(a.reportsCount || 0) > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">Жалоб: {a.reportsCount}</span>}
                              <span className="text-gray-500">{catLabel(a.category)} • {fmt(a.startDate)}</span>
                              {a.submittedBy && <span className="text-gray-500">• {a.submittedBy.name}</span>}
                            </div>
                            <div className="font-bold text-sm text-[#0f1b33] truncate">{a.title.ru}</div>
                            {historyOf === a.id && (
                              <ul className="mt-1 text-[11px] text-gray-600 space-y-0.5">
                                {[...(a.history || [])].reverse().map((h, i) => (
                                  <li key={i}>
                                    {fmt(h.at)} — {historyLabel(h.action, 'ru')} ({HISTORY_BY[h.by]}){h.note ? `: ${h.note}` : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {(a.history?.length || 0) > 0 && (
                            <button onClick={() => setHistoryOf(historyOf === a.id ? null : a.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="История изменений">
                              <span className="material-symbols-outlined text-[20px]">history</span>
                            </button>
                          )}
                          {serverItems.some((x) => x.id === a.id) && a.moderationStatus === 'approved' && (
                            <button
                              onClick={() => {
                                const note = window.prompt('Причина снятия с публикации (увидит автор):', '');
                                if (note !== null) act(() => api.moderateAnnouncement(a.id, 'withdraw', note), 'Снято с публикации');
                              }}
                              className="p-2 rounded-lg hover:bg-amber-50 text-amber-700"
                              title="Снять с публикации"
                            >
                              <span className="material-symbols-outlined text-[20px]">unpublished</span>
                            </button>
                          )}
                          {a.moderationStatus === 'withdrawn' && (
                            <button onClick={() => act(() => api.moderateAnnouncement(a.id, 'restore'), 'Возвращено на сайт')} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700" title="Вернуть на сайт">
                              <span className="material-symbols-outlined text-[20px]">restore</span>
                            </button>
                          )}
                          <button onClick={() => setEditing(a)} className="p-2 rounded-lg hover:bg-gray-100 text-[#12327A]" title="Редактировать">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => window.confirm(`Удалить «${a.title.ru}» с сайта?`) && act(() => api.deleteAnnouncement(a.id), 'Удалено')}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="Удалить"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : tab === 'users' ? (
                <>
                  <h2 className="text-xl font-extrabold text-[#0f1b33]">Зарегистрированные пользователи: {users.length}</h2>
                  {users.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 bg-white rounded-2xl">Пока никто не зарегистрировался</div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((u) => {
                        const pb = PAYMENT_BADGE[u.paymentStatus];
                        const plan = PLANS[normalizePlan(u.plan)];
                        const us = u.usage;
                        const setPay = (s: PaymentStatus, m: string) => act(() => api.setPaymentStatus(u.email, s), m);
                        const govOk = u.govStatus === 'verified';
                        return (
                          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-start gap-3">
                              <div className="flex-1 min-w-0 text-sm">
                                <div className="font-bold text-[#0f1b33]">
                                  {u.name} {u.organization && <span className="font-normal text-gray-500">— {u.organization}</span>}
                                </div>
                                <div className="text-gray-600 text-xs">
                                  {u.email} • {u.phone} • с {fmt(u.createdAt)}
                                </div>
                                <div className="text-xs mt-1 flex flex-wrap gap-2 items-center">
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${pb.cls}`}>{pb.label}</span>
                                  <span>
                                    Выбран тариф: <b>{plan.name.ru}</b>, {plan.priceSom.toLocaleString('ru-RU')} сом / 30 дней
                                  </span>
                                  {u.paymentRef && (
                                    <span className="text-gray-600">
                                      Платёж: <b>{u.paymentRef}</b>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs mt-1 text-gray-700">
                                  {us?.periodStart && us.periodEnd ? (
                                    <>
                                      Текущий период ({PLANS[us.plan].name.ru}): <b>{fmt(us.periodStart)}</b> — <b>{fmt(us.periodEnd)}</b>
                                      {us.postLimit !== null && (
                                        <span className={us.postsLeft === 0 ? ' text-red-700 font-bold' : ''}>
                                          {' '}• опубликовано {us.postsUsed} из {us.postLimit}, осталось {us.postsLeft}
                                        </span>
                                      )}
                                      {us.dailyLimit !== null && <span> • {us.postedToday ? 'сегодня уже отправил(а) публикацию' : 'сегодня публикаций не было'}</span>}
                                    </>
                                  ) : (
                                    <span className="text-red-700 font-bold">Нет активного периода{u.paidUntil ? ` (истёк ${fmt(u.paidUntil)})` : ''}</span>
                                  )}
                                  {us?.nextPeriodStart && <span className="text-emerald-800"> • следующий период с {fmt(us.nextPeriodStart)}</span>}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {u.paymentStatus === 'pending' || !us?.active ? (
                                  <button
                                    onClick={() =>
                                      plan.govOnly && !govOk
                                        ? setErr('Тариф «Муниципалитет / госорган» — только после подтверждения статуса (кнопка ниже)')
                                        : setPay('paid', `Оплата подтверждена: период ${plan.name.ru} на 30 дней`)
                                    }
                                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                                  >
                                    Подтвердить оплату (30 дней)
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      window.confirm(`Подтвердить новую оплату ${u.name}? Новый 30-дневный период начнётся после окончания текущего.`) &&
                                      setPay('paid', 'Продлено: следующий период начнётся после окончания текущего')
                                    }
                                    className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold"
                                  >
                                    Продлить на 30 дней
                                  </button>
                                )}
                                {us?.active && (
                                  <button
                                    onClick={() => window.confirm(`Приостановить доступ ${u.name} сейчас?`) && setPay('unpaid', `Доступ ${u.name} приостановлен`)}
                                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
                                  >
                                    Приостановить
                                  </button>
                                )}
                                {u.paymentStatus === 'pending' && (
                                  <button onClick={() => setPay('rejected', 'Оплата отклонена')} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                                    Платёж не найден
                                  </button>
                                )}
                              </div>
                            </div>
                            {(u.govStatus && u.govStatus !== 'none') || plan.govOnly ? (
                              <div className={`text-xs rounded-xl p-3 ${govOk ? 'bg-emerald-50' : u.govStatus === 'pending' ? 'bg-amber-50' : 'bg-[#f8fafc]'}`}>
                                <div className="font-bold text-[#0f1b33] mb-1">
                                  Статус госоргана:{' '}
                                  {govOk ? '✅ подтверждён — публикует без предварительной модерации' : u.govStatus === 'pending' ? '⏳ заявка на проверке' : u.govStatus === 'rejected' ? '❌ отклонён' : 'заявки нет'}
                                </div>
                                {u.gov && (
                                  <div className="text-gray-700 space-y-0.5">
                                    <div>
                                      Орган: <b>{u.gov.orgName}</b> • должность: {u.gov.position}
                                    </div>
                                    <div>
                                      Сайт:{' '}
                                      <a href={u.gov.officialSite} target="_blank" rel="noopener noreferrer" className="text-[#12327A] underline">
                                        {u.gov.officialSite}
                                      </a>{' '}
                                      • служебная почта: <b>{u.gov.officialEmail}</b>
                                    </div>
                                    <div>Письмо / приказ: {u.gov.documentRef}</div>
                                    <div className="text-gray-500">
                                      Проверьте: домен почты совпадает с официальным сайтом; письмо пришло со служебного адреса; документ подписан руководителем. Название аккаунта само по себе ничего не подтверждает.
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {u.gov && !govOk && (
                                    <button
                                      onClick={() =>
                                        window.confirm(`Подтвердить официальный статус «${u.gov?.orgName}»? Её публикации будут выходить без предварительной модерации.`) &&
                                        act(() => api.setGovStatus(u.email, 'verify'), 'Статус госоргана подтверждён')
                                      }
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                                    >
                                      Подтвердить статус
                                    </button>
                                  )}
                                  {u.gov && u.govStatus === 'pending' && (
                                    <button
                                      onClick={() => {
                                        const note = window.prompt('Причина (увидит организация):', 'Не удалось подтвердить служебный адрес');
                                        if (note !== null) act(() => api.setGovStatus(u.email, 'reject', note), 'Заявка отклонена');
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold"
                                    >
                                      Отклонить
                                    </button>
                                  )}
                                  {govOk && (
                                    <button
                                      onClick={() => {
                                        const note = window.prompt('Причина отзыва статуса:', '');
                                        if (note !== null) act(() => api.setGovStatus(u.email, 'revoke', note), 'Статус отозван — публикации снова идут через модерацию');
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold"
                                    >
                                      Отозвать статус
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : null}
                            {(u.periods?.length || 0) > 0 && (
                              <details className="text-xs text-gray-700">
                                <summary className="cursor-pointer font-bold text-[#12327A]">История оплат ({u.periods!.length})</summary>
                                <ul className="mt-1 space-y-0.5">
                                  {[...u.periods!].reverse().map((p) => (
                                    <li key={p.id}>
                                      {PLANS[p.plan].name.ru} • {p.priceSom.toLocaleString('ru-RU')} сом • {fmt(p.start)} — {fmt(p.end)}
                                      {p.paymentRef ? ` • ${p.paymentRef}` : ''} • подтверждено {fmt(p.confirmedAt)}
                                      {p.suspendedAt ? ` • приостановлен ${fmt(p.suspendedAt)}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : tab === 'reports' ? (
                <ReportsTab onChanged={() => { load(); onRefreshData(); }} />
              ) : tab === 'weather' ? (
                <WeatherTab />
              ) : (
                <StatsTab />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
