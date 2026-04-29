/**
 * simulacion.schema.js - Zod validation schemas for simulation endpoints
 */

const { z } = require('zod')

// Esquema de motor
const motorSchema = z.object({
  potencia_kw: z.number().positive(),
  voltaje: z.number().positive(),
  nombre: z.string().optional(),
  hp: z.number().positive().optional(),
  eficiencia: z.number().positive().min(0.5).max(1).optional(),
  fp: z.number().positive().min(0.5).max(1).optional(),
})

// Esquema base de simulación
const simulacionBaseSchema = z.object({
  voltaje: z.number().positive(),
  resistencia: z.number().nonnegative().default(0),
  reactancia: z.number().nonnegative().default(0),
  tipo: z.enum(['monofasico', 'trifasico']).default('trifasico'),
  motores: z.array(motorSchema).default([]),
  t_max: z.number().positive().max(1).default(0.2), // Máximo 1 segundo
  pasos: z.number().int().min(2).max(200).default(50),
  T_motor: z.number().positive().default(0.05), // Constante de tiempo subtransitoria
  factor_aporte: z.number().positive().min(3).max(8).default(5),
})

// Simulación simple
exports.simulacionSchema = simulacionBaseSchema

// Simulación con gráfica
exports.simulacionConGraficaSchema = simulacionBaseSchema.extend({
  generarGrafica: z.boolean().default(true),
})

// Simulación con verificación de capacidad
exports.verificacionCapacidadSchema = simulacionBaseSchema.extend({
  capacidadBreaker: z.number().positive(),
})

// Simulación de múltiples escenarios
exports.escenariosSchema = simulacionBaseSchema.extend({
  escenarios: z
    .array(
      z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
        motores: z.array(motorSchema),
        T_motor: z.number().positive().optional(),
      })
    )
    .min(1),
})
