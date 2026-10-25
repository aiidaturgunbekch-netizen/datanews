/**
 * Приём писем из редакционной почты (Google Apps Script → POST /api/sources?mail=ingest).
 *
 * Письмо сохраняется как входящий материал (dn:mail) — оно никогда не создаёт, не одобряет
 * и не публикует новость. Публикацию из письма готовит редактор в обычной форме панели.
 *
 * Защита запроса от скрипта (отдельно от входа администратора):
 *   X-DataNews-Timestamp  — время отправки, мс; запрос старше / новее 5 минут отклоняется;
 *   X-DataNews-Nonce      — случайная строка; повтор того же запроса отклоняется (dn:mail:nonce:…, 10 мин);
 *   X-DataNews-Signature  — hex HMAC-SHA256(MAIL_INGEST_SECRET, `${timestamp}.${nonce}.${тело запроса}`).
 * Сам секрет по сети не передаётся, в ответы и логи не попадает.
 */
import type { MailAttachment, MailFlag, MailItem } from '../../src/types';
import { parseNotice } from '../../src/utils/importText';
import { findKnownSender, isGovDomain } from '../../src/config/mailSenders';
import { kgNowLocal } from '../../src/utils/time';
import { cmd, hgetJson, hvalsJson } from './kv';
import { env } from './env';
import { HttpError } from './http';

export const MAIL_KEY = 'dn:mail'; // id письма Gmail → MailItem
export const MAIL_FP_KEY = 'dn:mail:fp'; // отпечаток содержания → id письма
export const MAIL_RFC_KEY = 'dn:mail:rfc'; // заголовок Message-ID → id письма
export const mailAttKey = (id: string, n: number) => `dn:mail:att:${id}:${n}`;
const NONCE_KEY = (n: string) => `dn:mail:nonce:${n}`;

export const MAX_BODY = 4_000_000; // символов JSON в одном запросе (одно письмо)
export const SIGNATURE_TTL_MS = 5 * 60_000;
const NONCE_TTL_SEC = 600;
const ATT_TTL_SEC = 30 * 86400; // временные копии фото удаляются сами через 30 дней
const MAX_TEXT = 50_000;
const MAX_PDF_TEXT = 20_000;
const MAX_IMAGE_B64 = 2_800_000; // ≈ 2 МБ файла
const MAX_ATTACHMENTS = 10;

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const constantEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const hmacHex = async (secret: string, data: string) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
};
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Секрет приёма почты; без него (или если приём выключен) приём недоступен */
const ingestSecret = () => {
  if (env('MAIL_INGEST_ENABLED') === '0') throw new HttpError('mail_disabled', 503, 'Приём писем выключен (MAIL_INGEST_ENABLED=0)');
  const s = env('MAIL_INGEST_SECRET') || '';
  if (s.length < 32) throw new HttpError('mail_not_configured', 503, 'Приём писем не настроен: задайте MAIL_INGEST_SECRET (не короче 32 символов) в Vercel');
  return s;
};

/**
 * Проверка подписи, срока и однократности запроса. Возвращает исходный текст тела —
 * подпись считается именно по нему, до разбора JSON.
 */
export const verifyIngestRequest = async (req: Request, now = Date.now()) => {
  const secret = ingestSecret();
  const ts = req.headers.get('x-datanews-timestamp') || '';
  const nonce = req.headers.get('x-datanews-nonce') || '';
  const sig = (req.headers.get('x-datanews-signature') || '').toLowerCase();
  if (!/^\d{13}$/.test(ts) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) {
    throw new HttpError('bad_signature', 401, 'Нет подписи запроса');
  }
  const body = await req.text();
  if (body.length > MAX_BODY) throw new HttpError('payload_too_large', 413, 'Письмо слишком большое для одного запроса');
  const expected = await hmacHex(secret, `${ts}.${nonce}.${body}`);
  if (!constantEqual(sig, expected)) throw new HttpError('bad_signature', 401, 'Неверная подпись запроса');
  if (Math.abs(now - Number(ts)) > SIGNATURE_TTL_MS) throw new HttpError('expired', 401, 'Срок действия подписи истёк — проверьте часы и отправьте заново');
  // Однократность: тот же подписанный запрос второй раз не принимается
  const fresh = await cmd<string | null>('SET', NONCE_KEY(nonce), '1', 'NX', 'EX', NONCE_TTL_SEC);
  if (fresh === null) throw new HttpError('replay', 409, 'Этот запрос уже был принят');
  return body;
};

// ---------- разбор присланного письма ----------

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

export const parseFrom = (raw: string) => {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const address = (m ? m[2] : raw).trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) throw new HttpError('bad_payload', 400, 'Нет адреса отправителя');
  return { raw: raw.slice(0, 300), name: m?.[1]?.trim() || undefined, address, domain: address.split('@')[1] };
};

/** SPF / DKIM / DMARC из заголовка Authentication-Results */
export const parseAuth = (raw: string) => {
  const pick = (k: string) => raw.match(new RegExp(`\\b${k}=([a-z]+)`, 'i'))?.[1]?.toLowerCase();
  return { spf: pick('spf'), dkim: pick('dkim'), dmarc: pick('dmarc') };
};

/** Ссылки только из текста письма и только http(s): сервер их не открывает и ничего по ним не скачивает */
export const extractLinks = (text: string, extra: unknown) => {
  const fromText = text.match(/https?:\/\/[^\s<>"'«»)\]]+/gi) || [];
  const given = Array.isArray(extra) ? extra.filter((x): x is string => typeof x === 'string') : [];
  return [...new Set([...fromText, ...given].map((u) => u.replace(/[.,;:!?]+$/, '')).filter((u) => /^https?:\/\/[^\s]{3,600}$/i.test(u)))].slice(0, 50);
};

const CORRECTION_RE = /перен[её]с|перенесен|уточнени|исправлени|изменени[ея] (даты|времени|места)|отмен[аеы]|вместо ранее|ранее сообщ/i;
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/^(re|fwd?|fw)\s*:\s*/gi, '')
      .replace(CORRECTION_RE, ' ')
      .split(/[^a-zа-яңөү0-9]+/i)
      .filter((w) => w.length > 3)
  );
const overlap = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  a.forEach((w) => b.has(w) && n++);
  return n / Math.min(a.size, b.size);
};

const normForFingerprint = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

interface IncomingAttachment {
  name?: unknown;
  mimeType?: unknown;
  size?: unknown;
  kind?: unknown;
  data?: unknown;
  text?: unknown;
}

/** Предложение для формы по тексту письма; если в письме нет даты — пробуем текст PDF (с пометкой) */
export const suggestFrom = (subject: string, text: string, pdfText: string, sourceName: string, receivedAt: string) => {
  // Год, если он не указан в тексте, помощник подставит по году получения письма и пометит «проверьте».
  // Сама дата получения письма датой события не становится.
  const today = kgNowLocal(Date.parse(receivedAt)).slice(0, 10);
  const base = parseNotice(`${subject}\n${text}`, '', sourceName, today);
  if (base.draft.startDate || !pdfText) return { ...base, fromPdf: false };
  const withPdf = parseNotice(`${subject}\n${text}\n${pdfText}`, '', sourceName, today);
  return withPdf.draft.startDate ? { ...withPdf, fromPdf: true } : { ...base, fromPdf: false };
};

const flagsFor = (item: Omit<MailItem, 'flags'>, extra: MailFlag[]): MailFlag[] => {
  const f = new Set<MailFlag>(['needs_review', ...extra]);
  const { draft, missing } = item.suggestion;
  if (!draft.startDate) f.add('no_date');
  if (!draft.location?.ru) f.add('no_place');
  if (!draft.category) f.add('no_category');
  if (!draft.city) f.add('no_city');
  if (missing.some((m) => m.startsWith('год в тексте не указан'))) f.add('year_guessed');
  if (draft.startDate && draft.endDate && Date.parse(draft.endDate.slice(0, 10)) - Date.parse(draft.startDate.slice(0, 10)) > 31 * 86400_000) {
    f.add('wide_date_range'); // в тексте несколько далёких дат — проверить вручную
  }
  if (!item.sender.known) f.add('unknown_sender');
  if ([item.auth.spf, item.auth.dkim, item.auth.dmarc].some((v) => v && v !== 'pass' && v !== 'none' && v !== 'neutral')) f.add('auth_failed');
  if (item.suggestion.fromPdf) f.add('from_pdf');
  return [...f];
};

/** Разбор и сохранение одного письма. Повторная доставка того же письма ничего не создаёт. */
export const ingestMail = async (raw: Record<string, unknown>) => {
  const id = str(raw.messageId, 64);
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw new HttpError('bad_payload', 400, 'Нет идентификатора письма');
  const receivedTs = Date.parse(str(raw.receivedAt, 40));
  if (!Number.isFinite(receivedTs)) throw new HttpError('bad_payload', 400, 'Нет даты получения письма');

  // То же письмо Gmail уже принято — отвечаем успехом, чтобы скрипт пометил его обработанным
  const existing = await hgetJson<MailItem>(MAIL_KEY, id);
  if (existing) return { result: 'already' as const, id, status: existing.status };

  const from = parseFrom(str(raw.from, 300));
  const subject = str(raw.subject, 500);
  const fullText = typeof raw.text === 'string' ? raw.text.replace(/\u0000/g, '').replace(/\r/g, '') : '';
  const text = fullText.slice(0, MAX_TEXT).trim();
  const extra: MailFlag[] = [];
  if (fullText.length > MAX_TEXT) extra.push('text_truncated');
  const threadId = /^[A-Za-z0-9_-]{6,64}$/.test(str(raw.threadId, 64)) ? str(raw.threadId, 64) : undefined;
  const rfcMessageId = str(raw.rfcMessageId, 300) || undefined;
  const permalink = /^https:\/\/mail\.google\.com\/[^\s]{1,500}$/.test(str(raw.permalink, 600)) ? str(raw.permalink, 600) : undefined;
  const auth = parseAuth(str(raw.authResults, 3000));

  // Вложения: фото JPG/PNG/WEBP — временная копия; PDF — только текст; остальное — только название
  const incoming = (Array.isArray(raw.attachments) ? raw.attachments : []).slice(0, MAX_ATTACHMENTS) as IncomingAttachment[];
  if (Array.isArray(raw.attachments) && raw.attachments.length > MAX_ATTACHMENTS) extra.push('attachment_skipped');
  const attachments: MailAttachment[] = [];
  const toStore: [string, string][] = [];
  incoming.forEach((a, n) => {
    const name = str(a?.name, 200) || `вложение ${n + 1}`;
    const mimeType = str(a?.mimeType, 100).toLowerCase();
    const size = Number(a?.size) > 0 ? Math.floor(Number(a.size)) : 0;
    if (/^image\/(jpeg|png|webp)$/.test(mimeType)) {
      const data = typeof a?.data === 'string' ? a.data.replace(/\s/g, '') : '';
      if (!data) {
        attachments.push({ name, mimeType, size, kind: 'image', note: 'Фото слишком большое для пересылки — откройте письмо' });
        extra.push('image_too_large');
      } else if (data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
        attachments.push({ name, mimeType, size, kind: 'image', note: 'Фото не сохранено: слишком большое или повреждено — откройте письмо' });
        extra.push('image_too_large');
      } else {
        const key = mailAttKey(id, n);
        toStore.push([key, `data:${mimeType};base64,${data}`]);
        attachments.push({ name, mimeType, size, kind: 'image', storedKey: key });
      }
    } else if (mimeType === 'application/pdf') {
      const t = typeof a?.text === 'string' ? a.text.replace(/\u0000/g, '').trim().slice(0, MAX_PDF_TEXT) : '';
      attachments.push({ name, mimeType, size, kind: 'pdf', text: t || undefined, note: t ? 'Текст извлечён из PDF — сверить с оригиналом' : 'Текст PDF не извлечён — откройте письмо' });
    } else {
      attachments.push({ name, mimeType: mimeType || 'application/octet-stream', size, kind: 'other', note: 'Не обрабатывается — откройте письмо' });
      extra.push('attachment_skipped');
    }
  });

  const known = findKnownSender(from.address);
  const sender = { known: Boolean(known), orgName: known?.orgName, orgType: known?.orgType, govDomain: isGovDomain(from.domain) };
  const pdfText = attachments.map((a) => a.text || '').filter(Boolean).join('\n\n');
  const receivedAt = new Date(receivedTs).toISOString();
  const suggestion = suggestFrom(subject, text, pdfText, known?.orgName || '', receivedAt);
  const fingerprint = await sha256(`${from.address}\n${normForFingerprint(subject)}\n${normForFingerprint(text).slice(0, 4000)}`);

  // Связь с прежними письмами: исправление / перенос того же отправителя или та же переписка
  const all = await hvalsJson<MailItem>(MAIL_KEY);
  const subjWords = words(`${subject} ${text.slice(0, 300)}`);
  const relatedIds = all
    .filter(
      (m) =>
        (threadId && m.threadId === threadId) ||
        (m.from.address === from.address && receivedTs - Date.parse(m.receivedAt) < 30 * 86400_000 && overlap(subjWords, words(`${m.subject} ${m.text.slice(0, 300)}`)) >= 0.5)
    )
    .map((m) => m.id)
    .slice(0, 10);
  if (CORRECTION_RE.test(`${subject}\n${text}`) || relatedIds.length) extra.push('possible_correction');

  const item: MailItem = {
    id,
    threadId,
    rfcMessageId,
    fingerprint,
    from,
    subject,
    receivedAt,
    ingestedAt: kgNowLocal(),
    permalink,
    text,
    links: extractLinks(text, raw.links),
    auth,
    attachments,
    sender,
    suggestion,
    flags: [],
    relatedIds,
    status: 'new',
    history: [{ at: kgNowLocal(), action: 'received' }],
  };

  // Повтор: то же содержание или тот же Message-ID под другим идентификатором (переслали, отправили дважды)
  const dupByFp = await cmd<string | null>('HGET', MAIL_FP_KEY, fingerprint);
  const dupByRfc = rfcMessageId ? await cmd<string | null>('HGET', MAIL_RFC_KEY, rfcMessageId) : null;
  const duplicateOf = [dupByRfc, dupByFp].find((x) => x && x !== id) || undefined;
  if (duplicateOf) {
    item.status = 'duplicate';
    item.duplicateOf = duplicateOf;
    item.history.push({ at: kgNowLocal(), action: 'duplicate', note: `Повтор письма ${duplicateOf}` });
  }
  item.flags = flagsFor(item, extra);

  // Сначала временные копии фото, затем само письмо (атомарно: второе одновременное письмо с тем же id не перезапишет первое)
  for (const [key, dataUrl] of toStore) await cmd('SET', key, dataUrl, 'EX', ATT_TTL_SEC);
  const created = await cmd<number>('HSETNX', MAIL_KEY, id, JSON.stringify(item));
  if (!Number(created)) return { result: 'already' as const, id, status: (await hgetJson<MailItem>(MAIL_KEY, id))?.status || 'new' };
  await cmd('HSETNX', MAIL_FP_KEY, fingerprint, id);
  if (rfcMessageId) await cmd('HSETNX', MAIL_RFC_KEY, rfcMessageId, id);
  return { result: 'stored' as const, id, status: item.status, flags: item.flags };
};

// ---------- действия редактора (только администратор) ----------

export type MailAction = 'reject' | 'duplicate' | 'reopen' | 'reparse' | 'prepared' | 'published';

/**
 * Отметки редактора о письме. Ничего не публикует: «published» лишь связывает письмо
 * с публикацией, которую редактор уже сохранил обычной формой.
 */
export const mailAction = async (id: string, action: MailAction, opts: { annId?: string; duplicateOf?: string; note?: string } = {}) => {
  const item = await hgetJson<MailItem>(MAIL_KEY, id);
  if (!item) throw new HttpError('not_found', 404, 'Письмо не найдено');
  const note = opts.note ? opts.note.slice(0, 500) : undefined;
  if (action === 'reject') item.status = 'rejected';
  else if (action === 'reopen') item.status = 'new';
  else if (action === 'duplicate') {
    item.status = 'duplicate';
    item.duplicateOf = /^[A-Za-z0-9_-]{3,80}$/.test(opts.duplicateOf || '') ? opts.duplicateOf : item.duplicateOf;
  } else if (action === 'prepared' || action === 'published') {
    if (!/^[\w-]{3,80}$/.test(opts.annId || '')) throw new HttpError('bad_payload', 400, 'Укажите публикацию');
    item.status = action;
    item.annId = opts.annId;
  } else if (action === 'reparse') {
    const pdfText = item.attachments.map((a) => a.text || '').filter(Boolean).join('\n\n');
    const known = findKnownSender(item.from.address);
    item.sender = { known: Boolean(known), orgName: known?.orgName, orgType: known?.orgType, govDomain: isGovDomain(item.from.domain) };
    item.suggestion = suggestFrom(item.subject, item.text, pdfText, known?.orgName || '', item.receivedAt);
    const keep = item.flags.filter((f) => ['text_truncated', 'image_too_large', 'attachment_skipped', 'possible_correction'].includes(f));
    item.flags = flagsFor({ ...item }, keep);
  } else throw new HttpError('bad_action', 400);
  item.history = [...item.history, { at: kgNowLocal(), action, note }].slice(-50);
  await cmd('HSET', MAIL_KEY, id, JSON.stringify(item));
  return item;
};

export const listMail = async (limit = 200) =>
  (await hvalsJson<MailItem>(MAIL_KEY)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, limit);

/** Временная копия фото из письма (для формы публикации); null — срок хранения истёк */
export const getMailAttachment = async (key: string) => {
  if (!/^dn:mail:att:[A-Za-z0-9_-]{6,64}:\d{1,2}$/.test(key)) throw new HttpError('bad_payload', 400);
  return cmd<string | null>('GET', key);
};
