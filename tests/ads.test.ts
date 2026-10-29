/**
 * Реклама — сервер: каталог и цены, создание кампании из формата, ручное подтверждение оплаты, показ только идущих кампаний,
 * автоматическое завершение по дате, приоритет без дублей, учёт показов и кликов (с защитой от повторов), CTR.
 * Настоящие обработчики /api/track и /api/stats, база в памяти. Платёжного шлюза нет — оплата только подтверждается вручную.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;

const { default: auth } = await import('../api/auth');
const { default: track } = await import('../api/track');
const { default: stats } = await import('../api/stats');
const { CAMPAIGNS_KEY, imageSize } = await import('../api/_lib/ads');
const { hgetJson, hsetJson } = await import('../api/_lib/kv');
const { addDaysLocal, campaignEnd, DEFAULT_AD_FORMATS, feedAdPositions, pickAd } = await import('../src/config/ads');
const { kgNowLocal } = await import('../src/utils/time');

/** Заголовок PNG нужного размера (сервер читает размер из заголовка; картинку не декодирует) */
const png = (w: number, h: number) => {
  const b = new Uint8Array(33 + 12);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w);
  dv.setUint32(20, h);
  b.set([8, 2, 0, 0, 0], 24);
  b.set([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], 33);
  return `data:image/png;base64,${btoa(String.fromCharCode(...b))}`;
};

let ip = 0;
const call = async (handler: (r: Request) => Promise<Response>, path: string, method: string, token?: string, body?: unknown, who?: string) => {
  ip++;
  const r = await handler(
    new Request(`http://localhost/api/${path}`, {
      method,
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': who || `10.30.${Math.floor(ip / 200)}.${ip % 200}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, location: r.headers.get('Location'), body: (await r.json().catch(() => ({}))) as Record<string, any> };
};
let admin = '';
const adm = (body: Record<string, unknown>) => call(stats, 'stats?ads=1', 'POST', admin, body);
const nowKg = (hours = 0) => kgNowLocal(Date.now() + hours * 3600 * 1000);
const base = (over: Record<string, unknown> = {}) => ({
  op: 'create',
  format: 'A',
  name: 'Осенняя кампания',
  advertiser: 'Пример ОсОО',
  contact: '+996 555 000 000',
  href: 'https://example.kg/promo',
  alt: 'Пример рекламного баннера',
  start: nowKg(-2),
  periods: 1,
  imageDesktopData: png(1200, 300),
  ...over,
});
/** Создать, подтвердить оплату и включить */
const liveCampaign = async (over: Record<string, unknown> = {}) => {
  const c = (await adm(base({ status: 'awaiting_payment', ...over }))).body.campaign;
  await adm({ op: 'action', id: c.id, action: 'confirm', ref: 'Платёж №1' });
  const r = await adm({ op: 'action', id: c.id, action: 'activate' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.campaign;
};
const live = async () => (await call(track, 'track?ads=1', 'GET')).body.ads as { id: string; format: string }[];

before(async () => {
  admin = (await call(auth, 'auth', 'POST', undefined, { action: 'admin-login', password: 'admin-dev' })).body.token;
  assert.ok(admin);
});

describe('каталог форматов и цены', () => {
  it('четыре формата со стартовыми ценами за 30 дней и размерами; виден публично', async () => {
    const f = (await call(track, 'track?adformats=1', 'GET')).body.formats;
    assert.deepEqual(
      ['A', 'B', 'C', 'D'].map((id) => [f[id].name.ru, f[id].price, f[id].periodDays]),
      [
        ['Главный баннер', 10000, 30],
        ['Боковой баннер', 5000, 30],
        ['Рекламная карточка', 4000, 30],
        ['Тематический баннер', 3000, 30],
      ]
    );
    assert.deepEqual([f.A.desktop, f.A.mobile], [{ w: 1200, h: 300 }, { w: 750, h: 300 }]);
    assert.deepEqual(f.B.desktop, { w: 600, h: 800 }, 'B: 300×400 в двойном размере');
    assert.deepEqual([f.C.desktop, f.C.mobile], [{ w: 1200, h: 675 }, null]);
    assert.deepEqual(f.D.mobile, { w: 750, h: 300 });
  });

  it('управление — только администратору', async () => {
    assert.equal((await call(stats, 'stats?ads=1', 'GET')).status, 403);
    assert.equal((await call(stats, 'stats?ads=1', 'POST', undefined, base())).status, 403);
    assert.equal((await call(stats, 'stats?ads=1', 'POST', undefined, { op: 'format', id: 'A', price: 1 })).status, 403);
  });
});

describe('кампании', () => {
  it('создание из формата: цена, место и окончание подставляются; статус — только черновик или «ожидает оплаты»', async () => {
    const start = '2026-11-01T09:00';
    const r = await adm(base({ start, periods: 2, status: 'active' }));
    assert.equal(r.status, 201);
    const c = r.body.campaign;
    assert.equal(c.status, 'draft', 'нельзя создать сразу активной');
    assert.equal(c.payment.status, 'unpaid');
    assert.deepEqual([c.pricePerPeriod, c.total, c.periods], [10000, 20000, 2]);
    assert.equal(c.end, '2026-12-31T09:00', '2 × 30 дней');
    assert.equal(campaignEnd('2026-11-01T09:00', 1), '2026-12-01T09:00');
    assert.equal(addDaysLocal('2026-12-31T23:30', 1), '2027-01-01T23:30');
    assert.deepEqual(c.imageDesktopSize, { w: 1200, h: 300 });
    assert.ok(c.imageDesktop.startsWith('/api/image?id='));
    const w = await adm(base({ status: 'awaiting_payment' }));
    assert.deepEqual([w.body.campaign.status, w.body.campaign.payment.status], ['awaiting_payment', 'pending']);
  });

  it('проверка изображений, ссылки и обязательных полей', async () => {
    assert.equal((await adm(base({ imageDesktopData: png(800, 800) }))).status, 400, 'пропорции');
    assert.equal((await adm(base({ imageDesktopData: png(400, 100) }))).status, 400, 'слишком маленькое');
    assert.equal((await adm(base({ imageDesktopData: 'data:image/gif;base64,R0lGODlh' }))).status, 400, 'тип файла');
    assert.equal((await adm(base({ imageMobileData: png(1200, 300) }))).status, 400, 'телефон — 750×300');
    assert.equal((await adm(base({ imageMobileData: png(750, 300) }))).status, 201);
    assert.equal((await adm(base({ href: 'http://example.kg' }))).status, 400, 'только https');
    assert.equal((await adm(base({ href: 'javascript:alert(1)' }))).status, 400);
    assert.equal((await adm(base({ advertiser: '' }))).status, 400);
    assert.equal((await adm(base({ format: 'D' }))).status, 400, 'для D нужен раздел');
    assert.equal((await adm(base({ format: 'D', rubric: 'tech' }))).status, 201);
    assert.equal((await adm(base({ format: 'C', imageDesktopData: png(1200, 675) }))).status, 400, 'для C нужен заголовок');
    assert.equal((await adm(base({ format: 'B', imageDesktopData: png(600, 800) }))).status, 201);
    assert.deepEqual(imageSize(png(1200, 675)), { w: 1200, h: 675 });
  });

  it('без подтверждения оплаты кампания не активируется и не показывается', async () => {
    const c = (await adm(base({ status: 'awaiting_payment' }))).body.campaign;
    assert.equal((await adm({ op: 'action', id: c.id, action: 'activate' })).status, 409);
    assert.ok(!(await live()).some((a) => a.id === c.id));
    assert.equal((await adm({ op: 'action', id: c.id, action: 'confirm' })).status, 400, 'без номера платежа нельзя');
    const conf = (await adm({ op: 'action', id: c.id, action: 'confirm', ref: 'Счёт 15' })).body.campaign;
    assert.deepEqual([conf.payment.status, conf.status], ['confirmed', 'awaiting_payment'], 'подтверждение оплаты само не включает показ');
    assert.ok(!(await live()).some((a) => a.id === c.id));
    assert.equal((await adm({ op: 'action', id: c.id, action: 'activate' })).status, 200);
    const shown = (await live()).find((a) => a.id === c.id) as Record<string, unknown> | undefined;
    assert.ok(shown, 'активна + оплачена + в периоде — показывается');
    assert.equal('contact' in shown! || 'payment' in shown! || 'href' in shown!, false, 'посетителю — без контакта, оплаты и прямой ссылки');
    assert.equal((await adm({ op: 'action', id: c.id, action: 'delete' })).status, 409, 'оплаченную не удалить');
  });

  it('показ только в оплаченном периоде; после окончания — «Завершена», статистика сохраняется', async () => {
    const future = await liveCampaign({ start: nowKg(48) });
    assert.ok(!(await live()).some((a) => a.id === future.id), 'ещё не началась');
    const c = await liveCampaign();
    assert.ok((await live()).some((a) => a.id === c.id));
    assert.equal((await call(track, 'track', 'POST', undefined, { adView: c.id })).body.counted, true);
    // период закончился
    const stored = await hgetJson<any>(CAMPAIGNS_KEY, c.id);
    await hsetJson(CAMPAIGNS_KEY, c.id, { ...stored, end: nowKg(-1) });
    assert.ok(!(await live()).some((a) => a.id === c.id), 'исчезает с сайта сразу');
    const list = (await call(stats, 'stats?ads=1', 'GET', admin)).body.campaigns;
    const done = list.find((x: any) => x.id === c.id);
    assert.equal(done.status, 'completed');
    assert.equal(done.stats.views, 1, 'статистика сохранена');
    assert.equal((await adm({ op: 'action', id: c.id, action: 'activate' })).status, 409, 'просроченную не включить');
  });

  it('смена цены в каталоге не меняет созданные и оплаченные кампании; период оплаченной не меняется', async () => {
    const paid = await liveCampaign({ format: 'D', rubric: 'sport' });
    const draft = (await adm(base({ format: 'D', rubric: 'sport' }))).body.campaign;
    assert.equal((await adm({ op: 'format', id: 'D', price: 3500, desktop: { w: 1200, h: 300 } })).status, 200);
    const list = (await call(stats, 'stats?ads=1', 'GET', admin)).body;
    assert.equal(list.formats.D.price, 3500);
    assert.equal(list.campaigns.find((x: any) => x.id === paid.id).total, 3000, 'оплаченная — по старой цене');
    assert.equal(list.campaigns.find((x: any) => x.id === draft.id).total, 3000, 'созданная — по цене на момент создания');
    assert.equal((await adm(base({ format: 'D', rubric: 'sport' }))).body.campaign.pricePerPeriod, 3500, 'новая — по новой цене');
    assert.equal((await adm({ op: 'action', id: paid.id, action: 'edit', periods: 3 })).status, 409);
    assert.equal((await adm({ op: 'format', id: 'D', price: 0 })).status, 400);
    await adm({ op: 'format', id: 'D', price: 3000 });
  });

  it('пауза и возобновление; удаление только неоплаченного', async () => {
    const c = await liveCampaign({ format: 'B', imageDesktopData: png(600, 800) });
    await adm({ op: 'action', id: c.id, action: 'pause' });
    assert.ok(!(await live()).some((a) => a.id === c.id));
    await adm({ op: 'action', id: c.id, action: 'resume' });
    assert.ok((await live()).some((a) => a.id === c.id));
    const d = (await adm(base())).body.campaign;
    assert.equal((await adm({ op: 'action', id: d.id, action: 'delete' })).status, 200);
    assert.equal(await hgetJson(CAMPAIGNS_KEY, d.id), null);
  });
});

describe('одно место — одна кампания по приоритету', () => {
  it('приоритет, затем дата начала; карточки C — каждая один раз: после 4-го материала, затем через 8', () => {
    const ad = (id: string, format: any, priority: number, start = '2026-10-01T00:00', rubric?: string) => ({ id, format, priority, start, rubric, label: 'ad' as const, advertiser: 'x', imageDesktop: '/x', alt: 'x' });
    const ads = [ad('a1', 'A', 1), ad('a2', 'A', 5), ad('a3', 'A', 5, '2026-09-01T00:00'), ad('d1', 'D', 9, undefined, 'tech'), ad('d2', 'D', 1, undefined, 'sport')];
    assert.equal(pickAd(ads, 'A')!.id, 'a3');
    assert.equal(pickAd(ads, 'D', 'sport')!.id, 'd2', 'тематическая — только своего раздела');
    assert.equal(pickAd(ads, 'D', 'culture'), null);
    assert.equal(pickAd([], 'B'), null, 'нет кампаний — нет блока');
    assert.deepEqual(feedAdPositions(20, 5), [4, 12, 20]);
    assert.deepEqual(feedAdPositions(6, 2), [4], 'первая — после 4-го из 6 показанных');
    assert.deepEqual(feedAdPositions(3, 2), [], 'меньше 4 материалов — без карточки');
  });
});

describe('показы и клики', () => {
  it('показ засчитывается один раз за 30 минут с одного адреса; неидущая кампания не считается', async () => {
    const c = await liveCampaign();
    const v = (who: string) => call(track, 'track', 'POST', undefined, { adView: c.id }, who);
    assert.equal((await v('1.1.1.1')).body.counted, true);
    assert.equal((await v('1.1.1.1')).body.counted, false, 'повтор');
    assert.equal((await v('2.2.2.2')).body.counted, true);
    const draft = (await adm(base())).body.campaign;
    assert.equal((await call(track, 'track', 'POST', undefined, { adView: draft.id })).body.counted, false);
    // клик: перенаправление на рекламодателя, повтор за 30 секунд не считается
    const k1 = await call(track, `track?ad=${c.id}&go=1`, 'GET', undefined, undefined, '3.3.3.3');
    assert.deepEqual([k1.status, k1.location], [302, 'https://example.kg/promo']);
    await call(track, `track?ad=${c.id}&go=1`, 'GET', undefined, undefined, '3.3.3.3');
    const notLive = await call(track, `track?ad=${draft.id}&go=1`, 'GET');
    assert.deepEqual([notLive.status, notLive.location], [302, '/'], 'неидущая — на главную, без клика');
    const s = (await call(stats, 'stats?ads=1', 'GET', admin)).body.campaigns.find((x: any) => x.id === c.id).stats;
    assert.deepEqual([s.views, s.clicks, s.ctr], [2, 1, 50]);
    assert.equal(s.days.length, 1);
    const empty = (await call(stats, 'stats?ads=1', 'GET', admin)).body.campaigns.find((x: any) => x.id === draft.id).stats;
    assert.deepEqual([empty.views, empty.clicks, empty.ctr], [0, 0, null], 'нет показов — нет CTR (не «0%»)');
  });

  it('статистика без личных данных', async () => {
    const all = await hgetJson<any>(CAMPAIGNS_KEY, (await liveCampaign()).id);
    assert.ok(!JSON.stringify(all).includes('1.1.1.1'));
  });
});

describe('стартовые цены совпадают с заданием', () => {
  it('A 10 000, B 5 000, C 4 000, D 3 000 сомов', () => {
    assert.deepEqual(['A', 'B', 'C', 'D'].map((k) => (DEFAULT_AD_FORMATS as any)[k].price), [10000, 5000, 4000, 3000]);
  });
});
