/**
 * components/particles/ParticleSystem.js
 * Motor de partículas para animación de corriente eléctrica
 * Gestiona creación, actualización y eliminación de partículas
 */

import { Particle } from './Particle.js';
import { isUpstreamOfBreaker } from './PathUtils.js';

export class ParticleSystem {
  /**
   * @param {Object} options - Opciones de configuración
   */
  constructor(options = {}) {
    this.particles = [];
    this.maxParticles = options.maxParticles || 500;
    this.defaultSpeed = options.defaultSpeed || 0.5;
    this.spawnRate = options.spawnRate || 1; // partículas por segundo
    this.lastSpawnTime = 0;
    this.activeFaults = new Map(); // faultId -> fault data
    this.trippedBreakers = new Set();
    this.globalOptions = {
      trailLength: options.trailLength || 5,
      turbulence: options.turbulence || 0,
      lifespan: options.lifespan || 5000
    };
  }

  /**
   * Generar partícula para un camino específico
   * @param {Array} path - Array de puntos [{x, y}]
   * @param {number} Icc - Corriente de cortocircuito
   * @param {Object} options - Opciones específicas para esta partícula
   * @returns {Particle|null} Partícula creada o null si no se pudo
   */
  spawn(path, Icc, options = {}) {
    if (this.particles.length >= this.maxParticles) {
      // Eliminar partículas más antiguas
      this.cleanupOldParticles();
    }

    if (path.length < 2) {
      return null;
    }

    // Calcular velocidad basada en corriente
    const speed = this.calculateSpeed(Icc);

    // Combinar opciones globales con específicas
    const particleOptions = {
      ...this.globalOptions,
      ...options,
      trailLength: options.trailLength || this.globalOptions.trailLength,
      turbulence: options.turbulence || this.globalOptions.turbulence,
      lifespan: options.lifespan || this.globalOptions.lifespan
    };

    const particle = new Particle(path, speed, Icc, particleOptions);
    this.particles.push(particle);

    return particle;
  }

  /**
   * Calcular velocidad de partícula basada en corriente
   * @param {number} Icc - Corriente de falla
   * @returns {number} Velocidad (0-1)
   */
  calculateSpeed(Icc) {
    // Velocidad proporcional al logaritmo de la corriente
    const baseSpeed = 0.3;
    const currentFactor = Math.log10(Math.max(1, Icc)) * 0.24;
    const speed = baseSpeed + currentFactor;
    return Math.min(1.5, speed);
  }

  /**
   * Actualizar todas las partículas
   * @param {number} dt - Delta time en segundos
   */
  update(dt) {
    // Actualizar partículas existentes
    this.particles.forEach(particle => {
      particle.update(dt);
      particle.cleanupTrail();
    });

    // Eliminar partículas muertas
    this.particles = this.particles.filter(p => p.isAlive());

    // Actualizar partículas afectadas por breakers disparados
    this.updateTrippedParticles();
  }

  /**
   * Actualizar partículas cuando un breaker dispara
   * @param {string} breakerId - ID del breaker que disparó
   * @param {Object} graph - Grafo del sistema
   */
  handleBreakerTrip(breakerId, graph) {
    this.trippedBreakers.add(breakerId);

    // Afectar partículas aguas arriba del breaker
    this.particles.forEach(particle => {
      if (isUpstreamOfBreaker(particle, breakerId, graph)) {
        particle.setTripped(true);
      }
    });
  }

  /**
   * Actualizar partículas que han sido afectadas por disparos
   */
  updateTrippedParticles() {
    // Partículas disparadas eventualmente mueren
    this.particles.forEach(particle => {
      if (particle.tripped && particle.speed < 0.1) {
        particle.alive = false;
      }
    });
  }

  /**
   * Emitir partículas para una falla específica
   * @param {Object} graph - Grafo del sistema
   * @param {string} nodeId - ID del nodo de falla
   * @param {number} Icc - Corriente de falla
   * @param {string} faultId - ID único de la falla
   */
  emitFaultParticles(graph, nodeId, Icc, faultId) {
    // Guardar información de la falla
    this.activeFaults.set(faultId, {
      nodeId,
      Icc,
      startTime: Date.now(),
      graph
    });

    // Obtener ruta aguas arriba
    const path = this.getUpstreamPath(graph, nodeId);

    // Generar partículas para cada edge en la ruta
    path.forEach(edge => {
      const edgePath = this.edgeToPath(edge, graph.nodes);

      if (edgePath.length < 2) return;

      // Cantidad de partículas proporcional a la corriente
      const count = Math.min(20, Math.max(1, Math.floor(Icc / 2000)));

      // Generar partículas con retraso para flujo continuo
      for (let i = 0; i < count; i++) {
        const delay = i * 100; // 100ms entre partículas
        setTimeout(() => {
          this.spawn(edgePath, Icc, {
            color: this.getFaultColor(Icc),
            trailLength: 8,
            turbulence: Icc > 5000 ? 2 : 0
          });
        }, delay);
      }
    });
  }

  /**
   * Obtener ruta aguas arriba
   * @param {Object} graph - Grafo del sistema
   * @param {string} startNodeId - ID del nodo inicial
   * @returns {Array} Ruta de edges
   */
  getUpstreamPath(graph, startNodeId) {
    const path = [];
    let current = startNodeId;
    const visited = new Set();
    let shouldContinue = true;

    while (shouldContinue) {
      const edge = graph.edges?.find(e => e.target === current);
      if (!edge) {
        shouldContinue = false;
        break;
      }

      if (visited.has(edge.source)) {
        shouldContinue = false;
        break;
      }
      visited.add(edge.source);

      path.push(edge);
      current = edge.source;

      if (path.length > 50) {
        shouldContinue = false;
        break;
      }
    }

    return path;
  }

  /**
   * Convertir edge a camino de partículas
   * @param {Object} edge - Edge del grafo
   * @param {Array} nodes - Array de nodos
   * @returns {Array} Camino de puntos
   */
  edgeToPath(edge, nodes) {
    const from = nodes.find(n => n.id === edge.source);
    const to = nodes.find(n => n.id === edge.target);

    if (!from || !to) return [];

    const fromPos = from.position || { x: 0, y: 0 };
    const toPos = to.position || { x: 0, y: 0 };

    return [
      { x: fromPos.x, y: fromPos.y },
      { x: toPos.x, y: toPos.y }
    ];
  }

  /**
   * Obtener color para falla basado en intensidad
   * @param {number} Icc - Corriente de falla
   * @returns {string} Color RGBA
   */
  getFaultColor(Icc) {
    if (Icc > 10000) return 'rgba(255, 255, 0, 0.9)'; // Amarillo brillante
    if (Icc > 5000) return 'rgba(255, 150, 0, 0.8)'; // Naranja
    if (Icc > 2000) return 'rgba(255, 80, 0, 0.8)'; // Naranja-rojo
    return 'rgba(255, 50, 50, 0.7)'; // Rojo
  }

  /**
   * Limpiar partículas antiguas
   */
  cleanupOldParticles() {
    // Ordenar por tiempo de creación y mantener las más nuevas
    this.particles.sort((a, b) => b.createdAt - a.createdAt);
    this.particles = this.particles.slice(0, this.maxParticles * 0.8);
  }

  /**
   * Limpiar todas las partículas
   */
  clearAll() {
    this.particles = [];
    this.activeFaults.clear();
    this.trippedBreakers.clear();
  }

  /**
   * Eliminar partículas de una falla específica
   * @param {string} faultId - ID de la falla
   */
  clearFault(faultId) {
    if (this.activeFaults.has(faultId)) {
      this.activeFaults.delete(faultId);
    }
  }

  /**
   * Calcular número de partículas basado en corriente
   * @param {number} current - Corriente en amperes
   * @returns {number} Número de partículas
   */
  calculateParticleCount(current) {
    if (current <= 0) return 3; // mínimo de partículas

    const baseCount = 5;
    const logCurrent = Math.log10(current);
    const count = baseCount + logCurrent * 2;

    return Math.min(30, Math.max(3, Math.floor(count)));
  }

  /**
   * Obtener estadísticas del sistema
   * @returns {Object} Estadísticas actuales
   */
  getStats() {
    return {
      totalParticles: this.particles.length,
      activeFaults: this.activeFaults.size,
      trippedBreakers: this.trippedBreakers.size,
      maxParticles: this.maxParticles,
      memoryUsage: this.particles.length * 200 // Estimación en bytes
    };
  }

  /**
   * Verificar si el sistema está activo
   * @returns {boolean} True si hay partículas activas
   */
  isActive() {
    return this.particles.length > 0 || this.activeFaults.size > 0;
  }

  /**
   * Obtener partículas por edge
   * @param {string} _edgeId - ID del edge
   * @returns {Array} Partículas en ese edge
   */
  getParticlesByEdge() {
    // Esto requeriría tracking adicional de partículas por edge
    // Por ahora, retornar todas las partículas
    return this.particles;
  }

  /**
   * Pausar/reanudar sistema
   * @param {boolean} paused - Estado de pausa
   */
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.particles.forEach(p => {
        p.speed = 0;
      });
    } else {
      this.particles.forEach(p => {
        if (!p.tripped) {
          p.speed = this.calculateSpeed(p.intensity);
        }
      });
    }
  }
}
