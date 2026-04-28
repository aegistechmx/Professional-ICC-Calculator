/**
 * catalogo_breakers_pro.js — Catálogo realista minimal profesional de interruptores
 * Estructura por familias con marcos, opciones In, Icu y ajustes LSIG
 * 
 * Formato por entrada:
 * {
 *   brand: "Nombre fabricante",
 *   family: "Familia de producto",
 *   frame: "Marco (letra o número)",
 *   In_options: [corrientes nominales disponibles A],
 *   trip: ["TM","LSIG"],                // TM = termomagnético, LSIG = electrónico
 *   Icu: [capacidades interruptivas kA @ 480 V],
 *   Ir_range: [0.4,1.0],                // long pickup (xIn)
 *   Isd_range: [2,10],                  // short pickup (xIr)
 *   Ii_range: [4,12],                   // instantaneous (xIn)
 *   Ig_range: [0.2,0.6],                // ground (xIn)
 *   t_long: [2,12],                     // s
 *   t_short: [0.1,0.5],                 // s
 *   t_ground: [0.05,0.3],               // s
 *   hasGFP: true
 * }
 */

var CatalogoBreakersPro = (function() {
    
    /**
     * Base de datos de interruptores por familia (minimal pero profesional)
     */
    var catalogo = [
        // --- Schneider Electric / Square D PowerPact ---
        {
            brand: "Schneider Electric",
            family: "PowerPact P",
            frame: "P",
            In_options: [100, 125, 150, 175, 200, 225, 250, 300, 400],
            trip: ["TM", "LSIG"],
            Icu: [18, 25, 35, 50, 65],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        {
            brand: "Schneider Electric",
            family: "PowerPact H",
            frame: "H",
            In_options: [400, 500, 600, 800],
            trip: ["TM", "LSIG"],
            Icu: [25, 35, 65, 100],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        {
            brand: "Schneider Electric",
            family: "Masterpact MTZ",
            frame: "MTZ",
            In_options: [800, 1000, 1200, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
            trip: ["LSIG"],
            Icu: [42, 50, 65, 100, 150],
            Ir_range: [0.4, 1.0],
            Isd_range: [1.5, 10],
            Ii_range: [1.5, 12],
            Ig_range: [0.2, 0.8],
            t_long: [0.5, 8],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.4],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        // --- Eaton Series C ---
        {
            brand: "Eaton",
            family: "Series C",
            frame: "K",
            In_options: [250, 400, 600],
            trip: ["TM", "LSIG"],
            Icu: [25, 35, 65],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        {
            brand: "Eaton",
            family: "Series G",
            frame: "G",
            In_options: [400, 600, 800, 1000, 1200, 1600],
            trip: ["LSIG"],
            Icu: [35, 50, 65, 100],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        // --- Siemens Sentron ---
        {
            brand: "Siemens",
            family: "Sentron",
            frame: "L",
            In_options: [250, 400, 600],
            trip: ["TM", "LSIG"],
            Icu: [25, 35, 65],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        {
            brand: "Siemens",
            family: "Sentron",
            frame: "3VA",
            In_options: [400, 630, 800, 1000, 1250, 1600],
            trip: ["LSIG"],
            Icu: [35, 50, 65, 100],
            Ir_range: [0.4, 1.0],
            Isd_range: [1.5, 10],
            Ii_range: [1.5, 12],
            Ig_range: [0.2, 0.8],
            t_long: [0.5, 8],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.4],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        // --- ABB Tmax ---
        {
            brand: "ABB",
            family: "Tmax",
            frame: "T",
            In_options: [250, 320, 400, 500, 630],
            trip: ["TM", "LSIG"],
            Icu: [25, 35, 50, 70],
            Ir_range: [0.4, 1.0],
            Isd_range: [2, 10],
            Ii_range: [4, 12],
            Ig_range: [0.2, 0.6],
            t_long: [2, 12],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.3],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        },
        {
            brand: "ABB",
            family: "Emax",
            frame: "E",
            In_options: [800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
            trip: ["LSIG"],
            Icu: [42, 50, 65, 100, 150],
            Ir_range: [0.4, 1.0],
            Isd_range: [1.5, 10],
            Ii_range: [1.5, 12],
            Ig_range: [0.2, 0.8],
            t_long: [0.5, 8],
            t_short: [0.1, 0.5],
            t_ground: [0.05, 0.4],
            hasGFP: true,
            terminal_75C: true,
            normas: ["UL489", "IEC60947-2"]
        }
    ];

    /**
     * Filtrar breakers por requisitos básicos
     * @param {Object} requisitos - { voltaje, I_diseño, Isc, requiereGFP }
     * @returns {Array} Breakers que cumplen requisitos básicos
     */
    function filtrarBreakers(requisitos) {
        return catalogo.filter(function(b) {
            // Corriente nominal
            var maxIn = Math.max.apply(Math, b.In_options);
            if (maxIn < (requisitos.I_diseño || 0)) return false;

            // Capacidad interruptiva
            var maxIcu = Math.max.apply(Math, b.Icu);
            if (maxIcu * 1000 < (requisitos.Isc || 0)) return false;

            // NOM 230.95: For Yg grounded systems, force LSIG requirement
            if (requisitos.sistemaYg && !b.trip.includes("LSIG")) return false;

            // GFP requerido
            if (requisitos.requiereGFP && !b.hasGFP) return false;

            return true;
        });
    }

    /**
     * Calcular score de un breaker (multi-criterio)
     * @param {Object} breaker - Breaker a evaluar
     * @param {Object} requisitos - Requisitos del sistema
     * @returns {number} Score (0-100)
     */
    function scoreBreaker(breaker, requisitos) {
        var score = 0;

        // 1. Cercanía de corriente (30%)
        var In_cercano = breaker.In_options.reduce(function(prev, curr) {
            return Math.abs(curr - requisitos.I_diseño) < Math.abs(prev - requisitos.I_diseño) ? curr : prev;
        });
        var proximidad = 1 - (Math.abs(In_cercano - requisitos.I_diseño) / requisitos.I_diseño);
        score += proximidad * 30;

        // 2. Margen de seguridad interruptiva (25%)
        var Icu_adequado = breaker.Icu.reduce(function(prev, curr) {
            return curr >= requisitos.Isc / 1000 ? curr : prev;
        }, 0);
        var margen = (Icu_adequado - requisitos.Isc / 1000) / (requisitos.Isc / 1000);
        score += Math.min(margen * 25, 25);

        // 3. GFP requerido (penalización si no soporta)
        if (requisitos.requiereGFP && !breaker.hasGFP) {
            score -= 100;
        }

        // 4. Terminal 75°C (penalización si no tiene)
        if (!breaker.terminal_75C) {
            score -= 50;
        }

        // 5. Optimización - no sobredimensionar (10%)
        var sobrecapacidad = (In_cercano - requisitos.I_diseño) / requisitos.I_diseño;
        score -= Math.min(sobrecapacidad * 10, 10);

        // 6. Preferencia por LSIG si se requiere coordinación (bonus)
        if (requisitos.requiereCoordinacion && breaker.trip.includes("LSIG")) {
            score += 15;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Seleccionar mejor breaker según requisitos
     * @param {Object} requisitos - { voltaje, I_diseño, Isc, requiereGFP, requiereCoordinacion }
     * @returns {Object} Breaker seleccionado con ajustes
     */
    function seleccionarBreaker(requisitos) {
        var candidatos = filtrarBreakers(requisitos);

        if (candidatos.length === 0) {
            return null;
        }

        // Calcular scores
        var candidatosScored = candidatos.map(function(b) {
            return {
                breaker: b,
                score: scoreBreaker(b, requisitos)
            };
        });

        // Ordenar por score descendente
        candidatosScored.sort(function(a, b) {
            return b.score - a.score;
        });

        var mejor = candidatosScored[0].breaker;

        // Configurar ajustes automáticos
        var ajustes = configurarAjustes(mejor, requisitos);

        return {
            brand: mejor.brand,
            family: mejor.family,
            frame: mejor.frame,
            In_options: mejor.In_options,
            trip: mejor.trip,
            Icu: mejor.Icu,
            Ir_range: mejor.Ir_range,
            Isd_range: mejor.Isd_range,
            Ii_range: mejor.Ii_range,
            Ig_range: mejor.Ig_range,
            t_long: mejor.t_long,
            t_short: mejor.t_short,
            t_ground: mejor.t_ground,
            hasGFP: mejor.hasGFP,
            terminal_75C: mejor.terminal_75C,
            normas: mejor.normas,
            ajustes: ajustes,
            score: candidatosScored[0].score
        };
    }

    /**
     * Configurar ajustes automáticos del breaker
     * @param {Object} breaker - Breaker seleccionado
     * @param {Object} requisitos - Requisitos del sistema
     * @returns {Object} Ajustes configurados
     */
    function configurarAjustes(breaker, requisitos) {
        var ajustes = {};

        // Long pickup (Ir)
        if (breaker.Ir_range) {
            var long_pickup = Math.max(
                breaker.Ir_range[0],
                Math.min(breaker.Ir_range[1], requisitos.I_diseño / Math.max.apply(Math, breaker.In_options))
            );
            ajustes.Ir = long_pickup;
        }

        // Short pickup (Isd)
        if (breaker.Isd_range) {
            var short_pickup = Math.max(
                breaker.Isd_range[0],
                Math.min(breaker.Isd_range[1], 6)
            );
            ajustes.Isd = short_pickup;
        }

        // Instantaneous (Ii)
        if (breaker.Ii_range) {
            var inst_max = Math.min(
                breaker.Ii_range[1],
                (requisitos.Isc / 1000) * 0.8 / Math.max.apply(Math, breaker.In_options)
            );
            ajustes.Ii = Math.max(breaker.Ii_range[0], inst_max);
        }

        // Ground pickup (Ig) - si soporta GFP
        // If_tierra está en amperes, calcular pickup como pu del In
        // Recomendación: ground_pickup ≈ 0.3 * If_tierra (en amperes)
        if (breaker.hasGFP && breaker.Ig_range && requisitos.If_tierra) {
            var ground_pickup_pu = 0.3 * requisitos.If_tierra / Math.max.apply(Math, breaker.In_options);
            ground_pickup_pu = Math.max(
                breaker.Ig_range[0],
                Math.min(breaker.Ig_range[1], ground_pickup_pu)
            );
            ajustes.Ig = ground_pickup_pu;
            ajustes.Ig_amperes = ground_pickup_pu * Math.max.apply(Math, breaker.In_options);
        }

        // Time delays
        if (breaker.t_long) {
            ajustes.t_long = breaker.t_long[0];
        }
        if (breaker.t_short) {
            ajustes.t_short = breaker.t_short[0];
        }
        if (breaker.t_ground) {
            ajustes.t_ground = breaker.t_ground[0];
        }

        return ajustes;
    }

    /**
     * Validar configuración final del breaker
     * @param {Object} breaker - Breaker seleccionado
     * @param {Object} requisitos - Requisitos del sistema
     * @returns {Object} Resultado de validación { valido, errores, advertencias }
     */
    function validarConfiguracion(breaker, requisitos) {
        var resultado = {
            valido: true,
            errores: [],
            advertencias: []
        };

        // Validación 1: Capacidad interruptiva (Icu >= Isc_max)
        var maxIcu = Math.max.apply(Math, breaker.Icu);
        // FIX: requisitos.Isc está en A, maxIcu está en kA - comparar en mismas unidades
        var Isc_kA = requisitos.Isc / 1000;
        if (maxIcu < Isc_kA) {
            resultado.valido = false;
            resultado.errores.push("Capacidad interruptiva insuficiente: " + maxIcu + "kA < " + Isc_kA.toFixed(2) + "kA");
        }

        // Validación 2: Corriente nominal (In >= I_diseño)
        var maxIn = Math.max.apply(Math, breaker.In_options);
        if (maxIn < requisitos.I_diseño) {
            resultado.valido = false;
            resultado.errores.push("Corriente nominal insuficiente: " + maxIn + "A < " + requisitos.I_diseño + "A");
        }

        // Validación 3: NOM 230.95 - LSIG requerido para Yg
        if (requisitos.sistemaYg && !breaker.trip.includes("LSIG")) {
            resultado.valido = false;
            resultado.errores.push("NOM 230.95: Sistema Yg requiere breaker con trip LSIG");
        }

        // Validación 4: Sensibilidad de falla a tierra
        if (requisitos.requiereGFP || requisitos.sistemaYg) {
            if (!breaker.hasGFP) {
                resultado.valido = false;
                resultado.errores.push("Se requiere protección de falla a tierra (GFP)");
            } else if (!breaker.Ig_range) {
                resultado.advertencias.push("Breaker tiene GFP pero no especifica rango Ig");
            }
        }

        // Validación 5: Ajuste de ground pickup si If_tierra está especificado
        if (breaker.hasGFP && requisitos.If_tierra && breaker.ajustes && breaker.ajustes.Ig) {
            var ground_pickup_amperes = breaker.ajustes.Ig * maxIn;
            var sensibilidad_requerida = 0.3 * requisitos.If_tierra;
            if (ground_pickup_amperes > sensibilidad_requerida * 1.5) {
                resultado.advertencias.push("Ground pickup (" + ground_pickup_amperes.toFixed(1) + "A) puede ser demasiado alto para If_tierra=" + requisitos.If_tierra + "A");
            }
        }

        return resultado;
    }

    /**
     * Generar reporte de selección profesional
     * @param {Object} breaker - Breaker seleccionado
     * @param {Object} requisitos - Requisitos del sistema
     * @returns {Object} Reporte con razonamiento
     */
    function generarReporte(breaker, requisitos) {
        var razon = [];

        // Capacidad interruptiva
        var maxIcu = Math.max.apply(Math, breaker.Icu);
        if (maxIcu * 1000 >= requisitos.Isc) {
            razon.push("Cumple capacidad interruptiva: " + maxIcu + "kA ≥ " + (requisitos.Isc / 1000).toFixed(2) + "kA");
        }

        // Corriente nominal
        var maxIn = Math.max.apply(Math, breaker.In_options);
        if (maxIn >= requisitos.I_diseño) {
            razon.push("Corriente nominal adecuada: " + maxIn + "A ≥ " + requisitos.I_diseño + "A");
        }

        // GFP
        if (requisitos.requiereGFP && breaker.hasGFP) {
            razon.push("Incluye protección de tierra (GFP/LSIG)");
        }

        // Terminal
        if (breaker.terminal_75C) {
            razon.push("Cumple NOM terminales 75°C");
        }

        // Coordinación
        if (requisitos.requiereCoordinacion && breaker.trip.includes("LSIG")) {
            razon.push("Soporta coordinación selectiva (LSIG)");
        }

        return {
            breaker: breaker.brand + " " + breaker.family + " " + breaker.frame,
            descripcion: breaker.brand + " " + breaker.family + " " + breaker.frame + "A",
            Icu: maxIcu + " kA",
            In: maxIn + " A",
            ajustes: breaker.ajustes,
            razon: razon,
            score: breaker.score
        };
    }

    return {
        catalogo: catalogo,
        filtrarBreakers: filtrarBreakers,
        scoreBreaker: scoreBreaker,
        seleccionarBreaker: seleccionarBreaker,
        configurarAjustes: configurarAjustes,
        validarConfiguracion: validarConfiguracion,
        generarReporte: generarReporte
    };
})();

if (typeof window !== 'undefined') {
    window.CatalogoBreakersPro = CatalogoBreakersPro;
}
