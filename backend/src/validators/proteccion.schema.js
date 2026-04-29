const { z } = require('zod')

exports.tccSchema = z.object({
  pickup: z.number().positive(),
  tms: z.number().positive().default(0.1),
  tipo: z
    .enum(['standard', 'very', 'extremely', 'long_time', 'short_time'])
    .default('standard'),
  I_min: z.number().positive().optional(),
  I_max: z.number().positive().default(20000),
  puntos: z.number().int().positive().default(50),
})

exports.disparoSchema = z.object({
  corriente: z.number().positive(),
  pickup: z.number().positive(),
  tms: z.number().positive().default(0.1),
  tipo: z
    .enum(['standard', 'very', 'extremely', 'long_time', 'short_time'])
    .default('standard'),
  tiempoMaximo: z.number().positive().optional(),
})

exports.coordinacionSchema = z.object({
  dispositivo1: z.object({
    pickup: z.number().positive(),
    tms: z.number().positive().default(0.1),
    tipo: z
      .enum(['standard', 'very', 'extremely', 'long_time', 'short_time'])
      .default('standard'),
    I_min: z.number().positive().optional(),
    I_max: z.number().positive().default(20000),
    puntos: z.number().int().positive().default(50),
  }),
  dispositivo2: z.object({
    pickup: z.number().positive(),
    tms: z.number().positive().default(0.1),
    tipo: z
      .enum(['standard', 'very', 'extremely', 'long_time', 'short_time'])
      .default('standard'),
    I_min: z.number().positive().optional(),
    I_max: z.number().positive().default(20000),
    puntos: z.number().int().positive().default(50),
  }),
  margen: z.number().nonnegative().default(0.2),
})

exports.coordinacionCascadaSchema = z.object({
  dispositivos: z
    .array(
      z.object({
        pickup: z.number().positive(),
        tms: z.number().positive().default(0.1),
        tipo: z
          .enum(['standard', 'very', 'extremely', 'long_time', 'short_time'])
          .default('standard'),
        I_min: z.number().positive().optional(),
        I_max: z.number().positive().default(20000),
        puntos: z.number().int().positive().default(50),
      })
    )
    .min(2),
  margen: z.number().nonnegative().default(0.2),
})

exports.constantesCurvaSchema = z.object({
  tipo: z.enum(['standard', 'very', 'extremely', 'long_time', 'short_time']),
})

exports.seleccionSQDSchema = z.object({
  icc_total: z.number().positive(),
  corriente_carga: z.number().positive(),
  categoria: z.enum(['baja_tension', 'residencial']).optional(),
  polos: z
    .number()
    .int()
    .refine(val => [1, 2, 3, 4].includes(val))
    .optional(),
})

exports.curvaSQDSchema = z.object({
  breaker: z.object({
    id: z.string(),
    nombre: z.string(),
    In: z.number().positive(),
    Icu: z.number().positive(),
    ajustes: z.object({
      Ir: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      tr: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      Isd: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      tsd: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      Ii: z.object({ min: z.number(), max: z.number(), default: z.number() }),
    }),
  }),
  ajustes: z
    .object({
      Ir: z.number().optional(),
      tr: z.number().optional(),
      Isd: z.number().optional(),
      tsd: z.number().optional(),
      Ii: z.number().optional(),
    })
    .optional(),
  I_min: z.number().positive().optional(),
  I_max: z.number().positive().default(50000),
  puntos: z.number().int().positive().default(100),
})

exports.disparoSQDSchema = z.object({
  corriente: z.number().positive(),
  breaker: z.object({
    id: z.string(),
    nombre: z.string(),
    In: z.number().positive(),
    Icu: z.number().positive(),
    ajustes: z.object({
      Ir: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      tr: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      Isd: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      tsd: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      Ii: z.object({ min: z.number(), max: z.number(), default: z.number() }),
    }),
  }),
  ajustes: z
    .object({
      Ir: z.number().optional(),
      tr: z.number().optional(),
      Isd: z.number().optional(),
      tsd: z.number().optional(),
      Ii: z.number().optional(),
    })
    .optional(),
})

exports.coordinacionSQDSchema = z.object({
  downstream: z.object({
    breaker: z.object({
      id: z.string(),
      nombre: z.string(),
      In: z.number().positive(),
      Icu: z.number().positive(),
      ajustes: z.object({
        Ir: z.object({ min: z.number(), max: z.number(), default: z.number() }),
        tr: z.object({ min: z.number(), max: z.number(), default: z.number() }),
        Isd: z.object({
          min: z.number(),
          max: z.number(),
          default: z.number(),
        }),
        tsd: z.object({
          min: z.number(),
          max: z.number(),
          default: z.number(),
        }),
        Ii: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      }),
    }),
    ajustes: z
      .object({
        Ir: z.number().optional(),
        tr: z.number().optional(),
        Isd: z.number().optional(),
        tsd: z.number().optional(),
        Ii: z.number().optional(),
      })
      .optional(),
  }),
  upstream: z.object({
    breaker: z.object({
      id: z.string(),
      nombre: z.string(),
      In: z.number().positive(),
      Icu: z.number().positive(),
      ajustes: z.object({
        Ir: z.object({ min: z.number(), max: z.number(), default: z.number() }),
        tr: z.object({ min: z.number(), max: z.number(), default: z.number() }),
        Isd: z.object({
          min: z.number(),
          max: z.number(),
          default: z.number(),
        }),
        tsd: z.object({
          min: z.number(),
          max: z.number(),
          default: z.number(),
        }),
        Ii: z.object({ min: z.number(), max: z.number(), default: z.number() }),
      }),
    }),
    ajustes: z
      .object({
        Ir: z.number().optional(),
        tr: z.number().optional(),
        Isd: z.number().optional(),
        tsd: z.number().optional(),
        Ii: z.number().optional(),
      })
      .optional(),
  }),
  margen: z.number().nonnegative().default(0.2),
})

exports.coordinacionCascadaSQDSchema = z.object({
  niveles: z
    .array(
      z.object({
        icc_total: z.number().positive(),
        corriente_carga: z.number().positive(),
      })
    )
    .min(2),
  margen: z.number().nonnegative().default(0.2),
})
