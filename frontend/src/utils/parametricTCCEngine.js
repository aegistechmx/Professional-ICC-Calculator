/**
 * utils/parametricTCCEngine.js - Motor TCC Parametrizado Profesional
 * Estrategia usada por ETAP/SKM con curvas definidas por ecuaciones en lugar de puntos
 */

// ========================================
// DEFINICIONES DE CURVAS TCC PARAMETRIZADAS
// ========================================

export const TCCCurveTypes = {
  // Long Time (LT) - Curva inversa térmica
  LONG_TIME: {
    name: "Long Time",
    equation: (I, Ir, tr, In) => {
      if (I < Ir * In) return Infinity;
      return tr / Math.pow(I / (Ir * In), 2);
    },
    color: "#22c55e", // Verde
    zone: "LT"
  },

  // Short Time (ST) - Tiempo fijo
  SHORT_TIME: {
    name: "Short Time",
    equation: (I, Isd, tsd, In) => {
      if (I < Isd * In) return Infinity;
      return tsd;
    },
    color: "#eab308", // Amarillo
    zone: "ST"
  },

  // Instantáneo (INST) - Casi instantáneo
  INSTANTANEOUS: {
    name: "Instantaneous",
    equation: (I, Ii, In) => {
      if (I < Ii * In) return Infinity;
      return 0.02; // 20ms típico
    },
    color: "#ef4444", // Rojo
    zone: "INST"
  },

  // Ground Fault (GF) - Falla a tierra
  GROUND_FAULT: {
    name: "Ground Fault",
    equation: (Igf, Igr, tgr, In) => {
      if (Igf < Igr * In) return Infinity;
      return tgr / Math.pow(Igf / (Igr * In), 2);
    },
    color: "#06b6d4", // Cyan
    zone: "GF"
  }
};

// ========================================
// GENERADOR DE CURVA TCC REAL (PARAMÉTRICO)
// ========================================

export function generateTCCCurve(breaker) {
  const points = [];
  const { In, Ir, tr, Isd, tsd, Ii } = breaker.ratings;

  // Generar puntos desde 0.5x hasta 20x In con paso fino
  for (let i = 0.5; i <= 20; i += 0.05) {
    const I = i * In;
    let t = null;
    let zone = null;
    let source = null;

    // Long Time (térmica) - Zona verde
    if (I >= Ir * In && I < Isd * In) {
      t = TCCCurveTypes.LONG_TIME.equation(I, Ir, tr, In);
      zone = "LT";
      source = "LONG_TIME";
    }

    // Short Time - Zona amarilla
    else if (I >= Isd * In && I < Ii * In) {
      t = TCCCurveTypes.SHORT_TIME.equation(I, Isd, tsd, In);
      zone = "ST";
      source = "SHORT_TIME";
    }

    // Instantáneo - Zona roja
    else if (I >= Ii * In) {
      t = TCCCurveTypes.INSTANTANEOUS.equation(I, Ii, In);
      zone = "INST";
      source = "INSTANTANEOUS";
    }

    // Solo incluir puntos válidos
    if (t && t > 0.001 && t < 1000) {
      points.push({
        I,
        t,
        zone,
        source,
        multiplier: I / In,
        breaker: breaker.id
      });
    }
  }

  return points;
}

// ========================================
// BANDAS DE TOLERANCIA REALES (MIN/MAX)
// ========================================

export function generateBand(curve, tolerance = 0.2) {
  return curve.map(p => ({
    I: p.I,
    t_min: p.t * (1 - tolerance),
    t_max: p.t * (1 + tolerance),
    zone: p.zone,
    source: p.source,
    multiplier: p.multiplier
  }));
}

// ========================================
// EVALUACIÓN DE DISPARO EN TIEMPO REAL
// ========================================

export function evaluateTrip(breaker, faultCurrent) {
  const { In, Ir, tr, Isd, tsd, Ii } = breaker.ratings;

  // Verificar cada zona en orden de prioridad
  const zones = [
    {
      type: "INST",
      condition: faultCurrent >= Ii * In,
      time: 0.02,
      equation: TCCCurveTypes.INSTANTANEOUS
    },
    {
      type: "ST",
      condition: faultCurrent >= Isd * In && faultCurrent < Ii * In,
      time: tsd,
      equation: TCCCurveTypes.SHORT_TIME
    },
    {
      type: "LT",
      condition: faultCurrent >= Ir * In && faultCurrent < Isd * In,
      time: TCCCurveTypes.LONG_TIME.equation(faultCurrent, Ir, tr, In),
      equation: TCCCurveTypes.LONG_TIME
    }
  ];

  // Encontrar la primera zona que cumpla la condición
  for (const zone of zones) {
    if (zone.condition) {
      return {
        trip: true,
        time: zone.time,
        zone: zone.type,
        multiplier: faultCurrent / In,
        equation: zone.equation.name,
        color: zone.equation.color
      };
    }
  }

  // No hay disparo
  return {
    trip: false,
    time: Infinity,
    zone: null,
    multiplier: faultCurrent / In,
    equation: null,
    color: null
  };
}

// ========================================
// DETECCIÓN DE CRUCES (FALLA DE SELECTIVIDAD)
// ========================================

export function detectCross(curveUp, curveDown, margin = 0.1) {
  const crosses = [];

  // Para cada punto de la curva downstream
  for (let i = 0; i < curveDown.length; i++) {
    const down = curveDown[i];

    // Encontrar punto correspondiente en upstream (misma corriente)
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
        downstreamZone: down.zone,
        upstreamMultiplier: up.multiplier,
        downstreamMultiplier: down.multiplier
      });
    }
  }

  return {
    hasCross: crosses.length > 0,
    crosses,
    worstMargin: crosses.length > 0 ? Math.min(...crosses.map(c => c.margin)) : 0,
    criticalCrosses: crosses.filter(c => c.severity === 'critical')
  };
}

// ========================================
// AUTO-COORDINACIÓN INTELIGENTE (ESTRATEGIA PROFESIONAL)
// ========================================

export function autoCoordinate(upstream, downstream, options = {}) {
  const {
    margin = 0.1,
    maxIterations = 20,
    adjustmentStep = 0.1,
    preserveSensitivity = true
  } = options;

  let iterations = 0;
  let coordinated = false;
  const adjustments = [];

  // Guardar valores originales para restaurar si es necesario
  const originalUpstream = JSON.parse(JSON.stringify(upstream.ratings));
  const originalDownstream = JSON.parse(JSON.stringify(downstream.ratings));

  while (iterations < maxIterations && !coordinated) {
    // Generar curvas actuales
    const curveUp = generateTCCCurve(upstream);
    const curveDown = generateTCCCurve(downstream);

    // Detectar cruces
    const result = detectCross(curveUp, curveDown, margin);

    if (!result.hasCross) {
      coordinated = true;
      break;
    }

    // Encontrar el peor cruce (menor margen)
    const worstCross = result.crosses.reduce((worst, current) =>
      current.margin < worst.margin ? current : worst
    );

    // Aplicar ajuste inteligente según zona del cruce
    const adjustment = applyIntelligentAdjustment(upstream, worstCross, adjustmentStep, preserveSensitivity);

    if (adjustment) {
      adjustments.push({
        iteration: iterations + 1,
        breaker: upstream.id,
        current: worstCross.current,
        zone: worstCross.upstreamZone,
        adjustment,
        before: { ...upstream.ratings },
        after: { ...upstream.ratings },
        margin: worstCross.margin
      });
    } else {
      // No se puede ajustar más, restaurar valores originales
      Object.assign(upstream.ratings, originalUpstream);
      break;
    }

    iterations++;
  }

  return {
    coordinated,
    iterations,
    adjustments,
    finalMargin: coordinated ? margin : detectCross(
      generateTCCCurve(upstream),
      generateTCCCurve(downstream),
      margin
    ).worstMargin,
    originalUpstream,
    originalDownstream,
    preserveSensitivity
  };
}

// ========================================
// AJUSTE INTELIGENTE POR ZONA
// ========================================

function applyIntelligentAdjustment(breaker, cross, step = 0.1, preserveSensitivity = true) {
  const { upstreamZone, upstreamMultiplier } = cross;
  const { ratings } = breaker;

  let adjusted = false;
  let adjustment = null;

  // Estrategia según zona del cruce
  switch (upstreamZone) {
    case "INST":
      // Subir pickup instantáneo (más efectivo)
      const newIi = ratings.Ii * (1 + step);
      if (newIi <= ratings.In * 25 && (!preserveSensitivity || newIi <= ratings.In * 15)) {
        ratings.Ii = newIi;
        adjusted = true;
        adjustment = { type: "INST", parameter: "Ii", value: newIi, oldValue: ratings.Ii };
      }
      break;

    case "ST":
      // Aumentar tiempo de short time
      const newTsd = ratings.tsd * (1 + step);
      if (newTsd <= 1.0) { // Máximo 1 segundo
        ratings.tsd = newTsd;
        adjusted = true;
        adjustment = { type: "ST", parameter: "tsd", value: newTsd, oldValue: ratings.tsd };
      }
      break;

    case "LT":
      // Aumentar tiempo de long time (último recurso)
      const newTr = ratings.tr * (1 + step);
      if (newTr <= 100) { // Máximo 100 segundos
        ratings.tr = newTr;
        adjusted = true;
        adjustment = { type: "LT", parameter: "tr", value: newTr, oldValue: ratings.tr };
      }
      break;
  }

  return adjusted ? adjustment : null;
}

// ========================================
// COORDINACIÓN DE SISTEMA COMPLETO
// ========================================

export function coordinateSystem(breakers, options = {}) {
  const results = [];

  // Ordenar breakers de upstream a downstream (asumiendo orden lógico)
  for (let i = breakers.length - 1; i > 0; i--) {
    const downstream = breakers[i];
    const upstream = breakers[i - 1];

    const result = autoCoordinate(upstream, downstream, options);

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
    totalAdjustments: results.reduce((sum, r) => sum + r.adjustments.length, 0),
    criticalIssues: results.filter(r => !r.coordinated).length
  };
}

// ========================================
// SIMULACIÓN DE FALLA EN TIEMPO REAL
// ========================================

export function simulateFault(faultCurrent, breakers) {
  const evaluation = breakers.map(breaker => {
    const result = evaluateTrip(breaker, faultCurrent);

    return {
      id: breaker.id,
      type: breaker.type,
      family: breaker.family,
      model: breaker.model,
      ...result,
      curve: generateTCCCurve(breaker)
    };
  });

  // Ordenar por tiempo de disparo (el más rápido primero)
  evaluation.sort((a, b) => a.time - b.time);

  // Determinar breaker primario y backup
  const primary = evaluation.find(e => e.trip);
  const backup = evaluation.filter(e => e.trip && e.id !== primary?.id);

  return {
    faultCurrent,
    evaluation,
    primary,
    backup,
    selectivity: backup.length > 0 ? 'achieved' : 'not_applicable',
    timeToClear: primary?.time || Infinity,
    selectivityMargin: backup.length > 0 ? backup[0].time - primary.time : 0
  };
}

// ========================================
// CONVERSIÓN A ESCALA LOG-LOG PARA GRAFICACIÓN
// ========================================

export function toLogScale(curve) {
  return curve.map(p => ({
    x: Math.log10(p.I),
    y: Math.log10(p.t),
    I: p.I,
    t: p.t,
    zone: p.zone,
    source: p.source,
    multiplier: p.multiplier
  }));
}

// ========================================
// GENERACIÓN DE DATOS PARA GRAFICACIÓN CHART.JS
// ========================================

export function generateChartData(breakers, options = {}) {
  const { showBands = true, tolerance = 0.2 } = options;

  return breakers.map(breaker => {
    const curve = generateTCCCurve(breaker);
    const logCurve = toLogScale(curve);

    const dataset = {
      label: `${breaker.id} (${breaker.type})`,
      data: logCurve.map(p => ({ x: p.x, y: p.y })),
      borderColor: getZoneColor('LT'),
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    };

    // Agregar bandas si se solicita
    if (showBands) {
      const band = generateBand(curve, tolerance);
      const logBand = toLogScale(band);

      dataset.band = {
        min: logBand.map(p => ({ x: p.x, y: p.y })),
        max: logBand.map(p => ({ x: p.x, y: p.y }))
      };
    }

    return {
      breaker: breaker.id,
      dataset,
      curve,
      band: showBands ? dataset.band : null
    };
  });
}

// ========================================
// UTILIDADES DE COLOR POR ZONA
// ========================================

export function getZoneColor(zone) {
  const colors = {
    'LT': '#22c55e',    // Verde - Long Time
    'ST': '#eab308',    // Amarillo - Short Time  
    'INST': '#ef4444',   // Rojo - Instantáneo
    'GF': '#06b6d4'     // Cyan - Ground Fault
  };
  return colors[zone] || '#6b7280';
}

// ========================================
// ANÁLISIS DE SENSIBILIDAD
// ========================================

export function analyzeSensitivity(breakers, faultCurrents = [1000, 2000, 5000, 10000]) {
  const analysis = [];

  breakers.forEach(breaker => {
    const sensitivities = faultCurrents.map(Icc => {
      const result = evaluateTrip(breaker, Icc);
      return {
        Icc,
        ratio: Icc / breaker.ratings.In,
        sensitive: result.trip,
        tripTime: result.time,
        zone: result.zone
      };
    });

    const sensitiveCount = sensitivities.filter(s => s.sensitive).length;
    const sensitivityScore = (sensitiveCount / faultCurrents.length) * 100;

    analysis.push({
      breakerId: breaker.id,
      breakerType: breaker.type,
      pickup: breaker.ratings.Ir * breaker.ratings.In,
      sensitivityScore,
      sensitivities,
      isAdequate: sensitivityScore > 80,
      averageTripTime: sensitivities.reduce((sum, s) => sum + (s.tripTime === Infinity ? 0 : s.tripTime), 0) / faultCurrents.length
    });
  });

  return analysis;
}

export default {
  TCCCurveTypes,
  generateTCCCurve,
  generateBand,
  evaluateTrip,
  detectCross,
  autoCoordinate,
  coordinateSystem,
  simulateFault,
  toLogScale,
  generateChartData,
  getZoneColor,
  analyzeSensitivity
};
