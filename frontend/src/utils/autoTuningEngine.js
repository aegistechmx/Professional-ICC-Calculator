/**
 * utils/autoTuningEngine.js - Motor de Auto-Tuning de Coordinación de Protecciones
 * Sistema optimizado que ajusta automáticamente pickups y TMS para cumplir restricciones
 */

// === UTILIDADES TCC BASE ===

export function tccIEC(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;
  const r = I / Ip;
  return TMS * (0.14 / (Math.pow(r, 0.02) - 1));
}

export function tccVeryInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;
  const r = I / Ip;
  return TMS * (13.5 / (r - 1));
}

export function tccExtremelyInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;
  const r = I / Ip;
  return TMS * (80 / (Math.pow(r, 2) - 1));
}

export function tripTime(I, brk) {
  // Instantáneo primero
  if (brk.instEnabled && I >= brk.instPickup && !brk.instBlocked) {
    return brk.instDelay ?? 0.02;
  }
  
  // Térmico según curva
  switch (brk.curve) {
    case 'IEC':
      return tccIEC(I, brk.pickup, brk.TMS);
    case 'VERY_INVERSE':
      return tccVeryInverse(I, brk.pickup, brk.TMS);
    case 'EXTREMELY_INVERSE':
      return tccExtremelyInverse(I, brk.pickup, brk.TMS);
    default:
      return tccIEC(I, brk.pickup, brk.TMS);
  }
}

// === OBTENER CADENAS (FEEDER PATHS) ===

export function buildChains(graph, faultNode) {
  const chains = [];
  const visited = new Set();
  
  // DFS para encontrar todos los caminos desde la falla hacia la fuente
  function dfs(node, path) {
    if (visited.has(node)) return;
    visited.add(node);
    
    // Encontrar edges upstream (hacia la fuente)
    const upstreamEdges = graph.edges.filter(e => e.target === node);
    
    if (!upstreamEdges.length) {
      // Llegamos a la fuente - guardar cadena completa
      if (path.length > 0) {
        chains.push([...path]);
      }
      return;
    }
    
    upstreamEdges.forEach(edge => {
      const prevNode = edge.source;
      dfs(prevNode, [...path, edge]);
    });
  }
  
  dfs(faultNode, []);
  return chains; // cada chain es lista de edges desde fuente hasta falla
}

// === CORE: AJUSTE LOCAL POR PARES ===

export function adjustPair(down, up, Icc, margin = 0.3, limits = {}) {
  const {
    TMS_min = 0.05,
    TMS_max = 2.0,
    pickup_min_factor = 1.05,
    pickup_max_factor = 2.0,
    maxIterations = 50
  } = limits;
  
  // Guardar valores originales
  const originalUp = { ...up };
  const originalDown = { ...down };
  
  // Tiempos actuales
  let tDown = tripTime(Icc, down);
  let tUp = tripTime(Icc, up);
  
  // 1) Asegurar sensibilidad del downstream
  if (down.pickup >= Icc) {
    // Reducir pickup del downstream para que sea sensible
    down.pickup = Math.max(Icc * 0.6, down.pickup * 0.9);
    tDown = tripTime(Icc, down);
  }
  
  // 2) Si upstream está muy rápido -> retrasarlo
  if (tUp < tDown + margin) {
    let adjusted = false;
    
    // Estrategia: subir TMS primero (mejor que subir pickup)
    for (let i = 0; i < maxIterations; i++) {
      // Subir TMS gradualmente
      let newTMS = up.TMS + 0.05;
      newTMS = Math.min(newTMS, TMS_max);
      up.TMS = newTMS;
      
      tUp = tripTime(Icc, up);
      
      if (tUp >= tDown + margin) {
        adjusted = true;
        break;
      }
      
      // Si TMS llegó al tope, subir pickup un poco
      if (newTMS >= TMS_max) {
        const maxPickup = originalUp.pickup * pickup_max_factor;
        up.pickup = Math.min(up.pickup * 1.05, maxPickup);
        tUp = tripTime(Icc, up);
        
        if (tUp >= tDown + margin) {
          adjusted = true;
          break;
        }
      }
    }
    
    // Si no se pudo ajustar, restaurar valores originales
    if (!adjusted) {
      Object.assign(up, originalUp);
      console.warn(`No se pudo coordinar ${up.id} con ${down.id} para Icc=${Icc}A`);
    }
  }
  
  // 3) Bloqueo de instantáneo aguas arriba si interfiere
  if (up.instEnabled && Icc >= up.instPickup) {
    up.instBlocked = true;
    up.instBlockReason = 'upstream_instantaneous_block';
  }
  
  return { 
    down, 
    up, 
    tDown, 
    tUp, 
    adjusted: tUp >= tDown + margin,
    margin: (tDown + margin) - tUp
  };
}

// === OPTIMIZADOR GLOBAL (ITERATIVO) ===

export function autoTuneProtection(graph, faultNode, IccMap, opts = {}) {
  const {
    margin = 0.3,
    maxIterations = 10,
    tolerance = 0.01,
    limits = {}
  } = opts;
  
  const chains = buildChains(graph, faultNode);
  let converged = false;
  let totalError = Infinity;
  const adjustments = [];
  
  console.log(`Iniciando auto-tuning para ${chains.length} cadenas...`);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let iterationError = 0;
    const iterationAdjustments = [];
    
    // Procesar cada cadena
    chains.forEach((chain, chainIndex) => {
      // Ordenar: upstream (fuente) -> downstream (falla)
      const edges = [...chain].reverse(); // Reverse para downstream primero
      
      for (let i = 0; i < edges.length - 1; i++) {
        const edgeDown = edges[i];     // Más cercano a falla
        const edgeUp = edges[i + 1];     // Más cercano a fuente
        
        if (!edgeDown.breaker || !edgeUp.breaker) continue;
        
        const Icc = IccMap[edgeDown.id] || edgeDown.current || 1000;
        
        // Guardar estado antes del ajuste
        const beforeUp = { ...edgeUp.breaker };
        const beforeDown = { ...edgeDown.breaker };
        
        // Ajustar par
        const result = adjustPair(
          edgeDown.breaker,
          edgeUp.breaker,
          Icc,
          margin,
          limits
        );
        
        // Calcular error
        const err = Math.max(0, (result.tDown + margin) - result.tUp);
        iterationError += err;
        
        // Guardar ajuste para reporte
        if (result.adjusted) {
          iterationAdjustments.push({
            chain: chainIndex,
            upstream: edgeUp.breaker.id,
            downstream: edgeDown.breaker.id,
            Icc,
            beforeUp: { TMS: beforeUp.TMS, pickup: beforeUp.pickup },
            afterUp: { TMS: edgeUp.breaker.TMS, pickup: edgeUp.breaker.pickup },
            beforeDown: { TMS: beforeDown.TMS, pickup: beforeDown.pickup },
            afterDown: { TMS: edgeDown.breaker.TMS, pickup: edgeDown.breaker.pickup },
            margin: result.margin,
            tDown: result.tDown,
            tUp: result.tUp
          });
        }
      }
    });
    
    // Verificar convergencia
    if (iterationError < tolerance) {
      converged = true;
      adjustments.push(...iterationAdjustments);
      break;
    }
    
    // Si mejoró significativamente, guardar ajustes
    if (iterationError < totalError * 0.9) {
      adjustments.push(...iterationAdjustments);
    }
    
    totalError = iterationError;
    
    console.log(`Iteración ${iter + 1}: Error = ${iterationError.toFixed(4)}, Ajustes = ${iterationAdjustments.length}`);
  }
  
  return { 
    converged, 
    graph, 
    totalError, 
    iterations: converged ? chains.findIndex(() => true) + 1 : maxIterations,
    adjustments,
    chainsProcessed: chains.length
  };
}

// === VALIDACIÓN (ANTI-CRUCES) ===

export function validateCoordination(chain, currents, margin = 0.3) {
  const violations = [];
  
  for (let k = 0; k < currents.length; k++) {
    const I = currents[k];
    
    for (let i = chain.length - 1; i > 0; i--) {
      const downstream = chain[i].breaker;
      const upstream = chain[i - 1].breaker;
      
      if (!downstream || !upstream) continue;
      
      const tDown = tripTime(I, downstream);
      const tUp = tripTime(I, upstream);
      
      if (!(tUp >= tDown + margin)) {
        violations.push({
          current: I,
          upstreamId: upstream.id,
          downstreamId: downstream.id,
          tUp,
          tDown,
          margin: (tDown + margin) - tUp,
          severity: (tDown + margin) - tUp > 0.1 ? 'critical' : 'warning'
        });
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    score: Math.max(0, 100 - violations.length * 10)
  };
}

// === ANÁLISIS DE SENSIBILIDAD ===

export function analyzeSensitivity(breakers, faultCurrents) {
  const analysis = [];
  
  breakers.forEach(breaker => {
    const sensitivities = faultCurrents.map(Icc => {
      const ratio = Icc / breaker.pickup;
      return {
        Icc,
        ratio,
        sensitive: ratio > 1.2, // Sensible si 20% por encima de pickup
        tripTime: tripTime(Icc, breaker)
      };
    });
    
    const sensitiveCount = sensitivities.filter(s => s.sensitive).length;
    const sensitivityScore = (sensitiveCount / faultCurrents.length) * 100;
    
    analysis.push({
      breakerId: breaker.id,
      pickup: breaker.pickup,
      TMS: breaker.TMS,
      sensitivityScore,
      sensitivities,
      isAdequate: sensitivityScore > 80
    });
  });
  
  return analysis;
}

// === GENERACIÓN DE REPORTES ===

export function generateTuningReport(result, validationResults) {
  const report = {
    summary: {
      converged: result.converged,
      totalError: result.totalError,
      iterations: result.iterations,
      chainsProcessed: result.chainsProcessed,
      adjustmentsMade: result.adjustments.length
    },
    adjustments: result.adjustments,
    validation: validationResults,
    recommendations: []
  };
  
  // Generar recomendaciones
  if (!result.converged) {
    report.recommendations.push({
      type: 'convergence',
      severity: 'warning',
      message: 'El auto-tuning no convergió. Considerar aumentar márgenes o revisar topología.'
    });
  }
  
  // Analizar ajustes de pickup
  const pickupAdjustments = result.adjustments.filter(adj => 
    adj.afterDown.pickup !== adj.beforeDown.pickup ||
    adj.afterUp.pickup !== adj.beforeUp.pickup
  );
  
  if (pickupAdjustments.length > result.adjustments.length * 0.3) {
    report.recommendations.push({
      type: 'pickup',
      severity: 'info',
      message: `${pickupAdjustments.length} breakers requirieron ajuste de pickup. Considerar revisar capacidades del sistema.`
    });
  }
  
  // Analizar TMS adjustments
  const tmsAdjustments = result.adjustments.filter(adj => 
    adj.afterUp.TMS !== adj.beforeUp.TMS
  );
  
  if (tmsAdjustments.length > 0) {
    report.recommendations.push({
      type: 'tms',
      severity: 'info',
      message: `${tmsAdjustments.length} breakers ajustaron TMS para mejorar coordinación.`
    });
  }
  
  return report;
}

// === INTEGRACIÓN CON SISTEMA EXISTENTE ===

export function integrateWithCoordinationEngine(coordinationEngine, autoTuningResult) {
  // Actualizar breakers en el coordination engine con los nuevos valores
  autoTuningResult.adjustments.forEach(adj => {
    const upstreamBreaker = coordinationEngine.getBreakerState(adj.upstream);
    const downstreamBreaker = coordinationEngine.getBreakerState(adj.downstream);
    
    if (upstreamBreaker) {
      upstreamBreaker.TMS = adj.afterUp.TMS;
      upstreamBreaker.pickup = adj.afterUp.pickup;
      upstreamBreaker.instBlocked = upstreamBreaker.instBlocked || false;
    }
    
    if (downstreamBreaker) {
      downstreamBreaker.TMS = adj.afterDown.TMS;
      downstreamBreaker.pickup = adj.afterDown.pickup;
    }
  });
  
  return coordinationEngine;
}

export default {
  tccIEC,
  tccVeryInverse,
  tccExtremelyInverse,
  tripTime,
  buildChains,
  adjustPair,
  autoTuneProtection,
  validateCoordination,
  analyzeSensitivity,
  generateTuningReport,
  integrateWithCoordinationEngine
};
