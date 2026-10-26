/**
 * /api/users — пользователи (только админ).
 *   GET                                         список зарегистрированных (с тарифом, периодами и использованием лимита)
 *   PATCH { email, paymentStatus: 'paid', plan? }   подтвердить оплату → новый 30-дневный период
 *       (если текущий ещё идёт — новый начнётся после его окончания); история периодов сохраняется
 *   PATCH { email, paymentStatus: 'unpaid' }    приостановить доступ (текущий период прекращается сейчас)
 *   PATCH { email, paymentStatus: 'rejected' }  платёж не найден
 *   PATCH { email, gov: 'verify' | 'reject' | 'revoke', note? }   подтвердить / отклонить / отозвать статус госоргана
 *   POST  { name, email, phone, organization, password, plan }   учётная запись для сотрудника или помощника:
 *       обычный пользователь (входит только в личный кабинет, без доступа к панели); оплата не подтверждается,
 *       статус госоргана не присваивается — это отдельные действия администратора
 *   PATCH { email, password }                   задать новый пароль (например, если сотрудник его забыл или ушёл)
 *
 * Тариф «Муниципалитет / госорган» можно активировать только после подтверждения статуса.
 */
import type { PaymentStatus } from '../src/types';
import { hgetJson, hsetJson, hvalsJson } from './_lib/kv';
import { handler, hashPassword, HttpError, json, readBody, requireAdmin } from './_lib/http';
import { checkPassword, newUser, StoredUser, toPublic, USERS_KEY } from './_lib/users';
import { normalizePlan, PLANS } from '../src/config/site';
import { addPeriod, getUsage, periodsOf, suspendPeriods } from './_lib/quota';

export const config = { runtime: 'edge' };

const view = async (u: StoredUser) => ({ ...toPublic(u), plan: normalizePlan(u.plan), periods: periodsOf(u), usage: await getUsage(u) });

export default handler(async (req) => {
  await requireAdmin(req);

  if (req.method === 'GET') {
    const stored = await hvalsJson<StoredUser>(USERS_KEY);
    const users = await Promise.all(stored.map(view));
    users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ users });
  }

  if (req.method === 'POST') {
    const body = await readBody<Record<string, unknown>>(req, 5000);
    // только поля учётной записи: роль, оплата и статус госоргана из запроса не принимаются
    const user = await newUser({ name: body.name, email: body.email, phone: body.phone, organization: body.organization, password: body.password, plan: body.plan });
    await hsetJson(USERS_KEY, user.email, user);
    return json({ user: await view(user) }, 201);
  }

  if (req.method === 'PATCH') {
    const body = await readBody<{ email?: string; paymentStatus?: PaymentStatus; plan?: string; gov?: string; note?: string; password?: string }>(req, 5000);
    const email = String(body.email || '').toLowerCase();
    const u = await hgetJson<StoredUser>(USERS_KEY, email);
    if (!u) throw new HttpError('not_found', 404);
    let next: StoredUser = u;

    if (typeof body.password === 'string') {
      checkPassword(body.password);
      // новый пароль закрывает все прежние входы этой учётной записи (например, если сотрудник ушёл)
      next = { ...u, ...(await hashPassword(body.password)), sessionVersion: (u.sessionVersion || 0) + 1 };
    } else if (body.gov) {
      if (!['verify', 'reject', 'revoke'].includes(body.gov)) throw new HttpError('bad_status', 400);
      if (body.gov === 'verify' && !u.gov) throw new HttpError('gov_no_request', 400, 'Организация не подавала заявку на подтверждение');
      const note = String(body.note || '').slice(0, 500) || undefined;
      next = {
        ...u,
        govStatus: body.gov === 'verify' ? 'verified' : 'rejected',
        gov: u.gov ? { ...u.gov, verifiedAt: body.gov === 'verify' ? new Date().toISOString() : undefined, note } : u.gov,
      };
    } else {
      const status = body.paymentStatus;
      if (!status || !['unpaid', 'paid', 'rejected'].includes(status)) throw new HttpError('bad_status', 400);
      const plan = normalizePlan(body.plan || u.plan);
      if (status === 'paid') {
        if (PLANS[plan].govOnly && u.govStatus !== 'verified') {
          throw new HttpError('gov_not_verified', 409, 'Сначала подтвердите официальный статус организации');
        }
        next = addPeriod({ ...u, periods: periodsOf(u) }, plan);
      } else if (status === 'unpaid') {
        next = { ...suspendPeriods({ ...u, periods: periodsOf(u) }), paymentStatus: 'unpaid' };
      } else {
        next = { ...u, paymentStatus: 'rejected' };
      }
    }
    await hsetJson(USERS_KEY, email, next);
    return json({ user: await view(next) });
  }

  throw new HttpError('method_not_allowed', 405);
});
