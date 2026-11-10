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
const pick = (reads: Record<string, number> = {}) => pickTopStories(pool, reads, rub, NOW);

describe('«Главное» на главной', () => {
  it('три разные публикации из разных рубрик', () => {
    assert.ok(pool.length >= 3, 'на сайте достаточно актуальных материалов');
    const top = pick();
    assert.equal(top.length, 3);
    assert.equal(new Set(top.map((a) => a.id)).size, 3, 'без повторов');
    assert.equal(new Set(top.map(rub)).size, 3, 'разные рубрики');
  });

  it('порядок постоянный — не меняется при обновлении страницы', () => {
    assert.deepEqual(pick().map((a) => a.id), pick().map((a) => a.id));
  });

  it('закреплённое редакцией — первым, пока не истёк срок', () => {
    const last = pool[pool.length - 1];
    const pinned = { ...last, featuredUntil: '2026-10-28T12:00' };
    const top = pickTopStories(pool.map((a) => (a.id === last.id ? pinned : a)), {}, rub, NOW);
    assert.equal(top[0].id, last.id);
    const expired = { ...last, featuredUntil: '2026-10-26T12:00' };
    assert.notEqual(pickTopStories(pool.map((a) => (a.id === last.id ? expired : a)), {}, rub, NOW)[0].id, last.id);
  });

  it('часто читаемое поднимается выше', () => {
    const outsider = pool.find((a) => !pick().some((t) => t.id === a.id) && !pick().some((t) => rub(t) === rub(a)))!;
    if (outsider) assert.ok(pick({ [outsider.id]: 50 }).some((a) => a.id === outsider.id));
  });

  it('срочное остаётся наверху; мало материалов — показываем доступные', () => {
    const urgent = { ...pool[5], id: 'urgent-x', isUrgentTicker: true };
    assert.equal(pickTopStories([...pool, urgent], {}, rub, NOW)[0].id, 'urgent-x');
    assert.equal(pickTopStories(pool.slice(0, 2), {}, rub, NOW).length, 2);
    assert.deepEqual(pickTopStories([], {}, rub, NOW), []);
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
