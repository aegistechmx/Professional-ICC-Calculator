/**
 * core/ConductorSelectorNOM.js — Selección automática de conductores tipo ETAP/SKM
 * Algoritmo de ingeniería real basado en NOM-001-SEDE-2012
 */

var ConductorSelectorNOM = (function() {
    
    /**
     * Seleccionar conductor automáticamente según NOM
     * @param {Object} params - Parámetros de selección
     * @param {number} params.I_carga - Corriente de carga (A)
     * @param {number} params.F_temp - Factor de temperatura
     * @param {number} params.F_agrup - Factor de agrupamiento
     * @param {number} params.paralelo - Número de conductores en paralelo (default 1)
     * @param {Object} params.catalogo - Catálogo de conductores
     * @returns {Object} Conductor seleccionado
     */
    function seleccionarConductor(params) {
        var I_carga = params.I_carga || 0;
        var F_temp = params.F_temp || 1.0;
        var F_agrup = params.F_agrup || 1.0;
        var paralelo = params.paralelo || 1;
        var catalogo = params.catalogo || getCatalogoDefault();
        
        // Corriente de diseño con factor 125% para carga continua
        var I_diseno = I_carga * 1.25;
        
        // Evaluar cada calibre del catálogo
        var candidatos = catalogo.map(function(calibre) {
            var I_tabla = calibre.ampacidad;
            var I_corr = I_tabla * F_temp * F_agrup * paralelo;
            
            // Límite terminal (75°C típico)
            var I_terminal = Math.min(I_corr, calibre.terminal_75 || I_tabla);
            
            // Margen térmico
            var margen = ((I_terminal - I_diseno) / I_diseno * 100).toFixed(1);
            
            return {
                calibre: calibre.calibre,
                I_tabla: I_tabla,
                I_corr: I_corr,
                I_terminal: I_terminal,
                I_diseno: I_diseno,
                margen: parseFloat(margen),
                cumple: I_terminal >= I_diseno,
                area: calibre.area
            };
        }).filter(function(c) { return c.cumple; });
        
        // Ordenar por calibre más pequeño que cumpla
        candidatos.sort(function(a, b) {
            // Priorizar menor calibre
            if (a.area !== b.area) return a.area - b.area;
            // Si mismo área, priorizar mayor margen
            return b.margen - a.margen;
        });
        
        if (candidatos.length === 0) {
            return {
                ok: false,
                razon: "No cumple ampacidad",
                sugerencia: "Aumentar calibre o paralelos"
            };
        }
        
        var seleccionado = candidatos[0];
        
        // Validar margen mínimo 10%
        if (seleccionado.margen < 10) {
            console.warn('[ConductorSelectorNOM] Margen bajo (<10%): ' + seleccionado.margen + '%');
        }
        
        return {
            ok: true,
            seleccionado: seleccionado,
            alternativas: candidatos.slice(0, 3), // Top 3 opciones
            totalEvaluados: catalogo.length
        };
    }
    
    /**
     * Obtener catálogo de conductores por defecto
     * @returns {Array} Catálogo de conductores con ampacidad y terminales
     */
    function getCatalogoDefault() {
        return [
            { calibre: '14', ampacidad: 25, area: 2.08, terminal_75: 20 },
            { calibre: '12', ampacidad: 30, area: 3.31, terminal_75: 25 },
            { calibre: '10', ampacidad: 40, area: 5.26, terminal_75: 30 },
            { calibre: '8', ampacidad: 55, area: 8.37, terminal_75: 50 },
            { calibre: '6', ampacidad: 75, area: 13.3, terminal_75: 65 },
            { calibre: '4', ampacidad: 95, area: 21.2, terminal_75: 85 },
            { calibre: '2', ampacidad: 130, area: 33.6, terminal_75: 115 },
            { calibre: '1', ampacidad: 150, area: 42.4, terminal_75: 130 },
            { calibre: '1/0', ampacidad: 170, area: 53.5, terminal_75: 150 },
            { calibre: '2/0', ampacidad: 195, area: 67.4, terminal_75: 175 },
            { calibre: '3/0', ampacidad: 225, area: 85.0, terminal_75: 200 },
            { calibre: '4/0', ampacidad: 260, area: 107.2, terminal_75: 230 },
            { calibre: '250', ampacidad: 290, area: 126.7, terminal_75: 255 },
            { calibre: '300', ampacidad: 320, area: 152.0, terminal_75: 285 },
            { calibre: '350', ampacidad: 350, area: 177.3, terminal_75: 310 },
            { calibre: '400', ampacidad: 380, area: 202.7, terminal_75: 335 },
            { calibre: '500', ampacidad: 430, area: 253.4, terminal_75: 380 },
            { calibre: '600', ampacidad: 475, area: 304.0, terminal_75: 420 },
            { calibre: '750', ampacidad: 535, area: 380.0, terminal_75: 475 },
            { calibre: '1000', ampacidad: 615, area: 506.7, terminal_75: 545 }
        ];
    }
    
    return {
        seleccionarConductor: seleccionarConductor,
        getCatalogoDefault: getCatalogoDefault
    };
})();

if (typeof window !== 'undefined') {
    window.ConductorSelectorNOM = ConductorSelectorNOM;
}
