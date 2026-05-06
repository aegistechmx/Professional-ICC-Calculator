/**
 * utils/faultPropagation.js - Motor de Propagación de Fallas en Tiempo Real
 * Sistema que simula ondas de falla viajando por el grafo eléctrico
 */

// === MODELO DE FALLA ===
export class FaultWave {
  constructor(originNode, options = {}) {
    this.active = true;
    this.originNode = originNode;
    this.time = 0;
    this.speed = options.speed || 0.002; // velocidad de propagación
    this.visitedEdges = new Set();
    this.affectedEdges = new Map(); // edgeId -> faultLevel
    this.maxPropagation = options.maxPropagation || 10; // máximo de hops
    this.intensity = options.intensity || 1.0;
  }

  // === PROPAGACIÓN DE FALLA (CORE) ===
  propagate(graph, deltaTime) {
    if (!this.active) return [];

    this.time += deltaTime;
    const affectedEdges = [];

    // BFS desde el origen
    const queue = [this.originNode];
    const visited = new Set([this.originNode]);
    const distance = new Map();
    distance.set(this.originNode, 0);

    while (queue.length > 0) {
      const currentNode = queue.shift();
      const currentDistance = distance.get(currentNode);

      if (currentDistance >= this.maxPropagation) continue;

      // Encontrar edges conectados
      const connectedEdges = graph.edges.filter(edge => 
        edge.source === currentNode || edge.target === currentNode
      );

      connectedEdges.forEach(edge => {
        const edgeId = edge.id || `${edge.source}-${edge.target}`;
        const nextNode = edge.source === currentNode ? edge.target : edge.source;

        if (!visited.has(nextNode) && !this.visitedEdges.has(edgeId)) {
          visited.add(nextNode);
          distance.set(nextNode, currentDistance + 1);

          // Probabilidad de propagación basada en tiempo y distancia
          const propagationProbability = Math.min(1, this.speed * this.time * (1 - currentDistance * 0.1));
          
          if (Math.random() < propagationProbability) {
            this.visitedEdges.add(edgeId);
            
            const faultLevel = Math.min(1, this.time * 0.5 * (1 - currentDistance * 0.05));
            this.affectedEdges.set(edgeId, faultLevel);

            affectedEdges.push({
              ...edge,
              faultLevel,
              faultIntensity: this.intensity * (1 - currentDistance * 0.1)
            });

            queue.push(nextNode);
          }
        }
      });
    }

    return affectedEdges;
  }

  // === DETENER FALLA ===
  stop() {
    this.active = false;
  }

  // === REINICIAR FALLA ===
  reset() {
    this.active = true;
    this.time = 0;
    this.visitedEdges.clear();
    this.affectedEdges.clear();
  }
}

// === AUMENTO DE CORRIENTE POR FALLA ===
export function applyFaultCurrent(edge, baseCurrent, faultIntensity = 1.0) {
  const faultMultiplier = 10 + Math.random() * 20; // 10-30x aumento brutal
  
  return {
    ...edge,
    originalCurrent: baseCurrent,
    current: baseCurrent * faultMultiplier * faultIntensity,
    isFault: true,
    faultTime: performance.now(),
    faultMultiplier: faultMultiplier * faultIntensity
  };
}

// === PARTÍCULAS DE FALLA ===
export function spawnFaultParticles(particles, edge, options = {}) {
  const count = options.count || 8;
  const speed = options.speed || 0.02;
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() - 0.5) * Math.PI * 0.2; // ±18° dispersión
    const velocity = speed * (0.8 + Math.random() * 0.4); // variación de velocidad
    
    particles.push({
      id: `fault-${edge.id}-${Date.now()}-${i}`,
      edgeId: edge.id,
      x: edge.x1 || 0,
      y: edge.y1 || 0,
      vx: Math.cos(angle) * velocity * (edge.x2 - edge.x1 || 100),
      vy: Math.sin(angle) * velocity * (edge.y2 - edge.y1 || 0),
      life: 30 + Math.random() * 20, // 30-50 frames
      maxLife: 50,
      color: options.color || '#00e5ff',
      size: 3 + Math.random() * 3,
      type: 'fault',
      intensity: options.intensity || 1.0,
      glow: true
    });
  }
}

// === EFECTO DE EXPLOSIÓN (BREAKER TRIP) ===
export function spawnExplosionParticles(particles, position, options = {}) {
  const count = options.count || 20;
  const colors = ['#ff3b30', '#ffcc00', '#ffffff'];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const speed = 0.05 + Math.random() * 0.1;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particles.push({
      id: `explosion-${Date.now()}-${i}`,
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      color,
      size: 2 + Math.random() * 4,
      type: 'explosion',
      gravity: 0.002,
      fade: true
    });
  }
}

// === VERIFICACIÓN DE DISPARO DE BREAKER ===
export function checkBreakerTrip(edge, simulation) {
  if (!edge.breakerId) return false;
  
  const breaker = simulation.breakers[edge.breakerId];
  if (!breaker || breaker.status === 'tripped') return false;
  
  const current = edge.current || 0;
  const trip = edge.breakerTrip || 1000;
  
  if (current > trip) {
    breaker.status = 'tripped';
    breaker.tripTime = performance.now();
    return true;
  }
  
  return false;
}

// === ACTUALIZACIÓN DE PARTÍCULAS ===
export function updateParticles(particles, deltaTime = 0.016) {
  return particles.filter(particle => {
    particle.life--;
    
    if (particle.life <= 0) return false;
    
    // Movimiento
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Gravedad para explosiones
    if (particle.gravity) {
      particle.vy += particle.gravity;
    }
    
    // Desvanecimiento
    if (particle.fade) {
      particle.opacity = particle.life / particle.maxLife;
    }
    
    return true;
  });
}

// === RENDER DE EFECTOS DE FALLA ===
export function drawFaultEffect(ctx, edge, faultLevel, faultIntensity = 1.0) {
  ctx.save();
  
  const intensity = faultLevel * faultIntensity;
  
  // Línea principal con glow
  ctx.strokeStyle = `rgba(0, 255, 255, ${intensity})`;
  ctx.lineWidth = 4 + intensity * 6;
  
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20 * intensity;
  
  ctx.beginPath();
  ctx.moveTo(edge.x1 || 0, edge.y1 || 0);
  ctx.lineTo(edge.x2 || 100, edge.y2 || 100);
  ctx.stroke();
  
  // Pulsación
  const pulse = Math.sin(performance.now() * 0.01) * 0.3 + 0.7;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * pulse * 0.5})`;
  ctx.lineWidth = 2 + intensity * 3;
  ctx.stroke();
  
  ctx.restore();
}

// === RENDER DE PARTÍCULAS ===
export function drawParticles(ctx, particles) {
  particles.forEach(particle => {
    ctx.save();
    
    const opacity = particle.opacity || (particle.life / particle.maxLife);
    
    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;
    
    // Glow para partículas de falla
    if (particle.glow) {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10 * particle.intensity;
    }
    
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
}

// === LOOP PRINCIPAL DE SIMULACIÓN ===
export function createFaultSimulationLoop(canvas, graph, results, simulation) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  let faultWave = null;
  
  const loop = () => {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Propagar falla si está activa
    let affectedEdges = [];
    if (faultWave && faultWave.active) {
      affectedEdges = faultWave.propagate(graph, 0.016);
    }
    
    // Actualizar edges con efectos de falla
    const updatedEdges = graph.edges.map(edge => {
      let updatedEdge = { ...edge };
      
      // Aplicar efectos de falla
      const faultEdge = affectedEdges.find(f => 
        (f.source === edge.source && f.target === edge.target) ||
        (f.id === edge.id)
      );
      
      if (faultEdge) {
        updatedEdge = applyFaultCurrent(
          updatedEdge, 
          updatedEdge.current || 100, 
          faultEdge.faultIntensity
        );
        
        // Generar partículas de falla
        if (Math.random() < 0.3) { // 30% chance por frame
          spawnFaultParticles(particles, updatedEdge, {
            intensity: faultEdge.faultIntensity
          });
        }
        
        // Verificar disparo de breaker
        if (checkBreakerTrip(updatedEdge, simulation)) {
          spawnExplosionParticles(particles, {
            x: (updatedEdge.x1 || 0 + updatedEdge.x2 || 100) / 2,
            y: (updatedEdge.y1 || 0 + updatedEdge.y2 || 100) / 2
          });
          
          // Detener propagación
          if (faultWave) faultWave.stop();
        }
      }
      
      // Renderizar edge
      if (updatedEdge.isFault) {
        drawFaultEffect(ctx, updatedEdge, 1, updatedEdge.faultIntensity || 1);
      } else {
        // Render normal del edge
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(updatedEdge.x1 || 0, updatedEdge.y1 || 0);
        ctx.lineTo(updatedEdge.x2 || 100, updatedEdge.y2 || 100);
        ctx.stroke();
      }
      
      return updatedEdge;
    });
    
    // Actualizar y renderizar partículas
    const aliveParticles = updateParticles(particles);
    drawParticles(ctx, aliveParticles);
    
    requestAnimationFrame(loop);
  };
  
  return {
    start: () => loop(),
    triggerFault: (nodeId, options = {}) => {
      faultWave = new FaultWave(nodeId, options);
    },
    stopFault: () => {
      if (faultWave) faultWave.stop();
    },
    clearFault: () => {
      faultWave = null;
      particles.length = 0; // Limpiar partículas
    }
  };
}

export default {
  FaultWave,
  applyFaultCurrent,
  spawnFaultParticles,
  spawnExplosionParticles,
  checkBreakerTrip,
  updateParticles,
  drawFaultEffect,
  drawParticles,
  createFaultSimulationLoop
};
