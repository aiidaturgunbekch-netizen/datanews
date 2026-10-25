/**
 * /api/sources — реестр источников: ведомство, официальный URL, тип, автоматический ли сбор,
 * способ получения, частота, последнее успешное обновление и ошибка (для автоматических).
 *
 * Редакционная почта (api/_lib/mail.ts):
 *   POST ?mail=ingest            — письмо от Google Apps Script; только с подписью HMAC, сроком и однократностью
 *                                  (вход администратора здесь не используется и не принимается). Ничего не публикует.
 *   GET  ?mail=list              — входящие письма (только администратор)
 *   GET  ?mail=att&key=…         — временная копия фото из письма (только администратор)
 *   POST ?mail=action { id, action, annId?, duplicateOf?, note? } — отметки редактора (только администратор)
 */
import { handler, HttpError, json, rateLimit, readBody, requireAdmin } from './_lib/http';
import { getStatuses, SOURCES } from './_lib/sources';
import { getMailAttachment, ingestMail, listMail, mailAction, MailAction, verifyIngestRequest } from './_lib/mail';

export const config = { runtime: 'edge' };

const NO_STORE = { 'Cache-Control': 'no-store' };

export default handler(async (req) => {
  const mail = new URL(req.url).searchParams.get('mail');

  if (mail === 'ingest') {
    if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);
    // Ограничение по адресу — до проверки подписи, чтобы перебор подписи не шёл без счёта
    await rateLimit(req, 'mail-in', 120, 3600);
    const body = await verifyIngestRequest(req);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new HttpError('bad_json', 400);
    }
    return json(await ingestMail(payload), 200, NO_STORE);
  }

  if (mail === 'list') {
    await requireAdmin(req);
    return json({ items: await listMail() }, 200, NO_STORE);
  }

  if (mail === 'att') {
    await requireAdmin(req);
    const dataUrl = await getMailAttachment(new URL(req.url).searchParams.get('key') || '');
    if (!dataUrl) throw new HttpError('not_found', 404, 'Копия фото удалена (хранится 30 дней) — возьмите фото из письма');
    return json({ dataUrl }, 200, NO_STORE);
  }

  if (mail === 'action') {
    if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);
    await requireAdmin(req);
    const b = await readBody<{ id?: string; action?: MailAction; annId?: string; duplicateOf?: string; note?: string }>(req);
    return json({ item: await mailAction(String(b.id || ''), b.action as MailAction, b) }, 200, NO_STORE);
  }

  if (mail) throw new HttpError('not_found', 404);

  const statuses = await getStatuses();
  return json({ sources: SOURCES.map((s) => ({ ...s, status: statuses[s.id] || null })) }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=60' });
});
