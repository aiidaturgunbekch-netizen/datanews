/** Актуальное и архив: что не истекло — всегда в актуальном, старое — в архиве */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Announcement } from '../src/types';
import { isFresh } from '../src/utils/statusUtils';

const NOW = new Date('2026-10-25T12:00:00+06:00');
const base = { id: 't', title: { ru: 'Т', kg: 'Т', en: 'T' }, status: 'scheduled', urgency: 'event' } as unknown as Announcement;
const at = (p: Partial<Announcement>) => isFresh({ ...base, ...p } as Announcement, NOW);

describe('isFresh', () => {
  it('событие, которое ещё не закончилось, — актуально', () => {
    assert.equal(at({ category: 'concerts', startDate: '2026-11-08T19:00' }), true);
    assert.equal(at({ category: 'fairs', startDate: '2026-10-23T09:00', endDate: '2026-10-26T18:00' }), true);
  });
  it('прошедшее событие — в архиве', () => {
    assert.equal(at({ category: 'concerts', startDate: '2026-10-10T19:00' }), false);
  });
  it('госрешение со сроком в будущем остаётся актуальным и через неделю после публикации', () => {
    assert.equal(at({ category: 'state', startDate: '2026-10-01T09:00', endDate: '2026-11-13T18:00', publishedAt: '2026-10-01T09:00' }), true);
  });
  it('госрешение с датой события впереди — актуально', () => {
    assert.equal(at({ category: 'gov', startDate: '2026-11-07T00:00', publishedAt: '2026-10-01T09:00' }), true);
  });
  it('старая новость без срока — в архиве через 7 дней после публикации', () => {
    assert.equal(at({ category: 'state', startDate: '2026-10-05T09:00', publishedAt: '2026-10-05T09:00' }), false);
    assert.equal(at({ category: 'state', startDate: '2026-10-22T09:00', publishedAt: '2026-10-22T09:00' }), true);
  });
  it('закон, который ещё не вступил в силу, — актуален', () => {
    assert.equal(at({ category: 'laws', startDate: '2026-09-01T00:00', publishedAt: '2026-09-01T00:00', legal: { effectiveFrom: '2027-01-01' } }), true);
  });
  it('отменённое — не актуально', () => {
    assert.equal(at({ category: 'concerts', startDate: '2026-11-08T19:00', status: 'cancelled' }), false);
  });
});
