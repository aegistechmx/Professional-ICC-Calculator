/**
 * simulacion.routes.js - Simulation Routes
 * Rutas para simulación de ICC en el tiempo
 */

const router = require('express').Router();
const ctrl = require('../controllers/simulacion.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');
const { simulateSystem } = require('../services/electricalEngine');

// Apply rate limiting to simulation endpoints
router.use(apiLimiter);

// System simulation for React Flow (no auth required for editor)
router.post('/sistema', (req, res) => {
  try {
    const { nodes, edges } = req.body;
    
    if (!nodes || !edges) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren nodes y edges'
      });
    }

    const results = simulateSystem({ nodes, edges });
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conductor catalog for frontend selector
router.get('/conductores', (req, res) => {
  const { CONDUCTORES } = require('../services/electricalEngine');
  
  const catalog = Object.keys(CONDUCTORES.cobre.pvc).map(calibre => ({
    calibre,
    ampacidad: CONDUCTORES.cobre.pvc[calibre].I_ampacidad
  })).sort((a, b) => a.ampacidad - b.ampacidad);
  
  res.json({
    success: true,
    data: catalog
  });
});

// All simulation routes require authentication
router.post('/icc-tiempo', auth, ctrl.simularICC);

// Simulación con gráfica
router.post('/icc-tiempo/grafica', auth, ctrl.simularICCConGrafica);

// Múltiples escenarios
router.post('/escenarios', auth, ctrl.simularEscenarios);

// Verificar capacidad de breaker
router.post('/verificar-capacidad', auth, ctrl.verificarCapacidad);

// Live simulation for real-time editor
router.post('/live', auth, ctrl.liveSimulation);

module.exports = router;
