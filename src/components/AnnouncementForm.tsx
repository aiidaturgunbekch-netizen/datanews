import React, { useRef, useState } from 'react';
import { Announcement, AnnouncementStatus, CategoryId, CityId, Language, SourceKind, UrgencyType } from '../types';
import { compressImage, uploadImage } from '../services/api';
import { ORIGINAL_MAX_BYTES } from '../config/site';
import { EventImage } from './EventImage';
import { formatWhen } from '../utils/dates';
import { AccountKey, errorText, ta } from '../locales/account';
import { eventSource, ticketLink } from '../utils/links';
import { getTranslation } from '../locales/translations';
import { DISTRICTS } from '../config/districts';
import { GeoPicker } from './GeoPicker';
import { EVENT_CATEGORIES, placeHint, placeText, TERRITORY_CATEGORIES } from '../utils/place';
import { hasLangText, looksKyrgyz } from '../utils/lang';

export const CATEGORY_OPTIONS: { id: CategoryId; label: string }[] = [
  { id: 'concerts', label: 'Концерты и шоу' },
  { id: 'festivals', label: 'Фестивали' },
  { id: 'fairs', label: 'Ярмарки' },
  { id: 'exhibitions', label: 'Выставки и форумы' },
  { id: 'culture', label: 'Театр и культура' },
  { id: 'sport', label: 'Спорт' },
  { id: 'cinema', label: 'Кино и показы' },
  { id: 'education', label: 'Образование' },
  { id: 'gov', label: 'Гос. оповещения' },
  { id: 'state', label: 'Государство и решения' },
  { id: 'laws', label: 'Законы и правила' },
  { id: 'notices', label: 'Объявления' },
  { id: 'news', label: 'Новости' },
  { id: 'business', label: 'Бизнес-новости' },
  { id: 'tech', label: 'ИИ и IT-технологии' },
  { id: 'hazard', label: 'Погода и опасные явления' },
  { id: 'water', label: 'Отключение воды' },
  { id: 'electricity', label: 'Отключение электричества' },
  { id: 'roads', label: 'Дороги и транспорт' },
  { id: 'repairs', label: 'Ремонтные работы' },
];

export const CITY_OPTIONS: { id: CityId; label: string }[] = [
  { id: 'bishkek', label: 'г. Бишкек' },
  { id: 'osh', label: 'г. Ош' },
  { id: 'chui', label: 'Чуйская область' },
  { id: 'osh_region', label: 'Ошская область' },
  { id: 'issykkul', label: 'Иссык-Кульская область' },
  { id: 'jalalabad', label: 'Джалал-Абадская область' },
  { id: 'talas', label: 'Таласская область' },
  { id: 'naryn', label: 'Нарынская область' },
  { id: 'batken', label: 'Баткенская область' },
  { id: 'all', label: 'Весь Кыргызстан' },
];

const ALERT_CATEGORIES: CategoryId[] = ['water', 'electricity', 'roads', 'repairs'];
/** Тип публикации по разделу: отключения и дороги — предупреждение, остальное — событие / афиша */
const autoUrgency = (c: CategoryId): UrgencyType => (ALERT_CATEGORIES.includes(c) ? 'planned' : 'event');
const URGENCY_LABEL: Record<UrgencyType, string> = {
  event: 'Событие / афиша',
  planned: 'Плановое предупреждение',
  emergency: 'Аварийное / срочное',
  regular: 'Информация',
};
const HINT_KEY = { event: 'fHintEvent', territory: 'fHintTerritory' } as const;

/** Файл как есть (data:URL) — без перекодирования, чтобы сохранить оригинал */
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });

interface Props {
  /** Язык подписей формы (панель администратора — 'ru') */
  lang?: Language;
  initial?: Announcement | null;
  /** admin — видит служебные поля (срочность, бегущая строка, статус, источник) */
  mode: 'admin' | 'user';
  submitLabel: string;
  onSubmit: (item: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  /** Тариф разрешает только эти разделы (например, «Культура и театр») */
  allowedCategories?: CategoryId[];
  /** Подставить в поле «Организация или личность» (из регистрации) */
  defaultOrganizer?: string;
  /** Фото, выбранное редактором заранее (например, из письма редакционной почты), — как загруженное */
  initialImageData?: string;
  /**
   * Панель: обязательны ли тексты и на русском, и на кыргызском (по умолчанию — да).
   * Черновик из письма можно сохранить на одном языке: перевод добавляется до публикации.
   */
  requireBothLangs?: boolean;
  /** Вторая кнопка рядом с основной (например, «Сохранить и одобрить» для черновика в «Модерации») */
  secondarySubmit?: { label: string; onSubmit: (item: Record<string, unknown>) => Promise<void> };
}

/**
 * Фото / афиша автора. Если файл не больше ORIGINAL_MAX_BYTES — оригинал без изменений.
 * Если больше — только техническое уменьшение размера: пропорции и содержимое сохраняются, ничего не обрезается.
 * Ошибки: 'bad' — не изображение JPG/PNG/WEBP, 'too_big' — не удалось уменьшить до допустимого размера.
 */
export const loadPhoto = async (file: File): Promise<{ data: string; resized: boolean }> => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('bad');
  if (file.size <= ORIGINAL_MAX_BYTES) return { data: await readAsDataUrl(file), resized: false };
  let data = await compressImage(file, 2000, 0.9);
  if (data.length > ORIGINAL_MAX_BYTES * 1.37) data = await compressImage(file, 1600, 0.85);
  if (data.length > ORIGINAL_MAX_BYTES * 1.37) data = await compressImage(file, 1280, 0.8);
  if (data.length > ORIGINAL_MAX_BYTES * 1.37) throw new Error('too_big');
  return { data, resized: true };
};

type LangBox = { title: string; text: string; setTitle: (v: string) => void; setText: (v: string) => void };
/**
 * Тексты новости по языкам (панель): у каждого языка свой заголовок и текст. Русская версия сайта показывает только
 * русский, кыргызская — только кыргызский; английский необязателен (без него на английском — русский текст).
 */
const LangTexts: React.FC<{ ru: LangBox; kg: LangBox; en: LangBox; required: boolean; tried: boolean }> = ({ ru, kg, en, required, tried }) => {
  const box = (code: 'RU' | 'KG' | 'EN', name: string, b: LangBox, req: boolean, hint?: string) => {
    const empty = !b.title.trim() || !b.text.trim();
    const bad = tried && req && empty;
    const cls = (v: string) => (bad && !v.trim() ? inputCls.replace('border-gray-200', 'border-red-500 bg-red-50') : inputCls);
    return (
      <div className={`rounded-2xl border p-4 space-y-2 ${bad ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-white'}`} data-lang-box={code}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#12327A] text-white text-[11px] font-extrabold">{code}</span>
          <span className="text-sm font-bold text-[#0f1b33]">
            {name}
            {req ? ' *' : ' (необязательно)'}
          </span>
        </div>
        <input className={cls(b.title)} value={b.title} onChange={(e) => b.setTitle(e.target.value)} maxLength={200} placeholder="Заголовок" aria-label={`Заголовок — ${name}`} />
        <textarea className={cls(b.text)} rows={5} value={b.text} onChange={(e) => b.setText(e.target.value)} maxLength={5000} placeholder="Текст новости" aria-label={`Текст — ${name}`} />
        {bad && <p className="text-xs font-semibold text-red-700">Заполните заголовок и текст на этом языке</p>}
        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {box('RU', 'На русском', ru, required)}
      {box('KG', 'На кыргызском', kg, required)}
      {box('EN', 'На английском', en, false, 'Без английского текста английская версия сайта покажет русский.')}
      {!required && (
        <p className="text-[11px] text-gray-500">
          Черновик можно сохранить на одном языке. Пока нет текста на русском или кыргызском, в этой версии сайта новость не показывается.
        </p>
      )}
    </div>
  );
};

/** Поле ссылки: рядом — «Открыть», чтобы проверить источник одним нажатием (в новой вкладке) */
const UrlInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const ok = /^https?:\/\/[^\s]+\.[^\s]+$/.test(value.trim());
  return (
    <div className="flex gap-2">
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {ok && (
        <a
          href={value.trim()}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть ссылку в новой вкладке"
          className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl border border-[#12327A]/30 text-[#12327A] text-xs font-bold hover:bg-[#eef2f9]"
          data-open-url
        >
          Открыть
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            open_in_new
          </span>
        </a>
      )}
    </div>
  );
};

export const inputCls =
  'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-[#0f1b33] focus:outline-none focus:ring-2 focus:ring-[#12327A]/30 focus:border-[#12327A]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1';

export const AnnouncementForm: React.FC<Props> = ({ lang = 'ru', initial, mode, submitLabel, onSubmit, onCancel, allowedCategories, defaultOrganizer, initialImageData, requireBothLangs = true, secondarySubmit }) => {
  // какой кнопкой отправлена форма: основной или «Сохранить и одобрить»
  const via = useRef<'main' | 'secondary'>('main');
  const tr = (k: AccountKey) => ta(k, lang);
  const { t } = getTranslation(lang);
  // Тексты по языкам — только «свои»: копия другого языка (или кыргызский текст в русском поле) в поле не попадает
  const hasRu = initial ? hasLangText(initial, 'ru') : false;
  const hasKg = initial ? hasLangText(initial, 'kg') : false;
  const hasEn = initial ? hasLangText(initial, 'en') : false;
  const [titleRu, setTitleRu] = useState(initial && (hasRu || mode !== 'admin') ? initial.title.ru : '');
  const [titleKg, setTitleKg] = useState(initial && hasKg ? initial.title.kg : '');
  const [titleEn, setTitleEn] = useState(initial && hasEn ? initial.title.en : '');
  const [summary, setSummary] = useState(initial && (hasRu || mode !== 'admin') ? initial.summary.ru : '');
  const [description, setDescription] = useState(initial && (hasRu || mode !== 'admin') ? initial.description.ru : '');
  const [descriptionKg, setDescriptionKg] = useState(initial && hasKg ? initial.description.kg : '');
  const [descriptionEn, setDescriptionEn] = useState(initial && hasEn ? initial.description.en : '');
  const [category, setCategory] = useState<CategoryId>(initial?.category || allowedCategories?.[0] || 'concerts');
  // Область не известна — «Весь Кыргызстан» (без привязки), а не выдуманный город
  const [city, setCity] = useState<CityId>(initial?.city || 'all');
  const [location, setLocation] = useState(initial?.location.ru || '');
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '');
  const [price, setPrice] = useState(initial?.eventDetails?.priceText?.ru || '');
  const [venue, setVenue] = useState(initial?.eventDetails?.venue || '');
  const [organizer, setOrganizer] = useState(initial?.eventDetails?.organizer || defaultOrganizer || '');
  const [contactPhone, setContactPhone] = useState(initial?.eventDetails?.contactPhone || '');
  const [ticketUrl, setTicketUrl] = useState(initial ? ticketLink(initial).url : '');
  const [ticketVerified, setTicketVerified] = useState(Boolean(initial?.ticketUrlVerified));
  // «Подтверждено» ставит только редактор явной отметкой; сохранение формы само по себе ничего не подтверждает
  const [verified, setVerified] = useState(Boolean(initial?.isVerified));
  const [organizerUrl, setOrganizerUrl] = useState(initial?.organizerUrl || '');
  const [artistUrl, setArtistUrl] = useState(initial?.artistUrl || '');
  const [venueUrl, setVenueUrl] = useState(initial?.venueUrl || '');
  const [timeRange, setTimeRange] = useState(initial?.eventDetails?.timeRange || '');
  const [sourceUrl, setSourceUrl] = useState(initial ? eventSource(initial) : '');
  const [sourceName, setSourceName] = useState(initial?.sourceName || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [imageData, setImageData] = useState(initialImageData || '');
  const [imageCredit, setImageCredit] = useState(initial?.imageCredit || '');
  const [imageSourceUrl, setImageSourceUrl] = useState(initial?.imageSourceUrl || '');
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt || '');
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>(initial?.imageFit || 'contain');
  const [timeTBA, setTimeTBA] = useState(Boolean(initial?.timeTBA));
  const [allDay, setAllDay] = useState(Boolean(initial?.allDay));
  const [geo, setGeo] = useState<NonNullable<Announcement['geo']> | null>(initial?.geo || null);
  // служебные поля администратора
  // Тип выбирается сам по разделу; вручную — только если нужно иначе (например, «Аварийное / срочное»).
  // У существующей публикации, где тип уже отличается от раздела, он сохраняется как есть.
  const [urgencyManual, setUrgencyManual] = useState<UrgencyType | null>(
    initial?.urgency && initial.urgency !== autoUrgency(initial.category) ? initial.urgency : null
  );
  const urgency: UrgencyType = urgencyManual || autoUrgency(category);
  const [status, setStatus] = useState<AnnouncementStatus>(initial?.status || 'scheduled');
  const [isTicker, setIsTicker] = useState(Boolean(initial?.isUrgentTicker));
  const [locality, setLocality] = useState(initial?.locality || '');
  const [district, setDistrict] = useState(initial?.district || '');
  // Район выбирается из списка области; старое или нестандартное значение — вводится вручную
  const [districtManual, setDistrictManual] = useState(
    () => Boolean(initial?.district) && !(DISTRICTS[initial!.city] || []).some((d) => d.ru === initial!.district)
  );
  const districtList = DISTRICTS[city] || [];
  const [dangerLevel, setDangerLevel] = useState<'' | 'high' | 'warning' | 'info'>(initial?.dangerLevel || '');
  const [newsKind, setNewsKind] = useState<string>(initial?.newsKind || '');
  const [legal, setLegal] = useState<Record<string, string>>({
    docTitle: initial?.legal?.docTitle?.ru || '',
    adoptedAt: initial?.legal?.adoptedAt || '',
    officialPublishedAt: initial?.legal?.officialPublishedAt || '',
    effectiveFrom: initial?.legal?.effectiveFrom || '',
    whatChanged: initial?.legal?.whatChanged?.ru || '',
    whoAffected: initial?.legal?.whoAffected?.ru || '',
    whatToDo: initial?.legal?.whatToDo?.ru || '',
    transitional: initial?.legal?.transitional?.ru || '',
    docUrl: initial?.legal?.docUrl || '',
  });
  const setL = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLegal({ ...legal, [k]: e.target.value });
  const [sourceKind, setSourceKind] = useState<SourceKind | ''>(initial?.sourceKind || '');
  const [additionalSourceUrl, setAdditionalSourceUrl] = useState(initial?.additionalSourceUrl || '');
  const [authorityUrl, setAuthorityUrl] = useState(initial?.authorityUrl || '');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [imageNote, setImageNote] = useState('');
  const [langTried, setLangTried] = useState(false);
  // Галерея — дополнительные фото под главным (только редакция); фото загружаются на сервер сразу, в форме — ссылки
  const [gallery, setGallery] = useState<string[]>(initial?.gallery || []);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const addGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])].slice(0, Math.max(0, 8 - gallery.length));
    e.target.value = '';
    if (!files.length) return;
    setGalleryBusy(true);
    setErr('');
    try {
      const urls: string[] = [];
      for (const f of files) {
        let data = await compressImage(f, 1600, 0.85);
        if (data.length > 900_000) data = await compressImage(f, 1280, 0.78);
        urls.push(await uploadImage(data));
      }
      setGallery((g) => [...g, ...urls].slice(0, 8));
    } catch (ex) {
      setErr((ex as Error).message || tr('fPhotoBad'));
    } finally {
      setGalleryBusy(false);
    }
  };
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Фото / афиша автора. Если файл не больше ORIGINAL_MAX_BYTES — сохраняется оригинал без изменений.
   * Если больше — только техническое уменьшение размера: пропорции и всё содержимое сохраняются,
   * ничего не обрезается и не дорисовывается.
   */
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try {
      const r = await loadPhoto(file);
      setImageNote(tr(r.resized ? 'fPhotoResized' : 'fPhotoOriginal'));
      setImageData(r.data);
      setImageUrl('');
    } catch (ex) {
      setErr(tr((ex as Error).message === 'too_big' ? 'fPhotoTooBig' : 'fPhotoBad'));
    }
  };

  /** Объект публикации из полей формы — тот же, что увидят читатели (для предпросмотра) */
  const draft = (): Announcement => ({
    id: initial?.id || 'preview',
    protocolCode: initial?.protocolCode || '#KG-PREVIEW',
    title: { ru: titleRu.trim(), kg: titleKg.trim() || titleRu.trim(), en: titleEn.trim() || titleRu.trim() },
    summary: { ru: summaryText(), kg: descriptionKg.trim() ? autoSummary(descriptionKg) : summaryText(), en: descriptionEn.trim() ? autoSummary(descriptionEn) : summaryText() },
    description: { ru: description.trim(), kg: descriptionKg.trim() || description.trim(), en: descriptionEn.trim() || description.trim() },
    category,
    city,
    location: { ru: location.trim(), kg: location.trim(), en: location.trim() },
    startDate,
    endDate,
    timeTBA,
    allDay,
    geo: geo || undefined,
    urgency: mode === 'admin' ? urgency : ALERT_CATEGORIES.includes(category) ? 'planned' : 'event',
    status: 'scheduled',
    isUrgentTicker: false,
    sourceName: sourceName.trim() || organizer.trim(),
    sourceOrgType: 'ОРГ',
    isVerified: false,
    publishedAt: '',
    updatedAt: '',
    eventSourceUrl: sourceUrl.trim() || undefined,
    ticketUrl: ticketUrl.trim() || undefined,
    imageUrl: imageData || imageUrl.trim() || undefined,
    imageAlt: imageAlt.trim() || titleRu.trim(),
    imageCredit: imageCredit.trim() || undefined,
    gallery: mode === 'admin' ? gallery : initial?.gallery,
    imageFit: mode === 'admin' ? imageFit : 'contain',
    eventDetails: {
      priceText: price.trim() ? { ru: price.trim(), kg: price.trim(), en: price.trim() } : undefined,
      contactPhone: contactPhone.trim() || undefined,
      venue: venue.trim() || undefined,
    },
    isDemo: false,
  });

  /** Краткое описание: первые предложения текста (для русского — поле «Краткое описание», если заполнено) */
  const autoSummary = (text: string) => {
    const d = text.trim();
    if (d.length <= 300) return d;
    const cut = d.slice(0, 300);
    return `${cut.slice(0, Math.max(cut.lastIndexOf('. ') + 1, cut.lastIndexOf(' ')))}…`;
  };
  const summaryText = () => (summary.trim() ? summary.trim() : autoSummary(description));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    // Адрес не обязателен ни для одного типа публикаций — вместо запрета подсказка у поля
    if (mode === 'admin') {
      // Панель: русский и кыргызский тексты отдельно; черновик из письма — достаточно одного языка
      const ruOk = Boolean(titleRu.trim() && description.trim());
      const kgOk = Boolean(titleKg.trim() && descriptionKg.trim());
      const missing = [!ruOk && 'на русском (заголовок и текст)', !kgOk && 'на кыргызском (заголовок и текст)'].filter(Boolean);
      if (!startDate || (requireBothLangs ? missing.length : !ruOk && !kgOk)) {
        setLangTried(true);
        setErr(
          !startDate
            ? tr('fRequired')
            : `Не сохранено — заполните ${requireBothLangs ? missing.join(' и ') : 'текст хотя бы на одном языке'}. Русская и кыргызская версии сайта показывают только свой язык.`
        );
        return;
      }
      if (ruOk && looksKyrgyz(`${titleRu}\n${description}`)) {
        setLangTried(true);
        setErr('В поле «на русском» текст на кыргызском. Перенесите его в поля «на кыргызском», а в русские поля вставьте русский текст.');
        return;
      }
    } else if (!titleRu.trim() || !description.trim() || !startDate) {
      setErr(tr('fRequired'));
      return;
    }
    if (endDate && endDate < startDate) {
      setErr(tr('fEndBeforeStart'));
      return;
    }
    const item: Record<string, unknown> = {
      id: initial?.id,
      protocolCode: initial?.protocolCode,
      // Языки отдельно: пустой язык сервер дополнит копией, но сайт копию за перевод не считает
      title: { ru: titleRu.trim() || titleKg.trim(), kg: titleKg.trim(), en: titleEn.trim() },
      summary: {
        ru: description.trim() ? summaryText() : autoSummary(descriptionKg),
        kg: descriptionKg.trim() ? autoSummary(descriptionKg) : '',
        en: descriptionEn.trim() ? autoSummary(descriptionEn) : '',
      },
      description: { ru: description.trim() || descriptionKg.trim(), kg: descriptionKg.trim(), en: descriptionEn.trim() },
      category,
      city,
      location: { ru: location.trim() },
      locality: locality.trim(),
      district: district.trim(),
      dangerLevel: mode === 'admin' && dangerLevel ? dangerLevel : undefined,
      newsKind: mode === 'admin' && newsKind ? newsKind : undefined,
      legal:
        mode === 'admin'
          ? {
              docTitle: legal.docTitle.trim() ? { ru: legal.docTitle.trim() } : undefined,
              adoptedAt: legal.adoptedAt || undefined,
              officialPublishedAt: legal.officialPublishedAt || undefined,
              effectiveFrom: legal.effectiveFrom || undefined,
              whatChanged: legal.whatChanged.trim() ? { ru: legal.whatChanged.trim() } : undefined,
              whoAffected: legal.whoAffected.trim() ? { ru: legal.whoAffected.trim() } : undefined,
              whatToDo: legal.whatToDo.trim() ? { ru: legal.whatToDo.trim() } : undefined,
              transitional: legal.transitional.trim() ? { ru: legal.transitional.trim() } : undefined,
              docUrl: legal.docUrl.trim() || undefined,
            }
          : undefined,
      startDate,
      endDate,
      timeTBA,
      allDay,
      // точку ставит только редактор; null — убрать
      geo: mode === 'admin' ? geo : undefined,
      urgency: mode === 'admin' ? urgency : ALERT_CATEGORIES.includes(category) ? 'planned' : 'event',
      status: mode === 'admin' ? status : 'scheduled',
      isUrgentTicker: mode === 'admin' ? isTicker : false,
      isVerified: mode === 'admin' ? verified : false,
      sourceName: sourceName.trim() || organizer.trim(),
      eventSourceUrl: sourceUrl.trim(),
      sourceKind: mode === 'admin' && sourceKind ? sourceKind : undefined,
      additionalSourceUrl: mode === 'admin' ? additionalSourceUrl.trim() : undefined,
      authorityUrl: mode === 'admin' ? authorityUrl.trim() : undefined,
      ticketUrl: ticketUrl.trim(),
      ticketUrlVerified: mode === 'admin' ? ticketVerified && Boolean(ticketUrl.trim()) : false,
      organizerUrl: organizerUrl.trim(),
      artistUrl: artistUrl.trim(),
      venueUrl: venueUrl.trim(),
      imageSourceUrl: imageSourceUrl.trim(),
      imageAlt: imageAlt.trim(),
      imageFit: mode === 'admin' ? imageFit : 'contain',
      imageUrl: imageData ? '' : imageUrl.trim(),
      imageData: imageData || undefined,
      imageCredit: imageCredit.trim(),
      ...(mode === 'admin' ? { gallery } : {}),
      eventDetails: {
        priceText: price.trim() ? { ru: price.trim() } : undefined,
        venue: venue.trim(),
        organizer: organizer.trim(),
        contactPhone: contactPhone.trim(),
        timeRange: timeRange.trim(),
      },
    };
    setBusy(true);
    try {
      await (via.current === 'secondary' && secondarySubmit ? secondarySubmit.onSubmit : onSubmit)(item);
    } catch (ex) {
      setErr(errorText(ex, lang));
    } finally {
      setBusy(false);
    }
  };

  const preview = imageData || imageUrl;
  const isAdmin = mode === 'admin';
  const hint = placeHint({ category, location, venue, locality, district });

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div>
      <label className={labelCls}>{label}</label>
      {node}
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );

  const extras = (
    <>
      {field(tr('fSummaryOpt'), <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} />)}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field(tr('fTitleKg'), <input className={inputCls} value={titleKg} onChange={(e) => setTitleKg(e.target.value)} maxLength={200} />)}
          {field(tr('fTitleEn'), <input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={200} />)}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field(tr('fPrice'), <input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={tr('fPricePh')} />)}
        {field(tr('fTime'), <input className={inputCls} value={timeRange} onChange={(e) => setTimeRange(e.target.value)} placeholder="19:00 • 12+" />)}
        {field(tr('fVenue'), <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(tr('fTickets'), <UrlInput value={ticketUrl} onChange={setTicketUrl} placeholder="https://" />, tr('fTicketsHint'))}
        {field(tr('fOrganizerUrl'), <UrlInput value={organizerUrl} onChange={setOrganizerUrl} placeholder="https://" />)}
        {field(tr('fArtistUrl'), <UrlInput value={artistUrl} onChange={setArtistUrl} placeholder="https://" />)}
        {field(tr('fVenueUrl'), <UrlInput value={venueUrl} onChange={setVenueUrl} placeholder="https://" />)}
      </div>
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isAdmin && <p className="text-xs text-gray-600 bg-[#f8fafc] rounded-xl p-3">{tr('fTemplateNote')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          tr('fCategory'),
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORY_OPTIONS.filter((c) => !allowedCategories || allowedCategories.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {t(`categories.${c.id}`)}
              </option>
            ))}
          </select>
        )}
        {field(
          tr('fCity'),
          <select
            className={inputCls}
            value={city}
            onChange={(e) => {
              setCity(e.target.value as CityId);
              if (!districtManual) setDistrict('');
            }}
          >
            {CITY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === 'all' ? tr('fCityAll') : t(`cities.${c.id}`)}
              </option>
            ))}
          </select>
        )}
      </div>
      {isAdmin ? (
        <LangTexts
          ru={{ title: titleRu, text: description, setTitle: setTitleRu, setText: setDescription }}
          kg={{ title: titleKg, text: descriptionKg, setTitle: setTitleKg, setText: setDescriptionKg }}
          en={{ title: titleEn, text: descriptionEn, setTitle: setTitleEn, setText: setDescriptionEn }}
          required={requireBothLangs}
          tried={langTried}
        />
      ) : (
        field(tr('fTitleRu'), <input className={inputCls} value={titleRu} onChange={(e) => setTitleRu(e.target.value)} maxLength={200} required />)
      )}
      {field(
        tr('fOrganizer'),
        <input className={inputCls} value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder={tr('fOrganizerPh')} maxLength={160} required={!isAdmin} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Дата и время — отдельными полями: дата обязательна, время нет (без времени — «весь день») */}
        {field(
          tr('fStart'),
          <div className="flex gap-2">
            <input
              type="date"
              className={inputCls}
              value={startDate.slice(0, 10)}
              required
              data-start-date
              onChange={(e) => {
                const d = e.target.value;
                if (!d) return setStartDate('');
                const t = startDate.slice(11, 16);
                setStartDate(`${d}T${t || '00:00'}`);
                if (!t && !timeTBA) setAllDay(true);
              }}
            />
            <input
              type="time"
              className={`${inputCls} max-w-[9rem]`}
              value={allDay || timeTBA ? '' : startDate.slice(11, 16)}
              disabled={!startDate}
              data-start-time
              aria-label={lang === 'kg' ? 'Убактысы' : lang === 'en' ? 'Time' : 'Время'}
              onChange={(e) => {
                const t = e.target.value;
                const d = startDate.slice(0, 10);
                if (!d) return;
                if (t) {
                  setStartDate(`${d}T${t}`);
                  setAllDay(false);
                  setTimeTBA(false);
                } else {
                  setStartDate(`${d}T00:00`);
                  if (!timeTBA) setAllDay(true);
                }
              }}
            />
          </div>,
          startDate && (allDay || timeTBA)
            ? lang === 'kg'
              ? 'Убакыт көрсөтүлгөн жок — сайтта «күнү бою» же «убакыт такталат»'
              : lang === 'en'
              ? 'No time — shown as “all day” or “time TBA”'
              : 'Время не указано — на сайте «весь день» или «время уточняется»'
            : undefined
        )}
        {field(
          tr('fEndOpt'),
          <div className="flex gap-2">
            <input
              type="date"
              className={inputCls}
              value={endDate.slice(0, 10)}
              onChange={(e) => {
                const d = e.target.value;
                setEndDate(d ? `${d}T${endDate.slice(11, 16) || '23:59'}` : '');
              }}
            />
            <input
              type="time"
              className={`${inputCls} max-w-[9rem]`}
              value={endDate && endDate.slice(11, 16) !== '23:59' ? endDate.slice(11, 16) : ''}
              disabled={!endDate}
              aria-label={lang === 'kg' ? 'Аяктоо убактысы' : lang === 'en' ? 'End time' : 'Время окончания'}
              onChange={(e) => setEndDate(`${endDate.slice(0, 10)}T${e.target.value || '23:59'}`)}
            />
          </div>,
          tr('fEndHint')
        )}
        <div className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={timeTBA} onChange={(e) => setTimeTBA(e.target.checked)} />
            {tr('fTimeTBA')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            {tr('fAllDay')}
          </label>
        </div>
      </div>
      {field(
        tr('fLocation'),
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={tr('fLocationPh')} maxLength={300} />
      )}
      {hint && <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{tr(HINT_KEY[hint])}</p>}
      {city === 'all' && (hint || TERRITORY_CATEGORIES.includes(category) || EVENT_CATEGORIES.includes(category)) && (
        <p className="text-xs text-gray-700 bg-[#f3f6fc] rounded-xl px-3 py-2">{tr('fHintNoRegion')}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(tr('fLocality'), <input className={inputCls} value={locality} onChange={(e) => setLocality(e.target.value)} maxLength={120} placeholder={tr('fLocalityPh')} />)}
        {field(
          tr('fDistrict'),
          districtList.length && !districtManual ? (
            <select
              className={inputCls}
              value={districtList.some((d) => d.ru === district) ? district : ''}
              onChange={(e) => {
                if (e.target.value === '__other') {
                  setDistrictManual(true);
                  setDistrict('');
                } else setDistrict(e.target.value);
              }}
            >
              <option value="">{tr('fDistrictNone')}</option>
              {districtList.map((d) => (
                <option key={d.code} value={d.ru}>
                  {d[lang] || d.ru}
                </option>
              ))}
              <option value="__other">{tr('fDistrictOther')}</option>
            </select>
          ) : (
            <input className={inputCls} value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={120} placeholder={tr('fDistrictPh')} />
          )
        )}
      </div>
      {mode === 'admin' && (
        <GeoPicker
          value={geo}
          onChange={setGeo}
          defaultQuery={[location, locality].map((x) => x.trim()).filter(Boolean).join(', ')}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}
      {!isAdmin && field(tr('fDescriptionReq'), <textarea className={inputCls} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} required />)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(tr('fPhone'), <input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+996 ..." />)}
        {field(tr('fSource'), <UrlInput value={sourceUrl} onChange={setSourceUrl} placeholder="https://" />)}
      </div>

      {/* Оригинальное фото / афиша автора */}
      <div className="p-4 rounded-2xl border border-dashed border-gray-300 bg-[#f8fafc]">
        <label className={labelCls}>{tr('fPhoto')}</label>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-48 aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
            {preview ? (
              <img src={preview} alt="" className={`w-full h-full ${isAdmin && imageFit === 'cover' ? 'object-cover' : 'object-contain'}`} referrerPolicy="no-referrer" />
            ) : (
              <span className="material-symbols-outlined text-gray-500 text-[36px]">image</span>
            )}
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12327A] text-white text-xs font-bold cursor-pointer hover:bg-[#0d2459]">
              <span className="material-symbols-outlined text-[16px]">upload</span>
              {tr('fUpload')}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
            </label>
            <p className="text-[11px] text-gray-500">{tr('fPhotoRules')}</p>
            {imageNote && imageData && <p className="text-[11px] font-bold text-emerald-700">{imageNote}</p>}
            {isAdmin && (
              <input
                className={inputCls}
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageData('');
                }}
                placeholder={tr('fImageUrl')}
              />
            )}
            <input className={inputCls} value={imageCredit} onChange={(e) => setImageCredit(e.target.value)} placeholder={tr('fImageCredit')} />
            {isAdmin && (
              <UrlInput value={imageSourceUrl} onChange={setImageSourceUrl} placeholder={tr('fImageSource')} />
            )}
            <input className={inputCls} value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder={tr('fImageAlt')} />
            {isAdmin && (
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={imageFit === 'cover'} onChange={(e) => setImageFit(e.target.checked ? 'cover' : 'contain')} />
                {tr('fImageCover')}
              </label>
            )}
            {preview && (
              <button
                type="button"
                className="text-xs font-bold text-red-600 hover:underline"
                onClick={() => {
                  setImageData('');
                  setImageUrl('');
                  setImageNote('');
                }}
              >
                {tr('fRemovePhoto')}
              </button>
            )}
          </div>
        </div>
        {/* Дополнительные фото — галерея под главным фото на странице новости (только редакция) */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2" data-gallery-editor>
            <label className={labelCls}>Дополнительные фото (галерея под главным) · {gallery.length} из 8</label>
            {gallery.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {gallery.map((u, i) => (
                  <li key={u} className="relative">
                    <img src={u} alt="" className="w-28 h-20 object-cover rounded-lg border border-gray-200 bg-white" />
                    <button
                      type="button"
                      onClick={() => setGallery((g) => g.filter((x) => x !== u))}
                      aria-label={`Убрать фото ${i + 1}`}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-300 text-red-600 text-xs font-bold shadow"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {gallery.length < 8 && (
              <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#12327A] text-[#12327A] text-xs font-bold cursor-pointer hover:bg-[#eef2f9] ${galleryBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                {galleryBusy ? 'Загрузка…' : 'Добавить фото'}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addGallery} />
              </label>
            )}
          </div>
        )}
      </div>

      {isAdmin ? (
        extras
      ) : (
        <details className="rounded-2xl border border-gray-200 p-4 [&_summary]:cursor-pointer">
          <summary className="text-sm font-bold text-[#12327A]">{tr('fMore')}</summary>
          <div className="space-y-4 mt-4">{extras}</div>
        </details>
      )}

      {isAdmin && (
        <div className="p-4 rounded-2xl bg-[#eef2f9] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Тип</label>
            <select
              className={inputCls}
              value={urgencyManual || 'auto'}
              onChange={(e) => setUrgencyManual(e.target.value === 'auto' ? null : (e.target.value as UrgencyType))}
              data-urgency-select
            >
              <option value="auto">По разделу: {URGENCY_LABEL[autoUrgency(category)]}</option>
              {(['emergency', 'planned', 'event', 'regular'] as UrgencyType[])
                .filter((u) => u !== autoUrgency(category))
                .map((u) => (
                  <option key={u} value={u}>
                    Вручную: {URGENCY_LABEL[u]}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">Выбирается сам по разделу. Меняйте, только если нужно иначе — например, «Аварийное / срочное».</p>
          </div>
          <div>
            <label className={labelCls}>Статус</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}>
              <option value="scheduled">Запланировано</option>
              <option value="active">Идёт сейчас</option>
              <option value="rescheduled">Перенесено</option>
              <option value="cancelled">Отменено</option>
              <option value="completed">Завершено</option>
              <option value="archived">Архив</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Источник (название)</label>
            <input className={inputCls} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Мэрия г. Бишкек" />
          </div>
          <div>
            <label className={labelCls}>Чем является ссылка на источник</label>
            <select className={inputCls} value={sourceKind} onChange={(e) => setSourceKind(e.target.value as SourceKind | '')}>
              <option value="">Определить автоматически (*.gov.kg — официальный)</option>
              <option value="official">Официальный источник (мэрия, госорган, служба, GovTicket)</option>
              <option value="organizer">Организатор / площадка</option>
              <option value="ticket">Билетный сервис</option>
              <option value="media">СМИ (официального сообщения нет)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Дополнительный источник (СМИ)</label>
            <UrlInput value={additionalSourceUrl} onChange={setAdditionalSourceUrl} placeholder="https://" />
          </div>
          <div>
            <label className={labelCls}>Официальный сайт ведомства</label>
            <UrlInput value={authorityUrl} onChange={setAuthorityUrl} placeholder="https://bishkek.gov.kg" />
          </div>
          <div>
            <label className={labelCls}>Официальный уровень опасности</label>
            <select className={inputCls} value={dangerLevel} onChange={(e) => setDangerLevel(e.target.value as typeof dangerLevel)}>
              <option value="">Не указан (для отключений — по близости даты)</option>
              <option value="high">Высокая / непосредственная (красный)</option>
              <option value="warning">Потенциальная — предупреждение (жёлтый)</option>
              <option value="info">Информация без опасности (нейтральный)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Тип госсообщения</label>
            <select className={inputCls} value={newsKind} onChange={(e) => setNewsKind(e.target.value)}>
              <option value="">—</option>
              <option value="decision">Принятое решение</option>
              <option value="statement">Заявление (не решение)</option>
              <option value="instruction">Поручение / обещание</option>
              <option value="meeting">Встреча / визит</option>
              <option value="session">Заседание</option>
              <option value="law">Закон / нормативный акт</option>
              <option value="program">Государственная программа</option>
            </select>
          </div>
          <details className="sm:col-span-2 rounded-xl bg-white p-3" open={Boolean(initial?.legal)}>
            <summary className="cursor-pointer text-sm font-bold text-[#12327A]">Закон / решение: даты и пояснения</summary>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <input className={`${inputCls} sm:col-span-3`} placeholder="Название и номер документа" value={legal.docTitle} onChange={setL('docTitle')} />
              <label className="text-xs text-gray-600">Принят / подписан<input type="date" className={inputCls} value={legal.adoptedAt} onChange={setL('adoptedAt')} /></label>
              <label className="text-xs text-gray-600">Официально опубликован<input type="date" className={inputCls} value={legal.officialPublishedAt} onChange={setL('officialPublishedAt')} /></label>
              <label className="text-xs text-gray-600">Вступает в силу<input type="date" className={inputCls} value={legal.effectiveFrom} onChange={setL('effectiveFrom')} /></label>
              <textarea className={`${inputCls} sm:col-span-3`} rows={2} placeholder="Что изменилось" value={legal.whatChanged} onChange={setL('whatChanged')} />
              <textarea className={`${inputCls} sm:col-span-3`} rows={2} placeholder="Кого касается" value={legal.whoAffected} onChange={setL('whoAffected')} />
              <textarea className={`${inputCls} sm:col-span-3`} rows={2} placeholder="Что делать на практике" value={legal.whatToDo} onChange={setL('whatToDo')} />
              <textarea className={`${inputCls} sm:col-span-3`} rows={2} placeholder="Переходный период и исключения (если указаны в документе)" value={legal.transitional} onChange={setL('transitional')} />
              <input className={`${inputCls} sm:col-span-3`} placeholder="Ссылка на официальный текст (cbd.minjust.gov.kg и т. п.)" value={legal.docUrl} onChange={setL('docUrl')} />
            </div>
          </details>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#0f1b33] mt-5">
            <input type="checkbox" checked={isTicker} onChange={(e) => setIsTicker(e.target.checked)} />
            Показать в бегущей строке «Срочно»
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-[#0f1b33] sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <span>
              Подтверждено по первоисточнику — дата, место и статус сверены с официальным сайтом, организатором или билетной системой.
              <span className="block text-xs font-normal text-gray-500">
                Без отметки на сайте показывается «Требует проверки». Сохранение формы и кнопка «Проверено сегодня» эту отметку не ставят.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#0f1b33] sm:col-span-2">
            <input type="checkbox" checked={ticketVerified} onChange={(e) => setTicketVerified(e.target.checked)} />
            Ссылка на билеты проверена (ведёт на страницу этого события) — показывать кнопку «Купить билет». Приоритет: GovTicket → сайт организатора → частный сервис
          </label>
        </div>
      )}

      {showPreview && <FormPreview item={draft()} lang={lang} />}

      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

      <div className="flex flex-wrap gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
            {tr('fCancel')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="px-4 py-2.5 rounded-xl bg-[#eef2f9] text-[#12327A] text-sm font-bold inline-flex items-center gap-1"
          aria-expanded={showPreview}
        >
          <span className="material-symbols-outlined text-[18px]">{showPreview ? 'visibility_off' : 'visibility'}</span>
          {showPreview ? tr('fHidePreview') : tr('fPreview')}
        </button>
        <button
          type="submit"
          disabled={busy}
          onClick={() => (via.current = 'main')}
          className={`px-5 py-2.5 rounded-xl text-sm font-extrabold disabled:opacity-60 ${
            secondarySubmit ? 'bg-[#eef2f9] text-[#12327A] hover:bg-[#e2e9f6]' : 'bg-[#20C7B5] text-[#002f29] hover:bg-[#1bb3a2]'
          }`}
        >
          {busy ? tr('fSaving') : submitLabel}
        </button>
        {secondarySubmit && (
          <button
            type="submit"
            disabled={busy}
            onClick={() => (via.current = 'secondary')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1"
            data-save-approve
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              check
            </span>
            {busy ? tr('fSaving') : secondarySubmit.label}
          </button>
        )}
      </div>
    </form>
  );
};

/** Предпросмотр: публикация в фирменном шаблоне DataNews — так её увидят читатели */
export const FormPreview: React.FC<{ item: Announcement; lang: Language }> = ({ item, lang }) => {
  const { t } = getTranslation(lang);
  const tr = (k: AccountKey) => ta(k, lang);
  const valid = item.title.ru && item.startDate;
  return (
    <div className="rounded-2xl border-2 border-[#20C7B5]/50 p-3 bg-[#f5f7fb]">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#0f766e] mb-2">{tr('fPreviewTitle')}</div>
      {!valid ? (
        <p className="text-xs text-gray-500">{tr('fPreviewEmpty')}</p>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 max-w-md">
          <EventImage item={item} className="w-full aspect-[16/9]" />
          <div className="p-4 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded-full bg-[#d0f7f2] text-[#004d44] text-[11px] font-bold">{t(`categories.${item.category}`)}</span>
            <h3 className="font-extrabold text-[#0f1b33] leading-snug">{item.title[lang] || item.title.ru}</h3>
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#12327A]">calendar_month</span>
              {formatWhen(item.startDate, item.endDate, lang, true, item.timeTBA, item.allDay)}
            </div>
            {placeText(item) && (
              <div className="text-xs text-gray-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#12327A]">location_on</span>
                {t(`cities.${item.city}`)} • {placeText(item)}
              </div>
            )}
            {item.summary.ru && <p className="text-sm text-gray-700">{item.summary.ru}</p>}
            {item.eventDetails?.contactPhone && <div className="text-xs text-gray-600">☎ {item.eventDetails.contactPhone}</div>}
            {item.eventSourceUrl && <div className="text-xs text-[#12327A] font-semibold break-all">🔗 {item.eventSourceUrl}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
