import React, { useMemo, useState } from 'react';
import type { Announcement, MailFlag, MailItem } from '../types';
import * as api from '../services/api';
import { formatKgDateTime } from '../utils/time';
import { TEST_MARK_RE } from '../config/mailSenders';

/**
 * «Материалы из почты» — входящие письма редакционной почты (dn:mail).
 * Письмо ничего не публикует: «Подготовить черновик» открывает обычную форму, черновик попадает в «Модерацию»,
 * а на сайте материал появляется только после «Одобрить». «Подтверждено по первоисточнику» — отдельная отметка в форме.
 */

const FLAG_LABEL: Record<MailFlag, string> = {
  needs_review: 'Требует проверки',
  no_date: 'Нет даты',
  no_place: 'Место не указано в источнике',
  no_category: 'Раздел не определён',
  no_city: 'Город не определён',
  year_guessed: 'Год не указан в тексте',
  wide_date_range: 'Даты далеко друг от друга — проверьте',
  unknown_sender: 'Неизвестный отправитель',
  auth_failed: 'Письмо не прошло проверку подлинности',
  possible_correction: 'Возможно, исправление или перенос',
  from_pdf: 'Данные из PDF — сверьте с оригиналом',
  text_truncated: 'Текст обрезан (очень длинный)',
  image_too_large: 'Есть фото, не сохранённое — откройте письмо',
  attachment_skipped: 'Есть вложения, не обработанные — откройте письмо',
};
const WARN: MailFlag[] = ['auth_failed', 'possible_correction', 'wide_date_range', 'unknown_sender', 'year_guessed'];

const STATUS_LABEL: Record<MailItem['status'], string> = {
  new: 'Новое',
  prepared: 'Черновик создан',
  published: 'Опубликовано',
  rejected: 'Отклонено',
  duplicate: 'Дубль',
};

type Filter = 'new' | 'prepared' | 'closed' | 'all';

export const MailInbox: React.FC<{
  items: MailItem[] | null;
  error: string;
  /** Публикации сайта — чтобы показать, что стало с черновиком (на модерации / опубликован) */
  announcements: Announcement[];
  onReload: () => void;
  onPrepare: (item: MailItem, imageDataUrl?: string) => Promise<void>;
  onOpenModeration: () => void;
}> = ({ items, error, announcements, onReload, onPrepare, onOpenModeration }) => {
  const [filter, setFilter] = useState<Filter>('new');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const counts = useMemo(() => {
    const c = { new: 0, prepared: 0, closed: 0, all: items?.length || 0 };
    (items || []).forEach((m) => {
      if (m.status === 'new') c.new++;
      else if (m.status === 'prepared' || m.status === 'published') c.prepared++;
      else c.closed++;
    });
    return c;
  }, [items]);
  const shown = (items || []).filter((m) =>
    filter === 'all' ? true : filter === 'new' ? m.status === 'new' : filter === 'prepared' ? m.status === 'prepared' || m.status === 'published' : m.status === 'rejected' || m.status === 'duplicate'
  );

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    setErr('');
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      onReload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const loadPhoto = async (key: string) => {
    try {
      const url = await api.fetchMailAttachment(key);
      setPhotos((p) => ({ ...p, [key]: url }));
    } catch {
      setPhotos((p) => ({ ...p, [key]: null }));
    }
  };

  const draftState = (m: MailItem) => {
    const a = m.annId ? announcements.find((x) => x.id === m.annId) : undefined;
    if (!m.annId) return null;
    if (!a) return 'Черновик не найден (удалён?)';
    if (a.moderationStatus === 'pending') return 'Черновик ждёт решения в «Модерации»';
    if (a.moderationStatus === 'approved') return 'Опубликовано после «Одобрить»';
    if (a.moderationStatus === 'rejected') return 'Черновик отклонён в «Модерации»';
    return `Статус черновика: ${a.moderationStatus}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-[#0f1b33]">Материалы из почты</h2>
      <p className="text-xs text-gray-600">
        Письма из редакционной почты. Письмо само ничего не публикует: «Подготовить черновик» открывает форму, черновик сохраняется в «Модерацию», и на
        сайте материал появится только после «Одобрить». Письмо с официального адреса — это «получено от организации», а не подтверждение:
        «Подтверждено по первоисточнику» ставится в форме отдельно, после сверки.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['new', `Новые (${counts.new})`],
            ['prepared', `С черновиком (${counts.prepared})`],
            ['closed', `Отклонённые и дубли (${counts.closed})`],
            ['all', `Все (${counts.all})`],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === id ? 'bg-[#12327A] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={onReload} className="ml-auto text-xs font-bold text-[#12327A] hover:underline">
          Обновить
        </button>
      </div>

      {(error || err) && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error || err}</div>}
      {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}

      {!items ? (
        !error && <div className="py-10 text-center text-gray-500">Загрузка писем…</div>
      ) : shown.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-white rounded-2xl">Писем нет</div>
      ) : (
        shown.map((m) => {
          const d = m.suggestion.draft;
          const photosOf = m.attachments.filter((a) => a.kind === 'image' && a.storedKey);
          const state = draftState(m);
          return (
            <article key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3" aria-label={m.subject || 'Письмо без темы'}>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className={`px-2 py-0.5 rounded-full ${m.status === 'new' ? 'bg-amber-100 text-[#5c3d00]' : 'bg-gray-100 text-gray-700'}`}>{STATUS_LABEL[m.status]}</span>
                {TEST_MARK_RE.test(m.subject) && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white">ТЕСТ — публиковать нельзя</span>}
                {m.flags.map((f) => (
                  <span key={f} className={`px-2 py-0.5 rounded-full ${WARN.includes(f) ? 'bg-red-50 text-red-800' : 'bg-[#eef2f9] text-[#12327A]'}`}>
                    {FLAG_LABEL[f] || f}
                  </span>
                ))}
              </div>

              <h3 className="font-extrabold text-[#0f1b33] [overflow-wrap:anywhere]">{m.subject || '(без темы)'}</h3>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-700">
                <div>
                  <dt className="inline text-gray-500">От: </dt>
                  <dd className="inline [overflow-wrap:anywhere]">
                    {m.from.name ? `${m.from.name} ` : ''}&lt;{m.from.address}&gt;
                    {m.sender.known && <b className="text-emerald-700"> · {m.sender.orgName}</b>}
                    {!m.sender.known && m.sender.govDomain && <span className="text-gray-500"> · домен .gov.kg</span>}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-gray-500">Получено: </dt>
                  <dd className="inline">{formatKgDateTime(m.receivedAt)}</dd>
                </div>
                <div>
                  <dt className="inline text-gray-500">Дата события (из текста): </dt>
                  <dd className="inline">{d.startDate ? `${formatKgDateTime(d.startDate)}${d.endDate ? ` — ${formatKgDateTime(d.endDate)}` : ''}` : <b className="text-amber-800">не найдена</b>}</dd>
                </div>
                <div>
                  <dt className="inline text-gray-500">Место (из текста): </dt>
                  <dd className="inline [overflow-wrap:anywhere]">
                    {d.location?.ru || <span className="text-amber-800">Место проведения не указано в источнике. Заполните, если это необходимо для публикации.</span>}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-gray-500">Подлинность письма: </dt>
                  <dd className="inline">
                    SPF {m.auth.spf || '—'} · DKIM {m.auth.dkim || '—'} · DMARC {m.auth.dmarc || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-gray-500">Вложения: </dt>
                  <dd className="inline">{m.attachments.length ? m.attachments.map((a) => a.name).join(', ') : 'нет'}</dd>
                </div>
              </dl>

              {m.suggestion.missing.length > 0 && (
                <p className="text-xs p-2 rounded-lg bg-amber-50 text-[#5c3d00]">
                  <b>Заполнить вручную:</b> {m.suggestion.missing.join(', ')}
                </p>
              )}
              {m.duplicateOf && <p className="text-xs text-gray-600">Повтор письма {m.duplicateOf}.</p>}
              {m.relatedIds.length > 0 && <p className="text-xs text-red-800">Похоже на прежние письма этого отправителя ({m.relatedIds.length}) — проверьте, не исправление ли это.</p>}
              {state && (
                <p className="text-xs font-semibold text-[#12327A]">
                  {state}{' '}
                  <button type="button" onClick={onOpenModeration} className="underline">
                    Открыть «Модерацию»
                  </button>
                </p>
              )}

              {photosOf.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700">Фото из письма — выберите, если оно относится к этой новости:</div>
                  <div className="flex flex-wrap gap-3">
                    {photosOf.map((a) => {
                      const key = a.storedKey!;
                      const url = photos[key];
                      return (
                        <div key={key} className="w-40 text-xs space-y-1">
                          {url ? (
                            <img src={url} alt={a.name} className="w-40 h-28 object-cover rounded-lg border border-gray-200" />
                          ) : url === null ? (
                            <div className="w-40 h-28 rounded-lg bg-gray-100 flex items-center justify-center text-center p-2 text-gray-600">Копия удалена — фото в письме</div>
                          ) : (
                            <button type="button" onClick={() => loadPhoto(key)} className="w-40 h-28 rounded-lg bg-[#eef2f9] text-[#12327A] font-bold">
                              Показать фото
                            </button>
                          )}
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              disabled={!url}
                              checked={chosen[m.id] === key}
                              onChange={(e) => setChosen((c) => ({ ...c, [m.id]: e.target.checked ? key : '' }))}
                            />
                            <span className="truncate">Взять в черновик: {a.name}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} className="text-xs font-bold text-[#12327A] hover:underline">
                  {open[m.id] ? 'Скрыть текст письма' : 'Показать текст письма'}
                </button>
                {open[m.id] && (
                  <div className="mt-2 space-y-2">
                    <pre className="text-xs whitespace-pre-wrap [overflow-wrap:anywhere] font-sans bg-[#f8fafc] p-3 rounded-lg max-h-80 overflow-y-auto">{m.text || '(пустое письмо)'}</pre>
                    {m.attachments
                      .filter((a) => a.kind === 'pdf')
                      .map((a) => (
                        <div key={a.name} className="text-xs">
                          <b>{a.name}</b> — {a.note}
                          {a.text && <pre className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] font-sans bg-[#fff8e6] p-3 rounded-lg max-h-60 overflow-y-auto">{a.text}</pre>}
                        </div>
                      ))}
                    {m.links.length > 0 && (
                      <div className="text-xs">
                        <b>Ссылки из письма (не открывались автоматически):</b>
                        <ul className="list-disc pl-5">
                          {m.links.map((l) => (
                            <li key={l} className="break-all">
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(m.status === 'new' || (m.status === 'prepared' && !state)) && (
                  <button
                    type="button"
                    disabled={busy === m.id}
                    onClick={() => act(m.id, () => onPrepare(m, chosen[m.id] ? photos[chosen[m.id]] || undefined : undefined), '')}
                    className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-sm font-bold disabled:opacity-60"
                  >
                    Подготовить черновик
                  </button>
                )}
                {m.status === 'new' && (
                  <>
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => act(m.id, () => api.mailItemAction(m.id, 'reject'), 'Письмо отклонено — на сайте ничего не изменилось')}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold disabled:opacity-60"
                    >
                      Отклонить
                    </button>
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => act(m.id, () => api.mailItemAction(m.id, 'duplicate'), 'Помечено как дубль')}
                      className="px-4 py-2 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold disabled:opacity-60"
                    >
                      Дубль
                    </button>
                  </>
                )}
                {(m.status === 'rejected' || m.status === 'duplicate') && (
                  <button
                    type="button"
                    disabled={busy === m.id}
                    onClick={() => act(m.id, () => api.mailItemAction(m.id, 'reopen'), 'Письмо возвращено в новые')}
                    className="px-4 py-2 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold disabled:opacity-60"
                  >
                    Вернуть в новые
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === m.id}
                  onClick={() => act(m.id, () => api.mailItemAction(m.id, 'reparse'), 'Письмо разобрано заново')}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-bold disabled:opacity-60"
                >
                  Разобрать заново
                </button>
                {m.permalink && (
                  <a href={m.permalink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-[#12327A] text-sm font-bold">
                    Открыть в Gmail
                  </a>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};
