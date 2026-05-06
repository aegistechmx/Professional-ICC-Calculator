@echo off
title Fix Port Conflict
color 0E

echo ====================================================
echo  SOLUCIONANDO CONFLICTO DE PUERTO 5173
echo ====================================================
echo.

echo [STEP 1] Verificando qué proceso usa el puerto 5173...
netstat -ano | findstr :5173
echo.

echo [STEP 2] Identificando proceso Node.js...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Proceso PID: %%a
    tasklist /FI "PID eq %%a" 2>nul | findstr /I "node.exe"
    if not errorlevel 1 (
        echo [FOUND] Proceso Node.js usando puerto 5173
        echo.
        echo [STEP 3] Terminando proceso Node.js...
        taskkill /F /PID %%a >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] No se pudo terminar el proceso
        ) else (
            echo [OK] Proceso terminado exitosamente
        )
    )
)

echo.
echo [STEP 4] Verificando que el puerto esté libre...
timeout /t 2 /nobreak >nul
netstat -ano | findstr :5173 >nul 2>&1
if errorlevel 1 (
    echo [OK] Puerto 5173 ahora está libre
) else (
    echo [WARNING] Puerto 5173 todavía está en uso
    echo Intentando método alternativo...
    
    echo [STEP 5] Forzando cierre de todos los procesos Node.js...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    
    netstat -ano | findstr :5173 >nul 2>&1
    if errorlevel 1 (
        echo [OK] Puerto 5173 liberado
    ) else (
        echo [ERROR] Puerto 5173 todavía ocupado
        echo Puede necesitar reiniciar el sistema o cambiar de puerto
    )
)

echo.
echo [STEP 6] Ahora puede iniciar el frontend:
echo cd frontend && npm run dev
echo.
echo O use el script automatizado:
echo start-all.bat
echo.
pause
