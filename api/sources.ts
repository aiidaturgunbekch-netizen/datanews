/**
 * /api/sources — реестр источников: ведомство, официальный URL, тип, автоматический ли сбор,
 * способ получения, частота, последнее успешное обновление и ошибка (для автоматических).
 */
import { handler, json } from './_lib/http';
import { getStatuses, SOURCES } from './_lib/sources';

export const config = { runtime: 'edge' };

export default handler(async () => {
  const statuses = await getStatuses();
  return json({ sources: SOURCES.map((s) => ({ ...s, status: statuses[s.id] || null })) }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=60' });
});
