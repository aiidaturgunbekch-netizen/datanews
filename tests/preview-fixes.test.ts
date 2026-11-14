/**
 * Исправления после проверки Preview: поиск (регистр, кыргызские буквы, разделы), страница «Новости»,
 * раздел «Лекции и IT» убран, фото без подписей, логотип с полями, контакты без повтора номера.
 * Проверки идут на настоящих встроенных публикациях сайта (без выдуманных материалов).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { INITIAL_ANNOUNCEMENTS: A } = await import('../src/data/initialAnnouncements');
const { matchesSearch, normalizeSearch, searchScore, rankSearch, highlightParts, searchSnippet } = await import('../src/utils/search');
const { isAlert } = await import('../src/utils/urgency');
const { rubricOf, rubricIdOf, NAV_RUBRICS } = await import('../src/config/rubrics');
const { getTranslation } = await import('../src/locales/translations');
const { EventImage } = await import('../src/components/EventImage');
const { InfoPage } = await import('../src/components/InfoPages');
const { BrandBadge } = await import('../src/components/BrandLogo');
const { isFresh } = await import('../src/utils/statusUtils');

const ids = (q: string) => A.filter((a) => matchesSearch(a, q)).map((a) => a.id);
const FROST = 'ann-frost-warning-2026-10-17';
const FROST_ITEM = A.find((a) => a.id === FROST)!;

describe('поиск', () => {
  it('регистр не важен: «аба», «АБА», «Аба» — одинаковые результаты, в том числе погодное предупреждение', () => {
    assert.deepEqual(ids('АБА'), ids('аба'));
    assert.deepEqual(ids('Аба'), ids('аба'));
    assert.ok(ids('аба').includes(FROST), 'раздел «Аба ырайы» — поле поиска');
    assert.ok(ids('Аба ырайы').includes(FROST));
  });

  it('кыргызские слова и словоформы: «эскертүү», «бороон», «үшүк», ө/ү/ң', () => {
    assert.ok(ids('эскертүү').includes(FROST));
    assert.ok(ids('бороон').includes(FROST), '«бороон» → «Бороондук»');
    assert.ok(ids('ҮШҮК').includes(FROST));
    assert.deepEqual(ids('очуруу'), ids('өчүрүү'), 'без кыргызской раскладки');
    assert.equal(normalizeSearch('  ӨЧҮРҮҮ   Аң '), 'очуруу ан');
  });

  it('похожие слова: начало слова сверху, середина слова (от 4 букв) — ниже', () => {
    const trash = A.find((a) => /абаттандыруу/.test(a.description.kg));
    assert.ok(trash);
    assert.ok(matchesSearch(trash!, 'аба'));
    assert.ok(matchesSearch(trash!, 'аб'));
    assert.ok(matchesSearch(trash!, 'ттанды'), 'середина слова тоже находится');
    assert.ok(searchScore(trash!, 'абаттан') > searchScore(trash!, 'ттанды'), 'начало слова — выше середины');
    assert.ok(!matchesSearch(trash!, 'бар') || !/кабар/i.test(trash!.description.kg), '3 буквы в середине слова не ищутся');
  });

  it('несколько слов или предложение: показываются частичные совпадения, полные — выше', () => {
    assert.ok(ids('заморозки').includes(FROST));
    assert.ok(ids('FROST warning').includes(FROST));
    assert.ok(ids('frost концерт').includes(FROST), 'нашлось одно слово — тоже показываем');
    const ranked = rankSearch(A, 'заморозки концерт');
    assert.ok(ranked.length > 1);
    assert.ok(searchScore(FROST_ITEM, 'заморозки октябрь') > searchScore(FROST_ITEM, 'заморозки концерт'), 'все слова — выше');
  });

  it('«пре», «предупреждения», «срочное», «важное» находят предупреждения, даже если слова нет в тексте', () => {
    const alerts = A.filter(isAlert).map((a) => a.id);
    for (const q of ['пре', 'предупреждения', 'Предупреждение', 'эскертүү', 'warning']) {
      const found = ids(q);
      assert.ok(alerts.every((id) => found.includes(id)), `${q}: все предупреждения`);
    }
    const em = { ...FROST_ITEM, id: 'x-em', urgency: 'emergency' as const };
    for (const q of ['срочное', 'срочно', 'важное', 'авария']) assert.ok(matchesSearch(em, q), q);
    // предупреждения — выше случайных совпадений
    const top = rankSearch(A, 'предупреждения').slice(0, alerts.length).map((a) => a.id);
    assert.ok(alerts.every((id) => top.includes(id)), 'все предупреждения — в начале списка');
  });

  it('опечатки и формы слова', () => {
    assert.ok(ids('предупреждние').includes(FROST), 'пропущена буква');
    assert.ok(ids('заморозок').includes(FROST), 'другая форма слова');
    assert.ok(ids('штормовое предупреждение').includes(FROST));
    assert.equal(rankSearch(A, 'штормовое предупреждение')[0].id, FROST, 'фраза из заголовка — первой');
  });

  it('найденные слова выделяются; отрывок текста — вокруг найденного', () => {
    const parts = highlightParts('Штормовое предупреждение: заморозки', 'предупреждения заморозк');
    assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ['предупреждение', 'заморозки']);
    assert.equal(parts.map((p) => p.text).join(''), 'Штормовое предупреждение: заморозки', 'текст не меняется');
    const sn = searchSnippet('a '.repeat(80) + 'ярмарка в Бишкеке', 'ярмарки');
    assert.ok(sn.startsWith('…') && /ярмарка/.test(sn));
  });
});

describe('страница «Новости»', () => {
  it('собирает опубликованные информационные материалы (новости, государство, законы, бизнес, ИИ/IT), не пустая', () => {
    const news = rubricOf('news')!;
    for (const c of ['news', 'state', 'gov', 'laws', 'business', 'tech']) assert.ok(news.categories.includes(c as any), c);
    const items = A.filter((a) => news.categories.includes(a.category));
    assert.ok(items.length > 0, 'на сайте есть такие материалы');
    assert.equal(new Set(items.map((a) => a.id)).size, items.length, 'без дублей');
    assert.ok(!NAV_RUBRICS.some((r) => r.id === 'news'), 'в меню по-прежнему нет');
    assert.equal(rubricIdOf('state'), 'state', 'своя рубрика материала не меняется');
    assert.ok(items.some((a) => isFresh(a)) || items.length > 0);
  });
});

describe('раздел «Лекции и IT» убран', () => {
  it('категория образования называется «Образование» на трёх языках; IT — в «ИИ и IT-технологии»', () => {
    const want = { ru: 'Образование', kg: 'Билим берүү', en: 'Education' } as const;
    for (const l of ['ru', 'kg', 'en'] as const) {
      assert.equal(getTranslation(l).t('categories.education'), want[l]);
      assert.ok(!/Лекции и IT|Лекциялар жана IT|Lectures & Tech/.test(getTranslation(l).t('categories.education')));
    }
    assert.equal(getTranslation('ru').t('categories.tech'), 'ИИ и IT-технологии');
  });
});

describe('фото и логотип', () => {
  it('на фото нет подписи поверх (ни автора, ни «не афиша»)', () => {
    for (const a of A.filter((x) => x.imageUrl && !x.imageUrl.startsWith('/illustrations/'))) {
      const h = renderToStaticMarkup(React.createElement(EventImage, { item: a, lang: 'ru' }));
      assert.ok(!h.includes('не афиша') && !(a.imageCredit && h.includes(a.imageCredit)), a.id);
    }
    assert.ok(!A.some((a) => /не афиша/.test(a.imageCredit || '')));
  });

  it('логотип на плашке — с внутренними полями со всех сторон', () => {
    const h = renderToStaticMarkup(React.createElement(BrandBadge, { height: 24 }));
    assert.match(h, /padding-block:\s*8px/);
    assert.match(h, /padding-inline:\s*12px/);
  });
});

describe('страница «Связаться с DataNews»', () => {
  it('кнопки WhatsApp/Telegram/Instagram на месте, номера телефонов на странице не показываются', () => {
    const h = renderToStaticMarkup(React.createElement(InfoPage, { view: 'contacts', lang: 'ru', onNavigate: () => {} }));
    // видимый текст (без атрибутов: подпись для чтения с экрана не считается повтором)
    const visible = h.replace(/<[^>]+>/g, ' ');
    // номера не показываются вовсе — их видно после перехода по ссылке
    assert.ok(!visible.includes('+996 990 000365') && !h.includes('+996 990 000365'), 'номер WhatsApp не показывается');
    assert.ok(!visible.includes('+996 700 230 994') && !h.includes('+996 700 230 994'), 'номер Telegram не показывается');
    assert.ok(visible.includes('@data.news.kg'), 'Instagram — как был');
    for (const href of ['https://wa.me/996990000365', 'https://t.me/+996700230994', 'https://www.instagram.com/data.news.kg/']) assert.ok(h.includes(href), href);
  });
});
