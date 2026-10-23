/**
 * Подписка браузера на push-уведомления о срочных предупреждениях.
 * Service worker регистрируется только по нажатию кнопки, не при загрузке сайта.
 */
import type { CityId, Language } from '../types';

const SW_URL = '/sw.js';
const CITY_KEY = 'datanews_push_city';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

const toBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Публичный ключ сервера; null — уведомления на сервере ещё не настроены */
export const serverKey = async (): Promise<string | null> => {
  try {
    const r = await fetch('/api/push');
    const d = (await r.json()) as { publicKey?: string | null };
    return r.ok && d.publicKey ? d.publicKey : null;
  } catch {
    return null;
  }
};

/** Текущая подписка этого браузера и её город */
export const currentSubscription = async () => {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  let city: string | null = null;
  try {
    city = localStorage.getItem(CITY_KEY);
  } catch {
    /* хранилище недоступно — город просто не покажем */
  }
  return { sub, city };
};

export const subscribe = async (publicKey: string, city: CityId | 'all', lang: Language) => {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed');
  const reg = await navigator.serviceWorker.register(`${SW_URL}?lang=${lang}`);
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) }));
  const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), city }) });
  if (!r.ok) {
    await sub.unsubscribe().catch(() => {});
    throw new Error('server');
  }
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    /* не критично */
  }
};

export const unsubscribe = async () => {
  const cur = await currentSubscription();
  if (!cur) return;
  await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: cur.sub.endpoint }) }).catch(() => {});
  await cur.sub.unsubscribe();
  try {
    localStorage.removeItem(CITY_KEY);
  } catch {
    /* не критично */
  }
};
