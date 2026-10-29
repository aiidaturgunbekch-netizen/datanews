/**
 * Временная логика главной и рекламные места: «Сегодня/Завтра/Через N дней» по времени Бишкека,
 * группы ближайших дат, порядок важности (не по одной категории). Реклама — tests/ads.test.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bucketOf, homeScore, relativeDay } from '../src/utils/timeline';
import type { Announcement } from '../src/types';

// 27 октября 2026, 12:00 по Бишкеку (06:00 UTC)
const NOW = Date.parse('2026-10-27T06:00:00Z');
const base = (over: Partial<Announcement>): Announcement =>
  ({
    id: 'x', protocolCode: '#', title: { ru: 'Т', kg: 'Т', en: 'T' }, summary: { ru: '', kg: '', en: '' }, description: { ru: '', kg: '', en: '' },
    category: 'concerts', city: 'bishkek', location: { ru: '', kg: '', en: '' }, startDate: '2026-10-27T18:00', endDate: '', urgency: 'event', status: 'scheduled',
    sourceName: '', sourceOrgType: '', isVerified: false, publishedAt: '2026-10-20T10:00', updatedAt: '2026-10-20T10:00', ...over,
  }) as Announcement;

describe('подписи дней по времени Кыргызстана', () => {
  it('сегодня, завтра, через N дней — на трёх языках; дальше недели и прошедшее — без подписи', () => {
    assert.equal(relativeDay(base({ startDate: '2026-10-27T18:00' }), 'ru', NOW), 'Сегодня');
    assert.equal(relativeDay(base({ startDate: '2026-10-28T10:00' }), 'ru', NOW), 'Завтра');
    assert.equal(relativeDay(base({ startDate: '2026-10-28T10:00' }), 'kg', NOW), 'Эртең');
    assert.equal(relativeDay(base({ startDate: '2026-10-30T10:00' }), 'ru', NOW), 'Через 3 дня');
    assert.equal(relativeDay(base({ startDate: '2026-11-01T10:00' }), 'ru', NOW), 'Через 5 дней');
    assert.equal(relativeDay(base({ startDate: '2026-10-30T10:00' }), 'en', NOW), 'In 3 days');
    assert.equal(relativeDay(base({ startDate: '2026-11-20T10:00' }), 'ru', NOW), null);
    assert.equal(relativeDay(base({ startDate: '2026-10-20T10:00' }), 'ru', NOW), null, 'прошло — не «сегодня»');
    assert.equal(relativeDay(base({ startDate: '2026-10-25T10:00', endDate: '2026-10-29T18:00' }), 'ru', NOW), 'Идёт сейчас');
  });

  it('полночь по Бишкеку: в 23:30 UTC 27-го уже 28-е — «сегодня» для события 28-го', () => {
    const late = Date.parse('2026-10-27T18:30:00Z'); // 00:30 28 октября в Бишкеке
    assert.equal(relativeDay(base({ startDate: '2026-10-28T10:00' }), 'ru', late), 'Сегодня');
  });

  it('группы ближайших дат', () => {
    assert.equal(bucketOf(base({ startDate: '2026-10-27T18:00' }), NOW), 'today');
    assert.equal(bucketOf(base({ startDate: '2026-10-28T18:00' }), NOW), 'tomorrow');
    assert.equal(bucketOf(base({ startDate: '2026-10-30T18:00' }), NOW), 'soon');
    assert.equal(bucketOf(base({ startDate: '2026-11-02T18:00' }), NOW), 'week');
    assert.equal(bucketOf(base({ startDate: '2026-11-20T18:00' }), NOW), 'later');
    assert.equal(bucketOf(base({ startDate: '2027-01-20T18:00' }), NOW), null);
    assert.equal(bucketOf(base({ startDate: '2026-10-20T18:00' }), NOW), null);
  });
});

describe('важность на главной — не по одной категории', () => {
  it('старое решение госоргана не выше сегодняшнего события', () => {
    const oldGov = base({ category: 'state', startDate: '2026-09-01T10:00', publishedAt: '2026-09-01T10:00' });
    const todayEvent = base({ category: 'concerts', startDate: '2026-10-27T19:00', publishedAt: '2026-10-25T10:00' });
    assert.ok(homeScore(todayEvent, NOW) > homeScore(oldGov, NOW));
  });

  it('срочная строка и свежая значимая новость поднимаются', () => {
    const urgent = base({ isUrgentTicker: true, startDate: '2026-11-10T10:00' });
    const near = base({ startDate: '2026-10-28T10:00' });
    assert.ok(homeScore(urgent, NOW) > homeScore(near, NOW));
    const freshNews = base({ category: 'news', startDate: '2026-10-27T09:00', publishedAt: '2026-10-27T09:00' });
    const farEvent = base({ category: 'sport', startDate: '2026-11-25T10:00', publishedAt: '2026-10-01T10:00' });
    assert.ok(homeScore(freshNews, NOW) > homeScore(farEvent, NOW));
  });
});
