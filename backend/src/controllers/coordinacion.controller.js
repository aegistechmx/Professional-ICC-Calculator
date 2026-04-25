/**
 * coordinacion.controller.js - Coordination Controller
 * Controlador para endpoints de análisis de coordinación de tableros
 */

const coordinacionService = require('../services/coordinacion.service');
const { coordinacionTableroSchema, evaluacionSchema, ajusteSchema } = require('../validators/coordinacion.schema');
const { success, error } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /coordinacion-tablero
 * Analiza coordinación completa de tablero con auto-ajuste opcional
 */
exports.analizarTablero = asyncHandler(async (req, res) => {
  coordinacionTableroSchema.parse(req.body);

  const resultado = await coordinacionService.analizarTablero(req.body);

  success(res, resultado);
});

/**
 * POST /coordinacion-evaluar
 * Solo evalúa coordinación sin intentar ajuste
 */
exports.evaluarSolo = asyncHandler(async (req, res) => {
  evaluacionSchema.parse(req.body);

  const resultado = await coordinacionService.evaluarSolo(req.body);

  success(res, resultado);
});

/**
 * POST /coordinacion-ajustar
 * Aplica auto-ajuste a protecciones
 */
exports.aplicarAjuste = asyncHandler(async (req, res) => {
  ajusteSchema.parse(req.body);

  const resultado = await coordinacionService.aplicarAjuste(req.body);

  success(res, resultado);
});
