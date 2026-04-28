/**
 * NewtonRaphsonSolverRobust - Robust Load Flow Solver
 * 
 * Enhanced Newton-Raphson solver with:
 * - Adaptive damping
 * - Dynamic ΔV limit
 * - Fallback if diverges
 * - Multiple solver strategies
 * 
 * Architecture:
 * NR → Check Convergence → Apply Damping → Update Voltages → Fallback if Diverges
 */

const { buildYbus, calculatePowerFlow } = require('./YbusBuilder');

/**
 * Solve load flow using robust Newton-Raphson method
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveLoadFlowRobust(system, options = {}) {
  const {
    maxIterations = 30,
    tolerance = 1e-6,
    flatStart = true,
    verbose = false,
    // Robust options
    adaptiveDamping = true,
    dynamicVoltageLimit = true,
    maxVoltageChange = 0.1, // pu
    dampingFactor = 0.5,
    fallbackStrategy = 'fast_decoupled', // 'fast_decoupled', 'gauss_seidel'
    enableFallback = true
  } = options;
  
  // Try standard NR first
  try {
    const result = solveNRWithDamping(system, {
      maxIterations,
      tolerance,
      flatStart,
      verbose,
      adaptiveDamping,
      dynamicVoltageLimit,
      maxVoltageChange,
      dampingFactor
    });
    
    if (result.converged) {
      return result;
    }
  } catch (error) {
    if (verbose) {
      console.log('Standard NR failed, trying fallback:', error.message);
    }
  }
  
  // Fallback strategy if enabled
  if (enableFallback) {
    if (verbose) {
      console.log(`Using fallback strategy: ${fallbackStrategy}`);
    }
    
    switch (fallbackStrategy) {
    case 'fast_decoupled':
      return solveFastDecoupled(system, options);
    case 'gauss_seidel':
      return solveGaussSeidel(system, options);
    default:
      return solveFastDecoupled(system, options);
    }
  }
  
  // Return unconverged result
  return solveNRWithDamping(system, options);
}

/**
 * Solve NR with adaptive damping
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveNRWithDamping(system, options = {}) {
  const {
    maxIterations = 30,
    tolerance = 1e-6,
    flatStart = true,
    verbose = false,
    adaptiveDamping = true,
    dynamicVoltageLimit = true,
    maxVoltageChange = 0.1,
    dampingFactor = 0.5
  } = options;
  
  // Build Ybus matrix
  const { Y, G, B, busMap } = buildYbus(system);
  const n = system.buses.length;
  
  // Initialize voltage vector
  const V = Array(n).fill(null).map((_, i) => {
    const bus = system.buses[i];
    if (flatStart) {
      return { re: 1.0, im: 0.0 };
    } else {
      const mag = bus.voltage?.magnitude || 1.0;
      const ang = bus.voltage?.angle || 0;
      return {
        re: mag * Math.cos(ang),
        im: mag * Math.sin(ang)
      };
    }
  });
  
  // Identify bus types
  const slackBuses = [];
  const pvBuses = [];
  const pqBuses = [];
  
  system.buses.forEach((bus, i) => {
    if (bus.type === 'Slack') {
      slackBuses.push(i);
    } else if (bus.type === 'PV') {
      pvBuses.push(i);
    } else {
      pqBuses.push(i);
    }
  });
  
  if (slackBuses.length === 0) {
    throw new Error('No slack bus found in the system');
  }
  
  const slackBusIndex = slackBuses[0];
  
  // Iteration counter
  let iteration = 0;
  let converged = false;
  let maxMismatch = Infinity;
  
  // Mismatch vectors
  const mismatchP = Array(n).fill(0);
  const mismatchQ = Array(n).fill(0);
  
  // History for convergence tracking
  const history = [];
  
  // Previous mismatch for adaptive damping
  let prevMaxMismatch = Infinity;
  let currentDamping = 1.0;
  
  while (iteration < maxIterations && !converged) {
    // Calculate power flow with current voltages
    const { P: P_calc, Q: Q_calc } = calculatePowerFlow(V, Y);
    
    // Calculate mismatches
    maxMismatch = 0;
    
    for (let i = 0; i < n; i++) {
      const bus = system.buses[i];
      
      const P_scheduled = bus.generation.P - bus.load.P;
      const Q_scheduled = bus.generation.Q - bus.load.Q;
      
      mismatchP[i] = P_scheduled - P_calc[i];
      mismatchQ[i] = Q_scheduled - Q_calc[i];
      
      maxMismatch = Math.max(maxMismatch, Math.abs(mismatchP[i]), Math.abs(mismatchQ[i]));
    }
    
    // Store history
    history.push({
      iteration,
      maxMismatch,
      damping: currentDamping,
      voltages: V.map(v => ({ ...v }))
    });
    
    if (verbose) {
      console.log(`Iteration ${iteration}: Max mismatch = ${maxMismatch.toExponential(4)}, Damping = ${currentDamping}`);
    }
    
    // Check convergence
    if (maxMismatch < tolerance) {
      converged = true;
      break;
    }
    
    // Adaptive damping: adjust based on mismatch improvement
    if (adaptiveDamping && iteration > 0) {
      if (maxMismatch < prevMaxMismatch) {
        // Improving, increase damping (reduce damping factor)
        currentDamping = Math.min(1.0, currentDamping + 0.1);
      } else {
        // Not improving, decrease damping (increase damping factor)
        currentDamping = Math.max(dampingFactor, currentDamping - 0.2);
      }
    }
    
    prevMaxMismatch = maxMismatch;
    
    // Build Jacobian matrix
    const J = buildJacobian(V, G, B, n, pqBuses, pvBuses);
    
    // Build mismatch vector
    const mismatch = [];
    
    for (let i = 0; i < n; i++) {
      if (i !== slackBusIndex) {
        mismatch.push(mismatchP[i]);
      }
    }
    
    pqBuses.forEach(i => {
      mismatch.push(mismatchQ[i]);
    });
    
    // Solve linear system
    const delta = solveLinearSystem(J, mismatch);
    
    // Apply damping to delta
    if (adaptiveDamping && currentDamping < 1.0) {
      for (let i = 0; i < delta.length; i++) {
        delta[i] *= currentDamping;
      }
    }
    
    // Update voltages with dynamic voltage limit
    let deltaIndex = 0;
    
    for (let i = 0; i < n; i++) {
      if (i !== slackBusIndex) {
        const currentMag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
        const currentAng = Math.atan2(V[i].im, V[i].re);
        
        let newAng = currentAng + delta[deltaIndex];
        
        // Apply voltage angle limit
        if (dynamicVoltageLimit) {
          const maxAngleChange = maxVoltageChange; // rad
          const angleChange = Math.abs(newAng - currentAng);
          if (angleChange > maxAngleChange) {
            newAng = currentAng + Math.sign(newAng - currentAng) * maxAngleChange;
          }
        }
        
        V[i].re = currentMag * Math.cos(newAng);
        V[i].im = currentMag * Math.sin(newAng);
        deltaIndex++;
      }
    }
    
    pqBuses.forEach(i => {
      const currentMag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
      const currentAng = Math.atan2(V[i].im, V[i].re);
      
      let newMag = currentMag + delta[deltaIndex];
      
      // Apply voltage magnitude limit
      if (dynamicVoltageLimit) {
        const magChange = Math.abs(newMag - currentMag);
        if (magChange > maxVoltageChange) {
          newMag = currentMag + Math.sign(newMag - currentMag) * maxVoltageChange;
        }
        
        // Ensure voltage stays within reasonable bounds
        newMag = Math.max(0.5, Math.min(1.5, newMag));
      }
      
      V[i].re = newMag * Math.cos(currentAng);
      V[i].im = newMag * Math.sin(currentAng);
      deltaIndex++;
    });
    
    // Check for divergence
    if (maxMismatch > 1e6 || isNaN(maxMismatch)) {
      throw new Error('NR solver diverged');
    }
    
    iteration++;
  }
  
  // Calculate final power flows
  const { P: P_final, Q: Q_final } = calculatePowerFlow(V, Y);
  
  // Calculate losses
  let P_loss = 0;
  let Q_loss = 0;
  for (let i = 0; i < n; i++) {
    P_loss += P_final[i];
    Q_loss += Q_final[i];
  }
  
  // Update bus voltages
  system.buses.forEach((bus, i) => {
    bus.voltage = {
      magnitude: Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im),
      angle: Math.atan2(V[i].im, V[i].re)
    };
  });
  
  return {
    converged,
    iterations: iteration,
    maxMismatch,
    voltages: V,
    angles: V.map(v => Math.atan2(v.im, v.re)),
    P: P_final,
    Q: Q_final,
    P_loss,
    Q_loss,
    history,
    solver: 'NR_robust'
  };
}

/**
 * Build Jacobian matrix
 * @param {Array} V - Voltage vector
 * @param {Array} G - Conductance matrix
 * @param {Array} B - Susceptance matrix
 * @param {number} n - Number of buses
 * @param {Array} pqBuses - PQ bus indices
 * @param {Array} pvBuses - PV bus indices
 * @returns {Array} Jacobian matrix
 */
function buildJacobian(V, G, B, n, pqBuses, pvBuses) {
  const nTheta = n - 1;
  const nV = pqBuses.length;
  const size = nTheta + nV;
  
  const J = Array(size).fill(null).map(() => Array(size).fill(0));
  
  const V_mag = V.map(v => Math.sqrt(v.re * v.re + v.im * v.im));
  const V_ang = V.map(v => Math.atan2(v.im, v.re));
  
  let rowTheta = 0;
  let rowV = nTheta;
  
  for (let i = 0; i < n; i++) {
    if (i === 0) continue;
    
    let colTheta = 0;
    let colV = nTheta;
    
    for (let j = 0; j < n; j++) {
      if (j === 0) continue;
      
      const theta_ij = V_ang[i] - V_ang[j];
      const Vi = V_mag[i];
      const Vj = V_mag[j];
      const Gij = G[i][j];
      const Bij = B[i][j];
      
      // H = dP/dTheta
      J[rowTheta][colTheta] = Vi * Vj * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
      if (i === j) {
        J[rowTheta][colTheta] -= Vi * Vi * Bij;
      }
      
      // N = dP/dV
      if (pqBuses.includes(j) || pvBuses.includes(j)) {
        J[rowTheta][colV] = Vi * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
        if (i === j) {
          J[rowTheta][colV] += Vi * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
        }
        colV++;
      }
      
      colTheta++;
    }
    
    // J = dQ/dTheta (only for PQ buses)
    if (pqBuses.includes(i)) {
      colTheta = 0;
      colV = nTheta;
      
      for (let j = 0; j < n; j++) {
        if (j === 0) continue;
        
        const theta_ij = V_ang[i] - V_ang[j];
        const Vi = V_mag[i];
        const Vj = V_mag[j];
        const Gij = G[i][j];
        const Bij = B[i][j];
        
        // J = dQ/dTheta
        J[rowV][colTheta] = -Vi * Vj * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
        if (i === j) {
          J[rowV][colTheta] += Vi * Vi * Gij;
        }
        
        // L = dQ/dV
        if (pqBuses.includes(j) || pvBuses.includes(j)) {
          J[rowV][colV] = Vi * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
          if (i === j) {
            J[rowV][colV] += Vi * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
          }
          colV++;
        }
        
        colTheta++;
      }
      
      rowV++;
    }
    
    rowTheta++;
  }
  
  return J;
}

/**
 * Solve linear system using Gaussian elimination
 * @param {Array} A - Matrix
 * @param {Array} b - Right-hand side
 * @returns {Array} Solution
 */
function solveLinearSystem(A, b) {
  const n = b.length;
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
      b[k] -= factor * b[i];
    }
  }
  
  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    x[i] = (b[i] - sum) / A[i][i];
  }
  
  return x;
}

/**
 * Fast Decoupled Power Flow (fallback)
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveFastDecoupled(system, options = {}) {
  // Simplified fast decoupled implementation
  // This is a placeholder - full implementation would use B' and B'' matrices
  const { maxIterations = 30, tolerance = 1e-6, verbose = false } = options;
  
  if (verbose) {
    console.log('Running Fast Decoupled Power Flow');
  }
  
  // For now, return unconverged result
  return {
    converged: false,
    iterations: maxIterations,
    maxMismatch: Infinity,
    solver: 'fast_decoupled',
    message: 'Fast Decoupled solver not fully implemented'
  };
}

/**
 * Gauss-Seidel Power Flow (fallback)
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveGaussSeidel(system, options = {}) {
  const { maxIterations = 100, tolerance = 1e-6, verbose = false } = options;
  
  if (verbose) {
    console.log('Running Gauss-Seidel Power Flow');
  }
  
  // For now, return unconverged result
  return {
    converged: false,
    iterations: maxIterations,
    maxMismatch: Infinity,
    solver: 'gauss_seidel',
    message: 'Gauss-Seidel solver not fully implemented'
  };
}

module.exports = {
  solveLoadFlowRobust,
  solveNRWithDamping,
  solveFastDecoupled,
  solveGaussSeidel
};
