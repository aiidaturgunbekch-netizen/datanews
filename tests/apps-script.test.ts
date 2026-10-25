/**
 * Скрипт Google Apps Script (tools/gmail-apps-script/Code.gs + appsscript.json) в имитации Apps Script:
 * минимальные права (только чтение Gmail и отправка на сайт), подпись принимается сервером,
 * сухой прогон ничего не отправляет, секреты не попадают в журнал. Настоящий Gmail здесь не используется.
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
const MANIFEST = JSON.parse(readFileSync(new URL('../tools/gmail-apps-script/appsscript.json', import.meta.url), 'utf8'));
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
  /** письмо только в HTML (без text/plain) */
  html?: boolean;
  date: Date;
  atts?: FakeAtt[];
}

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
const signed = (buf: Buffer) => [...buf].map((b) => (b > 127 ? b - 256 : b));
const unsigned = (bytes: number[]) => Buffer.from(bytes.map((b) => (b < 0 ? b + 256 : b)));

/** Письмо в формате Gmail API (users.messages.get, format=full) */
const toApi = (m: FakeMsg) => {
  const parts: any[] = [
    m.html
      ? { mimeType: 'text/html', filename: '', headers: [{ name: 'Content-Type', value: 'text/html; charset=UTF-8' }], body: { data: b64url(Buffer.from(`<div><p>${m.body.replace(/\n/g, '<br>')}</p></div>`)) } }
      : { mimeType: 'text/plain', filename: '', headers: [{ name: 'Content-Type', value: 'text/plain; charset=UTF-8' }], body: { data: b64url(Buffer.from(m.body)) } },
  ];
  (m.atts || []).forEach((a, i) => parts.push({ mimeType: a.type, filename: a.name, body: { attachmentId: `att-${m.id}-${i}`, size: a.bytes.length } }));
  return {
    id: m.id,
    threadId: `t${m.id}`,
    internalDate: String(m.date.getTime()),
    payload: {
      mimeType: 'multipart/mixed',
      filename: '',
      headers: [
        { name: 'From', value: m.from },
        { name: 'Subject', value: m.subject },
        { name: 'Message-ID', value: `<${m.id}@mail.example>` },
        { name: 'Authentication-Results', value: 'mx.google.com; spf=pass; dkim=pass; dmarc=pass' },
      ],
      body: { size: 0 },
      parts,
    },
  };
};

/** Имитация Apps Script только с тем, что разрешено манифестом: Gmail API (чтение), UrlFetchApp, свойства, Utilities */
const makeEnv = (messages: FakeMsg[], respond: (req: { url: string; headers: Record<string, string>; payload: string }) => { code: number; body: unknown }) => {
  const props = new Map<string, string>([
    ['INGEST_URL', URL_INGEST],
    ['INGEST_SECRET', SECRET],
    ['VERCEL_BYPASS', BYPASS],
  ]);
  const logs: string[] = [];
  const sent: { url: string; headers: Record<string, string>; payload: string }[] = [];
  const forbidden: string[] = [];
  const gmailCalls: string[] = [];
  const gmailQueries: string[] = [];
  /** Любое обращение к службе вне разрешений — фиксируется и падает, как в настоящем Apps Script */
  const deny = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, k) => {
          forbidden.push(`${name}.${String(k)}`);
          throw new Error(`${name} не разрешён манифестом`);
        },
      }
    );
  const byId = new Map(messages.map((m) => [m.id, m]));
  const ctx: Record<string, unknown> = {
    Logger: { log: (s: unknown) => logs.push(String(s)) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }),
    },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      getUuid: () => randomUUID(),
      base64Encode: (bytes: number[]) => unsigned(bytes).toString('base64'),
      base64DecodeWebSafe: (s: string) => signed(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      newBlob: (bytes: number[]) => ({ getDataAsString: (cs?: string) => unsigned(bytes).toString(/utf-?8/i.test(cs || 'utf-8') ? 'utf8' : 'latin1') }),
      computeHmacSha256Signature: (value: string, key: string) => signed(createHmac('sha256', key).update(value, 'utf8').digest()),
    },
    // Встроенная служба Gmail API — только методы чтения
    Gmail: {
      Users: {
        Messages: {
          list: (_u: string, o: { q: string; maxResults: number }) => {
            gmailCalls.push('Messages.list');
            gmailQueries.push(o.q);
            // поиск Gmail: если в запросе есть subject:"…", подходят только письма с одной из этих тем
            const subjects = [...o.q.matchAll(/subject:"([^"]+)"/g)].map((x) => x[1]);
            const items = messages.filter((m) => !subjects.length || subjects.some((t) => m.subject.includes(t))).slice(0, o.maxResults);
            return { messages: items.map((m) => ({ id: m.id, threadId: `t${m.id}` })) };
          },
          get: (_u: string, id: string) => {
            gmailCalls.push('Messages.get');
            return toApi(byId.get(id)!);
          },
          Attachments: {
            get: (_u: string, msgId: string, attId: string) => {
              gmailCalls.push('Attachments.get');
              const i = Number(attId.split('-').pop());
              return { data: b64url(unsigned(byId.get(msgId)!.atts![i].bytes)) };
            },
          },
        },
      },
    },
    UrlFetchApp: {
      fetch: (url: string, o: { headers: Record<string, string>; payload: string }) => {
        const req = { url, headers: o.headers, payload: o.payload };
        sent.push(req);
        const r = respond(req);
        return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) };
      },
    },
    GmailApp: deny('GmailApp'),
    MailApp: deny('MailApp'),
    DriveApp: deny('DriveApp'),
    Drive: deny('Drive'),
    DocumentApp: deny('DocumentApp'),
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return { ctx: ctx as Record<string, any>, logs, sent, props, forbidden, gmailCalls, gmailQueries };
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

const PNG = [...Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')];
const TEST_MSG: FakeMsg = {
  id: '19a2b3c4d5e6f7a8',
  from: 'Айгуль <aigul@example.com>',
  subject: 'ТЕСТ DataNews',
  body: 'Тестовое объявление 30 ноября 2026 года в 10:00.\nПо адресу: ул. Тестовая, 1, г. Бишкек.',
  date: new Date('2026-10-26T04:00:00Z'),
  atts: [
    { name: 'photo.png', type: 'image/png', bytes: PNG },
    { name: 'prikaz.pdf', type: 'application/pdf', bytes: [...Buffer.from('%PDF-1.4 test')] },
  ],
};

describe('минимальные разрешения', () => {
  it('манифест: только чтение Gmail и отправка данных на сайт', () => {
    assert.deepEqual([...MANIFEST.oauthScopes].sort(), ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/script.external_request']);
    assert.deepEqual(
      MANIFEST.dependencies.enabledAdvancedServices.map((s: { serviceId: string }) => s.serviceId),
      ['gmail'],
      'из встроенных служб — только Gmail API'
    );
  });

  it('в коде нет служб и методов, которым нужны права шире чтения', () => {
    for (const bad of ['GmailApp', 'MailApp', 'DriveApp', 'DocumentApp', 'Drive.', 'CalendarApp', 'SpreadsheetApp', 'ScriptApp', 'addLabel', 'removeLabel', '.modify(', '.trash(', '.send(', '.insert(', '.batchModify', '.Drafts', '.Labels']) {
      const code = CODE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // без комментариев
      assert.ok(!code.includes(bad), `в коде не должно быть «${bad}»`);
    }
  });

  it('при работе вызываются только чтение Gmail (list / get / вложения) и отправка на INGEST_URL', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 200, body: { result: 'stored' } }));
    env.ctx.processTest();
    assert.deepEqual(env.forbidden, []);
    assert.deepEqual([...new Set(env.gmailCalls)].sort(), ['Attachments.get', 'Messages.get', 'Messages.list']);
    assert.deepEqual(
      env.sent.map((s) => s.url),
      [URL_INGEST]
    );
  });

  it('неверный INGEST_URL — ничего не отправляется', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 200, body: { result: 'stored' } }));
    env.props.set('INGEST_URL', 'https://evil.example/collect');
    env.ctx.processTest();
    assert.equal(env.sent.length, 0);
  });
});

describe('Apps Script ↔ сервер', () => {
  it('checkSetup не выводит значения секретов и замечает пробел в секрете', () => {
    const env = makeEnv([], () => ({ code: 200, body: {} }));
    assert.equal(env.ctx.checkSetup(), true);
    const log = env.logs.join('\n');
    assert.ok(!log.includes(SECRET) && !log.includes(BYPASS) && !log.includes(SECRET.slice(0, 8)));
    assert.match(log, /INGEST_SECRET: задан/);
    env.props.set('INGEST_SECRET', `${SECRET} `);
    assert.equal(env.ctx.checkSetup(), false);
    assert.match(env.logs.join('\n'), /пробел или перенос строки/);
  });

  it('сухой прогон ничего не отправляет и не скачивает вложения', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 200, body: {} }));
    env.ctx.dryRun();
    assert.equal(env.sent.length, 0);
    assert.ok(!env.gmailCalls.includes('Attachments.get'));
    assert.match(env.logs.join('\n'), /на сайт ничего не отправлено/);
    assert.match(env.logs.join('\n'), /photo\.png \(image\/png, \d+ байт, будет передано\)/);
    assert.match(env.logs.join('\n'), /prikaz\.pdf \(application\/pdf, \d+ байт, не передаётся\)/);
  });

  it('подпись скрипта принимается сервером; письмо — во входящих, публикация не создана, PDF не обработан', async () => {
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
    const pdf = JSON.parse(req.payload).attachments.find((a: { name: string }) => a.name === 'prikaz.pdf');
    assert.equal(pdf.data, undefined);
    assert.equal(pdf.text, undefined, 'PDF не обрабатывается');
    const r = await replay(req);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.result, 'stored');
    assert.equal((await hvalsJson('dn:ann')).length, annBefore, 'публикация не создана');
    const list = await (await sources(new Request('http://localhost/api/sources?mail=list', { headers: { Authorization: `Bearer ${admin}` } }))).json();
    const item = list.items.find((m: { id: string }) => m.id === TEST_MSG.id);
    assert.ok(item);
    assert.equal(item.suggestion.draft.startDate, '2026-11-30T10:00');
    assert.equal(item.from.address, 'aigul@example.com');
    assert.ok(item.attachments.find((a: { name: string }) => a.name === 'photo.png').storedKey, 'фото сохранено');
    assert.equal(item.attachments.find((a: { name: string }) => a.name === 'prikaz.pdf').text, undefined);
    assert.equal(item.permalink, `https://mail.google.com/mail/u/0/#all/t${TEST_MSG.id}`);
    assert.ok(!env.logs.join('\n').includes(SECRET) && !env.logs.join('\n').includes(BYPASS));
  });

  it('письмо только в HTML — текст извлекается без разметки', async () => {
    let captured: any = null;
    const env = makeEnv([{ ...TEST_MSG, id: '19a2b3c4d5e6f7c1', html: true, body: `${TEST_MSG.body}\nИсх. html`, atts: [] }], (req) => {
      captured = req;
      return { code: 200, body: { result: 'stored' } };
    });
    env.ctx.processTest();
    const text = JSON.parse(captured.payload).text as string;
    assert.ok(text.includes('30 ноября 2026 года в 10:00'));
    assert.ok(!/<[a-z]/i.test(text), 'без HTML-тегов');
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

  it('приём выключен (503) — скрипт останавливается и не запоминает письмо: оно уйдёт позже', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 503, body: { error: 'mail_paused', message: 'Приём почты выключен в панели администратора' } }));
    const r = env.ctx.processTest();
    assert.equal(r.stopped, 'mail_paused');
    assert.ok(!env.props.get('PROCESSED_IDS') || !env.props.get('PROCESSED_IDS')!.includes(TEST_MSG.id));
  });

  it('страница входа Vercel (401, не JSON) — остановка, письмо не запоминается', () => {
    const env = makeEnv([TEST_MSG], () => ({ code: 401, body: '<html>Log in to Vercel</html>' }));
    const r = env.ctx.processTest();
    assert.equal(r.stopped, 'vercel_protection_or_auth');
    assert.ok(!env.props.get('PROCESSED_IDS'));
  });

  it('тема латиницей «TEST DataNews» и кириллицей «ТЕСТ DataNews» — обе принимаются; другие письма — нет', () => {
    const env = makeEnv(
      [
        { ...TEST_MSG, id: 'lat1lat1lat1', subject: 'TEST DataNews', atts: [] },
        { ...TEST_MSG, id: 'cyr1cyr1cyr1', subject: 'ТЕСТ DataNews', atts: [] },
        { ...TEST_MSG, id: 'oth1oth1oth1', subject: 'Отключение воды', atts: [] },
        { ...TEST_MSG, id: 'oth2oth2oth2', subject: 'Test datanews', atts: [] },
      ],
      () => ({ code: 200, body: { result: 'stored' } })
    );
    env.ctx.processTest();
    assert.deepEqual(env.sent.map((s) => JSON.parse(s.payload).subject).sort(), ['TEST DataNews', 'ТЕСТ DataNews']);
    assert.match(env.gmailQueries.at(-1)!, /^\(subject:"TEST DataNews" OR subject:"ТЕСТ DataNews"\) newer_than:7d$/);
  });

  it('служебные письма Google и Claude не отправляются даже с тестовой темой', () => {
    const env = makeEnv(
      [
        { ...TEST_MSG, id: 'svc1svc1svc1', subject: 'TEST DataNews', from: 'Google <no-reply@accounts.google.com>' },
        { ...TEST_MSG, id: 'svc2svc2svc2', subject: 'TEST DataNews', from: 'Claude <no-reply@email.claude.com>' },
      ],
      () => ({ code: 200, body: { result: 'stored' } })
    );
    env.ctx.processTest();
    assert.equal(env.sent.length, 0);
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
