'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { BarChartSection } from '@/components/dashboard/BarChartSection';
import { DonutChartSection } from '@/components/dashboard/DonutChartSection';
import { ImportExcelModal } from '@/components/modals/ImportExcelModal';
import { ExportExcelModal } from '@/components/modals/ExportExcelModal';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/ui/Pagination';

const INITIAL_DASHBOARD_DATA = {
  kpi: {
    totalPhysicalUnits: 1699,
    totalAvailable: 1695,
    totalBorrowed: 4,
    totalToolTypes: 1419,
    totalToolUnits: 1551,
    availableTools: 1548,
    borrowedTools: 3,
    totalInventoryTypes: 210,
    totalInventoryUnits: 148,
    availableInventories: 147,
    borrowedInventories: 1,
    activeLoansCount: 3,
    overdueLoansCount: 1,
    dueSoonCount: 1,
    lowStockCount: 1486,
  },
  barChartData: [
    { name: 'Arbor & Toolholder Assembly', total: 545, available: 545, borrowed: 0 },
    { name: 'Cutting Insert Holders & Bars', total: 353, available: 352, borrowed: 1 },
    { name: 'Pull Studs & Retention Knobs', total: 277, available: 275, borrowed: 2 },
    { name: 'Precision Collet System', total: 151, available: 151, borrowed: 0 },
    { name: 'Clamping Fixtures, Vise & Jigs', total: 118, available: 118, borrowed: 0 },
    { name: 'Machine Fastener Keys & Wrenches', total: 100, available: 100, borrowed: 0 },
    { name: 'Precision Measuring & QC', total: 62, available: 62, borrowed: 0 },
    { name: 'Industrial Hand Tools', total: 49, available: 48, borrowed: 1 },
    { name: 'Power & Pneumatic Tools', total: 35, available: 35, borrowed: 0 },
    { name: 'Carbide Inserts & Cutting Tips', total: 7, available: 7, borrowed: 0 },
    { name: 'Workshop Storage & Facilities', total: 2, available: 2, borrowed: 0 },
  ],
  donutChartData: [
    { name: 'Stok Tersedia', value: 1695, color: '#1E40AF' },
    { name: 'Sedang Dipinjam', value: 4, color: '#64748B' },
    { name: 'Dalam Perbaikan', value: 0, color: '#D97706' },
    { name: 'Rusak / Afkir', value: 0, color: '#991B1B' },
  ],
  actionItems: [
    {
      id: 'act-overdue',
      type: 'DANGER',
      title: 'Tindak Lanjut Keterlambatan',
      description: '2 transaksi telah melewati tenggat waktu pengembalian. Segera hubungi peminjam via WhatsApp.',
      link: '/monitoring',
    },
    {
      id: 'act-low-stock',
      type: 'WARNING',
      title: 'Peringatan Stok Menipis',
      description: '8 barang memiliki stok siap pakai di bawah batas minimum. Perlu pengadaan stok baru.',
      link: '/master-tool',
    },
    {
      id: 'act-repair',
      type: 'INFO',
      title: 'Verifikasi Barang Rusak / Servis',
      description: '1 unit barang berada di status perbaikan atau memerlukan kalibrasi ulang.',
      link: '/master-inventory',
    },
  ],
  upcomingLoans: [
    {
      id: 'loan-1',
      transactionNumber: 'LOAN-202610-0001',
      borrowerName: 'Budi Santoso',
      borrowerNik: 'EMP-0101',
      borrowerDept: 'Machining CNC',
      borrowerPhone: '6281234567890',
      loanDate: '2026-10-13T00:18:39.083Z',
      expectedReturnDate: '2026-10-15T00:18:39.083Z',
      purpose: 'Pengerjaan Cavity Mould Plate 4-Cavity Part Otomotif',
      itemsCount: 3,
      itemsSummary: 'Endmill Carbide 4 Flute D10 (2), Digital Caliper Mitutoyo 150mm (1)',
      status: 'TERLAMBAT',
      statusLabel: 'Terlambat',
    },
    {
      id: 'loan-2',
      transactionNumber: 'LOAN-202610-0002',
      borrowerName: 'Dian Pratama',
      borrowerNik: 'EMP-0102',
      borrowerDept: 'Mould Making',
      borrowerPhone: '6281398765432',
      loanDate: '2026-10-15T20:18:39.083Z',
      expectedReturnDate: '2026-10-16T03:18:39.083Z',
      purpose: 'Setup Clamping Visi Mesin Milling Makino V33i',
      itemsCount: 2,
      itemsSummary: 'Collet Chuck Holder BT40-ER32 (2)',
      status: 'TERLAMBAT',
      statusLabel: 'Terlambat',
    },
    {
      id: 'loan-3',
      transactionNumber: 'LOAN-202610-0003',
      borrowerName: 'Rizky Ramadhan',
      borrowerNik: 'EMP-0104',
      borrowerDept: 'Maintenance & Facility',
      borrowerPhone: '6282145678901',
      loanDate: '2026-10-16T00:18:39.083Z',
      expectedReturnDate: '2026-10-18T00:18:39.083Z',
      purpose: 'Overhaul Spindle & Penggantian Bearing Pompa Hidrolik',
      itemsCount: 8,
      itemsSummary: 'Digital Torque Wrench Tohnichi 20-100Nm (2), Pneumatic Die Grinder Shinano (1), Safety Helmet MSA V-Gard (5)',
      status: 'DIPINJAM',
      statusLabel: 'H-1',
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Transaksi Terlambat: LOAN-202610-0001',
      message: 'Budi Santoso (Machining CNC) belum mengembalikan 2 unit Endmill D10 & 1 Caliper Digital. Jatuh tempo kemarin.',
      type: 'OVERDUE',
      isRead: false,
      link: '/monitoring',
      createdAt: '2026-10-16T00:18:39.122Z',
    },
    {
      id: 'notif-2',
      title: 'Mendekati Jatuh Tempo: LOAN-202610-0002',
      message: 'Dian Pratama (Mould Making) meminjam 2 unit Collet BT40, batas waktu hari ini pukul 16:30.',
      type: 'WARNING',
      isRead: false,
      link: '/monitoring',
      createdAt: '2026-10-16T00:18:39.122Z',
    },
    {
      id: 'notif-3',
      title: 'Pemeliharaan Aset: INV-006',
      message: 'Infrared Thermometer Fluke 62 Max+ dijadwalkan kalibrasi tahunan.',
      type: 'INFO',
      isRead: true,
      link: '/master-inventory',
      createdAt: '2026-10-16T00:18:39.122Z',
    },
  ],
  allStockItems: [
    {
      id: 'tol-1',
      code: 'TOL-001',
      name: 'Endmill Carbide 4 Flute D10',
      type: 'Tool',
      category: 'Cutting & Milling Tools',
      location: 'Rak A-01-A',
      unit: 'PCS',
      totalStock: 15,
      availableStock: 12,
      borrowedStock: 3,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: false,
    },
    {
      id: 'tol-2',
      code: 'TOL-002',
      name: 'Dial Indicator Mitutoyo 0.01mm',
      type: 'Tool',
      category: 'Precision Measuring & QC',
      location: 'Kabinet QC-02',
      unit: 'UNIT',
      totalStock: 8,
      availableStock: 6,
      borrowedStock: 2,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: false,
    },
    {
      id: 'tol-3',
      code: 'TOL-003',
      name: 'Micrometer Digital Mitutoyo 0-25mm',
      type: 'Tool',
      category: 'Precision Measuring & QC',
      location: 'Kabinet QC-01',
      unit: 'UNIT',
      totalStock: 6,
      availableStock: 5,
      borrowedStock: 1,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: true,
    },
    {
      id: 'tol-4',
      code: 'TOL-004',
      name: 'Boring Bar Sandvik CoroTurn A16R',
      type: 'Tool',
      category: 'Cutting & Milling Tools',
      location: 'Rak B-03-A',
      unit: 'PCS',
      totalStock: 5,
      availableStock: 5,
      borrowedStock: 0,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: true,
    },
    {
      id: 'tol-5',
      code: 'TOL-005',
      name: 'Collet Chuck Holder BT40-ER32',
      type: 'Tool',
      category: 'Mould & Tooling Accessories',
      location: 'Rak A-02-B',
      unit: 'SET',
      totalStock: 10,
      availableStock: 8,
      borrowedStock: 2,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: false,
    },
    {
      id: 'tol-6',
      code: 'TOL-006',
      name: 'Tap Spiral Flute M8x1.25 OSG',
      type: 'Tool',
      category: 'Cutting & Milling Tools',
      location: 'Laci C-01-D',
      unit: 'PCS',
      totalStock: 20,
      availableStock: 17,
      borrowedStock: 3,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: false,
    },
    {
      id: 'tol-7',
      code: 'TOL-007',
      name: 'Digital Torque Wrench Tohnichi 20-100Nm',
      type: 'Tool',
      category: 'Precision Measuring & QC',
      location: 'Kabinet Tool-03',
      unit: 'UNIT',
      totalStock: 4,
      availableStock: 2,
      borrowedStock: 2,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: true,
    },
    {
      id: 'tol-8',
      code: 'TOL-008',
      name: 'Ball Nose Endmill R3x6x50',
      type: 'Tool',
      category: 'Cutting & Milling Tools',
      location: 'Rak A-01-C',
      unit: 'PCS',
      totalStock: 12,
      availableStock: 12,
      borrowedStock: 0,
      repairStock: 0,
      scrapStock: 0,
      minStock: 5,
      isLowStock: false,
    },
    {
      id: 'inv-1',
      code: 'INV-001',
      name: 'Digital Caliper Mitutoyo 150mm',
      type: 'Inventaris',
      category: 'Precision Measuring & QC',
      location: 'Lemari QC-01',
      unit: 'UNIT',
      totalStock: 1,
      availableStock: 0,
      borrowedStock: 1,
      repairStock: 0,
      scrapStock: 0,
      minStock: 2,
      isLowStock: true,
    },
    {
      id: 'inv-2',
      code: 'INV-002',
      name: 'Industrial Barcode Scanner Zebra DS2208',
      type: 'Inventaris',
      category: 'Hardware & Barcode Devices',
      location: 'Meja Dispatch Tool Room',
      unit: 'UNIT',
      totalStock: 1,
      availableStock: 1,
      borrowedStock: 0,
      repairStock: 0,
      scrapStock: 0,
      minStock: 2,
      isLowStock: true,
    },
    {
      id: 'inv-3',
      code: 'INV-003',
      name: 'Pneumatic Die Grinder Shinano',
      type: 'Inventaris',
      category: 'Pneumatic & Hand Tools',
      location: 'Rak Tool Maintenance',
      unit: 'UNIT',
      totalStock: 1,
      availableStock: 0,
      borrowedStock: 1,
      repairStock: 0,
      scrapStock: 0,
      minStock: 2,
      isLowStock: true,
    },
    {
      id: 'inv-4',
      code: 'INV-004',
      name: 'Rugged Tablet QC Panasonic Toughbook',
      type: 'Inventaris',
      category: 'Hardware & Barcode Devices',
      location: 'Ruang CMM Quality Control',
      unit: 'UNIT',
      totalStock: 1,
      availableStock: 1,
      borrowedStock: 0,
      repairStock: 0,
      scrapStock: 0,
      minStock: 2,
      isLowStock: true,
    },
    {
      id: 'inv-5',
      code: 'INV-005',
      name: 'Safety Helmet MSA V-Gard with Chin Strap',
      type: 'Inventaris',
      category: 'Safety & PPE Equipment',
      location: 'Loker Safety Store #1',
      unit: 'PCS',
      totalStock: 25,
      availableStock: 20,
      borrowedStock: 5,
      repairStock: 0,
      scrapStock: 0,
      minStock: 2,
      isLowStock: false,
    },
    {
      id: 'inv-6',
      code: 'INV-006',
      name: 'Infrared Thermometer Fluke 62 Max+',
      type: 'Inventaris',
      category: 'Precision Measuring & QC',
      location: 'Rak Kalibrasi & Service',
      unit: 'UNIT',
      totalStock: 1,
      availableStock: 0,
      borrowedStock: 0,
      repairStock: 1,
      scrapStock: 0,
      minStock: 2,
      isLowStock: true,
    },
  ],
};

export default function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(INITIAL_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
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
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(25);

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

  const kpi = data?.kpi || INITIAL_DASHBOARD_DATA.kpi;
  const allStockItems = data?.allStockItems || INITIAL_DASHBOARD_DATA.allStockItems;
  const upcomingLoans = data?.upcomingLoans || INITIAL_DASHBOARD_DATA.upcomingLoans;
  const notifications = data?.notifications || INITIAL_DASHBOARD_DATA.notifications;
  const actionItems = data?.actionItems || INITIAL_DASHBOARD_DATA.actionItems;

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

  const totalStockPages = Math.ceil(filteredStock.length / stockPageSize) || 1;
  const paginatedStock = filteredStock.slice(
    (stockPage - 1) * stockPageSize,
    stockPage * stockPageSize
  );

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
            <BarChartSection data={data?.barChartData || INITIAL_DASHBOARD_DATA.barChartData} />
          </div>
          <div className="lg:col-span-5">
            <DonutChartSection data={data?.donutChartData || INITIAL_DASHBOARD_DATA.donutChartData} />
          </div>
        </div>

        {/* Action Items Queue: Structured ERP Operational Table */}
        {actionItems.length > 0 && (
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Menunggu Tindakan Prioritas Admin ({actionItems.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Antrean tugas mendesak yang memerlukan penanganan admin
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded bg-white">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-28 whitespace-nowrap">PRIORITAS</th>
                    <th className="py-2.5 px-3 w-56 whitespace-nowrap">AGENDA TINDAKAN</th>
                    <th className="py-2.5 px-3">KETERANGAN &amp; DAMPAK</th>
                    <th className="py-2.5 px-3 text-right w-36 whitespace-nowrap">AKSI LANGSUNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actionItems.map((act: any) => {
                    const badgeClass =
                      act.type === 'DANGER'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : act.type === 'WARNING'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300';
                    const priorityLabel =
                      act.type === 'DANGER'
                        ? 'MENDESAK'
                        : act.type === 'WARNING'
                        ? 'PERHATIAN'
                        : 'INFO';

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}
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
                            className="inline-block px-2.5 py-1 text-xs font-semibold text-[#1E40AF] hover:text-white hover:bg-[#1E40AF] border border-[#1E40AF]/30 rounded transition-colors"
                          >
                            Tindak Lanjuti &rarr;
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
                    onChange={(e) => {
                      setStockSearch(e.target.value);
                      setStockPage(1);
                    }}
                    placeholder="Cari kode, nama barang, kategori..."
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStockFilterType('ALL');
                      setStockPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'ALL'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({allStockItems.length})
                  </button>
                  <button
                    onClick={() => {
                      setStockFilterType('Tool');
                      setStockPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'Tool'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tool Saja
                  </button>
                  <button
                    onClick={() => {
                      setStockFilterType('Inventaris');
                      setStockPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      stockFilterType === 'Inventaris'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Inventaris
                  </button>
                  <button
                    onClick={() => {
                      setStockFilterType('LOW');
                      setStockPage(1);
                    }}
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
                <table className="w-full text-left text-xs min-w-[1150px]">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3 whitespace-nowrap">KODE</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">NAMA BARANG</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">TIPE</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">KATEGORI</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">LOKASI RAK</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">TOTAL</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">TERSEDIA</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">DIPINJAM</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">PERAWATAN</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">MIN. STOK</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">STATUS PERSEDIAAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStock.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          Tidak ada data barang yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedStock.map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {item.type}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.location}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {item.totalStock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {item.availableStock}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600 tabular-nums whitespace-nowrap">
                            {item.borrowedStock}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700 tabular-nums whitespace-nowrap">
                            {item.repairStock}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums whitespace-nowrap">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {item.isLowStock ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                Stok Menipis (&le; {item.minStock})
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 whitespace-nowrap">
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">PEMINJAM</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">BARANG &amp; JUMLAH</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">JATUH TEMPO</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">STATUS JATUH TEMPO</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TINDAKAN</th>
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
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {loan.transactionNumber}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900">{loan.borrowerName}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {loan.borrowerNik} | {loan.borrowerDept}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                            {loan.itemsSummary}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 tabular-nums whitespace-nowrap">
                            {new Date(loan.loanDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                            {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
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
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <button
                                onClick={() => handleOpenExtend(loan)}
                                className="text-slate-700 hover:text-[#1E40AF] hover:underline font-semibold text-[11px]"
                              >
                                Perpanjang
                              </button>
                              {loan.borrowerPhone && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <a
                                    href={`https://wa.me/${loan.borrowerPhone}?text=${encodeURIComponent(
                                      `Halo ${loan.borrowerName}, pengingat pengembalian alat PT YPTI untuk transaksi ${loan.transactionNumber} (${loan.itemsSummary}). Jatuh tempo: ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}. Terima kasih.`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-500 hover:text-slate-900 hover:underline font-medium text-[11px]"
                                  >
                                    Hubungi WA
                                  </a>
                                </>
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
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3 whitespace-nowrap">WAKTU SISTEM</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">JENIS PERINGATAN</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">JUDUL NOTIFIKASI</th>
                      <th className="py-2.5 px-3">PESAN RINCIAN SCHEDULER</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TAUTAN</th>
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
