/**
 * Тарифы и лимиты — проверяются на сервере при каждой новой публикации.
 *
 * Все тарифы действуют 30 дней. Оплаченные периоды хранятся в пользователе (`periods`) —
 * это и есть история платежей. Текущий период — тот, в который попадает «сейчас».
 *
 *  - Лимит публикаций («Старт» — 3, «Частный» — 8) считается по счётчику
 *    dn:quota:period:{email}:{periodId}. У нового периода новый id, поэтому лимит начинается
 *    заново, а неиспользованные публикации прошлого периода сгорают. Никакого сброса 1-го числа.
 *  - «Организатор» (dailyLimit = 1): ключ dn:quota:day:{email}:{дата по Бишкеку} ставится атомарно
 *    (SET … NX) — вторая публикация в тот же календарный день отклоняется даже при повторе запроса,
 *    обновлении страницы или одновременной отправке.
 *  - Вне оплаченного периода публиковать нельзя.
 *
 * Публикация засчитывается в момент отправки (отклонённая модератором лимит не возвращает).
 * Правка уже отправленной публикации лимит не расходует.
 */
import type { CategoryId, PlanId, PlanPeriod, PlanUsage } from '../../src/types';
import { allowedCategories, EDITORIAL_CATS, OFFICIAL_CATS } from '../../src/config/publishTypes';
import { normalizePlan, PLANS } from '../../src/config/site';
import { kgDateStr, addDaysStr } from '../../src/utils/time';
import { cmd } from './kv';
import { HttpError, randomId } from './http';
import { isEditor, StoredUser } from './users';

const dayKey = (email: string, day = kgDateStr()) => `dn:quota:day:${email}:${day}`;
const periodKey = (email: string, periodId: string) => `dn:quota:period:${email}:${periodId}`;

const MESSAGES = {
  payment_required: 'Публикация доступна после подтверждения оплаты тарифа',
  period_expired: 'Срок действия тарифа завершён. Продлите тариф, чтобы размещать новые публикации.',
  pack_exhausted: 'Лимит публикаций по вашему тарифу исчерпан. Выберите другой доступный тариф или дождитесь обновления лимита.',
  daily_limit_reached: 'По тарифу «Организатор» можно отправить не более одной новой публикации в день (по времени Кыргызстана). Попробуйте завтра.',
} as const;

const ts = (iso: string) => new Date(iso).getTime();

/** Периоды пользователя; старые записи (только paidUntil) превращаются в один период */
export const periodsOf = (u: StoredUser): PlanPeriod[] => {
  if (u.periods?.length) return u.periods;
  if (u.paymentStatus === 'paid' && u.paidUntil) {
    const end = ts(u.paidUntil);
    return [
      {
        id: 'legacy',
        plan: normalizePlan(u.plan),
        start: new Date(end - 30 * 86400_000).toISOString(),
        end: u.paidUntil,
        paymentRef: u.paymentRef,
        priceSom: PLANS[normalizePlan(u.plan)].priceSom,
        confirmedAt: u.paidUntil,
      },
    ];
  }
  return [];
};

const effectiveEnd = (p: PlanPeriod) => (p.suspendedAt ? Math.min(ts(p.end), ts(p.suspendedAt)) : ts(p.end));

export const currentPeriod = (u: StoredUser, now = Date.now()) =>
  periodsOf(u).find((p) => ts(p.start) <= now && now < effectiveEnd(p)) || null;

/**
 * Новый оплаченный период: 30 дней с сегодняшнего момента, а если текущий период ещё идёт —
 * с момента его окончания (продление заранее не съедает оставшиеся дни).
 */
export const addPeriod = (u: StoredUser, plan = normalizePlan(u.plan), now = Date.now()): StoredUser => {
  const periods = periodsOf(u);
  const lastEnd = periods.reduce((m, p) => Math.max(m, effectiveEnd(p)), 0);
  const start = Math.max(now, lastEnd);
  const p = PLANS[plan];
  const period: PlanPeriod = {
    id: randomId('per'),
    plan,
    start: new Date(start).toISOString(),
    end: new Date(start + p.periodDays * 86400_000).toISOString(),
    paymentRef: u.paymentRef,
    priceSom: p.priceSom,
    confirmedAt: new Date(now).toISOString(),
  };
  const next = [...periods, period];
  return { ...u, plan, periods: next, paidUntil: period.end, paymentStatus: 'paid' };
};

/** Досрочная остановка (кнопка «Приостановить»): текущий и будущие периоды прекращаются сейчас, история сохраняется */
export const suspendPeriods = (u: StoredUser, now = Date.now()): StoredUser => {
  const at = new Date(now).toISOString();
  const periods = periodsOf(u).map((p) => (effectiveEnd(p) > now ? { ...p, suspendedAt: at } : p));
  return { ...u, periods, paidUntil: undefined };
};

export const isGovVerified = (u: StoredUser) => u.govStatus === 'verified';

/** Текущее состояние тарифа пользователя (для кабинета и проверки перед публикацией) */
export async function getUsage(user: StoredUser): Promise<PlanUsage> {
  const now = Date.now();
  const cur = currentPeriod(user, now);
  const plan = cur ? cur.plan : normalizePlan(user.plan);
  const p = PLANS[plan];
  const [usedRaw, todayRaw] = await Promise.all([
    cur && p.postLimit !== null ? cmd<string | null>('GET', periodKey(user.email, cur.id)) : Promise.resolve(null),
    cur && p.dailyLimit !== null ? cmd<string | null>('GET', dayKey(user.email)) : Promise.resolve(null),
  ]);
  const postsUsed = Math.max(0, Number(usedRaw || 0));
  const postedToday = Boolean(todayRaw);
  const future = periodsOf(user)
    .filter((x) => ts(x.start) > now && !x.suspendedAt)
    .sort((a, b) => ts(a.start) - ts(b.start))[0];
  const usage: PlanUsage = {
    plan,
    active: false,
    periodStart: cur?.start,
    periodEnd: cur ? new Date(effectiveEnd(cur)).toISOString() : undefined,
    nextPeriodStart: future?.start,
    postLimit: p.postLimit,
    postsUsed,
    postsLeft: p.postLimit === null ? null : Math.max(0, p.postLimit - postsUsed),
    dailyLimit: p.dailyLimit,
    postedToday,
    skipsModeration: Boolean(cur && plan === 'gov' && isGovVerified(user)),
  };

  // Сотрудник редакции: бесплатно и без лимитов тарифа — публикация открыта без оплаченного периода.
  // Статус оплаты и периоды при этом не меняются (это не оплата).
  if (isEditor(user)) return { ...usage, active: true, editor: true, skipsModeration: true, postLimit: null, postsLeft: null, dailyLimit: null };

  if (!cur) usage.reason = periodsOf(user).length ? 'period_expired' : 'payment_required';
  else if (p.postLimit !== null && postsUsed >= p.postLimit) usage.reason = 'pack_exhausted';
  else if (p.dailyLimit !== null && postedToday) {
    usage.reason = 'daily_limit_reached';
    usage.nextAllowedDate = addDaysStr(kgDateStr(), 1);
  }
  usage.active = Boolean(cur);
  return usage;
}

/**
 * Резервирует одну публикацию. Возвращает функцию отката — вызвать её, если сохранить
 * публикацию не удалось (чтобы ошибка сервера не «съела» попытку).
 */
/** Тариф с ограничением разделов («Культура и театр») — публикации только в своём разделе */
export const checkPlanCategory = (plan: PlanId, category?: string) => {
  const allowed = PLANS[plan].categories;
  if (allowed && (!category || !allowed.includes(category as never))) {
    throw new HttpError('category_not_in_plan', 403, 'Этот тариф позволяет публиковать только в разделе «Театр и культура»');
  }
};

/**
 * Раздел разрешён пользователю: тариф («Культура и театр» — только свой раздел) и роль
 * (официальные разделы — «Государство и решения», «Гос. оповещения», «Законы», «Погода» — только подтверждённым госорганам).
 * keepCategory — раздел уже сохранённой публикации: правка старой публикации в её разделе не запрещается.
 */
export const checkPublishCategory = (user: StoredUser, plan: PlanId, category: string, keepCategory?: string) => {
  const editor = isEditor(user);
  // Сотруднику редакции тариф разделы не ограничивает (остальные правила — ниже)
  if (!editor) checkPlanCategory(plan, category);
  if (category === keepCategory) return;
  if (!allowedCategories({ plan, govVerified: isGovVerified(user), editor }).includes(category as CategoryId)) {
    throw new HttpError(
      'category_not_allowed',
      403,
      OFFICIAL_CATS.includes(category as CategoryId)
        ? 'Этот раздел доступен только подтверждённым государственным органам'
        : EDITORIAL_CATS.includes(category as CategoryId)
          ? 'Раздел «Новости» доступен только сотрудникам редакции'
          : 'Этот раздел недоступен для вашего тарифа'
    );
  }
};

export async function reservePost(user: StoredUser, category?: string): Promise<{ release: () => Promise<void>; periodId: string; usage: PlanUsage }> {
  const usage = await getUsage(user);
  const cur = currentPeriod(user);
  if (!cur || (usage.reason && usage.reason !== 'daily_limit_reached')) {
    const code = usage.reason || 'payment_required';
    throw new HttpError(code, code === 'pack_exhausted' ? 403 : 402, MESSAGES[code]);
  }
  const p = PLANS[cur.plan];
  checkPublishCategory(user, cur.plan, category || '');
  const undo: (() => Promise<unknown>)[] = [];

  if (p.dailyLimit !== null) {
    // Ключ живёт двое суток — дольше календарного дня по Бишкеку
    const key = dayKey(user.email);
    const ok = await cmd<string | null>('SET', key, '1', 'NX', 'EX', 172800);
    if (ok !== 'OK') throw new HttpError('daily_limit_reached', 429, MESSAGES.daily_limit_reached);
    undo.push(() => cmd('DEL', key));
  }

  if (p.postLimit !== null) {
    const key = periodKey(user.email, cur.id);
    const n = await cmd<number>('INCR', key);
    if (n === 1) await cmd('EXPIRE', key, 60 * 86400); // счётчик живёт дольше периода
    if (n > p.postLimit) {
      await cmd('DECR', key);
      for (const u of undo) await u();
      throw new HttpError('pack_exhausted', 403, MESSAGES.pack_exhausted);
    }
    undo.push(() => cmd('DECR', key));
  }

  return {
    periodId: cur.id,
    usage,
    release: async () => {
      for (const u of undo) await u();
    },
  };
}
