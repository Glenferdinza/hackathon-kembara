# AGENT.MD: MANDATORY SYSTEM & DESIGN INSTRUCTIONS
**Tool Loan & Inventory Management System (Enterprise ERP - PT YPTI Context)**

Dokumen ini adalah **titik instruksi wajib (single source of truth & primary guardrails)** yang WAJIB ditaati oleh agen AI saat merancang, menulis, memperbarui kode, komponen, dan alur sistem.

---

## 1. ANTI-AI SLOP & DESIGN PHILOSOPHY (STRICT ENFORCEMENT)

Aplikasi ini adalah **Enterprise Industrial ERP** untuk pengelolaan perkakas industri dan inventaris perusahaan. Tampilan harus menyerupai software ERP kelas manufaktur (seperti ERP Titian pada referensi), bukan template SaaS generic atau AI generated mockups.

### 🚫 DILARANG KERAS (Strictly Forbidden):
1. **NO EMOJIS** di judul halaman, tombol, menu sidebar, kartu statistik, tabel, atau pesan error (contoh: ❌ `🚀 Dashboard`, ❌ `📦 Tambah Barang`, ❌ `⚠️ Peringatan`).
2. **ZERO ICON SPAM / ZERO EXCESSIVE ICONS (TEXT-FIRST ENTERPRISE ERP)**:
   Dilarang menghias setiap label, menu, tombol, kartu, badge, dan baris tabel dengan ikon. Desain ERP profesional (seperti referensi ERP Titian Pic 2–5) mengandalkan **tipografi bersih, angka tegas, dan whitespace yang rapi**.
   - **Sidebar**: DILARANG memasang icon di setiap link navigasi. Gunakan teks bersih dan indikator vertikal aktif (`border-l-2 border-[#16835D]`) persis seperti ERP Titian.
   - **Header**: DILARANG memasang icon di dalam kolom pencarian atau tombol notifikasi. Gunakan input bersih dan teks badge `Notifikasi`.
   - **Kartu statistik**: DILARANG memakai kotak ikon. Cukup judul kecil abu-abu, angka metrik besar, dan subteks (persis seperti Pic 2).
   - **Baris tabel**: DILARANG menjejerkan 3 ikon (Eye, Edit, Trash) di setiap baris. Gunakan aksi teks bersih (`Detail | Edit | Hapus`).
   - **Tombol utama**: Gunakan teks tegas (`+ Tambah Tool`, `Export`, `Filter`, `Batal`), dilarang menempelkan ikon dekoratif di depan teks.
   - **Status badge**: Cukup teks bersih berbingkai (`Tersedia`, `Dipinjam`, `Terlambat`), jangan beri ikon di dalam badge.
3. **NO HYPER-CURVED CORNERS (Bubbly / Pill borders)**: Jangan gunakan `rounded-3xl` atau `rounded-full` berlebihan pada card atau layout container. Gunakan border-radius standar enterprise: `rounded-md` (4px–6px) atau `rounded-lg` (8px).
4. **NO NEON / GLOW / CANDY GRADIENTS**: Jangan gunakan background gradient ungu-biru neon (`bg-gradient-to-r from-purple-500 to-pink-500`). Gunakan warna solid clean industrial atau subtle neutral border.
5. **NO AI-SLOP NUMBERED BADGES**: Dilarang membuat list berurutan dengan bulatan gradasi angka melayang besar khas AI pitch-deck. Gunakan tabel terstruktur rapi dengan nomor baris atau kode referensi.
6. **NO GENERIC PLACEHOLDERS**: Tidak boleh ada data placeholder "Lorem Ipsum", tombol tanpa aksi, atau mock dummy yang tidak sinkron ke database.
7. **NO RAINBOW TABLES & NO SOLID BUTTON NOISE IN CELLS**:
   - Dilarang keras menjejerkan tombol hijau WhatsApp, tombol biru solid, dan badge warna-warni dalam satu baris tabel.
   - Aksi baris tabel WAJIB menggunakan tautan teks bersih (`Kembalikan | Hubungi`) atau tombol outline netral tipis.
   - Dilarang memberi background tombol warna neon (`#25D366`) di sel tabel berulang.
8. **NO CANDY FILTER PILLS**:
   - Tab filter (Semua, Terlambat, Jatuh Tempo) WAJIB berupa **Segmented Tab Control Netral**: latar slate halus, teks slate, tab aktif ditandai dengan latar putih atau border netral. Dilarang mewarnai tab filter dengan merah, kuning, dan hitam sekaligus.
9. **NO EM-DASHES (—) AND NO EMOJIS**:
   - Dilarang memakai karakter em-dash (U+2014) di judul, metadata, atau teks manapun. Gunakan tanda hubung (-) atau titik dua (:).
   - Dilarang memakai emoji dan simbol emote dalam bentuk apa pun.
10. **NO AI-SLOP ACCENT STRIPES (border-l-2/4)**:
    - Dilarang membuat kartu peringatan dengan garis samping warna tipis di sisi kiri (border-l-2) khas template AI generic.
    - Gunakan struktur tabel antrean tindakan operasional (Action Queue Table) atau panel netral berbingkai tipis seragam.
11. **STRICT SINGLE-LINE DATA (NO AWKWARD 2-LINE CELL WRAP)**:
    - Kode barang (TOL-001, INV-001), kuantitas unit (15 PCS), dan header tabel wajib menggunakan `whitespace-nowrap` dan kontainer tabel wajib memiliki `min-w-[1100px]`.
12. **NO MOCK / UNNECESSARY DATABASE BADGES**:
    - Dilarang memasang badge status database lokal di sidebar navigasi.
13. **COLLAPSIBLE SIDEBAR WITH FULL-WIDTH EXPANSION**:
    - Sidebar wajib dapat ditutup/disembunyikan (collapsed) di desktop agar area kerja data tabel dapat memanfaatkan lebar layar 100%.

### COLOR PALETTE & TYPOGRAPHY SYSTEM (90% MONOCHROME):
- **Base Canvas**: Off-white Industrial `#F8FAFC` (Slate 50).
- **Surface / Card Background**: Pure White `#FFFFFF` dengan subtle border `#E2E8F0` (Slate 200).
- **Primary Brand**: PT YPTI Corporate Blue `#1E40AF` (hanya untuk tombol aksi utama halaman dan indikator aktif).
- **Alert Colors**: Muted Rose `#991B1B` (latar `#FEF2F2`), Muted Amber `#92400E` (latar `#FFFBEB`) - hanya untuk indikator status kritis dengan warna lembut, bukan permen mencolok.
- **Table Actions**: Neutral slate text links atau clean outline buttons.
- **Typography**: IBM Plex Sans Bold untuk heading/menu, Roboto untuk body dan tabular numbers (`tabular-nums`). Bebas dari font monospace generic.

---

## 2. ARSITEKTUR TEKNOLOGI & LOKAL OFFLINE EXECUTION

- **Framework**: **Next.js (App Router, React 18/19, TypeScript)** — Full-stack framework handal dengan Server Actions / API Routes terintegrasi.
- **Styling**: **Tailwind CSS** dengan konfigurasi warna presisi enterprise sesuai color tokens di atas.
- **ORM & Database**: **Prisma ORM**
  - **Local Execution**: Menggunakan SQLite / PostgreSQL compatibility. Untuk memudahkan pengujian langsung juri/admin cukup dengan klik file `.bat`, Prisma menangani relasi foreign key, transaksi atomik, dan migrasi secara penuh tanpa repot instalasi software server tambahan yang rumit di Windows.
  - **PostgreSQL Ready**: Skema dibuat 100% kompatibel dengan PostgreSQL sehingga hanya dengan mengubah `provider = "postgresql"` dan `DATABASE_URL` di `.env`, sistem langsung switch ke cloud Postgres (Supabase/Neon/Self-hosted) saat ada kebutuhan deploy.
- **XLSX Engine**: Library `xlsx` (SheetJS) untuk pemrosesan file Excel native (impor & ekspor sungguhan).
- **Eksekusi 1-Klik**: Sediakan `start.bat` di root direktori agar user dapat menjalankan sistem lokal dengan double-click di Windows.

---

## 3. LOGIKA ATOMIK & ATURAN BISNIS INVENTARIS

### A. Perbedaan Tool vs. Inventaris
1. **Tool (Perkakas Industri)**:
   - Memiliki parameter teknis (Spesifikasi mesin, ukuran/toleransi, material, tipe mata pisau/moulding, nomor rak).
   - Umumnya dipinjam untuk pekerjaan shift kerja, dikembalikan dalam hitungan jam/hari.
2. **Inventaris (Aset Umum/Elektronik/Fasilitas)**:
   - Memiliki parameter aset (Merek, model, nomor seri individual, tahun perolehan, unit kerja penanggung jawab).
   - Pengelolaan mendukung dua mode:
     - **Individual Asset Tracking**: Menggunakan serial number / unit code unik untuk tiap fisik barang.
     - **Quantitative Tracking**: Pelacakan agregat jumlah kuantitas untuk consumable / perkakas massal.

### B. Rumus Konsistensi Stok (Atomik):
- **Saat Peminjaman**:
  - `Stok Tersedia = Stok Tersedia - Jumlah Dipinjam`
  - `Stok Dipinjam = Stok Dipinjam + Jumlah Dipinjam`
  - `Total Stok = TETAP SAMA` (Dilarang mengurangi total stok saat barang dipinjam!).
- **Saat Pengembalian (Kondisi Baik)**:
  - `Stok Tersedia = Stok Tersedia + Jumlah Dikembalikan`
  - `Stok Dipinjam = Stok Dipinjam - Jumlah Dikembalikan`
  - `Total Stok = TETAP SAMA`.
- **Saat Pengembalian (Kondisi Rusak / Hilang)**:
  - `Stok Dipinjam = Stok Dipinjam - Jumlah Rusak`
  - `Stok Rusak/Perawatan = Stok Rusak/Perawatan + Jumlah Rusak`
  - Barang rusak TIDAK BOLEH langsung masuk ke Stok Tersedia.

### C. Alur Peminjaman (Sesuai Whiteboard & Blueprint):
`[Barcode / Input Manual ID Karyawan]` ➔ `[Validasi Identitas Karyawan (Nama, Dept, Kontak)]` ➔ `[Pilih Jenis: Tool vs Inventaris]` ➔ `[Pilih Barang & Cek Stok Real-Time]` ➔ `[Tentukan Jumlah & Tenggat Pengembalian]` ➔ `[Review Ringkasan]` ➔ `[Simpan Atomik & Cetak / Generate No. Transaksi]` ➔ `[Notifikasi & Monitoring Aktif]`

### D. Alur Monitoring Keterlambatan:
- Status otomatis berubah berdasarkan `server timestamp`:
  - `Dipinjam` (Aktif dalam batas tenggat).
  - `Mendekati Jatuh Tempo` (Jika tersisa < 24 jam / hari yang sama).
  - `Terlambat` (Jika `now() > return_deadline` dan barang belum kembali).
  - `Selesai` (Setelah seluruh unit dikembalikan).
- Fitur **Hubungi Peminjam**: Membuka WhatsApp (`https://wa.me/...`) dan mailto dengan template pesan profesional yang berisi nama peminjam, nama barang, kode transaksi, dan durasi keterlambatan.

---

## 4. STRUKTUR MENU & FITUR HALAMAN

1. **Dashboard (Beranda)**:
   - 8 Kartu KPI (Total Jenis Tool, Total Unit Tool, Tool Tersedia, Tool Dipinjam, Total Inventaris, Inventaris Tersedia, Peminjaman Aktif, Transaksi Terlambat).
   - Diagram Batang: Perbandingan Stok Total vs Tersedia vs Dipinjam.
   - Diagram Donut: Komposisi Status Stok (Tersedia, Dipinjam, Perbaikan, Rusak).
   - Diagram Tren: Peminjaman & Pengembalian bulanan/mingguan.
   - Panel "Menunggu Tindakan" (Keterlambatan, persetujuan, verifikasi kembali).
   - Tabel "Jatuh Tempo Terdekat".
   - Tombol "Import XLSX" & "Export XLSX" fungsional.
2. **Master Data Tool**:
   - Tabel berpaginasi, pencarian, filter kategori/lokasi/kondisi.
   - Form Tambah & Edit dengan validasi unik kode tool.
   - Modal Detail & Riwayat Penggunaan Tool.
   - Soft-delete / penonaktifan barang yang sudah punya histori transaksi.
3. **Master Data Inventaris**:
   - Kolom fleksibel: Merek, model, serial number, unit aset.
   - Dukungan pelacakan individual serial number vs kuantitatif.
4. **Data Peminjaman**:
   - Scanner barcode keyboard-wedge input & manual fallback.
   - Multi-item checkout dalam satu transaksi peminjaman.
   - Validasi stok server-side (mencegah peminjaman melebihi stok tersedia).
5. **Data Pengembalian**:
   - Pencarian transaksi peminjaman aktif.
   - Dukungan pengembalian parsial (sebagian).
   - Pemeriksaan kondisi (Baik, Rusak, Hilang) dan pencatatan catatan kerusakan.
6. **Monitoring Keterlambatan**:
   - Badge counter keterlambatan.
   - Filter durasi keterlambatan, tombol langsung WhatsApp / Email reminder.
7. **Riwayat Transaksi & Audit Log**:
   - Catatan seluruh transaksi lengkap dengan timestamp dan nama Admin operator.
8. **Pengaturan / Data Karyawan**:
   - Kelola data peminjam/karyawan (ID Karyawan, Nama, Departemen, No WhatsApp, Email).

---

## 5. STANDARD EKSEKUSI & TESTING
Setiap perubahan kode harus:
1. Menjaga integritas data (tidak ada data hilang atau inkonsistensi stok).
2. Terhindar dari error runtime, linting error, atau unhandled exceptions.
3. Menampilkan feedback visual yang jelas: Loading skeleton, status badge, Toast notification, konfirmasi modal sebelum aksi destruktif.
