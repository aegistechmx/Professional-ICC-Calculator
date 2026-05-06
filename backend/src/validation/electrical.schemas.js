/**
 * validation/electrical.schemas.js - Comprehensive input validation
 * Zod schemas for electrical calculations
 */

const { z } = require('zod');

/**
 * Schema for basic ICC calculation
 */
const iccCalculationSchema = z.object({
  V: z.number().positive('Voltage must be positive').min(120).max(35000, 'Voltage too high'),
  Z: z.number().positive('Impedance must be positive').max(100, 'Impedance too high'),
  system: z.object({
    buses: z.array(z.object({
      id: z.number(),
      voltage: z.number().positive(),
      type: z.enum(['bus', 'generator', 'load'])
    })).optional(),
    branches: z.array(z.object({
      from: z.number(),
      to: z.number(),
      R: z.number().min(0),
      X: z.number().min(0)
    })).optional()
  }).optional()
});

/**
 * Schema for complete system calculation
 */
const systemCalculationSchema = z.object({
  I_carga: z.number().positive('Load current must be positive').min(1).max(10000, 'Current too high'),
  material: z.enum(['cobre', 'aluminio'], 'Material must be cobre or aluminio'),
  tempAislamiento: z.literal(60).or(z.literal(75)).or(z.literal(90)),
  tempAmbiente: z.number().min(-40).max(60, 'Ambient temperature out of range'),
  nConductores: z.number().int().min(1).max(100, 'Number of conductors invalid'),
  paralelos: z.number().int().min(1).max(10, 'Parallel conductors invalid'),
  tempTerminal: z.literal(60).or(z.literal(75)).or(z.literal(90)),
  voltaje: z.number().positive().min(120).max(35000, 'Voltage out of range'),
  FP: z.number().min(0.1).max(1.0, 'Power factor must be between 0.1 and 1.0'),
  longitud: z.number().min(0).max(10000, 'Length out of range'),
  tipoSistema: z.enum(['1F', '3F'], 'System type must be 1F or 3F'),

  // Optional advanced parameters
  Z_fuente: z.number().positive().optional(),
  calibre: z.string().optional(),
  modo: z.enum(['fast', 'full']).default('fast'),

  // Optional system data for advanced calculations
  sistema: z.object({
    nodos: z.array(z.any()).optional(),
    edges: z.array(z.any()).optional(),
    configuracion: z.object({}).optional()
  }).optional()
});

/**
 * Schema for ampacity calculation only
 */
const ampacityCalculationSchema = z.object({
  calibre: z.string().min(1, 'Calibre required'),
  material: z.enum(['cobre', 'aluminio']),
  tempAislamiento: z.literal(60).or(z.literal(75)).or(z.literal(90)),
  tempAmbiente: z.number().min(-40).max(60),
  nConductores: z.number().int().min(1).max(100),
  paralelos: z.number().int().min(1).max(10),
  tempTerminal: z.literal(60).or(z.literal(75)).or(z.literal(90))
});

/**
 * Performance mode validation
 */
const performanceModeSchema = z.object({
  mode: z.enum(['fast', 'full']).default('fast'),
  cache: z.boolean().default(true),
  precision: z.enum(['standard', 'high']).default('standard'),
  timeout: z.number().positive().max(30000).default(5000)
});

/**
 * Validate input and return formatted error
 */
function validateInput(schema, data) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return {
      success: false,
      errors: formattedErrors,
      message: 'Validation failed'
    };
  }
}

/**
 * Middleware for Express validation
 */
function validateSchema(schema) {
  return (req, res, next) => {
    const result = validateInput(schema, req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.errors
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  iccCalculationSchema,
  systemCalculationSchema,
  ampacityCalculationSchema,
  performanceModeSchema,
  validateInput,
  validateSchema
};
