@echo off
title Test Backend Response
color 0B

echo ====================================================
echo  DIAGNÓSTICO DE RESPUESTA DEL BACKEND
echo ====================================================
echo.

echo [TEST 1] Verificando si el backend está corriendo...
netstat -an | findstr ":3001" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend no está corriendo en puerto 3001
    echo.
    echo Inicie el backend primero:
    echo cd backend && npm run dev
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Backend detectado en puerto 3001
)

echo.
echo [TEST 2] Probando respuesta cruda del endpoint /icc...
echo.
echo Ejecutando: curl -v http://localhost:3001/icc
echo ========================================
curl -v http://localhost:3001/icc
echo ========================================
echo.

echo [TEST 3] Probando respuesta cruda del endpoint /api/health...
echo.
echo Ejecutando: curl -v http://localhost:3001/api/health
echo ========================================
curl -v http://localhost:3001/api/health
echo ========================================
echo.

echo [TEST 4] Probando respuesta a través del proxy de Vite...
echo.
echo Ejecutando: curl -v http://localhost:5173/icc
echo ========================================
curl -v http://localhost:5173/icc
echo ========================================
echo.

echo [TEST 5] Verificando headers de respuesta...
echo.
echo Headers de http://localhost:3001/icc:
curl -I http://localhost:3001/icc
echo.

echo [TEST 6] Intentando parsear JSON...
echo.
echo Guardando respuesta en archivo temporal...
curl -s http://localhost:3001/icc > temp_response.txt

echo Contenido del archivo:
type temp_response.txt
echo.

echo Tamaño del archivo:
for %%i in (temp_response.txt) do echo %%~zi bytes
echo.

echo Verificando si es JSON válido...
node -e "try { JSON.parse(require('fs').readFileSync('temp_response.txt', 'utf8')); console.log('[OK] JSON válido'); } catch(e) { console.log('[ERROR] JSON inválido:', e.message); }"

echo.
echo Limpieza...
del temp_response.txt >nul 2>&1

echo.
echo ====================================================
echo  DIAGNÓSTICO COMPLETADO
echo ====================================================
echo.
echo Si ve "[ERROR] JSON inválido", el problema está en el backend.
echo Si ve "[OK] JSON válido", el problema puede estar en el proxy.
echo.
pause
