/**
 * «Перенос публикаций» из резервной копии (например, из Preview в отдельную базу Production).
 * Переносится только настоящее и одобренное: публикации (с прежними датами, фото, переводами, историей),
 * фото к ним, скрытые и сверенные встроенные публикации, официальный прогноз.
 * Не переносятся: тестовые материалы, черновики «на модерации», отклонённые и снятые, учётные записи, статистика.
 * Уже существующее в базе не перезаписывается — повторный перенос того же файла не создаёт дублей.
 */
import { cmd } from './kv';
import { ANN_KEY, CHECKED_KEY, HIDDEN_KEY, IMG_KEY } from './announcements';
import { OFFICIAL_DAYS_KEY, OFFICIAL_KEY } from './officialWeather';
import { HttpError } from './http';

export type TransferPart = 'items' | 'images' | 'hidden' | 'checked' | 'weather';
export interface TransferResult {
  added: number;
  skipped: number;
  rejected: number;
}

const SKIP_STATUS = ['pending', 'rejected', 'withdrawn'];
const IMG_ID = /^img-[A-Za-z0-9_-]{4,40}$/;
const IMG_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Подходит ли публикация для переноса (то же правило показывает панель до переноса) */
export const transferable = (raw: string): boolean => {
  try {
    const a = JSON.parse(raw) as Record<string, unknown>;
    const title = a.title as { ru?: string } | undefined;
    if (!a || typeof a.id !== 'string' || !title?.ru || typeof a.startDate !== 'string' || typeof a.category !== 'string') return false;
    if (a.testMaterial) return false;
    if (SKIP_STATUS.includes(String(a.moderationStatus || ''))) return false;
    return true;
  } catch {
    return false;
  }
};

export const transferPart = async (part: TransferPart, entries: unknown): Promise<TransferResult> => {
  const out: TransferResult = { added: 0, skipped: 0, rejected: 0 };
  if (part === 'weather') {
    const w = (entries || {}) as Record<string, unknown>;
    for (const [key, val] of [
      [OFFICIAL_KEY, w.official],
      [OFFICIAL_DAYS_KEY, w.days],
    ] as const) {
      if (typeof val !== 'string' || !val || val.length > 500_000) continue;
      const ok = await cmd<string | null>('SET', key, val, 'NX');
      if (ok) out.added++;
      else out.skipped++;
    }
    return out;
  }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new HttpError('bad_request', 400);
  for (const [id, raw] of Object.entries(entries as Record<string, unknown>)) {
    if (typeof raw !== 'string') {
      out.rejected++;
      continue;
    }
    if (part === 'items') {
      if (raw.length > 300_000 || !transferable(raw) || (JSON.parse(raw) as { id: string }).id !== id) {
        out.rejected++;
        continue;
      }
      const added = await cmd<number>('HSETNX', ANN_KEY, id, raw);
      if (added) out.added++;
      else out.skipped++;
    } else if (part === 'images') {
      if (!IMG_ID.test(id) || !IMG_DATA.test(raw) || raw.length > 950_000) {
        out.rejected++;
        continue;
      }
      const added = await cmd<number>('HSETNX', IMG_KEY, id, raw);
      if (added) out.added++;
      else out.skipped++;
    } else if (part === 'hidden' || part === 'checked') {
      if (id.length > 120 || raw.length > 200) {
        out.rejected++;
        continue;
      }
      const added = await cmd<number>('HSETNX', part === 'hidden' ? HIDDEN_KEY : CHECKED_KEY, id, raw);
      if (added) out.added++;
      else out.skipped++;
    } else throw new HttpError('bad_request', 400);
  }
  return out;
};
