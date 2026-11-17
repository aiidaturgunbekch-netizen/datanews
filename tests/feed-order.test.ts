/** Порядок ленты «Афиша, новости и объявления» и выбор «Главного» */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshOrder } from '../src/utils/statusUtils';
import { pickTopStories } from '../src/utils/timeline';
import type { Announcement } from '../src/types';

const now = new Date('2026-11-17T09:00:00Z'); // 15:00 в Бишкеке
const ann = (id: string, startDate: string, publishedAt: string, extra: Partial<Announcement> = {}) =>
  ({ id, startDate, publishedAt, category: 'tech', city: 'all', status: 'active', title: { ru: id, kg: id, en: id } } as unknown as Announcement);

describe('порядок ленты', () => {
  it('новости — по дате от свежей к старой: 17, 16, 13, 12, 10 ноября; в один день — позже опубликованное выше', () => {
    const list = [
      ann('d12', '2026-11-12T00:00', '2026-11-12T10:00'),
      ann('d16', '2026-11-16T00:00', '2026-11-16T10:00'),
      ann('d10', '2026-11-10T00:00', '2026-11-17T08:00'), // добавлена сегодня, но дата новости — 10 ноября
      ann('d13', '2026-11-13T00:00', '2026-11-13T10:00'),
      ann('d17a', '2026-11-17T00:00', '2026-11-17T07:00'),
      ann('d17b', '2026-11-17T00:00', '2026-11-17T12:00'),
    ];
    assert.deepEqual(
      [...list].sort((a, b) => freshOrder(a, b, now)).map((a) => a.id),
      ['d17b', 'd17a', 'd16', 'd13', 'd12', 'd10']
    );
  });

  it('предстоящие события — после новостей, ближайшее первым', () => {
    const list = [ann('fut21', '2026-11-21T10:00', '2026-11-15T10:00'), ann('news', '2026-11-15T00:00', '2026-11-15T10:00'), ann('fut19', '2026-11-19T10:00', '2026-11-16T10:00')];
    assert.deepEqual([...list].sort((a, b) => freshOrder(a, b, now)).map((a) => a.id), ['news', 'fut19', 'fut21']);
  });
});

describe('«Главное»', () => {
  it('длинное событие, идущее неделю, не вытесняет свежие новости сегодняшнего дня', () => {
    const long = { ...ann('long', '2026-11-09T00:00', '2026-11-09T10:00'), endDate: '2027-01-12T00:00', category: 'state' } as Announcement;
    const fresh1 = { ...ann('fresh1', '2026-11-17T00:00', '2026-11-17T08:00'), category: 'sport' } as Announcement;
    const fresh2 = { ...ann('fresh2', '2026-11-17T00:00', '2026-11-17T09:00'), category: 'tech' } as Announcement;
    const fresh3 = { ...ann('fresh3', '2026-11-16T00:00', '2026-11-16T12:00'), category: 'business' } as Announcement;
    const top = pickTopStories([long, fresh1, fresh2, fresh3], {}, (a) => a.category, now.getTime());
    assert.ok(!top.some((a) => a.id === 'long'), top.map((a) => a.id).join(','));
  });
});
