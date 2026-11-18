@echo off
TITLE PT YPTI - Backup Database PostgreSQL Sekarang
COLOR 0B
cd /d "%~dp0.."

if not exist ".env.server" (
    echo [ERROR] File .env.server belum ditemukan. Jalankan deploy-ypti-server.bat terlebih dahulu.
    pause
    exit /b 1
)

if not exist "backups\" mkdir "backups"

for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%T"
set "OUT_FILE=backups\ypti-db-manual-%TS%.sql.gz"

echo Membuat backup database PostgreSQL lokal ke %OUT_FILE% ...
docker compose --env-file .env.server exec -T db sh -c "pg_dump --clean --if-exists --no-owner --no-privileges -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" > /tmp/manual_dump.sql && gzip -c /tmp/manual_dump.sql && rm -f /tmp/manual_dump.sql" > "%OUT_FILE%"
if %errorlevel% neq 0 (
    del /q "%OUT_FILE%" >nul 2>nul
    echo [ERROR] Gagal membuat backup database.
    pause
    exit /b 1
)

echo [SUKSES] Backup tersimpan di %OUT_FILE%
pause
exit /b 0
