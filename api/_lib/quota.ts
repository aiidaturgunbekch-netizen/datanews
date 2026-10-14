/**
 * Лимиты тарифов — проверяются на сервере при каждой новой публикации.
 *
 *  - «Организатор» (dailyLimit = 1): ключ dn:quota:day:{email}:{дата по Бишкеку} ставится
 *    атомарно (SET … NX), поэтому вторая публикация в тот же календарный день отклоняется
 *    даже при одновременной отправке, повторе запроса или обновлении страницы.
 *  - «Старт» / «Частный» (postLimit): счётчик dn:quota:pack:{email}:{packId} увеличивается
 *    атомарно (INCR); если он превысил лимит — откатываем (DECR) и отказываем.
 *  - «Организатор» / «Муниципалитет»: публиковать можно только до paidUntil (30 дней).
 *
 * Попытка засчитывается в момент отправки на модерацию (отклонённая модератором публикация
 * лимит не возвращает). Правка своей уже отправленной публикации лимит не расходует.
 */
import type { PlanUsage } from '../../src/types';
import { normalizePlan, PLANS } from '../../src/config/site';
import { kgDateStr, addDaysStr } from '../../src/utils/time';
import { cmd } from './kv';
import { HttpError } from './http';
import type { StoredUser } from './users';

const dayKey = (email: string, day = kgDateStr()) => `dn:quota:day:${email}:${day}`;
const packKey = (email: string, packId: string) => `dn:quota:pack:${email}:${packId}`;

const MESSAGES = {
  payment_required: 'Публикация доступна после подтверждения оплаты тарифа',
  period_expired: 'Срок действия тарифа закончился — продлите его в личном кабинете',
  pack_exhausted: 'Публикации в оплаченном пакете закончились — оплатите новый пакет',
  daily_limit_reached: 'По тарифу «Организатор» можно отправить не более одной новой публикации в день (по времени Кыргызстана). Попробуйте завтра.',
} as const;

/** Текущее состояние тарифа пользователя (для кабинета и проверки перед публикацией) */
export async function getUsage(user: StoredUser): Promise<PlanUsage> {
  const plan = normalizePlan(user.plan);
  const p = PLANS[plan];
  const [usedRaw, todayRaw] = await Promise.all([
    p.postLimit !== null && user.packId ? cmd<string | null>('GET', packKey(user.email, user.packId)) : Promise.resolve(null),
    p.dailyLimit !== null ? cmd<string | null>('GET', dayKey(user.email)) : Promise.resolve(null),
  ]);
  const postsUsed = Math.max(0, Number(usedRaw || 0));
  const postedToday = Boolean(todayRaw);
  const usage: PlanUsage = { plan, active: false, postLimit: p.postLimit, postsUsed, dailyLimit: p.dailyLimit, postedToday };

  if (user.paymentStatus !== 'paid') usage.reason = 'payment_required';
  else if (p.kind === 'period' && (!user.paidUntil || new Date(user.paidUntil).getTime() <= Date.now())) usage.reason = 'period_expired';
  else if (p.kind === 'pack' && !user.packId) usage.reason = 'payment_required';
  else if (p.postLimit !== null && postsUsed >= p.postLimit) usage.reason = 'pack_exhausted';
  else if (p.dailyLimit !== null && postedToday) {
    usage.reason = 'daily_limit_reached';
    usage.nextAllowedDate = addDaysStr(kgDateStr(), 1);
  }
  usage.active = !usage.reason || usage.reason === 'daily_limit_reached';
  return usage;
}

/**
 * Резервирует одну публикацию. Возвращает функцию отката — вызвать её, если сохранить
 * публикацию не удалось (чтобы ошибка сервера не «съела» попытку).
 */
export async function reservePost(user: StoredUser): Promise<() => Promise<void>> {
  const usage = await getUsage(user);
  if (usage.reason && usage.reason !== 'daily_limit_reached') {
    throw new HttpError(usage.reason, usage.reason === 'pack_exhausted' ? 403 : 402, MESSAGES[usage.reason]);
  }
  const p = PLANS[usage.plan];
  const undo: (() => Promise<unknown>)[] = [];

  if (p.dailyLimit !== null) {
    // Ключ живёт двое суток — дольше календарного дня по Бишкеку при любом смещении часов
    const key = dayKey(user.email);
    const ok = await cmd<string | null>('SET', key, '1', 'NX', 'EX', 172800);
    if (ok !== 'OK') throw new HttpError('daily_limit_reached', 429, MESSAGES.daily_limit_reached);
    undo.push(() => cmd('DEL', key));
  }

  if (p.postLimit !== null && user.packId) {
    const key = packKey(user.email, user.packId);
    const n = await cmd<number>('INCR', key);
    if (n > p.postLimit) {
      await cmd('DECR', key);
      for (const u of undo) await u();
      throw new HttpError('pack_exhausted', 403, MESSAGES.pack_exhausted);
    }
    undo.push(() => cmd('DECR', key));
  }

  return async () => {
    for (const u of undo) await u();
  };
}
