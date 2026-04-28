/**
 * Impedance calculation utilities for IEC 60909
 * Handles series/parallel combinations, magnitude, phase angle
 */

/**
 * Add impedances in series
 * @param {Object} Z1 - First impedance {R, X}
 * @param {Object} Z2 - Second impedance {R, X}
 * @returns {Object} Summed impedance {R, X}
 */
function sumarImpedancias(Z1, Z2) {
  return {
    R: (Z1.R || 0) + (Z2.R || 0),
    X: (Z1.X || 0) + (Z2.X || 0)
  };
}

/**
 * Add multiple impedances in series
 * @param {Array} impedancias - Array of impedances
 * @returns {Object} Summed impedance {R, X}
 */
function sumarImpedanciasArray(impedancias) {
  return impedancias.reduce((total, Z) => sumarImpedancias(total, Z), { R: 0, X: 0 });
}

/**
 * Calculate impedance magnitude
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Magnitude |Z|
 */
function magnitud(Z) {
  return Math.sqrt((Z.R || 0) ** 2 + (Z.X || 0) ** 2);
}

/**
 * Calculate impedance phase angle
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Phase angle in radians
 */
function anguloFase(Z) {
  return Math.atan2(Z.X || 0, Z.R || 0);
}

/**
 * Calculate phase angle in degrees
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} Phase angle in degrees
 */
function anguloFaseGrados(Z) {
  return (anguloFase(Z) * 180) / Math.PI;
}

/**
 * Calculate X/R ratio
 * @param {Object} Z - Impedance {R, X}
 * @returns {number} X/R ratio
 */
function ratioXR(Z) {
  if (Z.R === 0) return Infinity;
  return (Z.X || 0) / Z.R;
}

/**
 * Convert impedance to per-unit
 * @param {Object} Z - Impedance {R, X}
 * @param {number} Zbase - Base impedance
 * @returns {Object} Per-unit impedance {R, X}
 */
function aPerUnit(Z, Zbase) {
  return {
    R: (Z.R || 0) / Zbase,
    X: (Z.X || 0) / Zbase
  };
}

/**
 * Convert per-unit impedance to actual
 * @param {Object} Zpu - Per-unit impedance {R, X}
 * @param {number} Zbase - Base impedance
 * @returns {Object} Actual impedance {R, X}
 */
function dePerUnit(Zpu, Zbase) {
  return {
    R: (Zpu.R || 0) * Zbase,
    X: (Zpu.X || 0) * Zbase
  };
}

/**
 * Calculate base impedance
 * @param {number} V - Base voltage (V)
 * @param {number} S - Base power (VA)
 * @returns {number} Base impedance (Ω)
 */
function impedanciaBase(V, S) {
  return (V * V) / S;
}

/**
 * Combine impedances in parallel
 * @param {Array} impedancias - Array of impedances
 * @returns {Object} Parallel impedance {R, X}
 */
function impedanciaParalelo(impedancias) {
  if (impedancias.length === 0) return { R: 0, X: 0 };
  if (impedancias.length === 1) return impedancias[0];

  // Convert to admittances
  const admitancias = impedancias.map(Z => {
    const Z2 = (Z.R || 0) ** 2 + (Z.X || 0) ** 2;
    return {
      G: (Z.R || 0) / Z2,
      B: -(Z.X || 0) / Z2
    };
  });

  // Sum admittances
  const Gtotal = admitancias.reduce((sum, Y) => sum + Y.G, 0);
  const Btotal = admitancias.reduce((sum, Y) => sum + Y.B, 0);

  // Convert back to impedance
  const Y2 = Gtotal ** 2 + Btotal ** 2;
  return {
    R: Gtotal / Y2,
    X: -Btotal / Y2
  };
}

module.exports = {
  sumarImpedancias,
  sumarImpedanciasArray,
  magnitud,
  anguloFase,
  anguloFaseGrados,
  ratioXR,
  aPerUnit,
  dePerUnit,
  impedanciaBase,
  impedanciaParalelo
};
