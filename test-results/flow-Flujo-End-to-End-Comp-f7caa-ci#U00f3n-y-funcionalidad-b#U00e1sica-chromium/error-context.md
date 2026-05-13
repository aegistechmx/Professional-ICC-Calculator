# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.js >> Flujo End-to-End Completo icore-icc >> Verificar aplicación y funcionalidad básica
- Location: tests\e2e\flow.spec.js:6:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.count: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - heading "Componentes" [level=2] [ref=e5]
    - generic [ref=e6]:
      - generic [ref=e8]: Transformador
      - generic [ref=e10]: Generador
      - generic [ref=e12]: Breaker
      - generic [ref=e14]: Tablero
      - generic [ref=e16]: Motor
      - generic [ref=e18]: Carga
      - generic [ref=e19]:
        - generic [ref=e20]: "||"
        - generic [ref=e21]: Banco de Capacitores
      - generic [ref=e22]:
        - generic [ref=e23]: ATS
        - generic [ref=e24]: Transferencia Automática
    - paragraph [ref=e26]: Arrastra componentes al canvas para construir tu sistema eléctrico
  - generic [ref=e27]:
    - generic [ref=e28]:
      - generic [ref=e30]:
        - generic [ref=e32]:
          - generic:
            - img
        - img "React Flow mini map" [ref=e34]
        - generic [ref=e35]:
          - button "zoom in" [ref=e36] [cursor=pointer]:
            - img [ref=e37]
          - button "zoom out" [ref=e39] [cursor=pointer]:
            - img [ref=e40]
          - button "fit view" [ref=e42] [cursor=pointer]:
            - img [ref=e43]
          - button "toggle interactivity" [ref=e45] [cursor=pointer]:
            - img [ref=e46]
        - img [ref=e48]
        - link "React Flow attribution" [ref=e51] [cursor=pointer]:
          - /url: https://reactflow.dev
          - text: React Flow
      - generic [ref=e53]:
        - heading "Propiedades" [level=3] [ref=e54]
        - paragraph [ref=e55]: Selecciona un elemento o un cable para ver sus propiedades
      - button "Exportar a Calculadora" [ref=e57] [cursor=pointer]
    - generic [ref=e59]:
      - heading "⚡ ICC Calculator" [level=1] [ref=e60]
      - generic [ref=e61]:
        - button "Modo Edición" [ref=e62] [cursor=pointer]
        - button "Modo Simulación" [ref=e63] [cursor=pointer]
      - generic [ref=e64]:
        - button "🟢 Normal" [ref=e65] [cursor=pointer]
        - button "🔴 Emergencia" [ref=e66] [cursor=pointer]
      - generic [ref=e67]:
        - button "🗑️ Eliminar" [ref=e68] [cursor=pointer]
        - button "📁 Abrir" [ref=e69] [cursor=pointer]
        - button "💾 Guardar" [ref=e70] [cursor=pointer]
        - button "🔄 Sin sincronizar" [ref=e71] [cursor=pointer]:
          - text: 🔄
          - generic [ref=e72]: Sin sincronizar
        - button "Módulo Cortocircuito (React)" [ref=e73] [cursor=pointer]
        - button "Módulo ICC (iframe)" [ref=e74] [cursor=pointer]
        - button "Calcular ICC" [ref=e75] [cursor=pointer]
        - button "Cortocircuito" [ref=e76] [cursor=pointer]
        - button "Generar PDF" [ref=e77] [cursor=pointer]
```

# Test source

```ts
  1   | // tests/e2e/flow.spec.js
  2   | const { test, expect } = require('@playwright/test');
  3   | 
  4   | test.describe('Flujo End-to-End Completo icore-icc', () => {
  5   | 
  6   |     test('Verificar aplicación y funcionalidad básica', async ({ page }) => {
  7   |         test.setTimeout(120_000); // 2 minutos
  8   | 
  9   |         console.log('🚀 Iniciando prueba E2E...');
  10  | 
  11  |         // 1. Abrir aplicación
  12  |         await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  13  |         await expect(page.getByRole('heading', { name: /ICC Calculator/i })).toBeVisible({ timeout: 20000 });
  14  |         console.log('✅ Página cargada');
  15  | 
  16  |         // 2. Esperar a que la aplicación esté completamente lista
  17  |         await page.waitForTimeout(3000);
  18  | 
  19  |         // 3. Verificar que los componentes del sidebar estén disponibles
  20  |         console.log('🔍 Verificando componentes del sidebar...');
  21  | 
  22  |         // Buscar componentes Transformador y Breaker
  23  |         const transformerExists = await page.locator('*:has-text("Transformador")').isVisible({ timeout: 10000 }).catch(() => false);
  24  |         const breakerExists = await page.locator('*:has-text("Breaker")').isVisible({ timeout: 10000 }).catch(() => false);
  25  | 
  26  |         if (transformerExists && breakerExists) {
  27  |             console.log('✅ Componentes del sidebar encontrados');
  28  |         } else {
  29  |             console.log('⚠️ Algunos componentes no se encontraron, pero continuando...');
  30  |         }
  31  | 
  32  |         // 4. Verificar que el canvas de React Flow esté presente
  33  |         console.log('🔍 Verificando canvas...');
  34  |         const canvasExists = await page.locator('.react-flow__pane').isVisible({ timeout: 5000 }).catch(() => false);
  35  | 
  36  |         if (canvasExists) {
  37  |             console.log('✅ Canvas de React Flow encontrado');
  38  |         } else {
  39  |             console.log('⚠️ Canvas no encontrado, pero continuando...');
  40  |         }
  41  | 
  42  |         // 5. Intentar agregar componentes (sin forzar)
  43  |         console.log('➕ Intentando agregar componentes...');
  44  | 
  45  |         try {
  46  |             // Intentar con Transformador
  47  |             const transformerComponent = page.locator('*:has-text("Transformador")').first();
  48  |             await transformerComponent.click({ timeout: 5000 });
  49  |             await page.waitForTimeout(500);
  50  |             await page.locator('.react-flow__pane').click({ position: { x: 250, y: 150 } });
  51  |             await page.waitForTimeout(1000);
  52  |             console.log('✅ Transformador agregado');
  53  |         } catch (e) {
  54  |             console.log('⚠️ No se pudo agregar Transformador:', e.message);
  55  |         }
  56  | 
  57  |         try {
  58  |             // Intentar con Breaker
  59  |             const breakerComponent = page.locator('*:has-text("Breaker")').first();
  60  |             await breakerComponent.click({ timeout: 5000 });
  61  |             await page.waitForTimeout(500);
  62  |             await page.locator('.react-flow__pane').click({ position: { x: 500, y: 150 } });
  63  |             await page.waitForTimeout(1000);
  64  |             console.log('✅ Breaker agregado');
  65  |         } catch (e) {
  66  |             console.log('⚠️ No se pudo agregar Breaker:', e.message);
  67  |         }
  68  | 
  69  |         // 6. Verificar si se crearon nodos
  70  |         console.log('� Verificando nodos creados...');
> 71  |         const nodeCount = await page.locator('.react-flow__node').count();
      |                                                                   ^ Error: locator.count: Target page, context or browser has been closed
  72  |         console.log(`📊 Nodos encontrados: ${nodeCount}`);
  73  | 
  74  |         // 7. Intentar calcular ICC (si hay nodos o no)
  75  |         console.log('⚡ Intentando calcular ICC...');
  76  |         try {
  77  |             const calculateButton = page.locator('button:has-text("Calcular ICC"), button:has-text("Calcular")').first();
  78  |             await calculateButton.click({ timeout: 5000 });
  79  |             await page.waitForTimeout(3000);
  80  |             console.log('✅ Botón de calcular clickeado');
  81  |         } catch (e) {
  82  |             console.log('⚠️ No se encontró botón de calcular:', e.message);
  83  |         }
  84  | 
  85  |         // 8. Verificar resultados
  86  |         console.log('📊 Verificando resultados...');
  87  |         try {
  88  |             const hasResults = await page.locator('*:has-text(/Isc|kA|Corriente|resultado/)').isVisible({ timeout: 5000 }).catch(() => false);
  89  |             if (hasResults) {
  90  |                 console.log('✅ Resultados encontrados');
  91  |             } else {
  92  |                 console.log('⚠️ No se encontraron resultados visibles');
  93  |             }
  94  |         } catch (e) {
  95  |             console.log('⚠️ Error verificando resultados:', e.message);
  96  |         }
  97  | 
  98  |         // 9. Intentar generar PDF
  99  |         console.log('📄 Intentando generar PDF...');
  100 |         try {
  101 |             const pdfButton = page.locator('button:has-text("Generar PDF"), button:has-text("PDF")').first();
  102 |             await pdfButton.click({ timeout: 3000 });
  103 |             console.log('✅ Botón PDF clickeado');
  104 |         } catch (e) {
  105 |             console.log('⚠️ No se encontró botón PDF:', e.message);
  106 |         }
  107 | 
  108 |         console.log('🎉 Prueba E2E completada');
  109 | 
  110 |         // Captura final
  111 |         try {
  112 |             await page.screenshot({ path: 'test-final.png' });
  113 |             console.log('📸 Captura de pantalla guardada');
  114 |         } catch (e) {
  115 |             console.log('📸 No se pudo capturar pantalla final');
  116 |         }
  117 |     });
  118 | });
```