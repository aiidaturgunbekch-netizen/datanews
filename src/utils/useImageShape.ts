import { useEffect, useState } from 'react';

/**
 * Форма фото по его настоящим размерам: 'tall' — вертикальная или квадратная афиша (ширина < 1,25 высоты),
 * 'wide' — горизонтальное фото. null — ещё не известно, фото нет или это иллюстрация раздела.
 */
export type ImageShape = 'tall' | 'wide' | null;
export const shapeOf = (w: number, h: number): ImageShape => (!w || !h ? null : w / h < 1.25 ? 'tall' : 'wide');

export const useImageShape = (url?: string): ImageShape => {
  const [shape, setShape] = useState<{ url?: string; s: ImageShape }>({ s: null });
  useEffect(() => {
    if (!url || url.startsWith('/illustrations/') || typeof Image === 'undefined') return;
    let alive = true;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => alive && setShape({ url, s: shapeOf(img.naturalWidth, img.naturalHeight) });
    img.onerror = () => alive && setShape({ url, s: null });
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return shape.url === url ? shape.s : null;
};
