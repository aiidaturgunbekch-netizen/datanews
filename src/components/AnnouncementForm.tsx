import React, { useState } from 'react';
import { Announcement, AnnouncementStatus, CategoryId, CityId, Language, UrgencyType } from '../types';
import { compressImage } from '../services/api';
import { MAX_IMAGE_BYTES } from '../config/site';
import { AccountKey, errorText, ta } from '../locales/account';
import { eventSource, ticketLink } from '../utils/links';
import { getTranslation } from '../locales/translations';

export const CATEGORY_OPTIONS: { id: CategoryId; label: string }[] = [
  { id: 'concerts', label: 'Концерты и шоу' },
  { id: 'festivals', label: 'Фестивали' },
  { id: 'fairs', label: 'Ярмарки и выставки' },
  { id: 'cinema', label: 'Кино и показы' },
  { id: 'education', label: 'Лекции и IT' },
  { id: 'gov', label: 'Гос. оповещения' },
  { id: 'water', label: 'Отключение воды' },
  { id: 'electricity', label: 'Отключение электричества' },
  { id: 'roads', label: 'Дороги и транспорт' },
  { id: 'repairs', label: 'Ремонтные работы' },
];

export const CITY_OPTIONS: { id: CityId; label: string }[] = [
  { id: 'bishkek', label: 'Бишкек' },
  { id: 'osh', label: 'Ош' },
  { id: 'jalalabad', label: 'Жалал-Абад' },
  { id: 'karakol', label: 'Каракол' },
  { id: 'talas', label: 'Талас' },
  { id: 'naryn', label: 'Нарын' },
  { id: 'batken', label: 'Баткен' },
];

const ALERT_CATEGORIES: CategoryId[] = ['water', 'electricity', 'roads', 'repairs'];

interface Props {
  /** Язык подписей формы (панель администратора — 'ru') */
  lang?: Language;
  initial?: Announcement | null;
  /** admin — видит служебные поля (срочность, бегущая строка, статус, источник) */
  mode: 'admin' | 'user';
  submitLabel: string;
  onSubmit: (item: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

export const inputCls =
  'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-[#0f1b33] focus:outline-none focus:ring-2 focus:ring-[#12327A]/30 focus:border-[#12327A]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1';

export const AnnouncementForm: React.FC<Props> = ({ lang = 'ru', initial, mode, submitLabel, onSubmit, onCancel }) => {
  const tr = (k: AccountKey) => ta(k, lang);
  const { t } = getTranslation(lang);
  const [titleRu, setTitleRu] = useState(initial?.title.ru || '');
  const [titleKg, setTitleKg] = useState(initial && initial.title.kg !== initial.title.ru ? initial.title.kg : '');
  const [titleEn, setTitleEn] = useState(initial && initial.title.en !== initial.title.ru ? initial.title.en : '');
  const [summary, setSummary] = useState(initial?.summary.ru || '');
  const [description, setDescription] = useState(initial?.description.ru || '');
  const [category, setCategory] = useState<CategoryId>(initial?.category || 'concerts');
  const [city, setCity] = useState<CityId>(initial?.city || 'bishkek');
  const [location, setLocation] = useState(initial?.location.ru || '');
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '');
  const [price, setPrice] = useState(initial?.eventDetails?.priceText?.ru || '');
  const [venue, setVenue] = useState(initial?.eventDetails?.venue || '');
  const [organizer, setOrganizer] = useState(initial?.eventDetails?.organizer || '');
  const [contactPhone, setContactPhone] = useState(initial?.eventDetails?.contactPhone || '');
  const [ticketUrl, setTicketUrl] = useState(initial ? ticketLink(initial).url : '');
  const [ticketVerified, setTicketVerified] = useState(Boolean(initial?.ticketUrlVerified));
  const [organizerUrl, setOrganizerUrl] = useState(initial?.organizerUrl || '');
  const [artistUrl, setArtistUrl] = useState(initial?.artistUrl || '');
  const [venueUrl, setVenueUrl] = useState(initial?.venueUrl || '');
  const [timeRange, setTimeRange] = useState(initial?.eventDetails?.timeRange || '');
  const [sourceUrl, setSourceUrl] = useState(initial ? eventSource(initial) : '');
  const [sourceName, setSourceName] = useState(initial?.sourceName || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [imageData, setImageData] = useState('');
  const [imageCredit, setImageCredit] = useState(initial?.imageCredit || '');
  const [imageSourceUrl, setImageSourceUrl] = useState(initial?.imageSourceUrl || '');
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt || '');
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>(initial?.imageFit || 'contain');
  // служебные поля администратора
  const [urgency, setUrgency] = useState<UrgencyType>(initial?.urgency || 'event');
  const [status, setStatus] = useState<AnnouncementStatus>(initial?.status || 'scheduled');
  const [isTicker, setIsTicker] = useState(Boolean(initial?.isUrgentTicker));

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try {
      let data = await compressImage(file);
      if (data.length > MAX_IMAGE_BYTES * 1.37) data = await compressImage(file, 1000, 0.7);
      if (data.length > MAX_IMAGE_BYTES * 1.37) throw new Error(tr('fPhotoTooBig'));
      setImageData(data);
      setImageUrl('');
    } catch (ex) {
      setErr((ex as Error).message === tr('fPhotoTooBig') ? tr('fPhotoTooBig') : tr('fPhotoBad'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!titleRu.trim() || !summary.trim() || !location.trim() || !startDate) {
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
      title: { ru: titleRu.trim(), kg: titleKg.trim(), en: titleEn.trim() },
      summary: { ru: summary.trim() },
      description: { ru: description.trim() || summary.trim() },
      category,
      city,
      location: { ru: location.trim() },
      startDate,
      endDate,
      urgency: mode === 'admin' ? urgency : ALERT_CATEGORIES.includes(category) ? 'planned' : 'event',
      status: mode === 'admin' ? status : 'scheduled',
      isUrgentTicker: mode === 'admin' ? isTicker : false,
      isVerified: mode === 'admin' ? true : false,
      sourceName: sourceName.trim() || organizer.trim(),
      eventSourceUrl: sourceUrl.trim(),
      ticketUrl: ticketUrl.trim(),
      ticketUrlVerified: mode === 'admin' ? ticketVerified && Boolean(ticketUrl.trim()) : false,
      organizerUrl: organizerUrl.trim(),
      artistUrl: artistUrl.trim(),
      venueUrl: venueUrl.trim(),
      imageSourceUrl: imageSourceUrl.trim(),
      imageAlt: imageAlt.trim(),
      imageFit,
      imageUrl: imageData ? '' : imageUrl.trim(),
      imageData: imageData || undefined,
      imageCredit: imageCredit.trim(),
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
      await onSubmit(item);
    } catch (ex) {
      setErr(errorText(ex, lang));
    } finally {
      setBusy(false);
    }
  };

  const preview = imageData || imageUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>{tr('fTitleRu')}</label>
        <input className={inputCls} value={titleRu} onChange={(e) => setTitleRu(e.target.value)} maxLength={200} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr('fTitleKg')}</label>
          <input className={inputCls} value={titleKg} onChange={(e) => setTitleKg(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className={labelCls}>{tr('fTitleEn')}</label>
          <input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={200} />
        </div>
      </div>
      <div>
        <label className={labelCls}>{tr('fSummary')}</label>
        <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} required />
      </div>
      <div>
        <label className={labelCls}>{tr('fDescription')}</label>
        <textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr('fCategory')}</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`categories.${c.id}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{tr('fCity')}</label>
          <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value as CityId)}>
            {CITY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`cities.${c.id}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>{tr('fLocation')}</label>
        <input
          className={inputCls}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={tr('fLocationPh')}
          maxLength={300}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr('fStart')}</label>
          <input type="datetime-local" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>{tr('fEnd')}</label>
          <input type="datetime-local" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{tr('fPrice')}</label>
          <input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={tr('fPricePh')} />
        </div>
        <div>
          <label className={labelCls}>{tr('fTime')}</label>
          <input className={inputCls} value={timeRange} onChange={(e) => setTimeRange(e.target.value)} placeholder="19:00 • 12+" />
        </div>
        <div>
          <label className={labelCls}>{tr('fVenue')}</label>
          <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr('fOrganizer')}</label>
          <input className={inputCls} value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>{tr('fPhone')}</label>
          <input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+996 ..." />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{tr('fTickets')}</label>
          <input className={inputCls} value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className={labelCls}>{tr('fSource')}</label>
          <input className={inputCls} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{tr('fOrganizerUrl')}</label>
          <input className={inputCls} value={organizerUrl} onChange={(e) => setOrganizerUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className={labelCls}>{tr('fArtistUrl')}</label>
          <input className={inputCls} value={artistUrl} onChange={(e) => setArtistUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className={labelCls}>{tr('fVenueUrl')}</label>
          <input className={inputCls} value={venueUrl} onChange={(e) => setVenueUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>

      {/* Фото / афиша */}
      <div className="p-4 rounded-2xl border border-dashed border-gray-300 bg-[#f8fafc]">
        <label className={labelCls}>{tr('fPhoto')}</label>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-48 aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
            {preview ? (
              <img src={preview} alt="" className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'}`} referrerPolicy="no-referrer" />
            ) : (
              <span className="material-symbols-outlined text-gray-400 text-[36px]">image</span>
            )}
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12327A] text-white text-xs font-bold cursor-pointer hover:bg-[#0d2459]">
              <span className="material-symbols-outlined text-[16px]">upload</span>
              {tr('fUpload')}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
            </label>
            <input
              className={inputCls}
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImageData('');
              }}
              placeholder={tr('fImageUrl')}
            />
            <input
              className={inputCls}
              value={imageCredit}
              onChange={(e) => setImageCredit(e.target.value)}
              placeholder={tr('fImageCredit')}
            />
            <input
              className={inputCls}
              value={imageSourceUrl}
              onChange={(e) => setImageSourceUrl(e.target.value)}
              placeholder={tr('fImageSource')}
            />
            <input className={inputCls} value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder={tr('fImageAlt')} />
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={imageFit === 'cover'} onChange={(e) => setImageFit(e.target.checked ? 'cover' : 'contain')} />
              {tr('fImageCover')}
            </label>
            {preview && (
              <button
                type="button"
                className="text-xs font-bold text-red-600 hover:underline"
                onClick={() => {
                  setImageData('');
                  setImageUrl('');
                }}
              >
                {tr('fRemovePhoto')}
              </button>
            )}
          </div>
        </div>
      </div>

      {mode === 'admin' && (
        <div className="p-4 rounded-2xl bg-[#eef2f9] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Тип</label>
            <select className={inputCls} value={urgency} onChange={(e) => setUrgency(e.target.value as UrgencyType)}>
              <option value="event">Событие / афиша</option>
              <option value="planned">Плановое предупреждение</option>
              <option value="emergency">Аварийное / срочное</option>
              <option value="regular">Информация</option>
            </select>
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
          <label className="flex items-center gap-2 text-sm font-semibold text-[#0f1b33] mt-5">
            <input type="checkbox" checked={isTicker} onChange={(e) => setIsTicker(e.target.checked)} />
            Показать в бегущей строке «Срочно»
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#0f1b33] sm:col-span-2">
            <input type="checkbox" checked={ticketVerified} onChange={(e) => setTicketVerified(e.target.checked)} />
            Ссылка на билеты проверена (ведёт на страницу этого события) — показывать кнопку «Купить билет»
          </label>
        </div>
      )}

      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}

      <div className="flex flex-wrap gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
            {tr('fCancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-[#20C7B5] text-[#002f29] text-sm font-extrabold hover:bg-[#1bb3a2] disabled:opacity-60"
        >
          {busy ? tr('fSaving') : submitLabel}
        </button>
      </div>
    </form>
  );
};
