'use client';

import React, { useState } from 'react';

interface ExpandableMetaLineProps {
  text: string;
  maxChars?: number;
  className?: string;
}

/**
 * Full-width compact metadata subtitle for mobile cards.
 * Keeps normal-length text crisp on one line without ellipsis,
 * and reveals an inline expand toggle only when unusually long.
 */
export function ExpandableMetaLine({
  text,
  maxChars = 58,
  className = '',
}: ExpandableMetaLineProps) {
  const [expanded, setExpanded] = useState(false);
  const isExtraLong = text.length > maxChars;

  if (!isExtraLong) {
    return (
      <div className={`text-[11px] text-slate-600 leading-snug ${className}`}>
        {text}
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between gap-2 text-[11px] text-slate-600 leading-snug ${className}`}>
      <span className={expanded ? 'break-words' : 'truncate'}>{text}</span>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-[#1E40AF] font-semibold shrink-0 hover:underline cursor-pointer"
      >
        {expanded ? 'Ringkas' : 'Lihat'}
      </button>
    </div>
  );
}
