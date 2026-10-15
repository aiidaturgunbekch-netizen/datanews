/**
 * /api/reports — жалобы читателей на публикации.
 *   POST { annId, reason, comment?, contact? }   любой посетитель (не более 5 жалоб за 10 минут с одного IP)
 *   GET                                          список жалоб (только админ)
 *   PATCH { id, resolution, withdraw? }          закрыть жалобу; withdraw: true — снять публикацию с сайта (админ)
 *
 * Жалоба увеличивает счётчик reportsCount публикации и попадает в её историю изменений.
 * Встроенные (редакционные) события в хранилище не лежат — для них жалоба только сохраняется,
 * а снять такое событие администратор может кнопкой «Удалить» в панели.
 */
import type { Announcement, Report } from '../src/types';
import { INITIAL_ANNOUNCEMENTS } from '../src/data/initialAnnouncements';
import { hgetJson, hsetJson, hvalsJson } from './_lib/kv';
import { handler, HttpError, json, randomId, rateLimit, readBody, requireAdmin } from './_lib/http';
import { ANN_KEY, saveAnnouncement, withHistory } from './_lib/announcements';
import { kgNowLocal } from '../src/utils/time';

export const config = { runtime: 'edge' };

const REPORTS_KEY = 'dn:reports';
const REASONS: Report['reason'][] = ['false', 'outdated', 'offensive', 'spam', 'other'];
const REASON_RU: Record<Report['reason'], string> = {
  false: 'Недостоверная информация',
  outdated: 'Устаревшие сведения',
  offensive: 'Оскорбительное содержание',
  spam: 'Спам / реклама',
  other: 'Другое',
};

export default handler(async (req) => {
  if (req.method === 'POST') {
    await rateLimit(req, 'report', 5, 600);
    const body = await readBody<Record<string, unknown>>(req, 5000);
    const annId = String(body.annId || '').slice(0, 80);
    const reason = REASONS.includes(body.reason as Report['reason']) ? (body.reason as Report['reason']) : null;
    if (!annId || !reason) throw new HttpError('missing_field', 400, 'Укажите причину жалобы');
    const stored = await hgetJson<Announcement>(ANN_KEY, annId);
    const builtin = INITIAL_ANNOUNCEMENTS.find((a) => a.id === annId);
    if (!stored && !builtin) throw new HttpError('not_found', 404);
    const report: Report = {
      id: randomId('rep'),
      annId,
      annTitle: (stored || builtin)!.title.ru,
      reason,
      comment: String(body.comment || '').trim().slice(0, 1000) || undefined,
      contact: String(body.contact || '').trim().slice(0, 120) || undefined,
      at: kgNowLocal(),
      status: 'open',
    };
    await hsetJson(REPORTS_KEY, report.id, report);
    if (stored) {
      await saveAnnouncement(
        withHistory({ ...stored, reportsCount: (stored.reportsCount || 0) + 1 }, 'reader', 'reported', REASON_RU[reason])
      );
    }
    return json({ ok: true }, 201);
  }

  await requireAdmin(req);

  if (req.method === 'GET') {
    const reports = await hvalsJson<Report>(REPORTS_KEY);
    reports.sort((a, b) => b.at.localeCompare(a.at));
    return json({ reports });
  }

  if (req.method === 'PATCH') {
    const body = await readBody<{ id?: string; resolution?: string; withdraw?: boolean }>(req, 5000);
    const r = await hgetJson<Report>(REPORTS_KEY, String(body.id || ''));
    if (!r) throw new HttpError('not_found', 404);
    const resolution = String(body.resolution || '').slice(0, 500) || (body.withdraw ? 'Публикация снята' : 'Проверено');
    await hsetJson(REPORTS_KEY, r.id, { ...r, status: 'resolved', resolution });
    if (body.withdraw) {
      const a = await hgetJson<Announcement>(ANN_KEY, r.annId);
      if (a) {
        await saveAnnouncement(
          withHistory({ ...a, moderationStatus: 'withdrawn', moderationNote: resolution, updatedAt: kgNowLocal() }, 'admin', 'withdrawn', `По жалобе: ${resolution}`)
        );
      }
    }
    return json({ ok: true });
  }

  throw new HttpError('method_not_allowed', 405);
});
