import React from 'react';

interface LogoProps {
  className?: string;
  /** На узких экранах (до 420px) показывать только значок */
  compactOnMobile?: boolean;
  isLightMode?: boolean; // if on dark background
  /** Язык подписи под названием: КЫРГЫЗСТАН / KYRGYZSTAN */
  lang?: 'ru' | 'kg' | 'en';
}

export const Logo: React.FC<LogoProps> = ({ className = 'h-11', isLightMode = false, compactOnMobile = false, lang = 'ru' }) => {
  const navyColor = isLightMode ? '#ffffff' : '#12327A';
  const turquoiseColor = '#20C7B5';
  const subtextColor = isLightMode ? '#dbe1ff' : '#1b3f94';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Calendar with Turquoise Clock */}
      <svg
        className="h-full w-auto aspect-square flex-shrink-0"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Calendar Body Outline */}
        <rect
          x="3"
          y="7"
          width="32"
          height="31"
          rx="6"
          stroke={navyColor}
          strokeWidth="3.2"
          fill="none"
        />
        {/* Top Rings/Hooks */}
        <rect x="9" y="3" width="3.5" height="7" rx="1.75" fill={navyColor} />
        <rect x="25" y="3" width="3.5" height="7" rx="1.75" fill={navyColor} />
        
        {/* Horizontal dividing line under header */}
        <path d="M4 16H34" stroke={navyColor} strokeWidth="2.8" strokeLinecap="round" />
        
        {/* Calendar Grid Dots */}
        <rect x="8" y="21" width="3.2" height="3.2" rx="0.8" fill={navyColor} />
        <rect x="15" y="21" width="3.2" height="3.2" rx="0.8" fill={navyColor} />
        <rect x="8" y="27" width="3.2" height="3.2" rx="0.8" fill={navyColor} />
        <rect x="15" y="27" width="3.2" height="3.2" rx="0.8" fill={navyColor} />
        
        {/* Turquoise Clock Circle Overlaid at Bottom Right */}
        <circle
          cx="30"
          cy="30"
          r="10.5"
          fill={turquoiseColor}
          stroke={isLightMode ? '#0d2459' : '#ffffff'}
          strokeWidth="2.8"
        />
        {/* Clock Hands */}
        <path
          d="M30 25.5V30.5L33.5 32"
          stroke={navyColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Typography: DataNews + КЫРГЫЗСТАН */}
      <div className={`${compactOnMobile ? 'hidden min-[420px]:flex' : 'flex'} flex-col justify-center leading-none`}>
        <div className="flex items-baseline font-black tracking-tight text-[22px] sm:text-[24px]">
          <span style={{ color: navyColor }}>Data</span>
          <span style={{ color: turquoiseColor }}>News</span>
        </div>
        <span
          className="text-[9.5px] sm:text-[10px] font-extrabold tracking-[0.22em] uppercase mt-0.5"
          style={{ color: subtextColor }}
        >
          {lang === 'en' ? 'KYRGYZSTAN' : 'КЫРГЫЗСТАН'}
        </span>
      </div>
    </div>
  );
};
