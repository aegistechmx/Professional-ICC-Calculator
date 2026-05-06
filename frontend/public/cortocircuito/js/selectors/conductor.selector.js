/**
 * selectors/conductor.selector.js — Selector de Conductores
 * Arquitectura limpia: usa ampacidadNOM (única fuente de verdad)
 */

var ConductorSelectorClean = (function() {
    
    var CALIBRES = [
        "14", "12", "10", "8", "6", "4", "3", "2", "1",
        "1/0", "2/0", "3/0", "4/0",
        "250", "300", "350", "400", "500", "600", "750", "1000"
    ];
    
    /**
     * Seleccionar conductores para todos los nodos
     * @param {Object} ctx - Contexto del sistema
     */
    function seleccionarConductores(ctx) {
        ctx.nodos.forEach(function(nodo) {
            if (!nodo.calibre) {
                for (var i = 0; i < CALIBRES.length; i++) {
                    var calibre = CALIBRES[i];
                    
                    try {
                        var amp = ampacidadNOM({
                            calibre: calibre,
                            material: nodo.material,
                            aislamiento: nodo.tempAislamiento || 75,
                            tempAmbiente: nodo.tempAmbiente,
                            nConductores: nodo.agrupamiento,
                            paralelos: nodo.paralelos,
                            tempTerminal: 75
                        });
                        
                        if (amp.I_final >= nodo.I_diseño) {
                            nodo.calibreSeleccionado = calibre;
                            nodo.ampacidadFinal = amp.I_final;
                            nodo.ampacidad = amp;
                            return;
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                ctx.errores.push("Nodo " + nodo.id + ": sin conductor válido");
            }
        });
    }
    
    /**
     * Seleccionar conductor para un nodo individual
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} { calibre, ampacidad, detalle }
     */
    function seleccionarConductor(nodo) {
        var I_diseño = nodo.I_carga * 1.25;
        
        for (var i = 0; i < CALIBRES.length; i++) {
            var calibre = CALIBRES[i];
            
            try {
                var amp = ampacidadNOM({
                    calibre: calibre,
                    material: nodo.material || 'cobre',
                    aislamiento: nodo.tempAislamiento || 75,
                    tempAmbiente: nodo.tempAmbiente || 30,
                    nConductores: nodo.agrupamiento || 3,
                    paralelos: nodo.paralelos || 1,
                    tempTerminal: 75
                });
                
                if (amp.I_final >= I_diseño) {
                    return {
                        calibre: calibre,
                        ampacidad: amp.I_final,
                        detalle: amp
                    };
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error("No existe conductor que cumpla con I_diseño = " + I_diseño.toFixed(1) + "A");
    }
    
    return {
        seleccionarConductores: seleccionarConductores,
        seleccionarConductor: seleccionarConductor
    };
})();

if (typeof window !== 'undefined') {
    window.ConductorSelectorClean = ConductorSelectorClean;
}
