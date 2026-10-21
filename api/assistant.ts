/**
 * /api/assistant — бот DataNews для посетителей. Работает БЕЗ внешнего ИИ и без платных сервисов.
 *   POST { q?: string, intent?: BotIntent, lang }  → BotReply (см. src/types/bot.ts)
 *
 * Как работает (api/_lib/bot.ts): тема вопроса — по ключевым словам (RU/KG/EN), даты и место — по шаблонам,
 * ответ — из опубликованных материалов сайта (встроенные + одобренные в базе) и официального прогноза,
 * внесённого редакцией. Если данных нет — бот прямо говорит об этом и даёт ссылку на раздел или источник.
 *
 * Ничего не сохраняет: ни вопросы, ни IP (кроме временного счётчика защиты от перегрузки — 10 минут).
 */
import type { Language } from '../src/types';
import type { BotIntent } from '../src/types/bot';
import { BOT_INTENTS } from '../src/types/bot';
import type { OfficialForecast } from '../src/config/weather';
import { cmd } from './_lib/kv';
import { handler, HttpError, json, rateLimit, readBody } from './_lib/http';
import { loadPublished } from './_lib/assistant';
import { answer } from './_lib/bot';

export const config = { runtime: 'edge' };

const LANGS: Language[] = ['ru', 'kg', 'en'];

export default handler(async (req) => {
  if (req.method !== 'POST') throw new HttpError('method_not_allowed', 405);
  // Защита от перегрузки: 40 вопросов за 10 минут с одного адреса
  await rateLimit(req, 'bot', 40, 600);
  const body = await readBody<{ q?: string; question?: string; intent?: string; lang?: string }>(req, 4000);
  const lang: Language = LANGS.includes(body.lang as Language) ? (body.lang as Language) : 'ru';
  const q = String(body.q ?? body.question ?? '').trim().slice(0, 300);
  const intent = (BOT_INTENTS as string[]).includes(String(body.intent)) || body.intent === 'help' ? (body.intent as BotIntent) : undefined;
  if (!q && !intent) throw new HttpError('missing_field', 400, 'Задайте вопрос');

  const all = await loadPublished();
  const raw = await cmd<string | null>('GET', 'dn:weather:official');
  const official = raw ? (JSON.parse(raw) as OfficialForecast) : null;
  return json(answer({ q, intent, lang }, all, official));
});
