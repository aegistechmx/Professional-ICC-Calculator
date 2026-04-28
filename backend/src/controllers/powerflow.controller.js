/**
 * Power Flow Controller
 * 
 * Exposes the unified power flow pipeline as API endpoints
 * Integrates Per-Unit → Ybus → Newton-Raphson → Results
 */

const { solvePowerFlow, solvePowerFlowQuick } = require('../core/electrical/PowerFlowOrchestrator');
const { asyncHandler } = require('../middleware/errorHandler');
const { success, badRequest } = require('../utils/apiResponse');

/**
 * Run complete power flow analysis
 * POST /api/powerflow/run
 */
exports.runPowerFlow = asyncHandler(async (req, res) => {
  const { nodes, edges, options } = req.body;
  
  if (!nodes || !edges) {
    return badRequest(res, 'Nodes and edges are required');
  }
  
  const result = await solvePowerFlow(
    { nodes, edges },
    options || {}
  );
  
  if (result.success) {
    success(res, result);
  } else {
    badRequest(res, result.error || 'Power flow analysis failed', result);
  }
});

/**
 * Quick power flow (simplified interface)
 * POST /api/powerflow/quick
 */
exports.runPowerFlowQuick = asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  
  if (!nodes || !edges) {
    return badRequest(res, 'Nodes and edges are required');
  }
  
  const result = await solvePowerFlowQuick(nodes, edges);
  
  if (result.success) {
    success(res, result);
  } else {
    badRequest(res, result.error || 'Power flow analysis failed', result);
  }
});

/**
 * Validate electrical system before running power flow
 * POST /api/powerflow/validate
 */
exports.validateSystem = asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  
  if (!nodes || !edges) {
    return badRequest(res, 'Nodes and edges are required');
  }
  
  // Quick validation checks
  const errors = [];
  const warnings = [];
  
  // Check for at least one source (transformer)
  const hasSource = nodes.some(n => n.type === 'transformer');
  if (!hasSource) {
    errors.push('No voltage source (transformer) found in the system');
  }
  
  // Check for loads
  const hasLoad = nodes.some(n => n.type === 'load' || n.type === 'motor');
  if (!hasLoad) {
    warnings.push('No loads found in the system');
  }
  
  // Check connectivity
  const connectedNodes = new Set();
  edges.forEach(e => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  
  const isolatedNodes = nodes.filter(n => !connectedNodes.has(n.id));
  if (isolatedNodes.length > 0) {
    errors.push(`Isolated nodes: ${isolatedNodes.map(n => n.id).join(', ')}`);
  }
  
  const valid = errors.length === 0;
  
  success(res, {
    valid,
    errors,
    warnings,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      hasSource,
      hasLoad,
      isolatedNodes: isolatedNodes.length
    }
  });
});
