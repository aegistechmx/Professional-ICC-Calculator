/**
 * api/controllers/simulation.service.controller.js - Advanced simulation service controller
 * 
 * Responsibility: HTTP controller for high-level simulation services
 */

const SimulationService = require('@/app/services/simulation.service');

/**
 * Initialize simulation service
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.initialize = async (req, res) => {
  try {
    const service = new SimulationService();
    await service.initialize();
    
    res.json({
      success: true,
      message: 'Simulation service initialized',
      stats: service.getStats()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run N-1 contingency analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runN1Contingency = async (req, res) => {
  try {
    const service = new SimulationService();
    const result = await service.runN1Contingency(req.body.system, req.body.options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run N-2 contingency analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runN2Contingency = async (req, res) => {
  try {
    const service = new SimulationService();
    const result = await service.runN2Contingency(req.body.system, req.body.options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run full security analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runFullSecurityAnalysis = async (req, res) => {
  try {
    const service = new SimulationService();
    const result = await service.runFullSecurityAnalysis(req.body.system, req.body.options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run batch power flow analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.runBatchLoadFlow = async (req, res) => {
  try {
    const service = new SimulationService();
    const { scenarios } = req.body;
    
    const results = [];
    for (const scenario of scenarios) {
      const result = await service.runLoadFlow(scenario.system, scenario.options);
      results.push(result);
    }
    
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
};

/**
 * Get service statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getStats = async (req, res) => {
  try {
    const service = new SimulationService();
    const stats = service.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Shutdown simulation service
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.shutdown = async (req, res) => {
  try {
    const service = new SimulationService();
    await service.shutdown();
    
    res.json({
      success: true,
      message: 'Simulation service shutdown'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
