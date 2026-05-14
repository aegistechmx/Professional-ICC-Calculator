/**
 * motor_arc_flash.js — Motor de Optimización Multi-Objetivo
 * 
 * Balancea:
 * - Reducción de energía incidente (arc flash)
 * - Selectividad entre nodos
 * - NOM compliance
 * - Costo de materiales
 * 
 * Ecuación de energía incidente: E ∝ I^1.2 × t
 */

var MotorArcFlash = (function() {

    /**
     * Calcula energía incidente de arco eléctrico
     * Simplificado: E ∝ I_arc^1.2 × t
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} tcc - Parámetros TCC
     * @returns {number} Energía incidente relativa
     */
    function energiaIncidente(nodo, tcc) {
        if (!nodo || !tcc) return Infinity;

        var Iarc = 0.85 * (nodo.Isc || 0); // 85% de corriente de falla
        var In = nodo.breakerIn || 300;

        // Tiempo de disparo a I_arc
        var t = tiempoDisparoArcFlash(Iarc, tcc, In);

        if (t <= 0) return Infinity;

        // E ∝ I^1.2 × t
        return Math.pow(Iarc, 1.2) * t;
    }

    /**
     * Calcula tiempo de disparo para arc flash
     * @param {number} I - Corriente de falla
     * @param {Object} tcc - Parámetros TCC
     * @param {number} In - Corriente nominal
     * @returns {number} Tiempo en segundos
     */
    function tiempoDisparoArcFlash(I, tcc, In) {
        if (!tcc || I <= 0) return 0;

        var Ipu = I / In;

        // Zona instantánea
        if (Ipu >= (tcc.inst?.pickup || 10)) {
            return 0.01; // ~10ms instantáneo
        }

        // Zona short time
        if (Ipu >= (tcc.short?.pickup || 5)) {
            return tcc.short?.delay || 0.3;
        }

        // Zona long time
        if (Ipu >= (tcc.long?.pickup || 1)) {
            return tcc.long?.delay || 5;
        }

        return 10; // Fallback: no dispara
    }

    /**
     * Coordinación global multinodo
     * @param {Array} nodos - Array de nodos del sistema
     * @returns {Array} Nodos coordinados
     */
    function coordinarSistema(nodos) {
        if (!nodos || nodos.length < 2) return nodos;

        // Coordinar de downstream a upstream
        for (var i = nodos.length - 1; i > 0; i--) {
            var down = nodos[i];
            var up = nodos[i - 1];

            coordinarPar(up, down);
        }

        return nodos;
    }

    /**
     * Coordina par de nodos (upstream-downstream)
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     */
    function coordinarPar(up, down) {
        if (!up.tcc || !down.tcc) return;

        // Asegurar que upstream tenga tiempos mayores
        var margin = 0.2; // 200ms margen

        // Long time
        if (up.tcc.long && down.tcc.long) {
            if (up.tcc.long.delay <= down.tcc.long.delay) {
                up.tcc.long.delay = down.tcc.long.delay + margin;
            }
        }

        // Short time
        if (up.tcc.short && down.tcc.short) {
            if (up.tcc.short.delay <= down.tcc.short.delay) {
                up.tcc.short.delay = down.tcc.short.delay + margin;
            }
        }

        // Instantáneo: upstream debe ser mayor
        if (up.tcc.inst && down.tcc.inst) {
            if (up.tcc.inst.pickup <= down.tcc.inst.pickup) {
                up.tcc.inst.pickup = down.tcc.inst.pickup * 1.5;
            }
        }

        // Ground fault
        if (up.tcc.ground && down.tcc.ground) {
            if (up.tcc.ground.delay <= down.tcc.ground.delay) {
                up.tcc.ground.delay = down.tcc.ground.delay + margin;
            }
        }
    }

    /**
     * Función de costo global del sistema
     * @param {Array} nodos - Array de nodos
     * @returns {number} Score (menor = mejor)
     */
    function scoreSistema(nodos) {
        if (!nodos || nodos.length === 0) return Infinity;

        var penalizacion = 0;

        // Penalización por arc flash
        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            if (n.tcc) {
                penalizacion += energiaIncidente(n, n.tcc) * 0.5;
            }
        }

        // Penalización por sobredimensionamiento
        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            penalizacion += (n.breaker?.In || 0) * 0.01;
        }

        // Penalización por calibre
        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            penalizacion += indexCalibre(n.calibre) * 10;
        }

        // Penalización por cruces (selectividad)
        for (var i = 1; i < nodos.length; i++) {
            var res = verificarSelectividadTotal(
                nodos[i - 1],
                nodos[i],
                nodos[i - 1].breakerIn,
                nodos[i].breakerIn
            );
            if (!res.ok) {
                penalizacion += 10000;
            }
        }

        return penalizacion;
    }

    /**
     * Índice de calibre para ordenamiento
     * @param {string} calibre - Calibre del conductor
     * @returns {number} Índice
     */
    function indexCalibre(calibre) {
        var calibres = [
            "14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0",
            "250", "300", "350", "400", "500", "600", "750", "1000"
        ];
        var idx = calibres.indexOf(calibre);
        return idx >= 0 ? idx : 999;
    }

    /**
     * Verifica selectividad total (fase + tierra)
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @param {number} InUp - Corriente nominal upstream
     * @param {number} InDown - Corriente nominal downstream
     * @returns {Object} { ok, error }
     */
    function verificarSelectividadTotal(up, down, InUp, InDown) {
        if (!up.tcc || !down.tcc) {
            return { ok: false, error: 'Sin TCC' };
        }

        // Verificar long time
        if (up.tcc.long && down.tcc.long) {
            if (up.tcc.long.delay <= down.tcc.long.delay) {
                return { ok: false, error: 'Long time no selectivo' };
            }
        }

        // Verificar short time
        if (up.tcc.short && down.tcc.short) {
            if (up.tcc.short.delay <= down.tcc.short.delay) {
                return { ok: false, error: 'Short time no selectivo' };
            }
        }

        // Verificar instantáneo
        if (up.tcc.inst && down.tcc.inst) {
            if (up.tcc.inst.pickup <= down.tcc.inst.pickup) {
                return { ok: false, error: 'Instantáneo no selectivo' };
            }
        }

        // Verificar ground fault
        if (up.tcc.ground && down.tcc.ground) {
            if (up.tcc.ground.delay <= down.tcc.ground.delay) {
                return { ok: false, error: 'Ground fault no selectivo' };
            }
        }

        return { ok: true };
    }

    /**
     * Aplica cambio controlado a TCC
     * @param {Array} nodos - Array de nodos
     * @param {Object} cambio - { tipo, factor/delta }
     */
    function aplicarCambio(nodos, cambio) {
        for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            if (!n.tcc) continue;

            if (cambio.tipo === "inst") {
                n.tcc.inst.pickup *= cambio.factor;
            }

            if (cambio.tipo === "shortDelay") {
                n.tcc.short.delay += cambio.delta;
            }

            if (cambio.tipo === "groundDelay") {
                n.tcc.ground.delay += cambio.delta;
            }
        }
    }

    /**
     * Optimizador global
     * @param {Array} nodos - Array de nodos iniciales
     * @returns {Array} Nodos optimizados
     */
    function optimizarSistema(nodos) {
        if (!nodos || nodos.length === 0) return nodos;

        var mejor = JSON.parse(JSON.stringify(nodos));
        var mejorScore = scoreSistema(nodos);

        var variaciones = [
            { tipo: "inst", factor: 0.8 },
            { tipo: "inst", factor: 0.9 },
            { tipo: "shortDelay", delta: -0.1 },
            { tipo: "shortDelay", delta: -0.05 },
            { tipo: "groundDelay", delta: -0.05 }
        ];

        for (var i = 0; i < variaciones.length; i++) {
            var v = variaciones[i];
            var test = JSON.parse(JSON.stringify(nodos));

            aplicarCambio(test, v);
            coordinarSistema(test);

            var s = scoreSistema(test);

            if (s < mejorScore) {
                mejor = test;
                mejorScore = s;
            }
        }

        return mejor;
    }

    /**
     * Motor completo de diseño
     * @param {Array} nodos - Array de nodos del sistema
     * @returns {Object} { nodos, score, energiaIncidente }
     */
    function motorCompleto(nodos) {
        if (!nodos || nodos.length === 0) {
            return { nodos: [], score: Infinity, energiaIncidente: Infinity };
        }

        console.log('[*] Motor Arc Flash: iniciando optimización de', nodos.length, 'nodos');

        // Rediseño por nodo (usar motor_rediseño si está disponible)
        var diseño = rediseñarSistemaPorNodo(nodos);

        // Coordinación global
        diseño = coordinarSistema(diseño);

        // Optimización
        diseño = optimizarSistema(diseño);

        // Calcular score final
        var score = scoreSistema(diseño);

        // Calcular energía incidente total
        var energiaTotal = 0;
        for (var i = 0; i < diseño.length; i++) {
            if (diseño[i].tcc) {
                energiaTotal += energiaIncidente(diseño[i], diseño[i].tcc);
            }
        }

        console.log('[*] Motor Arc Flash: score final =', score, ', energía total =', energiaTotal);

        return {
            nodos: diseño,
            score: score,
            energiaIncidente: energiaTotal
        };
    }

    /**
     * Rediseña sistema por nodo (wrapper para motor_rediseño)
     * @param {Array} nodos - Array de nodos
     * @returns {Array} Nodos rediseñados
     */
    function rediseñarSistemaPorNodo(nodos) {
        if (!nodos) return [];

        // Si MotorRediseño está disponible, usarlo
        if (typeof MotorRediseño !== 'undefined' && MotorRediseño.rediseñarSistema) {
            for (var i = 0; i < nodos.length; i++) {
                var sol = MotorRediseño.rediseñarSistema(nodos[i]);
                if (sol) {
                    nodos[i] = sol;
                }
            }
        }

        return nodos;
    }

    return {
        energiaIncidente: energiaIncidente,
        tiempoDisparoArcFlash: tiempoDisparoArcFlash,
        coordinarSistema: coordinarSistema,
        coordinarPar: coordinarPar,
        scoreSistema: scoreSistema,
        verificarSelectividadTotal: verificarSelectividadTotal,
        aplicarCambio: aplicarCambio,
        optimizarSistema: optimizarSistema,
        motorCompleto: motorCompleto
    };

})();

if (typeof window !== 'undefined') {
    window.MotorArcFlash = MotorArcFlash;
}
