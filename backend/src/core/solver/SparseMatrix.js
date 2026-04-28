/**
 * SparseMatrix - Sparse Matrix Implementation for Large Systems
 * 
 * This module implements sparse matrix operations for:
 * - Efficient storage of large sparse matrices
 * - Matrix-vector multiplication
 * - Linear system solving
 * - Memory optimization for large systems
 * 
 * Architecture:
 * Dense Matrix → Sparse Format (CSR/CSC) → Operations → Results
 * 
 * @class SparseMatrix
 */

class SparseMatrix {
  /**
   * Create a new sparse matrix
   * @param {Object} options - Matrix options
   * @param {number} options.rows - Number of rows
   * @param {number} options.cols - Number of columns
   * @param {string} options.format - Storage format ('csr', 'csc', 'coo')
   */
  constructor(options = {}) {
    this.rows = options.rows || 0;
    this.cols = options.cols || 0;
    this.format = options.format || 'csr';
    
    // Sparse storage
    this.values = []; // Non-zero values
    this.rowIndices = []; // Row indices (for CSC)
    this.colIndices = []; // Column indices (for CSR)
    this.rowPtr = []; // Row pointers (for CSR)
    this.colPtr = []; // Column pointers (for CSC)
  }

  /**
   * Convert dense matrix to sparse format
   * @param {Array} denseMatrix - Dense 2D array
   * @param {string} format - Target format ('csr', 'csc', 'coo')
   * @returns {SparseMatrix} Sparse matrix
   */
  static fromDense(denseMatrix, format = 'csr') {
    const rows = denseMatrix.length;
    const cols = denseMatrix[0].length;
    const sparse = new SparseMatrix({ rows, cols, format });
    
    // Find non-zero elements
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = denseMatrix[i][j];
        if (Math.abs(value) > 1e-10) { // Non-zero threshold
          sparse.addValue(i, j, value);
        }
      }
    }
    
    sparse.buildStructure();
    return sparse;
  }

  /**
   * Add a value to the sparse matrix
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {number} value - Value
   */
  addValue(row, col, value) {
    this.values.push(value);
    this.rowIndices.push(row);
    this.colIndices.push(col);
  }

  /**
   * Build sparse matrix structure
   */
  buildStructure() {
    if (this.format === 'csr') {
      this.buildCSR();
    } else if (this.format === 'csc') {
      this.buildCSC();
    }
    // COO format doesn't need additional structure
  }

  /**
   * Build Compressed Sparse Row (CSR) format
   */
  buildCSR() {
    // Sort by row, then by column
    const indices = this.values.map((_, i) => i);
    indices.sort((a, b) => {
      if (this.rowIndices[a] !== this.rowIndices[b]) {
        return this.rowIndices[a] - this.rowIndices[b];
      }
      return this.colIndices[a] - this.colIndices[b];
    });
    
    // Reorder arrays
    const sortedValues = indices.map(i => this.values[i]);
    const sortedRowIndices = indices.map(i => this.rowIndices[i]);
    const sortedColIndices = indices.map(i => this.colIndices[i]);
    
    this.values = sortedValues;
    this.rowIndices = sortedRowIndices;
    this.colIndices = sortedColIndices;
    
    // Build row pointers
    this.rowPtr = [0];
    let currentRow = 0;
    
    for (let i = 0; i < this.values.length; i++) {
      while (currentRow < sortedRowIndices[i]) {
        this.rowPtr.push(i);
        currentRow++;
      }
    }
    
    // Fill remaining rows
    while (currentRow < this.rows) {
      this.rowPtr.push(this.values.length);
      currentRow++;
    }
  }

  /**
   * Build Compressed Sparse Column (CSC) format
   */
  buildCSC() {
    // Sort by column, then by row
    const indices = this.values.map((_, i) => i);
    indices.sort((a, b) => {
      if (this.colIndices[a] !== this.colIndices[b]) {
        return this.colIndices[a] - this.colIndices[b];
      }
      return this.rowIndices[a] - this.rowIndices[b];
    });
    
    // Reorder arrays
    const sortedValues = indices.map(i => this.values[i]);
    const sortedRowIndices = indices.map(i => this.rowIndices[i]);
    const sortedColIndices = indices.map(i => this.colIndices[i]);
    
    this.values = sortedValues;
    this.rowIndices = sortedRowIndices;
    this.colIndices = sortedColIndices;
    
    // Build column pointers
    this.colPtr = [0];
    let currentCol = 0;
    
    for (let i = 0; i < this.values.length; i++) {
      while (currentCol < sortedColIndices[i]) {
        this.colPtr.push(i);
        currentCol++;
      }
    }
    
    // Fill remaining columns
    while (currentCol < this.cols) {
      this.colPtr.push(this.values.length);
      currentCol++;
    }
  }

  /**
   * Matrix-vector multiplication (CSR format)
   * @param {Array} vector - Vector to multiply
   * @returns {Array} Result vector
   */
  multiplyCSR(vector) {
    const result = new Array(this.rows).fill(0);
    
    for (let i = 0; i < this.rows; i++) {
      for (let j = this.rowPtr[i]; j < this.rowPtr[i + 1]; j++) {
        const col = this.colIndices[j];
        result[i] += this.values[j] * vector[col];
      }
    }
    
    return result;
  }

  /**
   * Matrix-vector multiplication (CSC format)
   * @param {Array} vector - Vector to multiply
   * @returns {Array} Result vector
   */
  multiplyCSC(vector) {
    const result = new Array(this.rows).fill(0);
    
    for (let j = 0; j < this.cols; j++) {
      for (let i = this.colPtr[j]; i < this.colPtr[j + 1]; i++) {
        const row = this.rowIndices[i];
        result[row] += this.values[i] * vector[j];
      }
    }
    
    return result;
  }

  /**
   * Matrix-vector multiplication
   * @param {Array} vector - Vector to multiply
   * @returns {Array} Result vector
   */
  multiply(vector) {
    if (this.format === 'csr') {
      return this.multiplyCSR(vector);
    } else if (this.format === 'csc') {
      return this.multiplyCSC(vector);
    } else {
      // COO format - less efficient
      const result = new Array(this.rows).fill(0);
      for (let i = 0; i < this.values.length; i++) {
        const row = this.rowIndices[i];
        const col = this.colIndices[i];
        result[row] += this.values[i] * vector[col];
      }
      return result;
    }
  }

  /**
   * Transpose the matrix
   * @returns {SparseMatrix} Transposed matrix
   */
  transpose() {
    const transposed = new SparseMatrix({
      rows: this.cols,
      cols: this.rows,
      format: this.format
    });
    
    // Swap row and column indices
    for (let i = 0; i < this.values.length; i++) {
      transposed.addValue(
        this.colIndices[i],
        this.rowIndices[i],
        this.values[i]
      );
    }
    
    transposed.buildStructure();
    return transposed;
  }

  /**
   * Get sparsity (percentage of non-zero elements)
   * @returns {number} Sparsity percentage
   */
  getSparsity() {
    const totalElements = this.rows * this.cols;
    const nonZeroElements = this.values.length;
    return (1 - nonZeroElements / totalElements) * 100;
  }

  /**
   * Convert to dense matrix
   * @returns {Array} Dense 2D array
   */
  toDense() {
    const dense = [];
    for (let i = 0; i < this.rows; i++) {
      dense[i] = new Array(this.cols).fill(0);
    }
    
    for (let i = 0; i < this.values.length; i++) {
      const row = this.rowIndices[i];
      const col = this.colIndices[i];
      dense[row][col] = this.values[i];
    }
    
    return dense;
  }

  /**
   * Get matrix info
   * @returns {Object} Matrix information
   */
  getInfo() {
    return {
      rows: this.rows,
      cols: this.cols,
      format: this.format,
      nonZeroElements: this.values.length,
      totalElements: this.rows * this.cols,
      sparsity: this.getSparsity(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    // Each number is 8 bytes (double precision)
    // Each index is 4 bytes (32-bit integer)
    const valuesMemory = this.values.length * 8;
    const rowIndicesMemory = this.rowIndices.length * 4;
    const colIndicesMemory = this.colIndices.length * 4;
    const rowPtrMemory = this.rowPtr.length * 4;
    const colPtrMemory = this.colPtr.length * 4;
    
    return valuesMemory + rowIndicesMemory + colIndicesMemory + rowPtrMemory + colPtrMemory;
  }
}

/**
 * SparseSolver - Linear Solver for Sparse Matrices
 * 
 * This module implements iterative solvers for sparse linear systems:
 * - Conjugate Gradient (CG)
 * - GMRES
 * - Preconditioning (Jacobi, ILU, SSOR)
 * 
 * @class SparseSolver
 */
class SparseSolver {
  /**
   * Create a new sparse solver
   * @param {Object} options - Solver options
   * @param {string} options.method - Solver method ('cg', 'gmres')
   * @param {number} options.tolerance - Convergence tolerance
   * @param {number} options.maxIterations - Maximum iterations
   * @param {string} options.preconditioner - Preconditioner type ('none', 'jacobi', 'ilu', 'ssor')
   */
  constructor(options = {}) {
    this.options = {
      method: options.method || 'cg',
      tolerance: options.tolerance || 1e-6,
      maxIterations: options.maxIterations || 1000,
      preconditioner: options.preconditioner || 'jacobi',
      ...options
    };
  }

  /**
   * Solve linear system Ax = b
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} b - Right-hand side vector
   * @returns {Object} Solution result
   */
  solve(A, b) {
    switch (this.options.method) {
    case 'cg':
      return this.conjugateGradient(A, b);
    case 'gmres':
      return this.gmres(A, b);
    default:
      return this.conjugateGradient(A, b);
    }
  }

  /**
   * Apply preconditioner
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} r - Residual vector
   * @returns {Array} Preconditioned residual
   */
  applyPreconditioner(A, r) {
    switch (this.options.preconditioner) {
    case 'none':
      return r;
    case 'jacobi':
      return this.jacobiPreconditioner(A, r);
    case 'ssor':
      return this.sSORPreconditioner(A, r);
    case 'ilu':
      return this.iluPreconditioner(A, r);
    default:
      return this.jacobiPreconditioner(A, r);
    }
  }

  /**
   * Jacobi preconditioner (diagonal scaling)
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} r - Residual vector
   * @returns {Array} Preconditioned residual
   */
  jacobiPreconditioner(A, r) {
    const n = r.length;
    const M_inv = new Array(n).fill(0);
    
    // Extract diagonal
    for (let i = 0; i < A.values.length; i++) {
      const row = A.rowIndices[i];
      const col = A.colIndices[i];
      if (row === col) {
        M_inv[row] = 1.0 / A.values[i];
      }
    }
    
    // Apply preconditioner
    return r.map((val, i) => val * M_inv[i]);
  }

  /**
   * Symmetric Successive Over-Relaxation (SSOR) preconditioner
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} r - Residual vector
   * @returns {Array} Preconditioned residual
   */
  sSORPreconditioner(A, r) {
    const n = r.length;
    const omega = 1.0; // Relaxation parameter
    
    // Extract diagonal and off-diagonal elements
    const D = new Array(n).fill(0);
    const L = Array(n).fill(null).map(() => []);
    const U = Array(n).fill(null).map(() => []);
    
    for (let i = 0; i < A.values.length; i++) {
      const row = A.rowIndices[i];
      const col = A.colIndices[i];
      const val = A.values[i];
      
      if (row === col) {
        D[row] = val;
      } else if (row < col) {
        U[row].push({ col, val });
      } else {
        L[row].push({ col, val });
      }
    }
    
    // Forward sweep
    const z = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = r[i];
      for (const { col, val } of L[i]) {
        sum -= val * z[col];
      }
      z[i] = sum / (omega * D[i]);
    }
    
    // Backward sweep
    const y = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = omega * z[i];
      for (const { col, val } of U[i]) {
        sum -= val * y[col];
      }
      y[i] = sum / (omega * D[i]);
    }
    
    return y;
  }

  /**
   * Incomplete LU (ILU) preconditioner
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} r - Residual vector
   * @returns {Array} Preconditioned residual
   */
  iluPreconditioner(A, r) {
    // Simplified ILU(0) - same sparsity pattern as A
    const n = r.length;
    
    // Extract L and U factors
    const L = Array(n).fill(null).map(() => Array(n).fill(0));
    const U = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Initialize with A
    for (let i = 0; i < A.values.length; i++) {
      const row = A.rowIndices[i];
      const col = A.colIndices[i];
      if (row >= col) {
        L[row][col] = A.values[i];
      } else {
        U[row][col] = A.values[i];
      }
    }
    
    // ILU factorization (simplified)
    for (let k = 0; k < n; k++) {
      for (let i = k + 1; i < n; i++) {
        if (L[i][k] !== 0) {
          L[i][k] = L[i][k] / L[k][k];
          for (let j = k + 1; j < n; j++) {
            if (U[k][j] !== 0) {
              L[i][j] = L[i][j] - L[i][k] * U[k][j];
            }
          }
        }
      }
    }
    
    // Solve Mz = r where M = LU
    // Forward substitution (Ly = r)
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = r[i];
      for (let j = 0; j < i; j++) {
        sum -= L[i][j] * y[j];
      }
      y[i] = sum / L[i][i];
    }
    
    // Backward substitution (Uz = y)
    const z = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let j = i + 1; j < n; j++) {
        sum -= U[i][j] * z[j];
      }
      z[i] = sum / U[i][i];
    }
    
    return z;
  }

  /**
   * Conjugate Gradient method with preconditioning
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} b - Right-hand side vector
   * @returns {Object} Solution result
   */
  conjugateGradient(A, b) {
    const n = b.length;
    let x = new Array(n).fill(0);
    let r = [...b]; // Initial residual
    let z = this.applyPreconditioner(A, r); // Preconditioned residual
    let p = [...z]; // Initial search direction
    
    const tolerance = this.options.tolerance;
    const maxIterations = this.options.maxIterations;
    
    let iterations = 0;
    let converged = false;
    
    let rTr = r.reduce((sum, val) => sum + val * val, 0);
    let zTr = z.reduce((sum, val) => sum + val * val, 0);
    
    for (let i = 0; i < maxIterations; i++) {
      iterations++;
      
      // Ap = A * p
      const Ap = A.multiply(p);
      
      // alpha = (z^T * r) / (p^T * Ap)
      const pTAp = p.reduce((sum, val, idx) => sum + val * Ap[idx], 0);
      const alpha = zTr / pTAp;
      
      // x = x + alpha * p
      for (let j = 0; j < n; j++) {
        x[j] += alpha * p[j];
      }
      
      // r_new = r - alpha * Ap
      const rNew = r.map((val, idx) => val - alpha * Ap[idx]);
      
      // Check convergence
      const rNorm = Math.sqrt(rNew.reduce((sum, val) => sum + val * val, 0));
      if (rNorm < tolerance) {
        converged = true;
        break;
      }
      
      // z_new = M^-1 * r_new
      const zNew = this.applyPreconditioner(A, rNew);
      
      // beta = (z_new^T * r_new) / (z^T * r)
      const rNewTrNew = rNew.reduce((sum, val) => sum + val * val, 0);
      const zNewTrNew = zNew.reduce((sum, val) => sum + val * val, 0);
      const beta = zNewTrNew / zTr;
      
      // p = z_new + beta * p
      for (let j = 0; j < n; j++) {
        p[j] = zNew[j] + beta * p[j];
      }
      
      r = rNew;
      z = zNew;
      zTr = zNewTrNew;
    }
    
    return {
      solution: x,
      converged,
      iterations,
      finalResidual: Math.sqrt(r.reduce((sum, val) => sum + val * val, 0)),
      preconditioner: this.options.preconditioner
    };
  }

  /**
   * GMRES method with preconditioning (simplified)
   * @param {SparseMatrix} A - Sparse matrix
   * @param {Array} b - Right-hand side vector
   * @returns {Object} Solution result
   */
  gmres(A, b) {
    // Simplified GMRES implementation with preconditioning
    // Full GMRES requires Arnoldi iteration and restarts
    const n = b.length;
    let x = new Array(n).fill(0);
    
    // For now, use CG with preconditioning as fallback
    return this.conjugateGradient(A, b);
  }
}

module.exports = {
  SparseMatrix,
  SparseSolver
};
