import React, { useEffect, useState } from 'react';
import { Announcement, Language, PlanId, PlanUsage, PublicUser } from '../types';
import * as api from '../services/api';
import { normalizePlan, PAYMENT_DETAILS, PLAN_IDS, PLANS, planTerms, planUnit } from '../config/site';
import { AccountKey, errorText, ta } from '../locales/account';
import { formatDate, formatDayMonth, formatDayMonthTime } from '../utils/dates';
import { inputCls } from './AnnouncementForm';
import { SimplePublishForm } from './SimplePublishForm';
import { PublishKey, tp } from '../locales/publish';
import { EventImage } from './EventImage';

interface Props {
  lang: Language;
  initialTab: 'cabinet' | 'publish';
  /** Открыт вход (#login): сначала форма входа, а не регистрации */
  startWithLogin?: boolean;
  /** В этом браузере сейчас сеанс администратора — вход в кабинет его завершит */
  adminSession?: boolean;
  onRoleChange: (role: api.Role) => void;
  onClose: () => void;
}

type Tab = 'cabinet' | 'publish' | 'mine';

export const MODERATION_BADGE: Record<string, { label: string; key: AccountKey; cls: string; icon: string }> = {
  pending: { label: 'На модерации', key: 'modPending', cls: 'bg-amber-100 text-amber-800', icon: 'hourglass_top' },
  approved: { label: 'Опубликовано', key: 'modApproved', cls: 'bg-emerald-100 text-emerald-800', icon: 'check_circle' },
  rejected: { label: 'Отклонено', key: 'modRejected', cls: 'bg-red-100 text-red-700', icon: 'block' },
  withdrawn: { label: 'Снято с публикации', key: 'modWithdrawn', cls: 'bg-gray-200 text-gray-700', icon: 'unpublished' },
};

export const PAYMENT_BADGE: Record<string, { label: string; key: AccountKey; cls: string }> = {
  unpaid: { label: 'Не оплачено', key: 'payUnpaid', cls: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Оплата проверяется', key: 'payPending', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Оплачено', key: 'payPaid', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Оплата не найдена', key: 'payRejected', cls: 'bg-red-100 text-red-700' },
};

/** Оплата подтверждена и срок тарифа ещё не истёк (точное состояние, включая лимиты, присылает сервер — PlanUsage) */
export const isPaidActive = (u: PublicUser) =>
  u.paymentStatus === 'paid' && (!u.paidUntil || new Date(u.paidUntil).getTime() > Date.now());

/** Можно ли сейчас отправить новую публикацию (решает сервер; здесь — только подсказка интерфейсу) */
const canPublishNow = (u: PublicUser, usage: PlanUsage | null) => (usage ? !usage.reason : isPaidActive(u));

const HISTORY_ACTION: Record<string, { ru: string; kg: string; en: string }> = {
  created: { ru: 'Отправлено на модерацию', kg: 'Модерацияга жөнөтүлдү', en: 'Sent to moderation' },
  published: { ru: 'Опубликовано', kg: 'Жарыяланды', en: 'Published' },
  edited: { ru: 'Изменено', kg: 'Өзгөртүлдү', en: 'Edited' },
  approved: { ru: 'Одобрено модератором', kg: 'Модератор жактырды', en: 'Approved' },
  rejected: { ru: 'Отклонено модератором', kg: 'Модератор четке какты', en: 'Rejected' },
  withdrawn: { ru: 'Снято с публикации', kg: 'Жарыялоодон алынды', en: 'Taken down' },
  restored: { ru: 'Возвращено на сайт', kg: 'Сайтка кайтарылды', en: 'Restored' },
  reported: { ru: 'Поступила жалоба', kg: 'Даттануу түштү', en: 'Report received' },
};
export const historyLabel = (action: string, lang: Language) => (HISTORY_ACTION[action] || HISTORY_ACTION.edited)[lang];

const som = (n: number, lang: Language) => `${n.toLocaleString('ru-RU')} ${lang === 'en' ? 'KGS' : 'сом'}`;

const PlanPicker: React.FC<{ lang: Language; value: PlanId; onChange: (p: PlanId) => void }> = ({ lang, value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {PLAN_IDS.map((id) => {
      const p = PLANS[id];
      const active = value === id;
      return (
        <button
          type="button"
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={active}
          className={`text-left p-4 rounded-2xl border-2 transition-all ${
            active ? 'border-[#20C7B5] bg-[#effdfb]' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-extrabold text-[#0f1b33]">{p.name[lang]}</span>
            {active && <span className="material-symbols-outlined text-[#20C7B5]">check_circle</span>}
          </div>
          <div className="text-xl font-black text-[#12327A] mt-1">
            {som(p.priceSom, lang)} <span className="text-xs font-semibold text-gray-500">{planUnit(lang)}</span>
          </div>
          <div className="text-xs font-bold text-[#0f766e] mt-0.5">{planTerms(id, lang)}</div>
          <div className="text-xs text-gray-500 mt-1">{p.audience[lang]}</div>
          <ul className="mt-2 space-y-1">
            {p.features.map((f) => (
              <li key={f.ru} className="text-xs text-gray-600 flex gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#20C7B5]">check</span>
                {f[lang]}
              </li>
            ))}
          </ul>
        </button>
      );
    })}
  </div>
);

const PaymentInstructions: React.FC<{ lang: Language; plan: PlanId }> = ({ lang, plan }) => {
  const p = PLANS[plan];
  const price = som(p.priceSom, lang);
  return (
    <div className="p-4 rounded-2xl bg-[#eef2f9] text-sm text-[#0f1b33] space-y-1">
      <div className="font-extrabold">
        {lang === 'kg' ? 'Төлөм' : lang === 'en' ? 'Payment' : 'Оплата'}: {p.name[lang]} — {price} ({planTerms(plan, lang)})
      </div>
      <p className="text-xs font-bold text-amber-800">{ta('manualPay', lang)}</p>
      {PAYMENT_DETAILS ? <p className="whitespace-pre-line">{PAYMENT_DETAILS}</p> : <p>{ta('payContact', lang)}</p>}
      <p className="text-xs text-gray-600">{ta('payAfter', lang)}</p>
    </div>
  );
};

/** Строка «сколько осталось» по тарифу */
const UsageLine: React.FC<{ lang: Language; usage: PlanUsage }> = ({ lang, usage }) => {
  if (usage.reason && usage.reason !== 'daily_limit_reached') {
    return <div className="text-xs mt-1 text-red-700 font-bold">{errorText({ code: usage.reason }, lang)}</div>;
  }
  const lines: string[] = [];
  if (usage.postLimit !== null) {
    lines.push(ta('postsLeft', lang).replace('{left}', String(usage.postsLeft ?? 0)).replace('{limit}', String(usage.postLimit)));
  } else {
    lines.push(ta('usageUnlimited', lang));
  }
  if (usage.dailyLimit !== null) {
    lines.push(
      usage.postedToday
        ? ta('usageDailyUsed', lang).replace('{date}', usage.nextAllowedDate ? formatDayMonth(usage.nextAllowedDate, lang) : '')
        : ta('usageDailyFree', lang)
    );
  }
  return (
    <div className="text-xs mt-1 space-y-0.5">
      {lines.map((l, i) => (
        <div key={i} className={i > 0 && usage.postedToday ? 'text-amber-800 font-bold' : 'text-gray-700 font-semibold'}>
          {l}
        </div>
      ))}
    </div>
  );
};

/** Заявка на подтверждение статуса госоргана и памятка об ответственности */
const GovBlock: React.FC<{ lang: Language; user: PublicUser; onUser: (u: PublicUser, us?: PlanUsage) => void }> = ({ lang, user, onUser }) => {
  const tr = (k: AccountKey) => ta(k, lang);
  const [f, setF] = useState({ orgName: user.organization || '', position: '', officialSite: '', officialEmail: '', documentRef: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const status = user.govStatus || 'none';
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="p-4 rounded-2xl border border-[#12327A]/15 bg-[#f6f8fd] text-sm space-y-3">
      <div className="font-extrabold text-[#0f1b33] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#12327A] text-[20px]">account_balance</span>
        {tr('govTitle')}
      </div>
      {status === 'verified' ? (
        <>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            {tr('govVerified')}: {user.gov?.orgName}
          </div>
          <p className="text-xs text-gray-700 leading-relaxed bg-white rounded-xl p-3 border border-amber-200">{tr('govResponsibility')}</p>
        </>
      ) : status === 'pending' ? (
        <div className="text-xs font-bold text-amber-800">
          {tr('govPending')}: {user.gov?.orgName}
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr('');
            setBusy(true);
            try {
              const r = await api.requestGovStatus(f);
              onUser(r.user, r.usage);
              setOk(tr('govSent'));
            } catch (ex) {
              setErr(errorText(ex, lang));
            } finally {
              setBusy(false);
            }
          }}
        >
          {status === 'rejected' && (
            <div className="text-xs font-bold text-red-700">
              {tr('govRejected')}
              {user.gov?.note ? `: ${user.gov.note}` : ''}
            </div>
          )}
          <p className="text-xs text-gray-600">{tr('govNone')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder={tr('govOrg')} value={f.orgName} onChange={set('orgName')} required />
            <input className={inputCls} placeholder={tr('govPosition')} value={f.position} onChange={set('position')} required />
            <input className={inputCls} type="url" placeholder={tr('govSite')} value={f.officialSite} onChange={set('officialSite')} required />
            <input className={inputCls} type="email" placeholder={tr('govEmail')} value={f.officialEmail} onChange={set('officialEmail')} required />
            <input className={`${inputCls} sm:col-span-2`} placeholder={tr('govDoc')} value={f.documentRef} onChange={set('documentRef')} required />
          </div>
          <p className="text-[11px] text-gray-500">{tr('govHowCheck')}</p>
          {err && <div className="text-xs font-bold text-red-700">{err}</div>}
          {ok && <div className="text-xs font-bold text-emerald-700">{ok}</div>}
          <button disabled={busy} className="px-4 py-2 rounded-xl bg-[#12327A] text-white text-xs font-bold disabled:opacity-60">
            {tr('govSend')}
          </button>
        </form>
      )}
    </div>
  );
};

export const AccountPortal: React.FC<Props> = ({ lang, initialTab, startWithLogin, adminSession, onRoleChange, onClose }) => {
  const tr = (k: AccountKey) => ta(k, lang);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(Boolean(api.getSession()));
  const [authTab, setAuthTab] = useState<'login' | 'register'>(startWithLogin || adminSession ? 'login' : 'register');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mine, setMine] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // формы входа / регистрации
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<PlanId>('start');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadMine = () =>
    api
      .fetchMyAnnouncements()
      .then(setMine)
      .catch(() => {});

  useEffect(() => {
    if (!api.getSession()) return;
    api
      .me()
      .then((r) => {
        if (r.role === 'user' && r.user) {
          setUser(r.user);
          setUsage(r.usage || null);
          setPlan(normalizePlan(r.user.plan));
          loadMine();
        }
        onRoleChange(r.role);
      })
      .catch((e: api.ApiError) => setErr(errorText(e, lang)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(errorText(e, lang));
    } finally {
      setBusy(false);
    }
  };

  /** Свежие данные о тарифе с сервера (лимиты считает только сервер) */
  const [showRenew, setShowRenew] = useState(false);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const refreshUsage = async () => {
    const r = await api.me().catch(() => null);
    if (r?.user) setUser(r.user);
    setUsage(r?.usage || null);
    return r?.usage || null;
  };

  const afterAuth = async (u: PublicUser) => {
    setUser(u);
    setPlan(normalizePlan(u.plan));
    onRoleChange('user');
    setPassword('');
    loadMine();
    const us = await refreshUsage();
    setTab(canPublishNow(u, us) ? initialTab : 'cabinet');
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setMine([]);
    onRoleChange('guest');
  };

  const pendingCount = mine.filter((m) => m.moderationStatus === 'pending').length;
  // «Мои публикации»: фильтр по статусу модерации
  const [mineFilter, setMineFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn'>('all');
  const statusOf = (a: Announcement) => a.moderationStatus || 'pending';
  const MINE_FILTERS: [typeof mineFilter, PublishKey][] = [
    ['all', 'filterAll'],
    ['pending', 'filterPending'],
    ['approved', 'filterApproved'],
    ['rejected', 'filterRejected'],
    ['withdrawn', 'filterWithdrawn'],
  ];
  const mineShown = mine.filter((a) => mineFilter === 'all' || statusOf(a) === mineFilter);
  /** Сотрудник редакции — решает сервер (назначает администратор); это не оплата */
  const isEditorUser = Boolean(usage?.editor);
  /** От чьего имени публикация: из профиля (официальное название госоргана — только после подтверждения) */
  const authorName = user ? (user.govStatus === 'verified' && user.gov?.orgName) || user.organization || user.name : '';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-[#0d2459]/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tr('cabinet')}
    >
      <div
        className="relative w-full sm:max-w-3xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0d2459] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#20C7B5]">account_circle</span>
            <div>
              <div className="font-extrabold">{tr('cabinet')}</div>
              {user && <div className="text-xs text-white/70">{user.email}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label={tr('close')} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-500">{tr('loading')}</div>
          ) : !user ? (
            /* ───────── Гость: регистрация / вход ───────── */
            <div className="space-y-5">
              {adminSession && (
                <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-sm">{tr('adminSessionNote')}</div>
              )}
              {/* Ошибка входа или регистрации (например, «Неверный e-mail или пароль») */}
              {err && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
                  {err}
                </div>
              )}
              <div className="p-4 rounded-2xl bg-[#effdfb] border border-[#20C7B5]/30 text-sm text-[#0f1b33]">
                <div className="font-extrabold mb-1">{tr('howTitle')}</div>
                <ol className="list-decimal ml-5 space-y-0.5 text-gray-700">
                  <li>{tr('how1')}</li>
                  <li>{tr('how2')}</li>
                  <li>{tr('how3')}</li>
                  <li>{tr('how4')}</li>
                </ol>
              </div>

              <div className="inline-flex bg-gray-100 p-1 rounded-xl text-sm font-bold">
                {(['register', 'login'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setAuthTab(t);
                      setErr('');
                    }}
                    className={`px-4 py-1.5 rounded-lg ${authTab === t ? 'bg-white text-[#12327A] shadow-sm' : 'text-gray-600'}`}
                  >
                    {t === 'register' ? tr('register') : tr('login')}
                  </button>
                ))}
              </div>

              {authTab === 'login' ? (
                <form
                  className="space-y-3 max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => afterAuth(await api.login(email, password)));
                  }}
                >
                  <input className={inputCls} type="email" placeholder={tr('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <input className={inputCls} type="password" placeholder={tr('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button disabled={busy} className="w-full py-2.5 rounded-xl bg-[#12327A] text-white font-extrabold disabled:opacity-60">
                    {busy ? tr('signingIn') : tr('signIn')}
                  </button>
                </form>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () =>
                      afterAuth(
                        await api.register({ name, email, phone, organization: org, password, plan, paymentRef: paymentRef.trim() || undefined })
                      )
                    );
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className={inputCls} placeholder={tr('name')} value={name} onChange={(e) => setName(e.target.value)} required />
                    <input className={inputCls} placeholder={tr('org')} aria-label={tr('org')} value={org} onChange={(e) => setOrg(e.target.value)} maxLength={160} required />
                    <input className={inputCls} type="email" placeholder={tr('emailReq')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input className={inputCls} type="tel" placeholder={tr('phoneReq')} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    <input
                      className={`${inputCls} sm:col-span-2`}
                      type="password"
                      placeholder={tr('passwordReq')}
                      value={password}
                      minLength={6}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{tr('planPaid')}</div>
                  <PlanPicker lang={lang} value={plan} onChange={setPlan} />
                  <PaymentInstructions lang={lang} plan={plan} />
                  <input
                    className={inputCls}
                    placeholder={tr('paymentRefOptional')}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                  <button disabled={busy} className="w-full py-3 rounded-xl bg-[#20C7B5] text-[#002f29] font-extrabold disabled:opacity-60">
                    {busy ? tr('signingUp') : tr('signUp')}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ───────── Пользователь ───────── */
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl text-sm font-bold w-fit">
                {(
                  [
                    ['cabinet', isEditorUser ? tp('profileTab', lang) : tr('tabProfile')],
                    ['publish', tr('tabPublish')],
                    ['mine', `${tr('tabMine')}${pendingCount ? ` (${pendingCount})` : ''}`],
                  ] as [Tab, string][]
                ).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setEditing(null);
                      setNotice('');
                      setErr('');
                    }}
                    className={`px-3 py-1.5 rounded-lg ${tab === t ? 'bg-white text-[#12327A] shadow-sm' : 'text-gray-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {notice && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{notice}</div>}
              {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

              {tab === 'cabinet' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100">
                      <div className="text-xs text-gray-500">{tr('nameLabel')}</div>
                      <div className="font-bold">{user.name}</div>
                      {user.organization && <div className="text-gray-600">{user.organization}</div>}
                      <div className="text-gray-600 mt-1">{user.phone}</div>
                    </div>
                    {isEditorUser ? (
                      // Сотрудник редакции: без тарифа и оплаты на экране (и без ложного «Оплачено»)
                      <div className="p-4 rounded-2xl bg-[#effdfb] border border-[#20C7B5]/40">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#12327A] text-white">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          {tp('editorBadge', lang)}
                        </span>
                        <p className="text-xs text-gray-700 mt-2">{tp('editorFree', lang)}</p>
                      </div>
                    ) : (
                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100">
                      <div className="text-xs text-gray-500">{tr('plan')}</div>
                      <div className="font-bold">
                        {PLANS[usage?.plan || normalizePlan(user.plan)].name[lang]} — {som(PLANS[usage?.plan || normalizePlan(user.plan)].priceSom, lang)}{' '}
                        <span className="text-xs font-semibold text-gray-500">{planUnit(lang)}</span>
                      </div>
                      <div className="text-xs text-gray-500">{planTerms(usage?.plan || normalizePlan(user.plan), lang)}</div>
                      <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${PAYMENT_BADGE[user.paymentStatus].cls}`}>
                        {tr(PAYMENT_BADGE[user.paymentStatus].key)}
                      </span>
                      {user.paymentRef && <div className="text-xs text-gray-500 mt-1">{tr('payment')}: {user.paymentRef}</div>}
                      {usage?.periodStart && usage.periodEnd ? (
                        <div className="text-xs mt-1 text-gray-700">
                          {tr('periodNow')}: <b>{formatDate(usage.periodStart, lang)}</b> — <b>{formatDate(usage.periodEnd, lang)}</b>
                        </div>
                      ) : (
                        user.paidUntil && (
                          <div className="text-xs mt-1 text-red-700 font-bold">
                            {tr('periodExpired')}: {formatDate(user.paidUntil, lang)}
                          </div>
                        )
                      )}
                      {usage?.nextPeriodStart && (
                        <div className="text-xs mt-1 text-emerald-800">
                          {tr('nextPeriod')} {formatDate(usage.nextPeriodStart, lang)}
                        </div>
                      )}
                      {usage && (usage.active || usage.reason !== 'payment_required') && <UsageLine lang={lang} usage={usage} />}
                      {PLANS[usage?.plan || normalizePlan(user.plan)].postLimit !== null && (
                        <div className="text-[11px] text-gray-500 mt-1">{tr('burnNote')}</div>
                      )}
                    </div>
                    )}
                  </div>

                  {(normalizePlan(user.plan) === 'gov' || plan === 'gov' || (user.govStatus && user.govStatus !== 'none')) && (
                    <GovBlock
                      lang={lang}
                      user={user}
                      onUser={(u, us) => {
                        setUser(u);
                        if (us) setUsage(us);
                      }}
                    />
                  )}

                  {isEditorUser ? null : user.paymentStatus === 'pending' ? (
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold">{tr('paidThanks')}</div>
                  ) : usage?.active && !showRenew ? (
                    <button
                      onClick={() => setShowRenew(true)}
                      className="px-4 py-2 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">autorenew</span>
                      {tr('renew')}
                    </button>
                  ) : (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          const r = await api.reportPayment(paymentRef, plan);
                          setUser(r.user);
                          setUsage(r.usage || null);
                          setShowRenew(false);
                          setNotice(tr('paidThanks'));
                        });
                      }}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{usage?.active ? tr('renew') : tr('newPayment')}</div>
                      {usage?.active && <p className="text-xs text-gray-600">{tr('renewHint')}</p>}
                      <PlanPicker lang={lang} value={plan} onChange={setPlan} />
                      <PaymentInstructions lang={lang} plan={plan} />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className={inputCls}
                          placeholder={tr('paymentRef')}
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          required
                        />
                        <button disabled={busy} className="px-5 py-2 rounded-xl bg-[#12327A] text-white font-bold whitespace-nowrap disabled:opacity-60">
                          {tr('paidBtn')}
                        </button>
                      </div>
                    </form>
                  )}

                  {(user.periods?.length || 0) > 0 && (
                    <div className="text-sm">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{tr('payHistory')}</div>
                      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                        {[...(user.periods || [])].reverse().map((p) => (
                          <li key={p.id} className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-700">
                            <b>{PLANS[p.plan].name[lang]}</b>
                            <span>{som(p.priceSom, lang)}</span>
                            <span>
                              {formatDate(p.start, lang)} — {formatDate(p.end, lang)}
                            </span>
                            {p.paymentRef && <span className="text-gray-500">{p.paymentRef}</span>}
                            {p.suspendedAt && <span className="text-red-700 font-bold">{tr('suspended')}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button onClick={logout} className="text-sm font-bold text-red-600 hover:underline inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {tr('logout')}
                  </button>
                </div>
              )}

              {tab === 'publish' &&
                (!canPublishNow(user, usage) ? (
                  <div className="p-6 rounded-2xl bg-amber-50 text-amber-900 text-sm">
                    <div className="font-extrabold mb-1">{tr('lockedTitle')}</div>
                    {usage?.reason && usage.reason !== 'payment_required' ? (
                      usage.reason === 'daily_limit_reached' ? (
                        <UsageLine lang={lang} usage={usage} />
                      ) : (
                        <>
                          {errorText({ code: usage.reason }, lang)}. {tr('lockedHint')}
                        </>
                      )
                    ) : (
                      <>
                        {tr('lockedStatus')}: <b>{tr(PAYMENT_BADGE[user.paymentStatus].key)}</b>. {tr('lockedHint')}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={`p-3 rounded-xl text-xs ${usage?.skipsModeration ? 'bg-amber-50 text-amber-900 font-semibold' : 'bg-[#eef2f9] text-gray-700'}`}>
                      {isEditorUser ? tp('editorFree', lang) : usage?.skipsModeration ? tr('publishDirect') : tr('moderationHint')}
                      {usage && !isEditorUser && <UsageLine lang={lang} usage={usage} />}
                    </div>
                    <SimplePublishForm
                      lang={lang}
                      plan={usage?.plan || normalizePlan(user.plan)}
                      govVerified={user.govStatus === 'verified'}
                      author={authorName}
                      storageKey={`dn:publish-draft:${user.email}`}
                      direct={Boolean(usage?.skipsModeration)}
                      editor={isEditorUser}
                      submitLabel={isEditorUser ? tp('publish', lang) : usage?.skipsModeration ? tr('publishNow') : tr('sendToModeration')}
                      onSubmit={async (item) => {
                        try {
                          await api.submitAnnouncement(item);
                        } finally {
                          // лимит мог измениться (или сервер отказал по лимиту) — обновляем состояние тарифа
                          await refreshUsage();
                        }
                        await loadMine();
                        setMineFilter('all');
                        setTab('mine');
                        setNotice(tp(isEditorUser ? 'sentEditor' : usage?.skipsModeration ? 'sentDirect' : 'sent', lang));
                      }}
                    />
                  </>
                ))}

              {tab === 'mine' &&
                (editing ? (
                  <SimplePublishForm
                    key={editing.id}
                    lang={lang}
                    plan={usage?.plan || normalizePlan(user.plan)}
                    govVerified={user.govStatus === 'verified'}
                    author={authorName}
                    initial={editing}
                    direct={Boolean(editing.publishedByGov)}
                    editor={isEditorUser}
                    submitLabel={isEditorUser ? tp('publish', lang) : editing.publishedByGov ? tr('publishNow') : tr('resubmit')}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (item) => {
                      await api.updateAnnouncement(editing.id, item);
                      await loadMine();
                      setNotice(isEditorUser ? tp('sentEditor', lang) : editing.publishedByGov ? tr('publishedDirect') : tr('resubmitted'));
                      setEditing(null);
                    }}
                  />
                ) : mine.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">{tr('nothingYet')}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('tabMine')}>
                      {MINE_FILTERS.map(([f, k]) => {
                        const n = f === 'all' ? mine.length : mine.filter((a) => statusOf(a) === f).length;
                        return (
                          <button
                            key={f}
                            type="button"
                            aria-pressed={mineFilter === f}
                            onClick={() => setMineFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mineFilter === f ? 'bg-[#12327A] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                          >
                            {tp(k, lang)} ({n})
                          </button>
                        );
                      })}
                    </div>
                    {mineShown.length === 0 && <div className="py-6 text-center text-gray-500 text-sm">{tp('filterEmpty', lang)}</div>}
                    {[...mineShown]
                      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                      .map((a) => {
                        const b = MODERATION_BADGE[a.moderationStatus || 'pending'];
                        // Сотрудник редакции и госорган правят своё и после публикации (правка сразу на сайте)
                        const canEdit = a.publishedByGov || isEditorUser ? a.moderationStatus !== 'withdrawn' : a.moderationStatus !== 'approved' && a.moderationStatus !== 'withdrawn';
                        return (
                          <div key={a.id} className="p-3 rounded-2xl border border-gray-100">
                            <div className="flex gap-3">
                              <EventImage item={a} className="w-24 h-16 rounded-xl flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${b.cls}`}>
                                    <span className="material-symbols-outlined text-[13px]">{b.icon}</span>
                                    {tr(b.key)}
                                  </span>
                                  <span className="text-xs text-gray-500">{formatDayMonthTime(a.startDate, lang)}</span>
                                  {(a.reportsCount || 0) > 0 && (
                                    <span className="text-[11px] font-bold text-red-700">
                                      {tr('reportsN')}: {a.reportsCount}
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-sm text-[#0f1b33] truncate mt-1">{a.title.ru}</div>
                                {(a.moderationStatus === 'rejected' || a.moderationStatus === 'withdrawn') && a.moderationNote && (
                                  <div className="text-xs text-red-700 mt-1">
                                    {tr('reason')}: {a.moderationNote}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {canEdit && (
                                <button onClick={() => setEditing(a)} className="px-3 py-1.5 rounded-lg bg-[#eef2f9] text-[#12327A] text-xs font-bold">
                                  {tr('edit')}
                                </button>
                              )}
                              {a.moderationStatus === 'approved' && (
                                <button
                                  onClick={() =>
                                    window.confirm(tr('withdrawConfirm')) &&
                                    run(async () => {
                                      await api.withdrawAnnouncement(a.id);
                                      await loadMine();
                                      setNotice(tr('withdrawn'));
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                                >
                                  {tr('withdraw')}
                                </button>
                              )}
                              {(a.history?.length || 0) > 0 && (
                                <button
                                  onClick={() => setOpenHistory(openHistory === a.id ? null : a.id)}
                                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold inline-flex items-center gap-1"
                                  aria-expanded={openHistory === a.id}
                                >
                                  <span className="material-symbols-outlined text-[14px]">history</span>
                                  {tr('history')}
                                </button>
                              )}
                            </div>
                            {openHistory === a.id && (
                              <ul className="mt-2 text-xs text-gray-600 space-y-0.5 border-t border-gray-100 pt-2">
                                {[...(a.history || [])].reverse().map((h, i) => (
                                  <li key={i}>
                                    {formatDayMonthTime(h.at, lang)} — {historyLabel(h.action, lang)}
                                    {h.note ? `: ${h.note}` : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
