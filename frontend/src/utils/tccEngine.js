/**
 * utils/tccEngine.js - Motor TCC Profesional Nivel ETAP/SKM
 * Sistema completo para generación de curvas, coordinación y evaluación de disparos
 */

// ========================================
// TCC ENGINE PRO - Nivel ETAP/SKM
// ========================================

export class TCCEngine {

  // ========================================
  // GENERAR CURVA TCC COMPLETA
  // ========================================
  static generateCurve(breaker) {
    const points = [];
    const { In, Ir, tr, Isd, tsd, Ii } = breaker.ratings;

    // Generar puntos desde 0.5x hasta 25x In
    for (let m = 0.5; m <= 25; m += 0.05) {
      const I = m * In;
      let t = null;
      let zone = null;

      // Long Time (inversa) - Zona verde
      if (I >= Ir * In && I < Isd * In) {
        t = tr / Math.pow(I / (Ir * In), 2);
        zone = "LT";
      }

      // Short Time - Zona amarilla
      if (I >= Isd * In && I < Ii * In) {
        t = tsd;
        zone = "ST";
      }

      // Instantáneo - Zona roja
      if (I >= Ii * In) {
        t = 0.02; // 20ms típico para instantáneo
        zone = "INST";
      }

      if (t && t > 0.001) { // Mínimo 1ms para visualización
        points.push({ I, t, zone });
      }
    }

    return points;
  }

  // ========================================
  // GENERAR BANDA DE TOLERANCIA (MIN/MAX)
  // ========================================
  static generateBand(curve, tolerance = 0.2) {
    return curve.map(p => ({
      I: p.I,
      t_min: p.t * (1 - tolerance),
      t_max: p.t * (1 + tolerance),
      zone: p.zone
    }));
  }

  // ========================================
  // EVALUAR DISPARO REAL
  // ========================================
  static evaluateTrip(breaker, faultCurrent) {
    const { In, Ir, tr, Isd, tsd, Ii } = breaker.ratings;

    // Instantáneo - prioridad máxima
    if (faultCurrent >= Ii * In) {
      return {
        trip: true,
        time: 0.02,
        zone: "INST",
        multiplier: faultCurrent / In
      };
    }

    // Short Time
    if (faultCurrent >= Isd * In) {
      return {
        trip: true,
        time: tsd,
        zone: "ST",
        multiplier: faultCurrent / In
      };
    }

    // Long Time (inversa)
    if (faultCurrent >= Ir * In) {
      const t = tr / Math.pow(faultCurrent / (Ir * In), 2);
      return {
        trip: true,
        time: t,
        zone: "LT",
        multiplier: faultCurrent / In
      };
    }

    return {
      trip: false,
      time: Infinity,
      zone: null,
      multiplier: faultCurrent / In
    };
  }

  // ========================================
  // DETECTAR CRUCES (FALLA DE SELECTIVIDAD)
  // ========================================
  static detectCross(curveUp, curveDown, margin = 0.1) {
    const crosses = [];

    for (let i = 0; i < curveDown.length; i++) {
      const down = curveDown[i];

      // Encontrar punto correspondiente en upstream
      const up = curveUp.find(p => Math.abs(p.I - down.I) < 1);

      if (!up) continue;

      // Verificar si upstream dispara antes (con margen)
      if (up.t <= down.t + margin) {
        crosses.push({
          current: down.I,
          upstreamTime: up.t,
          downstreamTime: down.t,
          margin: (down.t + margin) - up.t,
          severity: up.t < down.t ? 'critical' : 'warning',
          upstreamZone: up.zone,
          downstreamZone: down.zone
        });
      }
    }

    return {
      hasCross: crosses.length > 0,
      crosses,
      worstMargin: Math.min(...crosses.map(c => c.margin))
    };
  }

  // ========================================
  // AUTO-COORDINACIÓN INTELIGENTE
  // ========================================
  static autoCoordinate(upstream, downstream, options = {}) {
    const {
      maxIterations = 20,
      margin = 0.1,
      adjustmentStep = 0.1
    } = options;

    let iterations = 0;
    let coordinated = false;
    const adjustments = [];

    // Guardar valores originales
    const originalUpstream = JSON.parse(JSON.stringify(upstream.ratings));
    const originalDownstream = JSON.parse(JSON.stringify(downstream.ratings));

    while (iterations < maxIterations && !coordinated) {
      const curveUp = this.generateCurve(upstream);
      const curveDown = this.generateCurve(downstream);

      const result = this.detectCross(curveUp, curveDown, margin);

      if (!result.hasCross) {
        coordinated = true;
        break;
      }

      // Encontrar el peor cruce
      const worstCross = result.crosses.reduce((worst, current) =>
        current.margin < worst.margin ? current : worst
      );

      // Estrategia de ajuste según zona del cruce
      const adjustment = this.applyAdjustment(upstream, worstCross, adjustmentStep);

      if (adjustment) {
        adjustments.push({
          iteration: iterations + 1,
          breaker: upstream.id,
          current: worstCross.current,
          adjustment,
          before: { ...upstream.ratings },
          after: { ...upstream.ratings }
        });
      }

      iterations++;
    }

    return {
      coordinated,
      iterations,
      adjustments,
      finalMargin: coordinated ? margin : this.detectCross(
        this.generateCurve(upstream),
        this.generateCurve(downstream),
        margin
      ).worstMargin,
      originalUpstream,
      originalDownstream
    };
  }

  // ========================================
  // APLICAR AJUSTE INTELIGENTE
  // ========================================
  static applyAdjustment(breaker, cross, step = 0.1) {
    const { upstreamZone } = cross;
    const { ratings } = breaker;

    let adjusted = false;

    // Estrategia según zona del cruce
    switch (upstreamZone) {
      case "INST":
        // Subir pickup instantáneo
        ratings.Ii += ratings.Ii * step;
        adjusted = true;
        break;

      case "ST":
        // Aumentar tiempo de short time
        ratings.tsd += step;
        adjusted = true;
        break;

      case "LT":
        // Aumentar tiempo de long time (más efectivo)
        ratings.tr += ratings.tr * step;
        adjusted = true;
        break;
    }

    // Limites de seguridad
    ratings.Ii = Math.min(ratings.Ii, ratings.In * 25); // Máximo 25x
    ratings.tsd = Math.min(ratings.tsd, 1.0); // Máximo 1s
    ratings.tr = Math.min(ratings.tr, 100); // Máximo 100s

    return adjusted ? {
      type: upstreamZone,
      value: step,
      reason: `Cross at ${cross.current}A in ${upstreamZone} zone`
    } : null;
  }

  // ========================================
  // COORDINAR CADENA COMPLETA DE BREAKERS
  // ========================================
  static coordinateSystem(breakers, options = {}) {
    const results = [];

    // Ordenar breakers de upstream a downstream (asumiendo que ya están ordenados)
    for (let i = breakers.length - 1; i > 0; i--) {
      const downstream = breakers[i];
      const upstream = breakers[i - 1];

      const result = this.autoCoordinate(upstream, downstream, options);

      results.push({
        upstream: upstream.id,
        downstream: downstream.id,
        ...result
      });
    }

    return {
      results,
      overallCoordinated: results.every(r => r.coordinated),
      totalIterations: results.reduce((sum, r) => sum + r.iterations, 0),
      totalAdjustments: results.reduce((sum, r) => sum + r.adjustments.length, 0)
    };
  }

  // ========================================
  // SIMULACIÓN DE FALLA EN TIEMPO REAL
  // ========================================
  static simulateFault(faultCurrent, breakers) {
    const evaluation = breakers.map(b => {
      const result = this.evaluateTrip(b, faultCurrent);

      return {
        id: b.id,
        type: b.type,
        ...result,
        curve: this.generateCurve(b)
      };
    });

    // Ordenar por tiempo de disparo
    evaluation.sort((a, b) => a.time - b.time);

    // Determinar selectividad
    const primary = evaluation.find(e => e.trip);
    const backup = evaluation.filter(e => e.trip && e.id !== primary?.id);

    return {
      faultCurrent,
      evaluation,
      primary,
      backup,
      selectivity: backup.length > 0 ? 'achieved' : 'not_applicable',
      timeToClear: primary?.time || Infinity
    };
  }

  // ========================================
  // CONVERTIR A ESCALA LOG-LOG PARA GRAFICACIÓN
  // ========================================
  static toLogScale(curve) {
    return curve.map(p => ({
      x: Math.log10(p.I),
      y: Math.log10(p.t),
      I: p.I,
      t: p.t,
      zone: p.zone
    }));
  }

  // ========================================
  // GENERAR DATOS PARA GRAFICACIÓN (CHART.JS FORMAT)
  // ========================================
  static generateChartData(breakers, options = {}) {
    const { showBands = true, tolerance = 0.2 } = options;

    return breakers.map(breaker => {
      const curve = this.generateCurve(breaker);
      const logCurve = this.toLogScale(curve);

      const dataset = {
        label: `${breaker.id} (${breaker.type})`,
        data: logCurve.map(p => ({ x: p.x, y: p.y })),
        borderColor: this.getZoneColor('LT'),
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      };

      let band = null;
      // Agregar bandas si se solicita
      if (showBands) {
        band = this.generateBand(curve, tolerance);
        const logBand = this.toLogScale(band);

        dataset.band = {
          min: logBand.map(p => ({ x: p.x, y: p.y })),
          max: logBand.map(p => ({ x: p.x, y: p.y }))
        };
      }

      return {
        breaker: breaker.id,
        dataset,
        curve,
        band: showBands ? band : null
      };
    });
  }

  // ========================================
  // COLORES POR ZONA
  // ========================================
  static getZoneColor(zone) {
    const colors = {
      'LT': '#22c55e',    // Verde - Long Time
      'ST': '#eab308',    // Amarillo - Short Time  
      'INST': '#ef4444'   // Rojo - Instantáneo
    };
    return colors[zone] || '#6b7280';
  }

  // ========================================
  // ANÁLISIS DE COORDINACIÓN
  // ========================================
  static analyzeCoordination(breakers, faultCurrents = [1000, 2000, 5000, 10000]) {
    const analysis = {
      totalPairs: 0,
      coordinatedPairs: 0,
      problematicCurrents: [],
      recommendations: []
    };

    // Analizar cada par adyacente
    for (let i = breakers.length - 1; i > 0; i--) {
      const downstream = breakers[i];
      const upstream = breakers[i - 1];

      analysis.totalPairs++;

      // Verificar coordinación para cada corriente de prueba
      let hasIssues = false;

      faultCurrents.forEach(current => {
        const downResult = this.evaluateTrip(downstream, current);
        const upResult = this.evaluateTrip(upstream, current);

        if (downResult.trip && upResult.trip) {
          const margin = downResult.time - upResult.time;

          if (margin < 0.1) { // Margen mínimo de 100ms
            hasIssues = true;
            analysis.problematicCurrents.push({
              current,
              upstream: upstream.id,
              downstream: downstream.id,
              margin,
              upstreamTime: upResult.time,
              downstreamTime: downResult.time
            });
          }
        }
      });

      if (!hasIssues) {
        analysis.coordinatedPairs++;
      }
    }

    // Calcular score general
    analysis.coordinationScore = (analysis.coordinatedPairs / analysis.totalPairs) * 100;

    // Generar recomendaciones
    if (analysis.coordinationScore < 80) {
      analysis.recommendations.push({
        type: 'coordination',
        severity: 'warning',
        message: 'Se recomienda ejecutar auto-coordinación para mejorar selectividad'
      });
    }

    return analysis;
  }
}

export default TCCEngine;
