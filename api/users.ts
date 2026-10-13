/**
 * /api/users — пользователи (только админ).
 *   GET                                      список зарегистрированных
 *   PATCH { email, paymentStatus }           подтвердить / отклонить оплату
 */
import type { PaymentStatus } from '../src/types';
import { hgetJson, hsetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, readBody, requireAdmin } from './_lib/http';
import { StoredUser, toPublic, USERS_KEY } from './_lib/users';
import { PLANS } from '../src/config/site';

export const config = { runtime: 'edge' };

export default handler(async (req) => {
  await requireAdmin(req);

  if (req.method === 'GET') {
    const users = (await hvalsJson<StoredUser>(USERS_KEY)).map(toPublic);
    users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ users });
  }

  if (req.method === 'PATCH') {
    const body = await readBody<{ email?: string; paymentStatus?: PaymentStatus }>(req, 5000);
    const email = String(body.email || '').toLowerCase();
    const status = body.paymentStatus;
    if (!status || !['unpaid', 'pending', 'paid', 'rejected'].includes(status)) throw new HttpError('bad_status', 400);
    const u = await hgetJson<StoredUser>(USERS_KEY, email);
    if (!u) throw new HttpError('not_found', 404);
    // Подтверждение оплаты открывает доступ на срок тарифа (30 дней), продлевая текущий срок
    const base = u.paidUntil && new Date(u.paidUntil).getTime() > Date.now() ? new Date(u.paidUntil).getTime() : Date.now();
    const next: StoredUser = {
      ...u,
      paymentStatus: status,
      paidUntil: status === 'paid' ? new Date(base + PLANS[u.plan].periodDays * 86400_000).toISOString() : undefined,
    };
    await hsetJson(USERS_KEY, email, next);
    return json({ user: toPublic(next) });
  }

  throw new HttpError('method_not_allowed', 405);
});
