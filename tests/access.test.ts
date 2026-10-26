/**
 * Три уровня доступа: посетитель, пользователь (в т. ч. сотрудник с отдельной учётной записью), администратор.
 * Права проверяет сервер: адрес (#admin, #cabinet) и скрытые кнопки ничего не разрешают сами по себе.
 * Локальная база в памяти; Upstash и настоящие данные не используются.
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
const { default: stats } = await import('../api/stats');
const { default: reports } = await import('../api/reports');
const { default: sources } = await import('../api/sources');
const { screenFromHash } = await import('../src/utils/route');
const { buildItem, emptyState } = await import('../src/components/SimplePublishForm');

let ip = 0;
const call = async (handler: (r: Request) => Promise<Response>, path: string, method: string, token?: string, body?: unknown) => {
  ip++;
  const r = await handler(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.9.${Math.floor(ip / 200)}.${ip % 200}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, any> };
};
const notice = (title: string) => ({ item: buildItem({ ...emptyState(), type: 'notice', category: 'notices', title, description: 'Текст объявления.' }, { now: '2026-10-26T12:00' }) });

let admin = '';
let staff = '';
before(async () => {
  admin = (await call(auth, 'auth', 'POST', undefined, { action: 'admin-login', password: 'admin-dev' })).body.token;
});

describe('1–3. публичный сайт и посетитель', () => {
  it('обычное открытие сайта — публичная главная, а не панель или вход', () => {
    assert.equal(screenFromHash(''), 'home');
    assert.equal(screenFromHash('#'), 'home');
    assert.equal(screenFromHash('#/n/ann-1'), 'home');
    assert.equal(screenFromHash('#admin'), 'admin', 'панель — только по явному адресу #admin');
    assert.equal(screenFromHash('#login'), 'login');
    assert.equal(screenFromHash('#cabinet'), 'cabinet');
  });

  it('публичные материалы доступны без входа', async () => {
    const r = await call(announcements, 'announcements', 'GET');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
  });

  it('посетитель без входа не получает административный доступ', async () => {
    assert.equal((await call(usersApi, 'users', 'GET')).status, 403);
    assert.equal((await call(announcements, 'announcements?scope=all', 'GET')).status, 403);
    assert.equal((await call(stats, 'stats?days=7', 'GET')).status, 403);
    assert.equal((await call(sources, 'sources?mail=list', 'GET')).status, 403);
    assert.equal((await call(announcements, 'announcements', 'PATCH', undefined, { id: 'x', action: 'approve' })).status, 401, 'без входа — «войдите»');
  });

  it('посетитель без входа не может разместить публикацию', async () => {
    const r = await call(announcements, 'announcements', 'POST', undefined, notice('Без входа'));
    assert.equal(r.status, 401);
  });

  it('поддельный или чужой токен не даёт прав', async () => {
    assert.equal((await call(usersApi, 'users', 'GET', 'abc.def')).status, 403);
    const forged = `${Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin', exp: Date.now() + 1e9 })).toString('base64url')}.fake`;
    assert.equal((await call(usersApi, 'users', 'GET', forged)).status, 403);
  });
});

describe('4–5. пользователь: вход в кабинет, без доступа к панели', () => {
  let user = '';
  before(async () => {
    const reg = await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Айгуль', email: 'cab-user@example.com', phone: '+996555000333', organization: 'ОсОО «Тест»', password: 'user-pass-123', plan: 'start' });
    assert.equal(reg.status, 201);
  });

  it('вход по e-mail и паролю — роль «пользователь», неверный пароль — понятная ошибка', async () => {
    const bad = await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'cab-user@example.com', password: 'wrong-pass' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error, 'wrong_credentials');
    const ok = await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'cab-user@example.com', password: 'user-pass-123' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.role, 'user');
    user = ok.body.token;
    const me = await call(auth, 'auth', 'GET', user);
    assert.equal(me.body.role, 'user');
    assert.equal(me.body.user.email, 'cab-user@example.com');
    assert.equal(me.body.user.sessionVersion, undefined, 'служебные поля входа не отдаются');
  });

  it('пользователь не получает доступ к административным API', async () => {
    assert.equal((await call(usersApi, 'users', 'GET', user)).status, 403);
    assert.equal((await call(usersApi, 'users', 'POST', user, { name: 'X', email: 'x@example.com', phone: '+996555000999', organization: 'X', password: 'xxxxxx' })).status, 403);
    assert.equal((await call(usersApi, 'users', 'PATCH', user, { email: 'cab-user@example.com', paymentStatus: 'paid' })).status, 403, 'сам себе оплату не подтвердит');
    assert.equal((await call(announcements, 'announcements?scope=all', 'GET', user)).status, 403);
    assert.equal((await call(announcements, 'announcements', 'PATCH', user, { id: 'x', action: 'approve' })).status, 403);
    assert.equal((await call(stats, 'stats?days=7', 'GET', user)).status, 403);
    assert.equal((await call(reports, 'reports', 'GET', user)).status, 403);
    assert.equal((await call(sources, 'sources?mail=settings', 'GET', user)).status, 403);
  });

  it('без подтверждённой оплаты публикация не отправляется (вход — не оплата)', async () => {
    const r = await call(announcements, 'announcements', 'POST', user, notice('Без оплаты'));
    assert.equal(r.status, 402);
  });
});

describe('6–7. сотрудник: отдельная учётная запись, созданная администратором', () => {
  it('администратор создаёт учётную запись; роль, оплату и статус госоргана из запроса задать нельзя', async () => {
    const r = await call(usersApi, 'users', 'POST', admin, {
      name: 'Бакыт (сотрудник)',
      email: 'staff1@example.com',
      phone: '+996555000444',
      organization: 'DataNews',
      password: 'staff-pass-1',
      plan: 'private',
      role: 'admin',
      paymentStatus: 'paid',
      govStatus: 'verified',
      periods: [{ id: 'x', plan: 'gov', start: '2026-01-01T00:00:00Z', end: '2027-01-01T00:00:00Z' }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.user.paymentStatus, 'unpaid');
    assert.equal(r.body.user.govStatus, undefined);
    assert.deepEqual(r.body.user.periods, []);
    assert.equal(r.body.user.salt, undefined);
    assert.equal(r.body.user.hash, undefined);
    const dup = await call(usersApi, 'users', 'POST', admin, { name: 'Дубль', email: 'staff1@example.com', phone: '+996555000444', organization: 'DataNews', password: 'staff-pass-1' });
    assert.equal(dup.status, 409);
  });

  it('сотрудник входит только как пользователь и, пока оплата не подтверждена, публиковать не может', async () => {
    const r = await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'staff1@example.com', password: 'staff-pass-1' });
    assert.equal(r.body.role, 'user');
    staff = r.body.token;
    assert.equal((await call(announcements, 'announcements', 'POST', staff, notice('Ещё нельзя'))).status, 402);
  });

  it('после «Подтвердить оплату» сотрудник размещает разрешённое — на модерацию, от имени организации из профиля', async () => {
    assert.equal((await call(usersApi, 'users', 'PATCH', admin, { email: 'staff1@example.com', paymentStatus: 'paid', plan: 'private' })).status, 200);
    const r = await call(announcements, 'announcements', 'POST', staff, notice('Объявление сотрудника'));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.item.moderationStatus, 'pending');
    assert.equal(r.body.item.eventDetails.organizer, 'DataNews');
    const mine = await call(announcements, 'announcements?scope=mine', 'GET', staff);
    assert.ok(mine.body.items.some((a: { id: string }) => a.id === r.body.item.id));
  });

  it('сотрудник не может публиковать в официальные разделы и присвоить себе статус госоргана', async () => {
    const news = buildItem({ ...emptyState(), type: 'news', category: 'state', title: 'Официально', description: 'Текст.' }, { now: '2026-10-26T12:00' });
    assert.equal((await call(announcements, 'announcements', 'POST', staff, { item: news })).status, 403);
    // заявка возможна, но статус ставит только администратор
    await call(auth, 'auth', 'POST', staff, { action: 'gov-request', orgName: 'Мэрия', position: 'сотрудник', docUrl: 'https://example.kg/doc' });
    const me = await call(auth, 'auth', 'GET', staff);
    assert.notEqual(me.body.user.govStatus, 'verified');
  });

  it('сотрудник не управляет пользователями, тарифами, оплатой и модерацией', async () => {
    assert.equal((await call(usersApi, 'users', 'GET', staff)).status, 403);
    assert.equal((await call(usersApi, 'users', 'PATCH', staff, { email: 'staff1@example.com', paymentStatus: 'paid', plan: 'organizer' })).status, 403);
    assert.equal((await call(usersApi, 'users', 'PATCH', staff, { email: 'cab-user@example.com', password: 'hijack-123' })).status, 403);
    const any = (await call(announcements, 'announcements?scope=mine', 'GET', staff)).body.items[0];
    assert.equal((await call(announcements, 'announcements', 'PATCH', staff, { id: any.id, action: 'approve' })).status, 403, 'своё тоже не одобрит');
    assert.equal((await call(announcements, `announcements?id=${any.id}`, 'DELETE', staff)).status, 403);
  });

  it('сотрудник не правит чужие публикации', async () => {
    const other = await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Другой', email: 'other@example.com', phone: '+996555000555', organization: 'Другая организация', password: 'other-pass-1', plan: 'start' });
    await call(usersApi, 'users', 'PATCH', admin, { email: 'other@example.com', paymentStatus: 'paid' });
    const post = await call(announcements, 'announcements', 'POST', other.body.token, notice('Чужое объявление'));
    const r = await call(announcements, 'announcements', 'PATCH', staff, { id: post.body.item.id, item: notice('Подмена').item });
    assert.equal(r.status, 403);
  });
});

describe('8. администратор', () => {
  it('администратор по-прежнему входит паролем и видит панель: пользователи, модерация, статистика', async () => {
    const bad = await call(auth, 'auth', 'POST', undefined, { action: 'admin-login', password: 'wrong' });
    assert.equal(bad.status, 401);
    assert.equal((await call(auth, 'auth', 'GET', admin)).body.role, 'admin');
    assert.equal((await call(usersApi, 'users', 'GET', admin)).status, 200);
    assert.equal((await call(announcements, 'announcements?scope=all', 'GET', admin)).status, 200);
    assert.equal((await call(stats, 'stats?days=7', 'GET', admin)).status, 200);
  });

  it('пароль пользователя нельзя войти в панель', async () => {
    const r = await call(auth, 'auth', 'POST', undefined, { action: 'admin-login', password: 'staff-pass-1' });
    assert.equal(r.status, 401);
  });
});

describe('9. выход и смена пароля', () => {
  it('после выхода прежний вход не действует — нужно войти снова', async () => {
    const t = (await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'cab-user@example.com', password: 'user-pass-123' })).body.token;
    assert.equal((await call(auth, 'auth', 'GET', t)).body.role, 'user');
    assert.equal((await call(auth, 'auth', 'POST', t, { action: 'logout' })).status, 200);
    assert.equal((await call(auth, 'auth', 'GET', t)).body.role, 'guest');
    assert.equal((await call(announcements, 'announcements?scope=mine', 'GET', t)).status, 401);
    const again = (await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'cab-user@example.com', password: 'user-pass-123' })).body.token;
    assert.equal((await call(auth, 'auth', 'GET', again)).body.role, 'user', 'новый вход работает');
  });

  it('новый пароль от администратора закрывает прежние входы сотрудника; старый пароль больше не подходит', async () => {
    assert.equal((await call(usersApi, 'users', 'PATCH', admin, { email: 'staff1@example.com', password: '123' })).status, 400, 'короткий пароль не принимается');
    assert.equal((await call(usersApi, 'users', 'PATCH', admin, { email: 'staff1@example.com', password: 'new-staff-pass' })).status, 200);
    assert.equal((await call(auth, 'auth', 'GET', staff)).body.role, 'guest');
    assert.equal((await call(announcements, 'announcements', 'POST', staff, notice('Старым входом'))).status, 401);
    assert.equal((await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'staff1@example.com', password: 'staff-pass-1' })).status, 401);
    assert.equal((await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'staff1@example.com', password: 'new-staff-pass' })).body.role, 'user');
  });
});

describe('10. тарифы, лимиты и статусы работают как прежде', () => {
  it('лимит тарифа «Старт» и модерация', async () => {
    await call(auth, 'auth', 'POST', undefined, { action: 'register', name: 'Лимит', email: 'limit2@example.com', phone: '+996555000666', organization: 'Лимит', password: 'limit-pass-1', plan: 'start' });
    await call(usersApi, 'users', 'PATCH', admin, { email: 'limit2@example.com', paymentStatus: 'paid' });
    const t = (await call(auth, 'auth', 'POST', undefined, { action: 'login', email: 'limit2@example.com', password: 'limit-pass-1' })).body.token;
    for (let i = 1; i <= 3; i++) {
      const r = await call(announcements, 'announcements', 'POST', t, notice(`Лимит ${i}`));
      assert.equal(r.status, 201);
      assert.equal(r.body.item.moderationStatus, 'pending');
    }
    assert.equal((await call(announcements, 'announcements', 'POST', t, notice('Лимит 4'))).body.error, 'pack_exhausted');
    const fake = await call(announcements, 'announcements', 'POST', t, { item: { ...notice('Сам себе').item, moderationStatus: 'approved' } });
    assert.notEqual(fake.status, 201, 'лимит исчерпан');
  });
});
