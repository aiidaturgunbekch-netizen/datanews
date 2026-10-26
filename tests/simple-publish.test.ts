/**
 * Простая форма размещения в личном кабинете: данные собирает та же функция, что и форма (buildItem),
 * а проверяет настоящий обработчик /api/announcements — тарифы, лимиты, права, модерация, редакционные поля.
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
const { hgetJson, hsetJson } = await import('../api/_lib/kv');
const { ANN_KEY } = await import('../api/_lib/announcements');
const { USERS_KEY } = await import('../api/_lib/users');
const { buildItem, emptyState, stateFrom, validate } = await import('../src/components/SimplePublishForm');
const { availableTypes, categoriesFor } = await import('../src/config/publishTypes');

const NOW = '2026-10-26T15:00';
let admin = '';
let ip = 10;

const req = async (method: string, token: string, body?: unknown, path = 'announcements') => {
  const r = await announcements(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-forwarded-for': `10.7.0.${ip}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: (await r.json()) as Record<string, any> };
};

/** Регистрация; paid — администратор подтверждает оплату (как в панели «Пользователи») */
const register = async (email: string, plan: string, opts: { paid?: boolean; organization?: string } = {}) => {
  ip++;
  const r = await auth(
    new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'x-forwarded-for': `10.8.0.${ip}` },
      body: JSON.stringify({ action: 'register', name: 'Айгуль Асанова', email, phone: '+996555000111', organization: opts.organization ?? 'Центр «Ала-Тоо»', password: 'test-pass-123', plan, paymentRef: 'P-1' }),
    })
  );
  const token = (await r.json()).token as string;
  if (opts.paid) {
    const p = await usersApi(
      new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
        body: JSON.stringify({ email, paymentStatus: 'paid', plan }),
      })
    );
    assert.equal(p.status, 200);
  }
  return token;
};

const form = (over: Partial<ReturnType<typeof emptyState>>) => ({ ...emptyState(), ...over });
const publish = (token: string, s: ReturnType<typeof emptyState>, imageData?: string) => {
  assert.equal(validate(s), null, 'форма пропускает эти данные');
  return req('POST', token, { item: buildItem(s, { imageData, now: NOW }) });
};
const stored = (id: string) => hgetJson<Record<string, any>>(ANN_KEY, id);

let user = '';
before(async () => {
  const a = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await a.json()).token;
  user = await register('simple-user@example.com', 'private', { paid: true });
});

describe('простая форма: типы публикаций без выдуманных данных', () => {
  it('мероприятие без адреса — сохраняется, адрес пустой, на модерации', async () => {
    const r = await publish(user, form({ type: 'event', category: 'concerts', title: 'Концерт хора', description: 'Концерт детского хора.', start: '2026-11-20T18:00', venue: 'Дом культуры' }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.location.ru, '');
    assert.equal(a.eventDetails.venue, 'Дом культуры');
    assert.equal(a.moderationStatus, 'pending');
  });

  it('онлайн-мероприятие — без физического адреса, «Онлайн» в площадке, ссылка на участие', async () => {
    const r = await publish(user, form({ type: 'online', category: 'education', title: 'Вебинар по грамотности', description: 'Онлайн-занятие.', start: '2026-11-21T15:00', joinUrl: 'https://example.kg/join', address: 'не должен попасть' }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.location.ru, '', 'адрес у онлайн-мероприятия не сохраняется');
    assert.equal(a.eventDetails.venue, 'Онлайн');
    assert.equal(a.venueUrl, 'https://example.kg/join');
    assert.equal(a.geo, undefined);
    assert.equal(a.city, 'all');
  });

  it('предупреждение без точного адреса — территория отдельно, срочность «плановая», без уровня опасности', async () => {
    const r = await publish(
      user,
      form({ type: 'alert', category: 'water', title: 'Отключение воды', description: 'Плановые работы на сетях.', start: '2026-11-03T09:00', end: '2026-11-03T18:00', city: 'chui', locality: 'с. Беловодское' })
    );
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.location.ru, '');
    assert.equal(a.locality, 'с. Беловодское');
    assert.equal(a.city, 'chui');
    assert.equal(a.urgency, 'planned');
    assert.equal(a.dangerLevel, undefined);
  });

  it('объявление без адреса и фото — дата размещения автоматически, картинки нет', async () => {
    const r = await publish(user, form({ type: 'notice', category: 'notices', title: 'Набор в кружок', description: 'Открыт набор детей 7–12 лет.' }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.category, 'notices');
    assert.equal(a.startDate, NOW, 'дата размещения');
    assert.equal(a.endDate, '', 'срок действия не указан — не придумывается');
    assert.equal(a.location.ru, '');
    assert.equal(a.imageUrl, undefined, 'фото нет — в базе нет и заглушки');
    assert.equal(a.urgency, 'regular');
  });

  it('объявление со сроком действия — срок сохраняется как дата окончания', async () => {
    const r = await publish(user, form({ type: 'notice', category: 'notices', title: 'Приём документов', description: 'Принимаем документы.', end: '2026-12-01' }));
    assert.equal((await stored(r.body.item.id))!.endDate, '2026-12-01T23:59');
  });

  it('организация берётся из профиля, вводить её в публикации не нужно', async () => {
    const r = await publish(user, form({ type: 'notice', category: 'notices', title: 'Режим работы', description: 'Изменён режим работы.' }));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.eventDetails.organizer, 'Центр «Ала-Тоо»');
    assert.equal(a.sourceName, 'Центр «Ала-Тоо»');
  });
});

describe('новость: только госорганам и театрам на тарифе «Культура»', () => {
  it('обычному пользователю тип «Новость» не показывается, а прямой запрос в официальный раздел отклоняется', async () => {
    assert.ok(!availableTypes({ plan: 'private', govVerified: false }).includes('news'));
    for (const category of ['state', 'gov', 'laws', 'hazard']) {
      const r = await req('POST', user, { item: buildItem(form({ type: 'news', category: category as any, title: `Новость ${category}`, description: 'Текст.' }), { now: NOW }) });
      assert.equal(r.status, 403, category);
      assert.equal(r.body.error, 'category_not_allowed');
    }
  });

  it('подтверждённый госорган: новость с автоматической датой размещения (действующее правило тарифа — без предварительной модерации)', async () => {
    const token = await register('gov-news@example.com', 'gov', { organization: 'Мэрия г. Тест' });
    const u = (await hgetJson<Record<string, any>>(USERS_KEY, 'gov-news@example.com'))!;
    await hsetJson(USERS_KEY, 'gov-news@example.com', { ...u, govStatus: 'verified', gov: { orgName: 'Мэрия города Тест', status: 'verified' } });
    await usersApi(
      new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
        body: JSON.stringify({ email: 'gov-news@example.com', paymentStatus: 'paid', plan: 'gov' }),
      })
    );
    assert.ok(availableTypes({ plan: 'gov', govVerified: true }).includes('news'));
    const r = await publish(token, form({ type: 'news', category: 'state', title: 'Мэрия сообщает', description: 'Решение принято.' }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.startDate, NOW, 'дата новости — дата размещения');
    assert.equal(a.sourceName, 'Мэрия города Тест');
    assert.equal(a.moderationStatus, 'approved', 'правило тарифа госорганов не изменено');
  });

  it('тариф «Культура и театр»: новость — в своём разделе; предупреждения и объявления недоступны', async () => {
    const token = await register('theatre@example.com', 'culture', { paid: true, organization: 'Театр «Тест»' });
    assert.deepEqual(availableTypes({ plan: 'culture', govVerified: false }), ['event', 'online', 'news']);
    assert.deepEqual(categoriesFor('news', { plan: 'culture', govVerified: false }), ['culture']);
    const ok = await publish(token, form({ type: 'news', category: 'culture', title: 'Премьера сезона', description: 'Театр открывает сезон.' }));
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.item.moderationStatus, 'pending');
    const bad = await req('POST', token, { item: buildItem(form({ type: 'alert', category: 'water', title: 'Вода', description: 'Текст.', start: '2026-11-03T09:00' }), { now: NOW }) });
    assert.equal(bad.status, 403);
  });
});

describe('тарифы и право на размещение', () => {
  it('без подтверждённой оплаты отправить нельзя (регистрация — не оплата)', async () => {
    const token = await register('unpaid@example.com', 'start');
    const r = await publish(token, form({ type: 'notice', category: 'notices', title: 'Без оплаты', description: 'Текст.' }));
    assert.equal(r.status, 402);
    assert.equal(r.body.error, 'payment_required');
  });

  it('срок тарифа закончился — понятное сообщение', async () => {
    const token = await register('expired@example.com', 'start');
    const u = (await hgetJson<Record<string, any>>(USERS_KEY, 'expired@example.com'))!;
    await hsetJson(USERS_KEY, 'expired@example.com', {
      ...u,
      paymentStatus: 'paid',
      periods: [{ id: 'old', plan: 'start', start: '2026-08-01T00:00:00Z', end: '2026-08-31T00:00:00Z', priceSom: 2000, confirmedAt: '2026-08-01T00:00:00Z' }],
    });
    const r = await publish(token, form({ type: 'notice', category: 'notices', title: 'После срока', description: 'Текст.' }));
    assert.equal(r.status, 402);
    assert.equal(r.body.error, 'period_expired');
    assert.match(r.body.message, /Срок действия тарифа завершён/);
  });

  it('превышение лимита блокирует отправку (тариф «Старт» — 3 публикации)', async () => {
    const token = await register('limit@example.com', 'start', { paid: true });
    for (let i = 1; i <= 3; i++) {
      const r = await publish(token, form({ type: 'notice', category: 'notices', title: `Объявление ${i}`, description: `Текст ${i}.` }));
      assert.equal(r.status, 201, JSON.stringify(r.body));
    }
    const r = await publish(token, form({ type: 'notice', category: 'notices', title: 'Объявление 4', description: 'Текст 4.' }));
    assert.equal(r.status, 403);
    assert.equal(r.body.error, 'pack_exhausted');
    assert.match(r.body.message, /Лимит публикаций по вашему тарифу исчерпан/);
  });
});

describe('защита: статус и редакционные поля нельзя подделать', () => {
  // отдельный пользователь: действующее ограничение — не больше 10 отправок в час на пользователя
  let user = '';
  before(async () => {
    user = await register('simple-user2@example.com', 'private', { paid: true });
  });

  it('статус «Опубликовано», подтверждение, срочность, уровень опасности и официальный источник из запроса игнорируются', async () => {
    const item = {
      ...buildItem(form({ type: 'alert', category: 'electricity', title: 'Отключение света', description: 'Работы.', start: '2026-11-05T09:00' }), { now: NOW }),
      moderationStatus: 'approved',
      isVerified: true,
      urgency: 'emergency',
      dangerLevel: 'high',
      newsKind: 'decision',
      isUrgentTicker: true,
      ticketUrlVerified: true,
      sourceKind: 'official',
      sourceName: 'Министерство энергетики',
      sourceOrgType: 'ГОС',
      authorityUrl: 'https://gov.example.kg',
      additionalSourceUrl: 'https://media.example.kg',
      legal: { docTitle: { ru: 'Постановление' } },
      geo: { lat: 42.8, lng: 74.6 },
      testMaterial: false,
      publishedByGov: true,
      lastCheckedAt: '2026-10-26T10:00',
    };
    const r = await req('POST', user, { item });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const a = (await stored(r.body.item.id))!;
    assert.equal(a.moderationStatus, 'pending');
    assert.equal(a.isVerified, false);
    assert.equal(a.urgency, 'planned');
    for (const k of ['dangerLevel', 'newsKind', 'sourceKind', 'authorityUrl', 'additionalSourceUrl', 'legal', 'geo', 'publishedByGov', 'lastCheckedAt']) assert.equal(a[k], undefined, k);
    assert.equal(a.isUrgentTicker, false);
    assert.equal(a.ticketUrlVerified, false);
    assert.equal(a.sourceName, 'Центр «Ала-Тоо»');
    assert.notEqual(a.sourceOrgType, 'ГОС');
    const pub = await req('GET', '', undefined);
    assert.ok(!pub.body.items.some((x: { id: string }) => x.id === a.id), 'на сайте нет до «Одобрить»');
  });

  it('обычная публикация проходит модерацию: видна на сайте только после «Одобрить»', async () => {
    const r = await publish(user, form({ type: 'event', category: 'sport', title: 'Турнир по футболу', description: 'Детский турнир.', start: '2026-11-22T10:00', venue: 'Стадион' }));
    const id = r.body.item.id;
    assert.equal(r.body.item.moderationStatus, 'pending');
    const before = await req('GET', '', undefined);
    assert.ok(!before.body.items.some((x: { id: string }) => x.id === id));
    const ok = await req('PATCH', admin, { id, action: 'approve' });
    assert.equal(ok.body.item.moderationStatus, 'approved');
    assert.equal(ok.body.item.isVerified, false, '«Одобрить» не ставит «Подтверждено»');
    const after = await req('GET', '', undefined);
    assert.ok(after.body.items.some((x: { id: string }) => x.id === id));
  });

  it('правка: введённые данные сохраняются, отклонённая публикация снова идёт на модерацию, редакционные поля остаются', async () => {
    const r = await publish(
      user,
      form({ type: 'event', category: 'exhibitions', title: 'Выставка картин', description: 'Работы молодых художников.', start: '2026-11-25T11:00', venue: 'Галерея', address: 'ул. Тестовая, 5', city: 'bishkek', price: '200 сом', phone: '+996 555 000 222', tickets: 'https://tickets.example.kg/1' })
    );
    const id = r.body.item.id;
    // редакция отметила уровень и отклонила с причиной
    const cur = (await stored(id))!;
    await hsetJson(ANN_KEY, id, { ...cur, newsKind: 'statement' });
    const rej = await req('PATCH', admin, { id, action: 'reject', note: 'Уточните время' });
    assert.equal(rej.body.item.moderationStatus, 'rejected');

    // автор открывает публикацию в форме и меняет только время
    const s = stateFrom((await stored(id)) as any);
    assert.equal(s.type, 'event');
    assert.equal(s.address, 'ул. Тестовая, 5');
    const ed = await req('PATCH', user, { id, item: buildItem({ ...s, start: '2026-11-25T12:00' }, { initial: (await stored(id)) as any, keepImage: true, now: NOW }) });
    assert.equal(ed.status, 200, JSON.stringify(ed.body));
    const a = (await stored(id))!;
    assert.equal(a.moderationStatus, 'pending', 'снова на модерации');
    assert.equal(a.startDate, '2026-11-25T12:00');
    assert.equal(a.location.ru, 'ул. Тестовая, 5');
    assert.equal(a.eventDetails.venue, 'Галерея');
    assert.equal(a.eventDetails.priceText.ru, '200 сом');
    assert.equal(a.eventDetails.contactPhone, '+996 555 000 222');
    assert.equal(a.ticketUrl, 'https://tickets.example.kg/1');
    assert.equal(a.eventDetails.organizer, 'Центр «Ала-Тоо»');
    assert.equal(a.newsKind, 'statement', 'отметка редакции не стирается правкой автора');
    assert.equal(a.isVerified, false);
  });

  it('форма не пропускает пустые обязательные поля и неверные ссылки', () => {
    assert.equal(validate(form({ type: 'event', category: 'concerts', title: 'Т', description: '' , start: '2026-11-20T18:00'})), 'errRequired');
    assert.equal(validate(form({ type: 'event', category: 'concerts', title: 'Т', description: 'Д' })), 'errRequired', 'у мероприятия нужна дата');
    assert.equal(validate(form({ type: 'notice', category: 'notices', title: 'Т', description: 'Д' })), null, 'у объявления дата не нужна');
    assert.equal(validate(form({ type: 'online', category: 'concerts', title: 'Т', description: 'Д', start: '2026-11-20T18:00', joinUrl: 'zoom' })), 'errUrl');
    assert.equal(validate(form({ type: 'alert', category: 'water', title: 'Т', description: 'Д', start: '2026-11-20T18:00', end: '2026-11-19T18:00' })), 'errEndBeforeStart');
  });
});
