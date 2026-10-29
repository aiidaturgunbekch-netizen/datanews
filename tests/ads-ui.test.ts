/**
 * Реклама — интерфейс: каталог четырёх форматов (цена, размеры, кнопки), макеты «компьютер / планшет / телефон»,
 * баннеры с меткой «Реклама» и безопасной ссылкой, адаптивные изображения, отсутствие пустых рекламных блоков.
 * Отрисовка без браузера (renderToStaticMarkup); переключение режимов кнопками проверяется в браузере отдельно.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { DEFAULT_AD_FORMATS } = await import('../src/config/ads');
const { AdCatalog, AdPreviewModal } = await import('../src/components/ads/AdCatalog');
const { AdMockup } = await import('../src/components/ads/AdMockup');
const { AdBanner, AdFeedCard, AdSlot } = await import('../src/components/AdSlot');

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const live = (over: Record<string, unknown> = {}) => ({
  id: 'ad1',
  format: 'A' as const,
  label: 'ad' as const,
  advertiser: 'Пример ОсОО',
  imageDesktop: '/api/image?id=d',
  alt: 'Пример рекламного баннера',
  priority: 0,
  start: '2026-10-01T00:00',
  ...over,
});

describe('каталог форматов', () => {
  it('четыре карточки: название, цена за 30 дней, размеры для компьютера и телефона, кнопки', () => {
    const h = html(React.createElement(AdCatalog, { formats: DEFAULT_AD_FORMATS, lang: 'ru', action: { label: 'Создать кампанию', onClick: () => {} } }));
    const t = text(h);
    for (const id of ['A', 'B', 'C', 'D']) assert.ok(h.includes(`data-ad-format-card="${id}"`), id);
    for (const s of ['Главный баннер', 'Боковой баннер', 'Рекламная карточка', 'Тематический баннер']) assert.ok(t.includes(s), s);
    for (const p of ['10 000 сомов', '5 000 сомов', '4 000 сомов', '3 000 сомов']) assert.ok(t.includes(p), p);
    assert.equal((t.match(/\/ 30 дней/g) || []).length >= 4, true);
    for (const s of ['1200 × 300 px', '750 × 300 px', '600 × 800 px', '1200 × 675 px', 'то же изображение']) assert.ok(t.includes(s), s);
    assert.equal((t.match(/Посмотреть размещение/g) || []).length, 4);
    assert.equal((t.match(/Создать кампанию/g) || []).length, 4);
    assert.ok(t.includes('Размещение начинается после подтверждения оплаты администратором'));
    assert.ok(t.includes('не гарантируется'));
    // без выдуманных показателей
    assert.ok(!/\d[\d\s]*(тыс\.?|000)\s*(просмотр|посетител|читател)/i.test(t));
  });

  it('цена — из каталога (изменённая администратором), а не из кода страницы', () => {
    const formats = { ...DEFAULT_AD_FORMATS, A: { ...DEFAULT_AD_FORMATS.A, price: 12500 } };
    assert.ok(text(html(React.createElement(AdCatalog, { formats, lang: 'ru' }))).includes('12 500 сомов'));
  });

  it('на кыргызском и английском', () => {
    assert.ok(text(html(React.createElement(AdCatalog, { formats: DEFAULT_AD_FORMATS, lang: 'kg' }))).includes('Башкы баннер'));
    const en = text(html(React.createElement(AdCatalog, { formats: DEFAULT_AD_FORMATS, lang: 'en' })));
    assert.ok(en.includes('Main banner') && en.includes('10 000 KGS'));
  });
});

describe('макеты размещения', () => {
  it('для каждого формата: страница DataNews, выделенное место, пример баннера, размер, цена', () => {
    for (const id of ['A', 'B', 'C', 'D'] as const) {
      const h = html(React.createElement(AdMockup, { format: DEFAULT_AD_FORMATS[id], device: 'desktop', lang: 'ru' }));
      assert.ok(h.includes(`data-mock-slot="${id}"`), id);
      assert.ok(h.includes('/brand/datanews-logo-light'), 'логотип DataNews');
      assert.ok(text(h).includes('Пример рекламного баннера'));
      assert.ok(text(h).includes(`${DEFAULT_AD_FORMATS[id].price.toLocaleString('ru-RU').replace(/ /g, ' ')} сомов`));
    }
  });

  it('компьютер и телефон показывают разные размеры места (B: 600×800 справа / 750×300 между блоками)', () => {
    const desk = text(html(React.createElement(AdMockup, { format: DEFAULT_AD_FORMATS.B, device: 'desktop', lang: 'ru' })));
    const phone = text(html(React.createElement(AdMockup, { format: DEFAULT_AD_FORMATS.B, device: 'phone', lang: 'ru' })));
    assert.ok(desk.includes('600 × 800 px') && !desk.includes('750 × 300 px'));
    assert.ok(phone.includes('750 × 300 px') && !phone.includes('600 × 800 px'));
    assert.ok(html(React.createElement(AdMockup, { format: DEFAULT_AD_FORMATS.A, device: 'tablet', lang: 'ru' })).includes('data-mock-device="tablet"'));
  });

  it('окно просмотра: переключатель «Компьютер / ноутбук», «Планшет», «Телефон», по умолчанию — компьютер', () => {
    const h = html(React.createElement(AdPreviewModal, { format: DEFAULT_AD_FORMATS.D, lang: 'ru', onClose: () => {} }));
    for (const s of ['Компьютер / ноутбук', 'Планшет', 'Телефон']) assert.ok(text(h).includes(s), s);
    assert.ok(h.includes('data-mock-device="desktop"'));
    assert.match(h, /aria-selected="true"[^>]*>Компьютер \/ ноутбук/);
  });
});

describe('рекламные места на сайте', () => {
  it('нет идущей кампании — нет блока (ни рамки, ни подписи)', () => {
    for (const format of ['A', 'B', 'D'] as const) assert.equal(html(React.createElement(AdSlot, { format, lang: 'ru', rubric: 'tech' })), '');
  });

  it('баннер: метка «Реклама · рекламодатель», ссылка через сайт с rel="sponsored noopener noreferrer"', () => {
    const h = html(React.createElement(AdBanner, { ad: live(), lang: 'ru' }));
    assert.ok(text(h).includes('Реклама · Пример ОсОО'));
    assert.ok(h.includes('href="/api/track?ad=ad1&amp;go=1"'));
    assert.ok(h.includes('rel="sponsored noopener noreferrer"') && h.includes('target="_blank"'));
    assert.ok(h.includes('alt="Пример рекламного баннера"'));
    assert.ok(text(html(React.createElement(AdBanner, { ad: live({ label: 'partner' }), lang: 'ru' }))).includes('Партнёрский материал'));
    assert.ok(text(html(React.createElement(AdBanner, { ad: live(), lang: 'kg' }))).includes('Жарнама'));
  });

  it('адаптивность: отдельная картинка для телефона; без неё — основная без растягивания', () => {
    const both = html(React.createElement(AdBanner, { ad: live({ imageMobile: '/m', imageMobileSize: { w: 750, h: 300 }, imageDesktopSize: { w: 1200, h: 300 } }), lang: 'ru' }));
    assert.match(both, /src="\/m"[^>]*class="block lg:hidden[^"]*object-contain"[^>]*aspect-ratio:750 \/ 300/);
    assert.match(both, /src="\/api\/image\?id=d"[^>]*class="hidden lg:block[^"]*object-contain"[^>]*aspect-ratio:1200 \/ 300/);
    const sideOnly = html(React.createElement(AdBanner, { ad: live({ format: 'B' }), lang: 'ru' }));
    assert.ok(sideOnly.includes('max-w-[320px]'), 'боковой без картинки для телефона — не шире 320 px');
    assert.match(sideOnly, /aspect-ratio:600 \/ 800/);
  });

  it('карточка в ленте: своя рамка, метка, заголовок, текст и кнопка', () => {
    const h = html(React.createElement(AdFeedCard, { ad: live({ format: 'C', title: 'Открытие салона', text: 'Скидки в первую неделю', cta: 'Узнать' }), lang: 'ru' }));
    const t = text(h);
    assert.ok(t.includes('Реклама · Пример ОсОО') && t.includes('Открытие салона') && t.includes('Скидки в первую неделю') && t.includes('Узнать'));
    assert.ok(h.includes('border-partner') && h.includes('rel="sponsored noopener noreferrer"'));
  });
});
