'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  loading?: boolean;
  label?: string;
}

export function RefreshButton({
  onRefresh,
  loading = false,
  label = 'Segarkan Data',
}: RefreshButtonProps) {
  const { showToast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const handleClick = async () => {
    if (loading || isSpinning) return;
    setIsSpinning(true);
    setJustRefreshed(false);
    try {
      await Promise.resolve(onRefresh());
      setJustRefreshed(true);
      showToast('Data berhasil disegarkan.', 'success');
      setTimeout(() => {
        setJustRefreshed(false);
      }, 2200);
    } finally {
      setTimeout(() => {
        setIsSpinning(false);
      }, 350);
    }
  };

  const activeSpin = loading || isSpinning;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={activeSpin}
      aria-label={label}
      title={justRefreshed ? 'Data telah diperbarui' : label}
      className="group relative w-8 h-8 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60 shrink-0"
    >
      {justRefreshed && !activeSpin ? (
        <svg
          className="w-4 h-4 text-[#1E40AF]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      ) : (
        <svg
          className={`w-4 h-4 ${activeSpin ? 'animate-spin text-[#1E40AF]' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      )}
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
        {justRefreshed ? 'Data Terbaru' : activeSpin ? 'Menyegarkan...' : label}
      </span>
    </button>
  );
}

