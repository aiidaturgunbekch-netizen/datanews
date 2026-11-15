/** «Поделиться» по публикациям: какая новость и через какую сеть; роботы и скрипты не считаются */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;
const { default: track } = await import('../api/track');
const { default: stats } = await import('../api/stats');
const { default: auth } = await import('../api/auth');
const { cmd } = await import('../api/_lib/kv');
const { K, dayKey } = await import('../api/_lib/stats');

const post = (body: unknown, ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/140') =>
  track(new Request('http://localhost/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.98.0.1', 'user-agent': ua }, body: JSON.stringify(body) }));

describe('«Поделиться» по публикациям', () => {
  it('считает новость и сеть; неизвестную сеть и неверный id не принимает', async () => {
    assert.equal((await post({ share: 'wa', annId: 'ann-test-1' })).status, 200);
    assert.equal((await post({ share: 'wa', annId: 'ann-test-1' })).status, 200);
    assert.equal((await post({ share: 'tg', annId: 'ann-test-1' })).status, 200);
    assert.equal((await post({ share: 'copy', annId: 'ann-test-2' })).status, 200);
    assert.equal((await post({ share: 'myspace', annId: 'ann-test-1' })).status, 400);
    assert.equal((await post({ share: 'wa', annId: '<x>' })).status, 400);
    const m = (await cmd<string[]>('HGETALL', K.shares(dayKey(new Date())))) || [];
    const map = Object.fromEntries(Array.from({ length: m.length / 2 }, (_, i) => [m[i * 2], Number(m[i * 2 + 1])]));
    assert.equal(map['ann-test-1|wa'], 2);
    assert.equal(map['ann-test-1|tg'], 1);
    assert.equal(map['ann-test-2|copy'], 1);
  });

  it('статистика администратора: новости по числу «Поделиться» с разбивкой по сетям', async () => {
    const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
    const token = (await r.json()).token;
    const s = await (await stats(new Request('http://localhost/api/stats?days=7', { headers: { Authorization: `Bearer ${token}` } }))).json();
    const first = s.shares[0];
    assert.equal(first.id, 'ann-test-1');
    assert.equal(first.total, 3);
    assert.deepEqual(first.networks, { wa: 2, tg: 1 });
  });

  it('проверки Google, скрипты и сервисы не считаются посетителями', async () => {
    for (const ua of ['Mozilla/5.0 (compatible; Google-InspectionTool/1.0)', 'curl/8.5.0', 'python-requests/2.31', 'node-fetch/1.0', 'vercel-screenshot/1.0']) {
      const body = await (await post({ path: 'home', visitorId: 'x', lang: 'ru' }, ua)).json();
      assert.equal(body.skipped, 'bot', ua);
    }
    const human = await (await post({ path: 'home', visitorId: 'x', lang: 'ru' })).json();
    assert.equal(human.skipped, undefined);
  });
});
