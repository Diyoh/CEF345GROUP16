@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo       BuildRight Database Exporter
echo ===========================================
echo.
echo Finding mysqldump.exe...

set "MYSQLDUMP_PATH="

:: 1. Check PATH
where mysqldump >nul 2>nul
if %errorlevel% equ 0 (
    set "MYSQLDUMP_PATH=mysqldump"
    goto :found
)

:: 2. Check Standard MySQL Locations
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
    set "MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    goto :found
)
if exist "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe" (
    set "MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe"
    goto :found
)

:: 3. Check XAMPP/WAMP
if exist "C:\xampp\mysql\bin\mysqldump.exe" (
    set "MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe"
    goto :found
)
if exist "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe" (
    set "MYSQLDUMP_PATH=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe"
    goto :found
)

:notfound
echo.
echo [ERROR] Could not find mysqldump.exe automatically.
echo Please ensure MySQL is installed and added to your PATH.
echo.
pause
exit /b 1

:found
echo [OK] Found mysqldump at: "%MYSQLDUMP_PATH%"
echo.
echo -------------------------------------------
echo Please enter your Database Name.
echo (Common defaults: 'buildright', 'buildright_db1', or 'test')
set /p DB_NAME="Database Name [buildright_db1]: "
if "%DB_NAME%"=="" set DB_NAME=buildright_db1

echo.
echo Exporting database '%DB_NAME%' to 'backup_latest.sql'...
echo.
echo NOTE: You will be prompted for your MySQL root password.
echo.

"%MYSQLDUMP_PATH%" -u root -p %DB_NAME% > backup_latest.sql

:: Verify success
for %%I in (backup_latest.sql) do set filesize=%%~zI

if %filesize% gtr 0 (
    echo.
    echo [SUCCESS] Database exported to 'backup_latest.sql' - Size: %filesize% bytes
    echo.
    echo Now upload this file to Aiven using MySQL Workbench.
    goto :end
) else (
    echo.
    echo [ERROR] The export failed - File is empty.
    echo Possible reasons:
    echo 1. Wrong Password
    echo 2. Wrong Database Name ('%DB_NAME%' does not exist)
    :: Safely remove empty file
    del backup_latest.sql
)

:end
echo.
pause
