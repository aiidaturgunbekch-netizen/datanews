/**
 * Приём писем из редакционной почты (Apps Script → /api/sources?mail=ingest).
 * Тесты на образцах писем — настоящая почта здесь не используется.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;
const SECRET = 'test-mail-secret-0123456789abcdef-XYZ';
process.env.MAIL_INGEST_SECRET = SECRET;

const { default: auth } = await import('../api/auth');
const { default: sources } = await import('../api/sources');
const { default: announcements } = await import('../api/announcements');
const { hmacHex, MAIL_KEY } = await import('../api/_lib/mail');
const { cmd, hvalsJson } = await import('../api/_lib/kv');

const BASE = 'http://localhost/api/sources';
let nonceN = 0;
const newNonce = () => `nonce-${Date.now()}-${++nonceN}-abcdefgh`;

/** Подписанный запрос так же, как его делает Apps Script */
const signed = async (payload: unknown, opts: { ts?: number; nonce?: string; secret?: string; body?: string } = {}) => {
  const body = opts.body ?? JSON.stringify(payload);
  const ts = String(opts.ts ?? Date.now());
  const nonce = opts.nonce ?? newNonce();
  const sig = await hmacHex(opts.secret ?? SECRET, `${ts}.${nonce}.${body}`);
  return new Request(`${BASE}?mail=ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-datanews-timestamp': ts, 'x-datanews-nonce': nonce, 'x-datanews-signature': sig, 'x-forwarded-for': '10.0.0.1' },
    body,
  });
};
const send = async (req: Request) => {
  const r = await sources(req);
  return { status: r.status, body: (await r.json()) as Record<string, any>, text: '' };
};

let admin = '';
const adminGet = async (q: string) => {
  const r = await sources(new Request(`${BASE}?${q}`, { headers: { Authorization: `Bearer ${admin}` } }));
  return { status: r.status, body: (await r.json()) as Record<string, any> };
};
const getItem = async (id: string) => (await adminGet('mail=list')).body.items.find((m: { id: string }) => m.id === id);

const letter = (over: Record<string, unknown> = {}) => ({
  messageId: `msg${Math.random().toString(36).slice(2, 12)}`,
  threadId: `thr${Math.random().toString(36).slice(2, 12)}`,
  rfcMessageId: `<${Math.random().toString(36).slice(2)}@mail.example.kg>`,
  from: 'Пресс-служба <press@example.gov.kg>',
  subject: 'Отключение холодной воды в Бишкеке',
  receivedAt: '2026-10-25T08:00:00Z',
  // номер в конце — чтобы разные тестовые письма не совпадали по содержанию (иначе это «дубль»)
  text: `Отключение холодной воды 28 октября 2026 года с 09:00 до 17:00.\nПо адресу: ул. Токтогула, 100, г. Бишкек.\nИсх. № ${Math.random().toString(36).slice(2, 8)}`,
  authResults: 'mx.google.com; dkim=pass header.i=@example.gov.kg; spf=pass; dmarc=pass',
  permalink: 'https://mail.google.com/mail/u/0/#inbox/abc',
  attachments: [],
  ...over,
});

const annCount = async () => (await hvalsJson(('dn:ann'))).length;

before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
});
after(() => {
  delete process.env.MAIL_INGEST_SECRET;
  delete process.env.MAIL_INGEST_ENABLED;
});

const setSwitch = async (enabled: boolean, token = admin) =>
  sources(
    new Request(`${BASE}?mail=settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ enabled }),
    })
  );

describe('выключатель «Приём почты» и только Preview', () => {
  it('по умолчанию приём выключен — письмо не принимается и не сохраняется', async () => {
    const l = letter();
    const r = await send(await signed(l));
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'mail_paused');
    assert.equal(await cmd('HGET', MAIL_KEY, l.messageId), null);
  });

  it('выключатель доступен только администратору', async () => {
    assert.equal((await setSwitch(true, '')).status, 403);
    assert.equal((await sources(new Request(`${BASE}?mail=settings`))).status, 403);
  });

  it('администратор включает приём; состояние без значений секретов', async () => {
    const r = await setSwitch(true);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(!text.includes(SECRET));
    const st = JSON.parse(text);
    assert.equal(st.enabled, true);
    assert.equal(st.environment, 'local');
    assert.equal(st.secretConfigured, true);
    assert.equal((await send(await signed(letter()))).body.result, 'stored');
  });

  it('выключение останавливает приём новых писем и не трогает публикации и уже принятые письма', async () => {
    const before = await annCount();
    const mailBefore = (await hvalsJson(MAIL_KEY)).length;
    assert.equal((await setSwitch(false)).status, 200);
    const l = letter();
    const r = await send(await signed(l));
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'mail_paused');
    assert.equal(await cmd('HGET', MAIL_KEY, l.messageId), null);
    assert.equal((await hvalsJson(MAIL_KEY)).length, mailBefore);
    assert.equal(await annCount(), before);
    assert.equal((await setSwitch(true)).status, 200);
    assert.equal((await send(await signed(l))).body.result, 'stored', 'после включения письмо принимается');
  });

  it('на Production приём отключён даже при заданном секрете и включённом выключателе', async () => {
    process.env.VERCEL_ENV = 'production';
    try {
      const l = letter();
      const r = await send(await signed(l));
      assert.equal(r.status, 503);
      assert.equal(r.body.error, 'mail_production_disabled');
      assert.equal(await cmd('HGET', MAIL_KEY, l.messageId), null);
      assert.equal((await setSwitch(true)).status, 403, 'включить на Production нельзя');
      const st = await (await sources(new Request(`${BASE}?mail=settings`, { headers: { Authorization: `Bearer ${admin}` } }))).json();
      assert.equal(st.productionBlocked, true);
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });

  it('в Preview-сборке приём работает', async () => {
    process.env.VERCEL_ENV = 'preview';
    try {
      assert.equal((await send(await signed(letter()))).body.result, 'stored');
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });
});

describe('подпись запроса', () => {
  it('корректная подпись — письмо принято как входящий материал, публикация не создаётся', async () => {
    const before = await annCount();
    const l = letter();
    const r = await send(await signed(l));
    assert.equal(r.status, 200);
    assert.equal(r.body.result, 'stored');
    assert.equal(r.body.status, 'new');
    assert.ok(r.body.flags.includes('needs_review'), 'всегда «Требует проверки»');
    assert.equal(await annCount(), before, 'в dn:ann ничего не добавилось');
    const item = await getItem(l.messageId);
    assert.equal(item.from.address, 'press@example.gov.kg');
    assert.equal(item.suggestion.draft.startDate, '2026-10-28T09:00');
    assert.ok(item.suggestion.draft.location.ru.includes('Токтогула'));
    assert.equal(item.suggestion.draft.isVerified, undefined, '«Подтверждено» письмо не ставит');
    // на сайте (публичный список) письма нет
    const pub = await (await announcements(new Request('http://localhost/api/announcements'))).json();
    assert.ok(!JSON.stringify(pub).includes(l.messageId));
  });

  it('неверная подпись — 401, ничего не сохранено', async () => {
    const l = letter();
    const r = await send(await signed(l, { secret: 'wrong-secret-wrong-secret-wrong-secret' }));
    assert.equal(r.status, 401);
    assert.equal(r.body.error, 'bad_signature');
    assert.equal(await cmd('HGET', MAIL_KEY, l.messageId), null);
  });

  it('подмена тела после подписи — 401', async () => {
    const l = letter();
    const req = await signed(l);
    const tampered = new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({ ...l, subject: 'Подмена' }) });
    assert.equal((await send(tampered)).status, 401);
  });

  it('без подписи и со входом администратора вместо подписи — 401', async () => {
    const r = await sources(new Request(`${BASE}?mail=ingest`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify(letter()) }));
    assert.equal(r.status, 401);
  });

  it('просроченный запрос (старше 5 минут) — 401 expired', async () => {
    const r = await send(await signed(letter(), { ts: Date.now() - 6 * 60_000 }));
    assert.equal(r.status, 401);
    assert.equal(r.body.error, 'expired');
  });

  it('повторная отправка того же подписанного запроса — 409 replay', async () => {
    const l = letter();
    const nonce = newNonce();
    assert.equal((await send(await signed(l, { nonce }))).status, 200);
    const again = await send(await signed(l, { nonce }));
    assert.equal(again.status, 409);
    assert.equal(again.body.error, 'replay');
  });

  it('секрет не попадает в ответы', async () => {
    const r = await sources(await signed(letter({ messageId: 'msgsecretcheck1' })));
    assert.ok(!(await r.text()).includes(SECRET));
    const bad = await sources(await signed(letter(), { secret: 'x'.repeat(40) }));
    assert.ok(!(await bad.text()).includes(SECRET));
  });
});

describe('повторы и дубли', () => {
  it('то же письмо Gmail ещё раз (новая подпись) — «already», вторая запись не создаётся', async () => {
    const l = letter();
    assert.equal((await send(await signed(l))).body.result, 'stored');
    const count = (await hvalsJson(MAIL_KEY)).length;
    const r = await send(await signed(l));
    assert.equal(r.status, 200);
    assert.equal(r.body.result, 'already');
    assert.equal((await hvalsJson(MAIL_KEY)).length, count);
  });

  it('то же содержание под другим идентификатором — помечено как дубль', async () => {
    const first = letter({ subject: 'Концерт в филармонии', text: 'Концерт состоится 5 декабря 2026 года в 19:00.\nПо адресу: пр. Чуй, 253.' });
    await send(await signed(first));
    const copy = { ...first, messageId: `msg${Math.random().toString(36).slice(2, 12)}`, rfcMessageId: undefined };
    const r = await send(await signed(copy));
    assert.equal(r.body.status, 'duplicate');
    assert.equal((await getItem(copy.messageId)).duplicateOf, first.messageId);
  });

  it('перенос даты от того же отправителя — «возможно исправление», новая публикация не создаётся', async () => {
    const before = await annCount();
    const orig = letter({ subject: 'Ярмарка выходного дня на площади', text: 'Ярмарка пройдёт 7 ноября 2026 года.\nПо адресу: ул. Киевская, 1.' });
    await send(await signed(orig));
    const moved = letter({ subject: 'Перенос: ярмарка выходного дня на площади', text: 'Ярмарка переносится на 14 ноября 2026 года.\nПо адресу: ул. Киевская, 1.' });
    const r = await send(await signed(moved));
    assert.ok(r.body.flags.includes('possible_correction'));
    assert.ok((await getItem(moved.messageId)).relatedIds.includes(orig.messageId));
    assert.equal(await annCount(), before);
  });
});

describe('содержание письма', () => {
  it('письмо без даты — дата не придумывается, дата получения не становится датой события', async () => {
    const l = letter({ subject: 'Информационное сообщение', text: 'Уважаемые жители! Подробности будут сообщены дополнительно.' });
    const r = await send(await signed(l));
    assert.equal(r.status, 200);
    assert.ok(r.body.flags.includes('no_date'));
    assert.ok(r.body.flags.includes('no_place'));
    const item = await getItem(l.messageId);
    assert.equal(item.suggestion.draft.startDate, undefined);
    assert.equal(item.suggestion.draft.location, undefined);
    assert.ok(item.suggestion.missing.includes('дата'));
    assert.equal(item.receivedAt, '2026-10-25T08:00:00.000Z');
  });

  it('письмо с фото — временная копия доступна только администратору; слишком большое — пометка', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const l = letter({
      attachments: [
        { name: 'afisha.png', mimeType: 'image/png', size: 70, data: png },
        { name: 'big.jpg', mimeType: 'image/jpeg', size: 5_000_000 }, // скрипт не переслал — слишком большое
      ],
    });
    const r = await send(await signed(l));
    assert.ok(r.body.flags.includes('image_too_large'));
    const item = await getItem(l.messageId);
    const photo = item.attachments[0];
    assert.equal(photo.kind, 'image');
    assert.ok(photo.storedKey);
    assert.equal(item.attachments[1].storedKey, undefined);
    const att = await adminGet(`mail=att&key=${encodeURIComponent(photo.storedKey)}`);
    assert.equal(att.body.dataUrl, `data:image/png;base64,${png}`);
    const anon = await sources(new Request(`${BASE}?mail=att&key=${encodeURIComponent(photo.storedKey)}`));
    assert.equal(anon.status, 403);
  });

  it('письмо с PDF — дата берётся из текста PDF с пометкой «из PDF», сам PDF не хранится', async () => {
    const l = letter({
      subject: 'Постановление мэрии',
      text: 'Направляем постановление во вложении.',
      attachments: [{ name: 'post.pdf', mimeType: 'application/pdf', size: 120_000, text: 'Перекрытие движения 3 ноября 2026 года с 10:00 до 16:00.\nПо адресу: пр. Манаса, 40.' }],
    });
    const r = await send(await signed(l));
    assert.ok(r.body.flags.includes('from_pdf'));
    const item = await getItem(l.messageId);
    assert.equal(item.suggestion.fromPdf, true);
    assert.equal(item.suggestion.draft.startDate, '2026-11-03T10:00');
    assert.equal(item.attachments[0].kind, 'pdf');
    assert.ok(!('data' in item.attachments[0]));
  });

  it('неизвестный отправитель и провал проверки подлинности — пометки', async () => {
    const r = await send(await signed(letter({ from: 'someone@example.com', authResults: 'mx.google.com; spf=fail; dkim=none' })));
    assert.ok(r.body.flags.includes('unknown_sender'));
    assert.ok(r.body.flags.includes('auth_failed'));
  });

  it('ссылки сохраняются только текстом и только http(s)', async () => {
    const l = letter({ text: 'Подробнее: https://example.gov.kg/news/1. Файл: javascript:alert(1) ftp://x.kg/a' });
    await send(await signed(l));
    assert.deepEqual((await getItem(l.messageId)).links, ['https://example.gov.kg/news/1']);
  });
});

describe('действия редактора', () => {
  it('список писем и действия — только администратору', async () => {
    assert.equal((await sources(new Request(`${BASE}?mail=list`))).status, 403);
    const r = await sources(new Request(`${BASE}?mail=action`, { method: 'POST', body: JSON.stringify({ id: 'x', action: 'reject' }) }));
    assert.equal(r.status, 403);
  });

  it('«Отклонить» меняет только статус письма; публикации не затрагиваются', async () => {
    const before = await annCount();
    const l = letter();
    await send(await signed(l));
    const r = await sources(
      new Request(`${BASE}?mail=action`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify({ id: l.messageId, action: 'reject' }) })
    );
    assert.equal(r.status, 200);
    assert.equal((await getItem(l.messageId)).status, 'rejected');
    assert.equal(await annCount(), before);
  });
});

describe('состояние секрета и сборки в панели', () => {
  const status = async () => {
    const r = await sources(new Request(`${BASE}?mail=settings`, { headers: { Authorization: `Bearer ${admin}` } }));
    return { status: r.status, text: await r.text() };
  };
  /** Всё, что пишется в консоль (логи), — чтобы убедиться, что секрета там нет */
  const captureConsole = async (fn: () => Promise<void>) => {
    const out: string[] = [];
    const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
    for (const k of Object.keys(orig) as (keyof typeof orig)[]) console[k] = (...a: unknown[]) => void out.push(a.map(String).join(' '));
    try {
      await fn();
    } finally {
      Object.assign(console, orig);
    }
    return out.join('\n');
  };

  it('«Секрет задан» — без значения, фрагментов и длины', async () => {
    const r = await status();
    assert.equal(r.status, 200);
    const st = JSON.parse(r.text);
    assert.equal(st.secretState, 'ok');
    assert.equal(st.secretConfigured, true);
    assert.ok(!r.text.includes(SECRET) && !r.text.includes(SECRET.slice(0, 8)) && !r.text.includes(SECRET.slice(-8)));
    assert.ok(!r.text.includes(String(SECRET.length)), 'длина секрета не выводится');
  });

  it('«Секрет не задан в этой сборке»', async () => {
    delete process.env.MAIL_INGEST_SECRET;
    try {
      const st = JSON.parse((await status()).text);
      assert.equal(st.secretState, 'missing');
      assert.equal(st.secretConfigured, false);
      const r = await send(await signed(letter()));
      assert.equal(r.status, 503);
      assert.match(r.body.message, /не задан в этой сборке/);
    } finally {
      process.env.MAIL_INGEST_SECRET = SECRET;
    }
  });

  it('«Секрет задан, но короче 32 символов» — значение и длина не выводятся, в логах секрета нет', async () => {
    const SHORT = 'short-secret-Qw7';
    process.env.MAIL_INGEST_SECRET = SHORT;
    try {
      let text = '';
      let ingestText = '';
      const logs = await captureConsole(async () => {
        text = (await status()).text;
        ingestText = await (await sources(await signed(letter(), { secret: SHORT }))).text();
      });
      const st = JSON.parse(text);
      assert.equal(st.secretState, 'too_short');
      assert.equal(st.secretConfigured, false);
      assert.match(JSON.parse(ingestText).message, /короче 32 символов/);
      for (const t of [text, ingestText, logs]) {
        assert.ok(!t.includes(SHORT) && !t.includes(SHORT.slice(0, 6)), 'секрет и его части не выводятся');
        assert.ok(!new RegExp(`\\b${SHORT.length}\\b`).test(t), 'длина секрета не выводится');
      }
    } finally {
      process.env.MAIL_INGEST_SECRET = SECRET;
    }
  });

  it('пробел, перенос строки или кавычки по краям значения в Vercel не мешают подписи (сайт убирает их сам)', async () => {
    process.env.MAIL_INGEST_SECRET = ` "${SECRET}"\n`;
    try {
      assert.equal(JSON.parse((await status()).text).secretState, 'ok');
      const r = await send(await signed(letter()));
      assert.equal(r.status, 200, JSON.stringify(r.body));
    } finally {
      process.env.MAIL_INGEST_SECRET = SECRET;
    }
  });

  it('проверка подписи { ping: true } — ответ pong, ничего не сохраняется; с чужим секретом — bad_signature', async () => {
    const before = (await cmd<string[]>('HKEYS', 'dn:mail')).length;
    const ok = await send(await signed({ ping: true }));
    assert.equal(ok.status, 200);
    assert.equal(ok.body.result, 'pong');
    assert.equal((await cmd<string[]>('HKEYS', 'dn:mail')).length, before);
    const bad = await send(await signed({ ping: true }, { secret: 'y'.repeat(40) }));
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error, 'bad_signature');
  });

  it('секрет не попадает в логи при приёме письма, ошибке подписи и сбое', async () => {
    const logs = await captureConsole(async () => {
      await sources(await signed(letter()));
      await sources(await signed(letter(), { secret: 'y'.repeat(40) }));
      await status();
    });
    assert.ok(!logs.includes(SECRET) && !logs.includes(SECRET.slice(0, 8)));
  });

  it('сборка: окружение, ветка и короткий номер коммита', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'claude/datanews-events-moderation-stats-w1kyl5';
    process.env.VERCEL_GIT_COMMIT_SHA = '42e856f0123456789abcdef0123456789abcdef0';
    try {
      const st = JSON.parse((await status()).text);
      assert.deepEqual(st.build, { environment: 'preview', branch: 'claude/datanews-events-moderation-stats-w1kyl5', commit: '42e856f' });
    } finally {
      delete process.env.VERCEL_ENV;
      delete process.env.VERCEL_GIT_COMMIT_REF;
      delete process.env.VERCEL_GIT_COMMIT_SHA;
    }
  });

  it('приём почты по умолчанию выключен (новая база)', async () => {
    const { MAIL_SETTINGS_KEY, getMailSettings } = await import('../api/_lib/mail');
    const saved = await cmd<string | null>('GET', MAIL_SETTINGS_KEY);
    await cmd('DEL', MAIL_SETTINGS_KEY);
    try {
      assert.equal((await getMailSettings()).enabled, false);
    } finally {
      if (saved) await cmd('SET', MAIL_SETTINGS_KEY, saved);
    }
  });
});

describe('настройка и сбои', () => {
  it('без секрета приём выключен — 503, письмо не сохраняется', async () => {
    delete process.env.MAIL_INGEST_SECRET;
    const r = await send(await signed(letter()));
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'mail_not_configured');
    process.env.MAIL_INGEST_SECRET = SECRET;
  });

  it('выключатель MAIL_INGEST_ENABLED=0 — 503', async () => {
    process.env.MAIL_INGEST_ENABLED = '0';
    const r = await send(await signed(letter()));
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'mail_disabled');
    delete process.env.MAIL_INGEST_ENABLED;
  });

  it('ошибка Redis — 503 без подробностей подключения, скрипт повторит позже', async () => {
    const realFetch = globalThis.fetch;
    process.env.DATANEWS_MEMORY_KV = '0';
    process.env.KV_REST_API_URL = 'https://test-db.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token-123456';
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    try {
      const r = await sources(await signed(letter()));
      assert.equal(r.status, 503);
      const text = await r.text();
      assert.ok(!text.includes('test-token-123456') && !text.includes(SECRET));
    } finally {
      globalThis.fetch = realFetch;
      process.env.DATANEWS_MEMORY_KV = '1';
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    }
  });

  it('Redis отказал при сохранении письма (после проверки подписи) — 503; повторная отправка после сбоя сохраняет письмо', async () => {
    const realFetch = globalThis.fetch;
    const l = letter();
    process.env.DATANEWS_MEMORY_KV = '0';
    process.env.KV_REST_API_URL = 'https://test-db.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token-123456';
    let failedOn = '';
    // Счётчик попыток и одноразовая метка запроса проходят, чтение и запись письма — сбой базы (HTTP 500)
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const cmds = JSON.parse(String(init.body)) as string[][];
      // выключатель в панели включён
      if (String(cmds[0][0]).toUpperCase() === 'GET' && cmds[0][1] === 'dn:mail:settings') {
        return new Response(JSON.stringify([{ result: JSON.stringify({ enabled: true }) }]), { status: 200 });
      }
      if (cmds.every((c) => ['INCR', 'EXPIRE', 'SET'].includes(String(c[0]).toUpperCase()))) {
        return new Response(JSON.stringify(cmds.map((c) => ({ result: String(c[0]).toUpperCase() === 'SET' ? 'OK' : 1 }))), { status: 200 });
      }
      failedOn = String(cmds[0][0]);
      return new Response('internal', { status: 500 });
    }) as typeof fetch;
    try {
      const r = await sources(await signed(l));
      assert.equal(r.status, 503);
      assert.equal((await r.json()).error, 'storage_error');
      assert.ok(['HGET', 'HSETNX', 'HVALS'].includes(failedOn.toUpperCase()), `сбой на записи/чтении письма (${failedOn})`);
    } finally {
      globalThis.fetch = realFetch;
      process.env.DATANEWS_MEMORY_KV = '1';
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    }
    // Скрипт не поставил ярлык «обработано» и отправил письмо снова с новой подписью
    const retry = await send(await signed(l));
    assert.equal(retry.body.result, 'stored');
  });

  it('публичный список источников работает как раньше', async () => {
    const r = await sources(new Request(BASE));
    assert.equal(r.status, 200);
    assert.ok(Array.isArray((await r.json()).sources));
  });
});
