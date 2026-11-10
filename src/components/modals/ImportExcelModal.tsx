'use client';

import React, { useState, useRef } from 'react';
import { useToast } from '../ui/Toast';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportExcelModal({ isOpen, onClose, onSuccess }: ImportExcelModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'tool' | 'inventory'>('tool');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`/api/excel/template?type=${importType}`, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', importType);
    formData.append('mode', 'preview');

    try {
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal memproses file Excel', 'error');
      } else {
        setPreviewData(json);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat memvalidasi Excel.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!selectedFile) return;

    setIsCommitting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', importType);
    formData.append('mode', 'commit');

    try {
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal mengimpor data ke database.', 'error');
      } else {
        showToast(
          `Impor berhasil! Ditambahkan: ${json.summary.createdCount}, Diperbarui: ${json.summary.updatedCount}`,
          'success'
        );
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch {
      showToast('Terjadi kesalahan koneksi saat menyimpan data impor.', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-tight">
            Impor Data Master via Excel (.XLSX)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Step 1: Select Type */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
            <div>
              <span className="text-xs font-bold text-slate-800">Target Master Data:</span>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importType === 'tool'}
                    onChange={() => {
                      setImportType('tool');
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="accent-[#1E40AF]"
                  />
                  <span>Master Data Tool</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importType === 'inventory'}
                    onChange={() => {
                      setImportType('inventory');
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="accent-[#1E40AF]"
                  />
                  <span>Master Data Inventaris</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-white border border-[#1E40AF] rounded hover:bg-blue-50 transition-colors shrink-0"
            >
              Unduh Template XLSX
            </button>
          </div>

          {/* Step 2: Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#1E40AF] rounded-md p-6 text-center cursor-pointer transition-colors bg-white hover:bg-slate-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs font-semibold text-slate-800">
              {selectedFile ? selectedFile.name : 'Pilih atau Tarik File Excel (.xlsx) ke sini'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Maksimal 5MB. Format kolom wajib sesuai template resmi PT YPTI.
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="py-6 text-center text-xs text-slate-500 font-medium">
              Memvalidasi data dan memeriksa integritas stok...
            </div>
          )}

          {/* Step 3: Preview Table */}
          {previewData && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Hasil Pemeriksaan Preview:</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#1E40AF] font-medium">
                    {previewData.validCount} Baris Valid
                  </span>
                  {previewData.invalidCount > 0 && (
                    <span className="text-[#D94841] font-medium">
                      {previewData.invalidCount} Baris Bermasalah
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded max-h-56 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-heading sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Baris</th>
                      <th className="py-2 px-2.5">Kode</th>
                      <th className="py-2 px-2.5">Nama</th>
                      <th className="py-2 px-2.5">Stok</th>
                      <th className="py-2 px-2.5">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {previewData.rows.map((row: any) => (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/40'}
                      >
                        <td className="py-2 px-2.5 text-slate-500 tabular-nums">#{row.rowNumber}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-800 tabular-nums">{row.code || '-'}</td>
                        <td className="py-2 px-2.5 text-slate-800">{row.name || '-'}</td>
                        <td className="py-2 px-2.5 tabular-nums">{row.totalStock} {row.unit}</td>
                        <td className="py-2 px-2.5">
                          {row.isValid ? (
                            <span className="text-[11px] font-semibold text-[#1E40AF]">
                              Siap Impor
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#D94841]">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
            onClick={handleCommitImport}
            disabled={!previewData || previewData.validCount === 0 || isCommitting}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors"
          >
            {isCommitting ? 'Menyimpan...' : 'Konfirmasi & Simpan ke Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
