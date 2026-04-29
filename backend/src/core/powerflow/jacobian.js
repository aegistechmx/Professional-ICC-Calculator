/**
 * buildJacobian.js - Pure mathematical Jacobian matrix construction
 * 
 * Responsibility: ONLY builds Jacobian matrix with real partial derivatives
 * NO Express, NO axios, NO UI logic
 * 
 * Jacobian structure:
 * J = | J11   J12 |
 *     | J21   J22 |
 * 
 * Where:
 * J11 = dP/dθ
 * J12 = dP/dV
 * J21 = dQ/dθ
 * J22 = dQ/dV
 * 
 * Base equations:
 * P_i = Σ V_i V_j (G_ij cosθ_ij + B_ij sinθ_ij)
 * Q_i = Σ V_i V_j (G_ij sinθ_ij - B_ij cosθ_ij)
 * 
 * Architecture:
 * Voltages + G/B matrices + Bus Types → Jacobian Matrix
 */

/**
 * Build complete Jacobian matrix for Newton-Raphson with real partial derivatives
 * @param {Array} V - Voltage vector with complex numbers { re, im }
 * @param {Array} G - Conductance matrix (real part of Ybus)
 * @param {Array} B - Susceptance matrix (imaginary part of Ybus)
 * @param {Array} P - Active power injections (unused in this implementation, kept for compatibility)
 * @param {Array} Q - Reactive power injections (unused in this implementation, kept for compatibility)
 * @param {Array} buses - Array of buses with { type }
 * @returns {Array} Jacobian matrix (real numbers)
 */
function buildJacobian(V, G, B, _P, _Q, buses) {
  const n = buses.length;

  // Identify bus types
  const pq = [];
  const pv = [];
  const slack = [];

  buses.forEach((b, i) => {
    if (b.type === "Slack") slack.push(i);
    else if (b.type === "PQ") pq.push(i);
    else if (b.type === "PV") pv.push(i);
  });

  const slackIndex = slack.length > 0 ? slack[0] : -1;
  const pqBuses = pq;
  const _pvBuses = pv;

  // Helper functions
  const getV = (i) => Math.sqrt(V[i].re ** 2 + V[i].im ** 2);
  const getTheta = (i) => Math.atan2(V[i].im, V[i].re);

  // Indices for angle variables (all except slack)
  const angleIndex = [];
  for (let i = 0; i < n; i++) {
    if (i !== slackIndex) angleIndex.push(i);
  }

  // Indices for voltage variables (only PQ buses)
  const voltageIndex = pqBuses;

  const size = angleIndex.length + voltageIndex.length;
  const J = Array.from({ length: size }, () => Array(size).fill(0));

  let row = 0;

  // =========================
  // J11 = dP/dθ
  // =========================
  for (let iIdx = 0; iIdx < angleIndex.length; iIdx++) {
    const i = angleIndex[iIdx];
    let col = 0;

    for (let jIdx = 0; jIdx < angleIndex.length; jIdx++) {
      const j = angleIndex[jIdx];

      if (i === j) {
        // Diagonal: sum over all k ≠ i
        let sum = 0;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;

          const Vi = getV(i);
          const Vk = getV(k);
          const theta = getTheta(i) - getTheta(k);

          sum += Vi * Vk * (
            -G[i][k] * Math.sin(theta) +
             B[i][k] * Math.cos(theta)
          );
        }
        J[row][col] = sum;
      } else {
        // Off-diagonal
        const Vi = getV(i);
        const Vj = getV(j);
        const theta = getTheta(i) - getTheta(j);

        J[row][col] = Vi * Vj * (
          G[i][j] * Math.sin(theta) -
          B[i][j] * Math.cos(theta)
        );
      }

      col++;
    }

    // =========================
    // J12 = dP/dV
    // =========================
    for (let jIdx = 0; jIdx < voltageIndex.length; jIdx++) {
      const j = voltageIndex[jIdx];

      const Vi = getV(i);
      const theta = getTheta(i) - getTheta(j);

      if (i === j) {
        // Diagonal: sum over all k
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const Vk = getV(k);
          const theta = getTheta(i) - getTheta(k);

          sum += Vk * (
            G[i][k] * Math.cos(theta) +
            B[i][k] * Math.sin(theta)
          );
        }
        J[row][angleIndex.length + jIdx] = sum + 2 * Vi * G[i][i];
      } else {
        // Off-diagonal
        const Vj = getV(j);

        J[row][angleIndex.length + jIdx] =
          Vi * (
            G[i][j] * Math.cos(theta) +
            B[i][j] * Math.sin(theta)
          );
      }
    }

    row++;
  }

  // =========================
  // J21 = dQ/dθ
  // =========================
  for (let iIdx = 0; iIdx < voltageIndex.length; iIdx++) {
    const i = voltageIndex[iIdx];
    let col = 0;

    for (let jIdx = 0; jIdx < angleIndex.length; jIdx++) {
      const j = angleIndex[jIdx];

      if (i === j) {
        // Diagonal: sum over all k ≠ i
        let sum = 0;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;

          const Vi = getV(i);
          const Vk = getV(k);
          const theta = getTheta(i) - getTheta(k);

          sum += Vi * Vk * (
            G[i][k] * Math.cos(theta) +
            B[i][k] * Math.sin(theta)
          );
        }
        J[row][col] = -sum;
      } else {
        // Off-diagonal
        const Vi = getV(i);
        const Vj = getV(j);
        const theta = getTheta(i) - getTheta(j);

        J[row][col] = -Vi * Vj * (
          G[i][j] * Math.cos(theta) +
          B[i][j] * Math.sin(theta)
        );
      }

      col++;
    }

    // =========================
    // J22 = dQ/dV
    // =========================
    for (let jIdx = 0; jIdx < voltageIndex.length; jIdx++) {
      const j = voltageIndex[jIdx];

      const Vi = getV(i);
      const theta = getTheta(i) - getTheta(j);

      if (i === j) {
        // Diagonal: sum over all k
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const Vk = getV(k);
          const theta = getTheta(i) - getTheta(k);

          sum += Vk * (
            G[i][k] * Math.sin(theta) -
            B[i][k] * Math.cos(theta)
          );
        }
        J[row][angleIndex.length + jIdx] = sum - 2 * Vi * B[i][i];
      } else {
        // Off-diagonal
        J[row][angleIndex.length + jIdx] =
          Vi * (
            G[i][j] * Math.sin(theta) -
            B[i][j] * Math.cos(theta)
          );
      }
    }

    row++;
  }

  return J;
}

module.exports = { buildJacobian };
