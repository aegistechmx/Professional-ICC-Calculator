@echo off
title Professional ICC Calculator - Modo Debug
color 0E

echo ====================================================
echo  PROFESSIONAL ICC CALCULATOR - MODO DEBUG
echo ====================================================
echo.
echo  Este script iniciará los servicios en ventanas separadas
echo  para poder ver la salida en tiempo real y diagnosticar problemas
echo.

REM Verificar Node.js
node --version
if errorlevel 1 (
    echo [ERROR] Node.js no está instalado
    pause
    exit /b 1
)

REM Crear directorio para logs
if not exist "%~dp0logs" mkdir "%~dp0logs"

echo.
echo [STEP 1] Iniciando Backend en ventana separada...
echo        Podrá ver la salida del servidor en la ventana que se abrirá
echo.
start "Backend API - DEBUG" cmd /k "cd /d %~dp0backend && echo === INICIANDO BACKEND === && npm run dev 2>&1 | tee \"%~dp0logs\backend-debug.log\""

echo [STEP 2] Esperando 5 segundos para inicio de Backend...
timeout /t 5 /nobreak >nul

echo.
echo [STEP 3] Iniciando Frontend en ventana separada...
echo        Podrá ver la salida del servidor en la ventana que se abrirá
echo.
start "Frontend React - DEBUG" cmd /k "cd /d %~dp0frontend && echo === INICIANDO FRONTEND === && npm run dev 2>&1 | tee \"%~dp0logs\frontend-debug.log\""

echo [STEP 4] Esperando 10 segundos para inicio completo...
timeout /t 10 /nobreak >nul

echo.
echo [STEP 5] Verificando conectividad...

REM Verificar Backend
echo [TEST] Probando Backend en http://localhost:3001...
curl -s -I http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Backend no responde
    echo        Revise la ventana de Backend para ver errores
) else (
    echo [PASS] Backend responde correctamente
)

REM Verificar Frontend  
echo [TEST] Probando Frontend en http://localhost:5173...
curl -s -I http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Frontend no responde
    echo        Revise la ventana de Frontend para ver errores
) else (
    echo [PASS] Frontend responde correctamente
)

echo.
echo [STEP 6] Abriendo interfaces en navegador...
start http://localhost:5173
timeout /t 2 /nobreak >nul
start http://localhost:3001

echo.
echo ====================================================
echo  MODO DEBUG ACTIVO
echo ====================================================
echo.
echo  Ventanas abiertas:
echo    - "Backend API - DEBUG": Muestra logs del servidor backend
echo    - "Frontend React - DEBUG": Muestra logs del servidor frontend
echo    - Navegador: Interfaces web
echo.
echo  Si hay errores, revise las ventanas de debug correspondientes
echo.
echo  Logs guardados en:
echo    - logs\backend-debug.log
echo    - logs\frontend-debug.log
echo.
echo  Para detener los servicios, cierre las ventanas de debug
echo.
pause
