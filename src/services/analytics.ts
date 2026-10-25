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

const READS_KEY = 'datanews_reads_v1';
/**
 * Прочтение публикации (открыта карточка) — для блока «Самое читаемое».
 * Один раз в день на браузер для каждой публикации, чтобы обновления страницы не накручивали счётчик.
 */
export const trackRead = (annId: string) => {
  const day = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
  try {
    const seen = JSON.parse(localStorage.getItem(READS_KEY) || '{}') as Record<string, string>;
    if (seen[annId] === day) return;
    // храним только сегодняшние отметки
    const next = Object.fromEntries(Object.entries(seen).filter(([, d]) => d === day));
    next[annId] = day;
    localStorage.setItem(READS_KEY, JSON.stringify(next));
  } catch {
    /* без хранилища считаем каждое открытие */
  }
  fetch('/api/track', { method: 'POST', body: JSON.stringify({ annId }), keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
    () => {}
  );
};

/** Самые читаемые публикации за неделю: id → число прочтений */
export const fetchPopular = async (): Promise<Record<string, number>> => {
  try {
    const r = await fetch('/api/track?popular=1');
    const d = (await r.json()) as { items?: { id: string; reads: number }[] };
    return Object.fromEntries((d.items || []).map((x) => [x.id, x.reads]));
  } catch {
    return {};
  }
};

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
