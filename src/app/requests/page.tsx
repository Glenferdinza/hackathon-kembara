'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Scan } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { QrScannerModal } from '@/components/qr/QrScannerModal';

interface AvailableUnit {
  id: string;
  unitCode: string;
  remainingLifeMinutes: number;
  maxLifeMinutes: number;
  status: string;
}

interface RequestItem {
  id: string;
  itemType: string;
  requestedQty: number;
  toolId?: string | null;
  inventoryId?: string | null;
  tool?: { id: string; code: string; name: string; location: string; unit: string } | null;
  inventory?: { id: string; code: string; name: string; location: string; unit: string } | null;
  assignedUnits?: AvailableUnit[];
}

interface LoanReq {
  id: string;
  requestNumber: string;
  purpose?: string | null;
  expectedReturnDate: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  employee: { id: string; nik: string; name: string; department: string; shift?: string | null };
  admin?: { name: string } | null;
  items: RequestItem[];
}

export default function AdminRequestsQueuePage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LoanReq[]>([]);
  const [statusFilter, setStatusFilter] = useState('MENUNGGU_ADMIN');

  // Preparation modal state
  const [preparingReq, setPreparingReq] = useState<LoanReq | null>(null);
  const [availableUnitsByTool, setAvailableUnitsByTool] = useState<Record<string, AvailableUnit[]>>({});
  const [selectedUnitIdsByItem, setSelectedUnitIdsByItem] = useState<Record<string, string[]>>({});
  const [scanTargetItemId, setScanTargetItemId] = useState<string | null>(null);
  const [quickCodeInput, setQuickCodeInput] = useState<Record<string, string>>({});
  const [submittingPrepare, setSubmittingPrepare] = useState(false);

  const loadRequestsData = useCallback(async () => {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const res = await fetch(`/api/loan-requests${q}`);
    if (res.ok) {
      const json = await res.json();
      setRequests(json.data || []);
    }
  }, [statusFilter]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      await loadRequestsData();
    } catch {
      showToast('Gagal memuat antrean request pinjam.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadRequestsData, showToast]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
        const res = await fetch(`/api/loan-requests${q}`);
        if (res.ok && active) {
          const json = await res.json();
          setRequests(json.data || []);
        }
      } catch {
        if (active) showToast('Gagal memuat antrean request pinjam.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [statusFilter, showToast]);

  const handleOpenPrepareModal = async (req: LoanReq) => {
    setPreparingReq(req);
    setSelectedUnitIdsByItem({});
    setQuickCodeInput({});

    const toolIds = Array.from(
      new Set(req.items.filter((i) => i.itemType === 'TOOL' && i.toolId).map((i) => i.toolId as string))
    );

    const unitsMap: Record<string, AvailableUnit[]> = {};
    await Promise.all(
      toolIds.map(async (tid) => {
        try {
          const res = await fetch(`/api/tool-units?toolId=${tid}&status=TERSEDIA`);
          if (res.ok) {
            const j = await res.json();
            unitsMap[tid] = j.data || [];
          }
        } catch {
          unitsMap[tid] = [];
        }
      })
    );
    setAvailableUnitsByTool(unitsMap);
  };

  const assignUnitCodeToItem = (reqItem: RequestItem, rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || !reqItem.toolId) return;

    const pool = availableUnitsByTool[reqItem.toolId] || [];
    const matched = pool.find((u) => u.unitCode.toUpperCase() === code);
    if (!matched) {
      showToast(
        `Kode unit "${code}" tidak tersedia atau bukan milik ${reqItem.tool?.name}.`,
        'error'
      );
      return;
    }

    const current = selectedUnitIdsByItem[reqItem.id] || [];
    if (current.includes(matched.id)) {
      showToast(`Unit ${matched.unitCode} sudah ditambahkan ke daftar.`, 'info');
      return;
    }
    if (current.length >= reqItem.requestedQty) {
      showToast(`Jumlah unit sudah mencukupi (${reqItem.requestedQty} unit).`, 'error');
      return;
    }

    setSelectedUnitIdsByItem((prev) => ({
      ...prev,
      [reqItem.id]: [...current, matched.id],
    }));
    setQuickCodeInput((prev) => ({ ...prev, [reqItem.id]: '' }));
    showToast(`Unit QR ${matched.unitCode} terverifikasi.`, 'success');
  };

  const removeAssignedUnit = (reqItemId: string, unitId: string) => {
    setSelectedUnitIdsByItem((prev) => ({
      ...prev,
      [reqItemId]: (prev[reqItemId] || []).filter((id) => id !== unitId),
    }));
  };

  const handleConfirmPrepare = async () => {
    if (!preparingReq) return;

    const assignments = preparingReq.items
      .filter((i) => i.itemType === 'TOOL')
      .map((i) => ({
        requestItemId: i.id,
        unitIds: selectedUnitIdsByItem[i.id] || [],
      }));

    for (const item of preparingReq.items) {
      if (item.itemType === 'TOOL') {
        const picked = selectedUnitIdsByItem[item.id] || [];
        if (picked.length !== item.requestedQty) {
          showToast(
            `Harap scan/pilih tepat ${item.requestedQty} unit QR untuk "${item.tool?.name}".`,
            'error'
          );
          return;
        }
      }
    }

    setSubmittingPrepare(true);
    try {
      const res = await fetch(`/api/loan-requests/${preparingReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_PREPARE',
          assignments,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menyiapkan permintaan.', 'error');
      } else {
        showToast(
          `Request ${preparingReq.requestNumber} siap diambil! Menunggu konfirmasi Terima dari Operator.`,
          'success'
        );
        setPreparingReq(null);
        fetchRequests();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSubmittingPrepare(false);
    }
  };

  const handleRejectRequest = async (req: LoanReq) => {
    const ok = await confirm({
      title: `Tolak Request ${req.requestNumber}`,
      message: `Tolak pengajuan pinjam dari ${req.employee.name} (${req.employee.nik})?`,
      confirmText: 'Tolak Pengajuan',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/loan-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_REJECT',
          rejectionReason: 'Stok fisik tidak memungkinkan / ditolak Admin Tool Room',
        }),
      });
      if (res.ok) {
        showToast(`Request ${req.requestNumber} ditolak.`, 'info');
        fetchRequests();
      }
    } catch {
      showToast('Gagal menolak request.', 'error');
    }
  };

  const scanTargetItem = preparingReq?.items.find((i) => i.id === scanTargetItemId) || null;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Antrean Request Pinjam Operator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar permintaan pinjaman dari operator lantai produksi. Ambil barang di rak, scan QR unit, lalu klik OK.
            </p>
          </div>
          <RefreshButton onRefresh={fetchRequests} loading={loading} />
        </div>

        {/* Filter Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200">
          {[
            { key: 'MENUNGGU_ADMIN', label: 'Menunggu Diproses' },
            { key: 'SIAP_DIAMBIL', label: 'Siap Diambil (Menunggu Operator)' },
            { key: 'DITERIMA', label: 'Sudah Diterima' },
            { key: 'DITOLAK', label: 'Ditolak' },
            { key: '', label: 'Semua Status' },
          ].map((tab) => (
            <button
              key={tab.key || 'ALL'}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="Antrean Kosong"
            description="Belum ada permintaan peminjaman pada status filter yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded">
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">NO. REQUEST</th>
                  <th className="py-2.5 px-3">PEMOHON (OPERATOR)</th>
                  <th className="py-2.5 px-3">BARANG &amp; UNIT QR</th>
                  <th className="py-2.5 px-3">KEPERLUAN &amp; TENGGAT</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {req.requestNumber}
                      <div className="text-[10px] font-sans font-normal text-slate-400">
                        {new Date(req.createdAt).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{req.employee.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {req.employee.nik} | {req.employee.shift || req.employee.department}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 space-y-1">
                      {req.items.map((it) => (
                        <div key={it.id} className="text-slate-800">
                          <span className="font-semibold">{it.tool?.name || it.inventory?.name}</span>{' '}
                          ({it.requestedQty} {it.tool?.unit || it.inventory?.unit})
                          <div className="text-[10px] text-slate-500">
                            Rak: {it.tool?.location || it.inventory?.location}
                            {it.assignedUnits && it.assignedUnits.length > 0 && (
                              <span className="ml-2 font-mono font-semibold text-[#1E40AF]">
                                Unit QR: {it.assignedUnits.map((u) => u.unitCode).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800">{req.purpose || '-'}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        Tenggat {new Date(req.expectedReturnDate).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          req.status === 'DITERIMA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : req.status === 'SIAP_DIAMBIL'
                            ? 'bg-blue-50 text-[#1E40AF] border-blue-200'
                            : req.status === 'MENUNGGU_ADMIN'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-2">
                      {req.status === 'MENUNGGU_ADMIN' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenPrepareModal(req)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded cursor-pointer"
                          >
                            Scan QR &amp; Siapkan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req)}
                            className="text-red-700 hover:underline font-semibold cursor-pointer"
                          >
                            Tolak
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Admin Siapkan & Scan QR Unit Perkakas */}
      {preparingReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setPreparingReq(null)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                Siapkan &amp; Pindai QR Unit Tool — {preparingReq.requestNumber}
              </h2>
              <p className="text-[11px] text-slate-500">
                Pemohon {preparingReq.employee.name} ({preparingReq.employee.nik}) | Scan stiker QR dari kotak wadah perkakas.
              </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {preparingReq.items.map((item) => {
                const pool = item.toolId ? availableUnitsByTool[item.toolId] || [] : [];
                const pickedIds = selectedUnitIdsByItem[item.id] || [];
                const remainingPool = pool.filter((u) => !pickedIds.includes(u.id));

                return (
                  <div key={item.id} className="p-3.5 border border-slate-200 rounded space-y-2.5 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">
                          {item.tool?.name || item.inventory?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rak {item.tool?.location || item.inventory?.location} | Diminta {item.requestedQty} {item.tool?.unit || item.inventory?.unit}
                        </div>
                      </div>
                      {item.itemType === 'TOOL' ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border tabular-nums ${
                            pickedIds.length === item.requestedQty
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {pickedIds.length} / {item.requestedQty} Unit QR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Inventaris Siap ({item.requestedQty})
                        </span>
                      )}
                    </div>

                    {item.itemType === 'TOOL' && (
                      <>
                        {/* Input Scan USB / Pilih Unit / Kamera */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 flex gap-1.5">
                            <input
                              type="text"
                              value={quickCodeInput[item.id] || ''}
                              onChange={(e) =>
                                setQuickCodeInput((prev) => ({ ...prev, [item.id]: e.target.value.toUpperCase() }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  assignUnitCodeToItem(item, quickCodeInput[item.id] || '');
                                }
                              }}
                              placeholder="Scan QR / ketik kode unit (contoh TOL-001-U01)..."
                              className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs font-bold focus:outline-none focus:border-[#1E40AF]"
                            />
                            <button
                              type="button"
                              onClick={() => assignUnitCodeToItem(item, quickCodeInput[item.id] || '')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                            >
                              Tambah
                            </button>
                          </div>

                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) assignUnitCodeToItem(item, e.target.value);
                            }}
                            className="sm:w-52 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                          >
                            <option value="">Atau pilih unit ({remainingPool.length} siap)...</option>
                            {remainingPool.map((u) => (
                              <option key={u.id} value={u.unitCode}>
                                {u.unitCode} ({u.remainingLifeMinutes} mnt sisa)
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setScanTargetItemId(item.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-[#1E40AF] bg-white border border-[#1E40AF] hover:bg-blue-50 rounded flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Scan className="w-3.5 h-3.5" />
                            <span>Kamera QR</span>
                          </button>
                        </div>

                        {/* Daftar Unit QR Terpilih */}
                        {pickedIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {pickedIds.map((uid) => {
                              const unitObj = pool.find((u) => u.id === uid);
                              return (
                                <span
                                  key={uid}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-300 font-mono text-[11px] font-bold text-slate-900"
                                >
                                  <span>
                                    {unitObj?.unitCode || uid} ({unitObj?.remainingLifeMinutes ?? '-'} mnt)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAssignedUnit(item.id, uid)}
                                    className="text-red-700 hover:text-red-900 font-sans font-bold cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreparingReq(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingPrepare}
                onClick={handleConfirmPrepare}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingPrepare ? 'Menyimpan...' : 'OK & Kirim ke Dasbor Operator'}
              </button>
            </div>
          </div>
        </div>
      )}

      <QrScannerModal
        isOpen={Boolean(scanTargetItem)}
        onClose={() => setScanTargetItemId(null)}
        onScan={(code) => {
          if (scanTargetItem) {
            assignUnitCodeToItem(scanTargetItem, code);
          }
          setScanTargetItemId(null);
        }}
        title={scanTargetItem ? `Scan QR: ${scanTargetItem.tool?.name}` : 'Scan QR Unit Tool'}
      />
    </AppShell>
  );
}
