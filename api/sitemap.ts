/** /sitemap.xml (через vercel.json) — главная и страница каждой опубликованной новости */
import { handler } from './_lib/http';
import { loadPublished } from './_lib/assistant';

export const config = { runtime: 'edge' };

export default handler(async (req) => {
  const u = new URL(req.url);
  const origin = `${u.protocol}//${u.host}`;
  const items = await loadPublished();
  const urls = [
    `<url><loc>${origin}/</loc><changefreq>hourly</changefreq></url>`,
    ...items.map((a) => `<url><loc>${origin}/n/${a.id}</loc><lastmod>${(a.updatedAt || a.publishedAt || '').slice(0, 10)}</lastmod></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  });
});
