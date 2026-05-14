/**
 * core/services/conductor.selector.js — Selector Inteligente de Conductores
 * Arquitectura tipo ETAP/SKM: selección basada en datos NOM-001-SEDE-2012
 * Elimina loops corruptos, valores en 0, fallback falsos
 */

var ConductorSelector = (function() {
    
    // Orden estándar de calibres AWG/kcmil
    var ORDEN_CALIBRES = [
        "14", "12", "10", "8", "6", "4", "3", "2", "1",
        "1/0", "2/0", "3/0", "4/0",
        "250", "300", "350", "400", "500", "600", "750", "1000"
    ];
    
    /**
     * Seleccionar conductor mínimo que cumple con carga (usando NOM)
     * @param {Object} params - Parámetros de selección
     * @param {number} params.I_carga - Corriente de carga (A)
     * @param {string} params.material - Material (cobre, aluminio)
     * @param {number} params.aislamiento - Temperatura de aislamiento (60, 75, 90)
     * @param {number} params.tempAmbiente - Temperatura ambiente (°C)
     * @param {number} params.nConductores - Número de conductores agrupados
     * @param {number} params.paralelos - Número de conductores en paralelo
     * @param {number} params.terminal - Temperatura de terminal (60, 75, 90)
     * @returns {Object} { calibre, ampacidad, detalle }
     */
    function seleccionarConductor(params) {
        var I_carga = params.I_carga;
        var material = params.material || "cobre";
        var aislamiento = params.aislamiento || 75;
        var tempAmbiente = params.tempAmbiente || 30;
        var nConductores = params.nConductores || 3;
        var paralelos = params.paralelos || 1;
        var terminal = params.terminal || 75;
        
        // Validar carga
        if (!I_carga || I_carga <= 0) {
            throw new Error("Carga inválida: I_carga = " + I_carga);
        }
        
        // Validar paralelos
        if (paralelos <= 0) {
            throw new Error("Paralelos debe ser >= 1: " + paralelos);
        }
        
        // Corriente de diseño con factor de continuidad (NOM 210/215)
        var I_diseño = I_carga * 1.25;
        
        console.log("[ConductorSelector] Buscando conductor para I_carga:", I_carga.toFixed(1) + "A, I_diseño:", I_diseño.toFixed(1) + "A");
        
        // Iterar calibres en orden ascendente
        for (var i = 0; i < ORDEN_CALIBRES.length; i++) {
            var calibre = ORDEN_CALIBRES[i];
            
            try {
                // Usar ampacidadNOM (datos NOM-001-SEDE-2012)
                var amp = ampacidadNOM({
                    calibre: calibre,
                    material: material,
                    aislamiento: aislamiento,
                    tempAmbiente: tempAmbiente,
                    nConductores: nConductores,
                    paralelos: paralelos,
                    tempTerminal: terminal
                });
                
                // Validar que ampacidad no sea 0
                if (amp.I_final <= 0) {
                    console.error("[ConductorSelector] Ampacidad inválida para calibre " + calibre + ": " + amp.I_final);
                    continue;
                }
                
                console.log("[ConductorSelector] Probando calibre " + calibre + ": I_final = " + amp.I_final.toFixed(1) + "A");
                
                // Verificar si cumple con carga
                if (amp.I_final >= I_diseño) {
                    var margen = amp.I_final - I_diseño;
                    var porcentajeMargen = (margen / I_diseño * 100);
                    
                    return {
                        calibre: calibre,
                        ampacidad: amp.I_final,
                        I_base: amp.I_base,
                        I_base75: amp.I_base75,
                        I_corregida: amp.I_corregida,
                        F_temp: amp.F_temp,
                        F_agrup: amp.F_agrup,
                        paralelos: paralelos,
                        margen: margen,
                        porcentajeMargen: porcentajeMargen,
                        violacionTerminal: amp.violacionTerminal,
                        detalle: amp
                    };
                }
            } catch (error) {
                console.warn("[ConductorSelector] Error probando calibre " + calibre + ":", error.message);
                continue;
            }
        }
        
        // No se encontró conductor válido
        throw new Error("No existe conductor que cumpla con I_diseño = " + I_diseño.toFixed(1) + "A");
    }
    
    /**
     * Validar conductor existente usando NOM
     * @param {Object} params - Parámetros de validación
     * @param {string} params.calibre - Calibre existente
     * @param {number} params.I_carga - Corriente de carga
     * @param {string} params.material - Material
     * @param {number} params.aislamiento - Temperatura de aislamiento
     * @param {number} params.tempAmbiente - Temperatura ambiente
     * @param {number} params.nConductores - Número de conductores
     * @param {number} params.paralelos - Paralelos
     * @param {number} params.terminal - Temperatura de terminal
     * @returns {Object} { cumple, sugerencia, datos }
     */
    function validarConductorExistente(params) {
        var calibre = params.calibre;
        var I_carga = params.I_carga;
        
        if (!calibre) {
            throw new Error("Calibre no especificado");
        }
        
        if (!I_carga || I_carga <= 0) {
            throw new Error("Carga inválida: I_carga = " + I_carga);
        }
        
        try {
            var amp = ampacidadNOM(params);
            var I_diseño = I_carga * 1.25;
            var margen = amp.I_final - I_diseño;
            
            if (amp.I_final >= I_diseño) {
                return {
                    cumple: true,
                    calibre: calibre,
                    ampacidad: amp.I_final,
                    margen: margen,
                    porcentajeMargen: (margen / I_diseño * 100),
                    datos: amp
                };
            }
            
            // No cumple: buscar sugerencia
            var sugerencia = seleccionarConductor(params);
            
            return {
                cumple: false,
                calibre: calibre,
                ampacidad: amp.I_final,
                I_diseño: I_diseño,
                deficit: I_diseño - amp.I_final,
                sugerencia: sugerencia,
                datos: amp
            };
        } catch (error) {
            console.error("[ConductorSelector] Error validando conductor:", error.message);
            throw error;
        }
    }
    
    /**
     * Obtener lista de calibres ordenados
     * @returns {Array} Lista de calibres
     */
    function obtenerCalibresOrdenados() {
        return ORDEN_CALIBRES.slice();
    }
    
    return {
        seleccionarConductor: seleccionarConductor,
        validarConductorExistente: validarConductorExistente,
        obtenerCalibresOrdenados: obtenerCalibresOrdenados
    };
})();

if (typeof window !== 'undefined') {
    window.ConductorSelector = ConductorSelector;
}
