/**
 * core/MotorAmpacidadNOM.js — Motor Unificado de Ampacidad
 * ÚNICO motor de ampacidad (reemplaza MotorInteligenteCCC + ampacidadNOM)
 * Arquitectura tipo ETAP/SKM: single source of truth
 */

const MotorAmpacidadNOM = (function() {
    
    /**
     * Calcular ampacidad según NOM-001-SEDE-2012
     * @param {Object} input - Datos de entrada
     * @param {string} input.calibre - Calibre del conductor
     * @param {string} input.material - Material (cobre, aluminio)
     * @param {number} input.tempAislamiento - Temperatura de aislamiento (60, 75, 90)
     * @param {number} input.tempAmbiente - Temperatura ambiente (°C)
     * @param {number} input.nConductores - Número de conductores agrupados
     * @param {number} input.paralelos - Número de conductores en paralelo
     * @param {number} input.tempTerminal - Temperatura de terminal (60, 75, 90)
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidadNOM(input) {
        const calibre = String(input.calibre).trim();
        const material = input.material || "cobre";
        const tempAislamiento = input.tempAislamiento || 75;
        const tempAmbiente = input.tempAmbiente || 30;
        const nConductores = input.nConductores || 3;
        const paralelos = input.paralelos || 1;
        const tempTerminal = input.tempTerminal || 75;
        
        // Validar paralelos
        if (paralelos <= 0) {
            throw new Error("Paralelos debe ser >= 1: " + paralelos);
        }
        
        // 1. TABLA BASE (NOM 310.15(B)(16))
        const I_tabla = getAmpacidadTabla(calibre, material, tempAislamiento);
        
        if (!I_tabla || I_tabla <= 0) {
            throw new Error("Calibre inválido o no encontrado: " + calibre + " (material: " + material + ", aislamiento: " + tempAislamiento + ")");
        }
        
        // 2. FACTOR TEMPERATURA (NOM 310.15(B)(2)(a))
        const F_temp = getFactorTemperatura(tempAmbiente, tempAislamiento);
        
        if (F_temp <= 0) {
            throw new Error("Factor de temperatura inválido: " + F_temp);
        }
        
        // 3. FACTOR AGRUPAMIENTO (NOM 310.15(g))
        const F_agrup = getFactorAgrupamiento(nConductores);
        
        if (F_agrup <= 0) {
            throw new Error("Factor de agrupamiento inválido: " + F_agrup);
        }
        
        // 4. CÁLCULO FINAL
        // FIX: Verificar que paralelos no se aplique incorrectamente
        const I_corregida = I_tabla * F_temp * F_agrup * paralelos;
        
        if (I_corregida <= 0) {
            throw new Error("Ampacidad inválida: " + I_corregida);
        }
        
        // 5. LÍMITE DE TERMINAL (NOM 110.14(C))
        const I_base75 = getAmpacidadTabla(calibre, material, 75);
        let I_terminal = aplicarLimiteTerminal(I_corregida, tempTerminal, I_base75);
        
        // FIX: Si I_terminal es undefined o <= 0, usar I_base75 (NOM 110.14C default)
        if (!I_terminal || I_terminal <= 0) {
            I_terminal = I_base75;
        }
        
        return {
            calibre: calibre,
            material: material,
            I_tabla: I_tabla,
            I_base75: I_base75,
            F_temp: F_temp,
            F_agrup: F_agrup,
            paralelos: paralelos,
            I_corregida: I_corregida,
            I_terminal: I_terminal,
            I_final: I_terminal,
            violacionTerminal: I_corregida > I_terminal
        };
    }
    
    /**
     * Seleccionar conductor automáticamente
     * @param {number} I_diseño - Corriente de diseño
     * @param {Object} config - Configuración del sistema
     * @returns {Object} Conductor seleccionado
     */
    function seleccionarConductor(I_diseño, config) {
        var catalogo = getCatalogoOrdenado();
        
        for (var i = 0; i < catalogo.length; i++) {
            var calibre = catalogo[i];
            
            try {
                var result = calcularAmpacidadNOM({
                    calibre: calibre,
                    material: config.material || "cobre",
                    tempAislamiento: config.tempAislamiento || 75,
                    tempAmbiente: config.tempAmbiente || 30,
                    nConductores: config.nConductores || 3,
                    paralelos: config.paralelos || 1,
                    tempTerminal: config.tempTerminal || 75
                });
                
                if (result.I_final >= I_diseño) {
                    return result;
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error("No existe calibre que cumpla con I_diseño = " + I_diseño.toFixed(1) + "A");
    }
    
    /**
     * Obtener ampacidad de tabla NOM
     * @param {string} calibre - Calibre del conductor
     * @param {string} material - Material
     * @param {number} tempAislamiento - Temperatura de aislamiento
     * @returns {number} Ampacidad base
     */
    function getAmpacidadTabla(calibre, material, tempAislamiento) {
        if (typeof CONDUCTORES_NOM !== 'undefined') {
            return CONDUCTORES_NOM[material]?.[calibre]?.[tempAislamiento];
        }
        
        // Fallback a datos legacy si CONDUCTORES_NOM no está disponible
        if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.tablaAmpacidad) {
            return AmpacidadReal.tablaAmpacidad[material]?.[tempAislamiento]?.[calibre];
        }
        
        throw new Error("Tabla de ampacidad no disponible");
    }
    
    /**
     * Obtener factor de temperatura
     * @param {number} tempAmbiente - Temperatura ambiente
     * @param {number} tempAislamiento - Temperatura de aislamiento
     * @returns {number} Factor de temperatura
     */
    function getFactorTemperatura(tempAmbiente, tempAislamiento) {
        if (typeof factorTemperatura !== 'undefined') {
            return factorTemperatura(tempAmbiente, tempAislamiento);
        }
        
        // Fallback si factorTemperatura no está disponible
        var tabla = {
            60: [
                [21, 1.08], [25, 1.00], [30, 0.91], [35, 0.82], [40, 0.71], [45, 0.58], [50, 0.41]
            ],
            75: [
                [21, 1.05], [25, 1.00], [30, 0.94], [35, 0.88], [40, 0.82], [45, 0.75], [50, 0.67]
            ],
            90: [
                [21, 1.04], [25, 1.00], [30, 0.96], [35, 0.91], [40, 0.87], [45, 0.82], [50, 0.76]
            ]
        };
        
        var curva = tabla[tempAislamiento];
        if (!curva) {
            return 0.5; // Fuera de rango
        }
        
        for (var i = 0; i < curva.length; i++) {
            if (tempAmbiente <= curva[i][0]) return curva[i][1];
        }
        
        return 0.5;
    }
    
    /**
     * Obtener factor de agrupamiento
     * @param {number} nConductores - Número de conductores
     * @returns {number} Factor de agrupamiento
     */
    function getFactorAgrupamiento(nConductores) {
        if (typeof factorAgrupamiento !== 'undefined') {
            return factorAgrupamiento(nConductores);
        }
        
        // Fallback si factorAgrupamiento no está disponible
        if (nConductores <= 3) return 1.00;
        if (nConductores <= 6) return 0.80;
        if (nConductores <= 9) return 0.70;
        if (nConductores <= 20) return 0.50;
        if (nConductores <= 30) return 0.45;
        if (nConductores <= 40) return 0.40;
        
        return 0.35;
    }
    
    /**
     * Aplicar límite de terminal
     * @param {number} I_corregida - Ampacidad corregida
     * @param {number} tempTerminal - Temperatura de terminal
     * @param {number} base75 - Ampacidad base a 75°C
     * @returns {number} Ampacidad con límite terminal
     */
    function aplicarLimiteTerminal(I_corregida, tempTerminal, base75) {
        if (!base75 || base75 <= 0) {
            return I_corregida;
        }
        
        if (tempTerminal === 60) {
            return Math.min(I_corregida, base75 * 0.8);
        }
        
        if (tempTerminal === 75) {
            return Math.min(I_corregida, base75);
        }
        
        return I_corregida;
    }
    
    /**
     * Obtener catálogo ordenado de calibres
     * @returns {Array} Lista de calibres ordenados
     */
    function getCatalogoOrdenado() {
        return [
            "14", "12", "10", "8", "6", "4", "3", "2", "1",
            "1/0", "2/0", "3/0", "4/0",
            "250", "300", "350", "400", "500", "600", "750", "1000",
            "1250", "1500", "1750", "2000"
        ];
    }
    
    return {
        calcularAmpacidadNOM: calcularAmpacidadNOM,
        seleccionarConductor: seleccionarConductor,
        getAmpacidadTabla: getAmpacidadTabla,
        getFactorTemperatura: getFactorTemperatura,
        getFactorAgrupamiento: getFactorAgrupamiento
    };
})();

if (typeof window !== 'undefined') {
    window.MotorAmpacidadNOM = MotorAmpacidadNOM;
}
