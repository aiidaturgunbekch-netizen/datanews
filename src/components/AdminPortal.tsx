import React, { useEffect, useMemo, useState } from 'react';
import { Announcement, Language, PaymentStatus, SiteStats } from '../types';
import * as api from '../services/api';
import { INITIAL_ANNOUNCEMENTS } from '../data/initialAnnouncements';
import { normalizePlan, PLANS } from '../config/site';
import { AnnouncementForm, CATEGORY_OPTIONS, CITY_OPTIONS, inputCls } from './AnnouncementForm';
import { EventImage } from './EventImage';
import { eventSource, ticketLink } from '../utils/links';
import { MODERATION_BADGE, PAYMENT_BADGE } from './AccountPortal';

interface AdminPortalProps {
  currentLanguage: Language;
  onRefreshData: () => void;
  onRoleChange: (role: api.Role) => void;
  onClose: () => void;
}

type Tab = 'moderation' | 'posts' | 'users' | 'stats';

const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
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
            <TopList title="Города посетителей" items={stats.cities} />
            <TopList title="Устройства" items={stats.devices} />
            <TopList title="Язык сайта" items={stats.languages} labels={{ ru: 'Русский', kg: 'Кыргызча', en: 'English' }} />
          </div>
          <p className="text-xs text-gray-500">
            Считаются все посетители сайта, кроме вас как администратора и поисковых роботов. Время — бишкекское (UTC+6).
          </p>
        </>
      )}
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
  const unpaid = users.filter((u) => u.paymentStatus === 'pending');

  const allPosts = useMemo(() => {
    const byId = new Map<string, Announcement>();
    INITIAL_ANNOUNCEMENTS.forEach((a) => byId.set(a.id, a));
    serverItems.forEach((a) => byId.set(a.id, a));
    hidden.forEach((id) => byId.delete(id));
    const q = query.trim().toLowerCase();
    return [...byId.values()]
      .filter((a) => !q || `${a.title.ru} ${a.location.ru} ${a.submittedBy?.name || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [serverItems, hidden, query]);

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
      setLoginErr(
        e2.code === 'storage_not_configured' || e2.code === 'admin_not_configured'
          ? 'Сервер ещё не настроен: подключите Upstash Redis в Vercel (Storage) и задайте переменную ADMIN_PASSWORD. Инструкция — в ADMIN_GUIDE.md.'
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
    ['posts', 'Публикации', 'article', 0],
    ['users', 'Пользователи', 'group', unpaid.length],
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
                  <h3 className="font-extrabold text-[#0f1b33] mb-4">{editing === 'new' ? 'Новая публикация' : 'Редактирование'}</h3>
                  <AnnouncementForm
                    mode="admin"
                    initial={editing === 'new' ? null : editing}
                    submitLabel={editing === 'new' ? 'Опубликовать' : 'Сохранить'}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (item) => {
                      if (editing === 'new') await api.submitAnnouncement(item);
                      else if (serverItems.some((s) => s.id === editing.id)) await api.updateAnnouncement(editing.id, item);
                      else await api.submitAnnouncement({ ...item, id: editing.id }); // правка встроенного события
                      setEditing(null);
                      setMsg('Сохранено');
                      load();
                      onRefreshData();
                    }}
                  />
                </div>
              ) : tab === 'moderation' ? (
                <>
                  <h2 className="text-xl font-extrabold text-[#0f1b33]">Ожидают проверки: {pending.length}</h2>
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
              ) : tab === 'posts' ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={`${inputCls} max-w-xs`} placeholder="Поиск по названию, адресу, автору" value={query} onChange={(e) => setQuery(e.target.value)} />
                    <button onClick={() => setEditing('new')} className="ml-auto px-4 py-2 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">add</span>Новая публикация
                    </button>
                  </div>
                  <div className="space-y-2">
                    {allPosts.map((a) => {
                      const b = MODERATION_BADGE[a.moderationStatus || 'approved'];
                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3 items-center">
                          <EventImage item={a} className="w-20 h-14 rounded-xl flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className={`px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                              <span className="text-gray-500">{catLabel(a.category)} • {fmt(a.startDate)}</span>
                              {a.submittedBy && <span className="text-gray-500">• {a.submittedBy.name}</span>}
                            </div>
                            <div className="font-bold text-sm text-[#0f1b33] truncate">{a.title.ru}</div>
                          </div>
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
                        return (
                          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3">
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
                                  {plan.name.ru}, {plan.priceSom.toLocaleString('ru-RU')} сом {plan.priceUnit.ru}
                                </span>
                                {us && us.postLimit !== null && u.paymentStatus === 'paid' && (
                                  <span className={us.postsUsed >= us.postLimit ? 'text-red-700 font-bold' : 'text-gray-600'}>
                                    Публикаций: {us.postsUsed} из {us.postLimit}
                                  </span>
                                )}
                                {us && us.dailyLimit !== null && u.paymentStatus === 'paid' && (
                                  <span className="text-gray-600">{us.postedToday ? 'Сегодня уже отправил(а) публикацию' : 'Сегодня публикаций не было'}</span>
                                )}
                                {u.paymentRef && <span className="text-gray-600">Платёж: <b>{u.paymentRef}</b></span>}
                                {u.paidUntil && (
                                  <span className={new Date(u.paidUntil).getTime() > Date.now() ? 'text-gray-600' : 'text-red-700 font-bold'}>
                                    {new Date(u.paidUntil).getTime() > Date.now() ? 'Оплачено до' : 'Истекло'} {fmt(u.paidUntil)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {u.paymentStatus !== 'paid' ? (
                                <button onClick={() => setPay('paid', `Оплата ${u.name} подтверждена`)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                                  Подтвердить оплату
                                </button>
                              ) : (
                                <>
                                  {plan.kind === 'period' ? (
                                    <button onClick={() => setPay('paid', `Доступ ${u.name} продлён на ${plan.periodDays} дней`)} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
                                      Продлить на {plan.periodDays} дней
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        window.confirm(`Открыть ${u.name} новый пакет «${plan.name.ru}» (${plan.postLimit} публикаций)? Делайте это только после новой оплаты.`) &&
                                        setPay('paid', `Открыт новый пакет: ${plan.postLimit} публикаций`)
                                      }
                                      className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold"
                                    >
                                      Новый пакет ({plan.postLimit})
                                    </button>
                                  )}
                                  <button onClick={() => setPay('unpaid', `Доступ ${u.name} приостановлен`)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                                    Приостановить
                                  </button>
                                </>
                              )}
                              {u.paymentStatus === 'pending' && (
                                <button onClick={() => setPay('rejected', 'Оплата отклонена')} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                                  Платёж не найден
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
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
