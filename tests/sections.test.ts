/**
 * Новые разделы и подвал: «Бизнес-новости» и «Новости ИИ и IT» — настоящие разделы (категория, рубрика, сервер, переводы);
 * публиковать в них могут только редакция и администратор, права обычных пользователей не меняются.
 * Подвал: короткая навигация и одна ссылка «Реклама»; кнопка страницы «Реклама» ведёт на настоящий контакт редакции.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

process.env.DATANEWS_MEMORY_KV = '1';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const { RUBRICS, rubricIdOf } = await import('../src/config/rubrics');
const { CATEGORY_IDS } = await import('../src/config/regions');
const { allowedCategories, categoriesFor, EDITORIAL_CATS } = await import('../src/config/publishTypes');
const { getTranslation, translations } = await import('../src/locales/translations');
const { sanitize } = await import('../api/_lib/announcements');
const { Footer } = await import('../src/components/Footer');
const { AdvertisingPage, adWhatsappUrl } = await import('../src/components/AdvertisingPage');
const { CONTACTS } = await import('../src/config/contacts');
const { buildItem, emptyState } = await import('../src/components/SimplePublishForm');

const LANGS = ['ru', 'kg', 'en'] as const;

describe('разделы «Бизнес-новости» и «Новости ИИ и IT»', () => {
  it('есть в строке рубрик со своей категорией; прежние разделы на месте', () => {
    const byId = Object.fromEntries(RUBRICS.map((r) => [r.id, r]));
    assert.deepEqual(byId.business.categories, ['business']);
    assert.deepEqual(byId.tech.categories, ['tech']);
    assert.equal(byId.business.label.ru, 'Бизнес-новости');
    assert.equal(byId.tech.label.kg, 'Жасалма интеллект жана IT жаңылыктары');
    assert.equal(byId.tech.label.en, 'AI & IT News');
    // выставки и ярмарки — прежний раздел, только внутренний id стал 'expos'
    assert.deepEqual(byId.expos.categories, ['exhibitions', 'fairs']);
    for (const id of ['weather', 'utilities', 'roads', 'state', 'culture', 'sport', 'education', 'news', 'notices']) assert.ok(byId[id], id);
  });

  it('каждая категория — ровно в одной рубрике (материал не дублируется в двух разделах)', () => {
    const seen = new Map<string, string>();
    for (const r of RUBRICS) for (const c of r.categories) {
      assert.ok(!seen.has(c), `${c} в ${seen.get(c)} и ${r.id}`);
      seen.set(c, r.id);
    }
    assert.equal(rubricIdOf('business'), 'business');
    assert.equal(rubricIdOf('tech'), 'tech');
    assert.ok(CATEGORY_IDS.includes('business') && CATEGORY_IDS.includes('tech'));
  });

  it('сервер принимает новые категории (а не подменяет на «Концерты»)', async () => {
    for (const category of ['business', 'tech']) {
      const item = buildItem({ ...emptyState(), type: 'news', category, title: 'Открытие технопарка', description: 'Текст новости.' } as any, { now: '2026-10-27T12:00' });
      assert.equal((await sanitize(item as any)).category, category);
    }
  });

  it('публикуют только редакция и администратор; обычным пользователям и госорганам разделы не открываются', () => {
    assert.deepEqual(EDITORIAL_CATS, ['news', 'business', 'tech']);
    for (const plan of ['start', 'private', 'organizer', 'culture'] as any[]) {
      const cats = allowedCategories({ plan, govVerified: false });
      assert.ok(!cats.includes('business') && !cats.includes('tech'), plan);
    }
    assert.ok(!allowedCategories({ plan: 'gov' as any, govVerified: true }).includes('business'));
    assert.deepEqual(categoriesFor('news', { plan: 'start' as any, govVerified: false, editor: true }).slice(0, 3), ['news', 'business', 'tech']);
  });
});

describe('переводы новых пунктов', () => {
  it('на трёх языках, по смыслу задания', () => {
    const want = {
      'nav.cities': ['Города', 'Шаарлар', 'Cities'],
      'categories.business': ['Бизнес-новости', 'Бизнес жаңылыктары', 'Business News'],
      'categories.tech': ['Новости ИИ и IT', 'Жасалма интеллект жана IT жаңылыктары', 'AI & IT News'],
      'nav.advertising': ['Реклама', 'Жарнама', 'Advertising'],
    };
    for (const [key, vals] of Object.entries(want)) LANGS.forEach((l, i) => assert.equal(getTranslation(l).t(key), vals[i], `${key} ${l}`));
  });

  it('у каждой строки подвала и страницы «Реклама» есть все три языка', () => {
    const walk = (node: any, path: string) => {
      if (node && typeof node === 'object' && 'ru' in node) {
        for (const l of LANGS) assert.ok(typeof node[l] === 'string' && node[l].trim(), `${path}.${l}`);
        return;
      }
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    };
    walk((translations as any).footer, 'footer');
    walk((translations as any).advertising, 'advertising');
  });
});

describe('подвал', () => {
  const html = (lang: 'ru' | 'kg' | 'en') =>
    renderToStaticMarkup(
      React.createElement(Footer, {
        currentLanguage: lang,
        onNavigate: () => {},
        onOpenAccount: () => {},
        onOpenHome: () => {},
        onOpenSearch: () => {},
        onOpenArchive: () => {},
        onOpenNews: () => {},
      })
    );

  it('короткая навигация и одна ссылка «Реклама» вместо «Публикации объявлений» и «Тарифов»', () => {
    const h = html('ru');
    for (const s of ['Главное', 'Поиск', 'Архив', 'Новости', 'Реклама', 'Личный кабинет', 'О проекте', 'Правила публикации']) assert.ok(h.includes(s), s);
    for (const s of ['Публикация объявлений', 'Тарифы и подписка', 'Источники информации', 'Политика конфиденциальности', 'Разделы']) assert.ok(!h.includes(s), s);
  });

  it('на кыргызском и английском — без русских подписей', () => {
    assert.ok(html('kg').includes('Жарнама') && !html('kg').includes('Реклама'));
    assert.ok(html('en').includes('Advertising') && !/Главное|Поиск|Реклама/.test(html('en')));
  });
});

describe('страница «Реклама»', () => {
  it('кнопки ведут в WhatsApp редакции из настроек контактов, с готовым текстом', () => {
    const url = adWhatsappUrl('Здравствуйте!');
    assert.ok(url.startsWith(CONTACTS.whatsappUrl + '?text='));
    assert.equal(decodeURIComponent(url.split('?text=')[1]), 'Здравствуйте!');
    const h = renderToStaticMarkup(React.createElement(AdvertisingPage, { lang: 'ru', onOpenContacts: () => {} }));
    assert.equal(h.split(CONTACTS.whatsappUrl).length - 1, 2, 'две кнопки: в начале и в конце страницы');
    for (const s of ['Реклама, которая встречается с аудиторией в нужный момент', 'Обсудить размещение рекламы', 'Обсудить рекламу', 'Почему DataNews']) assert.ok(h.includes(s), s);
  });

  it('без выдуманных цифр охвата и обещаний результата', () => {
    for (const l of LANGS) {
      const h = renderToStaticMarkup(React.createElement(AdvertisingPage, { lang: l, onOpenContacts: () => {} }));
      assert.ok(!/\d[\d\s]*\s*(тыс|000|%|посетител|читател|visitors|readers)/i.test(h.replace(/https?:\/\/\S+?"/g, '')), l);
    }
  });
});
