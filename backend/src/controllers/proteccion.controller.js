const proteccionService = require('../services/proteccion.service');
const { tccSchema, disparoSchema, coordinacionSchema, coordinacionCascadaSchema, constantesCurvaSchema, seleccionSQDSchema, curvaSQDSchema, disparoSQDSchema, coordinacionSQDSchema, coordinacionCascadaSQDSchema } = require('../validators/proteccion.schema');

exports.analizarTCC = async (req, res) => {
  try {
    tccSchema.parse(req.body);
    const result = await proteccionService.analizarTCC(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.evaluarDisparo = async (req, res) => {
  try {
    disparoSchema.parse(req.body);
    const result = await proteccionService.evaluarDisparo(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.analizarCoordinacion = async (req, res) => {
  try {
    coordinacionSchema.parse(req.body);
    const result = await proteccionService.analizarCoordinacion(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.analizarCoordinacionCascada = async (req, res) => {
  try {
    coordinacionCascadaSchema.parse(req.body);
    const result = await proteccionService.analizarCoordinacionCascada(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getConstantesCurva = async (req, res) => {
  try {
    constantesCurvaSchema.parse(req.body);
    const result = await proteccionService.getConstantesCurva(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.generarCurva = async (req, res) => {
  try {
    tccSchema.parse(req.body);
    const result = await proteccionService.generarCurva(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.seleccionarSQD = async (req, res) => {
  try {
    seleccionSQDSchema.parse(req.body);
    const result = await proteccionService.seleccionarSQD(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.generarCurvaSQD = async (req, res) => {
  try {
    curvaSQDSchema.parse(req.body);
    const result = await proteccionService.generarCurvaSQD(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.evaluarDisparoSQD = async (req, res) => {
  try {
    disparoSQDSchema.parse(req.body);
    const result = await proteccionService.evaluarDisparoSQD(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.coordinarProteccionesSQD = async (req, res) => {
  try {
    coordinacionSQDSchema.parse(req.body);
    const result = await proteccionService.coordinarProteccionesSQD(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.seleccionarCoordinacionCascada = async (req, res) => {
  try {
    coordinacionCascadaSQDSchema.parse(req.body);
    const result = await proteccionService.seleccionarCoordinacionCascada(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getBreakersSQD = async (req, res) => {
  try {
    const result = await proteccionService.getBreakersSQD();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
