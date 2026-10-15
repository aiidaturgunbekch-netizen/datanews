import React, { useEffect, useRef, useState } from 'react';
import { Announcement, Language } from '../types';
import * as api from '../services/api';
import { CONTACTS } from '../config/contacts';
import { formatDayMonth } from '../utils/dates';

type L3 = Record<Language, string>;
const T: Record<string, L3> = {
  open: { ru: 'Спросить DataNews AI', kg: 'DataNews AI\'дан суроо', en: 'Ask DataNews AI' },
  title: { ru: 'DataNews AI', kg: 'DataNews AI', en: 'DataNews AI' },
  sub: {
    ru: 'Отвечает по данным сайта со ссылками на источники',
    kg: 'Сайттын маалыматтары боюнча булактарга шилтеме менен жооп берет',
    en: 'Answers from site data with links to sources',
  },
  placeholder: { ru: 'Ваш вопрос…', kg: 'Сурооңуз…', en: 'Your question…' },
  send: { ru: 'Отправить', kg: 'Жөнөтүү', en: 'Send' },
  thinking: { ru: 'Ищу ответ…', kg: 'Жооп издеп жатам…', en: 'Looking it up…' },
  aiLabel: { ru: 'Ответ ИИ по данным сайта', kg: 'Сайттын маалыматы боюнча ЖИ жообу', en: 'AI answer from site data' },
  searchLabel: { ru: 'Поиск по сайту (без ИИ)', kg: 'Сайттан издөө (ЖИсиз)', en: 'Site search (no AI)' },
  open_post: { ru: 'Открыть', kg: 'Ачуу', en: 'Open' },
  source: { ru: 'Первоисточник', kg: 'Түпкү булак', en: 'Source' },
  contact: { ru: 'Написать редакции', kg: 'Редакцияга жазуу', en: 'Message the editors' },
  disclaimer: {
    ru: 'Не экстренная служба: при опасности звоните 112. Не вводите личные данные — вопрос может быть передан ИИ-сервису Anthropic.',
    kg: 'Шашылыш кызмат эмес: коркунучта 112ге чалыңыз. Жеке маалыматтарды жазбаңыз — суроо Anthropic ЖИ-кызматына берилиши мүмкүн.',
    en: 'Not an emergency service: in danger call 112. Do not enter personal data — questions may be sent to the Anthropic AI service.',
  },
  error: { ru: 'Не удалось получить ответ. Попробуйте позже.', kg: 'Жооп алуу мүмкүн болгон жок. Кийинчерээк аракет кылыңыз.', en: 'Could not get an answer. Please try later.' },
  close: { ru: 'Закрыть', kg: 'Жабуу', en: 'Close' },
};

const QUICK: L3[] = [
  { ru: 'Что сегодня происходит в Бишкеке?', kg: 'Бүгүн Бишкекте эмне болуп жатат?', en: 'What is happening in Bishkek today?' },
  { ru: 'Какие предупреждения сейчас действуют?', kg: 'Азыр кайсы эскертүүлөр күчүндө?', en: 'Which warnings are active now?' },
  { ru: 'Какие изменения законов вступают в силу?', kg: 'Мыйзамдардын кайсы өзгөрүүлөрү күчүнө кирет?', en: 'Which law changes come into force?' },
  { ru: 'Какая погода завтра по областям?', kg: 'Эртең облустарда аба ырайы кандай?', en: 'What is the weather tomorrow by region?' },
  { ru: 'Как добавить объявление и сколько стоит?', kg: 'Жарыяны кантип кошом жана канча турат?', en: 'How do I post a notice and what does it cost?' },
];

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  reply?: api.AssistantReply;
  error?: boolean;
}

export const ChatWidget: React.FC<{ lang: Language; announcements: Announcement[]; onOpen: (a: Announcement) => void }> = ({ lang, announcements, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setQ('');
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.reply?.answer || m.text }));
    setMsgs((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const reply = await api.askAssistant(text, lang, history);
      setMsgs((m) => [...m, { role: 'assistant', text: reply.answer || reply.notice || '', reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: (e as api.ApiError).message || T.error[lang], error: true }]);
    } finally {
      setBusy(false);
    }
  };

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
          aria-modal="false"
          aria-label={T.title[lang]}
          className="fixed z-[95] bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[400px] h-[85vh] sm:h-[600px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col"
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
            <button onClick={() => setOpen(false)} aria-label={T.close[lang]} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm" aria-live="polite">
            {msgs.length === 0 && (
              <div className="space-y-2">
                {QUICK.map((qq) => (
                  <button key={qq.ru} onClick={() => ask(qq[lang])} className="block w-full text-left px-3 py-2 rounded-xl bg-[#f3f6fc] hover:bg-[#e6ecf8] text-[#0f1b33] text-xs font-semibold">
                    {qq[lang]}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-[#12327A] text-white">
                  {m.text}
                </div>
              ) : (
                <div key={i} className={`max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-md ${m.error ? 'bg-red-50 text-red-800' : 'bg-[#f3f6fc] text-[#0f1b33]'}`}>
                  {m.reply && (
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${m.reply.mode === 'ai' ? 'text-[#0f766e]' : 'text-amber-700'}`}>
                      {m.reply.mode === 'ai' ? T.aiLabel[lang] : T.searchLabel[lang]}
                    </div>
                  )}
                  {m.text && <p className="whitespace-pre-line">{m.text}</p>}
                  {m.reply && m.reply.items.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {m.reply.items.map((it) => {
                        const ann = announcements.find((a) => a.id === it.id);
                        return (
                          <li key={it.id} className="bg-white rounded-xl p-2 border border-gray-100">
                            <div className="text-xs font-bold">{it.title}</div>
                            <div className="text-[11px] text-gray-500">{formatDayMonth(it.startDate.slice(0, 10), lang)}</div>
                            <div className="flex gap-3 mt-1 text-[11px] font-bold">
                              {ann && (
                                <button onClick={() => onOpen(ann)} className="text-[#12327A] hover:underline">
                                  {T.open_post[lang]}
                                </button>
                              )}
                              {it.sourceUrl && (
                                <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#12327A] hover:underline">
                                  {T.source[lang]} ↗
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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
                ask(q);
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={500}
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
                {T.contact[lang]}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
