'use client';

import React, { useMemo } from 'react';
import { encodeCode128 } from '@/lib/code128';

interface Code128SvgProps {
  value: string;
  barHeight?: number;
  quietZoneModules?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Pure vector Code 128 1D Barcode SVG component.
 * Uses pure #000000 bars on #FFFFFF background with crispEdges for reliable
 * reading by USB laser/CCD scanners and mobile cameras, even on curved tool tubes.
 */
export function Code128Svg({
  value,
  barHeight = 44,
  quietZoneModules = 10,
  className = 'w-full h-10',
  ariaLabel,
}: Code128SvgProps) {
  const encoded = useMemo(
    () => encodeCode128(value, quietZoneModules),
    [value, quietZoneModules]
  );

  if (!encoded) {
    return (
      <div className="w-full py-2 text-center text-[10px] font-mono text-slate-400">
        Kode tidak valid
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel || `Barcode Code 128 ${encoded.text}`}
      viewBox={`0 0 ${encoded.totalModules} ${barHeight}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={0} y={0} width={encoded.totalModules} height={barHeight} fill="#FFFFFF" />
      {encoded.bars.map((bar, idx) => (
        <rect
          key={`${bar.x}-${idx}`}
          x={bar.x}
          y={0}
          width={bar.width}
          height={barHeight}
          fill="#000000"
        />
      ))}
    </svg>
  );
}
