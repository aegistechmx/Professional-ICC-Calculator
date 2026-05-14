/**
 * core/domain/ampacity.engine.js — Motor de Ampacidad (ÚNICA FUENTE DE VERDAD)
 * Arquitectura tipo ETAP/SKM: cálculo centralizado, validación estricta
 * REGLA DE ORO: NINGÚN otro módulo puede recalcular ampacidad
 */

var AmpacityEngine = (function() {
    
    /**
     * Calcular ampacidad de forma centralizada
     * @param {NodoModel.Nodo} nodo - Nodo del sistema
     * @param {Object} catalogo - Catálogo de conductores
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidad(nodo, catalogo) {
        // Validar nodo
        if (!nodo || !nodo.calibre) {
            throw new Error("Nodo sin calibre especificado");
        }
        
        // Obtener ampacidad base del catálogo
        var base = catalogo.getAmpacidadBase(nodo.calibre, nodo.material, nodo.tempAislamiento);
        
        if (!base || base <= 0) {
            throw new Error("Calibre " + nodo.calibre + " no existe en catálogo o ampacidad inválida");
        }
        
        // Calcular factores de corrección
        var F_temp = getFactorTemperatura(nodo.tempAislamiento, nodo.tempAmbiente);
        var F_agrup = getFactorAgrupamiento(nodo.agrupamiento);
        
        // Validar factores
        if (F_temp <= 0) {
            throw new Error("Factor de temperatura inválido: " + F_temp);
        }
        
        if (F_agrup <= 0) {
            throw new Error("Factor de agrupamiento inválido: " + F_agrup);
        }
        
        // Calcular ampacidad corregida
        var I_corregida = base * F_temp * F_agrup * nodo.paralelos;
        
        // Validación crítica: ampacidad no puede ser 0
        if (I_corregida <= 0) {
            console.error("[AmpacityEngine] Datos corruptos:", {
                base: base,
                F_temp: F_temp,
                F_agrup: F_agrup,
                paralelos: nodo.paralelos,
                resultado: I_corregida
            });
            throw new Error("Ampacidad inválida (datos corruptos): I_corregida = " + I_corregida);
        }
        
        // Calcular ampacidad terminal (NOM 110.14C)
        var I_terminal = catalogo.getAmpacidadTerminal(nodo.calibre, nodo.material, 75);
        
        // Si I_terminal no está disponible, usar I_corregida
        if (!I_terminal || I_terminal <= 0) {
            console.warn("[AmpacityEngine] I_terminal no disponible, usando I_corregida");
            I_terminal = I_corregida;
        }
        
        // Ampacidad final = mínimo de corregida y terminal
        var I_final = Math.min(I_corregida, I_terminal);
        
        return {
            I_base: base,
            I_corregida: I_corregida,
            I_terminal: I_terminal,
            I_final: I_final,
            F_temp: F_temp,
            F_agrup: F_agrup,
            paralelos: nodo.paralelos,
            violacionTerminal: I_corregida > I_terminal
        };
    }
    
    /**
     * Obtener factor de temperatura según NOM-001-SEDE-2012
     * @param {number} tempAislamiento - Temperatura del aislamiento (60, 75, 90)
     * @param {number} tempAmbiente - Temperatura ambiente
     * @returns {number} Factor de temperatura
     */
    function getFactorTemperatura(tempAislamiento, tempAmbiente) {
        tempAislamiento = Number(tempAislamiento) || 75;
        tempAmbiente = Number(tempAmbiente) || 30;
        
        if (tempAmbiente <= tempAislamiento) {
            return 1.0;
        }
        
        var delta = tempAmbiente - tempAislamiento;
        
        // Factores según Tabla 310.15(B)(2)(a)
        if (tempAislamiento === 60) {
            if (delta <= 11) return 0.82;
            if (delta <= 21) return 0.71;
            if (delta <= 31) return 0.58;
            if (delta <= 41) return 0.41;
            return 0.29;
        }
        
        if (tempAislamiento === 75) {
            if (delta <= 11) return 0.88;
            if (delta <= 21) return 0.75;
            if (delta <= 31) return 0.67;
            if (delta <= 41) return 0.52;
            return 0.30;
        }
        
        if (tempAislamiento === 90) {
            if (delta <= 11) return 0.91;
            if (delta <= 21) return 0.87;
            if (delta <= 31) return 0.82;
            if (delta <= 41) return 0.75;
            return 0.58;
        }
        
        // Fallback para temperaturas no estándar
        return Math.max(0.3, 1 - (delta / 50));
    }
    
    /**
     * Obtener factor de agrupamiento según Tabla 310.15(g) NOM-001-SEDE-2012
     * @param {number} ccc - Número de conductores actuales
     * @returns {number} Factor de agrupamiento
     */
    function getFactorAgrupamiento(ccc) {
        ccc = Number(ccc) || 3;
        
        if (ccc <= 3) return 1.0;
        if (ccc <= 6) return 0.80;
        if (ccc <= 9) return 0.70;
        if (ccc <= 20) return 0.50;
        if (ccc <= 30) return 0.45;
        if (ccc <= 40) return 0.40;
        return 0.35;
    }
    
    /**
     * Validar que ampacidad cumple con carga
     * @param {Object} resultado - Resultado de calcularAmpacidad
     * @param {number} I_diseño - Corriente de diseño
     * @returns {Object} { cumple, margen, deficit }
     */
    function validarCumplimiento(resultado, I_diseño) {
        var margen = resultado.I_final - I_diseño;
        var deficit = Math.max(0, I_diseño - resultado.I_final);
        
        return {
            cumple: resultado.I_final >= I_diseño,
            margen: margen,
            deficit: deficit,
            porcentajeMargen: I_diseño > 0 ? (margen / I_diseño * 100) : 0
        };
    }
    
    return {
        calcularAmpacidad: calcularAmpacidad,
        getFactorTemperatura: getFactorTemperatura,
        getFactorAgrupamiento: getFactorAgrupamiento,
        validarCumplimiento: validarCumplimiento
    };
})();

if (typeof window !== 'undefined') {
    window.AmpacityEngine = AmpacityEngine;
}
