'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScanBarcode } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { BarcodeScannerModal } from '@/components/qr/QrScannerModal';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { invalidateDashboardSummaryCache } from '@/lib/dashboard-client';

interface ReturnEmployeeRef {
  id: string;
  nik: string;
  name: string;
  department?: string;
}

interface ActiveLoanItem {
  id: string;
  quantity: number;
  returnedQuantity: number;
  tool?: { code: string; name: string } | null;
  inventory?: { code: string; name: string } | null;
  toolUnit?: {
    unitCode: string;
    supplierCode?: string | null;
    remainingLifeMinutes: number;
  } | null;
  currentHolder?: ReturnEmployeeRef | null;
}

interface ActiveLoan {
  id: string;
  transactionNumber: string;
  status: string;
  computedStatus?: string;
  loanDate: string;
  expectedReturnDate: string;
  employee?: ReturnEmployeeRef | null;
  items: ActiveLoanItem[];
}

function ReturnsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const txParam = searchParams.get('tx') || '';

  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(txParam);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [returnPage, setReturnPage] = useState(1);
  const returnPageSize = 8;

  // Return modal state
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);
  const [returnItems, setReturnItems] = useState<{
    [loanItemId: string]: { qty: number; condition: string; usedMinutes: number };
  }>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenReturnModal = useCallback((loan: ActiveLoan) => {
    setSelectedLoan(loan);
    const initialItems: Record<string, { qty: number; condition: string; usedMinutes: number }> = {};
    for (const item of loan.items) {
      const remaining = item.quantity - item.returnedQuantity;
      if (remaining > 0) {
        initialItems[item.id] = { qty: remaining, condition: 'BAIK', usedMinutes: 0 };
      }
    }
    setReturnItems(initialItems);
    setReturnNotes('');
  }, []);

  const loadActiveLoansData = useCallback(async () => {
    const res = await fetch('/api/loans?limit=100');
    if (res.ok) {
      const json = await res.json();
      const active = ((json.data || []) as ActiveLoan[]).filter((l) => l.status !== 'SELESAI');
      setActiveLoans(active);

      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const empParam = params?.get('emp') || params?.get('nik');

      if (txParam) {
        const matched = active.find((l) => l.transactionNumber === txParam);
        if (matched) {
          handleOpenReturnModal(matched);
        }
      } else if (empParam) {
        setSearch(empParam);
        const matchedEmp = active.find((l) => l.employee?.nik?.toUpperCase() === empParam.toUpperCase());
        if (matchedEmp) {
          handleOpenReturnModal(matchedEmp);
        }
      }
    }
  }, [txParam, handleOpenReturnModal]);

  const fetchActiveLoans = useCallback(async () => {
    setLoading(true);
    try {
      await loadActiveLoansData();
    } catch {
      showToast('Gagal memuat transaksi aktif.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadActiveLoansData, showToast]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        await loadActiveLoansData();
      } catch {
        if (active) showToast('Gagal memuat transaksi aktif.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [loadActiveLoansData, showToast]);

  const handleScanReturnCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // 1. Cek No. Transaksi
    const matchedTx = activeLoans.find((l) => l.transactionNumber.toUpperCase() === code);
    if (matchedTx) {
      handleOpenReturnModal(matchedTx);
      setSearch('');
      showToast(`Transaksi ${matchedTx.transactionNumber} ditemukan.`, 'success');
      return;
    }

    // 2. Cek Kode Barcode Unit Tool yang masih belum dikembalikan (ToolUnit.unitCode / supplierCode)
    const matchedUnitTx = activeLoans.find((l) =>
      (l.items || []).some(
        (it) =>
          it.quantity - it.returnedQuantity > 0 &&
          (it.toolUnit?.unitCode?.toUpperCase() === code ||
            it.toolUnit?.supplierCode?.toUpperCase() === code)
      )
    );
    if (matchedUnitTx) {
      handleOpenReturnModal(matchedUnitTx);
      setSearch('');
      showToast(`Unit barcode ${code} ditemukan pada transaksi ${matchedUnitTx.transactionNumber}.`, 'success');
      return;
    }

    // 3. Cek NIK Karyawan (peminjam awal atau pemegang terakhir yang masih membawa item aktif)
    const matchedEmp = activeLoans.find(
      (l) =>
        l.employee?.nik?.toUpperCase() === code ||
        (l.items || []).some(
          (it) =>
            it.quantity - it.returnedQuantity > 0 &&
            it.currentHolder?.nik?.toUpperCase() === code
        )
    );
    if (matchedEmp) {
      handleOpenReturnModal(matchedEmp);
      setSearch('');
      showToast(`Transaksi untuk NIK ${code} ditemukan.`, 'success');
      return;
    }

    showToast(`Tidak ada pinjaman aktif untuk kode "${code}".`, 'error');
  };

  // Auto-capture USB Barcode Scanner langsung di halaman Pengembalian
  useBarcodeScanner({
    enabled: !isScannerOpen && !selectedLoan,
    onScan: (code) => {
      handleScanReturnCode(code);
    },
  });

  const handleProcessReturn = async () => {
    if (!selectedLoan) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([, val]) => val.qty > 0)
      .map(([loanItemId, val]) => ({
        loanItemId,
        quantity: val.qty,
        condition: val.condition,
        usedMinutes: val.usedMinutes || 0,
      }));

    if (itemsToReturn.length === 0) {
      showToast('Pilih minimal 1 unit untuk dikembalikan.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        loanTransactionId: selectedLoan.id,
        returnItems: itemsToReturn,
        notes: returnNotes,
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal memproses pengembalian.', 'error');
      } else {
        showToast(
          json.data?.allDone
            ? 'Pengembalian selesai penuh! Stok fisik & sisa umur pakai telah diperbarui.'
            : 'Pengembalian parsial berhasil dicatat.',
          'success'
        );
        invalidateDashboardSummaryCache();
        setSelectedLoan(null);
        fetchActiveLoans();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLoans = activeLoans.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.transactionNumber.toLowerCase().includes(q) ||
      l.employee?.name.toLowerCase().includes(q) ||
      l.employee?.nik.toLowerCase().includes(q) ||
      (l.items || []).some(
        (it) =>
          it.toolUnit?.unitCode?.toLowerCase().includes(q) ||
          it.toolUnit?.supplierCode?.toLowerCase().includes(q) ||
          it.currentHolder?.name?.toLowerCase().includes(q) ||
          it.currentHolder?.nik?.toLowerCase().includes(q)
      )
    );
  });

  const totalReturnPages = Math.ceil(filteredLoans.length / returnPageSize) || 1;
  const paginatedReturns = filteredLoans.slice(
    (returnPage - 1) * returnPageSize,
    returnPage * returnPageSize
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Pengembalian &amp; Inspeksi Fisik
            </h1>
            <span className="text-xs font-semibold text-[#1E40AF]">
              Scanner USB Otomatis Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tembakkan scanner barcode USB ke stiker unit untuk langsung membuka verifikasi pengembalian, inspeksi kondisi, dan pengembalian stok atomik.
          </p>
        </div>

        <RefreshButton onRefresh={fetchActiveLoans} loading={loading} />
      </div>

      {/* Unified Search & Fast Barcode Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (filteredLoans.length === 1) {
                handleOpenReturnModal(filteredLoans[0]);
              } else if (search.trim()) {
                handleScanReturnCode(search);
              }
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setReturnPage(1);
              }}
              placeholder="Scan barcode unit, no. transaksi, nama peminjam, atau NIK..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E40AF]"
            />
            {filteredLoans.length === 1 && search.trim() !== '' && (
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                Verifikasi
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-white border border-[#1E40AF] hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>Scan Barcode Unit</span>
          </button>
        </div>
        <span className="text-xs text-slate-500 font-medium tabular-nums">
          {filteredLoans.length} Transaksi Menunggu Pengembalian
        </span>
      </div>

      {/* Table of active loans awaiting return */}
      <div className="overflow-x-auto border border-slate-200 rounded bg-white">
        {loading ? (
          <SkeletonTable rows={5} cols={7} className="p-2" />
        ) : filteredLoans.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pinjaman Aktif"
            description={
              search
                ? `Tidak ditemukan transaksi aktif untuk pencarian "${search}".`
                : 'Semua perkakas telah dikembalikan dengan tertib ke rak penyimpanan.'
            }
            actionLabel={search ? 'Reset Pencarian' : undefined}
            onAction={search ? () => setSearch('') : undefined}
          />
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-200">
              {paginatedReturns.map((loan) => (
                <div key={loan.id} className="p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {loan.transactionNumber}
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 mt-0.5">
                        {loan.employee?.name}
                      </div>
                      <div className="text-xs text-slate-600 tabular-nums">
                        {loan.employee?.nik} | {loan.employee?.department}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold ${
                        loan.computedStatus === 'TERLAMBAT'
                          ? 'text-[#991B1B]'
                          : loan.computedStatus === 'MENDEKATI_JATUH_TEMPO'
                          ? 'text-[#92400E]'
                          : 'text-slate-700'
                      }`}
                    >
                      {loan.computedStatus === 'TERLAMBAT'
                        ? 'Terlambat'
                        : loan.computedStatus === 'MENDEKATI_JATUH_TEMPO'
                        ? 'Hari Ini'
                        : 'Dipinjam'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {loan.items.map((it) => {
                      const remaining = it.quantity - it.returnedQuantity;
                      const name = it.tool ? it.tool.name : it.inventory?.name;
                      const code = it.toolUnit ? it.toolUnit.unitCode : (it.tool ? it.tool.code : it.inventory?.code);
                      const holder = it.currentHolder && it.currentHolder.id !== loan.employee?.id ? it.currentHolder : null;
                      return (
                        <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-slate-800">
                            <span className="font-mono font-bold text-slate-900 tabular-nums">{code}</span> {name}
                            {holder && (
                              <span className="ml-1 text-[11px] font-semibold text-[#1E40AF]">
                                (Shift {holder.name})
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-[#1E40AF] shrink-0 tabular-nums">
                            {remaining}/{it.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-600 tabular-nums">
                      Tenggat{' '}
                      {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => handleOpenReturnModal(loan)}
                      className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
                    >
                      Verifikasi Fisik
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">PEMINJAM</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">DAFTAR BARANG DIPINJAM</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">TENGGAT KEMBALI</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReturns.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {loan.transactionNumber}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{loan.employee?.name}</div>
                        <div className="text-[11px] text-slate-600 tabular-nums">
                          {loan.employee?.nik} | {loan.employee?.department}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1 max-w-sm">
                          {loan.items.map((it) => {
                            const remaining = it.quantity - it.returnedQuantity;
                            const name = it.tool ? it.tool.name : it.inventory?.name;
                            const code = it.toolUnit ? it.toolUnit.unitCode : (it.tool ? it.tool.code : it.inventory?.code);
                            const holder = it.currentHolder && it.currentHolder.id !== loan.employee?.id ? it.currentHolder : null;
                            return (
                              <div key={it.id} className="flex items-center justify-between text-[11px] gap-2">
                                <span className="truncate text-slate-800">
                                  <span className="font-mono font-bold text-slate-900 tabular-nums">{code}</span> {name}
                                  {holder && (
                                    <span className="ml-1 text-[11px] font-semibold text-[#1E40AF]">
                                      (Shift {holder.name})
                                    </span>
                                  )}
                                </span>
                                <span className="font-semibold text-[#1E40AF] shrink-0 tabular-nums">
                                  {remaining} / {it.quantity} unit
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                        {new Date(loan.loanDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                        {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {loan.computedStatus === 'TERLAMBAT' && (
                          <span className="text-xs font-bold text-[#991B1B]">
                            Terlambat
                          </span>
                        )}
                        {loan.computedStatus === 'MENDEKATI_JATUH_TEMPO' && (
                          <span className="text-xs font-semibold text-[#92400E]">
                            Hari Ini
                          </span>
                        )}
                        {loan.computedStatus === 'DIPINJAM' && (
                          <span className="text-xs font-medium text-slate-600">
                            Dipinjam
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReturnModal(loan)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
                        >
                          Verifikasi Fisik
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Navigasi Paging dengan Ikon Panah Kiri / Kanan */}
      {filteredLoans.length > returnPageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
          <span>
            Halaman <strong className="text-slate-900">{returnPage}</strong> dari <strong className="text-slate-900">{totalReturnPages}</strong> ({filteredLoans.length} total transaksi)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReturnPage((p) => Math.max(1, p - 1))}
              disabled={returnPage <= 1}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
              title="Halaman Sebelumnya"
              aria-label="Halaman Sebelumnya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setReturnPage((p) => Math.min(totalReturnPages, p + 1))}
              disabled={returnPage >= totalReturnPages}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
              title="Halaman Selanjutnya"
              aria-label="Halaman Selanjutnya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Return Process Modal (Clean Industrial Inspection) */}
      {selectedLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedLoan(null)}
        >
          <div
            className="bg-white rounded border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-sm font-bold font-heading text-slate-900">
                Verifikasi Pengembalian Fisik
              </h2>
              <p className="text-[11px] text-slate-500 tabular-nums">
                No. Transaksi <span className="font-bold text-slate-800">{selectedLoan.transactionNumber}</span>
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
              {/* Borrower Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="font-semibold text-slate-900 block font-heading">
                  {selectedLoan.employee?.name} ({selectedLoan.employee?.nik})
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedLoan.employee?.department} | Tenggat {new Date(selectedLoan.expectedReturnDate).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Items List to Verify */}
              <div className="space-y-3">
                <div className="font-semibold text-slate-800 text-xs">
                  Daftar Barang &amp; Pemeriksaan Kondisi Fisik
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded max-h-[260px] overflow-y-auto">
                  {selectedLoan.items.map((item) => {
                    const remaining = item.quantity - item.returnedQuantity;
                    if (remaining <= 0) return null;

                    const name = item.tool ? item.tool.name : item.inventory?.name;
                    const code = item.toolUnit ? item.toolUnit.unitCode : (item.tool ? item.tool.code : item.inventory?.code);
                    const currentVal = returnItems[item.id] || { qty: remaining, condition: 'BAIK', usedMinutes: 0 };

                    return (
                      <div key={item.id} className="p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-semibold text-slate-900 min-w-0">
                            <span className="font-mono tabular-nums font-bold text-[#1E40AF]">{code}</span> | {name}
                          </span>
                          <span className="text-slate-500 text-[11px] tabular-nums shrink-0">
                            {item.toolUnit
                              ? `Sisa Umur: ${item.toolUnit.remainingLifeMinutes} mnt`
                              : `Tersisa ${remaining} unit`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          {/* Return Qty */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-slate-600 font-medium">Jml</label>
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              value={currentVal.qty}
                              onChange={(e) => {
                                const q = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0));
                                setReturnItems({
                                  ...returnItems,
                                  [item.id]: { ...currentVal, qty: q },
                                });
                              }}
                              className="w-14 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center font-bold tabular-nums"
                            />
                            <span className="text-[11px] text-slate-400">Unit</span>
                          </div>

                          {/* Used Minutes for ToolUnit */}
                          {item.toolUnit ? (
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] text-slate-600 font-medium whitespace-nowrap">Pakai</label>
                              <input
                                type="number"
                                min={0}
                                value={currentVal.usedMinutes}
                                onChange={(e) => {
                                  const m = Math.max(0, parseInt(e.target.value) || 0);
                                  setReturnItems({
                                    ...returnItems,
                                    [item.id]: { ...currentVal, usedMinutes: m },
                                  });
                                }}
                                className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center font-bold tabular-nums"
                              />
                              <span className="text-[11px] text-slate-400">mnt</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          {/* Condition Selector (Single-Color Dropdown) */}
                          <div className="flex items-center gap-1.5 sm:justify-end min-w-0">
                            <label className="text-[11px] text-slate-600 font-medium whitespace-nowrap shrink-0">
                              Kondisi
                            </label>
                            <select
                              value={currentVal.condition}
                              onChange={(e) =>
                                setReturnItems({
                                  ...returnItems,
                                  [item.id]: { ...currentVal, condition: e.target.value },
                                })
                              }
                              className="flex-1 sm:flex-initial min-w-0 w-full sm:w-auto bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                            >
                              <option value="BAIK">Baik (Siap Pakai)</option>
                              <option value="PERLU_ASAH">Perlu Asah (Kritis)</option>
                              <option value="RUSAK">Rusak / Perlu Servis</option>
                              <option value="HILANG">Hilang</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Kondisi Fisik / Kerusakan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Catat kondisi mata pisau aus, gompal, atau kelengkapan kotak..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleProcessReturn}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Memproses Pengembalian...' : 'Selesaikan Pengembalian Fisik'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setIsScannerOpen(false);
          handleScanReturnCode(code);
        }}
        title="Pindai Barcode Unit Pengembalian"
      />
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">Memuat modul pengembalian...</div>}>
        <ReturnsContent />
      </Suspense>
    </AppShell>
  );
}
