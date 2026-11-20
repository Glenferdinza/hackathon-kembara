'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';

interface HeldItem {
  id: string;
  itemType: string;
  quantity: number;
  tool?: { id: string; code: string; name: string; lifeAlertPercent: number } | null;
  inventory?: { id: string; code: string; name: string } | null;
  toolUnit?: {
    id: string;
    unitCode: string;
    maxLifeMinutes: number;
    remainingLifeMinutes: number;
  } | null;
  loanTransaction: { transactionNumber: string };
  handovers?: Array<{ id: string }>;
}

interface EmployeeOption {
  id: string;
  nik: string;
  name: string;
  department: string;
  shift?: string | null;
  status: string;
}

interface HandoverHistory {
  id: string;
  handoverNumber: string;
  usedMinutes: number;
  status: string;
  conditionNotes?: string | null;
  proofImageData?: string | null;
  createdAt: string;
  fromEmployee: { id: string; nik: string; name: string; shift?: string | null };
  toEmployee: { id: string; nik: string; name: string; shift?: string | null };
  toolUnit?: { unitCode: string } | null;
  loanItem: {
    tool?: { name: string } | null;
    inventory?: { name: string } | null;
  };
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Gagal memuat berkas'));
    reader.readAsDataURL(file);
  });
}

export default function OperatorHandoverPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [heldItems, setHeldItems] = useState<HeldItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [historyList, setHistoryList] = useState<HandoverHistory[]>([]);
  const [myEmployeeId, setMyEmployeeId] = useState<string>('');

  const [selectedItemId, setSelectedItemId] = useState('');
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [usedMinutes, setUsedMinutes] = useState('0');
  const [conditionNotes, setConditionNotes] = useState('');
  const [proofImageData, setProofImageData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchHandoverBundle = useCallback(async () => {
    const [authRes, sumRes, empRes, hovRes] = await Promise.all([
      fetch('/api/auth'),
      fetch('/api/operator/summary'),
      fetch('/api/employees'),
      fetch('/api/handovers'),
    ]);

    let currentEmpId = '';
    if (authRes.ok) {
      const authJson = await authRes.json();
      currentEmpId = authJson.user?.employeeId || '';
      setMyEmployeeId(currentEmpId);
    }

    if (sumRes.ok) {
      const sumJson = await sumRes.json();
      const availableForHandover = (sumJson.heldItems || []).filter(
        (item: HeldItem) => !item.handovers || item.handovers.length === 0
      );
      setHeldItems(availableForHandover);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const pre = params.get('itemId');
        if (pre && availableForHandover.some((i: HeldItem) => i.id === pre)) {
          setSelectedItemId(pre);
        } else if (availableForHandover.length > 0 && !selectedItemId) {
          setSelectedItemId(availableForHandover[0].id);
        }
      }
    }

    if (empRes.ok) {
      const empJson = await empRes.json();
      const candidates = (empJson.data || []).filter(
        (e: EmployeeOption) => e.status === 'AKTIF' && e.id !== currentEmpId
      );
      setEmployees(candidates);
    }

    if (hovRes.ok) {
      const hovJson = await hovRes.json();
      setHistoryList(hovJson.data || []);
    }
  }, [selectedItemId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await fetchHandoverBundle();
    } catch {
      showToast('Gagal memuat data pengalihan shift.', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchHandoverBundle, showToast]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [authRes, sumRes, empRes, hovRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/operator/summary'),
          fetch('/api/employees'),
          fetch('/api/handovers'),
        ]);
        if (!active) return;

        let currentEmpId = '';
        if (authRes.ok) {
          const authJson = await authRes.json();
          currentEmpId = authJson.user?.employeeId || '';
          setMyEmployeeId(currentEmpId);
        }

        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          const availableForHandover = (sumJson.heldItems || []).filter(
            (item: HeldItem) => !item.handovers || item.handovers.length === 0
          );
          setHeldItems(availableForHandover);

          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const pre = params.get('itemId');
            if (pre && availableForHandover.some((i: HeldItem) => i.id === pre)) {
              setSelectedItemId(pre);
            } else if (availableForHandover.length > 0) {
              setSelectedItemId((prev) => prev || availableForHandover[0].id);
            }
          }
        }

        if (empRes.ok) {
          const empJson = await empRes.json();
          const candidates = (empJson.data || []).filter(
            (e: EmployeeOption) => e.status === 'AKTIF' && e.id !== currentEmpId
          );
          setEmployees(candidates);
        }

        if (hovRes.ok) {
          const hovJson = await hovRes.json();
          setHistoryList(hovJson.data || []);
        }
      } catch {
        if (active) showToast('Gagal memuat data pengalihan shift.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto mentah maksimal 5 MB.', 'error');
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed.length > 2_800_000) {
        showToast('Hasil kompresi gambar masih terlalu besar (maks 2 MB).', 'error');
        return;
      }
      setProofImageData(compressed);
    } catch {
      showToast('Format foto tidak didukung.', 'error');
    }
  };

  const selectedItem = heldItems.find((i) => i.id === selectedItemId) || null;
  const parsedUsed = Math.max(0, parseInt(usedMinutes || '0', 10) || 0);
  const currentRem = selectedItem?.toolUnit?.remainingLifeMinutes ?? 0;
  const maxLife = selectedItem?.toolUnit?.maxLifeMinutes ?? 0;
  const projectedRem = Math.max(0, currentRem - parsedUsed);
  const projectedPct = maxLife > 0 ? Math.round((projectedRem / maxLife) * 100) : 100;

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !toEmployeeId) {
      showToast('Pilih barang yang dialihkan serta operator penerima.', 'error');
      return;
    }
    if (isNaN(parseInt(usedMinutes, 10)) || parseInt(usedMinutes, 10) < 0) {
      showToast('Durasi pemakaian dalam menit wajib diisi angka valid.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanItemId: selectedItemId,
          toEmployeeId,
          usedMinutes: parsedUsed,
          proofImageData,
          conditionNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal mengajukan pengalihan shift.', 'error');
      } else {
        showToast(
          `Pengalihan ${json.data?.handoverNumber} masuk ke Waiting List penerima.`,
          'success'
        );
        setToEmployeeId('');
        setUsedMinutes('0');
        setConditionNotes('');
        setProofImageData(null);
        setSelectedItemId('');
        loadData();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelHandover = async (hovId: string) => {
    const ok = await confirm({
      title: 'Batalkan Pengalihan Shift',
      message: 'Batalkan pengajuan pengalihan shift ini sebelum diterima operator tujuan?',
      confirmText: 'Ya, Batalkan',
      cancelText: 'Tutup',
      type: 'warning',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/handovers/${hovId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      });
      if (res.ok) {
        showToast('Pengajuan pengalihan dibatalkan.', 'info');
        loadData();
      }
    } catch {
      showToast('Gagal membatalkan pengalihan.', 'error');
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Pengalihan Hak Pinjam Antar Shift &amp; Input Umur Pakai
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat durasi menit pemakaian Anda lalu alihkan tanggung jawab perkakas ke Operator Shift berikutnya tanpa harus kembali ke Tool Room.
            </p>
          </div>
          <Link
            href="/operator"
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded self-start sm:self-auto"
          >
            Kembali ke Dasbor
          </Link>
        </div>

        {/* Formulir Pengalihan Shift */}
        <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
          <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
            Formulir Serah Terima Shift
          </h2>

          {loading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : heldItems.length === 0 ? (
            <EmptyState
              title="Tidak Ada Barang Siap Dialihkan"
              description="Saat ini tidak ada perkakas aktif di tangan Anda atau seluruhnya sudah berstatus menunggu persetujuan shift penerima."
            />
          ) : (
            <form onSubmit={handleSubmitHandover} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Pilih Barang / Unit Barcode yang Dialihkan *
                  </label>
                  <select
                    required
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="">Pilih perkakas aktif Anda...</option>
                    {heldItems.map((hi) => (
                      <option key={hi.id} value={hi.id}>
                        {hi.toolUnit ? `[${hi.toolUnit.unitCode}] ` : ''}
                        {hi.tool?.name || hi.inventory?.name} ({hi.loanTransaction.transactionNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Operator Penerima (Shift Berikutnya) *
                  </label>
                  <select
                    required
                    value={toEmployeeId}
                    onChange={(e) => setToEmployeeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="">Pilih operator penerima pengalihan...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.nik}) | {emp.shift || emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Durasi Pemakaian Anda (Menit) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={usedMinutes}
                    onChange={(e) => setUsedMinutes(e.target.value)}
                    placeholder="Contoh: 240 (4 jam)"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold tabular-nums text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                  {selectedItem?.toolUnit && (
                    <div className="text-[11px] text-slate-600 tabular-nums pt-0.5">
                      Sisa umur saat ini {currentRem.toLocaleString('id-ID')} mnt → setelah pengurangan{' '}
                      <span className={projectedPct <= (selectedItem.tool?.lifeAlertPercent || 15) ? 'font-bold text-red-800' : 'font-bold text-[#1E40AF]'}>
                        {projectedRem.toLocaleString('id-ID')} mnt ({projectedPct}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Lampiran Foto Bukti Kondisi (Opsional, maks 2 MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700"
                  />
                  {proofImageData && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={proofImageData}
                        alt="Pratinjau bukti"
                        className="h-12 w-16 object-cover rounded border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setProofImageData(null)}
                        className="text-[11px] text-red-700 hover:underline font-semibold cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Catatan Kondisi Fisik / Lokasi Meja Mesin
                </label>
                <input
                  type="text"
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Contoh: Kondisi mata potong masih tajam, diletakkan di meja mesin Makino V33i"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold font-heading text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {submitting ? 'Mengirim ke Waiting List...' : 'Kirim Pengalihan ke Waiting List'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tabel Riwayat Pengalihan Shift */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
              Riwayat Pengalihan Shift Terkait Anda
            </h2>
          </div>

          {historyList.length === 0 ? (
            <EmptyState
              title="Belum Ada Riwayat Pengalihan"
              description="Pengalihan hak pinjam yang Anda kirim atau terima akan tercatat rapi di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold">
                  <tr>
                    <th className="py-2.5 px-3">NO. SERAH TERIMA</th>
                    <th className="py-2.5 px-3">BARANG / BARCODE UNIT</th>
                    <th className="py-2.5 px-3">DARI → KEPADA</th>
                    <th className="py-2.5 px-3 text-right">DURASI PAKAI</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                    <th className="py-2.5 px-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {h.handoverNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">
                          {h.loanItem.tool?.name || h.loanItem.inventory?.name}
                        </div>
                        {h.toolUnit && (
                          <div className="font-mono text-[11px] text-[#1E40AF] font-semibold">
                            {h.toolUnit.unitCode}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {h.fromEmployee.name} → <span className="font-semibold text-slate-900">{h.toEmployee.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {h.usedMinutes} menit
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            h.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : h.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {h.status === 'PENDING' && h.fromEmployee.id === myEmployeeId ? (
                          <button
                            type="button"
                            onClick={() => handleCancelHandover(h.id)}
                            className="text-red-700 hover:underline font-semibold cursor-pointer"
                          >
                            Batalkan
                          </button>
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
      </div>
    </AppShell>
  );
}
