/**
 * /api/announcements — публикации.
 *   GET                    публичные (одобренные) публикации + id скрытых встроенных
 *   GET ?scope=mine        публикации текущего пользователя (с их статусом модерации)
 *   GET ?scope=all         все публикации, включая ожидающие модерации (только админ)
 *   POST { item }          админ — публикует сразу; пользователь — отправляет на модерацию
 *   PATCH { id, action: 'approve' | 'reject', note? }   модерация (админ)
 *   PATCH { id, item }     правка (админ — любую; автор — свою, она снова уходит на модерацию)
 *   DELETE ?id=…           удалить / скрыть (админ)
 */
import type { Announcement } from '../src/types';
import { PLANS } from '../src/config/site';
import { cmd, hgetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, readBody, readSession, requireAdmin, requireUser } from './_lib/http';
import { ANN_KEY, HIDDEN_KEY, publicView, sanitize, saveAnnouncement } from './_lib/announcements';
import { StoredUser, USERS_KEY } from './_lib/users';

export const config = { runtime: 'edge' };

const isPublic = (a: Announcement) => !a.moderationStatus || a.moderationStatus === 'approved';

export default handler(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const scope = url.searchParams.get('scope');
    const all = await hvalsJson<Announcement>(ANN_KEY);
    if (scope === 'all') {
      await requireAdmin(req);
      const hidden = ((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[];
      return json({ items: all, hidden });
    }
    if (scope === 'mine') {
      const s = await requireUser(req);
      return json({ items: all.filter((a) => a.submittedBy?.email === s.sub) });
    }
    const hidden = ((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[];
    return json(
      { items: all.filter(isPublic).map(publicView), hidden },
      200,
      { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' }
    );
  }

  if (req.method === 'POST') {
    const session = await readSession(req);
    if (!session) throw new HttpError('unauthorized', 401, 'Войдите в личный кабинет');
    const body = await readBody<{ item?: Record<string, unknown> }>(req);
    if (!body.item) throw new HttpError('missing_item', 400);

    if (session.role === 'admin') {
      const existing = typeof body.item.id === 'string' ? await hgetJson<Announcement>(ANN_KEY, body.item.id) : null;
      const base = existing || (typeof body.item.id === 'string' ? ({ id: body.item.id } as Announcement) : undefined);
      const item = await sanitize(body.item as Record<string, any>, base);
      item.moderationStatus = 'approved';
      await saveAnnouncement(item);
      return json({ item }, 201);
    }

    const user = await hgetJson<StoredUser>(USERS_KEY, session.sub);
    if (!user) throw new HttpError('unauthorized', 401);
    const paidActive = user.paymentStatus === 'paid' && (!user.paidUntil || new Date(user.paidUntil).getTime() > Date.now());
    if (!paidActive) {
      throw new HttpError('payment_required', 402, 'Публикация доступна после подтверждения оплаты регистрации');
    }
    const limit = PLANS[user.plan].limit;
    if (limit !== null) {
      const since = Date.now() - PLANS[user.plan].periodDays * 86400_000;
      const mine = (await hvalsJson<Announcement>(ANN_KEY)).filter(
        (a) => a.submittedBy?.email === user.email && new Date(a.publishedAt).getTime() > since
      );
      if (mine.length >= limit) throw new HttpError('limit_reached', 403, `Лимит тарифа: ${limit} публикаций за 30 дней`);
    }
    const item = await sanitize({ ...body.item, isVerified: false, isUrgentTicker: false, ticketUrlVerified: false, status: 'scheduled' });
    item.moderationStatus = 'pending';
    item.sourceName = item.sourceName || user.organization || user.name;
    item.submittedBy = { userId: user.id, name: user.name, email: user.email, phone: user.phone, organization: user.organization };
    await saveAnnouncement(item);
    return json({ item }, 201);
  }

  if (req.method === 'PATCH') {
    const session = await requireUser(req);
    const body = await readBody<{ id?: string; action?: string; note?: string; item?: Record<string, unknown> }>(req);
    const id = String(body.id || '');
    const current = await hgetJson<Announcement>(ANN_KEY, id);

    if (body.action === 'approve' || body.action === 'reject') {
      await requireAdmin(req);
      if (!current) throw new HttpError('not_found', 404);
      const next: Announcement = {
        ...current,
        moderationStatus: body.action === 'approve' ? 'approved' : 'rejected',
        moderationNote: String(body.note || '').slice(0, 500) || undefined,
        isVerified: body.action === 'approve' ? true : current.isVerified,
        updatedAt: new Date().toISOString().slice(0, 16),
      };
      await saveAnnouncement(next);
      return json({ item: next });
    }

    if (!body.item) throw new HttpError('missing_item', 400);
    if (session.role === 'admin') {
      const item = await sanitize(body.item as Record<string, any>, current || ({ id } as Announcement));
      item.moderationStatus = current?.moderationStatus || 'approved';
      item.submittedBy = current?.submittedBy;
      await saveAnnouncement(item);
      return json({ item });
    }

    if (!current || current.submittedBy?.email !== session.sub) throw new HttpError('forbidden', 403);
    const item = await sanitize({ ...body.item, isVerified: false, isUrgentTicker: false, ticketUrlVerified: false, status: 'scheduled' }, current);
    item.moderationStatus = 'pending';
    item.moderationNote = undefined;
    item.submittedBy = current.submittedBy;
    await saveAnnouncement(item);
    return json({ item });
  }

  if (req.method === 'DELETE') {
    await requireAdmin(req);
    const id = url.searchParams.get('id') || '';
    if (!id) throw new HttpError('missing_id', 400);
    await cmd('HDEL', ANN_KEY, id);
    await cmd('HSET', HIDDEN_KEY, id, id);
    return json({ ok: true });
  }

  throw new HttpError('method_not_allowed', 405);
});
