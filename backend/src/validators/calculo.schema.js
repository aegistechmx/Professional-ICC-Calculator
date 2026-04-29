const { z } = require('zod')

exports.iccSimpleSchema = z.object({
  voltaje: z.number().positive(),
  resistencia: z.number().nonnegative().default(0),
  reactancia: z.number().nonnegative().default(0),
  tipo: z.enum(['monofasico', 'trifasico']).default('trifasico'),
})

exports.iccSchema = z.object({
  modo: z.enum(['conocido', 'mva']),
  tipoSistema: z.enum(['3f', '1f']).default('3f'),
  tension: z.number().positive(),
  iscConocido: z.number().positive().optional(),
  mvaFuente: z.number().positive().optional(),
  iscFuente: z.number().positive().optional(),
  xrFuente: z.number().positive().optional(),
  trafoKVA: z.number().positive().optional(),
  trafoZ: z.number().positive().optional(),
  trafoVs: z.number().positive().optional(),
  feeders: z
    .array(
      z.object({
        material: z.enum(['cobre', 'aluminio']),
        canalizacion: z.enum(['acero', 'pvc']),
        calibre: z.string(),
        longitud: z.number().positive(),
        paralelo: z.number().int().positive().default(1),
      })
    )
    .default([]),
  motores: z
    .array(
      z.object({
        hp: z.number().positive(),
        tipo: z.enum(['induccion', 'sincrono']).default('induccion'),
        xdpp: z.number().positive().optional(),
        eficiencia: z.number().positive().optional(),
        punto: z.number().int().nonnegative(),
      })
    )
    .default([]),
  capacitores: z
    .array(
      z.object({
        kvar: z.number().positive(),
        tension: z.number().positive(),
        distancia: z.number().nonnegative().default(0),
      })
    )
    .default([]),
  equipP0: z
    .object({
      tipo: z.string().optional(),
      nombre: z.string().optional(),
      cap: z.number().nonnegative().default(0),
      amp: z.number().nonnegative().default(0),
      marco: z.string().optional(),
      disparo: z.string().optional(),
    })
    .optional(),
  equipFeeder: z
    .array(
      z.object({
        tipo: z.string().optional(),
        nombre: z.string().optional(),
        cap: z.number().nonnegative().default(0),
        amp: z.number().nonnegative().default(0),
        marco: z.string().optional(),
        disparo: z.string().optional(),
      })
    )
    .default([]),
  x0Config: z
    .enum(['plano_acero', 'plano_pvc', 'tripode_acero', 'tripode_pvc'])
    .default('plano_acero'),
  tipoAterrizamiento: z
    .enum(['yg_solido', 'yg_resistivo', 'delta'])
    .default('yg_solido'),
  zRetornoTierra: z.number().nonnegative().optional(),
})

exports.fallaMinimaSchema = z.object({
  puntosMax: z.array(
    z.object({
      nombre: z.string(),
      R: z.number(),
      X: z.number(),
      Z: z.number(),
      isc: z.number(),
      ipeak: z.number(),
      xr: z.number(),
      equip: z
        .object({
          iDisparo: z.number().nonnegative().default(0),
        })
        .optional(),
    })
  ),
  tipoSistema: z.enum(['3f', '1f']).default('3f'),
})

exports.iccMotoresSchema = z.object({
  voltaje: z.number().positive(),
  resistencia: z.number().nonnegative().default(0),
  reactancia: z.number().nonnegative().default(0),
  tipo: z.enum(['monofasico', 'trifasico']).default('trifasico'),
  tiempo: z.number().nonnegative().default(0),
  motores: z
    .array(
      z.object({
        potencia_kw: z.number().positive(),
        voltaje: z.number().positive(),
        nombre: z.string().optional(),
        hp: z.number().positive().optional(),
        eficiencia: z.number().positive().optional(),
        fp: z.number().positive().optional(),
      })
    )
    .default([]),
  generarCurva: z.boolean().default(false),
})
