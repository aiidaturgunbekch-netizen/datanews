/**
 * Скрипт Google Apps Script (tools/gmail-apps-script/Code.gs) в имитации Apps Script:
 * его подпись должна приниматься сервером, сухой прогон ничего не отправляет, секреты не попадают в журнал.
 * Настоящий Gmail здесь не используется.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import vm from 'node:vm';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;
const SECRET = 'apps-script-test-secret-0123456789-abcdef';
const BYPASS = 'vercel-bypass-test-value-123';
process.env.MAIL_INGEST_SECRET = SECRET;

const { default: auth } = await import('../api/auth');
const { default: sources } = await import('../api/sources');
const { default: announcements } = await import('../api/announcements');
const { hvalsJson } = await import('../api/_lib/kv');

const CODE = readFileSync(new URL('../tools/gmail-apps-script/Code.gs', import.meta.url), 'utf8');
const URL_INGEST = 'https://datanews-git-test.vercel.app/api/sources?mail=ingest';

interface FakeAtt {
  name: string;
  type: string;
  bytes: number[];
}
interface FakeMsg {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  atts?: FakeAtt[];
}

/** Имитация окружения Apps Script: Gmail, свойства, подпись, отправка запросов, Drive для PDF */
const makeEnv = (messages: FakeMsg[], respond: (req: { url: string; headers: Record<string, string>; payload: string }) => { code: number; body: unknown }) => {
  const props = new Map<string, string>([
    ['INGEST_URL', URL_INGEST],
    ['INGEST_SECRET', SECRET],
    ['VERCEL_BYPASS', BYPASS],
  ]);
  const logs: string[] = [];
  const sent: { url: string; headers: Record<string, string>; payload: string }[] = [];
  const labels = new Map<string, string[]>();
  const driveFiles = new Set<string>();
  const threads = messages.map((m) => {
    const thread: any = {
      getId: () => `t-${m.id}`,
      getPermalink: () => `https://mail.google.com/mail/u/0/#inbox/${m.id}`,
      getMessages: () => [msg],
      getMessageCount: () => 1,
      addLabel: (l: { name: string }) => labels.set(m.id, [...(labels.get(m.id) || []), l.name]),
    };
    const msg: any = {
      getId: () => m.id,
      getThread: () => thread,
      getHeader: (h: string) => (h === 'Message-ID' ? `<${m.id}@mail.example>` : h === 'Authentication-Results' ? 'mx.google.com; spf=pass; dkim=pass; dmarc=pass' : ''),
      getFrom: () => m.from,
      getSubject: () => m.subject,
      getDate: () => m.date,
      getPlainBody: () => m.body,
      getAttachments: () =>
        (m.atts || []).map((a) => ({
          getName: () => a.name,
          getContentType: () => a.type,
          getSize: () => a.bytes.length,
          getBytes: () => a.bytes,
          copyBlob: () => ({ text: Buffer.from(a.bytes).toString('utf8') }),
        })),
    };
    return { m, thread };
  });
  const ctx: Record<string, unknown> = {
    Logger: { log: (s: unknown) => logs.push(String(s)) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }),
    },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      getUuid: () => randomUUID(),
      base64Encode: (bytes: number[]) => Buffer.from(bytes.map((b) => (b < 0 ? b + 256 : b))).toString('base64'),
      computeHmacSha256Signature: (value: string, key: string) => [...createHmac('sha256', key).update(value, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    },
    GmailApp: {
      search: (q: string, _s: number, max: number) =>
        threads.filter(({ m }) => !/subject:"ТЕСТ DataNews"/.test(q) || m.subject.includes('ТЕСТ DataNews')).slice(0, max).map((t) => t.thread),
      getUserLabelByName: (n: string) => ({ name: n }),
      createLabel: (n: string) => ({ name: n }),
    },
    UrlFetchApp: {
      fetch: (url: string, o: { headers: Record<string, string>; payload: string }) => {
        const req = { url, headers: o.headers, payload: o.payload };
        sent.push(req);
        const r = respond(req);
        return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) };
      },
    },
    Drive: {
      Files: {
        create: () => {
          const id = `doc-${driveFiles.size + 1}`;
          driveFiles.add(id);
          return { id };
        },
        remove: (id: string) => driveFiles.delete(id),
      },
    },
    DocumentApp: { openById: () => ({ getBody: () => ({ getText: () => 'Перекрытие движения 3 ноября 2026 года с 10:00.\nПо адресу: пр. Манаса, 40.' }) }) },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return { ctx: ctx as Record<string, any>, logs, sent, labels, props, driveFiles };
};

/** Повторить на настоящем сервере запрос, который сделал скрипт */
const replay = async (req: { url: string; headers: Record<string, string>; payload: string }) => {
  const r = await sources(
    new Request(req.url.replace('https://datanews-git-test.vercel.app', 'http://localhost'), {
      method: 'POST',
      headers: { ...req.headers, 'Content-Type': 'application/json; charset=utf-8', 'x-forwarded-for': '10.1.1.1' },
      body: req.payload,
    })
  );
  return { status: r.status, body: (await r.json()) as Record<string, any> };
};

let admin = '';
before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
  // приём включён в панели (по умолчанию выключен)
  await sources(new Request('http://localhost/api/sources?mail=settings', { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify({ enabled: true }) }));
});

const TEST_MSG: FakeMsg = {
  id: '19a2b3c4d5e6f7a8',
  from: 'Айгуль <aigul@example.com>',
  subject: 'ТЕСТ DataNews',
  body: 'Тестовое объявление 30 ноября 2026 года в 10:00.\nПо адресу: ул. Тестовая, 1, г. Бишкек.',
  date: new Date('2026-10-26T04:00:00Z'),
  atts: [
    { name: 'photo.png', type: 'image/png', bytes: [...Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')] },
    { name: 'prikaz.pdf', type: 'application/pdf', bytes: [...Buffer.from('%PDF-1.4 test')] },
  ],
};

describe('Apps Script ↔ сервер', () => {
  it('checkSetup не выводит значения секретов', () => {
    const env = makeEnv([], () => ({ code: 200, body: {} }));
    assert.equal(env.ctx.checkSetup(), true);
    const log = env.logs.join('\n');
    assert.ok(!log.includes(SECRET) && !log.includes(BYPASS) && !log.includes(SECRET.slice(0, 8)));
    assert.match(log, /INGEST_SECRET: задан/);
  });

  it('сухой прогон ничего не отправляет, не ставит ярлыков и не создаёт файлов', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 200, body: {} }));
    env.ctx.dryRun();
    assert.equal(env.sent.length, 0);
    assert.equal(env.labels.size, 0);
    assert.equal(env.driveFiles.size, 0);
    assert.match(env.logs.join('\n'), /на сайт ничего не отправлено/);
  });

  it('подпись скрипта принимается сервером; письмо сохранено во входящих, публикация не создана', async () => {
    const annBefore = (await hvalsJson('dn:ann')).length;
    let captured: { url: string; headers: Record<string, string>; payload: string } | null = null;
    const env = makeEnv([TEST_MSG], (req) => {
      captured = req;
      return { code: 200, body: { result: 'stored', status: 'new' } };
    });
    env.ctx.processTest();
    assert.ok(captured, 'скрипт отправил запрос');
    const req = captured as unknown as { url: string; headers: Record<string, string>; payload: string };
    assert.equal(req.headers['x-vercel-protection-bypass'], BYPASS, 'пропуск Vercel — в заголовке');
    assert.ok(!req.url.includes(BYPASS) && !req.url.includes(SECRET), 'секреты не в адресе');
    assert.ok(!req.payload.includes(SECRET), 'секрет не в теле');
    const r = await replay(req);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.result, 'stored');
    assert.equal((await hvalsJson('dn:ann')).length, annBefore, 'публикация не создана');
    const list = await (await sources(new Request('http://localhost/api/sources?mail=list', { headers: { Authorization: `Bearer ${admin}` } }))).json();
    const item = list.items.find((m: { id: string }) => m.id === TEST_MSG.id);
    assert.ok(item);
    assert.equal(item.suggestion.draft.startDate, '2026-11-30T10:00');
    assert.ok(item.attachments.find((a: { name: string }) => a.name === 'photo.png').storedKey, 'фото сохранено');
    assert.ok(item.attachments.find((a: { name: string }) => a.name === 'prikaz.pdf').text.includes('Манаса'), 'текст PDF передан');
    assert.equal(env.driveFiles.size, 0, 'временный документ для PDF удалён');
    assert.deepEqual(env.labels.get(TEST_MSG.id), ['DataNews/обработано']);
    assert.ok(!env.logs.join('\n').includes(SECRET) && !env.logs.join('\n').includes(BYPASS));
  });

  it('повторный запуск не отправляет уже обработанное письмо', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 200, body: { result: 'stored' } }));
    env.ctx.processTest();
    assert.equal(env.sent.length, 1);
    env.ctx.processTest();
    assert.equal(env.sent.length, 1, 'второй раз не отправлено');
  });

  it('повтор того же запроса сервер отклоняет; то же письмо с новой подписью — «already»', async () => {
    let captured: any = null;
    const env = makeEnv([{ ...TEST_MSG, id: '19a2b3c4d5e6f7b9', body: `${TEST_MSG.body}\nИсх. 2` }], (req) => {
      captured = req;
      return { code: 200, body: { result: 'stored' } };
    });
    env.ctx.processTest();
    assert.equal((await replay(captured)).body.result, 'stored');
    assert.equal((await replay(captured)).status, 409, 'тот же подписанный запрос второй раз — replay');
    env.props.delete('PROCESSED_IDS');
    env.ctx.processTest();
    assert.equal((await replay(env.sent[env.sent.length - 1])).body.result, 'already');
  });

  it('приём выключен (503) — скрипт останавливается, ярлык не ставит, письмо уйдёт позже', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 503, body: { error: 'mail_paused', message: 'Приём почты выключен в панели администратора' } }));
    const r = env.ctx.processTest();
    assert.equal(r.stopped, 'mail_paused');
    assert.equal(env.labels.size, 0);
    assert.ok(!env.props.get('PROCESSED_IDS') || !env.props.get('PROCESSED_IDS')!.includes(TEST_MSG.id));
  });

  it('страница входа Vercel (401, не JSON) — остановка без ярлыков', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 401, body: 'not json' as unknown }));
    // имитируем HTML-ответ Vercel: getContentText вернёт строку JSON со строкой — скрипт должен распознать код 401
    const r = env.ctx.processTest();
    assert.ok(r.stopped);
    assert.equal(env.labels.size, 0);
  });

  it('служебные письма Google не отправляются', () => {
    const env = makeEnv([{ ...TEST_MSG, id: 'g1g2g3g4g5', from: 'Google <no-reply@accounts.google.com>' }], () => ({ code: 200, body: { result: 'stored' } }));
    env.ctx.processTest();
    assert.equal(env.sent.length, 0);
  });
});

describe('черновик из письма — только в «Модерацию»', () => {
  const call = async (method: string, body?: unknown, path = 'announcements') => {
    const r = await announcements(
      new Request(`http://localhost/api/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
        body: body ? JSON.stringify(body) : undefined,
      })
    );
    return { status: r.status, body: (await r.json()) as Record<string, any> };
  };
  const draft = {
    title: { ru: 'ТЕСТ: объявление из письма' },
    description: { ru: 'Тестовое объявление 30 ноября 2026 года в 10:00.' },
    location: { ru: 'ул. Тестовая, 1' },
    startDate: '2026-11-30T10:00',
    category: 'gov',
    city: 'bishkek',
  };

  it('сохраняется со статусом «на модерации», на сайте не виден, не отмечен «Подтверждено» и без даты сверки', async () => {
    const r = await call('POST', { item: draft, asDraft: true, mailId: TEST_MSG.id });
    assert.equal(r.status, 201);
    assert.equal(r.body.item.moderationStatus, 'pending');
    assert.equal(r.body.item.isVerified, false);
    assert.equal(r.body.item.lastCheckedAt, undefined);
    assert.match(r.body.item.history.at(-1).note, /редакционной почты/);
    const pub = await (await announcements(new Request('http://localhost/api/announcements'))).json();
    assert.ok(!pub.items.some((a: { id: string }) => a.id === r.body.item.id), 'на сайте нет');
  });

  it('публикуется только кнопкой «Одобрить» (логика «Одобрить» не изменилась)', async () => {
    const r = await call('POST', { item: { ...draft, title: { ru: 'ТЕСТ: второе объявление из письма' } }, asDraft: true });
    const id = r.body.item.id;
    const ok = await call('PATCH', { id, action: 'approve' });
    assert.equal(ok.body.item.moderationStatus, 'approved');
    assert.equal(ok.body.item.isVerified, false, '«Одобрить» не ставит «Подтверждено»');
    const pub = await (await announcements(new Request('http://localhost/api/announcements'))).json();
    assert.ok(pub.items.some((a: { id: string }) => a.id === id));
  });

  it('без asDraft администратор по-прежнему публикует сразу (прежнее поведение)', async () => {
    const r = await call('POST', { item: { ...draft, title: { ru: 'ТЕСТ: публикация администратора' }, startDate: '2026-12-01T10:00' } });
    assert.equal(r.body.item.moderationStatus, 'approved');
  });

  it('письмо связывается с черновиком отметкой «prepared»', async () => {
    const r = await sources(
      new Request('http://localhost/api/sources?mail=action', {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}` },
        body: JSON.stringify({ id: TEST_MSG.id, action: 'prepared', annId: 'ann-test-1' }),
      })
    );
    const b = await r.json();
    assert.equal(b.item.status, 'prepared');
    assert.equal(b.item.annId, 'ann-test-1');
  });
});
