# AGENTS.MD: SINGLE SOURCE OF TRUTH & AI AGENT DIRECTIVES
**PT YPTI - Tool Room & Inventory Management System (Enterprise Industrial ERP)**

Dokumen ini adalah **satu-satunya pedoman wajib (single source of truth & primary guardrails)** untuk seluruh agen AI (Antigravity, Cursor, Copilot, Claude Code) dan engineer tim saat merancang, menulis, memperbarui kode, komponen, database, maupun infrastruktur deployment.

---

## 1. PERAN AI AGENT & STATUS ARSITEKTUR TERKINI

Anda bertindak sebagai **Lead Fullstack Industrial ERP Architect & Senior Pair Programmer** untuk tim rekayasa perangkat lunak PT YPTI.

### Karakteristik & Mentalitas Saat Bekerja:
1. **Disiplin & Presisi Pabrik**: Menghasilkan kode TypeScript/React produksi yang kokoh, tanpa `any` baru, tanpa *cascading render* (`setState` sinkron di dalam `useEffect`), dan selalu mematuhi Next.js 16 (App Router) & React 19.
2. **Anti-AI Slop Radikal (Impeccable Standard)**: Menolak mentah-mentah desain template SaaS generik, animasi denyut palsu, gradasi neon, dan teks bocoran prompt.
3. **Paham Peta Modul & Konteks Tim**:
   - **Operasional & Transaksi Admin**: `src/app/page.tsx` (Dashboard), `src/app/requests/page.tsx` (Antrean Request Operator + Scan QR Unit), `src/app/scan-tool/page.tsx` (Cek QR & Umur Tool), `src/app/loans/page.tsx` (Loket Peminjaman Barcode), `src/app/returns/page.tsx` (Pengembalian, `usedMinutes`, Kondisi `BAIK`/`PERLU_ASAH`/`RUSAK`/`HILANG`), `src/app/monitoring/page.tsx` (Keterlambatan & WhatsApp ke pemegang terakhir `currentHolder`), serta API terkait di `src/app/api/*`.
   - **Portal Operator (`OPERATOR`)**: `src/app/operator/page.tsx` (Dasbor Operator & Konfirmasi Terima/Tolak), `src/app/operator/request/page.tsx` (Form Request Pinjam), `src/app/operator/handover/page.tsx` (Pengalihan Shift / Waiting List), dilindungi isolasi peran di `src/proxy.ts` dan `src/components/layout/AppShell.tsx`.
   - **Master Data, UI Kit, & QR Hardware**: `src/app/master-tool/page.tsx` (Harga, `maxLifeMinutes`, Unit & Stiker QR, Reset Asah), `src/app/master-inventory/page.tsx`, `src/app/employees/page.tsx` (ID Card & Sinkronisasi Akun Portal Operator), `src/app/history/page.tsx`, `src/app/users/page.tsx`, `src/components/qr/QrStickerModal.tsx`, `src/components/qr/QrScannerModal.tsx`, dan `src/components/layout/*`.
   - **Distribusi & Server On-Premise 24/7**: `src/app/download/page.tsx` (PWA + Link `.exe`), `public/manifest.json` + `public/sw.js` + `src/components/pwa/PwaRegister.tsx`, folder `desktop/` (Electron Thin-Client), `.github/workflows/release-desktop.yml`, `Dockerfile`, `docker-compose.yml`, `deploy/*`, `scripts/db-snapshot.mjs`, `scripts/bootstrap-db.mjs`, `deploy-ypti-server.bat`, dan `src/app/api/health/route.ts`.
4. **Integritas Database & Atomisitas**: Selalu membungkus perubahan stok, status unit, peminjaman, pengembalian, dan handover dalam `prisma.$transaction(...)`.

---

## 2. THEME & DESAIN WEBSITE (ENTERPRISE INDUSTRIAL ERP)

Aplikasi mengadopsi tema **Enterprise Industrial ERP Kelas Manufaktur Presisi**, bukan website SaaS startup atau dashboard AI generic.

### Identitas Visual & Token Warna:
- **Base Canvas**: Off-white Industrial `#F8FAFC` (Slate 50).
- **Surface / Card Background**: Pure White `#FFFFFF` dengan garis tepi halus `#E2E8F0` (Slate 200).
- **Primary Brand Accent**: PT YPTI Corporate Blue `#1E40AF` (khusus tombol aksi utama halaman dan indikator aktif).
- **Alert Colors**: Muted Rose `#991B1B` (latar `#FEF2F2`), Muted Amber `#92400E` (latar `#FFFBEB`) dengan batas border lembut.
- **Tipografi**: IBM Plex Sans untuk judul/heading dan font isi dokumen serta angka tabel berformat `tabular-nums`.

---

## 3. STRICT ANTI-AI SLOP DIRECTIVES (IMPECCABLE AUDIT STANDARDS)

Setiap kode antarmuka yang dihasilkan WAJIB lolos audit `npx impeccable detect src/` dengan **0 anti-patterns**. Patuhi larangan mutlak berikut:

### 1. DILARANG KERAS: ICON DENYUT-DENYUT IJO (`pulsing-dot` / `animate-ping`)
- Jangan pernah menempelkan bulatan berkedip (`animate-ping`, `animate-pulse`) pada label status seperti "SIAP SCAN", "ONLINE", "LIVE", atau "AKTIF".
- Gunakan badge teks statis berbingkai tipis (`border border-slate-200`).

### 2. DILARANG KERAS: BORDER AKSEN TEBAL PADA ELEMEN BULAT (`border-accent-on-rounded`)
- Dilarang memasang `border-t-4` atau `border-l-4` pada kartu atau modal yang memakai `rounded` / `rounded-md` / `rounded-lg`.
- Gunakan `border border-slate-200` seragam dan latar header halus `bg-slate-50 border-b border-slate-200`.

### 3. DILARANG KERAS: SIDE-TAB STRIPES (`side-tab`)
- Dilarang memberi garis aksen 4px di sisi kiri kartu peringatan; gunakan tabel antrean atau panel netral tipis.

### 4. DILARANG KERAS: NESTED CARDS (`nested-cards`)
- Ratakan hierarki (*flatten container*) memakai divider `border-t border-slate-100` dan whitespace, jangan menumpuk kartu di dalam kartu.

### 5. DILARANG KERAS: GRADIENT TEXT & NEON GLOWS (`gradient-text`, `dark-glow`)
- Seluruh teks dan metrik memakai warna solid flat industrial (`text-slate-900` atau `text-[#1E40AF]`).

### 6. DILARANG KERAS: BOCORAN LABEL MENTAH DOKUMEN (RESIDUAL SPEC LABELS)
- Jangan menampilkan penanda soal/dokumen ke UI seperti `(Hal. 3)` atau `(Langkah 4)`. Gunakan istilah resmi operasional PT YPTI.

### 7. DILARANG KERAS: EMOJI & SPAM IKON (ZERO EMOJIS & TEXT-FIRST)
- Tidak boleh ada emoji dalam tombol, judul, badge, ataupun pesan error. Gunakan teks tegas dan bersih.

### 8. STANDAR UX PSIKOLOGIS, MOBILE ERGONOMICS & AKSESIBILITAS (WAJIB)
1. **Zero Alarm Fatigue pada Ambang Stok**:
   - Dilarang memakai fallback ambang stok sembarangan (seperti `minStock || 5`) pada perkakas presisi berjumlah 1-2 unit.
   - Status `Stok Menipis` hanya aktif bila `minStock > 0 && availableStock <= minStock` atau saat item berstok fisik mencapai `0` tersedia.
2. **Zero Silent Borrower / Dummy Defaults & Dummy Metric Flash**:
   - Halaman transaksi tidak boleh otomatis memilih pegawai pertama saat mount atau mengisi nomor HP dummy (`08123456789`).
   - Halaman utama tidak boleh merender data angka dummy sementara (`INITIAL_DASHBOARD_DATA`) sebelum API asli selesai dimuat; gunakan `<SkeletonTable />` atau skeleton netral.
3. **Konfirmasi Aman dari Scanner USB (`ConfirmDialog`)**:
   - Dialog konfirmasi dilarang mengeksekusi aksi saat tombol `Enter` ditekan mentah pada window karena barcode scanner USB mengirim suffix `Enter`.
   - Aksi berisiko/destruktif (`danger`) wajib memakai aksen Muted Rose `#991B1B`.
4. **Mobile Card View (`md:hidden`) vs Teks Mikro**:
   - Dilarang mengecilkan tabel multi-kolom menjadi `<12px` di layar HP (`<640px`).
   - Sajikan daftar kartu mobile ringkas (`md:hidden`) berteks nyaman `12px-13px`, minimal target sentuh `44x44px`, dan kontras teks `>= 4.5:1` (hindari `text-slate-400` untuk label penting/placeholder).
5. **Teks Status Datar vs Kontrol Interaktif Berbingkai**:
   - Status pasif (`TERSEDIA`, `MENUNGGU_ADMIN`, `PENDING`, `Scanner USB Otomatis Aktif`, dsb.) tampil sebagai teks datar bersih tanpa kotak/pill latar belakang.
   - Elemen interaktif yang dapat diklik (tombol, tab, input) tetap mempertahankan border tipis untuk kejelasan klik.
6. **Drawer Mobile Aman Breakpoint**:
   - Drawer sidebar mobile yang tertutup di bawah `1024px` wajib disembunyikan dari `Tab` keyboard dengan `invisible lg:visible` saat `!isMobileOpen`, bukan memakai `inert={!isMobileOpen}` secara naif yang dapat mematikan sidebar desktop.

---

## 4. ARSITEKTUR TEKNOLOGI & ATURAN BISNIS TERKINI

### Stack Teknologi:
- **Framework**: Next.js `16.4.6` (App Router, `output: 'standalone'`, `experimental.agentUpgrade: 'security'`, React `19.3.0`, TypeScript)
- **Styling**: Tailwind CSS v4
- **ORM & Database**: Prisma ORM v6 (`@prisma/client` + `@prisma/adapter-pg` + `pg`) terhubung ke **PostgreSQL** (Cloud Supabase saat dev/staging atau PostgreSQL 16 Docker container saat 24/7 on-premise PT YPTI)
- **QR & Spreadsheet Engine**: `qrcode`, `html5-qrcode`, SheetJS (`xlsx`)
- **Desktop Packaging & 24/7 Server**: Electron thin-client (`desktop/` + `.github/workflows/release-desktop.yml`), PWA (`public/manifest.json` + `public/sw.js`), dan Docker Compose + Caddy HTTPS (`deploy-ypti-server.bat`, `Dockerfile`, `docker-compose.yml`)

### Logika Bisnis & Konsistensi Stok Atomik:
1. **Perbedaan Tool vs Inventaris & Pelacakan Unit**:
   - **Tool (TOL-XXX)**: Perkakas mesin yang memiliki `price` (`Rp`), `maxLifeMinutes`, `lifeAlertPercent` (`15%`), dan unit fisik terindividualisasi di tabel `ToolUnit` (`TOL-XXX-U01`, `U02`, dst.).
   - **Inventaris (INV-XXX)**: Aset umum/elektronik pabrik dengan pelacakan individual (Serial Number) atau kuantitatif.
2. **Alur Two-Way Loan Request**:
   - Operator mengajukan pinjam (`MENUNGGU_ADMIN`) -> Admin memindai QR unit (`ToolUnit` berubah `DISIAPKAN`) & konfirmasi (`SIAP_DIAMBIL`) -> Operator memverifikasi fisik lalu klik **Terima** (membuat `LoanTransaction` aktif, memotong `availableStock`, menambah `borrowedStock`, status unit `DIPINJAM`) atau **Tolak** (unit kembali `TERSEDIA`).
3. **Rumus Stok Atomik & Pengurangan Umur Pakai (`usedMinutes`)**:
   - **Saat Peminjaman**: `availableStock -= Qty`, `borrowedStock += Qty`, `totalStock` tetap.
   - **Saat Pengembalian (`BAIK`)**: Input wajib `usedMinutes` dipotong dari `ToolUnit.remainingLifeMinutes` + tercatat di `ToolUsageLog`. `availableStock += Qty`, `borrowedStock -= Qty`, unit kembali `TERSEDIA`.
   - **Saat Pengembalian (`PERLU_ASAH` / `RUSAK` / `HILANG`)**: Input `usedMinutes` tetap dicatat; `borrowedStock -= Qty`, `repairStock` / `scrapStock` bertambah. Barang rusak/perlu asah **TIDAK BOLEH** langsung masuk ke `availableStock` sebelum proses asah/servis (`RESHARPEN`) selesai.
   - **Peringatan Umur Kritis**: Jika sisa umur pakai `<= lifeAlertPercent` (`<= 15%`), sistem membuat notifikasi `TOOL_LIFE` agar segera dikembalikan untuk pengasahan.
4. **Shift Handover & Monitoring Pemegang Terakhir**:
   - Operator Shift 1 mengirim request handover (`PENDING`) dengan input `usedMinutes` (langsung mengurangi umur pakai `ToolUnit` di titik serah terima), catatan kondisi, dan foto bukti opsional terkompresi (`<= 2MB`).
   - Operator Shift 2 menerima (`ACCEPTED` memindahkan `LoanItem.currentHolderId` ke Shift 2) atau menolak (`REJECTED`).
   - Monitoring keterlambatan & pengingat WhatsApp (`https://wa.me/...`) ditujukan ke `currentHolder` (pemegang fisik terakhir).
5. **Keamanan Role & Route Middleware (`src/proxy.ts`)**:
   - Role `OPERATOR` dikunci ke `/operator*`, `/download`, `/help`, dan daftar API `OPERATOR_ALLOWED_API_PREFIXES`.
   - Endpoint publik hanya `/login`, `/download`, `/api/auth`, `/api/health`, `/manifest.json`, `/sw.js`, dan aset statis.

---

## 5. STANDARD EKSEKUSI & HAL PENTING UNTUK TIM ENGINEER

### Gerbang Kontrol Sebelum Commit:
1. **Deteksi Anti-AI Slop**: Jalankan `npx impeccable detect src/` -> harus **0 temuan**.
2. **ESLint**: Jalankan `npx eslint <file-yang-diubah>` -> harus **0 error** pada kode baru/yang disentuh.
3. **Build Integrity**: Jalankan `npm run build` -> harus lulus **exit code 0** tanpa error TypeScript/route.
4. **UX Feedback**: Tabel memakai `<SkeletonTable />`, kondisi kosong `<EmptyState />`, hapus/aksi destruktif lewat `<ConfirmDialog />`.

### Status Database & Operasional Terkini (Penting bagi Rekan Tim):
1. **Sinkronisasi Database Supabase**: Jika environment development belum tersambung ke Supabase (misal error `P1001` pada port `5432`), jalankan `prisma/migrations_manual_v2.sql` di Supabase SQL Editor lalu `npx tsx prisma/backfill-v2.ts` saat berada di jaringan terbuka.
2. **Migrasi ke Server PC 24/7 PT YPTI**: Gunakan `deploy\export-migration-bundle.bat` untuk membackup snapshot dari database sumber, lalu jalankan `deploy-ypti-server.bat` sebagai Administrator di PC Server PT YPTI.
3. **Rilis `.exe` Desktop**: Isi GitHub Secret/Variable `DESKTOP_APP_URL` dengan URL produksi sebelum push tag `v*` agar workflow `.github/workflows/release-desktop.yml` menerbitkan installer `.exe`.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
