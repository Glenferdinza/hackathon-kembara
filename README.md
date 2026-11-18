# PT YPTI Tool Room and Inventory ERP

Aplikasi sistem manajemen peminjaman perkakas presisi, pelacakan umur pakai tool berbasis QR, serah terima antar-shift, dan manajemen aset industri untuk **PT Yogya Precision Tooling Industries (PT YPTI)**.

---

## Ringkasan Progres & Fitur yang Sudah Dibangun

### 1. Modul Admin & Super Admin Tool Room
- **Beranda Dashboard (`/`)**: Ringkasan metrik operasional, grafik komposisi & distribusi stok, antrean prioritas keterlambatan.
- **Data Master Tool (`/master-tool`) & Inventaris (`/master-inventory`)**: Manajemen katalog lengkap termasuk harga satuan (`Rp`), batas umur pakai default (`maxLifeMinutes`), serta impor/ekspor Excel native (`SheetJS`).
- **Pelacakan Unit QR & Umur Pakai (`/scan-tool` & Modal Unit di Master Tool)**:
  - Penomoran unit individual (`ToolUnit`, contoh `TOL-001-U01`), pembuatan stiker QR siap cetak grid (`QrStickerModal`), dan scanner dual-mode USB + Kamera Webcam (`QrScannerModal`).
  - Pemantauan sisa umur pakai (menit), status kritis (`<= 15%`), riwayat penggunaan (`ToolUsageLog`), serta fitur **Reset Asah (`RESHARPEN`)**.
- **Data Karyawan & Akun Operator Otomatis (`/employees`)**: Pembuatan akun portal `OPERATOR` otomatis berbasis NIK karyawan (`EMP-XXXX`) lengkap dengan status sinkronisasi dan reset kata sandi.
- **Antrean Request Pinjam (`/requests`)**: Pemrosesan pengajuan pinjam dari Operator dengan scan QR unit hingga siap diambil (`SIAP_DIAMBIL`).
- **Loket Peminjaman (`/loans`), Pengembalian (`/returns`), & Monitoring (`/monitoring`)**: Peminjaman cepat barcode, inspeksi pengembalian (wajib input `usedMinutes`, kondisi `BAIK` / `PERLU_ASAH` / `RUSAK` / `HILANG`), serta pengingat keterlambatan WhatsApp ke pemegang fisik terakhir (`currentHolder`).
- **Audit Log & Laporan (`/history`) serta Manajemen Akun (`/users`)**: Pencatatan riwayat transaksi, notifikasi sistem, dan kontrol akses khusus `SUPER_ADMIN`.

### 2. Portal Khusus Operator Produksi (`/operator`)
- **Isolasi Peran (`OPERATOR`)**: Operator login memakai NIK dan hanya mengakses Portal Operator (`/operator`, `/operator/request`, `/operator/handover`, `/download`, `/help`).
- **Two-Way Loan Request (`/operator/request` & `/operator`)**: Operator mengajukan pinjam, Admin Tool Room menyiapkan + scan QR unit (`SIAP_DIAMBIL`), lalu Operator memverifikasi fisik dan klik **Terima** (`DIPINJAM`) atau **Tolak**.
- **Shift Handover Waiting List (`/operator/handover`)**: Operator Shift 1 menginput menit pemakaian (`usedMinutes`), catatan kondisi, dan foto bukti opsional; Operator Shift 2 menerima notifikasi waiting list untuk menerima atau menolak alih pinjam sehingga tanggung jawab (`currentHolderId`) berpindah resmi.

### 3. Keamanan Framework, Distribusi Hybrid (`.exe` + PWA), & Server 24/7
- **Next.js `16.4.6` (`output: 'standalone'`)**: Upgrade keamanan aktif beserta optimasi build produksi.
- **Halaman Unduhan Resmi (`/download`)**:
  - **Windows Desktop Client (`.exe`)**: Thin-client Electron di folder `desktop/` yang dikunci ke URL web pusat dan dirilis otomatis ke GitHub Releases via `.github/workflows/release-desktop.yml`.
  - **PWA 1-Klik**: `public/manifest.json`, ikon `192x192` / `512x512`, dan Service Worker `public/sw.js` (*Network-Only* untuk `/api/*` agar data stok selalu real-time).
- **Arsitektur Server 24/7 On-Premise PT YPTI**:
  - Stack Docker Compose (`docker-compose.yml`, `Dockerfile`, `deploy/caddy/Caddyfile`) berisi PostgreSQL 16 lokal, Next.js Standalone, Reverse Proxy HTTPS Caddy (+ opsi Cloudflare Tunnel), healthcheck (`/api/health`), dan backup harian otomatis (retensi 14 hari ke `backups/`).
  - Skrip migrasi & deploy 1-klik (`deploy-ypti-server.bat`, `scripts/db-snapshot.mjs`, `scripts/bootstrap-db.mjs`).

---

## Panduan Tim (Development, Migrasi DB, Server 24/7, & Rilis `.exe`)

### A. Menjalankan di Mode Development (Lokal Laptop)
1. Instal dependensi dan siapkan Prisma Client:
   ```powershell
   npm install
   npx prisma generate
   ```
2. Pastikan `.env` berisi `DATABASE_URL` PostgreSQL yang aktif. Jika database baru/belum tersinkron:
   - Jalankan `npx prisma db push` lalu `npx tsx prisma/backfill-v2.ts` (atau jalankan `npx prisma db seed` untuk data contoh awal dari `SAMPEL_DATABASE_INVENTARIS_TOOLS.xlsx`).
   - Jika `npx prisma db push` terhalang firewall jaringan ke Supabase, salin dan jalankan SQL di `prisma/migrations_manual_v2.sql` melalui **Supabase SQL Editor**, lalu jalankan `npx tsx prisma/backfill-v2.ts`.
3. Jalankan server pengembangan:
   ```powershell
   npm run dev
   ```
4. Sebelum commit/PR, wajib pastikan lolos:
   ```powershell
   npx impeccable detect src/
   npm run build
   ```

### B. Deploy Server 24/7 On-Premise di PC PT YPTI (Sekali Klik)
Panduan lengkap tersedia di [deploy/SERVER_SETUP_GUIDE.md](deploy/SERVER_SETUP_GUIDE.md). Ringkasnya:
1. *(Opsional jika memindahkan data dari Supabase)* Dari laptop/jaringan yang terhubung ke database sumber, jalankan:
   ```powershell
   deploy\export-migration-bundle.bat
   ```
   Berkas snapshot akan tersimpan ke `deploy\snapshot\ypti-db-snapshot.json`.
2. Di PC Server PT YPTI (pastikan **Docker Desktop** terpasang dan menyala), klik kanan **`deploy-ypti-server.bat`** lalu pilih **Run as administrator**.
3. Skrip otomatis membuat `.env.server`, menyalakan container 24/7 (`db`, `app`, `caddy`, `db-backup`), mendorong skema Prisma, memulihkan snapshot (atau seed Excel jika tanpa snapshot), menjalankan `backfill-v2`, serta memverifikasi `/api/health`.
4. Utilitas harian tambahan tersedia di `deploy\backup-now.bat` dan `deploy\restore-backup.bat`.

### C. Menerbitkan Installer Windows `.exe` via GitHub Actions
1. Masuk ke **GitHub Repository -> Settings -> Secrets and variables -> Actions**.
2. Tambahkan `DESKTOP_APP_URL` berisi URL produksi aplikasi (contoh domain server/Vercel/Cloudflare Tunnel PT YPTI).
3. Push tag rilis (contoh `git tag v1.0.0 && git push origin v1.0.0`) atau jalankan workflow *Release Windows Desktop Installer* secara manual; file `PT-YPTI-ToolRoom-Setup-*.exe` akan otomatis terbit di **GitHub Releases** dan tersambung ke halaman `/download`.

### D. Menjalankan Cepat di Windows (Mode Script Lokal Lama)
Jika hanya ingin mencoba lokal tanpa Docker setelah Node.js dan `.env` siap:
- `install-desktop-app.bat` untuk memasang shortcut Desktop Windows.
- `run-desktop.bat` untuk menyalakan `npm run start` di jendela Edge/Chrome mandiri.
- `start.bat` untuk mode browser development biasa di `http://localhost:3000`.

---

## Akun Login Bawaan Sistem

### Super Admin (Pimpinan / Kepala Tool Room)
- ID Pengguna: `10001`
- Kata Sandi bawaan: `admin123`
- Akses penuh seluruh master data, transaksi, audit log, dan manajemen akun (`/users`).

### Admin (Petugas Loket Tool Room)
- ID Pengguna: `10002`
- Kata Sandi bawaan: `admin123`
- Mengelola antrean `/requests`, cek QR `/scan-tool`, peminjaman, pengembalian, monitoring, serta data master (tanpa `/users`).

### Operator Produksi (Portal Operator)
- ID Pengguna: NIK Karyawan (contoh `EMP-0101`)
- Kata Sandi bawaan: `operator123`
- Otomatis dibuat saat menambah karyawan atau melalui `backfill-v2.ts` / tombol sinkronisasi akun di `/employees`.
