/**
 * IEC 60909 Short-Circuit Calculation
 * Implements IEC 60909-0 standard for initial short-circuit current
 */

const { magnitud, ratioXR } = require('./impedancia');

/**
 * Calculate initial short-circuit current according to IEC 60909
 * Ik" = (c * Un) / (√3 * Zk)
 * @param {Object} params - Calculation parameters
 * @param {number} params.V - Nominal voltage (V)
 * @param {Object} params.Zeq - Equivalent impedance {R, X}
 * @param {number} [params.c=1.05] - Voltage factor c
 * @returns {number} Initial short-circuit current Ik" (A)
 */
function calcularICC({ V, Zeq, c = 1.05 }) {
  const Z = magnitud(Zeq);
  const Ik = (c * V) / (Math.sqrt(3) * Z);
  return Ik;
}

/**
 * Calculate voltage factor c according to IEC 60909
 * @param {number} V - Nominal voltage (V)
 * @param {string} tipo - Type of calculation ('max' or 'min')
 * @returns {number} Voltage factor c
 */
function factorC(V, tipo = 'max') {
  // IEC 60909 voltage factors
  if (tipo === 'max') {
    if (V >= 1000) return 1.10;
    return 1.05;
  } else {
    if (V >= 1000) return 1.00;
    return 0.95;
  }
}

/**
 * Calculate peak short-circuit current ip
 * ip = κ * √2 * Ik"
 * @param {number} Ik - Initial short-circuit current
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Peak short-circuit current
 */
function calcularIp(Ik, Z) {
  const XR = ratioXR(Z);
  // κ factor from IEC 60909
  const kappa = 1.02 + 0.98 * Math.exp(-3 * XR);
  const ip = kappa * Math.sqrt(2) * Ik;
  return ip;
}

/**
 * Calculate steady-state short-circuit current Ik
 * For radial systems, Ik ≈ Ik"
 * @param {number} Ik - Initial short-circuit current
 * @returns {number} Steady-state short-circuit current
 */
function calcularIkSteady(Ik) {
  // Simplified: for radial systems, steady-state ≈ initial
  return Ik;
}

/**
 * Calculate short-circuit power
 * Sk = √3 * Un * Ik
 * @param {number} V - Nominal voltage (V)
 * @param {number} Ik - Short-circuit current (A)
 * @returns {number} Short-circuit power (VA)
 */
function calcularPotenciaCortocircuito(V, Ik) {
  return Math.sqrt(3) * V * Ik;
}

/**
 * Calculate three-phase short-circuit
 * @param {Object} params - Parameters
 * @param {number} params.V - Voltage (V)
 * @param {Object} params.Zeq - Equivalent impedance
 * @param {string} [params.tipo='max'] - 'max' or 'min'
 * @returns {Object} Complete short-circuit results
 */
function calcularCortocircuitoTrifasico({ V, Zeq, tipo = 'max' }) {
  const c = factorC(V, tipo);
  const Ik = calcularICC({ V, Zeq, c });
  const ip = calcularIp(Ik, Zeq);
  const IkSteady = calcularIkSteady(Ik);
  const Sk = calcularPotenciaCortocircuito(V, Ik);

  return {
    Ik, // Initial short-circuit current
    ip, // Peak short-circuit current
    IkSteady, // Steady-state short-circuit current
    Sk, // Short-circuit power
    c, // Voltage factor used
    Z: magnitud(Zeq) // Total impedance magnitude
  };
}

/**
 * Calculate single-phase short-circuit (phase-to-earth)
 * Ik1 = (c * Un) / (√3 * (Z1 + Z2 + Z0))
 * Simplified: Z1 ≈ Z2 ≈ Z0
 * @param {Object} params - Parameters
 * @param {number} params.V - Voltage (V)
 * @param {Object} params.Z1 - Positive sequence impedance
 * @param {Object} params.Z0 - Zero sequence impedance
 * @param {string} [params.tipo='max'] - 'max' or 'min'
 * @returns {number} Single-phase short-circuit current
 */
function calcularCortocircuitoMonofasico({ V, Z1, Z0, tipo = 'max' }) {
  const c = factorC(V, tipo);
  // Simplified: Z2 ≈ Z1
  const Ztotal = {
    R: (Z1.R || 0) * 2 + (Z0.R || 0),
    X: (Z1.X || 0) * 2 + (Z0.X || 0)
  };
  const Ik1 = (c * V) / (Math.sqrt(3) * magnitud(Ztotal));
  return Ik1;
}

module.exports = {
  calcularICC,
  factorC,
  calcularIp,
  calcularIkSteady,
  calcularPotenciaCortocircuito,
  calcularCortocircuitoTrifasico,
  calcularCortocircuitoMonofasico
};
