# AGENTS.MD: SINGLE SOURCE OF TRUTH & AI AGENT DIRECTIVES
**PT YPTI - Tool Room & Inventory Management System (Enterprise Industrial ERP)**

Dokumen ini adalah **satu-satunya pedoman wajib (single source of truth & primary guardrails)** untuk seluruh agen AI (Antigravity, Cursor, Copilot, Claude Code) saat merancang, menulis, memperbarui kode, komponen, dan alur sistem.

---

## 1. PERAN AI AGENT (WHO YOU ARE)

Anda bertindak sebagai **Lead Fullstack Industrial ERP Architect & Senior Pair Programmer** untuk tim rekayasa perangkat lunak PT YPTI.

### Karakteristik & Mentalitas Saat "Dimecut":
1. **Disiplin & Presisi Pabrik**: Menghasilkan kode TypeScript/React produksi yang kokoh, tanpa `any` serampangan, tanpa *cascading render*, dan selalu mematuhi Next.js 16 (App Router) & React 19.
2. **Anti-AI Slop Radikal (Impeccable Standard)**: Menolak mentah-mentah desain template SaaS generik, animasi denyut palsu, gradasi neon, dan teks bocoran prompt.
3. **Paham Konteks Kerja 2 Engineer**:
   - Jika mendampingi **Engineer 1 (Operasional & Transaksi)**: Fokus pada `src/app/page.tsx` (Dashboard), `src/app/loans/page.tsx` (Loket Peminjaman Barcode), `src/app/returns/page.tsx` (Pengembalian & Inspeksi Fisik), `src/app/monitoring/page.tsx` (Keterlambatan & WhatsApp), serta API terkait.
   - Jika mendampingi **Engineer 2 (Master Data & Enterprise UI Kit)**: Fokus pada `src/app/master-tool/page.tsx`, `src/app/master-inventory/page.tsx`, `src/app/employees/page.tsx` (ID Card Barcode), `src/app/history/page.tsx` (Audit Log), `src/components/layout/*`, dan reusable UI kit (`SkeletonTable`, `EmptyState`, Modal standard).
4. **Kecepatan Tinggi Tanpa Merusak Data**: Selalu memvalidasi integritas transaksi database Prisma secara atomik dan memastikan server lokal Windows (`start.bat`) dapat berjalan lancar luring (offline).

---

## 2. THEME & DESAIN WEBSITE (ENTERPRISE INDUSTRIAL ERP)

Aplikasi ini mengadopsi tema **Enterprise Industrial ERP Kelas Manufaktur Presisi** (mengacu pada standar baku ERP Titian), bukan website SaaS startup atau dashboard AI generic.

### Identitas Visual & Token Warna:
- **Base Canvas**: Off-white Industrial `#F8FAFC` (Slate 50).
- **Surface / Card Background**: Pure White `#FFFFFF` dengan garis tepi halus `#E2E8F0` (Slate 200).
- **Primary Brand Accent**: PT YPTI Corporate Blue `#1E40AF` (khusus untuk tombol aksi utama halaman dan indikator aktif).
- **Alert Colors**: Muted Rose `#991B1B` (latar `#FEF2F2`), Muted Amber `#92400E` (latar `#FFFBEB`) dengan batas border lembut.
- **Tipografi**: IBM Plex Sans untuk judul/heading dan Roboto untuk isi dokumen dan angka tabel berformat `tabular-nums`.

---

## 3. STRICT ANTI-AI SLOP DIRECTIVES (IMPECCABLE AUDIT STANDARDS)

Setiap kode antarmuka yang dihasilkan WAJIB lolos audit `npx impeccable detect src/` dengan **0 anti-patterns**. Patuhi larangan mutlak berikut:

### 1. DILARANG KERAS: ICON DENYUT-DENYUT IJO (`pulsing-dot` / `animate-ping`)
- **Pelanggaran Paling Sering**: Menempelkan bulatan hijau berkedip atau berdenyut (`relative flex h-2 w-2`, `animate-ping`, `animate-pulse text-emerald-500`, dot hijau menyala) pada label status seperti "STANDBY SCAN", "ONLINE", "LIVE", "SISTEM NORMAL", atau "AKTIF".
- **Mengapa Dilarang**: Ini adalah *tell* nomor satu dari template AI murahan (*decorative liveness faking*).
- **Solusi Baku ERP**: Gunakan badge teks statis yang tenang berbingkai halus netral:
  ```tsx
  {/* BENAR: Tenang, formal, profesional */}
  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
    SIAP SCAN
  </span>
  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
    AKTIF
  </span>

  {/* SALAH: AI Slop denyut-denyut */}
  <span className="relative flex h-2 w-2"><span className="animate-ping ..."></span>...</span>
  ```

### 2. DILARANG KERAS: BORDER AKSEN TEBAL PADA ELEMEN BULAT (`border-accent-on-rounded`)
- **Pelanggaran**: Memasang `border-t-4 border-[#1E40AF]` atau `border-l-4` pada modal atau kartu yang memiliki `rounded-md` atau `rounded-lg`.
- **Mengapa Dilarang**: Garis tebal lurus bertabrakan secara visual dengan kurva sudut membulat (*corner clipping clash*).
- **Solusi Baku ERP**: Gunakan border seragam tipis 1px (`border border-slate-200`) dan bedakan header modal menggunakan latar halus (`bg-slate-50 border-b border-slate-200`).

### 3. DILARANG KERAS: SIDE-TAB STRIPES (`side-tab`)
- **Pelanggaran**: Memberi kartu peringatan garis warna tebal 4px di sisi kiri (`border-l-4 border-amber-500`).
- **Solusi Baku ERP**: Gunakan panel netral berbingkai tipis seragam atau struktur antrean tabel operasional (*Action Items Queue Table*).

### 4. DILARANG KERAS: NESTED CARDS (`nested-cards`)
- **Pelanggaran**: Kartu di dalam kartu di dalam kartu (*card inception*), yang memicu tumpukan border dan bayangan tebal.
- **Solusi Baku ERP**: Ratakan hierarki (*flatten container*). Gunakan *whitespace*, garis pemisah tipis (*dividers*), dan ketegasan tipografi untuk memisahkan bagian.

### 5. DILARANG KERAS: GRADIENT TEXT & NEON GLOWS (`gradient-text`, `dark-glow`)
- **Pelanggaran**: Teks dengan gradasi warna (`bg-clip-text text-transparent bg-gradient-to-r`) atau bayangan berpendar (*glow halo*).
- **Solusi Baku ERP**: Seluruh teks, metrik, dan judul wajib menggunakan warna solid flat industrial (`text-slate-900` atau `text-[#1E40AF]`).

### 6. DILARANG KERAS: BOCORAN LABEL MENTAH DOKUMEN (RESIDUAL SPEC LABELS)
- **Pelanggaran**: Menampilkan teks mentah dari soal/flowchart ke UI pengguna, seperti `(Hal. 3)`, `(Hal. 6)`, `(Langkah 4)`, atau `SOP Hal. 7`.
- **Solusi Baku ERP**: Tuliskan nama fitur resmi enterprise PT YPTI (*"Loket Peminjaman Perkakas"*, *"Verifikasi Pengembalian Fisik"*, *"Pratinjau Kartu Anggota"*).

### 7. DILARANG KERAS: EMOJI & SPAM IKON (ZERO EMOJIS & TEXT-FIRST)
- Tidak boleh ada emoji dalam bentuk apa pun di tombol, judul, badge, atau pesan error.
- Aksi tabel menggunakan tautan teks bersih (`Detail | Edit | Hapus` atau `Kembalikan | Hubungi`).
- Tombol utama menggunakan teks tegas (`+ Tambah Tool`, `Ekspor XLSX`, `Filter Data`, `Batal`).

---

## 4. ARSITEKTUR TEKNOLOGI & ATURAN BISNIS

### Stack Teknologi:
- **Framework**: Next.js 16.4.1 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4
- **ORM & Database**: Prisma ORM dengan SQLite lokal (`dev.db`), 100% PostgreSQL-ready
- **Engine Spreadsheet**: SheetJS (`xlsx`) untuk impor/ekspor native
- **Eksekusi 1-Klik**: `start.bat` untuk inisialisasi mandiri di Windows tanpa instalasi software server tambahan

### Logika Bisnis & Konsistensi Stok Atomik:
1. **Perbedaan Tool vs Inventaris**:
   - **Tool (TOL-XXX)**: Perkakas mesin (Endmill, Collet, Boring Bar, Dial Indicator) yang dipinjam harian/shift kerja.
   - **Inventaris (INV-XXX)**: Aset umum/elektronik pabrik (Caliper Digital, Barcode Scanner, Power Tools) dengan opsi pelacakan individual (Serial Number) atau kuantitatif.
2. **Rumus Stok Atomik**:
   - **Saat Peminjaman**: `Stok Tersedia = Stok Tersedia - Qty`, `Stok Dipinjam = Stok Dipinjam + Qty`, `Total Stok = TETAP SAMA`.
   - **Saat Pengembalian (Kondisi Baik)**: `Stok Tersedia = Stok Tersedia + Qty`, `Stok Dipinjam = Stok Dipinjam - Qty`, `Total Stok = TETAP SAMA`.
   - **Saat Pengembalian (Kondisi Rusak / Hilang)**: `Stok Dipinjam = Stok Dipinjam - Qty`, `Stok Rusak/Perawatan = Stok Rusak/Perawatan + Qty`. Barang rusak TIDAK BOLEH langsung masuk ke Stok Tersedia sebelum proses servis selesai.
3. **Peminjaman Cepat Berbasis Barcode**:
   - Loket dispatch mendukung scanner barcode USB (keyboard wedge) yang langsung membaca NIK kartu karyawan atau kode barang tanpa perlu klik mouse tambahan.
4. **Monitoring Keterlambatan**:
   - Transaksi yang melewati `expectedReturnDate` otomatis bertanda status `TERLAMBAT`.
   - Sistem menyediakan template pesan pengingat resmi WhatsApp sekali klik (`https://wa.me/...`).

---

## 5. STANDARD EKSEKUSI SEBELUM MENYELESAIKAN TUGAS

Setiap kali AI agen selesai mengedit atau membuat komponen baru, WAJIB memvalidasi 3 gerbang kontrol:
1. **Deteksi Anti-AI Slop**: Jalankan `npx impeccable detect src/` dan pastikan **0 anti-patterns**.
2. **Build Integrity**: Jalankan `npm run build` dan pastikan lulus 100% tanpa error kompilasi/type.
3. **UX Feedback**: Seluruh pemuatan data tabel menggunakan `<SkeletonTable />`, data kosong menggunakan `<EmptyState />`, dan aksi hapus data wajib melalui `<ConfirmDialog />`.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
