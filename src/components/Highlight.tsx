import React from 'react';
import { highlightParts } from '../utils/search';

/** Текст, в котором слова из поискового запроса выделены жирным */
export const Highlight: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  return (
    <>
      {highlightParts(text, query).map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-[#fff3b0] text-inherit font-extrabold rounded-sm px-0.5 -mx-0.5">
            {p.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
    </>
  );
};
