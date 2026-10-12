import { Announcement } from '../types';

/**
 * Только проверенные публикации с указанием источников.
 * Новые объявления добавляются через панель администратора.
 */
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-shakira-bishkek-arena',
    protocolCode: '#KG-EV-SHAKIRA',
    title: {
      ru: 'Концерт Шакиры на стадионе «Бишкек Арена»',
      kg: 'Шакиранын «Бишкек Арена» стадиондогу концерти',
      en: 'Shakira live at Bishkek Arena',
    },
    summary: {
      ru: 'Первый концерт колумбийской певицы в Кыргызстане и Центральной Азии в рамках мирового тура Las Mujeres Ya No Lloran.',
      kg: 'Колумбиялык ырчынын Кыргызстандагы жана Борбор Азиядагы биринчи концерти — Las Mujeres Ya No Lloran дүйнөлүк турунун алкагында.',
      en: "The Colombian star's first concert in Kyrgyzstan and Central Asia, part of the Las Mujeres Ya No Lloran World Tour.",
    },
    description: {
      ru: 'Шакира выступит на стадионе «Бишкек Арена» 18 октября 2026 года в 19:00. В программе хиты разных лет, среди которых Hips Don’t Lie, Whenever, Wherever, Waka Waka и She Wolf, а также песни нового альбома. Сцена расположена у восточной трибуны, трибуны за сценой закрыты. Вход на стадион по QR-билету. Возрастное ограничение 7+. Билеты продаются на государственном портале GovTicket, по данным Управления делами Президента КР, билеты купили жители 28 стран.',
      kg: 'Шакира 2026-жылдын 18-октябрында саат 19:00до «Бишкек Арена» стадионунда концерт берет. Программада ар кайсы жылдардагы хиттер жана жаңы альбомдун ырлары. Сахна чыгыш трибунанын жанында жайгашкан, сахнанын аркасындагы трибуналар жабык. Стадионго QR-билет менен кирүү. Жаш чектөө 7+. Билеттер GovTicket мамлекеттик порталында сатылат.',
      en: 'Shakira performs at Bishkek Arena on 18 October 2026 at 19:00. The set features hits from across her career, including Hips Don’t Lie, Whenever, Wherever, Waka Waka and She Wolf, plus songs from her new album. The stage is set up by the east stand and the stands behind it are closed. Entry is by QR ticket; age 7+. Tickets are sold on the state GovTicket portal.',
    },
    category: 'concerts',
    city: 'bishkek',
    location: {
      ru: 'Стадион «Бишкек Арена», ул. Алтын-Бешик, 77/2а',
      kg: '«Бишкек Арена» стадиону, Алтын-Бешик көч., 77/2а',
      en: 'Bishkek Arena stadium, 77/2a Altyn-Beshik St',
    },
    startDate: '2026-10-18T19:00',
    endDate: '',
    urgency: 'event',
    status: 'scheduled',
    isUrgentTicker: true,
    sourceName: 'Economist.kg • Управление делами Президента КР',
    sourceOrgType: 'СМИ',
    sourceUrl: 'https://economist.kg/society/2026/09/30/shakira-bishkek-bilety-mesta-pravila/',
    isVerified: true,
    publishedAt: '2026-09-30T06:50',
    updatedAt: '2026-10-09T12:02',
    eventDetails: {
      priceText: {
        ru: 'от 12 000 до 40 000 сом',
        kg: '12 000 — 40 000 сомдон',
        en: '12,000 – 40,000 KGS',
      },
      venue: 'Стадион «Бишкек Арена»',
      timeRange: '19:00 • 7+',
    },
    isDemo: false,
  },
  {
    id: 'ann-shakira-free-shuttles',
    protocolCode: '#KG-TR-SHAKIRA',
    title: {
      ru: 'Бесплатные автобусы к «Бишкек Арене» на концерт Шакиры',
      kg: 'Шакиранын концертине «Бишкек Аренага» акысыз автобустар',
      en: 'Free shuttle buses to Bishkek Arena for the Shakira concert',
    },
    summary: {
      ru: 'Шесть бесплатных маршрутов, отправление с 15:00 до 18:00 по мере заполнения, интервал 4–6 минут.',
      kg: 'Алты акысыз каттам, саат 15:00дөн 18:00гө чейин, автобус толгон сайын жөнөйт, интервал 4–6 мүнөт.',
      en: 'Six free routes, running 15:00–18:00 and departing as they fill, every 4–6 minutes.',
    },
    description: {
      ru: '18 октября для зрителей концерта Шакиры запустят шесть бесплатных автобусных маршрутов к «Бишкек Арене» и обратно. Автобусы будут курсировать к стадиону с 15:00 до 18:00 и отправляться по мере заполнения с интервалом 4–6 минут. Для посадки нужно предъявить QR-код билета на концерт. Концерт начнётся в 19:00.',
      kg: '18-октябрда Шакиранын концертине келгендер үчүн «Бишкек Аренага» жана кайра алты акысыз автобус каттамы иштейт. Автобустар стадионго саат 15:00дөн 18:00гө чейин каттайт, толгон сайын 4–6 мүнөттүк интервал менен жөнөйт. Автобуска түшүү үчүн концерттин билетинин QR-кодун көрсөтүү керек.',
      en: 'On 18 October six free bus routes will take Shakira concert-goers to Bishkek Arena and back. Buses run to the stadium from 15:00 to 18:00 and depart as they fill, every 4–6 minutes. Show the QR code of your concert ticket to board. The concert starts at 19:00.',
    },
    category: 'roads',
    city: 'bishkek',
    location: {
      ru: 'Шесть точек отправления в Бишкеке → стадион «Бишкек Арена»',
      kg: 'Бишкектеги алты жөнөө чекити → «Бишкек Арена» стадиону',
      en: 'Six departure points in Bishkek → Bishkek Arena stadium',
    },
    startDate: '2026-10-18T15:00',
    endDate: '2026-10-18T18:00',
    urgency: 'planned',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: 'Economist.kg • Управление делами Президента КР',
    sourceOrgType: 'СМИ',
    sourceUrl: 'https://economist.kg/transport/2026/10/09/shakira-besplatnye-avtobusy/',
    isVerified: true,
    publishedAt: '2026-10-09T12:02',
    updatedAt: '2026-10-09T12:02',
    isDemo: false,
  },
];
