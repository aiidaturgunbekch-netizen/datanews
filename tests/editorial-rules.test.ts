/** Редакционные правила: перевод перед одобрением, честные подписи источников, закрепление в «Главном» */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { missingKg } = await import('../src/utils/translation');
const { sourceTypeLabel, sourceKindOf } = await import('../src/utils/links');
const { isFeatured } = await import('../src/components/EditButton');

describe('перевод на кыргызский', () => {
  it('нет перевода — пустое поле или копия русского', () => {
    assert.deepEqual(missingKg({ title: { ru: 'Заголовок', kg: '' }, description: { ru: 'Текст', kg: 'Текст' } }), ['заголовок', 'текст']);
    assert.deepEqual(missingKg({ title: { ru: 'Заголовок', kg: 'Аталыш' }, description: { ru: 'Текст', kg: 'Текст кыргызча' } }), []);
  });
});

describe('подписи источников', () => {
  it('«Кабар» — госинформагентство, не официальный источник; билетный сервис — не организатор', () => {
    assert.equal(sourceTypeLabel('https://kabar.kg/news/x', 'ru'), 'Госинформагентство «Кабар»');
    assert.match(sourceTypeLabel('https://www.kassir.kg/e/1', 'ru') || '', /Билетный сервис kassir\.kg/);
    assert.equal(sourceTypeLabel('https://www.gov.kg/ru/post/1', 'ru'), null);
    assert.equal(sourceKindOf({ eventSourceUrl: 'https://kabar.kg/news/x', sourceKind: 'official' } as never), 'media');
    assert.equal(sourceKindOf({ eventSourceUrl: 'https://www.gov.kg/ru/post/1' } as never), 'official');
  });
});

describe('закрепление в «Главном»', () => {
  it('действует до указанного времени по Бишкеку', () => {
    const now = Date.parse('2026-11-10T06:00:00Z'); // 12:00 по Бишкеку
    assert.equal(isFeatured({ featuredUntil: '2026-11-10T13:00' } as never, now), true);
    assert.equal(isFeatured({ featuredUntil: '2026-11-10T11:00' } as never, now), false);
    assert.equal(isFeatured({} as never, now), false);
  });
});
