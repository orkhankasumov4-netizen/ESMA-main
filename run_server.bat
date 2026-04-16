@echo off
setlocal

REM --- Konfiqurasiya ---
set PORT=8081
set HTML_FILE=claude-pro.html

REM --- Başladıcı ---
title Claude Local Server

echo.
echo =========================================================
echo  Claude Pro Local Server
echo =========================================================
echo.

REM 1. HTML faylını yoxla
if not exist "%HTML_FILE%" (
    echo [XETA] %HTML_FILE% bu qovluqda tapilmadi.
    echo Xahis olunur bu skripti %HTML_FILE% ile eyni qovluga qoyun.
    pause
    exit /b
)

REM 2. Python yoxla
echo [-] Python yoxlanilir...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [XETA] Komputerde Python qurasdirilmayib.
    echo Zehmet olmasa python.org saytindan yukleyin (PATH isaresini secin).
    pause
    exit /b
)
echo [+] Python tapildi!

REM 3. Brauzeri aç
echo [+] Brauzer acilir...
start http://localhost:%PORT%/%HTML_FILE%

REM 4. Serveri başlat (Pəncərəni açıq saxlayır)
echo.
echo =========================================================
echo  UGURLU! Server hal-hazirda isleyir.
echo.
echo  SERVERI DAYANDIRMAQ UCUN BU QARA PENCERENI BAGLAYIN (X).
echo =========================================================
echo.
python -m http.server %PORT%