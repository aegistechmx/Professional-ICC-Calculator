/**
 * Solver - Sparse Matrix Solver for Large Systems
 * 
 * This module exports sparse matrix utilities and iterative solvers
 * for efficient computation with large sparse systems.
 * 
 * Architecture:
 * Dense Matrix → Sparse Format → Solver → Solution
 */

const { SparseMatrix, SparseSolver } = require('./SparseMatrix');

module.exports = {
  SparseMatrix,
  SparseSolver
};
