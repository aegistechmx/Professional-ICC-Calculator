/**
 * core/domain/voltageDrop.engine.js — Motor de Caída de Tensión
 * Arquitectura tipo ETAP/SKM: cálculo real de caída de tensión
 * Fórmulas exactas para sistemas trifásicos y monofásicos
 */

var VoltageDropEngine = (function() {
    
    /**
     * Calcular caída de tensión
     * @param {Object} params - Parámetros de cálculo
     * @param {string} params.sistema - Tipo de sistema ("3F" o "1F")
     * @param {number} params.V - Tensión del sistema (V)
     * @param {number} params.I - Corriente (A)
     * @param {number} params.FP - Factor de potencia
     * @param {number} params.longitud_m - Longitud del conductor (m)
     * @param {number} params.R - Resistencia del conductor (ohm/km)
     * @param {number} params.X - Reactancia del conductor (ohm/km, default 0.08)
     * @returns {Object} { deltaV, porcentaje }
     */
    function caidaTension(params) {
        var sistema = params.sistema || "3F";
        var V = params.V;
        var I = params.I;
        var FP = params.FP || 0.9;
        var longitud_m = params.longitud_m;
        var R = params.R;
        var X = params.X !== undefined ? params.X : 0.08; // Valor típico para conductores
        
        // Validar inputs
        if (!V || V <= 0) {
            throw new Error("Tensión inválida: " + V);
        }
        
        // FIX: Si I = 0, no hay caída de tensión (nodo sin carga)
        if (!I || I <= 0) {
            return {
                deltaV: 0,
                porcentaje: 0,
                deltaV_por_fase: 0
            };
        }
        
        if (!longitud_m || longitud_m <= 0) {
            throw new Error("Longitud inválida: " + longitud_m);
        }
        
        if (!R || R < 0) {
            throw new Error("Resistencia inválida: " + R);
        }
        
        if (FP <= 0 || FP > 1) {
            throw new Error("Factor de potencia inválido: " + FP);
        }
        
        // Convertir longitud a km
        var L_km = longitud_m / 1000;
        
        // Componentes de potencia
        var cosφ = FP;
        var sinφ = Math.sqrt(1 - FP * FP);
        
        var deltaV;
        
        if (sistema === "3F") {
            // Fórmula trifásica: ΔV = √3 × I × (R×cosφ + X×sinφ) × L
            deltaV = Math.sqrt(3) * I * (R * cosφ + X * sinφ) * L_km;
        } else if (sistema === "1F") {
            // Fórmula monofásica: ΔV = 2 × I × (R×cosφ + X×sinφ) × L
            deltaV = 2 * I * (R * cosφ + X * sinφ) * L_km;
        } else {
            throw new Error("Tipo de sistema no soportado: " + sistema + " (use '3F' o '1F')");
        }
        
        // Calcular porcentaje
        var porcentaje = (deltaV / V) * 100;
        
        return {
            deltaV: deltaV,
            porcentaje: porcentaje,
            sistema: sistema,
            V: V,
            I: I,
            FP: FP,
            longitud: longitud_m,
            R: R,
            X: X
        };
    }
    
    /**
     * Validar caída de tensión según recomendaciones NOM
     * @param {Object} resultado - Resultado de caidaTension
     * @param {number} limite - Límite máximo permitido (default 3%)
     * @returns {Object} { cumple, exceso }
     */
    function validarCaidaTension(resultado, limite) {
        limite = limite || 3;
        
        return {
            cumple: resultado.porcentaje <= limite,
            porcentaje: resultado.porcentaje,
            limite: limite,
            exceso: Math.max(0, resultado.porcentaje - limite)
        };
    }
    
    /**
     * Calcular caída de tensión por fase (para sistemas desbalanceados)
     * @param {Object} params - Parámetros de cálculo
     * @param {Array} params.corrientes - Corrientes por fase [Ia, Ib, Ic]
     * @param {number} params.V - Tensión línea-línea (V)
     * @param {number} params.longitud_m - Longitud (m)
     * @param {number} params.R - Resistancia (ohm/km)
     * @param {number} params.X - Reactancia (ohm/km)
     * @returns {Object} { deltaV_por_fase, promedio }
     */
    function caidaTensionPorFase(params) {
        var corrientes = params.corrientes;
        var V = params.V;
        var longitud_m = params.longitud_m;
        var R = params.R;
        var X = params.X !== undefined ? params.X : 0.08;
        
        if (!corrientes || corrientes.length !== 3) {
            throw new Error("Se requieren 3 corrientes para cálculo por fase");
        }
        
        var deltaV_por_fase = [];
        var total = 0;
        
        for (var i = 0; i < 3; i++) {
            var resultado = caidaTension({
                sistema: "3F",
                V: V,
                I: corrientes[i],
                FP: 0.9,
                longitud_m: longitud_m,
                R: R,
                X: X
            });
            
            deltaV_por_fase.push(resultado);
            total += resultado.porcentaje;
        }
        
        return {
            deltaV_por_fase: deltaV_por_fase,
            promedio: total / 3,
            maximo: Math.max(deltaV_por_fase[0].porcentaje, deltaV_por_fase[1].porcentaje, deltaV_por_fase[2].porcentaje)
        };
    }
    
    return {
        caidaTension: caidaTension,
        validarCaidaTension: validarCaidaTension,
        caidaTensionPorFase: caidaTensionPorFase
    };
})();

if (typeof window !== 'undefined') {
    window.VoltageDropEngine = VoltageDropEngine;
}
