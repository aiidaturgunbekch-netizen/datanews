import React, { useEffect, useState } from 'react';
import { Announcement, Language, PlanId, PublicUser } from '../types';
import * as api from '../services/api';
import { PAYMENT_DETAILS, PLANS, planPeriod } from '../config/site';
import { AccountKey, errorText, ta } from '../locales/account';
import { formatDate, formatDayMonthTime } from '../utils/dates';
import { AnnouncementForm, inputCls } from './AnnouncementForm';
import { EventImage } from './EventImage';

interface Props {
  lang: Language;
  initialTab: 'cabinet' | 'publish';
  onRoleChange: (role: api.Role) => void;
  onClose: () => void;
}

type Tab = 'cabinet' | 'publish' | 'mine';

export const MODERATION_BADGE: Record<string, { label: string; key: AccountKey; cls: string; icon: string }> = {
  pending: { label: 'На модерации', key: 'modPending', cls: 'bg-amber-100 text-amber-800', icon: 'hourglass_top' },
  approved: { label: 'Опубликовано', key: 'modApproved', cls: 'bg-emerald-100 text-emerald-800', icon: 'check_circle' },
  rejected: { label: 'Отклонено', key: 'modRejected', cls: 'bg-red-100 text-red-700', icon: 'block' },
};

export const PAYMENT_BADGE: Record<string, { label: string; key: AccountKey; cls: string }> = {
  unpaid: { label: 'Не оплачено', key: 'payUnpaid', cls: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Оплата проверяется', key: 'payPending', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Оплачено', key: 'payPaid', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Оплата не найдена', key: 'payRejected', cls: 'bg-red-100 text-red-700' },
};

/** Оплата подтверждена и срок тарифа ещё не истёк */
export const isPaidActive = (u: PublicUser) =>
  u.paymentStatus === 'paid' && (!u.paidUntil || new Date(u.paidUntil).getTime() > Date.now());

const som = (n: number, lang: Language) => `${n.toLocaleString('ru-RU')} ${lang === 'en' ? 'KGS' : 'сом'}`;

const PlanPicker: React.FC<{ lang: Language; value: PlanId; onChange: (p: PlanId) => void }> = ({ lang, value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {(Object.keys(PLANS) as PlanId[]).map((id) => {
      const p = PLANS[id];
      const active = value === id;
      return (
        <button
          type="button"
          key={id}
          onClick={() => onChange(id)}
          className={`text-left p-4 rounded-2xl border-2 transition-all ${
            active ? 'border-[#20C7B5] bg-[#effdfb]' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#0f1b33]">{p.name[lang]}</span>
            {active && <span className="material-symbols-outlined text-[#20C7B5]">check_circle</span>}
          </div>
          <div className="text-xl font-black text-[#12327A] mt-1">
            {som(p.priceSom, lang)} <span className="text-xs font-semibold text-gray-500">/ {planPeriod(p.periodDays, lang)}</span>
          </div>
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
  const price = som(PLANS[plan].priceSom, lang);
  const period = planPeriod(PLANS[plan].periodDays, lang);
  return (
    <div className="p-4 rounded-2xl bg-[#eef2f9] text-sm text-[#0f1b33] space-y-1">
      <div className="font-extrabold">
        {lang === 'kg'
          ? `Төлөм: ${period} үчүн ${price}`
          : lang === 'en'
          ? `Payment: ${price} for ${period}`
          : `Оплата: ${price} за ${period}`}
      </div>
      {PAYMENT_DETAILS ? <p className="whitespace-pre-line">{PAYMENT_DETAILS}</p> : <p>{ta('payContact', lang)}</p>}
      <p className="text-xs text-gray-600">{ta('payAfter', lang)}</p>
    </div>
  );
};

export const AccountPortal: React.FC<Props> = ({ lang, initialTab, onRoleChange, onClose }) => {
  const tr = (k: AccountKey) => ta(k, lang);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(Boolean(api.getSession()));
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
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
  const [plan, setPlan] = useState<PlanId>('basic');
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

  const afterAuth = (u: PublicUser) => {
    setUser(u);
    onRoleChange('user');
    setPassword('');
    loadMine();
    setTab(isPaidActive(u) ? initialTab : 'cabinet');
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setMine([]);
    onRoleChange('guest');
  };

  const pendingCount = mine.filter((m) => m.moderationStatus === 'pending').length;

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
                    <input className={inputCls} placeholder={tr('org')} value={org} onChange={(e) => setOrg(e.target.value)} />
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
                    ['cabinet', tr('tabProfile')],
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
                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100">
                      <div className="text-xs text-gray-500">{tr('plan')}</div>
                      <div className="font-bold">
                        {PLANS[user.plan].name[lang]} — {som(PLANS[user.plan].priceSom, lang)}
                      </div>
                      <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${PAYMENT_BADGE[user.paymentStatus].cls}`}>
                        {tr(PAYMENT_BADGE[user.paymentStatus].key)}
                      </span>
                      {user.paymentRef && <div className="text-xs text-gray-500 mt-1">{tr('payment')}: {user.paymentRef}</div>}
                      {user.paidUntil && (
                        <div className={`text-xs mt-1 ${isPaidActive(user) ? 'text-gray-500' : 'text-red-700 font-bold'}`}>
                          {isPaidActive(user) ? tr('paidUntil') : tr('paidExpired')}: {formatDate(user.paidUntil, lang)}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isPaidActive(user) && (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          setUser(await api.reportPayment(paymentRef, plan));
                          setNotice(tr('paidThanks'));
                        });
                      }}
                    >
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

                  <button onClick={logout} className="text-sm font-bold text-red-600 hover:underline inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {tr('logout')}
                  </button>
                </div>
              )}

              {tab === 'publish' &&
                (!isPaidActive(user) ? (
                  <div className="p-6 rounded-2xl bg-amber-50 text-amber-900 text-sm">
                    <div className="font-extrabold mb-1">{tr('lockedTitle')}</div>
                    {tr('lockedStatus')}: <b>{tr(PAYMENT_BADGE[user.paymentStatus].key)}</b>. {tr('lockedHint')}
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-[#eef2f9] text-xs text-gray-700">
                      {tr('moderationHint')}
                    </div>
                    <AnnouncementForm
                      lang={lang}
                      mode="user"
                      submitLabel={tr('sendToModeration')}
                      onSubmit={async (item) => {
                        await api.submitAnnouncement(item);
                        await loadMine();
                        setTab('mine');
                        setNotice(tr('sentToModeration'));
                      }}
                    />
                  </>
                ))}

              {tab === 'mine' &&
                (editing ? (
                  <AnnouncementForm
                    lang={lang}
                    mode="user"
                    initial={editing}
                    submitLabel={tr('resubmit')}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (item) => {
                      await api.updateAnnouncement(editing.id, item);
                      await loadMine();
                      setEditing(null);
                      setNotice(tr('resubmitted'));
                    }}
                  />
                ) : mine.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">{tr('nothingYet')}</div>
                ) : (
                  <div className="space-y-3">
                    {[...mine]
                      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                      .map((a) => {
                        const b = MODERATION_BADGE[a.moderationStatus || 'pending'];
                        return (
                          <div key={a.id} className="flex gap-3 p-3 rounded-2xl border border-gray-100">
                            <EventImage item={a} className="w-24 h-16 rounded-xl flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${b.cls}`}>
                                  <span className="material-symbols-outlined text-[13px]">{b.icon}</span>
                                  {tr(b.key)}
                                </span>
                                <span className="text-xs text-gray-500">{formatDayMonthTime(a.startDate, lang)}</span>
                              </div>
                              <div className="font-bold text-sm text-[#0f1b33] truncate mt-1">{a.title.ru}</div>
                              {a.moderationStatus === 'rejected' && a.moderationNote && (
                                <div className="text-xs text-red-700 mt-1">{tr('reason')}: {a.moderationNote}</div>
                              )}
                            </div>
                            {a.moderationStatus !== 'approved' && (
                              <button
                                onClick={() => setEditing(a)}
                                className="self-center px-3 py-1.5 rounded-lg bg-[#eef2f9] text-[#12327A] text-xs font-bold"
                              >
                                {tr('edit')}
                              </button>
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
