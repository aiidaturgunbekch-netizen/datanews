import React from 'react';

/** Пропорции горизонтального логотипа (ширина / высота) — по утверждённому файлу, без искажений */
const RATIO = { light: 1105 / 266, plate: 1177 / 338 };

/**
 * Утверждённый горизонтальный логотип DataNews Кыргызстан (public/brand/datanews-logo-horizontal-original.png).
 *  - light — тот же логотип без собственного фона, для тёмно-синей шапки;
 *  - plate — с фирменным фоном логотипа и скруглёнными углами, для светлых мест (меню, подвал, страница новости).
 * Только масштаб и обрезка пустых полей — цвета и начертание не меняются.
 */
export const BrandLogo: React.FC<{ height: number; variant?: 'light' | 'plate'; className?: string; alt?: string }> = ({
  height,
  variant = 'light',
  className = '',
  alt = 'DataNews Кыргызстан',
}) => {
  const width = Math.round(height * RATIO[variant]);
  // Файл с запасом по высоте (×2–×3) — чёткость на экранах высокой плотности
  const file = variant === 'light' ? 96 : 192;
  return (
    <img
      src={`/brand/datanews-logo-${variant}-${file}.webp`}
      width={width}
      height={height}
      alt={alt}
      decoding="async"
      draggable={false}
      className={`block select-none shrink-0 ${variant === 'plate' ? 'rounded-lg' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};
