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
