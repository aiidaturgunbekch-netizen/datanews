/* DataNews — service worker только для push-уведомлений о срочных предупреждениях.
   Сигнал приходит без содержимого; текст берём с сайта (/api/push?last=1). Страницы не кэшируются. */
const LANG = new URL(self.location.href).searchParams.get('lang') || 'ru';
const FALLBACK = {
  ru: { title: 'DataNews: срочное предупреждение', body: 'Откройте сайт, чтобы прочитать подробности' },
  kg: { title: 'DataNews: шашылыш эскертүү', body: 'Толук маалымат үчүн сайтты ачыңыз' },
  en: { title: 'DataNews: urgent warning', body: 'Open the site for details' },
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let m = null;
      try {
        const r = await fetch('/api/push?last=1', { cache: 'no-store' });
        m = (await r.json()).message;
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
