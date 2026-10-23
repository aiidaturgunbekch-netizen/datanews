import React, { useEffect, useRef, useState } from 'react';
import { Announcement, Language } from '../types';
import type { BotAction, BotIntent, BotNav, BotReply } from '../types/bot';
import { BOT_INTENTS } from '../types/bot';
import { INTENT_LABEL } from '../config/bot';
import * as api from '../services/api';
import { answer } from '../lib/botEngine';
import { ErrorBoundary } from './ErrorBoundary';
import type { OfficialForecast } from '../config/weather';
import { CONTACTS } from '../config/contacts';

type L3 = Record<Language, string>;
const T: Record<string, L3> = {
  open: { ru: 'Спросить DataNews AI', kg: 'DataNews AI\'дан суроо', en: 'Ask DataNews AI' },
  title: { ru: 'DataNews AI', kg: 'DataNews AI', en: 'DataNews AI' },
  sub: {
    ru: 'Бот по данным сайта — без внешнего ИИ',
    kg: 'Сайттын маалыматтары боюнча бот — тышкы ЖИсиз',
    en: 'Site-data bot — no external AI',
  },
  hello: {
    ru: 'Здравствуйте! Я отвечаю по новостям, афише и предупреждениям, опубликованным на DataNews. Выберите тему или напишите вопрос — например, «Что сегодня в Бишкеке?» или «Концерты на этой неделе».',
    kg: 'Саламатсызбы! DataNews сайтында жарыяланган жаңылыктар, афиша жана эскертүүлөр боюнча жооп берем. Теманы тандаңыз же суроо жазыңыз — мисалы, «Бүгүн Бишкекте эмне болот?».',
    en: 'Hello! I answer from news, listings and warnings published on DataNews. Pick a topic or type a question — e.g. "What is on today in Bishkek?" or "Concerts this week".',
  },
  placeholder: { ru: 'Ваш вопрос…', kg: 'Сурооңуз…', en: 'Your question…' },
  send: { ru: 'Отправить', kg: 'Жөнөтүү', en: 'Send' },
  thinking: { ru: 'Ищу на сайте…', kg: 'Сайттан издеп жатам…', en: 'Searching the site…' },
  open_post: { ru: 'Открыть', kg: 'Ачуу', en: 'Open' },
  source: { ru: 'Источник', kg: 'Булак', en: 'Source' },
  ticket: { ru: 'Купить билет', kg: 'Билет сатып алуу', en: 'Buy ticket' },
  topics: { ru: 'Темы', kg: 'Темалар', en: 'Topics' },
  clear: { ru: 'Очистить', kg: 'Тазалоо', en: 'Clear' },
  disclaimer: {
    ru: 'Ответы — из данных сайта, без внешнего ИИ. Не экстренная служба: при опасности звоните 112. Не вводите личные данные.',
    kg: 'Жооптор — сайттын маалыматтарынан, тышкы ЖИсиз. Шашылыш кызмат эмес: коркунучта 112ге чалыңыз. Жеке маалыматтарды жазбаңыз.',
    en: 'Answers come from site data, no external AI. Not an emergency service: in danger call 112. Do not enter personal data.',
  },
  error: { ru: 'Не удалось получить ответ. Попробуйте ещё раз.', kg: 'Жооп алуу мүмкүн болгон жок. Дагы аракет кылыңыз.', en: 'Could not get an answer. Please try again.' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
};

interface Msg {
  role: 'user' | 'bot';
  text: string;
  reply?: BotReply;
  error?: boolean;
}

/** История переписки хранится только в этом браузере и только до закрытия вкладки */
const STORE = 'datanews_chat_v1';
/** Любое значение — в текст (React не умеет показывать объекты) */
const txt = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : typeof v === 'object' ? '' : String(v));

/** Ответ бота в ожидаемом виде? (иначе не рисуем его, а показываем ошибку) */
const isReply = (r: unknown): r is BotReply => {
  const x = r as BotReply;
  return Boolean(x) && typeof x.answer === 'string' && Array.isArray(x.items) && Array.isArray(x.links) && Array.isArray(x.actions);
};
const load = (): Msg[] => {
  try {
    const raw = sessionStorage.getItem(STORE);
    const list = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && typeof m.text === 'string' && (!m.reply || isReply(m.reply))).slice(-30) : [];
  } catch {
    return [];
  }
};

export const ChatWidget: React.FC<{
  lang: Language;
  announcements: Announcement[];
  onOpen: (a: Announcement) => void;
  onNavigate: (nav: BotNav) => void;
}> = ({ lang, announcements, onOpen, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const endRef = useRef<HTMLDivElement>(null);
  const official = useRef<OfficialForecast | null>(null);

  // Официальный прогноз, внесённый редакцией, — один раз при открытии чата
  useEffect(() => {
    if (!open) return;
    api
      .fetchWeather()
      .then((r) => (official.current = r.official || null))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* приватный режим — история просто не сохраняется */
    }
  }, [msgs]);
  // Фигурные скобки обязательны: в новых версиях Chrome scrollIntoView возвращает Promise,
  // а React вызывает то, что вернул эффект, как функцию очистки («destroy is not a function»)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = async (input: { q?: string; intent?: BotIntent }, shown: string) => {
    if (busy) return;
    setQ('');
    setMsgs((m) => [...m, { role: 'user', text: shown }]);
    setBusy(true);
    try {
      // Ответ считается прямо в браузере по данным, которые сайт уже загрузил; сервер — запасной вариант
      let reply: unknown;
      try {
        reply = answer({ ...input, lang }, announcements, official.current);
      } catch (e) {
        console.error('[DataNews bot] ответ в браузере не получен, запрос к серверу', e);
        reply = await api.askBot(input, lang);
      }
      if (!isReply(reply)) throw new Error('Неверный формат ответа бота');
      setMsgs((m) => [...m, { role: 'bot', text: reply.answer, reply }]);
    } catch (e) {
      // Посетителю — понятное сообщение, разработчику — подробности в консоли
      console.error('[DataNews bot]', e);
      setMsgs((m) => [...m, { role: 'bot', text: T.error[lang], error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const runAction = (a: BotAction) => {
    if (a.nav) {
      onNavigate(a.nav);
      setOpen(false);
    } else if (a.intent) ask({ intent: a.intent }, a.label);
    else if (a.q) ask({ q: a.q }, a.label);
  };

  const chip = 'px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left';
  const chipLight = `${chip} bg-white border border-gray-200 text-[#0f1b33] hover:bg-[#e6ecf8]`;
  const chipNav = `${chip} bg-[#12327A] text-white hover:bg-[#0d2459]`;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[90] inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#12327A] text-white font-bold shadow-xl hover:bg-[#0d2459] focus-visible:ring-4 focus-visible:ring-[#20C7B5]/50"
          aria-label={T.open[lang]}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            smart_toy
          </span>
          <span className="hidden sm:inline">{T.open[lang]}</span>
        </button>
      )}
      {open && (
        <div
          role="dialog"
          translate="no"
          aria-modal="false"
          aria-label={T.title[lang]}
          className="notranslate fixed z-[95] bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[410px] h-[88vh] sm:h-[620px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col"
        >
          <div className="bg-[#0d2459] text-white px-4 py-3 rounded-t-2xl flex items-start justify-between gap-2">
            <div>
              <div className="font-extrabold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#20C7B5]" aria-hidden="true">
                  smart_toy
                </span>
                {T.title[lang]}
              </div>
              <div className="text-[11px] text-white/75">{T.sub[lang]}</div>
            </div>
            <div className="flex items-center gap-1">
              {msgs.length > 0 && (
                <button onClick={() => setMsgs([])} className="px-2 h-8 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-bold">
                  {T.clear[lang]}
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label={T.close[lang]} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm" aria-live="polite">
            {/* Приветствие и темы — всегда первыми */}
            <div className="max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-md bg-[#f3f6fc] text-[#0f1b33]">
              <p>{T.hello[lang]}</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {BOT_INTENTS.map((id) => (
                  <button key={id} onClick={() => ask({ intent: id }, INTENT_LABEL[id][lang])} className={chipLight}>
                    {INTENT_LABEL[id][lang]}
                  </button>
                ))}
              </div>
            </div>

            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] w-fit px-3 py-2 rounded-2xl rounded-br-md bg-[#12327A] text-white">
                  {txt(m.text)}
                </div>
              ) : (
                <ErrorBoundary
                  key={i}
                  fallback={(_r, err) => (
                    <div className="max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-md bg-red-50 text-red-800 text-xs">
                      {T.error[lang]} {err && <span className="block text-[10px] opacity-70 break-all">{err.slice(0, 160)}</span>}
                    </div>
                  )}
                >
                <div className={`max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-md ${m.error ? 'bg-red-50 text-red-800' : 'bg-[#f3f6fc] text-[#0f1b33]'}`}>
                  <p className="whitespace-pre-line">{txt(m.text)}</p>
                  {m.reply && m.reply.items.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {m.reply.items.map((it) => {
                        const ann = announcements.find((a) => a.id === it.id);
                        return (
                          <li key={it.id} className="bg-white rounded-xl p-2 border border-gray-100">
                            <div className="text-xs font-bold">{txt(it.title)}</div>
                            <div className="text-[11px] text-gray-500">
                              {txt(it.when)} • {txt(it.place)}
                            </div>
                            {it.note && <div className="text-[11px] font-semibold text-[#12327A]">{txt(it.note)}</div>}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-bold">
                              {ann ? (
                                <button onClick={() => onOpen(ann)} className="text-[#12327A] hover:underline">
                                  {T.open_post[lang]}
                                </button>
                              ) : (
                                <a href={`/#/n/${it.id}`} className="text-[#12327A] hover:underline">
                                  {T.open_post[lang]}
                                </a>
                              )}
                              {it.sourceUrl && (
                                <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#12327A] hover:underline">
                                  {T.source[lang]} ↗
                                </a>
                              )}
                              {it.ticketUrl && (
                                <a href={it.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-[#0f766e] hover:underline">
                                  {T.ticket[lang]} ↗
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {m.reply && m.reply.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.reply.links.map((l) => (
                        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-[#12327A] hover:border-[#12327A]">
                          {txt(l.label)} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  {m.reply && m.reply.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.reply.actions.map((a, k) => (
                        <button key={k} onClick={() => runAction(a)} className={a.nav ? chipNav : chipLight}>
                          {txt(a.label)}
                          {a.nav ? ' →' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                </ErrorBoundary>
              )
            )}
            {busy && <div className="text-xs text-gray-500">{T.thinking[lang]}</div>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-gray-100 p-3 space-y-2">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = q.trim();
                if (text) ask({ q: text }, text);
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={300}
                placeholder={T.placeholder[lang]}
                aria-label={T.placeholder[lang]}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#12327A]/30"
              />
              <button disabled={busy || !q.trim()} className="px-3 py-2 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-sm disabled:opacity-50" aria-label={T.send[lang]}>
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-500 leading-tight">{T.disclaimer[lang]}</p>
              <a href={CONTACTS.whatsappUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-bold text-[#12327A] hover:underline">
                WhatsApp ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
