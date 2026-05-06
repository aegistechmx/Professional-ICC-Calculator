/**
 * api/controllers/realtime.controller.js - Real-Time Calculation Controller
 * Soporte para auto-cálculo en tiempo real con debounce y streaming
 */

/* eslint-disable no-console */
const { executeCalculation } = require('../application/services/systemCalculation.service');
const { validateSystemInput } = require('../shared/utils/validator');
const { startTimer, endTimer, recordError } = require('../shared/utils/observability');

class RealtimeController {
  constructor() {
    this.calculationCache = new Map();
    this.pendingCalculations = new Map();
    this.debounceTimers = new Map();
  }

  /**
   * Cálculo en tiempo real con debounce
   * POST /api/system/realtime
   */
  async calculateRealtime(req, res) {
    const timerId = startTimer('request_realtime_calculation', {
      endpoint: '/api/system/realtime',
      method: 'POST'
    });

    try {
      const graph = req.body;
      const sessionId = req.headers['x-session-id'] || 'default';
      const debounceMs = parseInt(req.query.debounce) || 500;

      // Validar estructura del grafo
      this.validateGraphStructure(graph);

      // Generar hash del grafo para cache
      const graphHash = this.generateGraphHash(graph);

      // Cancelar cálculo anterior si existe
      if (this.debounceTimers.has(sessionId)) {
        clearTimeout(this.debounceTimers.get(sessionId));
      }

      // Configurar debounce
      const debounceTimer = setTimeout(async () => {
        try {
          console.log(`[REALTIME] Processing calculation for session ${sessionId}`);

          // Transformar grafo a datos de sistema
          const systemData = this.transformGraphToSystem(graph);

          // Validar datos
          validateSystemInput(systemData);

          // Ejecutar cálculo en modo fast para tiempo real
          const result = await executeCalculation(systemData, {
            mode: 'fast',
            saveStudy: false
          });

          // Guardar en cache
          this.calculationCache.set(graphHash, {
            result,
            timestamp: Date.now(),
            sessionId
          });

          // Limpiar timer
          this.debounceTimers.delete(sessionId);

          console.log(`[REALTIME] Calculation completed for session ${sessionId}`);

        } catch (error) {
          console.error(`[REALTIME] Calculation error for session ${sessionId}:`, error.message);
          recordError(error, {
            endpoint: '/api/system/realtime',
            sessionId,
            operation: 'realtime_calculation'
          });
        }
      }, debounceMs);

      this.debounceTimers.set(sessionId, debounceTimer);

      // Responder inmediatamente con estado
      endTimer(timerId, {
        success: true,
        realtime: true,
        debounced: true,
        sessionId
      });

      res.json({
        success: true,
        data: {
          status: 'queued',
          sessionId,
          debounceMs,
          graphHash,
          estimatedTime: debounceMs + 100, // debounce + processing
          message: 'Calculation queued for processing'
        },
        metadata: {
          endpoint: '/api/system/realtime',
          realtime: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      endTimer(timerId, { success: false, error: error.message });
      recordError(error, {
        endpoint: '/api/system/realtime',
        operation: 'realtime_calculation'
      });

      res.status(400).json({
        success: false,
        error: error.message,
        metadata: {
          endpoint: '/api/system/realtime',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Obtener resultado de cálculo en tiempo real
   * GET /api/system/realtime/:graphHash
   */
  async getRealtimeResult(req, res) {
    const timerId = startTimer('request_realtime_result', {
      endpoint: '/api/system/realtime/result',
      method: 'GET'
    });

    try {
      const { graphHash } = req.params;
      const sessionId = req.headers['x-session-id'] || 'default';

      // Buscar en cache
      const cached = this.calculationCache.get(graphHash);

      if (cached && cached.sessionId === sessionId) {
        endTimer(timerId, {
          success: true,
          cached: true,
          sessionId
        });

        res.json({
          success: true,
          data: {
            status: 'completed',
            result: cached.result,
            cached: true,
            timestamp: cached.timestamp
          },
          metadata: {
            endpoint: '/api/system/realtime/result',
            cached: true,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        endTimer(timerId, {
          success: true,
          cached: false,
          sessionId
        });

        res.json({
          success: true,
          data: {
            status: 'pending',
            message: 'Calculation in progress or not found'
          },
          metadata: {
            endpoint: '/api/system/realtime/result',
            cached: false,
            timestamp: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      endTimer(timerId, { success: false, error: error.message });
      recordError(error, {
        endpoint: '/api/system/realtime/result',
        operation: 'get_realtime_result'
      });

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Streaming de resultados con Server-Sent Events
   * GET /api/system/realtime/stream
   */
  async streamResults(req, res) {
    const sessionId = req.headers['x-session-id'] || 'default';

    // Configurar headers para SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    console.log(`[REALTIME] Streaming started for session ${sessionId}`);

    // Enviar evento de conexión
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString()
    })}\\n\\n`);

    // Monitorear cache y enviar actualizaciones
    const checkInterval = setInterval(() => {
      const latestResults = Array.from(this.calculationCache.values())
        .filter(entry => entry.sessionId === sessionId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 1);

      if (latestResults.length > 0) {
        const latest = latestResults[0];

        res.write(`data: ${JSON.stringify({
          type: 'result',
          sessionId,
          result: latest.result,
          timestamp: latest.timestamp,
          graphHash: this.generateGraphHash(latest.result.input || {})
        })}\\n\\n`);
      }
    }, 1000); // Check every second

    // Manejar desconexión
    req.on('close', () => {
      clearInterval(checkInterval);
      console.log(`[REALTIME] Streaming ended for session ${sessionId}`);
    });

    req.on('error', () => {
      clearInterval(checkInterval);
      console.log(`[REALTIME] Streaming error for session ${sessionId}`);
    });
  }

  /**
   * Limpiar cache y cálculos pendientes
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    // Limpiar cache vieja
    for (const [hash, entry] of this.calculationCache) {
      if (now - entry.timestamp > maxAge) {
        this.calculationCache.delete(hash);
      }
    }

    // Limpiar timers viejos
    for (const [sessionId, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }

    console.log(`[REALTIME] Cleanup completed. Cache size: ${this.calculationCache.size}`);
  }

  /**
   * Validar estructura del grafo (simplificado)
   */
  validateGraphStructure(graph) {
    if (!graph || !graph.nodes || !graph.edges) {
      throw new Error('Invalid graph structure');
    }

    if (graph.nodes.length === 0) {
      throw new Error('Graph must have at least one node');
    }

    if (graph.edges.length === 0) {
      throw new Error('Graph must have at least one edge');
    }
  }

  /**
   * Generar hash del grafo para cache
   */
  generateGraphHash(graph) {
    const crypto = require('crypto');
    const normalized = JSON.stringify({
      nodes: graph.nodes.map(n => ({ id: n.id, type: n.type, voltaje: n.voltaje, I_carga: n.I_carga })), // voltage (V)
      edges: graph.edges.map(e => ({ from: e.from, to: e.to, impedance: e.impedance })), // impedance (Ω)
      configuracion: graph.configuracion
    });

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Transformar grafo a sistema (método simplificado)
   */
  transformGraphToSystem(graph) {
    const sources = graph.nodes.filter(n => n.type === 'source');
    const loads = graph.nodes.filter(n => n.type === 'load');

    if (sources.length === 0 || loads.length === 0) {
      throw new Error('Graph must have at least one source and one load');
    }

    const mainSource = sources[0];
    const mainLoad = loads[0];

    return {
      I_carga: mainLoad.I_carga || 150,
      voltaje: mainSource.voltaje || 480,
      FP: 0.9,
      longitud: mainLoad.longitud || 100,
      tipoSistema: '3F',
      material: graph.configuracion?.material || 'cobre',
      tempAislamiento: graph.configuracion?.tempAislamiento || 75,
      tempAmbiente: graph.configuracion?.tempAmbiente || 30,
      nConductores: graph.configuracion?.nConductores || 3,
      paralelos: graph.configuracion?.paralelos || 1,
      tempTerminal: graph.configuracion?.tempTerminal || 75
    };
  }

  /**
   * Obtener estadísticas del sistema en tiempo real
   */
  getRealtimeStats() {
    return {
      cacheSize: this.calculationCache.size,
      pendingCalculations: this.debounceTimers.size,
      activeSessions: new Set(
        Array.from(this.calculationCache.values()).map(entry => entry.sessionId)
      ).size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Singleton instance
const realtimeController = new RealtimeController();

// Cleanup periódico
setInterval(() => {
  realtimeController.cleanup();
}, 60000); // Cada minuto

module.exports = realtimeController;
