import React, { useEffect, useState } from 'react';
import { MODERATION_REMINDER, confirmApproveWithoutKg, missingKg } from '../utils/translation';
import type { Announcement, Language } from '../types';
import * as api from '../services/api';
import { getTranslation } from '../locales/translations';
import { formatWhen } from '../utils/dates';
import { EventImage } from './EventImage';

const T = {
  title: { ru: 'Ожидают модерации', kg: 'Модерацияны күтүүдө', en: 'Awaiting moderation' },
  hint: {
    ru: 'Проверьте текст, дату и источник. «Одобрить» — материал сразу появится на сайте. Отклонять и снимать материалы может только администратор.',
    kg: 'Текстти, датаны жана булакты текшериңиз. «Жактыруу» — материал сайтка дароо чыгат. Четке кагып же алып салууну администратор гана жасайт.',
    en: 'Check the text, date and source. "Approve" publishes it immediately. Only the administrator can reject or take materials down.',
  },
  none: { ru: 'Новых материалов нет', kg: 'Жаңы материалдар жок', en: 'Nothing new' },
  approve: { ru: 'Одобрить', kg: 'Жактыруу', en: 'Approve' },
  edit: { ru: 'Исправить', kg: 'Оңдоо', en: 'Edit' },
  edited: { ru: 'Исправлено', kg: 'Оңдолду', en: 'Edited' },
  done: { ru: 'Одобрено и опубликовано', kg: 'Жактырылды жана жарыяланды', en: 'Approved and published' },
  source: { ru: 'Источник', kg: 'Булак', en: 'Source' },
  loading: { ru: 'Загрузка…', kg: 'Жүктөлүүдө…', en: 'Loading…' },
};

/** «Модерация» в кабинете сотрудника редакции: черновики (без платных размещений), «Одобрить» и «Исправить» */
export const EditorModeration: React.FC<{ lang: Language; onEdit: (a: Announcement) => void; onCount?: (n: number) => void }> = ({ lang, onEdit, onCount }) => {
  const { t } = getTranslation(lang);
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<Record<string, { ok?: string; err?: string }>>({});
  const [busy, setBusy] = useState('');
  // последнее одобренное — сообщение остаётся видно и после того, как материал ушёл из списка
  const [lastDone, setLastDone] = useState('');
  const load = () =>
    api
      .fetchPendingForEditor()
      .then((list) => {
        setItems(list);
        onCount?.(list.length);
      })
      .catch((e: Error) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (a: Announcement) => {
    if (!confirmApproveWithoutKg(a)) return;
    setBusy(a.id);
    setResult((r) => ({ ...r, [a.id]: {} }));
    try {
      await api.moderateAnnouncement(a.id, 'approve');
      setLastDone(`${T.done[lang]}: «${a.title[lang] || a.title.ru}»`);
      setTimeout(load, 1200);
    } catch (e) {
      setResult((r) => ({ ...r, [a.id]: { err: (e as Error).message } }));
    } finally {
      setBusy('');
    }
  };

  if (err) return <p className="text-sm text-red-700">{err}</p>;
  if (!items) return <p className="text-sm text-gray-500">{T.loading[lang]}</p>;
  return (
    <div className="space-y-3" data-editor-moderation>
      <p className="text-xs text-gray-600">{T.hint[lang]}</p>
      {lastDone && (
        <p className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold" role="status">
          {lastDone}
        </p>
      )}
      {items.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm bg-[#f8fafc] rounded-2xl">{T.none[lang]}</div>
      ) : (
        items.map((a) => {
          const wasEdited = (a.history || []).some((h) => h.action === 'edited');
          const src = a.eventSourceUrl || a.authorityUrl;
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
              <EventImage item={a} lang={lang} compact className="sm:w-40 h-28 sm:h-auto flex-shrink-0" />
              <div className="p-3 flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44]">{t(`categories.${a.category}`)}</span>
                  {wasEdited && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{T.edited[lang]}</span>}
                </div>
                <h3 className="font-extrabold text-sm text-[#0f1b33] [overflow-wrap:anywhere]">{a.title[lang] || a.title.ru}</h3>
                <p className="text-xs text-gray-700 line-clamp-3">{a.description[lang] || a.description.ru}</p>
                <p className="text-xs text-gray-500">
                  {formatWhen(a.startDate, a.endDate, lang, false, a.timeTBA, a.allDay)}
                  {src && (
                    <>
                      {' · '}
                      <a href={src} target="_blank" rel="noopener noreferrer" className="font-bold text-[#12327A] hover:underline">
                        {T.source[lang]}
                      </a>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-gray-600" data-mod-reminder>
                  {MODERATION_REMINDER}
                  {missingKg(a).length > 0 && <span className="ml-1 font-bold text-amber-700" data-no-kg>Нет перевода на кыргызский: {missingKg(a).join(', ')}</span>}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => approve(a)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {T.approve[lang]}
                  </button>
                  <button type="button" onClick={() => onEdit(a)} className="px-3 py-1.5 rounded-lg bg-[#eef2f9] text-[#12327A] text-xs font-bold">
                    {T.edit[lang]}
                  </button>
                </div>
                {result[a.id]?.ok && <p className="text-xs text-emerald-800">{result[a.id].ok}</p>}
                {result[a.id]?.err && <p className="text-xs text-red-700">{result[a.id].err}</p>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
