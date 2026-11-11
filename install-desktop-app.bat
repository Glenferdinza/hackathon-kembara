@echo off
TITLE Installer Shortcut Desktop & Setup - PT YPTI ERP
COLOR 0B
cd /d "%~dp0"

echo =====================================================================
echo    PT YOGYAKARTA PRECISION TOOLING INDUSTRIES (PT YPTI)
echo    Pemasangan Aplikasi Desktop & Inisialisasi Otomatis ERP
echo =====================================================================
echo.

:: 1. Periksa Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Node.js belum terpasang di komputer ini!
    echo Silakan unduh dan instal Node.js versi 18 ke atas dari https://nodejs.org
    echo Setelah instalasi Node.js selesai, jalankan kembali berkas ini.
    echo.
    pause
    exit /b 1
)

:: 2. Periksa dan Unduh Dependensi (node_modules)
if not exist "node_modules\" (
    echo [1/3] Folder node_modules belum ditemukan.
    echo Mengunduh seluruh dependensi paket aplikasi (npm install)...
    echo Proses ini memerlukan koneksi internet beberapa saat.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [ERROR] Gagal mengunduh dependensi aplikasi!
        echo Pastikan komputer terhubung ke internet dan coba kembali.
        pause
        exit /b 1
    )
    echo Dependensi berhasil diunduh.
    echo.
) else (
    echo [1/3] Dependensi aplikasi (node_modules) sudah terpasang lengkap.
)

:: 3. Periksa dan Bangun Build Produksi (.next)
if not exist ".next\" (
    echo [2/3] Mengompilasi berkas produksi Next.js (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [ERROR] Gagal melakukan build aplikasi!
        pause
        exit /b 1
    )
    echo Build produksi berhasil dibuat.
    echo.
) else (
    echo [2/3] Berkas kompilasi produksi (.next) sudah siap.
)

:: 4. Buat Ikon dan Pasang Shortcut di Desktop
echo [3/3] Memasang shortcut aplikasi di Desktop Windows...
if not exist "public\app-icon.ico" (
    powershell -Command "Add-Type -AssemblyName System.Drawing; $bmp = [System.Drawing.Bitmap]::FromFile('public\logo.png'); $thumb = New-Object System.Drawing.Bitmap $bmp, 256, 256; $hIcon = $thumb.GetHicon(); $icon = [System.Drawing.Icon]::FromHandle($hIcon); $fs = New-Object System.IO.FileStream 'public\app-icon.ico', 'Create'; $icon.Save($fs); $fs.Close(); $bmp.Dispose(); $thumb.Dispose();" >nul 2>nul
)

powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $Desktop = [Environment]::GetFolderPath('Desktop'); $Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop 'PT YPTI - Tool Room ERP.lnk')); $Shortcut.TargetPath = '%~dp0run-desktop.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0public\app-icon.ico,0'; $Shortcut.Description = 'PT YPTI Tool Room & Inventory Management ERP'; $Shortcut.WindowStyle = 7; $Shortcut.Save();"

powershell -NoProfile -Command "if ($env:OneDrive) { $OneDriveDesktop = Join-Path $env:OneDrive 'Desktop'; if (Test-Path $OneDriveDesktop) { $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut((Join-Path $OneDriveDesktop 'PT YPTI - Tool Room ERP.lnk')); $Shortcut.TargetPath = '%~dp0run-desktop.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0public\app-icon.ico,0'; $Shortcut.Description = 'PT YPTI Tool Room & Inventory Management ERP'; $Shortcut.WindowStyle = 7; $Shortcut.Save(); } }" >nul 2>nul

echo.
echo =====================================================================
echo [SUKSES] Seluruh dependensi dan shortcut Desktop telah siap!
echo Ikon: PT YPTI - Tool Room ERP
echo =====================================================================
echo.

set /p OPEN_NOW="Buka aplikasi sekarang? (Y/N): "
if /i "%OPEN_NOW%"=="Y" (
    start "" "%~dp0run-desktop.bat"
)
exit /b 0
