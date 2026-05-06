/**
 * components/particles/FaultParticleEngine.js
 * Motor principal que integra sistema de partículas con fallas eléctricas
 * Conecta emisión de partículas con eventos de falla y disparo de breakers
 */

/* eslint-disable no-console */
import { ParticleSystem } from './ParticleSystem.js';
import { ParticleRenderer } from './ParticleRenderer.js';
import { getUpstreamPath, edgeToPath } from './PathUtils.js';
import { TCCEngine } from '../../utils/tccEngine.js';

export class FaultParticleEngine {
  /**
   * @param {HTMLCanvasElement} canvas - Elemento canvas para renderizado
   * @param {Object} options - Opciones de configuración
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(options.particleSystem);
    this.renderer = new ParticleRenderer(canvas, options.renderer);

    this.isRunning = false;
    this.lastTime = 0;
    this.activeFaults = new Map();
    this.trippedBreakers = new Set();

    // Configuración de animación
    this.animationId = null;
    this.targetFPS = options.targetFPS || 60;
    this.frameInterval = 1000 / this.targetFPS;

    // Callbacks para eventos
    this.onFaultStart = options.onFaultStart || (() => { });
    this.onBreakerTrip = options.onBreakerTrip || (() => { });
    this.onFaultEnd = options.onFaultEnd || (() => { });
  }

  /**
   * Iniciar el motor de partículas
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  /**
   * Detener el motor de partículas
   */
  stop() {
    this.isRunning = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Loop de animación principal
   */
  animate() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Limitar dt
    this.lastTime = now;

    // Actualizar sistema de partículas
    this.particleSystem.update(dt);

    // Renderizar
    this.render();

    // Continuar animación
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Renderizar frame actual
   */
  render() {
    const particles = this.particleSystem.particles;
    const stats = this.particleSystem.getStats();

    // Renderizar partículas
    this.renderer.render(particles);

    // Renderizar efectos de breakers disparados
    if (this.trippedBreakers.size > 0) {
      const breakerPositions = this.getBreakerPositions();
      this.renderer.renderBreakerEffects(breakerPositions);
    }

    // Renderizar info de depuración si está habilitado
    this.renderer.renderDebugInfo(stats);
  }

  /**
   * Emitir partículas para una falla específica con evaluación TCC
   * @param {Object} graph - Grafo del sistema eléctrico
   * @param {string} nodeId - ID del nodo donde ocurre la falla
   * @param {number} Icc - Corriente de cortocircuito
   * @param {Object} options - Opciones adicionales
   * @returns {string} ID único de la falla
   */
  emitFaultParticles(graph, nodeId, Icc, options = {}) {
    const faultId = `fault_${Date.now()}_${nodeId}`;

    // Guardar información de la falla
    this.activeFaults.set(faultId, {
      nodeId,
      Icc,
      startTime: Date.now(),
      graph,
      options
    });

    // Obtener ruta aguas arriba
    const upstreamPath = getUpstreamPath(graph, nodeId);

    if (upstreamPath.length === 0) {
      console.warn(`No upstream path found for node ${nodeId}`);
      return faultId;
    }

    // Evaluar disparos de breakers con TCC
    this.evaluateBreakerTrips(upstreamPath, graph, Icc);

    // Emitir partículas para cada edge en la ruta
    upstreamPath.forEach((edge, index) => {
      const edgePath = edgeToPath(edge, graph.nodes, {
        intermediatePoints: options.curved ? 10 : 2
      });

      if (edgePath.length < 2) return;

      // Calcular retraso basado en distancia de la falla
      const delay = index * 100; // 100ms por edge

      setTimeout(() => {
        this.emitParticlesForEdge(edgePath, Icc, edge.id, options);
      }, delay);
    });

    // Disparar callback
    this.onFaultStart(faultId, nodeId, Icc);

    return faultId;
  }

  /**
   * Emitir partículas para un edge específico
   * @param {Array} path - Camino de puntos
   * @param {number} Icc - Corriente de falla
   * @param {string} edgeId - ID del edge
   * @param {Object} options - Opciones adicionales
   */
  emitParticlesForEdge(path, Icc, edgeId, options = {}) {
    // Calcular cantidad de partículas basada en corriente
    const particleCount = this.calculateParticleCount(Icc);

    // Generar partículas con espaciado temporal
    const spawnInterval = Math.max(50, 1000 / (Icc / 1000)); // Más partículas para mayor corriente

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        this.particleSystem.spawn(path, Icc, {
          color: this.getParticleColor(Icc),
          trailLength: Icc > 5000 ? 8 : 5,
          turbulence: Icc > 10000 ? 2 : Icc > 5000 ? 1 : 0,
          lifespan: options.lifespan || 3000
        });
      }, i * spawnInterval);
    }
  }

  /**
   * Evaluar disparos de breakers con TCC
   * @param {Array} upstreamPath - Ruta aguas arriba
   * @param {Object} graph - Grafo del sistema
   * @param {number} Icc - Corriente de falla
   */
  evaluateBreakerTrips(upstreamPath, graph, Icc) {
    upstreamPath.forEach((edge, index) => {
      const breakerNode = graph.nodes.find(n => n.id === edge.source);

      if (breakerNode && breakerNode.type === 'breaker' && breakerNode.data?.ratings) {
        // Evaluar disparo con TCC
        const tccEvaluation = TCCEngine.evaluateTrip(breakerNode.data, Icc);

        if (tccEvaluation.trip) {
          // Calcular tiempo de disparo real
          const tripDelay = index * 100 + tccEvaluation.time * 1000; // Convertir a ms

          // Programar disparo
          setTimeout(() => {
            this.handleBreakerTrip(breakerNode.id, breakerNode.data, graph, Icc, tccEvaluation);
          }, tripDelay);
        }
      }
    });
  }

  /**
   * Manejar disparo de breaker
   * @param {string} breakerId - ID del breaker
   * @param {Object} breakerData - Datos del breaker
   * @param {Object} graph - Grafo del sistema
   * @param {number} faultCurrent - Corriente de falla
   * @param {Object} tccEvaluation - Evaluación TCC
   */
  handleBreakerTrip(breakerId, breakerData, graph, faultCurrent, tccEvaluation) {
    // Agregar a lista de breakers disparados
    this.trippedBreakers.add(breakerId);

    // Disparar callback
    this.onBreakerTrip(breakerId);

    // Si hay breaker effects, manejar el disparo
    if (this.breakerEffects) {
      this.breakerEffects.handleBreakerTrip(breakerId, breakerData, graph, faultCurrent);
    }
  }

  /**
   * Calcular cantidad de partículas basada en corriente
   * @param {number} Icc - Corriente de falla
   * @returns {number} Cantidad de partículas
   */
  calculateParticleCount(Icc) {
    // Fórmula: log10(Icc) * factor + base
    const base = 5;
    const factor = Math.log10(Math.max(1, Icc)) * 2;
    return Math.min(30, Math.max(3, base + factor));
  }

  /**
   * Obtener color de partícula basado en corriente
   * @param {number} Icc - Corriente de falla
   * @returns {string} Color RGBA
   */
  getParticleColor(Icc) {
    if (Icc > 15000) return 'rgba(255, 255, 100, 0.9)'; // Amarillo brillante
    if (Icc > 10000) return 'rgba(255, 200, 0, 0.8)'; // Amarillo
    if (Icc > 5000) return 'rgba(255, 150, 0, 0.8)'; // Naranja
    if (Icc > 2000) return 'rgba(255, 80, 0, 0.8)'; // Naranja-rojo
    return 'rgba(255, 50, 50, 0.7)'; // Rojo
  }

  /**
   * Manejar disparo de breaker legacy (compatibilidad)
   * @param {string} breakerId - ID del breaker que disparó
   * @param {Object} graph - Grafo del sistema
   */
  handleBreakerTripLegacy(breakerId, graph) {
    this.trippedBreakers.add(breakerId);

    // Afectar partículas existentes
    this.particleSystem.handleBreakerTrip(breakerId, graph);

    // Disparar callback
    this.onBreakerTrip(breakerId);
  }

  /**
   * Finalizar falla específica
   * @param {string} faultId - ID de la falla
   */
  endFault(faultId) {
    if (this.activeFaults.has(faultId)) {
      const fault = this.activeFaults.get(faultId);
      this.particleSystem.clearFault(faultId);
      this.activeFaults.delete(faultId);

      // Disparar callback
      this.onFaultEnd(faultId);
    }
  }

  /**
   * Limpiar todas las partículas y fallas
   */
  clearAll() {
    this.particleSystem.clearAll();
    this.activeFaults.clear();
    this.trippedBreakers.clear();
  }

  /**
   * Obtener posiciones de breakers disparados
   * @returns {Array} Array de posiciones {x, y}
   */
  getBreakerPositions() {
    const positions = [];

    // Esto requeriría acceso al grafo actual
    // Por ahora, retornar array vacío
    return positions;
  }

  /**
   * Obtener estadísticas del motor
   * @returns {Object} Estadísticas completas
   */
  getStats() {
    const particleStats = this.particleSystem.getStats();

    return {
      ...particleStats,
      activeFaults: this.activeFaults.size,
      trippedBreakers: this.trippedBreakers.size,
      isRunning: this.isRunning,
      targetFPS: this.targetFPS
    };
  }

  /**
   * Actualizar opciones del motor
   * @param {Object} newOptions - Nuevas opciones
   */
  updateOptions(newOptions) {
    if (newOptions.particleSystem) {
      // Actualizar opciones del sistema de partículas
      Object.assign(this.particleSystem.globalOptions, newOptions.particleSystem);
    }

    if (newOptions.renderer) {
      this.renderer.updateOptions(newOptions.renderer);
    }

    if (newOptions.targetFPS) {
      this.targetFPS = newOptions.targetFPS;
      this.frameInterval = 1000 / this.targetFPS;
    }
  }

  /**
   * Pausar/reanudar animación
   * @param {boolean} paused - Estado de pausa
   */
  setPaused(paused) {
    if (paused) {
      this.stop();
    } else {
      this.start();
    }

    this.particleSystem.setPaused(paused);
  }

  /**
   * Exportar frame actual como imagen
   * @param {string} format - Formato de imagen
   * @param {number} quality - Calidad
   * @returns {string} Data URL de la imagen
   */
  exportFrame(format = 'png', quality = 0.9) {
    return this.renderer.exportImage(format, quality);
  }

  /**
   * Destruir motor y liberar recursos
   */
  destroy() {
    this.stop();
    this.clearAll();
    this.renderer.destroy();
  }
}
