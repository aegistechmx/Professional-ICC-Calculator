/**
 * generator.js - Contingency scenario generator
 * 
 * Responsibility: Generate N-1 contingency scenarios
 * NO Express, NO axios, NO UI logic
 */

/**
 * Generate N-1 contingency scenarios
 * @param {Object} model - System model
 * @returns {Array} Array of contingency scenarios
 */
function generateN1Contingencies(model) {
  const contingencies = [];

  // Line outages
  model.branches.forEach(branch => {
    contingencies.push({
      type: 'line_outage',
      elementId: branch.id,
      from: branch.from,
      to: branch.to,
      apply: (m) => removeLine(m, branch.id)
    });
  });

  // Generator outages (PV buses with generation)
  model.buses.forEach(bus => {
    if (bus.type === 'PV' && bus.P > 0) {
      contingencies.push({
        type: 'generator_outage',
        elementId: bus.id,
        apply: (m) => removeGenerator(m, bus.id)
      });
    }
  });

  return contingencies;
}

/**
 * Clone model for contingency testing
 * @param {Object} model - Original model
 * @returns {Object} Cloned model
 */
function cloneModel(model) {
  return JSON.parse(JSON.stringify(model));
}

/**
 * Remove line from model
 * @param {Object} model - System model
 * @param {number} lineId - Line ID to remove
 * @returns {Object} Modified model
 */
function removeLine(model, lineId) {
  const cloned = cloneModel(model);
  cloned.branches = cloned.branches.filter(b => b.id !== lineId);
  return cloned;
}

/**
 * Remove generator from model
 * @param {Object} model - System model
 * @param {number} busId - Bus ID where generator is located
 * @returns {Object} Modified model
 */
function removeGenerator(model, busId) {
  const cloned = cloneModel(model);
  const bus = cloned.buses.find(b => b.id === busId);
  if (bus) {
    bus.P = 0;
    bus.type = 'PQ';
  }
  return cloned;
}

/**
 * Generate N-2 contingencies (combinations of 2 outages)
 * @param {Object} model - System model
 * @param {number} maxCombinations - Maximum combinations to generate
 * @returns {Array} Array of N-2 contingency scenarios
 */
function generateN2Contingencies(model, maxCombinations = 50) {
  const contingencies = [];
  const branches = model.branches;
  const generators = model.buses.filter(b => b.type === 'PV' && b.P > 0);

  let count = 0;

  // Branch-Branch combinations
  for (let i = 0; i < branches.length && count < maxCombinations; i++) {
    for (let j = i + 1; j < branches.length && count < maxCombinations; j++) {
      contingencies.push({
        type: 'line_line_outage',
        elementIds: [branches[i].id, branches[j].id],
        apply: (m) => {
          const cloned = cloneModel(m);
          cloned.branches = cloned.branches.filter(b => 
            b.id !== branches[i].id && b.id !== branches[j].id
          );
          return cloned;
        }
      });
      count++;
    }
  }

  // Branch-Generator combinations
  for (const branch of branches) {
    for (const gen of generators) {
      if (count >= maxCombinations) break;
      
      contingencies.push({
        type: 'line_generator_outage',
        elementIds: [branch.id, gen.id],
        apply: (m) => {
          const cloned = cloneModel(m);
          cloned.branches = cloned.branches.filter(b => b.id !== branch.id);
          const bus = cloned.buses.find(b => b.id === gen.id);
          if (bus) {
            bus.P = 0;
            bus.type = 'PQ';
          }
          return cloned;
        }
      });
      count++;
    }
    if (count >= maxCombinations) break;
  }

  return contingencies;
}

module.exports = {
  generateN1Contingencies,
  generateN2Contingencies,
  cloneModel,
  removeLine,
  removeGenerator
};
