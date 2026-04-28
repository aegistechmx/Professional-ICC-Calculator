/**
 * core/data/conductores.nom.js — Tabla NOM-001-SEDE-2012 310.15(B)(16)
 * Ampacidad de conductores (A) según material, calibre y temperatura de aislamiento
 * Fuente: NOM-001-SEDE-2012 Tabla 310.15(B)(16)
 */

var CONDUCTORES_NOM = {
  cobre: {
    "14":  {60:15, 75:20, 90:25},
    "12":  {60:20, 75:25, 90:30},
    "10":  {60:30, 75:35, 90:40},
    "8":   {60:40, 75:50, 90:55},
    "6":   {60:55, 75:65, 90:75},
    "4":   {60:70, 75:85, 90:95},
    "3":   {60:85, 75:100, 90:115},
    "2":   {60:95, 75:115, 90:130},
    "1":   {60:110, 75:130, 90:145},
    "1/0": {60:125, 75:150, 90:170},
    "2/0": {60:145, 75:175, 90:195},
    "3/0": {60:165, 75:200, 90:225},
    "4/0": {60:195, 75:230, 90:260},
    "250": {60:215, 75:255, 90:290},
    "300": {60:240, 75:285, 90:320},
    "350": {60:260, 75:310, 90:350},
    "400": {60:280, 75:335, 90:380},
    "500": {60:320, 75:380, 90:430},
    "600": {60:355, 75:420, 90:475},
    "750": {60:400, 75:475, 90:535},
    "1000":{60:455, 75:545, 90:615}
  },
  aluminio: {
    "12":  {60:15, 75:20, 90:25},
    "10":  {60:25, 75:30, 90:35},
    "8":   {60:35, 75:40, 90:45},
    "6":   {60:40, 75:50, 90:55},
    "4":   {60:55, 75:65, 90:75},
    "3":   {60:65, 75:75, 90:85},
    "2":   {60:75, 75:90, 90:100},
    "1":   {60:85, 75:100, 90:115},
    "1/0": {60:100, 75:120, 90:135},
    "2/0": {60:115, 75:135, 90:150},
    "3/0": {60:130, 75:155, 90:175},
    "4/0": {60:150, 75:180, 90:205},
    "250": {60:170, 75:205, 90:230},
    "300": {60:190, 75:230, 90:255},
    "350": {60:210, 75:250, 90:280},
    "400": {60:225, 75:270, 90:305},
    "500": {60:260, 75:310, 90:350},
    "600": {60:285, 75:340, 90:385},
    "750": {60:320, 75:385, 90:435},
    "1000":{60:375, 75:445, 90:500}
  }
};

/**
 * Factor de temperatura según NOM-001-SEDE-2012 Tabla 310.15(B)(2)(a)
 * @param {number} tempAmbiente - Temperatura ambiente (°C)
 * @param {number} aislamiento - Temperatura de aislamiento (60, 75, 90)
 * @returns {number} Factor de corrección
 */
function factorTemperatura(tempAmbiente, aislamiento) {
  aislamiento = aislamiento || 75;
  tempAmbiente = Number(tempAmbiente) || 30;
  
  const tabla = {
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

  const curva = tabla[aislamiento];
  if (!curva) {
    throw new Error("Temperatura de aislamiento no soportada: " + aislamiento);
  }

  for (let i = 0; i < curva.length; i++) {
    if (tempAmbiente <= curva[i][0]) return curva[i][1];
  }

  // Fuera de rango - usar valor mínimo conservador
  return 0.5;
}

/**
 * Factor de agrupamiento según NOM-001-SEDE-2012 Tabla 310.15(g)
 * @param {number} nConductores - Número de conductores actuales
 * @returns {number} Factor de agrupamiento
 */
function factorAgrupamiento(nConductores) {
  nConductores = Number(nConductores) || 3;
  
  if (nConductores <= 3) return 1.00;
  if (nConductores <= 6) return 0.80;
  if (nConductores <= 9) return 0.70;
  if (nConductores <= 20) return 0.50;
  if (nConductores <= 30) return 0.45;
  if (nConductores <= 40) return 0.40;
  
  return 0.35;
}

/**
 * Aplicar límite de terminal según NOM-001-SEDE-2012 Art. 110.14(C)
 * @param {number} I_corregida - Ampacidad corregida
 * @param {number} tempTerminal - Temperatura de terminal (60, 75, 90)
 * @param {number} base75 - Ampacidad base a 75°C
 * @returns {number} Ampacidad final con límite terminal
 */
function aplicarLimiteTerminal(I_corregida, tempTerminal, base75) {
  tempTerminal = tempTerminal || 75;
  
  if (!base75 || base75 <= 0) {
    // Si no hay base75, usar I_corregida como fallback
    return I_corregida;
  }
  
  if (tempTerminal === 60) {
    // Terminal 60°C: limitar a 80% de ampacidad a 75°C
    return Math.min(I_corregida, base75 * 0.8);
  }
  
  if (tempTerminal === 75) {
    // Terminal 75°C: limitar a ampacidad base a 75°C
    return Math.min(I_corregida, base75);
  }
  
  // 90°C solo si TODO el sistema lo permite
  return I_corregida;
}

/**
 * Calcular ampacidad según NOM-001-SEDE-2012
 * @param {Object} params - Parámetros de cálculo
 * @param {string} params.calibre - Calibre del conductor
 * @param {string} params.material - Material (cobre, aluminio)
 * @param {number} params.aislamiento - Temperatura de aislamiento (60, 75, 90)
 * @param {number} params.tempAmbiente - Temperatura ambiente (°C)
 * @param {number} params.nConductores - Número de conductores agrupados
 * @param {number} params.paralelos - Número de conductores en paralelo
 * @param {number} params.tempTerminal - Temperatura de terminal (60, 75, 90)
 * @returns {Object} Resultado de ampacidad
 */
function ampacidadNOM(params) {
  const calibre = String(params.calibre); // Normalizar a string
  const material = params.material || "cobre";
  const aislamiento = params.aislamiento || 75;
  const tempAmbiente = params.tempAmbiente || 30;
  const nConductores = params.nConductores || 3;
  const paralelos = params.paralelos || 1;
  const tempTerminal = params.tempTerminal || 75;
  
  // Validar paralelos
  if (paralelos <= 0) {
    throw new Error("Paralelos debe ser >= 1: " + paralelos);
  }
  
  // Obtener ampacidad base de tabla NOM
  const base = CONDUCTORES_NOM[material]?.[calibre]?.[aislamiento];
  
  if (!base) {
    throw new Error(`Calibre no válido: ${calibre} (material: ${material}, aislamiento: ${aislamiento})`);
  }
  
  // Calcular factores de corrección
  const F_temp = factorTemperatura(tempAmbiente, aislamiento);
  const F_agrup = factorAgrupamiento(nConductores);
  
  // Validar factores
  if (F_temp <= 0) {
    throw new Error("Factor de temperatura inválido: " + F_temp);
  }
  
  if (F_agrup <= 0) {
    throw new Error("Factor de agrupamiento inválido: " + F_agrup);
  }
  
  // Calcular ampacidad corregida
  const I_corregida = base * F_temp * F_agrup * paralelos;
  
  // Validación crítica
  if (I_corregida <= 0) {
    throw new Error("Ampacidad inválida: I_corregida = " + I_corregida);
  }
  
  // Aplicar límite de terminal
  const base75 = CONDUCTORES_NOM[material]?.[calibre]?.[75] || base;
  const I_final = aplicarLimiteTerminal(I_corregida, tempTerminal, base75);
  
  return {
    I_base: base,
    I_base75: base75,
    I_corregida: I_corregida,
    I_final: I_final,
    F_temp: F_temp,
    F_agrup: F_agrup,
    paralelos: paralelos,
    violacionTerminal: I_corregida > I_final
  };
}

/**
 * Validar cumplimiento con carga continua (NOM 210/215)
 * @param {number} I_ampacidad - Ampacidad del conductor
 * @param {number} I_carga - Corriente de carga
 * @param {boolean} esContinua - Si la carga es continua
 * @returns {Object} { cumple, I_diseño, margen }
 */
function validarCargaContinua(I_ampacidad, I_carga, esContinua) {
  const Fcc = esContinua ? 1.25 : 1.0;
  const I_diseño = I_carga * Fcc;
  const margen = I_ampacidad - I_diseño;
  
  return {
    cumple: I_ampacidad >= I_diseño,
    I_diseño: I_diseño,
    margen: margen,
    deficit: Math.max(0, I_diseño - I_ampacidad),
    porcentajeMargen: I_diseño > 0 ? (margen / I_diseño * 100) : 0
  };
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONDUCTORES_NOM: CONDUCTORES_NOM,
    factorTemperatura: factorTemperatura,
    factorAgrupamiento: factorAgrupamiento,
    aplicarLimiteTerminal: aplicarLimiteTerminal,
    ampacidadNOM: ampacidadNOM,
    validarCargaContinua: validarCargaContinua
  };
}

if (typeof window !== 'undefined') {
  window.CONDUCTORES_NOM = CONDUCTORES_NOM;
  window.factorTemperatura = factorTemperatura;
  window.factorAgrupamiento = factorAgrupamiento;
  window.aplicarLimiteTerminal = aplicarLimiteTerminal;
  window.ampacidadNOM = ampacidadNOM;
  window.validarCargaContinua = validarCargaContinua;
}
