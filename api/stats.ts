/**
 * /api/stats?days=30 — статистика посещений сайта; /api/stats?backup=1[&images=1] — резервная копия данных (только админ)
 * /api/stats?ads=1 — реклама (только админ):
 *   GET                                   каталог форматов и все кампании со статистикой показов и кликов
 *   POST { op: 'format', ...поля }        изменить формат каталога (цена, размеры, описание)
 *   POST { op: 'create', ...поля }        создать кампанию (черновик или «ожидает оплаты»)
 *   POST { op: 'action', id, action }     правка, подтверждение оплаты, активация, пауза, завершение, удаление
 */
import type { SiteStats } from '../src/types';
import { pipeline, toCountMap } from './_lib/kv';
import { handler, HttpError, json, readBody, requireAdmin } from './_lib/http';
import { dayKey, K } from './_lib/stats';
import { buildBackup } from './_lib/backup';
import { campaignAction, campaignStats, createCampaign, getFormats, listCampaigns, updateFormat } from './_lib/ads';

export const config = { runtime: 'edge' };

const top = (maps: Record<string, number>[], n = 10) => {
  const sum: Record<string, number> = {};
  maps.forEach((m) => Object.entries(m).forEach(([k, v]) => (sum[k] = (sum[k] || 0) + v)));
  return Object.entries(sum)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
};

export default handler(async (req) => {
  await requireAdmin(req);
  const params = new URL(req.url).searchParams;
  if (params.get('ads')) {
    if (req.method === 'POST') {
      const body = await readBody<Record<string, unknown>>(req, 2_300_000);
      if (body.op === 'format') return json({ format: await updateFormat(body) });
      if (body.op === 'create') return json({ campaign: await createCampaign(body) }, 201);
      if (body.op === 'action') return json({ campaign: await campaignAction(body) });
      throw new HttpError('bad_request', 400);
    }
    const campaigns = await listCampaigns();
    const stats = await Promise.all(campaigns.map((c) => campaignStats(c.id)));
    return json({ formats: await getFormats(), campaigns: campaigns.map((c, i) => ({ ...c, stats: stats[i] })) });
  }
  if (params.get('backup') === '1') {
    const backup = await buildBackup(params.get('images') === '1');
    const name = `datanews-backup-${backup.createdAt.slice(0, 10)}${backup.includesImages ? '-with-photos' : ''}.json`;
    return new Response(JSON.stringify(backup, null, 1), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const days = Math.min(Math.max(Number(params.get('days')) || 30, 1), 365);
  const dates = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - (days - 1 - i) * 86400_000)));

  const perDay = await pipeline(dates.flatMap((d) => [['GET', K.views(d)], ['PFCOUNT', K.visitors(d)]]));
  const visitorsRange = await pipeline([['PFCOUNT', ...dates.map(K.visitors)]]);
  const hashes = await pipeline(
    dates.flatMap((d) => [['HGETALL', K.pages(d)], ['HGETALL', K.refs(d)], ['HGETALL', K.devices(d)], ['HGETALL', K.langs(d)], ['HGETALL', K.cities(d)]])
  );
  const pick = (offset: number) => dates.map((_, i) => toCountMap(hashes[i * 5 + offset]));

  const dayStats = dates.map((date, i) => ({
    date,
    views: Number(perDay[i * 2]) || 0,
    visitors: Number(perDay[i * 2 + 1]) || 0,
  }));
  const today = dayStats[dayStats.length - 1];

  const stats: SiteStats = {
    days: dayStats,
    totals: {
      views: dayStats.reduce((s, d) => s + d.views, 0),
      visitors: Number(visitorsRange[0]) || 0,
      todayViews: today.views,
      todayVisitors: today.visitors,
    },
    topPages: top(pick(0)),
    topReferrers: top(pick(1)),
    devices: top(pick(2)),
    languages: top(pick(3)),
    cities: top(pick(4)),
  };
  return json(stats);
});
