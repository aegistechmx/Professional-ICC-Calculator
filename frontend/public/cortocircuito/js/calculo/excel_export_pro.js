/**
 * excel_export_pro.js — Exportación a Excel profesional
 * Genera reporte con 5 hojas: Resumen, CDT, Cortocircuito, TCC, Validación NOM
 * Usa plantilla maestra: plantilla_electrica_pro.xlsx
 * Usa ExcelJS para preservar formato
 */
var ExcelExportPro = (function() {

    var RUTA_PLANTILLA = '../plantillas/plantilla_electrica_pro.xlsx';

    /**
     * Genera libro Excel con datos del sistema usando plantilla
     * @param {Object} estado - Estado del sistema con { puntos, nodos }
     * @returns {Promise<Object>} Workbook de ExcelJS
     */
    function generarReporteExcel(estado) {
        if (!estado || !estado.puntos) {
            console.error('Estado inválido para exportación Excel');
            return Promise.reject('Estado inválido');
        }

        var workbook = new ExcelJS.Workbook();

        return fetch(RUTA_PLANTILLA)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('No se pudo cargar la plantilla: ' + response.status);
                }
                return response.arrayBuffer();
            })
            .then(function(arrayBuffer) {
                return workbook.xlsx.load(arrayBuffer);
            })
            .then(function() {
                // Inyectar datos en cada hoja
                inyectarHojaResumen(workbook, estado);
                inyectarHojaCDT(workbook, estado);
                inyectarHojaCortocircuito(workbook, estado);
                inyectarHojaTCC(workbook, estado);
                inyectarHojaValidacion(workbook, estado);

                return workbook;
            })
            .catch(function(error) {
                console.error('Error cargando plantilla:', error);
                // Fallback: generar desde cero si falla la plantilla
                console.warn('Usando fallback: generando Excel desde cero');
                return generarReporteExcelFallback(estado);
            });
    }

    /**
     * Fallback: genera Excel desde cero si la plantilla no está disponible
     */
    function generarReporteExcelFallback(estado) {
        var workbook = new ExcelJS.Workbook();

        var hojaResumen = workbook.addWorksheet('Resumen');
        generarHojaResumenFallback(hojaResumen, estado);

        var hojaCDT = workbook.addWorksheet('CDT');
        generarHojaCDFallback(hojaCDT, estado);

        var hojaCorto = workbook.addWorksheet('Cortocircuito');
        generarHojaCortocircuitoFallback(hojaCorto, estado);

        var hojaTCC = workbook.addWorksheet('TCC');
        generarHojaTCCFallback(hojaTCC, estado);

        var hojaValidacion = workbook.addWorksheet('Validación NOM');
        generarHojaValidacionFallback(hojaValidacion, estado);

        return workbook;
    }

    /**
     * Inyecta datos en hoja Resumen
     */
    function inyectarHojaResumen(workbook, estado) {
        var sheet = workbook.getWorksheet('Resumen');
        if (!sheet) return;

        // Datos de encabezado
        sheet.getCell('B2').value = new Date().toLocaleString();

        // Configuración del Sistema
        sheet.getCell('B4').value = estado.modo || 'conocido';
        sheet.getCell('B5').value = estado.tipoSistema || '3f';
        sheet.getCell('B6').value = estado.tension || '480V';

        // Datos de Fuente
        sheet.getCell('B8').value = estado.fuente ? estado.fuente.iscConocido : 0;
        sheet.getCell('B9').value = estado.fuente ? estado.fuente.iscFuente : 0;
        sheet.getCell('B10').value = estado.fuente ? estado.fuente.xrFuente : 0;
        sheet.getCell('B11').value = estado.fuente ? estado.fuente.trafoKva : 0;
        sheet.getCell('B12').value = estado.fuente ? estado.fuente.trafoZ : 0;
        sheet.getCell('B13').value = estado.fuente ? estado.fuente.trafoVp : 0;
        sheet.getCell('B14').value = estado.fuente ? estado.fuente.trafoVs : 0;

        sheet.getCell('B16').value = estado.puntos.length;
        sheet.getCell('B17').value = 'OK';

        // Tabla de datos (desde fila 20)
        estado.puntos.forEach(function(punto, index) {
            var row = 20 + index;
            sheet.getCell('A' + row).value = punto.id || ('P' + index);
            sheet.getCell('B' + row).value = ((punto.isc || 0) || 0).toFixed(2);
            sheet.getCell('C' + row).value = punto.CDT ? punto.CDT.I_diseño : 0;
            sheet.getCell('D' + row).value = ((punto.CDT ? punto.CDT.I_final : 0) || 0).toFixed(1);
            sheet.getCell('E' + row).value = punto.CDT ? punto.CDT.status : 'UNKNOWN';
            sheet.getCell('F' + row).value = punto.validacionNOM ? (punto.validacionNOM.errores.length === 0 ? 'OK' : 'FAIL') : 'OK';
        });
    }

    /**
     * Inyecta datos en hoja CDT
     */
    function inyectarHojaCDT(workbook, estado) {
        var sheet = workbook.getWorksheet('CDT');
        if (!sheet) return;

        // Tabla de datos (desde fila 3)
        estado.puntos.forEach(function(punto, index) {
            var row = 3 + index;
            var cdt = punto.CDT || {};
            var nodo = estado.nodos[index];
            var feeder = nodo ? nodo.feeder : {};

            sheet.getCell('A' + row).value = punto.id || ('P' + index);
            sheet.getCell('B' + row).value = feeder.calibre || 'N/A';
            sheet.getCell('C' + row).value = ((cdt.I_tabla || 0) || 0).toFixed(1);
            sheet.getCell('D' + row).value = ((cdt.F_temp || 0) || 0).toFixed(3);
            sheet.getCell('E' + row).value = ((cdt.F_agrupamiento || 0) || 0).toFixed(3);
            sheet.getCell('F' + row).value = feeder.paralelo || 1;
            sheet.getCell('G' + row).value = ((cdt.I_corregida || 0) || 0).toFixed(1);
            sheet.getCell('H' + row).value = ((cdt.I_limite_terminal || 0) || 0).toFixed(1);
            sheet.getCell('I' + row).value = ((cdt.I_final || 0) || 0).toFixed(1);
            sheet.getCell('J' + row).value = cdt.I_diseño || 0;
            sheet.getCell('K' + row).value = ((cdt.margen || 0) || 0).toFixed(1);
            sheet.getCell('L' + row).value = cdt.status || 'UNKNOWN';
        });
    }

    /**
     * Inyecta datos en hoja Cortocircuito
     */
    function inyectarHojaCortocircuito(workbook, estado) {
        var sheet = workbook.getWorksheet('Cortocircuito');
        if (!sheet) return;

        // Tabla de datos (desde fila 3)
        estado.puntos.forEach(function(punto, index) {
            var row = 3 + index;
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};

            sheet.getCell('A' + row).value = punto.id || ('P' + index);
            sheet.getCell('B' + row).value = ((punto.isc || 0) || 0).toFixed(2);
            sheet.getCell('C' + row).value = ((punto.ipeak || 0) || 0).toFixed(2);
            sheet.getCell('D' + row).value = ((punto.XR || 0) || 0).toFixed(2);
            sheet.getCell('E' + row).value = ((punto.If_tierra || 0) || 0).toFixed(2);
            sheet.getCell('F' + row).value = ((equip.cap || 0) || 0).toFixed(1);
            sheet.getCell('G' + row).value = (punto.isc <= (equip.cap || 0) * 1000) ? 'OK' : 'FAIL';
        });
    }

    /**
     * Inyecta datos en hoja TCC
     */
    function inyectarHojaTCC(workbook, estado) {
        var sheet = workbook.getWorksheet('TCC');
        if (!sheet) return;

        var coordinacion = estado.puntos.coordinacionTCC || { puntos: [] };

        // Tabla de datos (desde fila 3)
        estado.puntos.forEach(function(punto, index) {
            var row = 3 + index;
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};

            var coordinado = 'N/A';
            if (coordinacion && coordinacion.puntos && coordinacion.puntos[index]) {
                coordinado = coordinacion.puntos[index].coordinado ? 'SÍ' : 'NO';
            }

            sheet.getCell('A' + row).value = punto.id || ('P' + index);
            sheet.getCell('B' + row).value = ((equip.pickup || equip.cap || 0) || 0).toFixed(0);
            sheet.getCell('C' + row).value = ((equip.delay || 0) || 0).toFixed(2);
            sheet.getCell('D' + row).value = equip.tipoCurva || 'Normal Inverse';
            sheet.getCell('E' + row).value = coordinado;
        });
    }

    /**
     * Inyecta datos en hoja Validación NOM
     */
    function inyectarHojaValidacion(workbook, estado) {
        var sheet = workbook.getWorksheet('Validación NOM');
        if (!sheet) return;

        var rowIndex = 3;
        estado.puntos.forEach(function(punto, index) {
            var cdt = punto.CDT || {};
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};

            // Artículo 110.14(C) - Límite terminal
            sheet.getCell('A' + rowIndex).value = punto.id || ('P' + index);
            sheet.getCell('B' + rowIndex).value = '110.14(C)';
            sheet.getCell('C' + rowIndex).value = 'Límite terminal';
            sheet.getCell('D' + rowIndex).value = ((cdt.I_limite_terminal || 0) || 0).toFixed(1) + 'A';
            sheet.getCell('E' + rowIndex).value = '≥ I_corregida';
            sheet.getCell('F' + rowIndex).value = !cdt.violacionTerminal ? 'OK' : 'FAIL';
            rowIndex++;

            // Artículo 240.4 - Ampacidad ≥ I_diseño
            sheet.getCell('A' + rowIndex).value = punto.id || ('P' + index);
            sheet.getCell('B' + rowIndex).value = '240.4';
            sheet.getCell('C' + rowIndex).value = 'Ampacidad ≥ I_diseño';
            sheet.getCell('D' + rowIndex).value = ((cdt.I_final || 0) || 0).toFixed(1) + 'A';
            sheet.getCell('E' + rowIndex).value = '≥ ' + (cdt.I_diseño || 0) + 'A';
            sheet.getCell('F' + rowIndex).value = cdt.status === 'PASS' ? 'PASS' : 'FAIL';
            rowIndex++;

            // Artículo 110.9 - Capacidad interruptiva
            sheet.getCell('A' + rowIndex).value = punto.id || ('P' + index);
            sheet.getCell('B' + rowIndex).value = '110.9';
            sheet.getCell('C' + rowIndex).value = 'Capacidad interruptiva';
            sheet.getCell('D' + rowIndex).value = (equip.cap || 0).toFixed(1) + 'kA';
            sheet.getCell('E' + rowIndex).value = '≥ ' + (punto.isc || 0).toFixed(2) + 'kA';
            sheet.getCell('F' + rowIndex).value = (equip.cap || 0) >= (punto.isc || 0) / 1000 ? 'OK' : 'FAIL';
            rowIndex++;
        });
    }

    /**
     * Genera hoja de Resumen Ejecutivo
     */
    function generarHojaResumen(estado) {
        var datos = [
            ['REPORTE DE CÁLCULO ELÉCTRICO', ''],
            ['Generado:', new Date().toLocaleString()],
            ['Sistema:', estado.tipoSistema || '3f'],
            ['Tensión:', estado.tension || '480V'],
            [''],
            ['RESUMEN EJECUTIVO', ''],
            ['Total de nodos:', estado.puntos.length],
            ['Estado global', calcularEstadoGlobal(estado)],
            [''],
            ['Punto', 'Isc (kA)', 'I_diseño (A)', 'I_final (A)', 'Status CDT', 'Status NOM']
        ];

        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var cdt = punto.CDT || {};
            var validacion = punto.validacionNOM || {};

            datos.push([
                punto.id || ('P' + index),
                (punto.isc || 0).toFixed(2),
                (cdt.I_diseño || 0).toFixed(0),
                (cdt.I_final || 0).toFixed(0),
                cdt.status || 'N/A',
                validacion.status || 'N/A'
            ]);
        });

        return XLSX.utils.aoa_to_sheet(datos);
    }

    /**
     * Genera hoja de C.D.T.
     */
    function generarHojaCDT(estado) {
        var datos = [
            ['CÁLCULO DE DENSIDAD DE CORRIENTE (C.D.T.)'],
            [''],
            ['Punto', 'Calibre', 'I_tabla (A)', 'F_temp', 'F_agrup', 'Paralelos', 'I_corr (A)', 'I_terminal (A)', 'I_final (A)', 'I_diseño (A)', 'Margen (%)', 'Status']
        ];

        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var cdt = punto.CDT || {};
            var feeder = nodo ? nodo.feeder : {};

            datos.push([
                punto.id || ('P' + index),
                feeder.calibre || 'N/A',
                (cdt.I_tabla || 0).toFixed(1),
                (cdt.F_temp || 0).toFixed(3),
                (cdt.F_agrupamiento || 0).toFixed(3),
                feeder.paralelo || 1,
                (cdt.I_corregida || 0).toFixed(1),
                (cdt.I_limite_terminal || 0).toFixed(1),
                (cdt.I_final || 0).toFixed(1),
                (cdt.I_diseño || 0).toFixed(0),
                (cdt.margen || 0).toFixed(1),
                cdt.status || 'N/A'
            ]);
        });

        return XLSX.utils.aoa_to_sheet(datos);
    }

    /**
     * Genera hoja de Cortocircuito
     */
    function generarHojaCortocircuito(estado) {
        var datos = [
            ['CÁLCULO DE CORTOCIRCUITO'],
            [''],
            ['Punto', 'Isc (kA)', 'Ipeak (kA)', 'X/R', 'If-tierra (kA)', 'Cap Interruptor (kA)', 'Status']
        ];

        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};
            var faseTierra = punto.faseTierra || {};

            datos.push([
                punto.id || ('P' + index),
                (punto.isc || 0).toFixed(2),
                (punto.ipeak || 0).toFixed(2),
                (punto.xr || 0).toFixed(2),
                (faseTierra.iscFt || 0).toFixed(2),
                (equip.cap || 0).toFixed(1),
                (equip.cap && equip.cap >= punto.iscConMotores) ? 'OK' : 'FAIL'
            ]);
        });

        return XLSX.utils.aoa_to_sheet(datos);
    }

    /**
     * Genera hoja de TCC
     */
    function generarHojaTCC(estado) {
        var datos = [
            ['COORDINACIÓN TCC (Time-Current Curve)'],
            [''],
            ['Punto', 'Pickup (A)', 'Delay (s)', 'Tipo Curva', 'Coordinado con upstream']
        ];

        var coordinacion = estado.puntos.coordinacionTCC || { puntos: [] };

        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};

            var coordinado = 'N/A';
            if (coordinacion && coordinacion.puntos && coordinacion.puntos[index]) {
                coordinado = coordinacion.puntos[index].coordinado ? 'SÍ' : 'NO';
            }

            datos.push([
                punto.id || ('P' + index),
                (equip.pickup || equip.cap || 0).toFixed(0),
                (equip.delay || 0).toFixed(2),
                equip.tipoCurva || 'Normal Inverse',
                coordinado
            ]);
        });

        return XLSX.utils.aoa_to_sheet(datos);
    }

    /**
     * Genera hoja de Validación NOM
     */
    function generarHojaValidacion(estado) {
        var datos = [
            ['VALIDACIÓN NOM-001-SEDE-2012'],
            [''],
            ['Punto', 'Artículo', 'Requisito', 'Valor Calculado', 'Valor Requerido', 'Status']
        ];

        estado.puntos.forEach(function(punto, index) {
            var validacion = punto.validacionNOM || {};
            var cdt = punto.CDT || {};

            // Art. 110.14(C) - Terminales
            datos.push([
                punto.id || ('P' + index),
                '110.14(C)',
                'Límite terminal',
                (cdt.I_limite_terminal || 0).toFixed(1) + 'A',
                '≥ I_corregida',
                cdt.violacionTerminal ? 'FAIL' : 'OK'
            ]);

            // Art. 240.4 - Ampacidad
            datos.push([
                punto.id || ('P' + index),
                '240.4',
                'Ampacidad ≥ I_diseño',
                (cdt.I_final || 0).toFixed(1) + 'A',
                '≥ ' + (cdt.I_diseño || 0).toFixed(0) + 'A',
                cdt.status || 'N/A'
            ]);

            // Art. 110.9 - Capacidad interruptiva
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};
            datos.push([
                punto.id || ('P' + index),
                '110.9',
                'Capacidad interruptiva',
                (equip.cap || 0).toFixed(1) + 'kA',
                '≥ ' + (punto.iscConMotores || 0).toFixed(2) + 'kA',
                (equip.cap && equip.cap >= punto.iscConMotores) ? 'OK' : 'FAIL'
            ]);
        });

        return XLSX.utils.aoa_to_sheet(datos);
    }

    /**
     * Calcula estado global del sistema
     */
    function calcularEstadoGlobal(estado) {
        var fails = 0;
        var warnings = 0;

        estado.puntos.forEach(function(punto) {
            var cdt = punto.CDT || {};
            var validacion = punto.validacionNOM || {};

            if (cdt.status === 'FAIL' || validacion.status === 'FAIL') {
                fails++;
            } else if (cdt.status === 'WARNING' || validacion.status === 'WARNING') {
                warnings++;
            }
        });

        if (fails > 0) return 'FAIL (' + fails + ' errores)';
        if (warnings > 0) return 'WARNING (' + warnings + ' advertencias)';
        return 'OK';
    }

    /**
     * Exporta a archivo Excel
     * @param {Object} estado - Estado del sistema
     * @param {string} filename - Nombre del archivo
     * @returns {Promise<boolean>}
     */
    function exportarExcel(estado, filename) {
        if (!filename) {
            filename = 'Reporte_Calculo_Electrico_' + new Date().toISOString().slice(0,10) + '.xlsx';
        }

        return generarReporteExcel(estado)
            .then(function(workbook) {
                if (!workbook) {
                    console.error('Error generando workbook');
                    return false;
                }

                return workbook.xlsx.writeBuffer().then(function(buffer) {
                    var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log('Excel exportado:', filename);
                    return true;
                });
            })
            .catch(function(error) {
                console.error('Error en exportarExcel:', error);
                return false;
            });
    }

    /**
     * Fallback functions para generación desde cero
     */
    function generarHojaResumenFallback(sheet, estado) {
        sheet.addRow(['REPORTE DE CÁLCULO ELÉCTRICO', '']);
        sheet.addRow(['Generado:', new Date().toLocaleString()]);
        sheet.addRow([]);

        // Configuración del Sistema
        sheet.addRow(['CONFIGURACIÓN DEL SISTEMA', '']);
        sheet.addRow(['Modo:', estado.modo || 'conocido']);
        sheet.addRow(['Tipo de sistema:', estado.tipoSistema || '3f']);
        sheet.addRow(['Tensión:', estado.tension || '480V']);
        sheet.addRow([]);

        // Datos de Fuente
        sheet.addRow(['DATOS DE FUENTE', '']);
        sheet.addRow(['Isc disponible (kA):', estado.fuente ? estado.fuente.iscConocido : 0]);
        sheet.addRow(['Isc fuente (kA):', estado.fuente ? estado.fuente.iscFuente : 0]);
        sheet.addRow(['X/R fuente:', estado.fuente ? estado.fuente.xrFuente : 0]);
        sheet.addRow(['Trafo kVA:', estado.fuente ? estado.fuente.trafoKva : 0]);
        sheet.addRow(['Trafo Z%:', estado.fuente ? estado.fuente.trafoZ : 0]);
        sheet.addRow(['Trafo Vp (V):', estado.fuente ? estado.fuente.trafoVp : 0]);
        sheet.addRow(['Trafo Vs (V):', estado.fuente ? estado.fuente.trafoVs : 0]);
        sheet.addRow([]);

        sheet.addRow(['RESUMEN EJECUTIVO', '']);
        sheet.addRow(['Total de nodos:', estado.puntos.length]);
        sheet.addRow(['Estado global', 'OK']);
        sheet.addRow([]);
        sheet.addRow(['Punto', 'Isc (kA)', 'I_diseño (A)', 'I_final (A)', 'Status CDT', 'Status NOM']);

        estado.puntos.forEach(function(punto) {
            sheet.addRow([
                punto.id || 'P0',
                (punto.isc || 0).toFixed(2),
                (punto.CDT ? punto.CDT.I_diseño : 0) || 0,
                ((punto.CDT ? punto.CDT.I_final : 0) || 0).toFixed(1),
                punto.CDT ? punto.CDT.status : 'UNKNOWN',
                punto.validacionNOM ? (punto.validacionNOM.errores.length === 0 ? 'OK' : 'FAIL') : 'OK'
            ]);
        });
    }

    function generarHojaCDFallback(sheet, estado) {
        sheet.addRow(['CÁLCULO DE DENSIDAD DE CORRIENTE (C.D.T.)']);
        sheet.addRow([]);
        sheet.addRow(['Punto', 'Calibre', 'I_tabla (A)', 'F_temp', 'F_agrup', 'Paralelos', 'I_corr (A)', 'I_terminal (A)', 'I_final (A)', 'I_diseño (A)', 'Margen (%)', 'Status']);

        estado.puntos.forEach(function(punto, index) {
            var cdt = punto.CDT || {};
            var nodo = estado.nodos[index];
            var feeder = nodo ? nodo.feeder : {};
            sheet.addRow([
                punto.id || ('P' + index),
                feeder.calibre || 'N/A',
                (cdt.I_tabla || 0).toFixed(1),
                (cdt.F_temp || 0).toFixed(3),
                (cdt.F_agrupamiento || 0).toFixed(3),
                feeder.paralelo || 1,
                (cdt.I_corregida || 0).toFixed(1),
                (cdt.I_limite_terminal || 0).toFixed(1),
                (cdt.I_final || 0).toFixed(1),
                cdt.I_diseño || 0,
                (cdt.margen || 0).toFixed(1),
                cdt.status || 'UNKNOWN'
            ]);
        });
    }

    function generarHojaCortocircuitoFallback(sheet, estado) {
        sheet.addRow(['CÁLCULO DE CORTOCIRCUITO']);
        sheet.addRow([]);
        sheet.addRow(['Punto', 'Isc (kA)', 'Ipeak (kA)', 'X/R', 'If-tierra (kA)', 'Cap Interruptor (kA)', 'Status']);

        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};
            sheet.addRow([
                punto.id || ('P' + index),
                (punto.isc || 0).toFixed(2),
                (punto.ipeak || 0).toFixed(2),
                (punto.XR || 0).toFixed(2),
                (punto.If_tierra || 0).toFixed(2),
                (equip.cap || 0).toFixed(1),
                (punto.isc <= (equip.cap || 0) * 1000) ? 'OK' : 'FAIL'
            ]);
        });
    }

    function generarHojaTCCFallback(sheet, estado) {
        sheet.addRow(['COORDINACIÓN TCC (Time-Current Curve)']);
        sheet.addRow([]);
        sheet.addRow(['Punto', 'Pickup (A)', 'Delay (s)', 'Tipo Curva', 'Coordinado con upstream']);

        var coordinacion = estado.puntos.coordinacionTCC || { puntos: [] };
        estado.puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};
            var coordinado = 'N/A';
            if (coordinacion && coordinacion.puntos && coordinacion.puntos[index]) {
                coordinado = coordinacion.puntos[index].coordinado ? 'SÍ' : 'NO';
            }
            sheet.addRow([
                punto.id || ('P' + index),
                (equip.pickup || equip.cap || 0).toFixed(0),
                (equip.delay || 0).toFixed(2),
                equip.tipoCurva || 'Normal Inverse',
                coordinado
            ]);
        });
    }

    function generarHojaValidacionFallback(sheet, estado) {
        sheet.addRow(['VALIDACIÓN NOM-001-SEDE-2012']);
        sheet.addRow([]);
        sheet.addRow(['Punto', 'Artículo', 'Requisito', 'Valor Calculado', 'Valor Requerido', 'Status']);

        estado.puntos.forEach(function(punto, index) {
            var cdt = punto.CDT || {};
            var nodo = estado.nodos[index];
            var equip = nodo ? nodo.equip : {};

            sheet.addRow([punto.id || ('P' + index), '110.14(C)', 'Límite terminal', (cdt.I_limite_terminal || 0).toFixed(1) + 'A', '≥ I_corregida', !cdt.violacionTerminal ? 'OK' : 'FAIL']);
            sheet.addRow([punto.id || ('P' + index), '240.4', 'Ampacidad ≥ I_diseño', (cdt.I_final || 0).toFixed(1) + 'A', '≥ ' + (cdt.I_diseño || 0) + 'A', cdt.status === 'PASS' ? 'PASS' : 'FAIL']);
            sheet.addRow([punto.id || ('P' + index), '110.9', 'Capacidad interruptiva', (equip.cap || 0).toFixed(1) + 'kA', '≥ ' + (punto.isc || 0).toFixed(2) + 'kA', (equip.cap || 0) >= (punto.isc || 0) / 1000 ? 'OK' : 'FAIL']);
        });
    }

    return {
        generarReporteExcel: generarReporteExcel,
        exportarExcel: exportarExcel
    };
})();

if (typeof window !== 'undefined') {
    window.ExcelExportPro = ExcelExportPro;
}
