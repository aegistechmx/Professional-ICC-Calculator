/**
 * Complex number class for electrical calculations
 * Lightweight implementation without external dependencies
 */

class Complex {
  constructor(re, im = 0) {
    this.re = re;
    this.im = im;
  }
  
  /**
   * Addition
   */
  add(b) {
    return new Complex(this.re + b.re, this.im + b.im);
  }
  
  /**
   * Subtraction
   */
  sub(b) {
    return new Complex(this.re - b.re, this.im - b.im);
  }
  
  /**
   * Multiplication
   */
  mul(b) {
    return new Complex(
      this.re * b.re - this.im * b.im,
      this.re * b.im + this.im * b.re
    );
  }
  
  /**
   * Division
   */
  div(b) {
    const d = b.re * b.re + b.im * b.im;
    if (d === 0) {
      throw new Error('Division by zero in complex division');
    }
    return new Complex(
      (this.re * b.re + this.im * b.im) / d,
      (this.im * b.re - this.re * b.im) / d
    );
  }
  
  /**
   * Complex conjugate
   */
  conj() {
    return new Complex(this.re, -this.im);
  }
  
  /**
   * Magnitude (absolute value)
   */
  abs() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }
  
  /**
   * Phase angle (in radians)
   */
  arg() {
    return Math.atan2(this.im, this.re);
  }
  
  /**
   * Complex exponential
   */
  exp() {
    const mag = Math.exp(this.re);
    return new Complex(
      mag * Math.cos(this.im),
      mag * Math.sin(this.im)
    );
  }
  
  /**
   * Complex logarithm
   */
  log() {
    return new Complex(
      Math.log(this.abs()),
      this.arg()
    );
  }
  
  /**
   * Power (integer exponent)
   */
  pow(n) {
    if (n === 0) return new Complex(1, 0);
    if (n === 1) return new Complex(this.re, this.im);
    
    let result = new Complex(1, 0);
    let base = new Complex(this.re, this.im);
    
    for (let i = 0; i < Math.abs(n); i++) {
      result = result.mul(base);
    }
    
    return n < 0 ? new Complex(1, 0).div(result) : result;
  }
  
  /**
   * Square root
   */
  sqrt() {
    const r = this.abs();
    const theta = this.arg();
    return new Complex(
      Math.sqrt(r) * Math.cos(theta / 2),
      Math.sqrt(r) * Math.sin(theta / 2)
    );
  }
  
  /**
   * Negation
   */
  neg() {
    return new Complex(-this.re, -this.im);
  }
  
  /**
   * String representation
   */
  toString() {
    if (this.im === 0) return `${this.re.toFixed(4)}`;
    if (this.re === 0) return `${this.im.toFixed(4)}j`;
    const sign = this.im >= 0 ? '+' : '-';
    return `${this.re.toFixed(4)} ${sign} ${Math.abs(this.im).toFixed(4)}j`;
  }
  
  /**
   * Clone
   */
  clone() {
    return new Complex(this.re, this.im);
  }
}

// Imaginary unit
const j = new Complex(0, 1);

// Static factory methods
Complex.fromPolar = (magnitude, angle) => {
  return new Complex(
    magnitude * Math.cos(angle),
    magnitude * Math.sin(angle)
  );
};

Complex.zero = () => new Complex(0, 0);
Complex.one = () => new Complex(1, 0);
Complex.i = () => new Complex(0, 1);

module.exports = { Complex, j };
