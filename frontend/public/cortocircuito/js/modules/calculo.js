/**
 * modules/calculo.js — Motor de Cálculo
 * Arquitectura limpia: usa ampacidadNOM (única fuente de verdad)
 * Elimina factorTemperatura y factorAgrupamiento
 */

var Calculo = (function() {
    
    /**
     * Calcular sistema completo
     * @param {Object} ctx - Contexto del sistema
     */
    function calcularSistema(ctx) {
        ctx.nodos.forEach(function(nodo) {
            // Corriente de diseño (NOM 210/215)
            nodo.I_diseño = nodo.I_carga * 1.25;
            
            // Ampacidad usando NOM-001-SEDE-2012
            if (nodo.calibre && typeof ampacidadNOM !== 'undefined') {
                try {
                    nodo.ampacidad = ampacidadNOM({
                        calibre: nodo.calibre,
                        material: nodo.material,
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente,
                        nConductores: nodo.agrupamiento,
                        paralelos: nodo.paralelos,
                        tempTerminal: 75
                    });
                } catch (error) {
                    ctx.warnings.push("Nodo " + nodo.id + ": error calculando ampacidad: " + error.message);
                }
            }
            
            // Caída de tensión
            if (nodo.longitud && nodo.voltaje && typeof VoltageDropEngine !== 'undefined') {
                try {
                    var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(nodo.calibre, nodo.material) : 0.1;
                    nodo.caida = VoltageDropEngine.caidaTension({
                        sistema: ctx.sistema.tipo || '3F',
                        V: nodo.voltaje,
                        I: nodo.I_carga,
                        FP: nodo.FP || 0.9,
                        longitud_m: nodo.longitud,
                        R: R,
                        X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
                    });
                } catch (error) {
                    ctx.warnings.push("Nodo " + nodo.id + ": error calculando caída de tensión: " + error.message);
                }
            }
            
            // Cortocircuito (si hay datos)
            if (ctx.sistema.Z_fuente && ctx.sistema.V && typeof ShortcircuitEngine !== 'undefined') {
                try {
                    nodo.falla = ShortcircuitEngine.calcularFalla(nodo, ctx.sistema);
                } catch (error) {
                    ctx.warnings.push("Nodo " + nodo.id + ": error calculando cortocircuito: " + error.message);
                }
            }
        });
    }
    
    /**
     * Calcular ampacidad de un nodo
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidad(nodo) {
        if (!nodo.calibre) {
            throw new Error("Calibre no especificado");
        }
        
        if (typeof ampacidadNOM === 'undefined') {
            throw new Error("ampacidadNOM no está disponible");
        }
        
        return ampacidadNOM({
            calibre: nodo.calibre,
            material: nodo.material || 'cobre',
            aislamiento: nodo.tempAislamiento || 75,
            tempAmbiente: nodo.tempAmbiente || 30,
            nConductores: nodo.agrupamiento || 3,
            paralelos: nodo.paralelos || 1,
            tempTerminal: 75
        });
    }
    
    /**
     * Calcular caída de tensión de un nodo
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} sistema - Datos del sistema
     * @returns {Object} Resultado de caída de tensión
     */
    function calcularCaidaTension(nodo, sistema) {
        if (!nodo.longitud || !nodo.voltaje) {
            throw new Error("Datos insuficientes para caída de tensión");
        }
        
        if (typeof VoltageDropEngine === 'undefined') {
            throw new Error("VoltageDropEngine no está disponible");
        }
        
        var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(nodo.calibre, nodo.material) : 0.1;
        
        return VoltageDropEngine.caidaTension({
            sistema: sistema.tipo || '3F',
            V: nodo.voltaje,
            I: nodo.I_carga,
            FP: nodo.FP || 0.9,
            longitud_m: nodo.longitud,
            R: R,
            X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
        });
    }
    
    return {
        calcularSistema: calcularSistema,
        calcularAmpacidad: calcularAmpacidad,
        calcularCaidaTension: calcularCaidaTension
    };
})();

if (typeof window !== 'undefined') {
    window.Calculo = Calculo;
}
