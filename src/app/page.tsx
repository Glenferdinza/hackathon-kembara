'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { BarChartSection } from '@/components/dashboard/BarChartSection';
import { DonutChartSection } from '@/components/dashboard/DonutChartSection';
import { ImportExcelModal } from '@/components/modals/ImportExcelModal';
import { ExportExcelModal } from '@/components/modals/ExportExcelModal';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Barcode Scanner & Dispatch Loket State
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    type: 'EMPLOYEE' | 'TOOL' | 'INVENTORY' | 'NOT_FOUND';
    data: any;
    rawCode: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Flowchart Hal. 2: 3 Bagian Dashboard
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOANS' | 'NOTIF'>('STOCK');
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilterType, setStockFilterType] = useState('ALL');

  // Extend loan modal state
  const [extendingLoan, setExtendingLoan] = useState<any | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time Barcode Scanner Handler
  const handleScanLookup = async (codeToScan?: string) => {
    const code = (codeToScan || barcodeQuery).trim().toUpperCase();
    if (!code) return;
    setIsScanning(true);
    setBarcodeQuery(code);
    try {
      // 1. Cek identitas peminjam (NIK kartu karyawan)
      const empRes = await fetch(`/api/employees?nik=${encodeURIComponent(code)}`);
      if (empRes.ok) {
        const empJson = await empRes.json();
        if (empJson.data) {
          setScannedResult({ type: 'EMPLOYEE', data: empJson.data, rawCode: code });
          showToast(`Peminjam terdeteksi: ${empJson.data.name} (${empJson.data.nik})`, 'success');
          setIsScanning(false);
          return;
        }
      }

      // 2. Cek Master Tool
      const toolRes = await fetch(`/api/tools?search=${encodeURIComponent(code)}`);
      if (toolRes.ok) {
        const toolJson = await toolRes.json();
        const match = (toolJson.data || []).find((t: any) => t.code.toUpperCase() === code);
        if (match) {
          setScannedResult({ type: 'TOOL', data: match, rawCode: code });
          showToast(`Tool terdeteksi: ${match.name} (${match.code})`, 'info');
          setIsScanning(false);
          return;
        }
      }

      // 3. Cek Master Inventaris
      const invRes = await fetch(`/api/inventories?search=${encodeURIComponent(code)}`);
      if (invRes.ok) {
        const invJson = await invRes.json();
        const match = (invJson.data || []).find((i: any) => i.code.toUpperCase() === code);
        if (match) {
          setScannedResult({ type: 'INVENTORY', data: match, rawCode: code });
          showToast(`Inventaris terdeteksi: ${match.name} (${match.code})`, 'info');
          setIsScanning(false);
          return;
        }
      }

      setScannedResult({ type: 'NOT_FOUND', data: null, rawCode: code });
      showToast(`Barcode / ID "${code}" tidak ditemukan.`, 'error');
    } catch {
      setScannedResult({ type: 'NOT_FOUND', data: null, rawCode: code });
    } finally {
      setIsScanning(false);
    }
  };

  const kpi = data?.kpi || {
    totalPhysicalUnits: 110,
    totalAvailable: 88,
    totalBorrowed: 21,
    activeLoansCount: 4,
    overdueLoansCount: 2,
    dueSoonCount: 1,
    lowStockCount: 1,
  };

  const allStockItems = data?.allStockItems || [];
  const upcomingLoans = data?.upcomingLoans || [];
  const notifications = data?.notifications || [];
  const actionItems = data?.actionItems || [];

  const filteredStock = allStockItems.filter((item: any) => {
    const matchSearch =
      item.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(stockSearch.toLowerCase());
    const matchType =
      stockFilterType === 'ALL'
        ? true
        : stockFilterType === 'LOW'
        ? item.isLowStock
        : item.type === stockFilterType;
    return matchSearch && matchType;
  });

  const handleOpenExtend = (loan: any) => {
    setExtendingLoan(loan);
    const d = new Date(new Date(loan.expectedReturnDate).getTime() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setNewDueDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
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
      <div className="space-y-5 pb-24">
        {/* Top Control Bar matching ERP Titian */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-sm lg:text-base font-bold text-slate-900 tracking-tight uppercase">
              Dashboard Operasional Tool Room
            </h1>
            <p className="text-xs text-slate-500">
              Monitoring ketersediaan stok fisik, transaksi peminjaman aktif, dan notifikasi server PT YPTI
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              {loading ? 'Memuat...' : 'Segarkan Data'}
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Impor XLSX
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Ekspor XLSX
            </button>

            <Link
              href="/loans"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors shadow-2xs"
            >
              + Peminjaman Baru
            </Link>
          </div>
        </div>

        {/* LOKET DISPATCH & SCANNER BARCODE CEPAT (FRONT & CENTER DESK INTERFACE) */}
        <div className="bg-white border border-slate-200 rounded p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-heading font-bold text-slate-900 uppercase tracking-tight">
                Loket Dispatch &amp; Barcode Scanner (Handheld Gun / USB)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1E40AF] border border-blue-200">
                STANDBY SCAN
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Arahkan alat barcode scanner kasir &amp; tekan pelatuk ke ID Card Karyawan atau Kode Tool/Barang
            </span>
          </div>

          {/* Barcode Input Field */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanLookup();
                  }
                }}
                placeholder="Arahkan scanner kasir lalu tembak pelatuk barcode (atau ketik ID/NIK manual &amp; tekan Enter)..."
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={() => handleScanLookup()}
              disabled={isScanning || !barcodeQuery.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50 shrink-0"
            >
              {isScanning ? 'Mencari...' : 'Cari Identitas'}
            </button>
            {scannedResult && (
              <button
                onClick={() => {
                  setScannedResult(null);
                  setBarcodeQuery('');
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded"
              >
                Reset
              </button>
            )}
          </div>

          {/* Scanned Result Card */}
          {scannedResult && (
            <div className="mt-2.5 p-3.5 bg-slate-50/80 border border-slate-200 rounded text-xs space-y-3 animate-in fade-in duration-150">
              {scannedResult.type === 'EMPLOYEE' && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-sm">
                      {scannedResult.data.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-slate-900 text-sm">{scannedResult.data.name}</span>
                        <span className="text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {scannedResult.data.nik}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          v{scannedResult.data.cardVersion || 1} | {scannedResult.data.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {scannedResult.data.role || 'Operator CNC'} &bull; {scannedResult.data.department} &bull; {scannedResult.data.shift || 'Shift 1'}
                      </p>
                      {/* Active loans summary */}
                      <p className="text-[11px] text-slate-700 mt-1">
                        {scannedResult.data.loans && scannedResult.data.loans.length > 0 ? (
                          <span className="text-amber-800 font-semibold">
                            &bull; Sedang meminjam {scannedResult.data.loans.length} transaksi perkakas yang belum dikembalikan.
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">
                            &bull; Bebas tanggungan: Tidak ada pinjaman tertunda aktif.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/loans?emp=${scannedResult.data.nik}`}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                    >
                      + Proses Peminjaman Baru
                    </Link>
                    <Link
                      href={`/returns?emp=${scannedResult.data.nik}`}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                    >
                      Verifikasi Pengembalian
                    </Link>
                  </div>
                </div>
              )}

              {(scannedResult.type === 'TOOL' || scannedResult.type === 'INVENTORY') && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {scannedResult.data.code}
                      </span>
                      <span className="font-heading font-bold text-slate-900 text-sm">{scannedResult.data.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        ({scannedResult.data.category?.name || scannedResult.data.category || '-'})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Lokasi Penyimpanan: <span className="font-semibold text-slate-800">{scannedResult.data.location}</span> &bull; 
                      Stok Tersedia: <span className="font-bold text-[#1E40AF]">{scannedResult.data.availableStock} {scannedResult.data.unit}</span> (Total Fisik: {scannedResult.data.totalStock} {scannedResult.data.unit})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/loans?item=${scannedResult.data.code}`}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                    >
                      + Masukkan ke Peminjaman
                    </Link>
                  </div>
                </div>
              )}

              {scannedResult.type === 'NOT_FOUND' && (
                <div className="text-slate-600 py-1">
                  <span className="font-semibold text-rose-800">Barcode &quot;{scannedResult.rawCode}&quot; tidak terdaftar.</span> Pastikan NIK kartu karyawan atau kode alat sudah terinput di Master Data.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seamless Flat Metric Strip (Calm, eye-friendly typography without high-contrast screaming colors) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-y border-slate-200 py-3 bg-white">
          <div className="px-3 py-1">
            <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
              TOTAL BARANG
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.totalPhysicalUnits.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Tool &amp; Inventaris
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                STOK TERSEDIA
              </span>
              <span className="text-[9px] font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                80%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.totalAvailable.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Siap di rak
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                SEDANG DIPINJAM
              </span>
              <span className="text-[9px] font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                19%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.totalBorrowed.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Di lini kerja
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                JATUH TEMPO HARI INI
              </span>
              {kpi.dueSoonCount > 0 && (
                <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                  Perlu Cek
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.dueSoonCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Shift berjalan
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                TERLAMBAT
              </span>
              {kpi.overdueLoansCount > 0 && (
                <span className="text-[9px] font-semibold text-rose-800 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                  Overdue
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.overdueLoansCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Melewati tenggat
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                STOK MENIPIS
              </span>
              {kpi.lowStockCount > 0 && (
                <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                  &le; Min
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {kpi.lowStockCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Perlu pengadaan
            </div>
          </div>
        </div>

        {/* Charts Section: Flat, open layout with calm palette */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-1">
          <div className="lg:col-span-7">
            <BarChartSection data={data?.barChartData || []} />
          </div>
          <div className="lg:col-span-5">
            <DonutChartSection data={data?.donutChartData || []} />
          </div>
        </div>

        {/* Action Items Alert Strip if any (Muted calm accents) */}
        {actionItems.length > 0 && (
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Menunggu Tindakan Prioritas Admin:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actionItems.map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 border-l-2 bg-slate-50 text-xs flex flex-col justify-between"
                  style={{
                    borderColor:
                      act.type === 'DANGER'
                        ? '#991B1B'
                        : act.type === 'WARNING'
                        ? '#D97706'
                        : '#475569',
                  }}
                >
                  <div>
                    <span className="font-bold text-slate-900">{act.title}</span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {act.description}
                    </p>
                  </div>
                  <Link
                    href={act.link}
                    className="text-[11px] font-semibold text-[#1E40AF] hover:underline mt-2 self-start"
                  >
                    Tindak Lanjuti &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Operational Tabs matching Flowchart Page 2 */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="border-b border-slate-200 flex items-center justify-between">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('STOCK')}
                className={`text-xs font-bold uppercase tracking-tight pb-2 relative transition-colors ${
                  activeTab === 'STOCK'
                    ? 'text-[#1E40AF] border-b-2 border-[#1E40AF]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Tabel Stok Barang &amp; Peringatan Minimum
              </button>

              <button
                onClick={() => setActiveTab('LOANS')}
                className={`text-xs font-bold uppercase tracking-tight pb-2 relative transition-colors ${
                  activeTab === 'LOANS'
                    ? 'text-[#1E40AF] border-b-2 border-[#1E40AF]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Daftar Sedang Dipinjam &amp; Perpanjang ({upcomingLoans.length})
              </button>

              <button
                onClick={() => setActiveTab('NOTIF')}
                className={`text-xs font-bold uppercase tracking-tight pb-2 relative transition-colors ${
                  activeTab === 'NOTIF'
                    ? 'text-[#1E40AF] border-b-2 border-[#1E40AF]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                3. Log Notifikasi Scheduler (Hal. 6)
              </button>
            </div>
          </div>

          {/* TAB 1: STOK BARANG */}
          {activeTab === 'STOCK' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="w-full sm:max-w-xs">
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Cari kode, nama barang, kategori..."
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStockFilterType('ALL')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'ALL'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({allStockItems.length})
                  </button>
                  <button
                    onClick={() => setStockFilterType('Tool')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'Tool'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tool Saja
                  </button>
                  <button
                    onClick={() => setStockFilterType('Inventaris')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'Inventaris'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Inventaris
                  </button>
                  <button
                    onClick={() => setStockFilterType('LOW')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'LOW'
                        ? 'bg-amber-700 text-white font-semibold'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium border border-amber-200'
                    }`}
                  >
                    Stok Menipis ({kpi.lowStockCount})
                  </button>
                </div>
              </div>

              {/* Table without box container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">KODE</th>
                      <th className="py-2.5 px-3">NAMA BARANG</th>
                      <th className="py-2.5 px-3">TIPE</th>
                      <th className="py-2.5 px-3">KATEGORI</th>
                      <th className="py-2.5 px-3">LOKASI RAK</th>
                      <th className="py-2.5 px-3 text-center">TOTAL</th>
                      <th className="py-2.5 px-3 text-center">TERSEDIA</th>
                      <th className="py-2.5 px-3 text-center">DIPINJAM</th>
                      <th className="py-2.5 px-3 text-center">PERAWATAN</th>
                      <th className="py-2.5 px-3 text-center">MIN. STOK</th>
                      <th className="py-2.5 px-3">STATUS PERSEDIAAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          Tidak ada data barang yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {item.type}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.location}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                            {item.totalStock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                            {item.availableStock}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600 tabular-nums">
                            {item.borrowedStock}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700 tabular-nums">
                            {item.repairStock}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.isLowStock ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Stok Menipis (&le; {item.minStock})
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600">
                                Stok Aman
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
          )}

          {/* TAB 2: SEDANG DIPINJAM & PERPANJANG */}
          {activeTab === 'LOANS' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">NO. TRANSAKSI</th>
                      <th className="py-2.5 px-3">PEMINJAM</th>
                      <th className="py-2.5 px-3">BARANG &amp; JUMLAH</th>
                      <th className="py-2.5 px-3">TGL PINJAM</th>
                      <th className="py-2.5 px-3">JATUH TEMPO</th>
                      <th className="py-2.5 px-3">STATUS JATUH TEMPO</th>
                      <th className="py-2.5 px-3 text-right">TINDAKAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingLoans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Tidak ada transaksi peminjaman yang sedang aktif.
                        </td>
                      </tr>
                    ) : (
                      upcomingLoans.map((loan: any) => (
                        <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {loan.transactionNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{loan.borrowerName}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {loan.borrowerNik} | {loan.borrowerDept}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {loan.itemsSummary}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                            {new Date(loan.loanDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 tabular-nums">
                            {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                loan.statusLabel === 'Terlambat'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : loan.statusLabel === 'Hari Ini'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {loan.statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenExtend(loan)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded transition-colors"
                              >
                                Perpanjang
                              </button>
                              {loan.borrowerPhone && (
                                <a
                                  href={`https://wa.me/${loan.borrowerPhone}?text=${encodeURIComponent(
                                    `Halo ${loan.borrowerName}, pengingat pengembalian alat PT YPTI untuk transaksi ${loan.transactionNumber} (${loan.itemsSummary}). Jatuh tempo: ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}. Terima kasih.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                                >
                                  Hubungi WA
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LOG NOTIFIKASI SCHEDULER */}
          {activeTab === 'NOTIF' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">WAKTU SISTEM</th>
                      <th className="py-2.5 px-3">JENIS PERINGATAN</th>
                      <th className="py-2.5 px-3">JUDUL NOTIFIKASI</th>
                      <th className="py-2.5 px-3">PESAN RINCIAN SCHEDULER</th>
                      <th className="py-2.5 px-3 text-right">TAUTAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Tidak ada catatan notifikasi scheduler saat ini.
                        </td>
                      </tr>
                    ) : (
                      notifications.map((notif: any) => (
                        <tr key={notif.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap tabular-nums">
                            {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                notif.type === 'OVERDUE'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : notif.type === 'WARNING'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {notif.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {notif.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {notif.message}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {notif.link && (
                              <Link
                                href={notif.link}
                                className="text-[11px] font-semibold text-[#1E40AF] hover:underline"
                              >
                                Buka Menu &rarr;
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Perpanjang Jatuh Tempo */}
      {extendingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xs font-heading font-bold text-slate-900 uppercase">Perpanjang Tenggat Pengembalian</h2>
                <p className="text-[11px] text-slate-500 font-semibold">{extendingLoan.transactionNumber}</p>
              </div>
              <button onClick={() => setExtendingLoan(null)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
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
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingExtend}
                  onClick={handleSaveExtend}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50"
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
