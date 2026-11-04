// Галерея публикации: только безопасные ссылки, не больше 8; при правке без поля галерея сохраняется
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
const { sanitize, GALLERY_MAX } = await import('../api/_lib/announcements');

const base = { title: { ru: 'Т', kg: '', en: '' }, description: { ru: 'Д', kg: '', en: '' }, category: 'sport', startDate: '2026-11-20T10:00' };

describe('галерея', () => {
  it('ссылки /api/image и https, не больше 8, без опасных и повторов', async () => {
    const urls = Array.from({ length: 10 }, (_, i) => `/api/image?id=img-${i}`);
    const a = await sanitize({ ...base, gallery: ['javascript:alert(1)', urls[0], urls[0], ...urls, 'https://example.kg/p.jpg'] });
    assert.equal(a.gallery?.length, GALLERY_MAX);
    assert.equal(a.gallery?.[0], '/api/image?id=img-0');
    assert.ok(!a.gallery?.some((u) => u.startsWith('javascript')));
  });

  it('правка без поля gallery сохраняет прежнюю галерею; пустой список — удаляет', async () => {
    const prev = await sanitize({ ...base, gallery: ['/api/image?id=img-a'] });
    const kept = await sanitize({ ...base }, prev);
    assert.deepEqual(kept.gallery, ['/api/image?id=img-a']);
    const cleared = await sanitize({ ...base, gallery: [] }, prev);
    assert.deepEqual(cleared.gallery, []);
  });
});
