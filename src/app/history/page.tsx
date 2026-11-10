'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';

type ReportTab = 'riwayat' | 'pemakaian' | 'keterlambatan' | 'umur_pakai';

export default function HistoryPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ReportTab>('riwayat');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Tab 1: Riwayat Transaksi
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  // Tab 2: Pemakaian & Frekuensi
  const [usageList, setUsageList] = useState<any[]>([]);
  const [tab2Page, setTab2Page] = useState(1);
  const tab2PageSize = 10;

  // Tab 3: Keterlambatan per Pekerja
  const [delinquents, setDelinquents] = useState<any[]>([]);
  const [tab3Page, setTab3Page] = useState(1);
  const tab3PageSize = 10;

  // Tab 4: Umur Pakai & Kondisi
  const [lifespanData, setLifespanData] = useState<{
    summary: { totalReturns: number; baikCount: number; ausCount: number; rusakCount: number; hilangCount: number };
    maintenanceItems: any[];
    returnLogs: any[];
  } | null>(null);
  const [repairingId, setRepairingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'riwayat') {
        const res = await fetch(`/api/history?tab=transactions&search=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`);
        if (res.ok) {
          const json = await res.json();
          setTransactions(json.data || []);
          setTotalPages(json.pagination?.totalPages || 1);
          setTotalTransactions(json.pagination?.total || 0);
        }
      } else if (activeTab === 'pemakaian') {
        const res = await fetch(`/api/history?tab=usage&search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const json = await res.json();
          setUsageList(json.data || []);
        }
      } else if (activeTab === 'keterlambatan') {
        const res = await fetch(`/api/history?tab=delinquency&search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const json = await res.json();
          setDelinquents(json.data || []);
        }
      } else if (activeTab === 'umur_pakai') {
        const res = await fetch(`/api/history?tab=lifespan`);
        if (res.ok) {
          const json = await res.json();
          setLifespanData(json);
        }
      }
    } catch {
      showToast('Gagal memuat data laporan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, page, pageSize, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearch('');
    setPage(1);
    setTab2Page(1);
    setTab3Page(1);
  };

  const handleCompleteRepair = async (tool: any) => {
    if (!tool.id || !tool.itemType) return;
    setRepairingId(tool.id);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_repair',
          id: tool.id,
          itemType: tool.itemType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menyelesaikan servis.', 'error');
      } else {
        showToast(
          `Servis ${tool.code} (${tool.name}) selesai. ${tool.repairStock} unit dikembalikan ke stok tersedia.`,
          'info'
        );
        fetchData();
      }
    } catch {
      showToast('Terjadi kesalahan koneksi saat memperbarui status servis.', 'error');
    } finally {
      setRepairingId(null);
    }
  };

  const getExportUrl = () => {
    if (activeTab === 'riwayat') return '/api/excel/export?type=loans';
    if (activeTab === 'pemakaian') return '/api/excel/export?type=tools';
    if (activeTab === 'keterlambatan') return '/api/excel/export?type=overdue';
    return '/api/excel/export?type=all';
  };

  return (
    <AppShell>
      <div className="space-y-3 pb-24">
        {/* Header - Flowchart Hal. 8: Riwayat & Laporan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
                Riwayat &amp; Laporan Operasional
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                (Audit Log &amp; Rekapitulasi)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audit ketertelusuran peminjaman, frekuensi pemakaian tool, rekam jejak keterlambatan, dan estimasi umur pakai
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={fetchData} loading={loading} />
            <a
              href={getExportUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Ekspor Excel (.xlsx)
            </a>
          </div>
        </div>

        {/* 4 Official Tabs - Flowchart Hal. 8 (Flat style) */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => handleTabChange('riwayat')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'riwayat'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Riwayat Transaksi {totalTransactions > 0 && `(${totalTransactions})`}
          </button>
          <button
            onClick={() => handleTabChange('pemakaian')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pemakaian'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Frekuensi Pemakaian Tool
          </button>
          <button
            onClick={() => handleTabChange('keterlambatan')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'keterlambatan'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Keterlambatan per Pekerja
          </button>
          <button
            onClick={() => handleTabChange('umur_pakai')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'umur_pakai'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Umur Pakai &amp; Kondisi Tool
          </button>
        </div>

        {/* Filters - Flat row without boxed card */}
        {activeTab !== 'umur_pakai' && (
          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-200">
            <div className="w-full sm:max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  activeTab === 'riwayat'
                    ? 'Cari No. Peminjaman, NIK, atau nama...'
                    : activeTab === 'pemakaian'
                    ? 'Cari kode barang, nama, jenis...'
                    : 'Cari NIK atau nama pekerja...'
                }
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
              />
            </div>
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* TAB 1: RIWAYAT TRANSAKSI */}
        {activeTab === 'riwayat' && (
          <div className="space-y-3">
            {loading ? (
              <div className="border-t border-slate-200 mt-2">
                <SkeletonTable rows={8} cols={8} />
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState
                title="Tidak Ada Riwayat Transaksi"
                description="Belum ada transaksi peminjaman yang tercatat atau cocok dengan kata kunci pencarian."
                actionLabel="Reset Pencarian"
                onAction={() => { setSearch(''); setPage(1); }}
                className="border-t border-slate-200 mt-2"
              />
            ) : (
              <div className="overflow-x-auto border-t border-slate-200 mt-2">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">PEMINJAM (NIK)</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">DAFTAR BARANG</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">BATAS KEMBALI</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">TGL REALISASI</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">ADMIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{tx.employee?.name || '-'}</p>
                          <p className="text-[10px] tabular-nums text-slate-500">{tx.employee?.nik} | {tx.employee?.department}</p>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="space-y-0.5">
                            {tx.items?.map((item: any) => (
                              <p key={item.id} className="truncate text-slate-800">
                                - {item.tool?.name || item.inventory?.name} ({item.quantity}x)
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap tabular-nums">
                          {new Date(tx.loanDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap tabular-nums">
                          {new Date(tx.expectedReturnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap tabular-nums">
                          {tx.actualReturnDate
                            ? new Date(tx.actualReturnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`text-xs font-semibold ${
                              tx.status === 'SELESAI'
                                ? 'text-slate-600'
                                : tx.status === 'TERLAMBAT'
                                ? 'text-slate-900 font-bold'
                                : 'text-[#1E40AF]'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {tx.admin?.name || 'Admin YPTI'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reusable Enterprise Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalTransactions}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 25, 50]}
              itemName="transaksi"
            />
          </div>
        )}

        {/* TAB 2: PEMAKAIAN & FREKUENSI */}
        {activeTab === 'pemakaian' && (
          <div className="space-y-3">
            {loading ? (
              <div className="border-t border-slate-200 mt-2">
                <SkeletonTable rows={8} cols={8} />
              </div>
            ) : usageList.length === 0 ? (
              <EmptyState
                title="Belum Ada Data Pemakaian"
                description="Belum ada riwayat pemakaian perkakas yang tercatat di sistem."
                className="border-t border-slate-200 mt-2"
              />
            ) : (
              <>
                <div className="overflow-x-auto border-t border-slate-200 mt-2">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold uppercase tracking-wider bg-slate-50/50">
                      <tr>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">PERINGKAT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">KODE BARANG</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">NAMA BARANG</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">JENIS &amp; MEREK</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">FREKUENSI PINJAM</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">TOTAL QTY DIPINJAM</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">STOK TERSEDIA</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS STOK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usageList
                        .slice((tab2Page - 1) * tab2PageSize, tab2Page * tab2PageSize)
                        .map((item, idx) => {
                          const isLowStock = item.availableStock <= item.minStock;
                          const overallRank = (tab2Page - 1) * tab2PageSize + idx + 1;
                          return (
                            <tr key={item.code} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700 whitespace-nowrap tabular-nums">
                                #{overallRank}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {item.code}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                {item.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.type} | {item.brand}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#1E40AF] whitespace-nowrap tabular-nums">
                                {item.timesBorrowed}x transaksi
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {item.totalQtyBorrowed} unit
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums">
                                <span className={isLowStock ? 'text-slate-900 font-bold' : 'text-slate-700'}>
                                  {item.availableStock} / {item.totalStock}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap text-[11px] font-semibold">
                                {isLowStock ? (
                                  <span className="text-slate-900 font-bold">
                                    PERLU PENGADAAN (Stok Menipis)
                                  </span>
                                ) : (
                                  <span className="text-slate-600">
                                    Aman
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Tab 2 Pagination */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                  <span>
                    Menampilkan {(tab2Page - 1) * tab2PageSize + 1} -{' '}
                    {Math.min(tab2Page * tab2PageSize, usageList.length)} dari {usageList.length} perkakas
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={tab2Page <= 1}
                      onClick={() => setTab2Page((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                    >
                      &lt;
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      {tab2Page} / {Math.ceil(usageList.length / tab2PageSize) || 1}
                    </span>
                    <button
                      type="button"
                      disabled={tab2Page >= Math.ceil(usageList.length / tab2PageSize)}
                      onClick={() => setTab2Page((p) => p + 1)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: KETERLAMBATAN PER PEKERJA */}
        {activeTab === 'keterlambatan' && (
          <div className="space-y-3">
            {loading ? (
              <div className="border-t border-slate-200 mt-2">
                <SkeletonTable rows={8} cols={8} />
              </div>
            ) : delinquents.length === 0 ? (
              <EmptyState
                title="Tidak Ada Riwayat Keterlambatan"
                description="Semua pengembalian perkakas tercatat tepat waktu."
                className="border-t border-slate-200 mt-2"
              />
            ) : (
              <>
                <div className="overflow-x-auto border-t border-slate-200 mt-2">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap">NIK</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">NAMA PEKERJA</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">DEPARTEMEN &amp; SHIFT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">KONTAK WHATSAPP</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">TERLAMBAT SAAT INI</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">TOTAL RIWAYAT TELAT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">DETAIL PINJAMAN OVERDUE</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS ANGGOTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {delinquents
                        .slice((tab3Page - 1) * tab3PageSize, tab3Page * tab3PageSize)
                        .map((worker) => (
                          <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                              {worker.nik}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {worker.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {worker.department} | {worker.shift}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                              {worker.phone}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {worker.currentOverdueCount > 0 ? (
                                <span className="font-bold text-slate-900 tabular-nums">
                                  {worker.currentOverdueCount} Peminjaman
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap tabular-nums">
                              {worker.totalLateCount} kali
                            </td>
                            <td className="py-2.5 px-3 max-w-xs">
                              {worker.overdueDetails.length > 0 ? (
                                <div className="space-y-1">
                                  {worker.overdueDetails.map((det: any, dIdx: number) => (
                                    <div key={dIdx} className="text-[11px] text-slate-800">
                                      <span className="font-bold tabular-nums">{det.loanNumber}</span> ({det.items})
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Tidak ada pinjaman tertunda aktif</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium text-[11px]">
                              {worker.status === 'AKTIF' ? (
                                <span className="text-slate-700">{worker.status}</span>
                              ) : (
                                <span className="text-slate-900 font-bold">{worker.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Tab 3 Pagination */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                  <span>
                    Menampilkan {(tab3Page - 1) * tab3PageSize + 1} -{' '}
                    {Math.min(tab3Page * tab3PageSize, delinquents.length)} dari {delinquents.length} pekerja
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={tab3Page <= 1}
                      onClick={() => setTab3Page((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                    >
                      &lt;
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      {tab3Page} / {Math.ceil(delinquents.length / tab3PageSize) || 1}
                    </span>
                    <button
                      type="button"
                      disabled={tab3Page >= Math.ceil(delinquents.length / tab3PageSize)}
                      onClick={() => setTab3Page((p) => p + 1)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: UMUR PAKAI & KONDISI (Hal. 8 Flowchart) */}
        {activeTab === 'umur_pakai' && (
          <div className="space-y-4">
            {/* KPI Strip Umur Pakai (Flat horizontal) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 border-y border-slate-200 divide-x divide-slate-200 py-3 bg-white">
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">TOTAL PENGEMBALIAN</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {lifespanData?.summary?.totalReturns || 0} unit
                </p>
              </div>
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E40AF]">KONDISI BAIK</span>
                <p className="text-base font-bold text-[#1E40AF] mt-0.5 tabular-nums">
                  {lifespanData?.summary?.baikCount || 0} unit
                </p>
              </div>
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">KONDISI AUS (REGRIND)</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {lifespanData?.summary?.ausCount || 0} unit
                </p>
              </div>
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">KONDISI RUSAK</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {lifespanData?.summary?.rusakCount || 0} unit
                </p>
              </div>
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">HILANG</span>
                <p className="text-base font-bold text-slate-800 mt-0.5 tabular-nums">
                  {lifespanData?.summary?.hilangCount || 0} unit
                </p>
              </div>
            </div>

            {/* Maintenance & Repair Stock Tracking Table */}
            <div>
              <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold font-heading text-slate-900 uppercase">
                  Daftar Tool Dalam Perawatan (Regrind / Service) & Afkir
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {lifespanData?.maintenanceItems?.length || 0} item
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">KODE TOOL</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">NAMA BARANG</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">KATEGORI & JENIS</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TOTAL ASLI</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TERSEDIA</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">PERAWATAN / REGRIND</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">AFKIR / SCRAP</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">ACTION SOP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!lifespanData?.maintenanceItems || lifespanData.maintenanceItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Tidak ada tool yang sedang dalam antrean perawatan regrind atau afkir saat ini.
                        </td>
                      </tr>
                    ) : (
                      lifespanData.maintenanceItems.map((tool: any) => (
                        <tr key={tool.code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                            {tool.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {tool.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {tool.type}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap tabular-nums">
                            {tool.totalStock}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#1E40AF] font-bold whitespace-nowrap tabular-nums">
                            {tool.availableStock}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 font-bold whitespace-nowrap tabular-nums">
                            {tool.repairStock} unit
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold whitespace-nowrap tabular-nums">
                            {tool.scrapStock} unit
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {tool.repairStock > 0 ? (
                              <button
                                type="button"
                                disabled={repairingId === tool.id}
                                onClick={() => handleCompleteRepair(tool)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 rounded transition-colors cursor-pointer"
                              >
                                {repairingId === tool.id ? 'Memproses...' : 'Selesai Servis'}
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-500">
                                Afkir Permanen
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
