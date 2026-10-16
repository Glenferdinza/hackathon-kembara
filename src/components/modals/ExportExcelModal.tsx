'use client';

import React, { useState } from 'react';
import { useToast } from '../ui/Toast';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportExcelModal({ isOpen, onClose }: ExportExcelModalProps) {
  const { showToast } = useToast();
  const [exportType, setExportType] = useState<'all' | 'tools' | 'inventories' | 'loans' | 'overdue'>('all');

  if (!isOpen) return null;

  const handleDownload = () => {
    window.open(`/api/excel/export?type=${exportType}`, '_blank');
    showToast('Laporan Excel berhasil di-generate dan sedang diunduh.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-slate-200 border-t-4 border-t-[#1E40AF] shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-tight">
            Ekspor Laporan Resmi Excel (.XLSX)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600 font-medium">
            Pilih cakupan data yang ingin diekspor dari database terkini:
          </p>

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-3 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'all'}
                onChange={() => setExportType('all')}
                className="mt-0.5 accent-[#1E40AF]"
              />
              <div>
                <span className="font-bold text-slate-900">Laporan Komprehensif (Multi-Sheet)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mencakup Sheet Master Tool, Master Inventaris, dan Seluruh Riwayat Transaksi.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'tools'}
                onChange={() => setExportType('tools')}
                className="mt-0.5 accent-[#1E40AF]"
              />
              <div>
                <span className="font-bold text-slate-900">Master Data Tool Saja</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar seluruh perkakas, spesifikasi, lokasi rak, stok total, tersedia, dan dipinjam.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'inventories'}
                onChange={() => setExportType('inventories')}
                className="mt-0.5 accent-[#1E40AF]"
              />
              <div>
                <span className="font-bold text-slate-900">Master Data Inventaris Saja</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar inventaris pabrik, serial number, merek, model, dan status pemakaian.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'loans'}
                onChange={() => setExportType('loans')}
                className="mt-0.5 accent-[#1E40AF]"
              />
              <div>
                <span className="font-bold text-slate-900">Laporan Peminjaman &amp; Keterlambatan</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Histori peminjaman karyawan, batas waktu tenggat, status transaksi, dan audit admin.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
          >
            Unduh File Excel (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
}
