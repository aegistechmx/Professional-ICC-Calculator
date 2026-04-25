/**
 * Motor de Análisis de Fallas - Basado en IEEE Std 399 e IEC 60909
 * Calcula corrientes de cortocircuito para:
 * - Falla trifásica (3F)
 * - Falla bifásica (L-L)
 * - Falla bifásica a tierra (L-L-G)
 * - Falla monofásica a tierra (L-G)
 */

// ==================== UTILIDADES COMPLEJAS ====================

/**
 * Suma de impedancias complejas (R + jX)
 */
function cAdd(a, b) {
    return {
        R: a.R + b.R,
        X: a.X + b.X
    };
}

/**
 * Multiplicación de impedancia compleja por escalar
 */
function cMulScalar(a, k) {
    return {
        R: a.R * k,
        X: a.X * k
    };
}

/**
 * Magnitud de impedancia compleja
 */
function cMag(a) {
    return Math.sqrt(a.R * a.R + a.X * a.X);
}

/**
 * Paralelo de impedancias complejas
 * Z_par = (Za * Zb) / (Za + Zb)
 */
function cParallel(Za, Zb) {
    // Za * Zb = (Ra + jXa) * (Rb + jXb)
    // = (Ra*Rb - Xa*Xb) + j(Ra*Xb + Xa*Rb)
    const numR = Za.R * Zb.R - Za.X * Zb.X;
    const numX = Za.R * Zb.X + Za.X * Zb.R;
    
    // Za + Zb
    const denR = Za.R + Zb.R;
    const denX = Za.X + Zb.X;
    
    // (numR + j*numX) / (denR + j*denX)
    const denMag = denR * denR + denX * denX;
    
    return {
        R: (numR * denR + numX * denX) / denMag,
        X: (numX * denR - numR * denX) / denMag
    };
}

// ==================== CÁLCULOS DE FALLA ====================

/**
 * Falla trifásica equilibrada (3F)
 * I_3F = V_fase / Z1
 * 
 * @param {Object} node - Nodo con Z1, V_phase
 * @returns {Number} Corriente en amperes (base SI)
 */
function fault3F(node) {
    const Z = cMag(node.Z1);
    const I = node.V_phase / Z;
    return I;
}

/**
 * Falla monofásica a tierra (L-G)
 * I_LG = 3 * V_fase / (Z1 + Z2 + Z0)
 * 
 * @param {Object} node - Nodo con Z1, Z2, Z0, V_phase
 * @returns {Number} Corriente en amperes (base SI)
 */
function faultLG(node) {
    const Z_total = cAdd(cAdd(node.Z1, node.Z2), node.Z0);
    const Z = cMag(Z_total);
    const I = (3 * node.V_phase) / Z;
    return I;
}

/**
 * Falla bifásica (L-L)
 * I_LL = sqrt(3) * V_fase / (Z1 + Z2)
 * 
 * @param {Object} node - Nodo con Z1, Z2, V_phase
 * @returns {Number} Corriente en amperes (base SI)
 */
function faultLL(node) {
    const Z_total = cAdd(node.Z1, node.Z2);
    const Z = cMag(Z_total);
    const I = (Math.sqrt(3) * node.V_phase) / Z;
    return I;
}

/**
 * Falla bifásica a tierra (L-L-G)
 * I_LLG = sqrt(3) * V_fase / (Z1 + Z2*Z0/(Z2+Z0))
 * 
 * @param {Object} node - Nodo con Z1, Z2, Z0, V_phase
 * @returns {Number} Corriente en amperes (base SI)
 */
function faultLLG(node) {
    const Zpar = cParallel(node.Z2, node.Z0);
    const Z_total = cAdd(node.Z1, Zpar);
    const Z = cMag(Z_total);
    const I = (Math.sqrt(3) * node.V_phase) / Z;
    return I;
}

// ==================== MODELOS DE Z0 ====================

/**
 * Modelo de impedancia de secuencia cero según tipo de aterrizamiento
 * 
 * @param {String} groundingType - Tipo de aterrizamiento
 * @param {Object} Z1 - Impedancia de secuencia positiva
 * @param {Number} R_tierra - Resistencia de tierra (ohm)
 * @returns {Object} Z0 - Impedancia de secuencia cero
 */
function calculateZ0(groundingType, Z1, R_tierra) {
    switch (groundingType) {
        case 'yg_solido':
            // Sólido: Z0 ≈ Z1
            return {
                R: Z1.R,
                X: Z1.X
            };
            
        case 'yg_resistencia':
        case 'yg_reactancia':
            // Resistencia/reactancia: Z0 = Z_linea + 3 * R_tierra
            return {
                R: Z1.R + 3 * R_tierra,
                X: Z1.X
            };
            
        case 'no_aterrizado':
        case 'delta':
            // No aterrizado: Z0 muy alto (aprox infinito)
            return {
                R: 1000000,  // 1 MΩ (prácticamente infinito)
                X: 1000000
            };
            
        default:
            // Por defecto: Z0 ≈ Z1
            return {
                R: Z1.R,
                X: Z1.X
            };
    }
}

// ==================== PICO ASIMÉTRICO ====================

/**
 * Cálculo de pico asimétrico según IEEE Std 399
 * I_pico = sqrt(2) * I_sc * (1 + e^(-π/(X/R)))
 * 
 * @param {Number} I_sc - Corriente de cortocircuito simétrica (A)
 * @param {Number} XR - Relación X/R
 * @returns {Number} Corriente pico asimétrica (A)
 */
function calculateAsymmetricPeak(I_sc, XR) {
    if (XR === Infinity || XR < 0.1) {
        // Si X/R es muy alto o inválido, usar factor de 2.0 (máximo)
        return Math.sqrt(2) * I_sc * 2.0;
    }
    const factor = 1 + Math.exp(-Math.PI / XR);
    return Math.sqrt(2) * I_sc * factor;
}

// ==================== ANÁLISIS COMPLETO ====================

/**
 * Ejecuta análisis completo de fallas en un nodo
 * 
 * @param {Object} node - Nodo con:
 *   - V_ll: Tensión línea-línea (V)
 *   - V_phase: Tensión fase (V)
 *   - Z1: {R, X} - Secuencia positiva
 *   - Z2: {R, X} - Secuencia negativa
 *   - Z0: {R, X} - Secuencia cero
 *   - XR: Relación X/R total
 * @param {String} groundingType - Tipo de aterrizamiento
 * @param {Number} R_tierra - Resistencia de tierra (ohm)
 * @returns {Object} Resultados de todas las fallas
 */
function runFaultAnalysis(node, groundingType, R_tierra) {
    // Calcular Z0 si no está proporcionado
    if (!node.Z0 || groundingType) {
        node.Z0 = calculateZ0(groundingType || 'yg_solido', node.Z1, R_tierra || 0);
    }
    
    // Calcular todas las fallas
    const I_3F = fault3F(node);
    const I_LG = faultLG(node);
    const I_LL = faultLL(node);
    const I_LLG = faultLLG(node);
    
    // Calcular picos asimétricos
    const XR = node.XR || (node.Z1.X / node.Z1.R);
    const I_3F_peak = calculateAsymmetricPeak(I_3F, XR);
    const I_LG_peak = calculateAsymmetricPeak(I_LG, XR);
    const I_LL_peak = calculateAsymmetricPeak(I_LL, XR);
    const I_LLG_peak = calculateAsymmetricPeak(I_LLG, XR);
    
    // Validaciones
    const warnings = [];
    
    if (I_LG < I_3F * 0.05) {
        warnings.push('⚠️ Falla a tierra muy baja (posible HRG)');
    }
    
    if (I_LG > I_3F) {
        warnings.push('❌ Físicamente imposible: I_LG > I_3F');
    }
    
    if (I_LL > I_3F * 1.1) {
        warnings.push('⚠️ I_LL > 110% de I_3F (verificar datos)');
    }
    
    return {
        I_3F_A: I_3F,
        I_LG_A: I_LG,
        I_LL_A: I_LL,
        I_LLG_A: I_LLG,
        I_3F_peak_A: I_3F_peak,
        I_LG_peak_A: I_LG_peak,
        I_LL_peak_A: I_LL_peak,
        I_LLG_peak_A: I_LLG_peak,
        XR: XR,
        warnings: warnings,
        Z1: node.Z1,
        Z2: node.Z2,
        Z0: node.Z0
    };
}

// ==================== INTEGRACIÓN CON SISTEMA EXISTENTE ====================

/**
 * Construye nodo de impedancias desde el sistema existente
 * 
 * @param {Object} params - Parámetros del sistema
 * @returns {Object} Nodo para análisis de fallas
 */
function buildFaultNode(params) {
    const V_ll = params.V_ll || 220;  // V (base SI)
    const V_phase = V_ll / Math.sqrt(3);  // V (base SI)
    
    // Z1 total = Z_fuente + Z_trafo + Z_linea
    const Z1_total = {
        R: (params.Z_fuente_BT || {R: 0, X: 0}).R + 
             (params.Z_trafo || {R: 0, X: 0}).R +
             (params.Z_linea || {R: 0, X: 0}).R,
        X: (params.Z_fuente_BT || {R: 0, X: 0}).X +
             (params.Z_trafo || {R: 0, X: 0}).X +
             (params.Z_linea || {R: 0, X: 0}).X
    };
    
    // Z2 = Z1 (simplificación común para redes)
    const Z2_total = {
        R: Z1_total.R,
        X: Z1_total.X
    };
    
    // Z0 se calculará según tipo de aterrizamiento
    const Z0_initial = {
        R: Z1_total.R,
        X: Z1_total.X
    };
    
    return {
        V_ll: V_ll,
        V_phase: V_phase,
        Z1: Z1_total,
        Z2: Z2_total,
        Z0: Z0_initial,
        XR: params.XR || (Z1_total.X / Z1_total.R)
    };
}

// ==================== EXPORTAR ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cAdd,
        cMulScalar,
        cMag,
        cParallel,
        fault3F,
        faultLG,
        faultLL,
        faultLLG,
        calculateZ0,
        calculateAsymmetricPeak,
        runFaultAnalysis,
        buildFaultNode
    };
} else {
    window.FaultAnalysis = {
        cAdd,
        cMulScalar,
        cMag,
        cParallel,
        fault3F,
        faultLG,
        faultLL,
        faultLLG,
        calculateZ0,
        calculateAsymmetricPeak,
        runFaultAnalysis,
        buildFaultNode
    };
}
