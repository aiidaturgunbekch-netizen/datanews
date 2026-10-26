/**
 * Черновики без адреса: адрес необязателен ни для одного типа публикаций, ничего не подставляется,
 * тестовые письма нельзя опубликовать никаким запросом. Проверяется настоящий обработчик /api/announcements.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.ADMIN_PASSWORD;
const SECRET = 'draft-place-secret-0123456789abcdef-XYZ';
process.env.MAIL_INGEST_SECRET = SECRET;

const { default: auth } = await import('../api/auth');
const { default: sources } = await import('../api/sources');
const { default: announcements } = await import('../api/announcements');
const { hmacHex } = await import('../api/_lib/mail');
const { hgetJson } = await import('../api/_lib/kv');
const { ANN_KEY } = await import('../api/_lib/announcements');
const { placeHint, placeText } = await import('../src/utils/place');
const { articleHtml } = await import('../api/_lib/articlePage');

let admin = '';
before(async () => {
  const r = await auth(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'admin-login', password: 'admin-dev' }) }));
  admin = (await r.json()).token;
  await sources(new Request('http://localhost/api/sources?mail=settings', { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: JSON.stringify({ enabled: true }) }));
});

const call = async (method: string, body?: unknown) => {
  const r = await announcements(
    new Request('http://localhost/api/announcements', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return { status: r.status, body: (await r.json()) as Record<string, any> };
};
const publicIds = async () => ((await (await announcements(new Request('http://localhost/api/announcements'))).json()).items as { id: string }[]).map((a) => a.id);

/** То, что отправляет форма при «Сохранить черновик» (пустые поля — пустые строки, как в форме) */
const formItem = (over: Record<string, unknown>) => ({
  summary: { ru: '' },
  location: { ru: '' },
  locality: '',
  district: '',
  endDate: '',
  imageUrl: '',
  eventDetails: { venue: '', organizer: '', contactPhone: '', timeRange: '' },
  ...over,
});
let n = 0;
const uniq = (s: string) => `${s} №${++n}-${Math.random().toString(36).slice(2, 6)}`;

const saveDraft = async (item: Record<string, unknown>, mailId?: string) => {
  const r = await call('POST', { item, asDraft: true, mailId });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const stored = await hgetJson<Record<string, any>>(ANN_KEY, r.body.item.id);
  assert.ok(stored, 'черновик сохранён в базе');
  assert.equal(stored!.moderationStatus, 'pending', 'черновик — в «Модерации»');
  assert.ok(!(await publicIds()).includes(stored!.id), 'на сайте черновика нет');
  return stored!;
};

describe('шесть сценариев: черновик сохраняется без выдуманного адреса', () => {
  it('1. новость государственного органа без адреса', async () => {
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Минздрав сообщил о начале вакцинации') },
        description: { ru: 'Министерство здравоохранения сообщило о начале сезонной вакцинации.' },
        category: 'gov',
        city: 'all',
        startDate: '2026-11-02T09:00',
      })
    );
    assert.equal(a.location.ru, '');
    assert.equal(a.city, 'all');
    assert.equal(placeHint({ category: 'gov', location: '', venue: '', locality: '', district: '' }), null, 'для новости госоргана подсказки о месте нет');
  });

  it('2. отключение воды с указанными улицами: улицы — в месте, район — отдельно', async () => {
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Отключение холодной воды') },
        description: { ru: 'Плановое отключение холодной воды.' },
        category: 'water',
        city: 'bishkek',
        location: { ru: 'ул. Токтогула (от ул. Исанова до ул. Логвиненко), ул. Киевская' },
        district: 'Первомайский район',
        startDate: '2026-11-03T09:00',
      })
    );
    assert.equal(a.location.ru, 'ул. Токтогула (от ул. Исанова до ул. Логвиненко), ул. Киевская');
    assert.equal(a.district, 'Первомайский район');
    assert.equal(a.geo, undefined, 'точка на карте не ставится сама');
    assert.equal(placeHint({ category: 'water', location: a.location.ru, venue: '', locality: '', district: a.district }), null);
    assert.equal(placeHint({ category: 'water', location: '', venue: '', locality: '', district: '' }), 'territory', 'без улиц и района — подсказка, не запрет');
  });

  it('3. афиша с известным местом — место сохраняется как в источнике', async () => {
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Концерт симфонического оркестра') },
        description: { ru: 'Концерт симфонического оркестра.' },
        category: 'concerts',
        city: 'bishkek',
        location: { ru: 'пр. Чуй, 253' },
        eventDetails: { venue: 'Филармония им. Т. Сатылганова', organizer: '', contactPhone: '', timeRange: '' },
        startDate: '2026-11-20T18:30',
      })
    );
    assert.equal(a.location.ru, 'пр. Чуй, 253');
    assert.equal(a.eventDetails.venue, 'Филармония им. Т. Сатылганова');
    assert.equal(placeHint({ category: 'concerts', location: a.location.ru, venue: '', locality: '', district: '' }), null);
  });

  it('4. онлайн-мероприятие: без физического адреса, «Онлайн» — в поле «Площадка», не в адресе', async () => {
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Онлайн-лекция о цифровой грамотности') },
        description: { ru: 'Лекция проходит онлайн, ссылка на трансляцию — на сайте организатора.' },
        category: 'education',
        city: 'all',
        eventDetails: { venue: 'Онлайн', organizer: '', contactPhone: '', timeRange: '' },
        venueUrl: 'https://example.kg/stream',
        startDate: '2026-11-05T15:00',
      })
    );
    assert.equal(a.location.ru, '', 'адрес пустой — «Онлайн» не попадает в адрес');
    assert.equal(a.geo, undefined, 'точки на карте нет');
    assert.equal(placeText(a as any), 'Онлайн', 'в карточке показывается формат «Онлайн»');
    assert.equal(placeHint({ category: 'education', location: '', venue: 'Онлайн', locality: '', district: '' }), null);
  });

  it('5. общее объявление организации без адреса', async () => {
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Изменение графика приёма граждан') },
        description: { ru: 'Организация сообщает об изменении графика приёма граждан.' },
        category: 'gov',
        city: 'osh',
        startDate: '2026-11-06T09:00',
      })
    );
    assert.equal(a.location.ru, '');
    assert.equal(a.city, 'osh', 'область сохраняется, только если её выбрали');
    assert.equal(placeText(a as any), '', 'в карточке нет пустой строки места');
  });

  it('6. письмо без адреса → черновик: место пустое, ничего не подставлено', async () => {
    const body = JSON.stringify({
      messageId: `msg${Math.random().toString(36).slice(2, 12)}`,
      from: 'Пресс-служба <press@example.gov.kg>',
      subject: 'Сообщение пресс-службы',
      receivedAt: '2026-10-25T08:00:00Z',
      text: `Пресс-служба сообщает о проведении приёма граждан 12 ноября 2026 года в 10:00.\nИсх. № ${Math.random().toString(36).slice(2, 8)}`,
      attachments: [],
    });
    const ts = String(Date.now());
    const nonce = `nonce-${Date.now()}-place-abcdefgh`;
    const sig = await hmacHex(SECRET, `${ts}.${nonce}.${body}`);
    const r = await sources(
      new Request('http://localhost/api/sources?mail=ingest', {
        method: 'POST',
        headers: { 'x-datanews-timestamp': ts, 'x-datanews-nonce': nonce, 'x-datanews-signature': sig, 'x-forwarded-for': '10.9.9.9' },
        body,
      })
    );
    const ingested = await r.json();
    assert.equal(r.status, 200, JSON.stringify(ingested));
    const list = await (await sources(new Request('http://localhost/api/sources?mail=list', { headers: { Authorization: `Bearer ${admin}` } }))).json();
    const mail = list.items.find((m: { id: string }) => m.id === ingested.id);
    const d = mail.suggestion.draft;
    assert.ok(!d.location?.ru, 'разбор письма не придумал адрес');
    assert.ok(mail.flags.includes('no_place'));
    // как форма: предложение из письма, пустое место, область не найдена — «Весь Кыргызстан»
    const a = await saveDraft(
      formItem({
        title: { ru: uniq('Приём граждан') },
        description: { ru: mail.text },
        category: d.category || 'gov',
        city: d.city || 'all',
        startDate: d.startDate,
      }),
      mail.id
    );
    assert.equal(a.location.ru, '');
    assert.equal(a.startDate, '2026-11-12T10:00');
    assert.equal(a.imageUrl, undefined, 'фото нет — в базе нет и картинки-заглушки');
    assert.equal(a.testMaterial, undefined, 'обычное письмо — не тестовое');
    const ok = await call('PATCH', { id: a.id, action: 'approve' });
    assert.equal(ok.status, 200, '«Одобрить» для обычного черновика работает как раньше');
    assert.ok((await publicIds()).includes(a.id));
  });
});

describe('карточка и страница без адреса', () => {
  it('«Где» на странице /n/ — только известная территория, без пустого адреса', () => {
    const base = {
      id: 'x', protocolCode: '#', title: { ru: 'Т', kg: 'Т', en: 'Т' }, summary: { ru: '', kg: '', en: '' }, description: { ru: 'Текст', kg: 'Текст', en: 'Текст' },
      category: 'gov', city: 'osh', location: { ru: '', kg: '', en: '' }, startDate: '2026-11-06T09:00', endDate: '', urgency: 'regular', status: 'scheduled',
      sourceName: 'Мэрия', sourceOrgType: 'ГОС', isVerified: false, publishedAt: '2026-11-01T10:00', updatedAt: '2026-11-01T10:00',
    } as any;
    const html = articleHtml(base, 'ru');
    assert.match(html, /Где<\/dt><dd[^>]*>г\. Ош<\/dd>|Где<\/dt><dd[^>]*>[^<]*Ош[^<]*<\/dd>/);
    const withAddr = articleHtml({ ...base, location: { ru: 'ул. Ленина, 1', kg: 'ул. Ленина, 1', en: 'ул. Ленина, 1' } }, 'ru');
    assert.match(withAddr, /ул\. Ленина, 1/);
  });
});

describe('тестовые письма нельзя опубликовать — проверка на сервере', () => {
  let testDraftId = '';
  let mailId = '';
  before(async () => {
    const body = JSON.stringify({
      messageId: `msg${Math.random().toString(36).slice(2, 12)}`,
      from: 'Редакция <datanews.kg7@gmail.com>',
      subject: 'TEST DataNews',
      receivedAt: '2026-10-25T08:00:00Z',
      text: `Тестовое письмо, не публиковать. 30 ноября 2026 года в 10:00.\nИсх. № ${Math.random().toString(36).slice(2, 8)}`,
      attachments: [],
    });
    const ts = String(Date.now());
    const nonce = `nonce-${Date.now()}-test-abcdefgh`;
    const sig = await hmacHex(SECRET, `${ts}.${nonce}.${body}`);
    const r = await sources(
      new Request('http://localhost/api/sources?mail=ingest', {
        method: 'POST',
        headers: { 'x-datanews-timestamp': ts, 'x-datanews-nonce': nonce, 'x-datanews-signature': sig, 'x-forwarded-for': '10.9.9.8' },
        body,
      })
    );
    mailId = (await r.json()).id;
    // заголовок без пометки «TEST»: тестовым материал делает само письмо (сервер смотрит тему письма)
    const d = await call('POST', { item: formItem({ title: { ru: uniq('Объявление из письма') }, description: { ru: 'Текст объявления.' }, category: 'gov', city: 'all', startDate: '2026-11-30T10:00' }), asDraft: true, mailId });
    assert.equal(d.status, 201);
    testDraftId = d.body.item.id;
    assert.equal(d.body.item.testMaterial, true);
    assert.match(d.body.item.history.at(-1).note, /тестовое письмо, публикация запрещена/);
  });

  it('«Одобрить» отклоняется сервером с понятной причиной', async () => {
    const r = await call('PATCH', { id: testDraftId, action: 'approve' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, 'test_material');
    assert.match(r.body.message, /Тестовый материал/);
    assert.equal((await hgetJson<Record<string, any>>(ANN_KEY, testDraftId))!.moderationStatus, 'pending');
  });

  it('«Восстановить» и повторная запись тем же id тоже не публикуют', async () => {
    assert.equal((await call('PATCH', { id: testDraftId, action: 'restore' })).status, 409);
    const over = await call('POST', { item: formItem({ id: testDraftId, title: { ru: 'Попытка' }, description: { ru: 'Текст' }, category: 'gov', city: 'all', startDate: '2026-11-30T10:00' }) });
    assert.equal(over.status, 409);
    const edit = await call('PATCH', { id: testDraftId, item: formItem({ title: { ru: 'Правка' }, description: { ru: 'Текст' }, category: 'gov', city: 'all', startDate: '2026-11-30T10:00', testMaterial: false }) });
    assert.equal(edit.status, 200, 'правка разрешена');
    assert.equal(edit.body.item.testMaterial, true, 'пометку «тест» нельзя снять из формы');
    assert.equal(edit.body.item.moderationStatus, 'pending');
    assert.ok(!(await publicIds()).includes(testDraftId), 'на сайте нет');
  });

  it('прямая публикация из тестового письма без черновика отклоняется', async () => {
    const r = await call('POST', { item: formItem({ title: { ru: uniq('Прямо на сайт') }, description: { ru: 'Текст.' }, category: 'gov', city: 'all', startDate: '2026-12-01T10:00' }), mailId });
    assert.equal(r.status, 409);
  });

  it('пометку «тест» нельзя прислать из формы, а «Отклонить» работает', async () => {
    const r = await call('POST', { item: formItem({ title: { ru: uniq('Обычный черновик') }, description: { ru: 'Текст.' }, category: 'gov', city: 'all', startDate: '2026-12-02T10:00', testMaterial: true }), asDraft: true });
    assert.equal(r.body.item.testMaterial, undefined);
    const rej = await call('PATCH', { id: testDraftId, action: 'reject', note: 'тест' });
    assert.equal(rej.status, 200);
    assert.equal(rej.body.item.moderationStatus, 'rejected');
  });
});
