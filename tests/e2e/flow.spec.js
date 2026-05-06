// tests/e2e/flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Flujo End-to-End Completo icore-icc', () => {

    test('Crear diagrama → Calcular ICC → Generar PDF', async ({ page }) => {
        test.setTimeout(120_000);

        console.log('🚀 Iniciando prueba E2E...');

        // 1. Abrir aplicación
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('heading', { name: /ICC Calculator/i })).toBeVisible({
            timeout: 20000
        });

        console.log('✅ Página cargada correctamente');

        // Esperar botones del sidebar
        await expect(page.locator('button:has-text("Transformador")')).toBeVisible({
            timeout: 30000
        });

        // === LIMPIEZA ===
        await page.getByRole('button', { name: /Eliminar|Limpiar|Clear/i }).click().catch(() => { });
        await page.waitForTimeout(1200);

        // 2. Agregar Transformador
        await page.locator('button:has-text("Transformador")').first().click();
        await page.locator('.react-flow__pane').click({ position: { x: 250, y: 180 } });

        // 3. Agregar Breaker
        await page.locator('button:has-text("Breaker")').first().click();
        await page.locator('.react-flow__pane').click({ position: { x: 580, y: 180 } });

        console.log('✅ Componentes agregados al canvas');

        // 4. Conectar nodos
        const sourceNode = page.locator('.react-flow__node')
            .filter({ hasText: /Transformador|Transformer/i }).first();

        const targetNode = page.locator('.react-flow__node')
            .filter({ hasText: /Breaker/i }).first();

        const sourceHandle = sourceNode.locator('.react-flow__handle').first();
        const targetHandle = targetNode.locator('.react-flow__handle').first();

        await sourceHandle.dragTo(targetHandle);

        console.log('✅ Nodos conectados');

        // 5. Calcular ICC
        await page.getByRole('button', { name: /Calcular ICC/i }).click();

        await expect(page.getByText(/Isc|kA|Corriente|resultado/i, { exact: false }))
            .toBeVisible({ timeout: 35000 });

        console.log('✅ Cálculo de ICC completado');

        // 6. Generar PDF
        await page.getByRole('button', { name: /Generar PDF|PDF/i }).click();

        console.log('🎉 Flujo E2E completado exitosamente');
    });
});