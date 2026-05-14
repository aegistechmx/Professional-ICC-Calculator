/**
 * tcc_chart_real.js — Gráfica TCC real tipo ETAP/SKM/EasyPower
 * Modelo matemático de curvas inversas, escala log-log, detección de cruce
 */
var TCCChartReal = (function() {

    /**
     * Tipos de curva IEC 60255
     */
    var CURVA_IEC = {
        NORMAL_INVERSE: { k: 0.14, alpha: 0.02, nombre: 'Normal Inverse' },
        VERY_INVERSE: { k: 13.5, alpha: 1, nombre: 'Very Inverse' },
        EXTREMELY_INVERSE: { k: 80, alpha: 2, nombre: 'Extremely Inverse' },
        LONG_TIME: { k: 120, alpha: 1, nombre: 'Long Time' }
    };

    /**
     * Curva TCC inversa (modelo real)
     * t = k / ((I/Ir)^alpha - 1)
     * @param {number} I - Corriente (A)
     * @param {number} Ir - Pickup / corriente nominal ajustada (A)
     * @param {number} k - Constante de la curva
     * @param {number} alpha - Exponente de la curva
     * @returns {number} Tiempo de operación (s)
     */
    function curvaTCC(I, Ir, k = 0.14, alpha = 0.02) {
        if (I <= Ir) return Infinity;
        if (I <= 0) return Infinity;
        var ratio = I / Ir;
        return k / (Math.pow(ratio, alpha) - 1);
    }

    /**
     * Generar datos TCC en escala log
     * @param {number} Ir - Pickup (A)
     * @param {number} k - Constante de curva
     * @param {number} alpha - Exponente
     * @param {number} maxI - Corriente máxima (default 10×Ir)
     * @returns {Array} [{ I, t }]
     */
    function generarDatosTCC(Ir, k = 0.14, alpha = 0.02, maxI = null) {
        var data = [];
        if (!maxI) maxI = Ir * 10;

        for (var i = 1; i <= 100; i++) {
            var I = Ir * (1 + i * 0.09); // desde Ir hasta ~10×Ir
            if (I > maxI) break;

            var t = curvaTCC(I, Ir, k, alpha);

            if (t > 0 && t < 10000 && t !== Infinity) {
                data.push({ I: I, t: t });
            }
        }

        return data;
    }

    /**
     * Detectar cruce entre dos curvas (coordination check)
     * @param {Array} curvaA - Datos curva upstream
     * @param {Array} curvaB - Datos curva downstream
     * @param {number} margen - Margen de separación (default 0.2 = 20%)
     * @returns {Object} { conflicto, punto, separacion }
     */
    function detectarCruce(curvaA, curvaB, margen = 0.2) {
        if (!curvaA || !curvaB || curvaA.length === 0 || curvaB.length === 0) {
            return { conflicto: false, mensaje: 'Datos insuficientes' };
        }

        var minSeparacion = Infinity;
        var puntoCruce = null;

        // Buscar el punto de menor separación
        for (var i = 0; i < Math.min(curvaA.length, curvaB.length); i++) {
            var tA = curvaA[i].t;
            var tB = curvaB[i].t;

            if (tA === Infinity || tB === Infinity) continue;

            var separacion = tB > 0 ? (tA - tB) / tB : Infinity; // Separación relativa

            if (separacion < minSeparacion) {
                minSeparacion = separacion;
                puntoCruce = { I: curvaA[i].I, tA: tA, tB: tB };
            }
        }

        // Conflicto si separación < margen
        var conflicto = minSeparacion < margen;

        return {
            conflicto: conflicto,
            punto: puntoCruce,
            separacion: minSeparacion,
            margenRequerido: margen,
            mensaje: conflicto ?
                'Cruce detectado en I=' + (puntoCruce ? (puntoCruce.I || 0).toFixed(0) : 'N/A') + 'A, separación=' + ((minSeparacion * 100) || 0).toFixed(1) + '%' :
                'Curvas coordinadas, separación=' + ((minSeparacion * 100) || 0).toFixed(1) + '%'
        };
    }

    /**
     * Corregir TCC automáticamente
     * @param {Object} nodoUp - Nodo upstream
     * @param {Object} nodoDown - Nodo downstream
     * @returns {Object} Cambios aplicados
     */
    function corregirTCC(nodoUp, nodoDown) {
        var cambios = [];

        if (!nodoUp.equip) nodoUp.equip = {};
        if (!nodoDown.equip) nodoDown.equip = {};

        // Aumentar delay upstream (más lento)
        if (!nodoUp.equip.delay) nodoUp.equip.delay = 0.1;
        var delayAnterior = nodoUp.equip.delay;
        nodoUp.equip.delay *= 1.2;
        cambios.push({
            nodo: nodoUp.id,
            campo: 'delay',
            valor: nodoUp.equip.delay,
            anterior: delayAnterior,
            razon: 'Aumentar delay para coordinación'
        });

        // Reducir pickup downstream (más sensible)
        if (!nodoDown.equip.pickup) nodoDown.equip.pickup = nodoDown.equip.cap || 400;
        var pickupAnterior = nodoDown.equip.pickup;
        nodoDown.equip.pickup *= 0.9;
        cambios.push({
            nodo: nodoDown.id,
            campo: 'pickup',
            valor: nodoDown.equip.pickup,
            anterior: pickupAnterior,
            razon: 'Reducir pickup para sensibilidad'
        });

        return cambios;
    }

    /**
     * Dibujar gráfica TCC en Canvas
     * @param {string} canvasId - ID del canvas
     * @param {Array} curvas - Array de curvas [{ data, color, nombre }]
     */
    function dibujarTCC(canvasId, curvas) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Configuración de escala log
        var I_min = 10; // 10 A
        var I_max = 10000; // 10 kA
        var t_min = 0.01; // 10 ms
        var t_max = 100; // 100 s

        // Funciones de mapeo log
        function logX(I) {
            if (I <= 0) return -Infinity;
            return Math.log10(I);
        }

        function logY(t) {
            if (t <= 0) return -Infinity;
            return Math.log10(t);
        }

        function mapX(x) {
            var xMin = logX(I_min);
            var xMax = logX(I_max);
            return ((x - xMin) / (xMax - xMin)) * (canvas.width - 60) + 50;
        }

        function mapY(y) {
            var yMin = logY(t_min);
            var yMax = logY(t_max);
            return canvas.height - 40 - ((y - yMin) / (yMax - yMin)) * (canvas.height - 80);
        }

        // Dibujar grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Grid vertical (corriente)
        for (var I = 10; I <= 10000; I *= 10) {
            var x = mapX(logX(I));
            ctx.beginPath();
            ctx.moveTo(x, 40);
            ctx.lineTo(x, canvas.height - 40);
            ctx.stroke();

            // Etiqueta
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(I >= 1000 ? (I / 1000) + 'k' : I + 'A', x, canvas.height - 25);
        }

        // Grid horizontal (tiempo)
        for (var t = 0.01; t <= 100; t *= 10) {
            var y = mapY(logY(t));
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(canvas.width - 10, y);
            ctx.stroke();

            // Etiqueta
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(t >= 1 ? t + 's' : (t * 1000) + 'ms', 45, y + 3);
        }

        // Ejes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 40);
        ctx.lineTo(50, canvas.height - 40);
        ctx.lineTo(canvas.width - 10, canvas.height - 40);
        ctx.stroke();

        // Títulos
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Corriente (A)', canvas.width / 2 + 20, canvas.height - 5);

        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Tiempo (s)', 0, 0);
        ctx.restore();

        // Dibujar curvas
        curvas.forEach(function(curva) {
            if (!curva.data || curva.data.length === 0) return;

            ctx.beginPath();
            ctx.strokeStyle = curva.color || 'blue';
            ctx.lineWidth = 2;

            curva.data.forEach(function(p, i) {
                var x = mapX(logX(p.I));
                var y = mapY(logY(p.t));

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Leyenda
            ctx.fillStyle = curva.color || 'blue';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            var legendY = 20 + curvas.indexOf(curva) * 15;
            ctx.fillText('● ' + (curva.nombre || 'Curva'), canvas.width - 150, legendY);
        });
    }

    /**
     * Generar gráfica TCC para un sistema completo
     * @param {Array} nodos - Nodos del sistema
     * @param {string} canvasId - ID del canvas
     */
    function generarTCCSistema(nodos, canvasId) {
        if (!nodos || nodos.length === 0) return;

        var curvas = [];

        nodos.forEach(function(nodo, index) {
            if (!nodo.equip) return;

            var Ir = nodo.equip.pickup || nodo.equip.cap || 400;
            var tipoCurva = CURVA_IEC.NORMAL_INVERSE;

            // Usar curva configurada si existe
            if (nodo.equip.tipoCurva && CURVA_IEC[nodo.equip.tipoCurva]) {
                tipoCurva = CURVA_IEC[nodo.equip.tipoCurva];
            }

            var data = generarDatosTCC(Ir, tipoCurva.k, tipoCurva.alpha);

            var color = index === 0 ? 'red' : // Upstream
                        index === 1 ? 'blue' : // Downstream
                        index === 2 ? 'green' : 'orange';

            curvas.push({
                data: data,
                color: color,
                nombre: nodo.id + ' (' + tipoCurva.nombre + ')',
                Ir: Ir
            });
        });

        dibujarTCC(canvasId, curvas);

        // Detectar cruces entre curvas adyacentes
        var cruces = [];
        for (var i = 0; i < curvas.length - 1; i++) {
            var cruce = detectarCruce(curvas[i].data, curvas[i + 1].data);
            cruces.push({
                upstream: curvas[i].nombre,
                downstream: curvas[i + 1].nombre,
                resultado: cruce
            });
        }

        return { curvas: curvas, cruces: cruces };
    }

    return {
        CURVA_IEC: CURVA_IEC,
        curvaTCC: curvaTCC,
        generarDatosTCC: generarDatosTCC,
        detectarCruce: detectarCruce,
        corregirTCC: corregirTCC,
        dibujarTCC: dibujarTCC,
        generarTCCSistema: generarTCCSistema
    };
})();

if (typeof window !== 'undefined') {
    window.TCCChartReal = TCCChartReal;
}
