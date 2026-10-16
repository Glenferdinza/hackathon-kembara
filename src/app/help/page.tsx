'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function HelpPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div className="pb-3 border-b border-slate-200">
          <h1 className="text-base font-bold font-heading text-slate-900 uppercase tracking-tight">
            PANDUAN OPERASIONAL & REFERENSI TEKNIS SISTEM (PT YPTI)
          </h1>
          <p className="text-xs text-slate-500">
            Dokumentasi alur bisnis, formula konsistensi stok atomik, dan cara menjalankan sistem
          </p>
        </div>

        {/* Section 1: Cara Menjalankan Aplikasi via start.bat */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-5 space-y-3">
          <h2 className="text-sm font-bold font-heading text-slate-900">
            1. Menjalankan Aplikasi Secara Offline via `start.bat`
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Aplikasi telah dilengkapi skrip eksekusi satu-klik di root folder: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1E40AF] font-bold">start.bat</code>.
          </p>
          <div className="bg-slate-900 text-slate-100 p-3 rounded text-xs space-y-1">
            <p className="text-blue-400">:: Cukup double-click file start.bat pada File Explorer Windows Anda</p>
            <p className="font-bold">&gt; start.bat</p>
            <p className="text-slate-400">1. Mengecek Node.js &amp; menginstal dependensi otomatis</p>
            <p className="text-slate-400">2. Menyiapkan database relasional lokal dan seed data realistis</p>
            <p className="text-slate-400">3. Menjalankan dev server dan otomatis membuka browser ke http://localhost:3000</p>
          </div>
        </div>

        {/* Section 2: Alur Peminjaman (Whiteboard Flow) */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-5 space-y-3">
          <h2 className="text-sm font-bold font-heading text-slate-900">
            2. Alur Peminjaman Barang (Sesuai Sketsa Whiteboard)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-[#1E40AF]">LANGKAH 1</span>
              <p className="font-semibold text-slate-900">Scan Barcode / NIK</p>
              <p className="text-slate-500 text-[11px]">Identifikasi ID karyawan peminjam dan validasi nama, departemen, serta nomor WhatsApp.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-[#1E40AF]">LANGKAH 2</span>
              <p className="font-semibold text-slate-900">Pilih Parameter Tipe</p>
              <p className="text-slate-500 text-[11px]">Pilih antara tab Tool (spesifikasi mesin) atau Inventaris (merek/SN). Cek stok real-time.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-[#1E40AF]">LANGKAH 3</span>
              <p className="font-semibold text-slate-900">Tentukan Tenggat</p>
              <p className="text-slate-500 text-[11px]">Pilih preset cepat (1 Shift / 8 Jam, 1 Hari, 3 Hari) atau tanggal kustom.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-[#1E40AF]">LANGKAH 4</span>
              <p className="font-semibold text-slate-900">Simpan Atomik</p>
              <p className="text-slate-500 text-[11px]">Transaksi dicatat dengan konsistensi stok atomik dan nomor transaksi unik.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Formula Konsistensi Stok Atomik */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-5 space-y-3">
          <h2 className="text-sm font-bold font-heading text-slate-900">
            3. Aturan Konsistensi Stok Atomik
          </h2>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#1E40AF]">[PINJAM]</span>
              <p className="text-slate-700">
                <span className="font-bold">Saat Peminjaman:</span> <code className="bg-white px-1 border rounded tabular-nums">Stok Tersedia = Stok Tersedia - Qty</code>, <code className="bg-white px-1 border rounded tabular-nums">Stok Dipinjam = Stok Dipinjam + Qty</code>. Total Stok <span className="font-bold text-[#1E40AF]">TETAP SAMA</span>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#1E40AF]">[KEMBALI]</span>
              <p className="text-slate-700">
                <span className="font-bold">Saat Pengembalian (Kondisi Baik):</span> <code className="bg-white px-1 border rounded tabular-nums">Stok Tersedia = Stok Tersedia + Qty</code>, <code className="bg-white px-1 border rounded tabular-nums">Stok Dipinjam = Stok Dipinjam - Qty</code>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#D94841]">[RUSAK]</span>
              <p className="text-slate-700">
                <span className="font-bold">Saat Pengembalian (Kondisi Rusak):</span> Barang masuk ke status <span className="font-bold text-amber-700">Dalam Perawatan</span>, dan <span className="font-bold text-red-700">TIDAK BOLEH</span> langsung masuk ke Stok Tersedia sampai diverifikasi selesai perbaikan.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Beralih ke PostgreSQL Cloud / Lokal */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-5 space-y-3">
          <h2 className="text-sm font-bold font-heading text-slate-900">
            4. Beralih ke PostgreSQL (Dual-Mode Prisma)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Skema database dirancang 100% kompatibel dengan PostgreSQL. Untuk menghubungkan ke PostgreSQL (misal Neon.tech gratis atau server PostgreSQL lokal):
          </p>
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
            <li>Buka file <code className="font-bold">prisma/schema.prisma</code>, ubah <code className="text-[#1E40AF]">provider = &quot;sqlite&quot;</code> menjadi <code className="text-[#2563EB]">provider = &quot;postgresql&quot;</code>.</li>
            <li>Buka file <code className="font-bold">.env</code>, isi <code className="text-slate-800">DATABASE_URL=&quot;postgresql://user:pass@host:5432/dbname?schema=public&quot;</code>.</li>
            <li>Jalankan perintah: <code className="bg-white px-1 border rounded">npx prisma db push &amp;&amp; npx prisma db seed</code>.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
