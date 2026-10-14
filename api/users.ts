/**
 * /api/users — пользователи (только админ).
 *   GET                                      список зарегистрированных (с использованием тарифа)
 *   PATCH { email, paymentStatus, plan? }    подтвердить / отклонить оплату
 *     «Организатор» / «Муниципалитет» — доступ на 30 дней (продлевает текущий срок);
 *     «Старт» / «Частный» — открывается новый пакет публикаций (новый packId, счётчик с нуля).
 */
import type { PaymentStatus } from '../src/types';
import { hgetJson, hsetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, randomId, readBody, requireAdmin } from './_lib/http';
import { StoredUser, toPublic, USERS_KEY } from './_lib/users';
import { normalizePlan, PLANS } from '../src/config/site';
import { getUsage } from './_lib/quota';

export const config = { runtime: 'edge' };

export default handler(async (req) => {
  await requireAdmin(req);

  if (req.method === 'GET') {
    const stored = await hvalsJson<StoredUser>(USERS_KEY);
    const users = await Promise.all(stored.map(async (u) => ({ ...toPublic(u), plan: normalizePlan(u.plan), usage: await getUsage(u) })));
    users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ users });
  }

  if (req.method === 'PATCH') {
    const body = await readBody<{ email?: string; paymentStatus?: PaymentStatus; plan?: string }>(req, 5000);
    const email = String(body.email || '').toLowerCase();
    const status = body.paymentStatus;
    if (!status || !['unpaid', 'pending', 'paid', 'rejected'].includes(status)) throw new HttpError('bad_status', 400);
    const u = await hgetJson<StoredUser>(USERS_KEY, email);
    if (!u) throw new HttpError('not_found', 404);
    const plan = normalizePlan(body.plan || u.plan);
    const p = PLANS[plan];
    let next: StoredUser = { ...u, plan, paymentStatus: status };
    if (status === 'paid' && p.kind === 'period') {
      // Продлеваем текущий срок, если он ещё идёт (и тариф тот же), иначе 30 дней с сегодняшнего дня
      const samePlan = normalizePlan(u.plan) === plan && u.paymentStatus === 'paid';
      const until = u.paidUntil ? new Date(u.paidUntil).getTime() : 0;
      const base = samePlan && until > Date.now() ? until : Date.now();
      next = { ...next, paidUntil: new Date(base + p.periodDays! * 86400_000).toISOString(), packId: undefined };
    } else if (status === 'paid') {
      next = { ...next, paidUntil: undefined, packId: randomId('pack') };
    } else {
      next = { ...next, paidUntil: undefined, packId: undefined };
    }
    await hsetJson(USERS_KEY, email, next);
    return json({ user: { ...toPublic(next), usage: await getUsage(next) } });
  }

  throw new HttpError('method_not_allowed', 405);
});
