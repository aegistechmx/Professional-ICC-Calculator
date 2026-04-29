/**
 * Motor Contribution to Fault Current Calculation
 *
 * When a short circuit occurs, running motors act as generators due to stored
 * energy in the rotating mass and magnetic field, contributing to the fault current.
 *
 * Key concepts:
 * - Motors contribute only during the first few cycles (subtransient period)
 * - Contribution depends on motor HP, voltage, and Xd'' (subtransient reactance)
 * - Typically Xd'' = 0.15-0.25 for induction motors
 * - Synchronous motors have higher contribution than induction motors
 */

/**
 * Calculate motor fault current contribution
 * @param {Object} motor - Motor node data
 * @returns {Object} Motor contribution data
 */
export function calculateMotorContribution(motor) {
  if (!motor || motor.type !== 'motor') {
    return { contributes: false, reason: 'Not a motor' }
  }

  const params = motor.data?.parameters || {}

  // Motor parameters
  const hp = params.hp || 50
  const voltage = params.voltaje || 480
  const efficiency = params.eficiencia || 0.92
  const pf = params.fp || 0.85
  const Xd_pu = params.Xd || 0.15 // Subtransient reactance in pu (typically 0.15-0.25)

  // Calculate motor full load current
  // I_fl = (HP × 746) / (√3 × V × η × pf)
  const I_fl = (hp * 746) / (Math.sqrt(3) * voltage * efficiency * pf)

  // Calculate motor short circuit contribution
  // I_sc_motor = I_fl / Xd'' (using subtransient reactance)
  const I_sc_motor = I_fl / Xd_pu

  // Motor impedance (for combining with other sources)
  const Z_motor_pu = Xd_pu
  const baseMVA = 1 // 1 MVA base
  const motorMVA = (hp * 0.746) / (1000 * efficiency * pf) // Motor MVA rating

  // Convert to actual impedance at system voltage
  const Z_base = voltage ** 2 / (baseMVA * 1000000)
  const Z_motor_ohm = Z_motor_pu * Z_base * (baseMVA / motorMVA)

  return {
    contributes: true,
    motorId: motor.id,
    motorName: motor.data?.label || `Motor ${hp}HP`,
    hp: hp,
    voltage: voltage,
    fullLoadCurrent: I_fl,
    shortCircuitCurrent: I_sc_motor,
    shortCircuitCurrent_ka: I_sc_motor / 1000,
    Xd_pu: Xd_pu,
    Z_motor_ohm: Z_motor_ohm,
    // Contribution decays quickly (typically 3-10 cycles)
    duration: '3-10 cycles',
    // Type of contribution
    contributionType: params.synchronous ? 'synchronous' : 'induction',
  }
}

/**
 * Calculate total motor contribution for all motors in the system
 * @param {Array} nodes - All nodes in the system
 * @returns {Object} Total motor contribution
 */
export function calculateTotalMotorContribution(nodes) {
  const motors = nodes.filter(n => n.type === 'motor')

  if (motors.length === 0) {
    return {
      hasMotors: false,
      totalContribution_ka: 0,
      motors: [],
    }
  }

  const motorContributions = motors.map(m => calculateMotorContribution(m))

  // Sum up all motor contributions
  const totalIsc = motorContributions.reduce(
    (sum, m) => sum + (m.shortCircuitCurrent_ka || 0),
    0
  )

  // Calculate equivalent parallel impedance of all motors
  const validMotors = motorContributions.filter(m => m.Z_motor_ohm > 0)
  let equivalentZ = 0

  if (validMotors.length > 0) {
    // Parallel combination: 1/Z_eq = Σ(1/Z_i)
    const sumAdmittance = validMotors.reduce(
      (sum, m) => sum + 1 / m.Z_motor_ohm,
      0
    )
    equivalentZ = 1 / sumAdmittance
  }

  return {
    hasMotors: true,
    motorCount: motors.length,
    totalContribution_ka: totalIsc,
    equivalentZ_ohm: equivalentZ,
    motors: motorContributions,
    // Summary statistics
    largestMotor: motorContributions.reduce(
      (max, m) =>
        m.shortCircuitCurrent_ka > (max?.shortCircuitCurrent_ka || 0) ? m : max,
      null
    ),
    totalHP: motorContributions.reduce((sum, m) => sum + m.hp, 0),
  }
}

/**
 * Combine utility/source fault current with motor contribution
 * @param {number} utilityIsc_ka - Utility short circuit current in kA
 * @param {number} motorIsc_ka - Motor contribution in kA
 * @returns {Object} Combined fault current
 */
export function combineFaultCurrents(utilityIsc_ka, motorIsc_ka) {
  // Simple sum for first cycle (conservative approach)
  const totalFirstCycle = utilityIsc_ka + motorIsc_ka

  // For interrupting duty (after motor contribution decays)
  // Motors don't contribute after ~10 cycles
  const totalInterrupting = utilityIsc_ka

  // Asymmetrical factor ( motors contribute to DC component)
  const asymFactor = 1.6 // Typical for motors
  const asymmetricalFirstCycle = totalFirstCycle * asymFactor

  return {
    utilityContribution_ka: utilityIsc_ka,
    motorContribution_ka: motorIsc_ka,
    totalFirstCycle_ka: totalFirstCycle,
    totalInterrupting_ka: totalInterrupting,
    asymmetricalFirstCycle_ka: asymmetricalFirstCycle,
    // Percentage of motor contribution
    motorContributionPercent:
      utilityIsc_ka > 0
        ? ((motorIsc_ka / totalFirstCycle) * 100).toFixed(1)
        : 0,
  }
}

/**
 * Main function to calculate system fault current with motor contribution
 * @param {Array} nodes - All system nodes
 * @param {Array} edges - All system edges
 * @param {number} utilityIsc_ka - Utility fault current (if known)
 * @returns {Object} Complete fault analysis with motor contribution
 */
export function calculateFaultCurrentWithMotors(
  nodes,
  edges,
  utilityIsc_ka = null
) {
  // Get motor contributions
  const motorData = calculateTotalMotorContribution(nodes)

  // If utility ISC not provided, calculate from nodes/edges
  let sourceIsc = utilityIsc_ka
  if (sourceIsc === null) {
    // Find transformer/generator capacity
    const sources = nodes.filter(
      n => n.type === 'transformer' || n.type === 'generator'
    )

    if (sources.length > 0) {
      const source = sources[0]
      const kVA = source.data?.parameters?.kVA || 500
      const Z_pct = source.data?.parameters?.Z || 5.75
      const voltage = source.data?.parameters?.secundario || 480

      // Calculate source fault current
      // I_base = kVA / (√3 × V)
      // I_sc = I_base / (Z% / 100)
      const I_base = (kVA * 1000) / (Math.sqrt(3) * voltage)
      sourceIsc = I_base / (Z_pct / 100) / 1000 // Convert to kA
    } else {
      sourceIsc = 10 // Default assumption
    }
  }

  // Combine source and motor contributions
  const combined = combineFaultCurrents(
    sourceIsc,
    motorData.totalContribution_ka
  )

  return {
    source: {
      isc_ka: sourceIsc,
      type: 'utility/transformer',
    },
    motors: motorData,
    combined: combined,
    // Recommendations
    recommendations: generateRecommendations(motorData, combined),
  }
}

/**
 * Generate recommendations based on motor contribution analysis
 */
function generateRecommendations(motorData, combined) {
  const recommendations = []

  if (!motorData.hasMotors) {
    recommendations.push('No motors in system - motor contribution is zero')
    return recommendations
  }

  const contributionPercent = parseFloat(combined.motorContributionPercent)

  if (contributionPercent > 20) {
    recommendations.push(
      `⚠️ High motor contribution (${contributionPercent}%) - Must include in breaker sizing`,
      'Consider using high-interrupting capacity breakers'
    )
  } else if (contributionPercent > 10) {
    recommendations.push(
      `⚡ Moderate motor contribution (${contributionPercent}%) - Include in calculations`,
      'Verify breaker interrupting rating accounts for motor contribution'
    )
  } else {
    recommendations.push(
      `✅ Low motor contribution (${contributionPercent}%) - May be negligible`,
      'Still recommended to include for conservative design'
    )
  }

  if (motorData.motorCount > 5) {
    recommendations.push(
      `📊 Many motors (${motorData.motorCount}) - Consider diversity factor`,
      'Not all motors will be running during fault'
    )
  }

  recommendations.push(
    '💡 Motor contribution decays in 3-10 cycles',
    `First cycle duty: ${combined.totalFirstCycle_ka.toFixed(2)} kA`,
    `Interrupting duty: ${combined.totalInterrupting_ka.toFixed(2)} kA`
  )

  return recommendations
}
