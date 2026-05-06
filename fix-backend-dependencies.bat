@echo off
title Fix Backend Dependencies
color 0E

echo ====================================================
echo  SOLUCIONANDO CONFLICTO DE DEPENDENCIAS ESLINT
echo ====================================================
echo.

cd /d "%~dp0backend"

echo [STEP 1] Limpiando cache de npm...
npm cache clean --force
if errorlevel 1 (
    echo [WARNING] Error al limpiar cache, continuando...
)

echo.
echo [STEP 2] Eliminando node_modules y package-lock.json...
if exist node_modules (
    echo Eliminando node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Eliminando package-lock.json...
    del package-lock.json
)

echo.
echo [STEP 3] Instalando dependencias con --legacy-peer-deps...
echo Esto resuelve conflictos de versiones de ESLint...
echo.
npm install --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo [ERROR] Falló la instalación con --legacy-peer-deps
    echo.
    echo [STEP 4] Intentando con --force...
    npm install --force
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Falló la instalación con --force también
        echo.
        echo SOLUCIONES MANUALES:
        echo 1. Actualizar Node.js a la última versión LTS
        echo 2. Eliminar manualmente la carpeta node_modules
        echo 3. Ejecutar: npm cache verify
        echo 4. Ejecutar: npm install --no-optional
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [STEP 5] Verificando instalación...
if exist node_modules (
    echo [OK] node_modules creado correctamente
) else (
    echo [ERROR] node_modules no se creó
    pause
    exit /b 1
)

echo.
echo [STEP 6] Verificando ESLint...
node -e "try { require('eslint'); console.log('[OK] ESLint instalado'); } catch(e) { console.log('[ERROR] ESLint no encontrado'); }"

echo.
echo [STEP 7] Probando inicio del servidor...
echo Ejecutando: npm run dev (timeout 10 segundos)
echo.

start /B cmd /c "npm run dev > ../logs/backend-test.log 2>&1"
timeout /t 10 /nobreak >nul

echo.
echo [STEP 8] Verificando que el servidor esté corriendo...
netstat -an | findstr ":3001" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Servidor no detectado en puerto 3001
    echo Mostrando logs del servidor...
    if exist "../logs/backend-test.log" (
        type "../logs/backend-test.log"
    )
    echo.
    echo El servidor puede tardar más en iniciar. Intente manualmente:
    echo cd backend && npm run dev
) else (
    echo [OK] Servidor detectado en puerto 3001
)

echo.
echo ====================================================
echo  DEPENDENCIAS SOLUCIONADAS
echo ====================================================
echo.
echo  Próximos pasos:
echo  1. Iniciar el backend: cd backend && npm run dev
echo  2. Iniciar el frontend: cd frontend && npm run dev
echo  3. Abrir: http://localhost:5173
echo.
pause
