/**
 * Сотрудник редакции: бесплатно и без предварительной модерации, только свои материалы, права — только от администратора.
 * Остальные пользователи, коммерческие клиенты и госорганы работают как прежде. Настоящий обработчик сервера; база в памяти.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;

const { default: auth } = await import('../api/auth');
const { default: announcements } = await import('../api/announcements');
const { default: usersApi } = await import('../api/users');
const { hgetJson, hsetJson } = await import('../api/_lib/kv');
const { ANN_KEY } = await import('../api/_lib/announcements');
const { USERS_KEY } = await import('../api/_lib/users');
const { buildItem, emptyState } = await import('../src/components/SimplePublishForm');
const { availableTypes, categoriesFor } = await import('../src/config/publishTypes');
const { isPaid } = await import('../src/components/PaidBadge');

let ip = 0;
const call = async (handler: (r: Request) => Promise<Response>, path: string, method: string, token?: string, body?: unknown) => {
  ip++;
  const r = await handler(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.11.${Math.floor(ip / 200)}.${ip % 200}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, any> };
};
const NOW = '2026-10-27T12:00';
let n = 0;
const news = (extra: Record<string, unknown> = {}, verified?: boolean) => ({
  // разные слова в заголовке — иначе сервер справедливо считает публикации дублями
  item: buildItem({ ...emptyState(), type: 'news', category: 'news', title: `Сообщение ${['альфа', 'бета', 'гамма', 'дельта', 'омега'][n % 5]} ${Math.random().toString(36).slice(2, 8)} ${++n}`, description: 'Текст новости по официальному сообщению.', ...extra } as any, {
    now: NOW,
    ...(verified !== undefined ? { verified } : {}),
  }),
});
const notice = (title: string) => ({ item: buildItem({ ...emptyState(), type: 'notice', category: 'notices', title, description: 'Текст объявления.' }, { now: NOW }) });
const publicIds = async () => ((await call(announcements, 'announcements', 'GET')).body.items as { id: string }[]).map((a) => a.id);
const stored = (id: string) => hgetJson<Record<string, any>>(ANN_KEY, id);
const login = async (email: string, password: string) => (await call(auth, 'auth', 'POST', undefined, { action: 'login', email, password })).body.token as string;
/** Отдельный сотрудник для группы тестов: у каждого своё ограничение «10 отправок в час» */
let en = 0;
const newEditor = async () => {
  const email = `editor-x${++en}@example.com`;
  const r = await call(usersApi, 'users', 'POST', admin, { name: `Редактор ${en}`, email, phone: '+996555100099', organization: 'Редакция DataNews', password: 'editor-x-pass', plan: 'start', editor: true });
  assert.equal(r.status, 201);
  return login(email, 'editor-x-pass');
};

let admin = '';
let editor = '';
let editorPost = '';
before(async () => {
  admin = (await call(auth, 'auth', 'POST', undefined, { action: 'admin-login', password: 'admin-dev' })).body.token;
});

describe('назначение прав', () => {
  it('1. администратор создаёт сотрудника редакции; оплата не отмечается, периода нет', async () => {
    const r = await call(usersApi, 'users', 'POST', admin, { name: 'Айбек (редакция)', email: 'editor1@example.com', phone: '+996555100001', organization: 'Редакция DataNews', password: 'editor-pass-1', plan: 'start', editor: true });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body.user.editor?.since);
    assert.equal(r.body.user.paymentStatus, 'unpaid');
    assert.deepEqual(r.body.user.periods, []);
    editor = await login('editor1@example.com', 'editor-pass-1');
    const me = await call(auth, 'auth', 'GET', editor);
    assert.equal(me.body.role, 'user', 'роль — пользователь, не администратор');
    assert.equal(me.body.usage.editor, true);
  });

  it('1б. администратор назначает права существующему пользователю', async () => {
    await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Нурлан', email: 'later-editor@example.com', phone: '+996555100002', organization: 'Редакция', password: 'later-pass-1', plan: 'start' });
    const r = await call(usersApi, 'users', 'PATCH', admin, { email: 'later-editor@example.com', editor: 'grant' });
    assert.equal(r.status, 200);
    assert.ok(r.body.user.editor.since);
    assert.equal(r.body.user.paymentStatus, 'unpaid');
  });

  it('2. пользователь не может назначить права себе — ни через панель, ни при регистрации, ни через оплату', async () => {
    const reg = await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Хитрый', email: 'sneaky@example.com', phone: '+996555100003', organization: 'Хитрый', password: 'sneaky-pass-1', plan: 'start', editor: { since: '2026-01-01' } });
    assert.equal(reg.status, 201);
    const t = reg.body.token;
    assert.equal(reg.body.user.editor, undefined);
    assert.equal((await call(usersApi, 'users', 'PATCH', t, { email: 'sneaky@example.com', editor: 'grant' })).status, 403);
    await call(auth, 'auth', 'POST', t, { action: 'payment', paymentRef: 'X-1', plan: 'start', editor: { since: '2026-01-01' } });
    assert.equal((await hgetJson<Record<string, any>>(USERS_KEY, 'sneaky@example.com'))!.editor, undefined);
    assert.equal((await call(announcements, 'announcements', 'POST', t, news())).status, 402, 'без оплаты и без прав сотрудника — отказ');
    // сотрудник тоже не назначает права другим
    assert.equal((await call(usersApi, 'users', 'PATCH', editor, { email: 'sneaky@example.com', editor: 'grant' })).status, 403);
  });
});

describe('публикация сотрудником', () => {
  it('3–4. публикует без оплаты и модерации — сразу «Опубликовано» и на сайте', async () => {
    const r = await call(announcements, 'announcements', 'POST', editor, news());
    assert.equal(r.status, 201, JSON.stringify(r.body));
    editorPost = r.body.item.id;
    assert.equal(r.body.item.moderationStatus, 'approved');
    assert.ok((await publicIds()).includes(editorPost), 'сразу на сайте');
    const a = (await stored(editorPost))!;
    assert.equal(a.category, 'news');
    assert.equal(a.submittedBy.email, 'editor1@example.com', 'автор сохранён');
    assert.equal(a.dataOrigin, 'manual', 'происхождение — редакция');
    assert.match(a.history.at(-1).note, /сотрудником редакции/);
    assert.equal(a.history.at(-1).action, 'published');
  });

  it('5а. панель видит сотрудника без оплаченного периода: «действующего тарифа» нет, права — отдельно', async () => {
    const list = (await call(usersApi, 'users', 'GET', admin)).body.users;
    const u = list.find((x: { email: string }) => x.email === 'editor1@example.com');
    assert.ok(u.editor?.since && !u.editor.revokedAt, 'права сотрудника видны в списке');
    assert.equal(u.usage.active, false, 'нет оплаченного периода — кнопки «Продлить» и «Приостановить» не показываются');
    assert.equal(u.usage.editor, true);
    assert.equal(u.paymentStatus, 'unpaid');
  });

  it('5. у сотрудника не создаётся оплаченный период и не меняется статус оплаты', async () => {
    const u = (await hgetJson<Record<string, any>>(USERS_KEY, 'editor1@example.com'))!;
    assert.equal(u.paymentStatus, 'unpaid');
    assert.ok(!u.periods || u.periods.length === 0);
    assert.equal(u.paidUntil, undefined);
  });

  it('6. публикация сотрудника не получает метку «Платное размещение»', async () => {
    assert.equal(isPaid((await stored(editorPost)) as any), false);
  });

  it('14. «Подтверждено по первоисточнику» не ставится само; ставится только явной отметкой', async () => {
    assert.equal((await stored(editorPost))!.isVerified, false, 'без отметки — не подтверждено');
    const editor = await newEditor();
    const r = await call(announcements, 'announcements', 'POST', editor, { item: { ...news().item, isVerified: undefined } });
    assert.equal(r.body.item.isVerified, false);
    const v = await call(announcements, 'announcements', 'POST', editor, news({}, true));
    assert.equal(v.body.item.isVerified, true, 'явная отметка сотрудника');
    assert.ok(v.body.item.lastCheckedAt, 'дата проверки — с отметкой');
  });

  it('прочие редакционные настройки сотруднику недоступны', async () => {
    const editor = await newEditor();
    const r = await call(announcements, 'announcements', 'POST', editor, { item: { ...news().item, dangerLevel: 'high', urgency: 'emergency', isUrgentTicker: true, legal: { docTitle: { ru: 'Закон' } }, sourceKind: 'official' } });
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.dangerLevel, undefined);
    assert.notEqual(a.urgency, 'emergency');
    assert.equal(a.isUrgentTicker, false);
    assert.equal(a.legal, undefined);
    assert.equal(a.sourceKind, undefined);
  });

  it('проверка дублей и обязательные поля остаются', async () => {
    const editor = await newEditor();
    const first = news();
    assert.equal((await call(announcements, 'announcements', 'POST', editor, first)).status, 201);
    assert.equal((await call(announcements, 'announcements', 'POST', editor, first)).status, 409);
    assert.equal((await call(announcements, 'announcements', 'POST', editor, { item: { ...news().item, title: { ru: '' } } })).status, 400);
  });

  it('частота: не больше 10 отправок в час', async () => {
    await call(usersApi, 'users', 'POST', admin, { name: 'Частый', email: 'editor-rate@example.com', phone: '+996555100009', organization: 'Редакция', password: 'rate-pass-12', plan: 'start', editor: true });
    const t = await login('editor-rate@example.com', 'rate-pass-12');
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await call(announcements, 'announcements', 'POST', t, news())).status);
    assert.deepEqual(codes.slice(0, 10), Array(10).fill(201));
    assert.equal(codes[10], 429);
  });
});

describe('свои и чужие материалы', () => {
  it('7. сотрудник правит свою публикацию — сразу на сайте, в истории', async () => {
    const cur = (await stored(editorPost))!;
    const item = buildItem({ ...emptyState(), type: 'news', category: 'news', title: 'Исправленный заголовок', description: cur.description.ru }, { initial: cur as any, now: NOW, verified: false });
    const r = await call(announcements, 'announcements', 'PATCH', editor, { id: editorPost, item });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const a = (await stored(editorPost))!;
    assert.equal(a.title.ru, 'Исправленный заголовок');
    assert.equal(a.moderationStatus, 'approved', 'правка без повторной модерации');
    assert.ok(a.history.at(-1).changes.includes('title'));
    assert.match(a.history.at(-1).note, /сотрудника редакции/);
    assert.ok((await publicIds()).includes(editorPost));
  });

  it('8. не правит и не снимает чужую публикацию (пользователя, другого сотрудника, администратора)', async () => {
    const other = await call(usersApi, 'users', 'POST', admin, { name: 'Другой редактор', email: 'editor2@example.com', phone: '+996555100004', organization: 'Редакция', password: 'editor-pass-2', plan: 'start', editor: true });
    assert.equal(other.status, 201);
    const t2 = await login('editor2@example.com', 'editor-pass-2');
    const foreign = (await call(announcements, 'announcements', 'POST', t2, news())).body.item.id;
    const adminItem = (await call(announcements, 'announcements', 'POST', admin, news())).body.item.id;
    for (const id of [foreign, adminItem]) {
      assert.equal((await call(announcements, 'announcements', 'PATCH', editor, { id, item: news().item })).status, 403);
      assert.equal((await call(announcements, 'announcements', 'PATCH', editor, { id, action: 'withdraw' })).status, 403);
    }
    assert.equal((await call(announcements, 'announcements', 'PATCH', editor, { id: foreign, action: 'approve' })).status, 403, 'модерация — только администратор');
  });

  it('9. сотрудник снимает свою публикацию; администратор может снять любую', async () => {
    const own = (await call(announcements, 'announcements', 'POST', editor, news())).body.item.id;
    const r = await call(announcements, 'announcements', 'PATCH', editor, { id: own, action: 'withdraw', note: 'Устарело' });
    assert.equal(r.body.item.moderationStatus, 'withdrawn');
    assert.ok(!(await publicIds()).includes(own));
    const adm = await call(announcements, 'announcements', 'PATCH', admin, { id: editorPost, action: 'withdraw', note: 'Проверка администратора' });
    assert.equal(adm.body.item.moderationStatus, 'withdrawn');
  });
});

describe('отзыв прав', () => {
  it('10. после отзыва — снова оплата и модерация; опубликованное остаётся', async () => {
    const kept = (await call(announcements, 'announcements', 'POST', editor, news())).body.item.id;
    const r = await call(usersApi, 'users', 'PATCH', admin, { email: 'editor1@example.com', editor: 'revoke' });
    assert.ok(r.body.user.editor.revokedAt, 'дата отзыва сохранена');
    assert.equal((await call(auth, 'auth', 'GET', editor)).body.usage.editor, undefined);
    assert.equal((await call(announcements, 'announcements', 'POST', editor, notice('После отзыва'))).status, 402, 'без оплаты — отказ');
    assert.equal((await call(announcements, 'announcements', 'POST', editor, news())).status, 402);
    assert.ok((await publicIds()).includes(kept), 'опубликованное раньше остаётся на сайте');
    // правка своего материала после отзыва снова идёт на модерацию
    const cur = (await stored(kept))!;
    const ed = await call(announcements, 'announcements', 'PATCH', editor, { id: kept, item: buildItem({ ...emptyState(), type: 'news', category: 'news', title: 'Правка после отзыва', description: cur.description.ru }, { initial: cur as any, now: NOW }) });
    assert.equal(ed.status, 200);
    assert.equal(ed.body.item.moderationStatus, 'pending');
    assert.equal(ed.body.item.isVerified, false);
    // повторное назначение — новая дата
    const again = await call(usersApi, 'users', 'PATCH', admin, { email: 'editor1@example.com', editor: 'grant' });
    assert.equal(again.body.user.editor.revokedAt, undefined);
  });
});

describe('остальные пользователи — как прежде', () => {
  it('11. обычный пользователь: без оплаты нельзя, после оплаты — на модерацию, «Новости» закрыты', async () => {
    await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Клиент', email: 'client@example.com', phone: '+996555100005', organization: 'ОсОО Клиент', password: 'client-pass-1', plan: 'start' });
    const t = await login('client@example.com', 'client-pass-1');
    assert.equal((await call(announcements, 'announcements', 'POST', t, notice('Без оплаты'))).status, 402);
    await call(usersApi, 'users', 'PATCH', admin, { email: 'client@example.com', paymentStatus: 'paid' });
    const ok = await call(announcements, 'announcements', 'POST', t, notice('Клиентское объявление'));
    assert.equal(ok.body.item.moderationStatus, 'pending');
    assert.equal(isPaid(ok.body.item), true);
    const nw = await call(announcements, 'announcements', 'POST', t, news());
    assert.equal(nw.status, 403);
    assert.match(nw.body.message, /только сотрудникам редакции/);
    assert.ok(!availableTypes({ plan: 'start', govVerified: false }).includes('news'));
    // 13. «Одобрить» работает как раньше и не ставит «Подтверждено»
    const ap = await call(announcements, 'announcements', 'PATCH', admin, { id: ok.body.item.id, action: 'approve' });
    assert.equal(ap.body.item.moderationStatus, 'approved');
    assert.equal(ap.body.item.isVerified, false);
    // обычный пользователь не может сам поставить «Подтверждено»
    const v = await call(announcements, 'announcements', 'POST', t, { item: { ...notice('С отметкой').item, isVerified: true } });
    assert.equal(v.body.item.isVerified, false);
  });

  it('12. официальные разделы и «Погода» закрыты сотруднику; права госорганов не изменились', async () => {
    const editor = await newEditor();
    for (const category of ['state', 'gov', 'laws', 'hazard']) {
      const r = await call(announcements, 'announcements', 'POST', editor, { item: { ...news().item, category } });
      assert.equal(r.status, 403, category);
    }
    // редакционные разделы: «Новости», «Бизнес-новости», «ИИ и IT-технологии»
    assert.deepEqual(categoriesFor('news', { plan: 'start', govVerified: false, editor: true }), ['news', 'business', 'tech']);
    assert.ok(!categoriesFor('alert', { plan: 'start', govVerified: false, editor: true }).includes('hazard'));
    // подтверждённый госорган — как раньше: официальные разделы, но не «Новости» редакции
    await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Мэрия', email: 'gov@example.com', phone: '+996555100006', organization: 'Мэрия', password: 'gov-pass-123', plan: 'gov' });
    const u = (await hgetJson<Record<string, any>>(USERS_KEY, 'gov@example.com'))!;
    await hsetJson(USERS_KEY, 'gov@example.com', { ...u, govStatus: 'verified', gov: { orgName: 'Мэрия г. Тест', status: 'verified' } });
    await call(usersApi, 'users', 'PATCH', admin, { email: 'gov@example.com', paymentStatus: 'paid', plan: 'gov' });
    const gt = await login('gov@example.com', 'gov-pass-123');
    const st = await call(announcements, 'announcements', 'POST', gt, { item: { ...news().item, category: 'state' } });
    assert.equal(st.status, 201);
    assert.equal(st.body.item.moderationStatus, 'approved');
    assert.equal(st.body.item.publishedByGov, true);
    assert.equal((await call(announcements, 'announcements', 'POST', gt, news())).status, 403, '«Новости» — не для госорганов');
  });

  it('коммерческий клиент с тарифом — в пределах лимита («Старт» — 3)', async () => {
    await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Лимит', email: 'limit-ed@example.com', phone: '+996555100007', organization: 'Лимит', password: 'limit-pass-1', plan: 'start' });
    await call(usersApi, 'users', 'PATCH', admin, { email: 'limit-ed@example.com', paymentStatus: 'paid' });
    const t = await login('limit-ed@example.com', 'limit-pass-1');
    for (let i = 1; i <= 3; i++) assert.equal((await call(announcements, 'announcements', 'POST', t, notice(`Лимит ${i}`))).status, 201);
    assert.equal((await call(announcements, 'announcements', 'POST', t, notice('Лимит 4'))).body.error, 'pack_exhausted');
  });

  it('сотрудник не получает доступ к панели', async () => {
    assert.equal((await call(usersApi, 'users', 'GET', editor)).status, 403);
    assert.equal((await call(announcements, 'announcements?scope=all', 'GET', editor)).status, 403);
  });
});
