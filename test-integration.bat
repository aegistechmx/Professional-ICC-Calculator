@echo off
title Test Integration - Frontend ↔ Motor ICC
color 0B

echo ====================================================
echo  VERIFICANDO INTEGRACIÓN FRONTEND ↔ MOTOR ICC
echo ====================================================
echo.

echo [STEP 1] Verificando que el backend esté corriendo...
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
echo [STEP 2] Verificando que el frontend esté corriendo...
netstat -an | findstr ":5173" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend no está corriendo en puerto 5173
    echo.
    echo Inicie el frontend:
    echo cd frontend && npm run dev
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Frontend detectado en puerto 5173
)

echo.
echo [STEP 3] Verificando conexión postMessage...
echo Abriendo interfaz de prueba...
echo.

echo Creando archivo de prueba temporal...
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<title^>Test Integración ICC^</title^>
echo     ^<style^>
echo         body { font-family: Arial, sans-serif; margin: 20px; }
echo         .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
echo         .success { color: green; }
echo         .error { color: red; }
echo         .info { color: blue; }
echo         button { padding: 10px; margin: 5px; }
echo         #results { margin-top: 20px; padding: 10px; background: #f5f5f5; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<h1^>Test de Integración Frontend ↔ Motor ICC^</h1^>
echo     
echo     ^<div class="test-section"^>
echo         ^<h2^>1. Verificar Motor ICC^</h2^>
echo         ^<button onclick="testMotorICCDirect()^">Test Motor ICC Directo^</button^>
echo         ^<div id="motor-result"^>^</div^>
echo     ^</div^>
echo     
echo     ^<div class="test-section"^>
echo         ^<h2^>2. Verificar Backend API^</h2^>
echo         ^<button onclick="testBackendAPI()^">Test Backend API^</button^>
echo         ^<div id="backend-result"^>^</div^>
echo     ^</div^>
echo     
echo     ^<div class="test-section"^>
echo         ^<h2^>3. Verificar Frontend Integration^</h2^>
echo         ^<button onclick="testFrontendIntegration()^">Test Frontend Integration^</button^>
echo         ^<div id="frontend-result"^>^</div^>
echo     ^</div^>
echo     
echo     ^<div class="test-section"^>
echo         ^<h2^>4. Test de Comunicación postMessage^</h2^>
echo         ^<button onclick="testPostMessage()^">Test postMessage^</button^>
echo         ^<div id="postmessage-result"^>^</div^>
echo     ^</div^>
echo     
echo     ^<div id="results"^>^</div^>
echo     
echo     ^<script^>
echo         // Test 1: Motor ICC Directo
echo         async function testMotorICCDirect() {
echo             const resultDiv = document.getElementById('motor-result');
echo             try {
echo                 const response = await fetch('/cortocircuito/index.html');
echo                 if (response.ok) {
echo                     resultDiv.innerHTML = '^<span class="success"^>[OK] Motor ICC accesible via /cortocircuito/^</span^>';
echo                 } else {
echo                     resultDiv.innerHTML = '^<span class="error"^>[FAIL] Motor ICC no responde^</span^>';
echo                 }
echo             } catch (error) {
echo                 resultDiv.innerHTML = '^<span class="error"^>[ERROR] ' + error.message + '^</span^>';
echo             }
echo         }
echo         
echo         // Test 2: Backend API
echo         async function testBackendAPI() {
echo             const resultDiv = document.getElementById('backend-result');
echo             try {
echo                 const response = await fetch('/icc');
echo                 const data = await response.json();
echo                 if (data.success) {
echo                     resultDiv.innerHTML = '^<span class="success"^>[OK] Backend API responde: Icc = ' + data.data.Icc + '^</span^>';
echo                 } else {
echo                     resultDiv.innerHTML = '^<span class="error"^>[FAIL] Backend API error: ' + data.error + '^</span^>';
echo                 }
echo             } catch (error) {
echo                 resultDiv.innerHTML = '^<span class="error"^>[ERROR] ' + error.message + '^</span^>';
echo             }
echo         }
echo         
echo         // Test 3: Frontend Integration
echo         function testFrontendIntegration() {
echo             const resultDiv = document.getElementById('frontend-result');
echo             try {
echo                 // Verificar que el componente ICCModule esté cargado
echo                 const iframe = document.querySelector('iframe[src*="cortocircuito"]');
echo                 if (iframe) {
echo                     resultDiv.innerHTML = '^<span class="success"^>[OK] ICCModule iframe detectado en frontend^</span^>';
echo                 } else {
echo                     resultDiv.innerHTML = '^<span class="error"^>[FAIL] ICCModule iframe no encontrado^</span^>';
echo                 }
echo             } catch (error) {
echo                 resultDiv.innerHTML = '^<span class="error"^>[ERROR] ' + error.message + '^</span^>';
echo             }
echo         }
echo         
echo         // Test 4: postMessage Communication
echo         function testPostMessage() {
echo             const resultDiv = document.getElementById('postmessage-result');
echo             let messageReceived = false;
echo             
echo             // Escuchar mensajes del iframe
echo             const messageHandler = function(event) {
echo                 if (event.data.type === 'ICC_READY') {
echo                     messageReceived = true;
echo                     resultDiv.innerHTML = '^<span class="success"^>[OK] Comunicación postMessage establecida^</span^>';
echo                     window.removeEventListener('message', messageHandler);
echo                 }
echo             };
echo             
echo             window.addEventListener('message', messageHandler);
echo             
echo             // Enviar mensaje de prueba
echo             setTimeout(() =^> {
echo                 if (!messageReceived) {
echo                     resultDiv.innerHTML = '^<span class="error"^][FAIL] No se recibió respuesta postMessage^</span^>';
echo                     window.removeEventListener('message', messageHandler);
echo                 }
echo             }, 3000);
echo             
echo             // Intentar enviar mensaje al iframe
echo             const iframe = document.querySelector('iframe[src*="cortocircuito"]');
echo             if (iframe && iframe.contentWindow) {
echo                 iframe.contentWindow.postMessage({ type: 'TEST_MESSAGE', data: { test: true } }, '*');
echo             }
echo         }
echo         
echo         // Auto-iniciar tests
echo         window.addEventListener('load', function() {
echo             setTimeout(() =^> {
echo                 testMotorICCDirect();
echo                 testBackendAPI();
echo                 testFrontendIntegration();
echo                 testPostMessage();
echo             }, 1000);
echo         });
echo     ^</script^>
echo ^</body^>
echo ^</html^>
) > test_integration.html

echo [INFO] Archivo de prueba creado: test_integration.html
echo.
echo [STEP 4] Abriendo interfaz de prueba...
echo Abriendo http://localhost:5173/test_integration.html
echo.
start http://localhost:5173/test_integration.html

echo.
echo [STEP 5] Esperando resultados de la prueba...
echo.
echo La interfaz de prueba se abrirá en su navegador.
echo Verifique los resultados de cada test:
echo.
echo Tests que se ejecutarán automáticamente:
echo   1. Test Motor ICC Directo - Acceso al motor HTML
echo   2. Test Backend API - Conexión a /icc endpoint
echo   3. Test Frontend Integration - Componente ICCModule
echo   4. Test postMessage - Comunicación bidireccional
echo.
echo Si todos los tests muestran [OK], la integración está funcionando correctamente.
echo Si algún test muestra [FAIL] o [ERROR], revise la configuración.
echo.
echo Presione cualquier tecla para continuar...
pause >nul

echo.
echo [STEP 6] Limpieza...
del test_integration.html >nul 2>&1

echo.
echo ====================================================
echo  VERIFICACIÓN COMPLETADA
echo ====================================================
echo.
echo Resumen de la integración verificada:
echo.
echo Frontend React (5173) ← → Motor ICC HTML
echo        ↓                      ↓
echo   ICCModule              postMessage
echo   Componente              Comunicación
echo        ↓                      ↓
echo   Carga de               Cálculos ICC
echo   SystemModel            en tiempo real
echo        ↓                      ↓
echo   Resultados             Respuestas JSON
echo   UI React               Motor JavaScript
echo.
echo Si los tests fueron exitosos, la integración está completa.
echo Si hubo errores, revise los logs y la configuración.
echo.
pause
