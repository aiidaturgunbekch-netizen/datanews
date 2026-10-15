/**
 * Переменные окружения. Каждая читается прямым обращением `process.env.ИМЯ`,
 * чтобы Vercel (Edge) гарантированно подставил значение.
 */
declare const process: { env: Record<string, string | undefined> };

const read = () => {
  try {
    return {
      KV_REST_API_URL: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      AUTH_SECRET: process.env.AUTH_SECRET,
      DATANEWS_MEMORY_KV: process.env.DATANEWS_MEMORY_KV,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT,
    };
  } catch {
    return {} as Record<string, string | undefined>;
  }
};

export const env = (
  name: 'KV_REST_API_URL' | 'KV_REST_API_TOKEN' | 'ADMIN_PASSWORD' | 'AUTH_SECRET' | 'DATANEWS_MEMORY_KV' | 'ANTHROPIC_API_KEY' | 'AI_DAILY_LIMIT'
) =>
  read()[name] || undefined;
