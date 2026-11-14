import React from 'react';

/**
 * Название раздела для подписей ЗАГЛАВНЫМИ буквами: соединительное «и» / «жана» / «and» остаётся строчным,
 * иначе «ИИ И IT-ТЕХНОЛОГИИ» сливается в одно слово.
 */
export const CatLabel: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\s(?:и|жана|and)\s)/i);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="normal-case">
            {p.toLowerCase()}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
};
