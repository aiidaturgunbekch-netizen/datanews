/**
 * Вход администратора и подключение к Upstash Redis.
 * Сеть подменяется: настоящая база и настоящие секреты не используются.
 * Запуск: npm test
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import auth from '../api/auth';

const TOKEN = 'test-rest-token-123';
const URL_OK = 'https://test-db.upstash.io';
const PASSWORD = 'test-admin-password';

type Mode = 'ok' | 'readonly' | 'down' | 'http500' | 'html' | 'forbidden' | 'echo';
let mode: Mode = 'ok';
let counter = 0;
const realFetch = globalThis.fetch;
let logs: string[] = [];
const realError = console.error;

/** Поддельный Upstash REST: проверяет токен, считает INCR, отвечает PING */
const fakeUpstash = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!/^https?:\/\//.test(url)) return realFetch(input, init); // как в Edge: неверный адрес — исключение fetch
  if (mode === 'down') throw new TypeError('fetch failed');
  const headers = new Headers(init?.headers);
  if (mode === 'echo') return new Response(`{"error":"Unauthorized: ${headers.get('authorization')} at ${url}"}`, { status: 401 });
  if (headers.get('authorization') !== `Bearer ${TOKEN}`) return new Response('{"error":"Unauthorized"}', { status: 401 });
  if (mode === 'forbidden') return new Response('{"error":"Forbidden"}', { status: 403 });
  if (mode === 'http500') return new Response('oops', { status: 500 });
  if (mode === 'html') return new Response('<html>not json</html>', { status: 200 });
  const cmds = JSON.parse(String(init?.body)) as string[][];
  return new Response(
    JSON.stringify(
      cmds.map(([name]) => {
        if (mode === 'readonly' && name !== 'PING') return { error: 'NOPERM this user has no permissions to run the incr command' };
        if (name === 'INCR') return { result: ++counter };
        if (name === 'PING') return { result: 'PONG' };
        return { result: 1 };
      })
    ),
    { status: 200 }
  );
};

let ip = 0;
const login = (password: string, sameIp = false) =>
  auth(
    new Request('https://preview.example/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': sameIp ? '10.0.0.1' : `10.1.${Math.floor(++ip / 250)}.${ip % 250}` },
      body: JSON.stringify({ action: 'admin-login', password }),
    })
  );
const setEnv = (vars: Record<string, string | undefined>) => {
  for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'DATANEWS_MEMORY_KV', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'VERCEL_GIT_COMMIT_SHA'])
    delete process.env[k];
  Object.assign(process.env, { ADMIN_PASSWORD: PASSWORD, AUTH_SECRET: 'test-auth-secret' }, vars);
};
/** Ни тело ответа, ни лог не должны содержать токен, пароль или адрес базы */
const assertNoSecrets = (text: string) => {
  for (const secret of [TOKEN, PASSWORD, 'test-db.upstash.io', 'test-auth-secret']) assert.ok(!text.includes(secret), `утечка: ${secret}`);
};

beforeEach(() => {
  mode = 'ok';
  counter = 0;
  logs = [];
  globalThis.fetch = fakeUpstash as typeof fetch;
  console.error = (...a: unknown[]) => logs.push(a.map(String).join(' '));
  setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

describe('вход администратора', () => {
  it('правильный пароль → 200 и токен', async () => {
    const r = await login(PASSWORD);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.role, 'admin');
    assert.ok(typeof body.token === 'string' && body.token.includes('.'));
  });

  it('неверный пароль → 401, проверка пароля не отключена', async () => {
    const r = await login('wrong-password');
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error, 'wrong_password');
  });

  it('ограничение попыток: шестая попытка за минуту с одного адреса → 429', async () => {
    for (let i = 0; i < 5; i++) assert.equal((await login('wrong', true)).status, 401);
    assert.equal((await login(PASSWORD, true)).status, 429);
  });

  it('без ADMIN_PASSWORD вход невозможен → 503 admin_not_configured', async () => {
    setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN, ADMIN_PASSWORD: '' });
    const r = await login('anything');
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, 'admin_not_configured');
  });

  it('имена UPSTASH_REDIS_REST_* тоже работают', async () => {
    setEnv({ UPSTASH_REDIS_REST_URL: URL_OK, UPSTASH_REDIS_REST_TOKEN: TOKEN });
    assert.equal((await login(PASSWORD)).status, 200);
  });
});

describe('значения переменных из панели Vercel', () => {
  for (const [name, vars] of [
    ['кавычки вокруг значений', { KV_REST_API_URL: `"${URL_OK}"`, KV_REST_API_TOKEN: `'${TOKEN}'` }],
    ['пробелы и перенос строки', { KV_REST_API_URL: ` ${URL_OK}/ `, KV_REST_API_TOKEN: `${TOKEN}\n` }],
    ['адрес без https://', { KV_REST_API_URL: 'test-db.upstash.io', KV_REST_API_TOKEN: TOKEN }],
  ] as const) {
    it(`${name} → вход работает`, async () => {
      setEnv(vars);
      assert.equal((await login(PASSWORD)).status, 200);
    });
  }
});

describe('понятные ошибки подключения вместо «Ошибка сервера»', () => {
  const cases: [string, () => void, string][] = [
    ['адрес redis://', () => setEnv({ KV_REST_API_URL: 'rediss://default:pw@test-db.upstash.io:6379', KV_REST_API_TOKEN: TOKEN }), 'storage_bad_url'],
    ['неверный токен', () => setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'wrong-token' }), 'storage_auth_failed'],
    ['HTTP 403 от Upstash', () => (mode = 'forbidden'), 'storage_auth_failed'],
    ['адрес страницы консоли', () => setEnv({ KV_REST_API_URL: 'https://console.upstash.com/redis/abc-123', KV_REST_API_TOKEN: TOKEN }), 'storage_bad_url'],
    ['перенос строки внутри токена', () => setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'test-rest\ntoken-123' }), 'storage_bad_token'],
    ['маска ••• в токене', () => setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'test-rest-••••' }), 'storage_bad_token'],
    ['токен только для чтения', () => (mode = 'readonly'), 'storage_readonly'],
    ['база не отвечает', () => (mode = 'down'), 'storage_unreachable'],
    ['ответ 500 от Upstash', () => (mode = 'http500'), 'storage_error'],
    ['ответ не JSON', () => (mode = 'html'), 'storage_error'],
  ];
  for (const [name, arrange, code] of cases) {
    it(`${name} → 503 ${code}, без секретов в ответе и логе`, async () => {
      arrange();
      const r = await login(PASSWORD);
      const text = await r.text();
      assert.equal(r.status, 503);
      const body = JSON.parse(text);
      assert.equal(body.error, code);
      assert.ok(body.message && body.message.length > 10, 'есть понятное сообщение');
      assertNoSecrets(text);
      assertNoSecrets(logs.join('\n'));
      assert.ok(logs.some((l) => l.includes(code)), 'в логе Vercel виден код причины');
    });
  }

  it('нет переменных базы → 503 storage_not_configured', async () => {
    setEnv({});
    assert.equal((await login(PASSWORD)).status, 503);
  });
});

describe('проверка базы без пароля: GET /api/auth?check=storage', () => {
  const check = () => auth(new Request('https://preview.example/api/auth?check=storage'));
  it('база доступна → { storage: "ok" }', async () => {
    const r = await check();
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { storage: 'ok' });
  });
  it('неверный токен → 503 storage_auth_failed без секретов', async () => {
    setEnv({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'wrong-token' });
    const r = await check();
    const text = await r.text();
    assert.equal(r.status, 503);
    assert.equal(JSON.parse(text).error, 'storage_auth_failed');
    assertNoSecrets(text);
  });
});

describe('подробный отчёт ?check=storage на Preview (без секретов)', () => {
  const report = async () => {
    const r = await auth(new Request('https://preview.example/api/auth?check=storage'));
    const text = await r.text();
    assertNoSecrets(text);
    return { status: r.status, body: JSON.parse(text) };
  };
  const preview = (vars: Record<string, string>) =>
    setEnv({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'claude/datanews-events-moderation-stats-w1kyl5', VERCEL_GIT_COMMIT_SHA: 'abcdef1234567', ...vars });

  it('всё в порядке → ok, имена переменных, сборка, формат', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN });
    const { status, body } = await report();
    assert.equal(status, 200);
    assert.equal(body.storage, 'ok');
    assert.deepEqual(body.deployment, { environment: 'preview', branch: 'claude/datanews-events-moderation-stats-w1kyl5', commit: 'abcdef1' });
    assert.equal(body.variables.urlFrom, 'KV_REST_API_URL');
    assert.equal(body.variables.tokenFrom, 'KV_REST_API_TOKEN');
    assert.equal(body.url.hostType, 'upstash-rest');
    assert.equal(body.token.length, TOKEN.length);
    assert.equal(body.token.whitespaceAtEdges, false);
  });

  it('HTTP 401 → статус, текст Upstash и вывод', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'other-db-token' });
    const { body } = await report();
    assert.equal(body.storage, 'storage_auth_failed');
    assert.equal(body.upstash.httpStatus, 401);
    assert.match(body.upstash.upstashError, /Unauthorized/);
    assert.ok(body.conclusion.some((n: string) => n.includes('HTTP 401')));
  });

  it('HTTP 403 отличается от 401', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN });
    mode = 'forbidden';
    assert.equal((await report()).body.upstash.httpStatus, 403);
  });

  it('ответ Upstash с токеном и адресом внутри — они скрыты', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN });
    mode = 'echo';
    const { body } = await report();
    assert.match(body.upstash.upstashError, /\[скрыто\]/);
  });

  it('перенос строки внутри токена → тип ошибки отправки и признак в формате', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'test-rest\ntoken-123' });
    const { body } = await report();
    assert.equal(body.storage, 'storage_bad_token');
    assert.equal(body.upstash.sendError, 'header');
    assert.equal(body.token.lineBreakInside, true);
  });

  it('маска ••• → invalid_char и счётчик нелатинских символов', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'test-rest-••••' });
    const { body } = await report();
    assert.equal(body.upstash.sendError, 'invalid_char');
    assert.equal(body.token.nonAsciiChars, 4);
  });

  it('страница консоли вместо REST-адреса', async () => {
    preview({ KV_REST_API_URL: 'https://console.upstash.com/redis/abc-123', KV_REST_API_TOKEN: TOKEN });
    const { body } = await report();
    assert.equal(body.url.hostType, 'upstash-console-page');
    assert.equal(body.url.hasPath, true);
    assert.equal(body.storage, 'storage_bad_url');
  });

  it('вставлено имя переменной и пробелы по краям', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: ` UPSTASH_REDIS_REST_TOKEN=${TOKEN} ` });
    const { body } = await report();
    assert.equal(body.token.variableNamePasted, true);
    assert.equal(body.token.whitespaceAtEdges, true);
  });

  it('имена UPSTASH_REDIS_REST_* видны в отчёте', async () => {
    preview({ UPSTASH_REDIS_REST_URL: URL_OK, UPSTASH_REDIS_REST_TOKEN: TOKEN });
    const { body } = await report();
    assert.equal(body.variables.urlFrom, 'UPSTASH_REDIS_REST_URL');
    assert.deepEqual(body.variables.presentNames, ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']);
  });

  it('переменные не дошли до сборки → storage_not_configured', async () => {
    preview({});
    const { body } = await report();
    assert.equal(body.storage, 'storage_not_configured');
    assert.equal(body.variables.urlFrom, null);
  });

  it('на Production — только краткий ответ, без отчёта', async () => {
    setEnv({ VERCEL_ENV: 'production', KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: 'other-db-token' });
    const r = await auth(new Request('https://site.example/api/auth?check=storage'));
    const body = await r.json();
    assert.equal(body.error, 'storage_auth_failed');
    assert.equal(body.token, undefined);
    assert.equal(body.upstash, undefined);
  });

  it('вход по паролю на Preview работает как раньше', async () => {
    preview({ KV_REST_API_URL: URL_OK, KV_REST_API_TOKEN: TOKEN });
    assert.equal((await login(PASSWORD)).status, 200);
    assert.equal((await login('wrong')).status, 401);
  });
});
