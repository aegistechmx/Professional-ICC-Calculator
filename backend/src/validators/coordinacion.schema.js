/**
 * coordinacion.schema.js - Zod validation schemas for coordination endpoints
 */

const { z } = require('zod');

// Esquema para punto de curva
const puntoCurvaSchema = z.object({
  corriente: z.number().positive(),
  tiempo: z.number().positive(),
  zona: z.string().optional()
});

// Esquema para protección individual
const proteccionSchema = z.object({
  nombre: z.string().min(1),
  pickup: z.number().positive(),
  tms: z.number().positive().default(0.1),
  tipo: z.enum(['standard', 'very', 'extremely', 'long_time', 'short_time']).default('standard'),
  curva: z.array(puntoCurvaSchema).min(2),
  // Campos opcionales para regeneración de curva
  I_min: z.number().positive().optional(),
  I_max: z.number().positive().default(20000),
  puntos: z.number().int().positive().default(50)
});

// Esquema para análisis de tablero completo
exports.coordinacionTableroSchema = z.object({
  protecciones: z.array(proteccionSchema).min(2),
  margen: z.number().positive().default(0.2),
  intentarAjuste: z.boolean().default(true)
});

// Esquema para evaluación simple
exports.evaluacionSchema = z.object({
  protecciones: z.array(proteccionSchema).min(2),
  margen: z.number().positive().default(0.2)
});

// Esquema para aplicar ajuste
exports.ajusteSchema = z.object({
  protecciones: z.array(proteccionSchema).min(2),
  margen: z.number().positive().default(0.2),
  opciones: z.object({
    incremento: z.number().positive().default(0.05),
    maxIntentos: z.number().int().positive().default(20),
    tmsMaximo: z.number().positive().default(1.0)
  }).optional()
});
