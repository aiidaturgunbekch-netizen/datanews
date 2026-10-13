/**
 * Минимальный клиент Redis (Upstash REST API) без внешних зависимостей.
 *
 * В Vercel: Storage → Upstash for Redis → Connect. Интеграция сама добавит
 * KV_REST_API_URL и KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_URL / _TOKEN).
 *
 * Для локальной разработки (npm run dev) используется хранилище в памяти —
 * его включает vite.config.ts через DATANEWS_MEMORY_KV=1.
 */

type Cmd = (string | number)[];

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('storage_not_configured');
  }
}

const env = (name: string): string | undefined =>
  (globalThis as any).process?.env?.[name] || undefined;

const restUrl = () => env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
const restToken = () => env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');

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
    case 'GET':
      return mem.strings.get(args[0]) ?? null;
    case 'SET':
      mem.strings.set(args[0], args[1]);
      return 'OK';
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

export const isConfigured = () => isMemoryMode() || Boolean(restUrl() && restToken());

export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (cmds.length === 0) return [];
  if (isMemoryMode()) return cmds.map(runMemory);
  const url = restUrl();
  const token = restToken();
  if (!url || !token) throw new StorageNotConfiguredError();

  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`redis http ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string }[];
  return data.map((r) => {
    if (r.error) throw new Error(`redis: ${r.error}`);
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
