/**
 * tcc_viewer_pro.js — Visor TCC Profesional tipo ETAP
 * 
 * Curvas log–log + sliders en vivo + zoom/pan profesional + bandas de tolerancia
 * 
 * Arquitectura:
 * Datos (curvas reales + TCC) → Interpolación log-log → Motor de tiempos → Canvas → Sliders → recalcular → re-render
 */

var TCCViewerPro = (function() {

    var canvas = null;
    var ctx = null;
    var nodos = [];
    var nodoActivo = null;

    // Estado de vista (zoom/pan)
    var view = {
        Imin: 100,
        Imax: 50000,
        Tmin: 0.01,
        Tmax: 1000
    };

    // Estado de arrastre
    var dragging = false;
    var last = null;

    /**
     * Inicializar canvas
     */
    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('[TCC Viewer Pro] Canvas no encontrado: ' + canvasId);
            return false;
        }
        ctx = canvas.getContext('2d');
        
        // Configurar eventos de zoom/pan
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseUp);
        
        return true;
    }

    /**
     * Escala logarítmica X (corriente) - usa view actual
     */
    function logX(I) {
        if (I <= 0) I = view.Imin;
        return (
            (Math.log10(I) - Math.log10(view.Imin)) /
            (Math.log10(view.Imax) - Math.log10(view.Imin))
        ) * canvas.width;
    }

    /**
     * Escala logarítmica Y (tiempo) - usa view actual
     */
    function logY(t) {
        if (t <= 0) t = view.Tmin;
        return canvas.height - (
            (Math.log10(t) - Math.log10(view.Tmin)) /
            (Math.log10(view.Tmax) - Math.log10(view.Tmin))
        ) * canvas.height;
    }

    /**
     * Inversa logarítmica X (pixel → corriente)
     */
    function invLogX(px) {
        var ratio = px / canvas.width;
        return Math.pow(10,
            Math.log10(view.Imin) +
            ratio * (Math.log10(view.Imax) - Math.log10(view.Imin))
        );
    }

    /**
     * Inversa logarítmica Y (pixel → tiempo)
     */
    function invLogY(py) {
        var ratio = 1 - (py / canvas.height);
        return Math.pow(10,
            Math.log10(view.Tmin) +
            ratio * (Math.log10(view.Tmax) - Math.log10(view.Tmin))
        );
    }

    /**
     * Zoom con rueda (tipo ETAP) - log-log domain
     */
    function onWheel(e) {
        e.preventDefault();

        var factor = e.deltaY > 0 ? 1.2 : 0.8;

        var mouseI = invLogX(e.offsetX);
        var mouseT = invLogY(e.offsetY);

        view.Imin = mouseI * Math.pow(view.Imin / mouseI, factor);
        view.Imax = mouseI * Math.pow(view.Imax / mouseI, factor);

        view.Tmin = mouseT * Math.pow(view.Tmin / mouseT, factor);
        view.Tmax = mouseT * Math.pow(view.Tmax / mouseT, factor);

        // Limitar rangos mínimos
        view.Imin = Math.max(view.Imin, 10);
        view.Tmin = Math.max(view.Tmin, 0.001);

        renderTCC(nodos);
    }

    /**
     * Inicio de arrastre
     */
    function onMouseDown(e) {
        dragging = true;
        last = { offsetX: e.offsetX, offsetY: e.offsetY };
    }

    /**
     * Fin de arrastre
     */
    function onMouseUp() {
        dragging = false;
        last = null;
    }

    /**
     * Arrastre (pan) - log-log domain
     */
    function onMouseMove(e) {
        if (!dragging || !last) return;

        var dx = e.offsetX - last.offsetX;
        var dy = e.offsetY - last.offsetY;

        var factorX = dx / canvas.width;
        var factorY = dy / canvas.height;

        var scaleI = Math.log10(view.Imax / view.Imin);
        var scaleT = Math.log10(view.Tmax / view.Tmin);

        view.Imin *= Math.pow(10, factorX * scaleI);
        view.Imax *= Math.pow(10, factorX * scaleI);

        view.Tmin *= Math.pow(10, factorY * scaleT);
        view.Tmax *= Math.pow(10, factorY * scaleT);

        last = { offsetX: e.offsetX, offsetY: e.offsetY };

        renderTCC(nodos);
    }

    /**
     * Dibujar curva real en canvas
     */
    function dibujarCurva(curva, color, lineWidth, debugMode) {
        if (!curva || curva.length === 0) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 2;

        for (var i = 0; i < curva.length; i++) {
            var p = curva[i];
            var x = logX(p.I);
            var y = logY(p.t);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // 🔥 Debug: dibujar puntos crudos
        if (debugMode) {
            ctx.fillStyle = 'yellow';
            for (var j = 0; j < curva.length; j++) {
                var p2 = curva[j];
                var x2 = logX(p2.I);
                var y2 = logY(p2.t);
                ctx.fillRect(x2 - 1, y2 - 1, 3, 3);
            }
        }
    }

    /**
     * Generar curva TCC desde parámetros - MEJORADA (LSIG)
     */
    function generarCurvaTCC(tcc, In, tipo) {
        tipo = tipo || "fase";
        var puntos = [];
        var I = view.Imin;

        // Usar mejor densidad (1.08 en lugar de 1.15)
        while (I <= view.Imax) {
            var t = 0;

            // Usar TCCCurvasReales si está disponible
            if (typeof TCCCurvasReales !== 'undefined' && TCCCurvasReales.tiempoDisparoLSIG) {
                t = TCCCurvasReales.tiempoDisparoLSIG(I, tcc, In, tipo);
            } else {
                // Fallback a modelo simple
                var longPickup = tcc.long ? tcc.long.pickup * In : (tcc.longDelayPickup || tcc.pickup || 100);
                var longTime = tcc.long ? tcc.long.delay : (tcc.longDelayTime || tcc.longDelay || 6);
                var shortPickup = tcc.short ? tcc.short.pickup * In : (longPickup * 3);
                var shortTime = tcc.short ? tcc.short.delay : (tcc.shortDelay || 0.3);
                var inst = tcc.inst ? tcc.inst.pickup * In : (longPickup * 10);

                if (tipo === "tierra" && tcc.ground) {
                    if (I >= tcc.ground.pickup * In) {
                        t = tcc.ground.delay || 0.2;
                    } else {
                        t = Infinity;
                    }
                } else {
                    if (I < longPickup) {
                        t = longTime * (longPickup / I);
                    } else if (I < shortPickup) {
                        t = shortTime;
                    } else if (I < inst) {
                        t = shortTime;
                    } else {
                        t = 0.02;
                    }
                }
            }

            if (t < Infinity && t > 0) {
                puntos.push({ I: I, t: t });
            }

            I *= 1.08; // Mejor densidad
        }

        // Suavizar curva si está disponible
        if (typeof TCCCurvasReales !== 'undefined' && TCCCurvasReales.suavizarCurva) {
            puntos = TCCCurvasReales.suavizarCurva(puntos);
        }

        return puntos;
    }

    /**
     * Dibujar banda de curva digitalizada (min/max)
     * @param {Object} banda - Banda de curva { min: function, max: function }
     * @param {string} color - Color de la banda
     */
    function dibujarBanda(banda, color) {
        if (!banda || !banda.min || !banda.max) return;

        var I = view.Imin;
        var puntosMin = [];
        var puntosMax = [];

        while (I <= view.Imax) {
            var tMin = banda.min(I);
            var tMax = banda.max(I);

            if (tMin < Infinity && tMin > 0) {
                puntosMin.push({ I: I, t: tMin });
            }
            if (tMax < Infinity && tMax > 0) {
                puntosMax.push({ I: I, t: tMax });
            }

            I *= 1.08;
        }

        // Dibujar área sombreada entre min y max
        ctx.fillStyle = color + '33'; // 20% opacity
        ctx.beginPath();

        // Curva min (izquierda a derecha)
        for (var i = 0; i < puntosMin.length; i++) {
            var p = puntosMin[i];
            var x = logX(p.I);
            var y = logY(p.t);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        // Curva max (derecha a izquierda)
        for (var i = puntosMax.length - 1; i >= 0; i--) {
            var p = puntosMax[i];
            var x = logX(p.I);
            var y = logY(p.t);
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();

        // Dibujar líneas min y max
        dibujarCurva(puntosMin, color, 1);
        dibujarCurva(puntosMax, color, 1);
    }

    /**
     * Dibujar curva digitalizada desde TCCDigitalizerPro
     * @param {Object} curvaDigitalizada - Resultado de digitalizarCurva
     * @param {string} color - Color de la curva
     */
    function dibujarCurvaDigitalizada(curvaDigitalizada, color) {
        if (!curvaDigitalizada || !curvaDigitalizada.curva) return;

        dibujarCurva(curvaDigitalizada.curva, color, 2);
    }

    /**
     * Generar puntos desde función evaluadora
     * @param {Function} f - Función f(I) → t
     * @param {string} etiqueta - Etiqueta para la curva
     * @returns {Array} Puntos [{I, t}, ...]
     */
    function generarPuntosDesdeFuncion(f, etiqueta) {
        var puntos = [];
        var I = view.Imin;

        while (I <= view.Imax) {
            var t = f(I);
            if (t < Infinity && t > 0) {
                puntos.push({ I: I, t: t });
            }
            I *= 1.08;
        }

        return puntos;
    }

    /**
     * Render completo del visor TCC (LSIG - Fase + Tierra) + Curvas Digitalizadas + PDF Importadas
     */
    function renderTCC(nodosInput, curvasDigitalizadas, curvasPDF) {
        if (!ctx) return;

        nodos = nodosInput || nodos;

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar grid
        dibujarGrid();

        // Dibujar curvas PDF importadas (prioridad máxima)
        if (curvasPDF && curvasPDF.length > 0) {
            for (var i = 0; i < curvasPDF.length; i++) {
                var pdf = curvasPDF[i];
                if (pdf.f) {
                    // Generar puntos desde función
                    var puntos = generarPuntosDesdeFuncion(pdf.f, pdf.tipoCurva || 'PDF');
                    dibujarCurva(puntos, '#e74c3c', 3);
                    
                    // Etiqueta
                    ctx.fillStyle = '#e74c3c';
                    ctx.font = 'bold 12px Arial';
                    ctx.fillText('PDF: ' + (pdf.tipoCurva || 'Curva'), 10, 20 + i * 15);
                } else if (pdf.puntos) {
                    dibujarCurvaDigitalizada(pdf, '#e74c3c');
                }
            }
        }

        // Dibujar curvas digitalizadas (si existen)
        if (curvasDigitalizadas && curvasDigitalizadas.length > 0) {
            for (var i = 0; i < curvasDigitalizadas.length; i++) {
                var cd = curvasDigitalizadas[i];
                if (cd.banda) {
                    dibujarBanda(cd.banda, '#3498db');
                } else if (cd.curva) {
                    dibujarCurvaDigitalizada(cd, '#3498db');
                }
            }
        }

        // Dibujar curvas (fase y tierra)
        var coloresFase = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
        var coloresTierra = ['#27ae60', '#16a085', '#1abc9c', '#2ecc71', '#00b894'];
        
        for (var i = 0; i < nodos.length; i++) {
            var nodo = nodos[i];
            if (!nodo.tcc) continue;

            var In = nodo.In || 400; // Default 400A si no está definido

            // Curva FASE (rojo/azul/verde)
            var curvaFase = generarCurvaTCC(nodo.tcc, In, "fase");
            var colorFase = coloresFase[i % coloresFase.length];
            dibujarCurva(curvaFase, colorFase, 2);

            // Curva TIERRA (verde) - si existe ground
            if (nodo.tcc.ground) {
                var curvaTierra = generarCurvaTCC(nodo.tcc, In, "tierra");
                var colorTierra = coloresTierra[i % coloresTierra.length];
                dibujarCurva(curvaTierra, colorTierra, 2, true); // debug mode on para tierra
            }

            // Dibujar etiqueta
            ctx.fillStyle = colorFase;
            ctx.font = '12px Arial';
            var etiqueta = nodo.id;
            if (nodo.tcc.ground) {
                etiqueta += ' (F+G)';
            }
            ctx.fillText(etiqueta, 10, 20 + i * 15);
        }

        // Marcar conflictos de selectividad (con bandas si existen)
        if (curvasDigitalizadas && curvasDigitalizadas.length >= 2) {
            for (var i = 0; i < curvasDigitalizadas.length - 1; i++) {
                var up = curvasDigitalizadas[i];
                var down = curvasDigitalizadas[i + 1];

                if (up.banda && down.banda && typeof TCCDigitalizerPro !== 'undefined') {
                    // Verificar coordinación con bandas
                    var I_test = view.Imin;
                    while (I_test <= view.Imax) {
                        var coord = TCCDigitalizerPro.verificarCoordinacionBanda(up.banda, down.banda, I_test);
                        if (!coord.coordinado) {
                            // Marcar punto de cruce
                            var x = logX(I_test);
                            var y = logY(coord.downstream.t_max);
                            ctx.fillStyle = '#ff0000';
                            ctx.beginPath();
                            ctx.arc(x, y, 5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        I_test *= 1.5;
                    }
                }
            }
        }
        marcarConflictos();
    }

    /**
     * Dibujar grid logarítmico dinámico
     */
    function dibujarGrid() {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;

        // Líneas verticales (corriente) - dinámico según view
        var Istart = Math.pow(10, Math.floor(Math.log10(view.Imin)));
        var Iend = Math.pow(10, Math.ceil(Math.log10(view.Imax)));

        for (var I = Istart; I <= Iend; I *= 10) {
            if (I < view.Imin || I > view.Imax) continue;
            var x = logX(I);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            // Etiqueta
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(formatNumber(I) + 'A', x + 2, canvas.height - 5);
        }

        // Líneas horizontales (tiempo) - dinámico según view
        var Tstart = Math.pow(10, Math.floor(Math.log10(view.Tmin)));
        var Tend = Math.pow(10, Math.ceil(Math.log10(view.Tmax)));

        for (var t = Tstart; t <= Tend; t *= 10) {
            if (t < view.Tmin || t > view.Tmax) continue;
            var y = logY(t);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();

            // Etiqueta
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(formatTime(t) + 's', 5, y - 2);
        }
    }

    /**
     * Formatear número para etiquetas
     */
    function formatNumber(n) {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return n.toFixed(0);
    }

    /**
     * Formatear tiempo para etiquetas
     */
    function formatTime(t) {
        if (t >= 1) return t.toFixed(0);
        if (t >= 0.1) return t.toFixed(1);
        return t.toFixed(3);
    }

    /**
     * Dibujar banda de tolerancia (curva min/max)
     */
    function dibujarBanda(curvaMin, curvaMax, color) {
        if (!curvaMin || !curvaMax || curvaMin.length === 0 || curvaMax.length === 0) return;

        ctx.beginPath();

        // Curva mínima (izquierda a derecha)
        for (var i = 0; i < curvaMin.length; i++) {
            var p = curvaMin[i];
            var x = logX(p.I);
            var y = logY(p.t);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        // Curva máxima (derecha a izquierda para cerrar)
        for (var j = curvaMax.length - 1; j >= 0; j--) {
            var p2 = curvaMax[j];
            var x2 = logX(p2.I);
            var y2 = logY(p2.t);
            ctx.lineTo(x2, y2);
        }

        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /**
     * Catálogo de curvas por fabricante (base para expansión)
     */
    var catalogoFabricantes = {
        "Schneider": {
            "NSX400": {
                In: 400,
                curvas: {
                    longMin: [
                        { I: 400, t: 120 },
                        { I: 800, t: 30 },
                        { I: 1600, t: 8 },
                        { I: 3200, t: 2 }
                    ],
                    longMax: [
                        { I: 400, t: 200 },
                        { I: 800, t: 50 },
                        { I: 1600, t: 15 },
                        { I: 3200, t: 4 }
                    ],
                    inst: 4000
                }
            },
            "NSX630": {
                In: 630,
                curvas: {
                    longMin: [
                        { I: 630, t: 120 },
                        { I: 1260, t: 30 },
                        { I: 2520, t: 8 },
                        { I: 5040, t: 2 }
                    ],
                    longMax: [
                        { I: 630, t: 200 },
                        { I: 1260, t: 50 },
                        { I: 2520, t: 15 },
                        { I: 5040, t: 4 }
                    ],
                    inst: 6300
                }
            }
        },
        "ABB": {
            "TmaxT5": {
                In: 400,
                curvas: {
                    longMin: [
                        { I: 400, t: 100 },
                        { I: 800, t: 25 },
                        { I: 1600, t: 6 },
                        { I: 3200, t: 1.5 }
                    ],
                    longMax: [
                        { I: 400, t: 180 },
                        { I: 800, t: 45 },
                        { I: 1600, t: 12 },
                        { I: 3200, t: 3 }
                    ],
                    inst: 4000
                }
            }
        }
    };

    /**
     * Detección real de cruce con bandas de tolerancia
     */
    function hayCruceReal(up, down) {
        if (typeof TCCCurvasReales === 'undefined') return false;

        var corrientes = TCCCurvasReales.generarRangoCorrienteReal(down);

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];

            // Usar curvas min/max si existen, sino curva simple
            var tUpMin = up.curvas && up.curvas.longMin ? 
                TCCCurvasReales.interpLogLog(I, up.curvas.longMin) :
                TCCCurvasReales.tiempoDisparoReal(I, up.tcc);

            var tDownMax = down.curvas && down.curvas.longMax ?
                TCCCurvasReales.interpLogLog(I, down.curvas.longMax) :
                TCCCurvasReales.tiempoDisparoReal(I, down.tcc);

            if (tUpMin <= tDownMax * 1.2) { // margen 20%
                return true;
            }
        }

        return false;
    }

    /**
     * Marcar conflictos de selectividad visualmente
     */
    function marcarConflictos() {
        if (typeof TCCCurvasReales === 'undefined') return;

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i];
            var down = nodos[i + 1];

            if (!up.tcc || !down.tcc) continue;

            var res = TCCCurvasReales.verificarSelectividadReal(up, down);

            if (!res.ok && res.fallos) {
                for (var j = 0; j < res.fallos.length; j++) {
                    var f = res.fallos[j];
                    var x = logX(f.I);
                    var y = logY(f.tDown);

                    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * Conectar sliders a nodo activo
     */
    function bindSliders(nodo) {
        nodoActivo = nodo;

        var longDelaySlider = document.getElementById('tcc-longdelay-slider');
        var shortDelaySlider = document.getElementById('tcc-shortdelay-slider');
        var instSlider = document.getElementById('tcc-inst-slider');

        if (longDelaySlider) {
            longDelaySlider.oninput = function(e) {
                if (nodoActivo && nodoActivo.tcc) {
                    nodoActivo.tcc.longDelayTime = parseFloat(e.target.value);
                    actualizar();
                }
            };
        }

        if (shortDelaySlider) {
            shortDelaySlider.oninput = function(e) {
                if (nodoActivo && nodoActivo.tcc) {
                    nodoActivo.tcc.shortDelay = parseFloat(e.target.value);
                    actualizar();
                }
            };
        }

        if (instSlider) {
            instSlider.oninput = function(e) {
                if (nodoActivo && nodoActivo.tcc) {
                    nodoActivo.tcc.instantaneous = parseFloat(e.target.value);
                    actualizar();
                }
            };
        }
    }

    /**
     * Loop de actualización
     */
    function actualizar() {
        // Recalcular coordinación
        if (typeof TCCCurvasReales !== 'undefined' && TCCCurvasReales.coordinarSistemaReal) {
            TCCCurvasReales.coordinarSistemaReal(nodos);
        }

        // Redibujar
        renderTCC(nodos);

        // Actualizar semáforo si existe
        if (typeof App !== 'undefined' && App.actualizarSemaforo) {
            App.actualizarSemaforo();
        }
    }

    /**
     * Establecer nodos del sistema
     */
    function setNodos(nodosInput) {
        nodos = nodosInput;
    }

    return {
        init: init,
        renderTCC: renderTCC,
        bindSliders: bindSliders,
        setNodos: setNodos,
        actualizar: actualizar,
        dibujarBanda: dibujarBanda,
        dibujarCurvaDigitalizada: dibujarCurvaDigitalizada,
        generarPuntosDesdeFuncion: generarPuntosDesdeFuncion,
        hayCruceReal: hayCruceReal,
        catalogoFabricantes: catalogoFabricantes,
        view: view,
        debugMode: false
    };

})();

if (typeof window !== 'undefined') {
    window.TCCViewerPro = TCCViewerPro;
}
