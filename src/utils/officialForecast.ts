import type { CityId } from '../types';
import type { OfficialForecast } from '../config/weather';

type Ranges = OfficialForecast['regions'];

/** Как области называются в сводках Кыргызгидромета (по-русски) */
const REGION_RE: [CityId, RegExp][] = [
  ['chui', /Чуйск/i],
  ['talas', /Таласск/i],
  ['osh_region', /Ошск/i],
  ['batken', /Баткенск/i],
  ['jalalabad', /Джалал-?Абадск|Жалал-?Абадск/i],
  ['issykkul', /Иссык-?Кульск|Ысык-?Көл/i],
  ['naryn', /Нарынск/i],
  // в JS \b не работает с кириллицей — граница слова через просмотр вперёд
  ['osh', /(?:^|[\s,])(?:г\.\s*)?Оше(?![а-яё])|город[ае]?\s+Ош(?![а-яё])/i],
  ['bishkek', /Бишкек(?:е|а)?(?![а-яё])/i],
];

const NUM = String.raw`([+\-−–]?\s*\d{1,2})`;
const RANGE = String.raw`${NUM}\s*(?:\.{2,3}|…|—|–|-)\s*${NUM}`;
const num = (s: string) => Number(s.replace(/\s/g, '').replace(/[−–]/g, '-'));

/**
 * Разбор текстовой сводки Кыргызгидромета, например:
 *   «В Чуйской области ночью +4...+9, днем +17...+22.»
 *   «В Ошской, Баткенской и Джалал-Абадской областях ночью +9...+14, днем +20...+25.»
 * Возвращает диапазоны по областям и строки без температур (осадки, ветер) — как общий текст.
 * Редактор всегда проверяет результат перед сохранением.
 */
const MONTHS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];

export const parseOfficialText = (text: string, year = new Date().getFullYear()): { regions: Ranges; rest: string; date?: string } => {
  const regions: Ranges = {};
  const rest: string[] = [];
  const parts = text
    .replace(/\r/g, '')
    .split(/\n+|(?<=\.)\s+(?=[А-ЯЁA-Z])/)
    .map((p) => p.trim())
    .filter(Boolean);
  const re = new RegExp(String.raw`ночью\s*${RANGE}.*?дн[её]м\s*${RANGE}`, 'i');
  for (const p of parts) {
    const m = p.match(re);
    if (!m) {
      if (!/^Теги:|Sputnik\.?$/i.test(p)) rest.push(p.replace(/^[А-ЯЁ\s,]+\d{1,2}\s+\S+\s+—\s+Sputnik\.\s*/, ''));
      continue;
    }
    const head = p.slice(0, m.index);
    const ids = REGION_RE.filter(([, r]) => r.test(head)).map(([id]) => id);
    for (const id of ids) {
      const v = { nightFrom: num(m[1]), nightTo: num(m[2]), dayFrom: num(m[3]), dayTo: num(m[4]) };
      regions[id] = {
        nightFrom: Math.min(v.nightFrom, v.nightTo),
        nightTo: Math.max(v.nightFrom, v.nightTo),
        dayFrom: Math.min(v.dayFrom, v.dayTo),
        dayTo: Math.max(v.dayFrom, v.dayTo),
      };
    }
  }
  // Дата прогноза из текста: «…, 15 октября дожди…» (дату выпуска «14 окт — Sputnik» не берём)
  let date: string | undefined;
  const dm = text.replace(/^.*?Sputnik\.?/is, '').match(/(\d{1,2})\s+(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i);
  if (dm) {
    const mi = MONTHS.findIndex((m) => dm[2].toLowerCase().startsWith(m));
    date = `${year}-${String(mi + 1).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  }
  return { regions, rest: rest.join(' ').trim(), date };
};
