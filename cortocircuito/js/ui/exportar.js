/**
 * exportar.js — FASE 8 (CORREGIDA)
 * Exporta a formato CSV, Excel (XLSX usando SheetJS si está disponible) o resumen ejecutivo.
 * Fallback a CSV si SheetJS no está cargado.
 */
var UIExportar = (function() {

    // Verificar si SheetJS está disponible
    function hasSheetJS() {
        return typeof XLSX !== 'undefined';
    }

    // Exportar a CSV (siempre disponible)
    function exportarCSV() {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe calcular', 'info');
            return;
        }
        
        try {
            var puntos = App.estado.resultados || [];
            var V = parseFloat(document.getElementById('input-tension').value) || 220;
            var tipo = App.estado.tipoSistema;
            var sep = ';';
            var bom = '\uFEFF';
            var lineas = [];
            
            // Encabezado
            lineas.push(bom + 'CALCULO DE CORTOCIRCUITO — NOM-001-SEDE-2012');
            lineas.push('Fecha: ' + new Date().toLocaleString('es-MX'));
            lineas.push('Tension: ' + V + 'V  |  Tipo: ' + (tipo === '3f' ? 'Trifasico 3F-4H' : 'Monofasico 1F-3H'));
            lineas.push('');
            
            // Cortocircuito
            lineas.push('CORTOCIRCUITO (PEOR CASO)');
            lineas.push(['Punto', 'Equipo', 'Isc red (kA)', 'Isc+Mot (kA)', 'Ipico (kA)', 'X/R', 'Cap.Eq (kA)', 'Cap.Min (kA)', 'Verif.'].join(sep));

            var tieneMotores = (puntos || []).some(function(p) { return p.aporteMotores && p.aporteMotores.iAporte > 0; });

            (puntos || []).forEach(function(p, i) {
                var capMin = UIDiagrama.capacidadMinima(p.iscConMotores);
                var equipCap = (p.equip && p.equip.cap) ? p.equip.cap : 0;
                var verif = UIDiagrama.verificarEquipo(p.iscConMotores, equipCap);
                var hasEquip = p.equip && p.equip.tipo && equipCap > 0;
                var iscM = tieneMotores ? p.iscConMotores : p.isc;
                var ipM = tieneMotores ? p.ipeakConMotores : p.ipeak;

                lineas.push([
                    'P' + i,
                    '"' + ((p.equip && p.equip.nombre) || p.nombre || 'Sin equipo').substring(0, 40) + '"',
                    tieneMotores ? p.isc.toFixed(3) : iscM.toFixed(3),
                    tieneMotores ? ipM.toFixed(3) : '-',
                    ipM.toFixed(3),
                    p.xr > 100 ? '>100' : p.xr.toFixed(1),
                    hasEquip ? equipCap.toFixed(1) : '-',
                    capMin.toString(),
                    verif.text
                ].join(sep));
            });
            
            lineas.push('');
            
            // Falla mínima (si hay datos de disparo)
            var tieneDisparo = (puntos || []).some(function(p) { return p.equip && p.equip.iDisparo > 0; });
            if (tieneDisparo && typeof Motor !== 'undefined') {
                var fallaMin = Motor.ejecutarFallaMinima(puntos);
                lineas.push('FALLA MINIMA — TENSION AL 95%');
                lineas.push(['Punto', 'Isc Max (kA)', 'Isc Min (kA)', 'I Disparo (A)', 'Sensibilidad'].join(sep));

                (puntos || []).forEach(function(p, i) {
                    var fm = fallaMin[i];
                    var td = p.equip && p.equip.iDisparo > 0;
                    lineas.push([
                        'P' + i,
                        p.isc.toFixed(3),
                        fm.iscMin.toFixed(3),
                        td ? p.equip.iDisparo.toFixed(0) : '-',
                        td ? (fm.sensible ? 'SI (+' + fm.margen.toFixed(0) + '%)' : 'NO VE FALLA') : 'Sin dato'
                    ].join(sep));
                });
                lineas.push('');
            }
            
            // Fase-tierra
            var tieneFT = (puntos || []).some(function(p) { return p.faseTierra && p.faseTierra.iscFt > 0; });
            if (tieneFT && App.estado.tipoSistema === '3f') {
                lineas.push('FALLA FASE-TIERRA (SECUENCIA CERO)');
                lineas.push(['Punto', 'I 3F (kA)', 'I F-T (kA)', 'Ratio F-T/3F (%)', 'Z0 (mΩ)', 'Z1 (mΩ)'].join(sep));
                
                (puntos || []).forEach(function(p, i) {
                    var ft = p.faseTierra;
                    var ratio = ft.iscFt > 0 ? (ft.iscFt / p.isc * 100).toFixed(1) : '-';
                    lineas.push([
                        'P' + i, 
                        p.isc.toFixed(3), 
                        ft.iscFt.toFixed(3), 
                        ratio + '%', 
                        (ft.Z0_total * 1000).toFixed(1), 
                        (ft.Z1_total * 1000).toFixed(1)
                    ].join(sep));
                });
                lineas.push('');
            }
            
            // Caída de tensión
            var feeders = App.getFeeders ? App.getFeeders() : [];
            var tieneCaida = (feeders || []).some(function(f) {
                return f.cargaA > 0 && f.cargaFP > 0;
            });

            if (tieneCaida && typeof CaidaTension !== 'undefined') {
                var Vc = parseFloat(document.getElementById('input-tension').value) || 220;
                var caidas = CaidaTension.calcularAcumulada(feeders, Vc, App.estado.tipoSistema);

                lineas.push('CAIDA DE TENSION (REGIMEN PERMANENTE)');
                lineas.push(['Punto', 'I Carga (A)', 'FP', 'Caida Parcial (V)', 'Caida Acum. (V)', 'Caida Acum. (%)', 'Estado'].join(sep));
                lineas.push(['P0', '-', '-', '0.0', '0.0', '0.00', '-'].join(sep));

                for (var i = 0; i < feeders.length; i++) {
                    var f = feeders[i];
                    var c = (caidas && caidas[i + 1]) ? caidas[i + 1] : { parcial: { caidaV: 0 }, acumulada: { caidaV: 0, porcentaje: 0 }, ok: true };
                    var td = f.cargaA > 0 && f.cargaFP > 0;
                    var estado = c.ok ? 'OK' : 'EXCEDE ' + CONSTANTES.CAIDA_MAXIMA_TOTAL + '%';
                    
                    lineas.push([
                        'P' + (i+1) + ' - ' + f.calibre + ' ' + f.material + ' · ' + f.longitud + 'm',
                        td ? (f.cargaA || 0).toFixed(0) : '-',
                        td ? (f.cargaFP || 0).toFixed(2) : '-',
                        td ? (c.parcial ? c.parcial.caidaV.toFixed(2) : '-') : '-',
                        td ? c.caidaV.toFixed(2) : '-',
                        td ? c.caidaPct.toFixed(2) : '-',
                        estado
                    ].join(sep));
                }
                lineas.push('');
            }
            
            // Impedancias
            var Vimp = parseFloat(document.getElementById('input-tension').value) || 220;
            var Vfase = App.estado.tipoSistema === '3f' ? Vimp / Math.sqrt(3) : Vimp;
            
            lineas.push('IMPEDANCIAS ACUMULADAS');
            lineas.push(['Punto', 'R (mΩ)', 'X (mΩ)', 'Z (mΩ)', 'V fase (V)'].join(sep));
            
            (puntos || []).forEach(function(p, i) {
                lineas.push([
                    'P' + i, 
                    (p.R * 1000).toFixed(3), 
                    (p.X * 1000).toFixed(3), 
                    (p.Z * 1000).toFixed(3), 
                    Vfase.toFixed(1)
                ].join(sep));
            });
            
            var contenido = lineas.join('\r\n');
            var nombreArchivo = 'cortocircuito_' + V + 'V_' + new Date().toISOString().slice(0, 10) + '.csv';
            descargarArchivo(nombreArchivo, contenido, 'text/csv;charset=utf-8');
            UIToast.mostrar('CSV exportado correctamente', 'success');
            
        } catch (err) {
            console.error('Error en exportarCSV:', err);
            UIToast.mostrar('Error al exportar CSV: ' + err.message, 'error');
        }
    }
    
    // Exportar a Excel usando SheetJS (si está disponible)
    function exportarExcel() {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe calcular', 'info');
            return;
        }

        if (!hasSheetJS()) {
            UIToast.mostrar('SheetJS no disponible. Exportando a CSV en su lugar.', 'warning');
            exportarCSV();
            return;
        }

        try {
            var puntos = App.estado.resultados || [];
            var V = parseFloat(document.getElementById('input-tension').value) || 220;
            var workbook = XLSX.utils.book_new();
            
            // Hoja 1: Resumen
            var resumenData = construirHojaResumen(puntos, V);
            var wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
            XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');
            
            // Hoja 2: Cortocircuito
            var ccData = construirHojaCortocircuito(puntos);
            var wsCC = XLSX.utils.aoa_to_sheet(ccData);
            XLSX.utils.book_append_sheet(workbook, wsCC, 'Cortocircuito');
            
            // Hoja 3: Falla mínima
            var tieneDisparo = (puntos || []).some(function(p) { return p.equip && p.equip.iDisparo > 0; });
            if (tieneDisparo && typeof Motor !== 'undefined') {
                var fmData = construirHojaFallaMinima(puntos);
                var wsFM = XLSX.utils.aoa_to_sheet(fmData);
                XLSX.utils.book_append_sheet(workbook, wsFM, 'Falla Minima');
            }
            
            // Hoja 4: Fase-tierra
            var tieneFT = (puntos || []).some(function(p) { return p.faseTierra && p.faseTierra.iscFt > 0; });
            if (tieneFT && App.estado.tipoSistema === '3f') {
                var ftData = construirHojaFaseTierra(puntos);
                var wsFT = XLSX.utils.aoa_to_sheet(ftData);
                XLSX.utils.book_append_sheet(workbook, wsFT, 'Fase-Tierra');
            }
            
            // Hoja 5: Caída de tensión
            var feeders = App.getFeeders ? App.getFeeders() : [];
            var tieneCaida = (feeders || []).some(function(f) {
                return f.cargaA > 0 && f.cargaFP > 0;
            });
            if (tieneCaida && typeof CaidaTension !== 'undefined') {
                var ctData = construirHojaCaidaTension();
                var wsCT = XLSX.utils.aoa_to_sheet(ctData);
                XLSX.utils.book_append_sheet(workbook, wsCT, 'Caida Tension');
            }
            
            // Hoja 6: Impedancias
            var impData = construirHojaImpedancias(puntos, V);
            var wsImp = XLSX.utils.aoa_to_sheet(impData);
            XLSX.utils.book_append_sheet(workbook, wsImp, 'Impedancias');
            
            // Exportar
            var nombreArchivo = 'cortocircuito_' + V + 'V_' + new Date().toISOString().slice(0, 10) + '.xlsx';
            XLSX.writeFile(workbook, nombreArchivo);
            UIToast.mostrar('Excel exportado correctamente', 'success');
            
        } catch (err) {
            console.error('Error en exportarExcel:', err);
            UIToast.mostrar('Error al exportar Excel: ' + err.message + '. Exportando a CSV.', 'error');
            exportarCSV();
        }
    }
    
    // Funciones auxiliares para construir hojas
    function construirHojaResumen(puntos, V) {
        var data = [];
        data.push(['MEMORIA TÉCNICA DE CORTOCIRCUITO']);
        data.push(['']);
        data.push(['DATOS DEL SISTEMA']);
        data.push(['Fecha', new Date().toLocaleString('es-MX')]);
        data.push(['Tensión', V + ' V']);
        data.push(['Tipo', App.estado.tipoSistema === '3f' ? 'Trifásico 3φ' : 'Monofásico 1φ']);
        data.push(['Modo de cálculo', App.estado.modo]);
        data.push(['N° alimentadores', feeders ? feeders.length : 0]);
        data.push(['Con motores', App.estado.motores && App.estado.motores.some(function(m) { return m.hp > 0; }) ? 'Sí' : 'No']);
        data.push(['']);
        data.push(['RESULTADOS PRINCIPALES']);
        
        var iscMax = puntos.length > 0 ? Math.max.apply(null, puntos.map(function(p) { return p.iscConMotores; })) : 0;
        var ipeakMax = puntos.length > 0 ? Math.max.apply(null, puntos.map(function(p) { return p.ipeakConMotores; })) : 0;
        
        data.push(['Isc máxima', iscMax.toFixed(2) + ' kA']);
        data.push(['Ipico máxima', ipeakMax.toFixed(2) + ' kA']);
        data.push(['']);
        data.push(['NORMA: NOM-001-SEDE-2012']);
        
        return data;
    }
    
    function construirHojaCortocircuito(puntos) {
        var tieneMotores = (puntos || []).some(function(p) { return p.aporteMotores && p.aporteMotores.iAporte > 0; });
        var headers = ['Punto', 'Equipo', 'Isc red (kA)'];
        
        if (tieneMotores) {
            headers.push('Isc+Mot (kA)');
        }
        headers.push('Ipico (kA)', 'X/R', 'Cap.Equipo (kA)', 'Cap.Min (kA)', 'Verificación');
        
        var data = [headers];
        
        puntos.forEach(function(p, i) {
            var capMin = UIDiagrama.capacidadMinima(p.iscConMotores);
            var equipCap = (p.equip && p.equip.cap) ? p.equip.cap : 0;
            var verif = UIDiagrama.verificarEquipo(p.iscConMotores, equipCap);
            var hasEquip = p.equip && p.equip.tipo && equipCap > 0;
            var iscM = tieneMotores ? p.iscConMotores : p.isc;
            var ipM = tieneMotores ? p.ipeakConMotores : p.ipeak;

            var row = [
                'P' + i,
                ((p.equip && p.equip.nombre) || p.nombre || 'Sin equipo').substring(0, 35),
                tieneMotores ? p.isc.toFixed(3) : iscM.toFixed(3)
            ];

            if (tieneMotores) {
                row.push(iscM.toFixed(3));
            }

            row.push(ipM.toFixed(3));
            row.push(p.xr > 100 ? '>100' : p.xr.toFixed(1));
            row.push(hasEquip ? equipCap.toFixed(1) : '-');
            row.push(capMin.toString());
            row.push(verif.text);

            data.push(row);
        });
        
        return data;
    }
    
    function construirHojaFallaMinima(puntos) {
        var fallaMin = Motor.ejecutarFallaMinima(puntos);
        var data = [['Punto', 'Isc Max (kA)', 'Isc Min (kA)', 'I Disparo (A)', 'Sensibilidad']];
        puntos.forEach(function(p, i) {
            var fm = fallaMin[i];
            var td = p.equip && p.equip.iDisparo > 0;
            data.push([
                'P' + i,
                p.isc.toFixed(3),
                fm.iscMin.toFixed(3),
                td ? p.equip.iDisparo.toFixed(0) : '-',
                td ? (fm.sensible ? 'SI (+' + fm.margen.toFixed(0) + '%)' : 'NO VE FALLA') : 'Sin dato'
            ]);
        });

        return data;
    }
    
    function construirHojaFaseTierra(puntos) {
        var data = [['Punto', 'I 3F (kA)', 'I F-T (kA)', 'Ratio F-T/3F (%)', 'Z0 (mΩ)', 'Z1 (mΩ)']];
        
        puntos.forEach(function(p, i) {
            var ft = p.faseTierra;
            var ratio = ft.iscFt > 0 ? (ft.iscFt / p.isc * 100).toFixed(1) : '-';
            data.push([
                'P' + i,
                p.isc.toFixed(3),
                ft.iscFt.toFixed(3),
                ratio + '%',
                (ft.Z0_total * 1000).toFixed(1),
                (ft.Z1_total * 1000).toFixed(1)
            ]);
        });
        
        return data;
    }

    function construirHojaCaidaTension() {
        var feeders = App.getFeeders ? App.getFeeders() : [];
        var V = parseFloat(document.getElementById('input-tension').value) || 220;
        var tipo = App.estado.tipoSistema;
        var data = [['Punto', 'I Carga (A)', 'FP', 'Caída Parcial (V)', 'Caída Total (V)', 'Caída Total (%)', 'Estado']];

        if (!feeders || feeders.length === 0) return data;

        var caidas = CaidaTension.calcularAcumulada(feeders, V, tipo);

        for (var i = 0; i < feeders.length; i++) {
            var f = feeders[i];
            var c = caidas[i + 1];
            var td = f.cargaA > 0 && f.cargaFP > 0;
            var estado = c.ok ? 'OK' : 'EXCEDE ' + CONSTANTES.CAIDA_MAXIMA_TOTAL + '%';

            data.push([
                'P' + (i + 1) + ' - ' + f.calibre + ' ' + f.material + ' · ' + f.longitud + 'm',
                td ? (f.cargaA || 0).toFixed(0) : '-',
                td ? (f.cargaFP || 0).toFixed(2) : '-',
                td ? (c.parcial ? c.parcial.caidaV.toFixed(2) : '-') : '-',
                td ? c.caidaV.toFixed(2) : '-',
                td ? c.caidaPct.toFixed(2) : '-',
                estado
            ]);
        }

        return data;
    }

    function construirHojaImpedancias(puntos, V) {
        var Vfase = App.estado.tipoSistema === '3f' ? V / Math.sqrt(3) : V;
        var data = [['Punto', 'R (mΩ)', 'X (mΩ)', 'Z (mΩ)', 'V fase (V)']];
        
        puntos.forEach(function(p, i) {
            data.push([
                'P' + i,
                (p.R * 1000).toFixed(3),
                (p.X * 1000).toFixed(3),
                (p.Z * 1000).toFixed(3),
                Vfase.toFixed(1)
            ]);
        });
        
        return data;
    }
    
    // Resumen ejecutivo (copia al portapapeles)
    function resumenEjecutivo() {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe calcular', 'info');
            return;
        }
        
        var puntos = App.estado.resultados || [];
        var V = parseFloat(document.getElementById('input-tension').value) || 220;
        var tipo = App.estado.tipoSistema;
        var fecha = new Date().toLocaleDateString('es-MX');
        
        var contenido = [];
        contenido.push('MEMORIA TÉCNICA DE CORTOCIRCUITO');
        contenido.push('=====================================');
        contenido.push('');
        contenido.push('PROYECTO: Sistema Eléctrico Industrial');
        contenido.push('FECHA: ' + fecha);
        contenido.push('TENSIÓN: ' + V + 'V ' + (tipo === '3f' ? 'Trifásico 3φ' : 'Monofásico 1φ'));
        contenido.push('NORMA: NOM-001-SEDE-2012');
        contenido.push('');
        contenido.push('RESULTADOS PRINCIPALES');
        contenido.push('----------------------');
        
        var iscMax = puntos.length > 0 ? Math.max.apply(null, puntos.map(function(p) { return p.iscConMotores; })) : 0;
        var ipeakMax = puntos.length > 0 ? Math.max.apply(null, puntos.map(function(p) { return p.ipeakConMotores; })) : 0;
        
        contenido.push('Isc máxima: ' + iscMax.toFixed(2) + ' kA');
        contenido.push('Ipico máxima: ' + ipeakMax.toFixed(2) + ' kA');
        contenido.push('');
        contenido.push('Elaborado por: Calculadora de Cortocircuito v1.0');
        
        var textoFinal = contenido.join('\n');
        
        // Copiar al portapapeles
        var textArea = document.createElement('textarea');
        textArea.value = textoFinal;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            UIToast.mostrar('Resumen ejecutivo copiado al portapapeles', 'success');
        } catch (err) {
            UIToast.mostrar('Error al copiar: ' + err.message, 'error');
        }
        
        document.body.removeChild(textArea);
        
        // También descargar como archivo
        descargarArchivo('resumen_ejecutivo_' + V + 'V_' + new Date().toISOString().slice(0, 10) + '.txt', textoFinal, 'text/plain');
    }
    
    // Función principal de exportación (detecta formato)
    function generarArchivo(formato) {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe calcular', 'info');
            return;
        }
        
        try {
            if (formato === 'xlsx') {
                exportarExcel();
            } else {
                exportarCSV();
            }
        } catch (err) {
            console.error('Error en generarArchivo:', err);
            UIToast.mostrar('Error: ' + err.message, 'error');
        }
    }
    
    // Descargar archivo
    function descargarArchivo(nombre, contenido, tipo) {
        try {
            var blob = new Blob([contenido], { type: tipo });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(function() {
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Error en descargarArchivo:', err);
            UIToast.mostrar('Error al descargar archivo: ' + err.message, 'error');
        }
    }
    
    // API pública
    return {
        csv: exportarCSV,
        resumenEjecutivo: resumenEjecutivo,
        generarArchivo: generarArchivo,
        exportarCSV: exportarCSV,
        exportarExcel: exportarExcel
    };
})();

if (typeof window !== 'undefined') {
    window.UIExportar = UIExportar;
}
