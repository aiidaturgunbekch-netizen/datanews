/**
 * Минимальный клиент Redis (Upstash REST API) без внешних зависимостей.
 *
 * В Vercel: Storage → Upstash for Redis → Connect. Интеграция сама добавит
 * KV_REST_API_URL и KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_URL / _TOKEN).
 *
 * Для локальной разработки (npm run dev) используется хранилище в памяти —
 * его включает vite.config.ts через DATANEWS_MEMORY_KV=1.
 */

import { env } from './env';

type Cmd = (string | number)[];

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('storage_not_configured');
  }
}

/**
 * Ошибка подключения к базе с понятной причиной (ответ 503). Сообщение не содержит адреса базы и токена.
 *   storage_bad_url      — в KV_REST_API_URL не REST-адрес (например, redis://… или адрес без https://)
 *   storage_auth_failed  — Upstash не принял токен (неверный или от другой базы)
 *   storage_readonly     — токен «только для чтения»
 *   storage_unreachable  — база не отвечает
 *   storage_error        — другой ответ Upstash
 */
export class StorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public detail = '',
    /** Для диагностики: HTTP-статус Upstash и короткий текст его ошибки (без токена) */
    public facts: { httpStatus?: number; upstashError?: string; sendError?: 'header' | 'invalid_char' | 'network' } = {}
  ) {
    super(message);
  }
}

/** Тип REST-адреса без самого адреса: REST-адрес базы, страница консоли или что-то другое */
export const describeRestUrl = (raw: string | undefined) => {
  const v = (raw ?? '').trim().replace(/^(['"])(.*)\1$/s, '$2').trim();
  if (!v) return { scheme: null, hostType: 'missing', hasPath: false };
  if (/^rediss?:\/\//i.test(v)) return { scheme: v.split(':')[0].toLowerCase(), hostType: 'redis-connection-string', hasPath: false };
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.toLowerCase();
    const hostType =
      host === 'console.upstash.com' || host.endsWith('.console.upstash.com')
        ? 'upstash-console-page'
        : host.endsWith('.upstash.io')
        ? 'upstash-rest'
        : host === 'localhost' || host === '127.0.0.1'
        ? 'local'
        : 'other';
    return { scheme: u.protocol.replace(':', ''), hostType, hasPath: u.pathname !== '/' && u.pathname !== '' };
  } catch {
    return { scheme: null, hostType: 'not-a-url', hasPath: false };
  }
};

/** Текст ошибки Upstash без токена и адреса: только короткое пояснение вроде «Unauthorized» */
const safeUpstashText = (body: string, token: string, url: string) =>
  body
    .split(token)
    .join('[скрыто]')
    .split(url)
    .join('[адрес]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [скрыто]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

const restToken = () => env('KV_REST_API_TOKEN');
/** REST-адрес Upstash: https://<имя>.upstash.io. Голое имя хоста дополняем https:// */
const restUrl = () => {
  const raw = env('KV_REST_API_URL');
  if (!raw) return undefined;
  if (/^rediss?:\/\//i.test(raw)) {
    throw new StorageError(
      'storage_bad_url',
      'KV_REST_API_URL содержит адрес вида redis://… Нужен REST-адрес https://…upstash.io из раздела «REST API» консоли Upstash.'
    );
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new StorageError('storage_bad_url', 'KV_REST_API_URL не похож на адрес. Нужен REST-адрес https://…upstash.io из консоли Upstash.');
  }
  if (u.hostname === 'console.upstash.com' || u.hostname.endsWith('.console.upstash.com')) {
    throw new StorageError(
      'storage_bad_url',
      'KV_REST_API_URL — это адрес страницы консоли Upstash, а не REST-адрес базы. Нужно значение UPSTASH_REDIS_REST_URL из раздела «REST API» (https://…upstash.io).'
    );
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) {
    throw new StorageError('storage_bad_url', 'KV_REST_API_URL должен начинаться с https://');
  }
  return u.origin + u.pathname.replace(/\/$/, '');
};

// ---------- in-memory implementation (dev only) ----------
const mem: { strings: Map<string, string>; hashes: Map<string, Map<string, string>>; sets: Map<string, Set<string>> } =
  ((globalThis as any).__datanewsMemKv ||= {
    strings: new Map(),
    hashes: new Map(),
    sets: new Map(),
  });

const hash = (k: string) => {
  let h = mem.hashes.get(k);
  if (!h) mem.hashes.set(k, (h = new Map()));
  return h;
};

const runMemory = (cmd: Cmd): unknown => {
  const [name, ...rawArgs] = cmd;
  const args = rawArgs.map(String);
  switch (String(name).toUpperCase()) {
    case 'PING':
      return 'PONG';
    case 'GET':
      return mem.strings.get(args[0]) ?? null;
    case 'SET': {
      // поддерживается SET key value [NX] [EX seconds] — срок жизни в памяти не отслеживается
      const nx = args.slice(2).some((a) => a.toUpperCase() === 'NX');
      if (nx && mem.strings.has(args[0])) return null;
      mem.strings.set(args[0], args[1]);
      return 'OK';
    }
    case 'DEL':
      return args.reduce((n, k) => n + (mem.strings.delete(k) ? 1 : 0), 0);
    case 'DECR': {
      const v = Number(mem.strings.get(args[0]) || 0) - 1;
      mem.strings.set(args[0], String(v));
      return v;
    }
    case 'INCR': {
      const v = Number(mem.strings.get(args[0]) || 0) + 1;
      mem.strings.set(args[0], String(v));
      return v;
    }
    case 'HGET':
      return hash(args[0]).get(args[1]) ?? null;
    case 'HSET':
      for (let i = 1; i < args.length; i += 2) hash(args[0]).set(args[i], args[i + 1]);
      return 1;
    case 'HDEL':
      return hash(args[0]).delete(args[1]) ? 1 : 0;
    case 'HGETALL': {
      const out: string[] = [];
      hash(args[0]).forEach((v, k) => out.push(k, v));
      return out;
    }
    case 'HVALS':
      return [...hash(args[0]).values()];
    case 'HKEYS':
      return [...hash(args[0]).keys()];
    case 'HINCRBY': {
      const h = hash(args[0]);
      const v = Number(h.get(args[1]) || 0) + Number(args[2]);
      h.set(args[1], String(v));
      return v;
    }
    case 'PFADD': {
      let s = mem.sets.get(args[0]);
      if (!s) mem.sets.set(args[0], (s = new Set()));
      const before = s.size;
      args.slice(1).forEach((x) => s!.add(x));
      return s.size > before ? 1 : 0;
    }
    case 'PFCOUNT': {
      const union = new Set<string>();
      args.forEach((k) => mem.sets.get(k)?.forEach((x) => union.add(x)));
      return union.size;
    }
    case 'EXPIRE':
      return 1;
    default:
      throw new Error(`memory kv: unsupported ${String(name)}`);
  }
};

// ---------- public API ----------
export const isMemoryMode = () => env('DATANEWS_MEMORY_KV') === '1';

export const isConfigured = () => isMemoryMode() || Boolean(env('KV_REST_API_URL') && restToken());

export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (cmds.length === 0) return [];
  if (isMemoryMode()) return cmds.map(runMemory);
  const url = restUrl();
  const token = restToken();
  if (!url || !token) throw new StorageNotConfiguredError();

  let res: Response;
  try {
    res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
  } catch (e) {
    // Текст исключения не логируем и не показываем: в нём может оказаться заголовок с токеном.
    // Недопустимый символ в токене (маска •••, кириллица, перенос строки) — исключение до отправки запроса.
    const msg = e instanceof Error ? String(e.message) : '';
    const sendError = /ByteString|character at index/i.test(msg) ? 'invalid_char' : e instanceof TypeError && /header/i.test(msg) ? 'header' : 'network';
    if (sendError !== 'network') {
      throw new StorageError(
        'storage_bad_token',
        'KV_REST_API_TOKEN содержит недопустимые символы (например, перенос строки, невидимый символ или скрытую маску •••), поэтому запрос к Upstash не отправлен.',
        sendError,
        { sendError }
      );
    }
    throw new StorageError('storage_unreachable', 'База данных Upstash не отвечает. Проверьте KV_REST_API_URL и что база не удалена.', 'network', { sendError });
  }
  if (!res.ok) {
    const upstashError = safeUpstashText(await res.text().catch(() => ''), token, url);
    const facts = { httpStatus: res.status, upstashError };
    if (res.status === 401 || res.status === 403) {
      throw new StorageError(
        'storage_auth_failed',
        `Upstash не принял KV_REST_API_TOKEN (HTTP ${res.status}): токен не подходит к этому адресу базы.`,
        `http ${res.status}`,
        facts
      );
    }
    throw new StorageError('storage_error', `Ошибка базы данных Upstash (HTTP ${res.status}).`, `http ${res.status}`, facts);
  }
  let data: { result?: unknown; error?: string }[];
  try {
    data = (await res.json()) as { result?: unknown; error?: string }[];
  } catch {
    throw new StorageError('storage_error', 'Upstash вернул неожиданный ответ. Проверьте, что KV_REST_API_URL — REST-адрес базы.', 'bad json');
  }
  if (!Array.isArray(data)) throw new StorageError('storage_error', 'Upstash вернул неожиданный ответ. Проверьте, что KV_REST_API_URL — REST-адрес базы.', 'not array');
  return data.map((r) => {
    if (r.error && /NOPERM/i.test(r.error)) {
      throw new StorageError('storage_readonly', 'KV_REST_API_TOKEN — токен «только для чтения». Нужен основной токен из раздела «REST API» (не Read-Only).', 'noperm');
    }
    if (r.error) throw new StorageError('storage_error', 'База данных отклонила команду.', r.error.slice(0, 80));
    return r.result;
  });
}

export async function cmd<T = unknown>(...c: Cmd): Promise<T> {
  const [r] = await pipeline([c]);
  return r as T;
}

export async function hgetJson<T>(key: string, field: string): Promise<T | null> {
  const raw = await cmd<string | null>('HGET', key, field);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function hsetJson(key: string, field: string, value: unknown): Promise<void> {
  await cmd('HSET', key, field, JSON.stringify(value));
}

export async function hvalsJson<T>(key: string): Promise<T[]> {
  const vals = (await cmd<string[]>('HVALS', key)) || [];
  return vals.map((v) => JSON.parse(v) as T);
}

/** HGETALL → объект { поле: число } */
export const toCountMap = (flat: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  const arr = Array.isArray(flat) ? flat : [];
  for (let i = 0; i + 1 < arr.length; i += 2) out[String(arr[i])] = Number(arr[i + 1]) || 0;
  return out;
};
