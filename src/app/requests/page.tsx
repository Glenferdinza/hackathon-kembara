'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { BarcodeScannerModal } from '@/components/qr/QrScannerModal';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { invalidateDashboardSummaryCache } from '@/lib/dashboard-client';

interface AvailableUnit {
  id: string;
  unitCode: string;
  supplierCode?: string | null;
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
  const [statusFilter, setStatusFilter] = useState('');

  // Preparation modal state
  const [preparingReq, setPreparingReq] = useState<LoanReq | null>(null);
  const [availableUnitsByTool, setAvailableUnitsByTool] = useState<Record<string, AvailableUnit[]>>({});
  const [selectedUnitIdsByItem, setSelectedUnitIdsByItem] = useState<Record<string, string[]>>({});
  const [scanTargetItemId, setScanTargetItemId] = useState<string | null>(null);
  const [quickCodeInput, setQuickCodeInput] = useState<Record<string, string>>({});
  const [submittingPrepare, setSubmittingPrepare] = useState(false);

  // Refs untuk mencegah race condition saat tembakan USB scanner beruntun cepat
  const prepareSessionRef = useRef(0);
  const isLoadingUnitsRef = useRef(false);
  const queueLookupBusyRef = useRef(false);
  const pendingScansRef = useRef<string[]>([]);
  const selectedUnitIdsRef = useRef<Record<string, string[]>>({});

  const closePrepareModal = useCallback(() => {
    prepareSessionRef.current += 1;
    isLoadingUnitsRef.current = false;
    pendingScansRef.current = [];
    selectedUnitIdsRef.current = {};
    setPreparingReq(null);
    setAvailableUnitsByTool({});
    setSelectedUnitIdsByItem({});
    setQuickCodeInput({});
  }, []);

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

  const assignMatchedUnitToItem = useCallback(
    (reqItem: RequestItem, matched: AvailableUnit, reqNumber?: string) => {
      const currentMap = selectedUnitIdsRef.current;
      const allPickedIds = Object.values(currentMap).flat();
      if (allPickedIds.includes(matched.id)) {
        showToast(`Unit ${matched.unitCode} sudah ditambahkan ke daftar.`, 'info');
        return false;
      }

      const current = currentMap[reqItem.id] || [];
      if (current.length >= reqItem.requestedQty) {
        showToast(`Jumlah unit sudah mencukupi (${reqItem.requestedQty} unit).`, 'error');
        return false;
      }

      const nextMap: Record<string, string[]> = {
        ...currentMap,
        [reqItem.id]: [...current, matched.id],
      };
      selectedUnitIdsRef.current = nextMap;
      setSelectedUnitIdsByItem(nextMap);
      setQuickCodeInput((prev) => ({ ...prev, [reqItem.id]: '' }));
      showToast(
        reqNumber
          ? `Request ${reqNumber} dibuka & unit barcode ${matched.unitCode} otomatis dipilih.`
          : `Unit barcode ${matched.unitCode} terverifikasi.`,
        'success'
      );
      return true;
    },
    [showToast]
  );

  const assignCodeAcrossRequest = useCallback(
    (
      req: LoanReq,
      unitsMap: Record<string, AvailableUnit[]>,
      rawCode: string,
      includeOpenedPrefix = false
    ) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return;

      const toolItems = req.items.filter((i) => i.itemType === 'TOOL' && i.toolId);
      let firstMatchedItem: RequestItem | null = null;
      let firstMatchedUnit: AvailableUnit | null = null;

      for (const item of toolItems) {
        const pool = unitsMap[item.toolId as string] || [];
        const matched = pool.find(
          (u) =>
            u.unitCode.toUpperCase() === code ||
            (u.supplierCode && u.supplierCode.toUpperCase() === code)
        );
        if (!matched) continue;

        if (!firstMatchedItem) {
          firstMatchedItem = item;
          firstMatchedUnit = matched;
        }

        const picked = selectedUnitIdsRef.current[item.id] || [];
        if (picked.length < item.requestedQty) {
          assignMatchedUnitToItem(item, matched, includeOpenedPrefix ? req.requestNumber : undefined);
          return;
        }
      }

      if (firstMatchedItem && firstMatchedUnit) {
        assignMatchedUnitToItem(firstMatchedItem, firstMatchedUnit);
        return;
      }

      showToast(
        `Kode barcode "${code}" tidak tersedia atau bukan milik perkakas pada request ${req.requestNumber}.`,
        'error'
      );
    },
    [assignMatchedUnitToItem, showToast]
  );

  const handleOpenPrepareModal = async (req: LoanReq, initialScanCodes?: string[]) => {
    const sessionId = ++prepareSessionRef.current;
    isLoadingUnitsRef.current = true;
    selectedUnitIdsRef.current = {};
    setPreparingReq(req);
    setAvailableUnitsByTool({});
    setSelectedUnitIdsByItem({});
    setQuickCodeInput({});

    if (initialScanCodes && initialScanCodes.length > 0) {
      pendingScansRef.current = [...initialScanCodes, ...pendingScansRef.current];
    }

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

    // Abaikan jika modal sudah ditutup atau berpindah ke request lain
    if (prepareSessionRef.current !== sessionId) return;

    isLoadingUnitsRef.current = false;
    setAvailableUnitsByTool(unitsMap);

    const queued = pendingScansRef.current.splice(0, pendingScansRef.current.length);
    queued.forEach((queuedCode, idx) => {
      assignCodeAcrossRequest(req, unitsMap, queuedCode, idx === 0);
    });
  };

  const assignUnitCodeToItem = (reqItem: RequestItem, rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || !reqItem.toolId) return;

    const pool = availableUnitsByTool[reqItem.toolId] || [];
    const matched = pool.find(
      (u) =>
        u.unitCode.toUpperCase() === code ||
        (u.supplierCode && u.supplierCode.toUpperCase() === code)
    );
    if (!matched) {
      showToast(
        `Kode barcode "${code}" tidak tersedia atau bukan milik ${reqItem.tool?.name}.`,
        'error'
      );
      return;
    }

    assignMatchedUnitToItem(reqItem, matched);
  };

  const handleGlobalBarcodeScan = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // Jika modal penyiapan sudah terbuka, antrekan jika pool unit masih dimuat atau langsung cocokkan
    if (preparingReq) {
      if (isLoadingUnitsRef.current) {
        pendingScansRef.current.push(code);
        return;
      }
      assignCodeAcrossRequest(preparingReq, availableUnitsByTool, code);
      return;
    }

    // Jika lookup antrean sebelumnya sedang berjalan, antrekan scan kedua agar tidak hilang
    if (queueLookupBusyRef.current) {
      pendingScansRef.current.push(code);
      return;
    }

    // Jika berada di daftar antrean, cocokkan No. Request atau lookup ToolUnit -> buka modal request terkait (lintas filter tab)
    let waitingRequests = requests.filter((r) => r.status === 'MENUNGGU_ADMIN');
    if (statusFilter !== 'MENUNGGU_ADMIN') {
      try {
        const wRes = await fetch('/api/loan-requests?status=MENUNGGU_ADMIN');
        if (wRes.ok) {
          const wJson = await wRes.json();
          waitingRequests = wJson.data || [];
        }
      } catch {
        // fallback ke list lokal
      }
    }
    const matchedReqByNo = waitingRequests.find((r) => r.requestNumber.toUpperCase() === code);
    if (matchedReqByNo) {
      await handleOpenPrepareModal(matchedReqByNo);
      return;
    }

    queueLookupBusyRef.current = true;
    try {
      const res = await fetch(`/api/tool-units?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        pendingScansRef.current = [];
        showToast(`Kode barcode "${code}" tidak ditemukan di database.`, 'error');
        return;
      }
      const json = await res.json();
      const unitData = json.data as { toolId?: string; unitCode?: string; status?: string } | undefined;
      if (!unitData?.toolId) {
        pendingScansRef.current = [];
        showToast(`Kode barcode "${code}" tidak valid.`, 'error');
        return;
      }
      if (unitData.status && unitData.status !== 'TERSEDIA') {
        pendingScansRef.current = [];
        showToast(
          `Unit barcode ${unitData.unitCode || code} berstatus ${unitData.status} (tidak tersedia untuk disiapkan).`,
          'error'
        );
        return;
      }
      const matchedReq = waitingRequests.find((r) =>
        r.items.some((it) => it.itemType === 'TOOL' && it.toolId === unitData.toolId)
      );
      if (!matchedReq) {
        pendingScansRef.current = [];
        showToast(
          `Unit barcode ${unitData.unitCode || code} tidak cocok dengan antrean request yang menunggu diproses.`,
          'info'
        );
        return;
      }
      await handleOpenPrepareModal(matchedReq, [unitData.unitCode || code]);
    } catch {
      pendingScansRef.current = [];
      showToast('Gagal memeriksa kode barcode unit.', 'error');
    } finally {
      queueLookupBusyRef.current = false;
    }
  };

  // Auto-capture USB Barcode Scanner langsung di halaman Antrean & Modal Penyiapan
  useBarcodeScanner({
    enabled: !scanTargetItemId,
    onScan: (code) => {
      void handleGlobalBarcodeScan(code);
    },
  });

  const removeAssignedUnit = (reqItemId: string, unitId: string) => {
    const nextMap: Record<string, string[]> = {
      ...selectedUnitIdsRef.current,
      [reqItemId]: (selectedUnitIdsRef.current[reqItemId] || []).filter((id) => id !== unitId),
    };
    selectedUnitIdsRef.current = nextMap;
    setSelectedUnitIdsByItem(nextMap);
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
            `Harap scan/pilih tepat ${item.requestedQty} unit barcode untuk "${item.tool?.name}".`,
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
        invalidateDashboardSummaryCache();
        closePrepareModal();
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
        invalidateDashboardSummaryCache();
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
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
                Antrean Request Pinjam Operator
              </h1>
              <span className="text-xs font-semibold text-[#1E40AF]">
                Scanner USB Otomatis Aktif
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Daftar permintaan pinjaman dari operator lantai produksi. Ambil barang di rak, scan barcode unit langsung via USB atau kamera, lalu klik OK.
            </p>
          </div>
          <RefreshButton onRefresh={fetchRequests} loading={loading} />
        </div>

        {/* Filter Status Bar (Single Dropdown) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label
              htmlFor="request-status-filter"
              className="text-xs text-slate-600 font-medium whitespace-nowrap"
            >
              Filter Status
            </label>
            <select
              id="request-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial min-w-0 bg-white border border-slate-300 rounded px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="MENUNGGU_ADMIN">Menunggu Diproses</option>
              <option value="SIAP_DIAMBIL">Siap Diambil (Menunggu Operator)</option>
              <option value="DITERIMA">Sudah Diterima</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>
          {!loading && (
            <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
              {requests.length.toLocaleString('id-ID')} antrean
            </span>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="Antrean Kosong"
            description="Belum ada permintaan pinjaman pada status filter yang dipilih."
          />
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden space-y-2.5">
              {requests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{req.requestNumber}</div>
                      <div className="text-[11px] text-slate-600 tabular-nums">
                        {new Date(req.createdAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase ${
                        req.status === 'DITERIMA'
                          ? 'text-emerald-800'
                          : req.status === 'SIAP_DIAMBIL'
                          ? 'text-[#1E40AF]'
                          : req.status === 'MENUNGGU_ADMIN'
                          ? 'text-[#92400E]'
                          : 'text-slate-600'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-[13px] font-bold text-slate-900">{req.employee.name}</div>
                    <div className="font-mono text-xs text-slate-600">
                      {req.employee.nik} | {req.employee.shift || req.employee.department}
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-slate-100 pt-2">
                    {req.items.map((it) => (
                      <div key={it.id} className="text-xs text-slate-800">
                        <span className="font-semibold">{it.tool?.name || it.inventory?.name}</span>{' '}
                        <span className="tabular-nums font-bold">
                          ({it.requestedQty} {it.tool?.unit || it.inventory?.unit})
                        </span>
                        <div className="text-[11px] text-slate-600">
                          Rak {it.tool?.location || it.inventory?.location}
                          {it.assignedUnits && it.assignedUnits.length > 0 && (
                            <span className="block font-mono font-semibold text-[#1E40AF] mt-0.5">
                              Unit {it.assignedUnits.map((u) => u.unitCode).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-600 border-t border-slate-100 pt-2">
                    <div>{req.purpose || '-'}</div>
                    <div className="tabular-nums mt-0.5">
                      Tenggat {new Date(req.expectedReturnDate).toLocaleString('id-ID')}
                    </div>
                  </div>

                  {req.status === 'MENUNGGU_ADMIN' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPrepareModal(req)}
                        className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded cursor-pointer"
                      >
                        Scan Barcode &amp; Siapkan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req)}
                        className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-[#991B1B] bg-white border border-slate-300 hover:bg-red-50 rounded cursor-pointer"
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto bg-white border border-slate-200 rounded">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">NO. REQUEST</th>
                    <th className="py-2.5 px-3">PEMOHON (OPERATOR)</th>
                    <th className="py-2.5 px-3">BARANG &amp; UNIT BARCODE</th>
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
                        <div className="text-[11px] font-sans font-normal text-slate-600">
                          {new Date(req.createdAt).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{req.employee.name}</div>
                        <div className="text-[11px] font-mono text-slate-600">
                          {req.employee.nik} | {req.employee.shift || req.employee.department}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 space-y-1">
                        {req.items.map((it) => (
                          <div key={it.id} className="text-slate-800">
                            <span className="font-semibold">{it.tool?.name || it.inventory?.name}</span>{' '}
                            ({it.requestedQty} {it.tool?.unit || it.inventory?.unit})
                            <div className="text-[11px] text-slate-600">
                              Rak {it.tool?.location || it.inventory?.location}
                              {it.assignedUnits && it.assignedUnits.length > 0 && (
                                <span className="ml-2 font-mono font-semibold text-[#1E40AF]">
                                  Unit {it.assignedUnits.map((u) => u.unitCode).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800">{req.purpose || '-'}</div>
                        <div className="text-[11px] text-slate-600 tabular-nums">
                          Tenggat {new Date(req.expectedReturnDate).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-xs font-bold uppercase ${
                            req.status === 'DITERIMA'
                              ? 'text-emerald-800'
                              : req.status === 'SIAP_DIAMBIL'
                              ? 'text-[#1E40AF]'
                              : req.status === 'MENUNGGU_ADMIN'
                              ? 'text-[#92400E]'
                              : 'text-slate-600'
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
                              Scan Barcode &amp; Siapkan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req)}
                              className="text-[#991B1B] hover:underline font-semibold cursor-pointer"
                            >
                              Tolak
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-600">-</span>
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

      {/* Modal Admin Siapkan & Scan Barcode Unit Perkakas */}
      {preparingReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={closePrepareModal}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-heading font-bold text-slate-900">
                  Siapkan &amp; Scan Barcode Unit ({preparingReq.requestNumber})
                </h2>
                <p className="text-[11px] text-slate-600">
                  Pemohon {preparingReq.employee.name} ({preparingReq.employee.nik}) | Tembak scanner USB langsung ke stiker barcode wadah perkakas.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#1E40AF] self-start sm:self-auto shrink-0">
                USB Auto-Scan Siap
              </span>
            </div>

            <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto text-xs">
              {preparingReq.items.map((item) => {
                const pool = item.toolId ? availableUnitsByTool[item.toolId] || [] : [];
                const pickedIds = selectedUnitIdsByItem[item.id] || [];
                const remainingPool = pool.filter((u) => !pickedIds.includes(u.id));

                return (
                  <div key={item.id} className="p-3 sm:p-3.5 border border-slate-200 rounded space-y-2.5 bg-slate-50/50">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">
                          {item.tool?.name || item.inventory?.name}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Rak {item.tool?.location || item.inventory?.location} | Diminta {item.requestedQty} {item.tool?.unit || item.inventory?.unit}
                        </div>
                      </div>
                      {item.itemType === 'TOOL' ? (
                        <span
                          className={`text-xs font-bold tabular-nums shrink-0 ${
                            pickedIds.length === item.requestedQty
                              ? 'text-emerald-800'
                              : 'text-[#92400E]'
                          }`}
                        >
                          {pickedIds.length} / {item.requestedQty} Unit Barcode
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-700 shrink-0">
                          Inventaris Siap ({item.requestedQty})
                        </span>
                      )}
                    </div>

                    {item.itemType === 'TOOL' && (
                      <>
                        {/* Input Scan USB / Pilih Unit / Kamera */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 min-w-0 flex gap-1.5">
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
                              placeholder="Scan barcode / ketik kode unit (contoh TOL-001-U01)..."
                              className="flex-1 min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs font-bold focus:outline-none focus:border-[#1E40AF]"
                            />
                            <button
                              type="button"
                              onClick={() => assignUnitCodeToItem(item, quickCodeInput[item.id] || '')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer shrink-0"
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
                            <ScanBarcode className="w-3.5 h-3.5" />
                            <span>Kamera Barcode</span>
                          </button>
                        </div>

                        {/* Daftar Unit Barcode Terpilih */}
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
                onClick={closePrepareModal}
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

      <BarcodeScannerModal
        isOpen={Boolean(scanTargetItem)}
        onClose={() => setScanTargetItemId(null)}
        onScan={(code) => {
          if (scanTargetItem) {
            assignUnitCodeToItem(scanTargetItem, code);
          }
          setScanTargetItemId(null);
        }}
        title={scanTargetItem ? `Scan Barcode: ${scanTargetItem.tool?.name}` : 'Scan Barcode Unit'}
        defaultMode="CAMERA"
      />
    </AppShell>
  );
}
