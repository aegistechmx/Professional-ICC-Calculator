/**
 * components/particles/BreakerEffects.js
 * Efectos visuales para disparo de breakers con integración TCC
 * Maneja la interrupción visual de partículas cuando un breaker dispara
 */

/* eslint-disable no-console */
import { TCCEngine } from '../../utils/tccEngine.js';

export class BreakerEffects {
  /**
   * @param {ParticleSystem} particleSystem - Sistema de partículas
   * @param {Object} options - Opciones de configuración
   */
  constructor(particleSystem, options = {}) {
    this.particleSystem = particleSystem;
    this.trippedBreakers = new Map(); // breakerId -> trip data
    this.activeEffects = new Map(); // breakerId -> effect data
    this.options = {
      tripEffectDuration: options.tripEffectDuration || 2000, // ms
      particleKillRadius: options.particleKillRadius || 50,
      visualEffectIntensity: options.visualEffectIntensity || 1.0,
      ...options
    };
  }

  /**
   * Manejar disparo de breaker con evaluación TCC
   * @param {string} breakerId - ID del breaker
   * @param {Object} breakerData - Datos del breaker
   * @param {Object} graph - Grafo del sistema
   * @param {number} faultCurrent - Corriente de falla para evaluación TCC
   */
  handleBreakerTrip(breakerId, breakerData, graph, faultCurrent) {
    const tripTime = Date.now();

    // Evaluación TCC del disparo
    let tccEvaluation = null;
    if (breakerData.ratings && faultCurrent) {
      tccEvaluation = TCCEngine.evaluateTrip(breakerData, faultCurrent);
    }

    // Guardar información del disparo con evaluación TCC
    this.trippedBreakers.set(breakerId, {
      id: breakerId,
      tripTime,
      data: breakerData,
      graph,
      faultCurrent,
      tccEvaluation,
      tripZone: tccEvaluation?.zone || 'UNKNOWN'
    });

    // Iniciar efectos visuales con información TCC
    this.startTripEffects(breakerId, breakerData, tccEvaluation);

    // Afectar partículas existentes según evaluación TCC
    this.affectUpstreamParticles(breakerId, graph, tccEvaluation);

    // Programar limpieza de efectos
    this.scheduleEffectCleanup(breakerId);
  }

  /**
   * Afectar partículas aguas arriba del breaker con evaluación TCC
   * @param {string} breakerId - ID del breaker
   * @param {Object} graph - Grafo del sistema
   * @param {Object} tccEvaluation - Evaluación TCC del disparo
   */
  affectUpstreamParticles(breakerId, graph, tccEvaluation) {
    const breakerNode = graph.nodes.find(n => n.id === breakerId);
    if (!breakerNode) return;

    // Filtrar y afectar partículas según evaluación TCC
    this.particleSystem.particles.forEach(particle => {
      if (this.isParticleUpstream(particle, breakerId, graph)) {
        // Cambiar color según zona TCC
        if (tccEvaluation) {
          particle.setTripZone(tccEvaluation.zone);

          // Ajustar efectos según tipo de disparo
          switch (tccEvaluation.zone) {
            case 'INST':
              // Instantáneo: efecto más drástico
              particle.speed *= 0.05;
              particle.lifespan = Math.min(particle.lifespan, 500);
              particle.setTripped(true);
              break;
            case 'ST':
              // Short Time: efecto moderado
              particle.speed *= 0.1;
              particle.lifespan = Math.min(particle.lifespan, 1000);
              particle.setTripped(true);
              break;
            case 'LT':
              // Long Time: efecto suave
              particle.speed *= 0.2;
              particle.lifespan = Math.min(particle.lifespan, 1500);
              particle.setTripped(true);
              break;
            default:
              // Comportamiento por defecto
              particle.setTripped(true);
              particle.speed *= 0.1;
              particle.lifespan = Math.min(particle.lifespan, 1000);
          }
        } else {
          // Comportamiento original sin evaluación TCC
          particle.setTripped(true);
          particle.speed *= 0.1;
          particle.lifespan = Math.min(particle.lifespan, 1000);
        }
      }
    });
  }

  /**
   * Verificar si partícula está aguas arriba del breaker
   * @param {Object} particle - Partícula
   * @param {string} breakerId - ID del breaker
   * @param {Object} graph - Grafo del sistema
   * @returns {boolean} True si está aguas arriba
   */
  isParticleUpstream(particle, breakerId, graph) {
    const breakerNode = graph.nodes.find(n => n.id === breakerId);
    if (!breakerNode) return false;

    const breakerPos = breakerNode.position || { x: 0, y: 0 };
    const particlePos = particle.getPosition();

    // Calcular distancia a la fuente (0,0) y al breaker
    const distToSource = Math.sqrt(particlePos.x * particlePos.x + particlePos.y * particlePos.y);
    const distToBreaker = Math.sqrt(
      Math.pow(particlePos.x - breakerPos.x, 2) +
      Math.pow(particlePos.y - breakerPos.y, 2)
    );

    // Si está más cerca de la fuente que del breaker, está aguas arriba
    return distToSource < distToBreaker;
  }

  /**
   * Iniciar efectos visuales de disparo con información TCC
   * @param {string} breakerId - ID del breaker
   * @param {Object} breakerData - Datos del breaker
   * @param {Object} tccEvaluation - Evaluación TCC del disparo
   */
  startTripEffects(breakerId, breakerData, tccEvaluation) {
    const effectData = {
      breakerId,
      startTime: Date.now(),
      duration: this.options.tripEffectDuration,
      intensity: this.options.visualEffectIntensity,
      phase: 'initial', // initial, active, fading
      tccZone: tccEvaluation?.zone || 'UNKNOWN',
      tripTime: tccEvaluation?.time || 0,
      multiplier: tccEvaluation?.multiplier || 1
    };

    // Ajustar duración e intensidad según zona TCC
    if (tccEvaluation) {
      switch (tccEvaluation.zone) {
        case 'INST':
          effectData.duration *= 0.5; // Más corto para instantáneo
          effectData.intensity *= 1.5; // Más intenso
          break;
        case 'ST':
          effectData.duration *= 0.8; // Corto para short time
          effectData.intensity *= 1.2; // Moderadamente intenso
          break;
        case 'LT':
          effectData.duration *= 1.2; // Más largo para long time
          effectData.intensity *= 0.8; // Menos intenso
          break;
      }
    }

    this.activeEffects.set(breakerId, effectData);

    // Iniciar animación de efecto
    this.animateTripEffect(breakerId, effectData);
  }

  /**
   * Animar efecto de disparo
   * @param {string} breakerId - ID del breaker
   * @param {Object} effectData - Datos del efecto
   */
  animateTripEffect(breakerId, effectData) {
    const animate = () => {
      const elapsed = Date.now() - effectData.startTime;
      const progress = elapsed / effectData.duration;

      if (progress >= 1) {
        // Efecto completado
        this.activeEffects.delete(breakerId);
        return;
      }

      // Actualizar fase del efecto
      if (progress < 0.2) {
        effectData.phase = 'initial';
      } else if (progress < 0.7) {
        effectData.phase = 'active';
      } else {
        effectData.phase = 'fading';
      }

      // Continuar animación
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * Programar limpieza de efectos
   * @param {string} breakerId - ID del breaker
   */
  scheduleEffectCleanup(breakerId) {
    setTimeout(() => {
      this.activeEffects.delete(breakerId);
    }, this.options.tripEffectDuration);
  }

  /**
   * Renderizar efectos de breaker en canvas
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} breakerNodes - Nodos de breakers con posiciones
   */
  renderEffects(ctx, breakerNodes) {
    this.activeEffects.forEach((effect, breakerId) => {
      const breakerNode = breakerNodes.find(n => n.id === breakerId);
      if (!breakerNode) return;

      const pos = breakerNode.position || { x: 0, y: 0 };
      this.renderBreakerEffect(ctx, pos, effect);
    });
  }

  /**
   * Renderizar efecto individual de breaker
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} position - Posición {x, y}
   * @param {Object} effect - Datos del efecto
   */
  renderBreakerEffect(ctx, position, effect) {
    const elapsed = Date.now() - effect.startTime;
    const progress = elapsed / effect.duration;

    ctx.save();

    switch (effect.phase) {
      case 'initial':
        this.renderInitialEffect(ctx, position, progress);
        break;
      case 'active':
        this.renderActiveEffect(ctx, position, progress);
        break;
      case 'fading':
        this.renderFadingEffect(ctx, position, progress);
        break;
    }

    ctx.restore();
  }

  /**
   * Renderizar efecto inicial (explosión)
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} position - Posición
   * @param {number} progress - Progreso (0-1)
   */
  renderInitialEffect(ctx, position, progress) {
    const radius = 20 * progress;
    const opacity = 1 - progress;

    ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Renderizar efecto activo (pulsación)
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} position - Posición
   * @param {number} progress - Progreso (0-1)
   */
  renderActiveEffect(ctx, position, progress) {
    const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
    const radius = 15 * pulseScale;

    // Círculo principal
    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Anillo exterior
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Renderizar efecto de desvanecimiento
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {Object} position - Posición
   * @param {number} progress - Progreso (0-1)
   */
  renderFadingEffect(ctx, position, progress) {
    const opacity = 1 - progress;
    const radius = 10 + progress * 10;

    ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.3})`;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Generar partículas de celebración para disparo exitoso
   * @param {string} breakerId - ID del breaker
   * @param {Object} breakerNode - Nodo del breaker
   * @param {number} tripTime - Tiempo de disparo
   */
  generateCelebrationParticles(breakerId, breakerNode) {
    const pos = breakerNode.position || { x: 0, y: 0 };
    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;

      // Crear camino radial desde el breaker
      const path = [
        { x: pos.x, y: pos.y },
        {
          x: pos.x + Math.cos(angle) * 50,
          y: pos.y + Math.sin(angle) * 50
        }
      ];

      this.particleSystem.spawn(path, 100, {
        color: 'rgba(59, 130, 246, 0.8)',
        trailLength: 3,
        lifespan: 1000
      });
    }
  }

  /**
   * Limpiar todos los efectos
   */
  clearAllEffects() {
    this.trippedBreakers.clear();
    this.activeEffects.clear();
  }

  /**
   * Obtener estadísticas de efectos
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      trippedBreakers: this.trippedBreakers.size,
      activeEffects: this.activeEffects.size,
      affectedParticles: this.particleSystem.particles.filter(p => p.tripped).length
    };
  }

  /**
   * Actualizar opciones de efectos
   * @param {Object} newOptions - Nuevas opciones
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}
