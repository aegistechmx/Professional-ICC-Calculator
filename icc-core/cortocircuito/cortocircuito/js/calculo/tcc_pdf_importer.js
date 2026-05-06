/**
 * tcc_pdf_importer.js — Importador Profesional de Curvas TCC desde PDF
 * 
 * Pipeline: PDF → Canvas → Detección → Calibración → Curva log-log → Interpolador
 * 
 * Compatible con ES5 para integración con sistema existente
 */

var TCCPDFImporter = (function() {

    var config = {
        scale: 3,
        colorThreshold: {
            r: 150,
            g: 100,
            b: 100
        }
    };

    /**
     * PDF → Canvas
     * Requiere pdfjs-dist cargado previamente
     * @param {File} file - Archivo PDF
     * @returns {Promise<HTMLCanvasElement>} Canvas renderizado
     */
    function pdfToCanvas(file) {
        return new Promise(function(resolve, reject) {
            if (typeof pdfjsLib === 'undefined') {
                reject(new Error('pdfjsLib no está cargado. Incluye pdfjs-dist antes de este módulo.'));
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var typedarray = new Uint8Array(e.target.result);

                pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                    pdf.getPage(1).then(function(page) {
                        var viewport = page.getViewport({ scale: config.scale });
                        var canvas = document.createElement('canvas');
                        var ctx = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        var renderContext = {
                            canvasContext: ctx,
                            viewport: viewport
                        };

                        page.render(renderContext).promise.then(function() {
                            resolve(canvas);
                        }).catch(reject);
                    }).catch(reject);
                }).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Detectar curva por color (mejorado)
     * @param {HTMLCanvasElement} canvas - Canvas con imagen del PDF
     * @param {Object} config - Configuración de color
     * @returns {Array} Array de puntos {x, y}
     */
    function detectarCurvaPorColor(canvas, config) {
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var img = ctx.getImageData(0, 0, width, height);
        var puntos = [];

        for (var y = 0; y < height; y += 2) {
            for (var x = 0; x < width; x += 2) {
                var i = (y * width + x) * 4;
                var r = img.data[i];
                var g = img.data[i + 1];
                var b = img.data[i + 2];

                if (matchColor(r, g, b, config.color)) {
                    puntos.push({ x: x, y: y });
                }
            }
        }

        console.log('[TCCPDFImporter] Puntos detectados: ' + puntos.length);
        return puntos;
    }

    /**
     * Match color con tolerancia
     * @param {number} r - Componente rojo
     * @param {number} g - Componente verde
     * @param {number} b - Componente azul
     * @param {Object} target - Color objetivo {r, g, b, tolerancia}
     * @returns {boolean} Match
     */
    function matchColor(r, g, b, target) {
        var tol = target.tolerancia || 40;
        return (
            Math.abs(r - target.r) < tol &&
            Math.abs(g - target.g) < tol &&
            Math.abs(b - target.b) < tol
        );
    }

    /**
     * Mapear píxeles a log-log (mejorado)
     * @param {Array} puntos - Array de píxeles {x, y}
     * @param {Object} bounds - Bounds en escala log
     * @param {HTMLCanvasElement} canvas - Canvas original
     * @returns {Array} Curva TCC [{I, t}, ...]
     */
    function mapearLogLog(puntos, bounds, canvas) {
        return puntos.map(function(p) {
            var xNorm = p.x / canvas.width;
            var yNorm = 1 - (p.y / canvas.height);

            var logI = bounds.logImin + xNorm * (bounds.logImax - bounds.logImin);
            var logT = bounds.logTmin + yNorm * (bounds.logTmax - bounds.logTmin);

            return {
                I: Math.pow(10, logI),
                t: Math.pow(10, logT)
            };
        });
    }

    /**
     * Calibración manual de bounds
     * @param {Object} bounds - Bounds del gráfico
     * @returns {Object} Calibración configurada
     */
    function calibrar(bounds) {
        return {
            xMin: bounds.xMin,
            xMax: bounds.xMax,
            yMin: bounds.yMin,
            yMax: bounds.yMax,
            I_min: bounds.I_min,
            I_max: bounds.I_max,
            t_min: bounds.t_min,
            t_max: bounds.t_max
        };
    }

    /**
     * Pixel → Log-Log (mapeo a valor real)
     * @param {number} valor - Valor en píxeles
     * @param {number} minPixel - Píxel mínimo
     * @param {number} maxPixel - Píxel máximo
     * @param {number} minReal - Valor real mínimo
     * @param {number} maxReal - Valor real máximo
     * @returns {number} Valor real interpolado
     */
    function pixelToLog(valor, minPixel, maxPixel, minReal, maxReal) {
        var ratio = (valor - minPixel) / (maxPixel - minPixel);
        return Math.pow(10,
            Math.log10(minReal) +
            ratio * (Math.log10(maxReal) - Math.log10(minReal))
        );
    }

    /**
     * Convertir píxeles a puntos reales (mapeo log-log)
     * @param {Array} puntos - Array de píxeles {x, y}
     * @param {Object} cal - Calibración
     * @returns {Array} Curva TCC [{I, t}, ...]
     */
    function convertirAPuntosReales(puntos, cal) {
        return puntos.map(function(p) {
            return {
                I: pixelToLog(p.x, cal.xMin, cal.xMax, cal.I_min, cal.I_max),
                t: pixelToLog(
                    cal.yMax - p.y,
                    0,
                    cal.yMax,
                    cal.t_min,
                    cal.t_max
                )
            };
        });
    }

    /**
     * Limpieza / reducción de curva
     * @param {Array} puntos - Curva TCC
     * @returns {Array} Curva simplificada
     */
    function simplificarCurva(puntos) {
        puntos.sort(function(a, b) {
            return a.I - b.I;
        });

        var filtrado = [];
        var ultimoI = 0;

        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i];
            if (Math.abs(p.I - ultimoI) > 0.02 * p.I) {
                filtrado.push(p);
                ultimoI = p.I;
            }
        }

        console.log('[TCCPDFImporter] Curva simplificada: ' + filtrado.length + ' puntos');
        return filtrado;
    }

    /**
     * Crear interpolador log-log
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @returns {Function} Función f(I) → t
     */
    function crearInterpolador(curva) {
        curva.sort(function(a, b) {
            return a.I - b.I;
        });

        return function(I) {
            for (var i = 0; i < curva.length - 1; i++) {
                var p1 = curva[i];
                var p2 = curva[i + 1];
                if (I >= p1.I && I <= p2.I) {
                    return Math.pow(10,
                        Math.log10(p1.t) +
                        (Math.log10(I) - Math.log10(p1.I)) *
                        (Math.log10(p2.t) - Math.log10(p1.t)) /
                        (Math.log10(p2.I) - Math.log10(p1.I))
                    );
                }
            }
            return null;
        };
    }

    /**
     * Generar banda (min/max)
     * @param {Array} curvaMin - Curva mínima
     * @param {Array} curvaMax - Curva máxima
     * @returns {Object} Banda { min, max, rawMin, rawMax }
     */
    function generarBanda(curvaMin, curvaMax) {
        return {
            min: crearInterpolador(curvaMin),
            max: crearInterpolador(curvaMax),
            rawMin: curvaMin,
            rawMax: curvaMax
        };
    }

    /**
     * Pipeline completo de importación desde PDF (mejorado)
     * @param {File} file - Archivo PDF
     * @param {Object} config - Configuración completa {color, bounds, tipo}
     * @returns {Promise<Object>} { tipo, puntos, f, origen }
     */
    function importarCurvaDesdePDF(file, config) {
        return pdfToCanvas(file).then(function(canvas) {
            var pixeles = detectarCurvaPorColor(canvas, config);
            
            if (pixeles.length === 0) {
                throw new Error('No se detectó curva en el PDF con la configuración de color especificada');
            }

            var curva = mapearLogLog(pixeles, config.bounds, canvas);
            var curvaSuave = suavizar(curva);
            var interpolador = generarFuncion(curvaSuave);

            return {
                tipo: 'TCC_REAL',
                puntos: curvaSuave,
                f: interpolador,
                origen: 'PDF',
                tipoCurva: config.tipo || 'desconocido',
                canvas: canvas
            };
        });
    }

    /**
     * Pipeline completo de importación desde PDF (legacy)
     * @param {File} file - Archivo PDF
     * @param {Object} bounds - Bounds del gráfico
     * @returns {Promise<Object>} { tipo, puntos, f }
     */
    function importarDesdePDF(file, bounds) {
        var config = {
            color: config.colorThreshold,
            bounds: {
                logImin: Math.log10(bounds.I_min),
                logImax: Math.log10(bounds.I_max),
                logTmin: Math.log10(bounds.t_min),
                logTmax: Math.log10(bounds.t_max)
            },
            tipo: 'desconocido'
        };
        return importarCurvaDesdePDF(file, config);
    }

    /**
     * Debug visual: overlay de puntos detectados
     * @param {HTMLCanvasElement} canvas - Canvas original
     * @param {Array} puntos - Puntos detectados
     */
    function overlayCanvas(canvas, puntos) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        
        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i];
            ctx.fillRect(p.x, p.y, 1, 1);
        }
    }

    /**
     * Actualizar configuración
     * @param {Object} newConfig - Nueva configuración
     */
    function setConfig(newConfig) {
        if (newConfig.scale) config.scale = newConfig.scale;
        if (newConfig.colorThreshold) {
            if (newConfig.colorThreshold.r !== undefined) config.colorThreshold.r = newConfig.colorThreshold.r;
            if (newConfig.colorThreshold.g !== undefined) config.colorThreshold.g = newConfig.colorThreshold.g;
            if (newConfig.colorThreshold.b !== undefined) config.colorThreshold.b = newConfig.colorThreshold.b;
        }
    }

    /**
     * Obtener configuración actual
     * @returns {Object} Configuración actual
     */
    function getConfig() {
        return JSON.parse(JSON.stringify(config));
    }

    /**
     * Estado de calibración interactiva
     */
    var calibracionEstado = {
        activa: false,
        puntos: [], // [{x, y, I, t}]
        canvas: null,
        minPuntos: 3 // Mínimo 3 puntos para robustez
    };

    /**
     * Iniciar calibración interactiva
     * @param {HTMLCanvasElement} canvas - Canvas del PDF
     * @param {number} minPuntos - Mínimo de puntos (default 3)
     */
    function iniciarCalibracionInteractiva(canvas, minPuntos) {
        calibracionEstado.activa = true;
        calibracionEstado.puntos = [];
        calibracionEstado.canvas = canvas;
        calibracionEstado.minPuntos = minPuntos || 3;

        console.log('[TCCPDFImporter] Calibración interactiva iniciada. Haz click en ' + calibracionEstado.minPuntos + ' puntos conocidos del gráfico.');
    }

    /**
     * Manejar click de calibración
     * @param {number} x - Coordenada X del click
     * @param {number} y - Coordenada Y del click
     * @param {number} I - Corriente conocida en este punto
     * @param {number} t - Tiempo conocido en este punto
     */
    function clickCalibracion(x, y, I, t) {
        if (!calibracionEstado.activa) {
            console.warn('[TCCPDFImporter] Calibración no está activa. Llama iniciarCalibracionInteractiva primero.');
            return null;
        }

        calibracionEstado.puntos.push({ x: x, y: y, I: I, t: t });

        console.log('[TCCPDFImporter] Punto de calibración ' + calibracionEstado.puntos.length + ': (' + x + ', ' + y + ') → I=' + I + 'A, t=' + t + 's');

        if (calibracionEstado.puntos.length >= calibracionEstado.minPuntos) {
            return calcularBoundsMultiPunto();
        }

        return null;
    }

    /**
     * Calcular bounds desde múltiples puntos con regresión log-log (least squares)
     * @returns {Object} Bounds calculados
     */
    function calcularBoundsMultiPunto() {
        if (calibracionEstado.puntos.length < 2) {
            throw new Error('Se necesitan al menos 2 puntos de calibración');
        }

        var canvas = calibracionEstado.canvas;
        var puntos = calibracionEstado.puntos;

        // Si solo hay 2 puntos, usar método simple
        if (puntos.length === 2) {
            return calcularBoundsDesdePuntos();
        }

        // Regresión log-log con múltiples puntos (least squares)
        var n = puntos.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (var i = 0; i < n; i++) {
            var p = puntos[i];
            var xNorm = p.x / canvas.width;
            var yNorm = 1 - (p.y / canvas.height);
            var logI = Math.log10(p.I);
            var logT = Math.log10(p.t);

            sumX += xNorm;
            sumY += logI;
            sumXY += xNorm * logI;
            sumX2 += xNorm * xNorm;
        }

        // Calcular pendiente y intercepto para I (X axis)
        var slopeI = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        var interceptI = (sumY - slopeI * sumX) / n;

        // Repetir para T (Y axis)
        sumX = 0; sumY = 0; sumXY = 0; sumX2 = 0;
        for (var i = 0; i < n; i++) {
            var p = puntos[i];
            var yNorm = 1 - (p.y / canvas.height);
            var logT = Math.log10(p.t);

            sumX += yNorm;
            sumY += logT;
            sumXY += yNorm * logT;
            sumX2 += yNorm * yNorm;
        }

        var slopeT = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        var interceptT = (sumY - slopeT * sumX) / n;

        // Calcular bounds completos
        var logImin = interceptI;
        var logImax = interceptI + slopeI;
        var logTmin = interceptT;
        var logTmax = interceptT + slopeT;

        var bounds = {
            logImin: logImin,
            logImax: logImax,
            logTmin: logTmin,
            logTmax: logTmax,
            I_min: Math.pow(10, logImin),
            I_max: Math.pow(10, logImax),
            t_min: Math.pow(10, logTmin),
            t_max: Math.pow(10, logTmax),
            regresion: {
                slopeI: slopeI,
                interceptI: interceptI,
                slopeT: slopeT,
                interceptT: interceptT,
                r2: calcularR2(puntos, canvas, slopeI, interceptI, slopeT, interceptT)
            }
        };

        console.log('[TCCPDFImporter] Bounds calculados con regresión (R²=' + bounds.regresion.r2.toFixed(4) + '):', bounds);
        calibracionEstado.activa = false;

        return bounds;
    }

    /**
     * Calcular R² para validar calidad de ajuste
     * @param {Array} puntos - Puntos de calibración
     * @param {HTMLCanvasElement} canvas - Canvas
     * @param {number} slopeI - Pendiente I
     * @param {number} interceptI - Intercepto I
     * @param {number} slopeT - Pendiente T
     * @param {number} interceptT - Intercepto T
     * @returns {number} R²
     */
    function calcularR2(puntos, canvas, slopeI, interceptI, slopeT, interceptT) {
        var n = puntos.length;
        var ssRes = 0, ssTot = 0;
        var meanLogI = 0, meanLogT = 0;

        for (var i = 0; i < n; i++) {
            meanLogI += Math.log10(puntos[i].I);
            meanLogT += Math.log10(puntos[i].t);
        }
        meanLogI /= n;
        meanLogT /= n;

        for (var i = 0; i < n; i++) {
            var p = puntos[i];
            var xNorm = p.x / canvas.width;
            var yNorm = 1 - (p.y / canvas.height);
            var logI = Math.log10(p.I);
            var logT = Math.log10(p.t);

            var predI = interceptI + slopeI * xNorm;
            var predT = interceptT + slopeT * yNorm;

            ssRes += Math.pow(logI - predI, 2) + Math.pow(logT - predT, 2);
            ssTot += Math.pow(logI - meanLogI, 2) + Math.pow(logT - meanLogT, 2);
        }

        return 1 - (ssRes / ssTot);
    }

    /**
     * Calcular bounds desde 2 puntos de calibración (legacy)
     * @returns {Object} Bounds calculados
     */
    function calcularBoundsDesdePuntos() {
        if (calibracionEstado.puntos.length < 2) {
            throw new Error('Se necesitan al menos 2 puntos de calibración');
        }

        var p1 = calibracionEstado.puntos[0];
        var p2 = calibracionEstado.puntos[1];
        var canvas = calibracionEstado.canvas;

        // Calcular escala log desde los 2 puntos
        var x1 = p1.x / canvas.width;
        var x2 = p2.x / canvas.width;
        var y1 = 1 - (p1.y / canvas.height);
        var y2 = 1 - (p2.y / canvas.height);

        var logI1 = Math.log10(p1.I);
        var logI2 = Math.log10(p2.I);
        var logT1 = Math.log10(p1.t);
        var logT2 = Math.log10(p2.t);

        // Calcular bounds completos asumiendo rango estándar
        var logImin = logI1 - (x1 / (x2 - x1)) * (logI2 - logI1);
        var logImax = logI2 + ((1 - x2) / (x2 - x1)) * (logI2 - logI1);
        var logTmin = logT1 - (y1 / (y2 - y1)) * (logT2 - logT1);
        var logTmax = logT2 + ((1 - y2) / (y2 - y1)) * (logT2 - logT1);

        var bounds = {
            logImin: logImin,
            logImax: logImax,
            logTmin: logTmin,
            logTmax: logTmax,
            I_min: Math.pow(10, logImin),
            I_max: Math.pow(10, logImax),
            t_min: Math.pow(10, logTmin),
            t_max: Math.pow(10, logTmax)
        };

        console.log('[TCCPDFImporter] Bounds calculados (2 puntos):', bounds);
        calibracionEstado.activa = false;

        return bounds;
    }

    /**
     * Obtener estado de calibración
     * @returns {Object} Estado actual
     */
    function getEstadoCalibracion() {
        return {
            activa: calibracionEstado.activa,
            puntos: calibracionEstado.puntos,
            necesita: calibracionEstado.minPuntos - calibracionEstado.puntos.length,
            minPuntos: calibracionEstado.minPuntos
        };
    }

    /**
     * Clasificar breaker por forma de curva (mejorado)
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @returns {Object} { tipo, confianza, caracteristicas }
     */
    function clasificarPorCurva(curva) {
        if (!curva || curva.length < 10) {
            return { tipo: 'desconocido', confianza: 0.3, caracteristicas: {} };
        }

        // Analizar pendientes en diferentes zonas
        var pendientes = [];
        for (var i = 1; i < curva.length; i++) {
            var p1 = curva[i - 1];
            var p2 = curva[i];
            var slope = (Math.log10(p2.t) - Math.log10(p1.t)) / (Math.log10(p2.I) - Math.log10(p1.I));
            pendientes.push(slope);
        }

        // Calcular estadísticas de pendiente
        var meanSlope = pendientes.reduce(function(a, b) { return a + b; }, 0) / pendientes.length;
        var varSlope = pendientes.reduce(function(a, b) { return a + Math.pow(b - meanSlope, 2); }, 0) / pendientes.length;

        // Detectar zonas características
        var zonaTermica = 0, zonaMagnetica = 0, zonaInstantanea = 0;
        for (var i = 0; i < pendientes.length; i++) {
            if (pendientes[i] < -2) zonaTermica++;      // Pendiente negativa fuerte (inversa)
            else if (pendientes[i] > -0.5 && pendientes[i] < 0.5) zonaMagnetica++; // Casi horizontal
            else zonaInstantanea++;                    // Otras
        }

        var caracteristicas = {
            meanSlope: meanSlope,
            varSlope: varSlope,
            zonaTermica: zonaTermica / pendientes.length,
            zonaMagnetica: zonaMagnetica / pendientes.length,
            zonaInstantanea: zonaInstantanea / pendientes.length
        };

        // Clasificación por características
        var tipo = 'desconocido';
        var confianza = 0.5;

        if (caracteristicas.zonaTermica > 0.4 && caracteristicas.zonaMagnetica > 0.2) {
            tipo = 'LSIG'; // Tiene zona térmica inversa + zona magnética
            confianza = 0.85;
        } else if (caracteristicas.zonaTermica > 0.6) {
            tipo = 'termomagnetico'; // Predominantemente térmico
            confianza = 0.75;
        } else if (caracteristicas.zonaMagnetica > 0.5) {
            tipo = 'electronico'; // Predominantemente electrónico
            confianza = 0.7;
        }

        console.log('[TCCPDFImporter] Curva clasificada: ' + tipo + ' (confianza: ' + confianza + ')', caracteristicas);

        return {
            tipo: tipo,
            confianza: confianza,
            caracteristicas: caracteristicas
        };
    }

    /**
     * Validación física de curva
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @returns {Object} { valida, errores }
     */
    function validarCurva(curva) {
        var errores = [];

        if (!curva || curva.length < 5) {
            return { valida: false, errores: ['Curva vacía o insuficiente'] };
        }

        // 1. Monotonicidad (t debe disminuir al aumentar I)
        for (var i = 1; i < curva.length; i++) {
            if (curva[i].t > curva[i - 1].t * 1.1) { // Permitir 10% tolerancia
                errores.push('No monótona en índice ' + i + ': t(' + curva[i].I + ')=' + curva[i].t + ' > t(' + curva[i-1].I + ')=' + curva[i-1].t);
            }
        }

        // 2. Pendiente física (no debe ser positiva en zona térmica)
        var pendientes = [];
        for (var i = 1; i < Math.min(curva.length, 10); i++) {
            var slope = (Math.log10(curva[i].t) - Math.log10(curva[i - 1].t)) / (Math.log10(curva[i].I) - Math.log10(curva[i - 1].I));
            pendientes.push(slope);
        }
        var meanSlope = pendientes.reduce(function(a, b) { return a + b; }, 0) / pendientes.length;
        if (meanSlope > 0) {
            errores.push('Pendiente promedio positiva en zona térmica: ' + meanSlope.toFixed(2));
        }

        // 3. Límites térmicos (t no debe ser > 1000s ni < 0.01s)
        for (var i = 0; i < curva.length; i++) {
            if (curva[i].t > 1000) {
                errores.push('Tiempo excesivo en índice ' + i + ': ' + curva[i].t + 's');
            }
            if (curva[i].t < 0.001) {
                errores.push('Tiempo demasiado bajo en índice ' + i + ': ' + curva[i].t + 's');
            }
        }

        // 4. Continuidad (no debe haber saltos bruscos)
        for (var i = 1; i < curva.length; i++) {
            var ratioT = curva[i].t / curva[i - 1].t;
            var ratioI = curva[i].I / curva[i - 1].I;
            if (ratioT > 10 && ratioI < 2) {
                errores.push('Salto brusco en índice ' + i + ': t ratio=' + ratioT.toFixed(1) + ', I ratio=' + ratioI.toFixed(1));
            }
        }

        return {
            valida: errores.length === 0,
            errores: errores
        };
    }

    /**
     * Detección de banda real (min/max desde grosor de curva)
     * @param {HTMLCanvasElement} canvas - Canvas del PDF
     * @param {Object} colorConfig - Configuración de color
     * @returns {Object} { min, max, puntosMin, puntosMax }
     */
    function detectarBanda(canvas, colorConfig) {
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var img = ctx.getImageData(0, 0, width, height);

        var puntosMin = [];
        var puntosMax = [];
        var step = 2;

        // Agrupar píxeles por columna X
        var columnas = {};
        for (var y = 0; y < height; y += step) {
            for (var x = 0; x < width; x += step) {
                var i = (y * width + x) * 4;
                var r = img.data[i];
                var g = img.data[i + 1];
                var b = img.data[i + 2];

                if (matchColor(r, g, b, colorConfig)) {
                    if (!columnas[x]) columnas[x] = [];
                    columnas[x].push(y);
                }
            }
        }

        // Para cada columna, encontrar Y min y max
        Object.keys(columnas).forEach(function(x) {
            var ys = columnas[x];
            if (ys.length > 0) {
                ys.sort(function(a, b) { return a - b; });
                puntosMin.push({ x: parseInt(x), y: ys[0] });
                puntosMax.push({ x: parseInt(x), y: ys[ys.length - 1] });
            }
        });

        console.log('[TCCPDFImporter] Banda detectada: min=' + puntosMin.length + ' puntos, max=' + puntosMax.length + ' puntos');

        return {
            puntosMin: puntosMin,
            puntosMax: puntosMax
        };
    }

    /**
     * Detección automática de múltiples curvas por clustering de color
     * @param {HTMLCanvasElement} canvas - Canvas del PDF
     * @returns {Array} Array de curvas detectadas [{color, puntos}, ...]
     */
    function detectarTodasLasCurvas(canvas) {
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var img = ctx.getImageData(0, 0, width, height);

        // Extraer todos los píxeles de color
        var colores = {};
        var step = 4; // Sample every 4th pixel for performance

        for (var y = 0; y < height; y += step) {
            for (var x = 0; x < width; x += step) {
                var i = (y * width + x) * 4;
                var r = img.data[i];
                var g = img.data[i + 1];
                var b = img.data[i + 2];

                // Ignorar fondo (blanco/gris claro)
                if (r > 200 && g > 200 && b > 200) continue;

                // Agrupar por color similar
                var key = quantizarColor(r, g, b);
                if (!colores[key]) {
                    colores[key] = { r: r, g: g, b: b, puntos: [] };
                }
                colores[key].puntos.push({ x: x, y: y });
            }
        }

        // Filtrar colores con suficientes puntos (curvas reales)
        var curvas = [];
        var umbralPuntos = 50; // Mínimo 50 puntos para considerar curva

        Object.keys(colores).forEach(function(key) {
            if (colores[key].puntos.length >= umbralPuntos) {
                curvas.push({
                    color: {
                        r: colores[key].r,
                        g: colores[key].g,
                        b: colores[key].b,
                        tolerancia: 40
                    },
                    puntos: colores[key].puntos,
                    count: colores[key].puntos.length
                });
            }
        });

        // Ordenar por número de puntos (curvas principales primero)
        curvas.sort(function(a, b) {
            return b.count - a.count;
        });

        console.log('[TCCPDFImporter] Curvas detectadas: ' + curvas.length);
        return curvas;
    }

    /**
     * Quantizar color para clustering
     * @param {number} r - Componente rojo
     * @param {number} g - Componente verde
     * @param {number} b - Componente azul
     * @returns {string} Key de color quantizado
     */
    function quantizarColor(r, g, b) {
        var q = 32; // Quantization level
        return Math.floor(r / q) + '_' + Math.floor(g / q) + '_' + Math.floor(b / q);
    }

    /**
     * Reconocimiento básico de breaker por patrones en PDF
     * @param {HTMLCanvasElement} canvas - Canvas del PDF
     * @returns {Object} { fabricante, modelo, confianza }
     */
    function reconocerBreaker(canvas) {
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var img = ctx.getImageData(0, 0, width, height);

        // Análisis de color predominante
        var colorPromedio = { r: 0, g: 0, b: 0, count: 0 };
        var step = 10;

        for (var y = 0; y < height; y += step) {
            for (var x = 0; x < width; x += step) {
                var i = (y * width + x) * 4;
                var r = img.data[i];
                var g = img.data[i + 1];
                var b = img.data[i + 2];

                // Ignorar fondo
                if (r > 230 && g > 230 && b > 230) continue;

                colorPromedio.r += r;
                colorPromedio.g += g;
                colorPromedio.b += b;
                colorPromedio.count++;
            }
        }

        if (colorPromedio.count > 0) {
            colorPromedio.r /= colorPromedio.count;
            colorPromedio.g /= colorPromedio.count;
            colorPromedio.b /= colorPromedio.count;
        }

        // Clasificación simple por color
        var fabricante = 'desconocido';
        var modelo = 'generico';
        var confianza = 0.5;

        // Schneider: rojo dominante
        if (colorPromedio.r > 150 && colorPromedio.g < 100 && colorPromedio.b < 100) {
            fabricante = 'Schneider';
            modelo = 'PowerPact/ComPact';
            confianza = 0.7;
        }
        // Siemens: azul dominante
        else if (colorPromedio.b > 150 && colorPromedio.r < 100 && colorPromedio.g < 150) {
            fabricante = 'Siemens';
            modelo = 'Sentron';
            confianza = 0.7;
        }
        // ABB: naranja/amarillo
        else if (colorPromedio.r > 180 && colorPromedio.g > 100 && colorPromedio.b < 100) {
            fabricante = 'ABB';
            modelo = 'SACE';
            confianza = 0.6;
        }
        // GE: verde
        else if (colorPromedio.g > 150 && colorPromedio.r < 100 && colorPromedio.b < 100) {
            fabricante = 'GE';
            modelo = 'EntelliGuard';
            confianza = 0.6;
        }

        console.log('[TCCPDFImporter] Breaker reconocido: ' + fabricante + ' ' + modelo + ' (confianza: ' + confianza + ')');

        return {
            fabricante: fabricante,
            modelo: modelo,
            confianza: confianza,
            colorPromedio: colorPromedio
        };
    }

    /**
     * Importar todas las curvas detectadas automáticamente
     * @param {File} file - Archivo PDF
     * @returns {Promise<Array>} Array de curvas importadas
     */
    function importarTodasLasCurvas(file) {
        return pdfToCanvas(file).then(function(canvas) {
            var curvasDetectadas = detectarTodasLasCurvas(canvas);
            var breakerInfo = reconocerBreaker(canvas);
            var preset = getPreset(breakerInfo.fabricante);

            var curvasImportadas = [];

            for (var i = 0; i < curvasDetectadas.length; i++) {
                var curvaDetectada = curvasDetectadas[i];
                var config = {
                    color: curvaDetectada.color,
                    bounds: preset.bounds,
                    tipo: preset.tipo + '_' + i
                };

                var curva = mapearLogLog(curvaDetectada.puntos, config.bounds, canvas);
                var curvaSuave = suavizar(curva);
                var interpolador = generarFuncion(curvaSuave);

                curvasImportadas.push({
                    puntos: curvaSuave,
                    f: interpolador,
                    origen: 'PDF_AUTO',
                    tipoCurva: config.tipo,
                    color: curvaDetectada.color,
                    breakerInfo: breakerInfo
                });
            }

            console.log('[TCCPDFImporter] Curvas importadas automáticamente: ' + curvasImportadas.length);
            return curvasImportadas;
        });
    }

    /**
     * Presets de configuración por fabricante
     */
    var presets = {
        schneider: {
            color: { r: 200, g: 0, b: 0, tolerancia: 60 },
            bounds: {
                logImin: 1,   // 10A
                logImax: 5,   // 100kA
                logTmin: -2,  // 0.01s
                logTmax: 3    // 1000s
            },
            tipo: 'LSIG'
        },
        siemens: {
            color: { r: 0, g: 100, b: 200, tolerancia: 60 },
            bounds: {
                logImin: 1,
                logImax: 5,
                logTmin: -2,
                logTmax: 3
            },
            tipo: 'electronico'
        },
        abb: {
            color: { r: 200, g: 50, b: 0, tolerancia: 60 },
            bounds: {
                logImin: 1,
                logImax: 5,
                logTmin: -2,
                logTmax: 3
            },
            tipo: 'termomagnetico'
        }
    };

    /**
     * Obtener preset por fabricante
     * @param {string} fabricante - Nombre del fabricante
     * @returns {Object} Configuración preset
     */
    function getPreset(fabricante) {
        return presets[fabricante.toLowerCase()] || presets.schneider;
    }

    return {
        importarCurvaDesdePDF: importarCurvaDesdePDF,
        importarDesdePDF: importarDesdePDF,
        importarTodasLasCurvas: importarTodasLasCurvas,
        detectarCurvaPorColor: detectarCurvaPorColor,
        detectarTodasLasCurvas: detectarTodasLasCurvas,
        reconocerBreaker: reconocerBreaker,
        clasificarPorCurva: clasificarPorCurva,
        validarCurva: validarCurva,
        detectarBanda: detectarBanda,
        calibrar: calibrar,
        iniciarCalibracionInteractiva: iniciarCalibracionInteractiva,
        clickCalibracion: clickCalibracion,
        getEstadoCalibracion: getEstadoCalibracion,
        generarBanda: generarBanda,
        overlayCanvas: overlayCanvas,
        setConfig: setConfig,
        getConfig: getConfig,
        getPreset: getPreset,
        presets: presets,
        config: config
    };

})();

if (typeof window !== 'undefined') {
    window.TCCPDFImporter = TCCPDFImporter;
}
