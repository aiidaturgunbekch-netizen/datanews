/**
 * Общие функции для серверных функций Vercel: ответы, токены входа, пароли.
 */
import { cmd, isConfigured, StorageError, StorageNotConfiguredError } from './kv';
import { env } from './env';

export type Role = 'admin' | 'user';

export interface Session {
  sub: string; // email пользователя или 'admin'
  role: Role;
  exp: number;
}


export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const error = (code: string, status = 400, message?: string) => json({ error: code, message }, status);

/** Оборачивает обработчик: ловит ошибки хранилища и неожиданные исключения */
export const handler =
  (fn: (req: Request) => Promise<Response>) =>
  async (req: Request): Promise<Response> => {
    try {
      if (!isConfigured()) throw new StorageNotConfiguredError();
      return await fn(req);
    } catch (e) {
      if (e instanceof StorageNotConfiguredError) {
        return error('storage_not_configured', 503, 'Подключите Upstash Redis в Vercel (Storage) и задайте ADMIN_PASSWORD');
      }
      if (e instanceof HttpError) return error(e.code, e.status, e.message);
      if (e instanceof StorageError) {
        // В лог — только код и краткая причина, без адреса базы и токена
        console.error(`[storage] ${e.code}${e.detail ? ` (${e.detail})` : ''}`);
        return error(e.code, 503, e.message);
      }
      console.error('[server]', e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error');
      return error('server_error', 500, 'Внутренняя ошибка сервера. Подробности — в логах Vercel (Deployments → сборка → Logs).');
    }
  };

export class HttpError extends Error {
  constructor(public code: string, public status = 400, message?: string) {
    super(message || code);
  }
}

export const readBody = async <T>(req: Request, maxBytes = 2_000_000): Promise<T> => {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError('payload_too_large', 413);
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new HttpError('bad_json', 400);
  }
};

// ---------- base64url ----------
const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

// ---------- tokens ----------
const secret = () => {
  const s = env('AUTH_SECRET') || (env('ADMIN_PASSWORD') ? `dn:${env('ADMIN_PASSWORD')}:secret` : '');
  if (!s) {
    if (env('DATANEWS_MEMORY_KV') === '1') return 'dev-only-secret';
    throw new HttpError('admin_not_configured', 503, 'Задайте ADMIN_PASSWORD в переменных окружения Vercel');
  }
  return s;
};

const hmac = async (data: string) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
};

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const signSession = async (sub: string, role: Role, days = 30) => {
  const payload = b64url(enc.encode(JSON.stringify({ sub, role, exp: Date.now() + days * 86400_000 } satisfies Session)));
  return `${payload}.${await hmac(payload)}`;
};

export const readSession = async (req: Request): Promise<Session | null> => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(payload))) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
};

export const requireAdmin = async (req: Request) => {
  const s = await readSession(req);
  if (!s || s.role !== 'admin') throw new HttpError('forbidden', 403);
  return s;
};

export const requireUser = async (req: Request) => {
  const s = await readSession(req);
  if (!s) throw new HttpError('unauthorized', 401);
  return s;
};

/** Проверка пароля администратора (из переменной окружения ADMIN_PASSWORD) */
export const checkAdminPassword = (password: string) => {
  const expected = env('ADMIN_PASSWORD') || (env('DATANEWS_MEMORY_KV') === '1' ? 'admin-dev' : '');
  if (!expected) throw new HttpError('admin_not_configured', 503, 'Задайте ADMIN_PASSWORD в переменных окружения Vercel');
  return safeEqual(password, expected);
};

// ---------- password hashing (PBKDF2-SHA256) ----------
const ITERATIONS = 100_000;

export const hashPassword = async (password: string, saltB64?: string) => {
  const salt = saltB64 ? fromB64url(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return { salt: b64url(salt), hash: b64url(new Uint8Array(bits)) };
};

export const verifyPassword = async (password: string, salt: string, hash: string) =>
  safeEqual((await hashPassword(password, salt)).hash, hash);

export const randomId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${b64url(crypto.getRandomValues(new Uint8Array(6)))}`;

/** Не более `limit` попыток за `windowSec` секунд с одного IP (или по ключу `who`) */
export const rateLimit = async (req: Request, bucket: string, limit: number, windowSec = 60, who?: string) => {
  const ip = who || (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `dn:rl:${bucket}:${ip}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const n = await cmd<number>('INCR', key);
  if (n === 1) await cmd('EXPIRE', key, windowSec * 2);
  if (n > limit) throw new HttpError('too_many_attempts', 429, 'Слишком много попыток, подождите немного');
};
