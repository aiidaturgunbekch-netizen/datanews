// Языки: русская и кыргызская версии показывают только свой текст, без смешения
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectLang, hasLangText, looksKyrgyz, missingLangs, visibleIn } from '../src/utils/lang';
import { parseNotice } from '../src/utils/importText';

const L = (ru: string, kg: string, en = '') => ({ ru, kg, en });
const KG_TEXT = 'Бишкекте 1 870 көп кабаттуу үйгө жылуулук берилди. Жылытуу системасына кошуу иштери уланууда, үйлөрдүн саны көбөйүүдө.';
const RU_TEXT = 'В Бишкеке к отоплению подключили 1 870 многоэтажных домов. Работы продолжаются.';

describe('определение языка', () => {
  it('кыргызский текст — по буквам ң, ө, ү; одно название «Алтын күз» в русском тексте — русский', () => {
    assert.equal(detectLang(KG_TEXT), 'kg');
    assert.equal(detectLang(RU_TEXT), 'ru');
    assert.equal(looksKyrgyz('Ярмарка «Алтын күз» и выставка АгроТехЭкспо пройдут в столице в октябре этого года.'), false);
  });
});

describe('что видно в какой версии сайта', () => {
  it('есть оба текста — видно и на русском, и на кыргызском', () => {
    const a = { title: L('Отопление', 'Жылуулук'), description: L(RU_TEXT, KG_TEXT) };
    assert.equal(visibleIn(a, 'ru'), true);
    assert.equal(visibleIn(a, 'kg'), true);
    assert.deepEqual(missingLangs(a), []);
  });
  it('только русский (кыргызское поле — копия русского) — в кыргызской версии не видно', () => {
    const a = { title: L('Отопление', 'Отопление'), description: L(RU_TEXT, RU_TEXT) };
    assert.equal(visibleIn(a, 'ru'), true);
    assert.equal(visibleIn(a, 'kg'), false);
    assert.deepEqual(missingLangs(a), ['KG']);
  });
  it('только кыргызский (скопирован во все поля) — в русской версии не видно', () => {
    const a = { title: L('Бишкекте жылуулук', 'Бишкекте жылуулук'), description: L(KG_TEXT, KG_TEXT, KG_TEXT) };
    assert.equal(visibleIn(a, 'ru'), false);
    assert.equal(visibleIn(a, 'kg'), true);
    assert.equal(visibleIn(a, 'en'), false, 'на английском нет ни английского, ни русского текста');
    assert.deepEqual(missingLangs(a), ['RU']);
  });
  it('английская версия без перевода показывает русский текст', () => {
    const a = { title: L('Отопление', 'Жылуулук', 'Отопление'), description: L(RU_TEXT, KG_TEXT, RU_TEXT) };
    assert.equal(hasLangText(a, 'en'), false);
    assert.equal(visibleIn(a, 'en'), true);
  });
});

describe('черновик из письма — текст только в поле своего языка', () => {
  it('кыргызское письмо → поля KG, русские пустые', () => {
    const r = parseNotice(`Бишкекте жылуулук берүү иштери уланууда\n${KG_TEXT}`, '', '', '2026-11-04');
    assert.equal(r.draft.title?.ru, '');
    assert.ok(r.draft.title?.kg);
    assert.ok(r.draft.description?.kg?.includes('көп кабаттуу'));
    assert.ok(r.missing.includes('перевод на русский'));
  });
  it('русское письмо → поля RU', () => {
    const r = parseNotice(`Отопление в Бишкеке\n${RU_TEXT}`, '', '', '2026-11-04');
    assert.ok(r.draft.title?.ru);
    assert.equal(r.draft.description?.kg, '');
    assert.ok(r.missing.includes('перевод на кыргызский'));
  });
});

import { isWeatherQuery } from '../src/utils/search';
describe('поиск погоды с первых букв', () => {
  it('п, по, пог, аб, аба ырайы, weather — прогноз; «концерт» — нет', () => {
    for (const q of ['п', 'по', 'пог', 'погода', 'аб', 'аба', 'аба ырайы', 'Ырайы', 'wea', 'прогноз']) assert.equal(isWeatherQuery(q), true, q);
    for (const q of ['концерт', 'автобус', 'спорт']) assert.equal(isWeatherQuery(q), false, q);
  });
});
