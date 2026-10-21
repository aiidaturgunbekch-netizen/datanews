/**
 * /api/announcements — публикации.
 *   GET                    публичные (одобренные) публикации + id скрытых встроенных
 *   GET ?scope=mine        публикации текущего пользователя (со статусом модерации и историей)
 *   GET ?scope=all         все публикации, включая ожидающие модерации (только админ)
 *   POST { item }          админ — публикует сразу;
 *                          подтверждённый госорган с активным тарифом «Муниципалитет / госорган» — публикует сразу,
 *                            без предварительной модерации (сам отвечает за сведения);
 *                          остальные — отправляют на модерацию. Лимиты тарифа — api/_lib/quota.ts
 *   PATCH { id, action: 'approve' | 'reject' | 'restore', note? }   модерация (админ)
 *   PATCH { id, action: 'withdraw', note? }   снять с публикации (админ — любую; автор — свою)
 *   PATCH { id, item }     правка (админ — любую; автор — свою: госорган публикует правку сразу,
 *                          остальные снова отправляют на модерацию)
 *   DELETE ?id=…           удалить / скрыть (админ)
 *
 * Отсутствие предварительной модерации для госорганов не отменяет проверок: обязательные поля,
 * ограничение частоты (не более 10 публикаций в час), запрет дублей, жалобы и снятие материала.
 */
import type { Announcement } from '../src/types';
import { cmd, hgetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, rateLimit, readBody, readSession, requireAdmin, requireUser } from './_lib/http';
import { ANN_KEY, HIDDEN_KEY, publicView, sanitize, saveAnnouncement, withHistory } from './_lib/announcements';
import { StoredUser, USERS_KEY } from './_lib/users';
import { checkPlanCategory, currentPeriod, getUsage, isGovVerified, reservePost } from './_lib/quota';
import { kgNowLocal } from '../src/utils/time';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';

export const config = { runtime: 'edge' };

const norm = (t: string) => t.toLowerCase().replace(/[«»"'.,:;!?()—–-]/g, ' ').replace(/\s+/g, ' ').trim();
/** Дубль: совпадает ссылка на первоисточник, либо совпадает дата и заголовки почти одинаковые (≥ 80% общих слов) */
const findDuplicate = (a: Announcement, pool: Announcement[]) => {
  const words = new Set(norm(a.title.ru).split(' ').filter((w) => w.length > 2));
  return pool.find((b) => {
    if (b.id === a.id) return false;
    if (a.eventSourceUrl && b.eventSourceUrl && a.eventSourceUrl === b.eventSourceUrl) return true;
    if (a.startDate.slice(0, 10) !== b.startDate.slice(0, 10)) return false;
    const bw = norm(b.title.ru).split(' ').filter((w) => w.length > 2);
    if (!bw.length || !words.size) return false;
    const common = bw.filter((w) => words.has(w)).length;
    return common / Math.max(bw.length, words.size) >= 0.8;
  });
};

const isPublic = (a: Announcement) => !a.moderationStatus || a.moderationStatus === 'approved';

/** Поля, которые автор не может выставить себе сам */
const authorFields = (item: Record<string, unknown>) => ({
  ...item,
  isVerified: false,
  isUrgentTicker: false,
  ticketUrlVerified: false,
  status: 'scheduled',
  imageFit: 'contain', // оригинальная афиша автора показывается целиком, без обрезки
  sourceKind: undefined,
});

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
      let item = await sanitize(body.item as Record<string, any>, base);
      // Защита от дублей: та же новость, перепечатанная с другого сайта (заголовок + дата, или та же ссылка на источник)
      if (!base && !(body as { force?: boolean }).force) {
        const dup = findDuplicate(item, [...(await hvalsJson<Announcement>(ANN_KEY)), ...INITIAL_ANNOUNCEMENTS]);
        if (dup) throw new HttpError('duplicate', 409, `Похожая публикация уже есть: «${dup.title.ru}» (${dup.startDate.slice(0, 10)})`);
      }
      item.moderationStatus = 'approved';
      item.dataOrigin = item.dataOrigin || 'manual';
      item.lastCheckedAt = item.updatedAt;
      item = withHistory(item, 'admin', existing ? 'edited' : 'published');
      await saveAnnouncement(item);
      return json({ item }, 201);
    }

    const user = await hgetJson<StoredUser>(USERS_KEY, session.sub);
    if (!user) throw new HttpError('unauthorized', 401);
    // Защита от спама — действует для всех, включая госорганы
    await rateLimit(req, 'post', 10, 3600, user.email);
    // Сначала проверяем поля (ошибка формы не должна расходовать лимит), потом резервируем публикацию
    let item = await sanitize(authorFields(body.item));
    const mineAll = (await hvalsJson<Announcement>(ANN_KEY)).filter((a) => a.submittedBy?.email === user.email);
    if (mineAll.some((a) => a.title.ru.trim().toLowerCase() === item.title.ru.trim().toLowerCase() && a.startDate === item.startDate && a.moderationStatus !== 'rejected')) {
      throw new HttpError('duplicate', 409, 'Такая публикация уже отправлена');
    }
    // Кто размещает — организация или частное лицо (обязательно)
    if (!item.eventDetails?.organizer?.trim()) throw new HttpError('missing_field', 400, 'Укажите организацию или частное лицо');
    const { release, usage } = await reservePost(user, item.category);

    item.submittedBy = { userId: user.id, name: user.name, email: user.email, phone: user.phone, organization: user.organization };
    item.sourceName = item.sourceName || user.gov?.orgName || user.organization || user.name;
    item.dataOrigin = 'user';
    if (usage.skipsModeration) {
      // Подтверждённый госорган: без предварительной модерации, организация отвечает за сведения сама
      item.moderationStatus = 'approved';
      item.publishedByGov = true;
      item.sourceOrgType = 'ГОС';
      item.sourceName = user.gov?.orgName || item.sourceName;
      item.sourceKind = 'official';
      item = withHistory(item, 'author', 'published', 'Опубликовано подтверждённым госорганом без предварительной модерации');
    } else {
      item.moderationStatus = 'pending';
      item = withHistory(item, 'author', 'created');
    }
    try {
      await saveAnnouncement(item);
    } catch (e) {
      await release();
      throw e;
    }
    return json({ item, usage: await getUsage(user) }, 201);
  }

  if (req.method === 'PATCH') {
    const session = await requireUser(req);
    const body = await readBody<{ id?: string; action?: string; note?: string; item?: Record<string, unknown> }>(req);
    const id = String(body.id || '');
    const current = await hgetJson<Announcement>(ANN_KEY, id);
    const note = String(body.note || '').slice(0, 500) || undefined;

    if (body.action === 'approve' || body.action === 'reject' || body.action === 'restore') {
      await requireAdmin(req);
      if (!current) throw new HttpError('not_found', 404);
      const ok = body.action !== 'reject';
      const next = withHistory(
        {
          ...current,
          moderationStatus: ok ? 'approved' : 'rejected',
          moderationNote: note,
          isVerified: ok && !current.publishedByGov ? true : current.isVerified,
          updatedAt: kgNowLocal(),
          lastCheckedAt: ok ? kgNowLocal() : current.lastCheckedAt,
        },
        'admin',
        body.action === 'approve' ? 'approved' : body.action === 'restore' ? 'restored' : 'rejected',
        note
      );
      await saveAnnouncement(next);
      return json({ item: next });
    }

    if (body.action === 'withdraw') {
      if (!current) throw new HttpError('not_found', 404);
      const isAdmin = session.role === 'admin';
      if (!isAdmin && current.submittedBy?.email !== session.sub) throw new HttpError('forbidden', 403);
      const next = withHistory(
        { ...current, moderationStatus: 'withdrawn', moderationNote: note, updatedAt: kgNowLocal() },
        isAdmin ? 'admin' : 'author',
        'withdrawn',
        note
      );
      await saveAnnouncement(next);
      return json({ item: next });
    }

    if (!body.item) throw new HttpError('missing_item', 400);
    if (session.role === 'admin') {
      let item = await sanitize(body.item as Record<string, any>, current || ({ id } as Announcement));
      item.moderationStatus = current?.moderationStatus || 'approved';
      item.submittedBy = current?.submittedBy;
      item.dataOrigin = current?.dataOrigin || 'manual';
      item.lastCheckedAt = item.updatedAt;
      item = withHistory(item, 'admin', 'edited');
      await saveAnnouncement(item);
      return json({ item });
    }

    if (!current || current.submittedBy?.email !== session.sub) throw new HttpError('forbidden', 403);
    if (current.moderationStatus === 'withdrawn' && !current.publishedByGov) throw new HttpError('forbidden', 403);
    await rateLimit(req, 'edit', 30, 3600, session.sub);
    const user = await hgetJson<StoredUser>(USERS_KEY, session.sub);
    let item = await sanitize(authorFields(body.item), current);
    // Тариф «Культура и театр»: правка не может перенести публикацию в другой раздел
    const period = user ? currentPeriod(user) : undefined;
    if (period) checkPlanCategory(period.plan, item.category);
    item.submittedBy = current.submittedBy;
    if (current.publishedByGov && user && isGovVerified(user)) {
      // Госорган правит свою публикацию сам; правка сразу на сайте и попадает в историю
      item.moderationStatus = current.moderationStatus === 'withdrawn' ? 'withdrawn' : 'approved';
      item.sourceKind = 'official';
      item = withHistory(item, 'author', 'edited');
    } else {
      item.moderationStatus = 'pending';
      item.moderationNote = undefined;
      item = withHistory(item, 'author', 'edited', 'Отправлено на повторную модерацию');
    }
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
