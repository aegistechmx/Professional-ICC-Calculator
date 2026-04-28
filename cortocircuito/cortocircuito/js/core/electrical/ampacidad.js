/**
 * core/electrical/ampacidad.js — Core de cálculo de ampacidad (única fuente de verdad)
 * TODOS los módulos del sistema deben usar esta función para cálculo de ampacidad
 * 
 * Este módulo reemplaza múltiples cálculos duplicados en:
 * - ampacidad_real.js
 * - motor_autocorreccion.js
 * - motor_inteligente_ccc.js
 * - semaforo.js
 * - solver_electrico.js
 */

var CoreAmpacidad = (function() {
    
    /**
     * Calcular ampacidad completa (única fuente de verdad)
     * @param {Object} params - Parámetros de cálculo
     * @param {string} params.calibre - Calibre del conductor (ej: "250", "1/0")
     * @param {string} params.material - Material ("cobre" o "aluminio")
     * @param {number} params.tempAislamiento - Temperatura de aislamiento (°C)
     * @param {number} params.tempAmbiente - Temperatura ambiente (°C)
     * @param {number} params.numConductores - Número de conductores en canalización
     * @param {number} params.paralelos - Número de conductores en paralelo
     * @param {number} params.tempTerminal - Temperatura de terminal (°C)
     * @param {number} params.carga - Corriente de carga (A)
     * @param {number} params.Fcc - Factor de carga (default 1.25)
     * @returns {Object} Resultado completo de ampacidad
     */
    function calcularAmpacidad(params) {
        // Sanitizar inputs
        var calibre = String(params.calibre || "").trim();
        var material = params.material || "cobre";
        var tempAislamiento = params.tempAislamiento || 75;
        var tempAmbiente = params.tempAmbiente || 30;
        var numConductores = params.numConductores || 3;
        var paralelos = params.paralelos || 1;
        var tempTerminal = params.tempTerminal || 75;
        var carga = params.carga || 0;
        var Fcc = params.Fcc || 1.25;
        
        // FIX CRÍTICO: Validar paralelos antes del cálculo
        if (!paralelos || paralelos <= 0) {
            throw new Error("Paralelos inválido: " + paralelos + ". Debe ser >= 1");
        }
        
        // 1. Obtener ampacidad base de tabla
        var I_tabla = getAmpacidadTabla(calibre, material, tempAislamiento);
        
        if (!I_tabla || I_tabla <= 0) {
            return {
                valido: false,
                error: "Calibre inválido o no encontrado en tabla",
                calibre: calibre,
                I_tabla: 0,
                I_corregida: 0,
                I_terminal: 0,
                I_final: 0,
                I_diseño: carga * Fcc,
                F_temp: 1,
                F_agrupamiento: 1,
                violacionTerminal: false,
                cumple: false
            };
        }
        
        // 2. Factor de temperatura
        var F_temp = getFactorTemperatura(tempAislamiento, tempAmbiente);
        
        // 3. Factor de agrupamiento
        var F_agrupamiento = getFactorAgrupamiento(numConductores);
        
        // 4. Ampacidad corregida (termica) - FIX CRÍTICO: Incluir paralelos
        var I_corregida = I_tabla * F_temp * F_agrupamiento * paralelos;
        
        // DEBUG: Log del cálculo
        if (typeof console !== 'undefined' && console.log) {
            console.log("[CoreAmpacidad] Cálculo:", {
                calibre: calibre,
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                paralelos: paralelos,
                I_corregida: I_corregida,
                formula: I_tabla + " × " + F_temp + " × " + F_agrupamiento + " × " + paralelos + " = " + I_corregida
            });
        }
        
        // Validación estricta: I_corregida no puede ser 0
        if (I_corregida <= 0) {
            throw new Error("Ampacidad corregida inválida: " + I_corregida + ". Fórmula: " + I_tabla + " × " + F_temp + " × " + F_agrupamiento + " × " + paralelos);
        }
        
        // 5. Ampacidad terminal (NOM 110.14C)
        var I_terminal = getAmpacidadTerminal(calibre, tempTerminal, material);
        
        // 6. Ampacidad final (mínimo de corregida y terminal)
        var I_final = Math.min(I_corregida, I_terminal);
        
        // 7. Corriente de diseño
        var I_diseño = carga * Fcc;
        
        // 8. Validación
        var violacionTerminal = I_corregida > I_terminal;
        var cumple = I_final >= I_diseño;
        
        return {
            valido: true,
            calibre: calibre,
            material: material,
            I_tabla: I_tabla,
            I_corregida: I_corregida,
            I_terminal: I_terminal,
            I_final: I_final,
            I_diseño: I_diseño,
            F_temp: F_temp,
            F_agrupamiento: F_agrupamiento,
            paralelos: paralelos,
            tempAmbiente: tempAmbiente,
            tempTerminal: tempTerminal,
            violacionTerminal: violacionTerminal,
            cumple: cumple,
            margen: I_final - I_diseño,
            porcentajeMargen: I_diseño > 0 ? ((I_final - I_diseño) / I_diseño * 100) : 0
        };
    }
    
    /**
     * Obtener ampacidad base de tabla
     * @param {string} calibre - Calibre
     * @param {string} material - Material
     * @param {number} tempAislamiento - Temperatura de aislamiento
     * @returns {number} Ampacidad base (A)
     */
    function getAmpacidadTabla(calibre, material, tempAislamiento) {
        // Tabla simplificada THHN/THWN-2 (cobre)
        var tablaCobre = {
            "14": 15, "12": 20, "10": 30, "8": 50, "6": 65,
            "4": 85, "3": 100, "2": 115, "1": 130, "1/0": 150,
            "2/0": 175, "3/0": 200, "4/0": 230, "250": 255, "300": 285,
            "350": 310, "400": 335, "500": 380, "600": 420, "700": 460,
            "750": 475, "800": 490, "900": 520, "1000": 545, "1250": 590,
            "1500": 625, "1750": 650, "2000": 665
        };
        
        var tabla = material === "aluminio" ? tablaCobre : tablaCobre; // Simplificado
        
        // Ajuste por temperatura de aislamiento
        var valor = tabla[calibre] || 0;
        if (tempAislamiento === 90 && valor > 0) {
            valor = valor * 1.08; // Aproximación para 90°C
        }
        
        return valor;
    }
    
    /**
     * Obtener factor de temperatura
     * @param {number} tempAislamiento - Temperatura de aislamiento
     * @param {number} tempAmbiente - Temperatura ambiente
     * @returns {number} Factor de temperatura
     */
    function getFactorTemperatura(tempAislamiento, tempAmbiente) {
        if (tempAmbiente <= 30) return 1.0;
        if (tempAmbiente <= 40) {
            if (tempAislamiento === 60) return 0.82;
            if (tempAislamiento === 75) return 0.88;
            if (tempAislamiento === 90) return 0.91;
        }
        if (tempAmbiente <= 50) {
            if (tempAislamiento === 60) return 0.67;
            if (tempAislamiento === 75) return 0.75;
            if (tempAislamiento === 90) return 0.82;
        }
        return 0.5; // Fallback conservador
    }
    
    /**
     * Obtener factor de agrupamiento (NOM 310.15)
     * @param {number} numConductores - Número de conductores
     * @returns {number} Factor de agrupamiento
     */
    function getFactorAgrupamiento(numConductores) {
        if (numConductores <= 3) return 1.0;
        if (numConductores <= 6) return 0.80;
        if (numConductores <= 9) return 0.70;
        if (numConductores <= 20) return 0.50;
        return 0.45; // Más de 20
    }
    
    /**
     * Obtener ampacidad terminal (NOM 110.14C)
     * @param {string} calibre - Calibre
     * @param {number} tempTerminal - Temperatura de terminal
     * @param {string} material - Material
     * @returns {number} Ampacidad terminal (A)
     */
    function getAmpacidadTerminal(calibre, tempTerminal, material) {
        var I_tabla = getAmpacidadTabla(calibre, material, 75); // Base 75°C
        
        if (tempTerminal === 60) {
            // Terminal 60°C limita a valores de 60°C
            return I_tabla * 0.82; // Aproximación
        }
        
        if (tempTerminal === 75) {
            return I_tabla;
        }
        
        if (tempTerminal === 90) {
            return I_tabla * 1.08; // Aproximación
        }
        
        return I_tabla; // Default
    }
    
    /**
     * Seleccionar calibre mínimo para carga dada
     * @param {number} carga - Corriente de carga (A)
     * @param {Object} params - Parámetros adicionales
     * @returns {Object} Calibre seleccionado con ampacidad
     */
    function seleccionarCalibreMinimo(carga, params) {
        params = params || {};
        var material = params.material || "cobre";
        var tempAislamiento = params.tempAislamiento || 75;
        var tempAmbiente = params.tempAmbiente || 30;
        var numConductores = params.numConductores || 3;
        var paralelos = params.paralelos || 1;
        var tempTerminal = params.tempTerminal || 75;
        var Fcc = params.Fcc || 1.25;
        
        var calibres = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "700", "750", "800", "900", "1000", "1250", "1500", "1750", "2000"];
        
        for (var i = 0; i < calibres.length; i++) {
            var resultado = calcularAmpacidad({
                calibre: calibres[i],
                material: material,
                tempAislamiento: tempAislamiento,
                tempAmbiente: tempAmbiente,
                numConductores: numConductores,
                paralelos: paralelos,
                tempTerminal: tempTerminal,
                carga: carga,
                Fcc: Fcc
            });
            
            if (resultado.cumple) {
                return resultado;
            }
        }
        
        // Si ningún calibre cumple, retornar el más grande
        return calcularAmpacidad({
            calibre: "2000",
            material: material,
            tempAislamiento: tempAislamiento,
            tempAmbiente: tempAmbiente,
            numConductores: numConductores,
            paralelos: paralelos,
            tempTerminal: tempTerminal,
            carga: carga,
            Fcc: Fcc
        });
    }
    
    return {
        calcularAmpacidad: calcularAmpacidad,
        getAmpacidadTabla: getAmpacidadTabla,
        getFactorTemperatura: getFactorTemperatura,
        getFactorAgrupamiento: getFactorAgrupamiento,
        getAmpacidadTerminal: getAmpacidadTerminal,
        seleccionarCalibreMinimo: seleccionarCalibreMinimo
    };
})();

if (typeof window !== 'undefined') {
    window.CoreAmpacidad = CoreAmpacidad;
}
