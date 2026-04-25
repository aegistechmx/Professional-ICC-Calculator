/**
 * Power calculation for load flow
 * Calculates active (P) and reactive (Q) power at each bus
 */

/**
 * Calculate active and reactive power at all buses
 * @param {Array} buses - Array of Bus objects
 * @param {Array} Y - Ybus matrix
 * @returns {Object} {P, Q} Arrays of calculated powers
 */
function calcularPQ(buses, Y) {
  const n = buses.length;
  const P = Array(n).fill(0);
  const Q = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const Vi = buses[i].V;
    const thetai = buses[i].ang;

    let Pi = 0;
    let Qi = 0;

    for (let j = 0; j < n; j++) {
      const Vj = buses[j].V;
      const thetaj = buses[j].ang;

      const Gij = Y[i][j].re;
      const Bij = Y[i][j].im;

      const theta = thetai - thetaj;

      // Active power equation
      Pi += Vi * Vj * (Gij * Math.cos(theta) + Bij * Math.sin(theta));

      // Reactive power equation
      Qi += Vi * Vj * (Gij * Math.sin(theta) - Bij * Math.cos(theta));
    }

    P[i] = Pi;
    Q[i] = Qi;
  }

  return { P, Q };
}

/**
 * Calculate power mismatch (difference between specified and calculated)
 * @param {Array} buses - Array of Bus objects
 * @param {Array} Pcalc - Calculated active powers
 * @param {Array} Qcalc - Calculated reactive powers
 * @returns {Object} {mismatchP, mismatchQ, mismatch} Power mismatches
 */
function calcularMismatch(buses, Pcalc, Qcalc) {
  const n = buses.length;
  const mismatchP = Array(n).fill(0);
  const mismatchQ = Array(n).fill(0);
  const mismatch = [];

  for (let i = 0; i < n; i++) {
    const bus = buses[i];

    if (bus.tipo === 'pq' || bus.tipo === 'pv') {
      // Active power mismatch
      const Pesp = bus.getPnet();
      mismatchP[i] = Pesp - Pcalc[i];
      mismatch.push(mismatchP[i]);
    }

    if (bus.tipo === 'pq') {
      // Reactive power mismatch
      const Qesp = bus.getQnet();
      mismatchQ[i] = Qesp - Qcalc[i];
      mismatch.push(mismatchQ[i]);
    }
  }

  return { mismatchP, mismatchQ, mismatch };
}

/**
 * Calculate total system losses
 * @param {Array} buses - Array of Bus objects
 * @param {Array} Pcalc - Calculated active powers
 * @param {Array} Qcalc - Calculated reactive powers
 * @returns {Object} {Ploss, Qloss} Total losses
 */
function calcularPerdidas(buses, Pcalc, Qcalc) {
  let Pgen = 0;
  let Pload = 0;
  let Qgen = 0;
  let Qload = 0;

  buses.forEach((bus, i) => {
    Pgen += bus.Pg;
    Pload += bus.Pd;
    Qgen += bus.Qg;
    Qload += bus.Qd;
  });

  const Ploss = Pgen - Pload;
  const Qloss = Qgen - Qload;

  return { Ploss, Qloss };
}

/**
 * Calculate power flow on a line
 * @param {Array} Y - Ybus matrix
 * @param {Array} buses - Array of Bus objects
 * @param {number} from - From bus index
 * @param {number} to - To bus index
 * @returns {Object} {Pij, Qij, Pji, Qji} Power flows
 */
function calcularFlujoLinea(Y, buses, from, to) {
  const Vi = buses[from].V;
  const Vj = buses[to].V;
  const thetai = buses[from].ang;
  const thetaj = buses[to].ang;

  const Gij = Y[from][to].re;
  const Bij = Y[from][to].im;
  const Gii = Y[from][from].re;
  const Bii = Y[from][from].im;

  const theta = thetai - thetaj;

  // Power flow from i to j
  const Pij = Vi * Vi * (Gij + Gii) - Vi * Vj * (Gij * Math.cos(theta) + Bij * Math.sin(theta));
  const Qij = -Vi * Vi * (Bij + Bii) - Vi * Vj * (Gij * Math.sin(theta) - Bij * Math.cos(theta));

  // Power flow from j to i
  const Pji = Vj * Vj * (Gij + Gii) - Vi * Vj * (Gij * Math.cos(-theta) + Bij * Math.sin(-theta));
  const Qji = -Vj * Vj * (Bij + Bii) - Vi * Vj * (Gij * Math.sin(-theta) - Bij * Math.cos(-theta));

  return { Pij, Qij, Pji, Qji };
}

module.exports = {
  calcularPQ,
  calcularMismatch,
  calcularPerdidas,
  calcularFlujoLinea
};
