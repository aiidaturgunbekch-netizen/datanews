import React from 'react';

/**
 * Официальный логотип DataNews Кыргызстан — утверждённое изображение (public/brand/datanews-logo-original.webp),
 * без изменений: только пропорциональное уменьшение (256 и 512 px — для обычных и чётких экранов).
 * Квадратная композиция: значок-календарь с часами, «DataNews», подпись «КЫРГЫЗСТАН».
 * Фон логотипа — фирменный тёмно-синий #041E52 (--color-brand-navy); на нём логотип сливается с шапкой.
 */
export const BrandLogo: React.FC<{ size: number; className?: string; alt?: string }> = ({ size, className = '', alt = 'DataNews Кыргызстан' }) => (
  <img
    src={size > 128 ? '/brand/datanews-logo-512.webp' : '/brand/datanews-logo-256.webp'}
    srcSet={size > 128 ? undefined : '/brand/datanews-logo-256.webp 1x, /brand/datanews-logo-512.webp 2x'}
    width={size}
    height={size}
    alt={alt}
    decoding="async"
    draggable={false}
    className={`block select-none shrink-0 ${className}`}
    style={{ width: size, height: size }}
  />
);
