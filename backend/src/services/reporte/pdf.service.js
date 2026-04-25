const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Genera el documento PDF profesional
 */
async function crearReportePDF(data, stream) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(stream);

  // --- PORTADA ---
  doc.fontSize(24).text('REPORTE TÉCNICO DE CORTOCIRCUITO', { align: 'center' });
  doc.moveDown();
  
  if (data.proyecto && data.proyecto.nombre) {
    doc.fontSize(18).text(data.proyecto.nombre.toUpperCase(), { align: 'center' });
  } else {
    doc.fontSize(18).text('PROYECTO SIN NOMBRE', { align: 'center' });
  }
  
  doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(5);
  
  if (data.empresa && data.empresa.nombre) {
    doc.fontSize(14).text(data.empresa.nombre, { align: 'center' });
  }

  doc.addPage();

  // --- RESUMEN EJECUTIVO ---
  doc.fontSize(16).text('1. RESUMEN EJECUTIVO', { underline: true });
  doc.moveDown();
  
  if (data.icc && data.icc.max_kA) {
    doc.fontSize(11).text(
      `El presente estudio analiza el comportamiento del sistema eléctrico bajo condiciones de falla. ` +
      `Se determinó una corriente de cortocircuito máxima de ${data.icc.max_kA.toFixed(2)} kA en el punto de conexión.`
    );
  } else {
    doc.fontSize(11).text('El presente estudio analiza el comportamiento del sistema eléctrico bajo condiciones de falla.');
  }
  doc.moveDown();

  // --- DATOS DE ENTRADA ---
  doc.fontSize(16).text('2. DATOS DEL SISTEMA', { underline: true });
  doc.moveDown();
  
  if (data.icc) {
    if (data.icc.tension) {
      doc.fontSize(11).text(`Tensión del sistema: ${data.icc.tension} V`);
    }
    if (data.icc.modo) {
      doc.text(`Modo de cálculo: ${data.icc.modo}`);
    }
  }
  doc.moveDown();

  // --- RESULTADOS ---
  doc.fontSize(16).text('3. RESULTADOS DE CÁLCULO', { underline: true });
  doc.moveDown();
  
  // Tabla de resultados por punto
  if (data.icc && data.icc.puntos && Array.isArray(data.icc.puntos)) {
    const tableTop = doc.y;
    doc.fontSize(10).text('Punto', 50, tableTop, { bold: true });
    doc.text('Isc (kA)', 200, tableTop, { bold: true });
    doc.text('Ipico (kA)', 300, tableTop, { bold: true });
    doc.text('X/R', 400, tableTop, { bold: true });
    
    doc.moveDown();
    data.icc.puntos.forEach(p => {
      doc.text(p.nombre || 'N/A', 50);
      doc.text(p.isc ? p.isc.toFixed(2) : 'N/A', 200);
      doc.text(p.ipeak ? p.ipeak.toFixed(2) : 'N/A', 300);
      doc.text(p.xr ? p.xr.toFixed(2) : 'N/A', 400);
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(11).text('No hay resultados de cálculo disponibles.');
  }

  // --- APORTE DE MOTORES ---
  if (data.motores && (data.motores.totalAporte || data.motores.lista)) {
    doc.addPage();
    doc.fontSize(16).text('4. APORTE DE MOTORES', { underline: true });
    doc.moveDown();
    
    if (data.motores.totalAporte) {
      doc.fontSize(11).text(`Aporte total de motores: ${data.motores.totalAporte.toFixed(2)} kA`);
      doc.moveDown();
    }
    
    if (data.motores.lista && Array.isArray(data.motores.lista)) {
      doc.fontSize(10).text('Motor', 50, doc.y, { bold: true });
      doc.text('HP', 150, doc.y, { bold: true });
      doc.text('Aporte (kA)', 250, doc.y, { bold: true });
      doc.moveDown();
      
      data.motores.lista.forEach(m => {
        doc.text(m.nombre || 'N/A', 50);
        doc.text(m.hp ? m.hp.toString() : 'N/A', 150);
        doc.text(m.aporte ? m.aporte.toFixed(2) : 'N/A', 250);
        doc.moveDown(0.5);
      });
    }
  }

  // --- SELECCIÓN DE PROTECCIONES ---
  if (data.protecciones && data.protecciones.seleccion) {
    doc.addPage();
    doc.fontSize(16).text('5. SELECCIÓN DE PROTECCIONES', { underline: true });
    doc.moveDown();
    
    const sel = data.protecciones.seleccion;
    doc.fontSize(12).text(`Breaker seleccionado: ${sel.breaker?.nombre || 'N/A'}`, { bold: true });
    doc.moveDown();
    
    doc.fontSize(11).text(`Corriente nominal: ${sel.breaker?.In || 'N/A'} A`);
    doc.text(`Capacidad interruptiva: ${sel.breaker?.Icu ? (sel.breaker.Icu / 1000).toFixed(1) : 'N/A'} kA`);
    doc.text(`Pickup sugerido: ${sel.pickup ? sel.pickup.toFixed(1) : 'N/A'} A`);
    doc.text(`Score de selección: ${sel.score ? sel.score.toFixed(1) : 'N/A'}/100`);
    doc.moveDown();
    
    if (sel.validaciones) {
      doc.fontSize(11).text('Validaciones:', { bold: true });
      doc.text(`Margen Icu: ${sel.validaciones.margenIcu || 'N/A'}`);
      doc.text(`Margen In: ${sel.validaciones.margenIn || 'N/A'}`);
    }
  }

  doc.addPage();

  // --- SIMULACIÓN DINÁMICA ICC ---
  if (data.simulacion && data.graficas && data.graficas.icc_tiempo) {
    doc.fontSize(16).text('6. SIMULACIÓN DINÁMICA DE CORTOCIRCUITO', { underline: true });
    doc.moveDown();
    
    doc.fontSize(11).text(
      'La siguiente gráfica muestra la evolución de la corriente de cortocircuito en el tiempo, ' +
      'considerando el decaimiento exponencial del aporte de motores (modelo subtransitorio).'
    );
    doc.moveDown();
    
    // Métricas de simulación
    if (data.simulacion.metricas) {
      const m = data.simulacion.metricas;
      doc.fontSize(10).text('Métricas de simulación:', { bold: true });
      doc.text(`• ICC inicial: ${m.icc_inicial?.toFixed(2) || 'N/A'} A (${(m.icc_inicial/1000).toFixed(2)} kA)`);
      doc.text(`• ICC final (200ms): ${m.icc_final?.toFixed(2) || 'N/A'} A (${(m.icc_final/1000).toFixed(2)} kA)`);
      doc.text(`• Decaimiento: ${m.decaimiento_porcentaje?.toFixed(1) || 'N/A'}%`);
      doc.moveDown();
    }
    
    // Gráfica ICC vs tiempo
    doc.image(data.graficas.icc_tiempo, {
      fit: [500, 350],
      align: 'center'
    });
    
    doc.moveDown();
    doc.fontSize(9).text(
      'Figura 1: Curva de corriente de cortocircuito vs tiempo (0-200ms). ' +
      'El decaimiento muestra la contribución subtransitoria de motores.'
    , { align: 'center' });
    
    doc.addPage();
  }

  // --- GRÁFICAS TCC ---
  doc.fontSize(16).text(data.simulacion ? '7. ANÁLISIS DE PROTECCIONES' : '6. ANÁLISIS DE PROTECCIONES', { underline: true });
  doc.moveDown();
  
  if (data.graficas && data.graficas.tcc) {
    doc.fontSize(11).text(
      'Las siguientes curvas tiempo-corriente (TCC) en escala log-log muestran ' +
      'la coordinación entre dispositivos de protección.'
    );
    doc.moveDown();
    
    doc.image(data.graficas.tcc, {
      fit: [500, 400],
      align: 'center'
    });
    
    doc.moveDown();
    doc.fontSize(9).text(
      'Figura 2: Curvas TCC de dispositivos de protección (escala log-log). ' +
      'El margen de coordinación debe ser ≥ 0.2s para selectividad.'
    , { align: 'center' });
    
    doc.moveDown();
  }

  doc.fontSize(14).text('Estado de Coordinación:', { bold: true });
  doc.fontSize(11).text(data.coordinacion && data.coordinacion.coordinado ? 
    '✓ Se verifica una coordinación adecuada entre los dispositivos analizados. El sistema presenta selectividad.' : 
    '⚠ ¡ATENCIÓN! Se detectaron traslapes o márgenes insuficientes en la coordinación. Se recomienda ajustar los dispositivos.');

  // --- CONCLUSIONES ---
  doc.addPage();
  const tieneSimulacion = data.simulacion && data.graficas && data.graficas.icc_tiempo;
  doc.fontSize(16).text(tieneSimulacion ? '8. CONCLUSIONES Y RECOMENDACIONES' : '7. CONCLUSIONES Y RECOMENDACIONES', { underline: true });
  doc.moveDown();
  
  const conclusiones = generarConclusiones(data);
  conclusiones.forEach(c => {
    doc.fontSize(11).text(`• ${c}`);
    doc.moveDown(0.5);
  });

  doc.end();
}

function generarConclusiones(data) {
  const c = [];
  if (data.icc && data.icc.max_kA) {
    c.push(`La capacidad interruptiva requerida mínima es de ${data.icc.max_kA.toFixed(2)} kA.`);
  }

  if (data.icc && data.icc.puntos && Array.isArray(data.icc.puntos)) {
    data.icc.puntos.forEach(p => {
      if (p.equip && p.equip.cap && p.isc && p.equip.cap < p.isc) {
        c.push(`¡ALERTA! El equipo en ${p.nombre} tiene capacidad insuficiente (${p.equip.cap} kA < ${p.isc.toFixed(2)} kA).`);
      }
    });
  }

  if (data.coordinacion && !data.coordinacion.coordinado) {
    c.push('Se recomienda ajustar los parámetros de disparo para asegurar la selectividad del sistema.');
  }

  if (c.length === 0) {
    c.push('Se recomienda realizar un análisis detallado del sistema para validar los resultados.');
  }

  return c;
}

module.exports = {
  crearReportePDF
};
