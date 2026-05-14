/**
 * motor_protecciones.js — Motor de Protecciones Real (Nivel Industrial)
 * Catálogo real Square D, Siemens, ABB con curvas TCC IEC
 * Selector inteligente con scoring y coordinación automática
 */

var MotorProtecciones = (function() {

    /**
     * Catálogo real de equipos industriales
     */
    var catalogoEquipos = [
        {
            marca: "Square D",
            modelo: "MGL",
            rangos: [250, 400, 500, 600],
            kA: 35,
            tipo: "LI",
            costo: 3,
            descripcion: "MCCB electrónico con protección LI (Long-Time/Instantaneous)"
        },
        {
            marca: "Siemens",
            modelo: "3VA",
            rangos: [100, 160, 250, 400],
            kA: 65,
            tipo: "LSIG",
            costo: 4,
            descripcion: "MCCB electrónico con protección LSIG (Long-Time/Short-Time/Instantaneous/Ground)"
        },
        {
            marca: "ABB",
            modelo: "XT",
            rangos: [100, 160, 250],
            kA: 36,
            tipo: "TMD",
            costo: 2,
            descripcion: "MCCB térmico-electrónico con curvas TMD (Thermal-Magnetic)"
        },
        {
            marca: "Square D",
            modelo: "PowerPact",
            rangos: [800, 1000, 1200],
            kA: 50,
            tipo: "LSI",
            costo: 5,
            descripcion: "MCCB electrónico de alta capacidad con protección LSI"
        },
        {
            marca: "Siemens",
            modelo: "3WL",
            rangos: [800, 1000, 1200, 1600, 2000],
            kA: 100,
            tipo: "LSIG",
            costo: 7,
            descripcion: "ACB (Air Circuit Breaker) de alta capacidad con protección LSIG completa"
        }
    ];

    /**
     * Curva TCC real según IEC (aproximación)
     * @param {number} I - Corriente en amperes
     * @param {number} Ir - Corriente de ajuste (pickup)
     * @param {string} tipo - Tipo de curva (LI, LSIG, TMD, LSI)
     * @returns {number} Tiempo de disparo en segundos
     */
    function curvaTCC(I, Ir, tipo) {
        if (!Ir || Ir <= 0) return 0;
        var M = I / Ir;

        if (M < 1) return 9999; // No dispara

        switch (tipo) {
            case "LI":
                // Inversa simple (Long-Time + Instantaneous)
                return 10 / Math.pow(M, 2);
            case "LSIG":
                // Inversa con Short-Time y Ground (más selectiva)
                return 5 / Math.pow(M, 1.5);
            case "TMD":
                // Térmico-magnético (curva más lenta)
                return 20 / Math.pow(M, 2.5);
            case "LSI":
                // Long-Time + Short-Time + Instantaneous
                return 8 / Math.pow(M, 1.8);
            default:
                return 10 / Math.pow(M, 2);
        }
    }

    /**
     * Evalúa equipo con scoring inteligente
     * @param {Object} eq - Equipo del catálogo
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Equipo evaluado con score
     */
    function evaluarEquipo(eq, nodo) {
        var score = 0;
        var I_diseno = nodo.I_diseno || nodo.cargaA || 100;
        var Isc = nodo.Isc || 10;
        var requiereSelectividad = nodo.requiere_selectividad || false;

        // ✅ NOM 110.9 (capacidad interruptiva) - CRÍTICO
        if (eq.kA >= Isc) {
            score += 50;
        } else {
            score -= 100; // Penalización severa
        }

        // ✅ Ajuste de corriente
        var corrienteOK = eq.rangos.find(function(r) { return r >= I_diseno; });
        if (corrienteOK) {
            score += 30;
        } else {
            score -= 20;
        }

        // ✅ Coordinación (si se requiere)
        if (requiereSelectividad && eq.tipo === "LSIG") {
            score += 40;
        } else if (requiereSelectividad && eq.tipo === "LSI") {
            score += 30;
        } else if (requiereSelectividad && eq.tipo === "LI") {
            score += 20;
        }

        // 💰 Costo (penalización proporcional)
        score -= eq.costo * 5;

        // 🎯 Margen de seguridad (extra)
        if (eq.kA >= Isc * 1.5) {
            score += 10;
        }

        return {
            marca: eq.marca,
            modelo: eq.modelo,
            rangos: eq.rangos,
            kA: eq.kA,
            tipo: eq.tipo,
            costo: eq.costo,
            descripcion: eq.descripcion,
            score: score,
            corrienteSeleccionada: corrienteOK || eq.rangos[eq.rangos.length - 1]
        };
    }

    /**
     * Selector inteligente de interruptor real
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Mejor equipo seleccionado
     */
    function seleccionarInterruptorReal(nodo) {
        var evaluados = catalogoEquipos.map(function(eq) {
            return evaluarEquipo(eq, nodo);
        });

        // Ordenar por score (mayor es mejor)
        evaluados.sort(function(a, b) { return b.score - a.score; });

        return evaluados[0] || null;
    }

    /**
     * Busca nodo upstream en el sistema
     * @param {Object} nodo - Nodo actual
     * @param {Object} sistema - Sistema completo
     * @returns {Object} Nodo upstream o null
     */
    function buscarUpstream(nodo, sistema) {
        var nodos = sistema.nodos || sistema.puntos || [];
        if (!nodo.parentId) return null;

        return nodos.find(function(n) { return (n.id || n.nombre) === nodo.parentId; });
    }

    /**
     * Coordinación automática real
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @returns {Object} Resultado de coordinación
     */
    function coordinar(up, down) {
        if (!up.interruptor || !down.interruptor) {
            return { ok: false, error: "Faltan interruptores" };
        }

        var I_diseno = down.I_diseno || down.cargaA || 100;
        var Isc = down.Isc || 10;
        var delayAplicado = 0;

        // Iterar sobre rango de corrientes
        for (var I = I_diseno; I < Isc * 1000; I *= 1.2) {
            var t_up = curvaTCC(I, up.interruptor.corrienteSeleccionada, up.interruptor.tipo);
            var t_down = curvaTCC(I, down.interruptor.corrienteSeleccionada, down.interruptor.tipo);

            // Si downstream dispara después o al mismo tiempo que upstream, no hay selectividad
            if (t_down >= t_up) {
                delayAplicado += 0.2;
            }
        }

        // Aplicar delay al upstream
        if (delayAplicado > 0) {
            up.delay = (up.delay || 0) + delayAplicado;
        }

        return {
            ok: true,
            delayAplicado: delayAplicado,
            selectividad: delayAplicado === 0 ? "PERFECTA" : "AJUSTADA"
        };
    }

    /**
     * Copiloto de protecciones (integración completa)
     * @param {Object} sistema - Sistema completo
     * @returns {Object} Sistema con protecciones optimizadas
     */
    function copilotoProtecciones(sistema) {
        var log = [];
        var nodos = sistema.nodos || sistema.puntos || [];

        nodos.forEach(function(nodo) {
            var nodoId = nodo.id || nodo.nombre || "DESCONOCIDO";

            // 1. Preparar datos del nodo
            nodo.I_diseno = nodo.CDT ? nodo.CDT.I_diseño : (nodo.cargaA * 1.25);
            nodo.Isc = nodo.isc || 10;
            nodo.requiere_selectividad = nodo.parentId !== null; // Requiere selectividad si tiene upstream

            // 2. Selección real
            var mejor = seleccionarInterruptorReal(nodo);
            if (mejor) {
                nodo.interruptor = mejor;
                log.push(nodoId + " → " + mejor.marca + " " + mejor.modelo + " " + mejor.corrienteSeleccionada + "A " + mejor.kA + "kA");

                // 3. Ajuste automático de Ir
                nodo.Ir = nodo.I_diseno * 1.1;
            }
        });

        // 4. Coordinación (bottom-up)
        for (var i = nodos.length - 1; i >= 0; i--) {
            var nodo = nodos[i];
            var up = buscarUpstream(nodo, sistema);

            if (up && nodo.interruptor && up.interruptor) {
                var coord = coordinar(up, nodo);
                if (coord.ok) {
                    log.push("Coordinación " + (up.id || up.nombre) + " → " + (nodo.id || nodo.nombre) + ": " + coord.selectividad);
                }
            }
        }

        return {
            sistema: sistema,
            log: log
        };
    }

    return {
        catalogoEquipos: catalogoEquipos,
        curvaTCC: curvaTCC,
        evaluarEquipo: evaluarEquipo,
        seleccionarInterruptorReal: seleccionarInterruptorReal,
        buscarUpstream: buscarUpstream,
        coordinar: coordinar,
        copilotoProtecciones: copilotoProtecciones
    };
})();

if (typeof window !== 'undefined') {
    window.MotorProtecciones = MotorProtecciones;
}
