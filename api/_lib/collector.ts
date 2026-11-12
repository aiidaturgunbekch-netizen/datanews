/**
 * Прямой приём пакетов от сборщиков новостей (без почты в Claude).
 *
 * Сборщик отправляет пакет DATANEWS-BATCH … END-BATCH прямо на сайт и читает, что уже есть на сайте, чтобы не повторяться.
 * Ключ — заголовок `Authorization: Bearer <ключ>`; ключ = COLLECTOR_SECRET, а если он не задан — MAIL_INGEST_SECRET
 * (тот же секрет, что у скрипта почты). Ключ подставляет сеть окружения сборщиков: сам сборщик его не видит.
 *
 * Что можно по ключу: положить пакет (новости — черновиками в «Модерацию», погода — официальный прогноз) и прочитать
 * список недавних публикаций и новых писем редакции. Публиковать, удалять, менять пользователей и рекламу нельзя.
 * Работает при тех же условиях, что и приём почты (выключатели в панели и Vercel, запрет на Production).
 */
import type { Announcement, MailItem } from '../../src/types';
import { kgNowLocal } from '../../src/utils/time';
import { env } from './env';
import { cmd, hvalsJson } from './kv';
import { ANN_KEY } from './announcements';
import { batchSummary, importBatch, MAIL_KEY_BATCH } from './batchIngest';
import { assertIngestOpen, MIN_SECRET_LENGTH } from './mail';
import { HttpError, rateLimit, safeEqual } from './http';

const FP_KEY = (fp: string) => `dn:collector:fp:${fp}`;

const collectorSecret = () => {
  const s = env('COLLECTOR_SECRET') || env('MAIL_INGEST_SECRET') || '';
  if (s.length < MIN_SECRET_LENGTH) throw new HttpError('collector_not_configured', 503, 'Приём от сборщиков не настроен: ключ не задан в этой сборке');
  return s;
};

/** Проверка ключа сборщика. Ограничение по числу попыток — до сверки ключа */
export const verifyCollector = async (req: Request) => {
  await rateLimit(req, 'collector', 60, 3600);
  const m = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.get('authorization') || '');
  if (!m || !safeEqual(m[1], collectorSecret())) throw new HttpError('unauthorized', 401, 'Нет доступа');
};

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Принять пакет. Повтор того же пакета (сборщик отправил дважды) не разбирается второй раз.
 * В «Материалах из почты» появляется зелёная карточка «Пакет сборщика — принят автоматически», как раньше у писем.
 */
export const collectorBatch = async (body: { text?: unknown; title?: unknown }) => {
  await assertIngestOpen();
  const text = typeof body.text === 'string' ? body.text : '';
  if (!/DATANEWS-BATCH/.test(text) || text.length < 20) throw new HttpError('bad_payload', 400, 'Нужен блок DATANEWS-BATCH … END-BATCH в поле text');
  const fp = await sha256(text);
  const fresh = await cmd<string | null>('SET', FP_KEY(fp), '1', 'NX', 'EX', 3 * 86400);
  if (!fresh) return { result: 'already' as const };

  const id = `collector-${Date.now().toString(36)}`;
  const r = await importBatch(text, id);
  const now = kgNowLocal();
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : `DATANEWS-BATCH ${now.slice(0, 10)}`;
  const item: MailItem = {
    id,
    fingerprint: fp,
    from: { raw: 'Сборщик DataNews', name: 'Сборщик DataNews', address: 'collector@datanews.local', domain: 'datanews.local' },
    subject: title,
    receivedAt: now,
    ingestedAt: now,
    text: '',
    links: [],
    auth: {},
    attachments: [],
    sender: { known: true, orgName: 'Сборщик DataNews', govDomain: false },
    suggestion: { draft: {}, found: [], missing: [], fromPdf: false },
    flags: [],
    relatedIds: [],
    status: 'prepared',
    history: [{ at: now, action: 'batch_imported', note: batchSummary(r) }],
  };
  await cmd('HSET', MAIL_KEY_BATCH, id, JSON.stringify(item));
  return { result: 'stored' as const, id, drafts: r.drafts.length, weather: r.weather, skipped: r.skipped, errors: r.errors };
};

/**
 * Что уже есть на сайте — чтобы сборщик не повторялся, и новые письма редакции — чтобы сделать из них черновики.
 * Только нужные поля: без контактов авторов-пользователей и без истории правок.
 */
export const collectorRecent = async (days: number) => {
  await assertIngestOpen();
  const d = Math.min(Math.max(Math.round(days) || 3, 1), 14);
  const since = kgNowLocal(Date.now() - d * 86400_000);
  const anns = (await hvalsJson<Announcement>(ANN_KEY))
    .filter((a) => a && (a.moderationStatus === 'pending' || (a.publishedAt || '') >= since || (a.updatedAt || '') >= since))
    .map((a) => ({
      id: a.id,
      title: a.title?.ru,
      category: a.category,
      city: a.city,
      startDate: a.startDate,
      status: a.moderationStatus || 'approved',
      source: a.eventSourceUrl || a.sourceUrl || undefined,
    }))
    .slice(0, 400);
  const mail = (await hvalsJson<MailItem>(MAIL_KEY_BATCH))
    .filter((m) => m && m.status === 'new' && (m.receivedAt || '') >= since)
    .map((m) => ({
      mailId: m.id,
      from: m.from?.name || m.from?.address,
      subject: m.subject,
      receivedAt: m.receivedAt,
      text: (m.text || '').slice(0, 6000),
      links: (m.links || []).slice(0, 20),
      photos: (m.attachments || []).filter((a) => a.kind === 'image' && a.storedKey).length,
    }))
    .slice(0, 50);
  return { since, publications: anns, mail };
};
