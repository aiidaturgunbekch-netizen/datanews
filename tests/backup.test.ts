/**
 * Резервная копия данных: только для администратора, без хэшей паролей; фото — по отдельному запросу.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;

const { default: auth } = await import('../api/auth');
const { default: stats } = await import('../api/stats');
const { cmd, hsetJson } = await import('../api/_lib/kv');
const { ANN_KEY, IMG_KEY } = await import('../api/_lib/announcements');
const { USERS_KEY } = await import('../api/_lib/users');

let admin = '';
const get = (path: string, token = admin) =>
  stats(new Request(`http://localhost/api/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));

before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
  await hsetJson(ANN_KEY, 'bk-1', { id: 'bk-1', title: { ru: 'Тест', kg: 'Тест', en: 'Test' } });
  await hsetJson(USERS_KEY, 'org@example.kg', { email: 'org@example.kg', name: 'Организация', hash: 'SECRET-HASH', salt: 'SECRET-SALT' });
  await cmd('HSET', IMG_KEY, 'img-1', 'data:image/png;base64,AAAA');
});

describe('резервная копия', () => {
  it('без входа администратора недоступна', async () => {
    const r = await get('stats?backup=1', '');
    assert.equal(r.status, 403);
  });

  it('скачивается файлом, содержит публикации и учётные записи без паролей', async () => {
    const r = await get('stats?backup=1');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('Content-Disposition') || '', /attachment; filename="datanews-backup-\d{4}-\d\d-\d\d\.json"/);
    const text = await r.text();
    assert.ok(!text.includes('SECRET-HASH') && !text.includes('SECRET-SALT'), 'хэша и соли пароля в копии нет');
    const b = JSON.parse(text);
    assert.equal(b.format, 'datanews-backup');
    assert.ok(JSON.parse(b.data[ANN_KEY]['bk-1']).title.ru === 'Тест');
    assert.equal(JSON.parse(b.data[USERS_KEY]['org@example.kg']).name, 'Организация');
    assert.deepEqual(b.imageIds, ['img-1']);
    assert.equal(b.data[IMG_KEY], undefined, 'фото без отдельного запроса не входят');
  });

  it('с фото — по отдельному запросу', async () => {
    const b = await (await get('stats?backup=1&images=1')).json();
    assert.equal(b.includesImages, true);
    assert.equal(b.data[IMG_KEY]['img-1'], 'data:image/png;base64,AAAA');
  });
});
