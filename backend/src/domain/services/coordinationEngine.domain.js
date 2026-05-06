const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * backend/src/domain/services/coordinationEngine.domain.js
 * Motor de Auto-Coordinación de Protecciones
 * Optimización iterativa tipo ETAP/SKM
 */

const TCCEngine = require('./tccEngine.domain');

class CoordinationEngine {
  constructor(options = {}) {
    this.tccEngine = new TCCEngine();

    // Configuración de optimización
    this.config = {
      margin: options.margin || 0.3,           // Margen mínimo (segundos)
      maxIterations: options.maxIterations || 20,
      tmsIncrement: options.tmsIncrement || 1.15,  // 15% incremento
      pickupIncrement: options.pickupIncrement || 1.2,
      instIncrement: options.instIncrement || 1.1,
      maxTMS: options.maxTMS || 1.0,
      maxPickup: options.maxPickup || 1000,
      convergenceThreshold: options.convergenceThreshold || 0.01
    };
  }

  /**
   * Auto-coordinar lista de breakers
   * @param {Array} breakers - Lista ordenada de carga → fuente
   * @returns {Object} Resultado de coordinación
   */
  autoCoordinate(breakers) {
    if (!breakers || breakers.length < 2) {
      return {
        status: 'INSUFFICIENT_BREAKERS',
        breakers,
        iterations: 0,
        message: 'Se requieren al menos 2 protecciones para coordinar'
      };
    }

    // Clonar breakers para no modificar originales
    let coordinatedBreakers = breakers.map(b => ({ ...b }));
    let iterations = 0;
    let changed = true;
    const history = [];

    while (changed && iterations < this.config.maxIterations) {
      changed = false;
      iterations++;

      // Iterar por pares downstream → upstream
      for (let i = 0; i < coordinatedBreakers.length - 1; i++) {
        const downstream = coordinatedBreakers[i];
        const upstream = coordinatedBreakers[i + 1];

        // Generar curvas actuales
        const downCurve = this.tccEngine.generateTCCCurve(downstream);
        const upCurve = this.tccEngine.generateTCCCurve(upstream);

        // Detectar cruces con margen
        const crossings = this.detectCrossings(downCurve, upCurve, this.config.margin);

        if (crossings.length > 0) {
          // Hay conflicto - ajustar upstream
          const adjustment = this.adjustBreaker(upstream, downstream, crossings);

          if (adjustment.changed) {
            coordinatedBreakers[i + 1] = adjustment.breaker;
            changed = true;

            // Registrar en historial
            history.push({
              iteration: iterations,
              pair: `${downstream.id || i} → ${upstream.id || (i + 1)}`,
              crossings: crossings.length,
              adjustment: adjustment.type,
              values: adjustment.values
            });

            // Solo un ajuste por iteración para estabilidad
            break;
          }
        }
      }
    }

    // Evaluación final
    const finalStatus = this.evaluateCoordination(coordinatedBreakers);

    return {
      status: finalStatus.isCoordinated ? 'COORDINATED' : 'PARTIAL',
      breakers: coordinatedBreakers,
      originalBreakers: breakers,
      iterations,
      history,
      finalStatus,
      message: this.generateMessage(finalStatus, iterations)
    };
  }

  /**
   * Detectar cruces entre curvas con margen
   * @param {Array} curveDown - Curva downstream
   * @param {Array} curveUp - Curva upstream
   * @param {number} margin - Margen requerido (segundos)
   * @returns {Array} Lista de cruces detectados
   */
  detectCrossings(curveDown, curveUp, margin = 0.3) {
    const crossings = [];

    // Para cada punto en curva downstream
    for (const p of curveDown) {
      // Encontrar punto correspondiente en upstream
      const match = this.findMatchingPoint(p.I, curveUp);

      if (!match || match.t === Infinity || p.t === Infinity) continue;

      // Verificar condición de coordinación:
      // t_down + margin < t_up
      const requiredTime = p.t + margin;

      if (requiredTime >= match.t) {
        crossings.push({
          I: p.I,
          tDown: p.t,
          tUp: match.t,
          required: requiredTime,
          actual: match.t,
          deficit: requiredTime - match.t,
          severity: this.calculateSeverity(p.t, match.t, margin)
        });
      }
    }

    // Ordenar por severidad
    return crossings.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Encontrar punto correspondiente por corriente
   */
  findMatchingPoint(current, curve) {
    // Buscar punto más cercano
    let closest = null;
    let minDiff = Infinity;

    for (const point of curve) {
      const diff = toElectricalPrecision(parseFloat((Math.abs(point.I - current)).toFixed(6))); // current (A)
      if (diff < minDiff && diff < current * 0.05) { // 5% tolerancia // Unit: A (Amperes)
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }

  /**
   * Calcular severidad del cruce
   */
  calculateSeverity(tDown, tUp, margin) {
    const ratio = (tDown + margin) / tUp;
    if (ratio > 2) return 3; // Muy severo
    if (ratio > 1.5) return 2; // Severo
    if (ratio > 1.2) return 1; // Moderado
    return 0.5; // Leve
  }

  /**
   * Ajustar breaker upstream basado en conflictos
   * @param {Object} up - Breaker upstream
   * @param {Object} down - Breaker downstream
   * @param {Array} crossings - Cruces detectados
   * @returns {Object} Resultado del ajuste
   */
  adjustBreaker(up, down, crossings) {
    const original = { ...up };
    let adjustmentType = 'NONE';
    let adjustmentValues = {};

    // Estrategia de ajuste inteligente
    // Prioridad 1: Aumentar TMS (más deseable)
    if (up.TMS < this.config.maxTMS) {
      const newTMS = Math.min(
        up.TMS * this.config.tmsIncrement,
        this.config.maxTMS
      );

      up.TMS = toElectricalPrecision(parseFloat(newTMS.toFixed(3)));
      adjustmentType = 'TMS_INCREASE';
      adjustmentValues = {
        old: original.TMS,
        new: up.TMS,
        percent: ((up.TMS / original.TMS - 1) * 100).toFixed(1)
      };
    }
    // Prioridad 2: Aumentar pickup si TMS ya está alto
    else if (up.pickup < down.pickup * 3 && up.pickup < this.config.maxPickup) {
      const newPickup = Math.min(
        up.pickup * this.config.pickupIncrement,
        down.pickup * 3,
        this.config.maxPickup
      );

      up.pickup = toElectricalPrecision(parseFloat(newPickup.toFixed(1)));
      adjustmentType = 'PICKUP_INCREASE';
      adjustmentValues = {
        old: original.pickup,
        new: up.pickup,
        percent: ((up.pickup / original.pickup - 1) * 100).toFixed(1)
      };
    }
    // Prioridad 3: Ajustar instantáneo como último recurso
    else if (up.instantaneous && up.instantaneous < this.config.maxPickup * 10) {
      const newInst = up.instantaneous * this.config.instIncrement;
      up.instantaneous = toElectricalPrecision(parseFloat(newInst.toFixed(0)));
      adjustmentType = 'INSTANTANEOUS_INCREASE';
      adjustmentValues = {
        old: original.instantaneous,
        new: up.instantaneous,
        percent: ((up.instantaneous / original.instantaneous - 1) * 100).toFixed(1)
      };
    }

    return {
      changed: adjustmentType !== 'NONE',
      breaker: up,
      type: adjustmentType,
      values: adjustmentValues,
      reason: crossings.length > 0 ? `${crossings.length} cruces detectados` : 'None'
    };
  }

  /**
   * Evaluar coordinación final del sistema
   * @param {Array} breakers - Breakers coordinados
   * @returns {Object} Estado de coordinación
   */
  evaluateCoordination(breakers) {
    const results = [];
    let totalCrossings = 0;
    let isCoordinated = true;

    for (let i = 0; i < breakers.length - 1; i++) {
      const downstream = breakers[i];
      const upstream = breakers[i + 1];

      const downCurve = this.tccEngine.generateTCCCurve(downstream);
      const upCurve = this.tccEngine.generateTCCCurve(upstream);

      const crossings = this.detectCrossings(downCurve, upCurve, this.config.margin);

      results.push({
        pair: `${downstream.id || i} → ${upstream.id || (i + 1)}`,
        crossings: crossings.length,
        minTimeDiff: crossings.length > 0
          ? Math.min(...crossings.map(c => c.tUp - c.tDown))
          : Infinity,
        status: crossings.length === 0 ? 'OK' : 'CONFLICT'
      });

      if (crossings.length > 0) {
        totalCrossings += crossings.length;
        isCoordinated = false;
      }
    }

    return {
      isCoordinated,
      totalCrossings,
      pairs: results,
      margin: this.config.margin,
      quality: this.calculateQualityScore(results)
    };
  }

  /**
   * Calcular score de calidad de coordinación
   */
  calculateQualityScore(results) {
    const totalPairs = results.length;
    const okPairs = results.filter(r => r.status === 'OK').length;

    if (totalPairs === 0) return 0;

    return toElectricalPrecision(parseFloat(((okPairs / totalPairs)) * 100).toFixed(1));
  }

  /**
   * Generar mensaje descriptivo del resultado
   */
  generateMessage(finalStatus, iterations) {
    if (finalStatus.isCoordinated) {
      return `Coordinación exitosa en ${iterations} iteraciones. ` +
        `Score de calidad: ${finalStatus.quality}%`;
    }

    const remaining = finalStatus.totalCrossings;
    return `Coordinación parcial después de ${iterations} iteraciones. ` +
      `${remaining} conflictos restantes. ` +
      `Revisar manualmente protecciones upstream.`;
  }

  /**
   * Sugerir ajustes manuales para conflictos restantes
   * @param {Array} breakers - Breakers coordinados
   * @returns {Array} Lista de recomendaciones
   */
  suggestManualAdjustments(breakers) {
    const suggestions = [];

    for (let i = 0; i < breakers.length - 1; i++) {
      const down = breakers[i];
      const up = breakers[i + 1];

      const downCurve = this.tccEngine.generateTCCCurve(down);
      const upCurve = this.tccEngine.generateTCCCurve(up);
      const crossings = this.detectCrossings(downCurve, upCurve, this.config.margin);

      if (crossings.length > 0) {
        const worst = crossings[0]; // Más severo

        suggestions.push({
          pair: `${down.id || i} → ${up.id || (i + 1)}`,
          issue: `${crossings.length} puntos de conflicto`,
          worstPoint: `I=${worst.I.toFixed(1)}A, t_down=${worst.tDown.toFixed(3)}s, t_up=${worst.tUp.toFixed(3)}s`,
          recommendations: [
            `Aumentar TMS de ${up.id || 'upstream'} de ${up.TMS} a ${(up.TMS * 1.2).toFixed(2)}`,
            `Considerar cambiar curva de ${up.curve || 'standard'} a 'very'`,
            `Verificar si es necesario aumentar pickup de ${up.pickup} a ${(up.pickup * 1.3).toFixed(0)}A`
          ]
        });
      }
    }

    return suggestions;
  }

  /**
   * Analizar sensibilidad del sistema
   * @param {Array} breakers - Breakers
   * @returns {Object} Análisis de sensibilidad
   */
  sensitivityAnalysis(breakers) {
    const original = breakers.map(b => ({ ...b }));
    const results = [];

    // Probar diferentes márgenes
    const margins = [0.2, 0.3, 0.4, 0.5];

    for (const margin of margins) {
      this.config.margin = margin;
      const result = this.autoCoordinate(original);

      results.push({
        margin,
        status: result.status,
        iterations: result.iterations,
        quality: result.finalStatus.quality
      });
    }

    // Restaurar margen original
    this.config.margin = 0.3;

    return {
      optimalMargin: results.reduce((best, curr) =>
        curr.quality > best.quality ? curr : best
      ),
      allResults: results
    };
  }
}

module.exports = CoordinationEngine;
