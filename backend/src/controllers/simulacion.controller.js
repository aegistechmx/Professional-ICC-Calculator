/**
 * simulacion.controller.js - Simulation Controller
 * Controlador para endpoints de simulación de ICC en tiempo
 */

const simulacionService = require('../services/simulacion.service');
const { simulacionSchema, simulacionConGraficaSchema } = require('../validators/simulacion.schema');
const { success } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { z } = require('zod');

// Validation schema for simularEscenarios
const escenariosSchema = z.object({
  escenarios: z.array(z.object({
    voltaje: z.number().positive(),
    resistencia: z.number().nonnegative(),
    reactancia: z.number().nonnegative(),
    tipo: z.enum(['monofasico', 'trifasico'])
  })).min(1)
});

// Validation schema for verificarCapacidad
const capacidadSchema = z.object({
  icc: z.number().positive(),
  icu: z.number().positive(),
  in: z.number().positive()
});

/**
 * POST /simulacion/icc-tiempo
 * Simula ICC en el tiempo
 */
exports.simularICC = asyncHandler(async (req, res) => {
  simulacionSchema.parse(req.body);
  const result = await simulacionService.simularICC(req.body);
  success(res, result);
});

/**
 * POST /simulacion/icc-tiempo/grafica
 * Simula ICC y retorna con gráfica
 */
exports.simularICCConGrafica = asyncHandler(async (req, res) => {
  simulacionConGraficaSchema.parse(req.body);
  const result = await simulacionService.simularICCConGrafica({
    ...req.body,
    generarGrafica: true
  });
  success(res, {
    ...result,
    grafica: result.grafica ? 'data:image/png;base64,' + result.grafica.toString('base64') : null
  });
});

/**
 * POST /simulacion/escenarios
 * Simula múltiples escenarios
 */
exports.simularEscenarios = asyncHandler(async (req, res) => {
  escenariosSchema.parse(req.body);
  const result = await simulacionService.simularEscenarios(req.body);
  success(res, {
    escenarios: result,
    total: result.length
  });
});

/**
 * POST /simulacion/verificar-capacidad
 * Simula y verifica capacidad de breaker
 */
exports.verificarCapacidad = asyncHandler(async (req, res) => {
  capacidadSchema.parse(req.body);
  const result = await simulacionService.verificarCapacidad(req.body);
  success(res, result);
});

/**
 * POST /simulacion/live
 * Live simulation for real-time editor updates
 * Returns ICC values and trip status for each node using IEC 60909
 */
exports.liveSimulation = asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;

  // Import IEC calculation modules
  const { construirRed } = require('../core/electrico/red');
  const { calcularCortocircuitoTodosNodos, verificarDisparoBreaker } = require('../core/electrico/solver');

  // Build electrical network
  const red = construirRed(nodes, edges);

  // Calculate ICC at all nodes using IEC 60909
  const resultados = calcularCortocircuitoTodosNodos(red, {
    V: 480,
    conMotores: true,
    estandar: 'iec'
  });

  // Extract ICC values and check breaker trips
  const iccResults = {};
  const tripResults = {};

  resultados.forEach(resultado => {
    iccResults[resultado.nodo] = resultado.Ik;

    // Check if this node is a breaker
    const nodo = red[resultado.nodo];
    if (nodo && nodo.tipo === 'breaker') {
      const tripStatus = verificarDisparoBreaker(nodo, resultado.Ik);
      tripResults[resultado.nodo] = tripStatus.trip;
    }
  });

  success(res, {
    icc: iccResults,
    trip: tripResults,
    resultados: resultados,
    timestamp: new Date().toISOString()
  });
});
