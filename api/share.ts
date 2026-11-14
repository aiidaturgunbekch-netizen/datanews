/**
 * /n/<id> (через vercel.json → /api/share?id=<id>) — постоянный адрес новости.
 * Отдаёт страницу сайта, в которой уже есть заголовок, описание, текст новости и разметка schema.org:
 * её индексируют поисковики, мессенджеры показывают превью, а сайт открывает статью по этому же адресу.
 * Работает и без подключённой базы — на встроенных публикациях.
 */
import type { Language } from '../src/types';
import { esc, injectArticle, loadForPages, standalonePage } from './_lib/articlePage';

export const config = { runtime: 'edge' };

const html = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });

/** Оболочка сайта (index.html текущей сборки); cookie передаём, чтобы её отдал и защищённый Preview */
const loadShell = async (req: Request, origin: string) => {
  try {
    const cookie = req.headers.get('cookie');
    const r = await fetch(`${origin}/index.html`, { headers: cookie ? { cookie } : {} });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
};

export default async function share(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').replace(/[^\w-]/g, '');
  const langParam = url.searchParams.get('lang');
  const lang: Language = langParam === 'kg' || langParam === 'en' ? langParam : 'ru';
  const origin = `${url.protocol}//${url.host}`;

  const a = (await loadForPages()).find((x) => x.id === id);
  if (!a) {
    // Новости нет (снята с публикации или неверная ссылка) — на главную, без индексации
    return html(
      `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>DataNews Кыргызстан</title><meta http-equiv="refresh" content="0; url=${esc(origin)}/"></head><body><p><a href="${esc(origin)}/">DataNews Кыргызстан</a></p></body></html>`,
      404
    );
  }

  const shell = await loadShell(req, origin);
  const page = shell ? injectArticle(shell, a, lang, origin) : null;
  return html(page || standalonePage(a, lang, origin), 200);
}
