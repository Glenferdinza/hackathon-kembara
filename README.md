# PT YPTI - Tool Room & Inventory Management ERP
**Enterprise Industrial Equipment & Asset Management System**  
*Single Source of Truth & Sprint Execution Blueprint*

---

## 1. Ringkasan Proyek & Arsitektur

Sistem ini adalah **Enterprise Industrial ERP** yang dirancang khusus untuk operasional **PT Yogyakarta Precision Tooling Industries (PT YPTI)**. Sistem berfokus pada efisiensi ruang perkakas (Tool Room), peminjaman berbasis barcode gun, pemantauan keterlambatan pengembalian (overdue monitoring), serta manajemen aset fisik pabrik secara atomik.

### Tech Stack & Ekosistem
- Framework: Next.js 16.4 (App Router, React 19, TypeScript)
- Styling: Tailwind CSS v4 (Palet 90% Monokrom Industri, Anti-AI Slop)
- Database & ORM: Prisma ORM dengan SQLite lokal (dev.db), 100% PostgreSQL-ready
- Visualisasi: Recharts (Kamar Stok Donut & Komposisi Bar Chart)
- Excel Engine: SheetJS (xlsx) untuk impor/ekspor data real-time
- Eksekusi 1-Klik: start.bat untuk inisialisasi mandiri di Windows

---

## 2. Hasil Audit UI/UX & Titik Polishing Mendesak (Zuzur Review)

Berdasarkan pembacaan kode menyeluruh di seluruh halaman dan komponen, berikut adalah poin-poin yang membuat UI masih terasa kaku atau kurang nyaman dilihat dan perlu segera dipoles hari ini:

1. **Sisa Anotasi & Label Mentah dari Soal/Flowchart**:
   - Di loans/page.tsx judul tertulis: "Peminjaman Perkakas & Inventaris (Hal. 3)".
   - Di page.tsx tab tertulis: "3. Log Notifikasi Scheduler (Hal. 6)".
   - Di history/page.tsx dan employees/page.tsx terdapat teks mentah "Hal. 7" dan "Hal. 8".
   - Solusi: Bersihkan semua label dokumen, ganti dengan terminologi enterprise resmi PT YPTI ("Loket Peminjaman Aktif", "Antrean Log Sistem", dll).
2. **Dashboard Terlalu Monolitik (src/app/page.tsx mencapai ~1.380 baris)**:
   - Panel Loket Dispatch Barcode ditaruh di paling atas dengan kotak border tebal dan instruksi teks yang terlalu panjang.
   - Kartu metrik KPI di atas memiliki persentase statis bertuliskan 80% dan 19% yang di-hardcode alih-alih dihitung dinamis dari total stok.
   - Solusi: Pecah sub-komponen dashboard, rapikan visual barcode search strip, dan hitung persentase metrik secara dinamis.
3. **Ketiadaan Skeleton Loading & Empty State Kering**:
   - Saat tabel memuat data, hanya muncul teks polos "Memuat data peralatan...".
   - Saat hasil filter kosong, hanya teks abu-abu di dalam tabel tanpa panduan aksi atau tombol reset filter.
   - Solusi: Buat komponen seragam SkeletonTable dan EmptyState.
4. **Konsistensi Form Input & Modal**:
   - Modal Tambah/Edit di Tool, Inventaris, dan Karyawan memiliki variasi ukuran padding dan belum seragam dalam penanganan tombol Batal / Simpan (kondisi submitting spinner).
   - Modal Perpanjang Tenggat dan Cetak ID Card perlu dipercantik margin dan visual preview-nya.
5. **Linting & Runtime Health**:
   - Terdapat peringatan react-hooks/set-state-in-effect di beberapa komponen yang perlu dibersihkan agar performa render optimal.

---

## 3. Pembagian Tugas (Work Breakdown Structure) untuk 2 Fullstack Engineer

Agar **2 Engineer dapat bekerja secara paralel penuh hari ini tanpa bentrok (zero merge conflict)**, ruang kerja dipisahkan secara tegas berdasarkan domain:

```
+------------------------------------------------------------------------+
|                          PEMBAGIAN SCOPE KERJA                         |
+----------------------------------+-------------------------------------+
| ENGINEER 1: OPERATIONAL &        | ENGINEER 2: MASTER DATA &           |
| TRANSACTION ENGINE               | ENTERPRISE INFRASTRUCTURE           |
+----------------------------------+-------------------------------------+
| 1. Dashboard Operasional         | 1. Master Data Tool & Inventaris    |
|    (src/app/page.tsx)            |    (src/app/master-tool, inventory) |
| 2. Loket Peminjaman Multi-Item   | 2. Data Karyawan & Cetak ID Card    |
|    (src/app/loans/page.tsx)      |    (src/app/employees/page.tsx)     |
| 3. Verifikasi Pengembalian Fisik | 3. Riwayat & Laporan Audit          |
|    (src/app/returns/page.tsx)    |    (src/app/history/page.tsx)       |
| 4. Monitoring Keterlambatan      | 4. Layout, Header, Auth & Help SOP  |
|    (src/app/monitoring/page.tsx) │    (src/components/layout, help)    |
| 5. API Operasional:              | 5. Global UI Kit:                   |
|    (/api/loans, returns, monitor)|    (SkeletonTable, EmptyState, Form)|
+----------------------------------+-------------------------------------+
```

---

### ENGINEER 1 - Operational & Transaction Engine
**Fokus**: Core User Journey peminjaman, pengembalian, quick barcode scanning, dashboard monitoring, dan integrasi WhatsApp.

#### File Tanggung Jawab:
- src/app/page.tsx (Refaktor dashboard, modularisasi, dynamic KPI strip)
- src/components/dashboard/* (StatCard.tsx, BarChartSection.tsx, DonutChartSection.tsx, ActionItemsSection.tsx)
- src/app/loans/page.tsx (Loket peminjaman, combobox pencarian alat, validasi stok multi-item)
- src/app/returns/page.tsx (Modal verifikasi pengembalian parsial/penuh, inspeksi kondisi Baik/Rusak/Hilang)
- src/app/monitoring/page.tsx (Filter keterlambatan, generator template pesan WhatsApp/Email)
- src/app/api/loans/route.ts, src/app/api/returns/route.ts, src/app/api/monitoring/route.ts

#### Checklist Polishing Engineer 1:
- [ ] Bersihkan label mentah: Hapus tulisan (Hal. 3), (Hal. 6), dll.
- [ ] Perbaiki KPI Strip di Dashboard: Ganti persentase hardcode (80%, 19%) menjadi rumus dinamis: ((totalAvailable / totalPhysicalUnits) * 100).toFixed(0)%.
- [ ] Desain Ulang Barcode Scanner Desk: Buat tampilan input barcode di Dashboard dan Loans lebih ringkas, elegan, dengan badge indicator status pemindai yang menyatu rapi.
- [ ] Polish Keranjang Pinjaman (Loans): Berikan animasi halus saat item ditambahkan, stepper kuantitas yang intuitif, dan validasi agar tidak melebihi stok tersedia.
- [ ] Modal Pengembalian Barang (Returns): Berikan opsi pemilihan kondisi fisik (Baik, Rusak, Hilang) dengan radio button chip yang kontras dan jelas bagi petugas gudang.
- [ ] Action Table Keterlambatan (Monitoring): Buat tombol Hubungi WA membuka tautan pesan resmi yang rapi dan sertakan tombol aksi langsung Kembalikan Sekarang.

---

### ENGINEER 2 - Master Data, Catalog & Enterprise Infrastructure
**Fokus**: Pengelolaan aset master, pendataan karyawan, kartu barcode fisik, audit log, standarisasi form, komponen UI bersama (reusable components), dan kestabilan sistem.

#### File Tanggung Jawab:
- src/app/master-tool/page.tsx (Katalog perkakas, filter rak, batas safety stock)
- src/app/master-inventory/page.tsx (Aset umum, pelacakan Serial Number vs Kuantitatif)
- src/app/employees/page.tsx (Data anggota/karyawan, modal cetak ID Card Barcode)
- src/app/history/page.tsx (Audit log transaksi, analisis masa pakai perkakas)
- src/app/help/page.tsx (Buku panduan SOP operasional pabrik)
- src/app/login/page.tsx & src/lib/auth.ts (Halaman masuk & proteksi sesi)
- src/components/layout/* (Header.tsx, Sidebar.tsx, AppShell.tsx)
- src/components/ui/* (Pembuatan SkeletonTable.tsx, perbaikan Pagination.tsx, ConfirmDialog.tsx)
- src/app/layout.tsx & src/app/globals.css (Font offline & CSS tokens)

#### Checklist Polishing Engineer 2:
- [ ] Buat Komponen SkeletonTable: Komponen animasi pemuatan data pengganti teks mentah "Memuat..." untuk semua tabel.
- [ ] Buat Komponen EmptyState: Tampilan visual saat data tabel tidak ditemukan, lengkap dengan deskripsi dan tombol Reset Pencarian.
- [ ] Standarisasi Seluruh Modal Form: Buat modal Tambah Tool, Tambah Inventaris, dan Tambah Karyawan seragam: tata letak grid 2 kolom, tanda bintang merah pada field wajib, dan tombol Batal / Simpan yang konsisten di bagian bawah.
- [ ] Perbaiki Preview Cetak Kartu Barcode (Employees): Pastikan kartu identitas karyawan proporsional seperti kartu fisik standar ID Card (85.6mm x 54mm) saat dicetak atau di-preview.
- [ ] Poles Header & Sidebar: Rapikan penanda menu aktif, pastikan notifikasi dropdown menutup saat klik di luar area (click-outside), dan perbaiki transisi collapse sidebar.
- [ ] Bereskan Lint Issues: Perbaiki peringatan ESLint (setState in effect di Pagination.tsx).

---

## 4. Panduan "Mecut AI" (Prompt Engineering Siap Pakai)

Gunakan prompt template berikut di AI Assistant (Antigravity / Cursor / Copilot) untuk mempercepat pengerjaan tanpa perlu mengetik manual dari nol:

### Prompt untuk Engineer 1 (Dashboard & Transaksi)
```text
Role: Senior Frontend Engineer (Industrial ERP Specialist)
Task: Refactor dan poles UI pada file src/app/loans/page.tsx dan src/app/page.tsx.

Instruksi:
1. Hapus semua teks sisa instruksi seperti "(Hal. 3)", "(Hal. 6)", atau sejenisnya.
2. Pada halaman Peminjaman (loans), percantik form keranjang peminjaman (basket items):
   - Gunakan badge status ketersediaan yang jelas.
   - Tambahkan animasi transisi saat item masuk ke keranjang.
   - Sediakan tombol quick quantity (+ / -) yang divalidasi dengan availableStock.
3. Pada halaman Dashboard (page.tsx):
   - Hitung persentase ketersediaan stok di KPI strip secara dinamis: ((totalAvailable / totalPhysicalUnits) * 100).
   - Rapikan panel Loket Dispatch Barcode agar tampak modern, minimalis, dan siap menerima ketukan scanner barcode USB kasir.
4. Pastikan tetap mematuhi aturan AGENT.md: NO EMOJIS di tombol/header/dokumen, palet warna industri off-white (#F8FAFC) & enterprise blue (#1E40AF), border-radius maksimal rounded-md.
```

### Prompt untuk Engineer 2 (Master Data & Reusable UI)
```text
Role: Senior Frontend Engineer (Design System Specialist)
Task: Buat komponen reusable dan poles halaman Master Data & Karyawan.

Instruksi:
1. Buat komponen baru di src/components/ui/SkeletonTable.tsx yang menerima props: rows: number, cols: number. Gunakan Tailwind animate-pulse dengan nuansa abu-abu slate bersih.
2. Buat komponen src/components/ui/EmptyState.tsx yang rapi untuk tabel kosong dengan tombol CTA opsional.
3. Terapkan SkeletonTable dan EmptyState tersebut ke:
   - src/app/master-tool/page.tsx
   - src/app/master-inventory/page.tsx
   - src/app/employees/page.tsx
4. Poles modal "Tambah Data" dan "Edit Data" di ketiga halaman di atas agar menggunakan layout form 2-kolom yang konsisten, label tegas dengan tanda bintang merah untuk wajib diisi, dan state loading saat submit.
5. Perbaiki issue setState in effect pada src/components/ui/Pagination.tsx sesuai best practice React.
6. Patuhi aturan AGENT.md: NO EMOJIS dalam bentuk apa pun, font bebas monospace generic, tipografi IBM Plex Sans & Roboto, tabular-nums untuk angka stok.
```

---

## 5. Git Branching & Strategi Kolaborasi (Biar Ga Nabrak)

Untuk memastikan pekerjaan selesai hari ini tanpa drama konflik Git:

```bash
# 1. Update cabang utama bersama
git checkout main
git pull origin main

# 2. Engineer 1 membuat cabang operasional
git checkout -b feat/eng1-operational-and-dashboard

# 3. Engineer 2 membuat cabang master & layout
git checkout -b feat/eng2-master-data-and-uikit
```

### Aturan Main Kolaborasi:
1. **Dilarang menyentuh file pasangan**: Engineer 1 jangan mengedit master-tool atau employees, Engineer 2 jangan mengedit loans atau returns.
2. **Komponen Bersama**: Jika Engineer 2 telah selesai membuat SkeletonTable.tsx, lakukan commit dan push segera agar Engineer 1 bisa langsung memakainya via git pull atau git merge.
3. **Validasi Akhir Sebelum Merge ke Main**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 6. Timeline Eksekusi Hari Ini (Sprint Jam per Jam)

| Target Waktu | Engineer 1 (Operasional) | Engineer 2 (Master & UI Kit) |
|---|---|---|
| **Jam 1 (00:00 - 01:00)** | Bersihkan teks label mentah & pecah logika barcode scanner dashboard | Buat SkeletonTable.tsx & EmptyState.tsx, rapikan layout |
| **Jam 2 (01:00 - 02:00)** | Poles tabel keranjang & validasi stok pada halaman Peminjaman (loans) | Terapkan Skeleton & EmptyState pada master-tool & master-inventory |
| **Jam 3 (02:00 - 03:00)** | Poles modal pengembalian (returns) & filter monitoring keterlambatan | Standardisasi modal form Master Data & percantik cetak ID Card karyawan |
| **Jam 4 (03:00 - 04:00)** | Integrasi WhatsApp template & perbaiki modal perpanjang tenggat | Poles halaman Riwayat (history), SOP Help, dan bersihkan error ESLint |
| **Jam 5 (04:00 - 04:30)** | SINKRONISASI BERSAMA: Merge cabang ke main, uji coba start.bat, dan demo run |

---

## 7. Menjalankan Sistem

### Mode Cepat 1-Klik (Windows):
Cukup klik ganda pada berkas **start.bat** di direktori root. Berkas ini otomatis memeriksa dependensi Node.js, inisialisasi basis data dev.db, melakukan seeding data riil PT YPTI, lalu meluncurkan browser ke http://localhost:3000.

### Mode Manual (Terminal):
```bash
# 1. Instal dependensi
npm install

# 2. Setup database SQLite lokal
npx prisma db push
npx prisma db seed

# 3. Jalankan server pengembangan
npm run dev
```

### Akun Masuk Demo:
- Email: admin@ypti.co.id
- Kata Sandi: admin123
- (Atau gunakan tombol masuk cepat "Demo Administrator" pada halaman login)
