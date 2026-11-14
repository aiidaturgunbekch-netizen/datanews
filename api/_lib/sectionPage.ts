/**
 * Страница раздела по адресу /r/<рубрика> (через vercel.json → /api/share?rubric=<рубрика>):
 * заголовок, описание и список последних материалов раздела есть прямо в HTML — их видят Google и Яндекс
 * по запросам «погода», «отключение воды», «дороги» и т. п. После загрузки скриптов React открывает
 * этот же раздел в интерфейсе сайта.
 */
import type { Announcement, Language } from '../../src/types';
import { getTranslation } from '../../src/locales/translations';
import { formatDayMonthTime } from '../../src/utils/dates';
import { RUBRICS, Rubric } from '../../src/config/rubrics';
import { esc } from './articlePage';

type L = Record<Language, string>;

/** Заголовок страницы для поиска и короткое описание раздела (только о самом разделе, без выдуманных фактов) */
const SEO: Record<string, { title: L; desc: L }> = {
  weather: {
    title: { ru: 'Погода в Кыргызстане: прогноз и предупреждения', kg: 'Кыргызстандагы аба ырайы: болжол жана эскертүүлөр', en: 'Weather in Kyrgyzstan: forecast and warnings' },
    desc: {
      ru: 'Прогноз погоды по Бишкеку, Ошу и всем областям Кыргызстана, штормовые предупреждения, перевалы, сели и лавинная опасность.',
      kg: 'Бишкек, Ош жана Кыргызстандын бардык облустары боюнча аба ырайы, бороон эскертүүлөрү, ашуулар, сел жана көчкү коркунучу.',
      en: 'Weather for Bishkek, Osh and all regions of Kyrgyzstan: storm warnings, mountain passes, mudflow and avalanche risk.',
    },
  },
  utilities: {
    title: { ru: 'Отключения воды и света в Бишкеке, Оше и областях', kg: 'Бишкек, Ош жана облустарда суу жана жарык өчүрүү', en: 'Water and power outages in Bishkek, Osh and regions' },
    desc: {
      ru: 'Графики отключения холодной и горячей воды, электричества, газа и плановые ремонты по городам и областям Кыргызстана.',
      kg: 'Кыргызстандын шаарлары жана облустары боюнча суу, жарык, газ өчүрүү графиктери жана пландуу оңдоо иштери.',
      en: 'Schedules of water, electricity and gas outages and planned repairs across Kyrgyzstan.',
    },
  },
  roads: {
    title: { ru: 'Дороги Кыргызстана: перекрытия, ремонт, перевалы', kg: 'Кыргызстандын жолдору: жабылуулар, оңдоо, ашуулар', en: 'Roads in Kyrgyzstan: closures, repairs, passes' },
    desc: {
      ru: 'Перекрытия улиц, ремонт дорог, состояние перевалов и ограничения движения в Бишкеке и по всему Кыргызстану.',
      kg: 'Бишкекте жана бүт Кыргызстан боюнча көчөлөрдүн жабылышы, жол оңдоо, ашуулардын абалы жана кыймыл чектөөлөрү.',
      en: 'Street closures, road repairs, mountain pass conditions and traffic restrictions in Bishkek and across Kyrgyzstan.',
    },
  },
  state: {
    title: { ru: 'Решения государства и законы Кыргызстана', kg: 'Кыргызстандын мамлекеттик чечимдери жана мыйзамдары', en: 'Government decisions and laws of Kyrgyzstan' },
    desc: {
      ru: 'Новые законы, постановления и решения государственных органов Кыргызстана, которые касаются жителей.',
      kg: 'Тургундарга тиешелүү жаңы мыйзамдар, токтомдор жана мамлекеттик органдардын чечимдери.',
      en: 'New laws, resolutions and decisions of state bodies of Kyrgyzstan that affect residents.',
    },
  },
  tech: {
    title: { ru: 'ИИ и IT-технологии в Кыргызстане', kg: 'Кыргызстандагы жасалма интеллект жана IT', en: 'AI and IT technologies in Kyrgyzstan' },
    desc: {
      ru: 'Новости искусственного интеллекта, цифровых сервисов и IT-событий Кыргызстана.',
      kg: 'Кыргызстандагы жасалма интеллект, санариптик кызматтар жана IT-иш-чаралар жаңылыктары.',
      en: 'News on artificial intelligence, digital services and IT events in Kyrgyzstan.',
    },
  },
  culture: {
    title: { ru: 'Афиша Бишкека и Кыргызстана: концерты, кино, фестивали', kg: 'Бишкек жана Кыргызстандын афишасы: концерттер, кино, фестивалдар', en: 'Events in Bishkek and Kyrgyzstan: concerts, cinema, festivals' },
    desc: {
      ru: 'Концерты, спектакли, кино, фестивали и культурные события в Бишкеке, Оше и областях Кыргызстана.',
      kg: 'Бишкекте, Ошто жана облустарда концерттер, спектаклдер, кино, фестивалдар жана маданий иш-чаралар.',
      en: 'Concerts, plays, cinema, festivals and cultural events in Bishkek, Osh and the regions of Kyrgyzstan.',
    },
  },
  sport: {
    title: { ru: 'Спорт в Кыргызстане: соревнования и события', kg: 'Кыргызстандагы спорт: мелдештер жана иш-чаралар', en: 'Sport in Kyrgyzstan: competitions and events' },
    desc: {
      ru: 'Спортивные соревнования, турниры и события в Бишкеке и по всему Кыргызстану.',
      kg: 'Бишкекте жана бүт Кыргызстанда спорттук мелдештер, турнирлер жана иш-чаралар.',
      en: 'Sports competitions, tournaments and events in Bishkek and across Kyrgyzstan.',
    },
  },
  expos: {
    title: { ru: 'Выставки и ярмарки в Кыргызстане', kg: 'Кыргызстандагы көргөзмөлөр жана жарманкелер', en: 'Exhibitions and fairs in Kyrgyzstan' },
    desc: {
      ru: 'Выставки, ярмарки выходного дня и сельскохозяйственные ярмарки в Бишкеке, Оше и областях.',
      kg: 'Бишкекте, Ошто жана облустарда көргөзмөлөр, дем алыш күнкү жана айыл чарба жарманкелери.',
      en: 'Exhibitions, weekend and agricultural fairs in Bishkek, Osh and the regions.',
    },
  },
  education: {
    title: { ru: 'Образование в Кыргызстане: школы, вузы, ОРТ', kg: 'Кыргызстанда билим берүү: мектептер, ЖОЖдор, ЖРТ', en: 'Education in Kyrgyzstan: schools, universities, exams' },
    desc: {
      ru: 'Сроки приёма, экзамены, ОРТ, каникулы и новости школ и вузов Кыргызстана.',
      kg: 'Кабыл алуу мөөнөттөрү, экзамендер, ЖРТ, каникулдар жана мектептер менен ЖОЖдордун жаңылыктары.',
      en: 'Admission deadlines, exams, holidays and news from schools and universities of Kyrgyzstan.',
    },
  },
  news: {
    title: { ru: 'Новости Кыргызстана', kg: 'Кыргызстандын жаңылыктары', en: 'Kyrgyzstan news' },
    desc: {
      ru: 'Новости Кыргызстана по официальным источникам: решения государства, экономика, технологии.',
      kg: 'Расмий булактар боюнча Кыргызстандын жаңылыктары: мамлекеттик чечимдер, экономика, технологиялар.',
      en: 'Kyrgyzstan news from official sources: government decisions, economy, technology.',
    },
  },
  business: {
    title: { ru: 'Бизнес-новости Кыргызстана', kg: 'Кыргызстандын бизнес жаңылыктары', en: 'Kyrgyzstan business news' },
    desc: {
      ru: 'Новости экономики и бизнеса Кыргызстана: решения, налоги, события для предпринимателей.',
      kg: 'Кыргызстандын экономика жана бизнес жаңылыктары: чечимдер, салыктар, ишкерлер үчүн иш-чаралар.',
      en: 'Economy and business news of Kyrgyzstan: decisions, taxes, events for entrepreneurs.',
    },
  },
  notices: {
    title: { ru: 'Объявления в Кыргызстане', kg: 'Кыргызстандагы жарыялар', en: 'Notices in Kyrgyzstan' },
    desc: {
      ru: 'Официальные объявления организаций для жителей Бишкека, Оша и областей Кыргызстана.',
      kg: 'Бишкек, Ош жана облустардын тургундары үчүн уюмдардын расмий жарыялары.',
      en: 'Official notices from organizations for residents of Bishkek, Osh and the regions of Kyrgyzstan.',
    },
  },
};

const MAX_ITEMS = 40;
const UI = {
  latest: { ru: 'Последние материалы', kg: 'Акыркы материалдар', en: 'Latest stories' },
  empty: { ru: 'Сейчас в разделе нет материалов.', kg: 'Азыр бөлүмдө материалдар жок.', en: 'No stories in this section yet.' },
  other: { ru: 'Другие разделы', kg: 'Башка бөлүмдөр', en: 'Other sections' },
  home: { ru: 'Главная DataNews', kg: 'DataNews башкы бет', en: 'DataNews home' },
};

export const sectionSeo = (r: Rubric, lang: Language) => {
  const s = SEO[r.id];
  return { title: s?.title[lang] || r.label[lang] || r.label.ru, desc: s?.desc[lang] || '' };
};

export const sectionUrl = (id: string, lang: Language, origin: string) => `${origin}/r/${id}${lang === 'ru' ? '' : `?lang=${lang}`}`;

/** Материалы раздела: последние опубликованные сверху */
export const sectionItems = (r: Rubric, items: Announcement[]) =>
  items
    .filter((a) => r.categories.includes(a.category))
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .slice(0, MAX_ITEMS);

const sectionHtml = (r: Rubric, items: Announcement[], lang: Language) => {
  const { t } = getTranslation(lang);
  const { title, desc } = sectionSeo(r, lang);
  const pick = (v?: Partial<Record<Language, string>>) => (v ? v[lang] || v.ru || '' : '');
  const q = lang === 'ru' ? '' : `?lang=${lang}`;
  const list = items
    .filter((a) => pick(a.title))
    .map((a) => {
      const city = t(`cities.${a.city === 'karakol' ? 'issykkul' : a.city}`);
      const summary = pick(a.summary);
      return `<li class="py-4 border-b border-gray-200"><a href="/n/${esc(a.id)}${q}" class="font-serif text-lg font-bold text-[#0f1b33] hover:underline">${esc(pick(a.title))}</a>
<p class="mt-1 text-xs text-gray-500">${esc(city)} · <time datetime="${esc(a.publishedAt || '')}">${esc(formatDayMonthTime(a.publishedAt, lang))}</time></p>${summary ? `\n<p class="mt-1 text-sm text-gray-700">${esc(summary)}</p>` : ''}</li>`;
    })
    .join('\n');
  const others = RUBRICS.filter((x) => x.id !== r.id)
    .map((x) => `<a href="/r/${x.id}${q}" class="inline-block mr-3 mb-2 text-sm font-bold text-[#12327A] hover:underline">${esc(x.label[lang] || x.label.ru)}</a>`)
    .join('');
  return `<main class="max-w-[820px] mx-auto px-4 md:px-6 pt-6 sm:pt-10 pb-16">
<h1 class="font-serif text-[30px] sm:text-[40px] leading-[1.15] font-bold text-[#0f1b33]">${esc(title)}</h1>
${desc ? `<p class="mt-4 text-lg leading-relaxed text-[#3b4252]">${esc(desc)}</p>` : ''}
<h2 class="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-[#12327A]">${UI.latest[lang]}</h2>
${list ? `<ul class="mt-2">\n${list}\n</ul>` : `<p class="mt-2 text-gray-600">${UI.empty[lang]}</p>`}
<nav class="mt-10" aria-label="${UI.other[lang]}"><h2 class="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-gray-500">${UI.other[lang]}</h2>${others}</nav>
<p class="mt-6"><a href="/${q}" class="text-sm font-bold text-[#12327A] hover:underline">← ${UI.home[lang]}</a></p>
</main>`;
};

const sectionHead = (r: Rubric, items: Announcement[], lang: Language, origin: string) => {
  const { title, desc } = sectionSeo(r, lang);
  const url = sectionUrl(r.id, lang, origin);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: desc,
    url,
    inLanguage: lang === 'kg' ? 'ky' : lang,
    isPartOf: { '@type': 'WebSite', name: 'DataNews Kyrgyzstan', url: `${origin}/` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.slice(0, 20).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/n/${a.id}` })),
    },
  };
  return [
    `<title>${esc(`${title} — DataNews Kyrgyzstan`)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    ...(['ru', 'kg', 'en'] as const).map((l) => `<link rel="alternate" hreflang="${l === 'kg' ? 'ky' : l}" href="${esc(sectionUrl(r.id, l, origin))}" />`),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="DataNews Kyrgyzstan" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(`${origin}/og-default.png`)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
};

/** Вставляет страницу раздела в оболочку сайта (index.html); null — оболочка не похожа на сайт */
export const injectSection = (shell: string, r: Rubric, all: Announcement[], lang: Language, origin: string): string | null => {
  if (!/<div id="root"><\/div>/.test(shell) || !/<\/head>/i.test(shell)) return null;
  const items = sectionItems(r, all);
  return shell
    .replace(/<html lang="[^"]*"/, `<html lang="${lang === 'kg' ? 'ky' : lang}"`)
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta (?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/gi, '')
    .replace(/<\/head>/i, `  ${sectionHead(r, items, lang, origin)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${sectionHtml(r, items, lang)}</div>`);
};

/** Запасная страница раздела без оболочки: текст для поисковиков и переход на сайт */
export const standaloneSection = (r: Rubric, all: Announcement[], lang: Language, origin: string) => {
  const items = sectionItems(r, all);
  const target = `${origin}/?r=${r.id}${lang === 'ru' ? '' : `&lang=${lang}`}`;
  return `<!doctype html><html lang="${lang === 'kg' ? 'ky' : lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
    ${sectionHead(r, items, lang, origin)}
</head><body style="font-family:system-ui,sans-serif;max-width:820px;margin:0 auto;padding:24px 16px;line-height:1.6;color:#0f1b33">
${sectionHtml(r, items, lang)}
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;
};
