/**
 * backend/src/api/controllers/simulation.controller.js
 * Controlador de Simulación de Fallas
 */

/* eslint-disable no-console */
const FaultSimulationEngine = require('../../domain/services/faultSimulation.domain');
const CalculationReportService = require('../../infrastructure/services/reportService');

const simulationController = {
  /**
   * POST /api/simulate
   * Simular falla en el sistema
   */
  async simulateFault(req, res) {
    try {
      const { sistema, falla } = req.body;

      // Validar entrada
      if (!sistema || !falla) {
        return res.status(400).json({
          error: 'Se requieren sistema y falla'
        });
      }

      // Ejecutar simulación
      const engine = new FaultSimulationEngine();
      const resultado = engine.simulate(sistema, falla);

      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('[SIMULATION] Error:', error);
      res.status(500).json({
        error: 'Error en simulación',
        message: error.message
      });
    }
  },

  /**
   * POST /api/report
   * Generar memoria de cálculo en PDF
   */
  async generateReport(req, res) {
    try {
      const { data, projectInfo } = req.body;

      if (!data) {
        return res.status(400).json({
          error: 'Se requieren datos del cálculo'
        });
      }

      // Generar PDF
      const reportService = new CalculationReportService();
      const pdfBuffer = await reportService.generateReport(data, projectInfo);

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="memoria_calculo_${projectInfo?.projectName || 'proyecto'}.pdf"`);

      res.send(Buffer.from(pdfBuffer));

    } catch (error) {
      console.error('[REPORT] Error:', error);
      res.status(500).json({
        error: 'Error al generar reporte',
        message: error.message
      });
    }
  },

  /**
   * POST /api/simulate/batch
   * Simular múltiples escenarios
   */
  async simulateBatch(req, res) {
    try {
      const { sistema, escenarios } = req.body;

      if (!sistema || !Array.isArray(escenarios)) {
        return res.status(400).json({
          error: 'Se requieren sistema y array de escenarios'
        });
      }

      const engine = new FaultSimulationEngine();
      const resultados = [];

      for (const escenario of escenarios) {
        const resultado = engine.simulate(sistema, escenario);
        resultados.push({
          escenario: escenario.nombre || escenario.nodo,
          resultado
        });
      }

      res.json({
        success: true,
        data: resultados
      });

    } catch (error) {
      console.error('[SIMULATION] Error batch:', error);
      res.status(500).json({
        error: 'Error en simulación batch',
        message: error.message
      });
    }
  },

  /**
   * GET /api/simulate/status/:simulationId
   * Obtener estado de simulación
   */
  async getSimulationStatus(req, res) {
    // Implementar con sistema de colas si es necesario
    res.json({
      status: 'completed',
      progress: 100
    });
  }
};

module.exports = simulationController;
