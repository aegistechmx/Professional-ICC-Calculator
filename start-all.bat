@echo off
title Professional ICC Calculator - Sistema Completo
color 0A

echo.
echo ====================================================
echo  PROFESSIONAL ICC CALCULATOR - INICIO COMPLETO
echo ====================================================
echo.
echo  Iniciando sistema completo...
echo.
echo    o Frontend (React/Vite)
echo    o Backend (Node.js/Express)  
echo    o Cortocircuito (HTML/JavaScript)
echo.
echo  Espere mientras los servicios inician...
echo.

REM Iniciar Backend en nueva ventana
start "Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

REM Esperar 2 segundos
timeout /t 2 /nobreak >nul

REM Iniciar Frontend en nueva ventana
start "Frontend React" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Esperar 3 segundos
timeout /t 3 /nobreak >nul

REM Iniciar Cortocircuito en nueva ventana
start "Cortocircuito" cmd /k "cd /d %~dp0cortocircuito && npx serve -l 3002"

REM Esperar 5 segundos
timeout /t 5 /nobreak >nul

echo.
echo ====================================================
echo  SERVICIOS INICIADOS
echo ====================================================
echo.
echo  Frontend:    http://localhost:5173
echo  Backend:     http://localhost:3001
echo  Cortocircuito: http://localhost:3002
echo.
echo  Presione cualquier tecla para abrir el navegador...
pause >nul

REM Abrir todas las interfaces en el navegador
start http://localhost:5173
start http://localhost:3001
start http://localhost:3002

echo.
echo  Sistema listo! Todas las interfaces abiertas.
echo  Cierra las ventanas de comando para detener los servicios.
echo.
pause
