'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

interface ScannedEntity {
  type: 'EMPLOYEE' | 'TOOL' | 'INVENTORY' | 'NOT_FOUND';
  data: any;
  rawCode: string;
}

export function QuickBarcodeBar() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScannedEntity | null>(null);

  const handleScan = async (codeToScan?: string) => {
    const code = (codeToScan || query).trim().toUpperCase();
    if (!code) return;

    setIsScanning(true);
    setQuery(code);

    try {
      // 1. Cek NIK Karyawan
      const empRes = await fetch(`/api/employees?nik=${encodeURIComponent(code)}`);
      if (empRes.ok) {
        const empJson = await empRes.json();
        if (empJson.data) {
          setResult({ type: 'EMPLOYEE', data: empJson.data, rawCode: code });
          showToast(`Peminjam terdeteksi: ${empJson.data.name} (${empJson.data.nik})`, 'success');
          setIsScanning(false);
          return;
        }
      }

      // 2. Cek Master Tool
      const toolRes = await fetch(`/api/tools?search=${encodeURIComponent(code)}`);
      if (toolRes.ok) {
        const toolJson = await toolRes.json();
        const match = (toolJson.data || []).find((t: any) => t.code.toUpperCase() === code);
        if (match) {
          setResult({ type: 'TOOL', data: match, rawCode: code });
          showToast(`Perkakas terdeteksi: ${match.name} (${match.code})`, 'info');
          setIsScanning(false);
          return;
        }
      }

      // 3. Cek Master Inventaris
      const invRes = await fetch(`/api/inventories?search=${encodeURIComponent(code)}`);
      if (invRes.ok) {
        const invJson = await invRes.json();
        const match = (invJson.data || []).find((i: any) => i.code.toUpperCase() === code);
        if (match) {
          setResult({ type: 'INVENTORY', data: match, rawCode: code });
          showToast(`Inventaris terdeteksi: ${match.name} (${match.code})`, 'info');
          setIsScanning(false);
          return;
        }
      }

      setResult({ type: 'NOT_FOUND', data: null, rawCode: code });
      showToast(`Barcode / ID "${code}" tidak terdaftar di sistem.`, 'error');
    } catch {
      setResult({ type: 'NOT_FOUND', data: null, rawCode: code });
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setQuery('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading font-semibold text-slate-900 tracking-tight">
            Pencarian Cepat Barcode / Manual
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Ketik NIK karyawan atau kode barang untuk verifikasi status dan peminjaman langsung
        </span>
      </div>

      {/* Input Field Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleScan();
              }
            }}
            placeholder="Ketik NIK karyawan (contoh EMP-0101) atau kode barang (contoh 01M10) lalu tekan Enter..."
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors tabular-nums font-medium"
          />
        </div>

        <button
          onClick={() => handleScan()}
          disabled={isScanning || !query.trim()}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isScanning ? 'Mencari...' : 'Cari Data'}
        </button>

        {result && (
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Scanned Result Banner */}
      {result && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-xs animate-in fade-in duration-150">
          {result.type === 'EMPLOYEE' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  {result.data.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-slate-900">{result.data.name}</span>
                    <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                      ({result.data.nik})
                    </span>
                    <span className="text-[10px] font-medium text-slate-600">
                      {result.data.department} | {result.data.shift || 'Shift 1'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {result.data.loans && result.data.loans.length > 0 ? (
                      <span className="text-slate-800 font-semibold">
                        Sedang meminjam {result.data.loans.length} transaksi belum selesai
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        Tidak ada tanggungan pinjaman tertunda
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/loans?emp=${result.data.nik}`}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                >
                  + Proses Peminjaman
                </Link>
                <Link
                  href={`/returns?emp=${result.data.nik}`}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors"
                >
                  Verifikasi Pengembalian
                </Link>
              </div>
            </div>
          )}

          {(result.type === 'TOOL' || result.type === 'INVENTORY') && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tabular-nums text-[11px]">
                    {result.data.code}
                  </span>
                  <span className="font-heading font-bold text-slate-900">{result.data.name}</span>
                  <span className="text-[10px] text-slate-500">
                    ({result.data.category?.name || result.data.category || '-'})
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Lokasi <span className="font-semibold text-slate-800">{result.data.location}</span> |{' '}
                  Stok Siap <span className="font-bold text-[#1E40AF] tabular-nums">{result.data.availableStock} {result.data.unit}</span> (Total Fisik {result.data.totalStock} {result.data.unit})
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/loans?item=${result.data.code}`}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                >
                  + Masukkan ke Keranjang
                </Link>
              </div>
            </div>
          )}

          {result.type === 'NOT_FOUND' && (
            <div className="text-slate-600 py-0.5">
              <span className="font-semibold text-slate-900">Kata kunci &quot;{result.rawCode}&quot; tidak ditemukan.</span> Pastikan ID Karyawan atau Kode Alat telah terdaftar di Data Master.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

