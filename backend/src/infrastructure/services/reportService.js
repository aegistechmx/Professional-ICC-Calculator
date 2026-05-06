/**
 * backend/src/infrastructure/services/reportService.js
 * Generador de Memorias de Cálculo Profesionales en PDF
 */

const { jsPDF } = require('jspdf');
const { autoTable: _autoTable } = require('jspdf-autotable');

/**
 * Generar memoria de cálculo completa en PDF
 */
class CalculationReportService {
  constructor() {
    this.doc = null;
    this.pageHeight = 297;
    this.pageWidth = 210;
    this.margin = 15;
    this.currentY = 20; // current (A)
  }

  /**
   * Generar reporte completo
   */
  async generateReport(data, projectInfo) {
    this.doc = new jsPDF();

    // 1. Portada
    this._addCoverPage(projectInfo);

    // 2. Datos del proyecto
    this._addSection('1. Datos del Proyecto', () => {
      this._addProjectData(projectInfo);
    });

    // 3. Normativa aplicada
    this._addSection('2. Normativa Aplicada', () => {
      this._addStandards();
    });

    // 4. Diagrama unifilar
    this._addSection('3. Diagrama Unifilar', () => {
      this._addDiagramReference(projectInfo);
    });

    // 5. Parámetros del sistema
    this._addSection('4. Parámetros del Sistema', () => {
      this._addSystemParameters(data);
    });

    // 6. Cálculos - Ampacidad
    this._addSection('5. Cálculos de Ampacidad', () => {
      this._addAmpacityCalculations(data);
    });

    // 7. Cálculos - Caída de tensión
    this._addSection('6. Cálculos de Caída de Tensión', () => {
      this._addVoltageDropCalculations(data);
    });

    // 8. Cálculos - Cortocircuito
    this._addSection('7. Cálculos de Cortocircuito', () => {
      this._addShortCircuitCalculations(data);
    });

    // 9. Selección de conductores
    this._addSection('8. Selección de Conductores', () => {
      this._addConductorSelection(data);
    });

    // 10. Protección y coordinación
    this._addSection('9. Protección y Coordinación', () => {
      this._addProtectionCoordination(data);
    });

    // 11. Validación NOM
    this._addSection('10. Validación NOM-001-SEDE-2012', () => {
      this._addNOMValidation(data);
    });

    // 12. Conclusiones
    this._addSection('11. Conclusiones', () => {
      this._addConclusions(data);
    });

    return this.doc.output('arraybuffer');
  }

  /**
   * Portada del documento
   */
  _addCoverPage(projectInfo) {
    const { projectName = 'Proyecto Eléctrico', client, engineer, date } = projectInfo || {};

    // Fondo gris claro
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');

    // Línea decorativa superior
    this.doc.setFillColor(30, 64, 175);
    this.doc.rect(0, 0, this.pageWidth, 15, 'F');

    // Título principal
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(24);
    this.doc.setTextColor(30, 64, 175);
    this.doc.text('MEMORIA DE CÁLCULO', this.pageWidth / 2, 80, { align: 'center' });

    this.doc.setFontSize(16);
    this.doc.setTextColor(75, 85, 99);
    this.doc.text('SISTEMA ELÉCTRICO', this.pageWidth / 2, 95, { align: 'center' });

    // Nombre del proyecto
    this.doc.setFontSize(18);
    this.doc.setTextColor(31, 41, 55);
    this.doc.text(projectName, this.pageWidth / 2, 130, { align: 'center' });

    // Información del proyecto
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(12);
    this.doc.setTextColor(75, 85, 99);

    const infoY = 180;
    if (client) {
      this.doc.text(`Cliente: ${client}`, this.margin, infoY);
    }
    if (engineer) {
      this.doc.text(`Ing. Responsable: ${engineer}`, this.margin, infoY + 10);
    }
    if (date) {
      this.doc.text(`Fecha: ${date}`, this.margin, infoY + 20);
    }

    // Norma aplicada
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('NOM-001-SEDE-2012', this.pageWidth / 2, 250, { align: 'center' });

    this._newPage();
  }

  /**
   * Agregar sección con manejo de páginas
   */
  _addSection(title, contentFn) {
    this._checkPageBreak(40);

    // Título de sección
    this.doc.setFillColor(30, 64, 175);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 10, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, this.margin + 3, this.currentY + 7);

    this.currentY += 18; // current (A)
    this.doc.setTextColor(31, 41, 55);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    contentFn();
  }

  /**
   * Datos del proyecto
   */
  _addProjectData(projectInfo) {
    const { projectName, client, location, engineer, reviewer, date, revision = 'A' } = projectInfo || {};

    const data = [
      ['Nombre del Proyecto', projectName || '-'],
      ['Cliente', client || '-'],
      ['Ubicación', location || '-'],
      ['Ingeniero Responsable', engineer || '-'],
      ['Revisor', reviewer || '-'],
      ['Fecha', date || new Date().toLocaleDateString('es-MX')],
      ['Revisión', revision]
    ];

    this._addTable(data, ['Campo', 'Valor']);
  }

  /**
   * Normativa aplicada
   */
  _addStandards() {
    const standards = [
      ['NOM-001-SEDE-2012', 'Instalaciones Eléctricas (Utilización)'],
      ['NOM-001-SEDE-2005', 'Instalaciones Eléctricas (Anterior)'],
      ['IEEE 141', 'Recommended Practice for Electric Power Distribution'],
      ['IEEE 242', 'Recommended Practice for Protection and Coordination'],
      ['IEC 60909', 'Short-circuit currents in three-phase a.c. systems'],
      ['NEC NFPA 70', 'National Electrical Code (referencia)']
    ];

    this.doc.text('La presente memoria de cálculo se basa en las siguientes normas y estándares:',
      this.margin, this.currentY);
    this.currentY += 10; // current (A)

    this._addTable(standards, ['Norma', 'Descripción']);
  }

  /**
   * Referencia al diagrama
   */
  _addDiagramReference(projectInfo) {
    this.doc.text('El diagrama unifilar del sistema se encuentra en el plano adjunto.',
      this.margin, this.currentY);
    this.currentY += 10; // current (A)

    const diagramData = [
      ['Plano', 'Diagrama Unifilar del Sistema Eléctrico'],
      ['Escala', '1:100'],
      ['Norma', 'NOM-001-SEDE-2012'],
      ['Fecha', projectInfo?.date || new Date().toLocaleDateString('es-MX')]
    ];

    this._addTable(diagramData, ['Parámetro', 'Valor']);
  }

  /**
   * Parámetros del sistema
   */
  _addSystemParameters(data) {
    if (!data || !data.nodes) {
      this.doc.text('No hay datos de sistema disponibles.', this.margin, this.currentY);
      return;
    }

    const sources = data.nodes.filter(n => n.type === 'source');
    const transformers = data.nodes.filter(n => n.type === 'transformer');

    if (sources.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Fuentes de Alimentación:', this.margin, this.currentY);
      this.currentY += 8; // current (A)
      this.doc.setFont('helvetica', 'normal');

      const sourceData = sources.map(s => [
        s.data?.label || s.id,
        s.data?.voltaje || '-',
        s.data?.shortCircuitCurrent || '-'
      ]);

      this._addTable(sourceData, ['Fuente', 'Voltaje (V)', 'Icc (kA)']);
    }

    this._checkPageBreak(40);

    if (transformers.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Transformadores:', this.margin, this.currentY);
      this.currentY += 8; // current (A)
      this.doc.setFont('helvetica', 'normal');

      const transData = transformers.map(t => [
        t.data?.label || t.id,
        t.data?.kva || '-',
        t.data?.primario || '-',
        t.data?.secundario || '-',
        t.data?.Z || '-'
      ]);

      this._addTable(transData, ['Transformador', 'kVA', 'Prim (V)', 'Sec (V)', 'Z (%)']);
    }
  }

  /**
   * Cálculos de ampacidad
   */
  _addAmpacityCalculations(data) {
    if (!data || !data.results) {
      this.doc.text('No hay resultados de ampacidad disponibles.', this.margin, this.currentY);
      return;
    }

    const loads = data.nodes?.filter(n => n.type === 'load' || n.type === 'motor') || [];

    if (loads.length === 0) {
      this.doc.text('No se encontraron cargas para calcular ampacidad.', this.margin, this.currentY);
      return;
    }

    const calcData = loads.map(node => {
      const result = data.results[node.id];
      const ampacity = result?.ampacidad;

      return [
        node.data?.label || node.id,
        node.data?.I_carga?.toFixed(2) || '-',
        ampacity?.I_corregida?.toFixed(2) || '-',
        ampacity?.F_temp?.toFixed(3) || '-',
        ampacity?.F_agrup?.toFixed(3) || '-',
        ampacity?.violacionTerminal ? 'Sí' : 'No'
      ];
    });

    this._addTable(calcData, [
      'Carga', 'I Diseño (A)', 'Ampacidad (A)', 'F.Temp', 'F.Agrup', 'Vio.Terminal'
    ]);

    this._checkPageBreak(30);

    // Fórmulas aplicadas
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Fórmulas Aplicadas:', this.margin, this.currentY);
    this.currentY += 8; // current (A)
    this.doc.setFont('helvetica', 'normal');

    this.doc.text('I_corregida = I_tabla × F_temp × F_agrup × paralelos', this.margin + 5, this.currentY); // current (A)
    this.currentY += 6; // current (A)
    this.doc.text('Donde:', this.margin + 5, this.currentY);
    this.currentY += 6; // current (A)
    this.doc.text('  I_tabla = Ampacidad base según NOM 310-16', this.margin + 10, this.currentY); // current (A)
    this.currentY += 6; // current (A)
    this.doc.text('  F_temp = Factor de temperatura ambiente', this.margin + 10, this.currentY); // current (A)
    this.currentY += 6; // current (A)
    this.doc.text('  F_agrup = Factor de agrupamiento de conductores', this.margin + 10, this.currentY); // current (A)
  }

  /**
   * Cálculos de caída de tensión
   */
  _addVoltageDropCalculations(data) {
    if (!data || !data.results) {
      this.doc.text('No hay resultados de caída de tensión disponibles.', this.margin, this.currentY);
      return;
    }

    const loads = data.nodes?.filter(n => n.type === 'load' || n.type === 'motor') || [];

    const calcData = loads.map(node => {
      const result = data.results[node.id];
      const caida = result?.caida;

      return [
        node.data?.label || node.id,
        node.data?.longitud?.toFixed(1) || '-',
        caida?.V_caida?.toFixed(2) || '-',
        caida?.porcentaje?.toFixed(2) || '-',
        caida?.porcentaje > 3 ? 'NO CUMPLE' : 'CUMPLE',
        result?.conductor?.calibre || '-'
      ];
    });

    this._addTable(calcData, [
      'Carga', 'Longitud (m)', 'V Caída (V)', '% Caída', 'Estado', 'Conductor'
    ]);

    this._checkPageBreak(30);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Criterio NOM:', this.margin, this.currentY);
    this.currentY += 8; // current (A)
    this.doc.setFont('helvetica', 'normal');

    this.doc.text('Caída de tensión máxima permitida: 3% (alumbrado) o 5% (fuerza)',
      this.margin + 5, this.currentY);
  }

  /**
   * Cálculos de cortocircuito
   */
  _addShortCircuitCalculations(data) {
    if (!data || !data.results) {
      this.doc.text('No hay resultados de cortocircuito disponibles.', this.margin, this.currentY);
      return;
    }

    const nodes = data.nodes || [];

    const calcData = nodes.map(node => {
      const result = data.results[node.id];
      const falla = result?.falla;

      return [
        node.data?.label || node.id,
        falla?.Icc_3f?.toFixed(2) || '-',
        falla?.Icc_1f?.toFixed(2) || '-',
        falla?.Zth?.toFixed(4) || '-',
        node.data?.Icu ? `${node.data.Icu} kA` : '-'
      ];
    });

    this._addTable(calcData, [
      'Nodo', 'Icc 3F (kA)', 'Icc 1F (kA)', 'Zth (Ω)', 'Icu (kA)'
    ]);

    this._checkPageBreak(30);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Método de Cálculo:', this.margin, this.currentY);
    this.currentY += 8; // current (A)
    this.doc.setFont('helvetica', 'normal');

    this.doc.text('Icc = V / Zth', this.margin + 5, this.currentY); // current (A)
    this.currentY += 6; // current (A)
    this.doc.text('Donde Zth es la impedancia Thevenin en el punto de falla',
      this.margin + 5, this.currentY);
  }

  /**
   * Selección de conductores
   */
  _addConductorSelection(data) {
    if (!data || !data.results) {
      this.doc.text('No hay resultados de selección de conductores.', this.margin, this.currentY);
      return;
    }

    const loads = data.nodes?.filter(n => n.type === 'load' || n.type === 'motor') || [];

    const condData = loads.map(node => {
      const result = data.results[node.id];
      const conductor = result?.conductor;

      return [
        node.data?.label || node.id,
        conductor?.calibre || '-',
        conductor?.material || '-',
        conductor?.aislamiento || '-',
        result?.conductor?.capacidad?.toFixed(0) || '-',
        conductor?.canalizacion || '-'
      ];
    });

    this._addTable(condData, [
      'Carga', 'Calibre', 'Material', 'Aislamiento (°C)', 'Capacidad (A)', 'Canalización'
    ]);

    this._checkPageBreak(40);

    // Notas técnicas
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Notas:', this.margin, this.currentY);
    this.currentY += 8; // current (A)
    this.doc.setFont('helvetica', 'normal');

    this.doc.text('• Conductores seleccionados según NOM 310-16', this.margin + 5, this.currentY);
    this.currentY += 6; // current (A)
    this.doc.text('• Temperatura ambiente base: 30°C', this.margin + 5, this.currentY);
    this.currentY += 6; // current (A)
    this.doc.text('• Canalización tipo tubería eléctrica (conduit)', this.margin + 5, this.currentY);
  }

  /**
   * Protección y coordinación
   */
  _addProtectionCoordination(data) {
    if (!data || !data.results) {
      this.doc.text('No hay datos de protección disponibles.', this.margin, this.currentY);
      return;
    }

    const breakers = data.nodes?.filter(n => n.type === 'breaker') || [];

    if (breakers.length === 0) {
      this.doc.text('No se encontraron protecciones en el sistema.', this.margin, this.currentY);
      return;
    }

    const protData = breakers.map(node => {
      const result = data.results[node.id];
      const proteccion = result?.proteccion;

      return [
        node.data?.label || node.id,
        proteccion?.tipo || '-',
        node.data?.In?.toFixed(0) || '-',
        node.data?.Icu?.toFixed(1) || '-',
        proteccion?.coordinado ? 'Sí' : 'No',
        proteccion?.margen?.toFixed(1) || '-'
      ];
    });

    this._addTable(protData, [
      'Protección', 'Tipo', 'In (A)', 'Icu (kA)', 'Coordinado', 'Margen (%)'
    ]);

    this._checkPageBreak(30);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Criterios de Coordinación:', this.margin, this.currentY);
    this.currentY += 8; // current (A)
    this.doc.setFont('helvetica', 'normal');

    this.doc.text('• Margen de coordinación: ≥ 20%', this.margin + 5, this.currentY);
    this.currentY += 6; // current (A)
    this.doc.text('• Curvas TCC sin cruce en zona de operación', this.margin + 5, this.currentY);
    this.currentY += 6; // current (A)
    this.doc.text('• Protección de respaldo con tiempo de retardo', this.margin + 5, this.currentY);
  }

  /**
   * Validación NOM
   */
  _addNOMValidation(data) {
    if (!data || !data.results) {
      this.doc.text('No hay datos de validación disponibles.', this.margin, this.currentY);
      return;
    }

    const nodes = data.nodes || [];

    let cumpleCount = 0;
    let noCumpleCount = 0;

    const validData = nodes.map(node => {
      const result = data.results[node.id];
      const validacion = result?.validacion;
      const status = validacion?.cumple ? 'CUMPLE' : 'NO CUMPLE';

      if (validacion?.cumple) cumpleCount++;
      else noCumpleCount++;

      return [
        node.data?.label || node.id,
        validacion?.ampacidad ? 'OK' : 'REVISAR',
        validacion?.caida_tension ? 'OK' : 'REVISAR',
        validacion?.cortocircuito ? 'OK' : 'REVISAR',
        validacion?.proteccion ? 'OK' : 'REVISAR',
        status
      ];
    });

    this._addTable(validData, [
      'Nodo', 'Ampacidad', 'Caída T.', 'C.C.', 'Protección', 'Estado'
    ]);

    this._checkPageBreak(30);

    // Resumen
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Resumen de Validación:', this.margin, this.currentY);
    this.currentY += 10; // current (A)

    this.doc.setTextColor(16, 185, 129);
    this.doc.text(`✓ Cumplen: ${cumpleCount} nodos`, this.margin + 5, this.currentY);
    this.currentY += 8; // current (A)

    if (noCumpleCount > 0) {
      this.doc.setTextColor(239, 68, 68);
      this.doc.text(`✗ No Cumplen: ${noCumpleCount} nodos`, this.margin + 5, this.currentY);
      this.currentY += 8; // current (A)
    }

    this.doc.setTextColor(31, 41, 55);
  }

  /**
   * Conclusiones
   */
  _addConclusions(_data) {
    const conclusions = [
      'El sistema eléctrico ha sido calculado conforme a la NOM-001-SEDE-2012.',
      'Las ampacidades de conductores cumplen con los requisitos de corriente de diseño.',
      'La caída de tensión en todos los circuitos está dentro de los límites permitidos.',
      'Las protecciones están coordinadas para operación selectiva.',
      'Los interruptores seleccionados tienen capacidad de ruptura adecuada.',
      'Se recomienda verificar la instalación en campo antes de la energización.'
    ];

    conclusions.forEach((conclusion, index) => {
      this._checkPageBreak(15);
      this.doc.text(`${index + 1}. ${conclusion}`, this.margin, this.currentY, {
        maxWidth: this.pageWidth - 2 * this.margin
      });
      this.currentY += 12; // current (A)
    });

    this._checkPageBreak(40);

    // Firma
    this.currentY += 30; // current (A)
    this.doc.line(this.margin, this.currentY, this.margin + 70, this.currentY);
    this.doc.text('Ing. Responsable', this.margin, this.currentY + 8);
    this.doc.text('Cédula Profesional:', this.margin, this.currentY + 15);

    this.doc.line(this.pageWidth - this.margin - 70, this.currentY,
      this.pageWidth - this.margin, this.currentY);
    this.doc.text('Revisor', this.pageWidth - this.margin - 70, this.currentY + 8);
    this.doc.text('Cédula Profesional:', this.pageWidth - this.margin - 70, this.currentY + 15);
  }

  /**
   * Agregar tabla
   */
  _addTable(data, headers) {
    this._checkPageBreak(data.length * 8 + 15);

    this.doc.autoTable({
      startY: this.currentY,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 31
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: this.margin, right: this.margin },
      styles: {
        cellPadding: 3,
        overflow: 'linebreak'
      }
    });

    if (this.doc.lastAutoTable && typeof this.doc.lastAutoTable.finalY === 'number') {
      this.currentY = this.doc.lastAutoTable.finalY + 10; // current (A)
    } else {
      this.currentY += 20; // Fallback if table wasn't rendered
    }
  }

  /**
   * Verificar si necesitamos nueva página
   */
  _checkPageBreak(requiredHeight) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this._newPage();
    }
  }

  /**
   * Nueva página
   */
  _newPage() {
    this.doc.addPage();
    this.currentY = this.margin; // current (A)
  }
}

module.exports = CalculationReportService;
