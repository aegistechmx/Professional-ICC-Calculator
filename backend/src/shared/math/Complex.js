/**
 * Complex.js - Complex number operations
 * Responsibility: Pure mathematical operations on complex numbers
 */
class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }

  add(c) {
    return new Complex(this.re + c.re, this.im + c.im);
  }

  sub(c) {
    return new Complex(this.re - c.re, this.im - c.im);
  }

  mul(c) {
    return new Complex(
      this.re * c.re - this.im * c.im,
      this.re * c.im + this.im * c.re
    );
  }

  div(c) {
    const denom = c.re * c.re + c.im * c.im;
    if (denom === 0) {
      throw new Error('Division by zero in complex number');
    }
    return new Complex(
      (this.re * c.re + this.im * c.im) / denom,
      (this.im * c.re - this.re * c.im) / denom
    );
  }

  mag() {
    return Math.sqrt(this.re ** 2 + this.im ** 2);
  }

  angle() {
    return Math.atan2(this.im, this.re);
  }

  conjugate() {
    return new Complex(this.re, -this.im);
  }

  scale(s) {
    return new Complex(this.re * s, this.im * s);
  }

  static fromPolar(mag, ang) {
    return new Complex(mag * Math.cos(ang), mag * Math.sin(ang));
  }

  static zero() {
    return new Complex(0, 0);
  }

  static one() {
    return new Complex(1, 0);
  }

  toString() {
    const sign = this.im >= 0 ? '+' : '-';
    return `${this.re.toFixed(6)} ${sign} j${Math.abs(this.im).toFixed(6)}`;
  }
}

module.exports = Complex;
