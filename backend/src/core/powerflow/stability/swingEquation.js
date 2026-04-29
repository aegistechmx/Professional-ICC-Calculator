/**
 * swingEquation.js - Generator swing equation for TS-SCOPF
 * 
 * Responsibility: Implement swing equation for generator dynamics
 * NO Express, NO axios, NO UI logic
 */

/**
 * Calculate swing equation derivatives
 * M d²δ/dt² = Pm - Pe - D dδ/dt
 * @param {Object} generator - Generator parameters
 * @param {number} delta - Rotor angle (rad)
 * @param {number} omega - Angular velocity (pu)
 * @param {number} Pe - Electrical power (pu)
 * @returns {Object} Derivatives {dDelta, dOmega}
 */
function swingEquation(generator, delta, omega, Pe) {
  const M = generator.inertia || 5.0; // Inertia constant (H)
  const D = generator.damping || 2.0; // Damping coefficient
  const Pm = generator.Pm || generator.P || 0.8; // Mechanical power

  // Swing equation: M d²δ/dt² = Pm - Pe - D dδ/dt
  const dDelta = omega; // dδ/dt = ω
  const dOmega = (Pm - Pe - D * omega) / M; // dω/dt = (Pm - Pe - Dω)/M

  return { dDelta, dOmega };
}

/**
 * Calculate electrical power for generator
 * @param {Object} generator - Generator parameters
 * @param {number} delta - Rotor angle (rad)
 * @param {number} Vmag - Terminal voltage magnitude (pu)
 * @param {number} Vang - Terminal voltage angle (rad)
 * @returns {number} Electrical power (pu)
 */
function calculateElectricalPower(generator, delta, Vmag, Vang) {
  const xd = generator.xd || 0.3; // Direct axis reactance
  const Eq = generator.Eq || 1.0; // Internal voltage

  // Simplified electrical power calculation
  // Pe = (Eq * Vmag / xd) * sin(delta - Vang)
  const Pe = (Eq * Vmag / xd) * Math.sin(delta - Vang);

  return Pe;
}

/**
 * Update generator state using swing equation
 * @param {Object} generator - Generator model
 * @param {number} dt - Time step (seconds)
 * @param {number} Vmag - Terminal voltage magnitude (pu)
 * @param {number} Vang - Terminal voltage angle (rad)
 * @returns {Object} Updated state {delta, omega, Pe}
 */
function updateGeneratorState(generator, dt, Vmag, Vang) {
  // Current state
  const delta = generator.delta || 0;
  const omega = generator.omega || 1.0;

  // Calculate electrical power
  const Pe = calculateElectricalPower(generator, delta, Vmag, Vang);

  // Calculate derivatives
  const { dDelta, dOmega } = swingEquation(generator, delta, omega, Pe);

  // Update state (simple Euler integration)
  const newDelta = delta + dDelta * dt;
  const newOmega = omega + dOmega * dt;

  // Update generator state
  generator.delta = newDelta;
  generator.omega = newOmega;
  generator.Pe = Pe;

  return {
    delta: newDelta,
    omega: newOmega,
    Pe: Pe,
    dDelta,
    dOmega
  };
}

/**
 * Check generator stability
 * @param {Object} generator - Generator model
 * @returns {boolean} True if stable
 */
function isGeneratorStable(generator) {
  // Check angle difference from synchronous reference
  const maxAngleDiff = Math.PI; // 180 degrees
  const angleDiff = Math.abs(generator.delta - (generator.referenceAngle || 0));
  
  // Check if within stability limits
  return angleDiff < maxAngleDiff && 
         Math.abs(generator.omega - 1.0) < 0.5; // Within 50% of synchronous speed
}

/**
 * Calculate critical clearing time
 * @param {Object} generator - Generator model
 * @param {number} faultPower - Power during fault (pu)
 * @param {number} postFaultPower - Power after fault clearing (pu)
 * @returns {number} Critical clearing time (seconds)
 */
function calculateCriticalClearingTime(generator, faultPower, postFaultPower) {
  const M = generator.inertia || 5.0;
  const Pm = generator.Pm || generator.P || 0.8;
  
  // Simplified equal area criterion
  // t_cr = sqrt(2M * (δ_max - δ_0) / (Pm - P_fault))
  const delta0 = 0; // Initial angle
  const deltaMax = Math.PI; // Maximum angle before instability
  
  const acceleratingArea = (Pm - faultPower) * (deltaMax - delta0);
  const deceleratingArea = (postFaultPower - Pm) * (deltaMax - delta0);
  
  if (acceleratingArea <= deceleratingArea) {
    return Infinity; // System is stable for any clearing time
  }
  
  const tCritical = Math.sqrt(2 * M * (deltaMax - delta0) / Math.abs(Pm - faultPower));
  
  return tCritical;
}

/**
 * Calculate damping ratio
 * @param {Object} generator - Generator model
 * @returns {number} Damping ratio
 */
function calculateDampingRatio(generator) {
  const M = generator.inertia || 5.0;
  const D = generator.damping || 2.0;
  const xd = generator.xd || 0.3;
  
  // Natural frequency: ω_n = sqrt(1/(M*xd))
  const omegaN = Math.sqrt(1 / (M * xd));
  
  // Damping ratio: ζ = D / (2 * sqrt(M/xd))
  const dampingRatio = D / (2 * Math.sqrt(M / xd));
  
  return dampingRatio;
}

module.exports = {
  swingEquation,
  calculateElectricalPower,
  updateGeneratorState,
  isGeneratorStable,
  calculateCriticalClearingTime,
  calculateDampingRatio
};
