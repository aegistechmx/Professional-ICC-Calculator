/**
 * caida_tension_pro.js — Módulo de Caída de Tensión PRO
 * Modelo físico correcto: R + X + FP (cosφ y sinφ)
 * Para coordinación con NOM-001-SEDE-2012
 */

var CaidaTensionPro = (function() {
    
    /**
     * Resistencia DC a 75°C (Ω/km) — Cobre
     * Valores típicos para conductores de potencia
     */
    var R_CU_75 = {
        "14": 8.21,
        "12": 5.21,
        "10": 3.28,
        "8": 2.06,
        "6": 1.30,
        "4": 0.82,
        "3": 0.65,
        "2": 0.52,
        "1": 0.41,
        "1/0": 0.33,
        "2/0": 0.26,
        "3/0": 0.21,
        "4/0": 0.16,
        "250": 0.128,
        "300": 0.107,
        "350": 0.092,
        "400": 0.080,
        "500": 0.064,
        "600": 0.053,
        "700": 0.045,
        "750": 0.042,
        "800": 0.040,
        "900": 0.035,
        "1000": 0.032
    };

    /**
     * Resistencia DC a 75°C (Ω/km) — Aluminio
     */
    var R_AL_75 = {
        "12": 8.58,
        "10": 5.41,
        "8": 3.41,
        "6": 2.15,
        "4": 1.35,
        "3": 1.07,
        "2": 0.85,
        "1": 0.68,
        "1/0": 0.54,
        "2/0": 0.43,
        "3/0": 0.34,
        "4/0": 0.264,
        "250": 0.211,
        "300": 0.176,
        "350": 0.153,
        "400": 0.134,
        "500": 0.107,
        "600": 0.089,
        "700": 0.076,
        "750": 0.071,
        "800": 0.067,
        "900": 0.059,
        "1000": 0.053
    };

    /**
     * Reactancia típica (Ω/km)
     * Depende de tipo de canalización
     */
    var X_canalizacion = {
        acero: 0.08,
        PVC: 0.07,
        aluminio: 0.075,
        banco_ductos: 0.09
    };

    /**
     * Coeficiente de temperatura
     */
    var alpha_Cu = 0.00393;
    var alpha_Al = 0.00403;

    /**
     * Corregir resistencia por temperatura
     * @param {number} Rbase - Resistencia base a 75°C (Ω/km)
     * @param {number} temp - Temperatura de operación (°C)
     * @param {string} material - "Cu" o "Al"
     * @returns {number} Resistencia corregida (Ω/km)
     */
    function corregirR(Rbase, temp, material) {
        var alpha = material === "Al" ? alpha_Al : alpha_Cu;
        return Rbase * (1 + alpha * (temp - 75));
    }

    /**
     * Calcular caída de tensión completa
     * Fórmula: ΔV = k × I × (R×cosφ + X×sinφ) × L
     * @param {Object} p - Parámetros
     * @returns {Object} { dV, porcentaje, R, X, L_km }
     */
    function calcularVD(p) {
        // Sistema: 3F o 1F
        var k = (p.sistema === "3F") ? Math.sqrt(3) : 2;
        
        // Resistencia base
        var Rbase = (p.material === "Cu") ? R_CU_75[p.calibre] : R_AL_75[p.calibre];
        if (!Rbase) Rbase = 0.1; // Valor por defecto si no existe
        
        // Corregir por temperatura
        var R = corregirR(Rbase, p.temp || 31, p.material);
        
        // Reactancia según canalización
        var Xl = X_canalizacion[p.canalizacion] || 0.08;
        
        // Paralelos reducen impedancia
        var nParalelos = p.paralelos || 1;
        R = R / nParalelos;
        Xl = Xl / nParalelos;
        
        // Factor de potencia
        var cos = p.FP || 0.9;
        var sin = Math.sqrt(1 - cos * cos);
        
        // Longitud en km
        var L_km = (p.L || 0) / 1000;
        
        // Corriente
        var I = p.I || 0;
        
        // Caída de tensión en volts
        var dV = k * I * (R * cos + Xl * sin) * L_km;
        
        // Tensión base
        var Vbase = p.V_ll || 480;
        
        // Porcentaje
        var porcentaje = (dV / Vbase) * 100;
        
        return {
            dV: dV,
            porcentaje: porcentaje,
            R: R,
            X: Xl,
            L_km: L_km,
            k: k,
            cos: cos,
            sin: sin
        };
    }

    /**
     * Validar caída de tensión según NOM
     * @param {Object} vd - Resultado de calcularVD
     * @param {string} tipo - "alimentador" | "total"
     * @returns {Object} { estado, limite, exceso }
     */
    function validarVD(vd, tipo) {
        var limite = (tipo === "total") ? 5 : 3;
        var exceso = vd.porcentaje - limite;
        
        var estado;
        if (vd.porcentaje > limite) {
            estado = "ERROR";
        } else if (vd.porcentaje > limite * 0.8) {
            estado = "WARNING";
        } else {
            estado = "OK";
        }
        
        return {
            estado: estado,
            limite: limite,
            exceso: exceso,
            porcentaje: vd.porcentaje
        };
    }

    /**
     * Calcular calibre mínimo para caída de tensión
     * @param {Object} p - Parámetros (sin calibre)
     * @param {number} limiteMax - Límite máximo de caída (%)
     * @returns {Object|null} Calibre que cumple
     */
    function calibreMinimoVD(p, limiteMax) {
        var calibres = Object.keys(R_CU_75);
        var material = p.material || "Cu";
        var Rbase_db = material === "Cu" ? R_CU_75 : R_AL_75;
        
        for (var i = 0; i < calibres.length; i++) {
            var calibre = calibres[i];
            var p_test = Object.assign({}, p, { calibre: calibre });
            var vd = calcularVD(p_test);
            
            if (vd.porcentaje <= limiteMax) {
                return {
                    calibre: calibre,
                    vd: vd
                };
            }
        }
        
        return null;
    }

    /**
     * Calcular número de paralelos mínimo para caída de tensión
     * @param {Object} p - Parámetros (sin paralelos)
     * @param {number} limiteMax - Límite máximo de caída (%)
     * @returns {Object} { nParalelos, vd }
     */
    function paralelosMinimosVD(p, limiteMax) {
        var nParalelos = 1;
        var maxParalelos = 6;
        
        while (nParalelos <= maxParalelos) {
            var p_test = Object.assign({}, p, { paralelos: nParalelos });
            var vd = calcularVD(p_test);
            
            if (vd.porcentaje <= limiteMax) {
                return {
                    nParalelos: nParalelos,
                    vd: vd
                };
            }
            
            nParalelos++;
        }
        
        return {
            nParalelos: maxParalelos,
            vd: calcularVD(Object.assign({}, p, { paralelos: maxParalelos }))
        };
    }

    /**
     * Autocorrección de caída de tensión
     * @param {Object} p - Parámetros actuales
     * @param {string} tipo - "alimentador" | "total"
     * @returns {Object} { solucion, cambios }
     */
    function autocorregirVD(p, tipo) {
        var vd = calcularVD(p);
        var validacion = validarVD(vd, tipo);
        
        if (validacion.estado === "OK") {
            return {
                solucion: "YA_CUMPLE",
                cambios: [],
                vd: vd
            };
        }
        
        var cambios = [];
        var limite = validacion.limite;
        
        // Prioridad 1: Subir calibre
        var calibreMin = calibreMinimoVD(p, limite);
        if (calibreMin && calibreMin.calibre !== p.calibre) {
            cambios.push({
                tipo: "CALIBRE",
                accion: "Subir calibre a " + calibreMin.calibre,
                razon: "Caída de tensión excesiva: " + vd.porcentaje.toFixed(2) + "% > " + limite + "%"
            });
            
            return {
                solucion: "SUBIR_CALIBRE",
                cambios: cambios,
                nuevoCalibre: calibreMin.calibre,
                vd: calibreMin.vd
            };
        }
        
        // Prioridad 2: Aumentar paralelos
        var paralelosMin = paralelosMinimosVD(p, limite);
        if (paralelosMin.nParalelos > (p.paralelos || 1)) {
            cambios.push({
                tipo: "PARALELOS",
                accion: "Aumentar paralelos a " + paralelosMin.nParalelos,
                razon: "Caída de tensión excesiva: " + vd.porcentaje.toFixed(2) + "% > " + limite + "%"
            });
            
            return {
                solucion: "AUMENTAR_PARALELOS",
                cambios: cambios,
                nuevoParalelos: paralelosMin.nParalelos,
                vd: paralelosMin.vd
            };
        }
        
        // Prioridad 3: Reducir longitud (sugerencia)
        cambios.push({
            tipo: "LONGITUD",
            accion: "Reducir longitud o reubicar equipo",
            razon: "Caída de tensión excesiva incluso con paralelos máximos"
        });
        
        return {
            solucion: "REDUCIR_LONGITUD",
            cambios: cambios,
            vd: vd
        };
    }

    /**
     * Optimización inteligente de cable
     * Balancea caída de tensión vs costo
     * @param {Object} p - Parámetros base
     * @param {Object} pesos - { VD, costo, coordinacion }
     * @returns {Object} Mejor solución
     */
    function optimizarCable(p, pesos) {
        pesos = pesos || { VD: 0.5, costo: 0.3, coordinacion: 0.2 };
        
        var calibres = Object.keys(R_CU_75);
        var mejorSolucion = null;
        var mejorScore = -Infinity;
        
        for (var i = 0; i < calibres.length; i++) {
            var calibre = calibres[i];
            var p_test = Object.assign({}, p, { calibre: calibre });
            var vd = calcularVD(p_test);
            
            // Score simple (puede expandirse con costo real)
            var score = 0;
            
            // Peso VD: menor caída es mejor
            score += pesos.VD * (5 - vd.porcentaje) / 5;
            
            // Peso costo: menor calibre es mejor (aproximación)
            var idx = calibres.indexOf(calibre);
            score += pesos.costo * (1 - idx / calibres.length);
            
            // Peso coordinación: calibre moderado es mejor
            if (idx >= 5 && idx <= 15) {
                score += pesos.coordinacion;
            }
            
            if (score > mejorScore) {
                mejorScore = score;
                mejorSolucion = {
                    calibre: calibre,
                    vd: vd,
                    score: score
                };
            }
        }
        
        return mejorSolucion;
    }

    /**
     * Obtener resistencia base
     * @param {string} calibre - Calibre del conductor
     * @param {string} material - "Cu" o "Al"
     * @returns {number} Resistencia a 75°C (Ω/km)
     */
    function obtenerRbase(calibre, material) {
        var db = material === "Al" ? R_AL_75 : R_CU_75;
        return db[calibre] || 0.1;
    }

    /**
     * Obtener reactancia
     * @param {string} canalizacion - Tipo de canalización
     * @returns {number} Reactancia (Ω/km)
     */
    function obtenerX(canalizacion) {
        return X_canalizacion[canalizacion] || 0.08;
    }

    return {
        // Bases de datos
        R_CU_75: R_CU_75,
        R_AL_75: R_AL_75,
        X_canalizacion: X_canalizacion,
        
        // Funciones principales
        corregirR: corregirR,
        calcularVD: calcularVD,
        validarVD: validarVD,
        
        // Autocorrección
        calibreMinimoVD: calibreMinimoVD,
        paralelosMinimosVD: paralelosMinimosVD,
        autocorregirVD: autocorregirVD,
        
        // Optimización
        optimizarCable: optimizarCable,
        
        // Utilidades
        obtenerRbase: obtenerRbase,
        obtenerX: obtenerX
    };
})();

if (typeof window !== 'undefined') {
    window.CaidaTensionPro = CaidaTensionPro;
}
