@echo off
setlocal

:: Path to MySQL executable (Found on your system)
set MYSQL_EXE="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

:: ----------------------------------------------------
:: Aiven Connection Details (Filled from your screenshot)
:: ----------------------------------------------------
set AIVEN_HOST=buildright-db-buildright-2026.j.aivencloud.com
set AIVEN_PORT=27951
set AIVEN_USER=avnadmin
set AIVEN_PASS=AVNS_-6Fd9UoBQQUX80Cxg_7
:: ----------------------------------------------------

echo ===========================================
echo       Importing to Aiven...
echo ===========================================
echo.
echo Using Backup File: backup_latest.sql
echo Target Host: %AIVEN_HOST%
echo.

if not exist backup_latest.sql (
    echo [ERROR] backup_latest.sql not found!
    echo Please run export_db.bat first.
    pause
    exit /b
)

%MYSQL_EXE% -h %AIVEN_HOST% -P %AIVEN_PORT% -u %AIVEN_USER% -p%AIVEN_PASS% --ssl-mode=REQUIRED defaultdb < backup_latest.sql

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Import Completed!
) else (
    echo.
    echo [ERROR] Import Failed. Check your internet connection.
)

pause
