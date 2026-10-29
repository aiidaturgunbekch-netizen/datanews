/**
 * Меню и контакты: «Новости» и «Объявления» не показываются отдельными пунктами меню (материалы и рубрики сохранены);
 * «Источники информации» и «Политика конфиденциальности» убраны из публичного интерфейса;
 * WhatsApp редакции — +996 990 000365, Telegram и Instagram — прежние; номера не повторяются в подвале.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { RUBRICS, NAV_RUBRICS, rubricOf } = await import('../src/config/rubrics');
const { CONTACTS, telegramUrl } = await import('../src/config/contacts');
const { InfoPage } = await import('../src/components/InfoPages');
const { Footer } = await import('../src/components/Footer');
const { SocialLinks } = await import('../src/components/ContactButtons');
const { AdvertisingPage } = await import('../src/components/AdvertisingPage');
const { INITIAL_ANNOUNCEMENTS } = await import('../src/data/initialAnnouncements');

const LANGS = ['ru', 'kg', 'en'] as const;
const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const noop = () => {};

describe('основное меню', () => {
  it('без отдельных пунктов «Новости» и «Объявления»; тематические разделы на месте', () => {
    const ids = NAV_RUBRICS.map((r) => r.id);
    assert.ok(!ids.includes('news') && !ids.includes('notices'));
    for (const id of ['weather', 'utilities', 'roads', 'state', 'culture', 'sport', 'expos', 'education', 'business', 'tech']) assert.ok(ids.includes(id), id);
  });

  it('рубрики и материалы «Новостей» и «Объявлений» не удалены — доступны через подвал, «Разделы» и поиск', () => {
    assert.ok(rubricOf('news')?.categories.includes('news'));
    assert.deepEqual(rubricOf('notices')?.categories, ['notices']);
    assert.equal(RUBRICS.length, NAV_RUBRICS.length + 2);
    const before = INITIAL_ANNOUNCEMENTS.length;
    assert.ok(before > 0);
  });
});

describe('«Источники информации» и «Политика конфиденциальности» убраны', () => {
  const banned = /Источники информации|Политика конфиденциальности|Маалымат булактары|Купуялуулук саясаты|Information sources|Privacy policy/;
  it('нет во вкладках страниц «О проекте», «Правила», «Контакты» и в подвале — на трёх языках', () => {
    for (const lang of LANGS) {
      for (const view of ['about', 'rules', 'contacts'] as const) assert.ok(!banned.test(render(React.createElement(InfoPage, { view, lang, onNavigate: noop }))), `${view}/${lang}`);
      const footer = render(React.createElement(Footer, { currentLanguage: lang, onNavigate: noop, onOpenAccount: noop, onOpenHome: noop, onOpenSearch: noop, onOpenArchive: noop, onOpenNews: noop }));
      assert.ok(!banned.test(footer), `footer/${lang}`);
    }
  });
});

describe('контакты', () => {
  it('WhatsApp редакции — новый номер; Telegram и Instagram — прежние ссылки', () => {
    assert.equal(CONTACTS.whatsappUrl, 'https://wa.me/996990000365');
    assert.equal(CONTACTS.whatsappPhone, '+996 990 000365');
    assert.equal(telegramUrl(), 'https://t.me/+996700230994');
    assert.equal(CONTACTS.instagramUrl, 'https://www.instagram.com/data.news.kg/');
  });

  it('в подвале — только значки со ссылками, без номеров телефонов', () => {
    const h = render(React.createElement(SocialLinks, { lang: 'ru' }));
    for (const href of ['https://wa.me/996990000365', 'https://t.me/+996700230994', 'https://www.instagram.com/data.news.kg/']) assert.ok(h.includes(`href="${href}"`), href);
    assert.ok(!/\+?996[\s\d]{6,}/.test(h.replace(/href="[^"]+"/g, '')), 'номер не выводится текстом');
    assert.ok(!/bg-gradient|#c13584|#0f8072/.test(h), 'без ярких разноцветных фонов');
  });
});

describe('кнопка «Обсудить размещение рекламы»', () => {
  it('текст сохранён, значок WhatsApp внутри, ведёт в чат редакции с готовым сообщением, без пояснения рядом', () => {
    const h = render(React.createElement(AdvertisingPage, { lang: 'ru', onOpenContacts: noop }));
    const m = h.match(/<a href="(https:\/\/wa\.me\/996990000365\?text=[^"]+)"[^>]*>(.*?)<\/a>/);
    assert.ok(m, 'кнопка-ссылка на WhatsApp');
    assert.ok(decodeURIComponent(m![1].split('?text=')[1].replace(/&amp;/g, '&')).includes('размещение рекламы'));
    assert.ok(m![2].includes('<svg') && m![2].includes('Обсудить размещение рекламы'), 'значок и текст в одной кнопке');
    assert.ok(!h.includes('Откроется WhatsApp'), 'пояснение убрано');
    for (const lang of ['kg', 'en'] as const) assert.ok(!/WhatsAppы ачылат|Opens the DataNews/.test(render(React.createElement(AdvertisingPage, { lang, onOpenContacts: noop }))));
  });
});
