/**
 * reporte_pdf.js — FASE 6
 * Genera un reporte PDF profesional con todas las tablas de resultados.
 * Usa jsPDF + jspdf-autotable (cargados desde CDN en index.html).
 */
var UIReportePDF = (function() {

    /**
     * Genera y descarga el PDF
     */
    function generar() {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe realizar un calculo', 'info');
            return;
        }

        try {
            var doc = new window.jspdf.jsPDF('p', 'mm', 'letter');
            var pw = doc.internal.pageSize.getWidth();
            var ph = doc.internal.pageSize.getHeight();
            var ml = 15, mr = 15;
            var cw = pw - ml - mr;
            var y = 15;

            // --- Encabezado ---
            doc.setFillColor(15, 18, 28);
            doc.rect(0, 0, pw, 32, 'F');
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Calculo de Cortocircuito', ml, y + 8);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(180, 180, 200);
            doc.text('NOM-001-SEDE-2012 — Instalaciones Electricas (Utilizacion)', ml, y + 18);
            doc.setTextColor(120, 120, 140);
            doc.setFontSize(7);
            doc.text(new Date().toLocaleString('es-MX', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}), pw - mr, y + 8, {align:'right'});
            y += 40;

            // --- Datos del sistema ---
            var V = parseFloat(document.getElementById('input-tension').value) || 220;
            var tipo = App.estado.tipoSistema === '3f' ? 'Trifasico 3F-4H' : 'Monofasico 1F-3H';
            var modoTxt = App.estado.modo === 'conocido' ? 'Isc conocido' : 'Calculo completo';
            var tieneMotores = (App.estado.resultados || []).some(function(p) { return p.aporteMotores && p.aporteMotores.iAporte > 0; });
            var tieneFT = (App.estado.resultados || []).some(function(p) { return p.faseTierra && p.faseTierra.iscFt > 0; });

            doc.setFillColor(30, 34, 46);
            doc.roundedRect(ml, y, cw, 22, 2, 2, 'F');
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('DATOS DEL SISTEMA', ml + 5, y + 8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 220);
            doc.setFontSize(8);
            doc.text('Tension: ' + V + ' V  |  Tipo: ' + tipo + '  |  Modo: ' + modoTxt + (tieneMotores ? '  |  Con aporte de motores' : ''), ml + 5, y + 16);
            y += 28;

            // --- Funcion auxiliar para tablas ---
            function agregarTabla(titulo, headers, data, opciones) {
                if (y > ph - 40) {
                    doc.addPage();
                    y = 20;
                    doc.setFillColor(15, 18, 28);
                    doc.rect(0, 0, pw, 10, 'F');
                    y += 15;
                }

                doc.setFillColor(245, 158, 11);
                doc.roundedRect(ml, y, cw, 6, 1, 1, 'F');
                doc.setTextColor(10, 12, 24);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(titulo, ml + 3, y + 4.2);
                y += 10;
                
                var configTabla = {
                    startY: y,
                    margin: { left: ml, right: mr, bottom: 15 },
                    tableWidth: cw,
                    head: [headers],
                    body: data,
                    theme: 'grid',
                    styles: {
                        fontSize: 7,
                        cellPadding: 2,
                        lineColor: [50, 56, 80],
                        lineWidth: 0.2,
                        textColor: [40, 45, 60],
                        headStyles: {
                            fillColor: [35, 39, 54],
                            textColor: [220, 220, 230],
                            fontStyle: 'bold',
                            fontSize: 7
                        },
                        alternateRowStyles: {
                            fillColor: [26, 29, 40],
                            textColor: [190, 195, 210]
                        }
                    }
                };

                if (opciones) {
                    for (var key in opciones) {
                        if (Object.prototype.hasOwnProperty.call(opciones, key)) {
                            configTabla[key] = opciones[key];
                        }
                    }
                }

                doc.autoTable(configTabla);

                var finalY = doc.lastAutoTable.finalY;
                y = finalY + 8;
                return y;
            }

            // --- Tabla 1: Cortocircuito ---
            var headersCC = [['Punto', 'Equipo', 'Isc (kA)', 'Ipico (kA)', 'X/R', 'Cap.Eq (kA)', 'Cap.Min (kA)', 'Verif.']];

            var dataCC = (App.estado.resultados || []).map(function(p, i) {
                var capMin = UIDiagrama.capacidadMinima(p.iscConMotores);
                var equipCap = (p.equip && p.equip.cap) ? p.equip.cap : 0;
                var verif = UIDiagrama.verificarEquipo(p.iscConMotores, equipCap);
                var hasEquip = p.equip && p.equip.tipo && equipCap > 0;
                var iscVal = tieneMotores ? (p.iscConMotores || p.isc || 0) : (p.isc || 0);
                var ipVal = tieneMotores ? (p.ipeakConMotores || p.ipeak || 0) : (p.ipeak || 0);
                return [
                    'P' + i,
                    ((p.equip && p.equip.nombre) || p.nombre || 'Sin equipo').substring(0, 30),
                    iscVal.toFixed(3),
                    ipVal.toFixed(3),
                    p.xr > 100 ? '>100' : p.xr.toFixed(1),
                    hasEquip ? equipCap.toFixed(1) : '—',
                    capMin.toString(),
                    verif.text
                ];
            });

            y = agregarTabla('CORTOCIRCUITO (PEOR CASO)' + (tieneMotores ? ' — INCLUYE APORTE DE MOTORES' : ''), headersCC, dataCC);

            // --- Tabla NOM-001 Validaciones ---
            var tieneValidacionesNOM = (App.estado.resultados || []).some(function(p) { 
                return p.validacionNOM && p.validacionNOM.errores.length > 0; 
            });
            
            if (tieneValidacionesNOM) {
                var headersNOM = [['Punto', 'Tipo', 'Código', 'Mensaje', 'Datos']];
                var dataNOM = [];
                
                (App.estado.resultados || []).forEach(function(p, i) {
                    if (p.validacionNOM && p.validacionNOM.errores.length > 0) {
                        (p.validacionNOM.errores || []).forEach(function(error) {
                            var datosStr = '';
                            if (error.data) {
                                for (var key in error.data) {
                                    datosStr += key + ':' + error.data[key] + ' ';
                                }
                            }
                            dataNOM.push([
                                'P' + i,
                                error.type,
                                error.code,
                                error.message,
                                (datosStr || '').substring(0, 50)
                            ]);
                        });
                    }
                });
                
                if (dataNOM.length > 0) {
                    y = agregarTabla('VALIDACIONES NOM-001-SEDE-2012', headersNOM, dataNOM);
                }
            }

            // --- Tabla Coordinación TCC ---
            var coordinacionTCC = (App.estado.resultados || []).coordinacionTCC;
            if (coordinacionTCC && coordinacionTCC.pairs && coordinacionTCC.pairs.length > 0) {
                var headersTCC = [['Par', 'Estado', 'Issues']];
                var dataTCC = [];
                
                (coordinacionTCC.pairs || []).forEach(function(pair) {
                    var issuesStr = (pair.issues && pair.issues.length > 0) ?
                        pair.issues.length + ' cruces' : 'OK';
                    dataTCC.push([
                        pair.pair[0] + ' → ' + pair.pair[1],
                        pair.status,
                        issuesStr
                    ]);
                });
                
                y = agregarTabla('COORDINACIÓN TCC (CURVAS TIEMPO-CORRIENTE)', headersTCC, dataTCC);
            }

            // --- Tabla 2: Falla minima ---
            var tieneDisparo = (App.estado.resultados || []).some(function(p) { return p.equip && p.equip.iDisparo > 0; });
            if (tieneDisparo) {
                var fallaMin = Motor.ejecutarFallaMinima(App.estado.resultados || []);
                if (fallaMin && fallaMin.valido) {
                    var headersFM = [['Punto', 'Isc min (kA)', 'Ipico min (kA)', 'X/R']];
                    var dataFM = (App.estado.resultados || []).map(function(p, i) {
                        var fm = fallaMin[i];
                        var td = p.equip && p.equip.iDisparo > 0;
                        return [
                            'P' + i,
                            (p.isc || 0).toFixed(3),
                            (p.ipeak || 0).toFixed(3),
                            p.xr > 100 ? '>100' : p.xr.toFixed(1)
                        ];
                    });
                    y = agregarTabla('FALLA MINIMA — TENSION AL 95%', headersFM, dataFM);
                }
            }

            // --- Tabla 3: Falla fase-tierra ---
            if (tieneFT && App.estado.tipoSistema === '3f') {
                var headersFT = [['Punto', 'I 3F (kA)', 'I F-T (kA)', 'Ratio F-T/3F (%)', 'Z0 (mOhm)', 'Z1 (mOhm)']];
                var dataFT = (App.estado.resultados || []).map(function(p, i) {
                    var ft = p.faseTierra;
                    var ratio = ft.iscFt > 0 ? (ft.iscFt / p.isc * 100).toFixed(1) : '—';
                    return [
                        'P' + i,
                        p.isc.toFixed(3),
                        ft.iscFt.toFixed(3),
                        ratio + '%',
                        (ft.Z0_total * 1000).toFixed(1),
                        (ft.Z1_total * 1000).toFixed(1)
                    ];
                });
                y = agregarTabla('FALLA FASE-TIERRA (SECUENCIA CERO)', headersFT, dataFT);
            }

            // --- Tabla 4: Caida de tension ---
            var feeders = App.getFeeders ? App.getFeeders() : [];
            if (!feeders || feeders.length === 0) return;
            var tieneCaida = (feeders || []).some(function(f) { return f.cargaA > 0 && f.cargaFP > 0; });
            if (tieneCaida) {
                var Vcaida = parseFloat(document.getElementById('input-tension').value) || 220;
                var caidas = CaidaTension.calcularAcumulada(feeders, Vcaida, App.estado.tipoSistema);
                var headersCT = [['Punto', 'I Carga (A)', 'FP', 'Caida Parcial (V)', 'Caida Acum. (V)', 'Caida Acum. (%)']];
                var dataCT = [['P0', '—', '—', '0.0', '0.0', '0.00']];
                for (var i = 0; i < feeders.length; i++) {
                    var f = feeders[i];
                    var c = (caidas && caidas[i + 1]) ? caidas[i + 1] : { parcial: { caidaV: 0 }, acumulada: { caidaV: 0, porcentaje: 0 } };
                    var td = f.cargaA > 0 && f.cargaFP > 0;
                    dataCT.push([
                        'P' + (i + 1),
                        td ? (f.cargaA || 0).toFixed(0) : '—',
                        td ? (f.cargaFP || 0).toFixed(2) : '—',
                        td ? c.parcial.caidaV.toFixed(2) : '—',
                        td ? c.caidaV.toFixed(2) : '—',
                        td ? c.caidaPct.toFixed(2) + (c.ok ? '  OK' : '  EXCEDE') : '—'
                    ]);
                }
                y = agregarTabla('CAIDA DE TENSION (REGIMEN PERMANENTE)', headersCT, dataCT);
            }

            // --- Tabla 5: Impedancias ---
            var Vimp = parseFloat(document.getElementById('input-tension').value) || 220;
            var Vfase = App.estado.tipoSistema === '3f' ? Vimp / Math.sqrt(3) : Vimp;
            var headersImp = [['Punto', 'R (mOhm)', 'X (mOhm)', 'Z (mOhm)', 'V fase (V)']];
            var dataImp = (App.estado.resultados || []).map(function(p, i) {
                return ['P' + i, (p.R * 1000).toFixed(3), (p.X * 1000).toFixed(3), (p.Z * 1000).toFixed(3), Vfase.toFixed(1)];
            });
            y = agregarTabla('IMPEDANCIAS ACUMULADAS', headersImp, dataImp);

            // --- Motores (si hay) ---
            if (tieneMotores) {
                if (y > ph - 40) { doc.addPage(); y = 20; }
                var motores = UIMotores.leerDatos().filter(function(m) { return m.hp > 0; });
                if (motores.length > 0) {
                    var headersMot = [['Grupo', 'HP', 'Tipo', 'Punto', 'Xd\'\'', 'Eficiencia']];
                    var dataMot = motores.map(function(m, i) {
                        var xdpp = m.xdpp > 0 ? m.xdpp : CalculoMotores.getXdpp(m.tipo, m.hp);
                        var ef = m.eficiencia > 0 ? m.eficiencia : CalculoMotores.getEficiencia(m.tipo, m.hp);
                        return [String(i + 1), m.hp.toFixed(0), m.tipo === 'induccion' ? 'Induccion' : 'Sincrono', 'P' + m.punto, xdpp.toFixed(3), (ef * 100).toFixed(1) + '%'];
                    });
                    y = agregarTabla('MOTORES EN FALLA', headersMot, dataMot);
                }
            }

            // --- Nota normativa ---
            if (y > ph - 50) { doc.addPage(); y = 20; }
            doc.setDrawColor(200, 200, 220);
            doc.setLineWidth(0.3);
            doc.line(ml, y, ml + cw, y);
            y += 6;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 110, 140);
            doc.text('BASE NORMATIVA', ml, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(140, 145, 165);
            doc.text('Este calculo se realiza conforme al metodo de impedancias (componentes simétricas) y es orientativo para la verificacion', ml, y);
            doc.text('de equipos de interrupcion segun los requisitos de la NOM-001-SEDE-2012:', ml, y + 4);
            doc.text('', ml, y + 4);
            doc.text('  Art. 110.9 — Los equipos de interrupcion deberan tener capacidad interruptiva no menor a la corriente de', ml, y + 4);
            doc.text('               cortocircuito disponible en sus terminales de linea.', ml, y + 4);
            doc.text('  Art. 110.10 — Se debera marcar el equipo con la capacidad de cortocircuito disponible.', ml, y + 4);
            doc.text('  Art. 240.83 — La capacidad interruptiva de interruptores termomagneticos debe ser igual o mayor', ml, y + 4);
            doc.text('               a la corriente de cortocircuito disponible.', ml, y + 4);
            doc.text('  Art. 230.95 — Se requiere proteccion contra fallas a tierra cuando If-tierra exceda un tercio', ml, y + 4);
            doc.text('               de la corriente de disparo instantaneo del interruptor.', ml, y + 4);
            doc.text('', ml, y + 4);
            doc.text('NOTA: La impedancia de conductores corresponde a valores a 75°C, 60 Hz. Los valores de aporte', ml, y + 4);
            doc.text('de motores son calculados con reactancia subtransitoria tipica (Xd\'\'). Se recomienda', ml, y + 4);
            doc.text('verificar con la placa de datos del equipo y con un estudio de cortocircuito detallado.', ml, y + 4);

            // Pie de pagina
            var pages = doc.internal.getNumberOfPages();
            for (var pg = 1; pg <= pages; pg++) {
                doc.setPage(pg);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 170);
                doc.text('Pagina ' + pg + ' de ' + pages, pw - mr, ph - 10, { align: 'right' });
            }

            doc.save('cortocircuito_' + V + 'V_' + new Date().toISOString().slice(0, 10) + '.pdf');
            UIToast.mostrar('PDF generado correctamente', 'success');

        } catch (err) {
            console.error('Error generando PDF:', err);
            UIToast.mostrar('Error al generar PDF: ' + err.message, 'error');
        }
    }

    return { generar: generar };
})();

if (typeof window !== 'undefined') {
    window.UIReportePDF = UIReportePDF;
}
