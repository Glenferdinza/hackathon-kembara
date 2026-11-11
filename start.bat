@echo off
TITLE PT YPTI - Tool Loan ^& Inventory Management System
COLOR 0A
cd /d "%~dp0"

echo =====================================================================
echo    PT YOGYAKARTA PRECISION TOOLING INDUSTRIES (PT YPTI)
echo    Tool Loan ^& Inventory Management System - Enterprise ERP
echo =====================================================================
echo.

:: 1. Cek Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terdeteksi di komputer ini!
    echo Silakan instal Node.js v18+ terlebih dahulu dari https://nodejs.org
    pause
    exit /b 1
)

:: 2. Cek dependensi node_modules
if not exist "node_modules\" (
    echo [1/3] Menginstal dependensi aplikasi...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstal dependensi!
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependensi aplikasi sudah terinstal.
)

:: 3. Sinkronisasi Prisma Client
echo [2/3] Menyiapkan Prisma Client...
call npx prisma generate

:: 4. Jalankan Server & Buka Browser
echo [3/3] Menjalankan server aplikasi...
echo Aplikasi akan terbuka di http://localhost:3000
echo Tekan Ctrl+C di terminal ini untuk mematikan server.
echo.

start "" "http://localhost:3000"
call npm run dev
