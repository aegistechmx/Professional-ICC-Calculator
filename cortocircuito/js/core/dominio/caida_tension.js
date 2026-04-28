/**
 * core/dominio/caida_tension.js — Dominio de Caída de Tensión
 * Módulo de cálculo de caída de tensión
 */

var DominioCaidaTension = (function() {
    
    /**
     * Calcular caída de tensión
     * @param {Object} params - Parámetros de cálculo
     * @returns {Object} Resultado de caída de tensión
     */
    function calcularCaidaTension(params) {
        if (typeof VoltageDropEngine !== 'undefined') {
            var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(params.conductor.calibre, params.sistema.material) : 0.1;
            
            return VoltageDropEngine.caidaTension({
                sistema: params.sistema.tipoSistema || '3F',
                V: params.sistema.voltaje,
                I: params.sistema.I_carga,
                FP: params.sistema.FP,
                longitud_m: params.sistema.longitud,
                R: R,
                X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
            });
        }
        
        // Fallback básico si VoltageDropEngine no está disponible
        if (params.sistema.voltaje && params.sistema.longitud && params.sistema.I_carga) {
            var R = 0.1; // Default
            var Z = Math.sqrt(Math.pow(R, 2) + Math.pow(0.08, 2));
            var I = params.sistema.I_carga;
            var L = params.sistema.longitud;
            var V = params.sistema.voltaje;
            
            var caidaVolts = I * Z * L / 1000;
            var porcentaje = (caidaVolts / V) * 100;
            
            return {
                volts: caidaVolts,
                porcentaje: porcentaje
            };
        }
        
        return { volts: 0, porcentaje: 0 };
    }
    
    /**
     * Validar caída de tensión
     * @param {Object} caida - Resultado de caída de tensión
     * @param {number} limite - Límite máximo (%)
     * @returns {Object} Resultado de validación
     */
    function validarCaidaTension(caida, limite) {
        limite = limite || 3;
        
        return {
            ok: caida.porcentaje <= limite,
            porcentaje: caida.porcentaje,
            limite: limite
        };
    }
    
    return {
        calcularCaidaTension: calcularCaidaTension,
        validarCaidaTension: validarCaidaTension
    };
})();

if (typeof window !== 'undefined') {
    window.DominioCaidaTension = DominioCaidaTension;
}
