'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';

interface AssignedUnit {
  id: string;
  unitCode: string;
  maxLifeMinutes: number;
  remainingLifeMinutes: number;
}

interface ReadyRequest {
  id: string;
  requestNumber: string;
  purpose?: string | null;
  expectedReturnDate: string;
  admin?: { name: string } | null;
  items: Array<{
    id: string;
    itemType: string;
    requestedQty: number;
    tool?: { code: string; name: string; location: string } | null;
    inventory?: { code: string; name: string; location: string } | null;
    assignedUnits?: AssignedUnit[];
  }>;
}

interface IncomingHandover {
  id: string;
  handoverNumber: string;
  usedMinutes: number;
  proofImageData?: string | null;
  conditionNotes?: string | null;
  createdAt: string;
  fromEmployee: { nik: string; name: string; shift?: string | null; department: string };
  toolUnit?: {
    unitCode: string;
    maxLifeMinutes: number;
    remainingLifeMinutes: number;
  } | null;
  loanItem: {
    tool?: { code: string; name: string; lifeAlertPercent: number } | null;
    inventory?: { code: string; name: string } | null;
  };
  loanTransaction: { transactionNumber: string; expectedReturnDate: string };
}

interface HeldItem {
  id: string;
  itemType: string;
  quantity: number;
  tool?: { id: string; code: string; name: string; location: string; lifeAlertPercent: number } | null;
  inventory?: { id: string; code: string; name: string; location: string } | null;
  toolUnit?: {
    id: string;
    unitCode: string;
    maxLifeMinutes: number;
    usedLifeMinutes: number;
    remainingLifeMinutes: number;
  } | null;
  loanTransaction: {
    id: string;
    transactionNumber: string;
    expectedReturnDate: string;
  };
  handovers?: Array<{
    id: string;
    handoverNumber: string;
    toEmployee: { name: string; nik: string; shift?: string | null };
  }>;
}

export default function OperatorDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [readyRequests, setReadyRequests] = useState<ReadyRequest[]>([]);
  const [waitingAdminRequests, setWaitingAdminRequests] = useState<Array<{ id: string; requestNumber: string; items: Array<{ requestedQty: number; tool?: { name: string } | null; inventory?: { name: string } | null }> }>>([]);
  const [incomingHandovers, setIncomingHandovers] = useState<IncomingHandover[]>([]);
  const [heldItems, setHeldItems] = useState<HeldItem[]>([]);
  const [criticalLifeCount, setCriticalLifeCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);

  const loadSummaryData = useCallback(async () => {
    const res = await fetch('/api/operator/summary');
    if (res.ok) {
      const json = await res.json();
      setReadyRequests(json.readyRequests || []);
      setWaitingAdminRequests(json.waitingAdminRequests || []);
      setIncomingHandovers(json.incomingHandovers || []);
      setHeldItems(json.heldItems || []);
      setCriticalLifeCount(json.criticalLifeCount || 0);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      await loadSummaryData();
    } catch {
      showToast('Gagal memuat portal operator.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadSummaryData, showToast]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch('/api/operator/summary');
        if (res.ok && active) {
          const json = await res.json();
          setReadyRequests(json.readyRequests || []);
          setWaitingAdminRequests(json.waitingAdminRequests || []);
          setIncomingHandovers(json.incomingHandovers || []);
          setHeldItems(json.heldItems || []);
          setCriticalLifeCount(json.criticalLifeCount || 0);
        }
      } catch {
        if (active) showToast('Gagal memuat portal operator.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleRequestAction = async (reqId: string, action: 'OPERATOR_ACCEPT' | 'OPERATOR_REJECT') => {
    const isAccept = action === 'OPERATOR_ACCEPT';
    const ok = await confirm({
      title: isAccept ? 'Konfirmasi Terima Perkakas' : 'Tolak Penyiapan Barang',
      message: isAccept
        ? 'Pastikan fisik unit perkakas yang Anda terima di loket sesuai dengan kode barcode di daftar. Lanjutkan menerima barang?'
        : 'Tolak barang yang disiapkan? Unit barcode akan dikembalikan menjadi tersedia di Tool Room.',
      confirmText: isAccept ? 'Terima Sekarang' : 'Ya, Tolak',
      cancelText: 'Batal',
      type: isAccept ? 'primary' : 'warning',
    });
    if (!ok) return;

    setProcessingId(reqId);
    try {
      const res = await fetch(`/api/loan-requests/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal memproses konfirmasi.', 'error');
      } else {
        showToast(
          isAccept ? 'Peminjaman resmi aktif di tangan Anda.' : 'Pengajuan penyiapan ditolak.',
          'success'
        );
        fetchSummary();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleHandoverAction = async (hovId: string, action: 'ACCEPT' | 'REJECT') => {
    const isAccept = action === 'ACCEPT';
    const ok = await confirm({
      title: isAccept ? 'Konfirmasi Terima Hak Pinjam Shift' : 'Tolak Pengalihan Hak Pinjam',
      message: isAccept
        ? 'Dengan menekan Terima, fisik barang dan sisa umur pakai menjadi tanggung jawab Anda. Lanjutkan?'
        : 'Tolak pengalihan ini? Tanggung jawab pinjaman akan tetap berada pada pengirim sebelumnya.',
      confirmText: isAccept ? 'Terima Hak Pinjam' : 'Tolak Pengalihan',
      cancelText: 'Batal',
      type: isAccept ? 'primary' : 'danger',
    });
    if (!ok) return;

    setProcessingId(hovId);
    try {
      const res = await fetch(`/api/handovers/${hovId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal memproses pengalihan shift.', 'error');
      } else {
        showToast(
          isAccept ? 'Hak pinjam berhasil diterima ke akun Anda.' : 'Pengalihan shift ditolak.',
          'success'
        );
        fetchSummary();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Portal Operasional Peminjaman Operator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau perkakas di tangan Anda, terima barang siap ambil, serta konfirmasi serah terima antar shift.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton onRefresh={fetchSummary} loading={loading} />
            <Link
              href="/operator/request"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors whitespace-nowrap"
            >
              + Request Pinjam Baru
            </Link>
          </div>
        </div>

        {/* Ringkasan KPI Strip Flat */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 min-w-0 border-b border-r lg:border-b-0 border-slate-200">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate">Barang di Tangan Saya</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-0.5">{heldItems.length}</div>
            <div className="text-[10px] text-slate-400">Item pinjaman aktif</div>
          </div>
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 min-w-0 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate">Siap Diambil (Loket)</div>
            <div className="text-lg sm:text-xl font-bold text-[#1E40AF] tabular-nums mt-0.5">{readyRequests.length}</div>
            <div className="text-[10px] text-slate-400">Menunggu tombol Terima</div>
          </div>
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 min-w-0 border-r border-slate-200">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate">Waiting List Shift</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-0.5">{incomingHandovers.length}</div>
            <div className="text-[10px] text-slate-400">Serah terima masuk</div>
          </div>
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate">Umur Pakai Kritis</div>
            <div className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${criticalLifeCount > 0 ? 'text-red-800' : 'text-slate-900'}`}>
              {criticalLifeCount}
            </div>
            <div className="text-[10px] text-slate-400">Perlu segera kembali ke rak</div>
          </div>
        </div>

        {/* Bagian 1: Barang Sudah Disiapkan Admin Tool Room (Menunggu Terima/Tolak Operator) */}
        {readyRequests.length > 0 && (
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                  Barang Siap Diambil dari Tool Room ({readyRequests.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Admin sudah memindai kode barcode unit tool. Periksa fisik barang lalu klik Terima Barang.
                </p>
              </div>
              <span className="self-start sm:self-auto shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1E40AF] border border-blue-200">
                SIAP SERAH TERIMA
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {readyRequests.map((req) => (
                <div key={req.id} className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 text-xs">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono font-bold text-slate-900">{req.requestNumber}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">Disiapkan oleh {req.admin?.name || 'Admin'}</span>
                    </div>
                    <div className="space-y-1">
                      {req.items.map((it) => (
                        <div key={it.id} className="text-slate-800">
                          <span className="font-semibold">
                            {it.tool?.name || it.inventory?.name}
                          </span>{' '}
                          ({it.requestedQty} unit)
                          {it.assignedUnits && it.assignedUnits.length > 0 && (
                            <span className="block sm:inline sm:ml-2 font-mono text-[11px] text-[#1E40AF] font-semibold break-words">
                              Barcode: {it.assignedUnits.map((u) => `${u.unitCode} (${u.remainingLifeMinutes} mnt)`).join(', ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleRequestAction(req.id, 'OPERATOR_REJECT')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleRequestAction(req.id, 'OPERATOR_ACCEPT')}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {processingId === req.id ? 'Memproses...' : 'Terima Barang'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bagian 2: Waiting List Pengalihan Hak Pinjam Shift Masuk */}
        {incomingHandovers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xs font-bold font-heading text-amber-900 uppercase tracking-wider">
                  Waiting List Pengalihan Hak Pinjam Shift ({incomingHandovers.length})
                </h2>
                <p className="text-[11px] text-amber-800">
                  Periksa fisik barang dan sisa umur pakai sebelum menerima tanggung jawab pinjaman dari shift sebelumnya.
                </p>
              </div>
              <span className="self-start sm:self-auto shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-amber-900 border border-amber-300">
                MENUNGGU PERSETUJUAN
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {incomingHandovers.map((hov) => {
                const maxLife = hov.toolUnit?.maxLifeMinutes || 1200;
                const remLife = hov.toolUnit?.remainingLifeMinutes ?? maxLife;
                const pct = maxLife > 0 ? Math.max(0, Math.min(100, Math.round((remLife / maxLife) * 100))) : 100;
                const isCritical = hov.toolUnit && pct <= (hov.loanItem.tool?.lifeAlertPercent || 15);

                return (
                  <div key={hov.id} className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 text-xs">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{hov.handoverNumber}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-semibold text-slate-800">
                          Dari {hov.fromEmployee.name} ({hov.fromEmployee.nik})
                        </span>
                        <span className="text-slate-500">
                          {hov.fromEmployee.shift || hov.fromEmployee.department}
                        </span>
                      </div>

                      <div className="text-slate-900 font-medium">
                        {hov.loanItem.tool?.name || hov.loanItem.inventory?.name}
                        {hov.toolUnit && (
                          <span className="ml-2 font-mono font-bold text-[#1E40AF]">
                            [{hov.toolUnit.unitCode}]
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 tabular-nums">
                        <span>Dipakai pengirim: {hov.usedMinutes} menit</span>
                        {hov.toolUnit && (
                          <span className={isCritical ? 'font-bold text-red-800' : 'font-semibold text-slate-800'}>
                            Sisa umur pakai: {remLife} / {maxLife} menit ({pct}%)
                          </span>
                        )}
                        {hov.conditionNotes && <span>Catatan: {hov.conditionNotes}</span>}
                      </div>

                      {isCritical && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-900 font-semibold">
                          Peringatan: Sisa umur pakai unit mendekati habis. Harap segera dikembalikan ke Tool Room setelah selesai shift.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {hov.proofImageData && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofImage(hov.proofImageData || null)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          Lihat Foto Bukti
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={processingId === hov.id}
                        onClick={() => handleHandoverAction(hov.id, 'REJECT')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        disabled={processingId === hov.id}
                        onClick={() => handleHandoverAction(hov.id, 'ACCEPT')}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded cursor-pointer disabled:opacity-50"
                      >
                        {processingId === hov.id ? 'Memproses...' : 'Terima Hak Pinjam'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bagian 3: Request Sedang Menunggu Penyiapan Admin */}
        {waitingAdminRequests.length > 0 && (
          <div className="bg-white border border-slate-200 rounded p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Request Sedang Diproses Admin Tool Room ({waitingAdminRequests.length})
            </div>
            <div className="divide-y divide-slate-100">
              {waitingAdminRequests.map((wr) => (
                <div key={wr.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-slate-900 mr-2">{wr.requestNumber}</span>
                    <span className="text-slate-600">
                      {wr.items.map((it) => `${it.tool?.name || it.inventory?.name} (${it.requestedQty})`).join(', ')}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                    MENUNGGU ADMIN
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bagian 4: Daftar Perkakas Aktif di Tangan Operator */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                Perkakas &amp; Inventaris yang Sedang Anda Pegang ({heldItems.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Catat durasi pemakaian (menit) saat mengalihkan ke shift berikutnya atau sebelum mengembalikan ke Tool Room.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} cols={6} />
            </div>
          ) : heldItems.length === 0 ? (
            <EmptyState
              title="Belum Ada Perkakas di Tangan Anda"
              description="Ajukan request peminjaman baru atau periksa apakah ada pengalihan hak pinjam dari shift sebelumnya."
              actionLabel="+ Request Pinjam Tool"
              onAction={() => router.push('/operator/request')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">NO. PINJAMAN</th>
                    <th className="py-2.5 px-3">KODE BARCODE / BARANG</th>
                    <th className="py-2.5 px-3 text-center">QTY</th>
                    <th className="py-2.5 px-3 w-52">SISA UMUR PAKAI (MENIT)</th>
                    <th className="py-2.5 px-3">TENGGAT KEMBALI</th>
                    <th className="py-2.5 px-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {heldItems.map((hi) => {
                    const maxLife = hi.toolUnit?.maxLifeMinutes || 0;
                    const remLife = hi.toolUnit?.remainingLifeMinutes || 0;
                    const pct = maxLife > 0 ? Math.max(0, Math.min(100, Math.round((remLife / maxLife) * 100))) : 100;
                    const alertPct = hi.tool?.lifeAlertPercent || 15;
                    const isCritical = hi.toolUnit && pct <= alertPct;
                    const pendingHov = hi.handovers?.[0];

                    return (
                      <tr key={hi.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {hi.loanTransaction.transactionNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {hi.tool?.name || hi.inventory?.name}
                          </div>
                          {hi.toolUnit ? (
                            <div className="font-mono text-[11px] font-bold text-[#1E40AF]">
                              Barcode: {hi.toolUnit.unitCode}
                            </div>
                          ) : (
                            <div className="font-mono text-[11px] text-slate-500">
                              {hi.inventory?.code}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                          {hi.quantity}
                        </td>
                        <td className="py-2.5 px-3">
                          {hi.toolUnit ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] tabular-nums">
                                <span className={isCritical ? 'font-bold text-red-800' : 'font-semibold text-slate-800'}>
                                  {remLife.toLocaleString('id-ID')} / {maxLife.toLocaleString('id-ID')} mnt
                                </span>
                                <span className="text-slate-500">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isCritical ? 'bg-red-700' : 'bg-[#1E40AF]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {isCritical && (
                                <div className="text-[10px] font-bold text-red-800">
                                  Mendekati habis — segera kembalikan ke Tool Room
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Aset Inventaris</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-700 whitespace-nowrap">
                          {new Date(hi.loanTransaction.expectedReturnDate).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {pendingHov ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Menunggu {pendingHov.toEmployee.name}
                            </span>
                          ) : (
                            <Link
                              href={`/operator/handover?itemId=${encodeURIComponent(hi.id)}`}
                              className="text-[#1E40AF] hover:underline font-semibold"
                            >
                              Alihkan ke Shift 2
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lightbox Foto Bukti Pengalihan Shift */}
      {previewProofImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
          onClick={() => setPreviewProofImage(null)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">Bukti Kondisi Fisik Pengalihan</span>
              <button
                type="button"
                onClick={() => setPreviewProofImage(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center">
              <img src={previewProofImage} alt="Bukti pengalihan" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
