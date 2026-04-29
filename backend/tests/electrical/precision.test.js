/**
 * Electrical Precision Tests
 * 
 * Tests for IEEE standard compliance (6+ decimal places)
 * and electrical calculation accuracy
 * 
 * IEEE Standards: 1584, 141, 242
 * IEC Standards: 60909
 */

const {
  toElectricalPrecision,
  convertVoltage,
  convertCurrent,
  convertPower,
  convertImpedance,
  calculatePowerFactor,
  calculateReactivePower,
  calculateApparentPower,
  validateElectricalValue,
  formatElectricalValue,
  calculateShortCircuitCurrent,
  calculateVoltageDrop,
  calculatePowerLoss
} = require('../../src/shared/utils/electricalUtils');

describe('Electrical Precision Tests', () => {
  describe('toElectricalPrecision', () => {
    test('should apply IEEE standard precision (6 decimal places)', () => {
      expect(toElectricalPrecision(1.23456789)).toBe(1.234568);
      expect(toElectricalPrecision(12.3456789)).toBe(12.345679);
      expect(toElectricalPrecision(123.456789)).toBe(123.456789);
    });

    test('should handle custom precision', () => {
      expect(toElectricalPrecision(1.23456789, 8)).toBe(1.23456789);
      expect(toElectricalPrecision(1.23456789, 4)).toBe(1.2346);
    });

    test('should handle edge cases', () => {
      expect(toElectricalPrecision(NaN)).toBeNaN();
      expect(toElectricalPrecision(null)).toBe(null);
      expect(toElectricalPrecision(undefined)).toBe(undefined);
      expect(toElectricalPrecision('string')).toBe('string');
    });

    test('should handle very small numbers', () => {
      expect(toElectricalPrecision(0.0000001)).toBe(0);
      expect(toElectricalPrecision(0.000001)).toBe(0.000001);
    });

    test('should handle very large numbers', () => {
      expect(toElectricalPrecision(1234567.89)).toBe(1234567.89);
      expect(toElectricalPrecision(12345678.9)).toBe(12345678.9);
    });
  });

  describe('Voltage Conversion', () => {
    test('should convert between voltage units with precision', () => {
      // V to kV
      expect(convertVoltage(1000, 'V', 'kV')).toBe(1);
      expect(convertVoltage(13800, 'V', 'kV')).toBe(13.8);
      
      // kV to V
      expect(convertVoltage(13.8, 'kV', 'V')).toBe(13800);
      expect(convertVoltage(1, 'kV', 'V')).toBe(1000);
      
      // V to MV
      expect(convertVoltage(1000000, 'V', 'MV')).toBe(1);
      expect(convertVoltage(13800000, 'V', 'MV')).toBe(13.8);
      
      // MV to kV
      expect(convertVoltage(1, 'MV', 'kV')).toBe(1000);
      expect(convertVoltage(13.8, 'MV', 'kV')).toBe(13800);
    });

    test('should handle per-unit conversions', () => {
      const baseVoltage = 13.8; // kV
      
      // per-unit to kV
      expect(convertVoltage(1.0, 'per-unit', 'kV', baseVoltage)).toBe(13.8);
      expect(convertVoltage(0.9, 'per-unit', 'kV', baseVoltage)).toBe(12.42);
      
      // kV to per-unit
      expect(convertVoltage(13.8, 'kV', 'per-unit', baseVoltage)).toBe(1);
      expect(convertVoltage(12.42, 'kV', 'per-unit', baseVoltage)).toBe(0.9);
    });

    test('should maintain precision in conversions', () => {
      const result = convertVoltage(13.812345, 'kV', 'V');
      expect(result).toBeCloseTo(13812.345, 5);
      expect(result.toString()).toMatch(/^\d+\.?\d{3,}$/); // Should have 3+ decimal places
    });
  });

  describe('Current Conversion', () => {
    test('should convert between current units with precision', () => {
      // A to kA
      expect(convertCurrent(1000, 'A', 'kA')).toBe(1);
      expect(convertCurrent(1500, 'A', 'kA')).toBe(1.5);
      
      // kA to A
      expect(convertCurrent(1.5, 'kA', 'A')).toBe(1500);
      expect(convertCurrent(1, 'kA', 'A')).toBe(1000);
      
      // A to mA
      expect(convertCurrent(1, 'A', 'mA')).toBe(1000);
      expect(convertCurrent(0.5, 'A', 'mA')).toBe(500);
      
      // mA to A
      expect(convertCurrent(1000, 'mA', 'A')).toBe(1);
      expect(convertCurrent(500, 'mA', 'A')).toBe(0.5);
    });
  });

  describe('Power Conversion', () => {
    test('should convert between power units with precision', () => {
      // W to kW
      expect(convertPower(1000, 'W', 'kW')).toBe(1);
      expect(convertPower(1500, 'W', 'kW')).toBe(1.5);
      
      // kW to MW
      expect(convertPower(1000, 'kW', 'MW')).toBe(1);
      expect(convertPower(1.5, 'kW', 'MW')).toBe(0.0015);
      
      // VA to kVA
      expect(convertPower(1000, 'VA', 'kVA')).toBe(1);
      expect(convertPower(1500, 'VA', 'kVA')).toBe(1.5);
      
      // kVA to MVA
      expect(convertPower(1000, 'kVA', 'MVA')).toBe(1);
      expect(convertPower(1.5, 'kVA', 'MVA')).toBe(0.0015);
    });
  });

  describe('Impedance Conversion', () => {
    test('should convert between impedance units with precision', () => {
      // Ω to kΩ
      expect(convertImpedance(1000, 'Ω', 'kΩ')).toBe(1);
      expect(convertImpedance(1500, 'Ω', 'kΩ')).toBe(1.5);
      
      // kΩ to MΩ
      expect(convertImpedance(1000, 'kΩ', 'MΩ')).toBe(1);
      expect(convertImpedance(1.5, 'kΩ', 'MΩ')).toBe(0.0015);
      
      // Ω to per-unit
      const baseImpedance = 10; // Ω
      expect(convertImpedance(10, 'Ω', 'pu', baseImpedance)).toBe(1);
      expect(convertImpedance(5, 'Ω', 'pu', baseImpedance)).toBe(0.5);
      
      // per-unit to Ω
      expect(convertImpedance(1, 'pu', 'Ω', baseImpedance)).toBe(10);
      expect(convertImpedance(0.5, 'pu', 'Ω', baseImpedance)).toBe(5);
    });
  });

  describe('Power Calculations', () => {
    test('should calculate power factor with precision', () => {
      expect(calculatePowerFactor(800, 1000)).toBeCloseTo(0.8, 5);
      expect(calculatePowerFactor(600, 1000)).toBeCloseTo(0.6, 5);
      expect(calculatePowerFactor(0, 1000)).toBe(0);
      expect(calculatePowerFactor(1000, 0)).toBe(0);
    });

    test('should calculate reactive power with precision', () => {
      expect(calculateReactivePower(1000, 800)).toBeCloseTo(600, 5);
      expect(calculateReactivePower(1000, 600)).toBeCloseTo(800, 5);
      expect(calculateReactivePower(1000, 1000)).toBe(0);
    });

    test('should calculate apparent power with precision', () => {
      // Test with line-to-line voltage and line current
      // Implementation uses: Apparent Power = V × I × √3
      expect(calculateApparentPower(800, 600)).toBeCloseTo(831.384, 3);
      expect(calculateApparentPower(600, 800)).toBeCloseTo(831.384, 3);
      expect(calculateApparentPower(1000, 1000)).toBeCloseTo(1732.051, 3);
    });
  });

  describe('Electrical Value Validation', () => {
    test('should validate voltage ranges', () => {
      // Valid voltages
      expect(validateElectricalValue(13.8, 'voltage', 'kV').valid).toBe(true);
      expect(validateElectricalValue(13800, 'voltage', 'V').valid).toBe(true);
      expect(validateElectricalValue(0.9, 'voltage', 'per-unit').valid).toBe(true);
      
      // Invalid voltages
      expect(validateElectricalValue(-1, 'voltage', 'kV').valid).toBe(false);
      expect(validateElectricalValue(2000, 'voltage', 'kV').valid).toBe(false);
      expect(validateElectricalValue(3, 'voltage', 'per-unit').valid).toBe(false);
    });

    test('should validate current ranges', () => {
      // Valid currents
      expect(validateElectricalValue(100, 'current', 'A').valid).toBe(true);
      expect(validateElectricalValue(1.5, 'current', 'kA').valid).toBe(true);
      expect(validateElectricalValue(500, 'current', 'mA').valid).toBe(true);
      
      // Invalid currents
      expect(validateElectricalValue(-1, 'current', 'A').valid).toBe(false);
      expect(validateElectricalValue(200, 'current', 'kA').valid).toBe(false);
    });

    test('should validate power ranges', () => {
      // Valid powers
      expect(validateElectricalValue(1000, 'power', 'kW').valid).toBe(true);
      expect(validateElectricalValue(-500, 'power', 'kW').valid).toBe(true);
      expect(validateElectricalValue(1.5, 'power', 'MVA').valid).toBe(true);
      
      // Invalid powers
      expect(validateElectricalValue(-2000, 'power', 'MW').valid).toBe(false);
      expect(validateElectricalValue(-1, 'power', 'kVA').valid).toBe(false);
      expect(validateElectricalValue(2000, 'power', 'MVA').valid).toBe(false);
    });

    test('should validate impedance ranges', () => {
      // Valid impedances
      expect(validateElectricalValue(10, 'impedance', 'Ω').valid).toBe(true);
      expect(validateElectricalValue(0.5, 'impedance', 'kΩ').valid).toBe(true);
      expect(validateElectricalValue(1.0, 'impedance', 'pu').valid).toBe(true);
      
      // Invalid impedances
      expect(validateElectricalValue(-1, 'impedance', 'Ω').valid).toBe(false);
      expect(validateElectricalValue(20, 'impedance', 'kΩ').valid).toBe(false);
      expect(validateElectricalValue(15, 'impedance', 'pu').valid).toBe(false);
    });
  });

  describe('Electrical Calculations', () => {
    test('should calculate short circuit current with precision', () => {
      const voltage = 13800; // V
      const impedance = 10; // Ω
      
      const expectedCurrent = voltage / (Math.sqrt(3) * impedance);
      const result = calculateShortCircuitCurrent(voltage, impedance);
      
      expect(result).toBeCloseTo(expectedCurrent, 5);
      expect(result.toString()).toMatch(/^\d+\.?\d{6}$/); // IEEE precision
    });

    test('should throw error for zero impedance in short circuit calculation', () => {
      expect(() => {
        calculateShortCircuitCurrent(13800, 0);
      }).toThrow('Impedance cannot be zero for short circuit calculation');
    });

    test('should calculate voltage drop with precision', () => {
      const current = 100; // A
      const resistance = 0.1; // Ω
      const reactance = 0.05; // Ω
      const length = 5; // km
      
      const expectedDrop = current * Math.sqrt(resistance ** 2 + reactance ** 2) * length;
      const result = calculateVoltageDrop(current, resistance, reactance);
      
      expect(result.magnitude).toBeCloseTo(expectedDrop, 5);
      expect(result.angle).toBeDefined();
      expect(result.complex).toBeDefined();
    });

    test('should calculate power loss with precision', () => {
      const current = 10; // A
      const resistance = 10; // Ω
      
      const expectedLoss = current ** 2 * resistance;
      const result = calculatePowerLoss(current, resistance);
      
      expect(result).toBeCloseTo(expectedLoss, 5);
    });
  });

  describe('Format Electrical Values', () => {
    test('should format electrical values with units and precision', () => {
      expect(formatElectricalValue(13.812345, 'kV')).toBe('13.812345 kV');
      expect(formatElectricalValue(1.23456789, 'MW')).toBe('1.234568 MW');
      expect(formatElectricalValue(100.123456, 'A')).toBe('100.123456 A');
    });

    test('should handle custom precision in formatting', () => {
      expect(formatElectricalValue(1.23456789, 'kV', 8)).toBe('1.23456789 kV');
      expect(formatElectricalValue(1.23456789, 'kV', 4)).toBe('1.2346 kV');
    });
  });

  describe('IEEE Standard Compliance', () => {
    test('should maintain minimum 6 decimal places for precision', () => {
      const testValues = [
        1.23456789,
        12.3456789,
        123.456789,
        0.123456789,
        0.0123456789
      ];
      
      testValues.forEach(value => {
        const result = toElectricalPrecision(value);
        const decimalPlaces = result.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeGreaterThanOrEqual(6);
      });
    });

    test('should handle IEEE standard voltage ranges', () => {
      // Typical distribution voltages should be valid
      expect(validateElectricalValue(13.8, 'voltage', 'kV').valid).toBe(true);
      expect(validateElectricalValue(34.5, 'voltage', 'kV').valid).toBe(true);
      expect(validateElectricalValue(69, 'voltage', 'kV').valid).toBe(true);
      expect(validateElectricalValue(138, 'voltage', 'kV').valid).toBe(true);
    });

    test('should handle IEEE standard current ranges', () => {
      // Typical fault currents should be valid
      expect(validateElectricalValue(10000, 'current', 'A').valid).toBe(true);
      expect(validateElectricalValue(20000, 'current', 'A').valid).toBe(true);
      expect(validateElectricalValue(10, 'current', 'kA').valid).toBe(true);
      expect(validateElectricalValue(20, 'current', 'kA').valid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid unit combinations', () => {
      expect(() => {
        convertVoltage(1000, 'V', 'invalid');
      }).toThrow();
      
      expect(validateElectricalValue(100, 'invalid', 'V').valid).toBe(false);
    });

    test('should handle zero and negative values appropriately', () => {
      // Zero should be valid for most electrical quantities
      expect(validateElectricalValue(0, 'voltage', 'kV').valid).toBe(true);
      expect(validateElectricalValue(0, 'current', 'A').valid).toBe(true);
      expect(validateElectricalValue(0, 'impedance', 'Ω').valid).toBe(true);
      
      // Negative should only be valid for power (generation)
      expect(validateElectricalValue(-100, 'power', 'kW').valid).toBe(true);
      expect(validateElectricalValue(-100, 'voltage', 'kV').valid).toBe(false);
      expect(validateElectricalValue(-100, 'current', 'A').valid).toBe(false);
    });

    test('should handle very large and very small values', () => {
      // Very large values
      expect(convertVoltage(1000000, 'V', 'kV')).toBe(1000);
      expect(convertCurrent(100000, 'A', 'kA')).toBe(100);
      
      // Very small values
      expect(convertVoltage(0.001, 'kV', 'V')).toBe(1);
      expect(convertCurrent(0.001, 'kA', 'A')).toBe(1);
    });
  });
});
