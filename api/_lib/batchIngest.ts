/**
 * Автоприём пакета новостей из редакционной почты.
 *
 * Утренний и вечерний сборщики (Claude) отправляют пакет DATANEWS-BATCH … END-BATCH письмом на сам ящик
 * datanews.kg7@gmail.com. Скрипт почты помечает такое письмо как отправленное этим же ящиком (метка Gmail «Отправленные» —
 * её нельзя поставить письму снаружи) и передаёт его на сайт подписанным запросом. Только тогда сайт разбирает пакет:
 *   - «new»     — черновик в «Модерации» (на сайт не попадает до «Одобрить»), фото — из письма-источника, если оно уже принято;
 *   - «weather» — официальный прогноз Кыргызгидромета сразу на сайте (как в панели «Прогноз погоды»);
 *   - «translate» и «update» правят опубликованное — только вручную через «Вставить пакет новостей».
 * Похожие на уже существующие публикации пропускаются. Итог записывается в историю письма.
 */
import type { Announcement, MailItem } from '../../src/types';
import { BatchNew, parseBatch, toDraftItem } from '../../src/utils/batch';
import { TEST_MARK_RE } from '../../src/config/mailSenders';
import { INITIAL_ANNOUNCEMENTS } from '../../src/data/initialAnnouncements';
import { kgNowLocal } from '../../src/utils/time';
import { cmd, hgetJson, hvalsJson } from './kv';
import { ANN_KEY, findDuplicate, GALLERY_MAX, sanitize, saveAnnouncement, storeImage, withHistory } from './announcements';
import { saveOfficial } from './officialWeather';

export const MAIL_KEY_BATCH = 'dn:mail';

export interface BatchResult {
  drafts: string[];
  weather: string[];
  skipped: string[];
  errors: string[];
}

/** Фото письма-источника (если письмо уже принято сайтом): главное + галерея */
const mailPhotos = async (mailId: string) => {
  const mail = await hgetJson<MailItem>(MAIL_KEY_BATCH, mailId);
  const keys = (mail?.attachments || []).filter((a) => a.kind === 'image' && a.storedKey).map((a) => a.storedKey!);
  const data: string[] = [];
  for (const k of keys.slice(0, GALLERY_MAX + 1)) {
    const d = await cmd<string | null>('GET', k);
    if (d) data.push(d);
  }
  if (!data.length) return { found: Boolean(mail) };
  const gallery: string[] = [];
  for (const d of data.slice(1)) gallery.push(await storeImage(d));
  return { found: true, imageData: data[0], gallery };
};

const draftFrom = async (b: BatchNew, batchMailId: string) => {
  const photos = b.mailId ? await mailPhotos(b.mailId) : { found: false };
  const raw: Record<string, unknown> = { ...toDraftItem(b) };
  if ('imageData' in photos && photos.imageData) Object.assign(raw, { imageData: photos.imageData, gallery: photos.gallery, imageUrl: '', imageCredit: undefined, imageSourceUrl: undefined });
  let item: Announcement = await sanitize(raw as Record<string, any>);
  item.moderationStatus = 'pending';
  item.dataOrigin = item.dataOrigin || 'manual';
  item.lastCheckedAt = undefined;
  if (TEST_MARK_RE.test(`${item.title.ru}\n${item.description.ru}`)) item.testMaterial = true;
  const note = `Черновик из пакета сборщика (письмо ${batchMailId})${b.mailId ? `, источник — письмо ${b.mailId}${photos.found ? '' : ' (письмо ещё не принято — без фото)'}` : ''}`;
  item = withHistory(item, 'admin', 'created', note);
  return item;
};

export const importBatch = async (text: string, batchMailId: string): Promise<BatchResult> => {
  const out: BatchResult = { drafts: [], weather: [], skipped: [], errors: [] };
  const { items, errors } = parseBatch(text);
  out.errors.push(...errors);
  const pool = [...(await hvalsJson<Announcement>(ANN_KEY)), ...INITIAL_ANNOUNCEMENTS];
  for (const b of items) {
    try {
      if (b.kind === 'weather') {
        const f = await saveOfficial(b.forecast);
        out.weather.push(f.date);
      } else if (b.kind === 'new') {
        const item = await draftFrom(b, batchMailId);
        const dup = findDuplicate(item, pool);
        if (dup) {
          out.skipped.push(`«${b.title.ru}» — уже есть «${dup.title.ru}»`);
          continue;
        }
        await saveAnnouncement(item);
        pool.push(item);
        out.drafts.push(item.title.ru);
        // письмо-источник — «подготовлено»: черновик сделан
        if (b.mailId) {
          const src = await hgetJson<MailItem>(MAIL_KEY_BATCH, b.mailId);
          if (src && src.status === 'new') {
            src.status = 'prepared';
            src.annId = item.id;
            src.history = [...src.history, { at: kgNowLocal(), action: 'prepared', note: 'Черновик из пакета сборщика' }].slice(-50);
            await cmd('HSET', MAIL_KEY_BATCH, src.id, JSON.stringify(src));
          }
        }
      } else {
        out.skipped.push(`№${b.n}: ${b.kind === 'translate' ? 'перевод' : 'исправление'} — только вручную («Вставить пакет новостей»)`);
      }
    } catch (e) {
      out.errors.push(`№${b.n}: ${(e as Error).message}`);
    }
  }
  return out;
};

export const batchSummary = (r: BatchResult) =>
  [
    `черновиков: ${r.drafts.length}`,
    r.weather.length ? `прогноз погоды: ${r.weather.join(', ')}` : '',
    r.skipped.length ? `пропущено: ${r.skipped.length}` : '',
    r.errors.length ? `ошибки: ${r.errors.join('; ').slice(0, 300)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
