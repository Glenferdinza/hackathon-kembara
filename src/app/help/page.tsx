'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';

export default function HelpPage() {
  const sopSections = [
    {
      id: 'sop-peminjaman',
      number: 'SOP 01',
      title: 'Prosedur Penginputan Peminjaman Barang (Tool & Inventaris)',
      desc: 'Tahapan baku pelayanan pengambilan perkakas atau aset oleh karyawan shift kerja',
      actionLink: '/loans',
      actionLabel: 'Buka Menu Peminjaman',
      steps: [
        {
          num: '01',
          title: 'Pemilihan Identitas Karyawan (Dropdown atau Pencarian Manual)',
          text: 'Pilih nama peminjam dari daftar karyawan terdaftar atau ketik NIK / nama pada kolom pencarian manual. Jika karyawan belum terdaftar di database, klik tombol "+ Tambah Karyawan Baru" langsung dari halaman peminjaman untuk mendaftarkan dan memilih anggota seketika.',
          note: 'Catatan Petugas: Pastikan departemen dan nomor WhatsApp peminjam sesuai sebelum menyerahkan perkakas.',
        },
        {
          num: '02',
          title: 'Pemilihan Tipe Barang (Tool vs Inventaris)',
          text: 'Tentukan jenis barang pada tab peminjaman. Pilih Tool untuk perkakas mesin (endmill, collet, boring bar, dial indicator) atau Inventaris untuk aset umum/elektronik (caliper, scanner, power tools).',
          note: 'Pemeriksaan Stok: Sistem menampilkan jumlah stok siap pakai secara realtime. Dilarang meminjamkan barang dengan stok 0.',
        },
        {
          num: '03',
          title: 'Penentuan Jumlah Unit & Batas Tenggat Waktu',
          text: 'Pilih barang dari menu dropdown atau ketik pencarian, lalu masukkan jumlah yang dibutuhkan. Tentukan batas waktu pengembalian menggunakan tombol preset cepat (1 Shift / 8 Jam, 1 Hari, 3 Hari) atau atur tanggal dan jam kustom.',
          note: 'Aturan Shift: Peminjaman perkakas harian wajib memiliki tenggat waktu sebelum pergantian shift berikutnya.',
        },
        {
          num: '04',
          title: 'Pemeriksaan Ringkasan & Konfirmasi Transaksi Atomik',
          text: 'Periksa kembali daftar item pada tabel keranjang peminjaman. Klik tombol Simpan Transaksi. Sistem akan menerbitkan Nomor Transaksi unik (contoh: TRX-2026-XXXX), mengurangi stok tersedia secara atomik, dan menambah counter barang dipinjam.',
          note: 'Serah Terima Fisik: Berikan fisik barang kepada peminjam hanya setelah nomor transaksi berhasil tercatat di sistem.',
        },
      ],
    },
    {
      id: 'sop-pengembalian',
      number: 'SOP 02',
      title: 'Prosedur Penerimaan Pengembalian & Pemeriksaan Fisik',
      desc: 'Tahapan verifikasi kondisi barang dan pengembalian unit ke dalam gudang',
      actionLink: '/returns',
      actionLabel: 'Buka Menu Pengembalian',
      steps: [
        {
          num: '01',
          title: 'Pencarian Transaksi Peminjaman Aktif',
          text: 'Buka menu Data Pengembalian. Ketik nomor transaksi peminjaman atau cari berdasarkan nama karyawan peminjam pada daftar transaksi yang sedang berjalan.',
          note: 'Multi-Item: Jika peminjam meminjam beberapa item sekaligus, sistem menampilkan seluruh rincian barang dalam transaksi tersebut.',
        },
        {
          num: '02',
          title: 'Pemeriksaan Fisik Perkakas & Penghitungan Unit',
          text: 'Lakukan inspeksi visual menyeluruh terhadap fisik barang yang dikembalikan: ketajaman mata pisau, kelurusan shank, kelengkapan kotak pelindung, serta fungsi alat ukur presisi.',
          note: 'Standar Kalibrasi: Alat ukur presisi (micrometer/dial) wajib diperiksa apakah mengalami benturan atau pergeseran nol.',
        },
        {
          num: '03',
          title: 'Klasifikasi Kondisi (Baik, Rusak, atau Hilang)',
          text: 'Tentukan status kondisi untuk setiap unit yang dikembalikan. Pilih "Kondisi Baik" jika barang utuh dan siap pakai. Pilih "Kondisi Rusak" jika aus abnormal, gompal, atau perlu servis. Pilih "Hilang" jika unit tidak dapat dikembalikan.',
          note: 'Karantina Barang: Unit berstatus Rusak otomatis dipindahkan ke status Dalam Perawatan dan tidak dapat dipinjam kembali sampai diverifikasi selesai perbaikan.',
        },
        {
          num: '04',
          title: 'Konfirmasi Pengembalian & Penyimpanan Fisik ke Rak',
          text: 'Klik tombol Selesaikan Pengembalian. Sistem mencatat timestamp pengembalian, memperbarui status transaksi menjadi Selesai, dan mengembalikan kuantitas ke stok tersedia secara atomik. Kembalikan fisik perkakas ke alamat rak/laci asalnya.',
          note: 'Kerapian Rak: Pastikan nomor laci atau kompartemen rak sesuai dengan kode lokasi yang tertera di sistem.',
        },
      ],
    },
    {
      id: 'sop-master',
      number: 'SOP 03',
      title: 'Prosedur Perekaman & Pengelolaan Master Data Barang',
      desc: 'Tata cara input katalog perkakas baru, batas minimum stok, dan penomoran rak',
      actionLink: '/master-tool',
      actionLabel: 'Buka Master Data Tool',
      steps: [
        {
          num: '01',
          title: 'Standar Penomoran Kode Unik Barang',
          text: 'Setiap barang wajib memiliki kode registrasi yang unik. Gunakan awalan TOL-XXX untuk perkakas mesin (contoh: TOL-001, TOL-002) dan INV-XXX untuk aset inventaris perlengkapan (contoh: INV-001, INV-002). Kode tidak boleh diduplikasi.',
          note: 'Keteraturan Kode: Penomoran yang tertib memudahkan petugas saat pencarian manual dan penataan laci.',
        },
        {
          num: '02',
          title: 'Pengisian Spesifikasi Teknis & Lokasi Penyimpanan',
          text: 'Lengkapi nama barang dengan spesifikasi teknis spesifik (contoh: Endmill Carbide 4 Flute D10, Dial Indicator Mitutoyo 0.01mm). Masukkan kategori mesin serta nomor rak fisik (contoh: Rak A-01-A, Kabinet QC-02).',
          note: 'Akurasi Lokasi: Lokasi rak yang presisi memangkas waktu pencarian fisik perkakas di lantai produksi.',
        },
        {
          num: '03',
          title: 'Penetapan Batas Minimum Stok (Safety Stock)',
          text: 'Tentukan angka batas minimum persediaan untuk tiap barang. Ketika stok siap pakai berada pada atau di bawah ambang batas ini, sistem otomatis menandai status "Stok Menipis" dan memicu peringatan pengadaan pada dashboard.',
          note: 'Pencegahan Hambatan Produksi: Tetapkan batas minimum sesuai rata-rata pemakaian mingguan dan durasi pemesanan ulang (*lead time*).',
        },
      ],
    },
    {
      id: 'sop-excel',
      number: 'SOP 04',
      title: 'Prosedur Impor & Ekspor Data Massal via File Excel (XLSX)',
      desc: 'Panduan sinkronisasi data katalog dalam jumlah besar tanpa input manual satu per satu',
      actionLink: '/master-inventory',
      actionLabel: 'Buka Master Data Inventaris',
      steps: [
        {
          num: '01',
          title: 'Pengunduhan Berkas Template Format Baku',
          text: 'Gunakan fitur Ekspor Data atau unduh file format template resmi pada halaman Master Data. File template berisi struktur kolom yang sudah disesuaikan dengan validasi sistem database.',
          note: 'Integritas Header: Dilarang mengubah urutan, nama, atau menghapus baris judul kolom pada lembar kerja Excel.',
        },
        {
          num: '02',
          title: 'Pengisian Data Barang Baru pada Lembar Kerja',
          text: 'Ketikkan data barang baru mengikuti kolom yang tersedia: Kode Barang, Nama Lengkap, Kategori, Lokasi Rak, Total Stok, Satuan, dan Batas Minimum Stok. Pastikan tidak ada sel kode yang kosong atau bernilai ganda.',
          note: 'Format Data: Masukkan angka murni pada kolom kuantitas stok tanpa menambahkan teks satuan di dalam sel angka.',
        },
        {
          num: '03',
          title: 'Pengunggahan Berkas & Verifikasi Otomatis',
          text: 'Klik tombol Impor Excel dan pilih berkas .xlsx yang telah diisi. Sistem membaca seluruh baris data, memeriksa validitas nilai, menolak baris yang tidak valid, dan langsung memasukkan data bersih ke database.',
          note: 'Audit Log: Riwayat aktivitas impor tersimpan secara otomatis pada menu Riwayat & Audit Log.',
        },
      ],
    },
    {
      id: 'sop-monitoring',
      number: 'SOP 05',
      title: 'Prosedur Monitoring Keterlambatan & Notifikasi Pengingat',
      desc: 'Tata kelola pengawasan tenggat waktu peminjaman dan eskalasi komunikasi ke peminjam',
      actionLink: '/monitoring',
      actionLabel: 'Buka Monitoring Keterlambatan',
      steps: [
        {
          num: '01',
          title: 'Pemeriksaan Rutin Dasbor Monitoring pada Setiap Awal Shift',
          text: 'Petugas Tool Room wajib membuka menu Monitoring Keterlambatan pada awal shift. Periksa daftar transaksi berstatus "Mendekati Jatuh Tempo" (tersisa kurang dari 24 jam) dan transaksi yang telah melewati batas "Terlambat".',
          note: 'Prioritas Penanganan: Dahulukan tindak lanjut pada perkakas dengan tingkat keterlambatan tertinggi atau perkakas dengan stok kritis.',
        },
        {
          num: '02',
          title: 'Pengiriman Notifikasi Pengingat Resmi via WhatsApp / Email',
          text: 'Klik tombol aksi WhatsApp atau Email pada baris transaksi terkait. Sistem secara otomatis membuka template pesan resmi yang memuat nama peminjam, nomor transaksi, nama alat, dan batas waktu pengembalian.',
          note: 'Standar Komunikasi: Gunakan kalimat pengingat profesional yang telah diformat otomatis oleh sistem PT YPTI.',
        },
        {
          num: '03',
          title: 'Prosedur Perpanjangan Tenggat Waktu Terjadwal',
          text: 'Jika pekerjaan produksi memerlukan penambahan waktu peminjaman atas persetujuan supervisor, klik tombol Perpanjang pada baris transaksi. Masukkan tanggal dan jam tenggat baru beserta catatan alasan perpanjangan.',
          note: 'Pembaruan Status: Transaksi yang diperpanjang otomatis keluar dari antrean keterlambatan dan status jatuh tempo terbarui.',
        },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        {/* Page Header */}
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base lg:text-lg font-semibold font-heading text-slate-900 tracking-tight">
              Panduan Operasional &amp; Standar Prosedur (SOP)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedoman resmi alur penginputan, pengembalian, tata kelola stok, dan penanganan keterlambatan PT YPTI
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold self-start sm:self-auto">
            Revisi Dokumen 2026.1 (Industrial ERP)
          </div>
        </div>

        {/* Quick Jump Bar */}
        <div className="bg-white border border-slate-200 rounded p-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">
            Daftar SOP
          </span>
          {sopSections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 transition-colors"
            >
              {sec.number}
            </a>
          ))}
        </div>

        {/* SOP Cards Container */}
        <div className="space-y-6">
          {sopSections.map((sec) => (
            <div
              key={sec.id}
              id={sec.id}
              className="bg-white border border-[#E2E8F0] rounded-md p-5 space-y-4 scroll-mt-20"
            >
              {/* SOP Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1E40AF]">
                      {sec.number}
                    </span>
                    <h2 className="text-sm font-bold font-heading text-slate-900">
                      {sec.title}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {sec.desc}
                  </p>
                </div>

                <Link
                  href={sec.actionLink}
                  className="self-start sm:self-auto text-xs font-semibold text-[#1E40AF] hover:bg-blue-50 border border-[#1E40AF]/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                >
                  {sec.actionLabel} &rarr;
                </Link>
              </div>

              {/* Numbered Steps List */}
              <div className="divide-y divide-slate-100">
                {sec.steps.map((st) => (
                  <div key={st.num} className="py-3 first:pt-1 last:pb-1 flex items-start gap-3">
                    {/* Step Number */}
                    <span className="text-xs font-bold text-slate-700 tabular-nums shrink-0 mt-0.5 w-6">
                      {st.num}.
                    </span>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-xs font-bold font-heading text-slate-900 leading-snug">
                        {st.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {st.text}
                      </p>
                      <div className="text-[11px] text-slate-500 leading-snug pt-0.5">
                        {st.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact & Support Footer Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900">Kendala Teknis atau Pertanyaan Prosedur?</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hubungi Supervisor Tool Room atau Tim Maintenance Sistem PT YPTI untuk bantuan lebih lanjut.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
