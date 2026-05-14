/**
 * tcc_digitalizer_pro.js — Motor de Digitalización de Curvas TCC
 * 
 * Pipeline profesional: PDF → Imagen → Puntos → Curva matemática → TCC engine
 * Ingeniería inversa de gráficas log-log tipo ETAP/SKM
 * 
 * Arquitectura:
 * 1. PDF → Canvas (renderizado real)
 * 2. Canvas → Píxeles (detección de curva por color)
 * 3. Píxeles → Log-Log (mapeo a valores reales)
 * 4. Puntos → Interpolación (curva matemática)
 * 5. Banda min/max (tolerancias de fabricante)
 */

var TCCDigitalizerPro = (function() {

    /**
     * Configuración de bounds del gráfico TCC
     * @typedef {Object} Bounds
     * @property {number} xMin - Pixel X mínimo
     * @property {number} xMax - Pixel X máximo
     * @property {number} yMin - Pixel Y mínimo
     * @property {number} yMax - Pixel Y máximo
     * @property {number} I_min - Corriente mínima real (A)
     * @property {number} I_max - Corriente máxima real (A)
     * @property {number} t_min - Tiempo mínimo real (s)
     * @property {number} t_max - Tiempo máximo real (s)
     */

    /**
     * Convierte valor pixel a valor real en escala log-log
     * @param {number} valorPixel - Valor en píxeles
     * @param {number} minPixel - Píxel mínimo
     * @param {number} maxPixel - Píxel máximo
     * @param {number} minReal - Valor real mínimo
     * @param {number} maxReal - Valor real máximo
     * @returns {number} Valor real interpolado
     */
    function pixelToLog(valorPixel, minPixel, maxPixel, minReal, maxReal) {
        var ratio = (valorPixel - minPixel) / (maxPixel - minPixel);
        
        return Math.pow(10,
            Math.log10(minReal) +
            ratio * (Math.log10(maxReal) - Math.log10(minReal))
        );
    }

    /**
     * Convierte valor real a pixel en escala log-log
     * @param {number} valorReal - Valor real
     * @param {number} minPixel - Píxel mínimo
     * @param {number} maxPixel - Píxel máximo
     * @param {number} minReal - Valor real mínimo
     * @param {number} maxReal - Valor real máximo
     * @returns {number} Valor en píxeles
     */
    function logToPixel(valorReal, minPixel, maxPixel, minReal, maxReal) {
        var logReal = Math.log10(valorReal);
        var logMin = Math.log10(minReal);
        var logMax = Math.log10(maxReal);
        
        var ratio = (logReal - logMin) / (logMax - logMin);
        
        return minPixel + ratio * (maxPixel - minPixel);
    }

    /**
     * Extrae píxeles de la curva desde canvas (detección por color)
     * @param {HTMLCanvasElement} canvas - Canvas con la imagen del PDF
     * @param {Object} config - Configuración de detección
     * @returns {Array} Array de puntos {x, y}
     */
    function extraerPixelesCurva(canvas, config) {
        config = config || {
            colorR: 200,      // Componente rojo mínimo
            colorG: 50,       // Componente verde máximo
            colorB: 50,       // Componente azul máximo
            tolerancia: 30    // Tolerancia de color
        };

        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;

        var data = ctx.getImageData(0, 0, width, height).data;
        var puntos = [];

        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var i = (y * width + x) * 4;

                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];

                // Detectar línea por color (ej: roja)
                if (r >= config.colorR - config.tolerancia &&
                    g <= config.colorG + config.tolerancia &&
                    b <= config.colorB + config.tolerancia) {
                    puntos.push({ x: x, y: y });
                }
            }
        }

        console.log('[TCCDigitalizerPro] Píxeles detectados: ' + puntos.length);
        return puntos;
    }

    /**
     * Convierte píxeles a curva TCC real (mapeo log-log)
     * @param {Array} puntos - Array de píxeles {x, y}
     * @param {Bounds} bounds - Límites del gráfico
     * @returns {Array} Curva TCC [{I, t}, ...]
     */
    function convertirACurva(puntos, bounds) {
        if (!puntos || puntos.length === 0) return [];

        var curva = [];

        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i];

            // Mapeo X → I (corriente)
            var I = pixelToLog(p.x, bounds.xMin, bounds.xMax, bounds.I_min, bounds.I_max);

            // Mapeo Y → t (tiempo) - invertir Y porque canvas Y crece hacia abajo
            var t = pixelToLog(bounds.yMax - p.y, 0, bounds.yMax, bounds.t_min, bounds.t_max);

            curva.push({ I: I, t: t });
        }

        // Ordenar por corriente
        curva.sort(function(a, b) {
            return a.I - b.I;
        });

        // Eliminar duplicados cercanos
        var curvaFiltrada = [];
        var ultimoI = -1;

        for (var i = 0; i < curva.length; i++) {
            if (Math.abs(curva[i].I - ultimoI) > 0.01) {
                curvaFiltrada.push(curva[i]);
                ultimoI = curva[i].I;
            }
        }

        console.log('[TCCDigitalizerPro] Curva generada: ' + curvaFiltrada.length + ' puntos');
        return curvaFiltrada;
    }

    /**
     * Interpolación log-log entre dos puntos
     * @param {Object} p1 - Punto 1 {I, t}
     * @param {Object} p2 - Punto 2 {I, t}
     * @param {number} I - Corriente de interpolación
     * @returns {number} Tiempo interpolado
     */
    function interpLogLog(p1, p2, I) {
        return Math.pow(10,
            Math.log10(p1.t) +
            (Math.log10(I) - Math.log10(p1.I)) *
            (Math.log10(p2.t) - Math.log10(p1.t)) /
            (Math.log10(p2.I) - Math.log10(p1.I))
        );
    }

    /**
     * Genera función de evaluación de curva interpolada
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @returns {Function} Función f(I) → t
     */
    function generarCurvaInterpolada(curva) {
        if (!curva || curva.length === 0) {
            return function(I) { return Infinity; };
        }

        // Ordenar por corriente
        curva.sort(function(a, b) {
            return a.I - b.I;
        });

        return function(I) {
            // Fuera de rango inferior
            if (I <= curva[0].I) return curva[0].t;

            // Fuera de rango superior
            if (I >= curva[curva.length - 1].I) return curva[curva.length - 1].t;

            // Buscar segmento e interpolar
            for (var i = 0; i < curva.length - 1; i++) {
                if (I >= curva[i].I && I <= curva[i + 1].I) {
                    return interpLogLog(curva[i], curva[i + 1], I);
                }
            }

            return Infinity;
        };
    }

    /**
     * Estructura de banda de curva (min/max)
     * @typedef {Object} CurvaBanda
     * @property {Function} min - Función f(I) → t_min
     * @property {Function} max - Función f(I) → t_max
     */

    /**
     * Genera banda de curva (min/max)
     * @param {Array} curvaMin - Curva mínima [{I, t}, ...]
     * @param {Array} curvaMax - Curva máxima [{I, t}, ...]
     * @returns {CurvaBanda} Banda de curva
     */
    function generarBanda(curvaMin, curvaMax) {
        return {
            min: generarCurvaInterpolada(curvaMin),
            max: generarCurvaInterpolada(curvaMax)
        };
    }

    /**
     * Evalúa banda de curva a una corriente dada
     * @param {CurvaBanda} banda - Banda de curva
     * @param {number} I - Corriente de evaluación
     * @returns {Object} { t_min, t_max }
     */
    function evaluarBanda(banda, I) {
        return {
            t_min: banda.min(I),
            t_max: banda.max(I)
        };
    }

    /**
     * Verifica coordinación real entre bandas
     * @param {CurvaBanda} upstream - Banda upstream
     * @param {CurvaBanda} downstream - Banda downstream
     * @param {number} I - Corriente de evaluación
     * @returns {Object} { coordinado, margen }
     */
    function verificarCoordinacionBanda(upstream, downstream, I) {
        var up = evaluarBanda(upstream, I);
        var down = evaluarBanda(downstream, I);

        var coordinado = down.t_max < up.t_min;
        var margen = up.t_min - down.t_max;

        return {
            coordinado: coordinado,
            margen: margen,
            upstream: up,
            downstream: down
        };
    }

    /**
     * Suaviza curva eliminando ruido
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @param {number} ventana - Tamaño de ventana para suavizado
     * @returns {Array} Curva suavizada
     */
    function suavizarCurva(curva, ventana) {
        ventana = ventana || 3;
        if (curva.length < ventana) return curva;

        var suavizada = [];

        for (var i = 0; i < curva.length; i++) {
            var inicio = Math.max(0, i - Math.floor(ventana / 2));
            var fin = Math.min(curva.length - 1, i + Math.floor(ventana / 2));

            var sumT = 0;
            var count = 0;

            for (var j = inicio; j <= fin; j++) {
                sumT += curva[j].t;
                count++;
            }

            suavizada.push({
                I: curva[i].I,
                t: sumT / count
            });
        }

        return suavizada;
    }

    /**
     * Pipeline completo de digitalización
     * @param {HTMLCanvasElement} canvas - Canvas con imagen del PDF
     * @param {Bounds} bounds - Límites del gráfico
     * @param {Object} config - Configuración de detección
     * @returns {Object} { curva, funcion, banda }
     */
    function digitalizarCurva(canvas, bounds, config) {
        // Paso 1: Extraer píxeles
        var pixeles = extraerPixelesCurva(canvas, config);

        // Paso 2: Convertir a curva
        var curva = convertirACurva(pixeles, bounds);

        // Paso 3: Suavizar
        curva = suavizarCurva(curva, 3);

        // Paso 4: Generar función interpolada
        var funcion = generarCurvaInterpolada(curva);

        return {
            curva: curva,
            funcion: funcion,
            puntos: pixeles.length
        };
    }

    /**
     * Digitaliza banda completa (min + max)
     * @param {HTMLCanvasElement} canvas - Canvas con imagen del PDF
     * @param {Bounds} bounds - Límites del gráfico
     * @param {Object} configMin - Configuración para curva mínima
     * @param {Object} configMax - Configuración para curva máxima
     * @returns {Object} { banda, curvaMin, curvaMax }
     */
    function digitalizarBanda(canvas, bounds, configMin, configMax) {
        var min = digitalizarCurva(canvas, bounds, configMin);
        var max = digitalizarCurva(canvas, bounds, configMax);

        var banda = generarBanda(min.curva, max.curva);

        return {
            banda: banda,
            curvaMin: min.curva,
            curvaMax: max.curva,
            funcionMin: min.funcion,
            funcionMax: max.funcion
        };
    }

    /**
     * Bounds por defecto para gráficos TCC estándar
     * @param {number} width - Ancho del canvas
     * @param {number} height - Alto del canvas
     * @returns {Bounds} Bounds configurados
     */
    function boundsDefault(width, height) {
        return {
            xMin: 50,
            xMax: width - 50,
            yMin: 50,
            yMax: height - 50,
            I_min: 1,
            I_max: 10000,
            t_min: 0.01,
            t_max: 1000
        };
    }

    return {
        pixelToLog: pixelToLog,
        logToPixel: logToPixel,
        extraerPixelesCurva: extraerPixelesCurva,
        convertirACurva: convertirACurva,
        interpLogLog: interpLogLog,
        generarCurvaInterpolada: generarCurvaInterpolada,
        generarBanda: generarBanda,
        evaluarBanda: evaluarBanda,
        verificarCoordinacionBanda: verificarCoordinacionBanda,
        suavizarCurva: suavizarCurva,
        digitalizarCurva: digitalizarCurva,
        digitalizarBanda: digitalizarBanda,
        boundsDefault: boundsDefault
    };

})();

if (typeof window !== 'undefined') {
    window.TCCDigitalizerPro = TCCDigitalizerPro;
}
