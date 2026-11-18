@echo off
TITLE PT YPTI - Ekspor Snapshot Database untuk Migrasi
COLOR 0B
cd /d "%~dp0.."

echo =====================================================================
echo    Ekspor Snapshot Database PT YPTI Tool Room ERP
echo =====================================================================
echo.

if not exist "deploy\snapshot\" mkdir "deploy\snapshot"

echo Menjalankan ekspor seluruh tabel ERP dari DATABASE_URL (.env)...
call node scripts/db-snapshot.mjs export deploy/snapshot/ypti-db-snapshot.json
if %errorlevel% neq 0 (
    COLOR 0C
    echo.
    echo [ERROR] Ekspor snapshot gagal. Pastikan koneksi ke database sumber (.env) aktif.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo [SUKSES] File snapshot siap di deploy\snapshot\ypti-db-snapshot.json
echo Bawa seluruh folder proyek ini ke PC Server PT YPTI lalu jalankan:
echo   deploy-ypti-server.bat
echo =====================================================================
echo.
pause
exit /b 0
