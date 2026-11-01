import React, { useEffect, useRef, useState } from 'react';
import type { CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { currentSubscription, pushSupported, serverKey, subscribe, unsubscribe, updateSubscription } from '../services/push';
import { PLACE_IDS } from '../config/regions';
import { DEFAULT_TOPICS, PUSH_TOPIC_LABEL, PUSH_TOPICS, PushTopic } from '../config/push';

const TXT = {
  on: { ru: 'Уведомлять о срочном', kg: 'Шашылыш эскертүүлөрдү билдирүү', en: 'Notify me of urgent warnings' },
  active: { ru: 'Уведомления включены', kg: 'Билдирмелер күйгүзүлгөн', en: 'Notifications on' },
  off: { ru: 'Отключить', kg: 'Өчүрүү', en: 'Turn off' },
  busy: { ru: 'Подождите…', kg: 'Күтө туруңуз…', en: 'Please wait…' },
  denied: {
    ru: 'Уведомления запрещены в настройках браузера — разрешите их для этого сайта.',
    kg: 'Билдирмелерге браузердин жөндөөлөрүндө тыюу салынган — бул сайт үчүн уруксат бериңиз.',
    en: 'Notifications are blocked in the browser settings — allow them for this site.',
  },
  fail: { ru: 'Не удалось включить уведомления. Попробуйте позже.', kg: 'Билдирмелерди күйгүзүү мүмкүн болгон жок. Кийинчерээк аракет кылыңыз.', en: 'Could not turn on notifications. Try again later.' },
  scope: { ru: 'Только срочные предупреждения', kg: 'Шашылыш эскертүүлөр гана', en: 'Urgent warnings only' },
  topics: { ru: 'Темы', kg: 'Темалар', en: 'Topics' },
  place: { ru: 'Город / область', kg: 'Шаар / облус', en: 'City / region' },
  around: {
    bishkek: { ru: 'и Чуйская область', kg: 'жана Чүй облусу', en: 'and Chui Region' },
    osh: { ru: 'и Ошская область', kg: 'жана Ош облусу', en: 'and Osh Region' },
    all: { ru: 'все предупреждения', kg: 'бардык эскертүүлөр', en: 'all warnings' },
  } as Record<string, Record<Language, string>>,
  ios: {
    ru: 'На iPhone: «Поделиться» → «На экран „Домой“», затем откройте сайт с иконки.',
    kg: 'iPhone\'до: «Бөлүшүү» → «Үй экранына», анан сайтты сөлөкөттөн ачыңыз.',
    en: 'On iPhone: Share → Add to Home Screen, then open the site from the icon.',
  },
};

/**
 * Кнопка подписки на push: город или область (весь список мест, как в фильтрах сайта) и темы.
 * Подписчики Бишкека получают и предупреждения Чуйской области, Оша — Ошской, «Весь Кыргызстан» — все.
 * Окошки «Город / область» и «Темы» закрываются нажатием в любом другом месте, клавишей Escape и при выборе места.
 */
export const PushToggle: React.FC<{ lang: Language; city: CityId }> = ({ lang, city }) => {
  const { t } = getTranslation(lang);
  const [key, setKey] = useState<string | null>(null);
  const [subCity, setSubCity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [topics, setTopics] = useState<PushTopic[]>(DEFAULT_TOPICS);
  const [panel, setPanel] = useState<null | 'place' | 'topics'>(null);
  // место для новой подписки — по умолчанию то, что выбрано на странице
  const [chosen, setChosen] = useState<string>(city);
  const boxRef = useRef<HTMLDivElement>(null);
  // iPhone/iPad: push работает только у сайта, добавленного на экран «Домой»
  const iosBrowser = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent) && !('PushManager' in window);

  useEffect(() => {
    if (!pushSupported()) return;
    serverKey().then(setKey);
    currentSubscription()
      .then((c) => {
        setSubCity(c ? c.city || 'all' : null);
        if (c) setTopics(c.topics);
      })
      .catch(() => {});
  }, []);
  // сменили место на странице (например, «Весь Кыргызстан») — окошко закрывается, новая подписка берёт это место
  useEffect(() => {
    setChosen(city);
    setPanel(null);
  }, [city]);
  // нажатие вне кнопки и окошек или Escape — окошко закрывается
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  if (iosBrowser) return <p className="text-[11px] text-gray-500 max-w-xs">{TXT.ios[lang]}</p>;
  if (!pushSupported() || !key) return null;

  const placeName = (id: string) => `${t(`cities.${id}`)}${TXT.around[id] ? ` (${TXT.around[id][lang]})` : ''}`;

  const turnOn = async () => {
    setBusy(true);
    setMsg('');
    setPanel(null);
    try {
      await subscribe(key, chosen as CityId, lang, topics);
      setSubCity(chosen);
    } catch (e) {
      console.error('[push] подписка', e);
      setMsg((e as Error).message === 'denied' ? TXT.denied[lang] : (e as Error).message === 'dismissed' ? '' : TXT.fail[lang]);
    } finally {
      setBusy(false);
    }
  };
  // Выбор места: до подписки — для новой подписки; после — меняет место у включённой подписки. Окошко закрывается
  const pickPlace = async (id: string) => {
    setPanel(null);
    if (!subCity) {
      setChosen(id);
      return;
    }
    if (id === subCity) return;
    const prev = subCity;
    setSubCity(id);
    try {
      await updateSubscription(id as CityId, lang, topics);
    } catch {
      setSubCity(prev);
      setMsg(TXT.fail[lang]);
    }
  };
  // Темы подписки: «Срочные предупреждения» по умолчанию; хотя бы одна тема остаётся выбранной
  const toggleTopic = async (tp: PushTopic) => {
    const next = topics.includes(tp) ? topics.filter((x) => x !== tp) : [...topics, tp];
    if (next.length === 0 || !subCity) return;
    setTopics(next);
    try {
      await updateSubscription(subCity as CityId, lang, next);
    } catch {
      setTopics(topics);
      setMsg(TXT.fail[lang]);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    setPanel(null);
    try {
      await unsubscribe();
      setSubCity(null);
    } finally {
      setBusy(false);
    }
  };

  const current = subCity || chosen;
  const toggle = (p: 'place' | 'topics') => setPanel((v) => (v === p ? null : p));
  const smallBtn = 'px-2 py-1.5 rounded-lg font-bold hover:bg-gray-100 inline-flex items-center gap-0.5';
  const popup = 'absolute z-30 top-full mt-1 left-0 sm:left-auto sm:right-0 w-64 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 text-xs shadow-xl';

  return (
    <div ref={boxRef} className="relative flex flex-col items-start sm:items-end gap-1">
      <div className="inline-flex flex-wrap items-center gap-1 text-xs">
        {subCity ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold">
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            {TXT.active[lang]} · {t(`cities.${subCity}`)}
          </span>
        ) : (
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            title={TXT.scope[lang]}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#12327A] text-white font-bold hover:bg-[#0d2459] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">notifications</span>
            {busy ? TXT.busy[lang] : `${TXT.on[lang]} · ${t(`cities.${chosen}`)}`}
          </button>
        )}
        <button type="button" onClick={() => toggle('place')} aria-expanded={panel === 'place'} aria-haspopup="true" className={`${smallBtn} text-[#12327A]`}>
          {TXT.place[lang]}
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            {panel === 'place' ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {subCity && (
          <>
            <button type="button" onClick={() => toggle('topics')} aria-expanded={panel === 'topics'} aria-haspopup="true" className={`${smallBtn} text-[#12327A]`}>
              {TXT.topics[lang]}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {panel === 'topics' ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className={`${smallBtn} text-gray-600 disabled:opacity-60`}>
              {busy ? TXT.busy[lang] : TXT.off[lang]}
            </button>
          </>
        )}
      </div>
      {panel === 'place' && (
        <div role="listbox" aria-label={TXT.place[lang]} className={popup}>
          {PLACE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={current === id}
              onClick={() => pickPlace(id)}
              className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 ${current === id ? 'font-bold text-[#12327A] bg-[#eef2f9]' : 'text-[#0f1b33]'}`}
            >
              {placeName(id)}
            </button>
          ))}
        </div>
      )}
      {panel === 'topics' && subCity && (
        <fieldset className={popup}>
          <legend className="sr-only">{TXT.topics[lang]}</legend>
          {PUSH_TOPICS.map((tp) => (
            <label key={tp} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={topics.includes(tp)} onChange={() => toggleTopic(tp)} disabled={topics.length === 1 && topics.includes(tp)} />
              <span>{PUSH_TOPIC_LABEL[tp][lang]}</span>
            </label>
          ))}
        </fieldset>
      )}
      {msg && <p className="text-[11px] text-red-700 max-w-xs">{msg}</p>}
    </div>
  );
};
