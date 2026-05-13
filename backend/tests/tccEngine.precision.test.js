const TCCEngine = require('../src/domain/services/tccEngine.domain');

describe('TCC Engine Precision Tests', () => {
  const engine = new TCCEngine();

  /**
   * Helper to count decimal places in a number
   */
  const countDecimals = (val) => {
    if (Math.floor(val) === val) return 0;
    const str = val.toString();
    if (str.includes('.')) {
      return str.split('.')[1].length;
    }
    return 0;
  };

  test('should maintain 6-decimal precision for IEC Standard Inverse curve', () => {
    const breaker = {
      pickup: 200,
      TMS: 0.1,
      curve: 'standard',
      standard: 'IEC',
      instantaneous: 1000,
      Imax: 10000
    };

    const curve = engine.generateTCCCurve(breaker);

    curve.forEach(point => {
      expect(countDecimals(point.I)).toBeLessThanOrEqual(6);
      expect(countDecimals(point.t)).toBeLessThanOrEqual(6);
      // Verification using standard formatting
      expect(parseFloat(point.I.toFixed(6))).toBe(point.I);
      expect(parseFloat(point.t.toFixed(6))).toBe(point.t);
    });
  });

  test('should maintain 6-decimal precision for IEEE Very Inverse curve', () => {
    const breaker = {
      pickup: 100,
      TMS: 0.5,
      curve: 'very',
      standard: 'IEEE',
      instantaneous: 500,
      Imax: 5000
    };

    const curve = engine.generateTCCCurve(breaker);

    curve.forEach(point => {
      expect(countDecimals(point.I)).toBeLessThanOrEqual(6);
      expect(countDecimals(point.t)).toBeLessThanOrEqual(6);
    });
  });
});