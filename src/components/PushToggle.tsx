import React, { useEffect, useState } from 'react';
import type { CityId, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { currentSubscription, pushSupported, serverKey, subscribe, unsubscribe, updateTopics } from '../services/push';
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
  ios: {
    ru: 'На iPhone: «Поделиться» → «На экран „Домой“», затем откройте сайт с иконки.',
    kg: 'iPhone\'до: «Бөлүшүү» → «Үй экранына», анан сайтты сөлөкөттөн ачыңыз.',
    en: 'On iPhone: Share → Add to Home Screen, then open the site from the icon.',
  },
};

/** Кнопка подписки на push о срочных предупреждениях выбранного города / области */
export const PushToggle: React.FC<{ lang: Language; city: CityId }> = ({ lang, city }) => {
  const { t } = getTranslation(lang);
  const [key, setKey] = useState<string | null>(null);
  const [subCity, setSubCity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [topics, setTopics] = useState<PushTopic[]>(DEFAULT_TOPICS);
  const [showTopics, setShowTopics] = useState(false);
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

  if (iosBrowser) return <p className="text-[11px] text-gray-500 max-w-xs">{TXT.ios[lang]}</p>;
  if (!pushSupported() || !key) return null;

  const turnOn = async () => {
    setBusy(true);
    setMsg('');
    try {
      await subscribe(key, city, lang);
      setSubCity(city);
    } catch (e) {
      console.error('[push] подписка', e);
      setMsg((e as Error).message === 'denied' ? TXT.denied[lang] : (e as Error).message === 'dismissed' ? '' : TXT.fail[lang]);
    } finally {
      setBusy(false);
    }
  };
  // Темы подписки: «Срочные предупреждения» по умолчанию; хотя бы одна тема остаётся выбранной
  const toggleTopic = async (tp: PushTopic) => {
    const next = topics.includes(tp) ? topics.filter((x) => x !== tp) : [...topics, tp];
    if (next.length === 0 || !subCity) return;
    setTopics(next);
    try {
      await updateTopics(subCity as CityId, lang, next);
    } catch {
      setTopics(topics);
      setMsg(TXT.fail[lang]);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    try {
      await unsubscribe();
      setSubCity(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      {subCity ? (
        <div className="inline-flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold">
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            {TXT.active[lang]} · {t(`cities.${subCity}`)}
          </span>
          <button type="button" onClick={() => setShowTopics((v) => !v)} aria-expanded={showTopics} className="px-2 py-1.5 rounded-lg text-[#12327A] hover:bg-gray-100 font-bold">
            {TXT.topics[lang]}
          </button>
          <button type="button" onClick={turnOff} disabled={busy} className="px-2 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 font-bold disabled:opacity-60">
            {busy ? TXT.busy[lang] : TXT.off[lang]}
          </button>
        </div>
      ) : null}
      {subCity && showTopics && (
        <fieldset className="w-full max-w-xs rounded-xl border border-gray-200 bg-white p-2 text-xs">
          <legend className="px-1 font-bold text-gray-600">{TXT.topics[lang]}</legend>
          {PUSH_TOPICS.map((tp) => (
            <label key={tp} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={topics.includes(tp)} onChange={() => toggleTopic(tp)} disabled={topics.length === 1 && topics.includes(tp)} />
              <span>{PUSH_TOPIC_LABEL[tp][lang]}</span>
            </label>
          ))}
        </fieldset>
      )}
      {!subCity && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          title={TXT.scope[lang]}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#12327A] text-white text-xs font-bold hover:bg-[#0d2459] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px]">notifications</span>
          {busy ? TXT.busy[lang] : `${TXT.on[lang]} · ${t(`cities.${city}`)}`}
        </button>
      )}
      {msg && <p className="text-[11px] text-red-700 max-w-xs">{msg}</p>}
    </div>
  );
};
