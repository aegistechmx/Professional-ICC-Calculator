/**
 * backend/src/api/controllers/breakerSelector.controller.js
 * API para selección automática de breakers con capacidad interruptiva
 */

/* eslint-disable no-console */
const BreakerSelector = require('../../domain/services/breakerSelector.domain');

const breakerSelector = new BreakerSelector();

const breakerSelectorController = {
  /**
   * POST /api/breaker/select
   * Seleccionar breaker automático según criterios
   */
  async selectBreaker(req, res) {
    try {
      const {
        I_carga,
        Icc,
        voltage = 480, // Unit: V (Volts)
        family = null,
        options = {}
      } = req.body;

      // Validar entrada
      if (!I_carga || !Icc || !voltage) {
        return res.status(400).json({
          error: 'Parámetros requeridos: I_carga, Icc, voltage',
          example: {
            I_carga: 80,
            Icc: 42000,
            voltage: 480,
            family: 'ILINE'
          }
        });
      }

      const result = breakerSelector.selectBreaker({
        I_carga,
        Icc,
        voltage,
        family,
        options
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error:', error);
      res.status(500).json({
        error: 'Error en selección de breaker',
        message: error.message
      });
    }
  },

  /**
   * POST /api/breaker/auto-select
   * Selección automática (prueba todas las familias)
   */
  async autoSelectBreaker(req, res) {
    try {
      const {
        I_carga,
        Icc,
        voltage = 480, // Unit: V (Volts)
        options = {}
      } = req.body;

      if (!I_carga || !Icc || !voltage) {
        return res.status(400).json({
          error: 'Parámetros requeridos: I_carga, Icc, voltage'
        });
      }

      const result = breakerSelector.autoSelectBreaker({
        I_carga,
        Icc,
        voltage,
        options
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error auto-select:', error);
      res.status(500).json({
        error: 'Error en selección automática',
        message: error.message
      });
    }
  },

  /**
   * POST /api/breaker/validate
   * Validar breaker contra corriente de cortocircuito
   */
  async validateBreaker(req, res) {
    try {
      const { Icc, breakerCode, voltage = 480 } = req.body; // Unit: V (Volts)

      if (!Icc || !breakerCode || !voltage) {
        return res.status(400).json({
          error: 'Parámetros requeridos: Icc, breakerCode, voltage'
        });
      }

      const result = breakerSelector.validateBreaker(Icc, breakerCode, voltage); // voltage (V)

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error validación:', error);
      res.status(500).json({
        error: 'Error en validación',
        message: error.message
      });
    }
  },

  /**
   * GET /api/breaker/catalog
   * Obtener catálogo de breakers disponibles
   */
  async getCatalog(req, res) {
    try {
      const { family, voltage } = req.query; // voltage (V)

      const breakers = breakerSelector.getAvailableBreakers(family, voltage); // voltage (V)

      res.json({
        success: true,
        data: {
          breakers,
          families: {
            NQ: "Térmico-magnético residencial (QO)",
            NF: "MCCB industrial (EDB/PowerPact)",
            ILINE: "I-Line distribución industrial"
          },
          interruptClasses: {
            G: "42kA @ 480V",
            J: "65kA @ 480V",
            K: "50kA @ 480V",
            L: "100kA @ 480V"
          }
        }
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error catálogo:', error);
      res.status(500).json({
        error: 'Error obteniendo catálogo',
        message: error.message
      });
    }
  },

  /**
   * POST /api/breaker/analyze-system
   * Analizar sistema completo
   */
  async analyzeSystem(req, res) {
    try {
      const { nodes, systemVoltage = 480 } = req.body; // Unit: V (Volts)

      if (!nodes || !Array.isArray(nodes)) {
        return res.status(400).json({
          error: 'Se requiere array de nodos',
          example: {
            nodes: [
              { id: 'N1', I_carga: 80, Icc: 42000 },
              { id: 'N2', I_carga: 150, Icc: 38000 }
            ]
          }
        });
      }

      const analysis = breakerSelector.analyzeSystem(nodes, systemVoltage);

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error análisis sistema:', error);
      res.status(500).json({
        error: 'Error en análisis de sistema',
        message: error.message
      });
    }
  },

  /**
   * GET /api/breaker/interrupt-capacity
   * Obtener capacidad interruptiva de un breaker
   */
  async getInterruptCapacity(req, res) {
    try {
      const { code, voltage = 480 } = req.query; // Unit: V (Volts)

      if (!code || !voltage) {
        return res.status(400).json({
          error: 'Parámetros requeridos: code, voltage',
          example: '/api/breaker/interrupt-capacity?code=HGL36100&voltage=480' // Unit: V (Volts)
        });
      }

      const capacity = breakerSelector.getInterruptCapacity(code, parseInt(voltage)); // voltage (V)

      if (capacity === null) {
        return res.status(404).json({
          error: 'Breaker no encontrado o voltaje no soportado',
          code,
          voltage
        });
      }

      res.json({
        success: true,
        data: {
          code,
          voltage,
          interruptCapacity: capacity,
          unit: 'A',
          parsed: breakerSelector.parseBreakerCode(code)
        }
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error capacidad interruptiva:', error);
      res.status(500).json({
        error: 'Error obteniendo capacidad interruptiva',
        message: error.message
      });
    }
  },

  /**
   * GET /api/breaker/export-catalog
   * Exportar catálogo completo
   */
  async exportCatalog(req, res) {
    try {
      const catalog = breakerSelector.exportCatalog();

      res.json({
        success: true,
        data: catalog
      });

    } catch (error) {
      console.error('[BREAKER_SELECTOR] Error exportación:', error);
      res.status(500).json({
        error: 'Error exportando catálogo',
        message: error.message
      });
    }
  }
};

module.exports = breakerSelectorController;
