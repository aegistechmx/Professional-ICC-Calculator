/**
 * shared/math/Complex.js - Complex Number Implementation
 *
 * Responsibility: Complex number arithmetic and operations
 */

class Complex {
  /**
   * Create a complex number
   * @param {number} real - Real part
   * @param {number} imag - Imaginary part
   */
  constructor(real = 0, imag = 0) {
    this.real = real
    this.imag = imag
  }

  /**
   * Get magnitude (absolute value) of complex number
   * @returns {number} Magnitude
   */
  get magnitude() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag)
  }

  /**
   * Get angle (argument) of complex number
   * @returns {number} Angle in radians
   */
  get angle() {
    return Math.atan2(this.imag, this.real)
  }

  /**
   * Add another complex number
   * @param {Complex|number} other - Complex number or real number to add
   * @returns {Complex} Result
   */
  add(other) {
    if (typeof other === 'number') {
      return new Complex(this.real + other, this.imag)
    }
    return new Complex(this.real + other.real, this.imag + other.imag)
  }

  /**
   * Subtract another complex number
   * @param {Complex|number} other - Complex number or real number to subtract
   * @returns {Complex} Result
   */
  subtract(other) {
    if (typeof other === 'number') {
      return new Complex(this.real - other, this.imag)
    }
    return new Complex(this.real - other.real, this.imag - other.imag)
  }

  /**
   * Multiply by another complex number or scalar
   * @param {Complex|number} other - Complex number or real number to multiply
   * @returns {Complex} Result
   */
  multiply(other) {
    if (typeof other === 'number') {
      return new Complex(this.real * other, this.imag * other)
    }

    // (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
    const real = this.real * other.real - this.imag * other.imag
    const imag = this.real * other.imag + this.imag * other.real
    return new Complex(real, imag)
  }

  /**
   * Divide by another complex number or scalar
   * @param {Complex|number} other - Complex number or real number to divide by
   * @returns {Complex} Result
   */
  divide(other) {
    if (typeof other === 'number') {
      return new Complex(this.real / other, this.imag / other)
    }

    // (a + bi) / (c + di) = ((ac + bd) + (bc - ad)i) / (c² + d²)
    const denominator = other.real * other.real + other.imag * other.imag
    const real = (this.real * other.real + this.imag * other.imag) / denominator
    const imag = (this.imag * other.real - this.real * other.imag) / denominator
    return new Complex(real, imag)
  }

  /**
   * Raise to a power
   * @param {number} exponent - Power to raise to
   * @returns {Complex} Result
   */
  pow(exponent) {
    if (exponent === 0) {
      return new Complex(1, 0)
    }

    if (exponent === 1) {
      return new Complex(this.real, this.imag)
    }

    // Use polar form for exponentiation
    const r = this.magnitude
    const theta = this.angle
    const newR = Math.pow(r, exponent)
    const newTheta = theta * exponent

    return new Complex(newR * Math.cos(newTheta), newR * Math.sin(newTheta))
  }

  /**
   * Calculate square root
   * @returns {Complex} Square root
   */
  sqrt() {
    const r = this.magnitude
    const theta = this.angle
    const sqrtR = Math.sqrt(r)
    const halfTheta = theta / 2

    return new Complex(sqrtR * Math.cos(halfTheta), sqrtR * Math.sin(halfTheta))
  }

  /**
   * Get complex conjugate
   * @returns {Complex} Conjugate
   */
  conjugate() {
    return new Complex(this.real, -this.imag)
  }

  /**
   * Check if equal to another complex number
   * @param {Complex} other - Complex number to compare
   * @param {number} tolerance - Tolerance for comparison
   * @returns {boolean} True if equal within tolerance
   */
  equals(other, tolerance = 1e-10) {
    return (
      Math.abs(this.real - other.real) < tolerance &&
      Math.abs(this.imag - other.imag) < tolerance
    )
  }

  /**
   * Convert to polar coordinates
   * @returns {Object} { magnitude, angle }
   */
  toPolar() {
    return {
      magnitude: this.magnitude,
      angle: this.angle,
    }
  }

  /**
   * Calculate reciprocal of complex number
   * @returns {Complex} Reciprocal
   */
  reciprocal() {
    const magSq = this.real * this.real + this.imag * this.imag
    if (magSq === 0) {
      throw new Error('Cannot take reciprocal of zero')
    }
    return new Complex(this.real / magSq, -this.imag / magSq)
  }

  /**
   * Convert to string representation
   * @returns {string} String representation
   */
  toString() {
    if (this.imag === 0) {
      return this.real.toString()
    } else if (this.real === 0) {
      return `${this.imag}i`
    } else if (this.imag < 0) {
      return `${this.real} - ${Math.abs(this.imag)}i`
    } else {
      return `${this.real} + ${this.imag}i`
    }
  }

  /**
   * Convert to polar form string
   * @returns {string} Polar representation
   */
  toPolarString() {
    return `${this.magnitude}∠${((this.angle * 180) / Math.PI).toFixed(2)}°`
  }

  /**
   * Create complex number from polar coordinates
   * @param {number} magnitude - Magnitude
   * @param {number} angle - Angle in radians
   * @returns {Complex} Complex number
   */
  static fromPolar(magnitude, angle) {
    return new Complex(magnitude * Math.cos(angle), magnitude * Math.sin(angle))
  }

  /**
   * Create complex number from string
   * @param {string} str - String representation
   * @returns {Complex} Complex number
   */
  static fromString(str) {
    // Simple parser for complex number strings
    const match = str.match(/([+-]?\d*\.?\d+)([+-]\d*\.?\d+)i/)
    if (match) {
      const real = parseFloat(match[1])
      const imag = parseFloat(match[2])
      return new Complex(real, imag)
    }

    // Try parsing as real number
    const real = parseFloat(str)
    if (!isNaN(real)) {
      return new Complex(real, 0)
    }

    throw new Error(`Invalid complex number string: ${str}`)
  }
}

module.exports = Complex
