import type { OfficialForecast } from '../config/weather';
import type { BotIntent, BotReply } from '../types/bot';
import { Announcement, GovVerification, PaymentStatus, PlanId, PlanUsage, PublicUser, Report, SiteStats } from '../types';

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

export const logout = () => setSession(null);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('network', 0, 'Нет связи с сервером');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && session) setSession(null);
    throw new ApiError(data.error || 'error', res.status, data.message || 'Ошибка сервера');
  }
  return data as T;
}

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
export const fetchPublicAnnouncements = () => request<{ items: Announcement[]; hidden: string[] }>('announcements');
export const fetchMyAnnouncements = () => request<{ items: Announcement[] }>('announcements?scope=mine').then((r) => r.items);
export const fetchAllAnnouncements = () => request<{ items: Announcement[]; hidden: string[] }>('announcements?scope=all');

/** item может содержать imageData (data:image/...) — фото сохранится на сервере */
export const submitAnnouncement = (item: Record<string, unknown>, force = false) =>
  post<{ item: Announcement }>('announcements', { item, force }).then((r) => r.item);

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

export const fetchStats = (days: number) => request<SiteStats>(`stats?days=${days}`);

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
