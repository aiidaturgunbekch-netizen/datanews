import { Announcement, PaymentStatus, PlanId, PublicUser, SiteStats } from '../types';

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
export const me = () => request<{ role: Role; user?: PublicUser }>('auth');

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
  post<{ user: PublicUser }>('auth', { action: 'payment', paymentRef, plan }).then((r) => r.user);

// ---------- announcements ----------
export const fetchPublicAnnouncements = () => request<{ items: Announcement[]; hidden: string[] }>('announcements');
export const fetchMyAnnouncements = () => request<{ items: Announcement[] }>('announcements?scope=mine').then((r) => r.items);
export const fetchAllAnnouncements = () => request<{ items: Announcement[]; hidden: string[] }>('announcements?scope=all');

/** item может содержать imageData (data:image/...) — фото сохранится на сервере */
export const submitAnnouncement = (item: Record<string, unknown>) =>
  post<{ item: Announcement }>('announcements', { item }).then((r) => r.item);

export const updateAnnouncement = (id: string, item: Record<string, unknown>) =>
  post<{ item: Announcement }>('announcements', { id, item }, 'PATCH').then((r) => r.item);

export const moderateAnnouncement = (id: string, action: 'approve' | 'reject', note?: string) =>
  post<{ item: Announcement }>('announcements', { id, action, note }, 'PATCH').then((r) => r.item);

export const deleteAnnouncement = (id: string) =>
  request<{ ok: true }>(`announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---------- users & stats (admin) ----------
export const fetchUsers = () => request<{ users: PublicUser[] }>('users').then((r) => r.users);
export const setPaymentStatus = (email: string, paymentStatus: PaymentStatus) =>
  post<{ user: PublicUser }>('users', { email, paymentStatus }, 'PATCH').then((r) => r.user);

export const fetchStats = (days: number) => request<SiteStats>(`stats?days=${days}`);

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
