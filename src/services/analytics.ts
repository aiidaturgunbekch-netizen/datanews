/**
 * Анонимный счётчик посещений: случайный идентификатор браузера + раздел сайта.
 * Личные данные не собираются; админ видит только агрегированные цифры.
 */
const VISITOR_KEY = 'datanews_kg_visitor_v1';

const visitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9-]/gi, '');
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
};

let firstHit = true;

export const trackView = (path: string, lang: string) => {
  const body = JSON.stringify({
    path,
    lang,
    visitorId: visitorId(),
    // внешний источник считаем только для первого просмотра за визит
    referrer: firstHit ? document.referrer : '',
  });
  firstHit = false;
  fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
    () => {}
  );
};
