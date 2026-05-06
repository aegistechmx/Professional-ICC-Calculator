/**
 * core/domain/shortcircuit.engine.js — Motor de Cortocircuito
 * Arquitectura tipo ETAP/SKM: cálculo centralizado de fallas
 */

var ShortcircuitEngine = (function() {
    
    /**
     * Calcular corriente de falla
     * @param {NodoModel.Nodo} nodo - Nodo del sistema
     * @param {Object} sistema - Datos del sistema (Z_fuente, V, factorXR)
     * @returns {Object} Resultado de falla
     */
    function calcularFalla(nodo, sistema) {
        // Validar datos del sistema
        if (!sistema || !sistema.Z_fuente || !sistema.V) {
            throw new Error("Datos del sistema incompletos para cálculo de falla");
        }
        
        // Impedancia total = Z_fuente + Z_linea
        var Z_linea = nodo.Z_linea || { R: 0, X: 0 };
        var Z_total = {
            R: sistema.Z_fuente.R + Z_linea.R,
            X: sistema.Z_fuente.X + Z_linea.X
        };
        
        // Magnitud de impedancia
        var Z_mag = Math.sqrt(Z_total.R * Z_total.R + Z_total.X * Z_total.X);
        
        if (Z_mag <= 0) {
            throw new Error("Impedancia total inválida: " + Z_mag);
        }
        
        // Tensión del sistema
        var V = sistema.V; // Volts
        var tipoSistema = sistema.tipoSistema || '3f';
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        
        // Corriente de falla simétrica
        var Icc = V / (factor * Z_mag);
        
        // Factor X/R para corriente pico
        var XR = Z_total.X > 0 ? Z_total.X / Z_total.R : 999;
        var factorXR = sistema.factorXR || 2.2; // Default para sistemas industriales
        
        // Corriente pico
        var Ipico = Icc * factorXR;
        
        // Corriente de falla mínima (considerando tolerancias)
        var Icc_min = Icc * 0.9;
        
        return {
            Icc: Icc,
            Ipico: Ipico,
            Icc_min: Icc_min,
            Z_total: Z_total,
            XR: XR,
            factorXR: factorXR,
            V: V,
            tipoSistema: tipoSistema
        };
    }
    
    /**
     * Calcular impedancia de línea
     * @param {number} longitud - Longitud del conductor (m)
     * @param {number} R_por_km - Resistencia por km (Ω/km)
     * @param {number} X_por_km - Reactancia por km (Ω/km)
     * @returns {Object} { R, X }
     */
    function calcularImpedanciaLinea(longitud, R_por_km, X_por_km) {
        var longitud_km = longitud / 1000;
        
        return {
            R: R_por_km * longitud_km,
            X: X_por_km * longitud_km
        };
    }
    
    /**
     * Validar capacidad interruptiva
     * @param {Object} falla - Resultado de calcularFalla
     * @param {Object} equipo - Datos del equipo (breaker, fusible)
     * @returns {Object} { cumple, margen, deficit }
     */
    function validarCapacidadInterruptiva(falla, equipo) {
        if (!equipo || !equipo.Icu) {
            return {
                cumple: false,
                razon: "Equipo sin capacidad interruptiva especificada"
            };
        }
        
        var Icu = equipo.Icu; // kA
        var Icc_kA = falla.Icc / 1000; // Convertir A a kA
        
        var margen = Icu - Icc_kA;
        var deficit = Math.max(0, Icc_kA - Icu);
        
        return {
            cumple: Icu >= Icc_kA,
            Icu: Icu,
            Icc: Icc_kA,
            margen: margen,
            deficit: deficit,
            porcentajeMargen: Icu > 0 ? (margen / Icu * 100) : 0
        };
    }
    
    return {
        calcularFalla: calcularFalla,
        calcularImpedanciaLinea: calcularImpedanciaLinea,
        validarCapacidadInterruptiva: validarCapacidadInterruptiva
    };
})();

if (typeof window !== 'undefined') {
    window.ShortcircuitEngine = ShortcircuitEngine;
}
