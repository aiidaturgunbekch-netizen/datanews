/**
 * Настоящая страница новости по адресу /n/<id>: заголовок, лид, факты и текст есть прямо в HTML,
 * поэтому её видят Google и другие поисковики, а мессенджеры показывают превью.
 * Страница собирается из обычной оболочки сайта (index.html): после загрузки скриптов
 * React заменяет этот текст той же статьёй в интерфейсе сайта.
 */
import type { Announcement, Language } from '../../src/types';
import { getTranslation } from '../../src/locales/translations';
import { formatDayMonthTime, formatWhen } from '../../src/utils/dates';
import { eventSource, sourceLabel } from '../../src/utils/links';
import { mergeAnnouncements } from '../../src/utils/mergeAnnouncements';
import { placeText } from '../../src/utils/place';
import { isConfigured } from './kv';
import { loadPublished } from './assistant';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Опубликованные новости. Если база не подключена или недоступна — встроенные публикации,
 * чтобы ссылки на новости и карта сайта работали всегда.
 */
export const loadForPages = async (): Promise<Announcement[]> => {
  if (isConfigured()) {
    try {
      return await loadPublished();
    } catch {
      /* база временно недоступна — ниже встроенные публикации */
    }
  }
  return mergeAnnouncements([]);
};

const T = {
  source: { ru: 'Источник', kg: 'Булагы', en: 'Source' },
  published: { ru: 'Опубликовано', kg: 'Жарыяланды', en: 'Published' },
  updated: { ru: 'Обновлено', kg: 'Жаңыртылды', en: 'Updated' },
  when: { ru: 'Когда', kg: 'Качан', en: 'When' },
  where: { ru: 'Где', kg: 'Кайда', en: 'Where' },
  home: { ru: 'Все новости DataNews', kg: 'DataNews баардык жаңылыктары', en: 'All DataNews stories' },
};

/** Время на сайте — бишкекское без пояса (YYYY-MM-DDTHH:mm); для поисковиков добавляем +06:00 */
export const toIsoKg = (v?: string) => {
  if (!v) return undefined;
  if (/[zZ]|[+-]\d\d:\d\d$/.test(v)) return v;
  const [d, t = '00:00'] = v.split('T');
  return `${d}T${t.slice(0, 5)}:00+06:00`;
};

/** Картинка для превью: только растровая (SVG мессенджеры не показывают), с полным адресом */
export const previewImage = (a: Announcement | undefined, origin: string) => {
  let image = a?.imageUrl && !a.imageUrl.endsWith('.svg') ? a.imageUrl : '/og-default.png';
  if (image.startsWith('/')) image = origin + image;
  return image;
};

/** Текст статьи для HTML страницы (классы те же, что у статьи на сайте) */
export const articleHtml = (a: Announcement, lang: Language) => {
  const { t } = getTranslation(lang);
  const pick = (v?: Partial<Record<Language, string>>) => (v ? v[lang] || v.ru || '' : '');
  const title = pick(a.title);
  const summary = pick(a.summary);
  const body = pick(a.description);
  const city = t(`cities.${a.city === 'karakol' ? 'issykkul' : a.city}`);
  // «Где» — только известное: адрес или площадка, иначе территория (без выдуманного адреса)
  const where = placeText(a, lang) || [a.locality, a.district, city].filter(Boolean).join(' • ');
  const source = eventSource(a);
  const sourceHtml = source
    ? `<a href="${esc(source)}" rel="noopener" class="font-bold text-[#12327A] hover:underline">${esc(sourceLabel(a, lang))}</a>`
    : `<b class="text-[#0f1b33]">${esc(sourceLabel(a, lang))}</b>`;
  const updated =
    a.updatedAt && a.updatedAt !== a.publishedAt
      ? ` · ${T.updated[lang]}: <time datetime="${esc(toIsoKg(a.updatedAt) || '')}">${esc(formatDayMonthTime(a.updatedAt, lang))}</time>`
      : '';
  return `<article class="max-w-[720px] mx-auto px-4 md:px-6 pt-6 sm:pt-10 pb-16">
<p class="text-xs font-bold uppercase tracking-[0.12em] text-[#12327A]">${esc(t(`categories.${a.category}`))} · ${esc(city)}</p>
<h1 class="mt-4 font-serif text-[30px] sm:text-[42px] leading-[1.12] font-bold text-[#0f1b33]">${esc(title)}</h1>
${summary ? `<p class="mt-4 text-lg sm:text-xl leading-relaxed text-[#3b4252]">${esc(summary)}</p>` : ''}
<p class="mt-6 py-3 border-y border-gray-200 text-sm text-gray-600">${T.source[lang]}: ${sourceHtml} · ${T.published[lang]}: <time datetime="${esc(toIsoKg(a.publishedAt) || '')}">${esc(formatDayMonthTime(a.publishedAt, lang))}</time>${updated}</p>
<dl class="mt-8 rounded-2xl bg-[#f3f6fc] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
<div><dt class="text-[11px] font-bold uppercase tracking-wider text-gray-500">${T.when[lang]}</dt><dd class="mt-1 text-[15px] font-semibold text-[#0f1b33]">${esc(formatWhen(a.startDate, a.endDate, lang, true, a.timeTBA, a.allDay))}</dd></div>
<div><dt class="text-[11px] font-bold uppercase tracking-wider text-gray-500">${T.where[lang]}</dt><dd class="mt-1 text-[15px] font-semibold text-[#0f1b33]">${esc(where)}</dd></div>
</dl>
${body && body !== summary ? `<div class="mt-8 text-[18px] leading-[1.75] text-[#1f2937] whitespace-pre-line">${esc(body)}</div>` : ''}
<p class="mt-10"><a href="/" class="text-sm font-bold text-[#12327A] hover:underline">← ${T.home[lang]}</a></p>
</article>`;
};

/** Адрес новости на нужном языке: русский — без параметра, остальные — ?lang=kg / ?lang=en */
export const articleUrl = (id: string, lang: Language, origin: string) => `${origin}/n/${id}${lang === 'ru' ? '' : `?lang=${lang}`}`;

/** Разметка schema.org NewsArticle — по ней поисковики понимают, что это новость, когда и кем опубликована */
export const jsonLd = (a: Announcement, lang: Language, origin: string) => {
  const url = articleUrl(a.id, lang, origin);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: (a.title[lang] || a.title.ru).slice(0, 110),
    description: a.summary[lang] || a.summary.ru,
    datePublished: toIsoKg(a.publishedAt),
    dateModified: toIsoKg(a.updatedAt || a.publishedAt),
    image: [previewImage(a, origin)],
    inLanguage: lang === 'kg' ? 'ky' : lang,
    mainEntityOfPage: url,
    url,
    author: { '@type': 'Organization', name: 'DataNews Kyrgyzstan', url: `${origin}/` },
    publisher: { '@type': 'Organization', name: 'DataNews Kyrgyzstan', logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png` } },
    ...(eventSource(a) ? { isBasedOn: eventSource(a) } : {}),
  };
  // «</script>» внутри текста не должен закрыть тег
  return JSON.stringify(data).replace(/</g, '\\u003c');
};

/** Теги заголовка страницы: title, описание, превью для мессенджеров, канонический адрес, schema.org */
export const headTags = (a: Announcement, lang: Language, origin: string) => {
  const title = `${a.title[lang] || a.title.ru} — DataNews Kyrgyzstan`;
  const desc = a.summary[lang] || a.summary.ru;
  const url = articleUrl(a.id, lang, origin);
  const image = previewImage(a, origin);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    // Та же новость на других языках сайта
    ...(['ru', 'kg', 'en'] as const).map((l) => `<link rel="alternate" hreflang="${l === 'kg' ? 'ky' : l}" href="${esc(articleUrl(a.id, l, origin))}" />`),
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="DataNews Kyrgyzstan" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="article:published_time" content="${esc(toIsoKg(a.publishedAt) || '')}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${jsonLd(a, lang, origin)}</script>`,
  ].join('\n    ');
};

/**
 * Вставляет статью в оболочку сайта: заменяет общий заголовок и превью на данные новости,
 * а текст статьи кладёт внутрь <div id="root"> (React потом заменит его интерфейсом сайта).
 * Возвращает null, если оболочка не похожа на index.html сайта.
 */
export const injectArticle = (shell: string, a: Announcement, lang: Language, origin: string): string | null => {
  if (!/<div id="root"><\/div>/.test(shell) || !/<\/head>/i.test(shell)) return null;
  return shell
    .replace(/<html lang="[^"]*"/, `<html lang="${lang === 'kg' ? 'ky' : lang}"`)
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta (?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/gi, '')
    .replace(/<\/head>/i, `  ${headTags(a, lang, origin)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${articleHtml(a, lang)}</div>`);
};

/** Запасная страница, если оболочку сайта получить не удалось: текст для поисковиков и переход на сайт */
export const standalonePage = (a: Announcement, lang: Language, origin: string) => {
  const target = `${origin}/${lang === 'ru' ? '' : `?lang=${lang}`}#/n/${a.id}`;
  return `<!doctype html><html lang="${lang === 'kg' ? 'ky' : lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
    ${headTags(a, lang, origin)}
</head><body style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;line-height:1.6;color:#0f1b33">
${articleHtml(a, lang)}
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;
};
