/** Разметка названия сайта для Google и Яндекса: есть на главной и остаётся на страницах новостей и разделов */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { injectArticle } from '../api/_lib/articlePage';
import { injectSection } from '../api/_lib/sectionPage';
import { rubricOf } from '../src/config/rubrics';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';

const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const siteLd = (html: string) => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  return blocks.find((b) => Array.isArray(b['@graph']));
};

test('главная: WebSite и организация с вариантами названия', () => {
  const ld = siteLd(shell);
  assert.ok(ld);
  const site = ld['@graph'].find((x: { '@type': string }) => x['@type'] === 'WebSite');
  assert.equal(site.url, 'https://datanews.kg/');
  for (const n of ['DataNews KG', 'ДатаНьюс', 'Датаньюс КГ']) assert.ok(site.alternateName.includes(n), n);
});

test('разметка названия остаётся на страницах новости и раздела', () => {
  const art = injectArticle(shell, INITIAL_ANNOUNCEMENTS[0], 'ru', 'https://datanews.kg')!;
  const sec = injectSection(shell, rubricOf('weather')!, INITIAL_ANNOUNCEMENTS, 'ru', 'https://datanews.kg')!;
  assert.ok(siteLd(art) && siteLd(sec));
});
