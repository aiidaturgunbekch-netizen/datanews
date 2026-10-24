/**
 * Данные панели: «Проверено сегодня» для встроенных публикаций хранит только дату,
 * старые полные копии не заменяют версию из кода, время показывается по Бишкеку.
 * Локальная база в памяти (DATANEWS_MEMORY_KV=1); Upstash и настоящие данные не используются.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;

const { default: auth } = await import('../api/auth');
const { default: announcements } = await import('../api/announcements');
const { cmd, hsetJson, hvalsJson } = await import('../api/_lib/kv');
const { ANN_KEY, CHECKED_KEY } = await import('../api/_lib/announcements');
const { INITIAL_ANNOUNCEMENTS } = await import('../src/data/initialAnnouncements');
const { CHECK_NOTE, mergeAnnouncements } = await import('../src/utils/mergeAnnouncements');
const { formatKgDateTime } = await import('../src/utils/time');

const builtin = INITIAL_ANNOUNCEMENTS[0];
const other = INITIAL_ANNOUNCEMENTS[1];
let admin = '';
const call = async (method: string, path: string, body?: unknown) => {
  const r = await announcements(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}`, 'x-forwarded-for': '127.0.0.1' },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: await r.json() };
};

before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
});

describe('«Проверено сегодня» для встроенной публикации', () => {
  it('сохраняет только дату проверки, без полной копии', async () => {
    const r = await call('PATCH', 'announcements', { id: builtin.id, action: 'checked' });
    assert.equal(r.status, 200);
    const stored = await hvalsJson<{ id: string }>(ANN_KEY);
    assert.ok(!stored.some((a) => a.id === builtin.id), 'полной копии в базе нет');
    const at = await cmd<string>('HGET', CHECKED_KEY, builtin.id);
    assert.match(at, /^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
  });

  it('сайт и панель показывают версию из кода с новой датой проверки', async () => {
    for (const path of ['announcements', 'announcements?scope=all']) {
      const { body } = await call('GET', path);
      const merged = mergeAnnouncements(body.items, body.hidden, body.checked);
      const a = merged.find((x) => x.id === builtin.id)!;
      assert.equal(a.title.ru, builtin.title.ru);
      assert.ok(a.lastCheckedAt && a.lastCheckedAt > (builtin.lastCheckedAt || ''), path);
    }
  });
});

describe('старые полные копии от «Проверено сегодня»', () => {
  it('не заменяют версию из кода, а дают только дату; запись в базе не удаляется', async () => {
    const frozen = {
      ...other,
      title: { ru: 'УСТАРЕВШАЯ КОПИЯ', kg: 'УСТАРЕВШАЯ КОПИЯ', en: 'OLD COPY' },
      lastCheckedAt: '2026-10-20T10:00',
      history: [...(other.history || []), { at: '2026-10-20T10:00', by: 'admin' as const, action: 'edited' as const, note: CHECK_NOTE }],
    };
    await hsetJson(ANN_KEY, other.id, frozen);
    const { body } = await call('GET', 'announcements');
    assert.ok(!body.items.some((x: { id: string }) => x.id === other.id), 'копия не отдаётся как публикация');
    assert.equal(body.checked[other.id], '2026-10-20T10:00');
    const a = mergeAnnouncements(body.items, body.hidden, body.checked).find((x) => x.id === other.id)!;
    assert.equal(a.title.ru, other.title.ru);
    assert.ok((await hvalsJson<{ id: string }>(ANN_KEY)).some((x) => x.id === other.id), 'данные в базе сохранены');
  });

  it('настоящая правка администратора по-прежнему заменяет версию из кода', async () => {
    const edited = {
      ...other,
      title: { ru: 'ПРАВКА АДМИНИСТРАТОРА', kg: 'ПРАВКА', en: 'EDIT' },
      history: [{ at: '2026-10-21T10:00', by: 'admin' as const, action: 'edited' as const, changes: ['title' as const] }],
    };
    await hsetJson(ANN_KEY, other.id, edited);
    const { body } = await call('GET', 'announcements');
    const a = mergeAnnouncements(body.items, body.hidden, body.checked).find((x) => x.id === other.id)!;
    assert.equal(a.title.ru, 'ПРАВКА АДМИНИСТРАТОРА');
  });
});

describe('время в панели — по Бишкеку и в одном формате', () => {
  it('метка UTC и бишкекская метка того же момента выглядят одинаково', () => {
    const fromUtc = formatKgDateTime('2026-10-24T18:36:00.000Z');
    const fromKg = formatKgDateTime('2026-10-25T00:36');
    assert.equal(fromUtc, fromKg);
    assert.match(fromKg, /25 окт\. 2026 г\., 00:36/);
  });
  it('пустое значение и дата без времени', () => {
    assert.equal(formatKgDateTime(''), '—');
    assert.match(formatKgDateTime('2026-11-08'), /8 нояб\. 2026 г\., 00:00/);
  });
});

describe('отметка «Подтверждено» не появляется сама', () => {
  it('«Проверено сегодня» не меняет isVerified встроенной публикации', async () => {
    const unverified = INITIAL_ANNOUNCEMENTS.find((a) => !a.isVerified)!;
    await call('PATCH', 'announcements', { id: unverified.id, action: 'checked' });
    const { body } = await call('GET', 'announcements?scope=all');
    const a = mergeAnnouncements(body.items, body.hidden, body.checked).find((x) => x.id === unverified.id)!;
    assert.equal(a.isVerified, false);
  });

  it('«Проверено сегодня» не меняет isVerified публикации из базы', async () => {
    const created = await call('POST', 'announcements', {
      force: true,
      item: { title: { ru: 'Тест без подтверждения' }, description: { ru: 'тест' }, category: 'concerts', city: 'bishkek', location: { ru: 'тест' }, startDate: '2026-12-01T19:00', isVerified: false },
    });
    assert.equal(created.body.item.isVerified, false, 'админ сохранил без отметки — не подтверждено');
    const r = await call('PATCH', 'announcements', { id: created.body.item.id, action: 'checked' });
    assert.equal(r.body.item.isVerified, false);
    assert.ok(r.body.item.lastCheckedAt);
  });

  it('правка администратором сохраняет то значение «Подтверждено», которое выбрано в форме', async () => {
    const created = await call('POST', 'announcements', {
      force: true,
      item: { title: { ru: 'Тест с подтверждением' }, description: { ru: 'тест' }, category: 'concerts', city: 'bishkek', location: { ru: 'тест' }, startDate: '2026-12-02T19:00', isVerified: true },
    });
    assert.equal(created.body.item.isVerified, true);
  });
});
