/**
 * ANSI/IEEE Short-Circuit Calculation Compatibility
 * Implements X/R ratio calculations and asymmetrical current factors
 */

const { ratioXR } = require('./impedancia');

/**
 * Calculate asymmetrical current factor (DC offset)
 * According to ANSI/IEEE C37.010
 * @param {number} XR - X/R ratio
 * @returns {number} DC offset factor
 */
function factorDCOffset(XR) {
  if (XR === 0) return 1;
  return 1 + Math.exp(-Math.PI / XR);
}

/**
 * Calculate asymmetrical short-circuit current
 * I_asym = I_sym * (1 + exp(-π/XR))
 * @param {number} Ik - Symmetrical RMS current
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Asymmetrical current
 */
function calcularCorrienteAsimetrica(Ik, Z) {
  const XR = ratioXR(Z);
  const factor = factorDCOffset(XR);
  return Ik * factor;
}

/**
 * Calculate peak current with DC offset
 * I_peak = √2 * I_sym * (1 + exp(-π/XR))
 * @param {number} Ik - Symmetrical RMS current
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Peak current with DC offset
 */
function calcularPicoConDC(Ik, Z) {
  const XR = ratioXR(Z);
  const factor = factorDCOffset(XR);
  return Math.sqrt(2) * Ik * factor;
}

/**
 * Calculate momentary current (close-and-latch rating)
 * I_momentary = I_peak * 0.9 (typical)
 * @param {number} Ipeak - Peak current
 * @returns {number} Momentary current
 */
function calcularCorrienteMomentanea(Ipeak) {
  return Ipeak * 0.9;
}

/**
 * Calculate interrupting current
 * I_interrupting = I_sym * factor
 * Factor depends on X/R ratio and time
 * @param {number} Ik - Symmetrical RMS current
 * @param {Object} Z - Impedance {R, X}
 * @param {number} [ciclos=5] - Number of cycles (typically 3-5)
 * @returns {number} Interrupting current
 */
function calcularCorrienteInterrupcion(Ik, Z, ciclos = 5) {
  const XR = ratioXR(Z);
  // Simplified factor based on cycles and X/R
  const factor = 1.0 + (0.1 * ciclos) / (1 + XR / 10);
  return Ik * factor;
}

/**
 * Convert IEC to ANSI calculation
 * IEC uses voltage factor c, ANSI uses different approach
 * @param {number} Ik_IEC - IEC calculated current
 * @param {Object} Z - Impedance {R, X}
 * @returns {Object} ANSI-compatible results
 */
function convertirIECaANSI(Ik_IEC, Z) {
  const Ik_sym = Ik_IEC; // Symmetrical current
  const I_asym = calcularCorrienteAsimetrica(Ik_sym, Z);
  const I_peak = calcularPicoConDC(Ik_sym, Z);
  const I_momentary = calcularCorrienteMomentanea(I_peak);
  const I_interrupting = calcularCorrienteInterrupcion(Ik_sym, Z);

  return {
    Ik_sym, // Symmetrical RMS
    I_asym, // Asymmetrical RMS
    I_peak, // Peak current
    I_momentary, // Momentary current
    I_interrupting, // Interrupting current
    XR: ratioXR(Z) // X/R ratio
  };
}

/**
 * Calculate X/R ratio from R and X
 * @param {number} R - Resistance
 * @param {number} X - Reactance
 * @returns {number} X/R ratio
 */
function calcularXR(R, X) {
  if (R === 0) return Infinity;
  return X / R;
}

/**
 * Estimate DC decay time constant
 * τ = X / (ω * R)
 * @param {Object} Z - Impedance {R, X}
 * @param {number} [f=60] - Frequency (Hz)
 * @returns {number} Time constant (seconds)
 */
function calcularConstanteTiempo(Z, f = 60) {
  const omega = 2 * Math.PI * f;
  const XR = ratioXR(Z);
  // τ = (X/R) / ω
  return XR / omega;
}

module.exports = {
  factorDCOffset,
  calcularCorrienteAsimetrica,
  calcularPicoConDC,
  calcularCorrienteMomentanea,
  calcularCorrienteInterrupcion,
  convertirIECaANSI,
  calcularXR,
  calcularConstanteTiempo
};
