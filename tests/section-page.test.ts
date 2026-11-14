/** Страницы разделов /r/<рубрика> для поиска: текст и ссылки на материалы прямо в HTML */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const { injectSection, sectionItems, standaloneSection } = await import('../api/_lib/sectionPage');
const { loadForPages } = await import('../api/_lib/articlePage');
const { RUBRICS, rubricOf } = await import('../src/config/rubrics');
const { default: share } = await import('../api/share');
const { default: sitemap } = await import('../api/sitemap');

const ORIGIN = 'https://datanews.example';
const SHELL = `<!doctype html>
<html lang="ru" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <title>DataNews Кыргызстан — Что, где и когда в Кыргызстане</title>
    <meta name="description" content="Общее описание" />
    <meta property="og:title" content="Общий заголовок" />
    <script type="module" src="/assets/index-abc.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

test('страница «Погода»: свой title, описание, канонический адрес и ссылки на материалы раздела', async () => {
  const r = rubricOf('weather')!;
  const all = await loadForPages();
  const page = injectSection(SHELL, r, all, 'ru', ORIGIN)!;
  assert.ok(page);
  assert.equal((page.match(/<title>/g) || []).length, 1);
  assert.match(page, /<title>Погода в Кыргызстане/);
  assert.ok(page.includes(`<link rel="canonical" href="${ORIGIN}/r/weather" />`));
  assert.ok(!page.includes('Общее описание') && !page.includes('Общий заголовок'));
  assert.match(page, /<div id="root"><main/);
  assert.ok(page.includes('/assets/index-abc.js'), 'скрипты сайта остаются');
  for (const a of sectionItems(r, all)) assert.ok(page.includes(`/n/${a.id}`), a.id);
  assert.ok(sectionItems(r, all).every((a) => r.categories.includes(a.category)), 'только материалы раздела');
  assert.ok(page.includes('href="/r/utilities"'), 'ссылки на другие разделы');
});

test('у каждой рубрики есть заголовок для поиска и страница на кыргызском', async () => {
  const all = await loadForPages();
  for (const r of RUBRICS) {
    const page = injectSection(SHELL, r, all, 'kg', ORIGIN)!;
    assert.match(page, /<html lang="ky"/);
    assert.ok(page.includes(`href="${ORIGIN}/r/${r.id}?lang=kg"`), r.id);
  }
});

test('текст из материалов экранируется', () => {
  const r = rubricOf('roads')!;
  const evil = { id: 'x1', category: 'roads', city: 'bishkek', publishedAt: '2026-11-14T10:00', title: { ru: '<script>alert(1)</script>' }, summary: { ru: '"x"' } } as never;
  const page = standaloneSection(r, [evil], 'ru', ORIGIN);
  assert.ok(!page.includes('<script>alert(1)</script>'));
  assert.ok(page.includes('&lt;script&gt;'));
});

test('/api/share?rubric=…: страница раздела; неизвестный раздел — на главную', async () => {
  const ok = await share(new Request(`${ORIGIN}/api/share?rubric=utilities`));
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Отключения воды и света/);
  const bad = await share(new Request(`${ORIGIN}/api/share?rubric=nope`));
  assert.equal(bad.status, 302);
});

test('карта сайта содержит страницы разделов', async () => {
  const xml = await (await sitemap(new Request(`${ORIGIN}/sitemap.xml`))).text();
  for (const r of RUBRICS) assert.ok(xml.includes(`<loc>${ORIGIN}/r/${r.id}</loc>`), r.id);
});
