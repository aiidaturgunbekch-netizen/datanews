import React, { useState } from 'react';
import { Language } from '../types';
import { SOCIAL_ICONS } from './ContactButtons';

const T = {
  title: { ru: 'Поделиться', kg: 'Бөлүшүү', en: 'Share' },
  articleTitle: { ru: 'Поделиться новостью', kg: 'Жаңылык менен бөлүшүү', en: 'Share this story' },
  copy: { ru: 'Скопировать ссылку', kg: 'Шилтемени көчүрүү', en: 'Copy link' },
  copied: { ru: 'Ссылка скопирована', kg: 'Шилтеме көчүрүлдү', en: 'Link copied' },
  more: { ru: 'Другие приложения', kg: 'Башка колдонмолор', en: 'Other apps' },
  // У Instagram нет кнопки «поделиться ссылкой» для сайтов — копируем ссылку и подсказываем, куда её вставить
  igHint: {
    ru: 'Ссылка скопирована. Вставьте её в Instagram: в историю (стикер «Ссылка») или в сообщение Direct.',
    kg: 'Шилтеме көчүрүлдү. Аны Instagramга чаптаңыз: окуяга («Шилтеме» стикери) же Direct билдирүүсүнө.',
    en: 'Link copied. Paste it into Instagram: in a story (the “Link” sticker) or a Direct message.',
  },
  copyFail: { ru: 'Не удалось скопировать — скопируйте адрес вручную:', kg: 'Көчүрүү мүмкүн болгон жок — даректи кол менен көчүрүңүз:', en: 'Could not copy — copy the address manually:' },
};

type Net = 'wa' | 'tg' | 'th' | 'ig' | 'fb' | 'x';
const NAMES: Record<Net, string> = { wa: 'WhatsApp', tg: 'Telegram', th: 'Threads', ig: 'Instagram', fb: 'Facebook', x: 'X' };

const Icon = ({ net }: { net: Net }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    {SOCIAL_ICONS[net]}
  </svg>
);

/**
 * Кнопки «Поделиться»: WhatsApp, Telegram, Facebook, X, Threads (во всплывающем меню — ещё Instagram), копирование ссылки и системное меню телефона.
 * row — строкой (под текстом статьи), menu — списком (во всплывающем меню).
 */
export const ShareMenu: React.FC<{
  url: string;
  title: string;
  lang: Language;
  variant?: 'row' | 'menu';
  /** Действие выполнено (во всплывающем меню — закрыть его); text — подтверждение, которое показать уже после закрытия */
  onDone?: (text?: string) => void;
}> = ({ url, title, lang, variant = 'row', onDone }) => {
  const [note, setNote] = useState<{ text: string; manual?: boolean } | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const text = `${title} ${url}`;
  // Каждая ссылка передаёт адрес именно этой публикации (/n/<id>) и, где сервис позволяет, её заголовок
  const links: Record<'wa' | 'tg' | 'th' | 'fb' | 'x', string> = {
    wa: `https://wa.me/?text=${encodeURIComponent(text)}`,
    tg: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    th: `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
    fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  };

  const copy = async (okText: string) => {
    try {
      await navigator.clipboard.writeText(url);
      if (onDone) onDone(okText);
      else {
        setNote({ text: okText });
        window.setTimeout(() => setNote(null), 6000);
      }
    } catch {
      // Не скопировалось — меню остаётся открытым: в нём адрес для ручного копирования
      setNote({ text: T.copyFail[lang], manual: true });
    }
  };
  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* пользователь закрыл системное меню */
    }
    onDone?.();
  };
  // Instagram: на телефоне — системное меню (там есть Instagram, если он установлен), на компьютере — копия ссылки с подсказкой
  const instagram = () => {
    const phone = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (canNativeShare && phone) void nativeShare();
    else void copy(T.igHint[lang]);
  };

  const item =
    variant === 'row'
      ? 'inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-line bg-white text-sm font-bold text-[#12327A] hover:bg-[#eef2f9] focus-visible:ring-2 focus-visible:ring-[#12327A]'
      : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0f1b33] hover:bg-[#eef2f9] focus-visible:ring-2 focus-visible:ring-[#12327A] text-left';
  // В строке под статьёй — компактные круглые значки (44 px — удобно пальцем), название — во всплывающей подсказке
  const iconItem =
    'inline-flex items-center justify-center w-11 h-11 rounded-full border border-line bg-white text-meta hover:text-brand-navy hover:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-[#12327A] transition-colors';
  const nets: ('wa' | 'tg' | 'fb' | 'x' | 'th')[] = ['wa', 'tg', 'fb', 'x', 'th'];

  return (
    <div>
      <ul className={variant === 'row' ? 'flex flex-wrap items-center gap-2' : 'space-y-0.5'}>
        {nets.map((net) => (
          <li key={net}>
            {/* меню закрываем после перехода: если убрать ссылку со страницы во время нажатия, браузер не откроет её */}
            <a
              href={links[net]}
              target="_blank"
              rel="noopener noreferrer"
              className={variant === 'row' ? iconItem : item}
              aria-label={variant === 'row' ? NAMES[net] : undefined}
              title={variant === 'row' ? NAMES[net] : undefined}
              onClick={() => window.setTimeout(() => onDone?.(), 0)}
            >
              <Icon net={net} />
              {variant === 'menu' && NAMES[net]}
            </a>
          </li>
        ))}
        {/* Instagram не принимает ссылки сайтов — только во всплывающем меню (копия ссылки с подсказкой) */}
        {variant === 'menu' && (
          <li>
            <button type="button" onClick={instagram} className={item}>
              <Icon net="ig" />
              {NAMES.ig}
            </button>
          </li>
        )}
        <li>
          <button type="button" onClick={() => copy(T.copied[lang])} className={item}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              link
            </span>
            {T.copy[lang]}
          </button>
        </li>
        {canNativeShare && (
          <li>
            <button type="button" onClick={nativeShare} className={item}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                ios_share
              </span>
              {T.more[lang]}
            </button>
          </li>
        )}
      </ul>
      <p aria-live="polite" className="empty:hidden mt-2 text-xs font-semibold text-[#0f6b3a]">
        {note && (
          <>
            {note.text}
            {note.manual && <span className="block mt-1 font-normal text-gray-700 break-all select-all">{url}</span>}
          </>
        )}
      </p>
    </div>
  );
};

export const SHARE_TITLE = T.title;
export const SHARE_ARTICLE_TITLE = T.articleTitle;
