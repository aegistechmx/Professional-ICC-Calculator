@echo off
title Professional ICC Calculator - Diagnóstico Completo
color 0C

echo ====================================================
echo  DIAGNÓSTICO COMPLETO - PROFESSIONAL ICC CALCULATOR
echo ====================================================
echo.

REM Paso 1: Verificar Node.js
echo [PASO 1] Verificando instalación de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no está instalado o no está en el PATH
    echo.
    echo SOLUCIÓN:
    echo 1. Descargar Node.js desde https://nodejs.org/
    echo 2. Instalar la versión LTS recomendada
    echo 3. Reiniciar el símbolo del sistema
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js instalado: %%i
)

REM Paso 2: Verificar npm
echo [PASO 2] Verificando instalación de npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm no está instalado
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm instalado: %%i
)

REM Paso 3: Verificar estructura de directorios
echo.
echo [PASO 3] Verificando estructura de directorios...

if not exist "%~dp0backend" (
    echo [ERROR] Directorio 'backend' no encontrado
    echo.
    echo SOLUCIÓN:
    echo 1. Asegúrese de estar en el directorio correcto del proyecto
    echo 2. Verifique que el directorio 'backend' exista
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Directorio 'backend' encontrado
)

if not exist "%~dp0frontend" (
    echo [ERROR] Directorio 'frontend' no encontrado
    echo.
    echo SOLUCIÓN:
    echo 1. Asegúrese de estar en el directorio correcto del proyecto
    echo 2. Verifique que el directorio 'frontend' exista
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Directorio 'frontend' encontrado
)

REM Paso 4: Verificar archivos de configuración
echo.
echo [PASO 4] Verificando archivos de configuración...

if not exist "%~dp0backend\package.json" (
    echo [ERROR] Archivo 'backend\package.json' no encontrado
    echo.
    echo SOLUCIÓN:
    echo 1. Verifique que el directorio backend contenga el archivo package.json
    echo 2. Si no existe, ejecute 'npm init' en el directorio backend
    echo.
    pause
    exit /b 1
) else (
    echo [OK] backend\package.json encontrado
)

if not exist "%~dp0frontend\package.json" (
    echo [ERROR] Archivo 'frontend\package.json' no encontrado
    echo.
    echo SOLUCIÓN:
    echo 1. Verifique que el directorio frontend contenga el archivo package.json
    echo 2. Si no existe, ejecute 'npm init' en el directorio frontend
    echo.
    pause
    exit /b 1
) else (
    echo [OK] frontend\package.json encontrado
)

REM Paso 5: Verificar node_modules
echo.
echo [PASO 5] Verificando dependencias instaladas...

if not exist "%~dp0backend\node_modules" (
    echo [WARNING] Directorio 'backend\node_modules' no encontrado
    echo.
    echo INSTALANDO DEPENDENCIAS DEL BACKEND...
    cd /d "%~dp0backend"
    npm install
    if errorlevel 1 (
        echo [ERROR] Error al instalar dependencias del backend
        echo.
        echo SOLUCIONES POSIBLES:
        echo 1. Limpiar caché de npm: npm cache clean --force
        echo 2. Eliminar node_modules y package-lock.json
        echo 3. Ejecutar: npm install --force
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencias del backend instaladas
    cd /d "%~dp0"
) else (
    echo [OK] Dependencias del backend ya instaladas
)

if not exist "%~dp0frontend\node_modules" (
    echo [WARNING] Directorio 'frontend\node_modules' no encontrado
    echo.
    echo INSTALANDO DEPENDENCIAS DEL FRONTEND...
    cd /d "%~dp0frontend"
    npm install
    if errorlevel 1 (
        echo [ERROR] Error al instalar dependencias del frontend
        echo.
        echo SOLUCIONES POSIBLES:
        echo 1. Limpiar caché de npm: npm cache clean --force
        echo 2. Eliminar node_modules y package-lock.json
        echo 3. Ejecutar: npm install --force
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencias del frontend instaladas
    cd /d "%~dp0"
) else (
    echo [OK] Dependencias del frontend ya instaladas
)

REM Paso 6: Verificar puertos en uso
echo.
echo [PASO 6] Verificando puertos en uso...

echo [CHECK] Verificando puerto 3001 (Backend)...
netstat -an | findstr ":3001" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Puerto 3001 está en uso
    echo.
    echo PROCESOS USANDO PUERTO 3001:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
        tasklist /FI "PID eq %%a" 2>nul | findstr /I "node.exe"
    )
    echo.
    echo SOLUCIÓN:
    echo 1. Cerrar otros procesos Node.js: taskkill /F /IM node.exe
    echo 2. O cambiar el puerto en la configuración del backend
    echo.
    set PUERTO_BACKEND_OCUPADO=1
) else (
    echo [OK] Puerto 3001 disponible
    set PUERTO_BACKEND_OCUPADO=0
)

echo [CHECK] Verificando puerto 5173 (Frontend)...
netstat -an | findstr ":5173" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Puerto 5173 está en uso
    echo.
    echo PROCESOS USANDO PUERTO 5173:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
        tasklist /FI "PID eq %%a" 2>nul | findstr /I "node.exe"
    )
    echo.
    echo SOLUCIÓN:
    echo 1. Cerrar otros procesos Node.js: taskkill /F /IM node.exe
    echo 2. O cambiar el puerto en la configuración del frontend
    echo.
    set PUERTO_FRONTEND_OCUPADO=1
) else (
    echo [OK] Puerto 5173 disponible
    set PUERTO_FRONTEND_OCUPADO=0
)

REM Paso 7: Verificar scripts de inicio
echo.
echo [PASO 7] Verificando scripts de inicio...

echo [CHECK] Verificando script 'dev' en backend...
cd /d "%~dp0backend"
npm run dev --dry-run >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Script 'dev' no encontrado en backend\package.json
    echo.
    echo CONTENIDO ACTUAL DE package.json:
    type package.json
    echo.
    echo SOLUCIÓN:
    echo 1. Agregar script "dev": "node index.js" o "npm start"
    echo 2. Verificar el archivo principal del servidor
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Script 'dev' encontrado en backend
)

echo [CHECK] Verificando script 'dev' en frontend...
cd /d "%~dp0frontend"
npm run dev --dry-run >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Script 'dev' no encontrado en frontend\package.json
    echo.
    echo CONTENIDO ACTUAL DE package.json:
    type package.json
    echo.
    echo SOLUCIÓN:
    echo 1. Agregar script "dev": "vite" o "vite dev"
    echo 2. Verificar que Vite esté instalado
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Script 'dev' encontrado en frontend
)

cd /d "%~dp0"

REM Paso 8: Intentar iniciar servicios (diagnóstico)
echo.
echo [PASO 8] Intentando inicio de servicios para diagnóstico...

echo [TEST] Iniciando Backend (10 segundos)...
cd /d "%~dp0backend"
start /B cmd /c "npm run dev > \"%~dp0logs\backend-test.log\" 2>&1"
cd /d "%~dp0"

timeout /t 10 /nobreak >nul

echo [TEST] Verificando Backend...
curl -s -I http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Backend no responde después de 10 segundos
    echo.
    echo ÚLTIMAS LÍNEAS DEL LOG DE BACKEND:
    if exist "%~dp0logs\backend-test.log" (
        powershell "Get-Content '%~dp0logs\backend-test.log' -Tail 20"
    ) else (
        echo No se encontraron logs
    )
    echo.
    echo PROBABLES CAUSAS:
    echo 1. Error en el código del servidor
    echo 2. Dependencias faltantes
    echo 3. Configuración incorrecta
    echo 4. Puerto bloqueado por firewall
    echo.
) else (
    echo [PASS] Backend responde correctamente
)

echo [TEST] Iniciando Frontend (15 segundos)...
cd /d "%~dp0frontend"
start /B cmd /c "npm run dev > \"%~dp0logs\frontend-test.log\" 2>&1"
cd /d "%~dp0"

timeout /t 15 /nobreak >nul

echo [TEST] Verificando Frontend...
curl -s -I http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Frontend no responde después de 15 segundos
    echo.
    echo ÚLTIMAS LÍNEAS DEL LOG DE FRONTEND:
    if exist "%~dp0logs\frontend-test.log" (
        powershell "Get-Content '%~dp0logs\frontend-test.log' -Tail 20"
    ) else (
        echo No se encontraron logs
    )
    echo.
    echo PROBABLES CAUSAS:
    echo 1. Error en la configuración de Vite
    echo 2. Dependencias faltantes
    echo 3. Conflicto de puertos
    echo 4. Problemas de compilación
    echo.
) else (
    echo [PASS] Frontend responde correctamente
)

REM Limpieza de procesos de prueba
echo.
echo [CLEANUP] Deteniendo procesos de prueba...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ====================================================
echo  RESUMEN DEL DIAGNÓSTICO
echo ====================================================
echo.
echo  Si alguno de los servicios falló, revise los logs mostrados arriba
echo  y siga las soluciones sugeridas.
echo.
echo  Logs completos guardados en:
echo    - logs\backend-test.log
echo    - logs\frontend-test.log
echo.
echo  Después de solucionar los problemas, ejecute:
echo    start-all.bat      (para uso normal)
echo    start-all-debug.bat (para ver logs en tiempo real)
echo.
pause
