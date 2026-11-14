/**
 * Web Push без сторонних сервисов: подпись VAPID (ES256) средствами WebCrypto.
 * Уведомление отправляется без содержимого — service worker сам забирает текст с /api/push?last=1,
 * поэтому шифрование содержимого (RFC 8291) не нужно.
 *
 * Ключи: VAPID_PUBLIC_KEY (65 байт, base64url) и VAPID_PRIVATE_KEY (32 байта «d», base64url) —
 * создаются в панели администратора прямо в браузере и вносятся в переменные окружения Vercel.
 */
import { env } from './env';

const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const toB64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const vapidPublicKey = () => {
  const k = env('VAPID_PUBLIC_KEY')?.trim();
  return k && fromB64url(k).length === 65 ? k : null;
};
export const isPushConfigured = () => Boolean(vapidPublicKey() && env('VAPID_PRIVATE_KEY')?.trim());

let keyPromise: Promise<CryptoKey> | null = null;
const signingKey = () => {
  if (!keyPromise) {
    const pub = fromB64url(vapidPublicKey()!);
    const jwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      x: toB64url(pub.slice(1, 33)),
      y: toB64url(pub.slice(33, 65)),
      d: env('VAPID_PRIVATE_KEY')!.trim(),
      ext: true,
    };
    keyPromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  }
  return keyPromise;
};

/** JWT для сервиса доставки (aud — его адрес), действует 12 часов */
const vapidJwt = async (endpoint: string, subject: string) => {
  const enc = new TextEncoder();
  const head = toB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = toB64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(), enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${toB64url(sig)}`;
};

export type PushResult = 'ok' | 'gone' | 'failed';
/** Результат одной отправки: code — HTTP-код сервиса доставки или 'network' (без адресов и содержимого) */
export interface PushOutcome {
  result: PushResult;
  code?: string;
}

/** Один сигнал подписчику. 404/410 — подписка больше не действует, её нужно удалить */
export const sendPush = async (endpoint: string, subject: string): Promise<PushOutcome> => {
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${await vapidJwt(endpoint, subject)}, k=${vapidPublicKey()}`,
        TTL: String(24 * 3600),
        Urgency: 'high',
        'Content-Length': '0',
      },
    });
    if (r.status === 404 || r.status === 410) return { result: 'gone', code: String(r.status) };
    if (!r.ok) console.error('[push]', r.status, await r.text().catch(() => ''));
    return r.ok ? { result: 'ok' } : { result: 'failed', code: String(r.status) };
  } catch (e) {
    console.error('[push]', e);
    return { result: 'failed', code: 'network' };
  }
};

/** Адрес сервиса доставки — только известные push-сервисы браузеров (защита от отправки запросов на произвольные адреса) */
export const isPushEndpoint = (s: string) => {
  try {
    const u = new URL(s);
    return (
      u.protocol === 'https:' &&
      /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com|push\.apple\.com)$/.test(u.hostname)
    );
  } catch {
    return false;
  }
};
