'use client';

import React, { useState, useEffect } from 'react';

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
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
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
  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`py-3.5 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Left: Summary & Per Page Dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-600">
          Menampilkan <span className="font-semibold text-slate-900">{startIdx.toLocaleString('id-ID')}</span> -{' '}
          <span className="font-semibold text-slate-900">{endIdx.toLocaleString('id-ID')}</span> dari{' '}
          <span className="font-semibold text-slate-900">{totalItems.toLocaleString('id-ID')}</span> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            <span className="text-slate-500">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                onPageSizeChange(newSize);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF]"
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

      {/* Right: Numbered Pagination Bar & Jump To Page */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation Buttons and Numbers */}
        <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
          {/* First Page */}
          <button
            type="button"
            title="Halaman Pertama"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors"
          >
            &laquo;
          </button>

          {/* Previous Page */}
          <button
            type="button"
            title="Halaman Sebelumnya"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors"
          >
            &lsaquo; Prev
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-slate-400 font-semibold select-none text-[11px]"
                >
                  &hellip;
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded text-xs transition-colors ${
                  isCurrent
                    ? 'bg-[#1E40AF] text-white font-bold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                }`}
              >
                {p}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            title="Halaman Berikutnya"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Next &rsaquo;
          </button>

          {/* Last Page */}
          <button
            type="button"
            title="Halaman Terakhir"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed font-medium transition-colors"
          >
            &raquo;
          </button>
        </div>

        {/* Jump To Page Input */}
        {totalPages > 3 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            <span className="text-slate-500 whitespace-nowrap">Ke hal:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-14 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF]"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded text-xs transition-colors"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
