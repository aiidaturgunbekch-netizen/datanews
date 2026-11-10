import { useEdit } from './EditButton';
import React, { useEffect, useState } from 'react';
import { Announcement } from '../types';

const CATEGORY_STYLE: Record<string, { icon: string; bg: string }> = {
  concerts: { icon: 'music_note', bg: 'from-[#3b1d8f] via-[#6d28d9] to-[#db2777]' },
  festivals: { icon: 'festival', bg: 'from-[#0f766e] via-[#14b8a6] to-[#facc15]' },
  fairs: { icon: 'storefront', bg: 'from-[#365314] via-[#65a30d] to-[#facc15]' },
  exhibitions: { icon: 'museum', bg: 'from-[#1e293b] via-[#475569] to-[#0ea5e9]' },
  culture: { icon: 'theater_comedy', bg: 'from-[#4c0519] via-[#9f1239] to-[#f59e0b]' },
  sport: { icon: 'sports_soccer', bg: 'from-[#14532d] via-[#16a34a] to-[#a3e635]' },
  cinema: { icon: 'movie', bg: 'from-[#111827] via-[#7f1d1d] to-[#dc2626]' },
  education: { icon: 'school', bg: 'from-[#0c4a6e] via-[#0284c7] to-[#22d3ee]' },
  gov: { icon: 'campaign', bg: 'from-[#0d2459] via-[#12327A] to-[#6366f1]' },
  water: { icon: 'water_drop', bg: 'from-[#0c4a6e] via-[#0369a1] to-[#38bdf8]' },
  electricity: { icon: 'bolt', bg: 'from-[#78350f] via-[#d97706] to-[#fde047]' },
  roads: { icon: 'traffic', bg: 'from-[#064e3b] via-[#059669] to-[#34d399]' },
  repairs: { icon: 'construction', bg: 'from-[#7c2d12] via-[#ea580c] to-[#fdba74]' },
  hazard: { icon: 'thunderstorm', bg: 'from-[#1e293b] via-[#475569] to-[#94a3b8]' },
  state: { icon: 'account_balance', bg: 'from-[#0d2459] via-[#12327A] to-[#3b82f6]' },
  laws: { icon: 'gavel', bg: 'from-[#334155] via-[#64748b] to-[#cbd5e1]' },
  // без отдельной иллюстрации: однотонная заставка с значком (тоже с подписью «фото нет»)
  notices: { icon: 'campaign', bg: 'from-[#134e4a] via-[#0f766e] to-[#20C7B5]' },
  news: { icon: 'newspaper', bg: 'from-[#0d2459] via-[#12327A] to-[#20C7B5]' },
  business: { icon: 'business_center', bg: 'from-[#0d2459] via-[#1e3a8a] to-[#0ea5e9]' },
  tech: { icon: 'memory', bg: 'from-[#0f172a] via-[#12327A] to-[#20C7B5]' },
};

/** Тематическая иллюстрация категории — запасной вариант, если фото не загрузилось */
const CATEGORY_ILLUSTRATION: Record<string, string> = {
  concerts: 'concert', festivals: 'festival', fairs: 'fair', exhibitions: 'exhibition', culture: 'culture', sport: 'sport',
  cinema: 'cinema', education: 'education', gov: 'gov', water: 'water', electricity: 'power', roads: 'roads', repairs: 'repairs',
  hazard: 'hazard', state: 'gov', laws: 'law',
};

/**
 * Фото / афиша события.
 *  - по умолчанию изображение вписывается целиком (object-contain), без обрезки лиц и текста афиши,
 *    а пустые поля заполняются размытой копией того же изображения;
 *  - imageFit: 'cover' заполняет рамку с фокусом imagePosition (для широких баннеров);
 *  - если фото нет или оно не загрузилось — тематическая заставка категории (не выдаётся за фото).
 */
type Lang = 'ru' | 'kg' | 'en';
const REASON: Record<'missing' | 'failed' | 'illustration', Record<Lang, string>> = {
  // Это иллюстрация раздела, а не снимок события — подпись говорит об этом прямо
  missing: { ru: 'Иллюстрация — фото нет', kg: 'Иллюстрация — сүрөт жок', en: 'Illustration — no photo' },
  failed: { ru: 'Фото не загрузилось', kg: 'Сүрөт жүктөлгөн жок', en: 'Photo failed to load' },
  illustration: { ru: 'Иллюстрация', kg: 'Иллюстрация', en: 'Illustration' },
};

const ReasonTag: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate text-[10px] font-semibold text-white bg-black/45 px-1.5 py-0.5 rounded">{text}</span>
);

/**
 * Единственный компонент изображения публикации: карточки главной, категорий, календаря и подробное окно
 * берут картинку из одного поля `imageUrl`, поэтому фото не может быть «только в подробностях».
 *  - compact — маленькая миниатюра (без подписи причины).
 */
export const EventImage: React.FC<{
  item: Announcement;
  className?: string;
  lang?: Lang;
  compact?: boolean;
  /** Страница новости: фото в своём оригинальном размере и пропорциях — без рамки, фона и обрезки */
  natural?: boolean;
  /** Заполнить рамку целиком (миниатюры рядом с афишей), независимо от imageFit публикации */
  fill?: boolean;
}> = ({ item, className = '', lang = 'ru', compact = false, natural = false, fill = false }) => {
  const [failed, setFailed] = useState(false);
  // служебные подписи («Иллюстрация — фото нет», «Фото не загрузилось») видят только админ и редакция
  const staff = useEdit().canEdit(item);
  // другое изображение (например, переход к соседнему событию в том же окне) — пробуем загрузить заново
  useEffect(() => {
    setFailed(false);
  }, [item.imageUrl]);
  const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.gov;
  const fallback = CATEGORY_ILLUSTRATION[item.category];
  const isIllustration = Boolean(item.imageUrl?.startsWith('/illustrations/'));

  // Фото нет или не загрузилось — тематическая иллюстрация категории с понятной причиной
  if ((!item.imageUrl || (failed && !isIllustration)) && fallback) {
    return (
      <div className={`relative overflow-hidden bg-[#0d2459] ${className}`} role="img" aria-label={item.imageAlt || item.title[lang] || item.title.ru}>
        <img src={`/illustrations/${fallback}.svg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        {!compact && staff && <ReasonTag text={REASON[item.imageUrl ? 'failed' : 'missing'][lang]} />}
      </div>
    );
  }

  if (item.imageUrl && !failed && natural && !isIllustration) {
    return (
      <img
        src={item.imageUrl}
        alt={item.imageAlt || item.title[lang] || item.title.ru}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        // размеры рамки из className не применяются: фото показывается в своих пропорциях
        className={`block max-w-full h-auto max-h-[80vh] mx-auto rounded-xl ${className.includes('mt-6') ? 'mt-6' : ''}`}
        data-natural-photo
      />
    );
  }

  if (item.imageUrl && !failed) {
    const cover = fill || item.imageFit === 'cover';
    const alt = item.imageAlt || item.title[lang] || item.title.ru;
    // В карточках фото вписывается целиком; поля по краям — нейтральные, без размытого фона
    return (
      <div className={`relative overflow-hidden ${cover || isIllustration ? 'bg-[#0d2459]' : 'bg-[#f3f6fc]'} ${className}`}>
        <img
          src={item.imageUrl}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={cover ? { objectPosition: item.imagePosition || 'center 25%' } : undefined}
          className={`absolute inset-0 w-full h-full ${cover ? 'object-cover' : 'object-contain'}`}
        />
        {/* Настоящее фото — чистое, без подписей поверх; автор и лицензия фото — в «Первоисточниках» статьи */}
        {!compact && staff && isIllustration && <ReasonTag text={REASON.illustration[lang]} />}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${style.bg} flex items-center justify-center ${className}`}
      role="img"
      aria-label={item.title.ru}
    >
      <span className="material-symbols-outlined text-white/85 text-[48px]">{style.icon}</span>
      {!compact && staff && <ReasonTag text={REASON[item.imageUrl ? 'failed' : 'missing'][lang]} />}
    </div>
  );
};
