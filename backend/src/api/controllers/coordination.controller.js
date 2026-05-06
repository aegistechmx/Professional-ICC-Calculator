/**
 * backend/src/api/controllers/coordination.controller.js
 * API para Auto-Coordinación de Protecciones
 */

/* eslint-disable no-console */
const CoordinationEngine = require('../../domain/services/coordinationEngine.domain');
const TCCEngine = require('../../domain/services/tccEngine.domain');

const coordinationController = {
  /**
   * POST /api/coordination/auto
   * Ejecutar auto-coordinación en lista de breakers
   */
  async autoCoordinate(req, res) {
    try {
      const { breakers, options = {} } = req.body;

      if (!breakers || !Array.isArray(breakers) || breakers.length < 2) {
        return res.status(400).json({
          error: 'Se requieren al menos 2 breakers para coordinar',
          example: {
            breakers: [
              { id: 'B1', pickup: 100, TMS: 0.1, curve: 'standard', standard: 'IEC' },
              { id: 'B2', pickup: 200, TMS: 0.1, curve: 'standard', standard: 'IEC' }
            ]
          }
        });
      }

      // Ejecutar coordinación
      const engine = new CoordinationEngine(options);
      const result = engine.autoCoordinate(breakers);

      // Generar curvas finales
      const tccEngine = new TCCEngine();
      const finalCurves = result.breakers.map(breaker => ({
        id: breaker.id,
        data: tccEngine.generateTCCCurve(breaker),
        originalData: tccEngine.generateTCCCurve(
          result.originalBreakers.find(b => b.id === breaker.id)
        )
      }));

      res.json({
        success: true,
        data: {
          ...result,
          curves: finalCurves
        }
      });

    } catch (error) {
      console.error('[COORDINATION] Error:', error);
      res.status(500).json({
        error: 'Error en auto-coordinación',
        message: error.message
      });
    }
  },

  /**
   * POST /api/coordination/analyze
   * Analizar coordinación sin modificar
   */
  async analyzeCoordination(req, res) {
    try {
      const { breakers, margin = 0.3 } = req.body;

      if (!breakers || breakers.length < 2) {
        return res.status(400).json({
          error: 'Se requieren al menos 2 breakers'
        });
      }

      const engine = new CoordinationEngine({ margin });
      const tccEngine = new TCCEngine();

      // Analizar sin modificar
      const analysis = {
        pairs: [],
        crossings: [],
        isCoordinated: true
      };

      for (let i = 0; i < breakers.length - 1; i++) {
        const down = breakers[i];
        const up = breakers[i + 1];

        const downCurve = tccEngine.generateTCCCurve(down);
        const upCurve = tccEngine.generateTCCCurve(up);

        const crossings = engine.detectCrossings(downCurve, upCurve, margin);

        analysis.pairs.push({
          downstream: down.id || `Breaker ${i + 1}`,
          upstream: up.id || `Breaker ${i + 2}`,
          crossings: crossings.length,
          status: crossings.length === 0 ? 'COORDINATED' : 'CONFLICT',
          worstPoint: crossings[0] || null
        });

        if (crossings.length > 0) {
          analysis.crossings.push(...crossings.map(c => ({
            pair: `${down.id} → ${up.id}`,
            ...c
          })));
          analysis.isCoordinated = false;
        }
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('[COORDINATION] Error análisis:', error);
      res.status(500).json({
        error: 'Error en análisis',
        message: error.message
      });
    }
  },

  /**
   * POST /api/coordination/suggest
   * Obtener sugerencias de ajuste manual
   */
  async suggestAdjustments(req, res) {
    try {
      const { breakers } = req.body;

      const engine = new CoordinationEngine();
      const result = engine.autoCoordinate(breakers);
      const suggestions = engine.suggestManualAdjustments(result.breakers);

      res.json({
        success: true,
        data: {
          status: result.status,
          suggestions,
          uncoordinatedPairs: suggestions.filter(s => s.issue)
        }
      });

    } catch (error) {
      console.error('[COORDINATION] Error sugerencias:', error);
      res.status(500).json({
        error: 'Error generando sugerencias',
        message: error.message
      });
    }
  },

  /**
   * POST /api/coordination/sensitivity
   * Análisis de sensibilidad con diferentes márgenes
   */
  async sensitivityAnalysis(req, res) {
    try {
      const { breakers, margins = [0.2, 0.3, 0.4, 0.5] } = req.body;

      const engine = new CoordinationEngine();
      const results = [];

      for (const margin of margins) {
        engine.config.margin = margin;
        const result = engine.autoCoordinate(breakers);

        results.push({
          margin,
          status: result.status,
          iterations: result.iterations,
          quality: result.finalStatus.quality,
          conflicts: result.finalStatus.totalCrossings
        });
      }

      // Encontrar margen óptimo
      const optimal = results.reduce((best, curr) => {
        if (curr.status === 'COORDINATED' && best.status !== 'COORDINATED') {
          return curr;
        }
        if (curr.status === best.status && curr.quality > best.quality) {
          return curr;
        }
        return best;
      });

      res.json({
        success: true,
        data: {
          optimalMargin: optimal,
          allResults: results,
          recommendation: optimal.status === 'COORDINATED'
            ? `Usar margen de ${optimal.margin}s para coordinación óptima`
            : `Coordinación difícil. Considerar revisar selección de breakers.`
        }
      });

    } catch (error) {
      console.error('[COORDINATION] Error sensibilidad:', error);
      res.status(500).json({
        error: 'Error en análisis de sensibilidad',
        message: error.message
      });
    }
  },

  /**
   * GET /api/coordination/config
   * Obtener configuración recomendada
   */
  async getConfig(req, res) {
    res.json({
      success: true,
      data: {
        defaults: {
          margin: 0.3,
          maxIterations: 20,
          tmsIncrement: 1.15,
          pickupIncrement: 1.2,
          instIncrement: 1.1,
          maxTMS: 1.0,
          maxPickup: 1000
        },
        guidelines: {
          margin: {
            description: 'Tiempo mínimo entre operaciones',
            typical: '0.3s para breakers, 0.2s para fusibles',
            range: '0.2 - 0.5 segundos'
          },
          tms: {
            description: 'Time Multiplier Setting',
            typical: '0.1 - 1.0',
            adjustment: '15% incremento máximo por iteración'
          },
          pickup: {
            description: 'Corriente de ajuste',
            typical: '1.25x carga nominal',
            adjustment: '20% incremento máximo'
          }
        }
      }
    });
  }
};

module.exports = coordinationController;
