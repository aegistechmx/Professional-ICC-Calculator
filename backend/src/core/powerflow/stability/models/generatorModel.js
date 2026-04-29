/**
 * generatorModel.js - Comprehensive generator model for TS-SCOPF
 * 
 * Responsibility: Complete generator model with AVR, Governor, and PSS
 * NO Express, NO axios, NO UI logic
 */

/**
 * Complete generator model with control systems
 */
class GeneratorModel {
  constructor(params) {
    this.id = params.id;
    this.bus = params.bus;
    
    // Machine parameters
    this.M = params.inertia || 5.0;        // Inertia constant (H)
    this.D = params.damping || 2.0;        // Damping coefficient
    this.xd = params.xd || 0.3;             // Direct axis reactance
    this.xq = params.xq || 0.4;             // Quadrature axis reactance
    this.xdPrime = params.xdPrime || 0.25;    // Transient reactance
    this.Tdo = params.Tdo || 5.0;           // Direct axis open circuit time constant
    this.TdoPrime = params.TdoPrime || 1.0;    // Direct axis short circuit time constant
    this.Tqo = params.Tqo || 1.5;           // Quadrature axis open circuit time constant
    
    // Electrical parameters
    this.Eq = params.Eq || 1.0;            // Internal voltage (q-axis)
    this.Ed = params.Ed || 0.0;             // Internal voltage (d-axis)
    this.Efd = params.Efd || 1.0;           // Field voltage
    
    // Mechanical parameters
    this.Pm = params.Pm || params.P || 0.8;   // Mechanical power
    this.omega = params.omega || 1.0;        // Angular velocity
    this.delta = params.delta || 0.0;          // Rotor angle
    
    // AVR parameters
    this.avr = {
      Ka: params.avrKa || 200,              // AVR gain
      Ta: params.avrTa || 0.05,              // AVR time constant
      Vref: params.Vref || 1.0,             // Reference voltage
      Vmax: params.Vmax || 5.0,              // Maximum field voltage
      Vmin: params.Vmin || 0.0,              // Minimum field voltage
      ...params.avr
    };
    
    // Governor parameters
    this.gov = {
      Tg: params.govTg || 0.3,              // Governor time constant
      R: params.govR || 0.05,                // Droop
      Pref: params.Pref || params.P || 0.8,    // Reference power
      Pmax: params.Pmax || 1.5,             // Maximum power
      Pmin: params.Pmin || 0.2,             // Minimum power
      ...params.gov
    };
    
    // PSS parameters
    this.pss = {
      K: params.pssK || 10,                 // PSS gain
      Tw: params.pssTw || 10,                // Washout time constant
      T1: params.pssT1 || 0.1,             // Lead time constant 1
      T2: params.pssT2 || 0.05,            // Lead time constant 2
      T3: params.pssT3 || 1.0,             // Lag time constant
      ...params.pss
    };
  }

  /**
   * 4th order machine model
   * @param {Object} state - Current state
   * @param {Object} inputs - System inputs
   * @returns {Object} State derivatives
   */
  machineModel(state, inputs) {
    const { delta, omega, Eq, Ed, Efd } = state;
    const { Vd, Vq, Id, Iq } = inputs;

    // Calculate electrical power
    const Pe = Eq * Iq + Ed * Id;
    const Qe = Eq * Id - Ed * Iq;

    // Differential equations for internal voltages
    const dEd = (Efd - Ed - (this.xd - this.xdPrime) * Id) / this.TdoPrime;
    const dEq = (Efd - Eq) / this.Tdo;

    // Swing equation
    const dDelta = omega;
    const dOmega = (this.Pm - Pe - this.D * (omega - 1)) / this.M;

    return {
      dDelta,
      dOmega,
      dEd,
      dEq,
      Pe,
      Qe
    };
  }

  /**
   * AVR model (IEEE Type 1 simplified)
   * @param {Object} state - Current state
   * @param {number} V - Terminal voltage
   * @param {number} pssSignal - PSS output signal
   * @returns {number} Field voltage derivative
   */
  avrModel(state, V, pssSignal) {
    const { Efd } = state;
    const { Ka, Ta, Vref } = this.avr;

    // Voltage error with PSS signal
    const error = Vref - V + pssSignal;

    // AVR differential equation
    const dEfd = (Ka * error - Efd) / Ta;

    // Apply limits
    const EfdNew = Math.max(this.avr.Vmin, Math.min(this.avr.Vmax, Efd + dEfd * 0.01));

    return { dEfd, EfdNew };
  }

  /**
   * Governor model (simplified)
   * @param {Object} state - Current state
   * @param {number} omega - Angular velocity
   * @returns {number} Mechanical power derivative
   */
  governorModel(state, omega) {
    const { Pm } = state;
    const { Tg, R, Pref } = this.gov;

    // Speed deviation
    const speedError = omega - 1.0;

    // Governor differential equation
    const dPm = (Pref - Pm - R * speedError) / Tg;

    // Apply limits
    const PmNew = Math.max(this.gov.Pmin, Math.min(this.gov.Pmax, Pm + dPm * 0.01));

    return { dPm, PmNew };
  }

  /**
   * PSS model (simplified)
   * @param {Object} state - Current state
   * @param {number} omega - Angular velocity
   * @returns {number} PSS output signal
   */
  pssModel(state, omega) {
    const { K, Tw, T1, T2, T3 } = this.pss;

    // Speed deviation (input to PSS)
    const speedError = omega - 1.0;

    // Washout filter
    const washoutOutput = this.washoutFilter(speedError, Tw);

    // Lead-lag compensation
    const leadLagOutput = this.leadLagFilter(washoutOutput, T1, T2);

    // Lag filter
    const pssSignal = this.lagFilter(leadLagOutput, T3);

    return K * pssSignal;
  }

  /**
   * Washout filter for PSS
   * @param {number} input - Input signal
   * @param {number} Tw - Washout time constant
   * @returns {number} Washout output
   */
  washoutFilter(input, Tw) {
    // Simple washout implementation
    const output = input / (1 + Tw * Math.abs(input));
    return output;
  }

  /**
   * Lead-lag filter for PSS
   * @param {number} input - Input signal
   * @param {number} T1 - Lead time constant
   * @param {number} T2 - Lag time constant
   * @returns {number} Lead-lag output
   */
  leadLagFilter(input, T1, T2) {
    // Simplified lead-lag implementation
    const output = input * (1 + T1) / (1 + T2);
    return output;
  }

  /**
   * Lag filter for PSS
   * @param {number} input - Input signal
   * @param {number} T3 - Lag time constant
   * @returns {number} Lag output
   */
  lagFilter(input, T3) {
    // Simple lag implementation
    const output = input / (1 + T3);
    return output;
  }

  /**
   * Complete generator model integration
   * @param {Object} state - Current state
   * @param {Object} inputs - System inputs
   * @param {number} dt - Time step
   * @returns {Object} Updated state
   */
  updateState(state, inputs, dt) {
    // Get machine model derivatives
    const machineDerivs = this.machineModel(state, inputs);

    // Get AVR output
    const V = Math.sqrt(inputs.Vd * inputs.Vd + inputs.Vq * inputs.Vq);
    const pssSignal = this.pssModel(state, state.omega);
    const avrOutput = this.avrModel(state, V, pssSignal);

    // Get governor output
    const govOutput = this.governorModel(state, state.omega);

    // Update state using Euler integration
    const newState = {
      delta: state.delta + machineDerivs.dDelta * dt,
      omega: state.omega + machineDerivs.dOmega * dt,
      Ed: state.Ed + machineDerivs.dEd * dt,
      Eq: state.Eq + machineDerivs.dEq * dt,
      Efd: avrOutput.EfdNew,
      Pm: govOutput.PmNew,
      Pe: machineDerivs.Pe,
      Qe: machineDerivs.Qe
    };

    return newState;
  }

  /**
   * Get current state
   * @returns {Object} Current generator state
   */
  getState() {
    return {
      id: this.id,
      bus: this.bus,
      delta: this.delta,
      omega: this.omega,
      Ed: this.Ed,
      Eq: this.Eq,
      Efd: this.Efd,
      Pm: this.Pm,
      Pe: this.Pe || 0,
      Qe: this.Qe || 0,
      angleDegrees: this.delta * 180 / Math.PI,
      speedPercent: this.omega * 100,
      electricalPower: this.Pe || 0,
      reactivePower: this.Qe || 0
    };
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.delta = 0.0;
    this.omega = 1.0;
    this.Ed = 0.0;
    this.Eq = 1.0;
    this.Efd = 1.0;
    this.Pm = this.Pm || 0.8;
    this.Pe = 0.0;
    this.Qe = 0.0;
  }

  /**
   * Check stability limits
   * @returns {Object} Stability check
   */
  checkStability() {
    const maxAngleDiff = Math.PI; // 180 degrees
    const maxSpeedDeviation = 0.5; // 50% deviation

    const angleDiff = Math.abs(this.delta);
    const speedDeviation = Math.abs(this.omega - 1.0);

    return {
      stable: angleDiff < maxAngleDiff && speedDeviation < maxSpeedDeviation,
      angleDiff,
      speedDeviation,
      angleMargin: maxAngleDiff - angleDiff,
      speedMargin: maxSpeedDeviation - speedDeviation
    };
  }
}

module.exports = GeneratorModel;
