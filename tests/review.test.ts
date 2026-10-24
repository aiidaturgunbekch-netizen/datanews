/** Правила списка «Сверка с источниками»: что считается причиной для сверки */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Announcement } from '../src/types';
import { reviewReasons } from '../src/utils/review';

const NOW = Date.parse('2026-10-25T12:00:00+06:00');
const base = {
  id: 'test-1',
  title: { ru: 'Тест', kg: 'Тест', en: 'Test' },
  category: 'concerts',
  city: 'bishkek',
  startDate: '2026-11-20T19:00',
  status: 'scheduled',
  isVerified: true,
  lastCheckedAt: '2026-10-25T10:00',
  eventSourceUrl: 'https://example.org/event',
} as unknown as Announcement;
const reasons = (patch: Partial<Announcement>) => reviewReasons({ ...base, ...patch } as Announcement, NOW);

describe('причины сверки', () => {
  it('подтверждено, свежая сверка, есть источник → сверять нечего', () => {
    assert.deepEqual(reasons({}), []);
  });
  it('давняя сверка', () => {
    assert.match(reasons({ lastCheckedAt: '2026-10-14T12:00' })[0], /Проверено давно/);
  });
  it('свежая дата сверки не снимает «Не подтверждено»', () => {
    assert.deepEqual(reasons({ isVerified: false }), ['Не подтверждено']);
  });
  it('публикация госоргана без предварительной модерации не помечается «Не подтверждено»', () => {
    assert.deepEqual(reasons({ isVerified: false, publishedByGov: true }), []);
  });
  it('нет ссылки на первоисточник', () => {
    assert.ok(reasons({ eventSourceUrl: undefined, sourceUrl: undefined }).includes('Нет ссылки на первоисточник'));
  });
  it('ссылка на билеты есть, но не проверена', () => {
    assert.ok(reasons({ ticketUrl: 'https://tickets.example/1', ticketUrlVerified: false }).includes('Ссылка на билеты не проверена'));
    assert.ok(!reasons({ ticketUrl: 'https://tickets.example/1', ticketUrlVerified: true }).includes('Ссылка на билеты не проверена'));
  });
  it('закон без ссылки на документ и даты вступления в силу', () => {
    const r = reasons({ category: 'laws' as Announcement['category'] });
    assert.ok(r.includes('Нет ссылки на документ') && r.includes('Нет даты вступления в силу'));
  });
  it('прошедшие, ожидающие модерации, отклонённые и снятые в список не попадают', () => {
    const stale = { isVerified: false, lastCheckedAt: undefined };
    assert.deepEqual(reasons({ ...stale, startDate: '2026-10-01T10:00', endDate: '2026-10-01T12:00' }), []);
    for (const moderationStatus of ['pending', 'rejected', 'withdrawn'] as const) assert.deepEqual(reasons({ ...stale, moderationStatus }), []);
  });
});
