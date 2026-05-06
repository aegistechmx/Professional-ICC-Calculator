/**
 * utils/simulationEngine.js - Motor de Simulación Frontend
 * Funciones para simulación en tiempo real sin dependencia del backend
 */

// === UTILIDADES DE FLUJO ===

export function getFlowStatus(current) {
  if (current === 0) return 'inactive';
  if (current < 10) return 'low';
  if (current < 50) return 'medium';
  if (current < 100) return 'high';
  return 'critical';
}

export function calculateFlowPower(current, voltage, powerFactor = 0.9) {
  return Math.abs(current * voltage * powerFactor);
}

export function getFlowColor(status) {
  const colors = {
    inactive: '#94a3b8',
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };
  return colors[status] || '#94a3b8';
}

export function getFlowWidth(current) {
  // Ancho de línea basado en corriente (1-10px)
  return Math.max(1, Math.min(10, Math.sqrt(current / 10)));
}

// === UTILIDADES DE FALLA ===

export function simulateFaultPropagation(faultNodeId, nodes, edges, results) {
  const propagation = [];
  const visited = new Set();
  const queue = [faultNodeId];

  // Encontrar nodos upstream (afectados por la falla)
  while (queue.length > 0) {
    const currentNode = queue.shift();

    if (visited.has(currentNode)) continue;
    visited.add(currentNode);

    // Buscar edges que van hacia este nodo (upstream)
    const upstreamEdges = edges.filter(edge => edge.target === currentNode);

    upstreamEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);

      if (sourceNode && !visited.has(sourceNode.id)) {
        propagation.push({
          from: sourceNode.id,
          to: currentNode,
          edgeId: edge.id,
          faultCurrent: results?.flujos?.find(f =>
            f.from === sourceNode.id && f.to === currentNode
          )?.I || 0,
          distance: propagation.length,
          timestamp: Date.now()
        });

        queue.push(sourceNode.id);
      }
    });
  }

  return propagation;
}

export function getFaultSeverity(current, voltage) {
  const power = current * voltage;

  if (power < 1000) return 'low';
  if (power < 10000) return 'medium';
  if (power < 100000) return 'high';
  return 'critical';
}

export function getFaultColor(severity) {
  const colors = {
    low: '#fbbf24',
    medium: '#f97316',
    high: '#ef4444',
    critical: '#991b1b'
  };
  return colors[severity] || '#ef4444';
}

// === UTILIDADES TCC (TIME-CURRENT CURVES) ===

export function generateTCCTimeCurrentCurve(pickup, instantaneous, curveType = 'IEC') {
  const points = [];

  switch (curveType) {
    case 'IEC':
      // Curva IEC estándar
      points.push(
        { current: pickup * 1.05, time: 7200 },    // 2 horas al 105%
        { current: pickup * 1.2, time: 180 },       // 3 minutos al 120%
        { current: pickup * 1.5, time: 30 },        // 30 segundos al 150%
        { current: pickup * 2, time: 20 },         // 20 segundos al 200%
        { current: pickup * 6, time: 5 },          // 5 segundos al 600%
        { current: instantaneous, time: 0.02 }     // Instantáneo
      );
      break;

    case 'IEEE':
      // Curva IEEE
      points.push(
        { current: pickup * 1.1, time: 3600 },     // 1 hora al 110%
        { current: pickup * 1.3, time: 180 },      // 3 minutos al 130%
        { current: pickup * 2, time: 30 },         // 30 segundos al 200%
        { current: pickup * 5, time: 5 },          // 5 segundos al 500%
        { current: instantaneous, time: 0.016 }    // Instantáneo (1 ciclo)
      );
      break;

    case 'B_CURVE':
      // Curva B (protección de cables)
      points.push(
        { current: pickup * 3, time: 40 },
        { current: pickup * 5, time: 25 },
        { current: pickup * 10, time: 10 },
        { current: pickup * 20, time: 4 },
        { current: pickup * 50, time: 0.1 }
      );
      break;

    case 'C_CURVE':
      // Curva C (protección general)
      points.push(
        { current: pickup * 5, time: 40 },
        { current: pickup * 10, time: 25 },
        { current: pickup * 20, time: 10 },
        { current: pickup * 30, time: 4 },
        { current: pickup * 15, time: 0.02 }
      );
      break;

    case 'D_CURVE':
      // Curva D (protección de motores)
      points.push(
        { current: pickup * 10, time: 40 },
        { current: pickup * 20, time: 25 },
        { current: pickup * 30, time: 10 },
        { current: pickup * 40, time: 4 },
        { current: pickup * 20, time: 0.02 }
      );
      break;

    default:
      // Curva por defecto
      points.push(
        { current: pickup, time: 1000 },
        { current: instantaneous, time: 0.02 }
      );
  }

  return points;
}

export function getTCCStatus(current, pickup, instantaneous) {
  if (current < pickup * 1.05) return 'normal';
  if (current < pickup * 1.2) return 'warning';
  if (current < pickup * 2) return 'caution';
  if (current < instantaneous) return 'danger';
  return 'trip';
}

export function getTCCColor(status) {
  const colors = {
    normal: '#22c55e',
    warning: '#eab308',
    caution: '#f97316',
    danger: '#ef4444',
    trip: '#991b1b'
  };
  return colors[status] || '#22c55e';
}

export function interpolateTripTime(curve, current) {
  if (!curve || curve.length < 2) return 0.02;

  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];

    if (current >= p1.current && current <= p2.current) {
      // Interpolación logarítmica (estándar para curvas de breaker)
      const logI = Math.log10(current);
      const logI1 = Math.log10(p1.current);
      const logI2 = Math.log10(p2.current);
      const logT1 = Math.log10(p1.time);
      const logT2 = Math.log10(p2.time);

      const logT = logT1 + ((logI - logI1) * (logT2 - logT1)) / (logI2 - logI1);
      return Math.pow(10, logT);
    }
  }

  // Fuera de rango
  if (current < curve[0].current) return curve[0].time;
  return curve[curve.length - 1].time;
}

export function curvesOverlap(curve1, curve2) {
  if (!curve1 || !curve2 || curve1.length < 2 || curve2.length < 2) return false;

  // Verificar si hay cruce en el rango de operación
  const testCurrents = [50, 100, 200, 500, 1000];

  for (const current of testCurrents) {
    const time1 = interpolateTripTime(curve1, current);
    const time2 = interpolateTripTime(curve2, current);

    // Si el upstream es más rápido que el downstream, hay cruce
    if (time2 < time1 * 0.9) { // 10% de tolerancia
      return true;
    }
  }

  return false;
}

// === UTILIDADES DE COORDINACIÓN ===

export function calculateCoordinationMargin(upstreamCurve, downstreamCurve) {
  const testCurrents = [50, 100, 200, 500, 1000];
  let minMargin = Infinity;

  for (const current of testCurrents) {
    const upstreamTime = interpolateTripTime(upstreamCurve, current);
    const downstreamTime = interpolateTripTime(downstreamCurve, current);

    if (downstreamTime > 0) {
      const margin = (upstreamTime - downstreamTime) / downstreamTime;
      minMargin = Math.min(minMargin, margin);
    }
  }

  return minMargin === Infinity ? 0 : minMargin;
}

export function adjustCurveForCoordination(curve, requiredDelay) {
  return curve.map(point => ({
    ...point,
    time: point.time * (1 + requiredDelay)
  }));
}

// === UTILIDADES DE PARTÍCULAS ===

export function createParticleData(edge, current, options = {}) {
  const baseCount = Math.max(1, Math.floor(current / 20)); // 1 partícula cada 20A
  const speed = Math.min(2, Math.max(0.1, current / 100)); // Velocidad basada en corriente

  return {
    edgeId: edge.id,
    count: baseCount * (options.density || 1),
    speed: speed * (options.speed || 1),
    size: Math.max(2, Math.min(8, current / 50)), // Tamaño basado en corriente
    color: getFlowColor(getFlowStatus(current)),
    opacity: Math.min(1, current / 200),
    direction: edge.direction || 'forward'
  };
}

export function updateParticlePosition(particle, deltaTime) {
  const progress = (particle.speed * deltaTime) / 1000; // Progreso por segundo

  return {
    ...particle,
    position: (particle.position || 0) + progress,
    lastUpdate: Date.now()
  };
}

export function isParticleComplete(particle) {
  return particle.position >= 1;
}

// === UTILIDADES DE ANIMACIÓN ===

export function createAnimationLoop(callback, fps = 60) {
  let animationId = null;
  let lastTime = 0;
  const targetFrameTime = 1000 / fps;

  const loop = (currentTime) => {
    if (currentTime - lastTime >= targetFrameTime) {
      callback(currentTime - lastTime);
      lastTime = currentTime;
    }

    animationId = requestAnimationFrame(loop);
  };

  return {
    start: () => {
      if (!animationId) {
        animationId = requestAnimationFrame(loop);
      }
    },
    stop: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    isRunning: () => !!animationId
  };
}

// === UTILIDADES DE LAYOUT ===

export function snapToGrid(position, gridSize = 20) {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
}

export function autoRouteEdge(sourcePos, targetPos, style = 'L') {
  switch (style) {
    case 'L':
      // L-shape routing
      return [
        sourcePos,
        { x: targetPos.x, y: sourcePos.y },
        targetPos
      ];

    case 'S': {
      // S-shape routing
      const midX = (sourcePos.x + targetPos.x) / 2;
      return [
        sourcePos,
        { x: midX, y: sourcePos.y },
        { x: midX, y: targetPos.y },
        targetPos
      ];
    }

    case 'direct':
    default:
      // Direct line
      return [sourcePos, targetPos];
  }
}

export function calculateElectricalLayout(nodes) {
  // Layout jerárquico basado en tipo de nodo
  const levels = {
    source: 0,
    transformer: 1,
    bus: 2,
    breaker: 3,
    load: 4
  };

  const nodesByLevel = {};

  // Agrupar nodos por nivel
  nodes.forEach(node => {
    const level = levels[node.type] || 999;
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  // Posicionar nodos
  const verticalSpacing = 150;
  const horizontalSpacing = 200;
  const positionedNodes = [];

  Object.keys(nodesByLevel)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((level, levelIndex) => {
      const nodesInLevel = nodesByLevel[level];
      const y = levelIndex * verticalSpacing + 100;

      nodesInLevel.forEach((node, nodeIndex) => {
        const x = (nodeIndex - nodesInLevel.length / 2) * horizontalSpacing + 400;

        positionedNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });

  return positionedNodes;
}

// === UTILIDADES DE VALIDACIÓN ===

export function validateElectricalParameters(node) {
  const errors = [];

  if (node.data?.voltaje && (node.data.voltaje < 100 || node.data.voltaje > 35000)) {
    errors.push('Voltaje fuera de rango (100V - 35kV)');
  }

  if (node.data?.I_carga && (node.data.I_carga < 0 || node.data.I_carga > 10000)) {
    errors.push('Corriente de carga fuera de rango (0A - 10kA)');
  }

  if (node.data?.longitud && (node.data.longitud < 0 || node.data.longitud > 1000)) {
    errors.push('Longitud fuera de rango (0m - 1000m)');
  }

  return errors;
}

export function validateGraphConnectivity(nodes, edges) {
  const connectedNodes = new Set();
  const nodeIds = new Set(nodes.map(n => n.id));

  // Verificar que todos los edges conecten nodos existentes
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      connectedNodes.add(`Edge ${edge.id}: nodo fuente ${edge.source} no existe`);
    }
    if (!nodeIds.has(edge.target)) {
      connectedNodes.add(`Edge ${edge.id}: nodo destino ${edge.target} no existe`);
    }
  });

  // Encontrar nodos desconectados
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && node.type !== 'source') {
      connectedNodes.add(`Nodo ${node.id} está desconectado`);
    }
  });

  return Array.from(connectedNodes);
}

// === EXPORTS ===

export default {
  // Flow utilities
  getFlowStatus,
  calculateFlowPower,
  getFlowColor,
  getFlowWidth,

  // Fault utilities
  simulateFaultPropagation,
  getFaultSeverity,
  getFaultColor,

  // TCC utilities
  generateTCCTimeCurrentCurve,
  getTCCStatus,
  getTCCColor,
  interpolateTripTime,
  curvesOverlap,

  // Coordination utilities
  calculateCoordinationMargin,
  adjustCurveForCoordination,

  // Particle utilities
  createParticleData,
  updateParticlePosition,
  isParticleComplete,

  // Animation utilities
  createAnimationLoop,

  // Layout utilities
  snapToGrid,
  autoRouteEdge,
  calculateElectricalLayout,

  // Validation utilities
  validateElectricalParameters,
  validateGraphConnectivity
};
