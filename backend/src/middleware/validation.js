/**
 * Input validation middleware for API endpoints
 * Provides comprehensive validation for electrical parameters
 */

const { validateElectricalParams } = require('../shared/utils/electricalUtils');

/**
 * Validate ICC calculation parameters
 */
function validateICCInput(req, res, next) {
  try {
    const body = req.body || {};

    // Check if it's a feeder validation request
    if (body.material && body.size && body.I_base) {
      return validateFeederInput(req, res, next);
    }

    // Legacy ICC validation
    const voltage = body.voltage || body.V;
    const impedance = body.impedance || body.Z;

    // Basic type validation
    if (voltage !== undefined && (typeof voltage !== 'number' || !isFinite(voltage))) {
      return res.status(400).json({
        success: false,
        error: 'Voltage must be a finite number'
      });
    }

    if (impedance !== undefined) {
      if (typeof impedance !== 'number' || !isFinite(impedance)) {
        return res.status(400).json({
          success: false,
          error: 'Impedance must be a finite number'
        });
      }

      if (impedance <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Impedance must be greater than zero'
        });
      }
    }

    // Validate electrical ranges
    const validation = validateElectricalParams({
      voltage: voltage,
      impedance: impedance
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', ')
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Validate feeder calculation parameters
 */
function validateFeederInput(req, res, next) {
  try {
    const body = req.body || {};
    const required = ['material', 'size', 'I_base'];

    // Check required fields
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    // Validate material
    if (typeof body.material !== 'string' || !['Cu', 'Al'].includes(body.material)) {
      return res.status(400).json({
        success: false,
        error: 'Material must be "Cu" or "Al"'
      });
    }

    // Validate size
    if (typeof body.size !== 'string' && typeof body.size !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Size must be a string or number'
      });
    }

    // Validate current
    if (typeof body.I_base !== 'number' || !isFinite(body.I_base) || body.I_base <= 0) {
      return res.status(400).json({
        success: false,
        error: 'I_base must be a positive number'
      });
    }

    // Validate optional parameters
    if (body.ambientC !== undefined) {
      if (typeof body.ambientC !== 'number' || !isFinite(body.ambientC) || body.ambientC < -40 || body.ambientC > 100) {
        return res.status(400).json({
          success: false,
          error: 'ambientC must be between -40°C and 100°C'
        });
      }
    }

    if (body.Icu_kA !== undefined) {
      if (typeof body.Icu_kA !== 'number' || !isFinite(body.Icu_kA) || body.Icu_kA <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Icu_kA must be a positive number'
        });
      }
    }

    if (body.Isc_kA !== undefined) {
      if (typeof body.Isc_kA !== 'number' || !isFinite(body.Isc_kA) || body.Isc_kA <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Isc_kA must be a positive number'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Validate graph structure for short circuit calculations
 */
function validateGraphInput(req, res, next) {
  try {
    const body = req.body || {};

    // Validate basic structure
    if (!body.nodes || !Array.isArray(body.nodes)) {
      return res.status(400).json({
        success: false,
        error: 'nodes must be an array'
      });
    }

    if (!body.edges || !Array.isArray(body.edges)) {
      return res.status(400).json({
        success: false,
        error: 'edges must be an array'
      });
    }

    // Validate nodes
    for (let i = 0; i < body.nodes.length; i++) {
      const node = body.nodes[i];

      if (!node.id || typeof node.id !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Node ${i} must have a valid id`
        });
      }

      if (node.type && typeof node.type !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Node ${i} type must be a string`
        });
      }

      // Validate position if present
      if (node.position && typeof node.position === 'object') {
        if (typeof node.position.x !== 'number' || !isFinite(node.position.x)) {
          return res.status(400).json({
            success: false,
            error: `Node ${i} position.x must be a finite number`
          });
        }

        if (typeof node.position.y !== 'number' || !isFinite(node.position.y)) {
          return res.status(400).json({
            success: false,
            error: `Node ${i} position.y must be a finite number`
          });
        }
      }

      // Validate node data if present
      if (node.data && typeof node.data === 'object') {
        if (node.data.parameters && typeof node.data.parameters === 'object') {
          // Validate electrical parameters
          const validation = validateElectricalParams(node.data.parameters);
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              error: `Node ${i} has invalid parameters: ${validation.errors.join(', ')}`
            });
          }
        }
      }
    }

    // Validate edges
    for (let i = 0; i < body.edges.length; i++) {
      const edge = body.edges[i];

      if (!edge.id || typeof edge.id !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Edge ${i} must have a valid id`
        });
      }

      if (!edge.source || typeof edge.source !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Edge ${i} must have a valid source`
        });
      }

      if (!edge.target || typeof edge.target !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Edge ${i} must have a valid target`
        });
      }

      // Validate edge data if present
      if (edge.data && typeof edge.data === 'object') {
        // Validate cable parameters
        if (edge.data.longitud !== undefined) {
          if (typeof edge.data.longitud !== 'number' || !isFinite(edge.data.longitud) || edge.data.longitud <= 0) {
            return res.status(400).json({
              success: false,
              error: `Edge ${i} longitud must be a positive number`
            });
          }
        }

        if (edge.data.material !== undefined && !['Cu', 'Al'].includes(edge.data.material)) {
          return res.status(400).json({
            success: false,
            error: `Edge ${i} material must be "Cu" or "Al"`
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Validate optimizer parameters
 */
function validateOptimizerInput(req, res, next) {
  try {
    const body = req.body || {};

    if (!body.breakers || !Array.isArray(body.breakers)) {
      return res.status(400).json({
        success: false,
        error: 'breakers must be an array'
      });
    }

    if (!body.faults || !Array.isArray(body.faults)) {
      return res.status(400).json({
        success: false,
        error: 'faults must be an array'
      });
    }

    // Validate iterations
    if (body.iterations !== undefined) {
      if (typeof body.iterations !== 'number' || !isFinite(body.iterations) || body.iterations <= 0 || body.iterations > 10000) {
        return res.status(400).json({
          success: false,
          error: 'iterations must be a number between 1 and 10000'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
}

/**
 * Generic JSON body validation
 */
function validateJSONBody(req, res, next) {
  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON body'
        });
      }
    }
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
  }
}

module.exports = {
  validateICCInput,
  validateFeederInput,
  validateGraphInput,
  validateOptimizerInput,
  validateJSONBody
};
