/**
 * Прямой приём пакетов от сборщиков (без почты в Claude): только с ключом, черновики — в «Модерацию»,
 * повтор пакета не разбирается, карточка пакета видна в «Материалах из почты», на Production — закрыто.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;
const SECRET = 'collector-test-secret-0123456789abcdef-XYZ';
process.env.MAIL_INGEST_SECRET = SECRET;

const { default: auth } = await import('../api/auth');
const { default: sources } = await import('../api/sources');
const { hvalsJson, hgetJson } = await import('../api/_lib/kv');
const { ANN_KEY } = await import('../api/_lib/announcements');

let admin = '';
before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
  await sources(new Request('http://localhost/api/sources?mail=settings', { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify({ enabled: true }) }));
});

const news = {
  kind: 'new',
  category: 'roads',
  city: 'bishkek',
  startDate: '2030-05-20T10:00',
  title: { ru: 'Перекрытие улицы Токтогула для теста сборщика', kg: 'Токтогул көчөсү жабылат', en: 'Toktogul street closure' },
  text: { ru: 'Улицу перекроют на ремонт.', kg: 'Көчө оңдоого жабылат.', en: 'Street closed for repairs.' },
  location: { ru: 'ул. Токтогула', kg: 'Токтогул көч.', en: 'Toktogul st.' },
  sourceName: 'Мэрия Бишкека',
  sourceUrl: 'https://bishkek.gov.kg/ru/news/1',
  sourceKind: 'official',
};
const batchText = `DATANEWS-BATCH\n${JSON.stringify([news])}\nEND-BATCH`;
const post = (key: string | null, body: unknown) =>
  sources(
    new Request('http://localhost/api/sources?collector=batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
    })
  );

describe('приём пакетов от сборщиков', () => {
  it('без ключа или с чужим ключом — отказ; ключ администратора не подходит', async () => {
    assert.equal((await post(null, { text: batchText })).status, 401);
    assert.equal((await post('wrong-key-wrong-key-wrong-key-wrong-key', { text: batchText })).status, 401);
    assert.equal((await post(admin, { text: batchText })).status, 401);
  });

  it('с ключом: новость — черновиком в «Модерацию», не на сайте; карточка пакета в почте', async () => {
    const r = await post(SECRET, { text: batchText, title: 'DATANEWS-BATCH 20.05.2030 утро' });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.result, 'stored');
    assert.equal(j.drafts, 1);
    const draft = (await hvalsJson<{ title: { ru: string }; moderationStatus: string }>(ANN_KEY)).find((a) => a.title.ru === news.title.ru);
    assert.equal(draft?.moderationStatus, 'pending');
    const card = await hgetJson<{ subject: string; history: { action: string }[] }>('dn:mail', j.id);
    assert.equal(card?.subject, 'DATANEWS-BATCH 20.05.2030 утро');
    assert.ok(card?.history.some((h) => h.action === 'batch_imported'));
  });

  it('повтор того же пакета не разбирается второй раз', async () => {
    const j = await (await post(SECRET, { text: batchText })).json();
    assert.equal(j.result, 'already');
  });

  it('без блока DATANEWS-BATCH — понятная ошибка', async () => {
    assert.equal((await post(SECRET, { text: 'просто текст' })).status, 400);
  });

  it('«что уже есть»: черновик виден сборщику; без ключа — отказ', async () => {
    const get = (key: string | null) =>
      sources(new Request('http://localhost/api/sources?collector=recent&days=3', { headers: key ? { Authorization: `Bearer ${key}` } : {} }));
    assert.equal((await get(null)).status, 401);
    const j = await (await get(SECRET)).json();
    assert.ok(j.publications.some((p: { title: string; status: string }) => p.title === news.title.ru && p.status === 'pending'));
    assert.ok(Array.isArray(j.mail));
  });

  it('на Production приём открыт только выключателем «Приём почты» в панели', async () => {
    process.env.VERCEL_ENV = 'production';
    const toggle = (enabled: boolean) =>
      sources(new Request('http://localhost/api/sources?mail=settings', { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify({ enabled }) }));
    try {
      await toggle(false);
      assert.equal((await post(SECRET, { text: batchText.replace('Токтогула', 'Ахунбаева') })).status, 503, 'выключено — пакет не принимается');
      await toggle(true);
      assert.equal((await post(SECRET, { text: batchText.replace('Токтогула', 'Ахунбаева') })).status, 200, 'включено в панели — принимается');
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });
});
