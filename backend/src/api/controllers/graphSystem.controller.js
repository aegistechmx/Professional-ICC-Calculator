const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * api/controllers/graphSystem.controller.js - Graph-Based System Controller
 * Endpoint para procesar grafos de sistemas eléctricos con MotorICCCompleto
 */

/* eslint-disable no-console */
const { executeCalculation } = require('../application/services/systemCalculation.service');
const { validateSystemInput } = require('../shared/utils/validator');
const { startTimer, endTimer, recordError } = require('../shared/utils/observability');

class GraphSystemController {
  /**
   * Procesar sistema eléctrico basado en grafos
   * POST /api/system
   */
  async calculateGraphSystem(req, res) {
    const timerId = startTimer('request_graph_system', {
      endpoint: '/api/system',
      method: 'POST'
    });

    try {
      const graph = req.body;

      // Validar estructura del grafo
      this.validateGraphStructure(graph);

      // Transformar grafo a datos de sistema
      const systemData = this.transformGraphToSystem(graph);

      // Validar datos del sistema
      validateSystemInput(systemData);

      console.log('[GRAPH] Processing electrical system with', graph.nodes.length, 'nodes and', graph.edges.length, 'edges');

      // Ejecutar cálculo del sistema
      const result = await executeCalculation(systemData, {
        mode: req.query.mode || 'engineering',
        saveStudy: req.query.saveStudy === 'true',
        useQueue: req.query.async === 'true'
      });

      // Enriquecer resultado con información del grafo
      const enrichedResult = this.enrichResultWithGraph(result, graph);

      endTimer(timerId, {
        success: true,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        mode: req.query.mode || 'engineering'
      });

      res.json({
        success: true,
        data: enrichedResult,
        graph: {
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          processed: true
        },
        metadata: {
          endpoint: '/api/system',
          mode: req.query.mode || 'engineering',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      endTimer(timerId, { success: false, error: error.message });
      recordError(error, {
        endpoint: '/api/system',
        operation: 'graph_system_calculation'
      });

      console.error('[GRAPH] System calculation error:', error.message);

      res.status(400).json({
        success: false,
        error: error.message,
        metadata: {
          endpoint: '/api/system',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Validar estructura del grafo
   */
  validateGraphStructure(graph) {
    if (!graph) {
      throw new Error('Graph data is required');
    }

    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      throw new Error('Graph must have at least one node');
    }

    if (!Array.isArray(graph.edges)) {
      throw new Error('Graph edges must be an array');
    }

    // Validar nodos
    for (const node of graph.nodes) {
      if (!node.id) {
        throw new Error('All nodes must have an id');
      }

      if (!node.type) {
        throw new Error(`Node ${node.id} must have a type`);
      }

      // Validar tipos de nodos
      const validTypes = ['source', 'load', 'transformer', 'breaker', 'bus'];
      if (!validTypes.includes(node.type)) {
        throw new Error(`Invalid node type: ${node.type}. Valid types: ${validTypes.join(', ')}`);
      }
    }

    // Validar edges
    for (const edge of graph.edges) {
      if (!edge.from || !edge.to) {
        throw new Error('All edges must have from and to properties');
      }

      // Verificar que los nodos existan
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);

      if (!fromNode) {
        throw new Error(`Edge references non-existent node: ${edge.from}`);
      }

      if (!toNode) {
        throw new Error(`Edge references non-existent node: ${edge.to}`);
      }
    }

    console.log('[GRAPH] Graph structure validation passed');
  }

  /**
   * Transformar grafo a datos de sistema para MotorICCCompleto
   */
  transformGraphToSystem(graph) {
    // Encontrar nodos fuente y cargas
    const sources = graph.nodes.filter(n => n.type === 'source');
    const loads = graph.nodes.filter(n => n.type === 'load');

    if (sources.length === 0) {
      throw new Error('System must have at least one source node');
    }

    if (loads.length === 0) {
      throw new Error('System must have at least one load node');
    }

    // Usar la primera fuente como referencia
    const mainSource = sources[0];
    const mainLoad = loads[0];

    // Calcular parámetros del sistema
    const voltage = mainSource.voltaje || 480; // voltage (V)
    const I_carga = mainLoad.I_carga || 150;

    // Calcular impedancia total del sistema
    let totalImpedance = 0; // Unit: Ω (Ohms)
    for (const edge of graph.edges) {
      totalImpedance += edge.impedancia || 0.05; // impedance (Ω)
    }

    // Encontrar el conductor más largo
    let maxLength = 0;
    for (const node of graph.nodes) {
      if (node.longitud && node.longitud > maxLength) {
        maxLength = node.longitud;
      }
    }

    // Construir datos del sistema
    const systemData = {
      // Datos básicos del sistema
      I_carga,
      voltaje: voltage,
      FP: 0.9,
      longitud: maxLength || 100,
      tipoSistema: '3F',

      // Parámetros del conductor (valores por defecto o del grafo)
      material: graph.configuracion?.material || 'cobre',
      tempAislamiento: graph.configuracion?.tempAislamiento || 75,
      tempAmbiente: graph.configuracion?.tempAmbiente || 30,
      nConductores: graph.configuracion?.nConductores || 3,
      paralelos: graph.configuracion?.paralelos || 1,
      tempTerminal: graph.configuracion?.tempTerminal || 75,

      // Parámetros adicionales
      Z_fuente: totalImpedance,
      calibre: graph.configuracion?.calibre,

      // Información del grafo original
      graphInfo: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        sourceVoltage: voltage,
        totalImpedance,
        maxLength
      }
    };

    console.log('[GRAPH] Transformed to system data:', {
      voltage,
      I_carga,
      totalImpedance,
      maxLength
    });

    return systemData;
  }

  /**
   * Enriquecer resultados con información del grafo
   */
  enrichResultWithGraph(result, graph) {
    // Agregar información del grafo a los resultados
    const enriched = {
      ...result,
      graphAnalysis: {
        nodes: graph.nodes.map(node => ({
          id: node.id,
          type: node.type,
          calculatedData: this.calculateNodeResults(node, result.data)
        })),
        edges: graph.edges.map(edge => ({
          from: edge.from,
          to: edge.to,
          calculatedData: this.calculateEdgeResults(edge, result.data)
        })),
        topology: {
          totalNodes: graph.nodes.length,
          totalEdges: graph.edges.length,
          sources: graph.nodes.filter(n => n.type === 'source').length,
          loads: graph.nodes.filter(n => n.type === 'load').length
        }
      }
    };

    return enriched;
  }

  /**
   * Calcular resultados específicos para un nodo
   */
  calculateNodeResults(node, systemData) {
    const results = {};

    if (node.type === 'source') {
      results.voltage = node.voltaje || 480; // voltage (V)
      results.availablePower = toElectricalPrecision((results.voltage * (systemData.ampacidad?.I_final || 0)) / 1000, 'power');
    }

    if (node.type === 'load') {
      results.current = node.I_carga || 150; // current (A)
      results.power = toElectricalPrecision((results.current * (systemData.sistema?.voltaje || 480)) * 0.9 / 1000, 'power'); // kW
      results.voltageDrop = systemData.caida?.porcentaje || 0; // voltage (V)
    }

    return results;
  }

  /**
   * Calcular resultados específicos para un edge
   */
  calculateEdgeResults(edge, systemData) {
    return {
      impedance: edge.impedance || 0.05,
      current: systemData.sistema?.I_diseño || 187.5,
      voltageDrop: (edge.impedance || 0.05) * (systemData.sistema?.I_diseño || 187.5),
      shortCircuitCurrent: systemData.results?.shortCircuit?.Icc || 0
    };
  }

  /**
   * Obtener información del endpoint
   */
  getGraphSystemInfo(req, res) {
    res.json({
      success: true,
      data: {
        endpoint: '/api/system',
        method: 'POST',
        description: 'Graph-based electrical system calculation',
        graphStructure: {
          nodes: [
            {
              id: 'string',
              type: 'source|load|transformer|breaker|bus',
              voltaje: 'number (for source nodes)',
              I_carga: 'number (for load nodes)',
              longitud: 'number (meters)'
            }
          ],
          edges: [
            {
              from: 'node_id',
              to: 'node_id',
              impedance: 'number (ohms)'
            }
          ],
          configuracion: {
            norma: 'NOM|IEEE|IEC',
            material: 'cobre|aluminio',
            tempAislamiento: 60 | 75 | 90,
            tempAmbiente: 'number (°C)',
            nConductores: 'number',
            paralelos: 'number',
            tempTerminal: 60 | 75 | 90
          }
        },
        examples: [
          {
            name: 'Simple System',
            graph: {
              nodes: [
                { id: 'N1', type: 'source', voltaje: 480 },
                { id: 'N2', type: 'load', I_carga: 150, longitud: 30 }
              ],
              edges: [
                { from: 'N1', to: 'N2', impedance: 0.05 }
              ],
              configuracion: { norma: 'NOM' }
            }
          }
        ],
        supportedModes: ['fast', 'engineering', 'optimization', 'simulation'],
        features: [
          'Graph-based system modeling',
          'Real-time calculation',
          'Node and edge analysis',
          'Multiple calculation modes',
          'Study persistence'
        ]
      }
    });
  }
}

module.exports = new GraphSystemController();
