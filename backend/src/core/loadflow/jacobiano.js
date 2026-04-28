/**
 * Jacobian matrix construction for Newton-Raphson load flow
 * Builds the H, N, M, L submatrices
 */

/**
 * Construct Jacobian matrix for Newton-Raphson
 * J = [H  N]
 *     [M  L]
 * @param {Array} buses - Array of Bus objects
 * @param {Array} Y - Ybus matrix
 * @returns {Array} Jacobian matrix
 */
function construirJacobiano(buses, Y) {
  const n = buses.length;

  // Count number of PQ and PV buses
  let nPQ = 0;
  let nPV = 0;
  buses.forEach(b => {
    if (b.tipo === 'pq') nPQ++;
    if (b.tipo === 'pv') nPV++;
  });

  const nUnknown = 2 * nPQ + nPV; // Total unknowns
  const J = Array(nUnknown).fill(0).map(() => Array(nUnknown).fill(0));

  // Build Jacobian submatrices
  let row = 0;
  let col = 0;

  for (let i = 0; i < n; i++) {
    if (buses[i].tipo === 'slack') continue;

    const Vi = buses[i].V;
    const thetai = buses[i].ang;

    for (let j = 0; j < n; j++) {
      if (buses[j].tipo === 'slack') continue;

      const Vj = buses[j].V;
      const thetaj = buses[j].ang;

      const Gij = Y[i][j].re;
      const Bij = Y[i][j].im;

      const theta = thetai - thetaj;

      // H submatrix: ∂P/∂θ
      if (buses[i].tipo !== 'slack' && buses[j].tipo !== 'slack') {
        if (i === j) {
          J[row][col] = -Vi * Vi * Bij - Vi * sumQij(buses, Y, i);
        } else {
          J[row][col] = Vi * Vj * (Gij * Math.sin(theta) - Bij * Math.cos(theta));
        }
        col++;
      }

      // N submatrix: ∂P/∂V
      if (buses[i].tipo !== 'slack' && buses[j].tipo === 'pq') {
        if (i === j) {
          J[row][col] = Vi * Gij + sumPij(buses, Y, i) / Vi;
        } else {
          J[row][col] = Vi * (Gij * Math.cos(theta) + Bij * Math.sin(theta));
        }
        col++;
      }
    }

    // Reset column for next row
    col = 0;
    row++;

    // M submatrix: ∂Q/∂θ (only for PQ buses)
    if (buses[i].tipo === 'pq') {
      for (let j = 0; j < n; j++) {
        if (buses[j].tipo === 'slack') continue;

        const Vj = buses[j].V;
        const thetaj = buses[j].ang;

        const Gij = Y[i][j].re;
        const Bij = Y[i][j].im;

        const theta = thetai - thetaj;

        if (i === j) {
          J[row][col] = Vi * Vi * Gij - Vi * sumPij(buses, Y, i);
        } else {
          J[row][col] = -Vi * Vj * (Gij * Math.cos(theta) + Bij * Math.sin(theta));
        }
        col++;
      }
      row++;
    }

    // L submatrix: ∂Q/∂V (only for PQ buses)
    if (buses[i].tipo === 'pq') {
      for (let j = 0; j < n; j++) {
        if (buses[j].tipo === 'pq') continue;

        const Vj = buses[j].V;
        const thetaj = buses[j].ang;

        const Gij = Y[i][j].re;
        const Bij = Y[i][j].im;

        const theta = thetai - thetaj;

        if (i === j) {
          J[row][col] = -Vi * Bij + sumQij(buses, Y, i) / Vi;
        } else {
          J[row][col] = Vi * (Gij * Math.sin(theta) - Bij * Math.cos(theta));
        }
        col++;
      }
      row++;
    }
  }

  return J;
}

/**
 * Helper: calculate sum of Pij for diagonal elements
 */
function sumPij(buses, Y, i) {
  let sum = 0;
  const Vi = buses[i].V;
  const thetai = buses[i].ang;

  for (let j = 0; j < buses.length; j++) {
    const Vj = buses[j].V;
    const thetaj = buses[j].ang;
    const Gij = Y[i][j].re;
    const Bij = Y[i][j].im;
    const theta = thetai - thetaj;
    sum += Vj * (Gij * Math.cos(theta) + Bij * Math.sin(theta));
  }

  return sum;
}

/**
 * Helper: calculate sum of Qij for diagonal elements
 */
function sumQij(buses, Y, i) {
  let sum = 0;
  const Vi = buses[i].V;
  const thetai = buses[i].ang;

  for (let j = 0; j < buses.length; j++) {
    const Vj = buses[j].V;
    const thetaj = buses[j].ang;
    const Gij = Y[i][j].re;
    const Bij = Y[i][j].im;
    const theta = thetai - thetaj;
    sum += Vj * (Gij * Math.sin(theta) - Bij * Math.cos(theta));
  }

  return sum;
}

/**
 * Simplified Jacobian (decoupled method)
 * Faster but less accurate for highly stressed systems
 */
function construirJacobianoDesacoplado(buses, Y) {
  const n = buses.length;
  const J = Array(n).fill(0).map(() => Array(n).fill(0));

  // B' matrix for active power (simplified)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        J[i][j] = -Y[i][i].im;
      } else {
        J[i][j] = Y[i][j].im;
      }
    }
  }

  return J;
}

module.exports = {
  construirJacobiano,
  construirJacobianoDesacoplado
};
