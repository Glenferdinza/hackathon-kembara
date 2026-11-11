'use client';

import React from 'react';

interface OperationalKpiData {
  totalPhysicalUnits: number;
  totalAvailable: number;
  totalBorrowed: number;
  totalToolTypes?: number;
  totalToolUnits?: number;
  availableTools?: number;
  borrowedTools?: number;
  totalInventoryTypes?: number;
  totalInventoryUnits?: number;
  availableInventories?: number;
  borrowedInventories?: number;
  activeLoansCount?: number;
  overdueLoansCount: number;
  dueSoonCount: number;
  lowStockCount: number;
}

interface OperationalStatsStripProps {
  kpi: OperationalKpiData;
}

export function OperationalStatsStrip({ kpi }: OperationalStatsStripProps) {
  const total = kpi.totalPhysicalUnits || 1;
  const formatPercentage = (value: number, totalUnits: number) => {
    if (!totalUnits || totalUnits <= 0 || value <= 0) return '0%';
    const pct = (value / totalUnits) * 100;
    if (pct > 0 && pct < 0.1) return '<0,1%';
    if (pct > 99.9 && pct < 100) return '99,9%';
    return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1).replace('.', ',')}%`;
  };

  const availablePct = formatPercentage(kpi.totalAvailable, total);
  const borrowedPct = formatPercentage(kpi.totalBorrowed, total);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 border border-slate-200 rounded py-3 bg-white">
      {/* 1. TOTAL FISIK */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          TOTAL FISIK
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-slate-900 tabular-nums leading-none">
            {kpi.totalPhysicalUnits.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            Unit
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Tool &amp; Inventaris
        </div>
      </div>

      {/* 2. STOK TERSEDIA */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          STOK TERSEDIA
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-[#1E40AF] tabular-nums leading-none">
            {kpi.totalAvailable.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {availablePct}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Siap dipinjam di rak
        </div>
      </div>

      {/* 3. SEDANG DIPINJAM */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          SEDANG DIPINJAM
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-slate-900 tabular-nums leading-none">
            {kpi.totalBorrowed.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {borrowedPct}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Di lantai produksi
        </div>
      </div>

      {/* 4. JATUH TEMPO */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          JATUH TEMPO
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-slate-900 tabular-nums leading-none">
            {kpi.dueSoonCount}
          </span>
          {kpi.dueSoonCount > 0 && (
            <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
              Hari Ini
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Batas akhir shift
        </div>
      </div>

      {/* 5. TERLAMBAT */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          TERLAMBAT
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-slate-900 tabular-nums leading-none">
            {kpi.overdueLoansCount}
          </span>
          {kpi.overdueLoansCount > 0 && (
            <span className="text-[10px] font-semibold text-slate-700 whitespace-nowrap">
              Overdue
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Melewati batas waktu
        </div>
      </div>

      {/* 6. STOK MENIPIS */}
      <div className="px-3.5 py-1 min-w-0">
        <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">
          STOK MENIPIS
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="text-xl font-bold text-slate-900 tabular-nums leading-none">
            {kpi.lowStockCount}
          </span>
          {kpi.lowStockCount > 0 && (
            <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
              &le; Min
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap truncate">
          Perlu pengadaan baru
        </div>
      </div>
    </div>
  );
}

