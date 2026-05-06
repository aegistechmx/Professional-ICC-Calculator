/**
 * rk4.js - Runge-Kutta 4th order integrator
 *
 * Responsibility: Solve differential equations with RK4 method
 * NO Express, NO axios, NO UI logic
 */

/**
 * RK4 integration step
 * @param {Array} state - Current state vector
 * @param {Function} derivatives - Function to calculate derivatives
 * @param {number} dt - Time step
 * @returns {Array} New state vector
 */
function rk4Step(state, derivatives, dt) {
  // RK4 coefficients
  const k1 = derivatives(state)

  const state2 = state.map((s, i) => s + (k1[i] * dt) / 2)
  const k2 = derivatives(state2)

  const state3 = state.map((s, i) => s + (k2[i] * dt) / 2)
  const k3 = derivatives(state3)

  const state4 = state.map((s, i) => s + k3[i] * dt)
  const k4 = derivatives(state4)

  // Final update
  return state.map(
    (s, i) => s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  )
}

/**
 * Adaptive RK4 with variable time step
 * @param {Array} state - Current state vector
 * @param {Function} derivatives - Function to calculate derivatives
 * @param {number} dt - Initial time step
 * @param {number} tolerance - Error tolerance
 * @returns {Object} { state, dt, error }
 */
function rk4Adaptive(state, derivatives, dt, tolerance = 1e-6) {
  // Take two half steps
  const halfStep = rk4Step(state, derivatives, dt / 2)
  const fullStep = rk4Step(state, derivatives, dt)

  // Compare results
  const error = Math.max(...halfStep.map((s, i) => Math.abs(s - fullStep[i])))

  // Adjust time step if error too large
  let newDt = dt
  if (error > tolerance) {
    newDt = dt * 0.5 * Math.pow(tolerance / error, 0.2)
  } else if (error < tolerance * 0.1) {
    newDt = dt * 1.5 // Allow larger steps
  }

  return {
    state: fullStep,
    dt: newDt,
    error,
  }
}

/**
 * Integrate over time interval
 * @param {Array} initialState - Initial state vector
 * @param {Function} derivatives - Function to calculate derivatives
 * @param {number} tEnd - End time
 * @param {number} dt - Initial time step
 * @param {number} tolerance - Error tolerance
 * @returns {Array} Array of time points
 */
function integrate(initialState, derivatives, tEnd, dt, tolerance = 1e-6) {
  const results = []
  let state = initialState
  let time = 0
  let currentDt = dt // current (A)

  while (time < tEnd) {
    const step = rk4Adaptive(state, derivatives, currentDt, tolerance) // current (A)

    results.push({
      time,
      state: step.state,
      dt: currentDt,
      error: step.error,
    })

    state = step.state
    time += currentDt // current (A)
    currentDt = step.dt // current (A)
  }

  return results
}

module.exports = {
  rk4Step,
  rk4Adaptive,
  integrate,
}
