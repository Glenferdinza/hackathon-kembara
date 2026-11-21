'use client';

import React, { useId, useState } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'data',
  className = '',
}: PaginationProps) {
  const jumpInputId = useId();
  const [jumpPageInput, setJumpPageInput] = useState(String(currentPage));
  const [prevCurrentPage, setPrevCurrentPage] = useState(currentPage);

  if (prevCurrentPage !== currentPage) {
    setPrevCurrentPage(currentPage);
    setJumpPageInput(String(currentPage));
  }

  if (totalItems <= 0 || totalPages <= 0) {
    return null;
  }

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(totalPages, parsed));
      onPageChange(clamped);
      setJumpPageInput(String(clamped));
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Generate numbered pages with smart ellipsis
  const getPageNumbers = (compact: boolean): (number | '...')[] => {
    const maxVisible = compact ? 5 : 7;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (compact) {
      if (currentPage <= 2) {
        return [1, 2, 3, '...', totalPages];
      }
      if (currentPage >= totalPages - 1) {
        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', currentPage, '...', totalPages];
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);
  const desktopPages = getPageNumbers(false);
  const mobilePages = getPageNumbers(true);

  const renderPageItems = (pages: (number | '...')[], compact: boolean) =>
    pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span
            key={`ellipsis-${compact ? 'm' : 'd'}-${idx}`}
            className="px-1 py-1 text-slate-400 font-semibold select-none text-xs"
          >
            &hellip;
          </span>
        );
      }
      const isCurrent = p === currentPage;
      return (
        <button
          key={`page-${compact ? 'm' : 'd'}-${p}`}
          type="button"
          onClick={() => onPageChange(p as number)}
          className={`${
            compact ? 'min-w-[34px] h-8' : 'min-w-[28px] h-7'
          } px-2 flex items-center justify-center rounded text-xs transition-colors tabular-nums cursor-pointer ${
            isCurrent
              ? 'bg-[#1E40AF] text-white font-bold'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }`}
        >
          {p}
        </button>
      );
    });

  return (
    <div
      className={`py-3.5 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Row 1 (Mobile: Summary Left + Per Page Right) / Left Group (Desktop) */}
      <div className="flex items-center justify-between gap-2 w-full lg:w-auto lg:justify-start lg:gap-3">
        <span className="text-slate-600 tabular-nums">
          <span className="hidden sm:inline">Menampilkan </span>
          <span className="font-semibold text-slate-900">{startIdx.toLocaleString('id-ID')}</span>
          {' - '}
          <span className="font-semibold text-slate-900">{endIdx.toLocaleString('id-ID')}</span>
          {' dari '}
          <span className="font-semibold text-slate-900">{totalItems.toLocaleString('id-ID')}</span>{' '}
          {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 lg:pl-2.5 lg:border-l lg:border-slate-300 shrink-0">
            <span className="hidden sm:inline text-slate-500">Tampilkan</span>
            <select
              aria-label="Jumlah data per halaman"
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                onPageSizeChange(newSize);
              }}
              className="px-2 py-1.5 sm:py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row 2 & 3 (Mobile) / Right Group (Desktop): Flat Numbered Bar & Jump To Page */}
      <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-2.5 sm:gap-2 w-full lg:w-auto">
        <div className="flex items-center justify-center gap-1 whitespace-nowrap max-w-full">
          <button
            type="button"
            title="Halaman Sebelumnya"
            aria-label="Halaman Sebelumnya"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="min-w-[34px] h-8 sm:min-w-[28px] sm:h-7 px-2 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-bold transition-colors cursor-pointer"
          >
            &lt;
          </button>

          <div className="flex sm:hidden items-center gap-1">
            {renderPageItems(mobilePages, true)}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {renderPageItems(desktopPages, false)}
          </div>

          <button
            type="button"
            title="Halaman Berikutnya"
            aria-label="Halaman Berikutnya"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="min-w-[34px] h-8 sm:min-w-[28px] sm:h-7 px-2 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-bold transition-colors cursor-pointer"
          >
            &gt;
          </button>
        </div>

        {/* Jump To Page Input */}
        {totalPages > 3 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center justify-center gap-1.5 sm:pl-2 sm:border-l sm:border-slate-300"
          >
            <label htmlFor={jumpInputId} className="text-slate-600 whitespace-nowrap">
              Ke hal
            </label>
            <input
              id={jumpInputId}
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-14 h-8 sm:h-7 px-2 bg-white border border-slate-300 rounded text-center text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] tabular-nums"
            />
            <button
              type="submit"
              className="h-8 sm:h-7 px-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
