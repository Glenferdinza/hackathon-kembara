@echo off
SETLOCAL EnableDelayedExpansion
TITLE PT YPTI - 1-Click Server Deployment & DB Migration (24/7 On-Premise)
COLOR 0A
cd /d "%~dp0"

echo ===========================================================================
echo    PT YOGYAKARTA PRECISION TOOLING INDUSTRIES (PT YPTI)
echo    1-Click On-Premise Server Deployment ^& Full Database Migration
echo ===========================================================================
echo.

:: 1. Pastikan Docker CLI dan Docker Desktop Daemon aktif
where docker >nul 2>nul
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Docker belum terpasang di komputer server ini.
    echo Silakan instal Docker Desktop Windows terlebih dahulu lalu ulangi skrip ini.
    pause
    exit /b 1
)

docker info >nul 2>nul
if %errorlevel% neq 0 (
    COLOR 0E
    echo [INFO] Docker Desktop belum berjalan. Menunggu Docker Desktop siap...
    powershell -NoProfile -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -ErrorAction SilentlyContinue" >nul 2>nul
    set /a WAIT_DOCKER=0
    :wait_docker_loop
    timeout /t 3 /nobreak >nul
    docker info >nul 2>nul
    if %errorlevel% equ 0 goto docker_ready
    set /a WAIT_DOCKER+=1
    if !WAIT_DOCKER! GEQ 20 (
        COLOR 0C
        echo [ERROR] Docker Engine tidak merespons setelah 60 detik.
        echo Pastikan Docker Desktop sudah menyala (ikon paus di tray) lalu jalankan ulang.
        pause
        exit /b 1
    )
    goto wait_docker_loop
)

:docker_ready
COLOR 0A
echo [1/6] Docker Engine aktif dan siap digunakan.

:: 2. Siapkan folder runtime host
if not exist "backups\" mkdir "backups"
if not exist "deploy\certs\" mkdir "deploy\certs"
if not exist "deploy\snapshot\" mkdir "deploy\snapshot"

:: 3. Buat .env.server secara otomatis dan aman pada instalasi pertama
if not exist ".env.server" (
    echo [2/6] Membuat konfigurasi aman .env.server dengan kunci acak otomatis...
    powershell -NoProfile -Command ^
      "$bytes1 = New-Object byte[] 12; [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes1); $pgPass = -join ($bytes1 | ForEach-Object { $_.ToString('x2') });" ^
      "$bytes2 = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes2); $authSecret = -join ($bytes2 | ForEach-Object { $_.ToString('x2') });" ^
      "$template = [System.IO.File]::ReadAllText((Resolve-Path 'deploy\.env.example'));" ^
      "$content = $template -replace 'GANTI_DENGAN_SANDI_KUAT_MIN_24_KARAKTER', $pgPass -replace 'GANTI_DENGAN_RANDOM_HEX_64_KARAKTER', $authSecret;" ^
      "[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env.server'), $content, (New-Object System.Text.UTF8Encoding($false)))"
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [ERROR] Gagal membuat .env.server.
        pause
        exit /b 1
    )
    echo       .env.server berhasil dibuat.
) else (
    echo [2/6] Menggunakan .env.server yang sudah ada (kredensial tetap terjaga).
)

:: 4. Konfigurasi Firewall Windows untuk akses LAN (jika dijalankan sebagai Administrator)
echo [3/6] Memeriksa aturan Windows Firewall untuk akses jaringan pabrik...
net session >nul 2>nul
if %errorlevel% equ 0 (
    powershell -NoProfile -Command ^
      "foreach ($rule in @(@{N='PT-YPTI-ERP-HTTP';P=80},@{N='PT-YPTI-ERP-HTTPS';P=443},@{N='PT-YPTI-ERP-APP';P=3000})) { if (-not (Get-NetFirewallRule -DisplayName $rule.N -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName $rule.N -Direction Inbound -Protocol TCP -LocalPort $rule.P -Profile Private,Domain -Action Allow | Out-Null } }"
    echo       Aturan Firewall LAN (port 80, 443, 3000) aktif.
) else (
    echo       [CATATAN] Tidak dijalankan sebagai Administrator; lewati buka Firewall otomatis.
    echo                 Jika perangkat lain di LAN gagal terhubung, jalankan 1x sebagai Administrator.
)

:: 5. Periksa apakah Cloudflare Tunnel Token diisi
set "COMPOSE_PROFILE="
for /f "usebackq tokens=1,* delims==" %%A in (".env.server") do (
    if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" (
        if not "%%B"=="" set "COMPOSE_PROFILE=--profile tunnel"
    )
)

echo [4/6] Membangun dan menyalakan seluruh container 24/7 (db, app, caddy, backup)...
docker compose --env-file .env.server %COMPOSE_PROFILE% up -d --build
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Gagal menyalakan container Docker Compose. Periksa log di atas.
    pause
    exit /b 1
)

:: 6. Tunggu PostgreSQL siap lalu jalankan migrasi skema + snapshot/seed + backfill v2
echo [5/6] Menunggu database PostgreSQL siap menerima koneksi...
set /a DB_WAIT=0
:wait_db_loop
docker compose --env-file .env.server exec -T db pg_isready -U ypti_erp -d ypti_toolroom >nul 2>nul
if %errorlevel% equ 0 goto run_db_bootstrap
timeout /t 2 /nobreak >nul
set /a DB_WAIT+=1
if !DB_WAIT! GEQ 30 (
    COLOR 0C
    echo [ERROR] Database PostgreSQL belum siap setelah 60 detik.
    pause
    exit /b 1
)
goto wait_db_loop

:run_db_bootstrap
echo [5/6] Menjalankan migrasi arsitektur database (Prisma Push + Snapshot/Seed + Backfill v2)...
docker compose --env-file .env.server exec -T app node scripts/bootstrap-db.mjs
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Gagal melakukan migrasi atau inisialisasi database.
    pause
    exit /b 1
)

:: Ekspor sertifikat CA internal Caddy (untuk HP/tablet kamera QR jika pakai LAN HTTPS)
timeout /t 3 /nobreak >nul
docker cp ypti-toolroom-proxy:/data/caddy/pki/authorities/local/root.crt deploy\certs\ypti-local-ca.crt >nul 2>nul

:: 7. Verifikasi health endpoint dan tampilkan informasi akses
echo [6/6] Memverifikasi status aplikasi dan mencetak alamat akses...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Docker|WSL' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LAN_IP=%%I"
if "!LAN_IP!"=="" set "LAN_IP=IP-PC-SERVER"

powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 10; Write-Host ('      Healthcheck: ' + $r.status + ' | Database: ' + $r.database) } catch { Write-Host '      Healthcheck belum merespons penuh, tunggu beberapa detik lalu cek browser.' }"

echo.
echo ===========================================================================
echo  [SUKSES] SERVER 24/7 PT YPTI TOOL ROOM ERP SUDAH AKTIF!
echo ===========================================================================
echo  Akses Lokal PC Ini     : http://localhost:3000
echo  Akses LAN (Admin PC)   : http://!LAN_IP!
echo  Akses HTTPS (Kamera HP): https://!LAN_IP!
if exist "deploy\certs\ypti-local-ca.crt" (
echo  Sertifikat CA HP       : deploy\certs\ypti-local-ca.crt
)
echo  Folder Backup Harian   : backups\ (otomatis setiap hari, retensi 14 hari)
echo.
echo  Akun Default (jika fresh seed):
echo    Super Admin : 10001 / admin123
echo    Admin       : 10002 / admin123
echo    Operator    : NIK Karyawan (contoh EMP-0101) / operator123
echo ===========================================================================
echo.
pause
exit /b 0
