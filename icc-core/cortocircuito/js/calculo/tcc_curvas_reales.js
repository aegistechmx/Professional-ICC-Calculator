/**
 * tcc_curvas_reales.js — Módulo de Curvas TCC Reales
 * 
 * Coordinación profesional con interpolación log–log
 * Curvas reales de fabricante → evaluación física correcta
 * 
 * Diferencia vs genérico:
 * - Curvas reales (no lineales)
 * - Interpolación log–log (físicamente correcta)
 * - Verificación sin trampas
 * - Convergencia real
 */

var TCCCurvasReales = (function() {

    /**
     * Interpolación log–log para curvas TCC reales
     * Las TCC se evalúan en escala log–log: log(t) vs log(I)
     * @param {number} I - Corriente de prueba
     * @param {Array} curva - Array de puntos [{I, t}, ...]
     * @returns {number} Tiempo de disparo interpolado
     */
    function interpLogLog(I, curva) {
        if (!curva || curva.length === 0) return Infinity;

        // Fuera de rango inferior
        if (I <= curva[0].I) return curva[0].t;

        // Buscar segmento y interpolar
        for (var i = 0; i < curva.length - 1; i++) {
            var p1 = curva[i];
            var p2 = curva[i + 1];

            if (I >= p1.I && I <= p2.I) {
                var logI = Math.log10(I);
                var logI1 = Math.log10(p1.I);
                var logI2 = Math.log10(p2.I);

                var logT1 = Math.log10(p1.t);
                var logT2 = Math.log10(p2.t);

                var m = (logT2 - logT1) / (logI2 - logI1);
                var logT = logT1 + m * (logI - logI1);

                return Math.pow(10, logT);
            }
        }

        // Fuera de rango superior → instantáneo
        return curva[curva.length - 1].t;
    }

    /**
     * Tiempo de disparo LSIG completo (Long, Short, Instantaneous, Ground)
     * Usa múltiplos de In (per-unit) para escalar correctamente
     * @param {number} I - Corriente de prueba en amperes
     * @param {Object} tcc - Parámetros TCC LSIG (en múltiplos de In)
     * @param {number} In - Corriente nominal del breaker
     * @param {string} tipo - "fase" o "tierra"
     * @returns {number} Tiempo de disparo en segundos
     */
    function tiempoDisparoLSIG(I, tcc, In, tipo) {
        tipo = tipo || "fase";
        var Ipu = I / In;

        // � TIERRA (independiente de fase)
        if (tipo === "tierra") {
            if (!tcc.ground) return Infinity;
            if (Ipu >= tcc.ground.pickup) {
                return tcc.ground.delay || 0.2;
            }
            return Infinity;
        }

        // ⚡ FASE (LSIG completo)
        
        // Long (L) - curva inversa
        if (Ipu < tcc.short.pickup) {
            // Si hay curva real, usar interpolación
            if (tcc.curvaLong && tcc.curvaLong.length > 0) {
                return interpLogLog(I, tcc.curvaLong);
            }
            // Fallback: inversa simple I^2t
            return tcc.long.delay * Math.pow(1 / Ipu, 2);
        }

        // Short (S) - tiempo constante
        if (Ipu < tcc.inst.pickup) {
            if (tcc.curvaShort && tcc.curvaShort.length > 0) {
                return interpLogLog(I, tcc.curvaShort);
            }
            return tcc.short.delay || 0.2;
        }

        // Instantaneous (I) - rápido
        return 0.02;
    }

    /**
     * Genera rango de corrientes logarítmico - MEJORADA DENSIDAD
     * Más puntos en rangos críticos (1.08 en lugar de 1.15)
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Array de corrientes de prueba
     */
    function generarRangoCorrienteReal(nodo) {
        var Imin = nodo.amp ? nodo.amp.I_diseno : (nodo.I_diseno || 100);
        var Imax = (nodo.Isc_kA || 0) * 1000;

        var puntos = [];
        var I = Imin * 1.2;

        // Rango logarítmico con mejor densidad (1.08 en lugar de 1.15)
        while (I < Imax) {
            puntos.push(I);
            I *= 1.08; // 8% incremento logarítmico (más suave)
        }

        puntos.push(Imax);

        return puntos;
    }

    /**
     * Suavizar curva (promedio móvil de 3 puntos)
     * Elimina ruido y discontinuidades menores
     * @param {Array} curva - Array de puntos {I, t}
     * @returns {Array} Curva suavizada
     */
    function suavizarCurva(curva) {
        if (!curva || curva.length < 3) return curva;

        return curva.map(function(p, i) {
            if (i === 0 || i === curva.length - 1) return p;

            return {
                I: p.I,
                t: (curva[i - 1].t + p.t + curva[i + 1].t) / 3
            };
        });
    }

    /**
     * Verificación de selectividad total (Fase + Tierra)
     * Upstream SIEMPRE debe disparar DESPUÉS que downstream
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @param {number} InUp - Corriente nominal upstream
     * @param {number} InDown - Corriente nominal downstream
     * @returns {Object} { ok, fallos }
     */
    function verificarSelectividadTotal(up, down, InUp, InDown) {
        var corrientes = generarRangoCorrienteReal(down);
        var fallos = [];

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];

            // ⚡ FASE
            var tUpF = tiempoDisparoLSIG(I, up.tcc, InUp, "fase");
            var tDownF = tiempoDisparoLSIG(I, down.tcc, InDown, "fase");

            if (tUpF <= tDownF * 1.2) { // margen 20%
                fallos.push({
                    tipo: "fase",
                    I: I,
                    tUp: tUpF,
                    tDown: tDownF,
                    nodoUp: up.id,
                    nodoDown: down.id
                });
            }

            // 🌍 TIERRA
            var tUpG = tiempoDisparoLSIG(I, up.tcc, InUp, "tierra");
            var tDownG = tiempoDisparoLSIG(I, down.tcc, InDown, "tierra");

            if (tUpG <= tDownG * 1.2 && tUpG < Infinity && tDownG < Infinity) {
                fallos.push({
                    tipo: "tierra",
                    I: I,
                    tUp: tUpG,
                    tDown: tDownG,
                    nodoUp: up.id,
                    nodoDown: down.id
                });
            }
        }

        return {
            ok: fallos.length === 0,
            fallos: fallos
        };
    }

    /**
     * Auto-coordinación LSIG completa (Fase + Tierra)
     * Reglas de oro: upstream más lento, pickup escalonado
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} { ok, ajustes }
     */
    function coordinarLSIG(up, down) {
        var ajustes = [];

        // 🔹 FASE - Short delay
        if (up.tcc.short.delay <= down.tcc.short.delay) {
            var nuevoShortDelay = down.tcc.short.delay + 0.2;
            up.tcc.short.delay = nuevoShortDelay;
            ajustes.push({
                nodo: up.id,
                parametro: 'short.delay',
                valor: nuevoShortDelay.toFixed(2) + 's',
                razon: 'Selectividad fase: upstream debe ser más lento'
            });
        }

        // 🔹 FASE - Instantaneous pickup
        if (up.tcc.inst.pickup <= down.tcc.inst.pickup) {
            var nuevoInstPickup = down.tcc.inst.pickup * 1.2;
            up.tcc.inst.pickup = nuevoInstPickup;
            ajustes.push({
                nodo: up.id,
                parametro: 'inst.pickup',
                valor: nuevoInstPickup.toFixed(2) + ' × In',
                razon: 'Selectividad fase: instantáneo escalonado'
            });
        }

        // 🔹 TIERRA (CLAVE - coordinación independiente)
        if (up.tcc.ground && down.tcc.ground) {
            // Delay tierra
            if (up.tcc.ground.delay <= down.tcc.ground.delay) {
                var nuevoGroundDelay = down.tcc.ground.delay + 0.1;
                up.tcc.ground.delay = nuevoGroundDelay;
                ajustes.push({
                    nodo: up.id,
                    parametro: 'ground.delay',
                    valor: nuevoGroundDelay.toFixed(2) + 's',
                    razon: 'Selectividad tierra: upstream debe ser más lento'
                });
            }

            // Pickup tierra (más bajo que fase, escalonado)
            if (up.tcc.ground.pickup <= down.tcc.ground.pickup) {
                var nuevoGroundPickup = down.tcc.ground.pickup * 1.3;
                up.tcc.ground.pickup = nuevoGroundPickup;
                ajustes.push({
                    nodo: up.id,
                    parametro: 'ground.pickup',
                    valor: nuevoGroundPickup.toFixed(2) + ' × In',
                    razon: 'Selectividad tierra: pickup escalonado'
                });
            }
        }

        return {
            ok: true,
            ajustes: ajustes
        };
    }

    /**
     * Verificación real de selectividad con curvas reales
     * Margen real 20% (no 50ms fijo)
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} { ok, fallos }
     */
    function verificarSelectividadReal(up, down) {
        var corrientes = generarRangoCorrienteReal(down);
        var fallos = [];

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var tUp = tiempoDisparoReal(I, up.tcc);
            var tDown = tiempoDisparoReal(I, down.tcc);

            // Margen real 20%
            if (tUp <= tDown * 1.2) {
                fallos.push({
                    I: I,
                    tUp: tUp,
                    tDown: tDown,
                    ratio: tUp / tDown,
                    mensaje: 'Cruce @ ' + I.toFixed(0) + 'A: tUp=' + tUp.toFixed(3) + 's, tDown=' + tDown.toFixed(3) + 's (ratio=' + (tUp/tDown).toFixed(2) + ')'
                });
            }
        }

        return {
            ok: fallos.length === 0,
            fallos: fallos
        };
    }

    /**
     * Ajuste inteligente con curvas reales
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @param {Object} fallo - Información del fallo
     */
    function ajustarCurvasReal(up, down, fallo) {
        var I = fallo.I;
        var upTcc = up.tcc;
        var downTcc = down.tcc;

        var shortPickup = downTcc.shortPickup || (downTcc.longDelayPickup * 3);
        var inst = downTcc.instantaneous || (downTcc.longDelayPickup * 10);

        // Zona larga → ajustar curva long-time
        if (I < shortPickup) {
            upTcc.longDelayTime = (upTcc.longDelayTime || 6) * 1.2;
            console.log('[TCC Real] Ajustando longDelayTime de ' + up.id + ' a ' + upTcc.longDelayTime.toFixed(1) + 's (x1.2)');
            return;
        }

        // Zona corta → ajustar short-delay
        if (I < inst) {
            upTcc.shortDelay = (upTcc.shortDelay || 0.3) + 0.05;
            console.log('[TCC Real] Ajustando shortDelay de ' + up.id + ' a ' + upTcc.shortDelay.toFixed(2) + 's (+0.05s)');
            return;
        }

        // Instantáneo → separar pickup
        upTcc.instantaneous = (upTcc.instantaneous || (upTcc.longDelayPickup * 10)) * 1.2;
        console.log('[TCC Real] Ajustando instantaneous de ' + up.id + ' a ' + upTcc.instantaneous.toFixed(0) + 'A (x1.2)');
    }

    /**
     * Motor de coordinación profesional con curvas reales
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} { ok, intentos, error }
     */
    function coordinarParReal(up, down) {
        var intentos = 0;
        var MAX = 25;

        while (intentos < MAX) {
            var res = verificarSelectividadReal(up, down);

            if (res.ok) {
                console.log('[TCC Real] Par ' + up.id + ' → ' + down.id + ' coordinado en ' + intentos + ' intentos');
                return { ok: true, intentos: intentos };
            }

            // Ajustar basado en primer fallo
            if (res.fallos.length > 0) {
                ajustarCurvasReal(up, down, res.fallos[0]);
            }

            intentos++;
        }

        console.warn('[TCC Real] Par ' + up.id + ' → ' + down.id + ' NO converge después de ' + MAX + ' intentos');
        return { ok: false, error: "No converge después de " + MAX + " intentos" };
    }

    /**
     * Coordinar sistema completo con curvas reales
     * @param {Array} nodos - Array de nodos del sistema
     * @returns {Object} { ok, nodos, errores }
     */
    function coordinarSistemaReal(nodos) {
        var errores = [];

        // Recorrer de downstream a upstream
        for (var i = nodos.length - 1; i > 0; i--) {
            var down = nodos[i];
            var up = nodos[i - 1];

            if (!up.tcc || !down.tcc) {
                console.warn('[TCC Real] Par ' + up.id + ' → ' + down.id + ' sin TCC, saltando');
                continue;
            }

            var res = coordinarParReal(up, down);

            if (!res.ok) {
                errores.push({
                    par: up.id + ' → ' + down.id,
                    error: res.error
                });
            }
        }

        return {
            ok: errores.length === 0,
            nodos: nodos,
            errores: errores
        };
    }

    /**
     * Curva de ejemplo para pruebas
     * Puede venir de PDF digitalizado
     */
    var curvaEjemplo = [
        { I: 400, t: 100 },
        { I: 600, t: 20 },
        { I: 1000, t: 5 },
        { I: 2000, t: 1 },
        { I: 5000, t: 0.1 }
    ];

    return {
        interpLogLog: interpLogLog,
        tiempoDisparoLSIG: tiempoDisparoLSIG,
        generarRangoCorrienteReal: generarRangoCorrienteReal,
        suavizarCurva: suavizarCurva,
        verificarSelectividadTotal: verificarSelectividadTotal,
        coordinarLSIG: coordinarLSIG,
        verificarSelectividadReal: verificarSelectividadReal,
        ajustarCurvasReal: ajustarCurvasReal,
        coordinarParReal: coordinarParReal,
        coordinarSistemaReal: coordinarSistemaReal,
        curvaEjemplo: curvaEjemplo
    };

})();

if (typeof window !== 'undefined') {
    window.TCCCurvasReales = TCCCurvasReales;
}
