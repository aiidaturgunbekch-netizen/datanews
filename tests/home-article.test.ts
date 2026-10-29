/**
 * Главная и страница новости: три материала «Главного» из разных рубрик с обновлением состава между посещениями,
 * «Актуальные новости» рядом со статьёй, порядок меню, кнопки «Поделиться новостью».
 * Данные — настоящие встроенные публикации сайта.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { INITIAL_ANNOUNCEMENTS: A } = await import('../src/data/initialAnnouncements');
const { pickTopStories, pickSideNews, homeScore } = await import('../src/utils/timeline');
const { isFresh } = await import('../src/utils/statusUtils');
const { isAlert } = await import('../src/utils/urgency');
const { NAV_RUBRICS, rubricIdOf } = await import('../src/config/rubrics');
const { ShareMenu } = await import('../src/components/ShareMenu');

const NOW = Date.parse('2026-10-27T06:00:00Z'); // 27 октября, 12:00 по Бишкеку
const pool = A.filter((a) => !isAlert(a) && isFresh(a, new Date(NOW)));
const rub = (a: { category: any }) => rubricIdOf(a.category);
const pick = (seed: number) => pickTopStories(pool, seed, rub, NOW);

describe('«Главное» на главной', () => {
  it('три разные публикации из разных рубрик', () => {
    assert.ok(pool.length >= 3, 'на сайте достаточно актуальных материалов');
    for (const seed of [1, 2, 3, 42, 777]) {
      const top = pick(seed);
      assert.equal(top.length, 3);
      assert.equal(new Set(top.map((a) => a.id)).size, 3, 'без повторов');
      assert.equal(new Set(top.map(rub)).size, 3, 'разные рубрики');
    }
  });

  it('в пределах одного посещения состав постоянный, между посещениями может меняться', () => {
    assert.deepEqual(pick(12345).map((a) => a.id), pick(12345).map((a) => a.id));
    const variants = new Set(Array.from({ length: 40 }, (_, i) => pick(i + 1).map((a) => a.id).join()));
    assert.ok(variants.size > 1, `разных составов: ${variants.size}`);
    const leads = new Set(Array.from({ length: 40 }, (_, i) => pick(i + 1)[0].id));
    assert.ok(leads.size > 1, 'первое место не закреплено за одной публикацией');
  });

  it('в ротацию идут только сильные кандидаты, не любые публикации', () => {
    const best = Math.max(...pool.map((a) => homeScore(a, NOW)).filter((s) => s < 100));
    for (let i = 1; i <= 40; i++) {
      // первое место — всегда из сильных кандидатов (не ниже 40% лучшей оценки)
      assert.ok(homeScore(pick(i)[0], NOW) >= best * 0.4);
    }
  });

  it('срочное остаётся наверху; мало материалов — показываем доступные', () => {
    const urgent = { ...pool[5], id: 'urgent-x', isUrgentTicker: true };
    for (const seed of [1, 2, 3]) assert.equal(pickTopStories([...pool, urgent], seed, rub, NOW)[0].id, 'urgent-x');
    assert.equal(pickTopStories(pool.slice(0, 2), 1, rub, NOW).length, 2);
    assert.deepEqual(pickTopStories([], 1, rub, NOW), []);
  });
});

describe('«Актуальные новости» рядом со статьёй', () => {
  it('без текущей публикации и без повторов, только актуальные, разные рубрики', () => {
    const current = pool[0];
    const side = pickSideNews([...A, ...A], new Set([current.id]), rub, NOW);
    assert.ok(side.length > 0 && side.length <= 5);
    assert.ok(!side.some((a) => a.id === current.id));
    assert.equal(new Set(side.map((a) => a.id)).size, side.length);
    assert.ok(side.every((a) => isFresh(a, new Date(NOW))));
    assert.equal(new Set(side.map(rub)).size, side.length);
  });
});

describe('меню', () => {
  it('«ИИ и IT-технологии» сразу после «Государства»', () => {
    const ids = NAV_RUBRICS.map((r) => r.id);
    assert.equal(ids.indexOf('tech'), ids.indexOf('state') + 1);
  });
});

describe('«Поделиться новостью»', () => {
  it('каждая кнопка передаёт ссылку на эту публикацию и заголовок; есть копирование; без номеров телефонов', () => {
    const url = 'https://datanews.kg/n/ann-test-1';
    const h = renderToStaticMarkup(React.createElement(ShareMenu, { url, title: 'Заголовок новости', lang: 'ru' }));
    const enc = encodeURIComponent(url);
    for (const start of ['https://wa.me/?text=', 'https://t.me/share/url?url=', 'https://www.facebook.com/sharer/sharer.php?u=', 'https://x.com/intent/post?url=', 'https://www.threads.net/intent/post?text=']) {
      const m = h.match(new RegExp(`href="(${start.replace(/[.?/]/g, '\\$&')}[^"]+)"`));
      assert.ok(m, start);
      assert.ok(m![1].replace(/&amp;/g, '&').includes(enc), `${start} — ссылка на публикацию`);
    }
    assert.ok(h.includes(encodeURIComponent('Заголовок новости')));
    assert.ok(h.includes('Скопировать ссылку'));
    for (const n of ['WhatsApp', 'Telegram', 'Facebook', 'X', 'Threads']) assert.ok(h.includes(`aria-label="${n}"`), n);
    assert.ok(!/\+996|wa\.me\/996/.test(h));
  });
});
