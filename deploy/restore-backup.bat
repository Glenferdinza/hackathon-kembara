@echo off
SETLOCAL EnableDelayedExpansion
TITLE PT YPTI - Restore Backup Database PostgreSQL
COLOR 0E
cd /d "%~dp0.."

if not exist ".env.server" (
    echo [ERROR] File .env.server belum ditemukan.
    pause
    exit /b 1
)

set "TARGET_FILE=%~1"
if "%TARGET_FILE%"=="" (
    echo Daftar file backup yang tersedia di folder backups\:
    dir /b /o-d backups\ 2>nul
    echo.
    set /p TARGET_FILE="Masukkan path atau nama file backup di backups\ (misal backups\ypti-db-20261118.sql.gz): "
)

if not exist "%TARGET_FILE%" (
    if exist "backups\%TARGET_FILE%" (
        set "TARGET_FILE=backups\%TARGET_FILE%"
    ) else (
        echo [ERROR] File backup tidak ditemukan: %TARGET_FILE%
        pause
        exit /b 1
    )
)

echo.
echo [PERINGATAN] Operasi ini akan MENGGANTI seluruh isi database lokal dengan %TARGET_FILE%.
set /p CONFIRM="Ketik YA untuk melanjutkan restore: "
if /i not "%CONFIRM%"=="YA" (
    echo Restore dibatalkan.
    pause
    exit /b 0
)

echo "%TARGET_FILE%" | findstr /i "\.json$" >nul
if %errorlevel% equ 0 (
    echo Memulihkan snapshot JSON melalui migrator aplikasi...
    docker cp "%TARGET_FILE%" ypti-toolroom-app:/tmp/restore-snapshot.json
    docker compose --env-file .env.server exec -T app node scripts/db-snapshot.mjs import /tmp/restore-snapshot.json --replace
) else (
    echo Memulihkan dump SQL terkompresi (.sql.gz) ke container PostgreSQL...
    powershell -NoProfile -Command "$fs = [System.IO.File]::OpenRead('%TARGET_FILE%'); $gz = New-Object System.IO.Compression.GzipStream($fs, [System.IO.Compression.CompressionMode]::Decompress); $sr = New-Object System.IO.StreamReader($gz, [System.Text.Encoding]::UTF8); $sql = $sr.ReadToEnd(); $sr.Close(); [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'backups\_tmp_restore.sql'), $sql, (New-Object System.Text.UTF8Encoding($false)))"
    docker compose --env-file .env.server exec -T db sh -c "psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\"" < "backups\_tmp_restore.sql"
    del /q "backups\_tmp_restore.sql" >nul 2>nul
)

if %errorlevel% neq 0 (
    echo [ERROR] Proses restore gagal.
    pause
    exit /b 1
)

echo [SUKSES] Restore selesai. Jalankan backfill ringan untuk memastikan kompatibilitas versi...
docker compose --env-file .env.server exec -T app npx tsx prisma/backfill-v2.ts
pause
exit /b 0
