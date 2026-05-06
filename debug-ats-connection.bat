@echo off
title Debug ATS Connection Issues
color 0E

echo ====================================================
echo  DIAGNOSTICANDO PROBLEMAS DE CONEXIÓN ATS
echo ====================================================
echo.

echo [STEP 1] Verificando reglas de conexión ATS...
echo.
echo Reglas de conexión válidas para ATS:
echo   - ATS puede conectarse DESDE: transformer, generator
echo   - ATS puede conectarse HACIA: breaker, panel
echo   - ATS NO puede conectarse a: load, motor, generator (como salida)
echo.

echo [STEP 2] Configuración correcta de ATS:
echo.
echo OPCIÓN A - Configuración BÁSICA:
echo   Transformador ----> ATS ----> Breaker ----> Panel ----> Cargas
echo.
echo OPCIÓN B - Configuración REDUNDANTE:
echo   Transformador ----> ATS ----> Breaker ----> Panel ----> Cargas
echo                      ^
echo                      |
echo                 Generador
echo.

echo [STEP 3] Posibles problemas y soluciones:
echo.
echo PROBLEMA 1: Intentando conectar ATS a carga directamente
echo   ERROR: ATS no puede conectar directamente a 'load'
echo   SOLUCIÓN: ATS -> Breaker -> Panel -> Load
echo.
echo PROBLEMA 2: Intentando conectar generador DESDE ATS
echo   ERROR: ATS no puede alimentar a generador
echo   SOLUCIÓN: Generador -> ATS (el generador alimenta al ATS)
echo.
echo PROBLEMA 3: ATS sin fuente de alimentación
echo   ERROR: ATS necesita al menos 1 entrada
echo   SOLUCIÓN: Conectar transformador o generador al ATS
echo.
echo PROBLEMA 4: ATS sin salida
echo   ERROR: ATS necesita al menos 1 salida
echo   SOLUCIÓN: Conectar ATS a breaker o panel
echo.

echo [STEP 4] Secuencia de conexión CORRECTA:
echo.
echo 1. Agregar nodo TRANSFORMADOR
echo 2. Agregar nodo ATS
echo 3. Agregar nodo BREAKER
echo 4. Agregar nodo PANEL
echo 5. Conectar: TRANSFORMADOR -> ATS
echo 6. Conectar: ATS -> BREAKER
echo 7. Conectar: BREAKER -> PANEL
echo 8. Agregar cargas al PANEL
echo.

echo [STEP 5] Si tienes generador:
echo.
echo 9. Agregar nodo GENERADOR
echo 10. Conectar: GENERADOR -> ATS (segunda entrada)
echo.

echo [STEP 6] Verificación visual:
echo.
echo El ATS debería mostrar:
echo   - Al menos 1 flecha ENTRANTE (transformador/generador)
echo   - Al menos 1 flecha SALIENTE (breaker/panel)
echo   - Sin conexiones a cargas directamente
echo.

echo ====================================================
echo  INSTRUCCIONES PARA CONECTAR ATS CORRECTAMENTE
echo ====================================================
echo.
echo 1. Limpia el lienzo actual
echo 2. Sigue la secuencia del STEP 4
echo 3. Verifica las conexiones permitidas
echo 4. Si agregas generador, sigue STEP 5
echo.
echo Las conexiones deben seguir las reglas eléctricas:
echo   - Fuentes alimentan al ATS
echo   - ATS alimenta a equipos de protección
echo   - Nunca conectar cargas directamente al ATS
echo.
pause
