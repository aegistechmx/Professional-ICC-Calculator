/**
 * Optimizador de Ajustes de Breakers (Auto-Coordinación Inteligente)
 * Ajusta automáticamente parámetros para cumplir coordinación TCC
 * Algoritmo: Búsqueda iterativa con función de costo
 */

const { getTripTimeReal } = require('./tccCoordination.js');

/**
 * Restringe valor entre mínimo y máximo
 * @param {number} val - Valor a restringir
 * @param {number} min - Mínimo permitido
 * @param {number} max - Máximo permitido
 * @returns {number} Valor restringido
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Factor aleatorio para mutación
 * @param {number} min - Mínimo
 * @param {number} max - Máximo
 * @returns {number} Factor aleatorio
 */
function randomFactor(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Aplica restricciones físicas a parámetros de breaker
 * @param {Object} b - Breaker a restringir
 */
function enforceLimits(b) {
  // Pickup: entre 1.1x y 1.5x In (zona térmica)
  b.pickup = clamp(b.pickup, 1.1 * b.In, 1.5 * b.In);

  // Inst: entre 5x y 12x In (zona magnética)
  b.inst = clamp(b.inst, 5 * b.In, 12 * b.In);

  // TMS: entre 0.05 y 1.0
  b.tms = clamp(b.tms, 0.05, 1.0);
}

/**
 * Calcula función de costo (penalizaciones)
 * @param {Array} breakers - Array de breakers
 * @param {Array} faults - Array de fallas a evaluar [{ I, I_min }]
 * @returns {number} Costo total (menor es mejor)
 */
function costFunction(breakers, faults) {
  let cost = 0;
  const MARGIN_MIN = 0.2; // 200 ms mínimo

  for (const fault of faults) {
    // Evaluar coordinación entre pares upstream-downstream
    for (let i = 0; i < breakers.length - 1; i++) {
      const up = breakers[i];
      const down = breakers[i + 1];

      const t_up = getTripTimeReal(up, fault.I);
      const t_down = getTripTimeReal(down, fault.I);

      const margin = t_up - t_down;

      // Penaliza mala coordinación (margen insuficiente)
      if (margin < MARGIN_MIN) {
        cost += 1000 * (MARGIN_MIN - margin);
      }

      // Penaliza gravemente si upstream dispara antes (selectividad perdida)
      if (t_up < t_down) {
        cost += 5000;
      }

      // Penaliza lentitud (tiempo total excesivo)
      if (t_down > 2.0) {
        cost += 100 * (t_down - 2.0);
      }
    }

    // Penaliza falta de sensibilidad (no detecta falla mínima)
    const lastBreaker = breakers[breakers.length - 1];
    if (fault.I_min && fault.I_min < lastBreaker.pickup) {
      cost += 2000;
    }
  }

  // Penalización suave por valores extremos (regularización)
  for (const b of breakers) {
    // Penaliza TMS muy alto (lento)
    if (b.tms > 0.5) {
      cost += 50 * (b.tms - 0.5);
    }
    // Penaliza pickup muy alto (poco sensible)
    if (b.pickup > 1.3 * b.In) {
      cost += 30 * ((b.pickup / b.In) - 1.3);
    }
  }

  return cost;
}

/**
 * Crea copia profunda de breakers
 * @param {Array} breakers - Array de breakers
 * @returns {Array} Copia profunda
 */
function cloneBreakers(breakers) {
  return JSON.parse(JSON.stringify(breakers));
}

/**
 * Muta parámetros de breakers ligeramente
 * @param {Array} breakers - Breakers a mutar
 * @returns {Array} Breakers mutados
 */
function mutateBreakers(breakers) {
  const mutated = cloneBreakers(breakers);

  for (const b of mutated) {
    // Mutar pickup ±10%
    b.pickup *= randomFactor(0.9, 1.1);
    // Mutar TMS ±20%
    b.tms *= randomFactor(0.8, 1.2);
    // Mutar instantáneo ±10%
    b.inst *= randomFactor(0.9, 1.1);

    // Aplicar restricciones
    enforceLimits(b);
  }

  return mutated;
}

/**
 * Optimiza ajustes de breakers automáticamente
 * @param {Object} params - Parámetros de optimización
 * @param {Array} params.breakers - Array de breakers iniciales
 * @param {Array} params.faults - Array de escenarios de falla [{ I, I_min }]
 * @param {number} params.iterations - Número de iteraciones (default 100)
 * @param {number} params.temperature - Temperatura inicial para simulated annealing (default 1.0)
 * @returns {Object} Resultado de optimización
 */
function optimizeBreakers({
  breakers,
  faults,
  iterations = 100,
  temperature = 1.0
}) {
  // Validar entrada
  if (!breakers || breakers.length < 2) {
    throw new Error('Se necesitan al menos 2 breakers para coordinación');
  }
  if (!faults || faults.length === 0) {
    throw new Error('Se necesita al menos un escenario de falla');
  }

  // Inicializar con configuración actual
  let best = cloneBreakers(breakers);
  let bestCost = costFunction(best, faults);

  let current = cloneBreakers(breakers); // current (A)
  let currentCost = bestCost; // current (A)

  const history = [{
    iteration: 0,
    cost: bestCost,
    breakers: cloneBreakers(best)
  }];

  // Algoritmo: Hill Climbing con Simulated Annealing
  for (let iter = 0; iter < iterations; iter++) {
    // Generar candidato mutando el actual
    const candidate = mutateBreakers(current); // current (A)
    const candidateCost = costFunction(candidate, faults);

    // Calcular probabilidad de aceptación (Simulated Annealing)
    const temp = temperature * (1 - iter / iterations); // Enfriamiento
    const delta = candidateCost - currentCost; // current (A)

    // Aceptar si mejora, o con probabilidad si empeora (para escapar mínimos locales)
    const accept = delta < 0 || Math.random() < Math.exp(-delta / temp);

    if (accept) {
      current = candidate; // current (A)
      currentCost = candidateCost; // current (A)

      // Actualizar mejor global
      if (candidateCost < bestCost) {
        best = cloneBreakers(candidate);
        bestCost = candidateCost;
      }
    }

    // Guardar historia cada 10 iteraciones
    if (iter % 10 === 0) {
      history.push({
        iteration: iter + 1,
        cost: bestCost,
        breakers: cloneBreakers(best)
      });
    }
  }

  // Calcular métricas finales
  const finalMetrics = calculateMetrics(best, faults);

  return {
    success: bestCost < 1000, // Éxito si costo bajo
    originalCost: costFunction(breakers, faults),
    optimizedCost: bestCost,
    improvement: ((costFunction(breakers, faults) - bestCost) / costFunction(breakers, faults) * 100).toFixed(1),
    original: breakers,
    optimized: best,
    metrics: finalMetrics,
    history: history,
    iterations
  };
}

/**
 * Calcula métricas de coordinación
 * @param {Array} breakers - Breakers optimizados
 * @param {Array} faults - Escenarios de falla
 * @returns {Object} Métricas calculadas
 */
function calculateMetrics(breakers, faults) {
  const margins = [];
  const times = [];

  for (const fault of faults) {
    for (let i = 0; i < breakers.length - 1; i++) {
      const up = breakers[i];
      const down = breakers[i + 1];

      const t_up = getTripTimeReal(up, fault.I);
      const t_down = getTripTimeReal(down, fault.I);

      margins.push({
        pair: `${up.model}-${down.model}`,
        fault: fault.I,
        margin: t_up - t_down,
        t_up,
        t_down
      });

      times.push(t_down);
    }
  }

  const minMargin = Math.min(...margins.map(m => m.margin));
  const avgMargin = margins.reduce((a, m) => a + m.margin, 0) / margins.length;
  const maxTime = Math.max(...times);

  return {
    margins,
    minMargin: minMargin.toFixed(3),
    avgMargin: avgMargin.toFixed(3),
    maxTime: maxTime.toFixed(3),
    coordinated: minMargin >= 0.2
  };
}

/**
 * Genera reporte de optimización legible
 * @param {Object} result - Resultado de optimizeBreakers
 * @returns {string} Reporte formateado
 */
function generateReport(result) {
  const lines = [];

  lines.push('📊 REPORTE DE AUTO-COORDINACIÓN');
  lines.push('');
  lines.push(`Estado: ${result.success ? '✅ ÉXITO' : '⚠️ MEJORADO (con advertencias)'}`);
  lines.push(`Mejora: ${result.improvement}%`);
  lines.push(`Iteraciones: ${result.iterations}`);
  lines.push('');
  lines.push('📈 Métricas:');
  lines.push(`  Margen mínimo: ${result.metrics.minMargin}s`);
  lines.push(`  Margen promedio: ${result.metrics.avgMargin}s`);
  lines.push(`  Tiempo máximo: ${result.metrics.maxTime}s`);
  lines.push('');
  lines.push('🔧 Ajustes optimizados:');

  for (let i = 0; i < result.optimized.length; i++) {
    const opt = result.optimized[i];
    const orig = result.original[i];
    lines.push(`  ${opt.model}:`);
    lines.push(`    Pickup: ${orig.pickup.toFixed(0)}A → ${opt.pickup.toFixed(0)}A`);
    lines.push(`    TMS: ${orig.tms.toFixed(3)} → ${opt.tms.toFixed(3)}`);
    lines.push(`    Inst: ${orig.inst.toFixed(0)}A → ${opt.inst.toFixed(0)}A`);
  }

  return lines.join('\n');
}

module.exports = {
  costFunction,
  optimizeBreakers,
  generateReport
};
