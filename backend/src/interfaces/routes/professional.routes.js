/**
 * interfaces/routes/professional.routes.js - Professional API Routes
 * Clean separation: ICC only vs Complete System
 */

const express = require('express');
const { calculateICC, getICCInfo, validateInput: validateICC } = require('../controllers/icc.pure.controller');
const { 
  calculateSystem, 
  calculateAmpacity, 
  getSystemInfo, 
  healthCheck,
  validateInput: validateSystem 
} = require('../controllers/system.controller');

const router = express.Router();

/**
 * ICC (Short Circuit Current) Routes - Pure ICC calculations
 */
router.post('/icc', validateICC, calculateICC);
router.get('/icc', getICCInfo);

/**
 * Complete System Routes - ETAP-lite functionality
 */
router.post('/system', validateSystem, calculateSystem);
router.post('/ampacity', calculateAmpacity);
router.get('/system', getSystemInfo);
router.get('/health', healthCheck);

/**
 * Legacy compatibility route (redirects to system)
 */
router.post('/legacy-icc', validateSystem, (req, res, next) => {
  // Add mode flag for legacy behavior
  req.query.mode = 'full';
  next();
}, calculateSystem);

/**
 * API Documentation endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Professional ICC Calculator API',
      version: '2.0.0',
      description: 'Electrical Engineering calculations with IEEE/IEC/NOM standards',
      endpoints: {
        '/api/icc': {
          method: 'POST',
          description: 'Short Circuit Current calculation (pure ICC)',
          input: { V: 'number', Z: 'number', system: 'object (optional)' }
        },
        '/api/system': {
          method: 'POST',
          description: 'Complete electrical system calculation (ETAP-lite)',
          input: 'Full system parameters',
          modes: ['fast', 'full']
        },
        '/api/ampacity': {
          method: 'POST',
          description: 'NOM ampacity calculation only',
          input: 'Conductor and environmental parameters'
        },
        '/api/health': {
          method: 'GET',
          description: 'Service health check'
        }
      },
      standards: ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012'],
      performance: {
        modes: ['fast', 'full'],
        logging: 'structured with levels',
        validation: 'Zod schemas',
        dependencyInjection: 'clean architecture'
      }
    }
  });
});

module.exports = router;
