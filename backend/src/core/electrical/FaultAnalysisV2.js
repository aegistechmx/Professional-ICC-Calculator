/**
 * FaultAnalysisV2 - IEC fault analysis using symmetrical components
 * Industrial-grade fault calculation with Zbus from Ybus inversion
 */

const math = require('mathjs');
const { Complex } = require('./Complex');

/**
 * Build Zbus matrix from Ybus (inverse of Ybus)
 * Zbus = Ybus^-1
 * Uses proper complex matrix inversion via 2x2 block method
 * @param {Complex[][]} Y - Ybus matrix
 * @returns {Complex[][]} Zbus matrix
 */
function buildZbus(Y) {
  const n = Y.length;
  
  // Convert Complex matrix to 2x2 block real matrix representation
  // For complex matrix A = G + jB, represent as [G  -B; B   G]
  const blockMatrix = Array.from({ length: 2 * n }, () => Array(2 * n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const G = Y[i][j].re;
      const B = Y[i][j].im;
      
      // Upper-left block: G
      blockMatrix[i][j] = G;
      // Upper-right block: -B
      blockMatrix[i][n + j] = -B;
      // Lower-left block: B
      blockMatrix[n + i][j] = B;
      // Lower-right block: G
      blockMatrix[n + i][n + j] = G;
    }
  }
  
  try {
    // Invert the 2x2 block matrix
    const blockInv = math.inv(blockMatrix);
    
    // Convert back to Complex matrix
    const Z = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => new Complex(0, 0))
    );
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Extract real and imaginary parts from block matrix
        Z[i][j].re = blockInv[i][j];
        Z[i][j].im = blockInv[i][n + j];
      }
    }
    
    return Z;
  } catch (error) {
    // Fallback to diagonal approximation if inversion fails
    const Z = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => new Complex(0, 0))
    );
    
    for (let i = 0; i < n; i++) {
      const Y_ii = Y[i][i];
      const mag = Y_ii.abs();
      if (mag > 0) {
        Z[i][i] = new Complex(
          Y_ii.re / (mag * mag),
          -Y_ii.im / (mag * mag)
        );
      }
    }
    
    return Z;
  }
}

/**
 * Build sequence Zbus matrices for fault analysis
 * @param {Object} YbusResult - { Y0, Y1, Y2 } from buildSequenceYbus
 * @returns {Object} { Z0, Z1, Z2 }
 */
function buildSequenceZbus(YbusResult) {
  const Z1 = buildZbus(YbusResult.Y1.Y);
  const Z2 = buildZbus(YbusResult.Y2.Y);
  const Z0 = buildZbus(YbusResult.Y0.Y);
  
  return { Z0, Z1, Z2 };
}

/**
 * Three-phase fault (balanced fault)
 * Only positive sequence network involved
 * @param {number} busIndex - Fault bus index
 * @param {Complex[][]} Z1 - Positive sequence Zbus
 * @param {number} Vprefault - Pre-fault voltage (pu)
 * @returns {Object} Fault results
 */
function fault3P(busIndex, Z1, Vprefault = 1.0) {
  const Zth = Z1[busIndex][busIndex];
  const Zth_mag = Zth.abs();
  
  const If = Vprefault / Zth_mag;
  
  return {
    faultType: '3P',
    busIndex,
    If_pu: If,
    Zth,
    Zth_mag,
    sequenceCurrents: {
      I1: new Complex(If, 0),
      I2: new Complex(0, 0),
      I0: new Complex(0, 0)
    },
    phaseCurrents: {
      Ia: new Complex(If, 0),
      Ib: new Complex(-If / 2, -If * Math.sqrt(3) / 2),
      Ic: new Complex(-If / 2, If * Math.sqrt(3) / 2)
    }
  };
}

/**
 * Line-to-ground fault (single-phase to ground)
 * All three sequence networks in series
 * @param {number} busIndex - Fault bus index
 * @param {Complex[][]} Z1 - Positive sequence Zbus
 * @param {Complex[][]} Z2 - Negative sequence Zbus
 * @param {Complex[][]} Z0 - Zero sequence Zbus
 * @param {number} Vprefault - Pre-fault voltage (pu)
 * @param {number} Zf - Fault impedance (pu)
 * @param {number} Zg - Ground impedance (pu)
 * @returns {Object} Fault results
 */
function faultLG(busIndex, Z1, Z2, Z0, Vprefault = 1.0, Zf = 0, Zg = 0) {
  const Z1th = Z1[busIndex][busIndex];
  const Z2th = Z2[busIndex][busIndex];
  const Z0th = Z0[busIndex][busIndex];
  
  // Total impedance: Z1 + Z2 + Z0 + 3*Zg
  const Z_total = Z1th.add(Z2th).add(Z0th).add(new Complex(3 * Zg, 0));
  
  const I1 = new Complex(Vprefault, 0).div(Z_total);
  const I0 = I1; // All sequences equal for LG fault
  const I2 = I1;
  
  // Convert to phase currents
  const a = new Complex(-0.5, Math.sqrt(3) / 2);
  const a2 = new Complex(-0.5, -Math.sqrt(3) / 2);
  
  const Ia = I1.add(I2).add(I0);
  const Ib = I0.add(I1.mul(a2)).add(I2.mul(a));
  const Ic = I0.add(I1.mul(a)).add(I2.mul(a2));
  
  return {
    faultType: 'LG',
    busIndex,
    If_pu: Ia.abs(),
    Z_total,
    sequenceCurrents: { I1, I2, I0 },
    phaseCurrents: { Ia, Ib, Ic }
  };
}

/**
 * Line-to-line fault (phase-to-phase)
 * Positive and negative sequence networks in parallel
 * @param {number} busIndex - Fault bus index
 * @param {Complex[][]} Z1 - Positive sequence Zbus
 * @param {Complex[][]} Z2 - Negative sequence Zbus
 * @param {number} Vprefault - Pre-fault voltage (pu)
 * @param {number} Zf - Fault impedance (pu)
 * @returns {Object} Fault results
 */
function faultLL(busIndex, Z1, Z2, Vprefault = 1.0, Zf = 0) {
  const Z1th = Z1[busIndex][busIndex];
  const Z2th = Z2[busIndex][busIndex];
  
  // Total impedance: Z1 + Z2 + 2*Zf
  const Z_total = Z1th.add(Z2th).add(new Complex(2 * Zf, 0));
  
  const I1 = new Complex(Vprefault, 0).div(Z_total);
  const I2 = I1.neg();
  const I0 = new Complex(0, 0);
  
  // Convert to phase currents
  const a = new Complex(-0.5, Math.sqrt(3) / 2);
  const a2 = new Complex(-0.5, -Math.sqrt(3) / 2);
  
  const Ia = I1.add(I2).add(I0);
  const Ib = I0.add(I1.mul(a2)).add(I2.mul(a));
  const Ic = I0.add(I1.mul(a)).add(I2.mul(a2));
  
  return {
    faultType: 'LL',
    busIndex,
    If_pu: Ib.sub(Ic).abs() / Math.sqrt(3),
    Z_total,
    sequenceCurrents: { I1, I2, I0 },
    phaseCurrents: { Ia, Ib, Ic }
  };
}

/**
 * Double line-to-ground fault
 * All three sequence networks involved
 * @param {number} busIndex - Fault bus index
 * @param {Complex[][]} Z1 - Positive sequence Zbus
 * @param {Complex[][]} Z2 - Negative sequence Zbus
 * @param {Complex[][]} Z0 - Zero sequence Zbus
 * @param {number} Vprefault - Pre-fault voltage (pu)
 * @param {number} Zf - Fault impedance (pu)
 * @param {number} Zg - Ground impedance (pu)
 * @returns {Object} Fault results
 */
function faultLLG(busIndex, Z1, Z2, Z0, Vprefault = 1.0, Zf = 0, Zg = 0) {
  const Z1th = Z1[busIndex][busIndex];
  const Z2th = Z2[busIndex][busIndex];
  const Z0th = Z0[busIndex][busIndex];
  
  // Parallel combination of Z2 and Z0 (with impedances)
  const Z2_plus = Z2th.add(new Complex(Zf, 0));
  const Z0_plus = Z0th.add(new Complex(Zf + 3 * Zg, 0));
  
  const Z_parallel = Z2_plus.mul(Z0_plus).div(Z2_plus.add(Z0_plus));
  const Z_total = Z1th.add(Z_parallel);
  
  const I1 = new Complex(Vprefault, 0).div(Z_total);
  const I2 = I1.mul(Z_parallel).div(Z2_plus).neg();
  const I0 = I1.mul(Z_parallel).div(Z0_plus).neg();
  
  // Convert to phase currents
  const a = new Complex(-0.5, Math.sqrt(3) / 2);
  const a2 = new Complex(-0.5, -Math.sqrt(3) / 2);
  
  const Ia = I1.add(I2).add(I0);
  const Ib = I0.add(I1.mul(a2)).add(I2.mul(a));
  const Ic = I0.add(I1.mul(a)).add(I2.mul(a2));
  
  return {
    faultType: 'LLG',
    busIndex,
    If_pu: Ia.abs(),
    Z_total,
    sequenceCurrents: { I1, I2, I0 },
    phaseCurrents: { Ia, Ib, Ic }
  };
}

/**
 * Generic fault analysis function
 * @param {string} faultType - '3P', 'LG', 'LL', 'LLG'
 * @param {number} busIndex - Fault bus index
 * @param {Object} Zbus - { Z0, Z1, Z2 }
 * @param {Object} options - { Vprefault, Zf, Zg }
 * @returns {Object} Fault results
 */
function analyzeFault(faultType, busIndex, Zbus, options = {}) {
  const { Vprefault = 1.0, Zf = 0, Zg = 0 } = options;
  const { Z0, Z1, Z2 } = Zbus;
  
  switch (faultType) {
  case '3P':
    return fault3P(busIndex, Z1, Vprefault);
  case 'LG':
    return faultLG(busIndex, Z1, Z2, Z0, Vprefault, Zf, Zg);
  case 'LL':
    return faultLL(busIndex, Z1, Z2, Vprefault, Zf);
  case 'LLG':
    return faultLLG(busIndex, Z1, Z2, Z0, Vprefault, Zf, Zg);
  default:
    throw new Error(`Unknown fault type: ${faultType}`);
  }
}

/**
 * Fault scan - calculate faults at all buses
 * @param {Object} Zbus - { Z0, Z1, Z2 }
 * @param {string} faultType - Type of fault to analyze
 * @param {Object} options - Fault options
 * @returns {Array} Array of fault results for each bus
 */
function faultScan(Zbus, faultType, options = {}) {
  const { Z1 } = Zbus;
  const n = Z1.length;
  const results = [];
  
  for (let i = 0; i < n; i++) {
    try {
      const result = analyzeFault(faultType, i, Zbus, options);
      results.push({
        busIndex: i,
        ...result
      });
    } catch (error) {
      console.error(`Error calculating fault at bus ${i}:`, error.message);
    }
  }
  
  return results;
}

module.exports = {
  buildZbus,
  buildSequenceZbus,
  fault3P,
  faultLG,
  faultLL,
  faultLLG,
  analyzeFault,
  faultScan
};
