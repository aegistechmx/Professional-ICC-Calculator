/**
 * backend/src/api/controllers/tcc.controller.js
 * API para Curvas TCC (Time-Current Coordination)
 */

/* eslint-disable no-console */
const TCCEngine = require('../../domain/services/tccEngine.domain');

const tccController = {
  /**
   * POST /api/tcc/generate
   * Generar curva TCC para un breaker
   */
  async generateCurve(req, res) {
    try {
      const { breaker, load } = req.body;

      if (!breaker || !breaker.pickup) {
        return res.status(400).json({
          error: 'Se requiere breaker con pickup definido'
        });
      }

      const engine = new TCCEngine();

      // Validar configuración
      const validation = engine.validateProtection(breaker);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Configuración inválida',
          details: validation.errors
        });
      }

      // Generar curva
      const curve = engine.generateTCCCurve(breaker);

      // Generar curva de carga si existe
      let loadCurve = null;
      if (load) {
        loadCurve = engine.generateLoadCurve(load);
      }

      res.json({
        success: true,
        data: {
          breakerCurve: curve,
          loadCurve: loadCurve,
          warnings: validation.warnings
        }
      });

    } catch (error) {
      console.error('[TCC] Error generando curva:', error);
      res.status(500).json({
        error: 'Error al generar curva TCC',
        message: error.message
      });
    }
  },

  /**
   * POST /api/tcc/coordination
   * Verificar coordinación entre protecciones
   */
  async checkCoordination(req, res) {
    try {
      const { downstream, upstream, margin = 0.2 } = req.body;

      if (!downstream || !upstream) {
        return res.status(400).json({
          error: 'Se requieren ambas protecciones (downstream y upstream)'
        });
      }

      const engine = new TCCEngine();

      // Generar curvas
      const downstreamCurve = engine.generateTCCCurve(downstream);
      const upstreamCurve = engine.generateTCCCurve(upstream);

      // Verificar coordinación
      const coordination = engine.checkCoordination(
        downstreamCurve,
        upstreamCurve,
        margin
      );

      res.json({
        success: true,
        data: {
          coordination,
          curves: {
            downstream: downstreamCurve,
            upstream: upstreamCurve
          }
        }
      });

    } catch (error) {
      console.error('[TCC] Error en coordinación:', error);
      res.status(500).json({
        error: 'Error al verificar coordinación',
        message: error.message
      });
    }
  },

  /**
   * POST /api/tcc/system
   * Generar todas las curvas TCC para un sistema
   */
  async generateSystemCurves(req, res) {
    try {
      const { nodes, faultCurrents } = req.body;

      if (!nodes || !Array.isArray(nodes)) {
        return res.status(400).json({
          error: 'Se requiere array de nodos'
        });
      }

      const engine = new TCCEngine();
      const curves = [];
      const coordinations = [];

      // Generar curvas para breakers
      const breakers = nodes.filter(n =>
        n.type === 'breaker' || n.data?.protection
      );

      breakers.forEach((breaker, index) => {
        const prot = breaker.data?.protection || breaker.data;

        if (prot && prot.In) {
          const curve = engine.generateTCCCurve({
            pickup: prot.In,
            TMS: prot.TMS || 0.1,
            curve: prot.curveType || 'standard',
            standard: prot.standard || 'IEC',
            instantaneous: prot.Iinstantaneous,
            Imax: prot.In * 100
          });

          curves.push({
            id: breaker.id,
            name: breaker.data?.label || breaker.id,
            standard: prot.standard || 'IEC',
            curveType: prot.curveType || 'standard',
            data: curve,
            color: getCurveColor(index),
            Icc: faultCurrents?.[breaker.id]
          });
        }
      });

      // Verificar coordinaciones entre breakers consecutivos
      for (let i = 0; i < curves.length - 1; i++) {
        for (let j = i + 1; j < curves.length; j++) {
          const coord = engine.checkCoordination(
            curves[i].data,
            curves[j].data
          );

          coordinations.push({
            downstream: curves[i].name,
            upstream: curves[j].name,
            isCoordinated: coord.isCoordinated,
            minTimeDifference: coord.minTimeDifference,
            conflicts: coord.conflicts.length
          });
        }
      }

      res.json({
        success: true,
        data: {
          curves,
          coordinations,
          availableCurves: engine.getAvailableCurves()
        }
      });

    } catch (error) {
      console.error('[TCC] Error generando curvas de sistema:', error);
      res.status(500).json({
        error: 'Error al generar curvas del sistema',
        message: error.message
      });
    }
  },

  /**
   * GET /api/tcc/curves
   * Listar curvas disponibles
   */
  async getAvailableCurves(req, res) {
    const engine = new TCCEngine();

    res.json({
      success: true,
      data: engine.getAvailableCurves()
    });
  },

  /**
   * POST /api/tcc/operating-point
   * Calcular punto de operación para una falla
   */
  async calculateOperatingPoint(req, res) {
    try {
      const { breaker, faultCurrent } = req.body;

      if (!breaker || !faultCurrent) {
        return res.status(400).json({
          error: 'Se requiere breaker y corriente de falla'
        });
      }

      const engine = new TCCEngine();
      const curve = engine.generateTCCCurve(breaker);
      const point = engine.calculateOperatingPoint(curve, faultCurrent);

      res.json({
        success: true,
        data: {
          operatingPoint: point,
          curve: curve.filter(p => p.I <= faultCurrent * 2) // Unit: A (Amperes)
        }
      });

    } catch (error) {
      console.error('[TCC] Error calculando punto de operación:', error);
      res.status(500).json({
        error: 'Error al calcular punto de operación',
        message: error.message
      });
    }
  }
};

/**
 * Generar colores para curvas
 */
function getCurveColor(index) {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316'  // orange
  ];
  return colors[index % colors.length];
}

module.exports = tccController;
