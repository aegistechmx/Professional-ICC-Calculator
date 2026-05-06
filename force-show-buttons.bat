@echo off
title Forzar Botones de Guardado
color 0B

echo ====================================================
echo  SOLUCIÓN DEFINITIVA - BOTONES DE GUARDADO
echo ====================================================
echo.

echo [PROBLEMA] Botones de guardado no aparecen en la UI
echo.

echo [SOLUCIÓN 1] Verificar que frontend esté corriendo...
echo.
echo 1. Abre terminal nueva
echo 2. Ejecuta: cd frontend && npm run dev
echo 3. Abre: http://localhost:5173
echo.

echo [SOLUCIÓN 2] Limpiar cache del navegador...
echo.
echo 1. En Chrome: Ctrl+Shift+Del
echo 2. Selecciona "Cached images and files"
echo 3. Click "Clear data"
echo 4. Recarga: F5 o Ctrl+F5
echo.

echo [SOLUCIÓN 3] Verificar estado del sistema...
echo.
echo Los botones aparecen SOLO cuando:
echo - systemModel tiene datos (debe cargar ejemplo o crear sistema)
echo - No hay operación de archivo en progreso
echo.

echo [SOLUCIÓN 4] Forzar carga de datos...
echo.
echo 1. Click "Cargar Ejemplo" en la interfaz
echo 2. Espera que cargue el sistema modelo
echo 3. Los botones deberían aparecer automáticamente
echo.

echo [SOLUCIÓN 5] Verificar consola del navegador...
echo.
echo 1. Presiona F12 para abrir DevTools
echo 2. Ve a la pestaña "Console"
echo 3. Busca errores de JavaScript
echo 4. Si hay errores, reporta los mensajes exactos
echo.

echo [VERIFICACIÓN MANUAL]...
echo.
echo Los botones deberían estar aquí:
echo - Ubicación: Header del componente ICCCalculator
echo - Apariencia: Botones pequeños (Abrir, Guardar, Guardar Como)
echo - Colores: Púrpura, Azul, Índigo
echo - Estado: Habilitados cuando hay datos del sistema
echo.

echo [SI NADA FUNCIONA]...
echo.
echo 1. Reinicia el servidor frontend:
echo    - Cierra la terminal de npm run dev
echo    - Vuelve a ejecutar: cd frontend && npm run dev
echo.
echo 2. Limpia completamente el navegador:
echo    - Cierra todas las pestañas
echo    - Abre nueva ventana incógnito
echo    - Ve a http://localhost:5173
echo.

echo ====================================================
echo  ACCIONES INMEDIATAS
echo ====================================================
echo.
echo PASO 1: Verificar que frontend esté corriendo
netstat -an | findstr :5173 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend no está corriendo en puerto 5173
    echo.
    echo EJECUTAR ESTOS COMANDOS:
    echo cd frontend
    echo npm run dev
    echo.
    echo Luego abrir: http://localhost:5173
) else (
    echo [OK] Frontend detectado en puerto 5173
)

echo.
echo PASO 2: Instrucciones para activar botones
echo.
echo 1. Abre http://localhost:5173 en tu navegador
echo 2. Click en "Cargar Ejemplo" 
echo 3. Espera a que cargue el sistema
echo 4. Los botones de guardado aparecerán automáticamente
echo.

echo PASO 3: Si los botones siguen sin aparecer...
echo.
echo - Presiona F12 para abrir DevTools
echo - Ve a la pestaña Console
echo - Busca errores rojos
echo - Toma captura de pantalla de los errores
echo.

pause
