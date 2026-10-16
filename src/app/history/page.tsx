'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

type ReportTab = 'riwayat' | 'pemakaian' | 'keterlambatan' | 'umur_pakai';

export default function HistoryPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ReportTab>('riwayat');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Tab 1: Riwayat Transaksi
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  // Tab 2: Pemakaian & Frekuensi
  const [usageList, setUsageList] = useState<any[]>([]);

  // Tab 3: Keterlambatan per Pekerja
  const [delinquents, setDelinquents] = useState<any[]>([]);

  // Tab 4: Umur Pakai & Kondisi
  const [lifespanData, setLifespanData] = useState<{
    summary: { totalReturns: number; baikCount: number; ausCount: number; rusakCount: number; hilangCount: number };
    maintenanceItems: any[];
    returnLogs: any[];
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'riwayat') {
        const res = await fetch(`/api/history?tab=transactions&search=${encodeURIComponent(search)}&page=${page}&limit=15`);
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
  }, [activeTab, search, page, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearch('');
    setPage(1);
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
              <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
                RIWAYAT TRANSAKSI & LAPORAN OPERASIONAL
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                SOP Hal. 8 Flowchart
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audit ketertelusuran peminjaman, frekuensi pemakaian tool, rekam jejak keterlambatan, dan estimasi umur pakai
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getExportUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Ekspor Excel (.xlsx)
            </a>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Segarkan
            </button>
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
            1. Riwayat Transaksi {totalTransactions > 0 && `(${totalTransactions})`}
          </button>
          <button
            onClick={() => handleTabChange('pemakaian')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pemakaian'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            2. Pemakaian & Frekuensi Tool
          </button>
          <button
            onClick={() => handleTabChange('keterlambatan')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'keterlambatan'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            3. Keterlambatan per Pekerja
          </button>
          <button
            onClick={() => handleTabChange('umur_pakai')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'umur_pakai'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            4. Umur Pakai & Kondisi Tool
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

        {/* TAB 1: RIWAYAT TRANSAKSI (Flat Borderless Table) */}
        {activeTab === 'riwayat' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                    <th className="py-2.5 px-3">PEMINJAM (NIK)</th>
                    <th className="py-2.5 px-3">DAFTAR BARANG</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">BATAS KEMBALI</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">TGL REALISASI</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ADMIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Memuat data riwayat transaksi...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Tidak ada riwayat peminjaman ditemukan.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{tx.employee?.name || '-'}</p>
                          <p className="text-[10px] tabular-nums text-slate-500">{tx.employee?.nik} &bull; {tx.employee?.department}</p>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="space-y-0.5">
                            {tx.items?.map((item: any) => (
                              <p key={item.id} className="truncate text-slate-800">
                                &bull; {item.tool?.name || item.inventory?.name} ({item.quantity}x)
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
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === 'SELESAI'
                                ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                                : tx.status === 'TERLAMBAT'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {tx.admin?.name || 'Admin YPTI'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2.5 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PEMAKAIAN & FREKUENSI (Hal. 8 Flowchart) */}
        {activeTab === 'pemakaian' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="py-2.5 px-3 text-center">PERINGKAT</th>
                  <th className="py-2.5 px-3">KODE BARANG</th>
                  <th className="py-2.5 px-3">NAMA BARANG</th>
                  <th className="py-2.5 px-3">JENIS & MEREK</th>
                  <th className="py-2.5 px-3 text-right">FREKUENSI PINJAM</th>
                  <th className="py-2.5 px-3 text-right">TOTAL QTY DIPINJAM</th>
                  <th className="py-2.5 px-3 text-right">STOK TERSEDIA</th>
                  <th className="py-2.5 px-3 text-center">STATUS STOK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Menganalisis frekuensi pemakaian tool...
                    </td>
                  </tr>
                ) : usageList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Belum ada data pemakaian tercatat.
                    </td>
                  </tr>
                ) : (
                  usageList.map((item, idx) => {
                    const isLowStock = item.availableStock <= item.minStock;
                    return (
                      <tr key={item.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 whitespace-nowrap tabular-nums">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.type} &bull; {item.brand}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#1E40AF] whitespace-nowrap tabular-nums">
                          {item.timesBorrowed}x transaksi
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {item.totalQtyBorrowed} unit
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums">
                          <span className={isLowStock ? 'text-amber-600 font-bold' : 'text-slate-900'}>
                            {item.availableStock} / {item.totalStock}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isLowStock ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              PERLU PENGADAAN (Stok Menipis)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600">
                              Aman
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: KETERLAMBATAN PER PEKERJA (Hal. 8 Flowchart) */}
        {activeTab === 'keterlambatan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">NIK</th>
                  <th className="py-2.5 px-3">NAMA PEKERJA</th>
                  <th className="py-2.5 px-3">DEPARTEMEN & SHIFT</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">KONTAK WHATSAPP</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">TERLAMBAT SAAT INI</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">TOTAL RIWAYAT TELAT</th>
                  <th className="py-2.5 px-3">DETAIL PINJAMAN OVERDUE</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS ANGGOTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Memeriksa rekam jejak keterlambatan...
                    </td>
                  </tr>
                ) : delinquents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#1E40AF] font-medium">
                      Hebat! Tidak ada rekam jejak keterlambatan pengembalian dari seluruh operator.
                    </td>
                  </tr>
                ) : (
                  delinquents.map((worker) => (
                    <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {worker.nik}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {worker.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {worker.department} &bull; {worker.shift}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                        {worker.phone}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {worker.currentOverdueCount > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
                              <div key={dIdx} className="text-[11px] text-rose-800 bg-rose-50/50 p-1 rounded">
                                <span className="font-bold tabular-nums">{det.loanNumber}</span>: {det.items}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Tidak ada pinjaman tertunda aktif</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            worker.status === 'AKTIF'
                              ? 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {worker.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">KONDISI AUS (REGRIND)</span>
                <p className="text-base font-bold text-amber-600 mt-0.5 tabular-nums">
                  {lifespanData?.summary?.ausCount || 0} unit
                </p>
              </div>
              <div className="px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">KONDISI RUSAK</span>
                <p className="text-base font-bold text-rose-600 mt-0.5 tabular-nums">
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
                      <th className="py-2.5 px-3">NAMA BARANG</th>
                      <th className="py-2.5 px-3">KATEGORI & JENIS</th>
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
                          <td className="py-2.5 px-3 text-right text-amber-700 font-bold whitespace-nowrap tabular-nums">
                            {tool.repairStock} unit
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-700 font-bold whitespace-nowrap tabular-nums">
                            {tool.scrapStock} unit
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              Hal. 5D SOP
                            </span>
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
