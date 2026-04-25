/**
 * simulacion.controller.js - Simulation Controller
 * Controlador para endpoints de simulación de ICC en tiempo
 */

const simulacionService = require('../services/simulacion.service');
const { simulacionSchema, simulacionConGraficaSchema } = require('../validators/simulacion.schema');
const { success } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /simulacion/icc-tiempo
 * Simula ICC en el tiempo
 */
exports.simularICC = async (req, res) => {
  try {
    simulacionSchema.parse(req.body);
    
    const result = await simulacionService.simularICC(req.body);
    
    res.json(result);
  } catch (err) {
    console.error('Error en simulación:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /simulacion/icc-tiempo/grafica
 * Simula ICC y retorna con gráfica
 */
exports.simularICCConGrafica = async (req, res) => {
  try {
    simulacionConGraficaSchema.parse(req.body);
    
    const result = await simulacionService.simularICCConGrafica({
      ...req.body,
      generarGrafica: true
    });
    
    res.json({
      ...result,
      grafica: result.grafica ? 'data:image/png;base64,' + result.grafica.toString('base64') : null
    });
  } catch (err) {
    console.error('Error en simulación con gráfica:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /simulacion/escenarios
 * Simula múltiples escenarios
 */
exports.simularEscenarios = async (req, res) => {
  try {
    const result = await simulacionService.simularEscenarios(req.body);
    
    res.json({
      escenarios: result,
      total: result.length
    });
  } catch (err) {
    console.error('Error en simulación de escenarios:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /simulacion/verificar-capacidad
 * Simula y verifica capacidad de breaker
 */
exports.verificarCapacidad = async (req, res) => {
  try {
    const result = await simulacionService.verificarCapacidad(req.body);

    res.json(result);
  } catch (err) {
    console.error('Error verificando capacidad:', err);
    res.status(400).json({ error: err.message });
  }
};

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
