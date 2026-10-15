/**
 * /n/<id> (через vercel.json → /api/share?id=<id>) — короткая ссылка на публикацию.
 * Отдаёт HTML с Open Graph: WhatsApp, Telegram и соцсети показывают заголовок, описание и фото,
 * а человека сразу переводит на сайт с открытой карточкой (/#/n/<id>).
 */
import type { Announcement } from '../src/types';
import { handler } from './_lib/http';
import { loadPublished } from './_lib/assistant';

export const config = { runtime: 'edge' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default handler(async (req) => {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').replace(/[^\w-]/g, '');
  const origin = `${url.protocol}//${url.host}`;
  const all = await loadPublished();
  const a: Announcement | undefined = all.find((x) => x.id === id);
  const target = a ? `${origin}/#/n/${a.id}` : `${origin}/`;
  const title = a ? `${a.title.ru} — DataNews Kyrgyzstan` : 'DataNews Кыргызстан';
  const desc = a ? a.summary.ru : 'Предупреждения, погода, государственные решения и события по всему Кыргызстану';
  // SVG-иллюстрации мессенджеры не показывают — для них общая картинка сайта
  let image = a?.imageUrl && !a.imageUrl.endsWith('.svg') ? a.imageUrl : '/og-default.png';
  if (image.startsWith('/')) image = origin + image;
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DataNews Kyrgyzstan">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(`${origin}/n/${id}`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(`${origin}/n/${id}`)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
</head><body><p><a href="${esc(target)}">${esc(title)}</a></p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html, {
    status: a ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });
});
