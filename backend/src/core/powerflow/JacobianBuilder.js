const logger = require('@/infrastructure/logger/logger');

/**
 * JacobianBuilder - Real Jacobian matrix calculations
 * Responsibility: ONLY builds Jacobian with proper partial derivatives
 */
class JacobianBuilder {
  /**
   * Build Jacobian matrix for Newton-Raphson
   * @param {Array} Y - Ybus admittance matrix (Complex objects)
   * @param {Array} V - Voltage vector (Complex objects)
   * @param {Array} buses - Bus data
   * @returns {Array} - Full Jacobian matrix
   */
  static build(Y, V, buses) {
    const _n = buses.length;
    
    // Count PQ and PV buses for Jacobian sizing
    const pqBuses = buses.filter(b => b.type === 'PQ').map((b, i) => ({ bus: b, index: i }));
    const pvBuses = buses.filter(b => b.type === 'PV').map((b, i) => ({ bus: b, index: i }));
    
    const nPQ = pqBuses.length;
    const nPV = pvBuses.length;
    const nVar = 2 * nPQ + nPV; // Total variables: P,Q for PQ + P for PV

    logger.debug(`Building Jacobian: ${nPQ} PQ buses, ${nPV} PV buses, ${nVar} variables`);

    // Initialize full Jacobian matrix (nVar x nVar)
    const J = Array(nVar).fill(null).map(() => Array(nVar).fill(0));

    // Build Jacobian elements
    let row = 0;
    
    // P equations for PQ buses
    for (const { index: i } of pqBuses) {
      for (let j = 0; j < nPQ; j++) {
        const { index: jBus } = pqBuses[j];
        J[row][j] = this._dP_dtheta(i, jBus, Y, V, buses); // dP/dθ
        J[row][j + nPQ] = this._dP_dV(i, jBus, Y, V, buses); // dP/dV
      }
      row++;
    }

    // P equations for PV buses
    for (const { index: i } of pvBuses) {
      for (let j = 0; j < nPQ; j++) {
        const { index: jBus } = pqBuses[j];
        J[row][j] = this._dP_dtheta(i, jBus, Y, V, buses); // dP/dθ
        J[row][j + nPQ] = this._dP_dV(i, jBus, Y, V, buses); // dP/dV
      }
      row++;
    }

    // Q equations for PQ buses only
    for (const { index: i } of pqBuses) {
      for (let j = 0; j < nPQ; j++) {
        const { index: jBus } = pqBuses[j];
        J[row][j] = this._dQ_dtheta(i, jBus, Y, V, buses); // dQ/dθ
        J[row][j + nPQ] = this._dQ_dV(i, jBus, Y, V, buses); // dQ/dV
      }
      row++;
    }

    // Validate Jacobian
    this._validateJacobian(J, nVar);

    // Freeze to prevent mutations
    for (let i = 0; i < nVar; i++) {
      Object.freeze(J[i]);
    }
    Object.freeze(J);

    logger.debug('Jacobian built successfully', {
      size: `${nVar}x${nVar}`,
      condition: this._estimateCondition(J)
    });

    return J;
  }

  /**
   * Partial derivative ∂P_i/∂θ_j
   * @private
   */
  static _dP_dtheta(i, j, Y, V, buses) {
    const n = buses.length;
    const Vi = V[i];
    const Vj = V[j];
    
    if (!Vi || !Vj) return 0;

    const Vi_mag = Vi.mag();
    const Vj_mag = Vj.mag();
    const theta_i = Vi.angle();
    const theta_j = Vj.angle();
    
    const Yij = Y[i][j];
    const Gij = Yij.re;
    const Bij = Yij.im;
    
    const theta_ij = theta_i - theta_j;
    
    if (i === j) {
      // Diagonal element
      let sum = 0;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const Vk = V[k];
          if (!Vk) continue;
          
          const Vk_mag = Vk.mag();
          const theta_k = Vk.angle();
          const Yik = Y[i][k];
          const theta_ik = theta_i - theta_k;
          
          sum += Vk_mag * (-Yik.re * Math.sin(theta_ik) + Yik.im * Math.cos(theta_ik));
        }
      }
      return Vi_mag * sum;
    } else {
      // Off-diagonal element
      return Vi_mag * Vj_mag * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
    }
  }

  /**
   * Partial derivative ∂P_i/∂|V_j|
   * @private
   */
  static _dP_dV(i, j, Y, V, buses) {
    const Vi = V[i];
    const Vj = V[j];
    
    if (!Vi || !Vj) return 0;

    const Vi_mag = Vi.mag();
    const _Vj_mag = Vj.mag();
    const theta_i = Vi.angle();
    const theta_j = Vj.angle();
    
    const Yij = Y[i][j];
    const Gij = Yij.re;
    const Bij = Yij.im;
    
    const theta_ij = theta_i - theta_j;
    
    if (i === j) {
      // Diagonal element
      let sum = 0;
      const n = buses.length;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const Vk = V[k];
          if (!Vk) continue;
          
          const Vk_mag = Vk.mag();
          const theta_k = Vk.angle();
          const Yik = Y[i][k];
          const theta_ik = theta_i - theta_k;
          
          sum += Vk_mag * (Yik.re * Math.cos(theta_ik) + Yik.im * Math.sin(theta_ik));
        }
      }
      return 2 * Vi_mag * Y[i][i].re + sum;
    } else {
      // Off-diagonal element
      return Vi_mag * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
    }
  }

  /**
   * Partial derivative ∂Q_i/∂θ_j
   * @private
   */
  static _dQ_dtheta(i, j, Y, V, buses) {
    const n = buses.length;
    const Vi = V[i];
    const Vj = V[j];
    
    if (!Vi || !Vj) return 0;

    const Vi_mag = Vi.mag();
    const Vj_mag = Vj.mag();
    const theta_i = Vi.angle();
    const theta_j = Vj.angle();
    
    const Yij = Y[i][j];
    const Gij = Yij.re;
    const Bij = Yij.im;
    
    const theta_ij = theta_i - theta_j;
    
    if (i === j) {
      // Diagonal element
      let sum = 0;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const Vk = V[k];
          if (!Vk) continue;
          
          const Vk_mag = Vk.mag();
          const theta_k = Vk.angle();
          const Yik = Y[i][k];
          const theta_ik = theta_i - theta_k;
          
          sum += Vk_mag * (Yik.re * Math.cos(theta_ik) + Yik.im * Math.sin(theta_ik));
        }
      }
      return -Vi_mag * sum;
    } else {
      // Off-diagonal element
      return Vi_mag * Vj_mag * (Gij * Math.cos(theta_ij) + Bij * Math.sin(theta_ij));
    }
  }

  /**
   * Partial derivative ∂Q_i/∂|V_j|
   * @private
   */
  static _dQ_dV(i, j, Y, V, buses) {
    const Vi = V[i];
    const Vj = V[j];
    
    if (!Vi || !Vj) return 0;

    const Vi_mag = Vi.mag();
    const _Vj_mag = Vj.mag();
    const theta_i = Vi.angle();
    const theta_j = Vj.angle();
    
    const Yij = Y[i][j];
    const Gij = Yij.re;
    const Bij = Yij.im;
    
    const theta_ij = theta_i - theta_j;
    
    if (i === j) {
      // Diagonal element
      let sum = 0;
      const n = buses.length;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const Vk = V[k];
          if (!Vk) continue;
          
          const Vk_mag = Vk.mag();
          const theta_k = Vk.angle();
          const Yik = Y[i][k];
          const theta_ik = theta_i - theta_k;
          
          sum += Vk_mag * (-Yik.re * Math.sin(theta_ik) + Yik.im * Math.cos(theta_ik));
        }
      }
      return 2 * Vi_mag * Y[i][i].im + sum;
    } else {
      // Off-diagonal element
      return Vi_mag * (Gij * Math.sin(theta_ij) - Bij * Math.cos(theta_ij));
    }
  }

  /**
   * Validate Jacobian matrix
   * @private
   */
  static _validateJacobian(J, nVar) {
    if (!Array.isArray(J) || J.length !== nVar) {
      throw new Error(`Invalid Jacobian: expected ${nVar} rows`);
    }
    
    for (let i = 0; i < nVar; i++) {
      if (!Array.isArray(J[i]) || J[i].length !== nVar) {
        throw new Error(`Invalid Jacobian: row ${i} wrong dimensions, expected ${nVar} columns`);
      }
      
      for (let j = 0; j < nVar; j++) {
        if (!isFinite(J[i][j])) {
          throw new Error(`Invalid Jacobian[${i}][${j}]: ${J[i][j]}`);
        }
      }
    }
  }

  /**
   * Estimate Jacobian condition number
   * @private
   */
  static _estimateCondition(J) {
    // Simple condition estimation using Frobenius norm
    let norm = 0;
    
    for (let i = 0; i < J.length; i++) {
      for (let j = 0; j < J[i].length; j++) {
        norm += J[i][j] * J[i][j];
      }
    }
    
    return Math.sqrt(norm);
  }
}

module.exports = { JacobianBuilder };
