'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { QuickBarcodeBar } from '@/components/dashboard/QuickBarcodeBar';
import { OperationalStatsStrip } from '@/components/dashboard/OperationalStatsStrip';
import { BarChartSection } from '@/components/dashboard/BarChartSection';
import { DonutChartSection } from '@/components/dashboard/DonutChartSection';
import { ImportExcelModal } from '@/components/modals/ImportExcelModal';
import { ExportExcelModal } from '@/components/modals/ExportExcelModal';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { WhatsAppIcon } from '@/components/ui/ContactIcons';
import { ExpandableMetaLine } from '@/components/ui/ExpandableMetaLine';
import {
  fetchDashboardSummary,
  invalidateDashboardSummaryCache,
  type DashboardSummaryResponse,
} from '@/lib/dashboard-client';

const EMPTY_DASHBOARD_KPI: DashboardSummaryResponse['kpi'] = {
  totalPhysicalUnits: 0,
  totalAvailable: 0,
  totalBorrowed: 0,
  totalToolTypes: 0,
  totalToolUnits: 0,
  availableTools: 0,
  borrowedTools: 0,
  totalInventoryTypes: 0,
  totalInventoryUnits: 0,
  availableInventories: 0,
  borrowedInventories: 0,
  activeLoansCount: 0,
  overdueLoansCount: 0,
  dueSoonCount: 0,
  lowStockCount: 0,
};

interface DashboardUpcomingLoan {
  id: string;
  transactionNumber: string;
  borrowerName: string;
  borrowerNik: string;
  borrowerDept: string;
  borrowerPhone?: string | null;
  itemsSummary: string;
  loanDate: string;
  expectedReturnDate: string;
  statusLabel: string;
}

type DashboardData = DashboardSummaryResponse;

function formatWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Tabs: STOK, PINJAMAN AKTIF, NOTIFIKASI
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOANS' | 'NOTIF'>('STOCK');
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilterType, setStockFilterType] = useState('ALL');
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);

  // Tab 2 & 3 Pagination
  const [loanPage, setLoanPage] = useState(1);
  const [loanPageSize, setLoanPageSize] = useState(10);
  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(10);
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({});

  const toggleExpandLoan = (id: string) => {
    setExpandedLoanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Perpanjang tenggat modal
  const [extendingLoan, setExtendingLoan] = useState<DashboardUpcomingLoan | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    const json = await fetchDashboardSummary(forceRefresh);
    if (json) {
      setData(json);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    invalidateDashboardSummaryCache();
    try {
      await loadDashboardData(true);
    } catch (err) {
      console.error('Gagal memuat dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      setLoading(true);
      try {
        const json = await fetchDashboardSummary();
        if (active && json) {
          setData(json);
        }
      } catch (err) {
        console.error('Gagal memuat dashboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const kpi = data?.kpi || EMPTY_DASHBOARD_KPI;
  const barChartData = data?.barChartData || [];
  const donutChartData = data?.donutChartData || [];
  const allStockItems = data?.allStockItems || [];
  const upcomingLoans = data?.upcomingLoans || [];
  const notifications = data?.notifications || [];
  const actionItems = data?.actionItems || [];

  const filteredStock = allStockItems.filter((item) => {
    const matchSearch =
      item.code?.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.name?.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.category?.toLowerCase().includes(stockSearch.toLowerCase());
    const matchType =
      stockFilterType === 'ALL'
        ? true
        : stockFilterType === 'LOW'
        ? item.isLowStock
        : item.type === stockFilterType;
    return matchSearch && matchType;
  });

  const totalStockPages = Math.ceil(filteredStock.length / stockPageSize) || 1;
  const paginatedStock = filteredStock.slice(
    (stockPage - 1) * stockPageSize,
    stockPage * stockPageSize
  );

  const totalLoanPages = Math.ceil(upcomingLoans.length / loanPageSize) || 1;
  const paginatedLoans = upcomingLoans.slice(
    (loanPage - 1) * loanPageSize,
    loanPage * loanPageSize
  );

  const totalNotifPages = Math.ceil(notifications.length / notifPageSize) || 1;
  const paginatedNotifs = notifications.slice(
    (notifPage - 1) * notifPageSize,
    notifPage * notifPageSize
  );

  const handleOpenExtend = (loan: DashboardUpcomingLoan) => {
    setExtendingLoan(loan);
    const d = new Date(new Date(loan.expectedReturnDate).getTime() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setNewDueDate(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
    setExtendReason('Perpanjangan pekerjaan shift mesin lanjutan');
  };

  const handleSaveExtend = async () => {
    if (!extendingLoan || !newDueDate) return;
    setIsSubmittingExtend(true);
    try {
      const res = await fetch('/api/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: extendingLoan.id,
          newExpectedReturnDate: new Date(newDueDate).toISOString(),
          reason: extendReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal memperpanjang tenggat.', 'error');
      } else {
        showToast(`Tenggat transaksi ${extendingLoan.transactionNumber} berhasil diperpanjang.`, 'success');
        setExtendingLoan(null);
        fetchDashboardData();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 pb-4">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-sm lg:text-base font-semibold text-slate-900 tracking-tight uppercase">
              Beranda Operasional Tool Room
            </h1>
            <p className="text-xs text-slate-500">
              Monitoring ketersediaan perkakas, transaksi aktif, dan antrean pengembalian PT YPTI
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/loans"
              className="w-full sm:w-auto min-h-[42px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors inline-flex items-center justify-center sm:order-last whitespace-nowrap"
            >
              + Peminjaman Baru
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <RefreshButton onRefresh={fetchDashboardData} loading={loading} />

              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Impor XLSX
              </button>

              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Ekspor XLSX
              </button>
            </div>
          </div>
        </div>

        {/* 1. Loket Cepat Dispatch Barcode Gun */}
        <QuickBarcodeBar />

        {/* 2. Bilah Metrik KPI Operasional Dinamis */}
        <OperationalStatsStrip kpi={kpi} loading={loading && !data} />

        {/* 3. Visualisasi Grafik Komposisi & Stok */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 min-w-0 bg-white border border-slate-200 rounded p-3.5 sm:p-4">
            {loading && !data ? (
              <div className="py-12 text-center text-xs text-slate-600">Memuat grafik stok kategori...</div>
            ) : (
              <BarChartSection data={barChartData} />
            )}
          </div>
          <div className="lg:col-span-5 min-w-0 bg-white border border-slate-200 rounded p-3.5 sm:p-4">
            {loading && !data ? (
              <div className="py-12 text-center text-xs text-slate-600">Memuat grafik komposisi fisik...</div>
            ) : (
              <DonutChartSection data={donutChartData} />
            )}
          </div>
        </div>

        {/* 4. Antrean Tindakan Prioritas Admin */}
        {actionItems.length > 0 && (
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Menunggu Tindakan Prioritas Petugas ({actionItems.length})
              </span>
              <span className="text-xs text-slate-600">
                Antrean tugas mendesak yang memerlukan penanganan di Tool Room
              </span>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden space-y-2">
              {actionItems.map((act) => {
                const priorityLabel =
                  act.urgent || act.type === 'DANGER'
                    ? 'WAJIB'
                    : act.type === 'WARNING'
                    ? 'PERHATIAN'
                    : 'INFO';
                return (
                  <div key={act.id} className="bg-white border border-slate-200 rounded p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase ${
                          act.urgent || act.type === 'DANGER'
                            ? 'text-[#991B1B]'
                            : act.type === 'WARNING'
                            ? 'text-[#92400E]'
                            : 'text-[#1E40AF]'
                        }`}
                      >
                        {priorityLabel}
                      </span>
                      <Link
                        href={act.link}
                        className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1E40AF] border border-[#1E40AF]/40 rounded hover:bg-[#1E40AF] hover:text-white transition-colors"
                      >
                        <span>Tindak Lanjuti</span>
                        <span aria-hidden="true">&rarr;</span>
                      </Link>
                    </div>
                    <div className="text-[13px] font-bold text-slate-900">{act.title}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{act.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded bg-white">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading">
                    <th className="py-2.5 px-3 w-28 whitespace-nowrap">PRIORITAS</th>
                    <th className="py-2.5 px-3 w-56 whitespace-nowrap">AGENDA TINDAKAN</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">KETERANGAN &amp; DAMPAK</th>
                    <th className="py-2.5 px-3 text-right w-36 whitespace-nowrap">AKSI LANGSUNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actionItems.map((act) => {
                    const priorityLabel =
                      act.urgent || act.type === 'DANGER'
                        ? 'WAJIB'
                        : act.type === 'WARNING'
                        ? 'PERHATIAN'
                        : 'INFO';

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              act.urgent || act.type === 'DANGER'
                                ? 'font-bold text-[#991B1B]'
                                : act.type === 'WARNING'
                                ? 'font-semibold text-[#92400E]'
                                : 'font-medium text-[#1E40AF]'
                            }`}
                          >
                            {priorityLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {act.title}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-relaxed">
                          {act.description}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <Link
                            href={act.link}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1E40AF] hover:text-white hover:bg-[#1E40AF] border border-[#1E40AF]/30 rounded transition-colors"
                          >
                            <span>Tindak Lanjuti</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Tab Operasional: Stok, Pinjaman Aktif, dan Log Notifikasi */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="border-b border-slate-200 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('STOCK')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'STOCK'
                  ? 'text-[#1E40AF] border-[#1E40AF] bg-blue-50/40'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Katalog Stok &amp; Ambang Batas</span>
              <span className="text-[11px] font-semibold tabular-nums">
                ({allStockItems.length.toLocaleString('id-ID')})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LOANS')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LOANS'
                  ? 'text-[#1E40AF] border-[#1E40AF] bg-blue-50/40'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Sedang Dipinjam</span>
              <span className="text-[11px] font-semibold tabular-nums">
                ({upcomingLoans.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOTIF')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'NOTIF'
                  ? 'text-[#1E40AF] border-[#1E40AF] bg-blue-50/40'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Log Notifikasi Server</span>
              {notifications.length > 0 && (
                <span className="text-[11px] font-semibold tabular-nums">
                  ({notifications.length})
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: STOK BARANG */}
          {activeTab === 'STOCK' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="w-full sm:max-w-xs">
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => {
                      setStockSearch(e.target.value);
                      setStockPage(1);
                    }}
                    placeholder="Cari kode, nama barang, kategori..."
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    Filter Katalog
                  </label>
                  <select
                    value={stockFilterType}
                    onChange={(e) => {
                      setStockFilterType(e.target.value);
                      setStockPage(1);
                    }}
                    className="flex-1 sm:flex-initial min-w-0 max-w-full bg-white border border-slate-300 rounded px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                  >
                    <option value="ALL">Semua Barang ({allStockItems.length})</option>
                    <option value="Tool">Tool Mesin Saja</option>
                    <option value="Inventaris">Inventaris Saja</option>
                    <option value="LOW">Stok Menipis ({kpi.lowStockCount})</option>
                  </select>
                </div>
              </div>

              {/* Container Stok: Mobile Cards (<768px) + Desktop Table (>=768px) */}
              <div className="border border-slate-200 rounded bg-white overflow-hidden">
                {loading ? (
                  <SkeletonTable rows={6} cols={11} className="p-2" />
                ) : paginatedStock.length === 0 ? (
                  <EmptyState
                    title="Tidak Ada Barang Sesuai Filter"
                    description="Tidak ditemukan perkakas atau aset inventaris yang cocok dengan kriteria pencarian Anda."
                    actionLabel="Reset Pencarian"
                    onAction={() => {
                      setStockSearch('');
                      setStockFilterType('ALL');
                    }}
                  />
                ) : (
                  <>
                    {/* Mobile Cards (< 768px) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {paginatedStock.map((item) => (
                        <div key={item.id} className="p-3.5 space-y-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-slate-900 tabular-nums">
                                  {item.code} <span className="font-sans font-normal text-slate-600">| {item.type}</span>
                                </div>
                                <div className="text-[13px] font-bold text-slate-900 mt-0.5 leading-snug">
                                  {item.name}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 text-xs font-semibold ${
                                  item.isLowStock ? 'text-[#92400E]' : 'text-slate-700'
                                }`}
                              >
                                {item.isLowStock ? 'Stok Menipis' : 'Stok Aman'}
                              </span>
                            </div>
                            <ExpandableMetaLine text={`${item.category} · Rak ${item.location}`} />
                          </div>
                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center tabular-nums">
                            <div>
                              <div className="text-[11px] text-slate-600">Total</div>
                              <div className="font-bold text-slate-900">{item.totalStock}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-600">Siap</div>
                              <div className="font-bold text-[#1E40AF]">{item.availableStock}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-600">Pinjam</div>
                              <div className="font-bold text-slate-700">{item.borrowedStock}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-600">Servis</div>
                              <div className="font-bold text-slate-700">{item.repairStock}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[1100px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading sticky top-0 z-10">
                            <th className="py-2 px-3 whitespace-nowrap">KODE</th>
                            <th className="py-2 px-3 whitespace-nowrap">NAMA BARANG</th>
                            <th className="py-2 px-3 whitespace-nowrap">TIPE</th>
                            <th className="py-2 px-3 whitespace-nowrap">KATEGORI</th>
                            <th className="py-2 px-3 whitespace-nowrap">LOKASI RAK</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">TOTAL</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap text-[#1E40AF]">TERSEDIA</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">DIPINJAM</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap text-slate-700">PERAWATAN</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">MIN. STOK</th>
                            <th className="py-2 px-3 whitespace-nowrap">STATUS PERSEDIAAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedStock.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {item.code}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                                {item.name}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {item.type}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {item.category}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {item.location}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {item.totalStock} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-[#1E40AF] tabular-nums whitespace-nowrap">
                                {item.availableStock}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                {item.borrowedStock}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                {item.repairStock}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 tabular-nums whitespace-nowrap">
                                {item.minStock} {item.unit}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {item.isLowStock ? (
                                  <span className="text-xs font-bold text-[#92400E] whitespace-nowrap">
                                    Stok Menipis (&le; {item.minStock})
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                                    Stok Aman
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Reusable Enterprise Pagination */}
              <Pagination
                currentPage={stockPage}
                totalPages={totalStockPages}
                totalItems={filteredStock.length}
                pageSize={stockPageSize}
                onPageChange={(p) => setStockPage(p)}
                onPageSizeChange={(newSize) => {
                  setStockPageSize(newSize);
                  setStockPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                itemName="barang"
              />
            </div>
          )}

          {/* TAB 2: SEDANG DIPINJAM & PERPANJANG */}
          {activeTab === 'LOANS' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded bg-white overflow-hidden">
                {upcomingLoans.length === 0 ? (
                  <EmptyState
                    title="Tidak Ada Pinjaman Berjalan"
                    description="Seluruh perkakas dan inventaris sedang berada di rak penyimpanan Tool Room."
                  />
                ) : (
                  <>
                    {/* Mobile Cards (< 768px) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {paginatedLoans.map((loan) => {
                        const isExpanded = Boolean(expandedLoanIds[loan.id]);
                        const hasLongItems = (loan.itemsSummary?.length || 0) > 70;
                        return (
                          <div key={loan.id} className="p-4 space-y-3 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 leading-snug">
                                  {loan.borrowerName}
                                </div>
                                <div className="text-[11px] text-slate-600 tabular-nums mt-0.5 leading-snug break-words">
                                  {loan.transactionNumber} &middot; {loan.borrowerNik} &middot; {loan.borrowerDept}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 text-xs font-bold ${
                                  loan.statusLabel === 'Terlambat'
                                    ? 'text-[#991B1B]'
                                    : loan.statusLabel === 'Hari Ini'
                                    ? 'text-[#92400E]'
                                    : 'text-slate-600'
                                }`}
                              >
                                {loan.statusLabel}
                              </span>
                            </div>
                            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                              <div>
                                <div
                                  className={`text-xs text-slate-700 leading-relaxed ${
                                    isExpanded ? '' : 'line-clamp-2'
                                  }`}
                                >
                                  <span className="font-semibold text-slate-900">Barang: </span>
                                  {loan.itemsSummary}
                                </div>
                                {hasLongItems && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandLoan(loan.id)}
                                    className="mt-1 text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                                  >
                                    {isExpanded ? 'Ringkas daftar barang' : 'Lihat semua barang'}
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 tabular-nums">
                                Jatuh tempo{' '}
                                <strong className="text-slate-900">
                                  {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleOpenExtend(loan)}
                                className="flex-1 min-h-[42px] px-3 py-2 text-xs font-semibold text-[#1E40AF] bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                              >
                                Perpanjang Tenggat
                              </button>
                              {loan.borrowerPhone && (
                                <a
                                  href={`https://wa.me/${formatWaNumber(loan.borrowerPhone)}?text=${encodeURIComponent(
                                    `Yth. Bpk/Ibu ${loan.borrowerName}, Petugas Tool Room PT YPTI menginformasikan pengingat pengembalian perkakas untuk transaksi ${loan.transactionNumber} (${loan.itemsSummary}) dengan batas tenggat ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}. Terima kasih.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Kirim Pengingat WhatsApp"
                                  title="Kirim Pengingat WhatsApp"
                                  className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded inline-flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  <WhatsAppIcon className="w-4 h-4 text-[#15803D] shrink-0" />
                                  <span>WA</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[950px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading">
                            <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">PEMINJAM</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">BARANG DIPINJAM</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">JATUH TEMPO</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-center">STATUS</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">TINDAKAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedLoans.map((loan) => (
                            <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {loan.transactionNumber}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="font-semibold text-slate-900">{loan.borrowerName}</span>
                                <span className="text-[11px] text-slate-600 block tabular-nums">
                                  {loan.borrowerNik} | {loan.borrowerDept}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-800">
                                {loan.itemsSummary}
                              </td>
                              <td className="py-2 px-3 text-slate-600 tabular-nums whitespace-nowrap">
                                {new Date(loan.loanDate).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                                {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`text-xs ${
                                    loan.statusLabel === 'Terlambat'
                                      ? 'text-[#991B1B] font-bold'
                                      : loan.statusLabel === 'Hari Ini'
                                      ? 'text-[#92400E] font-semibold'
                                      : 'text-slate-600 font-medium'
                                  }`}
                                >
                                  {loan.statusLabel}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2 text-xs">
                                  <button
                                    onClick={() => handleOpenExtend(loan)}
                                    className="text-[#1E40AF] hover:underline font-semibold text-xs cursor-pointer"
                                  >
                                    Perpanjang
                                  </button>
                                  {loan.borrowerPhone && (
                                    <a
                                      href={`https://wa.me/${formatWaNumber(loan.borrowerPhone)}?text=${encodeURIComponent(
                                        `Yth. Bpk/Ibu ${loan.borrowerName}, Petugas Tool Room PT YPTI menginformasikan pengingat pengembalian perkakas untuk transaksi ${loan.transactionNumber} (${loan.itemsSummary}) dengan batas tenggat ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}. Terima kasih.`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label="Kirim Pengingat WhatsApp"
                                      title="Kirim Pengingat WhatsApp"
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold text-[11px] transition-colors"
                                    >
                                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                                      <span>WA</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Pagination Sedang Dipinjam */}
              <Pagination
                currentPage={loanPage}
                totalPages={totalLoanPages}
                totalItems={upcomingLoans.length}
                pageSize={loanPageSize}
                onPageChange={(p) => setLoanPage(p)}
                onPageSizeChange={(newSize) => {
                  setLoanPageSize(newSize);
                  setLoanPage(1);
                }}
                pageSizeOptions={[5, 10, 25]}
                itemName="transaksi"
              />
            </div>
          )}

          {/* TAB 3: LOG NOTIFIKASI SISTEM */}
          {activeTab === 'NOTIF' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded bg-white overflow-hidden">
                {notifications.length === 0 ? (
                  <EmptyState
                    title="Tidak Ada Catatan Notifikasi"
                    description="Belum ada catatan aktivitas scheduler atau peringatan otomatis dari server."
                  />
                ) : (
                  <>
                    {/* Mobile Cards (< 768px) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {paginatedNotifs.map((notif) => (
                        <div key={notif.id} className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-bold uppercase ${
                                notif.type === 'OVERDUE' || notif.type === 'DANGER'
                                  ? 'text-[#991B1B]'
                                  : notif.type === 'WARNING'
                                  ? 'text-[#92400E]'
                                  : 'text-[#1E40AF]'
                              }`}
                            >
                              {notif.type}
                            </span>
                            <span className="text-[11px] text-slate-600 tabular-nums">
                              {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="text-[13px] font-bold text-slate-900">{notif.title}</div>
                          <div className="text-xs text-slate-600">{notif.message}</div>
                          {notif.link && (
                            <div className="pt-1">
                              <Link
                                href={notif.link}
                                className="inline-flex items-center min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[#1E40AF] border border-slate-300 rounded hover:bg-slate-50"
                              >
                                Buka Menu &rarr;
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[850px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading">
                            <th className="py-2.5 px-3 whitespace-nowrap">WAKTU SISTEM</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">JENIS PERINGATAN</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">JUDUL NOTIFIKASI</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">PESAN RINCIAN</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">TAUTAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedNotifs.map((notif) => (
                            <tr key={notif.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                                {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className={`text-xs ${
                                    notif.type === 'OVERDUE' || notif.type === 'DANGER'
                                      ? 'text-[#991B1B] font-bold'
                                      : notif.type === 'WARNING'
                                      ? 'text-[#92400E] font-semibold'
                                      : 'text-slate-600 font-medium'
                                  }`}
                                >
                                  {notif.type}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {notif.title}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {notif.message}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                {notif.link && (
                                  <Link
                                    href={notif.link}
                                    className="text-xs font-semibold text-[#1E40AF] hover:underline"
                                  >
                                    Buka Menu &rarr;
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Pagination Log Notifikasi */}
              <Pagination
                currentPage={notifPage}
                totalPages={totalNotifPages}
                totalItems={notifications.length}
                pageSize={notifPageSize}
                onPageChange={(p) => setNotifPage(p)}
                onPageSizeChange={(newSize) => {
                  setNotifPageSize(newSize);
                  setNotifPage(1);
                }}
                pageSizeOptions={[5, 10, 25]}
                itemName="notifikasi"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Perpanjang Tenggat (Clean Enterprise Design, No thick accent clash) */}
      {extendingLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setExtendingLoan(null)}
        >
          <div
            className="bg-white rounded border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xs font-heading font-bold text-slate-900 uppercase">
                Perpanjang Tenggat Pengembalian
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold tabular-nums">
                {extendingLoan.transactionNumber}
              </p>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                <span className="font-semibold block">{extendingLoan.borrowerName} ({extendingLoan.borrowerNik})</span>
                <span className="text-[11px] text-slate-500 block">{extendingLoan.itemsSummary}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Waktu Jatuh Tempo Baru *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Perpanjangan *
                </label>
                <textarea
                  rows={2}
                  required
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="Contoh: Pekerjaan lembur shift 2 part mould belum selesai."
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendingLoan(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingExtend}
                  onClick={handleSaveExtend}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingExtend ? 'Menyimpan...' : 'Simpan Perpanjangan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import / Export Modals */}
      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <ExportExcelModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </AppShell>
  );
}
