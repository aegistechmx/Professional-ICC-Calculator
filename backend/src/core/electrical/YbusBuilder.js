/**
 * YbusBuilder - Build admittance matrix for power system analysis
 * 
 * The Ybus matrix is fundamental for:
 * - Load flow analysis
 * - Short circuit studies
 * - Power system stability analysis
 * 
 * Y = G + jB where:
 * - G: Conductance matrix (real part)
 * - B: Susceptance matrix (imaginary part)
 */

/**
 * Build Ybus matrix from electrical system
 * @param {ElectricalSystem} system - Electrical system
 * @returns {Object} { Y: Complex matrix, G: Real matrix, B: Imaginary matrix, busMap }
 */
function buildYbus(system) {
  const n = system.buses.length;
  const busMap = {};
  
  // Create bus index map
  system.buses.forEach((bus, index) => {
    busMap[bus.id] = index;
  });
  
  // Initialize Ybus matrix (n x n complex matrix)
  const Y = Array(n).fill(null).map(() => Array(n).fill({ re: 0, im: 0 }));
  
  // Add shunt admittances from buses
  system.buses.forEach((bus, i) => {
    Y[i][i].re += bus.shunt.G;
    Y[i][i].im += bus.shunt.B;
  });
  
  // Add line admittances
  system.lines.forEach(line => {
    const i = busMap[line.fromBus];
    const j = busMap[line.toBus];
    
    if (i === undefined || j === undefined) return;
    
    // Series admittance
    const z = { re: line.r, im: line.x };
    const y_series = { 
      re: z.re / (z.re * z.re + z.im * z.im),
      im: -z.im / (z.re * z.re + z.im * z.im)
    };
    
    // Line charging (shunt susceptance)
    const y_shunt = { re: 0, im: line.b / 2 };
    
    // Diagonal elements (self-admittance)
    Y[i][i].re += y_series.re;
    Y[i][i].im += y_series.im + y_shunt.im;
    Y[j][j].re += y_series.re;
    Y[j][j].im += y_series.im + y_shunt.im;
    
    // Off-diagonal elements (mutual admittance)
    Y[i][j].re -= y_series.re;
    Y[i][j].im -= y_series.im;
    Y[j][i].re -= y_series.re;
    Y[j][i].im -= y_series.im;
  });
  
  // Add transformer admittances
  system.transformers.forEach(tr => {
    const i = busMap[tr.fromBus];
    const j = busMap[tr.toBus];
    
    if (i === undefined || j === undefined) return;
    
    // Transformer equivalent circuit
    const z = { re: tr.r, im: tr.x };
    const y_series = { 
      re: z.re / (z.re * z.re + z.im * z.im),
      im: -z.im / (z.re * z.re + z.im * z.im)
    };
    
    // Tap ratio
    const tap = tr.tapRatio;
    const a = 1 / tap;
    
    // Diagonal elements
    Y[i][i].re += y_series.re;
    Y[i][i].im += y_series.im;
    Y[j][j].re += y_series.re * a * a;
    Y[j][j].im += y_series.im * a * a;
    
    // Off-diagonal elements
    Y[i][j].re -= y_series.re * a;
    Y[i][j].im -= y_series.im * a;
    Y[j][i].re -= y_series.re * a;
    Y[j][i].im -= y_series.im * a;
  });
  
  // Separate into G and B matrices
  const G = Array(n).fill(null).map(() => Array(n).fill(0));
  const B = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      G[i][j] = Y[i][j].re;
      B[i][j] = Y[i][j].im;
    }
  }
  
  return {
    Y,
    G,
    B,
    busMap,
    size: n
  };
}

/**
 * Build sequence admittance matrices for symmetrical components
 * @param {ElectricalSystem} system - Electrical system
 * @returns {Object} { Y0, Y1, Y2 } - Zero, positive, negative sequence matrices
 */
function buildSequenceYbus(system) {
  // Positive sequence (same as Ybus for balanced systems)
  const Y1 = buildYbus(system);
  
  // Zero sequence (depends on transformer connections)
  const Y0 = buildZeroSequenceYbus(system);
  
  // Negative sequence (same as positive for static components)
  const Y2 = { ...Y1 };
  
  return {
    Y0,
    Y1,
    Y2
  };
}

/**
 * Build zero sequence admittance matrix
 * Zero sequence depends on transformer grounding and connections
 */
function buildZeroSequenceYbus(system) {
  const n = system.buses.length;
  const busMap = {};
  
  system.buses.forEach((bus, index) => {
    busMap[bus.id] = index;
  });
  
  const Y0 = Array(n).fill(null).map(() => Array(n).fill({ re: 0, im: 0 }));
  
  // Zero sequence is different based on transformer connections
  system.transformers.forEach(tr => {
    const i = busMap[tr.fromBus];
    const j = busMap[tr.toBus];
    
    if (i === undefined || j === undefined) return;
    
    // Zero sequence impedance (typically 3x positive for some transformers)
    const z0 = { re: tr.r * 3, im: tr.x0 || tr.x * 3 };
    const y0_series = { 
      re: z0.re / (z0.re * z0.re + z0.im * z0.im),
      im: -z0.im / (z0.re * z0.re + z0.im * z0.im)
    };
    
    // Zero sequence path depends on grounding
    if (tr.grounding === 'yg_solido' || tr.grounding === 'yg_resistivo') {
      // Zero sequence can flow through grounded Y-Y
      Y0[i][i].re += y0_series.re;
      Y0[i][i].im += y0_series.im;
      Y0[j][j].re += y0_series.re;
      Y0[j][j].im += y0_series.im;
      
      Y0[i][j].re -= y0_series.re;
      Y0[i][j].im -= y0_series.im;
      Y0[j][i].re -= y0_series.re;
      Y0[j][i].im -= y0_series.im;
    }
    // Delta blocks zero sequence
  });
  
  // Lines have zero sequence too (typically 3x positive)
  system.lines.forEach(line => {
    const i = busMap[line.fromBus];
    const j = busMap[line.toBus];
    
    if (i === undefined || j === undefined) return;
    
    const z0 = { re: line.r * 3, im: line.x * 3 };
    const y0_series = { 
      re: z0.re / (z0.re * z0.re + z0.im * z0.im),
      im: -z0.im / (z0.re * z0.re + z0.im * z0.im)
    };
    
    Y0[i][i].re += y0_series.re;
    Y0[i][i].im += y0_series.im;
    Y0[j][j].re += y0_series.re;
    Y0[j][j].im += y0_series.im;
    
    Y0[i][j].re -= y0_series.re;
    Y0[i][j].im -= y0_series.im;
    Y0[j][i].re -= y0_series.re;
    Y0[j][i].im -= y0_series.im;
  });
  
  return {
    Y: Y0,
    G: Y0.map(row => row.map(val => val.re)),
    B: Y0.map(row => row.map(val => val.im)),
    busMap,
    size: n
  };
}

/**
 * Calculate power flow from voltages and Ybus
 * @param {Array} V - Voltage vector (complex)
 * @param {Array} Y - Admittance matrix
 * @returns {Object} { P, Q } - Power injection vectors
 */
function calculatePowerFlow(V, Y) {
  const n = V.length;
  const P = Array(n).fill(0);
  const Q = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const Vi = V[i];
      const Vj = V[j];
      const Yij = Y[i][j];
      
      // Voltage magnitudes and angle difference
      const Vi_mag = Math.sqrt(Vi.re * Vi.re + Vi.im * Vi.im);
      const Vj_mag = Math.sqrt(Vj.re * Vj.re + Vj.im * Vj.im);
      const theta_i = Math.atan2(Vi.im, Vi.re);
      const theta_j = Math.atan2(Vj.im, Vj.re);
      const theta_ij = theta_i - theta_j;
      
      // Power flow equations
      P[i] += Vi_mag * Vj_mag * (Yij.re * Math.cos(theta_ij) + Yij.im * Math.sin(theta_ij));
      Q[i] += Vi_mag * Vj_mag * (Yij.re * Math.sin(theta_ij) - Yij.im * Math.cos(theta_ij));
    }
  }
  
  return { P, Q };
}

module.exports = {
  buildYbus,
  buildSequenceYbus,
  buildZeroSequenceYbus,
  calculatePowerFlow
};
