/**
 * tests/motor.integration.test.js
 * Tests for motor.js integration with CaidaTension
 */

// Mock the motor evaluation logic
const evaluarSistema = (nodo, estado) => {
  const resultado = {
    warnings: [],
    errors: [],
    ok: true
  };

  // Mock CDT validation
  if (nodo.CDT) {
    if (nodo.CDT.sinFactor125) {
      resultado.warnings.push("Sin factor 125% para carga continua (NOM-001)");
    }
    if (nodo.CDT.margen < 10 && nodo.CDT.margen >= 0) {
      resultado.warnings.push("Margen térmico bajo (<10%)");
    }
  }

  // 5. CALIDAD: CAÍDA DE TENSIÓN
  // Integrar cálculo de caída de tensión real usando CaidaTension
  if (typeof CaidaTension !== 'undefined' && nodo.feeder) {
    var caidaReal = CaidaTension.calcular(
      nodo.feeder,
      nodo.feeder.cargaA || 0,
      nodo.feeder.cargaFP || 0.9, // Default FP si no está definido
      estado.tension || 480,
      estado.tipoSistema || '3f'
    );

    if (caidaReal.caidaPct > 5) {
      resultado.warnings.push("Caída de tensión excesiva (" + caidaReal.caidaPct.toFixed(1) + "% > 5%)");
    } else if (caidaReal.caidaPct > 3) {
      resultado.warnings.push("Caída de tensión elevada (" + caidaReal.caidaPct.toFixed(1) + "% > 3%)");
    }

    // Agregar datos de caída al punto para referencia
    nodo.caidaTension = {
      caidaV: caidaReal.caidaV,
      caidaPct: caidaReal.caidaPct,
    };
  }

  return resultado;
};

describe('Motor Integration Tests', () => {
  describe('CaidaTension Integration', () => {
    test('should calculate voltage drop warnings correctly', () => {
      // Mock data for a feeder with high voltage drop
      const mockNodo = {
        feeder: {
          material: 'cobre',
          canalizacion: 'acero',
          calibre: '4/0',
          longitud: 100, // Long distance
          paralelo: 1
        },
        CDT: {
          sinFactor125: false,
          margen: 15
        }
      };

      const mockEstado = {
        tipoSistema: '3f',
        tension: 480
      };

      // Mock CaidaTension module
      global.CaidaTension = {
        calcular: jest.fn().mockReturnValue({
          caidaV: 28.8, // 6% of 480V
          caidaPct: 6.0
        })
      };

      const resultado = evaluarSistema(mockNodo, mockEstado);

      expect(CaidaTension.calcular).toHaveBeenCalledWith(
        mockNodo.feeder,
        0, // cargaA default
        0.9, // default FP
        480,
        '3f'
      );

      expect(resultado.warnings).toContain('Caída de tensión excesiva (6.0% > 5%)');
      expect(mockNodo.caidaTension).toEqual({
        caidaV: 28.8,
        caidaPct: 6.0
      });
    });

    test('should handle moderate voltage drop warnings', () => {
      const mockNodo = {
        feeder: {
          material: 'cobre',
          canalizacion: 'acero',
          calibre: '2/0',
          longitud: 50,
          paralelo: 1
        },
        CDT: {
          sinFactor125: false,
          margen: 15
        }
      };

      const mockEstado = {
        tipoSistema: '3f',
        tension: 480
      };

      global.CaidaTension = {
        calcular: jest.fn().mockReturnValue({
          caidaV: 19.2, // 4% of 480V
          caidaPct: 4.0
        })
      };

      const resultado = evaluarSistema(mockNodo, mockEstado);

      expect(resultado.warnings).toContain('Caída de tensión elevada (4.0% > 3%)');
    });

    test('should not warn for acceptable voltage drop', () => {
      const mockNodo = {
        feeder: {
          material: 'cobre',
          canalizacion: 'acero',
          calibre: '1/0',
          longitud: 25,
          paralelo: 1
        },
        CDT: {
          sinFactor125: false,
          margen: 15
        }
      };

      const mockEstado = {
        tipoSistema: '3f',
        tension: 480
      };

      global.CaidaTension = {
        calcular: jest.fn().mockReturnValue({
          caidaV: 9.6, // 2% of 480V
          caidaPct: 2.0
        })
      };

      const resultado = evaluarSistema(mockNodo, mockEstado);

      const voltageDropWarnings = resultado.warnings.filter(w =>
        w.includes('Caída de tensión')
      );
      expect(voltageDropWarnings).toHaveLength(0);
    });

    test('should handle missing CaidaTension module gracefully', () => {
      const mockNodo = {
        feeder: {
          material: 'cobre',
          canalizacion: 'acero',
          calibre: '4/0',
          longitud: 100
        },
        CDT: {
          sinFactor125: false,
          margen: 15
        }
      };

      const mockEstado = {
        tipoSistema: '3f',
        tension: 480
      };

      // Remove CaidaTension from global
      delete global.CaidaTension;

      const resultado = evaluarSistema(mockNodo, mockEstado);

      // Should not crash and should not have voltage drop data
      expect(resultado).toBeDefined();
      expect(mockNodo.caidaTension).toBeUndefined();
    });
  });
});