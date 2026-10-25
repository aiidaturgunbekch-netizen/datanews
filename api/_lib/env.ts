/**
 * Переменные окружения. Каждая читается прямым обращением `process.env.ИМЯ`,
 * чтобы Vercel (Edge) гарантированно подставил значение.
 */
declare const process: { env: Record<string, string | undefined> };

/** Значение из панели Vercel без случайных пробелов, переносов строки и обрамляющих кавычек */
const tidy = (v: string | undefined) => {
  const s = (v ?? '').trim().replace(/^(['"])(.*)\1$/s, '$2').trim();
  return s || undefined;
};

const read = () => {
  try {
    return {
      KV_REST_API_URL: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      AUTH_SECRET: process.env.AUTH_SECRET,
      DATANEWS_MEMORY_KV: process.env.DATANEWS_MEMORY_KV,
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
      VAPID_SUBJECT: process.env.VAPID_SUBJECT,
      MAIL_INGEST_SECRET: process.env.MAIL_INGEST_SECRET,
      MAIL_INGEST_ENABLED: process.env.MAIL_INGEST_ENABLED,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    };
  } catch {
    return {} as Record<string, string | undefined>;
  }
};

/** Из какой переменной реально взяты адрес и токен Redis (только имена, без значений) */
export const redisSources = () => {
  try {
    return {
      url: process.env.KV_REST_API_URL ? 'KV_REST_API_URL' : process.env.UPSTASH_REDIS_REST_URL ? 'UPSTASH_REDIS_REST_URL' : null,
      token: process.env.KV_REST_API_TOKEN ? 'KV_REST_API_TOKEN' : process.env.UPSTASH_REDIS_REST_TOKEN ? 'UPSTASH_REDIS_REST_TOKEN' : null,
      present: [
        process.env.KV_REST_API_URL && 'KV_REST_API_URL',
        process.env.KV_REST_API_TOKEN && 'KV_REST_API_TOKEN',
        process.env.UPSTASH_REDIS_REST_URL && 'UPSTASH_REDIS_REST_URL',
        process.env.UPSTASH_REDIS_REST_TOKEN && 'UPSTASH_REDIS_REST_TOKEN',
      ].filter(Boolean) as string[],
    };
  } catch {
    return { url: null, token: null, present: [] as string[] };
  }
};

/** Значение переменной как оно пришло из Vercel, до очистки — только для описания формата */
export const rawEnv = (name: 'KV_REST_API_URL' | 'KV_REST_API_TOKEN') => read()[name];

/**
 * Формат значения без самого значения: длина, пробелы, переносы, нелатинские символы, кавычки,
 * вставленное имя переменной («ИМЯ=…»).
 */
export const describeValue = (raw: string | undefined) => {
  const v = raw ?? '';
  const inner = v.trim();
  return {
    length: v.length,
    lengthAfterCleanup: tidy(v)?.length ?? 0,
    whitespaceAtEdges: v !== inner,
    whitespaceInside: /\s/.test(inner),
    lineBreakInside: /[\r\n]/.test(inner),
    nonAsciiChars: [...inner].filter((c) => c.charCodeAt(0) > 126 || c.charCodeAt(0) < 32).length,
    quoted: /^(['"]).*\1$/s.test(inner),
    variableNamePasted: /^[A-Z][A-Z0-9_]*\s*=/.test(inner.replace(/^['"]/, '')),
  };
};

export const env = (
  name:
    | 'KV_REST_API_URL'
    | 'KV_REST_API_TOKEN'
    | 'ADMIN_PASSWORD'
    | 'AUTH_SECRET'
    | 'DATANEWS_MEMORY_KV'
    | 'VAPID_PUBLIC_KEY'
    | 'VAPID_PRIVATE_KEY'
    | 'VAPID_SUBJECT'
    | 'MAIL_INGEST_SECRET'
    | 'MAIL_INGEST_ENABLED'
    | 'VERCEL_ENV'
    | 'VERCEL_GIT_COMMIT_REF'
    | 'VERCEL_GIT_COMMIT_SHA'
) =>
  tidy(read()[name]);
