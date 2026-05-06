# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.js >> Flujo End-to-End Completo icore-icc >> Crear diagrama → Calcular ICC → Generar PDF
- Location: tests\e2e\flow.spec.js:6:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Transformador")')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('button:has-text("Transformador")')

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
        - button "Generar PDF" [active] [ref=e77] [cursor=pointer]
```

# Test source

```ts
  1  | // tests/e2e/flow.spec.js
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | test.describe('Flujo End-to-End Completo icore-icc', () => {
  5  | 
  6  |     test('Crear diagrama → Calcular ICC → Generar PDF', async ({ page }) => {
  7  |         test.setTimeout(120_000);
  8  | 
  9  |         console.log('🚀 Iniciando prueba E2E...');
  10 | 
  11 |         // 1. Abrir aplicación
  12 |         await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  13 | 
  14 |         await expect(page.getByRole('heading', { name: /ICC Calculator/i })).toBeVisible({
  15 |             timeout: 20000
  16 |         });
  17 | 
  18 |         console.log('✅ Página cargada correctamente');
  19 | 
  20 |         // Esperar botones del sidebar
> 21 |         await expect(page.locator('button:has-text("Transformador")')).toBeVisible({
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  22 |             timeout: 30000
  23 |         });
  24 | 
  25 |         // === LIMPIEZA ===
  26 |         await page.getByRole('button', { name: /Eliminar|Limpiar|Clear/i }).click().catch(() => { });
  27 |         await page.waitForTimeout(1200);
  28 | 
  29 |         // 2. Agregar Transformador
  30 |         await page.locator('button:has-text("Transformador")').first().click();
  31 |         await page.locator('.react-flow__pane').click({ position: { x: 250, y: 180 } });
  32 | 
  33 |         // 3. Agregar Breaker
  34 |         await page.locator('button:has-text("Breaker")').first().click();
  35 |         await page.locator('.react-flow__pane').click({ position: { x: 580, y: 180 } });
  36 | 
  37 |         console.log('✅ Componentes agregados al canvas');
  38 | 
  39 |         // 4. Conectar nodos
  40 |         const sourceNode = page.locator('.react-flow__node')
  41 |             .filter({ hasText: /Transformador|Transformer/i }).first();
  42 | 
  43 |         const targetNode = page.locator('.react-flow__node')
  44 |             .filter({ hasText: /Breaker/i }).first();
  45 | 
  46 |         const sourceHandle = sourceNode.locator('.react-flow__handle').first();
  47 |         const targetHandle = targetNode.locator('.react-flow__handle').first();
  48 | 
  49 |         await sourceHandle.dragTo(targetHandle);
  50 | 
  51 |         console.log('✅ Nodos conectados');
  52 | 
  53 |         // 5. Calcular ICC
  54 |         await page.getByRole('button', { name: /Calcular ICC/i }).click();
  55 | 
  56 |         await expect(page.getByText(/Isc|kA|Corriente|resultado/i, { exact: false }))
  57 |             .toBeVisible({ timeout: 35000 });
  58 | 
  59 |         console.log('✅ Cálculo de ICC completado');
  60 | 
  61 |         // 6. Generar PDF
  62 |         await page.getByRole('button', { name: /Generar PDF|PDF/i }).click();
  63 | 
  64 |         console.log('🎉 Flujo E2E completado exitosamente');
  65 |     });
  66 | });
```