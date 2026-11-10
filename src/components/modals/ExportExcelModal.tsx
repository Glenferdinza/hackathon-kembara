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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-tight">
            Ekspor Laporan Resmi Excel (.XLSX)
          </h2>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Cakupan Data Laporan Excel
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as 'all' | 'tools' | 'inventories' | 'loans' | 'overdue')}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded px-3 py-2 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="all">Laporan Komprehensif (Multi-Sheet)</option>
              <option value="tools">Master Data Tool Saja</option>
              <option value="inventories">Master Data Inventaris Saja</option>
              <option value="loans">Laporan Peminjaman &amp; Keterlambatan</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 leading-relaxed">
            {exportType === 'all' &&
              'Mencakup Sheet Master Tool, Master Inventaris, dan Seluruh Riwayat Transaksi dalam satu file terpadu.'}
            {exportType === 'tools' &&
              'Daftar seluruh perkakas mesin, spesifikasi, lokasi rak, stok total, tersedia, dan dipinjam.'}
            {exportType === 'inventories' &&
              'Daftar inventaris pabrik, serial number, merek, model, dan status pemakaian.'}
            {exportType === 'loans' &&
              'Histori peminjaman karyawan, batas waktu tenggat, status transaksi, dan audit admin.'}
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
