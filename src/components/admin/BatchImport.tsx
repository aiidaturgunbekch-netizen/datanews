import React, { useState } from 'react';
import type { Announcement, MailItem } from '../../types';
import * as api from '../../services/api';
import { BatchItem, parseBatch, shortOf, toDraftItem } from '../../utils/batch';
import { missingLangs } from '../../utils/lang';

/**
 * «Вставить пакет новостей»: блок от Claude → черновики в «Модерацию» (тексты RU/KG/EN, поля, фото из письма)
 * и переводы уже опубликованных. Ничего не публикует: на сайт новость попадает только после «Одобрить».
 */
export const BatchImport: React.FC<{
  serverItems: Announcement[];
  loadMailItems: () => Promise<MailItem[]>;
  /** Уменьшить фото письма для сайта (data URL → data URL), как при ручной подготовке черновика */
  shrinkPhoto: (dataUrl: string) => Promise<string>;
  onDone: () => void;
}> = ({ serverItems, loadMailItems, shrinkPhoto, onDone }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: string[]; skipped: string[]; errors: string[] } | null>(null);
  const preview = text.trim() ? parseBatch(text) : null;

  /** Фото письма: главное + галерея (все фото письма по порядку) */
  const mailPhotos = async (mail: MailItem | undefined) => {
    const keys = (mail?.attachments || []).filter((a) => a.kind === 'image' && a.storedKey).map((a) => a.storedKey!);
    const data: string[] = [];
    for (const k of keys.slice(0, 9)) {
      try {
        const small = await shrinkPhoto(await api.fetchMailAttachment(k));
        if (small) data.push(small);
      } catch {
        /* копия фото удалена — пропускаем */
      }
    }
    if (!data.length) return {};
    const gallery: string[] = [];
    for (const d of data.slice(1)) gallery.push(await api.uploadImage(d));
    return { imageData: data[0], gallery };
  };

  const run = async () => {
    const { items, errors } = parseBatch(text);
    if (!items.length) {
      setLog({ ok: [], skipped: [], errors: errors.length ? errors : ['В пакете нет новостей'] });
      return;
    }
    setBusy(true);
    const ok: string[] = [];
    const skipped: string[] = [];
    const errs = [...errors];
    let mails: MailItem[] = [];
    if (items.some((i) => i.kind === 'new' && i.mailId)) {
      try {
        mails = await loadMailItems();
      } catch {
        errs.push('Не удалось загрузить «Материалы из почты» — новости из писем будут без фото');
      }
    }
    for (const b of items as BatchItem[]) {
      try {
        if (b.kind === 'translate') {
          const cur = serverItems.find((x) => x.id === b.id);
          if (!cur) {
            errs.push(`№${b.n}: публикация ${b.id} не найдена (встроенные новости уже переведены)`);
            continue;
          }
          const title = { ...cur.title, ...Object.fromEntries(Object.entries(b.title).filter(([, v]) => v)) };
          const description = { ...cur.description, ...Object.fromEntries(Object.entries(b.text).filter(([, v]) => v)) };
          const summary = {
            ...cur.summary,
            ...Object.fromEntries(Object.entries(b.text).filter(([, v]) => v).map(([k, v]) => [k, shortOf(v as string)])),
          };
          await api.updateAnnouncement(cur.id, { ...cur, title, description, summary });
          ok.push(`№${b.n}: перевод добавлен — «${title.ru || title.kg}»`);
          continue;
        }
        const mail = b.mailId ? mails.find((m) => m.id === b.mailId) : undefined;
        if (b.mailId && !mail && mails.length) errs.push(`№${b.n}: письмо ${b.mailId} не найдено во «Материалах из почты» — черновик без фото письма`);
        const photos = mail ? await mailPhotos(mail) : {};
        const item = { ...toDraftItem(b), ...photos, ...(photos.imageData ? { imageUrl: '' } : {}) };
        let saved: Announcement;
        try {
          saved = await api.submitDraft(item, mail?.id);
        } catch (e) {
          if ((e as api.ApiError).code === 'duplicate') {
            skipped.push(`№${b.n}: «${b.title.ru}» — ${(e as Error).message}`);
            continue;
          }
          throw e;
        }
        if (mail) await api.mailItemAction(mail.id, 'prepared', { annId: saved.id }).catch(() => undefined);
        ok.push(`№${b.n}: черновик «${b.title.ru}»${photos.imageData ? ` + фото${photos.gallery?.length ? ` (${photos.gallery.length + 1})` : ''}` : ''}`);
      } catch (e) {
        errs.push(`№${b.n}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setLog({ ok, skipped, errors: errs });
    if (ok.length) {
      setText('');
      onDone();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#12327A]/20 p-4 space-y-3" data-batch-import>
      <div className="text-sm font-extrabold text-[#0f1b33]">Вставить пакет новостей от Claude</div>
      <p className="text-xs text-gray-600">
        Вставьте блок целиком — от строки <b>DATANEWS-BATCH</b> до <b>END-BATCH</b>. Сайт создаст черновики в «Модерации» с текстами на русском,
        кыргызском и английском и подставит фото из писем. На сайт ничего не попадает, пока вы не нажмёте «Одобрить».
      </p>
      <textarea
        className="w-full h-40 px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setLog(null);
        }}
        placeholder="DATANEWS-BATCH …"
      />
      {preview && (
        <p className="text-xs text-gray-700" data-batch-preview>
          В пакете: новых новостей — {preview.items.filter((i) => i.kind === 'new').length}, переводов — {preview.items.filter((i) => i.kind === 'translate').length}
          {preview.errors.length > 0 && <span className="text-red-700 font-semibold"> · с ошибками — {preview.errors.length} (их пропущу)</span>}
        </p>
      )}
      <button
        type="button"
        disabled={busy || !preview || preview.items.length === 0}
        onClick={run}
        className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-sm font-bold disabled:opacity-50"
      >
        {busy ? 'Создаю черновики…' : 'Создать черновики'}
      </button>
      {log && (
        <div className="space-y-2 text-xs" role="status" data-batch-log>
          {log.ok.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800">
              <b>Готово: {log.ok.length}</b>
              <ul className="list-disc pl-5 mt-1">
                {log.ok.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {log.skipped.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-900">
              <b>Пропущено — уже есть похожие: {log.skipped.length}</b>
              <ul className="list-disc pl-5 mt-1">
                {log.skipped.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {log.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800" role="alert">
              <b>Не выполнено: {log.errors.length}</b>
              <ul className="list-disc pl-5 mt-1">
                {log.errors.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Блок «новости без перевода» для Claude: id, чего не хватает и тексты на имеющемся языке */
export const untranslatedForClaude = (items: Announcement[]) => {
  const list = items
    .filter((a) => a.moderationStatus !== 'rejected' && missingLangs(a).length)
    .map((a) => {
      const miss = missingLangs(a);
      const has = miss.includes('RU') ? 'kg' : 'ru';
      return { id: a.id, missing: miss, title: a.title[has], text: a.description[has] };
    });
  return list.length
    ? `Claude, переведи для DataNews (нужен пакет kind: "translate"):\n${JSON.stringify(list, null, 1)}`
    : '';
};
