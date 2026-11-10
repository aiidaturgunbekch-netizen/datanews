/** «Перенос публикаций»: из резервной копии переносится только одобренное, с прежними датами и фото, без дублей */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const { cmd, hgetJson } = await import('../api/_lib/kv');
const { ANN_KEY, IMG_KEY } = await import('../api/_lib/announcements');
const { transferPart } = await import('../api/_lib/transfer');
const { planTransfer, chunkEntries } = await import('../src/utils/transfer');

const IMG = 'data:image/jpeg;base64,' + 'A'.repeat(200);
const ann = (id: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id,
    title: { ru: `Новость ${id}`, kg: `Жаңылык ${id}` },
    description: { ru: 'Текст', kg: 'Текст кг' },
    category: 'news',
    city: 'bishkek',
    startDate: '2026-11-05',
    publishedAt: '2026-11-05T09:00',
    moderationStatus: 'approved',
    imageUrl: `/api/image?id=img-${id}-lq3x9`,
    ...extra,
  });

const backup = {
  format: 'datanews-backup',
  data: {
    'dn:ann': {
      a1: ann('a1'),
      a2: ann('a2', { moderationStatus: 'pending' }),
      a3: ann('a3', { testMaterial: true }),
      a4: ann('a4', { moderationStatus: 'rejected' }),
      a5: ann('a5', { imageUrl: '/api/image?id=img-nofile' }),
    },
    'dn:img': { 'img-a1-lq3x9': IMG, 'img-a2-lq3x9': IMG },
    'dn:ann:hidden': { 'ann-built-1': '1' },
    'dn:ann:checked': {},
    'dn:weather:official': '{"x":1}',
  },
};

describe('перенос публикаций', () => {
  it('план: только одобренные, нужные фото, предупреждение о недостающих фото', () => {
    const p = planTransfer(backup);
    assert.deepEqual(Object.keys(p.items).sort(), ['a1', 'a5']);
    assert.deepEqual(Object.keys(p.images), ['img-a1-lq3x9']);
    assert.equal(p.total, 5);
    assert.equal(p.excluded, 3);
    assert.equal(p.missingImages, 1);
    assert.throws(() => planTransfer({ format: 'other' }));
  });

  it('части не превышают лимит', () => {
    const parts = chunkEntries({ a: 'x'.repeat(60), b: 'y'.repeat(60), c: 'z'.repeat(60) }, 100);
    assert.equal(parts.length, 3);
  });

  it('сервер: сохраняет прежние даты, не перезаписывает существующее, отклоняет черновики', async () => {
    const p = planTransfer(backup);
    const img = await transferPart('images', p.images);
    assert.equal(img.added, 1);
    const r1 = await transferPart('items', { ...p.items, a2: backup.data['dn:ann'].a2 });
    assert.equal(r1.added, 2);
    assert.equal(r1.rejected, 1, 'черновик на модерации не переносится');
    const saved = await hgetJson<{ publishedAt: string; startDate: string }>(ANN_KEY, 'a1');
    assert.equal(saved?.publishedAt, '2026-11-05T09:00');
    assert.equal(saved?.startDate, '2026-11-05');
    assert.equal(await cmd('HGET', IMG_KEY, 'img-a1-lq3x9'), IMG);
    // повторный перенос — без дублей и без перезаписи
    const r2 = await transferPart('items', p.items);
    assert.equal(r2.added, 0);
    assert.equal(r2.skipped, 2);
    const w = await transferPart('weather', { official: '{"x":1}' });
    assert.equal(w.added, 1);
    assert.equal((await transferPart('weather', { official: '{"x":2}' })).skipped, 1);
    // плохое фото не принимается
    assert.equal((await transferPart('images', { 'img-bad': 'javascript:alert(1)' })).rejected, 1);
  });
});

describe('регистрация — согласие с Политикой конфиденциальности', () => {
  it('без согласия — отказ; с согласием — дата согласия сохраняется', async () => {
    const { default: auth } = await import('../api/auth');
    const { USERS_KEY } = await import('../api/_lib/users');
    const body = { action: 'register', name: 'Тест Согласие', email: 'consent@example.com', phone: '+996555123456', organization: 'Орг', password: 'pass-12345', plan: 'start' };
    const call = (b: object) => auth(new Request('http://localhost/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }));
    const r1 = await call(body);
    assert.equal(r1.status, 400);
    assert.equal((await r1.json()).error, 'consent_required');
    const r2 = await call({ ...body, consent: true });
    assert.equal(r2.status, 201);
    const u = await hgetJson<{ privacyConsentAt?: string }>(USERS_KEY, 'consent@example.com');
    assert.ok(u?.privacyConsentAt);
  });
});
