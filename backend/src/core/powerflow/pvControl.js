/**
 * pvControl.js - PV bus Q limit enforcement and dynamic switching
 * 
 * Responsibility: Enforce Qmin/Qmax limits and handle PV↔PQ switching
 * NO Express, NO axios, NO UI logic
 */

/**
 * Enforce PV Q limits and handle dynamic PV↔PQ switching
 * @param {Object} system - Power system data
 * @param {Array} Q - Reactive power injections
 * @param {Array} pvBuses - Current PV bus indices
 * @param {Array} pqBuses - Current PQ bus indices
 * @returns {Object} Updated bus indices { pvBuses, pqBuses }
 */
function enforcePVLimits(system, Q, pvBuses, pqBuses) {
  const newPV = [];
  const newPQ = [...pqBuses];

  // Check PV buses for Q limit violations
  pvBuses.forEach(i => {
    const bus = system.buses[i];
    const Qi = Q[i];

    if (Qi < bus.Qmin) {
      // Violate Qmin - switch to PQ and clamp Q
      bus.Q = bus.Qmin;
      bus.type = 'PQ';
      newPQ.push(i);
    } else if (Qi > bus.Qmax) {
      // Violate Qmax - switch to PQ and clamp Q
      bus.Q = bus.Qmax;
      bus.type = 'PQ';
      newPQ.push(i);
    } else {
      // Within limits - remain PV
      newPV.push(i);
    }
  });

  // Attempt to restore PV status for buses that came back within limits
  const finalPQ = [];
  newPQ.forEach(i => {
    const bus = system.buses[i];
    if (bus.type === 'PQ' && bus.Vset !== undefined) {
      const Qi = Q[i];
      if (Qi > bus.Qmin && Qi < bus.Qmax) {
        // Back within limits - restore PV control
        bus.type = 'PV';
        bus.Q = 0; // PV buses control Q, don't fix it
        newPV.push(i);
      } else {
        finalPQ.push(i);
      }
    } else {
      finalPQ.push(i);
    }
  });

  return { pvBuses: newPV, pqBuses: finalPQ };
}

module.exports = { enforcePVLimits };
