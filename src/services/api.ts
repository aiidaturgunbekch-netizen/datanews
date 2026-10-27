import type { OfficialForecast } from '../config/weather';
import type { BotIntent, BotReply } from '../types/bot';
import { Announcement, GovVerification, MailItem, PaymentStatus, PlanId, PlanUsage, PublicUser, Report, SiteStats } from '../types';

/**
 * Клиент серверных функций /api (Vercel). Токен входа хранится в браузере.
 */
const SESSION_KEY = 'datanews_kg_session_v1';

export type Role = 'guest' | 'user' | 'admin';

export interface StoredSession {
  token: string;
  role: Exclude<Role, 'guest'>;
}

export class ApiError extends Error {
  constructor(public code: string, public status: number, message?: string) {
    super(message || code);
  }
}

export const getSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};

const setSession = (s: StoredSession | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* приватный режим браузера */
  }
};

/** Выход: браузер сразу забывает вход, а сервер закрывает прежние входы этой учётной записи */
export const logout = async () => {
  const s = getSession();
  setSession(null);
  if (s?.role === 'user') {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {});
  }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    // Наш API никогда не перенаправляет; перенаправление — это страница входа защиты Vercel (её распознаём ниже)
    res = await fetch(`/api/${path}`, { ...init, redirect: 'manual', headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('network', 0, NETWORK_MESSAGE);
  }
  const fail = responseFailure(res);
  if (fail) throw fail;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && session && data.error) setSession(null);
    throw new ApiError(data.error || 'error', res.status, data.message || nonJsonMessage(res));
  }
  return data as T;
}

const NETWORK_MESSAGE = 'Нет связи с сервером: запрос не получил ответа (нет интернета, сайт недоступен или запрос заблокирован браузером / расширением). Обновите страницу и попробуйте снова.';
const PREVIEW_AUTH_MESSAGE =
  'Запрос перенаправлен на страницу входа Vercel: истёк вход в защищённый Preview. Обновите страницу (F5), при необходимости войдите в Vercel, и повторите действие.';

/** Ответ не от нашего API: перенаправление на вход Vercel (Preview под защитой) */
const responseFailure = (res: Response): ApiError | null =>
  res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400) ? new ApiError('preview_auth', res.status, PREVIEW_AUTH_MESSAGE) : null;

/** Понятная причина, если сервер ответил не JSON (сбой платформы, защита Vercel) */
const nonJsonMessage = (res: Response) => {
  const vercelError = res.headers.get('x-vercel-error');
  if (vercelError) return `Сбой платформы Vercel: ${vercelError} (код ${res.status}). Функция сайта не ответила — попробуйте ещё раз; если повторяется, это ошибка развёртывания.`;
  if (res.status === 401 || res.status === 403) return `Доступ закрыт защитой Vercel Preview (код ${res.status}). Обновите страницу и войдите в Vercel.`;
  return `Ошибка сервера (код ${res.status})`;
};

const post = <T>(path: string, body: unknown, method = 'POST') => request<T>(path, { method, body: JSON.stringify(body) });

// ---------- auth ----------
export const me = () => request<{ role: Role; user?: PublicUser; usage?: PlanUsage }>('auth');

export const adminLogin = async (password: string) => {
  const r = await post<{ token: string }>('auth', { action: 'admin-login', password });
  setSession({ token: r.token, role: 'admin' });
};

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  password: string;
  plan: PlanId;
  paymentRef?: string;
}

export const register = async (input: RegisterInput) => {
  const r = await post<{ token: string; user: PublicUser }>('auth', { action: 'register', ...input });
  setSession({ token: r.token, role: 'user' });
  return r.user;
};

export const login = async (email: string, password: string) => {
  const r = await post<{ token: string; user: PublicUser }>('auth', { action: 'login', email, password });
  setSession({ token: r.token, role: 'user' });
  return r.user;
};

export const reportPayment = (paymentRef: string, plan: PlanId) =>
  post<{ user: PublicUser; usage?: PlanUsage }>('auth', { action: 'payment', paymentRef, plan });

// ---------- announcements ----------
export const fetchPublicAnnouncements = () => request<{ items: Announcement[]; hidden: string[]; checked?: Record<string, string> }>('announcements');
export const fetchMyAnnouncements = () => request<{ items: Announcement[] }>('announcements?scope=mine').then((r) => r.items);
export const fetchAllAnnouncements = () =>
  request<{ items: Announcement[]; hidden: string[]; checked?: Record<string, string> }>('announcements?scope=all');

/** item может содержать imageData (data:image/...) — фото сохранится на сервере */
export const submitAnnouncement = (item: Record<string, unknown>, force = false) =>
  post<{ item: Announcement }>('announcements', { item, force }).then((r) => r.item);

/** Черновик администратора (в т.ч. из письма): попадает в «Модерацию», на сайте не виден до «Одобрить» */
export const submitDraft = (item: Record<string, unknown>, mailId?: string, force = false) =>
  post<{ item: Announcement }>('announcements', { item, force, asDraft: true, mailId }).then((r) => r.item);

export const updateAnnouncement = (id: string, item: Record<string, unknown>) =>
  post<{ item: Announcement }>('announcements', { id, item }, 'PATCH').then((r) => r.item);

export const moderateAnnouncement = (id: string, action: 'approve' | 'reject' | 'restore' | 'withdraw', note?: string) =>
  post<{ item: Announcement }>('announcements', { id, action, note }, 'PATCH').then((r) => r.item);

/** Отметить, что публикация сверена с первоисточником сегодня (администратор) */
export const markChecked = (id: string) => post<{ item: Announcement }>('announcements', { id, action: 'checked' }, 'PATCH').then((r) => r.item);

/** Снять свою публикацию с сайта (автор) */
export const withdrawAnnouncement = (id: string, note?: string) => moderateAnnouncement(id, 'withdraw', note);

/** Заявка на подтверждение статуса госоргана / муниципалитета */
export const requestGovStatus = (input: Omit<GovVerification, 'requestedAt' | 'verifiedAt' | 'note'>) =>
  post<{ user: PublicUser; usage?: PlanUsage }>('auth', { action: 'gov-request', ...input });

// ---------- жалобы ----------
export const submitReport = (annId: string, reason: Report['reason'], comment?: string, contact?: string) =>
  post<{ ok: true }>('reports', { annId, reason, comment, contact });
export const fetchReports = () => request<{ reports: Report[] }>('reports').then((r) => r.reports);
export const resolveReport = (id: string, resolution: string, withdraw = false) =>
  post<{ ok: true }>('reports', { id, resolution, withdraw }, 'PATCH');

export const deleteAnnouncement = (id: string) =>
  request<{ ok: true }>(`announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---------- users & stats (admin) ----------
export type AdminUser = PublicUser & { usage?: PlanUsage };
export const fetchUsers = () => request<{ users: AdminUser[] }>('users').then((r) => r.users);
export const setPaymentStatus = (email: string, paymentStatus: PaymentStatus, plan?: PlanId) =>
  post<{ user: AdminUser }>('users', { email, paymentStatus, plan }, 'PATCH').then((r) => r.user);
export const setGovStatus = (email: string, gov: 'verify' | 'reject' | 'revoke', note?: string) =>
  post<{ user: AdminUser }>('users', { email, gov, note }, 'PATCH').then((r) => r.user);

/** Учётная запись для сотрудника / помощника: обычный пользователь, только личный кабинет */
export const createUserAccount = (u: { name: string; email: string; phone: string; organization: string; password: string; plan: PlanId; editor?: boolean }) =>
  post<{ user: AdminUser }>('users', u).then((r) => r.user);
/** Сотрудник редакции: назначить / отозвать (только администратор) */
export const setEditor = (email: string, editor: 'grant' | 'revoke') => post<{ user: AdminUser }>('users', { email, editor }, 'PATCH').then((r) => r.user);
export const setUserPassword = (email: string, password: string) => post<{ user: AdminUser }>('users', { email, password }, 'PATCH').then((r) => r.user);

export const fetchStats = (days: number) => request<SiteStats>(`stats?days=${days}`);

/** Состояние приёма редакционной почты (без значений секретов) */
export interface MailIngestStatus {
  enabled: boolean;
  at?: string;
  environment: 'production' | 'preview' | 'local';
  productionBlocked: boolean;
  /** ok — задан; missing — не задан в этой сборке; too_short — задан, но короче 32 символов */
  secretState: 'ok' | 'missing' | 'too_short';
  secretConfigured: boolean;
  build: { environment: 'production' | 'preview' | 'local'; branch?: string; commit?: string };
  envSwitchOff: boolean;
}
export const fetchMailStatus = () => request<MailIngestStatus>('sources?mail=settings');
export const fetchMailList = () => request<{ items: MailItem[] }>('sources?mail=list').then((r) => r.items);
export const fetchMailAttachment = (key: string) =>
  request<{ dataUrl: string }>(`sources?mail=att&key=${encodeURIComponent(key)}`).then((r) => r.dataUrl);
export const mailItemAction = (id: string, action: 'reject' | 'duplicate' | 'reopen' | 'reparse' | 'prepared' | 'published', extra: { annId?: string; duplicateOf?: string; note?: string } = {}) =>
  post<{ item: MailItem }>('sources?mail=action', { id, action, ...extra }).then((r) => r.item);
export const setMailEnabled = (enabled: boolean) => post<MailIngestStatus>('sources?mail=settings', { enabled });

/** Резервная копия данных (только админ): скачивается файлом JSON */
export const downloadBackup = async (withImages: boolean) => {
  const session = getSession();
  const res = await fetch(`/api/stats?backup=1${withImages ? '&images=1' : ''}`, {
    redirect: 'manual',
    headers: session ? { Authorization: `Bearer ${session.token}` } : {},
  }).catch(() => {
    throw new ApiError('network', 0, NETWORK_MESSAGE);
  });
  const fail = responseFailure(res);
  if (fail) throw fail;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || 'error', res.status, data.message || nonJsonMessage(res));
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'datanews-backup.json';
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------- погода и источники ----------
export interface WeatherResponse {
  snapshot: {
    provider: string;
    fetchedAt: string;
    points: {
      id: string;
      fetchedAt?: string;
      error?: string;
      days: { date: string; tMax: number; tMin: number; tNight?: number; tDay?: number; precip: number; windMax: number; symbol?: string; flags: string[] }[];
    }[];
  } | null;
  status: { lastAttemptAt?: string; lastSuccessAt?: string; lastError?: string } | null;
  /** Официальный прогноз Кыргызгидромета, внесённый редакцией (только на сегодня и позже) */
  official?: OfficialForecast | null;
  refreshAfterHours: number;
  staleAfterHours: number;
}
export const fetchWeather = () => request<WeatherResponse>('weather');
export const saveOfficialForecast = (f: OfficialForecast) => post<{ official: OfficialForecast }>('weather', f);
export const deleteOfficialForecast = () => request<{ ok: true }>('weather', { method: 'DELETE' });

export interface SourceRow {
  id: string;
  name: string;
  url: string;
  type: string;
  automatic: boolean;
  method: string;
  frequency: string;
  note?: string;
  status: { lastAttemptAt?: string; lastSuccessAt?: string; lastError?: string; items?: number } | null;
}
export const fetchSources = () => request<{ sources: SourceRow[] }>('sources').then((r) => r.sources);

// ---------- helpers ----------
/** Сжимает фото в браузере до JPEG ≤ maxSide px, чтобы публикация грузилась быстро */
export const compressImage = (file: File, maxSide = 1400, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });

// ---------- бот DataNews (без внешнего ИИ) ----------
export const askBot = (input: { q?: string; intent?: BotIntent }, lang: string) => post<BotReply>('assistant', { ...input, lang });

// ---------- push-уведомления ----------
export interface PushStats {
  configured: boolean;
  total: number;
  byCity: Record<string, number>;
  last: { id: string; at: string; title: { ru: string } } | null;
}
export const pushStats = () => request<PushStats>('push?stats=1');
export const sendPushFor = (annId: string) => post<{ sent: number; removed: number; failed: number; total: number }>('push', { annId }, 'PATCH');
