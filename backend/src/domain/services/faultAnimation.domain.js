/**
 * backend/src/domain/services/faultAnimation.domain.js
 * Sistema de Animación de Fallas - Propagación y Disparo
 * Nivel ETAP - Simulación visual de eventos
 */

class FaultAnimationEngine {
  constructor() {
    this.activeAnimations = new Map();
    this.animationSpeed = 300; // ms por segmento
    this.faultCounter = 0; // Contador para IDs únicos
  }

  /**
   * Crear evento de falla
   * @param {string} nodeId - ID del nodo donde ocurre la falla
   * @param {number} Icc - Corriente de cortocircuito
   * @returns {Object} Evento de falla
   */
  createFaultEvent(nodeId, Icc) {
    // Generar ID único usando contador incremental
    this.faultCounter++;
    const uniqueId = `fault_${this.faultCounter}_${nodeId}`;

    return {
      id: uniqueId,
      nodeId,
      Icc,
      time: 0,
      path: [],
      active: true,
      startTime: Date.now(),
      status: 'ACTIVE'
    };
  }

  /**
   * Encontrar ruta de propagación aguas arriba
   * @param {Object} graph - Grafo del sistema {nodes, edges}
   * @param {string} startNodeId - Nodo inicial
   * @returns {Array} Ruta de edges hacia la fuente
   */
  getUpstreamPath(graph, startNodeId) {
    const path = [];
    let current = startNodeId; // current (A)
    const visited = new Set();

    while (true) {
      // Encontrar edge que termina en el nodo actual
      const edge = graph.edges.find(e => e.target === current); // current (A)

      if (!edge) break;

      // Evitar ciclos
      if (visited.has(edge.source)) break;
      visited.add(edge.source);

      path.push(edge);
      current = edge.source; // current (A)

      // Límite de seguridad
      if (path.length > 50) break;
    }

    return path;
  }

  /**
   * Calcular tiempos de disparo para breakers
   * @param {Array} breakers - Lista de breakers en ruta
   * @param {number} Icc - Corriente de falla
   * @returns {Array} Breakers con tiempos de disparo
   */
  calculateTripTimes(breakers, Icc) {
    return breakers.map(breaker => {
      const tripTime = this.calculateTripTime(breaker, Icc);

      return {
        id: breaker.id,
        rating: breaker.rating,
        tripTime,
        willTrip: tripTime !== Infinity,
        position: breaker.position || 'unknown'
      };
    }).sort((a, b) => a.tripTime - b.tripTime);
  }

  /**
   * Calcular tiempo de disparo individual
   * @param {Object} breaker - Modelo de breaker
   * @param {number} Icc - Corriente de falla
   * @returns {number} Tiempo de disparo (segundos)
   */
  calculateTripTime(breaker, Icc) {
    // Instantáneo
    if (breaker.instantaneous && Icc >= breaker.instantaneous.min) {
      return breaker.instantaneous.t || 0.02;
    }

    // Curva TCC (simplificada)
    if (breaker.curve) {
      const t = this.interpolateCurve(breaker.curve, Icc);
      return t !== null ? t : Infinity;
    }

    // Fórmula típica si no hay curva
    const pickup = breaker.pickup || breaker.rating;
    if (Icc <= pickup) return Infinity;

    // Curva inversa típica
    return 10 / Math.pow(Icc / pickup - 1, 2);
  }

  /**
   * Interpolar curva TCC
   */
  interpolateCurve(curve, I) {
    for (let i = 0; i < curve.length - 1; i++) {
      const p1 = curve[i];
      const p2 = curve[i + 1];

      if (I >= p1.I && I <= p2.I) {
        const logI = Math.log10(I);
        const logI1 = Math.log10(p1.I);
        const logI2 = Math.log10(p2.I);
        const logT1 = Math.log10(p1.t);
        const logT2 = Math.log10(p2.t);

        const logT = logT1 + ((logI - logI1) * (logT2 - logT1)) / (logI2 - logI1);
        return Math.pow(10, logT);
      }
    }

    return null;
  }

  /**
   * Extraer breakers de ruta
   * @param {Object} graph - Grafo del sistema
   * @param {Array} path - Ruta de edges
   * @returns {Array} Breakers en la ruta
   */
  extractBreakersFromPath(graph, path) {
    const breakers = [];

    for (const edge of path) {
      // Buscar breaker en el nodo source del edge
      const node = graph.nodes.find(n => n.id === edge.source);

      if (node && node.type === 'breaker') {
        breakers.push({
          id: node.id,
          rating: node.data?.rating || 100,
          pickup: node.data?.pickup,
          instantaneous: node.data?.instantaneous,
          curve: node.data?.curve,
          position: 'upstream'
        });
      }
    }

    return breakers;
  }

  /**
   * Generar secuencia de animación
   * @param {Object} fault - Evento de falla
   * @param {Array} path - Ruta de propagación
   * @param {Array} breakers - Breakers en ruta
   * @returns {Object} Secuencia de eventos animados
   */
  generateAnimationSequence(fault, path, breakers) {
    const sequence = {
      fault: {
        nodeId: fault.nodeId,
        Icc: fault.Icc,
        startTime: 0
      },
      flow: [],
      trips: [],
      totalDuration: 0
    };

    // Generar eventos de flujo
    let currentTime = 0; // current (A)
    for (let i = 0; i < path.length; i++) {
      const edge = path[i];
      sequence.flow.push({
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        startTime: currentTime,
        duration: this.animationSpeed,
        intensity: fault.Icc
      });
      currentTime += this.animationSpeed; // current (A)
    }

    // Generar eventos de disparo
    const tripTimes = this.calculateTripTimes(breakers, fault.Icc);

    for (const breaker of tripTimes) {
      if (breaker.willTrip) {
        const tripTimeMs = breaker.tripTime * 1000; // Convertir a ms
        sequence.trips.push({
          breakerId: breaker.id,
          rating: breaker.rating,
          tripTime: breaker.tripTime,
          startTime: tripTimeMs,
          willTrip: true
        });
      }
    }

    // Ordenar por tiempo
    sequence.trips.sort((a, b) => a.startTime - b.startTime);

    // Calcular duración total
    const lastFlow = sequence.flow[sequence.flow.length - 1];
    const lastTrip = sequence.trips[sequence.trips.length - 1];

    sequence.totalDuration = Math.max(
      lastFlow ? lastFlow.startTime + lastFlow.duration : 0,
      lastTrip ? lastTrip.startTime + 1000 : 0
    );

    return sequence;
  }

  /**
   * Simular falla completa
   * @param {Object} graph - Grafo del sistema
   * @param {string} nodeId - Nodo de falla
   * @param {number} Icc - Corriente de falla
   * @returns {Object} Resultado de simulación
   */
  simulateFault(graph, nodeId, Icc) {
    const fault = this.createFaultEvent(nodeId, Icc);
    const path = this.getUpstreamPath(graph, nodeId);
    const breakers = this.extractBreakersFromPath(graph, path);
    const sequence = this.generateAnimationSequence(fault, path, breakers);

    // Determinar qué breaker dispara primero
    const firstTrip = sequence.trips.find(t => t.willTrip);
    const firstTripper = firstTrip ? breakers.find(b => b.id === firstTrip.breakerId) : null;

    return {
      fault,
      path,
      breakers,
      sequence,
      firstTripper,
      totalBreakers: breakers.length,
      trippedBreakers: sequence.trips.filter(t => t.willTrip).length,
      status: firstTripper ? 'TRIPPED' : 'NO_TRIP'
    };
  }

  /**
   * Generar eventos para frontend
   * @param {Object} simulation - Resultado de simulación
   * @returns {Array} Lista de eventos con timestamps
   */
  generateFrontendEvents(simulation) {
    const events = [];
    const { sequence, fault } = simulation;

    // Evento inicial de falla
    events.push({
      type: 'FAULT_START',
      nodeId: fault.nodeId,
      Icc: fault.Icc,
      timestamp: 0,
      data: {
        color: 'red',
        status: 'FAULT'
      }
    });

    // Eventos de flujo
    for (const flow of sequence.flow) {
      events.push({
        type: 'FLOW',
        edgeId: flow.edgeId,
        source: flow.source,
        target: flow.target,
        timestamp: flow.startTime,
        duration: flow.duration,
        intensity: flow.intensity,
        data: {
          stroke: 'red',
          strokeWidth: Math.min(5, Math.log10(flow.intensity) * 0.5),
          animated: true
        }
      });
    }

    // Eventos de disparo
    for (const trip of sequence.trips) {
      events.push({
        type: 'TRIP',
        breakerId: trip.breakerId,
        timestamp: trip.startTime,
        data: {
          color: 'orange',
          label: 'TRIPPED',
          status: 'OPEN'
        }
      });
    }

    // Evento final
    events.push({
      type: 'SIMULATION_END',
      timestamp: sequence.totalDuration,
      data: {
        status: 'COMPLETE'
      }
    });

    // Ordenar por timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    return events;
  }

  /**
   * Obtener estado del sistema en tiempo t
   * @param {Object} simulation - Resultado de simulación
   * @param {number} time - Tiempo en ms
   * @returns {Object} Estado del sistema
   */
  getSystemStateAt(simulation, time) {
    const events = this.generateFrontendEvents(simulation);
    const state = {
      faultActive: false,
      activeFlows: [],
      trippedBreakers: [],
      completed: false
    };

    for (const event of events) {
      if (event.timestamp > time) break;

      switch (event.type) {
        case 'FAULT_START':
          state.faultActive = true;
          state.faultNode = event.nodeId;
          break;

        case 'FLOW':
          if (time <= event.timestamp + event.duration) {
            state.activeFlows.push({
              edgeId: event.edgeId,
              intensity: event.intensity,
              data: event.data
            });
          }
          break;

        case 'TRIP':
          state.trippedBreakers.push({
            breakerId: event.breakerId,
            data: event.data
          });
          break;

        case 'SIMULATION_END':
          state.completed = true;
          break;
      }
    }

    return state;
  }

  /**
   * Validar que la simulación es posible
   * @param {Object} graph - Grafo del sistema
   * @param {string} nodeId - Nodo de falla
   * @returns {Object} Resultado de validación
   */
  validateSimulation(graph, nodeId) {
    const node = graph.nodes.find(n => n.id === nodeId);

    if (!node) {
      return {
        valid: false,
        error: 'Nodo no encontrado'
      };
    }

    const path = this.getUpstreamPath(graph, nodeId);

    if (path.length === 0) {
      return {
        valid: false,
        error: 'No hay ruta aguas arriba (nodo es fuente)'
      };
    }

    const breakers = this.extractBreakersFromPath(graph, path);

    if (breakers.length === 0) {
      return {
        valid: false,
        error: 'No hay breakers en la ruta de protección',
        warning: 'La falla no será protegida'
      };
    }

    return {
      valid: true,
      pathLength: path.length,
      breakerCount: breakers.length,
      message: 'Simulación válida'
    };
  }

  /**
   * Cancelar animación activa
   * @param {string} faultId - ID de la falla
   */
  cancelAnimation(faultId) {
    if (this.activeAnimations.has(faultId)) {
      const animation = this.activeAnimations.get(faultId);
      if (animation.interval) {
        clearInterval(animation.interval);
      }
      this.activeAnimations.delete(faultId);
      return true;
    }
    return false;
  }

  /**
   * Limpiar todas las animaciones
   */
  clearAllAnimations() {
    for (const [_faultId, animation] of this.activeAnimations) {
      if (animation.interval) {
        clearInterval(animation.interval);
      }
    }
    this.activeAnimations.clear();
  }
}

module.exports = FaultAnimationEngine;
