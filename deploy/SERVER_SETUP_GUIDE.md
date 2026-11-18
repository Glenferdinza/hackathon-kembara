# Panduan Server On-Premise 24/7 PT YPTI Tool Room ERP

Panduan operasional ringkas untuk menjalankan PC server internal PT YPTI agar sistem tetap aktif non-stop 24 jam sehari, 7 hari seminggu, termasuk migrasi seluruh database.

---

## 1. Persiapan Data Migrasi (Dari Laptop Developer)

Jika ada data real yang sudah tersimpan di Supabase saat ini dan ingin ikut dipindahkan ke server lokal PT YPTI:

1. Dari jaringan yang terhubung ke Supabase (`.env` mengarah ke database sumber), klik dua kali `deploy\export-migration-bundle.bat` (atau jalankan `npm run db:export-snapshot`).
2. Berkas snapshot lengkap akan tersimpan di `deploy\snapshot\ypti-db-snapshot.json`.
3. Salin seluruh folder proyek beserta file `deploy\snapshot\ypti-db-snapshot.json` ke PC Server PT YPTI (via USB/LAN/SCP).

> Jika Anda ingin server PT YPTI mulai dari data master resmi `SAMPEL_DATABASE_INVENTARIS_TOOLS.xlsx` saja, tidak perlu menyertakan file snapshot JSON; skrip instalasi otomatis menjalankan seed resmi.

---

## 2. Instalasi & Migrasi 1-Klik di PC Server PT YPTI

1. Pastikan **Docker Desktop** sudah terpasang di PC server Windows PT YPTI.
2. Klik kanan **`deploy-ypti-server.bat`** lalu pilih **Run as administrator** (agar aturan port Firewall LAN otomatis dibuka).
3. Skrip otomatis menjalankan seluruh langkah berikut:
   - Membuat `.env.server` berisi sandi PostgreSQL dan `NEXTAUTH_SECRET` acak yang aman.
   - Membuild dan menyalakan container `db` (PostgreSQL 16), `app` (Next.js 16.4.6 Standalone), `caddy` (Reverse Proxy HTTPS), dan `db-backup` (Backup otomatis harian).
   - Mendorong skema Prisma terbaru ke PostgreSQL lokal, memulihkan `ypti-db-snapshot.json` (atau seed Excel jika tanpa snapshot), serta menjalankan `backfill-v2` untuk akun `OPERATOR` dan QR `ToolUnit`.

---

## 3. Checklist Ketahanan 24/7 PC Server

1. **Docker Desktop Auto-Start**: Buka *Docker Desktop -> Settings -> General ->* centang **Start Docker Desktop when you sign in to your computer**.
2. **Auto-Login Windows (Opsional / Server Khusus)**: Jika PC diletakkan di ruang server dengan UPS, aktifkan *Auto Logon* agar saat listrik padam dan PC menyala kembali, Docker Desktop langsung berjalan tanpa menunggu ketikan password Windows.
3. **Power & Sleep Windows**: Buka *Control Panel -> Power Options* -> ubah ke **High Performance** dan atur **Put the computer to sleep -> Never**.
4. **BIOS AC Power Recovery**: Pada BIOS motherboard PC server, ubah pengaturan *Restore on AC Power Loss* menjadi **Power On** agar PC otomatis menyala sendiri setelah listrik kembali pasca mati lampu.
5. **UPS & Backup Eksternal**: Hubungkan PC ke UPS dan secara berkala salin isi folder `backups\` ke NAS/harddisk eksternal perusahaan.

---

## 4. Akses Kamera QR HP/Tablet Operator (HTTPS LAN vs Cloudflare Tunnel)

Browser HP/tablet memblokir API kamera (`html5-qrcode`) pada alamat `http://IP-LAN` tanpa HTTPS. Pilih salah satu metode berikut:

- **Metode A (LAN Internal Tanpa Internet — Sertifikat Lokal Caddy)**:
  - Skrip `deploy-ypti-server.bat` otomatis mengekspor sertifikat CA ke `deploy\certs\ypti-local-ca.crt`.
  - Bagikan file `ypti-local-ca.crt` ke tablet/HP Operator sekali saja (Install certificate dari pengaturan keamanan Android/iOS), lalu buka `https://<IP-PC-SERVER>`.
- **Metode B (Domain / Cloudflare Tunnel — Tanpa Install Sertifikat di HP)**:
  - Isi `CLOUDFLARE_TUNNEL_TOKEN` di `.env.server` dengan token Zero Trust Tunnel yang mengarah ke `http://app:3000`, lalu jalankan ulang `deploy-ypti-server.bat`. Seluruh HP Operator dan file `.exe` Admin langsung memakai domain `https://...` terpercaya.
