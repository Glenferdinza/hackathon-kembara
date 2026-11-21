'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScanBarcode, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { BarcodeScannerModal } from '@/components/qr/QrScannerModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface ScannedUnitDetail {
  id: string;
  unitCode: string;
  supplierCode?: string | null;
  maxLifeMinutes: number;
  usedLifeMinutes: number;
  remainingLifeMinutes: number;
  resharpenCount: number;
  status: string;
  notes?: string | null;
  tool: {
    id: string;
    code: string;
    name: string;
    specifications?: string | null;
    location: string;
    price: number;
    lifeAlertPercent: number;
    category?: { name: string } | null;
  };
  loanItems?: Array<{
    currentHolder?: { nik: string; name: string; shift?: string | null; department: string } | null;
    loanTransaction?: {
      transactionNumber: string;
      expectedReturnDate: string;
      employee?: { nik: string; name: string; department: string; shift?: string | null } | null;
    } | null;
  }>;
  usageLogs?: Array<{
    id: string;
    usedMinutes: number;
    remainingAfter: number;
    actionType: string;
    notes?: string | null;
    createdAt: string;
    employee: { nik: string; name: string; shift?: string | null };
  }>;
}

function ScanToolContent() {
  const searchParams = useSearchParams();
  const initialCodeParam = searchParams.get('code')?.trim().toUpperCase() || '';
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [queryCode, setQueryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [unitDetail, setUnitDetail] = useState<ScannedUnitDetail | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const lookupSeqRef = useRef(0);
  const lastAutoCodeRef = useRef('');

  const lookupUnit = useCallback(
    async (codeToFind?: string) => {
      const clean = (codeToFind ?? queryCode).trim().toUpperCase();
      if (!clean) return;
      const seq = ++lookupSeqRef.current;
      setQueryCode(clean);
      setLoading(true);
      try {
        const res = await fetch(`/api/tool-units?code=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (lookupSeqRef.current !== seq) return;
        if (!res.ok) {
          showToast(json.error || `Unit barcode "${clean}" tidak ditemukan.`, 'error');
          setUnitDetail(null);
          if (document.activeElement === queryInputRef.current) {
            queryInputRef.current?.select();
          }
        } else {
          setUnitDetail(json.data);
          // Kosongkan input setelah scan sukses agar tembakan USB barcode berikutnya tidak menumpuk
          setQueryCode('');
        }
      } catch {
        if (lookupSeqRef.current !== seq) return;
        showToast('Gagal memeriksa kode barcode unit.', 'error');
        if (document.activeElement === queryInputRef.current) {
          queryInputRef.current?.select();
        }
      } finally {
        if (lookupSeqRef.current === seq) {
          setLoading(false);
        }
      }
    },
    [queryCode, showToast]
  );

  // Auto-capture USB Barcode Scanner langsung di halaman tanpa perlu buka modal
  useBarcodeScanner({
    enabled: !isScannerOpen,
    onScan: (code) => {
      void lookupUnit(code);
    },
  });

  const lookupUnitRef = useRef(lookupUnit);
  useEffect(() => {
    lookupUnitRef.current = lookupUnit;
  }, [lookupUnit]);

  useEffect(() => {
    if (!initialCodeParam || lastAutoCodeRef.current === initialCodeParam) return;
    lastAutoCodeRef.current = initialCodeParam;
    const timer = window.setTimeout(() => {
      void lookupUnitRef.current(initialCodeParam);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCodeParam]);

  const handleResharpen = async () => {
    if (!unitDetail) return;
    const ok = await confirm({
      title: 'Konfirmasi Selesai Asah & Reset Umur Pakai',
      message: `Reset umur pakai unit ${unitDetail.unitCode} kembali ke ${unitDetail.maxLifeMinutes.toLocaleString('id-ID')} menit dan aktifkan kembali untuk peminjaman?`,
      confirmText: 'Reset Umur Pakai',
      cancelText: 'Batal',
      type: 'primary',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/tool-units/${unitDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESHARPEN' }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal reset umur pakai.', 'error');
      } else {
        showToast('Umur pakai unit berhasil di-reset dan siap dipinjam.', 'success');
        await lookupUnit(unitDetail.unitCode);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  const pct =
    unitDetail && unitDetail.maxLifeMinutes > 0
      ? Math.max(0, Math.min(100, Math.round((unitDetail.remainingLifeMinutes / unitDetail.maxLifeMinutes) * 100)))
      : 0;
  const activeLoan = unitDetail?.loanItems?.[0];
  const currentHolder = activeLoan?.currentHolder || activeLoan?.loanTransaction?.employee;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
                Cek Barcode &amp; Umur Tool
              </h1>
              <span className="text-xs font-semibold text-[#1E40AF]">
                Scanner USB Otomatis Aktif
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Tembakkan scanner barcode USB langsung ke stiker wadah tool untuk mengecek sisa umur pakai (menit), harga, dan pemegang aktif.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Buka Pemindai Kamera / USB</span>
          </button>
        </div>

        {/* Form Input Scan Cepat */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupUnit();
          }}
          className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            ref={queryInputRef}
            type="text"
            autoFocus
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
            placeholder="Scan barcode unit wadah tool (contoh TOL-001-U01) lalu tekan Enter..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1E40AF]"
          />
          <button
            type="submit"
            disabled={loading || !queryCode.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Memeriksa...' : 'Cek Status Unit'}
          </button>
        </form>

        {!unitDetail ? (
          <div className="bg-white border border-slate-200 rounded">
            <EmptyState
              title="Siap Memindai Barcode Wadah Tool"
              description="Tembakkan scanner barcode USB langsung ke stiker wadah tool atau tekan tombol Buka Pemindai Kamera / USB di atas."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded p-3.5 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {unitDetail.unitCode}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        unitDetail.status === 'TERSEDIA'
                          ? 'text-[#1E40AF]'
                          : unitDetail.status === 'PERLU_ASAH'
                          ? 'text-[#92400E]'
                          : unitDetail.status === 'RUSAK' || unitDetail.status === 'HILANG'
                          ? 'text-[#991B1B]'
                          : 'text-slate-700'
                      }`}
                    >
                      {unitDetail.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    {unitDetail.tool.name} ({unitDetail.tool.code})
                  </h2>
                  <p className="text-xs text-slate-500">
                    {unitDetail.tool.category?.name || '-'} | Rak {unitDetail.tool.location} | Harga Satuan Rp
                    {(unitDetail.tool.price || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                {(unitDetail.status === 'PERLU_ASAH' || unitDetail.status === 'RUSAK') && (
                  <button
                    type="button"
                    onClick={handleResharpen}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Selesai Asah &amp; Reset Umur</span>
                  </button>
                )}
              </div>

              {/* Indikator Sisa Umur Pakai */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-700">Sisa Umur Pakai Unit (Tool Life)</span>
                    <span className={`font-bold tabular-nums ${pct <= (unitDetail.tool.lifeAlertPercent || 15) ? 'text-red-800' : 'text-[#1E40AF]'}`}>
                      {unitDetail.remainingLifeMinutes.toLocaleString('id-ID')} / {unitDetail.maxLifeMinutes.toLocaleString('id-ID')} Menit ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct <= (unitDetail.tool.lifeAlertPercent || 15) ? 'bg-red-700' : 'bg-[#1E40AF]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 tabular-nums">
                    <span>Total Terpakai {unitDetail.usedLifeMinutes.toLocaleString('id-ID')} menit</span>
                    <span>Riwayat Asah Ulang {unitDetail.resharpenCount} kali</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <div className="text-[11px] text-slate-500 font-medium">Pemegang Aktif Saat Ini</div>
                  {currentHolder ? (
                    <>
                      <div className="font-bold text-slate-900">{currentHolder.name}</div>
                      <div className="text-[11px] font-mono text-slate-600">{currentHolder.nik}</div>
                      <div className="text-[11px] text-slate-600">
                        {currentHolder.department} {currentHolder.shift ? `| ${currentHolder.shift}` : ''}
                      </div>
                      {activeLoan?.loanTransaction?.transactionNumber && (
                        <div className="text-[11px] font-semibold text-[#1E40AF] pt-1">
                          {activeLoan.loanTransaction.transactionNumber}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="font-semibold text-slate-700 pt-1">
                      Tersimpan di Tool Room ({unitDetail.tool.location})
                    </div>
                  )}
                </div>
              </div>

              {/* Log Pemakaian Menit per Operator */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riwayat Pemakaian Menit &amp; Serah Terima Unit
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold">
                      <tr>
                        <th className="py-2 px-3">WAKTU</th>
                        <th className="py-2 px-3">OPERATOR</th>
                        <th className="py-2 px-3">AKSI</th>
                        <th className="py-2 px-3 text-right">DURASI PAKAI</th>
                        <th className="py-2 px-3 text-right">SISA UMUR</th>
                        <th className="py-2 px-3">CATATAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unitDetail.usageLogs && unitDetail.usageLogs.length > 0 ? (
                        unitDetail.usageLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 tabular-nums text-slate-600">
                              {new Date(log.createdAt).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {log.employee.name} ({log.employee.nik})
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-700">
                              {log.actionType}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                              {log.usedMinutes.toLocaleString('id-ID')} mnt
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#1E40AF] tabular-nums">
                              {log.remainingAfter.toLocaleString('id-ID')} mnt
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {log.notes || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            Belum ada catatan penggunaan menit pada unit ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setIsScannerOpen(false);
          lookupUnit(code);
        }}
        title="Pindai Barcode Wadah Tool"
      />
    </AppShell>
  );
}

export default function ScanToolPage() {
  return (
    <Suspense fallback={null}>
      <ScanToolContent />
    </Suspense>
  );
}
