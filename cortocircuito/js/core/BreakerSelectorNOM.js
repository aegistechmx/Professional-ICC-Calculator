/**
 * core/BreakerSelectorNOM.js — Selección automática de breakers tipo ETAP/SKM
 * Algoritmo de ingeniería real basado en NOM-001-SEDE-2012
 */

var BreakerSelectorNOM = (function() {
    
    /**
     * Seleccionar breaker automáticamente según NOM
     * @param {Object} params - Parámetros de selección
     * @param {number} params.I_diseno - Corriente de diseño (A)
     * @param {number} params.Isc - Corriente de cortocircuito (kA)
     * @param {Object} params.catalogo - Catálogo de breakers
     * @returns {Object} Breaker seleccionado
     */
    function seleccionarBreaker(params) {
        var I_diseno = params.I_diseno || 0;
        var Isc = params.Isc || 0;
        var catalogo = params.catalogo || getCatalogoDefault();
        
        // Evaluar cada breaker del catálogo
        var candidatos = catalogo.map(function(breaker) {
            var cumpleCorriente = breaker.In >= I_diseno;
            var cumpleCorto = breaker.Icu >= Isc;
            
            return {
                ...breaker,
                cumple: cumpleCorriente && cumpleCorto
            };
        }).filter(function(b) { return b.cumple; });
        
        if (candidatos.length === 0) {
            return {
                ok: false,
                razon: "No hay breaker que soporte Isc = " + Isc + " kA",
                sugerencia: "Aumentar capacidad interruptiva"
            };
        }
        
        // Ordenar por capacidad interruptiva más pequeña que cumpla
        candidatos.sort(function(a, b) { return a.In - b.In; });
        
        var seleccionado = candidatos[0];
        
        // Determinar curva según relación Isc/In
        var relacion = Isc / seleccionado.In;
        var curva = "normal";
        if (relacion > 20) curva = "instantaneo";
        else if (relacion > 10) curva = "limitador";
        
        return {
            ok: true,
            breaker: seleccionado,
            curva: curva,
            relacion: relacion,
            alternativas: candidatos.slice(0, 3), // Top 3 opciones
            totalEvaluados: catalogo.length
        };
    }
    
    /**
     * Obtener catálogo de breakers por defecto
     * @returns {Array} Catálogo de breakers con capacidades
     */
    function getCatalogoDefault() {
        return [
            { In: 15, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 20, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 25, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 30, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 35, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 40, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 50, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 60, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 70, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 80, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 90, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 100, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 110, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 125, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 150, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 175, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 200, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 225, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 250, Icu: 10, curva: "normal", tipo: "Molded Case" },
            { In: 300, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 350, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 400, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 450, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 500, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 600, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 700, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 800, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 1000, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 1200, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 1600, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 2000, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 2500, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 3000, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 4000, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 5000, Icu: 25, curva: "normal", tipo: "Molded Case" },
            { In: 6000, Icu: 25, curva: "normal", tipo: "Molded Case" }
        ];
    }
    
    return {
        seleccionarBreaker: seleccionarBreaker,
        getCatalogoDefault: getCatalogoDefault
    };
})();

if (typeof window !== 'undefined') {
    window.BreakerSelectorNOM = BreakerSelectorNOM;
}
