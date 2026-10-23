/** /api/image?id=… — отдаёт загруженные пользователями фото событий */
import { cmd } from './_lib/kv';
import { handler, HttpError } from './_lib/http';
import { IMG_KEY } from './_lib/announcements';

export const config = { runtime: 'edge' };

export default handler(async (req) => {
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
