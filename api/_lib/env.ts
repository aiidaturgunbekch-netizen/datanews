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
    };
  } catch {
    return {} as Record<string, string | undefined>;
  }
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
) =>
  tidy(read()[name]);
