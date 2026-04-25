/**
 * sqd_breakers.js - Schneider Electric / Square D Breaker Database
 * Base de datos de breakers con ajustes LSIG (Long, Short, Instantaneous, Ground)
 * 
 * LSIG Zones:
 * - L (Long-time): Protección térmica para sobrecarga
 * - S (Short-time): Retardo para fallas de corta duración
 * - I (Instantaneous): Disparo magnético instantáneo
 * - G (Ground): Protección de falla a tierra (opcional)
 */

module.exports = [
  {
    id: 'sqd-nsx100',
    nombre: 'SQD-NSX100',
    fabricante: 'Schneider Electric',
    In: 100, // Corriente nominal (A)
    Icu: 25_000, // Capacidad interruptiva (A)
    Ics: 25_000, // Capacidad de servicio (A)
    frame: 100,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.4, max: 1.0, default: 0.8 }, // Long pickup (×In)
      tr: { min: 0.5, max: 16, default: 5 }, // Long delay (seg)
      Isd: { min: 1.5, max: 10, default: 6 }, // Short pickup (×Ir)
      tsd: { min: 0.1, max: 0.5, default: 0.2 }, // Short delay (seg)
      Ii: { min: 1.5, max: 12, default: 10 }, // Instantáneo (×In)
      Igf: { min: 0.2, max: 0.8, default: 0.5 }, // Ground pickup (×In) - opcional
      tg: { min: 0.1, max: 0.5, default: 0.2 } // Ground delay (seg) - opcional
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-nsx160',
    nombre: 'SQD-NSX160',
    fabricante: 'Schneider Electric',
    In: 160,
    Icu: 25_000,
    Ics: 25_000,
    frame: 160,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.4, max: 1.0, default: 0.8 },
      tr: { min: 0.5, max: 16, default: 5 },
      Isd: { min: 1.5, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.5, default: 0.2 },
      Ii: { min: 1.5, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-nsx250',
    nombre: 'SQD-NSX250',
    fabricante: 'Schneider Electric',
    In: 250,
    Icu: 36_000,
    Ics: 36_000,
    frame: 250,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.4, max: 1.0, default: 0.8 },
      tr: { min: 0.5, max: 16, default: 5 },
      Isd: { min: 1.5, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.5, default: 0.2 },
      Ii: { min: 1.5, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-nsx400',
    nombre: 'SQD-NSX400',
    fabricante: 'Schneider Electric',
    In: 400,
    Icu: 50_000,
    Ics: 50_000,
    frame: 400,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.4, max: 1.0, default: 0.8 },
      tr: { min: 0.5, max: 16, default: 5 },
      Isd: { min: 1.5, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.5, default: 0.2 },
      Ii: { min: 1.5, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-nsx630',
    nombre: 'SQD-NSX630',
    fabricante: 'Schneider Electric',
    In: 630,
    Icu: 50_000,
    Ics: 50_000,
    frame: 630,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.4, max: 1.0, default: 0.8 },
      tr: { min: 0.5, max: 16, default: 5 },
      Isd: { min: 1.5, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.5, default: 0.2 },
      Ii: { min: 1.5, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-mt-n1-125',
    nombre: 'SQD-MT-N1-125',
    fabricante: 'Schneider Electric',
    In: 125,
    Icu: 25_000,
    Ics: 25_000,
    frame: 125,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.5, max: 1.0, default: 0.8 },
      tr: { min: 1, max: 16, default: 5 },
      Isd: { min: 2, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.4, default: 0.2 },
      Ii: { min: 2, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-mt-n2-250',
    nombre: 'SQD-MT-N2-250',
    fabricante: 'Schneider Electric',
    In: 250,
    Icu: 36_000,
    Ics: 36_000,
    frame: 250,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.5, max: 1.0, default: 0.8 },
      tr: { min: 1, max: 16, default: 5 },
      Isd: { min: 2, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.4, default: 0.2 },
      Ii: { min: 2, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-mt-n3-400',
    nombre: 'SQD-MT-N3-400',
    fabricante: 'Schneider Electric',
    In: 400,
    Icu: 50_000,
    Ics: 50_000,
    frame: 400,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.5, max: 1.0, default: 0.8 },
      tr: { min: 1, max: 16, default: 5 },
      Isd: { min: 2, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.4, default: 0.2 },
      Ii: { min: 2, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-mt-n3-630',
    nombre: 'SQD-MT-N3-630',
    fabricante: 'Schneider Electric',
    In: 630,
    Icu: 50_000,
    Ics: 50_000,
    frame: 630,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.5, max: 1.0, default: 0.8 },
      tr: { min: 1, max: 16, default: 5 },
      Isd: { min: 2, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.4, default: 0.2 },
      Ii: { min: 2, max: 12, default: 10 },
      Igf: { min: 0.2, max: 0.8, default: 0.5 },
      tg: { min: 0.1, max: 0.5, default: 0.2 }
    },
    curva: 'lsig',
    categoria: 'baja_tension'
  },
  {
    id: 'sqd-easy9-125',
    nombre: 'SQD-Easy9-125',
    fabricante: 'Schneider Electric',
    In: 125,
    Icu: 10_000,
    Ics: 10_000,
    frame: 125,
    polos: [1, 2, 3, 4],
    ajustes: {
      Ir: { min: 0.5, max: 1.0, default: 0.8 },
      tr: { min: 1, max: 16, default: 5 },
      Isd: { min: 2, max: 10, default: 6 },
      tsd: { min: 0.1, max: 0.4, default: 0.2 },
      Ii: { min: 2, max: 12, default: 10 }
    },
    curva: 'lsig',
    categoria: 'residencial'
  }
];
