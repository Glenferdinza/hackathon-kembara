@echo off
TITLE PT YPTI - Tool Room ERP
cd /d "%~dp0"

:: Periksa apakah server sudah aktif di port 3000
netstat -ano | findstr 0.0.0.0:3000 >nul 2>nul
if %errorlevel% neq 0 (
    netstat -ano | findstr 127.0.0.1:3000 >nul 2>nul
    if %errorlevel% neq 0 (
        start /min "" cmd /c "npm run start"
        timeout /t 2 /nobreak >nul
    )
)

:: Buka dalam mode Native Desktop Window (tanpa bilah URL dan tab peramban)
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start "" msedge --app="http://localhost:3000"
    exit /b 0
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start "" chrome --app="http://localhost:3000"
    exit /b 0
)

start "" "http://localhost:3000"
exit /b 0

