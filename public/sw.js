/* DataNews — service worker только для push-уведомлений.
   Сигнал приходит без содержимого; текст своего уведомления берём с сайта (/api/push?inbox=<id подписки>). Страницы не кэшируются. */
const LANG = new URL(self.location.href).searchParams.get('lang') || 'ru';
const FALLBACK = {
  ru: { title: 'DataNews', body: 'Откройте сайт, чтобы прочитать подробности' },
  kg: { title: 'DataNews', body: 'Толук маалымат үчүн сайтты ачыңыз' },
  en: { title: 'DataNews', body: 'Open the site for details' },
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let m = null;
      try {
        // Своё уведомление: по id подписки (хэш её адреса) — у каждого города и темы свой текст
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint)));
          const id = Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
          const r = await fetch('/api/push?inbox=' + id, { cache: 'no-store' });
          m = (await r.json()).message;
        }
        if (!m) {
          const r = await fetch('/api/push?last=1', { cache: 'no-store' });
          m = (await r.json()).message;
        }
      } catch (e) {
        // без сети — общий текст, но уведомление всё равно показываем
      }
      const pick = (v) => (v && (v[LANG] || v.ru)) || '';
      const fb = FALLBACK[LANG] || FALLBACK.ru;
      await self.registration.showNotification(pick(m && m.title) || fb.title, {
        body: pick(m && m.body) || fb.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: (m && m.id) || 'datanews',
        data: { url: (m && m.url) || '/' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          await w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
