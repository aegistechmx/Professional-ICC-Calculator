/**
 * IcoreLogo.js - Componente de Logo Animado (ES6 Module)
 * Renderiza logo eléctrico con animación de falla cuando active=true
 */

export function renderIcoreLogo(containerId, active = false) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn('[IcoreLogo] Contenedor no encontrado:', containerId);
    return;
  }

  container.innerHTML = `
    <div class="logo-container ${active ? "active" : ""}">
      <svg viewBox="0 0 200 200" class="logo-svg">
        <circle cx="100" cy="100" r="80" class="ring"/>
        <line x1="100" y1="40" x2="100" y2="160" class="circuit"/>
        <line x1="60" y1="100" x2="140" y2="100" class="circuit"/>
        <polygon points="110,40 90,100 115,100 85,160" class="bolt"/>
      </svg>
    </div>
  `;
}

// También exportar como default para compatibilidad
export default renderIcoreLogo;