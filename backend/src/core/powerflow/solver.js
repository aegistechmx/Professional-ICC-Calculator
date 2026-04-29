/**
 * newtonRaphson.js - Pure mathematical Newton-Raphson solver
 * 
 * Responsibility: ONLY solves power flow using Newton-Raphson method
 * NO Express, NO axios, NO UI logic
 * 
 * Architecture:
 * System → Ybus (G/B) → Initialize Voltages → Loop:
 *   Mismatch (P/Q) → Jacobian (G/B/P/Q) → Solve Linear System → Update Voltages
 * → Converged?
 */

const { buildYbus } = require('../ybus/buildYbus');
const { calcMismatch } = require('./mismatch');
const { buildJacobian } = require('./jacobian');
const { enforcePVLimits } = require('./pvControl');
const { lineSearch } = require('./lineSearch');
const { applyTrustRegion } = require('./trustRegion');

/**
 * Solve linear system J * x = b using Gaussian elimination
 * @param {Array} J - Jacobian matrix
 * @param {Array} b - Mismatch vector
 * @returns {Array} Solution vector x
 */
function solveLinearSystem(J, b) {
  const n = b.length;
  const augmented = Array.from({ length: n }, () => Array(n + 1).fill(0));

  // Build augmented matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      augmented[i][j] = J[i][j];
    }
    augmented[i][n] = b[i];
  }

  // Gaussian elimination with partial pivoting
  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxRow = k;
    let maxVal = Math.abs(augmented[k][k]);
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(augmented[i][k]) > maxVal) {
        maxVal = Math.abs(augmented[i][k]);
        maxRow = i;
      }
    }

    // Swap rows
    if (maxRow !== k) {
      [augmented[k], augmented[maxRow]] = [augmented[maxRow], augmented[k]];
    }

    // Handle singular matrix
    if (Math.abs(augmented[k][k]) < 1e-12) {
      augmented[k][k] = augmented[k][k] !== 0 ? augmented[k][k] + 1e-10 : 1e-10;
    }

    // Eliminate column
    for (let i = k + 1; i < n; i++) {
      const factor = augmented[i][k] / augmented[k][k];
      for (let j = k; j <= n; j++) {
        augmented[i][j] -= factor * augmented[k][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * x[j];
    }
    x[i] = sum / augmented[i][i];
  }

  return x;
}

/**
 * Initialize voltages with flat start
 * @param {Array} buses - Array of buses
 * @returns {Array} Voltage vector with complex numbers { re, im }
 */
function initializeVoltages(buses) {
  return buses.map((bus) => {
    if (bus.type === 'Slack') {
      const mag = bus.voltage?.magnitude || 1.0;
 // voltage (V)
      const ang = (bus.voltage?.angle || 0) * Math.PI / 180;
 // voltage (V)
      return {
        re: mag * Math.cos(ang),
        im: mag * Math.sin(ang)
      };
    } else if (bus.type === 'PV') {
      const mag = bus.voltage?.magnitude || 1.0;
 // voltage (V)
      const ang = (bus.voltage?.angle || 0) * Math.PI / 180;
 // voltage (V)
      return {
        re: mag * Math.cos(ang),
        im: mag * Math.sin(ang)
      };
    } else {
      // PQ: flat start at 1.0∠0°
      return { re: 1.0, im: 0.0 };
    }
  });
}

/**
 * Apply voltage corrections
 * @param {Array} V - Current voltage vector
 * @param {Array} corrections - Correction vector [dθ (non-slack), dV (PQ)]
 * @param {Array} buses - Array of buses
 * @returns {Array} Updated voltage vector
 */
function applyCorrections(V, corrections, buses) {
  const newV = V.map(v => ({ ...v }));
  let correctionIndex = 0;

  // Identify bus types
  const slack = [];
  const pq = [];
  const pv = [];

  buses.forEach((b, i) => {
    if (b.type === 'Slack') slack.push(i);
    else if (b.type === 'PQ') pq.push(i);
    else if (b.type === 'PV') pv.push(i);
  });

  const slackIndex = slack.length > 0 ? slack[0] : -1;

  // Apply angle corrections (all buses except slack)
  for (let i = 0; i < buses.length; i++) {
    if (i === slackIndex) continue;

    if (correctionIndex < corrections.length) {
      const dTheta = corrections[correctionIndex];
      const currentMag = Math.hypot(V[i].re, V[i].im);
      const currentAng = Math.atan2(V[i].im, V[i].re);
      const newAng = currentAng + dTheta;
      
      newV[i].re = currentMag * Math.cos(newAng);
      newV[i].im = currentMag * Math.sin(newAng);
      correctionIndex++;
    }
  }

  // Apply magnitude corrections (only PQ buses)
  pq.forEach(i => {
    if (correctionIndex < corrections.length) {
      const dV = corrections[correctionIndex];
      const currentMag = Math.hypot(newV[i].re, newV[i].im);
      const currentAng = Math.atan2(newV[i].im, newV[i].re);
      const newMag = currentMag + dV;  // No clamping
      
      newV[i].re = newMag * Math.cos(currentAng);
      newV[i].im = newMag * Math.sin(currentAng);
      correctionIndex++;
    }
  });

  return newV;
}

/**
 * Solve power flow using Newton-Raphson method
 * @param {Object} system - Power system data
 * @param {Array} system.buses - Array of buses with { type, P, Q, voltage }
 * @param {Array} system.branches - Array of branches with { from, to, R, X }
 * @param {Object} options - Solver options
 * @param {number} options.tolerance - Convergence tolerance (default 1e-8)
 * @param {number} options.maxIterations - Maximum iterations (default 30)
 * @returns {Object} Solution results
 */
function solve(system, options = {}) {
  const {
    tolerance = 1e-8,
    maxIterations = 30,
    damping = 0.8,  // Damping factor for faster convergence
    _enablePVControl = false,  // Enable PV Q limit enforcement
    _enableLineSearch = false,  // Enable line search for stability
    _enableTrustRegion = false,  // Enable trust region control
    _maxStepSize = 0.2  // Maximum step size for trust region
  } = options;

  // Build Ybus and extract G/B matrices
  const { Y: _Y, G, B } = buildYbus(system);

  // Identify bus types and track switching
  let pvBuses = [];
  let pqBuses = [];
  
  system.buses.forEach((bus, i) => {
    if (bus.type === 'PV') pvBuses.push(i);
    else if (bus.type === 'PQ') pqBuses.push(i);
  });

  // Initialize voltages
  let V = initializeVoltages(system.buses);

  // Newton-Raphson iteration
  let converged = false;
  let iterations = 0;
  let maxMismatch = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Calculate mismatches and power injections
    const { P: _P, Q: _Q, dP, dQ } = calcMismatch(V, G, B, system.buses);
    const mismatches = [...dP, ...dQ];
    maxMismatch = Math.max(...mismatches.map(Math.abs));

    // Enforce PV Q limits if enabled
    if (_enablePVControl) {
      const result = enforcePVLimits(system, _Q, pvBuses, pqBuses);
      pvBuses = result.pvBuses;
      pqBuses = result.pqBuses;
    }

    // Check convergence
    if (maxMismatch < tolerance) {
      converged = true;
      break;
    }

    // Build Jacobian with G/B matrices and P/Q injections
    const J = buildJacobian(V, G, B, _P, _Q, system.buses);

    // Solve linear system
    let corrections = solveLinearSystem(J, mismatches);

    // Apply trust region control
    if (_enableTrustRegion) {
      corrections = applyTrustRegion(corrections, _maxStepSize);
    }

    // Apply line search if enabled
    if (_enableLineSearch) {
      const computeMismatch = (V) => {
        const { P: _P2, Q: _Q2, dP, dQ } = calcMismatch(V, G, B, system.buses);
        return Math.max(...[...dP, ...dQ].map(Math.abs));
      };
      
      const searchResult = lineSearch(V, corrections, computeMismatch);
      V = searchResult.V;
      corrections = corrections.map(c => c * searchResult.alpha);
    } else {
      // Apply damping to corrections
      const dampedCorrections = corrections.map(c => c * damping);
      V = applyCorrections(V, dampedCorrections, system.buses);
    }
  }

  return {
    converged,
    iterations,
    maxMismatch,
    voltages: V,
    solver: 'NewtonRaphson'
  };
}

module.exports = { solve };
