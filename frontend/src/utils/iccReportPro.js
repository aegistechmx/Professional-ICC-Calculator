
export async function generarReporteICCPro({
  nodes = [],
  edges = [],
  result = {},
  systemParams = {},
  project = {},
<<<<<<< HEAD
}) {
  console.log('Reporte ICC PRO');

  const payload = {
    nodes,
    edges,
    result,
    systemParams,
    project,
  };

  const response = await fetch('/api/reporte/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Error generando PDF');
  }

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = 'reporte_icc.pdf';

  document.body.appendChild(a);

  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
}
=======
  apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, ''),
}) {
  // Función interna para prevenir errores de referencia circular
  const toSafeObject = (obj) => {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, val) => {
      if (val instanceof HTMLElement || typeof val === 'function') return undefined;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    }));
  };

  const response = await fetch(`${apiBase}/reporte/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
// En lugar de enviar 'data' directamente
// const payload = toSafeJSON(data); 

// Usa este mapeo explícito (mucho más rápido y seguro)
const payload = {
  tension: Number(document.getElementById('tension')?.value || 220),
  tipo: document.getElementById('tipoSistema')?.value || 'trifasico',
  primario: Number(document.getElementById('vPrimario')?.value || 13800),
  secundario: Number(document.getElementById('vSecundario')?.value || 220),
  tempAmbiente: Number(document.getElementById('tempAmbiente')?.value || 30),
  nConductores: Number(document.getElementById('nConductores')?.value || 3),
  proyecto: {
    nombre: document.getElementById('nombreProyecto')?.value || 'Sin nombre',
    empresa: 'ICC Software SaaS'
  }
};

// Ahora sí, el stringify nunca fallará
console.log("Enviando datos seguros:", JSON.stringify(payload));
/**
 * Elimina referencias circulares, funciones y elementos del DOM 
 * para permitir una serialización limpia a JSON.
 */
function toSafeJSON(value) {
  const seen = new WeakSet();

  return JSON.parse(JSON.stringify(value, (key, val) => {
    // Ignorar tipos no serializables o problemáticos
    if (typeof val === 'function') return undefined;
    if (val instanceof HTMLElement) return undefined;
    if (val instanceof Event) return undefined;

    // Manejo de referencias circulares
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }

    return val;
  }));
}
import { detectCross } from './utils/parametricTCCEngine';
import { generarReporteICCPro } from './utils/iccReportPro';

// Supongamos que tienes tus curvas calculadas
const coordAnalysis = detectCross(curveUpstream, curveDownstream);

const resultToReport = {
  ...iccResults, // Resultados de cortocircuito (isc_3f, etc)
  crucesTCC: coordAnalysis.crosses,
  estadoCoordinacion: coordAnalysis.hasCross ? 'CRUCE_DETECTADO' : 'COORDINADO',
  // Si hay cruces críticos, puedes forzar un estado de error en el reporte
  estado: coordAnalysis.criticalCrosses.length > 0 ? 'ERROR' : 'OK'
};

await generarReporteICCPro({
  nodes,
  edges,
  result: resultToReport,
  systemParams,
  project: { nombre: 'Estudio de Coordinación Pro' }
});
const calculationResult = {
  // ... otros resultados de ICC ...
  
  // 1. Array de cruces detectados (el reporte usa .length de este array)
  crucesTCC: crossesArray, // Array de objetos con { current, time, type, etc. }
  
  // 2. Estado textual de la coordinación
  estadoCoordinacion: 'COORDINADO', // O 'FALLA_SELECTIVIDAD', 'REVISAR', etc.
  
  // 3. Breakers que participaron en la coordinación (opcional)
  breakersSeleccionados: [
    { id: 'CB-1', pickup: 100, instantaneous: 1000, label: 'Principal' },
    // ...
  ],
  
  // Estructura alternativa (fallback que también soporta el reporte):
  coordinacionReal: {
    cruces: crossesArray.length,
    estado: 'BLOQUEADO_NOM' // Útil si quieres activar alertas de bloqueo
  }
};
import { generarReporteICCPro } from './utils/iccReportPro';

// Dentro de tu componente de React o función de manejo de clics:
const handleDownloadPDF = async () => {
  try {
    await generarReporteICCPro({
      nodes,                  // Array de nodos del editor (React Flow)
      edges,                  // Array de conexiones
      result: calculationResult, // Resultado del motor de cálculo
      systemParams,           // Parámetros globales (tensión, frecuencia, etc)
      project: {
        nombre: 'Proyecto desde Editor Visual',
        empresa: 'ICC Software SaaS',
      },
    });
  } catch (error) {
    console.error("Error al generar el reporte:", error);
    // Aquí puedes disparar un toast de error si tienes uno configurado
  }
};
    body: JSON.stringify(toSafeObject({
      parametros_icc: systemParams,
      systemModel: result?.systemModel,
      nodes,
      edges,
      results: result,
      systemMode: systemParams?.systemMode || result?.systemMode || 'normal',
      proyecto: { nombre: project?.nombre || 'Proyecto desde Editor Visual' },
      empresa: { nombre: project?.empresa || 'ICC Software SaaS' },
      motores: {
        lista: nodes
          .filter(node => node.type === 'motor')
          .map(node => ({ id: node.id, ...(node.data?.parameters || {}) })),
      },
      dispositivos: nodes
        .filter(node => node.type === 'breaker')
        .map(node => ({ id: node.id, ...(node.data?.parameters || {}) })),
    }),
  })

  if (!response.ok) {
    let message = 'Error al generar reporte ICC Pro'
    try {
      const error = await response.json()
      message = error?.error || error?.message || message
    } catch (parseError) {
      message = (await response.text()) || message
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  descargarBlob(blob, `${safeName(project?.nombre || 'reporte_icc_pro')}.pdf`)
}

function descargarBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function buildReportHTML({ nodes = [], edges = [], result = {}, systemParams = {}, project = {} }) {
  const now = new Date().toLocaleString()
  const estado = deriveEstado(result)
  const nodeResults = result?.nodeResults || result?.resultadosNodos || []
  const detalleImpedancias = result?.detalleImpedancias || result?.impedancias || []
  const nom = result?.validacionesNOM || result?.nom || []
  const acciones = result?.accionesCorreccion || result?.accionesSugeridas || []
  const breakers = extractBreakers(nodes, result)

  return `
    <style>${REPORT_CSS}</style>

    <header class="report-header">
      <div>
        <div class="eyebrow">ICORE - ICC Calculator</div>
        <h1>Reporte Técnico de Cortocircuito y Coordinación</h1>
        <p>NOM-001-SEDE-2012 · Ampacidad · Protecciones · Sensibilidad · TCC</p>
      </div>
      <div class="status ${estado.className}">
        <strong>${estado.label}</strong>
        <span>${estado.subtitle}</span>
      </div>
    </header>

    <section class="report-meta avoid-break">
      <div><strong>Generado:</strong> ${now}</div>
      <div><strong>Proyecto:</strong> ${esc(project?.nombre || 'Proyecto desde Editor Visual')}</div>
      <div><strong>Empresa:</strong> ${esc(project?.empresa || 'ICC Software SaaS')}</div>
      <div><strong>Modo:</strong> ${prettyMode(systemParams?.systemMode || result?.systemMode || 'normal')}</div>
      <div><strong>Nodos:</strong> ${nodes.length}</div>
      <div><strong>Conexiones:</strong> ${edges.length}</div>
    </section>

    <section class="report-grid avoid-break">
      ${metric('Tensión', `${systemParams?.tension || systemParams?.voltage || '—'} V`)}
      ${metric('Sistema', systemParams?.systemType || systemParams?.tipo || '—')}
      ${metric('Temperatura', `${systemParams?.tempAmbiente ?? '—'} °C`)}
      ${metric('CCC', `${systemParams?.nConductores ?? '—'}`)}
      ${metric('Violaciones NOM', countViolaciones(result))}
      ${metric('Cruces TCC', countCruces(result))}
    </section>

    <section class="report-card avoid-break">
      <h2>1. Resumen ejecutivo</h2>
      ${buildExecutiveSummary(result)}
    </section>

    <section class="report-card">
      <h2>2. Diagrama unifilar real</h2>
      <p class="muted">Reconstruido desde el grafo visual: nodos, conexiones, calibre, longitud e ICC por punto.</p>
      ${buildOneLineSVG(nodes, edges, nodeResults, systemParams)}
    </section>

    <section class="report-card">
      <h2>3. Curvas TCC / Coordinación</h2>
      <p class="muted">Gráfica log-log orientativa con pickups, retardos e instantáneos disponibles.</p>
      ${buildTccSVG(nodes, result)}
      ${buildTccSummary(result)}
    </section>

    <section class="report-card">
      <h2>4. Parámetros del sistema</h2>
      ${objectTable(systemParams)}
    </section>

    <section class="report-card">
      <h2>5. Resultados de cortocircuito por punto</h2>
      ${nodeResultsTable(nodes, nodeResults, systemParams)}
    </section>

    <section class="report-card">
      <h2>6. Alimentadores y conexiones</h2>
      ${edgesTable(edges, nodes)}
    </section>

    <section class="report-card">
      <h2>7. Protecciones seleccionadas</h2>
      ${breakersTable(breakers)}
    </section>

    <section class="report-card">
      <h2>8. Validaciones NOM-001-SEDE-2012</h2>
      ${nomTable(nom, result)}
    </section>

    <section class="report-card">
      <h2>9. Detalle de impedancias</h2>
      ${impedanceTable(detalleImpedancias)}
    </section>

    <section class="report-card">
      <h2>10. Acciones sugeridas</h2>
      ${actionsTable(acciones, result)}
    </section>

    <footer class="report-footer">
      Herramienta orientativa para ingeniería eléctrica. Verifique con un profesional certificado.
      Art. 110.9, 110.14, 230.95 y 310 — NOM-001-SEDE-2012.
    </footer>
  `
}

function buildExecutiveSummary(result) {
  const errors = []
  const warnings = []
  const violaciones = result?.violacionesNOM || result?.validacionInteligente?.violacionesNOM || []
  const tccCruces = countCruces(result)

  if (Array.isArray(violaciones) && violaciones.length) errors.push(`${violaciones.length} violación(es) NOM detectadas.`)
  if (tccCruces > 0) warnings.push(`${tccCruces} cruce(s) TCC o pares no selectivos detectados.`)
  if (result?.estadoCentral === 'BLOQUEADO_NOM' || result?.coordinacionReal?.estado === 'BLOQUEADO_NOM') {
    errors.push('Coordinación bloqueada hasta resolver ampacidad/terminal.')
  }

  const ok = errors.length === 0
  return `
    <div class="summary ${ok ? 'summary-ok' : 'summary-error'}">
      <h3>${ok ? 'Sistema funcional' : 'Sistema con condiciones críticas'}</h3>
      <ul>
        ${(errors.length ? errors : ['No se detectaron fallas críticas en los criterios revisados.']).map(x => `<li>${esc(x)}</li>`).join('')}
        ${warnings.map(x => `<li class="warn">${esc(x)}</li>`).join('')}
      </ul>
    </div>
  `
}

function buildOneLineSVG(nodes, edges, nodeResults, systemParams) {
  if (!nodes.length) return `<div class="empty">No hay nodos para dibujar.</div>`

  const nodeW = 125, nodeH = 60, gapX = 160, gapY = 105
  const levels = computeLevels(nodes, edges)
  const rowsByLevel = {}
  nodes.forEach(n => {
    const level = levels[n.id] ?? 0
    rowsByLevel[level] = rowsByLevel[level] || []
    rowsByLevel[level].push(n)
  })

  const positions = {}
  Object.entries(rowsByLevel).forEach(([levelStr, levelNodes]) => {
    const level = Number(levelStr)
    levelNodes.forEach((n, idx) => {
      positions[n.id] = { x: 40 + level * gapX, y: 45 + idx * gapY }
    })
  })

  const maxLevel = Math.max(...Object.values(levels), 0)
  const maxRows = Math.max(...Object.values(rowsByLevel).map(a => a.length), 1)
  const svgW = Math.max(980, 120 + (maxLevel + 1) * gapX)
  const svgH = Math.max(270, 90 + maxRows * gapY)

  const edgeLines = edges.map(e => {
    const s = positions[e.source], t = positions[e.target]
    if (!s || !t) return ''
    const x1 = s.x + nodeW, y1 = s.y + nodeH / 2, x2 = t.x, y2 = t.y + nodeH / 2, mid = (x1 + x2) / 2
    const d = e.data || e
    return `
      <path d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" class="sl-edge"/>
      <text x="${mid}" y="${Math.min(y1,y2)-6}" class="sl-edge-label">${esc(d.calibre || '')} ${d.longitud ? `· ${d.longitud}m` : ''}</text>
    `
  }).join('')

  const nodeBoxes = nodes.map((n, idx) => {
    const p = positions[n.id]
    const r = findNodeResult(n, nodeResults)
    const icon = iconForType(n.type || n.data?.type)
    const status = deriveNodeStatus(n, r)
    const v = valueOr(n.data?.voltage, r?.voltage, systemParams?.tension, '—')
    const icc = valueOr(r?.Isc_kA, r?.iccKA, r?.Isc, n.data?.icc, '—')
    const label = n.data?.label || n.label || n.type || `P${idx}`
    return `
      <g transform="translate(${p.x}, ${p.y})">
        <rect width="${nodeW}" height="${nodeH}" rx="10" class="sl-node ${status.className}"/>
        <text x="10" y="18" class="sl-icon">${icon}</text>
        <text x="40" y="18" class="sl-title">${esc(label)}</text>
        <text x="10" y="38" class="sl-small">V=${esc(String(v))}V · ICC=${formatIcc(icc)}</text>
        <text x="10" y="52" class="sl-small">${esc(status.label)}</text>
      </g>
    `
  }).join('')

  return `
    <div class="svg-scroll">
      <svg viewBox="0 0 ${svgW} ${svgH}" class="one-line-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#334155"/>
          </marker>
        </defs>
        ${edgeLines}
        ${nodeBoxes}
      </svg>
    </div>
  `
}

function buildTccSVG(nodes, result) {
  const breakers = extractBreakers(nodes, result).slice(0, 12)
  if (!breakers.length) return `<div class="empty">No hay protecciones suficientes para graficar TCC.</div>`

  const w = 920, h = 420
  const left = 70, top = 25, plotW = 800, plotH = 330
  const minI = 10, maxI = 100000, minT = 0.01, maxT = 100
  const x = I => left + (Math.log10(I / minI) / Math.log10(maxI / minI)) * plotW
  const y = T => top + plotH - (Math.log10(T / minT) / Math.log10(maxT / minT)) * plotH
  const colors = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#be123c']

  const curves = breakers.map((b, idx) => {
    const pickup = Number(b.pickup || b.In || b.amp || b.rating || 100)
    const delay = Number(b.longDelay || b.delay || (2 + idx * 0.4))
    const inst = b.instantaneous === 'OFF' ? null : Number(b.instantaneous || b.Ii || pickup * 10)
    const color = colors[idx % colors.length]
    const pts = []
    for (let m = 1.05; m <= 20; m += 0.35) {
      const I = pickup * m
      const t = Math.max(0.03, delay / Math.pow(m - 1, 1.15))
      if (I >= minI && I <= maxI && t >= minT && t <= maxT) pts.push(`${x(I).toFixed(1)},${y(t).toFixed(1)}`)
    }
    const instLine = inst ? `<path d="M${x(inst)},${y(maxT)} L${x(inst)},${y(0.03)}" stroke="${color}" stroke-width="2" stroke-dasharray="4 4" opacity="0.65"/>` : ''
    return `
      <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4"/>
      ${instLine}
      <text x="${left + plotW + 8}" y="${40 + idx * 18}" fill="${color}" class="tcc-label">${esc(b.label || b.id || 'Breaker')} ${pickup}A</text>
    `
  }).join('')

  const grid = [10,100,1000,10000,100000].map(I => `
    <line x1="${x(I)}" y1="${top}" x2="${x(I)}" y2="${top+plotH}" class="grid"/>
    <text x="${x(I)}" y="${top+plotH+20}" class="axis">${I}</text>
  `).join('') + [0.01,0.1,1,10,100].map(T => `
    <line x1="${left}" y1="${y(T)}" x2="${left+plotW}" y2="${y(T)}" class="grid"/>
    <text x="${left-12}" y="${y(T)+4}" text-anchor="end" class="axis">${T}s</text>
  `).join('')

  return `
    <svg viewBox="0 0 ${w} ${h}" class="tcc-svg" xmlns="http://www.w3.org/2000/svg">
      <rect x="${left}" y="${top}" width="${plotW}" height="${plotH}" class="plot-bg"/>
      ${grid}
      ${curves}
      <text x="${left + plotW/2}" y="${h-15}" text-anchor="middle" class="axis-title">Corriente (A) — escala log</text>
      <text x="18" y="${top + plotH/2}" transform="rotate(-90 18 ${top + plotH/2})" text-anchor="middle" class="axis-title">Tiempo (s) — escala log</text>
    </svg>
  `
}

function buildTccSummary(result) {
  return `<div class="tcc-summary"><span><strong>Cruces:</strong> ${countCruces(result)}</span><span><strong>Estado:</strong> ${esc(result?.estadoCoordinacion || result?.coordinacionReal?.estado || '—')}</span></div>`
}

function objectTable(obj = {}) {
  const rows = Object.entries(obj).map(([k,v]) => `<tr><th>${esc(k)}</th><td>${esc(String(v ?? '—'))}</td></tr>`).join('')
  return `<table class="report-table two-col">${rows || '<tr><td>Sin parámetros</td></tr>'}</table>`
}

function nodeResultsTable(nodes, nodeResults, systemParams) {
  const rows = nodes.map((n, idx) => {
    const r = findNodeResult(n, nodeResults)
    const label = n.data?.label || n.label || n.type || `P${idx}`
    const v = valueOr(n.data?.voltage, r?.voltage, systemParams?.tension, '—')
    const isc = valueOr(r?.Isc_kA, r?.iccKA, r?.Isc, n.data?.icc, '—')
    const ip = valueOr(r?.Ipeak_kA, r?.ipicoKA, r?.Ipeak, '—')
    const xr = valueOr(r?.xr, r?.X_R, r?.x_r, '—')
    return `<tr><td>P${idx}</td><td>${esc(label)}</td><td>${esc(n.type || n.data?.type || '—')}</td><td>${esc(String(v))}</td><td>${formatIcc(isc)}</td><td>${formatIcc(ip)}</td><td>${esc(String(xr))}</td></tr>`
  }).join('')
  return `<table class="report-table"><thead><tr><th>Punto</th><th>Equipo</th><th>Tipo</th><th>V</th><th>Isc</th><th>Ipico</th><th>X/R</th></tr></thead><tbody>${rows}</tbody></table>`
}

function edgesTable(edges, nodes) {
  const rows = edges.map((e, idx) => {
    const source = nodeLabel(e.source, nodes), target = nodeLabel(e.target, nodes), d = e.data || e
    return `<tr><td>${idx+1}</td><td>${esc(source)} → ${esc(target)}</td><td>${esc(String(d.calibre || '—'))}</td><td>${esc(String(d.paralelo || d.parallel || '—'))}</td><td>${esc(String(d.longitud || d.length || '—'))}</td><td>${esc(String(d.material || '—'))}</td></tr>`
  }).join('')
  return `<table class="report-table"><thead><tr><th>#</th><th>Conexión</th><th>Calibre</th><th>P</th><th>Long. m</th><th>Material</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Sin conexiones</td></tr>'}</tbody></table>`
}

function breakersTable(rows) {
  const body = rows.map((b, i) => `<tr><td>${i+1}</td><td>${esc(b.label || b.id || 'Breaker')}</td><td>${esc(String(b.In || b.pickup || '—'))}</td><td>${esc(String(b.instantaneous || b.Ii || 'OFF'))}</td><td>${esc(String(b.Icu || b.icu || '—'))}</td><td>${esc(b.family || b.serie || '—')}</td></tr>`).join('')
  return `<table class="report-table"><thead><tr><th>#</th><th>Protección</th><th>In/Pickup A</th><th>Ii</th><th>Icu kA</th><th>Familia</th></tr></thead><tbody>${body || '<tr><td colspan="6">Sin protecciones</td></tr>'}</tbody></table>`
}

function nomTable(nom, result) {
  const source = (Array.isArray(nom) && nom.length) ? nom : [...(result?.violacionesNOM || []), ...(result?.validacionInteligente?.violacionesNOM || [])]
  const rows = source.map((v, idx) => {
    const status = v.estado || v.status || (v.ok === false ? 'ERROR' : 'ERROR')
    return `<tr class="${String(status).includes('ERROR') ? 'row-error' : ''}"><td>${idx+1}</td><td>${esc(v.punto || v.nodeId || v.id || '—')}</td><td>${esc(status)}</td><td>${esc(v.mensaje || v.message || v.descripcion || v.error || JSON.stringify(v))}</td></tr>`
  }).join('')
  return `<table class="report-table"><thead><tr><th>#</th><th>Punto</th><th>Estado</th><th>Descripción</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sin violaciones NOM registradas</td></tr>'}</tbody></table>`
}

function impedanceTable(rows = []) {
  const body = rows.map((r, i) => `<tr><td>${esc(r.punto || r.id || `P${i}`)}</td><td>${num(r.r_mohm ?? r.RmOhm ?? r.R)}</td><td>${num(r.x_mohm ?? r.XmOhm ?? r.X)}</td><td>${num(r.z_mohm ?? r.ZmOhm ?? r.Z)}</td><td>${num(r.v_fase ?? r.vFase ?? r.Vfase)}</td></tr>`).join('')
  return `<table class="report-table"><thead><tr><th>Punto</th><th>R mΩ</th><th>X mΩ</th><th>Z mΩ</th><th>V fase</th></tr></thead><tbody>${body || '<tr><td colspan="5">Datos no disponibles</td></tr>'}</tbody></table>`
}

function actionsTable(actions = [], result) {
  const list = (Array.isArray(actions) && actions.length) ? actions : result?.validacionInteligente?.accionesCorreccion || []
  const body = list.map((a, i) => `<tr><td>${i+1}</td><td>${esc(a.punto || a.nodeId || '—')}</td><td>${esc(a.prioridad || a.priority || 'MEDIA')}</td><td>${esc(a.accion || a.action || a.mensaje || a.message || JSON.stringify(a))}</td></tr>`).join('')
  return `<table class="report-table"><thead><tr><th>#</th><th>Punto</th><th>Prioridad</th><th>Acción</th></tr></thead><tbody>${body || '<tr><td colspan="4">Sin acciones sugeridas</td></tr>'}</tbody></table>`
}

function extractBreakers(nodes, result) {
  const selected = result?.breakersSeleccionados || result?.selectedBreakers || []
  const fromNodes = nodes.filter(n => String(n.type || n.data?.type || '').toLowerCase().includes('breaker') || n.data?.In || n.data?.amp)
    .map(n => ({
      id: n.id,
      label: n.data?.label || n.label || n.id,
      In: n.data?.In || n.data?.amp || n.data?.amperaje,
      Ii: n.data?.Ii || n.data?.instantaneous || n.data?.iDisparo,
      Icu: n.data?.Icu || n.data?.capacidadKA || n.data?.capacidad,
      family: n.data?.family || n.data?.serie || n.data?.modelo,
      pickup: n.data?.pickup || n.data?.In || n.data?.amp || n.data?.amperaje,
      instantaneous: n.data?.instantaneous || n.data?.Ii || n.data?.iDisparo,
      longDelay: n.data?.longDelay || n.data?.delay,
    }))
  return [...selected, ...fromNodes]
}

function computeLevels(nodes, edges) {
  const levels = {}
  const incoming = new Map(nodes.map(n => [n.id, 0]))
  edges.forEach(e => incoming.set(e.target, (incoming.get(e.target) || 0) + 1))
  const roots = nodes.filter(n => (incoming.get(n.id) || 0) === 0)
  const queue = roots.length ? roots.map(n => n.id) : [nodes[0]?.id].filter(Boolean)
  queue.forEach(id => levels[id] = 0)
  while (queue.length) {
    const id = queue.shift()
    edges.filter(e => e.source === id).forEach(e => {
      const proposed = (levels[id] || 0) + 1
      if (levels[e.target] == null || proposed > levels[e.target]) {
        levels[e.target] = proposed
        queue.push(e.target)
      }
    })
  }
  nodes.forEach(n => { if (levels[n.id] == null) levels[n.id] = 0 })
  return levels
}

function iconForType(type = '') {
  const t = String(type).toLowerCase()
  if (t.includes('transformer')) return 'TR'
  if (t.includes('generator_ats')) return 'ATS'
  if (t.includes('generator')) return 'G'
  if (t.includes('breaker')) return 'CB'
  if (t.includes('panel')) return 'TAB'
  if (t.includes('motor')) return 'M'
  if (t.includes('capacitor')) return 'CAP'
  if (t.includes('load')) return 'L'
  return 'EQ'
}

function findNodeResult(n, results = []) {
  return results.find(r => r.id === n.id || r.nodeId === n.id || r.punto === n.id || r.name === n.id) || {}
}

function deriveNodeStatus(n, r) {
  const txt = JSON.stringify({ n: n.data, r }).toLowerCase()
  if (txt.includes('error') || txt.includes('fail') || txt.includes('insuficiente')) return { className: 'node-error', label: 'ERROR' }
  if (txt.includes('warning') || txt.includes('advert')) return { className: 'node-warning', label: 'WARNING' }
  return { className: 'node-ok', label: 'OK' }
}

function nodeLabel(id, nodes) {
  const n = nodes.find(x => x.id === id)
  return n?.data?.label || n?.label || id
}

function deriveEstado(result = {}) {
  const critical = countViolaciones(result)
  if (critical > 0 || result?.estado === 'ERROR' || result?.estadoCentral === 'BLOQUEADO_NOM') {
    return { className: 'status-error', label: 'ERROR', subtitle: 'Requiere corrección' }
  }
  if (countCruces(result) > 0) return { className: 'status-warning', label: 'WARNING', subtitle: 'Coordinación parcial' }
  return { className: 'status-ok', label: 'OK', subtitle: 'Sistema funcional' }
}

function countViolaciones(result = {}) {
  return (result?.violacionesNOM?.length || result?.validacionInteligente?.violacionesNOM?.length || 0)
}

function countCruces(result = {}) {
  return result?.crucesTCC?.length || result?.coordinacionReal?.cruces || result?.tcc?.cruces || result?.coordinacion?.cruces || 0
}

function valueOr(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '')
}

function formatIcc(v) {
  if (v === '—' || v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return esc(String(v))
  return n > 100 ? `${(n/1000).toFixed(2)} kA` : `${n.toFixed(2)} kA`
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : '—'
}

function safeName(s) {
  return String(s).replace(/[^\w\d-_]+/g, '_')
}

function prettyMode(m) {
  return String(m).toLowerCase() === 'emergency' ? 'Emergencia' : 'Normal'
}

function metric(label, value) {
  return `<div class="metric"><span>${esc(label)}</span><strong>${esc(String(value))}</strong></div>`
}

function esc(s = '') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#039;')
}

const REPORT_CSS = `
.icc-report-pro{width:1120px;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;padding:28px;line-height:1.35}
.report-header{display:flex;justify-content:space-between;gap:24px;border-bottom:4px solid #0f172a;padding-bottom:18px;margin-bottom:18px}
.eyebrow{color:#2563eb;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
.report-header h1{font-size:28px;margin:4px 0}.report-header p{color:#475569;margin:0}
.status{min-width:170px;border-radius:14px;padding:14px;text-align:center;align-self:flex-start}.status strong{display:block;font-size:24px}.status span{font-size:12px}
.status-ok{background:#dcfce7;color:#166534;border:1px solid #86efac}.status-warning{background:#fef3c7;color:#92400e;border:1px solid #fbbf24}.status-error{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
.report-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:16px}
.report-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px}.metric{background:#0f172a;color:white;border-radius:12px;padding:12px}.metric span{display:block;color:#cbd5e1;font-size:11px}.metric strong{font-size:18px}
.report-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin:16px 0;break-inside:avoid}.report-card h2{font-size:18px;margin:0 0 12px 0;color:#0f172a}.muted{color:#64748b;font-size:12px}
.summary{border-radius:12px;padding:12px}.summary h3{margin:0 0 8px 0}.summary-ok{background:#ecfdf5;border:1px solid #86efac}.summary-error{background:#fff1f2;border:1px solid #fda4af}.summary .warn{color:#92400e}
.one-line-svg,.tcc-svg{width:100%;height:auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.sl-edge{fill:none;stroke:#334155;stroke-width:2.2;marker-end:url(#arrow)}.sl-edge-label{font-size:10px;fill:#475569}
.sl-node{fill:#f8fafc;stroke-width:2}.node-ok{stroke:#16a34a}.node-warning{stroke:#f59e0b}.node-error{stroke:#dc2626;fill:#fff1f2}.sl-icon{font-weight:800;font-size:13px;fill:#0f172a}.sl-title{font-size:12px;font-weight:700;fill:#111827}.sl-small{font-size:9.5px;fill:#475569}
.plot-bg{fill:#f8fafc;stroke:#cbd5e1}.grid{stroke:#cbd5e1;stroke-width:.8}.axis,.axis-title{fill:#334155;font-size:11px}.tcc-label{font-size:11px;font-weight:700}.tcc-summary{display:flex;gap:16px;font-size:12px;margin-top:8px}
.report-table{width:100%;border-collapse:collapse;font-size:11px}.report-table th{background:#0f172a;color:white;text-align:left;padding:7px}.report-table td{border-bottom:1px solid #e2e8f0;padding:6px 7px;vertical-align:top}.two-col th{width:240px}.row-error td{background:#fff1f2;color:#991b1b}
.empty{background:#f8fafc;color:#64748b;padding:16px;border-radius:10px}.report-footer{margin-top:22px;border-top:1px solid #cbd5e1;padding-top:10px;color:#64748b;font-size:10px}.avoid-break{break-inside:avoid}
`
>>>>>>> 895ec52 (Aplicadas correcciones generales ICC y mejoras arquitectura)
