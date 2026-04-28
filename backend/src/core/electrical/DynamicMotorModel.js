/**
 * Dynamic Motor Models
 * 
 * Implements dynamic motor behavior during voltage dips and transients
 * Includes induction motor and synchronous motor models
 */

const { Complex } = require('./Complex');

/**
 * Induction Motor Model
 * Dynamic model for induction motors during transients
 */
class InductionMotor {
  constructor(data) {
    this.id = data.id;
    this.bus = data.bus;
    this.hp = data.hp || 100;
    this.kW = data.kW || (data.hp * 0.746);
    this.voltage = data.voltage || 0.48; // kV
    this.efficiency = data.efficiency || 0.92;
    this.powerFactor = data.powerFactor || 0.85;
    
    // Reactances
    this.xd = data.xd || 0.2; // Direct axis reactance
    this.xd_prime = data.xd_prime || 0.15; // Transient reactance
    this.xd_double_prime = data.xd_double_prime || 0.1; // Subtransient reactance
    this.x0 = data.x0 || 0.05; // Zero sequence reactance
    
    // Resistances
    this.r1 = data.r1 || 0.01; // Stator resistance
    this.r2 = data.r2 || 0.01; // Rotor resistance
    
    // Inertia
    this.H = data.H || 3; // Inertia constant (seconds)
    
    // Dynamic state
    this.slip = data.slip || 0.02; // Initial slip
    this.speed = data.speed || (1 - this.slip); // Per unit speed
    this.torque = data.torque || 0; // Per unit torque
    this.current = data.current || 0; // Per unit current
  }
  
  /**
   * Calculate motor current at given voltage and slip
   * Uses equivalent circuit model
   */
  calculateCurrent(voltage_pu, slip) {
    if (slip <= 0) slip = 0.001; // Avoid division by zero
    
    // Equivalent circuit parameters
    const R1 = this.r1;
    const R2 = this.r2 / slip;
    const X1 = this.xd_prime;
    const X2 = this.xd_prime;
    const Xm = this.xd * 5; // Magnetizing reactance
    
    // Total impedance
    const Z_total = Complex.fromRect(
      R1 + R2,
      X1 + X2
    );
    
    // Parallel magnetizing branch
    const Z_mag = Complex.fromRect(0, Xm);
    const Z_parallel = Complex.multiply(Z_total, Z_mag).divide(
      Complex.add(Z_total, Z_mag)
    );
    
    // Current
    const I = Complex.fromPolar(voltage_pu, 0).divide(Z_parallel);
    
    return I.abs();
  }
  
  /**
   * Calculate motor torque at given voltage and slip
   */
  calculateTorque(voltage_pu, slip) {
    if (slip <= 0) slip = 0.001;
    
    const current = this.calculateCurrent(voltage_pu, slip);
    const rotor_loss = this.r2 * current * current / slip;
    
    // Torque = rotor power / synchronous speed
    return rotor_loss;
  }
  
  /**
   * Update motor state during voltage dip
   * Solves differential equations for speed and slip
   */
  updateState(voltage_pu, dt = 0.01) {
    // Calculate electrical torque
    const Te = this.calculateTorque(voltage_pu, this.slip);
    
    // Load torque (assumed constant)
    const Tl = this.torque || 0.8;
    
    // Acceleration equation: 2H * dw/dt = Te - Tl
    const dw_dt = (Te - Tl) / (2 * this.H);
    
    // Update speed
    this.speed += dw_dt * dt;
    this.speed = Math.max(0.1, Math.min(1.1, this.speed)); // Limit speed
    
    // Update slip
    this.slip = 1 - this.speed;
    this.slip = Math.max(0.001, Math.min(0.5, this.slip)); // Limit slip
    
    // Update current
    this.current = this.calculateCurrent(voltage_pu, this.slip);
    
    // Update torque
    this.torque = Te;
    
    return {
      speed: this.speed,
      slip: this.slip,
      current: this.current,
      torque: this.torque
    };
  }
  
  /**
   * Calculate starting current
   */
  getStartingCurrent() {
    return this.calculateCurrent(1.0, 1.0);
  }
  
  /**
   * Calculate locked rotor torque
   */
  getLockedRotorTorque() {
    return this.calculateTorque(1.0, 1.0);
  }
  
  /**
   * Calculate starting time
   */
  getStartingTime(loadTorque = 0.8) {
    // Approximate starting time
    const T_start = this.getLockedRotorTorque();
    const acceleration = (T_start - loadTorque) / (2 * this.H);
    
    if (acceleration <= 0) return Infinity;
    
    return 1 / acceleration; // Time to reach full speed
  }
}

/**
 * Synchronous Motor Model
 * Dynamic model for synchronous motors
 */
class SynchronousMotor {
  constructor(data) {
    this.id = data.id;
    this.bus = data.bus;
    this.hp = data.hp || 100;
    this.kW = data.kW || (data.hp * 0.746);
    this.voltage = data.voltage || 0.48; // kV
    this.efficiency = data.efficiency || 0.92;
    this.powerFactor = data.powerFactor || 0.9;
    
    // Reactances
    this.xd = data.xd || 1.8; // Direct axis synchronous reactance
    this.xq = data.xq || 1.7; // Quadrature axis synchronous reactance
    this.xd_prime = data.xd_prime || 0.3; // Direct axis transient reactance
    this.xd_double_prime = data.xd_double_prime || 0.2; // Direct axis subtransient reactance
    this.x0 = data.x0 || 0.1; // Zero sequence reactance
    
    // Time constants
    this.Td0_prime = data.Td0_prime || 5; // Direct axis open-circuit transient time constant
    this.Td0_double_prime = data.Td0_double_prime || 0.03; // Direct axis subtransient time constant
    
    // Inertia
    this.H = data.H || 3;
    
    // Dynamic state
    this.delta = data.delta || 0; // Rotor angle (rad)
    this.omega = data.omega || 1; // Speed (pu)
    this.Eq_prime = data.Eq_prime || 1; // Transient emf
    this.Ed_prime = data.Ed_prime || 0; // Quadrature axis transient emf
  }
  
  /**
   * Calculate motor current at given voltage
   */
  calculateCurrent(voltage_pu, angle) {
    // Simplified model using transient reactance
    const V = Complex.fromPolar(voltage_pu, angle);
    const E = Complex.fromPolar(this.Eq_prime, this.delta);
    
    const Z = Complex.fromRect(0, this.xd_prime);
    const I = Complex.subtract(E, V).divide(Z);
    
    return I.abs();
  }
  
  /**
   * Calculate electrical torque
   */
  calculateTorque(voltage_pu, angle) {
    // Te = (Eq' * V * sin(delta)) / xd'
    const Te = (this.Eq_prime * voltage_pu * Math.sin(this.delta - angle)) / this.xd_prime;
    
    return Te;
  }
  
  /**
   * Update motor state during voltage dip
   * Solves swing equation
   */
  updateState(voltage_pu, angle, dt = 0.01) {
    // Calculate electrical torque
    const Te = this.calculateTorque(voltage_pu, angle);
    
    // Load torque
    const Tl = this.torque || 0.8;
    
    // Swing equation: 2H * dw/dt = Te - Tl
    const dw_dt = (Te - Tl) / (2 * this.H);
    
    // Update speed
    this.omega += dw_dt * dt;
    this.omega = Math.max(0.9, Math.min(1.1, this.omega));
    
    // Update rotor angle
    this.delta += (this.omega - 1) * dt;
    
    // Update transient emf (simplified)
    this.Eq_prime = this.Eq_prime * 0.999 + voltage_pu * 0.001;
    
    // Update current
    this.current = this.calculateCurrent(voltage_pu, angle);
    
    // Update torque
    this.torque = Te;
    
    return {
      omega: this.omega,
      delta: this.delta,
      current: this.current,
      torque: this.torque
    };
  }
  
  /**
   * Check stability
   */
  isStable() {
    return this.omega > 0.95 && this.omega < 1.05;
  }
}

/**
 * Motor Simulator
 * Simulates motor behavior during voltage transients
 */
class MotorSimulator {
  constructor() {
    this.motors = [];
  }
  
  addMotor(motor) {
    if (motor.type === 'synchronous') {
      this.motors.push(new SynchronousMotor(motor));
    } else {
      this.motors.push(new InductionMotor(motor));
    }
    return this;
  }
  
  /**
   * Simulate voltage dip
   * @param {number} voltage_pu - Voltage magnitude in per-unit
   * @param {number} duration - Duration in seconds
   * @param {number} dt - Time step
   */
  simulateVoltageDip(voltage_pu, duration = 0.5, dt = 0.01) {
    const results = [];
    const steps = Math.ceil(duration / dt);
    
    for (let i = 0; i <= steps; i++) {
      const time = i * dt;
      const motorStates = this.motors.map(motor => {
        const state = motor.updateState(voltage_pu, dt);
        return {
          id: motor.id,
          type: motor.type,
          ...state
        };
      });
      
      results.push({
        time,
        voltage: voltage_pu,
        motors: motorStates
      });
    }
    
    return results;
  }
  
  /**
   * Get motor summary
   */
  getSummary() {
    return {
      totalMotors: this.motors.length,
      inductionMotors: this.motors.filter(m => m.type === 'induction').length,
      synchronousMotors: this.motors.filter(m => m.type === 'synchronous').length,
      totalHP: this.motors.reduce((sum, m) => sum + m.hp, 0),
      totalkW: this.motors.reduce((sum, m) => sum + m.kW, 0)
    };
  }
}

module.exports = {
  InductionMotor,
  SynchronousMotor,
  MotorSimulator
};
