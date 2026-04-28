/**
 * Transient Stability Visualization Utilities
 * Visualizes stability analysis results
 */

/**
 * Generate rotor angle trajectory data
 * @param {Object} stabilityResult - Stability analysis results
 * @returns {Object} Trajectory visualization data
 */
export function generateRotorAngleTrajectory(stabilityResult) {
  const { results, isStable } = stabilityResult;
  
  const trajectory = results.map(r => ({
    time: r.time,
    delta: r.delta,
    omega: r.omega,
    isStable: r.delta < 180
  }));
  
  return {
    trajectory,
    isStable,
    maxAngle: Math.max(...results.map(r => r.delta)),
    maxSpeed: Math.max(...results.map(r => r.omega))
  };
}

/**
 * Generate swing curve data
 * @param {Object} stabilityResult - Stability analysis results
 * @returns {Object} Swing curve data
 */
export function generateSwingCurve(stabilityResult) {
  const { results } = stabilityResult;
  
  return {
    time: results.map(r => r.time),
    delta: results.map(r => r.delta),
    omega: results.map(r => r.omega),
    acceleratingPower: results.map(r => r.acceleratingPower)
  };
}

/**
 * Generate critical clearing time visualization
 * @param {Object} marginResult - Stability margin results
 * @returns {Object} CCT visualization data
 */
export function generateCCTVisualization(marginResult) {
  const { criticalClearingTime, actualClearingTime, margin } = marginResult;
  
  return {
    criticalClearingTime: criticalClearingTime.toFixed(3) + ' s',
    actualClearingTime: actualClearingTime.toFixed(3) + ' s',
    margin: margin.toFixed(3) + ' s',
    marginPercent: marginResult.marginPercent.toFixed(1) + '%',
    safe: margin > 0
  };
}

/**
 * Generate oscillation mode visualization
 * @param {Object} oscillationModes - Oscillation mode data
 * @returns {Object} Mode visualization data
 */
export function generateOscillationModeVisualization(oscillationModes) {
  if (!oscillationModes) return null;
  
  return {
    frequency: oscillationModes.oscillationFreq.toFixed(2) + ' Hz',
    dampingRatio: (oscillationModes.dampingRatio * 100).toFixed(1) + '%',
    modeShape: oscillationModes.modeShape
  };
}

/**
 * Get stability color
 * @param {boolean} isStable - Stability status
 * @returns {string} Hex color
 */
export function getStabilityColor(isStable) {
  return isStable ? '#00cc00' : '#ff0000';
}

/**
 * Generate multi-machine stability comparison
 * @param {Array} results - Multi-machine stability results
 * @returns {Object} Comparison data
 */
export function generateMultiMachineComparison(results) {
  return results.map(r => ({
    generator: r.generator,
    isStable: r.stability.isStable,
    maxAngle: r.stability.maxAngle,
    margin: r.margin.margin,
    color: getStabilityColor(r.stability.isStable)
  }));
}
