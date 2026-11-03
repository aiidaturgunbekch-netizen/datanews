import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../../services/api';
import { inputCls } from '../AnnouncementForm';
import {
  clampAmount,
  DURATION_LIMITS,
  DurationUnit,
  durationDays,
  durationPrice,
  durationText,
  AD_FORMAT_IDS,
  AD_PAYMENT_LABEL,
  AD_STATUS_LABEL,
  AdCampaignStatus,
  AdFormat,
  AdFormatId,
  addDaysLocal,
  effectiveStatus,
  formatSom,
  ratioOk,
} from '../../config/ads';
import { RUBRICS } from '../../config/rubrics';
import { formatKgDateTime, kgNowLocal } from '../../utils/time';
import { AdCatalog, AdPreviewModal } from '../ads/AdCatalog';

type Sub = 'campaigns' | 'catalog' | 'create' | 'stats' | 'archive';
const fmt = formatKgDateTime;
const STATUS_CLS: Record<AdCampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  awaiting_payment: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-sky-100 text-sky-800',
  completed: 'bg-gray-200 text-gray-600',
};
const NO_STATS = 'Статистика появится после начала размещения';
const MAX_DATA_URL = 940_000;

const readDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Не удалось прочитать файл'));
    r.readAsDataURL(file);
  });
const dims = (src: string) =>
  new Promise<{ w: number; h: number }>((res, rej) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => rej(new Error('Не удалось открыть изображение'));
    img.src = src;
  });

/** Картинка рекламы: тип (JPG/PNG/WEBP), пропорции места (±8%), размер файла — до отправки на сервер (сервер проверит ещё раз) */
const prepareImage = async (file: File, want: { w: number; h: number }) => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Поддерживаются JPG, PNG, WEBP');
  let data = await readDataUrl(file);
  const d = await dims(data);
  if (!ratioOk(d.w, d.h, want)) throw new Error(`Пропорции ${d.w}×${d.h} не подходят: нужен формат ${want.w}×${want.h} (или такой же пропорции)`);
  if (d.w < want.w / 2) throw new Error(`Слишком маленькое изображение (${d.w}×${d.h}); нужно не меньше ${Math.round(want.w / 2)} px в ширину`);
  if (data.length > MAX_DATA_URL) data = await api.compressImage(file, Math.max(want.w, want.h), 0.88);
  if (data.length > MAX_DATA_URL) data = await api.compressImage(file, Math.max(want.w, want.h), 0.75);
  if (data.length > MAX_DATA_URL) throw new Error('Файл слишком большой даже после сжатия — уменьшите изображение');
  return { data, size: d };
};

/** Целое число из текста поля (пустое или неверное — запасное значение), в пределах min…max */
const toInt = (s: string, min: number, max: number, fallback: number) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
/** Поле для числа: цифры набираются с клавиатуры, стирание работает (без стрелок «вверх / вниз») */
const NumberInput: React.FC<{ value: string; onChange: (v: string) => void; max?: number; placeholder?: string }> = ({ value, onChange, max = 9_999_999, placeholder }) => (
  <input
    type="text"
    inputMode="numeric"
    autoComplete="off"
    className={inputCls}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, String(max).length))}
  />
);

/** Рамка выбора фото: видно, куда нажать; после выбора — миниатюра, имя файла и размер */
const PhotoPick: React.FC<{
  title: string;
  hint: string;
  file: { data: string; size: { w: number; h: number }; name: string } | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ title, hint, file, onPick }) => (
  <div className="block">
    <span className="font-bold text-gray-600">{title}</span>
    <label className="mt-1 flex items-center gap-3 rounded-xl border-2 border-dashed border-[#12327A]/30 bg-[#f7f9fd] p-3 cursor-pointer hover:border-[#12327A] hover:bg-[#eef2f9] focus-within:ring-2 focus-within:ring-[#12327A]">
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" />
      {file ? (
        <img src={file.data} alt="" className="h-14 max-w-[45%] rounded-lg border border-gray-200 object-contain bg-white" />
      ) : (
        <span className="material-symbols-outlined text-[32px] text-[#12327A]" aria-hidden="true">
          add_photo_alternate
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-bold text-[#12327A]">{file ? 'Заменить фото' : 'Нажмите, чтобы выбрать фото'}</span>
        {file ? (
          <span className="block text-emerald-700 truncate">
            ✓ {file.name} · {file.size.w}×{file.size.h}
          </span>
        ) : (
          <span className="block text-gray-500">{hint}</span>
        )}
      </span>
    </label>
  </div>
);

/** Срок размещения: сначала «Дни» или «Месяцы», затем количество */
const DurationPicker: React.FC<{ unit: DurationUnit; amount: string; onUnit: (u: DurationUnit) => void; onAmount: (v: string) => void }> = ({ unit, amount, onUnit, onAmount }) => (
  <div className="block">
    <span className="font-bold text-gray-600">Срок размещения</span>
    <div className="mt-1 flex flex-wrap items-stretch gap-2">
      <div role="radiogroup" aria-label="Единица срока" className="inline-flex rounded-xl bg-[#f3f6fc] p-1">
        {(['days', 'months'] as DurationUnit[]).map((u) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={unit === u}
            onClick={() => onUnit(u)}
            className={`px-3 py-1.5 rounded-lg font-bold ${unit === u ? 'bg-[#12327A] text-white' : 'text-[#12327A] hover:bg-white'}`}
          >
            {u === 'days' ? 'Дни' : 'Месяцы'}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-[140px]">
        <NumberInput value={amount} onChange={onAmount} max={DURATION_LIMITS[unit].max} placeholder={unit === 'days' ? 'например, 10' : '1'} />
      </div>
    </div>
    <span className="text-gray-500">
      {unit === 'days' ? `Количество дней: от 1 до ${DURATION_LIMITS.days.max}. Цена за день = цена за 30 дней ÷ 30.` : 'Количество месяцев: от 1 до 12 (1 месяц = 30 дней).'}
    </span>
  </div>
);

const Badge: React.FC<{ status: AdCampaignStatus }> = ({ status }) => <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${STATUS_CLS[status]}`}>{AD_STATUS_LABEL[status]}</span>;

const StatsLine: React.FC<{ c: api.AdminCampaign }> = ({ c }) =>
  c.stats.views === 0 && c.stats.clicks === 0 ? (
    <span className="text-gray-500">{NO_STATS}</span>
  ) : (
    <span className="tabular-nums">
      Показы: <b>{c.stats.views}</b> · Клики: <b>{c.stats.clicks}</b> · CTR: <b>{c.stats.ctr === null ? '—' : `${c.stats.ctr}%`}</b>
    </span>
  );

/**
 * Раздел «Реклама»: кампании, каталог форматов и цен, создание кампании из формата, статистика показов и кликов, архив.
 * Кампания показывается на сайте, только когда администратор подтвердил оплату (номер платежа) и включил её; сайт оплату не принимает.
 */
export const AdsPanel: React.FC = () => {
  const [sub, setSub] = useState<Sub>('campaigns');
  const [data, setData] = useState<{ formats: Record<AdFormatId, AdFormat>; campaigns: api.AdminCampaign[] } | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [createFormat, setCreateFormat] = useState<AdFormatId>('A');
  const load = () =>
    api
      .adsAdmin()
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  const now = kgNowLocal();
  const current = useMemo(() => (data?.campaigns || []).filter((c) => effectiveStatus(c, now) !== 'completed'), [data, now]);
  const archive = useMemo(() => (data?.campaigns || []).filter((c) => effectiveStatus(c, now) === 'completed'), [data, now]);

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setErr('');
    setMsg('');
    try {
      await api.adsPost({ op: 'action', id, action, ...extra });
      setMsg('Сохранено');
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const tabs: [Sub, string][] = [
    ['campaigns', `Кампании${current.length ? ` (${current.length})` : ''}`],
    ['catalog', 'Каталог форматов и цены'],
    ['create', 'Создать кампанию'],
    ['stats', 'Статистика'],
    ['archive', `Архив${archive.length ? ` (${archive.length})` : ''}`],
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Реклама" className="flex flex-wrap gap-1">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={sub === k}
            onClick={() => setSub(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${sub === k ? 'bg-[#12327A] text-white' : 'bg-white border border-gray-200 text-[#12327A]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{err}</div>}
      {!data ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : sub === 'campaigns' ? (
        <CampaignList list={current} formats={data.formats} onAct={act} onCreate={() => setSub('catalog')} />
      ) : sub === 'catalog' ? (
        <CatalogEditor
          formats={data.formats}
          onCreate={(id) => {
            setCreateFormat(id);
            setSub('create');
          }}
          onSaved={() => {
            setMsg('Каталог сохранён. Новые цены действуют для новых кампаний; созданные и оплаченные не меняются.');
            load();
          }}
          onError={setErr}
        />
      ) : sub === 'create' ? (
        <CreateForm
          formats={data.formats}
          initial={createFormat}
          onCreated={() => {
            setMsg('Кампания создана. Она не показывается на сайте, пока вы не подтвердите оплату и не включите её.');
            setSub('campaigns');
            load();
          }}
        />
      ) : sub === 'stats' ? (
        <StatsTable list={data.campaigns} formats={data.formats} />
      ) : (
        <CampaignList list={archive} formats={data.formats} onAct={act} archived />
      )}
    </div>
  );
};

// ─────────── Кампании ───────────
const CampaignList: React.FC<{
  list: api.AdminCampaign[];
  formats: Record<AdFormatId, AdFormat>;
  onAct: (id: string, action: string, extra?: Record<string, unknown>, confirmText?: string) => void;
  onCreate?: () => void;
  archived?: boolean;
}> = ({ list, formats, onAct, onCreate, archived }) => {
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const now = kgNowLocal();
  if (list.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-600">
        {archived ? 'Завершённых кампаний пока нет.' : 'Рекламных кампаний пока нет. Реклама на сайте не показывается.'}
        {onCreate && (
          <button type="button" onClick={onCreate} className="ml-2 font-bold text-[#12327A] underline">
            Выбрать формат в каталоге
          </button>
        )}
      </div>
    );
  return (
    <ul className="space-y-3">
      {list.map((c) => {
        const st = effectiveStatus(c, now);
        const f = formats[c.format];
        const paid = c.payment.status === 'confirmed';
        return (
          <li key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4" data-campaign={c.id}>
            <div className="flex flex-col sm:flex-row gap-3">
              <img src={c.imageDesktop} alt={c.alt} className="w-full sm:w-48 rounded-lg object-contain bg-[#f5f7fb] self-start" style={{ aspectRatio: `${(c.imageDesktopSize || f.desktop).w} / ${(c.imageDesktopSize || f.desktop).h}` }} />
              <div className="flex-1 min-w-0 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[#0f1b33]">{c.name}</b>
                  <Badge status={st} />
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${paid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{AD_PAYMENT_LABEL[c.payment.status]}</span>
                </div>
                <div className="text-gray-600">
                  {f.name.ru} (формат {c.format}){c.rubric ? ` · раздел «${RUBRICS.find((r) => r.id === c.rubric)?.label.ru || c.rubric}»` : ''} · {c.label === 'partner' ? 'Партнёрский материал' : 'Реклама'} · приоритет {c.priority}
                </div>
                <div className="text-gray-600">
                  {c.advertiser} · {c.contact} ·{' '}
                  <a href={c.href} target="_blank" rel="noopener noreferrer sponsored" className="text-[#12327A] underline break-all">
                    {c.href}
                  </a>
                </div>
                <div className="text-gray-600">
                  {fmt(c.start)} — {fmt(c.end)} (Бишкек) · {durationText(c.unit || 'months', c.amount ?? c.periods)} = <b>{formatSom(c.total)}</b>
                  {paid && c.payment.ref && ` · платёж: ${c.payment.ref}${c.payment.confirmedAt ? `, подтверждён ${fmt(c.payment.confirmedAt)}` : ''}`}
                </div>
                <div className="text-xs">
                  <StatsLine c={c} />
                </div>
              </div>
            </div>
            {!archived && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {st === 'draft' && (
                  <button type="button" onClick={() => onAct(c.id, 'submit')} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold">
                    Отправить на оплату
                  </button>
                )}
                {!paid && (
                  <span className="inline-flex items-center gap-1">
                    <input
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs w-44"
                      placeholder="№ платежа / документа"
                      value={refs[c.id] || ''}
                      onChange={(e) => setRefs({ ...refs, [c.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={!refs[c.id]?.trim()}
                      onClick={() => onAct(c.id, 'confirm', { ref: refs[c.id] }, `Подтвердить, что оплата ${formatSom(c.total)} за «${c.name}» действительно получена?`)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-50"
                    >
                      Подтвердить оплату
                    </button>
                  </span>
                )}
                {paid && (st === 'draft' || st === 'awaiting_payment') && (
                  <button type="button" onClick={() => onAct(c.id, 'activate', {}, `Показать «${c.name}» на сайте с ${fmt(c.start)} по ${fmt(c.end)}?`)} className="px-3 py-1.5 rounded-lg bg-[#12327A] text-white font-bold">
                    Активировать
                  </button>
                )}
                {st === 'active' && (
                  <button type="button" onClick={() => onAct(c.id, 'pause')} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold">
                    Приостановить
                  </button>
                )}
                {st === 'paused' && (
                  <button type="button" onClick={() => onAct(c.id, 'resume')} className="px-3 py-1.5 rounded-lg bg-[#12327A] text-white font-bold">
                    Возобновить
                  </button>
                )}
                <button type="button" onClick={() => setEditing(editing === c.id ? null : c.id)} className="px-3 py-1.5 rounded-lg border border-gray-200 font-bold text-[#12327A]">
                  Изменить
                </button>
                {(st === 'active' || st === 'paused' || paid) && (
                  <button type="button" onClick={() => onAct(c.id, 'complete', {}, `Завершить «${c.name}» досрочно? Реклама сразу исчезнет с сайта.`)} className="px-3 py-1.5 rounded-lg border border-gray-200 font-bold text-gray-700">
                    Завершить
                  </button>
                )}
                {!paid && (st === 'draft' || st === 'awaiting_payment') && (
                  <button type="button" onClick={() => onAct(c.id, 'delete', {}, `Удалить «${c.name}»?`)} className="px-3 py-1.5 rounded-lg text-red-700 font-bold">
                    Удалить
                  </button>
                )}
                {!paid && <span className="text-gray-500">Без подтверждённой оплаты кампания не показывается.</span>}
              </div>
            )}
            {editing === c.id && <EditBox c={c} paid={paid} onSave={(extra) => (onAct(c.id, 'edit', extra), setEditing(null))} />}
          </li>
        );
      })}
    </ul>
  );
};

const EditBox: React.FC<{ c: api.AdminCampaign; paid: boolean; onSave: (extra: Record<string, unknown>) => void }> = ({ c, paid, onSave }) => {
  const [v, setV] = useState({ name: c.name, advertiser: c.advertiser, contact: c.contact, href: c.href, alt: c.alt, priority: String(c.priority), start: c.start });
  const [unit, setUnit] = useState<DurationUnit>(c.unit || 'months');
  const [amountStr, setAmountStr] = useState(String(c.amount ?? c.periods));
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
      {(['name', 'advertiser', 'contact', 'href', 'alt'] as const).map((k) => (
        <label key={k} className="block">
          <span className="font-bold text-gray-600">{{ name: 'Название', advertiser: 'Рекламодатель', contact: 'Контакт', href: 'Ссылка (https://)', alt: 'Описание изображения' }[k]}</span>
          <input className={inputCls} value={v[k]} onChange={set(k)} />
        </label>
      ))}
      <label className="block">
        <span className="font-bold text-gray-600">Приоритет показа (0–100, обычно 0)</span>
        <NumberInput value={v.priority} onChange={(x) => setV({ ...v, priority: x })} max={100} placeholder="0" />
      </label>
      {!paid ? (
        <>
          <label className="block">
            <span className="font-bold text-gray-600">Начало (Бишкек)</span>
            <input type="datetime-local" className={inputCls} value={v.start} onChange={set('start')} />
          </label>
          <DurationPicker
            unit={unit}
            amount={amountStr}
            onUnit={(u) => {
              setUnit(u);
              setAmountStr(u === 'days' ? '30' : '1');
            }}
            onAmount={setAmountStr}
          />
        </>
      ) : (
        <p className="text-gray-500 sm:col-span-2">Оплата подтверждена — период и цена не меняются.</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => {
            const { start, priority, ...rest } = v;
            const base = { ...rest, priority: toInt(priority, 0, 100, 0) };
            onSave(paid ? base : { ...base, start, unit, amount: clampAmount(unit, amountStr || 1) });
          }}
          className="px-4 py-2 rounded-xl bg-[#12327A] text-white font-bold"
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
};

// ─────────── Каталог и цены ───────────
const CatalogEditor: React.FC<{ formats: Record<AdFormatId, AdFormat>; onCreate: (id: AdFormatId) => void; onSaved: () => void; onError: (m: string) => void }> = ({ formats, onCreate, onSaved, onError }) => {
  const [edit, setEdit] = useState<AdFormatId | null>(null);
  return (
    <div className="space-y-4">
      <AdCatalog formats={formats} lang="ru" action={{ label: 'Создать кампанию', onClick: onCreate }} />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="font-extrabold text-[#0f1b33] text-sm mb-1">Цены и описания форматов</div>
        <p className="text-xs text-gray-500 mb-3">Изменение цены действует только для новых кампаний: у созданных и оплаченных цена зафиксирована.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {AD_FORMAT_IDS.map((id) => (
            <button key={id} type="button" onClick={() => setEdit(edit === id ? null : id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${edit === id ? 'bg-[#12327A] text-white' : 'border border-gray-200 text-[#12327A]'}`}>
              {id}: {formats[id].name.ru} — {formatSom(formats[id].price)}
            </button>
          ))}
        </div>
        {edit && <FormatForm key={edit} f={formats[edit]} onSaved={onSaved} onError={onError} />}
      </div>
    </div>
  );
};

const FormatForm: React.FC<{ f: AdFormat; onSaved: () => void; onError: (m: string) => void }> = ({ f, onSaved, onError }) => {
  const [v, setV] = useState({
    price: String(f.price),
    dw: String(f.desktop.w),
    dh: String(f.desktop.h),
    mw: String(f.mobile?.w || ''),
    mh: String(f.mobile?.h || ''),
    name: f.name.ru,
    caption: f.caption.ru,
    placement: f.placement.ru,
    benefits: f.benefits.ru,
  });
  const num = (k: 'price' | 'dw' | 'dh' | 'mw' | 'mh') => (x: string) => setV({ ...v, [k]: x });
  const txt = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const save = async () => {
    try {
      await api.adsPost({
        op: 'format',
        id: f.id,
        price: toInt(v.price, 0, 10_000_000, 0),
        desktop: { w: toInt(v.dw, 0, 4000, 0), h: toInt(v.dh, 0, 4000, 0) },
        mobile: v.mw && v.mh ? { w: toInt(v.mw, 0, 4000, 0), h: toInt(v.mh, 0, 4000, 0) } : null,
        // русский текст меняется здесь; кыргызский и английский остаются прежними, если их не меняли
        name: { ...f.name, ru: v.name },
        caption: { ...f.caption, ru: v.caption },
        placement: { ...f.placement, ru: v.placement },
        benefits: { ...f.benefits, ru: v.benefits },
      });
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
      <label className="block col-span-2">
        <span className="font-bold text-gray-600">Цена за 30 дней, сом</span>
        <NumberInput value={v.price} onChange={num('price')} max={10000000} />
      </label>
      <label className="block">
        <span className="font-bold text-gray-600">Компьютер, ширина</span>
        <NumberInput value={v.dw} onChange={num('dw')} max={4000} />
      </label>
      <label className="block">
        <span className="font-bold text-gray-600">высота</span>
        <NumberInput value={v.dh} onChange={num('dh')} max={4000} />
      </label>
      <label className="block">
        <span className="font-bold text-gray-600">Телефон, ширина (пусто — то же изображение)</span>
        <NumberInput value={v.mw} onChange={num('mw')} max={4000} />
      </label>
      <label className="block">
        <span className="font-bold text-gray-600">высота</span>
        <NumberInput value={v.mh} onChange={num('mh')} max={4000} />
      </label>
      <label className="block col-span-2 md:col-span-6">
        <span className="font-bold text-gray-600">Название</span>
        <input className={inputCls} value={v.name} onChange={txt('name')} />
      </label>
      <label className="block col-span-2 md:col-span-6">
        <span className="font-bold text-gray-600">Подпись</span>
        <input className={inputCls} value={v.caption} onChange={txt('caption')} />
      </label>
      <label className="block col-span-2 md:col-span-3">
        <span className="font-bold text-gray-600">Место размещения</span>
        <textarea className={`${inputCls} min-h-[70px]`} value={v.placement} onChange={txt('placement')} />
      </label>
      <label className="block col-span-2 md:col-span-3">
        <span className="font-bold text-gray-600">Преимущества (по одному в строке)</span>
        <textarea className={`${inputCls} min-h-[70px]`} value={v.benefits} onChange={txt('benefits')} />
      </label>
      <div className="col-span-2 md:col-span-6">
        <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-[#12327A] text-white font-bold">
          Сохранить формат {f.id}
        </button>
      </div>
    </div>
  );
};

// ─────────── Создание кампании ───────────
const CreateForm: React.FC<{ formats: Record<AdFormatId, AdFormat>; initial: AdFormatId; onCreated: () => void }> = ({ formats, initial, onCreated }) => {
  const [format, setFormat] = useState<AdFormatId>(initial);
  const f = formats[format];
  const [v, setV] = useState({ name: '', advertiser: '', contact: '', href: 'https://', alt: '', title: '', text: '', cta: '', rubric: 'tech', label: 'ad', start: kgNowLocal().slice(0, 11) + '09:00', priority: '0' });
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [amountStr, setAmountStr] = useState('30');
  type Pic = { data: string; size: { w: number; h: number }; name: string };
  const [desk, setDesk] = useState<Pic | null>(null);
  const [mob, setMob] = useState<Pic | null>(null);
  const [imgErr, setImgErr] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setDesk(null);
    setMob(null);
  }, [format]);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const amount = clampAmount(unit, amountStr || DURATION_LIMITS[unit].min);
  const days = durationDays(unit, amount, f.periodDays);
  const priority = toInt(v.priority, 0, 100, 0);
  const pick = (which: 'desk' | 'mob') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgErr('');
    try {
      const want = which === 'desk' ? f.desktop : f.mobile || f.desktop;
      const img = await prepareImage(file, want);
      (which === 'desk' ? setDesk : setMob)({ ...img, name: file.name });
    } catch (x) {
      setImgErr((x as Error).message);
      e.target.value = '';
    }
  };
  const end = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.start) ? addDaysLocal(v.start, days) : '';
  const total = durationPrice(f.price, unit, amount, f.periodDays);
  const ready = v.name.trim() && v.advertiser.trim() && v.contact.trim() && /^https:\/\/.+\..+/.test(v.href) && v.alt.trim() && desk && end && (format !== 'C' || v.title.trim());

  const submit = async (status: 'draft' | 'awaiting_payment') => {
    if (!ready) return;
    setBusy(true);
    setErr('');
    try {
      await api.adsPost({
        op: 'create',
        format,
        ...v,
        unit,
        amount,
        priority,
        status,
        imageDesktopData: desk!.data,
        ...(mob ? { imageMobileData: mob.data } : {}),
      });
      onCreated();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 text-xs">
      <div className="flex flex-wrap gap-2">
        {AD_FORMAT_IDS.map((id) => (
          <button key={id} type="button" onClick={() => setFormat(id)} className={`px-3 py-1.5 rounded-xl font-bold ${format === id ? 'bg-[#12327A] text-white' : 'border border-gray-200 text-[#12327A]'}`}>
            {id}: {formats[id].name.ru}
          </button>
        ))}
        <button type="button" onClick={() => setPreview(true)} className="px-3 py-1.5 rounded-xl border border-[#20c7b5] text-[#0b7a70] font-bold">
          Посмотреть размещение
        </button>
      </div>
      <div className="rounded-xl bg-[#f3f6fc] p-3 grid grid-cols-1 sm:grid-cols-4 gap-2" data-create-summary>
        <div>
          <div className="font-bold text-gray-500">Место</div>
          <div className="font-bold text-[#0f1b33]">{f.name.ru}</div>
        </div>
        <div>
          <div className="font-bold text-gray-500">Компьютер</div>
          <div className="font-bold text-[#0f1b33]">
            {f.desktop.w} × {f.desktop.h} px
          </div>
        </div>
        <div>
          <div className="font-bold text-gray-500">Телефон</div>
          <div className="font-bold text-[#0f1b33]">{f.mobile ? `${f.mobile.w} × ${f.mobile.h} px` : 'то же изображение'}</div>
        </div>
        <div>
          <div className="font-bold text-gray-500">Цена за 30 дней</div>
          <div className="font-bold text-[#0f1b33]">{formatSom(f.price)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(
          [
            ['name', 'Название кампании'],
            ['advertiser', 'Рекламодатель'],
            ['contact', 'Контакт (телефон или e-mail)'],
            ['href', 'Ссылка (https://…)'],
            ['alt', 'Описание изображения (для незрячих)'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block">
            <span className="font-bold text-gray-600">{label}</span>
            <input className={inputCls} value={v[k]} onChange={set(k)} />
          </label>
        ))}
        <label className="block">
          <span className="font-bold text-gray-600">Маркировка</span>
          <select className={inputCls} value={v.label} onChange={set('label')}>
            <option value="ad">«Реклама»</option>
            <option value="partner">«Партнёрский материал»</option>
          </select>
        </label>
        {format === 'D' && (
          <label className="block">
            <span className="font-bold text-gray-600">Раздел (только он)</span>
            <select className={inputCls} value={v.rubric} onChange={set('rubric')}>
              {RUBRICS.filter((r) => !r.aggregate).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label.ru}
                </option>
              ))}
            </select>
          </label>
        )}
        {format === 'C' && (
          <>
            <label className="block">
              <span className="font-bold text-gray-600">Заголовок карточки</span>
              <input className={inputCls} maxLength={90} value={v.title} onChange={set('title')} />
            </label>
            <label className="block">
              <span className="font-bold text-gray-600">Короткий текст</span>
              <input className={inputCls} maxLength={200} value={v.text} onChange={set('text')} />
            </label>
            <label className="block">
              <span className="font-bold text-gray-600">Текст кнопки (необязательно)</span>
              <input className={inputCls} maxLength={30} value={v.cta} onChange={set('cta')} placeholder="Подробнее" />
            </label>
          </>
        )}
        <PhotoPick title={`Изображение для компьютера (${f.desktop.w}×${f.desktop.h})`} hint={`JPG, PNG или WEBP · ${f.desktop.w}×${f.desktop.h} px или та же пропорция`} file={desk} onPick={pick('desk')} />
        {f.mobile && (
          <PhotoPick
            title={`Изображение для телефона (${f.mobile.w}×${f.mobile.h}, необязательно)`}
            hint={`Без него на телефоне — основное изображение${format === 'B' ? ' (не шире 320 px)' : ''}`}
            file={mob}
            onPick={pick('mob')}
          />
        )}
        <label className="block">
          <span className="font-bold text-gray-600">Начало показа (дата и время по Бишкеку)</span>
          <input type="datetime-local" className={inputCls} value={v.start} onChange={set('start')} />
        </label>
        <DurationPicker
          unit={unit}
          amount={amountStr}
          onUnit={(u) => {
            setUnit(u);
            setAmountStr(u === 'days' ? '30' : '1');
          }}
          onAmount={setAmountStr}
        />
        {/* Окончание считается само: начало + срок */}
        <div className="sm:col-span-2 rounded-xl bg-[#eef2f9] p-3 text-sm" data-create-end>
          <span className="font-bold text-gray-600">Окончание показа (считается автоматически): </span>
          <b className="text-[#0f1b33]">{end ? `${formatKgDateTime(end)} (Бишкек)` : 'укажите дату начала'}</b>
          {end && <span className="text-gray-600"> — срок {durationText(unit, amount, f.periodDays)}</span>}
        </div>
        <label className="block sm:col-span-2">
          <span className="font-bold text-gray-600">Приоритет показа (0–100) — обычно оставьте 0</span>
          <NumberInput value={v.priority} onChange={(x) => setV({ ...v, priority: x })} max={100} placeholder="0" />
          <span className="text-gray-500">
            Нужен, только если на одно и то же место одновременно оплачено несколько кампаний: показывается та, у которой число больше. При равных числах — та, что началась раньше.
          </span>
        </label>
      </div>
      {imgErr && <p className="text-red-700 font-semibold">{imgErr}</p>}
      <div className="rounded-xl bg-[#fff6e5] p-3 text-sm" data-create-total>
        Итого к оплате: <b>{formatSom(total)}</b> за {durationText(unit, amount, f.periodDays)} (цена за 30 дней — {formatSom(f.price)}) · показ до <b>{end ? formatKgDateTime(end) : '—'}</b>
        <div className="text-xs text-gray-600 mt-1">Кампания сохраняется как черновик или «Ожидает оплаты» и не показывается на сайте, пока вы не подтвердите оплату и не включите её.</div>
      </div>
      {err && <p className="text-red-700 font-semibold">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ready || busy} onClick={() => submit('draft')} className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-[#12327A] disabled:opacity-50">
          Сохранить черновик
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => submit('awaiting_payment')} className="px-4 py-2 rounded-xl bg-[#12327A] text-white font-bold disabled:opacity-50">
          Сохранить — ожидает оплаты
        </button>
      </div>
      {preview && <AdPreviewModal format={f} lang="ru" onClose={() => setPreview(false)} rubricLabel={format === 'D' ? RUBRICS.find((r) => r.id === v.rubric)?.label.ru : undefined} />}
    </div>
  );
};

// ─────────── Статистика ───────────
const StatsTable: React.FC<{ list: api.AdminCampaign[]; formats: Record<AdFormatId, AdFormat> }> = ({ list, formats }) => {
  const now = kgNowLocal();
  const rows = list.filter((c) => c.payment.status === 'confirmed' || c.stats.views > 0);
  if (rows.length === 0) return <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-600">{NO_STATS}.</div>;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-x-auto">
      <p className="text-xs text-gray-500 mb-2">Показ засчитывается, когда баннер виден на экране не меньше секунды. Клик — нажатие на рекламу и переход к рекламодателю.</p>
      <table className="w-full text-xs">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1 pr-2">Кампания</th>
            <th className="py-1 pr-2">Формат</th>
            <th className="py-1 pr-2">Период</th>
            <th className="py-1 pr-2">Статус</th>
            <th className="py-1 pr-2 text-right">Показы</th>
            <th className="py-1 pr-2 text-right">Клики</th>
            <th className="py-1 text-right">CTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((c) => {
            const started = now >= c.start && (c.status === 'active' || c.status === 'paused' || c.status === 'completed');
            const none = !started || (c.stats.views === 0 && c.stats.clicks === 0);
            return (
              <tr key={c.id}>
                <td className="py-1.5 pr-2 font-bold text-[#0f1b33]">{c.name}</td>
                <td className="py-1.5 pr-2">
                  {c.format} · {formats[c.format].name.ru}
                </td>
                <td className="py-1.5 pr-2 whitespace-nowrap">
                  {fmt(c.start)} — {fmt(c.end)}
                </td>
                <td className="py-1.5 pr-2">
                  <Badge status={effectiveStatus(c, now)} />
                </td>
                {none ? (
                  <td colSpan={3} className="py-1.5 text-right text-gray-500">
                    {NO_STATS}
                  </td>
                ) : (
                  <>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{c.stats.views}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{c.stats.clicks}</td>
                    <td className="py-1.5 text-right tabular-nums">{c.stats.ctr === null ? '—' : `${c.stats.ctr}%`}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
