@echo off
TITLE Installer Shortcut Desktop - PT YPTI ERP
COLOR 0B
cd /d "%~dp0"

echo =====================================================================
echo    PT YOGYAKARTA PRECISION TOOLING INDUSTRIES (PT YPTI)
echo    Pemasangan Shortcut Desktop Aplikasi Enterprise ERP
echo =====================================================================
echo.

:: 1. Pastikan icon file ada
if not exist "public\app-icon.ico" (
    powershell -Command "Add-Type -AssemblyName System.Drawing; $bmp = [System.Drawing.Bitmap]::FromFile('public\logo.png'); $thumb = New-Object System.Drawing.Bitmap $bmp, 256, 256; $hIcon = $thumb.GetHicon(); $icon = [System.Drawing.Icon]::FromHandle($hIcon); $fs = New-Object System.IO.FileStream 'public\app-icon.ico', 'Create'; $icon.Save($fs); $fs.Close(); $bmp.Dispose(); $thumb.Dispose();" >nul 2>nul
)

:: 2. Buat Shortcut di Desktop via PowerShell
powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $Desktop = [Environment]::GetFolderPath('Desktop'); $Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop 'PT YPTI - Tool Room ERP.lnk')); $Shortcut.TargetPath = '%~dp0run-desktop.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0public\app-icon.ico,0'; $Shortcut.Description = 'PT YPTI Tool Room & Inventory Management ERP'; $Shortcut.WindowStyle = 7; $Shortcut.Save();"

:: 3. Jika menggunakan OneDrive Desktop, buatkan juga di OneDrive Desktop
powershell -NoProfile -Command "if ($env:OneDrive) { $OneDriveDesktop = Join-Path $env:OneDrive 'Desktop'; if (Test-Path $OneDriveDesktop) { $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut((Join-Path $OneDriveDesktop 'PT YPTI - Tool Room ERP.lnk')); $Shortcut.TargetPath = '%~dp0run-desktop.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0public\app-icon.ico,0'; $Shortcut.Description = 'PT YPTI Tool Room & Inventory Management ERP'; $Shortcut.WindowStyle = 7; $Shortcut.Save(); } }" >nul 2>nul

echo [SUKSES] Ikon aplikasi berhasil dipasang di Desktop Windows!
echo Nama Ikon: PT YPTI - Tool Room ERP (dengan logo resmi PT YPTI)
echo.
echo Klik dua kali ikon tersebut kapan saja untuk menjalankan aplikasi
echo dalam jendela software desktop profesional tanpa bilah web browser.
echo =====================================================================
echo.

set /p OPEN_NOW="Buka aplikasi sekarang? (Y/N): "
if /i "%OPEN_NOW%"=="Y" (
    start "" "%~dp0run-desktop.bat"
)
exit /b 0

