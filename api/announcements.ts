/**
 * /api/announcements — публикации.
 *   GET                    публичные (одобренные) публикации + id скрытых встроенных
 *   GET ?scope=mine        публикации текущего пользователя (со статусом модерации и историей)
 *   GET ?scope=all         все публикации, включая ожидающие модерации (только админ)
 *   POST { item }          админ — публикует сразу;
 *   POST { item, asDraft: true, mailId? } админ — черновик (в т.ч. из редакционной почты): статус «на модерации»,
 *                          на сайте не виден, публикуется только кнопкой «Одобрить» в «Модерации»;
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
import type { Announcement, MailItem } from '../src/types';
import { cmd, hgetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, rateLimit, readBody, readSession, requireAdmin, requireUser } from './_lib/http';
import { ANN_KEY, CHECKED_KEY, diffFields, HIDDEN_KEY, isPublicItem, publicView, sanitize, saveAnnouncement, splitChecked, withHistory } from './_lib/announcements';
import { TEST_MARK_RE } from '../src/config/mailSenders';
import { MAIL_KEY } from './_lib/mail';
import { CHECK_NOTE, isCheckOnlyCopy } from '../src/utils/mergeAnnouncements';
import { StoredUser, USERS_KEY } from './_lib/users';
import { checkPublishCategory, currentPeriod, getUsage, isGovVerified, reservePost } from './_lib/quota';
import { normalizePlan } from '../src/config/site';
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

const isPublic = isPublicItem;

const ALERT_URGENCY_CATS = ['water', 'electricity', 'roads', 'repairs'];

/**
 * Поля, которые автор не может выставить себе сам: всё редакционное сбрасывается, что бы ни прислал запрос.
 * Срочность определяется разделом (не «аварийная»), источник и организация — из профиля (см. ниже).
 */
const authorFields = (item: Record<string, unknown>) => ({
  ...item,
  isVerified: false,
  isUrgentTicker: false,
  ticketUrlVerified: false,
  status: 'scheduled',
  urgency: ALERT_URGENCY_CATS.includes(String(item.category)) ? 'planned' : item.category === 'notices' ? 'regular' : 'event',
  imageFit: 'contain', // оригинальная афиша автора показывается целиком, без обрезки
  imagePosition: undefined,
  sourceKind: undefined,
  sourceName: undefined,
  sourceOrgType: undefined,
  protocolCode: undefined,
  dangerLevel: undefined,
  newsKind: undefined,
  legal: undefined,
  additionalSourceUrl: undefined,
  authorityUrl: undefined,
  geo: undefined, // точку на карте ставит только редактор
});

/** Редакционные поля, выставленные редакцией, при правке автором сохраняются (автор их не видит и не меняет) */
const keepEditorial = (item: Announcement, current: Announcement): Announcement => ({
  ...item,
  urgency: current.urgency === 'emergency' ? current.urgency : item.urgency,
  dangerLevel: current.dangerLevel,
  newsKind: current.newsKind,
  legal: current.legal,
  additionalSourceUrl: current.additionalSourceUrl,
  authorityUrl: current.authorityUrl,
  sourceKind: current.sourceKind,
  sourceName: current.sourceName,
  sourceOrgType: current.sourceOrgType,
  geo: current.geo,
  imageFit: current.imageFit,
  imagePosition: current.imagePosition,
});

/** Кто размещает: организация из запроса, иначе из профиля (подтверждённый госорган — официальное название) */
const organizerOf = (item: Announcement, user: StoredUser) =>
  item.eventDetails?.organizer?.trim() || (isGovVerified(user) && user.gov?.orgName) || user.organization?.trim() || user.name?.trim() || '';

export default handler(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const scope = url.searchParams.get('scope');
    const all = await hvalsJson<Announcement>(ANN_KEY);
    if (scope === 'all') {
      await requireAdmin(req);
      const hidden = ((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[];
      const { items, checked } = await splitChecked(all);
      return json({ items, hidden, checked });
    }
    if (scope === 'mine') {
      const s = await requireUser(req);
      return json({ items: all.filter((a) => a.submittedBy?.email === s.sub) });
    }
    const hidden = ((await cmd<string[]>('HVALS', HIDDEN_KEY)) || []) as string[];
    const { items, checked } = await splitChecked(all);
    return json(
      { items: items.filter(isPublic).map(publicView), hidden, checked },
      200,
      { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' }
    );
  }

  if (req.method === 'POST') {
    const session = await readSession(req);
    if (!session) throw new HttpError('unauthorized', 401, 'Войдите в личный кабинет');
    const body = await readBody<{ item?: Record<string, unknown>; asDraft?: boolean; mailId?: string }>(req);
    if (!body.item) throw new HttpError('missing_item', 400);

    if (session.role === 'admin') {
      const stored = typeof body.item.id === 'string' ? await hgetJson<Announcement>(ANN_KEY, body.item.id) : null;
      // Копия встроенной публикации ради даты проверки — не основа для правки: правим версию из кода
      const existing = stored && !isCheckOnlyCopy(stored) ? stored : null;
      const base = existing || (typeof body.item.id === 'string' ? ({ id: body.item.id } as Announcement) : undefined);
      let item = await sanitize(body.item as Record<string, any>, base);
      // Защита от дублей: та же новость, перепечатанная с другого сайта (заголовок + дата, или та же ссылка на источник)
      if (!base && !(body as { force?: boolean }).force) {
        const dup = findDuplicate(item, [...(await hvalsJson<Announcement>(ANN_KEY)), ...INITIAL_ANNOUNCEMENTS]);
        if (dup) throw new HttpError('duplicate', 409, `Похожая публикация уже есть: «${dup.title.ru}» (${dup.startDate.slice(0, 10)})`);
      }
      // Черновик (например, из письма): только новая публикация, на сайт не попадает до «Одобрить»; дату сверки не ставим
      const asDraft = body.asDraft === true && !base;
      // Тестовое письмо («TEST DataNews») или пометка в самом тексте — материал тестовый: сервер не даст его опубликовать
      const mailId = /^[A-Za-z0-9_-]{6,64}$/.test(String(body.mailId || '')) ? String(body.mailId) : '';
      const mail = mailId ? await hgetJson<MailItem>(MAIL_KEY, mailId) : null;
      if (!base && ((mail && TEST_MARK_RE.test(mail.subject)) || TEST_MARK_RE.test(`${item.title.ru}\n${item.description.ru}`))) item.testMaterial = true;
      item.moderationStatus = asDraft ? 'pending' : 'approved';
      item.dataOrigin = item.dataOrigin || 'manual';
      item.lastCheckedAt = asDraft ? undefined : item.updatedAt;
      // Правка существующей (в т.ч. встроенной) публикации — с перечнем существенных изменений
      const prev = existing || INITIAL_ANNOUNCEMENTS.find((a) => a.id === item.id) || null;
      const mailNote = mailId ? `Черновик из редакционной почты (письмо ${mailId})${item.testMaterial ? ' — тестовое письмо, публикация запрещена' : ''}` : 'Черновик редакции';
      item = asDraft
        ? withHistory(item, 'admin', 'created', mailNote)
        : prev
          ? withHistory(item, 'admin', 'edited', undefined, diffFields(prev, item))
          : withHistory(item, 'admin', 'published');
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
    // Кто размещает — из профиля (вводить заново в каждой публикации не нужно)
    const organizer = organizerOf(item, user);
    if (!organizer) throw new HttpError('profile_incomplete', 400, 'Укажите организацию или имя в профиле');
    item.eventDetails = { ...(item.eventDetails || {}), organizer };
    const { release, usage } = await reservePost(user, item.category);

    item.submittedBy = { userId: user.id, name: user.name, email: user.email, phone: user.phone, organization: user.organization };
    // Источник — сам автор; официальное название госоргана — только после подтверждения статуса
    item.sourceName = (isGovVerified(user) && user.gov?.orgName) || user.organization || user.name;
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
      // Модерация разрешает публикацию, но не подтверждает достоверность: отметку «Подтверждено по первоисточнику»
      // и дату сверки ставит редактор отдельно (форма и «Проверено сегодня»)
      const next = withHistory(
        {
          ...current,
          moderationStatus: ok ? 'approved' : 'rejected',
          moderationNote: note,
          updatedAt: kgNowLocal(),
        },
        'admin',
        body.action === 'approve' ? 'approved' : body.action === 'restore' ? 'restored' : 'rejected',
        note
      );
      await saveAnnouncement(next);
      return json({ item: next });
    }

    // Модератор сверил публикацию с первоисточником: обновляем только дату проверки
    if (body.action === 'checked') {
      await requireAdmin(req);
      const now = kgNowLocal();
      // Публикация из базы (пользовательская или правленая) — обновляем дату в её записи
      if (current && !isCheckOnlyCopy(current)) {
        const next = withHistory({ ...current, lastCheckedAt: now }, 'admin', 'edited', CHECK_NOTE);
        await saveAnnouncement(next);
        return json({ item: next });
      }
      // Встроенная публикация — храним только дату проверки, чтобы версия из кода оставалась основной
      const builtin = INITIAL_ANNOUNCEMENTS.find((a) => a.id === id);
      if (!builtin) throw new HttpError('not_found', 404);
      await cmd('HSET', CHECKED_KEY, id, now);
      return json({ item: { ...builtin, lastCheckedAt: now } });
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
      item = withHistory(item, 'admin', 'edited', undefined, diffFields(current, item));
      await saveAnnouncement(item);
      return json({ item });
    }

    if (!current || current.submittedBy?.email !== session.sub) throw new HttpError('forbidden', 403);
    if (current.moderationStatus === 'withdrawn' && !current.publishedByGov) throw new HttpError('forbidden', 403);
    await rateLimit(req, 'edit', 30, 3600, session.sub);
    const user = await hgetJson<StoredUser>(USERS_KEY, session.sub);
    let item = keepEditorial(await sanitize(authorFields(body.item), current), current);
    // Раздел по тарифу и роли; старая публикация может остаться в своём разделе
    if (user) checkPublishCategory(user, currentPeriod(user)?.plan || normalizePlan(user.plan), item.category, current.category);
    if (user) item.eventDetails = { ...(item.eventDetails || {}), organizer: organizerOf(item, user) || current.eventDetails?.organizer };
    item.submittedBy = current.submittedBy;
    if (current.publishedByGov && user && isGovVerified(user)) {
      // Госорган правит свою публикацию сам; правка сразу на сайте и попадает в историю
      item.moderationStatus = current.moderationStatus === 'withdrawn' ? 'withdrawn' : 'approved';
      item.sourceKind = 'official';
      item = withHistory(item, 'author', 'edited', undefined, diffFields(current, item));
    } else {
      item.moderationStatus = 'pending';
      item.moderationNote = undefined;
      item = withHistory(item, 'author', 'edited', 'Отправлено на повторную модерацию', diffFields(current, item));
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
