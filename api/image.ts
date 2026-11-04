/**
 * /api/image?id=…            GET  — отдаёт загруженные фото событий
 * /api/image  { data }       POST — загрузить одно фото (только администратор), ответ { url } —
 *                                   так фото галереи отправляются по одному, а не одним большим запросом
 */
import { cmd } from './_lib/kv';
import { handler, HttpError, json, readBody, requireAdmin } from './_lib/http';
import { IMG_KEY, storeImage } from './_lib/announcements';

export const config = { runtime: 'edge' };

export default handler(async (req) => {
  if (req.method === 'POST') {
    await requireAdmin(req);
    const body = await readBody<{ data?: unknown }>(req, 1_000_000);
    if (typeof body.data !== 'string') throw new HttpError('bad_image', 400, 'Нет фото');
    return json({ url: await storeImage(body.data) });
  }
  if (req.method !== 'GET') throw new HttpError('method_not_allowed', 405);
  const id = new URL(req.url).searchParams.get('id') || '';
  const dataUrl = id ? await cmd<string | null>('HGET', IMG_KEY, id) : null;
  if (!dataUrl) throw new HttpError('not_found', 404);
  const [, mime, b64] = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl) || [];
  if (!mime) throw new HttpError('not_found', 404);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
});
