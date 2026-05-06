@echo off
title Professional ICC Calculator - Sistema Completo
color 0A

REM Configurar ventana para mosaico
mode con: cols=120 lines=40

echo.
echo ====================================================
echo  PROFESSIONAL ICC CALCULATOR - INICIO COMPLETO
echo ====================================================
echo.
echo  Iniciando sistema completo en ventana unificada...
echo.
echo    o Frontend (React/Vite)
echo    o Backend (Node.js/Express)  
echo.
echo  Espere mientras los servicios inician...
echo.

REM Crear directorio para logs si no existe
if not exist "%~dp0logs" mkdir "%~dp0logs"

REM Verificar que Node.js esté instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no está instalado o no está en el PATH
    echo Por favor, instale Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar que existan los directorios
if not exist "%~dp0backend" (
    echo [ERROR] Directorio backend no encontrado
    pause
    exit /b 1
)

if not exist "%~dp0frontend" (
    echo [ERROR] Directorio frontend no encontrado
    pause
    exit /b 1
)

REM Iniciar Backend en ventana minimizada (para poder ver la salida si hay errores)
echo [BACKEND] Iniciando servidor Backend...
start /MIN "Backend API" cmd /k "cd /d %~dp0backend && npm run dev > \"%~dp0logs\backend.log\" 2>&1 && echo Backend detenido >> \"%~dp0logs\backend.log\""

REM Esperar 5 segundos para que backend inicie completamente
echo [WAIT] Esperando inicio de Backend...
timeout /t 5 /nobreak >nul

REM Verificar que Backend esté corriendo
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend podría no estar respondiendo en http://localhost:3001
    echo Revisando logs de Backend...
    if exist "%~dp0logs\backend.log" (
        echo === Últimas líneas de Backend ===
        powershell "Get-Content '%~dp0logs\backend.log' -Tail 10"
    )
    echo.
    echo Continuando con el inicio de Frontend...
)

REM Iniciar Frontend en ventana minimizada
echo [FRONTEND] Iniciando servidor Frontend...
start /MIN "Frontend React" cmd /k "cd /d %~dp0frontend && npm run dev > \"%~dp0logs\frontend.log\" 2>&1 && echo Frontend detenido >> \"%~dp0logs\frontend.log\""

REM Esperar 10 segundos para que frontend inicie completamente
echo [WAIT] Esperando inicio de Frontend...
timeout /t 10 /nobreak >nul

REM Verificar que Frontend esté corriendo
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Frontend podría no estar respondiendo en http://localhost:5173
    echo Revisando logs de Frontend...
    if exist "%~dp0logs\frontend.log" (
        echo === Últimas líneas de Frontend ===
        powershell "Get-Content '%~dp0logs\frontend.log' -Tail 10"
    )
    echo.
)

echo.
echo ====================================================
echo  SERVICIOS INICIADOS
echo ====================================================
echo.
echo  Frontend:    http://localhost:5173
echo  Backend:     http://localhost:3001
echo.
echo  Logs guardados en: logs\backend.log y logs\frontend.log
echo.
echo  Presione cualquier tecla para verificar y abrir las interfaces...
pause >nul

REM Verificación final de conectividad y apertura de interfaces
echo [CHECK] Verificando conectividad final...

REM Verificar Backend con más detalle
echo [TEST] Probando Backend...
curl -s -I http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend no responde en http://localhost:3001
    echo Posibles causas:
    echo   - Puerto 3001 ocupado
    echo   - Error de instalación de dependencias
    echo   - Problemas de configuración
    echo.
    echo Mostrando últimos logs de Backend:
    if exist "%~dp0logs\backend.log" (
        type "%~dp0logs\backend.log"
    ) else (
        echo No se encontraron logs de Backend
    )
    echo.
    echo Presione cualquier tecla para continuar de todas formas...
    pause >nul
) else (
    echo [OK] Backend responding correctly
)

REM Verificar Frontend con más detalle
echo [TEST] Probando Frontend...
curl -s -I http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend no responde en http://localhost:5173
    echo Posibles causas:
    echo   - Puerto 5173 ocupado
    echo   - Error de instalación de dependencias
    echo   - Problemas de configuración de Vite
    echo.
    echo Mostrando últimos logs de Frontend:
    if exist "%~dp0logs\frontend.log" (
        type "%~dp0logs\frontend.log"
    ) else (
        echo No se encontraron logs de Frontend
    )
    echo.
    echo Presione cualquier tecla para continuar de todas formas...
    pause >nul
) else (
    echo [OK] Frontend responding correctly
)

REM Abrir interfaces en el navegador con verificación
echo [BROWSER] Abriendo interfaces web...

REM Intentar abrir Frontend
echo [OPEN] Abriendo Frontend: http://localhost:5173
start http://localhost:5173
timeout /t 2 /nobreak >nul

REM Intentar abrir Backend
echo [OPEN] Abriendo Backend: http://localhost:3001
start http://localhost:3001
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Interfaces abiertas en el navegador
echo        Si no se abrieron, verifique manualmente:
echo        - Frontend: http://localhost:5173
echo        - Backend:  http://localhost:3001

echo.
echo ====================================================
echo  SISTEMA LISTO - MONITOREO ACTIVO
echo ====================================================
echo.
echo  Servicios corriendo en segundo plano
echo  Logs disponibles en carpeta 'logs'
echo.
echo  Comandos disponibles:
echo    [L] Ver logs de Backend
echo    [F] Ver logs de Frontend  
echo    [R] Reiniciar servicios
echo    [S] Detener servicios (Ctrl+C)
echo    [Q] Salir
echo.

:BuclePrincipal
cls
echo ====================================================
echo  PROFESSIONAL ICC CALCULATOR - MONITOREO
echo ====================================================
echo.
echo  Servicios activos:
echo    - Backend:  http://localhost:3001
echo    - Frontend: http://localhost:5173
echo.
echo  Estado: %date% %time%
echo.

choice /C LFRSQ /N /M "Seleccione una opcion (L/F/R/S/Q): "

if errorlevel 5 goto Salir
if errorlevel 4 goto DetenerServicios
if errorlevel 3 goto ReiniciarServicios
if errorlevel 2 goto VerLogsFrontend
if errorlevel 1 goto VerLogsBackend

goto BuclePrincipal

:VerLogsBackend
echo.
echo === LOGS DE BACKEND ===
type "%~dp0logs\backend.log" | more
echo.
pause
goto BuclePrincipal

:VerLogsFrontend
echo.
echo === LOGS DE FRONTEND ===
type "%~dp0logs\frontend.log" | more
echo.
pause
goto BuclePrincipal

:ReiniciarServicios
echo.
echo [RESTART] Reiniciando servicios...

REM Detener procesos existentes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Reiniciar Backend
echo [BACKEND] Reiniciando servidor Backend...
start /B cmd /c "cd /d %~dp0backend && npm run dev > \"%~dp0logs\backend.log\" 2>&1"

REM Esperar 3 segundos
timeout /t 3 /nobreak >nul

REM Reiniciar Frontend
echo [FRONTEND] Reiniciando servidor Frontend...
start /B cmd /c "cd /d %~dp0frontend && npm run dev > \"%~dp0logs\frontend.log\" 2>&1"

REM Esperar 5 segundos
timeout /t 5 /nobreak >nul

echo [RESTART] Servicios reiniciados correctamente.
pause
goto BuclePrincipal

:DetenerServicios
echo.
echo [STOP] Deteniendo servicios...
taskkill /F /IM node.exe >nul 2>&1
echo [STOP] Servicios detenidos.
timeout /t 2 /nobreak >nul
goto BuclePrincipal

:Salir
echo.
echo [EXIT] Cerrando Professional ICC Calculator...
echo.
echo  Gracias por usar Professional ICC Calculator!
echo  Los servicios continuarán corriendo hasta que cierre esta ventana.
echo.
pause
