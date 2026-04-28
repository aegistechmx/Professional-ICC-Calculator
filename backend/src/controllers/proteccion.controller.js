const proteccionService = require('../services/proteccion.service');
const { tccSchema, disparoSchema, coordinacionSchema, coordinacionCascadaSchema, constantesCurvaSchema, seleccionSQDSchema, curvaSQDSchema, disparoSQDSchema, coordinacionSQDSchema, coordinacionCascadaSQDSchema } = require('../validators/proteccion.schema');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/apiResponse');

exports.analizarTCC = asyncHandler(async (req, res) => {
  tccSchema.parse(req.body);
  const result = await proteccionService.analizarTCC(req.body);
  success(res, result);
});

exports.evaluarDisparo = asyncHandler(async (req, res) => {
  disparoSchema.parse(req.body);
  const result = await proteccionService.evaluarDisparo(req.body);
  success(res, result);
});

exports.analizarCoordinacion = asyncHandler(async (req, res) => {
  coordinacionSchema.parse(req.body);
  const result = await proteccionService.analizarCoordinacion(req.body);
  success(res, result);
});

exports.analizarCoordinacionCascada = asyncHandler(async (req, res) => {
  coordinacionCascadaSchema.parse(req.body);
  const result = await proteccionService.analizarCoordinacionCascada(req.body);
  success(res, result);
});

exports.getConstantesCurva = asyncHandler(async (req, res) => {
  constantesCurvaSchema.parse(req.body);
  const result = await proteccionService.getConstantesCurva(req.body);
  success(res, result);
});

exports.generarCurva = asyncHandler(async (req, res) => {
  tccSchema.parse(req.body);
  const result = await proteccionService.generarCurva(req.body);
  success(res, result);
});

exports.seleccionarSQD = asyncHandler(async (req, res) => {
  seleccionSQDSchema.parse(req.body);
  const result = await proteccionService.seleccionarSQD(req.body);
  success(res, result);
});

exports.generarCurvaSQD = asyncHandler(async (req, res) => {
  curvaSQDSchema.parse(req.body);
  const result = await proteccionService.generarCurvaSQD(req.body);
  success(res, result);
});

exports.evaluarDisparoSQD = asyncHandler(async (req, res) => {
  disparoSQDSchema.parse(req.body);
  const result = await proteccionService.evaluarDisparoSQD(req.body);
  success(res, result);
});

exports.coordinarProteccionesSQD = asyncHandler(async (req, res) => {
  coordinacionSQDSchema.parse(req.body);
  const result = await proteccionService.coordinarProteccionesSQD(req.body);
  success(res, result);
});

exports.seleccionarCoordinacionCascada = asyncHandler(async (req, res) => {
  coordinacionCascadaSQDSchema.parse(req.body);
  const result = await proteccionService.seleccionarCoordinacionCascada(req.body);
  success(res, result);
});

exports.getBreakersSQD = asyncHandler(async (req, res) => {
  const result = await proteccionService.getBreakersSQD();
  success(res, result);
});
