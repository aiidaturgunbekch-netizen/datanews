import React, { useEffect, useMemo, useState } from 'react';
import type { Announcement } from '../../types';
import * as api from '../../services/api';
import { CITY_OPTIONS, inputCls } from '../AnnouncementForm';
import { isAlert, isExpired } from '../../utils/urgency';
import { formatKgDateTime } from '../../utils/time';
import { RUBRICS } from '../../config/rubrics';
import { PUSH_BODY_MAX, PUSH_DAILY_LIMIT, PUSH_MIN_INTERVAL_MIN, PUSH_TITLE_MAX, PUSH_TOPIC_LABEL, PUSH_TOPICS, PushTopic } from '../../config/push';

const fmt = formatKgDateTime;
const cityLabel = (id: string) => (id === 'all' ? 'Весь Кыргызстан' : CITY_OPTIONS.find((c) => c.id === id)?.label || id);
const topicLabel = (id: string) => PUSH_TOPIC_LABEL[id as PushTopic]?.ru || id;
const LANG_LABEL: Record<string, string> = { ru: 'Русский', kg: 'Кыргызский', en: 'Английский' };
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  let s = '';
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-3" title={hint}>
    <div className="text-[11px] font-bold uppercase text-gray-500">{label}</div>
    <div className="text-2xl font-extrabold text-[#0f1b33] tabular-nums">{value}</div>
  </div>
);
const Chips: React.FC<{ title: string; data: Record<string, number>; label: (k: string) => string }> = ({ title, data, label }) => (
  <div>
    <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">{title}</div>
    {Object.keys(data).length === 0 ? (
      <span className="text-xs text-gray-500">нет данных</span>
    ) : (
      <div className="flex flex-wrap gap-1">
        {Object.entries(data)
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => (
            <span key={k} className="px-2 py-0.5 rounded-lg bg-[#f3f6fc] text-xs">
              {label(k)}: <b>{n}</b>
            </span>
          ))}
      </div>
    )}
  </div>
);

type Lang3 = { ru: string; kg: string; en: string };
const empty3 = (): Lang3 => ({ ru: '', kg: '', en: '' });

/**
 * Push-уведомления: сводка по подписчикам, состояние ключей (без значений), своё уведомление на трёх языках
 * (город, тема, ссылка на опубликованную новость или раздел), рассылка по срочному предупреждению и журнал 200 отправок.
 */
export const PushPanel: React.FC<{ items: Announcement[]; onTotal: (n: number) => void }> = ({ items, onTotal }) => {
  const [stats, setStats] = useState<api.PushStats | null>(null);
  const [log, setLog] = useState<api.PushLogEntry[] | null>(null);
  const [keys, setKeys] = useState<{ pub: string; priv: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [title, setTitle] = useState<Lang3>(empty3);
  const [body, setBody] = useState<Lang3>(empty3);
  const [city, setCity] = useState('all');
  const [topic, setTopic] = useState<PushTopic>('news');
  const [linkKind, setLinkKind] = useState<'article' | 'rubric' | 'home'>('article');
  const [articleId, setArticleId] = useState('');
  const [rubricId, setRubricId] = useState('news');

  const load = () => {
    api
      .pushStats()
      .then((r) => {
        setStats(r);
        onTotal(r.total);
      })
      .catch((e: Error) => setErr(e.message));
    api
      .pushLog()
      .then(setLog)
      .catch(() => setLog([]));
  };
  useEffect(load, []);

  // Ключи создаются здесь, в браузере, и никуда не отправляются — их копируют в переменные Vercel
  const generate = async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    setKeys({ pub: b64url(raw), priv: jwk.d || '' });
  };

  const published = useMemo(
    () =>
      items
        .filter((a) => (a.moderationStatus || 'approved') === 'approved' && !a.testMaterial)
        .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')),
    [items]
  );
  const active = items.filter((a) => isAlert(a) && !isExpired(a) && (a.moderationStatus || 'approved') === 'approved');
  const url = linkKind === 'home' ? '/' : linkKind === 'rubric' ? `/?r=${rubricId}` : articleId ? `/n/${articleId}` : '';
  const linkText =
    linkKind === 'home' ? 'Главная страница' : linkKind === 'rubric' ? `Раздел «${RUBRICS.find((r) => r.id === rubricId)?.label.ru}»` : published.find((a) => a.id === articleId)?.title.ru || '';
  const canSend = Boolean(title.ru.trim() && body.ru.trim() && url);

  const result = (r: api.PushLogEntry) =>
    `Отправлено: ${r.sent} из ${r.total}${r.removed ? `, удалено недействующих подписок: ${r.removed}` : ''}${r.failed ? `, ошибок: ${r.failed}` : ''}`;

  const sendCustom = async () => {
    if (!canSend) return;
    if (!window.confirm(`Отправить уведомление?\n\n«${title.ru}»\nПолучатели: ${cityLabel(city)}, тема «${topicLabel(topic)}»\nСсылка: ${linkText}`)) return;
    setBusy('custom');
    setErr('');
    setMsg('');
    try {
      const r = await api.sendCustomPush({ title, body, url, city, topic });
      setMsg(result(r));
      setTitle(empty3());
      setBody(empty3());
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const sendAlert = async (a: Announcement) => {
    if (!window.confirm(`Отправить push-уведомление подписчикам (${cityLabel(a.city)}):\n«${a.title.ru}»?`)) return;
    setBusy(a.id);
    setErr('');
    setMsg('');
    try {
      setMsg(result((await api.sendPushFor(a.id)) as unknown as api.PushLogEntry));
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
  const ok = (v: boolean | undefined) => (v ? '✅ задан' : '— не задан');
  const field3 = (label: string, v: Lang3, set: (x: Lang3) => void, max: number, area = false) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {(['ru', 'kg', 'en'] as const).map((l) => (
        <label key={l} className="block text-xs">
          <span className="font-bold text-gray-600">
            {label} · {l === 'ru' ? 'RU (обязательно)' : l.toUpperCase()}
          </span>
          {area ? (
            <textarea className={`${inputCls} min-h-[72px]`} maxLength={max} value={v[l]} onChange={(e) => set({ ...v, [l]: e.target.value })} />
          ) : (
            <input className={inputCls} maxLength={max} value={v[l]} onChange={(e) => set({ ...v, [l]: e.target.value })} />
          )}
          <span className="text-[10px] text-gray-500">
            {v[l].length}/{max}
            {l !== 'ru' && !v[l] && ' · пусто — будет русский текст'}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

      {/* Сводка */}
      {stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <Stat label="Подписчиков" value={stats.total} />
            <Stat label="Активных" value={stats.active} hint="Нет трёх неудачных доставок подряд" />
            <Stat label="Недействующих" value={stats.invalid} hint="Три неудачные доставки подряд; отписавшиеся браузеры удаляются сразу" />
            <Stat label="Новых за 7 дней" value={stats.new7} />
            <Stat label="Новых за 30 дней" value={stats.new30} />
            <Stat label="Доставлено" value={stats.sentTotal} hint="Сумма по журналу отправок" />
            <Stat label="Ошибок" value={stats.failedTotal} hint="Сумма по журналу отправок" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Chips title="Города" data={stats.byCity} label={cityLabel} />
            <Chips title="Языки" data={stats.byLang} label={(k) => LANG_LABEL[k] || k} />
            <Chips title="Темы" data={stats.byTopic} label={topicLabel} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm space-y-1">
            <div className="font-extrabold text-[#0f1b33]">Ключи (значения не показываются)</div>
            <div>VAPID_PUBLIC_KEY: {ok(stats.keys?.publicKey)}</div>
            <div>VAPID_PRIVATE_KEY: {ok(stats.keys?.privateKey)}</div>
            <div>VAPID_SUBJECT: {stats.keys?.subject ? '✅ задан' : '— не задан (берётся адрес сайта)'}</div>
            <div className="text-gray-600">
              {stats.configured ? 'Уведомления включены — кнопка подписки видна посетителям в разделе «Предупреждения».' : 'Уведомления выключены — кнопка подписки на сайте скрыта.'}
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-500 text-sm">Загрузка…</div>
      )}

      {/* Своё уведомление */}
      {stats?.configured && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="font-extrabold text-[#0f1b33] text-sm">Новое уведомление</div>
          <p className="text-xs text-gray-500">
            Получат подписчики выбранной темы в выбранном городе и подписчики «Весь Кыргызстан». Каждый — на своём языке. Не чаще одной рассылки в {PUSH_MIN_INTERVAL_MIN.custom} мин, не больше {PUSH_DAILY_LIMIT} в сутки.
          </p>
          {field3('Заголовок', title, setTitle, PUSH_TITLE_MAX)}
          {field3('Текст', body, setBody, PUSH_BODY_MAX, true)}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <label className="block">
              <span className="font-bold text-gray-600">Город</span>
              <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
                {['all', ...CITY_OPTIONS.map((c) => c.id).filter((c) => c !== 'all')].map((c) => (
                  <option key={c} value={c}>
                    {cityLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-gray-600">Тема</span>
              <select className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value as PushTopic)}>
                {PUSH_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {topicLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-gray-600">Ссылка</span>
              <select className={inputCls} value={linkKind} onChange={(e) => setLinkKind(e.target.value as typeof linkKind)}>
                <option value="article">Опубликованная новость</option>
                <option value="rubric">Раздел сайта</option>
                <option value="home">Главная страница</option>
              </select>
            </label>
          </div>
          {linkKind === 'article' && (
            <select className={`${inputCls} text-xs`} value={articleId} onChange={(e) => setArticleId(e.target.value)}>
              <option value="">— выберите опубликованную новость —</option>
              {published.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title.ru.slice(0, 90)}
                </option>
              ))}
            </select>
          )}
          {linkKind === 'rubric' && (
            <select className={`${inputCls} text-xs`} value={rubricId} onChange={(e) => setRubricId(e.target.value)}>
              {RUBRICS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label.ru}
                </option>
              ))}
            </select>
          )}
          {/* Предпросмотр — как уведомление выглядит на телефоне */}
          <div className="rounded-xl bg-[#f3f6fc] p-3 text-xs">
            <div className="font-bold text-gray-500 mb-1">Предпросмотр (RU)</div>
            <div className="flex gap-2 items-start bg-white rounded-xl p-2 shadow-sm max-w-sm">
              <img src="/icon-192.png" alt="" className="w-8 h-8 rounded" />
              <div className="min-w-0">
                <div className="font-bold text-[#0f1b33] truncate">{title.ru || 'Заголовок'}</div>
                <div className="text-gray-600 line-clamp-2">{body.ru || 'Текст уведомления'}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 truncate">{linkText || 'ссылка не выбрана'}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={sendCustom}
            disabled={!canSend || busy === 'custom'}
            className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-sm font-extrabold disabled:opacity-50 inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {busy === 'custom' ? 'Отправка…' : 'Отправить уведомление'}
          </button>
        </div>
      )}

      {/* Срочные предупреждения — прежняя кнопка */}
      {stats?.configured && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="font-extrabold text-[#0f1b33] text-sm">Отправить по действующему предупреждению</div>
          <p className="text-xs text-gray-500">Получат подписчики темы «Срочные предупреждения» города / области предупреждения и «Весь Кыргызстан».</p>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">Действующих предупреждений нет.</p>
          ) : (
            active.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#0f1b33] truncate">{a.title.ru}</div>
                  <div className="text-[11px] text-gray-500">
                    {cityLabel(a.city)} • {fmt(a.startDate)}
                  </div>
                </div>
                <button
                  onClick={() => sendAlert(a)}
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

      {/* Журнал */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="font-extrabold text-[#0f1b33] text-sm mb-2">Журнал отправок (последние 200)</div>
        {!log ? (
          <p className="text-sm text-gray-500">Загрузка…</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-gray-500">Отправок ещё не было.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1 pr-2">Когда</th>
                  <th className="py-1 pr-2">Уведомление</th>
                  <th className="py-1 pr-2">Кому</th>
                  <th className="py-1 pr-2 text-right">Получателей</th>
                  <th className="py-1 pr-2 text-right">Доставлено</th>
                  <th className="py-1 pr-2 text-right">Ошибки</th>
                  <th className="py-1 text-right">Удалено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{fmt(e.at)}</td>
                    <td className="py-1.5 pr-2">
                      <div className="font-bold text-[#0f1b33]">{e.title.ru}</div>
                      <div className="text-gray-500">
                        {e.kind === 'alert' ? 'Срочное предупреждение' : 'Своё уведомление'} · {e.url}
                        {e.status === 'sending' && ' · не завершена'}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      {cityLabel(e.city)} · {topicLabel(e.topic)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{e.total}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{e.sent}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums" title={Object.entries(e.errors || {}).map(([c, n]) => `${c}: ${n}`).join(', ')}>
                      {e.failed}
                      {e.failed > 0 && <div className="text-[10px] text-red-700">{Object.entries(e.errors || {}).map(([c, n]) => `${c === 'network' ? 'сеть' : `код ${c}`}: ${n}`).join(', ')}</div>}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{e.removed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ключи */}
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
