// Пакет новостей от Claude: разбор, проверка, превращение в черновик
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBatch, toDraftItem } from '../src/utils/batch';

const KG = 'Бишкекте 1 870 көп кабаттуу үйгө жылуулук берилди. Жылытуу системасына кошуу иштери уланууда.';
const good = {
  kind: 'new',
  mailId: '1a1a53691b711342',
  category: 'repairs',
  city: 'bishkek',
  startDate: '2026-10-29T18:00',
  title: { ru: 'Отопление в Бишкеке', kg: 'Бишкекте жылуулук', en: 'Heating in Bishkek' },
  text: { ru: 'В Бишкеке к отоплению подключили 1 870 домов.', kg: KG, en: 'Heating is on in 1,870 blocks.' },
  sourceName: 'Пресс-служба мэрии г. Бишкек',
  sourceUrl: 'https://bishkek.gov.kg',
};

describe('пакет новостей', () => {
  it('блок между DATANEWS-BATCH и END-BATCH, лишний текст вокруг не мешает', () => {
    const r = parseBatch(`Вот пакет:\nDATANEWS-BATCH\n${JSON.stringify([good])}\nEND-BATCH\nспасибо`);
    assert.deepEqual(r.errors, []);
    assert.equal(r.items.length, 1);
    const d = toDraftItem(r.items[0] as never);
    assert.deepEqual((d.description as Record<string, string>).kg, KG);
    assert.equal(d.urgency, 'planned', 'тип по разделу');
    assert.equal(d.allDay, false);
  });

  it('без кыргызского текста, неизвестный раздел, кыргызский в русском поле — понятные ошибки, остальное создаётся', () => {
    const r = parseBatch(
      JSON.stringify([
        { ...good, text: { ru: good.text.ru, kg: '' } },
        { ...good, category: 'weather' },
        { ...good, title: { ...good.title, ru: 'Бишкекте жылуулук' }, text: { ...good.text, ru: KG } },
        { ...good, startDate: '2026-10-29' },
      ])
    );
    assert.equal(r.items.length, 1);
    assert.match(r.errors[0], /кыргызском/);
    assert.match(r.errors[1], /раздел «weather»/);
    assert.match(r.errors[2], /в русском тексте — кыргызский/);
    const only = r.items[0] as { allDay: boolean; startDate: string };
    assert.equal(only.startDate, '2026-10-29T00:00');
    assert.equal(only.allDay, true, 'без времени — весь день');
  });

  it('перевод существующей публикации', () => {
    const r = parseBatch(JSON.stringify([{ kind: 'translate', id: 'ann-abc123', title: { kg: 'Аталыш' }, text: { kg: KG } }]));
    assert.deepEqual(r.errors, []);
    assert.equal(r.items[0].kind, 'translate');
  });

  it('мусор вместо пакета — одна понятная ошибка', () => {
    assert.match(parseBatch('привет').errors[0], /Не удалось прочитать пакет/);
  });

  it('небезопасные ссылки отбрасываются', () => {
    const r = parseBatch(JSON.stringify([{ ...good, imageUrl: 'javascript:alert(1)', sourceUrl: 'http://x' }]));
    const d = toDraftItem(r.items[0] as never);
    assert.equal(d.imageUrl, undefined);
    assert.equal(d.eventSourceUrl, undefined);
  });

  it('исправление источника по заголовку', () => {
    const r = parseBatch(JSON.stringify([
      { kind: 'update', matchTitle: 'Премьера', sourceName: 'Драмтеатр', sourceUrl: 'https://www.instagram.com/kyrgyzdramteatr_official/', sourceKind: 'official' },
      { kind: 'update', matchTitle: 'Пусто' },
    ]));
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0].kind, 'update');
    assert.match(r.errors[0], /нечего исправлять/);
  });
});

describe('пакет с «красивыми» кавычками после копирования из чата', () => {
  it('читается: “ ” заменяются на прямые', () => {
    const t = `DATANEWS-BATCH\n[{”kind”:”new”,"category":"roads",”city”:”bishkek”,”startDate”:”2026-11-05”, ”title”:{”ru”:”Ул. Ауэзова закрыта”,”kg”:”Ауэзов көчөсү жабык”},”text”:{”ru”:”С 5 ноября.”,”kg”:”5-ноябрдан тартып.”},”sourceName”:”Мэрия Бишкека”}]\nEND-BATCH`;
    const r = parseBatch(t);
    assert.deepEqual(r.errors, []);
    assert.equal(r.items.length, 1);
  });
});

describe('прогноз погоды в пакете', () => {
  it('kind weather: температура по областям и текст на трёх языках', () => {
    const t = JSON.stringify([
      {
        kind: 'weather',
        date: '2026-11-06',
        sourceUrl: 'https://www.meteo.kg/ru/forecast',
        text: { ru: 'Без осадков. Ветер западный, 4–9 м/с.', kg: 'Жаан-чачынсыз. Батыш шамалы, 4–9 м/с.', en: 'No precipitation.' },
        regions: { bishkek: { night: [3, 5], day: [21, 23] }, osh: { night: [2, 4], day: [20, 22] } },
      },
    ]);
    const r = parseBatch(t);
    assert.deepEqual(r.errors, []);
    const w = r.items[0];
    assert.equal(w.kind, 'weather');
    if (w.kind !== 'weather') return;
    assert.deepEqual(w.forecast.regions.bishkek, { nightFrom: 3, nightTo: 5, dayFrom: 21, dayTo: 23 });
    assert.equal(w.forecast.texts?.kg, 'Жаан-чачынсыз. Батыш шамалы, 4–9 м/с.');
    assert.equal(w.forecast.sourceName, 'Кыргызгидромет');
  });
  it('без ссылки и с неизвестной областью — понятная ошибка', () => {
    const r = parseBatch(JSON.stringify([{ kind: 'weather', date: '2026-11-06', regions: { mars: { night: [1, 2], day: [3, 4] } } }]));
    assert.equal(r.items.length, 0);
    assert.match(r.errors[0], /ссылки/);
    assert.match(r.errors[0], /mars/);
  });
});

describe('фото со свободной лицензией', () => {
  it('imageCredit и imageSourceUrl переходят в черновик', () => {
    const r = parseBatch(
      JSON.stringify([
        {
          kind: 'new', category: 'roads', city: 'bishkek', startDate: '2026-11-05',
          title: { ru: 'Улица закрыта', kg: 'Көчө жабык' }, text: { ru: 'Текст.', kg: 'Текст кыргызча.' },
          sourceName: 'Мэрия Бишкека',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Bishkek.jpg',
          imageCredit: 'Фото: Иван Иванов / Wikimedia Commons, CC BY-SA 4.0',
          imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Bishkek.jpg',
        },
      ])
    );
    const b = r.items[0];
    assert.equal(b.kind, 'new');
    if (b.kind !== 'new') return;
    const d = toDraftItem(b);
    assert.equal(d.imageCredit, 'Фото: Иван Иванов / Wikimedia Commons, CC BY-SA 4.0');
    assert.equal(d.imageSourceUrl, 'https://commons.wikimedia.org/wiki/File:Bishkek.jpg');
  });
});

describe('ссылки в пакете, пришедшем письмом', () => {
  it('переадресация Gmail «google.com/url?q=…» заменяется настоящим адресом', () => {
    const r = parseBatch(
      JSON.stringify([
        {
          kind: 'weather',
          date: '2026-11-06',
          sourceUrl: 'https://www.google.com/url?q=https://www.meteo.kg/ru/forecast&source=gmail&ust=1794036360236000&sa=E',
          text: { ru: 'Без осадков.', kg: 'Жаан-чачынсыз.' },
          regions: { bishkek: { night: [3, 5], day: [21, 23] } },
        },
      ])
    );
    const w = r.items[0];
    assert.equal(w.kind, 'weather');
    if (w.kind === 'weather') assert.equal(w.forecast.sourceUrl, 'https://www.meteo.kg/ru/forecast');
  });
});
