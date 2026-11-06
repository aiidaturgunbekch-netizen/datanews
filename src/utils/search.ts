import type { Announcement } from '../types';
import { translations } from '../locales/translations';
import { RUBRICS } from '../config/rubrics';
import { alertLevel, isAlert } from './urgency';

/**
 * Поиск по публикациям — один для строки поиска на главной и окна поиска.
 *
 * Как ищет:
 *  - Регистр не важен; кыргызские буквы можно набрать без кыргызской раскладки: ө ≈ о, ү ≈ у, ң ≈ н; ё ≈ е.
 *  - Каждое слово запроса сравнивается со словами публикации, от лучшего совпадения к худшему:
 *      1) то же слово или другая его форма («предупреждения» = «предупреждение», «срочное» = «срочно»);
 *      2) начало слова («пре» → «предупреждение», «президент»);
 *      3) опечатка в одну-две буквы («предупреждние», «концер»);
 *      4) часть слова в середине (только для запроса от 4 букв: «ттанды» → «абаттандыруу»).
 *  - Ищем в заголовке, кратком тексте, полном тексте, месте, источнике, названии раздела и в «смысловых» словах:
 *    у каждого предупреждения есть слова «предупреждение / эскертүү / warning», у аварийного — «срочно / важно» и т. п.
 *    Поэтому «предупреждения», «срочное», «важное», «отключение» находят нужные публикации, даже если этого слова нет в тексте.
 *  - Несколько слов или целое предложение: показываются все публикации, где нашлось хотя бы одно значимое слово;
 *    сверху — где нашлись все слова и где совпадение в заголовке, ниже — частичные. Служебные слова («в», «на», «и») не учитываются.
 *  - Исходный текст публикаций не меняется.
 */
export const normalizeSearch = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ө/g, 'о')
    .replace(/ү/g, 'у')
    .replace(/ң/g, 'н')
    .replace(/\s+/g, ' ')
    .trim();

/** Слова без смысла для поиска (предлоги, союзы) — на трёх языках */
const STOP = new Set(
  'в во на и или а но по для с со о об у к ко из от до за при над под про что как это не же ли бы то так все уже мен жана менен үчүн учун да де бул ал the a an of in on at to for and or is are by with from'
    .split(' ')
    .map(normalizeSearch)
);

const WORD_RE = /[\p{L}\p{N}]+/gu;
const tokens = (s: string) => normalizeSearch(s).match(WORD_RE) || [];

/** Слова запроса: служебные убираем (если запрос — только из служебных слов, оставляем как есть) */
export const queryWords = (query: string) => {
  const all = tokens(query);
  const meaningful = all.filter((w) => !STOP.has(w));
  return meaningful.length ? meaningful : all;
};

/** «Смысловые» слова: то, что читатель видит на сайте (метки, разделы), но чего может не быть в тексте публикации */
const CONCEPTS = {
  alert: 'предупреждение предупреждения предупреждаем внимание оповещение важно важное эскертүү эскертуу кабарлоо маанилүү warning warnings alert alerts notice important',
  emergency: 'срочно срочное срочная срочные экстренно экстренное авария аварийное аварийный важно важное важная тез шашылыш авария маанилүү urgent emergency important breaking',
  planned: 'плановое плановая плановые запланировано пландуу пландалган planned scheduled',
  water: 'вода воды водоснабжение водоканал суу water',
  electricity: 'свет электричество электроэнергия отключение света жарык электр power electricity',
  roads: 'дорога дороги перекрытие движение транспорт автобус жол транспорт road traffic',
  repairs: 'ремонт ремонтные работы оңдоо ремонт repair works',
  hazard: 'погода стихия опасные явления мчс заморозки шторм аба ырайы weather storm',
  concerts: 'концерт афиша шоу концерт афиша concert show',
  festivals: 'фестиваль праздник майрам festival',
  fairs: 'ярмарка базар распродажа жарманке fair market',
  exhibitions: 'выставка форум экспо көргөзмө exhibition expo',
  culture: 'театр спектакль культура музей маданият театр theatre culture',
  sport: 'спорт турнир соревнование матч чемпионат спорт мелдеш sport tournament match',
  cinema: 'кино фильм показ кино тасма cinema film movie',
  education: 'образование школа учеба студенты экзамены орт билим мектеп education school exam',
  gov: 'государство правительство кабмин мамлекет өкмөт government',
  state: 'государство решение президент мамлекет government',
  laws: 'закон законы правила указ мыйзам law rules',
  business: 'бизнес экономика компания предприниматели бизнес экономика business economy',
  tech: 'ии искусственный интеллект it технологии айти цифровой жасалма интеллект ai tech technology',
  notices: 'объявление объявления жарыя notice',
  news: 'новости новость жаңылык news',
} as const;

interface Field {
  w: number;
  tokens: string[];
}
const fieldCache = new WeakMap<Announcement, { fields: Field[]; flat: string }>();

const vals = (o: unknown) => (o && typeof o === 'object' ? Object.values(o as Record<string, unknown>).filter((v): v is string => typeof v === 'string') : []);

const categoryLabels = (a: Announcement): string[] => {
  const cat = (translations.categories as Record<string, Record<string, string>>)[a.category];
  const rubric = RUBRICS.find((r) => !r.aggregate && r.categories.includes(a.category));
  return [...(cat ? Object.values(cat) : []), ...(rubric ? Object.values(rubric.label) : [])];
};

const conceptWords = (a: Announcement) => {
  const out: string[] = [];
  if (isAlert(a)) out.push(CONCEPTS.alert);
  if (a.urgency === 'emergency') out.push(CONCEPTS.emergency);
  if (a.urgency === 'planned') out.push(CONCEPTS.planned);
  const c = (CONCEPTS as Record<string, string>)[a.category];
  if (c) out.push(c);
  return out.join(' ');
};

const fieldsOf = (a: Announcement) => {
  let f = fieldCache.get(a);
  if (!f) {
    const fields: Field[] = [
      { w: 10, tokens: tokens(vals(a.title).join(' ')) },
      { w: 6, tokens: tokens([...categoryLabels(a), conceptWords(a)].join(' ')) },
      { w: 4, tokens: tokens(vals(a.summary).join(' ')) },
      { w: 3, tokens: tokens([...vals(a.location), a.district, a.locality, a.sourceName, a.eventDetails?.venue, a.protocolCode].filter(Boolean).join(' ')) },
      { w: 2, tokens: tokens(vals(a.description).join(' ')) },
    ];
    const flat = normalizeSearch([...vals(a.title), ...vals(a.summary), ...vals(a.description)].join(' '));
    f = { fields, flat };
    fieldCache.set(a, f);
  }
  return f;
};

/** Опечатка: расстояние Дамерау—Левенштейна не больше max (с ранним выходом) */
const closeEnough = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return false;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length] <= max;
};

const commonPrefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** Насколько слово текста t подходит к слову запроса q: 1 — то же слово/форма, 0.8 — начало, 0.55 — опечатка, 0.35 — середина */
export const wordMatch = (q: string, t: string): number => {
  if (t === q) return 1;
  if (q.length >= 4 && t.length >= 4 && commonPrefix(q, t) >= Math.max(4, Math.min(q.length, t.length) - 2)) return 1;
  if (t.startsWith(q)) return 0.8;
  if (q.length >= 5) {
    const max = q.length >= 8 ? 2 : 1;
    if (closeEnough(q, t, max) || (t.length > q.length && closeEnough(q, t.slice(0, q.length), max))) return 0.55;
  }
  if (q.length >= 4 && t.includes(q)) return 0.35;
  return 0;
};

/**
 * Оценка публикации по запросу: 0 — не подходит. Чем больше — тем выше в результатах.
 * Пустой запрос — подходит всё (1).
 */
export const searchScore = (a: Announcement, query: string): number => {
  const words = queryWords(query);
  if (!words.length) return 1;
  const cached = fieldsOf(a);
  const flat = cached.flat;
  // срочность зависит от времени (красная метка «Сегодня», «Сейчас») — поэтому не в кэше
  const fields = alertLevel(a) === 'urgent' && a.urgency !== 'emergency' ? [...cached.fields, { w: 6, tokens: tokens(CONCEPTS.emergency) }] : cached.fields;
  let score = 0;
  let found = 0;
  for (const q of words) {
    let best = 0;
    for (const f of fields) {
      for (const t of f.tokens) {
        const m = wordMatch(q, t);
        if (m) best = Math.max(best, m * f.w);
        if (best >= 10) break;
      }
    }
    if (best > 0) found++;
    score += best;
  }
  if (!found) return 0;
  // сверху — где нашлись все слова запроса
  score *= found / words.length;
  if (found === words.length && words.length > 1) score += 15;
  // целая фраза из запроса — как есть в тексте
  const phrase = normalizeSearch(query);
  if (words.length > 1 && phrase.length >= 5 && flat.includes(phrase)) score += 25;
  return score;
};

/** Подходит ли публикация под запрос (пустой запрос — подходит всё) */
export const matchesSearch = (a: Announcement, query: string) => searchScore(a, query) > 0;

/** Публикации по запросу, самые подходящие сверху (при равной оценке — порядок списка сохраняется) */
export const rankSearch = (items: Announcement[], query: string) =>
  items
    .map((a, i) => ({ a, i, s: searchScore(a, query) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.a);

/**
 * Разметка для выделения найденных слов жирным: куски текста с признаком hit.
 * Выделяются слова, которые подходят к слову запроса (форма, начало, опечатка), а не «смысловые» слова.
 */
export const highlightParts = (text: string, query: string): { text: string; hit: boolean }[] => {
  const words = queryWords(query);
  if (!words.length || !text) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const tok = normalizeSearch(m[0]);
    if (words.some((q) => wordMatch(q, tok) >= 0.55)) {
      if (m.index! > last) out.push({ text: text.slice(last, m.index), hit: false });
      out.push({ text: m[0], hit: true });
      last = m.index! + m[0].length;
    }
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
};

/** Отрывок текста вокруг первого найденного слова (для показа под заголовком в результатах) */
export const searchSnippet = (text: string, query: string, before = 50, after = 110): string => {
  if (!text) return '';
  const words = queryWords(query);
  for (const m of text.matchAll(WORD_RE)) {
    const tok = normalizeSearch(m[0]);
    if (words.some((q) => wordMatch(q, tok) >= 0.55)) {
      const start = Math.max(0, m.index! - before);
      const end = Math.min(text.length, m.index! + m[0].length + after);
      const cut = (s: string) => s.replace(/\s+/g, ' ').trim();
      return `${start > 0 ? '…' : ''}${cut(text.slice(start, end))}${end < text.length ? '…' : ''}`;
    }
  }
  return '';
};

/** Слова о погоде: запрос, с которого начинается любое из них («п», «по», «пог», «аб»), уже показывает прогноз */
const WEATHER_WORDS = ['погода', 'прогноз', 'температура', 'осадки', 'дождь', 'снег', 'гидромет', 'кыргызгидромет', 'аба', 'ырайы', 'жаан', 'кар', 'божомол', 'weather', 'forecast', 'temperature', 'rain', 'snow'];
export const isWeatherQuery = (query: string) =>
  normalizeSearch(query)
    .split(' ')
    .filter(Boolean)
    .some((w) => WEATHER_WORDS.some((k) => { const n = normalizeSearch(k); return n.startsWith(w) || w.startsWith(n); }));
