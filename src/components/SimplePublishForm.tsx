import React, { useEffect, useMemo, useState } from 'react';
import type { Announcement, CategoryId, CityId, Language, PlanId } from '../types';
import { getTranslation } from '../locales/translations';
import { PublishKey, tp } from '../locales/publish';
import { availableTypes, categoriesFor, isOnline, ONLINE_VENUE, PublishType, typeOf } from '../config/publishTypes';
import { CITY_OPTIONS, FormPreview, inputCls, loadPhoto } from './AnnouncementForm';
import { DISTRICTS } from '../config/districts';
import { kgNowLocal } from '../utils/time';
import { errorText } from '../locales/account';

/**
 * Простая форма размещения для личного кабинета: 1) тип → 2) данные → 3) предпросмотр.
 * Показываются только поля выбранного типа; редакционные настройки (подтверждение, срочность, уровень опасности,
 * проверка билетов и т. п.) здесь не показываются, а сервер их всё равно сбрасывает.
 * Организация берётся из профиля на сервере. Ничего не подставляется вместо отсутствующих сведений.
 * Редакционная форма (AnnouncementForm) не меняется — она для админ-панели.
 */

/** Поля формы — всё строки, чтобы черновик можно было сохранить в браузере */
export interface SimpleState {
  type: PublishType | '';
  category: CategoryId | '';
  title: string;
  description: string;
  start: string; // YYYY-MM-DDTHH:mm
  end: string; // для событий и предупреждений: YYYY-MM-DDTHH:mm; для объявлений: YYYY-MM-DD (срок действия)
  newsDate: string; // фактическая дата новости, если не сегодня
  venue: string;
  address: string;
  joinUrl: string;
  city: CityId;
  locality: string;
  district: string;
  price: string;
  tickets: string;
  organizerUrl: string;
  phone: string;
  sourceUrl: string;
}

export const emptyState = (): SimpleState => ({
  type: '',
  category: '',
  title: '',
  description: '',
  start: '',
  end: '',
  newsDate: '',
  venue: '',
  address: '',
  joinUrl: '',
  city: 'all',
  locality: '',
  district: '',
  price: '',
  tickets: '',
  organizerUrl: '',
  phone: '',
  sourceUrl: '',
});

/** Поля сохранённой публикации → форма (для правки) */
export const stateFrom = (a: Announcement): SimpleState => {
  const type = typeOf(a);
  return {
    ...emptyState(),
    type,
    category: a.category,
    title: a.title.ru,
    description: a.description.ru,
    start: type === 'news' || type === 'notice' ? '' : a.startDate,
    end: type === 'notice' ? (a.endDate || '').slice(0, 10) : a.endDate || '',
    newsDate: type === 'news' ? a.startDate : '',
    venue: isOnline(a) ? '' : a.eventDetails?.venue || '',
    address: a.location.ru,
    joinUrl: isOnline(a) ? a.venueUrl || '' : '',
    city: a.city === 'karakol' ? 'issykkul' : a.city,
    locality: a.locality || '',
    district: a.district || '',
    price: a.eventDetails?.priceText?.ru || '',
    tickets: a.ticketUrl || '',
    organizerUrl: a.organizerUrl || '',
    phone: a.eventDetails?.contactPhone || '',
    sourceUrl: a.eventSourceUrl || '',
  };
};

const isUrl = (s: string) => !s.trim() || /^https?:\/\/\S+$/i.test(s.trim());

/** Обязательные поля и проверки; возвращает ключ ошибки или null */
export const validate = (s: SimpleState): PublishKey | null => {
  const needsStart = s.type === 'event' || s.type === 'online' || s.type === 'alert';
  if (!s.type || !s.title.trim() || !s.description.trim() || !s.category || (needsStart && !s.start)) return 'errRequired';
  if (needsStart && s.end && s.end < s.start) return 'errEndBeforeStart';
  if (![s.joinUrl, s.tickets, s.organizerUrl, s.sourceUrl].every(isUrl)) return 'errUrl';
  return null;
};

/**
 * Данные для сервера — тот же формат, что у прежней формы (POST/PATCH /api/announcements).
 * Только поля выбранного типа; пустое — пустое, ничего не придумывается.
 * `now` — время размещения по Бишкеку (дата объявления и новости по умолчанию).
 */
export const buildItem = (s: SimpleState, opts: { initial?: Announcement | null; imageData?: string; keepImage?: boolean; now?: string }): Record<string, unknown> => {
  const t = s.type as PublishType;
  const now = opts.now || kgNowLocal();
  const initial = opts.initial || null;
  const show = FIELDS[t];
  const v = (k: keyof SimpleState) => (show.has(k) ? String(s[k] || '').trim() : '');
  const startDate = t === 'notice' ? initial?.startDate || now : t === 'news' ? v('newsDate') || initial?.startDate || now : s.start;
  const endDate = t === 'notice' ? (v('end') ? `${v('end')}T23:59` : '') : t === 'news' ? '' : v('end');
  // Переводы названия, сделанные редакцией, сохраняются, только пока русский текст не изменился
  const keepTr = (f: 'title' | 'description', ru: string) =>
    initial && initial[f].ru === ru ? { ru, kg: initial[f].kg, en: initial[f].en } : { ru };
  return {
    id: initial?.id,
    title: keepTr('title', s.title.trim()),
    summary: { ru: '' },
    description: keepTr('description', s.description.trim()),
    category: s.category,
    city: show.has('city') ? s.city : 'all',
    location: { ru: v('address') },
    locality: v('locality'),
    district: v('district'),
    startDate,
    endDate,
    timeTBA: false,
    allDay: t === 'notice',
    eventSourceUrl: v('sourceUrl'),
    ticketUrl: v('tickets'),
    organizerUrl: v('organizerUrl'),
    artistUrl: initial?.artistUrl || '',
    venueUrl: t === 'online' ? v('joinUrl') : initial && !isOnline(initial) ? initial.venueUrl || '' : '',
    imageUrl: opts.imageData ? '' : opts.keepImage ? initial?.imageUrl || '' : '',
    imageData: opts.imageData || undefined,
    imageCredit: opts.keepImage ? initial?.imageCredit || '' : '',
    imageAlt: '',
    eventDetails: {
      priceText: v('price') ? { ru: v('price') } : undefined,
      venue: t === 'online' ? ONLINE_VENUE : v('venue'),
      // при правке — прежняя организация; в новой публикации сервер берёт её из профиля
      organizer: initial?.eventDetails?.organizer || '',
      contactPhone: v('phone'),
      timeRange: initial?.eventDetails?.timeRange || '',
    },
  };
};

/** Какие поля у какого типа: main — на виду, extra — в «Дополнительных сведениях» */
const LAYOUT: Record<PublishType, { main: (keyof SimpleState)[]; extra: (keyof SimpleState)[] }> = {
  event: { main: ['category', 'title', 'start', 'venue', 'address', 'city', 'description'], extra: ['end', 'price', 'tickets', 'organizerUrl', 'phone'] },
  online: { main: ['category', 'title', 'start', 'joinUrl', 'description'], extra: ['end', 'price', 'phone'] },
  alert: { main: ['category', 'title', 'start', 'end', 'city', 'locality', 'district', 'description'], extra: ['address', 'phone', 'sourceUrl'] },
  notice: { main: ['title', 'description'], extra: ['end', 'phone', 'address', 'city', 'organizerUrl'] },
  news: { main: ['category', 'title', 'description'], extra: ['newsDate', 'sourceUrl', 'city'] },
};
const FIELDS: Record<PublishType, Set<keyof SimpleState>> = Object.fromEntries(
  Object.entries(LAYOUT).map(([k, v]) => [k, new Set([...v.main, ...v.extra])])
) as Record<PublishType, Set<keyof SimpleState>>;

/** Фото в «Дополнительных сведениях» у онлайн-мероприятий, предупреждений и новостей; у остальных — на виду */
const PHOTO_MAIN: PublishType[] = ['event', 'notice'];

const TYPE_ICON: Record<PublishType, string> = { event: 'confirmation_number', online: 'videocam', alert: 'warning', notice: 'campaign', news: 'newspaper' };

interface Props {
  lang: Language;
  plan: PlanId;
  govVerified: boolean;
  /** Кто публикует — показывается, взято из профиля */
  author: string;
  initial?: Announcement | null;
  /** Ключ черновика в браузере (только для новой публикации) */
  storageKey?: string;
  /** Подтверждённый госорган публикует сразу — меняется только текст подсказки */
  direct?: boolean;
  submitLabel: string;
  onSubmit: (item: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

const readDraft = (key?: string): SimpleState | null => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...emptyState(), ...(JSON.parse(raw) as Partial<SimpleState>) } : null;
  } catch {
    return null;
  }
};

export const SimplePublishForm: React.FC<Props> = ({ lang, plan, govVerified, author, initial, storageKey, direct, submitLabel, onSubmit, onCancel }) => {
  const tr = (k: PublishKey) => tp(k, lang);
  const { t } = getTranslation(lang);
  const publisher = { plan, govVerified };
  const types = availableTypes(publisher);

  const [restored] = useState(() => (initial ? null : readDraft(storageKey)));
  const [s, setS] = useState<SimpleState>(() => (initial ? stateFrom(initial) : restored || emptyState()));
  const [step, setStep] = useState<1 | 2 | 3>(initial || restored?.type ? 2 : 1);
  const [imageData, setImageData] = useState('');
  const [keepImage, setKeepImage] = useState(Boolean(initial?.imageUrl));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => kgNowLocal());

  // Черновик новой публикации — в браузере этого посетителя (без фото), чтобы не потерять текст при обновлении страницы
  useEffect(() => {
    if (!storageKey || initial) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      /* хранилище недоступно — форма работает и без черновика */
    }
  }, [s, storageKey, initial]);

  const set = <K extends keyof SimpleState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setS((x) => ({ ...x, [k]: e.target.value }));
    setErr(''); // подсказку об ошибке убираем, как только человек начал исправлять
  };

  // Разделы выбранного типа; у старой публикации её раздел остаётся в списке, даже если сейчас он недоступен
  const cats = useMemo(() => {
    if (!s.type) return [];
    const list = categoriesFor(s.type, publisher);
    return initial && initial.category && !list.includes(initial.category) && typeOf(initial) === s.type ? [initial.category, ...list] : list;
  }, [s.type, plan, govVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseType = (type: PublishType) => {
    const list = categoriesFor(type, publisher);
    setS((x) => ({ ...x, type, category: x.type === type && x.category ? x.category : list.length === 1 ? list[0] : '' }));
    setErr('');
    setStep(2);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try {
      setImageData((await loadPhoto(file)).data);
      setKeepImage(false);
    } catch (ex) {
      setErr(tr((ex as Error).message === 'too_big' ? 'photoTooBig' : 'photoBad'));
    }
  };

  const item = s.type ? buildItem(s, { initial, imageData, keepImage, now }) : null;
  /** Объект для предпросмотра — как публикация будет выглядеть на сайте */
  const previewItem = (): Announcement => {
    const i = item as Record<string, any>;
    const loc = (o: { ru: string; kg?: string; en?: string }) => ({ ru: o.ru, kg: o.kg || o.ru, en: o.en || o.ru });
    return {
      ...(i as unknown as Announcement),
      id: initial?.id || 'preview',
      protocolCode: '#KG-PREVIEW',
      title: loc(i.title),
      description: loc(i.description),
      summary: loc({ ru: i.description.ru.length > 300 ? `${i.description.ru.slice(0, 300)}…` : i.description.ru }),
      location: loc(i.location),
      urgency: s.type === 'alert' ? 'planned' : 'event',
      status: 'scheduled',
      sourceName: author,
      sourceOrgType: 'ОРГ',
      isVerified: false,
      publishedAt: '',
      updatedAt: '',
      imageUrl: imageData || i.imageUrl || undefined,
      eventSourceUrl: i.eventSourceUrl || undefined,
      eventDetails: { ...i.eventDetails, priceText: i.eventDetails.priceText ? loc(i.eventDetails.priceText) : undefined },
      isDemo: false,
    };
  };

  const toPreview = () => {
    const e = validate(s);
    if (e) {
      setErr(tr(e));
      return;
    }
    setErr('');
    setStep(3);
  };

  const submit = async () => {
    const e = validate(s);
    if (e || !item) {
      setErr(tr(e || 'errRequired'));
      setStep(2);
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onSubmit(item);
      if (storageKey && !initial) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ничего */
        }
      }
    } catch (ex) {
      setErr(errorText(ex, lang));
    } finally {
      setBusy(false);
    }
  };

  // ---------- оформление ----------
  const labelCls = 'block text-[13px] font-semibold text-[#0f1b33] mb-1';
  const req = (on: boolean) => (on ? <span className="text-red-600"> *</span> : null);
  const field = (k: keyof SimpleState, label: string, node: React.ReactNode, opts: { required?: boolean; hint?: string; wide?: boolean } = {}) => (
    <div key={k} className={opts.wide ? 'sm:col-span-2' : ''}>
      <label className={labelCls} htmlFor={`sp-${k}`}>
        {label}
        {req(Boolean(opts.required))}
      </label>
      {node}
      {opts.hint && <p className="text-xs text-gray-500 mt-1">{opts.hint}</p>}
    </div>
  );
  const input = (k: keyof SimpleState, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`sp-${k}`} className={inputCls} value={String(s[k])} onChange={set(k)} {...props} />
  );

  const districtList = DISTRICTS[s.city] || [];
  const type = s.type as PublishType;

  const render = (k: keyof SimpleState): React.ReactNode => {
    switch (k) {
      case 'category':
        return field(
          k,
          tr(type === 'alert' ? 'alertKind' : type === 'news' ? 'newsSection' : 'eventKind'),
          <select id="sp-category" className={inputCls} value={s.category} onChange={set('category')}>
            {cats.length !== 1 && <option value="">{tr('choose')}</option>}
            {cats.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>,
          { required: true }
        );
      case 'title':
        return field(k, tr(type === 'event' || type === 'online' ? 'eventTitle' : 'title'), input('title', { maxLength: 200 }), { required: true, wide: true });
      case 'description':
        return field(
          k,
          tr(type === 'news' ? 'newsText' : 'description'),
          <textarea id="sp-description" className={inputCls} rows={5} maxLength={5000} value={s.description} onChange={set('description')} />,
          { required: true, wide: true, hint: tr('descriptionHint') }
        );
      case 'start':
        return field(k, tr(type === 'alert' ? 'alertStart' : 'start'), input('start', { type: 'datetime-local' }), { required: true });
      case 'end':
        return type === 'notice'
          ? field(k, tr('validUntil'), input('end', { type: 'date' }), { hint: tr('validUntilHint') })
          : field(k, tr(type === 'alert' ? 'endIfKnown' : 'end'), input('end', { type: 'datetime-local' }));
      case 'newsDate':
        return field(k, tr('newsDate'), input('newsDate', { type: 'datetime-local' }));
      case 'venue':
        return field(k, tr('venue'), input('venue', { maxLength: 160, placeholder: tr('venuePh') }));
      case 'address':
        return field(k, tr(type === 'alert' ? 'streets' : 'address'), input('address', { maxLength: 300, placeholder: tr(type === 'alert' ? 'streetsPh' : 'addressPh') }), {
          wide: type === 'alert',
        });
      case 'joinUrl':
        return field(k, tr('joinUrl'), input('joinUrl', { type: 'url', placeholder: 'https://' }));
      case 'city':
        return field(
          k,
          tr('region'),
          <select
            id="sp-city"
            className={inputCls}
            value={s.city}
            onChange={(e) => setS((x) => ({ ...x, city: e.target.value as CityId, district: '' }))}
          >
            {CITY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === 'all' ? tr('regionAll') : t(`cities.${c.id}`)}
              </option>
            ))}
          </select>
        );
      case 'locality':
        return field(k, tr('locality'), input('locality', { maxLength: 120 }));
      case 'district':
        return field(
          k,
          tr('district'),
          districtList.length ? (
            <select id="sp-district" className={inputCls} value={s.district} onChange={set('district')}>
              <option value="">—</option>
              {districtList.map((d) => (
                <option key={d.code} value={d.ru}>
                  {d[lang] || d.ru}
                </option>
              ))}
            </select>
          ) : (
            input('district', { maxLength: 120 })
          )
        );
      case 'price':
        return field(k, tr('price'), input('price', { maxLength: 120, placeholder: tr('pricePh') }));
      case 'tickets':
        return field(k, tr('tickets'), input('tickets', { type: 'url', placeholder: 'https://' }));
      case 'organizerUrl':
        return field(k, tr(type === 'notice' ? 'site' : 'organizerSite'), input('organizerUrl', { type: 'url', placeholder: 'https://' }));
      case 'phone':
        return field(k, tr('phone'), input('phone', { type: 'tel', maxLength: 60, placeholder: '+996 …' }));
      case 'sourceUrl':
        return field(k, tr(type === 'alert' ? 'officialSource' : 'source'), input('sourceUrl', { type: 'url', placeholder: 'https://' }));
      default:
        return null;
    }
  };

  const photoBlock = (
    <div className="sm:col-span-2 rounded-2xl border border-dashed border-gray-300 bg-[#f8fafc] p-4 flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-full sm:w-40 aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
        {imageData || (keepImage && initial?.imageUrl) ? (
          <img src={imageData || initial?.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <span className="material-symbols-outlined text-gray-400 text-[32px]" aria-hidden="true">
            image
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-[13px] font-semibold text-[#0f1b33]">{tr('photo')}</div>
        <p className="text-xs text-gray-500">{tr('photoHint')}</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12327A] text-white text-xs font-bold cursor-pointer hover:bg-[#0d2459]">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              upload
            </span>
            {tr('photoUpload')}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
          </label>
          {(imageData || (keepImage && initial?.imageUrl)) && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50"
              onClick={() => {
                setImageData('');
                setKeepImage(false);
              }}
            >
              {tr('photoRemove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const steps: [1 | 2 | 3, PublishKey][] = [
    [1, 'step1'],
    [2, 'step2'],
    [3, 'step3'],
  ];

  return (
    <div className="space-y-5">
      {/* Индикатор шага */}
      <ol className="grid grid-cols-3 gap-2 text-xs font-bold" aria-label={tr('whatTitle')}>
        {steps.map(([n, k]) => (
          <li
            key={n}
            aria-current={step === n ? 'step' : undefined}
            className={`text-center px-2 py-2 rounded-xl ${step === n ? 'bg-[#12327A] text-white' : step > n ? 'bg-[#d0f7f2] text-[#004d44]' : 'bg-gray-100 text-gray-500'}`}
          >
            {tr(k)}
          </li>
        ))}
      </ol>

      {err && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
          {err}
        </div>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h3 className="text-lg font-extrabold text-[#0f1b33]">{tr('whatTitle')}</h3>
          {types.length === 0 ? (
            <p className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm">{tr('noTypes')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => chooseType(ty)}
                  aria-pressed={s.type === ty}
                  className={`text-left p-4 rounded-2xl border-2 transition-colors flex gap-3 items-start ${
                    s.type === ty ? 'border-[#12327A] bg-[#eef2f9]' : 'border-gray-200 bg-white hover:border-[#12327A]/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[28px] text-[#12327A]" aria-hidden="true">
                    {TYPE_ICON[ty]}
                  </span>
                  <span>
                    <span className="block font-extrabold text-[#0f1b33]">{tr(`type_${ty}` as PublishKey)}</span>
                    <span className="block text-xs text-gray-600 mt-0.5">{tr(`type_${ty}_hint` as PublishKey)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm font-bold text-gray-600 hover:underline">
              {tr('cancel')}
            </button>
          )}
        </section>
      )}

      {step === 2 && s.type && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold text-[#0f1b33] flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[#12327A]" aria-hidden="true">
                {TYPE_ICON[type]}
              </span>
              {tr(`type_${type}` as PublishKey)}
            </h3>
            {!initial && (
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-[#12327A] hover:underline">
                {tr('changeType')}
              </button>
            )}
          </div>
          {restored && !initial && <p className="text-xs text-gray-600 bg-[#f3f6fc] rounded-xl px-3 py-2">{tr('photoAgain')}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LAYOUT[type].main.filter((k) => k !== 'category' || cats.length > 1 || !s.category).map(render)}
            {(type === 'notice' || type === 'news') && <p className="sm:col-span-2 text-xs text-gray-500">{tr('postedAuto')}</p>}
            {PHOTO_MAIN.includes(type) && photoBlock}
          </div>

          <details className="rounded-2xl border border-gray-200 p-4 [&_summary]:cursor-pointer group" open={LAYOUT[type].extra.some((k) => Boolean(s[k] && s[k] !== 'all'))}>
            <summary className="text-sm font-bold text-[#12327A]">
              {tr('more')} <span className="font-normal text-gray-500">— {tr('moreHint')}</span>
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {LAYOUT[type].extra.map(render)}
              {!PHOTO_MAIN.includes(type) && photoBlock}
            </div>
          </details>

          <div className="text-xs text-gray-600">
            {tr('author')}: <b className="text-[#0f1b33]">{initial?.eventDetails?.organizer || author}</b> <span className="text-gray-500">({tr('authorHint')})</span>
          </div>
          <p className="text-xs text-gray-500">{tr('required')}</p>

          <div className="flex flex-wrap gap-2 justify-end">
            {initial && onCancel ? (
              <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
                {tr('cancel')}
              </button>
            ) : (
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
                {tr('back')}
              </button>
            )}
            <button type="button" onClick={toPreview} className="px-5 py-2.5 rounded-xl bg-[#12327A] text-white text-sm font-extrabold">
              {tr('toPreview')}
            </button>
          </div>
        </section>
      )}

      {step === 3 && item && (
        <section className="space-y-4">
          <p className="text-sm text-gray-700 bg-[#eef2f9] rounded-xl px-3 py-2">{tr(direct ? 'previewNoteDirect' : 'previewNote')}</p>
          <FormPreview item={previewItem()} lang={lang} />
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
              {tr('editData')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="px-5 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold hover:bg-[#1bb3a2] disabled:opacity-60"
            >
              {busy ? tr('sending') : submitLabel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
