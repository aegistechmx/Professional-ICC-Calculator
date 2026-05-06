/**
 * utils/coordinationEngine.js - Motor de Coordinación de Protecciones Tipo ETAP/SKM
 * Sistema de selectividad automática con TCC real y coordinación aguas arriba
 */

// === MODELO DE BREAKER REALISTA ===

export const breakerTemplate = {
  id: 'CB-1',
  
  // Parámetros TCC
  pickup: 1000,        // Ir (A) - pickup de sobrecorriente
  TMS: 0.5,           // Time Multiplier Setting
  curve: 'IEC',       // Tipo de curva
  
  // Instantáneo
  instPickup: 8000,    // Pickup instantáneo (A)
  instDelay: 0.02,     // Delay instantáneo (s)
  
  // Coordinación
  delayUpstream: 0.3, // Margen de coordinación aguas arriba (s)
  
  // Estado
  tripped: false,
  blocked: false,
  instBlocked: false, // Bloqueo por instantáneo downstream
  
  // Acumulación
  accumulatedTime: 0,
  lastEvaluationTime: 0
};

// === CURVAS TCC EXTENDIDAS ===

export function tccCurve(I, breaker) {
  if (I <= breaker.pickup) return Infinity;
  
  const ratio = I / breaker.pickup;
  
  switch (breaker.curve) {
    case 'IEC':
      return breaker.TMS * (0.14 / (Math.pow(ratio, 0.02) - 1));
      
    case 'VERY_INVERSE':
      return breaker.TMS * (13.5 / (ratio - 1));
      
    case 'EXTREMELY_INVERSE':
      return breaker.TMS * (80 / (Math.pow(ratio, 2) - 1));
      
    case 'SHORT_TIME':
      return breaker.TMS * (0.0515 / (Math.pow(ratio, 0.02) - 1));
      
    case 'LONG_TIME':
      return breaker.TMS * (120 / (Math.pow(ratio, 1) - 1));
      
    case 'IEEE_MODERATELY':
      return breaker.TMS * (0.0515 / (Math.pow(ratio, 0.02) - 1));
      
    case 'IEEE_VERY':
      return breaker.TMS * (19.61 / (Math.pow(ratio, 2) - 1));
      
    case 'ANSI_51':
      return breaker.TMS * (3.9 / (Math.pow(ratio, 0.02) - 1));
      
    default:
      return Infinity;
  }
}

// === TIEMPO TOTAL DE DISPARO ===

export function calculateTripTime(I, breaker) {
  // Instantáneo primero
  if (I >= breaker.instPickup) {
    return breaker.instDelay;
  }
  
  // Térmico/inverso
  return tccCurve(I, breaker);
}

// === MOTOR DE COORDINACIÓN (CORE) ===

export function coordinationEngine(graph, faultNode, currentTime = performance.now()) {
  const results = [];
  
  // Encontrar todos los caminos desde el nodo de falla
  const paths = findUpstreamPaths(graph, faultNode);
  
  paths.forEach(path => {
    path.edges.forEach(edge => {
      if (!edge.breaker) return;
      
      const breaker = { ...edge.breaker };
      const Icc = edge.current || 0;
      
      // Calcular tiempo de disparo
      const tripTime = calculateTripTime(Icc, breaker);
      
      // Actualizar tiempo acumulado
      const deltaTime = (currentTime - breaker.lastEvaluationTime) / 1000;
      breaker.accumulatedTime += deltaTime;
      breaker.lastEvaluationTime = currentTime;
      
      results.push({
        edge,
        breaker,
        Icc,
        tripTime,
        path: path.level, // Nivel desde la falla
        accumulatedTime: breaker.accumulatedTime,
        shouldTrip: breaker.accumulatedTime >= tripTime && !breaker.tripped
      });
    });
  });
  
  // Ordenar por tiempo de disparo (el más rápido primero)
  results.sort((a, b) => a.tripTime - b.tripTime);
  
  return results;
}

// === ENCONTRAR CAMINOS UPSTREAM ===

function findUpstreamPaths(graph, faultNode) {
  const visited = new Set();
  const queue = [{ node: faultNode, level: 0, path: [] }];
  const paths = [];
  
  while (queue.length > 0) {
    const { node, level, path } = queue.shift();
    
    if (visited.has(node)) continue;
    visited.add(node);
    
    // Encontrar edges upstream
    const upstreamEdges = graph.edges.filter(edge => edge.target === node);
    
    upstreamEdges.forEach(edge => {
      const newPath = [...path, { edge, level }];
      
      // Agregar a paths
      if (!paths.find(p => p.level === level)) {
        paths.push({
          level,
          edges: [edge],
          path: newPath
        });
      }
      
      // Continuar búsqueda
      queue.push({
        node: edge.source,
        level: level + 1,
        path: newPath
      });
    });
  }
  
  return paths;
}

// === SELECTIVIDAD AUTOMÁTICA ===

export function applySelectivity(results) {
  if (results.length === 0) return null;
  
  const primary = results[0]; // El más rápido (más cercano a la falla)
  
  // Marcar breaker primario como disparado
  primary.breaker.tripped = true;
  primary.breaker.tripTime = performance.now();
  
  // Aplicar coordinación a los demás
  for (let i = 1; i < results.length; i++) {
    const upstream = results[i];
    const margin = upstream.breaker.delayUpstream;
    
    // Si está demasiado cerca (riesgo de cruce) -> bloquear
    if (upstream.tripTime < primary.tripTime + margin) {
      upstream.breaker.blocked = true;
      upstream.breaker.blockReason = 'coordination_margin';
    } else {
      upstream.breaker.blocked = false;
    }
  }
  
  return primary;
}

// === BLOQUEO DE INSTANTÁNEO (CLAVE REAL) ===

export function applyInstantaneousBlocking(results) {
  if (results.length === 0) return;
  
  const primary = results[0];
  
  results.forEach(result => {
    if (result === primary) return;
    
    // Si hay breaker downstream activo -> bloquear instantáneo
    if (result.breaker.instPickup && result.Icc >= result.breaker.instPickup) {
      result.breaker.instBlocked = true;
      result.breaker.instBlockReason = 'downstream_instantaneous';
    }
  });
}

// === VERIFICACIÓN DE COORDINACIÓN ===

export function checkCoordination(results) {
  const issues = [];
  
  for (let i = 0; i < results.length - 1; i++) {
    const downstream = results[i];
    const upstream = results[i + 1];
    
    const margin = upstream.tripTime - downstream.tripTime;
    const minMargin = upstream.breaker.delayUpstream;
    
    if (margin < minMargin) {
      issues.push({
        type: 'coordination_violation',
        upstream: upstream.breaker.id,
        downstream: downstream.breaker.id,
        margin,
        minMargin,
        severity: margin < 0 ? 'critical' : 'warning'
      });
    }
  }
  
  return issues;
}

// === SISTEMA COMPLETO DE PROTECCIÓN ===

export class ProtectionSystem {
  constructor() {
    this.breakers = new Map();
    this.lastCoordination = null;
    this.coordinationHistory = [];
  }
  
  // Registrar breaker
  registerBreaker(id, config = {}) {
    const breaker = { ...breakerTemplate, ...config, id };
    this.breakers.set(id, breaker);
  }
  
  // Ejecutar sistema de protección completo
  runProtectionSystem(graph, fault) {
    // 1. Calcular coordinación
    const results = coordinationEngine(graph, fault.node, performance.now());
    
    // 2. Bloquear instantáneos downstream
    applyInstantaneousBlocking(results);
    
    // 3. Aplicar selectividad automática
    const primary = applySelectivity(results);
    
    // 4. Ejecutar disparos reales
    results.forEach(result => {
      if (result.breaker.tripped) {
        result.edge.open = true;
        result.edge.openTime = performance.now();
        result.edge.openReason = 'selectivity_trip';
      }
    });
    
    // 5. Verificar coordinación
    const coordinationIssues = checkCoordination(results);
    
    // 6. Guardar historial
    this.lastCoordination = {
      faultNode: fault.node,
      faultTime: performance.now(),
      primary: primary?.breaker.id,
      results,
      issues: coordinationIssues
    };
    
    this.coordinationHistory.push(this.lastCoordination);
    
    return {
      primary,
      results,
      issues: coordinationIssues,
      summary: this.generateCoordinationSummary(results)
    };
  }
  
  // Generar resumen de coordinación
  generateCoordinationSummary(results) {
    return {
      totalBreakers: results.length,
      tripped: results.filter(r => r.breaker.tripped).length,
      blocked: results.filter(r => r.breaker.blocked).length,
      instBlocked: results.filter(r => r.breaker.instBlocked).length,
      fastestTrip: results[0]?.tripTime || 0,
      slowestTrip: results[results.length - 1]?.tripTime || 0,
      averageTripTime: results.reduce((sum, r) => sum + r.tripTime, 0) / results.length || 0
    };
  }
  
  // Resetear sistema
  reset() {
    this.breakers.forEach(breaker => {
      breaker.tripped = false;
      breaker.blocked = false;
      breaker.instBlocked = false;
      breaker.accumulatedTime = 0;
      breaker.lastEvaluationTime = performance.now();
    });
    
    this.lastCoordination = null;
  }
  
  // Obtener estado de breaker
  getBreakerState(id) {
    return this.breakers.get(id);
  }
  
  // Obtener todos los estados
  getAllStates() {
    const states = {};
    this.breakers.forEach((breaker, id) => {
      states[id] = {
        id: breaker.id,
        pickup: breaker.pickup,
        TMS: breaker.TMS,
        curve: breaker.curve,
        tripped: breaker.tripped,
        blocked: breaker.blocked,
        instBlocked: breaker.instBlocked,
        accumulatedTime: breaker.accumulatedTime
      };
    });
    return states;
  }
}

// === INTEGRACIÓN VISUAL ===

export function updateVisuals(graph, coordination) {
  coordination.results.forEach(result => {
    const edge = result.edge;
    
    if (result.breaker.tripped) {
      edge.color = '#ff3b30';      // Rojo - disparado
      edge.arc = false;             // Sin arco (abierto)
      edge.glow = 0;
    } else if (result.breaker.blocked) {
      edge.color = '#ff9500';      // Naranja - bloqueado
      edge.arc = false;
      edge.glow = 0.5;
    } else if (result.breaker.instBlocked) {
      edge.color = '#ffcc00';      // Amarillo - bloqueo instantáneo
      edge.arc = false;
      edge.glow = 0.3;
    } else {
      edge.color = '#00c853';      // Verde - normal
      edge.glow = result.Icc / 1000; // Glow basado en ICC
    }
    
    // Guardar información de coordinación para visualización
    edge.coordination = {
      breakerId: result.breaker.id,
      tripTime: result.tripTime,
      Icc: result.Icc,
      status: result.breaker.tripped ? 'tripped' : 
              result.breaker.blocked ? 'blocked' : 
              result.breaker.instBlocked ? 'inst_blocked' : 'normal'
    };
  });
}

// === GENERACIÓN DE MARCAS TCC ===

export function generateTCCMarks(coordination) {
  return coordination.results.map(result => ({
    breaker: result.breaker.id,
    Icc: result.Icc,
    tripTime: result.tripTime,
    status: result.breaker.tripped ? 'tripped' : 
            result.breaker.blocked ? 'blocked' : 
            result.breaker.instBlocked ? 'inst_blocked' : 'normal',
    path: result.path,
    isPrimary: result === coordination.results[0]
  }));
}

// === ANÁLISIS DE COORDINACIÓN ===

export function analyzeCoordinationQuality(coordination) {
  const issues = coordination.issues;
  const summary = coordination.summary;
  
  let score = 100;
  
  // Penalizar violaciones de coordinación
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 50;
    else if (issue.severity === 'warning') score -= 20;
  });
  
  // Penalizar demasiados breakers bloqueados
  const blockedRatio = summary.blocked / summary.totalBreakers;
  if (blockedRatio > 0.3) score -= 30;
  
  // Bonus por buena selectividad
  if (summary.tripped === 1 && summary.blocked < summary.totalBreakers * 0.5) {
    score += 10;
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    issues: issues.length,
    blockedRatio,
    selectivity: summary.tripped === 1 ? 'excellent' : 'needs_improvement'
  };
}

export default {
  breakerTemplate,
  tccCurve,
  calculateTripTime,
  coordinationEngine,
  applySelectivity,
  applyInstantaneousBlocking,
  checkCoordination,
  ProtectionSystem,
  updateVisuals,
  generateTCCMarks,
  analyzeCoordinationQuality
};
