'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

function ReturnsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const txParam = searchParams.get('tx') || '';

  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(txParam);

  // Return modal state
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<{ [loanItemId: string]: { qty: number; condition: string } }>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActiveLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/loans?limit=50');
      if (res.ok) {
        const json = await res.json();
        const active = (json.data || []).filter((l: any) => l.status !== 'SELESAI');
        setActiveLoans(active);

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const empParam = params?.get('emp') || params?.get('nik');

        if (txParam) {
          const matched = active.find((l: any) => l.transactionNumber === txParam);
          if (matched) {
            handleOpenReturnModal(matched);
          }
        } else if (empParam) {
          setSearch(empParam);
          const matchedEmp = active.find((l: any) => l.employee?.nik?.toUpperCase() === empParam.toUpperCase());
          if (matchedEmp) {
            handleOpenReturnModal(matchedEmp);
          }
        }
      }
    } catch {
      showToast('Gagal memuat transaksi aktif.', 'error');
    } finally {
      setLoading(false);
    }
  }, [txParam, showToast]);

  useEffect(() => {
    fetchActiveLoans();
  }, [fetchActiveLoans]);

  const handleOpenReturnModal = (loan: any) => {
    setSelectedLoan(loan);
    const initialItems: Record<string, { qty: number; condition: string }> = {};
    for (const item of loan.items) {
      const remaining = item.quantity - item.returnedQuantity;
      if (remaining > 0) {
        initialItems[item.id] = { qty: remaining, condition: 'BAIK' };
      }
    }
    setReturnItems(initialItems);
    setReturnNotes('');
  };

  const handleProcessReturn = async () => {
    if (!selectedLoan) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, val]) => val.qty > 0)
      .map(([loanItemId, val]) => ({
        loanItemId,
        quantity: val.qty,
        condition: val.condition,
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
            ? 'Pengembalian selesai penuh! Status transaksi SELESAI.'
            : 'Pengembalian parsial berhasil dicatat.',
          'success'
        );
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
      l.employee?.nik.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
            DATA PENGEMBALIAN BARANG
          </h1>
          <p className="text-xs text-slate-500">
            Pencarian transaksi peminjaman aktif, pengembalian penuh atau parsial, dan verifikasi kondisi fisik
          </p>
        </div>

        <button
          onClick={fetchActiveLoans}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
        >
          Segarkan Data
        </button>
      </div>

      {/* Search box - Flat inline layout */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. transaksi, nama peminjam, atau NIK..."
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
          />
        </div>
      </div>

      {/* Table of active loans awaiting return - Flat seamless layout */}
      <div className="overflow-x-auto border-t border-slate-200 mt-2">
        <table className="w-full text-left text-xs min-w-[950px]">
          <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                <th className="py-2.5 px-3">PEMINJAM</th>
                <th className="py-2.5 px-3">DAFTAR BARANG DIPINJAM</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TGL PINJAM</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TENGGAT KEMBALI</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Memuat transaksi peminjaman aktif...
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi aktif yang menunggu pengembalian.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {loan.transactionNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{loan.employee?.name}</div>
                      <div className="text-[10px] text-slate-500 tabular-nums">
                        {loan.employee?.nik} • {loan.employee?.department}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5 max-w-xs">
                        {loan.items.map((it: any) => {
                          const remaining = it.quantity - it.returnedQuantity;
                          const name = it.tool ? it.tool.name : it.inventory?.name;
                          const code = it.tool ? it.tool.code : it.inventory?.code;
                          return (
                            <div key={it.id} className="flex items-center justify-between text-[11px]">
                              <span className="truncate text-slate-800">
                                <span className="font-bold text-slate-900 tabular-nums">{code}</span> {name}
                              </span>
                              <span className="font-semibold text-[#1E40AF] ml-2 shrink-0 tabular-nums">
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
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#D94841] border border-red-200">
                          Terlambat
                        </span>
                      )}
                      {loan.computedStatus === 'MENDEKATI_JATUH_TEMPO' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-amber-700 border border-amber-200">
                          Hari Ini
                        </span>
                      )}
                      {loan.computedStatus === 'DIPINJAM' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1E40AF] border border-blue-200">
                          Dipinjam
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReturnModal(loan)}
                        className="px-3 py-1 rounded bg-[#1E40AF] text-white hover:bg-[#1D4ED8] text-[11px] font-semibold transition-colors"
                      >
                        Verifikasi
                      </button>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Return Process Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-md border border-slate-200 border-t-4 border-t-[#1E40AF] shadow-xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold font-heading text-slate-900">
                Verifikasi Pengembalian: {selectedLoan.transactionNumber}
              </h2>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Borrower box */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{selectedLoan.employee?.name}</span>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    NIK: {selectedLoan.employee?.nik} • {selectedLoan.employee?.department}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  Tenggat: <span className="font-semibold text-slate-800">{new Date(selectedLoan.expectedReturnDate).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Items returning */}
              <div>
                <span className="font-semibold text-slate-800 mb-1.5 block">
                  Periksa Unit Fisik & Kondisi Barang Kembali:
                </span>
                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {selectedLoan.items.map((it: any) => {
                    const remaining = it.quantity - it.returnedQuantity;
                    const name = it.tool ? it.tool.name : it.inventory?.name;
                    const code = it.tool ? it.tool.code : it.inventory?.code;
                    const currentSetting = returnItems[it.id] || { qty: 0, condition: 'BAIK' };

                    return (
                      <div key={it.id} className="p-3 space-y-2 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 tabular-nums">{code}</span>
                            <span className="font-semibold text-slate-800 ml-2">{name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            Sisa Pinjaman: <span className="font-bold text-[#1E40AF]">{remaining} unit</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-medium mb-1">
                              Jumlah Dikembalikan (Unit)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={currentSetting.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || '0', 10);
                                setReturnItems({
                                  ...returnItems,
                                  [it.id]: { ...currentSetting, qty: Math.min(remaining, Math.max(0, val)) },
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs tabular-nums focus:outline-none focus:border-[#1E40AF]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-medium mb-1">
                              Kondisi Fisik Saat Kembali
                            </label>
                            <select
                              value={currentSetting.condition}
                              onChange={(e) => {
                                setReturnItems({
                                  ...returnItems,
                                  [it.id]: { ...currentSetting, condition: e.target.value },
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#1E40AF]"
                            >
                              <option value="BAIK">Kondisi Baik (Kembali ke Stok Tersedia)</option>
                              <option value="AUS">Aus / Tumpul (Masuk Stok Perawatan / Regrind)</option>
                              <option value="RUSAK">Rusak / Cacat (Masuk Stok Rusak)</option>
                              <option value="HILANG">Hilang (Potong Total Stok)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Pengembalian / Keterangan Cacat Fisik
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Contoh: Kondisi fisik normal dan tersimpan rapi di wadah."
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] focus:bg-white text-xs"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                Barang dengan kondisi <span className="font-bold text-[#1E40AF]">BAIK</span> akan langsung menambah stok tersedia. Barang <span className="font-bold text-[#D94841]">RUSAK</span> akan dicatat pada stok perbaikan dan tidak dihitung siap pakai.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessReturn}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
              >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi Pengembalian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Memuat data...</div>}>
        <ReturnsContent />
      </Suspense>
    </AppShell>
  );
}
