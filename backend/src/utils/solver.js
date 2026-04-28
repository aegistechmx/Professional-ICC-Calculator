/**
 * Linear solver for load flow
 * Implements Gaussian elimination for solving J * dx = mismatch
 */

/**
 * Solve linear system Ax = b using Gaussian elimination
 * @param {Array} A - Coefficient matrix (n x n)
 * @param {Array} b - Right-hand side vector (n)
 * @returns {Array} Solution vector x
 */
function resolverSistema(A, b) {
  const n = b.length;

  // Create augmented matrix
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    // Check for singular matrix
    if (Math.abs(aug[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular');
    }

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

/**
 * Solve linear system using LU decomposition (more stable)
 * @param {Array} A - Coefficient matrix (n x n)
 * @param {Array} b - Right-hand side vector (n)
 * @returns {Array} Solution vector x
 */
function resolverLU(A, b) {
  const n = b.length;

  // LU decomposition
  const L = Array(n).fill(0).map(() => Array(n).fill(0));
  const U = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    // Upper triangular
    for (let k = i; k < n; k++) {
      let sum = 0;
      for (let j = 0; j < i; j++) {
        sum += L[i][j] * U[j][k];
      }
      U[i][k] = A[i][k] - sum;
    }

    // Lower triangular
    for (let k = i; k < n; k++) {
      if (i === k) {
        L[i][i] = 1;
      } else {
        let sum = 0;
        for (let j = 0; j < i; j++) {
          sum += L[k][j] * U[j][i];
        }
        L[k][i] = (A[k][i] - sum) / U[i][i];
      }
    }
  }

  // Solve Ly = b (forward substitution)
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = b[i];
    for (let j = 0; j < i; j++) {
      y[i] -= L[i][j] * y[j];
    }
    y[i] /= L[i][i];
  }

  // Solve Ux = y (back substitution)
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i + 1; j < n; j++) {
      x[i] -= U[i][j] * x[j];
    }
    x[i] /= U[i][i];
  }

  return x;
}

/**
 * Solve using sparse matrix (simplified for now)
 * For large systems, use specialized sparse solvers
 */
function resolverSparse(A, b) {
  // For now, fall back to Gaussian elimination
  return resolverSistema(A, b);
}

module.exports = {
  resolverSistema,
  resolverLU,
  resolverSparse
};
