/**
 * coordinacion_automatica.js — Motor de Coordinación Automática
 * 
 * Coordinación iterativa entre nodos que converge
 * Garantiza selectividad: t_up(I) ≥ t_down(I) + margen
 * 
 * Flujo: Ampacidad → Breaker → TCC → Coordinación
 */

var CoordinacionAutomatica = (function() {

    /**
     * Modelo base de curva TCC (genérico pero funcional)
     * @param {number} I - Corriente de prueba
     * @param {Object} tcc - Parámetros TCC
     * @returns {number} Tiempo de disparo en segundos
     */
    function tiempoDisparo(I, tcc) {
        var longPickup = tcc.longDelayPickup || tcc.pickup || 100;
        var longTime = tcc.longDelayTime || tcc.longDelay || 6;
        var shortPickup = tcc.shortPickup || (longPickup * 3);
        var shortTime = tcc.shortDelay || 0.3;
        var inst = tcc.instantaneous || (longPickup * 10);

        if (I < longPickup) return Infinity;

        if (I < shortPickup) {
            // Zona larga: inversa simple
            return longTime * (longPickup / I);
        }

        if (I < inst) {
            // Zona corta: tiempo constante
            return shortTime;
        }

        // Instantáneo
        return 0.02;
    }

    /**
     * Genera rango de corrientes para verificación
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Array de corrientes de prueba
     */
    function generarRangoCorriente(nodo) {
        var base = nodo.amp ? nodo.amp.I_diseno : (nodo.I_diseno || 100);
        var Isc = (nodo.Isc_kA || 0) * 1000;

        var puntos = [];

        // Rango desde 1.5x hasta 20x I_diseno
        for (var f = 1.5; f <= 20; f *= 1.2) {
            puntos.push(base * f);
        }

        // Agregar Isc si es mayor
        if (Isc > base) {
            puntos.push(Isc);
        }

        return puntos;
    }

    /**
     * Verifica selectividad entre par upstream-downstream
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} { ok, I, tUp, tDown }
     */
    function verificarSelectividad(up, down) {
        var corrientes = generarRangoCorriente(down);
        var margen = 0.05; // 50ms margen mínimo

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var tUp = tiempoDisparo(I, up.tcc);
            var tDown = tiempoDisparo(I, down.tcc);

            if (tUp <= tDown + margen) {
                return {
                    ok: false,
                    I: I,
                    tUp: tUp,
                    tDown: tDown,
                    mensaje: 'Cruce @ ' + I.toFixed(0) + 'A: tUp=' + tUp.toFixed(3) + 's, tDown=' + tDown.toFixed(3) + 's'
                };
            }
        }

        return { ok: true };
    }

    /**
     * Ajuste inteligente de curvas para lograr selectividad
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @param {Object} fallo - Información del fallo de selectividad
     */
    function ajustarCurvas(up, down, fallo) {
        var I = fallo.I;
        var upTcc = up.tcc;
        var downTcc = down.tcc;

        var shortPickup = downTcc.shortPickup || (downTcc.longDelayPickup * 3);
        var inst = downTcc.instantaneous || (downTcc.longDelayPickup * 10);

        // ⚡ Caso 1: zona larga
        if (I < shortPickup) {
            upTcc.longDelayTime = (upTcc.longDelayTime || 6) + 0.5;
            console.log('[Coordinación] Ajustando longDelayTime de ' + up.id + ' a ' + upTcc.longDelayTime.toFixed(1) + 's');
            return;
        }

        // ⚡ Caso 2: zona corta
        if (I < inst) {
            upTcc.shortDelay = (upTcc.shortDelay || 0.3) + 0.05;
            console.log('[Coordinación] Ajustando shortDelay de ' + up.id + ' a ' + upTcc.shortDelay.toFixed(2) + 's');
            return;
        }

        // ⚡ Caso 3: instantáneo (más delicado)
        upTcc.instantaneous = (upTcc.instantaneous || (upTcc.longDelayPickup * 10)) + (down.breaker ? down.breaker.In : 100);
        console.log('[Coordinación] Ajustando instantaneous de ' + up.id + ' a ' + upTcc.instantaneous.toFixed(0) + 'A');
    }

    /**
     * Motor de coordinación iterativo para un par
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} { ok, intentos, error }
     */
    function coordinarPar(up, down) {
        var intentos = 0;
        var MAX = 20;

        while (intentos < MAX) {
            var res = verificarSelectividad(up, down);

            if (res.ok) {
                console.log('[Coordinación] Par ' + up.id + ' → ' + down.id + ' coordinado en ' + intentos + ' intentos');
                return { ok: true, intentos: intentos };
            }

            // 🔥 AJUSTE INTELIGENTE
            ajustarCurvas(up, down, res);

            intentos++;
        }

        console.warn('[Coordinación] Par ' + up.id + ' → ' + down.id + ' NO converge después de ' + MAX + ' intentos');
        return { ok: false, error: "No converge después de " + MAX + " intentos" };
    }

    /**
     * Coordinar todo el sistema (downstream → upstream)
     * @param {Array} nodos - Array de nodos del sistema
     * @returns {Object} { ok, nodos, errores }
     */
    function coordinarSistema(nodos) {
        var errores = [];

        // Recorrer de downstream a upstream
        for (var i = nodos.length - 1; i > 0; i--) {
            var down = nodos[i];
            var up = nodos[i - 1];

            if (!up.tcc || !down.tcc) {
                console.warn('[Coordinación] Par ' + up.id + ' → ' + down.id + ' sin TCC, saltando');
                continue;
            }

            var res = coordinarPar(up, down);

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
     * Ejecutar sistema completo: Ampacidad → Breaker → TCC → Coordinación
     * @param {Array} nodos - Array de nodos del sistema
     * @returns {Object} Sistema coordinado
     */
    function ejecutarSistema(nodos) {
        console.log('[Coordinación] Iniciando ejecución de sistema completo...');

        // 1. Ampacidad
        if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.calcularAmpacidadCDT) {
            for (var i = 0; i < nodos.length; i++) {
                var params = {
                    I_carga: nodos[i].feeder ? nodos[i].feeder.cargaA : 0,
                    factorCarga: 1.25,
                    F_temp: 0.94,
                    numConductores: 3,
                    I_tabla: nodos[i].feeder ? nodos[i].feeder.calibre : 285,
                    tempTerminal: 75,
                    paralelos: 1
                };
                nodos[i].amp = AmpacidadReal.calcularAmpacidadCDT(params);
            }
        }

        // 2. Breakers
        if (typeof BreakerSelector !== 'undefined' && BreakerSelector.seleccionarProteccionCompleta) {
            for (var j = 0; j < nodos.length; j++) {
                var sel = BreakerSelector.seleccionarProteccionCompleta(nodos[j], {
                    I_carga: nodos[j].feeder ? nodos[j].feeder.cargaA : 0,
                    factorCarga: 1.25,
                    F_temp: 0.94,
                    numConductores: 3,
                    I_tabla: nodos[j].feeder ? nodos[j].feeder.calibre : 285,
                    tempTerminal: 75,
                    paralelos: 1
                });
                if (sel.ok) {
                    nodos[j].breaker = sel.breaker;
                    nodos[j].tcc = sel.tcc;
                }
            }
        }

        // 3. Coordinación
        var coord = coordinarSistema(nodos);

        console.log('[Coordinación] Sistema completo ejecutado. OK: ' + coord.ok);

        return {
            ok: coord.ok,
            nodos: nodos,
            errores: coord.errores
        };
    }

    return {
        tiempoDisparo: tiempoDisparo,
        generarRangoCorriente: generarRangoCorriente,
        verificarSelectividad: verificarSelectividad,
        ajustarCurvas: ajustarCurvas,
        coordinarPar: coordinarPar,
        coordinarSistema: coordinarSistema,
        ejecutarSistema: ejecutarSistema
    };

})();

if (typeof window !== 'undefined') {
    window.CoordinacionAutomatica = CoordinacionAutomatica;
}
