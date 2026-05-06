/**
 * main.js - Entry point con ES6 modules
 * Inicializa logo y conecta con motor ICC
 */

// Importar componente del logo (ruta desde cortocircuito/cortocircuito/js/)
import { renderIcoreLogo } from '../../js/components/IcoreLogo.js';

console.log('[Main] Inicializando aplicación...');

// 🎯 Inicializar logo en estado normal
try {
    renderIcoreLogo('logo', false);
    console.log('[Main] Logo inicializado correctamente');
} catch (e) {
    console.error('[Main] Error inicializando logo:', e);
}

// 🔥 Prueba de animación después de 3 segundos (solo para verificar)
setTimeout(() => {
    console.log('[Main] Activando animación de prueba...');
    renderIcoreLogo('logo', true);

    // Volver a normal después de 2 segundos
    setTimeout(() => {
        renderIcoreLogo('logo', false);
        console.log('[Main] Logo restaurado a estado normal');
    }, 2000);
}, 3000);

// Exportar para uso global
window.renderIcoreLogo = renderIcoreLogo;
