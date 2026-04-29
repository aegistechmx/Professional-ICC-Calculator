/**
 * stabilityCriteria.js - Stability criteria for TS-SCOPF
 * 
 * Responsibility: Evaluate system stability using various criteria
 * NO Express, NO axios, NO UI logic
 */

/**
 * Check angle difference stability criterion
 * @param {Array} generators - Generator states
 * @param {Object} options - Stability options
 * @returns {Object} Angle stability check
 */
function checkAngleStability(generators, options = {}) {
  const {
    maxAngleDiff = Math.PI, // 180 degrees
    referenceGenerator = 0 // Use first generator as reference
  } = options;

  let maxDifference = 0;
  let stable = true;
  const criticalGenerators = [];

  generators.forEach((gen, i) => {
    if (i === referenceGenerator) return;

    const angleDiff = Math.abs(gen.delta - generators[referenceGenerator].delta);
    maxDifference = Math.max(maxDifference, angleDiff);

    if (angleDiff > maxAngleDiff) {
      stable = false;
      criticalGenerators.push({
        id: gen.id,
        angleDiff,
        angleDiffDegrees: angleDiff * 180 / Math.PI,
        delta: gen.delta,
        referenceDelta: generators[referenceGenerator].delta
      });
    }
  });

  return {
    stable,
    maxAngleDifference: maxDifference,
    maxAngleDifferenceDegrees: maxDifference * 180 / Math.PI,
    criticalGenerators,
    margin: maxAngleDiff - maxDifference
  };
}

/**
 * Check speed deviation stability criterion
 * @param {Array} generators - Generator states
 * @param {Object} options - Stability options
 * @returns {Object} Speed stability check
 */
function checkSpeedStability(generators, options = {}) {
  const {
    nominalSpeed = 1.0, // Synchronous speed
    maxSpeedDeviation = 0.5, // 50% deviation
    minSpeed = 0.5,
    maxSpeed = 1.5
  } = options;

  let maxDeviation = 0;
  let stable = true;
  const criticalGenerators = [];

  generators.forEach(gen => {
    const speedDeviation = Math.abs(gen.omega - nominalSpeed);
    maxDeviation = Math.max(maxDeviation, speedDeviation);

    if (speedDeviation > maxSpeedDeviation || 
        gen.omega < minSpeed || 
        gen.omega > maxSpeed) {
      stable = false;
      criticalGenerators.push({
        id: gen.id,
        speedDeviation,
        speedDeviationPercent: speedDeviation * 100,
        omega: gen.omega,
        nominalSpeed
      });
    }
  });

  return {
    stable,
    maxSpeedDeviation,
    maxSpeedDeviationPercent: maxDeviation * 100,
    criticalGenerators,
    margin: maxSpeedDeviation - maxDeviation
  };
}

/**
 * Check equal area criterion for transient stability
 * @param {Array} trajectory - Generator angle trajectory
 * @param {Object} options - Stability options
 * @returns {Object} Equal area criterion check
 */
function checkEqualAreaCriterion(trajectory, options = {}) {
  const {
    angleLimit = Math.PI, // 180 degrees
    timeWindow = 1.0 // seconds to analyze
  } = options;

  if (trajectory.length < 3) {
    return { stable: false, reason: 'Insufficient data points' };
  }

  // Find fault clearing point
  const clearingIndex = trajectory.findIndex(point => point.faultCleared);
  if (clearingIndex === -1) {
    return { stable: false, reason: 'No fault clearing detected' };
  }

  // Calculate accelerating area (during fault)
  let acceleratingArea = 0;
  for (let i = 0; i < clearingIndex; i++) {
    const point = trajectory[i];
    const nextPoint = trajectory[i + 1];
    if (nextPoint) {
      const delta = point.delta;
      const nextDelta = nextPoint.delta;
      const power = point.Pe || point.power;
      
      // Trapezoidal integration
      acceleratingArea += (delta + nextDelta) * power / 2;
    }
  }

  // Calculate decelerating area (after fault)
  let deceleratingArea = 0;
  for (let i = clearingIndex; i < trajectory.length - 1; i++) {
    const point = trajectory[i];
    const nextPoint = trajectory[i + 1];
    if (nextPoint) {
      const delta = point.delta;
      const nextDelta = nextPoint.delta;
      const power = point.Pe || point.power;
      
      deceleratingArea += (delta + nextDelta) * power / 2;
    }
  }

  const stable = acceleratingArea <= deceleratingArea;
  const margin = deceleratingArea - acceleratingArea;

  return {
    stable,
    acceleratingArea,
    deceleratingArea,
    margin,
    clearingIndex,
    angleLimit,
    reason: stable ? 'Equal area criterion satisfied' : 'Equal area criterion violated'
  };
}

/**
 * Check kinetic energy criterion
 * @param {Array} generators - Generator states
 * @param {Object} options - Stability options
 * @returns {Object} Kinetic energy check
 */
function checkKineticEnergy(generators, options = {}) {
  const {
    maxKineticEnergy = 2.0, // Maximum relative kinetic energy
    nominalSpeed = 1.0
  } = options;

  let maxEnergy = 0;
  let stable = true;
  const criticalGenerators = [];

  generators.forEach(gen => {
    // Kinetic energy: KE = 0.5 * M * ω²
    const speedDeviation = gen.omega - nominalSpeed;
    const kineticEnergy = 0.5 * (gen.inertia || 5.0) * speedDeviation * speedDeviation;
    
    maxEnergy = Math.max(maxEnergy, kineticEnergy);

    if (kineticEnergy > maxKineticEnergy) {
      stable = false;
      criticalGenerators.push({
        id: gen.id,
        kineticEnergy,
        speedDeviation,
        omega: gen.omega,
        inertia: gen.inertia || 5.0
      });
    }
  });

  return {
    stable,
    maxKineticEnergy,
    criticalGenerators,
    margin: maxKineticEnergy - maxEnergy
  };
}

/**
 * Comprehensive stability check
 * @param {Array} generators - Generator states
 * @param {Array} trajectory - Time series data
 * @param {Object} options - Stability options
 * @returns {Object} Comprehensive stability assessment
 */
function checkSystemStability(generators, trajectory = [], options = {}) {
  const {
    criteria = ['angle', 'speed', 'energy'], // Which criteria to use
    strictMode = false // All criteria must pass
  } = options;

  const results = {
    overallStable: true,
    criteria: {},
    criticalGenerators: [],
    margins: {},
    summary: {
      totalCriteria: criteria.length,
      passedCriteria: 0,
      failedCriteria: 0
    }
  };

  // Check each criterion
  if (criteria.includes('angle')) {
    results.criteria.angle = checkAngleStability(generators, options);
    if (results.criteria.angle.stable) {
      results.summary.passedCriteria++;
    } else {
      results.summary.failedCriteria++;
      results.overallStable = false;
    }
    results.margins.angle = results.criteria.angle.margin;
    results.criticalGenerators.push(...results.criteria.angle.criticalGenerators);
  }

  if (criteria.includes('speed')) {
    results.criteria.speed = checkSpeedStability(generators, options);
    if (results.criteria.speed.stable) {
      results.summary.passedCriteria++;
    } else {
      results.summary.failedCriteria++;
      results.overallStable = false;
    }
    results.margins.speed = results.criteria.speed.margin;
    results.criticalGenerators.push(...results.criteria.speed.criticalGenerators);
  }

  if (criteria.includes('energy')) {
    results.criteria.energy = checkKineticEnergy(generators, options);
    if (results.criteria.energy.stable) {
      results.summary.passedCriteria++;
    } else {
      results.summary.failedCriteria++;
      results.overallStable = false;
    }
    results.margins.energy = results.criteria.energy.margin;
    results.criticalGenerators.push(...results.criteria.energy.criticalGenerators);
  }

  // Remove duplicate critical generators
  const uniqueCriticalGenerators = [];
  const seenIds = new Set();
  results.criticalGenerators.forEach(gen => {
    if (!seenIds.has(gen.id)) {
      uniqueCriticalGenerators.push(gen);
      seenIds.add(gen.id);
    }
  });
  results.criticalGenerators = uniqueCriticalGenerators;

  // Overall stability in strict mode
  if (strictMode) {
    results.overallStable = results.summary.failedCriteria === 0;
  }

  return results;
}

/**
 * Calculate stability indices
 * @param {Object} stabilityResult - Stability check results
 * @returns {Object} Stability indices
 */
function calculateStabilityIndices(stabilityResult) {
  const indices = {
    stabilityIndex: 0, // 0 = unstable, 1 = marginally stable, 2 = stable
    criticalityIndex: 0, // Number of critical generators
    marginIndex: 0, // Minimum margin across all criteria
    overallScore: 0 // Combined stability score
  };

  // Calculate stability index
  if (stabilityResult.overallStable) {
    const minMargin = Math.min(...Object.values(stabilityResult.margins));
    if (minMargin > 0.5) {
      indices.stabilityIndex = 2; // Stable
    } else if (minMargin > 0.1) {
      indices.stabilityIndex = 1; // Marginally stable
    } else {
      indices.stabilityIndex = 0; // Unstable
    }
  }

  // Calculate criticality index
  indices.criticalityIndex = stabilityResult.criticalGenerators.length;

  // Calculate margin index
  indices.marginIndex = Math.min(...Object.values(stabilityResult.margins));

  // Calculate overall score (0-100)
  const stabilityWeight = 0.5;
  const marginWeight = 0.3;
  const criticalityWeight = 0.2;

  indices.overallScore = 
    (indices.stabilityIndex / 2) * stabilityWeight * 100 +
    Math.max(0, Math.min(1, indices.marginIndex)) * marginWeight * 100 +
    Math.max(0, 1 - indices.criticalityIndex / 10) * criticalityWeight * 100;

  return indices;
}

module.exports = {
  checkAngleStability,
  checkSpeedStability,
  checkEqualAreaCriterion,
  checkKineticEnergy,
  checkSystemStability,
  calculateStabilityIndices
};
