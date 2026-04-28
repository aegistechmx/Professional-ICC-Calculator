/**
 * NewtonRaphsonSolver - Load flow analysis using Newton-Raphson method
 * 
 * Standard power flow solver for electrical systems
 * Solves for voltage magnitudes and angles at all buses
 * 
 * Power flow equations:
 * Pi = |Vi| * sum(|Vj| * (Gij * cos(theta_ij) + Bij * sin(theta_ij)))
 * Qi = |Vi| * sum(|Vj| * (Gij * sin(theta_ij) - Bij * cos(theta_ij)))
 */

const { buildYbus, calculatePowerFlow } = require('./YbusBuilder');

/**
 * Solve load flow using Newton-Raphson method
 * @param {ElectricalSystem} system - Electrical system
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveLoadFlow(system, options = {}) {
  const {
    maxIterations = 30,
    tolerance = 1e-6,
    flatStart = true,
    verbose = false
  } = options;
  
  // Build Ybus matrix
  const { Y, G, B, busMap } = buildYbus(system);
  const n = system.buses.length;
  
  // Initialize voltage vector
  const V = Array(n).fill(null).map((_, i) => {
    const bus = system.buses[i];
    if (flatStart) {
      // Flat start: all voltages at 1.0 p.u., angle 0
      return { re: 1.0, im: 0.0 };
    } else {
      // Use bus voltage if available
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
  
  // Number of unknowns
  // - Voltage angles for all buses except slack
  // - Voltage magnitudes for PQ buses only
  const nTheta = n - 1;
  const nV = pqBuses.length;
  const nUnknowns = nTheta + nV;
  
  // Iteration counter
  let iteration = 0;
  let converged = false;
  let maxMismatch = Infinity;
  
  // Mismatch vectors
  const mismatchP = Array(n).fill(0);
  const mismatchQ = Array(n).fill(0);
  
  // History for convergence tracking
  const history = [];
  
  while (iteration < maxIterations && !converged) {
    // Calculate power flow with current voltages
    const { P: P_calc, Q: Q_calc } = calculatePowerFlow(V, Y);
    
    // Calculate mismatches
    maxMismatch = 0;
    
    for (let i = 0; i < n; i++) {
      const bus = system.buses[i];
      
      // Scheduled power (from generation/load)
      const P_scheduled = bus.generation.P - bus.load.P;
      const Q_scheduled = bus.generation.Q - bus.load.Q;
      
      mismatchP[i] = P_scheduled - P_calc[i];
      mismatchQ[i] = Q_scheduled - Q_calc[i];
      
      // Track maximum mismatch
      maxMismatch = Math.max(maxMismatch, Math.abs(mismatchP[i]), Math.abs(mismatchQ[i]));
    }
    
    // Store history
    history.push({
      iteration,
      maxMismatch,
      voltages: V.map(v => ({ ...v }))
    });
    
    if (verbose) {
      console.log(`Iteration ${iteration}: Max mismatch = ${maxMismatch.toExponential(4)}`);
    }
    
    // Check convergence
    if (maxMismatch < tolerance) {
      converged = true;
      break;
    }
    
    // Build Jacobian matrix
    const J = buildJacobian(V, G, B, n, pqBuses, pvBuses);
    
    // Build mismatch vector (excluding slack bus)
    const mismatch = [];
    
    // Angle mismatches (all buses except slack)
    for (let i = 0; i < n; i++) {
      if (i !== slackBusIndex) {
        mismatch.push(mismatchP[i]);
      }
    }
    
    // Voltage magnitude mismatches (PQ buses only)
    pqBuses.forEach(i => {
      mismatch.push(mismatchQ[i]);
    });
    
    // Solve linear system: J * delta = mismatch
    const delta = solveLinearSystem(J, mismatch);
    
    // Update voltages
    let deltaIndex = 0;
    
    // Update voltage angles (all buses except slack)
    for (let i = 0; i < n; i++) {
      if (i !== slackBusIndex) {
        const currentMag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
        const currentAng = Math.atan2(V[i].im, V[i].re);
        const newAng = currentAng + delta[deltaIndex];
        V[i].re = currentMag * Math.cos(newAng);
        V[i].im = currentMag * Math.sin(newAng);
        deltaIndex++;
      }
    }
    
    // Update voltage magnitudes (PQ buses only)
    pqBuses.forEach(i => {
      const currentMag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
      const currentAng = Math.atan2(V[i].im, V[i].re);
      const newMag = currentMag + delta[deltaIndex];
      V[i].re = newMag * Math.cos(currentAng);
      V[i].im = newMag * Math.sin(currentAng);
      deltaIndex++;
    });
    
    iteration++;
  }
  
  // Calculate final power flows and losses
  const { P: P_final, Q: Q_final } = calculatePowerFlow(V, Y);
  
  // Calculate system losses
  let P_loss = 0;
  let Q_loss = 0;
  for (let i = 0; i < n; i++) {
    P_loss += P_final[i];
    Q_loss += Q_final[i];
  }
  
  // Update bus voltages in system
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
    history
  };
}

/**
 * Build Jacobian matrix for Newton-Raphson
 * J = [H  N; J  L]
 * H = dP/dTheta, N = dP/dV
 * J = dQ/dTheta, L = dQ/dV
 */
function buildJacobian(V, G, B, n, pqBuses, pvBuses) {
  const nTheta = n - 1; // All buses except slack
  const nV = pqBuses.length;
  const size = nTheta + nV;
  
  const J = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // Voltage magnitudes and angles
  const V_mag = V.map(v => Math.sqrt(v.re * v.re + v.im * v.im));
  const V_ang = V.map(v => Math.atan2(v.im, v.re));
  
  // Fill Jacobian
  let rowTheta = 0;
  let rowV = nTheta;
  
  for (let i = 0; i < n; i++) {
    if (i === 0) continue; // Skip slack bus
    
    let colTheta = 0;
    let colV = nTheta;
    
    for (let j = 0; j < n; j++) {
      if (j === 0) continue; // Skip slack bus
      
      const theta_ij = V_ang[i] - V_ang[j];
      const Vi = V_mag[i];
      const Vj = V_mag[j];
      const Gij = G[i][j];
      const Bij = B[i][j];
      
      // H matrix: dP_i/dTheta_j
      if (i === j) {
        J[rowTheta][colTheta] = -Vi * Vi * Bij - Q_i(V, G, B, i);
      } else {
        J[rowTheta][colTheta] = Vi * Vj * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
      }
      
      // N matrix: dP_i/dV_j
      if (i === j) {
        J[rowTheta][colV] = Vi * Gij + P_i(V, G, B, i) / Vi;
      } else {
        J[rowTheta][colV] = Vi * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
      }
      
      // J matrix: dQ_i/dTheta_j (only for PQ buses)
      if (pqBuses.includes(i)) {
        if (i === j) {
          J[rowV][colTheta] = Vi * Vi * Gij - P_i(V, G, B, i);
        } else {
          J[rowV][colTheta] = -Vi * Vj * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
        }
      }
      
      // L matrix: dQ_i/dV_j (only for PQ buses)
      if (pqBuses.includes(i)) {
        if (i === j) {
          J[rowV][colV] = -Vi * Bij + Q_i(V, G, B, i) / Vi;
        } else {
          J[rowV][colV] = Vi * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
        }
      }
      
      colTheta++;
      if (j !== 0) colV++;
    }
    
    rowTheta++;
    if (pqBuses.includes(i)) rowV++;
  }
  
  return J;
}

/**
 * Calculate P_i for Jacobian
 */
function P_i(V, G, B, i) {
  const n = V.length;
  let P = 0;
  const Vi = V[i];
  const Vi_mag = Math.sqrt(Vi.re * Vi.re + Vi.im * Vi.im);
  const Vi_ang = Math.atan2(Vi.im, Vi.re);
  
  for (let j = 0; j < n; j++) {
    const Vj = V[j];
    const Vj_mag = Math.sqrt(Vj.re * Vj.re + Vj.im * Vj.im);
    const Vj_ang = Math.atan2(Vj.im, Vj.re);
    const theta_ij = Vi_ang - Vj_ang;
    const Gij = G[i][j];
    const Bij = B[i][j];
    
    P += Vi_mag * Vj_mag * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
  }
  
  return P;
}

/**
 * Calculate Q_i for Jacobian
 */
function Q_i(V, G, B, i) {
  const n = V.length;
  let Q = 0;
  const Vi = V[i];
  const Vi_mag = Math.sqrt(Vi.re * Vi.re + Vi.im * Vi.im);
  const Vi_ang = Math.atan2(Vi.im, Vi.re);
  
  for (let j = 0; j < n; j++) {
    const Vj = V[j];
    const Vj_mag = Math.sqrt(Vj.re * Vj.re + Vj.im * Vj.im);
    const Vj_ang = Math.atan2(Vj.im, Vj.re);
    const theta_ij = Vi_ang - Vj_ang;
    const Gij = G[i][j];
    const Bij = B[i][j];
    
    Q += Vi_mag * Vj_mag * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
  }
  
  return Q;
}

/**
 * Solve linear system using Gaussian elimination
 * (Simplified - in production use LU decomposition or sparse solver)
 */
function solveLinearSystem(A, b) {
  const n = A.length;
  const x = [...b];
  const M = A.map(row => [...row]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    [x[i], x[maxRow]] = [x[maxRow], x[i]];
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      x[k] -= factor * x[i];
      for (let j = i; j < n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }
  
  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j];
    }
    x[i] /= M[i][i];
  }
  
  return x;
}

module.exports = {
  solveLoadFlow,
  buildJacobian
};
