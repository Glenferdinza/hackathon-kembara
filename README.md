# PT YPTI Tool Room and Inventory ERP

Aplikasi sistem manajemen peminjaman alat presisi dan aset industri untuk PT Yogyakarta Precision Tooling Industries.

---

## Panduan Menjalankan Aplikasi

Aplikasi menyediakan dua berkas peluncur yang dapat digunakan sesuai kebutuhan.

### 1. Pasang Shortcut Desktop (Cukup 1 Kali di Awal)
Gunakan berkas **install-desktop-app.bat** jika ingin memasang ikon aplikasi di Desktop Windows.
- Klik dua kali **install-desktop-app.bat**
- Ikon PT YPTI Tool Room ERP akan otomatis terpasang di Desktop lengkap dengan logo resmi
- Langkah ini hanya perlu dijalankan satu kali saja saat pertama kali menyiapkan komputer

### 2. Membuka Aplikasi Sehari-hari (Mode Desktop Window)
Setelah shortcut terpasang di Desktop, gunakan salah satu cara berikut untuk membuka aplikasi kapan saja.
- Klik dua kali ikon **PT YPTI - Tool Room ERP** yang ada di Desktop Anda
- Atau klik dua kali berkas **run-desktop.bat** di dalam folder proyek
- Aplikasi otomatis menyalakan server di latar belakang dan langsung terbuka sebagai jendela software desktop mandiri tanpa bilah URL peramban web

### 3. Membuka Aplikasi Mode Browser Manual
Jika ingin menjalankan server dengan jendela terminal terbuka dan membukanya di browser biasa.
- Klik dua kali berkas **start.bat**
- Buka alamat web http://localhost:3000 di peramban Anda

---

## Akun Login Sistem

Gunakan ID pengguna angka dan kata sandi bawaan berikut untuk masuk ke sistem.

### Akun Super Admin (Akses Penuh Seluruh Menu)
- ID Pengguna angka 10001
- Kata Sandi admin123
- Mengelola seluruh master data, transaksi, audit log, dan manajemen akun pengguna

### Akun Operator Loket (Operasional Transaksi Harian)
- ID Pengguna angka 10002
- Kata Sandi admin123
- Melayani loket peminjaman cepat barcode, pengembalian fisik, monitoring, dan data anggota

### Akun Supervisor (Pemantauan dan Audit)
- ID Pengguna angka 10003
- Kata Sandi admin123
- Memantau grafik analitik ketersediaan stok dan mengunduh laporan riwayat transaksi Excel

---

## Pembagian Sistem Kerja Karyawan

1. **Bagian Mesin dan Lapangan (Operasional 24 Jam)**  
   Berlaku untuk departemen Machining CNC dan Mould Making yang memiliki jadwal Shift 1 Pagi, Shift 2 Siang, dan Shift 3 Malam.

2. **Bagian Kantor dan Non-Mesin**  
   Berlaku untuk divisi Engineering Design, Marketing, dan Administrasi yang beroperasi normal tanpa shift kerja (Non-Shift Reguler).
