const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * backend/src/domain/services/tccBandEngine.domain.js
 * Motor de Curvas TCC con Bandas de Tolerancia
 * Nivel ETAP - Coordinación con rangos min/max
 */

class TCCBandEngine {
  constructor() {
    // Tolerancias típicas por tipo de breaker
    this.tolerances = {
      thermal_magnetic: {
        lower: 0.8,  // -20%
        upper: 1.2   // +20%
      },
      mccb: {
        lower: 0.85, // -15%
        upper: 1.15  // +15%
      },
      acb: {
        lower: 0.9,  // -10%
        upper: 1.1   // +10%
      },
      electronic: {
        lower: 0.95, // -5%
        upper: 1.05  // +5%
      }
    };
  }

  /**
   * Interpolación logarítmica entre dos puntos
   * @param {Array} curve - Curva base [{I, t}, ...]
   * @param {number} I - Corriente a interpolar
   * @returns {number|null} Tiempo interpolado
   */
  logInterp(curve, I) {
    // Validación robusta de entrada
    if (!curve || curve.length < 2) return null;
    if (typeof I !== 'number' || isNaN(I) || I <= 0) return null;

    // Validar que los puntos tengan valores numéricos válidos
    if (!curve.every(p =>
      typeof p.I === 'number' && !isNaN(p.I) && p.I > 0 &&
      typeof p.t === 'number' && !isNaN(p.t) && p.t > 0
    )) {
      return null;
    }

    for (let i = 0; i < curve.length - 1; i++) {
      const p1 = curve[i];
      const p2 = curve[i + 1];

      // Corregir: manejar caso I == p2.I correctamente
      if (I >= p1.I && I < p2.I) {
        const logI = Math.log10(I);
        const logI1 = Math.log10(p1.I);
        const logI2 = Math.log10(p2.I);

        const logT1 = Math.log10(p1.t);
        const logT2 = Math.log10(p2.t);

        // Interpolación lineal en escala log-log
        const logT = logT1 + ((logI - logI1) * (logT2 - logT1)) / (logI2 - logI1);

        return Math.pow(10, logT);
      }
    }

    // Manejar último punto exacto
    const lastPoint = curve[curve.length - 1];
    if (I === lastPoint.I) {
      return lastPoint.t;
    }

    // Extrapolación si está fuera de rango (con validación)
    if (I < curve[0].I) {
      return curve[0].t;
    }
    if (I > lastPoint.I) {
      return lastPoint.t;
    }

    return null;
  }

  /**
   * Obtener banda de tiempos (min/max) para una corriente
   * @param {Object} breaker - Modelo de breaker con curva y tolerancias
   * @param {number} I - Corriente
   * @returns {Object|null} {min, max}
   */
  getBandTimes(breaker, I) {
    // Verificar instantáneo con banda
    if (breaker.instantaneous && I >= breaker.instantaneous.min) {
      return {
        min: breaker.instantaneous.t,
        max: breaker.instantaneous.t,
        zone: 'instantaneous'
      };
    }

    const t = this.logInterp(breaker.curve, I);
    if (!t || t === Infinity) return null;

    const tolerance = breaker.tolerance || this.tolerances.thermal_magnetic;

    return {
      min: t * tolerance.lower,
      max: t * tolerance.upper,
      zone: 'thermal'
    };
  }

  /**
   * Verificar coordinación con bandas
   * @param {Object} downstream - Breaker aguas abajo
   * @param {Object} upstream - Breaker aguas arriba
   * @param {number} margin - Margen de seguridad (opcional)
   * @returns {Object} Resultado de coordinación
   */
  checkBandCoordination(downstream, upstream, margin = 0) {
    const currents = []; // current (A)

    // Generar corrientes de prueba (1.5x a 20x rating)
    for (let m = 1.5; m <= 20; m += 0.5) {
      currents.push(m * downstream.rating);
    }

    const conflicts = [];

    for (const I of currents) {
      const d = this.getBandTimes(downstream, I);
      const u = this.getBandTimes(upstream, I);

      if (!d || !u) continue;

      // Condición de coordinación con bandas:
      // El tiempo mínimo del upstream debe ser mayor que el tiempo máximo del downstream + margen
      const requiredTime = d.max + margin;

      if (u.min <= requiredTime) {
        conflicts.push({
          I,
          tDownMin: d.min,
          tDownMax: d.max,
          tUpMin: u.min,
          tUpMax: u.max,
          deficit: requiredTime - u.min,
          severity: this.calculateSeverity(d.max, u.min, margin)
        });
      }
    }

    if (conflicts.length > 0) {
      return {
        coordinated: false,
        conflicts,
        worstConflict: conflicts[0],
        margin
      };
    }

    return {
      coordinated: true,
      margin,
      message: "Bandas coordinadas correctamente"
    };
  }

  /**
   * Calcular severidad del conflicto
   */
  calculateSeverity(tDownMax, tUpMin, margin) {
    const ratio = (tDownMax + margin) / tUpMin;
    if (ratio > 2) return 3; // Muy severo
    if (ratio > 1.5) return 2; // Severo
    if (ratio > 1.2) return 1; // Moderado
    return 0.5; // Leve
  }

  /**
   * Auto-coordinar con bandas
   * @param {Object} downstream - Breaker aguas abajo
   * @param {Object} upstream - Breaker aguas arriba
   * @param {number} margin - Margen de seguridad
   * @param {number} maxAttempts - Máximo intentos
   * @returns {Object} Resultado de coordinación
   */
  autoCoordinateBands(downstream, upstream, margin = 0.3, maxAttempts = 15) {
    let attempts = 0;
    const history = [];

    while (attempts < maxAttempts) {
      const check = this.checkBandCoordination(downstream, upstream, margin);

      if (check.coordinated) {
        return {
          ok: true,
          attempts,
          history,
          message: `Coordinación lograda en ${attempts} intentos`
        };
      }

      // Ajustar upstream
      const adjustment = this.adjustUpstream(upstream, downstream, check.worstConflict);

      if (adjustment.changed) {
        history.push({
          attempt: attempts + 1,
          type: adjustment.type,
          values: adjustment.values,
          conflictAt: check.worstConflict.I
        });
      } else {
        // No se puede ajustar más
        break;
      }

      attempts++;
    }

    return {
      ok: false,
      attempts,
      history,
      remainingConflicts: this.checkBandCoordination(downstream, upstream, margin).conflicts,
      message: "No se logró coordinación con ajustes automáticos"
    };
  }

  /**
   * Ajustar breaker upstream
   */
  adjustUpstream(upstream, downstream, _conflict) {
    const original = { ...upstream };
    let adjustmentType = 'NONE';
    let adjustmentValues = {};

    // Prioridad 1: Aumentar delay si existe
    if (upstream.delay !== undefined && upstream.delay < 2.0) {
      upstream.delay = toElectricalPrecision(parseFloat((upstream.delay + 0.1)).toFixed(2));
      adjustmentType = 'DELAY_INCREASE';
      adjustmentValues = {
        old: original.delay,
        new: upstream.delay
      };
    }
    // Prioridad 2: Ajustar curva base (TMS)
    else if (upstream.TMS !== undefined && upstream.TMS < 1.0) {
      upstream.TMS = toElectricalPrecision(parseFloat((upstream.TMS * 1.15)).toFixed(3));
      adjustmentType = 'TMS_INCREASE';
      adjustmentValues = {
        old: original.TMS,
        new: upstream.TMS,
        percent: ((upstream.TMS / original.TMS - 1) * 100).toFixed(1)
      };
    }
    // Prioridad 3: Aumentar pickup
    else if (upstream.pickup !== undefined && upstream.pickup < downstream.pickup * 2) {
      upstream.pickup = toElectricalPrecision(parseFloat((upstream.pickup * 1.2)).toFixed(1));
      adjustmentType = 'PICKUP_INCREASE';
      adjustmentValues = {
        old: original.pickup,
        new: upstream.pickup,
        percent: ((upstream.pickup / original.pickup - 1) * 100).toFixed(1)
      };
    }
    // Prioridad 4: Ajustar instantáneo
    else if (upstream.instantaneous) {
      upstream.instantaneous.min = toElectricalPrecision(parseFloat((upstream.instantaneous.min * 1.1)).toFixed(0));
      upstream.instantaneous.max = toElectricalPrecision(parseFloat((upstream.instantaneous.max * 1.1)).toFixed(0));
      adjustmentType = 'INSTANTANEOUS_INCREASE';
      adjustmentValues = {
        oldMin: original.instantaneous.min,
        newMin: upstream.instantaneous.min,
        oldMax: original.instantaneous.max,
        newMax: upstream.instantaneous.max
      };
    }

    return {
      changed: adjustmentType !== 'NONE',
      breaker: upstream,
      type: adjustmentType,
      values: adjustmentValues
    };
  }

  /**
   * Generar datos para gráfica TCC con bandas
   * @param {Object} breaker - Modelo de breaker
   * @param {number} startMultiplier - Multiplicador inicial
   * @param {number} endMultiplier - Multiplicador final
   * @param {number} step - Paso logarítmico
   * @returns {Object} {dataMin, dataMax}
   */
  generateTCCBand(breaker, startMultiplier = 1, endMultiplier = 20, step = 1.15) {
    const dataMin = [];
    const dataMax = [];
    const dataNominal = [];

    for (let I = breaker.rating * startMultiplier; I <= breaker.rating * endMultiplier; I *= step) {
      const band = this.getBandTimes(breaker, I);

      if (band) {
        dataMin.push({ x: toElectricalPrecision(parseFloat(I.toFixed(1))), y: band.min, zone: band.zone });
        dataMax.push({ x: toElectricalPrecision(parseFloat(I.toFixed(1))), y: band.max, zone: band.zone });

        // Curva nominal (sin tolerancia)
        const tNominal = this.logInterp(breaker.curve, I);
        if (tNominal && tNominal !== Infinity) {
          dataNominal.push({ x: toElectricalPrecision(parseFloat(I.toFixed(1))), y: tNominal, zone: band.zone });
        }
      }
    }

    return {
      dataMin,
      dataMax,
      dataNominal,
      breaker: {
        id: breaker.id,
        rating: breaker.rating,
        tolerance: breaker.tolerance
      }
    };
  }

  /**
   * Coordinar sistema completo con bandas
   * @param {Array} breakers - Lista de breakers (de carga → fuente)
   * @param {number} margin - Margen de seguridad
   * @returns {Object} Resultado de coordinación
   */
  coordinateSystemBands(breakers, margin = 0.3) {
    if (breakers.length < 2) {
      return {
        ok: false,
        error: "Se requieren al menos 2 breakers para coordinar"
      };
    }

    const results = [];
    const totalAttempts = [];

    // Coordinar de abajo hacia arriba
    for (let i = breakers.length - 1; i > 0; i--) {
      const downstream = breakers[i];
      const upstream = breakers[i - 1];

      const result = this.autoCoordinateBands(downstream, upstream, margin);

      results.push({
        pair: `${downstream.id} → ${upstream.id}`,
        ...result
      });

      totalAttempts.push(result.attempts);
    }

    const allCoordinated = results.every(r => r.ok);

    return {
      ok: allCoordinated,
      results,
      totalAttempts: totalAttempts.reduce((a, b) => a + b, 0),
      maxAttempts: Math.max(...totalAttempts),
      message: allCoordinated
        ? "Sistema completamente coordinado"
        : "Algunos pares requieren ajuste manual"
    };
  }

  /**
   * Obtener estado visual (semáforo)
   */
  getStatus(coordinationResult) {
    if (coordinationResult.ok) {
      return {
        color: 'green',
        label: 'COORDINADO',
        severity: 0
      };
    }

    if (coordinationResult.attempts && coordinationResult.attempts < 10) {
      return {
        color: 'yellow',
        label: 'MARGINAL',
        severity: 1
      };
    }

    return {
      color: 'red',
      label: 'CONFLICTO',
      severity: 2
    };
  }

  /**
   * Calcular área de superposición entre bandas
   */
  calculateOverlap(downstream, upstream) {
    const currents = []; // current (A)
    let overlapArea = 0;

    for (let m = 1.5; m <= 20; m += 0.5) {
      currents.push(m * downstream.rating);
    }

    for (const I of currents) {
      const d = this.getBandTimes(downstream, I);
      const u = this.getBandTimes(upstream, I);

      if (!d || !u) continue;

      // Calcular superposición en tiempo
      const overlap = Math.max(0, Math.min(d.max, u.max) - Math.max(d.min, u.min));

      if (overlap > 0) {
        overlapArea += overlap;
      }
    }

    return {
      overlapArea,
      hasOverlap: overlapArea > 0,
      percentage: (overlapArea / currents.length * 100).toFixed(2)
    };
  }

  /**
   * Crear modelo de breaker con bandas
   */
  createBreakerWithBands(config) {
    const {
      id,
      rating,
      curve,
      type = 'thermal_magnetic',
      instantaneous = null,
      customTolerance = null
    } = config;

    return {
      id,
      rating,
      curve,
      tolerance: customTolerance || this.tolerances[type],
      instantaneous: instantaneous || {
        min: rating * 8,
        max: rating * 12,
        t: 0.02
      },
      type
    };
  }
}

module.exports = TCCBandEngine;
