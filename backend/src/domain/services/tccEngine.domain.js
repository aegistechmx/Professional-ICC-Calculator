const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * backend/src/domain/services/tccEngine.domain.js
 * Motor de Curvas TCC (Time-Current Coordination)
 * Implementación IEC 60255 e IEEE C37.112
 */

class TCCEngine {
  constructor() {
    // Curvas IEC 60255
    this.iecCurves = {
      standard: { k: 0.14, alpha: 0.02, name: 'Standard Inverse' },
      very: { k: 13.5, alpha: 1, name: 'Very Inverse' },
      extreme: { k: 80, alpha: 2, name: 'Extremely Inverse' },
      long: { k: 120, alpha: 1, name: 'Long Time Inverse' }
    };

    // Curvas IEEE C37.112 (Moderately Inverse)
    this.ieeeCurves = {
      moderate: { A: 0.0515, B: 0.02, p: 0.02, name: 'Moderately Inverse' },
      very: { A: 19.61, B: 2, p: 2, name: 'Very Inverse' },
      extreme: { A: 28.2, B: 2, p: 2, name: 'Extremely Inverse' }
    };
  }

  /**
   * Calcular tiempo de disparo según curva IEC
   * @param {number} I - Corriente actual (A)
   * @param {number} Is - Pickup / corriente de ajuste (A)
   * @param {number} TMS - Time Multiplier Setting (0.1 a 1.0)
   * @param {string} curveType - Tipo de curva (standard, very, extreme, long)
   * @returns {number} Tiempo de disparo en segundos
   */
  calculateIEC(I, Is, TMS, curveType = 'standard') {
    const curve = this.iecCurves[curveType];
    if (!curve) {
      throw new Error(`Curva IEC no válida: ${curveType}`);
    }

    // Si la corriente es menor o igual al pickup, no dispara
    if (I <= Is) {
      return Infinity;
    }

    const { k, alpha } = curve;
    
    // Fórmula IEC: t = (k * TMS) / ((I/Is)^alpha - 1)
    const ratio = I / Is;
    const time = (k * TMS) / (Math.pow(ratio, alpha) - 1);
    
    return Math.max(time, 0.02); // Mínimo 20ms (tiempo mecánico)
  }

  /**
   * Calcular tiempo de disparo según curva IEEE
   * @param {number} I - Corriente actual (A)
   * @param {number} Ip - Pickup / corriente de ajuste (A)
   * @param {string} curveType - Tipo de curva (moderate, very, extreme)
   * @param {number} TD - Time Dial (1 a 10)
   * @returns {number} Tiempo de disparo en segundos
   */
  calculateIEEE(I, Ip, curveType = 'moderate', TD = 1) {
    const curve = this.ieeeCurves[curveType];
    if (!curve) {
      throw new Error(`Curva IEEE no válida: ${curveType}`);
    }

    if (I <= Ip) {
      return Infinity;
    }

    const { A, B } = curve;
    const ratio = I / Ip;
    
    // Fórmula IEEE: t = (TD * A) / ((I/Ip)^B - 1)
    const time = (TD * A) / (Math.pow(ratio, B) - 1);
    
    return Math.max(time, 0.02);
  }

  /**
   * Calcular tiempo de disparo instantáneo
   * @param {number} I - Corriente actual (A)
   * @param {number} Ii - Corriente de disparo instantáneo (A)
   * @returns {number|null} Tiempo de disparo o null si no aplica
   */
  calculateInstantaneous(I, Ii) {
    if (I >= Ii) {
      return 0.02; // 20ms típico para disparo instantáneo
    }
    return null;
  }

  /**
   * Generar curva TCC completa para graficar
   * @param {Object} breaker - Configuración del breaker
   * @returns {Array} Array de puntos {I, t}
   */
  generateTCCCurve(breaker) {
    const {
      pickup,
      TMS = 0.1,
      curve = 'standard',
      standard = 'IEC',
      instantaneous = null,
      Imax = 10000,
      TD = 1
    } = breaker;

    if (!pickup) {
      throw new Error('Se requiere pickup (corriente de ajuste)');
    }

    const data = [];
    
    // Generar puntos desde 1.1x pickup hasta Imax
    // Usar escala logarítmica para los puntos
    const startMultiplier = 1.1;
    const endMultiplier = Imax / pickup;
    const steps = 50;
    const logStart = Math.log10(startMultiplier);
    const logEnd = Math.log10(endMultiplier);
    const logStep = (logEnd - logStart) / steps;

    for (let i = 0; i <= steps; i++) {
      const multiplier = Math.pow(10, logStart + (logStep * i));
      const I = pickup * multiplier;
      
      let t;
      
      if (standard === 'IEC') {
        t = this.calculateIEC(I, pickup, TMS, curve);
      } else {
        t = this.calculateIEEE(I, pickup, curve, TD);
      }

      // Solo incluir tiempos válidos (0.02s a 1000s)
      if (t >= 0.02 && t <= 1000) {
        data.push({
          I: toElectricalPrecision(parseFloat(I.toFixed(2))),
          t: toElectricalPrecision(parseFloat(t.toFixed(4)))
        });
      }
    }

    // Agregar disparo instantáneo si aplica
    if (instantaneous && instantaneous > pickup) {
      data.push({
        I: instantaneous,
        t: 0.02
      });
      
      // Punto final de la curva instantánea
      data.push({
        I: Imax,
        t: 0.02
      });
    }

    return data.sort((a, b) => a.I - b.I);
  }

  /**
   * Generar curva de carga (motor)
   * @param {Object} load - Configuración de la carga
   * @returns {Array} Array de puntos {I, t}
   */
  generateLoadCurve(load) {
    const {
      In, // Corriente nominal
      Iarranque = 6 * In, // Corriente de arranque típica
      tiempoArranque = 10 // Tiempo de arranque típico
    } = load;

    const data = [];

    // Punto de operación normal
    data.push({
      I: In,
      t: Infinity
    });

    // Zona de arranque permitida
    data.push({
      I: Iarranque,
      t: tiempoArranque
    });

    // Sobrecarga
    data.push({
      I: Iarranque * 1.5,
      t: 1
    });

    return data;
  }

  /**
   * Verificar coordinación entre dos curvas
   * @param {Array} curveDownstream - Curva aguas abajo (más cercana a carga)
   * @param {Array} curveUpstream - Curva aguas arriba (backup)
   * @param {number} margin - Margen de coordinación (0.2 = 20%)
   * @returns {Object} Resultado de coordinación
   */
  checkCoordination(curveDownstream, curveUpstream, margin = 0.2) {
    const conflicts = [];
    let minTimeDifference = Infinity;

    // Para cada punto en la curva aguas abajo
    curveDownstream.forEach(p1 => {
      // Encontrar punto correspondiente en curva aguas arriba
      const p2 = curveUpstream.find(p => Math.abs(p.I - p1.I) < p1.I * 0.01);
      
      if (p2) {
        // Verificar que aguas arriba tarde más que aguas abajo
        const timeDifference = p2.t - p1.t;
        const requiredMargin = p1.t * margin;
        
        if (timeDifference < requiredMargin) {
          conflicts.push({
            I: p1.I,
            tDownstream: p1.t,
            tUpstream: p2.t,
            difference: timeDifference,
            required: requiredMargin
          });
        }
        
        if (timeDifference < minTimeDifference) {
          minTimeDifference = timeDifference;
        }
      }
    });

    return {
      isCoordinated: conflicts.length === 0,
      conflicts,
      minTimeDifference,
      margin,
      recommendations: this._generateRecommendations(conflicts)
    };
  }

  /**
   * Generar recomendaciones para conflictos
   */
  _generateRecommendations(conflicts) {
    if (conflicts.length === 0) {
      return ['Coordinación satisfactoria entre protecciones.'];
    }

    const recommendations = [];
    
    const avgCurrent = conflicts.reduce((sum, c) => sum + c.I, 0) / conflicts.length;
    
    if (avgCurrent < 1000) {
      recommendations.push('Considerar aumentar TMS de la protección aguas arriba.');
    } else {
      recommendations.push('Verificar si se requiere protección de respaldo adicional.');
    }
    
    recommendations.push('Revisar curvas TCC en zona de sobrecarga (1.5x - 10x In).');
    recommendations.push('Considerar curvas de diferente tipo si persisten conflictos.');
    
    return recommendations;
  }

  /**
   * Calcular punto de intersección entre curva y corriente de falla
   * @param {Array} curve - Curva TCC
   * @param {number} Ifault - Corriente de cortocircuito
   * @returns {Object} Punto de operación {I, t, withinCurve}
   */
  calculateOperatingPoint(curve, Ifault) {
    // Encontrar el punto más cercano a Ifault
    const closest = curve.reduce((prev, curr) => {
      return Math.abs(curr.I - Ifault) < Math.abs(prev.I - Ifault) ? curr : prev;
    });

    // Interpolar si es necesario
    const next = curve.find(p => p.I > closest.I);
    let t;
    
    if (next) {
      // Interpolación logarítmica
      const logI = Math.log10(Ifault);
      const logI1 = Math.log10(closest.I);
      const logI2 = Math.log10(next.I);
      const logT1 = Math.log10(closest.t);
      const logT2 = Math.log10(next.t);
      
      const ratio = (logI - logI1) / (logI2 - logI1);
      t = Math.pow(10, logT1 + ratio * (logT2 - logT1));
    } else {
      t = closest.t;
    }

    return {
      I: Ifault,
      t: toElectricalPrecision(parseFloat(t.toFixed(4))),
      withinCurve: closest.I <= Ifault
    };
  }

  /**
   * Validar configuración de protección
   * @param {Object} breaker - Configuración
   * @returns {Object} Validación con errores/warnings
   */
  validateProtection(breaker) {
    const errors = [];
    const warnings = [];

    if (!breaker.pickup || breaker.pickup <= 0) {
      errors.push('Pickup debe ser mayor que cero.');
    }

    if (breaker.TMS !== undefined && (breaker.TMS < 0.1 || breaker.TMS > 1.0)) {
      errors.push('TMS debe estar entre 0.1 y 1.0 para IEC.');
    }

    if (breaker.TD !== undefined && (breaker.TD < 1 || breaker.TD > 10)) {
      errors.push('TD debe estar entre 1 y 10 para IEEE.');
    }

    if (breaker.instantaneous && breaker.instantaneous < breaker.pickup) {
      warnings.push('Disparo instantáneo debería ser mayor que pickup.');
    }

    if (!this.iecCurves[breaker.curve] && !this.ieeeCurves[breaker.curve]) {
      errors.push(`Tipo de curva no soportado: ${breaker.curve}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Obtener lista de curvas disponibles
   */
  getAvailableCurves() {
    return {
      IEC: Object.entries(this.iecCurves).map(([key, value]) => ({
        key,
        name: value.name,
        params: { k: value.k, alpha: value.alpha }
      })),
      IEEE: Object.entries(this.ieeeCurves).map(([key, value]) => ({
        key,
        name: value.name,
        params: { A: value.A, B: value.B, p: value.p }
      }))
    };
  }
}

module.exports = TCCEngine;
