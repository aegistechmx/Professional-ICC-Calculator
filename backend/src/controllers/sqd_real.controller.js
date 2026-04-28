/**
 * sqd_real.controller.js - Real SQD Curves Controller
 * Controlador para endpoints de curvas reales digitalizadas
 */

const sqdRealService = require('../services/sqd_real.service');
const sqdReal = require('../core/protecciones/sqd_real');

/**
 * GET /sqd-real/curvas
 * Lista todas las curvas reales disponibles
 */
exports.listarCurvas = async (req, res) => {
  try {
    const curvas = await sqdRealService.listarCurvas();
    
    res.json({
      curvas,
      total: curvas.length,
      mensaje: 'Curvas cargadas desde datos digitalizados de fabricante'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /sqd-real/curva/:nombre
 * Obtiene una curva específica
 */
exports.obtenerCurva = async (req, res) => {
  try {
    const { nombre } = req.params;
    const curva = await sqdRealService.obtenerCurva(nombre);
    
    if (!curva) {
      return res.status(404).json({ 
        error: `Curva '${nombre}' no encontrada`,
        curvasDisponibles: await sqdRealService.listarCurvas()
      });
    }
    
    res.json({
      nombre,
      puntos: curva.length,
      curva
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /sqd-real/tiempo-disparo
 * Calcula tiempo de disparo para una corriente específica
 */
exports.tiempoDisparo = async (req, res) => {
  try {
    const { curva, corriente } = req.body;
    
    if (!curva || !corriente) {
      return res.status(400).json({ 
        error: 'Se requieren curva (nombre) y corriente' 
      });
    }
    
    const tiempo = await sqdRealService.tiempoDisparo(curva, corriente);
    
    res.json({
      curva,
      corriente,
      tiempo: parseFloat(tiempo.toFixed(6)),
      unidad: 's'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /sqd-real/coordinacion
 * Evalúa coordinación entre dos curvas reales
 */
exports.evaluarCoordinacion = async (req, res) => {
  try {
    const resultado = await sqdRealService.evaluarCoordinacionReal(req.body);
    
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /sqd-real/cascada
 * Analiza coordinación en cascada con múltiples curvas
 */
exports.analizarCascada = async (req, res) => {
  try {
    const { curvas, margen = 0.2 } = req.body;
    
    if (!Array.isArray(curvas) || curvas.length < 2) {
      return res.status(400).json({
        error: 'Se requieren al menos 2 curvas para análisis en cascada'
      });
    }
    
    const resultado = await sqdRealService.analizarCascadaReal(curvas, margen);
    
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /sqd-real/comparar
 * Compara múltiples curvas y genera gráfica comparativa
 */
exports.compararCurvas = async (req, res) => {
  try {
    const { curvas } = req.body;
    
    if (!Array.isArray(curvas) || curvas.length < 1) {
      return res.status(400).json({
        error: 'Se requiere al menos 1 curva para comparar'
      });
    }
    
    const graficasGenerador = require('../core/graficas/generador');
    
    const curvasData = [];
    for (const nombre of curvas) {
      const curva = sqdReal.obtenerCurva(nombre);
      if (curva) {
        curvasData.push({
          nombre,
          puntos: curva
        });
      }
    }
    
    if (curvasData.length === 0) {
      return res.status(404).json({
        error: 'Ninguna curva encontrada',
        curvasSolicitadas: curvas,
        curvasDisponibles: sqdReal.listarCurvas()
      });
    }
    
    const graficaBuffer = await graficasGenerador.generarGraficaTCC(curvasData);
    
    res.set('Content-Type', 'image/png');
    res.send(graficaBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
