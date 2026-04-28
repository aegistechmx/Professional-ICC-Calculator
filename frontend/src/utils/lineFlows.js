/**
 * Line flow calculation utilities
 * Calculates power flow through branches using complex numbers
 * Also calculates actual currents in kA
 */

/**
 * Convert polar coordinates to rectangular (complex)
 * @param {number} V - Voltage magnitude
 * @param {number} theta - Voltage angle (radians)
 * @returns {Object} Complex number { re, im }
 */
function polarToRect(V, theta) {
  return {
    re: V * Math.cos(theta),
    im: V * Math.sin(theta)
  };
}

/**
 * Multiply two complex numbers
 * @param {Object} a - First complex number
 * @param {Object} b - Second complex number
 * @returns {Object} Complex product
 */
function multiplyComplex(a, b) {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

/**
 * Subtract two complex numbers
 * @param {Object} a - First complex number
 * @param {Object} b - Second complex number
 * @returns {Object} Complex difference
 */
function subtractComplex(a, b) {
  return {
    re: a.re - b.re,
    im: a.im - b.im
  };
}

/**
 * Complex conjugate
 * @param {Object} a - Complex number
 * @returns {Object} Complex conjugate
 */
function conjugateComplex(a) {
  return {
    re: a.re,
    im: -a.im
  };
}

/**
 * Calculate line flows
 * @param {Array} branches - Array of branch objects
 * @param {Array} Ybus - Admittance matrix (complex)
 * @param {Array} V - Voltage magnitudes (pu)
 * @param {Array} theta - Voltage angles (rad)
 * @param {Object} indexMap - Bus index map
 * @returns {Array} Array of flow results
 */
export function calcLineFlows(branches, Ybus, V, theta, indexMap) {
  const flows = [];
  
  for (const br of branches) {
    const i = indexMap[br.from];
    const j = indexMap[br.to];
    
    if (i === undefined || j === undefined) continue;
    
    const Vi = polarToRect(V[i], theta[i]);
    const Vj = polarToRect(V[j], theta[j]);
    
    const Y = Ybus[i][j]; // Complex admittance
    
    // Current flow: Iij = (Vi - Vj) * Yij
    const Iij = multiplyComplex(
      subtractComplex(Vi, Vj),
      Y
    );
    
    // Power flow: Sij = Vi * conj(Iij)
    const Sij = multiplyComplex(Vi, conjugateComplex(Iij));
    
    flows.push({
      from: br.from,
      to: br.to,
      P: Sij.re, // Active power (pu)
      Q: Sij.im, // Reactive power (pu)
      magnitude: Math.sqrt(Sij.re ** 2 + Sij.im ** 2), // Apparent power (pu)
      current: Math.sqrt(Iij.re ** 2 + Iij.im ** 2), // Current magnitude (pu)
      Iij // Complex current (pu)
    });
  }
  
  return flows;
}

/**
 * Calculate actual currents in kA from per-unit flows
 * Formula: Ibase = Sbase / (√3 × Vbase)
 * I_actual = I_pu × Ibase
 * 
 * @param {Array} flows - Line flows with current in pu
 * @param {Array} V - Voltage magnitudes (pu)
 * @param {Object} base - Base system { Sbase_MVA, Vbase_kV }
 * @param {Object} indexMap - Bus index map
 * @returns {Array} Flows with actual currents in kA
 */
export function calcCurrents(flows, V, base, indexMap) {
  return flows.map(f => {
    const busIndex = indexMap[f.from];
    const Vpu = V[busIndex];
    
    const Vbase_kV = base.Vbase_kV[f.from] || 13.8;
    const Ibase = base.Sbase_MVA / (Math.sqrt(3) * Vbase_kV); // kA
    
    const Spu = Math.sqrt(f.P ** 2 + f.Q ** 2);
    const Ipu = f.current;
    
    const IkA = Ipu * Ibase;
    
    return {
      ...f,
      IkA,
      Ibase_kA: Ibase
    };
  });
}

/**
 * Get flow color based on power magnitude
 * @param {number} S - Apparent power magnitude (pu)
 * @returns {string} CSS color code
 */
export function getFlowColor(S) {
  if (S < 0.5) return '#00cc00'; // Light load (green)
  if (S < 1.0) return '#ffcc00'; // Medium load (yellow)
  return '#ff0000'; // Heavy load (red)
}

/**
 * Get edge style based on flow
 * @param {number} magnitude - Flow magnitude
 * @returns {Object} ReactFlow edge style
 */
export function getFlowEdgeStyle(magnitude) {
  return {
    stroke: getFlowColor(magnitude),
    strokeWidth: 2 + Math.min(magnitude * 5, 6),
    strokeLinejoin: 'round',
    strokeLinecap: 'round'
  };
}
