/**
 * shared/math/Complex.js - Complex number operations
 * 
 * Responsibility: Handle complex arithmetic for power system calculations
 */

class Complex {
  constructor(real = 0, imag = 0) {
    this.real = real;
    this.imag = imag;
  }

  get magnitude() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  get angle() {
    return Math.atan2(this.imag, this.real);
  }

  static fromPolar(magnitude, angle) {
    return new Complex(
      magnitude * Math.cos(angle),
      magnitude * Math.sin(angle)
    );
  }

  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }

  subtract(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }

  multiply(other) {
    if (typeof other === 'number') {
      return new Complex(this.real * other, this.imag * other);
    }
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real
    );
  }

  divide(other) {
    if (typeof other === 'number') {
      return new Complex(this.real / other, this.imag / other);
    }
    
    const denominator = other.real * other.real + other.imag * other.imag;
    return new Complex(
      (this.real * other.real + this.imag * other.imag) / denominator,
      (this.imag * other.real - this.real * other.imag) / denominator
    );
  }

  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  reciprocal() {
    const denominator = this.real * this.real + this.imag * this.imag;
    return new Complex(this.real / denominator, -this.imag / denominator);
  }

  pow(n) {
    if (n === 0) return new Complex(1, 0);
    if (n === 1) return this;
    if (n === 2) return this.multiply(this);
    
    const magnitude = Math.pow(this.magnitude, n);
    const angle = this.angle * n;
    return Complex.fromPolar(magnitude, angle);
  }

  sqrt() {
    return this.pow(0.5);
  }

  equals(other, tolerance = 1e-10) {
    return Math.abs(this.real - other.real) < tolerance &&
           Math.abs(this.imag - other.imag) < tolerance;
  }

  toString() {
    if (this.imag === 0) return `${this.real}`;
    if (this.real === 0) return `${this.imag}i`;
    if (this.imag < 0) return `${this.real} - ${Math.abs(this.imag)}i`;
    return `${this.real} + ${this.imag}i`;
  }

  toJSON() {
    return {
      real: this.real,
      imag: this.imag,
      magnitude: this.magnitude,
      angle: this.angle
    };
  }

  static fromJSON(json) {
    return new Complex(json.real, json.imag);
  }

  static zero() {
    return new Complex(0, 0);
  }

  static one() {
    return new Complex(1, 0);
  }

  static i() {
    return new Complex(0, 1);
  }
}

module.exports = Complex;
