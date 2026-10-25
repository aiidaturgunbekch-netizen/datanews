import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';
import { articleHtml, injectArticle, jsonLd, loadForPages, toIsoKg } from '../api/_lib/articlePage';
import type { Announcement } from '../src/types';

const ORIGIN = 'https://datanews.example';
const SHELL = `<!doctype html>
<html lang="ru" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <title>DataNews Кыргызстан — Что, где и когда в Кыргызстане</title>
    <meta name="description" content="Общее описание" />
    <meta property="og:title" content="Общий заголовок" />
    <meta property="og:image" content="/og-default.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="module" src="/assets/index-abc.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

const sample = INITIAL_ANNOUNCEMENTS[0];

test('время публикации получает пояс Бишкека (+06:00)', () => {
  assert.equal(toIsoKg('2026-10-23T09:00'), '2026-10-23T09:00:00+06:00');
  assert.equal(toIsoKg('2026-10-23'), '2026-10-23T00:00:00+06:00');
  assert.equal(toIsoKg('2026-10-23T09:00:00Z'), '2026-10-23T09:00:00Z');
});

test('страница новости: свой заголовок, описание, канонический адрес и текст внутри #root', () => {
  const page = injectArticle(SHELL, sample, 'ru', ORIGIN)!;
  assert.ok(page);
  assert.equal((page.match(/<title>/g) || []).length, 1, 'один title');
  assert.ok(page.includes(`<link rel="canonical" href="${ORIGIN}/n/${sample.id}" />`));
  assert.ok(!page.includes('Общее описание') && !page.includes('Общий заголовок'), 'общие теги сайта убраны');
  assert.equal((page.match(/name="twitter:card"/g) || []).length, 1);
  assert.match(page, /<div id="root"><article/);
  assert.ok(page.includes('/assets/index-abc.js'), 'скрипты сайта остаются');
  assert.ok(page.includes('application/ld+json'));
});

test('текст экранируется: HTML из публикации не попадает в страницу как разметка', () => {
  const evil: Announcement = {
    ...sample,
    title: { ru: '<script>alert(1)</script> «Заголовок»', kg: '', en: '' },
    summary: { ru: 'Описание "в кавычках" </script>', kg: '', en: '' },
  };
  const html = articleHtml(evil, 'ru');
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  const ld = jsonLd(evil, 'ru', ORIGIN);
  assert.ok(!ld.includes('</script>'), 'JSON-LD не закрывает тег script');
  assert.equal(JSON.parse(ld).headline.startsWith('<script>'), true, 'после разбора JSON текст тот же');
});

test('оболочка без #root не используется (вернётся запасная страница)', () => {
  assert.equal(injectArticle('<html><head></head><body></body></html>', sample, 'ru', ORIGIN), null);
});

test('без подключённой базы страницы строятся на встроенных публикациях', async () => {
  const items = await loadForPages();
  assert.ok(items.some((a) => a.id === sample.id));
});
