const calculoService = require('../services/calculo.service');
const { iccMotoresSchema } = require('../validators/calculo.schema');
const { success } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.iccSimple = asyncHandler(async (req, res) => {
  const result = await calculoService.iccSimple(req.body);
  success(res, result);
});

exports.icc = asyncHandler(async (req, res) => {
  const result = await calculoService.icc(req.body);
  success(res, result);
});

exports.fallaMinima = asyncHandler(async (req, res) => {
  const result = await calculoService.fallaMinima(req.body);
  success(res, result);
});

exports.retornoTierra = asyncHandler(async (req, res) => {
  const result = await calculoService.retornoTierra(req.body);
  success(res, result);
});

exports.iccConMotores = asyncHandler(async (req, res) => {
  iccMotoresSchema.parse(req.body);
  const result = await calculoService.iccConMotores(req.body);
  success(res, result);
});
