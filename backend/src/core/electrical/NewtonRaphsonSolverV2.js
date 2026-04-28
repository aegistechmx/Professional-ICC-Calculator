/**
 * NewtonRaphsonSolverV2 - Complete Newton-Raphson load flow solver
 * with full Jacobian matrix implementation per industrial standards
 * 
 * Solves for:
 * - Voltage magnitudes (V)
 * - Voltage angles (theta)
 * - Active power (P)
 * - Reactive power (Q)
 * 
 * Jacobian structure:
 * J = | H   N |
 *     | M   L |
 * 
 * Where:
 * H = dP/dθ, N = dP/dV
 * M = dQ/dθ, L = dQ/dV
 */

const math = require('mathjs');

/**
 * Solve load flow using Newton-Raphson method
 * @param {Array} buses - Array of Bus objects with { id, type, V, theta, P, Q }
 * @param {Object} YbusResult - Result from buildYbus: { Y, index }
 * @param {Object} options - Solver options
 * @returns {Object} Load flow results
 */
function solveNR(buses, YbusResult, options = {}) {
  const {
    maxIter = 20,
    tol = 1e-6,
    verbose = false,
    maxDeltaV = 0.1, // Maximum voltage change per iteration
    maxDeltaTheta = 0.5 // Maximum angle change per iteration (rad)
  } = options;
  
  const { Y, index } = YbusResult;
  const n = buses.length;
  
  // Separate Ybus into G and B matrices
  const G = Array.from({ length: n }, () => Array(n).fill(0));
  const B = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      G[i][j] = Y[i][j].re;
      B[i][j] = Y[i][j].im;
    }
  }
  
  // Initialize voltage vector (flat start if not provided)
  let V = buses.map(b => b.V || 1.0);
  let theta = buses.map(b => b.theta || 0);
  
  // Identify bus types for variable reduction
  // SLACK: θ fixed, V fixed (no variables)
  // PV: θ variable, V fixed
  // PQ: θ variable, V variable
  const angleVars = buses
    .map((b, i) => b.type !== 'SLACK' ? i : -1)
    .filter(i => i !== -1);
  
  const voltageVars = buses
    .map((b, i) => b.type === 'PQ' ? i : -1)
    .filter(i => i !== -1);
  
  const nTheta = angleVars.length;
  const nV = voltageVars.length;
  
  // Iteration counter
  let iter = 0;
  let converged = false;
  const history = [];
  
  while (iter < maxIter && !converged) {
    // Calculate power flows
    const { Pi, Qi } = calculatePowerFlow(V, theta, G, B);
    
    // Build mismatch vector
    const mismatches = [];
    
    // Angle mismatches (P equation for all buses except slack)
    for (const i of angleVars) {
      mismatches.push(buses[i].P - Pi[i]);
    }
    
    // Voltage magnitude mismatches (Q equation for PQ buses only)
    for (const i of voltageVars) {
      mismatches.push(buses[i].Q - Qi[i]);
    }
    
    // Check convergence
    const maxError = Math.max(...mismatches.map(Math.abs));
    
    if (verbose) {
      console.log(`Iteration ${iter}: Max mismatch = ${maxError.toExponential(6)}`);
    }
    
    history.push({
      iteration: iter,
      maxError,
      V: [...V],
      theta: [...theta]
    });
    
    if (maxError < tol) {
      converged = true;
      break;
    }
    
    // Build full Jacobian (H, N, M, L blocks)
    const { H, N, M, L } = buildJacobianBlocks(V, theta, G, B, n);
    
    // Build reduced Jacobian based on active variables
    const J_reduced = buildReducedJacobian(H, N, M, L, angleVars, voltageVars);
    
    // Solve linear system: J * dx = mismatch using mathjs
    let dx;
    try {
      dx = math.lusolve(J_reduced, mismatches).map(row => row[0]);
    } catch (error) {
      // Fallback to Gaussian elimination if lusolve fails
      dx = solveLinearSystem(J_reduced, mismatches);
    }
    
    // Update voltages and angles with delta limiting
    let dxIndex = 0;
    
    // Update angles (for all buses except slack)
    for (const i of angleVars) {
      const dTheta = dx[dxIndex++];
      // Limit angle change for stability
      theta[i] += Math.max(-maxDeltaTheta, Math.min(maxDeltaTheta, dTheta));
    }
    
    // Update voltage magnitudes (for PQ buses only)
    for (const i of voltageVars) {
      const dV = dx[dxIndex++];
      // Limit voltage change for stability
      V[i] += Math.max(-maxDeltaV, Math.min(maxDeltaV, dV));
      // Prevent negative or zero voltages
      if (V[i] < 0.1) V[i] = 0.1;
      if (V[i] > 1.5) V[i] = 1.5;
    }
    
    iter++;
  }
  
  // Calculate final power flows
  const { Pi: P_final, Qi: Q_final } = calculatePowerFlow(V, theta, G, B);
  
  // Calculate system losses
  const P_loss = P_final.reduce((sum, p) => sum + p, 0);
  const Q_loss = Q_final.reduce((sum, q) => sum + q, 0);
  
  return {
    converged,
    iterations: iter,
    maxError: history[history.length - 1]?.maxError || 0,
    V,
    theta,
    P: P_final,
    Q: Q_final,
    P_loss,
    Q_loss,
    history
  };
}

/**
 * Calculate power flow from voltages and Ybus
 * Returns Pi and Qi for each bus
 */
function calculatePowerFlow(V, theta, G, B) {
  const n = V.length;
  const Pi = Array(n).fill(0);
  const Qi = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const angle = theta[i] - theta[j];
      Pi[i] += V[i] * V[j] * (G[i][j] * Math.cos(angle) + B[i][j] * Math.sin(angle));
      Qi[i] += V[i] * V[j] * (G[i][j] * Math.sin(angle) - B[i][j] * Math.cos(angle));
    }
  }
  
  return { Pi, Qi };
}

/**
 * Build Jacobian blocks (H, N, M, L) according to industrial standards
 * 
 * J = | H   N |
 *     | M   L |
 * 
 * Where:
 * H = dP/dθ, N = dP/dV
 * M = dQ/dθ, L = dQ/dV
 * 
 * Formulas:
 * i ≠ j: H_ij = V_i * V_j * (G_ij * sin(θ_ij) - B_ij * cos(θ_ij))
 * i = j: H_ii = -Q_i - B_ii * V_i²
 * 
 * i ≠ j: N_ij = V_i * (G_ij * cos(θ_ij) + B_ij * sin(θ_ij))
 * i = j: N_ii = P_i / V_i + G_ii * V_i
 * 
 * i ≠ j: M_ij = -V_i * V_j * (G_ij * cos(θ_ij) + B_ij * sin(θ_ij))
 * i = j: M_ii = P_i - G_ii * V_i²
 * 
 * i ≠ j: L_ij = V_i * (G_ij * sin(θ_ij) - B_ij * cos(θ_ij))
 * i = j: L_ii = Q_i / V_i - B_ii * V_i
 */
function buildJacobianBlocks(V, theta, G, B, n) {
  // Initialize Jacobian blocks
  const H = Array.from({ length: n }, () => Array(n).fill(0));
  const N = Array.from({ length: n }, () => Array(n).fill(0));
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  
  // Pre-calculate Pi and Qi for all buses
  const { Pi, Qi } = calculatePowerFlow(V, theta, G, B);
  
  // Fill Jacobian blocks
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const Gij = G[i][j];
      const Bij = B[i][j];
      const angle = theta[i] - theta[j];
      const Vi = V[i];
      const Vj = V[j];
      
      if (i === j) {
        // Diagonal elements
        H[i][j] = -Qi[i] - Bij * Vi * Vi;
        N[i][j] = Pi[i] / Vi + Gij * Vi;
        M[i][j] = Pi[i] - Gij * Vi * Vi;
        L[i][j] = Qi[i] / Vi - Bij * Vi;
      } else {
        // Off-diagonal elements
        H[i][j] = Vi * Vj * (Gij * Math.sin(angle) - Bij * Math.cos(angle));
        N[i][j] = Vi * (Gij * Math.cos(angle) + Bij * Math.sin(angle));
        M[i][j] = -Vi * Vj * (Gij * Math.cos(angle) + Bij * Math.sin(angle));
        L[i][j] = Vi * (Gij * Math.sin(angle) - Bij * Math.cos(angle));
      }
    }
  }
  
  return { H, N, M, L };
}

/**
 * Build reduced Jacobian matrix based on active variables
 * 
 * Bus type variable reduction:
 * SLACK: θ fixed, V fixed (no variables)
 * PV: θ variable, V fixed
 * PQ: θ variable, V variable
 * 
 * @param {Array} H - dP/dθ block
 * @param {Array} N - dP/dV block
 * @param {Array} M - dQ/dθ block
 * @param {Array} L - dQ/dV block
 * @param {Array} angleVars - Indices of buses with variable angles
 * @param {Array} voltageVars - Indices of buses with variable voltages
 * @returns {Array} Reduced Jacobian matrix
 */
function buildReducedJacobian(H, N, M, L, angleVars, voltageVars) {
  const nTheta = angleVars.length;
  const nV = voltageVars.length;
  const size = nTheta + nV;
  
  const J_reduced = Array.from({ length: size }, () => Array(size).fill(0));
  
  // Fill H block (dP/dθ) - rows: angleVars, cols: angleVars
  for (let ri = 0; ri < nTheta; ri++) {
    for (let ci = 0; ci < nTheta; ci++) {
      const i = angleVars[ri];
      const j = angleVars[ci];
      J_reduced[ri][ci] = H[i][j];
    }
  }
  
  // Fill N block (dP/dV) - rows: angleVars, cols: voltageVars
  for (let ri = 0; ri < nTheta; ri++) {
    for (let ci = 0; ci < nV; ci++) {
      const i = angleVars[ri];
      const j = voltageVars[ci];
      J_reduced[ri][nTheta + ci] = N[i][j];
    }
  }
  
  // Fill M block (dQ/dθ) - rows: voltageVars, cols: angleVars
  for (let ri = 0; ri < nV; ri++) {
    for (let ci = 0; ci < nTheta; ci++) {
      const i = voltageVars[ri];
      const j = angleVars[ci];
      J_reduced[nTheta + ri][ci] = M[i][j];
    }
  }
  
  // Fill L block (dQ/dV) - rows: voltageVars, cols: voltageVars
  for (let ri = 0; ri < nV; ri++) {
    for (let ci = 0; ci < nV; ci++) {
      const i = voltageVars[ri];
      const j = voltageVars[ci];
      J_reduced[nTheta + ri][nTheta + ci] = L[i][j];
    }
  }
  
  return J_reduced;
}
/**
 * Solve linear system using Gaussian elimination with partial pivoting
 * Fallback method if mathjs lusolve fails
 */
function solveLinearSystem(A, b) {
  const n = A.length;
  const x = [...b];
  const M = A.map(row => [...row]);
  
  // Forward elimination with partial pivoting
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

/**
 * Solve load flow with automatic flat start
 */
function solveLoadFlowAuto(buses, YbusResult, options = {}) {
  // Ensure flat start if not provided
  const busesWithFlatStart = buses.map(b => ({
    ...b,
    V: b.V || 1.0,
    theta: b.theta || 0
  }));
  
  return solveNR(busesWithFlatStart, YbusResult, options);
}

module.exports = {
  solveNR,
  solveLoadFlowAuto,
  buildJacobianBlocks,
  buildReducedJacobian,
  solveLinearSystem,
  calculatePowerFlow
};
