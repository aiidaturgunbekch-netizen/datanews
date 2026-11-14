/**
 * Разделы не теряют материалы: прошедшие (в том числе завершённые отключения) — в «Архиве» страницы раздела,
 * архив открыт сразу, если актуального нет; материалы других городов — подсказкой «Показать все города».
 * Каждая категория входит хотя бы в один раздел меню.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { CategoryResults } = await import('../src/components/StatsPanel');
const { RUBRICS } = await import('../src/config/rubrics');
const { CATEGORY_IDS } = await import('../src/config/regions');

const past = {
  id: 'ann-past-water',
  category: 'water',
  city: 'bishkek',
  startDate: '2026-10-13T09:00',
  endDate: '2026-10-13T23:59',
  title: { ru: 'Отключение воды 13 октября', kg: 'Суу өчүрүү 13-октябрь', en: 'Water outage' },
  description: { ru: 'Текст', kg: 'Текст', en: 'Text' },
  status: 'active',
  moderationStatus: 'approved',
} as any;

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    React.createElement(CategoryResults as any, { lang: 'ru', category: 'water', onOpen: () => {}, onReset: () => {}, items: [past], ...props })
  );

describe('страница раздела не теряет прошедшие материалы', () => {
  it('завершённое отключение видно в открытом архиве, а не «пусто»', () => {
    const html = render({ title: 'Отключения и ремонт' });
    assert.match(html, /Отключение воды 13 октября/);
    assert.match(html, /Сейчас актуальных публикаций нет/);
    assert.doesNotMatch(html, /Пока нет опубликованных материалов/);
  });
  it('подсказывает про другие города', () => {
    const html = render({ elsewhere: 3, onAllCities: () => {} });
    assert.match(html, /Ещё 3 — в других городах и областях/);
    assert.match(html, /Показать все города/);
  });
  it('пустой раздел по-прежнему честно пуст', () => {
    assert.match(render({ items: [] }), /Пока нет опубликованных материалов/);
  });
  it('каждая категория входит в раздел меню', () => {
    const covered = new Set(RUBRICS.flatMap((r) => r.categories));
    for (const c of CATEGORY_IDS) assert.ok(covered.has(c), `категория ${c} без раздела`);
  });
});
