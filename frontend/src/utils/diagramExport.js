/**
 * utils/diagramExport.js - Exportación de diagramas a SVG/PDF
 * Formato profesional tipo ingeniería con normas NOM
 */

/* eslint-disable no-console */
/**
 * Exportar diagrama a SVG
 */
export function exportToSVG(svgElement, filename = 'diagrama-unifilar') {
  if (!svgElement) {
    console.error('[EXPORT] No se encontró elemento SVG');
    return false;
  }

  try {
    // Clonar el SVG para modificarlo
    const svgClone = svgElement.cloneNode(true);

    // Añadir atributos necesarios
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Convertir a string
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // Crear blob
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('[EXPORT] Error al exportar SVG:', error);
    return false;
  }
}

/**
 * Exportar diagrama a PDF con formato ingeniería
 */
export function exportToPDF(nodes, edges, projectInfo, filename = 'plano-ingenieria') {
  // Esta función requiere jsPDF
  // Por ahora, exportamos a SVG que puede convertirse a PDF
  console.warn('[EXPORT] jsPDF no está instalado. Exportando a SVG en su lugar.');
  return exportToSVG(document.querySelector('.react-flow__viewport svg'), filename);
}

/**
 * Generar tabla de cargas para exportación
 */
export function generateLoadTable(nodes, edges) {
  const loads = nodes.filter(n => n.type === 'load' || n.type === 'motor');

  return loads.map(node => {
    const incomingEdges = edges.filter(e => e.target === node.id);
    const totalCurrent = incomingEdges.reduce((sum, edge) => {
      return sum + (edge.data?.current || 0);
    }, 0);

    return {
      id: node.id,
      label: node.data?.label || node.id,
      type: node.type,
      current: node.data?.I_carga || totalCurrent,
      voltage: node.data?.voltaje || '-',
      power: node.data?.potencia || '-',
      protection: node.data?.protection?.tipo || '-'
    };
  });
}

/**
 * Generar tabla de protecciones para exportación
 */
export function generateProtectionTable(nodes) {
  const protections = nodes.filter(n => n.type === 'breaker' || n.data?.protection);

  return protections.map(node => {
    const protection = node.data?.protection || node.data;

    return {
      id: node.id,
      label: node.data?.label || node.id,
      type: protection?.tipo || 'termomagnético',
      In: protection?.In || '-',
      Icu: protection?.Icu || '-',
      Isc: protection?.Isc || '-',
      conductor: node.data?.conductor?.calibre || '-'
    };
  });
}

/**
 * Generar encabezado de plano tipo ingeniería
 */
export function generatePlanHeader(projectInfo) {
  const {
    projectName = 'Proyecto Eléctrico',
    client = 'Cliente',
    date = new Date().toLocaleDateString('es-MX'),
    scale = '1:100',
    norm = 'NOM-001-SEDE-2012',
    engineer = 'Ing. Responsable',
    revision = 'A'
  } = projectInfo || {};

  return `
    <div class="plan-header">
      <div class="plan-title">${projectName}</div>
      <div class="plan-info">
        <div class="info-row">
          <span>Cliente:</span>
          <span>${client}</span>
        </div>
        <div class="info-row">
          <span>Fecha:</span>
          <span>${date}</span>
        </div>
        <div class="info-row">
          <span>Escala:</span>
          <span>${scale}</span>
        </div>
        <div class="info-row">
          <span>Norma:</span>
          <span>${norm}</span>
        </div>
        <div class="info-row">
          <span>Ingeniero:</span>
          <span>${engineer}</span>
        </div>
        <div class="info-row">
          <span>Revisión:</span>
          <span>${revision}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generar leyenda de símbolos
 */
export function generateLegend() {
  const symbols = [
    { name: 'Fuente', symbol: '⚡' },
    { name: 'Transformador', symbol: '🔄' },
    { name: 'Breaker', symbol: '⃤' },
    { name: 'Panel', symbol: '⬛' },
    { name: 'Carga/Motor', symbol: 'Ⓜ' }
  ];

  return `
    <div class="plan-legend">
      <h4>Leyenda de Símbolos</h4>
      ${symbols.map(s => `
        <div class="legend-item">
          <span class="legend-symbol">${s.symbol}</span>
          <span class="legend-name">${s.name}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generar notas técnicas
 */
export function generateTechnicalNotes() {
  return `
    <div class="plan-notes">
      <h4>Notas Técnicas</h4>
      <ul>
        <li>Todas las dimensiones están en milímetros salvo indicación contraria</li>
        <li>Los cálculos se basan en la norma NOM-001-SEDE-2012</li>
        <li>Los conductores deben cumplir con los requisitos de ampacidad</li>
        <li>La coordinación de protecciones debe verificarse en sitio</li>
        <li>Este plano es para referencia únicamente</li>
      </ul>
    </div>
  `;
}

/**
 * Exportar diagrama completo con encabezado, tablas y notas
 */
export function exportCompletePlan(svgElement, nodes, edges, projectInfo, filename = 'plano-completo') {
  if (!svgElement) {
    console.error('[EXPORT] No se encontró elemento SVG');
    return false;
  }

  try {
    // Generar contenido adicional
    const header = generatePlanHeader(projectInfo);
    const legend = generateLegend();
    const notes = generateTechnicalNotes();
    const loadTable = generateLoadTable(nodes, edges);
    const protectionTable = generateProtectionTable(nodes);

    // Crear HTML completo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${projectInfo?.projectName || 'Plano Eléctrico'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .plan-header {
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
          }
          .plan-title {
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .plan-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            font-size: 12px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
          }
          .diagram-container {
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
          }
          .tables-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .plan-legend, .plan-notes {
            border: 1px solid #000;
            padding: 15px;
            margin-bottom: 20px;
          }
          .plan-legend h4, .plan-notes h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
          }
          .legend-item {
            display: inline-block;
            margin-right: 20px;
            font-size: 12px;
          }
          .legend-symbol {
            font-size: 16px;
            margin-right: 5px;
          }
          .plan-notes ul {
            margin: 0;
            padding-left: 20px;
            font-size: 11px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${header}
        <div class="diagram-container">
          ${svgElement.outerHTML}
        </div>
        <div class="tables-container">
          <div>
            <h3>Tabla de Cargas</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Etiqueta</th>
                  <th>Tipo</th>
                  <th>Corriente (A)</th>
                  <th>Voltaje (V)</th>
                  <th>Potencia</th>
                </tr>
              </thead>
              <tbody>
                ${loadTable.map(row => `
                  <tr>
                    <td>${row.id}</td>
                    <td>${row.label}</td>
                    <td>${row.type}</td>
                    <td>${row.current}</td>
                    <td>${row.voltage}</td>
                    <td>${row.power}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Tabla de Protecciones</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Etiqueta</th>
                  <th>Tipo</th>
                  <th>In (A)</th>
                  <th>Icu (kA)</th>
                  <th>Conductor</th>
                </tr>
              </thead>
              <tbody>
                ${protectionTable.map(row => `
                  <tr>
                    <td>${row.id}</td>
                    <td>${row.label}</td>
                    <td>${row.type}</td>
                    <td>${row.In}</td>
                    <td>${row.Icu}</td>
                    <td>${row.conductor}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ${legend}
        ${notes}
      </body>
      </html>
    `;

    // Crear blob y descargar
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('[EXPORT] Error al exportar plano completo:', error);
    return false;
  }
}

// Exportar todo
export default {
  exportToSVG,
  exportToPDF,
  generateLoadTable,
  generateProtectionTable,
  generatePlanHeader,
  generateLegend,
  generateTechnicalNotes,
  exportCompletePlan
};
