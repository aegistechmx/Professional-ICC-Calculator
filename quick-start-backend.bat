@echo off
title Quick Start Backend
color 0A

echo ====================================================
echo  INICIANDO BACKEND - PROFESSIONAL ICC CALCULATOR
echo ====================================================
echo.

cd /d "%~dp0backend"

echo [CHECK] Verificando dependencias...
if not exist node_modules (
    echo [INSTALL] Instalando dependencias del backend...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] Error al instalar dependencias
        echo.
        echo Ejecute manualmente: fix-backend-dependencies.bat
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias ya instaladas
)

echo.
echo [START] Iniciando servidor backend...
echo El servidor correrá en: http://localhost:3001
echo Presione Ctrl+C para detener el servidor
echo.

npm run dev
