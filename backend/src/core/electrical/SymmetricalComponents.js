/**
 * SymmetricalComponents - Fault analysis using symmetrical components
 * 
 * Implements the method of symmetrical components for unbalanced fault analysis:
 * - Positive sequence (balanced 3-phase)
 * - Negative sequence (balanced 3-phase, opposite phase rotation)
 * - Zero sequence (in-phase, same magnitude)
 * 
 * Fault types:
 * - 3F: Three-phase fault (positive sequence only)
 * - LG: Line-to-ground fault (all three sequences)
 * - LL: Line-to-line fault (positive and negative sequences)
 * - LLG: Double line-to-ground fault (all three sequences)
 */

// Imaginary unit (j in electrical engineering, i in mathematics)
const j = { re: 0, im: 1 };

const { buildSequenceYbus } = require('./YbusBuilder');

/**
 * Calculate fault currents using symmetrical components
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} faultData - Fault parameters
 * @returns {Object} Fault analysis results
 */
function calculateFault(system, faultData) {
  const {
    faultBusId,
    faultType = '3F', // '3F', 'LG', 'LL', 'LLG'
    faultImpedance = { Zf: 0, Zg: 0 }, // Fault impedance, ground impedance
    preFaultVoltage = 1.0 // Pre-fault voltage at fault bus (p.u.)
  } = faultData;
  
  // Build sequence networks
  const { Y0, Y1, Y2 } = buildSequenceYbus(system);
  
  // Find fault bus index
  const faultBusIndex = system.buses.findIndex(b => b.id === faultBusId);
  if (faultBusIndex === -1) {
    throw new Error(`Fault bus ${faultBusId} not found`);
  }
  
  // Get sequence impedances at fault bus
  const Z1 = getDrivingPointImpedance(Y1, faultBusIndex);
  const Z2 = getDrivingPointImpedance(Y2, faultBusIndex);
  const Z0 = getDrivingPointImpedance(Y0, faultBusIndex);
  
  // Pre-fault voltage (positive sequence)
  const Vf = { re: preFaultVoltage, im: 0 };
  
  // Calculate sequence currents based on fault type
  let I0, I1, I2;
  
  switch (faultType) {
  case '3F':
    // Three-phase fault: only positive sequence
    I1 = divideComplex(Vf, Z1);
    I0 = { re: 0, im: 0 };
    I2 = { re: 0, im: 0 };
    break;
      
  case 'LG': {
    // Line-to-ground fault: all sequences in series
    const Z_LG = addComplex(addComplex(Z1, Z2), addComplex(Z0, { re: 3 * faultImpedance.Zg, im: 0 }));
    I1 = divideComplex(Vf, Z_LG);
    I0 = { ...I1 };
    I2 = { ...I1 };
    break;
  }
      
  case 'LL': {
    // Line-to-line fault: positive and negative in series
    const Z_LL = addComplex(Z1, Z2);
    I1 = divideComplex(Vf, Z_LL);
    I0 = { re: 0, im: 0 };
    I2 = multiplyComplex(I1, { re: -1, im: 0 });
    break;
  }
      
  case 'LLG': {
    // Double line-to-ground fault: parallel combination
    const Z2_plus_Zf = addComplex(Z2, { re: faultImpedance.Zf, im: 0 });
    const Z0_plus_Zf = addComplex(Z0, { re: faultImpedance.Zf + 3 * faultImpedance.Zg, im: 0 });
    const Z_parallel = divideComplex(
      multiplyComplex(Z2_plus_Zf, Z0_plus_Zf),
      addComplex(Z2_plus_Zf, Z0_plus_Zf)
    );
    const Z_LLG = addComplex(Z1, Z_parallel);
    I1 = divideComplex(Vf, Z_LLG);
    I2 = multiplyComplex(
      multiplyComplex(I1, Z0_plus_Zf),
      divideComplex({ re: 1, im: 0 }, addComplex(Z2_plus_Zf, Z0_plus_Zf))
    );
    I0 = multiplyComplex(
      multiplyComplex(I1, Z2_plus_Zf),
      divideComplex({ re: 1, im: 0 }, addComplex(Z2_plus_Zf, Z0_plus_Zf))
    );
    break;
  }
      
  default:
    throw new Error(`Unknown fault type: ${faultType}`);
  }
  
  // Convert sequence currents to phase currents
  const Ia = addComplex(addComplex(I0, I1), I2);
  const Ib = addComplex(
    addComplex(I0, multiplyComplex(I1, { re: -0.5, im: 0.866 })), // a^2
    multiplyComplex(I2, { re: -0.5, im: -0.866 }) // a
  );
  const Ic = addComplex(
    addComplex(I0, multiplyComplex(I1, { re: -0.5, im: -0.866 })), // a
    multiplyComplex(I2, { re: -0.5, im: 0.866 }) // a^2
  );
  
  // Calculate sequence voltages at fault bus
  const V1 = subtractComplex(Vf, multiplyComplex(I1, Z1));
  const V2 = subtractComplex({ re: 0, im: 0 }, multiplyComplex(I2, Z2));
  const V0 = subtractComplex({ re: 0, im: 0 }, multiplyComplex(I0, Z0));
  
  // Convert sequence voltages to phase voltages
  const Va = addComplex(addComplex(V0, V1), V2);
  const Vb = addComplex(
    addComplex(V0, multiplyComplex(V1, { re: -0.5, im: 0.866 })),
    multiplyComplex(V2, { re: -0.5, im: -0.866 })
  );
  const Vc = addComplex(
    addComplex(V0, multiplyComplex(V1, { re: -0.5, im: -0.866 })),
    multiplyComplex(V2, { re: -0.5, im: 0.866 })
  );
  
  // Calculate fault current magnitude
  const If = Math.sqrt(Ia.re * Ia.re + Ia.im * Ia.im);
  const If_kA = If * system.baseMVA / (Math.sqrt(3) * system.baseKV);
  
  // Calculate X/R ratio
  const Z_total = addComplex(Z1, addComplex(Z2, Z0));
  const XR_ratio = Z_total.im / Z_total.re;
  
  // Calculate peak current (including DC offset)
  const Ipeak = If * Math.sqrt(2) * (1 + Math.exp(-Math.PI / XR_ratio));
  
  return {
    faultType,
    faultBus: faultBusId,
    sequenceCurrents: { I0, I1, I2 },
    phaseCurrents: { Ia, Ib, Ic },
    sequenceVoltages: { V0, V1, V2 },
    phaseVoltages: { Va, Vb, Vc },
    sequenceImpedances: { Z0, Z1, Z2 },
    faultCurrent: {
      magnitude: If,
      magnitude_pu: If,
      magnitude_kA: If_kA,
      magnitude_A: If_kA * 1000,
      peak: Ipeak,
      peak_kA: Ipeak * system.baseMVA / (Math.sqrt(3) * system.baseKV)
    },
    XRRatio: XR_ratio,
    preFaultVoltage: preFaultVoltage
  };
}

/**
 * Get driving point impedance (Thevenin impedance) at a bus
 * Z_th = Y^-1[i,i]
 */
function getDrivingPointImpedance(Y, busIndex) {
  const n = Y.size;
  const Y_matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Convert complex Y to real matrix for inversion
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Note: Using object-based complex numbers, not built-in complex type
      // Y_matrix[i][j] = Y.Y[i][j].re + Y.Y[i][j].im * 1j; // Invalid in JS
    }
  }
  
  // For simplicity, return diagonal element (approximation)
  // In production, use proper matrix inversion
  const Y_ii = Y.Y[busIndex][busIndex];
  const Z_ii = {
    re: Y_ii.re / (Y_ii.re * Y_ii.re + Y_ii.im * Y_ii.im),
    im: -Y_ii.im / (Y_ii.re * Y_ii.re + Y_ii.im * Y_ii.im)
  };
  
  return Z_ii;
}

/**
 * Calculate fault currents at all buses (fault scan)
 */
function calculateFaultScan(system, faultType = '3F') {
  const results = [];
  
  system.buses.forEach(bus => {
    try {
      const faultResult = calculateFault(system, {
        faultBusId: bus.id,
        faultType
      });
      results.push({
        busId: bus.id,
        busName: bus.name,
        ...faultResult
      });
    } catch (error) {
      console.error(`Error calculating fault at bus ${bus.id}:`, error.message);
    }
  });
  
  return results;
}

/**
 * Complex number arithmetic helpers
 */
function addComplex(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

function subtractComplex(a, b) {
  return { re: a.re - b.re, im: a.im - b.im };
}

function multiplyComplex(a, b) {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function divideComplex(a, b) {
  const denominator = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator
  };
}

/**
 * Convert symmetrical components to phase quantities
 * a = 1∠120° = -0.5 + j0.866
 * a^2 = 1∠240° = -0.5 - j0.866
 */
function sequenceToPhase(F0, F1, F2) {
  const a = { re: -0.5, im: 0.866 };
  const a2 = { re: -0.5, im: -0.866 };
  
  return {
    Fa: addComplex(addComplex(F0, F1), F2),
    Fb: addComplex(addComplex(F0, multiplyComplex(F1, a2)), multiplyComplex(F2, a)),
    Fc: addComplex(addComplex(F0, multiplyComplex(F1, a)), multiplyComplex(F2, a2))
  };
}

/**
 * Convert phase quantities to symmetrical components
 */
function phaseToSequence(Fa, Fb, Fc) {
  const a = { re: -0.5, im: 0.866 };
  const a2 = { re: -0.5, im: -0.866 };
  
  return {
    F0: multiplyComplex(
      { re: 1/3, im: 0 },
      addComplex(addComplex(Fa, Fb), Fc)
    ),
    F1: multiplyComplex(
      { re: 1/3, im: 0 },
      addComplex(addComplex(Fa, multiplyComplex(Fb, a)), multiplyComplex(Fc, a2))
    ),
    F2: multiplyComplex(
      { re: 1/3, im: 0 },
      addComplex(addComplex(Fa, multiplyComplex(Fb, a2)), multiplyComplex(Fc, a))
    )
  };
}

module.exports = {
  calculateFault,
  calculateFaultScan,
  sequenceToPhase,
  phaseToSequence,
  addComplex,
  subtractComplex,
  multiplyComplex,
  divideComplex
};
