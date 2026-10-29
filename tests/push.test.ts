/**
 * Push-уведомления: подписка и отписка (город, язык, темы), доступ только администратору,
 * свой текст у каждого подписчика, журнал отправок (не больше 200), ошибки и недействующие подписки, защита от частых рассылок.
 * Настоящий обработчик сервера и база в памяти; ключи VAPID — временные, только в памяти теста;
 * сервис доставки браузера подменён (сеть не используется), поэтому реальная доставка здесь не проверяется.
 */
import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
const PUB = b64(await crypto.subtle.exportKey('raw', pair.publicKey));
const PRIV = (await crypto.subtle.exportKey('jwk', pair.privateKey)).d!;

const { default: auth } = await import('../api/auth');
const { default: push, SUBS_KEY, LOG_KEY, INBOX_KEY, subId } = await import('../api/push');
const { cmd, hgetJson, hsetJson, hvalsJson } = await import('../api/_lib/kv');

// Сервис доставки: адрес с «gone» — подписка удалена (410), с «fail» — ошибка 500, иначе — принято
const realFetch = globalThis.fetch;
const delivered: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const u = String(input instanceof Request ? input.url : input);
  if (/googleapis\.com|mozilla\.com/.test(u)) {
    assert.match(String((init?.headers as Record<string, string>)?.Authorization || ''), /^vapid t=.+, k=/);
    delivered.push(u);
    return new Response('', { status: u.includes('gone') ? 410 : u.includes('fail') ? 500 : 201 });
  }
  return realFetch(input, init);
}) as typeof fetch;

let ip = 0;
const call = async (path: string, method: string, token?: string, body?: unknown) => {
  ip++;
  const handler = path.startsWith('auth') ? auth : push;
  const r = await handler(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.20.${Math.floor(ip / 200)}.${ip % 200}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, any> };
};
const ep = (name: string) => `https://fcm.googleapis.com/fcm/send/${name}`;
const subscribe = (name: string, city: string, extra: Record<string, unknown> = {}) => call('push', 'POST', undefined, { subscription: { endpoint: ep(name) }, city, ...extra });
const custom = (over: Record<string, unknown> = {}) => ({
  custom: { title: { ru: 'Заголовок', kg: 'Аталыш', en: 'Title' }, body: { ru: 'Текст', kg: '', en: '' }, url: '/', city: 'all', topic: 'news', ...over },
});
/** Журнал «состарить» — чтобы ограничение частоты не мешало следующему тесту */
const ageLog = async () => {
  for (const e of await hvalsJson<any>(LOG_KEY)) await hsetJson(LOG_KEY, e.id, { ...e, at: '2026-01-01T10:00' });
};
const clearAll = async () => {
  for (const k of [SUBS_KEY, LOG_KEY, INBOX_KEY]) for (const f of await cmd<string[]>('HKEYS', k)) await cmd('HDEL', k, f);
};

let admin = '';
before(async () => {
  admin = (await call('auth', 'POST', undefined, { action: 'admin-login', password: 'admin-dev' })).body.token;
  assert.ok(admin);
});

describe('без ключей VAPID', () => {
  it('подписка выключена, кнопка на сайте скрыта (нет публичного ключа)', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    assert.deepEqual((await call('push', 'GET')).body, { configured: false, publicKey: null });
    assert.equal((await subscribe('x', 'bishkek')).status, 503);
  });
});

describe('с ключами', () => {
  before(() => {
    process.env.VAPID_PUBLIC_KEY = PUB;
    process.env.VAPID_PRIVATE_KEY = PRIV;
  });
  beforeEach(clearAll);

  it('подписка: город, язык, темы, дата; повторная — смена тем без потери даты; отписка', async () => {
    assert.equal((await call('push', 'GET')).body.configured, true);
    const r = await subscribe('a1', 'bishkek', { lang: 'kg', topics: ['urgent', 'tech', 'nonsense'] });
    assert.equal(r.status, 201);
    const id = await subId(ep('a1'));
    const s = await hgetJson<any>(SUBS_KEY, id);
    assert.equal(s.city, 'bishkek');
    assert.equal(s.lang, 'kg');
    assert.deepEqual(s.topics, ['urgent', 'tech'], 'неизвестная тема отброшена');
    assert.ok(s.at);
    assert.equal(Object.keys(s).some((k) => /name|phone|email/i.test(k)), false, 'без личных данных');
    await hsetJson(SUBS_KEY, id, { ...s, at: '2026-01-05T09:00' });
    assert.equal((await subscribe('a1', 'osh', { lang: 'ru', topics: ['news'] })).status, 200);
    const s2 = await hgetJson<any>(SUBS_KEY, id);
    assert.deepEqual([s2.city, s2.lang, s2.topics, s2.at], ['osh', 'ru', ['news'], '2026-01-05T09:00']);
    // без тем — «Срочные предупреждения», как раньше
    await subscribe('a2', 'all');
    assert.deepEqual((await hgetJson<any>(SUBS_KEY, await subId(ep('a2')))).topics, ['urgent']);
    assert.equal((await call('push', 'DELETE', undefined, { endpoint: ep('a1') })).status, 200);
    assert.equal(await hgetJson(SUBS_KEY, id), null);
    // чужой адрес не принимается
    assert.equal((await call('push', 'POST', undefined, { subscription: { endpoint: 'https://evil.example/x' }, city: 'all' })).status, 400);
  });

  it('статистика, журнал и отправка — только администратору', async () => {
    assert.equal((await call('push?stats=1', 'GET')).status, 403);
    assert.equal((await call('push?log=1', 'GET')).status, 403);
    assert.equal((await call('push', 'PATCH', undefined, custom())).status, 403);
    assert.equal((await call('push', 'PATCH', undefined, { annId: 'x' })).status, 403);
    const st = await call('push?stats=1', 'GET', admin);
    assert.equal(st.status, 200);
    // состояние ключей — без значений
    assert.deepEqual(st.body.keys, { publicKey: true, privateKey: true, subject: false });
    assert.ok(!JSON.stringify(st.body).includes(PRIV) && !JSON.stringify(st.body).includes(PUB));
  });

  it('каждый подписчик получает свой текст: Бишкек и Ош не путаются; тема учитывается', async () => {
    await subscribe('bish', 'bishkek', { topics: ['news'] });
    await subscribe('osh', 'osh', { topics: ['news'] });
    await subscribe('urg', 'bishkek', { topics: ['urgent'] });
    const a = await call('push', 'PATCH', admin, custom({ city: 'bishkek', title: { ru: 'Для Бишкека' } }));
    assert.equal(a.status, 200);
    assert.deepEqual([a.body.total, a.body.sent], [1, 1], 'только Бишкек и только тема «Новости»');
    await ageLog();
    const b = await call('push', 'PATCH', admin, custom({ city: 'osh', title: { ru: 'Для Оша' } }));
    assert.equal(b.body.sent, 1);
    const inbox = async (name: string) => (await call(`push?inbox=${await subId(ep(name))}`, 'GET')).body.message;
    assert.equal((await inbox('bish')).title.ru, 'Для Бишкека');
    assert.equal((await inbox('osh')).title.ru, 'Для Оша');
    assert.equal(await inbox('urg'), null, 'подписчик только срочного не получил новость');
    assert.equal((await inbox('bish')).title.kg, 'Для Бишкека', 'пустой кыргызский — русский текст');
  });

  it('журнал: доставлено, ошибки по кодам, удалённые и недействующие подписки', async () => {
    await subscribe('ok1', 'all', { topics: ['news'] });
    await subscribe('gone1', 'all', { topics: ['news'] });
    await subscribe('fail1', 'all', { topics: ['news'] });
    const r = await call('push', 'PATCH', admin, custom());
    assert.deepEqual([r.body.total, r.body.sent, r.body.removed, r.body.failed], [3, 1, 1, 1]);
    assert.deepEqual(r.body.errors, { '500': 1 });
    const log = (await call('push?log=1', 'GET', admin)).body.entries;
    assert.equal(log.length, 1);
    assert.equal(log[0].status, 'done');
    assert.equal(log[0].title.ru, 'Заголовок');
    assert.equal(await hgetJson(SUBS_KEY, await subId(ep('gone1'))), null, 'отписавшийся браузер удалён');
    // три неудачи подряд — подписка недействующая
    for (let i = 0; i < 2; i++) {
      await ageLog();
      await call('push', 'PATCH', admin, custom());
    }
    const st = (await call('push?stats=1', 'GET', admin)).body;
    assert.deepEqual([st.total, st.active, st.invalid], [2, 1, 1]);
    assert.equal(st.sentTotal, 3);
    assert.equal(st.failedTotal, 3);
    assert.ok(!JSON.stringify(log).includes('googleapis'), 'адресов подписок в журнале нет');
  });

  it('новые за 7 и 30 дней, разбивка по городам, языкам и темам', async () => {
    await subscribe('n1', 'bishkek', { lang: 'kg', topics: ['tech'] });
    await subscribe('n2', 'osh', { lang: 'en', topics: ['urgent', 'tech'] });
    const id = await subId(ep('n2'));
    await hsetJson(SUBS_KEY, id, { ...(await hgetJson<any>(SUBS_KEY, id)), at: '2025-01-01T10:00' });
    const st = (await call('push?stats=1', 'GET', admin)).body;
    assert.deepEqual([st.total, st.new7, st.new30], [2, 1, 1]);
    assert.deepEqual(st.byCity, { bishkek: 1, osh: 1 });
    assert.deepEqual(st.byLang, { kg: 1, en: 1 });
    assert.deepEqual(st.byTopic, { tech: 2, urgent: 1 });
  });

  it('защита от частых рассылок и от произвольных ссылок', async () => {
    await subscribe('r1', 'all', { topics: ['news'] });
    assert.equal((await call('push', 'PATCH', admin, custom())).status, 200);
    const again = await call('push', 'PATCH', admin, custom());
    assert.equal(again.status, 429, 'не чаще одной рассылки в 5 минут');
    await ageLog();
    assert.equal((await call('push', 'PATCH', admin, custom({ url: 'https://evil.example' }))).status, 400);
    assert.equal((await call('push', 'PATCH', admin, custom({ url: '/n/no-such-id' }))).status, 400);
    assert.equal((await call('push', 'PATCH', admin, custom({ url: '/?r=tech' }))).status, 200, 'раздел сайта — можно');
    await ageLog();
    assert.equal((await call('push', 'PATCH', admin, custom({ url: '/n/ann-frost-warning-2026-10-17' }))).status, 200, 'опубликованная новость — можно');
    await ageLog();
    assert.equal((await call('push', 'PATCH', admin, custom({ title: { ru: '' } }))).status, 400, 'без заголовка нельзя');
    // предел за сутки
    for (const e of await hvalsJson<any>(LOG_KEY)) await cmd('HDEL', LOG_KEY, e.id);
    const now = new Date(Date.now() + 6 * 3600 * 1000 - 3600 * 1000).toISOString().slice(0, 16);
    for (let i = 0; i < 20; i++) await hsetJson(LOG_KEY, `old${i}`, { id: `old${i}`, at: now, sent: 0, failed: 0 });
    assert.equal((await call('push', 'PATCH', admin, custom())).status, 429, 'не больше 20 рассылок в сутки');
  });

  it('журнал хранит не больше 200 записей', async () => {
    await subscribe('l1', 'all', { topics: ['news'] });
    for (let i = 0; i < 205; i++) await hsetJson(LOG_KEY, `x${String(i).padStart(3, '0')}`, { id: `x${String(i).padStart(3, '0')}`, at: `2025-0${1 + (i % 9)}-01T10:00`, sent: 0, failed: 0, errors: {} });
    assert.equal((await call('push', 'PATCH', admin, custom())).status, 200);
    assert.equal((await cmd<string[]>('HKEYS', LOG_KEY)).length, 200);
    assert.equal((await call('push?log=1', 'GET', admin)).body.entries[0].title.ru, 'Заголовок', 'новая запись — первой');
  });

  it('срочное предупреждение: только действующее, получают подписчики «срочного», старые подписки тоже', async () => {
    await hsetJson(SUBS_KEY, await subId(ep('legacy')), { endpoint: ep('legacy'), city: 'all', at: '2025-05-01T10:00' }); // подписка старого вида
    await subscribe('newsonly', 'all', { topics: ['news'] });
    assert.equal((await call('push', 'PATCH', admin, { annId: 'ann-malika-dina-2026-10-31' })).status, 400, 'не предупреждение');
    const sent0 = delivered.length;
    // недействующее предупреждение тоже нельзя (заморозки 17–18 октября уже прошли)
    assert.equal((await call('push', 'PATCH', admin, { annId: 'ann-frost-warning-2026-10-17' })).status, 400);
    assert.equal(delivered.length, sent0, 'ничего не отправлено');
    // действующее предупреждение (копия отключения воды с сегодняшними датами) — получают «срочное» и старые подписки
    const { INITIAL_ANNOUNCEMENTS } = await import('../src/data/initialAnnouncements');
    const { ANN_KEY } = await import('../api/_lib/announcements');
    const water = INITIAL_ANNOUNCEMENTS.find((x) => x.category === 'water')!;
    const kgNow = (h: number) => new Date(Date.now() + (6 + h) * 3600 * 1000).toISOString().slice(0, 16);
    await hsetJson(ANN_KEY, 'test-alert', { ...water, id: 'test-alert', city: 'all', startDate: kgNow(-1), endDate: kgNow(5), status: 'scheduled', moderationStatus: 'approved' });
    const r = await call('push', 'PATCH', admin, { annId: 'test-alert' });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.total, r.body.sent, r.body.topic, r.body.kind], [1, 1, 'urgent', 'alert']);
    assert.equal((await call(`push?inbox=${await subId(ep('legacy'))}`, 'GET')).body.message.id, r.body.id);
  });
});
