function toNumber(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function normalizeCalibreKey(calibre) {
  // Accept: numbers (14, 350), strings ('14', '350', '1/0', '2/0', '4/0')
  if (calibre == null) return null;
  if (typeof calibre === 'number' && Number.isFinite(calibre)) return String(calibre);
  if (typeof calibre === 'string') {
    const s = calibre.trim();
    if (s === '') return null;
    // If numeric-like, normalize to no extra spaces
    const n = Number(s);
    if (Number.isFinite(n)) return String(n);
    return s; // e.g. '1/0'
  }
  return null;
}

// Minimal starter table (extend with full NOM/NEC data later)
// ampacidad_A: base ampacity at 30°C, 3 conductors, typical insulation assumption.
const tablaConductores = {
  Cu: {
    // AWG / kcmil catalog (ampacity values from your provided list)
    '14': { ampacidad_A: 20 },
    '12': { ampacidad_A: 25 },
    '10': { ampacidad_A: 35 },
    '8': { ampacidad_A: 50 },
    '6': { ampacidad_A: 65 },
    '4': { ampacidad_A: 85 },
    '3': { ampacidad_A: 100 },
    '2': { ampacidad_A: 115 },
    '1': { ampacidad_A: 130 },
    '1/0': { ampacidad_A: 150 },
    '2/0': { ampacidad_A: 175 },
    '3/0': { ampacidad_A: 200 },
    '4/0': { ampacidad_A: 230 },
    '250': { ampacidad_A: 255 },
    '300': { ampacidad_A: 285 },
    '350': { ampacidad_A: 310, R_ohm_km: 0.15, X_ohm_km: 0.08 },
    '400': { ampacidad_A: 335 },
    '500': { ampacidad_A: 380, R_ohm_km: 0.10, X_ohm_km: 0.08 }
  },
  Al: {
    // Keep partial aluminum table for now (extend later)
    '350': { ampacidad_A: 250, R_ohm_km: 0.24, X_ohm_km: 0.08 },
    '500': { ampacidad_A: 310, R_ohm_km: 0.16, X_ohm_km: 0.08 }
  }
};

function getFactorTemperatura(tempC = 30) {
  const t = toNumber(tempC);
  if (t == null) return 1.0;
  if (t <= 30) return 1.0;
  if (t <= 40) return 0.91;
  if (t <= 50) return 0.82;
  if (t <= 60) return 0.71;
  return 0.58;
}

function getFactorAgrupamiento(numConductores = 3) {
  const n = toNumber(numConductores);
  if (n == null) return 1.0;
  if (n <= 3) return 1.0;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  return 0.45;
}

function calcularCable(input) {
  const material = input?.material || input?.Material || 'Cu';
  const calibreKey = normalizeCalibreKey(input?.calibre);
  const paralelo = Math.max(1, toNumber(input?.paralelo) || 1);
  const longitud_m = Math.max(0, toNumber(input?.longitud) ?? toNumber(input?.longitud_m) ?? 0);

  const matTable = tablaConductores[material];
  const base = matTable && calibreKey != null ? matTable[calibreKey] : null;
  if (!base) throw new Error(`Calibre no válido: material=${material}, calibre=${input?.calibre}`);

  const F_temp = getFactorTemperatura(input?.temp ?? 30);
  const F_agrup = getFactorAgrupamiento(input?.numConductores ?? 3);

  const I_tabla = base.ampacidad_A;
  const I_corr = I_tabla * F_temp * F_agrup * paralelo;

  // Cable series impedance (simplified): Z = (R+jX) * L / paralelo
  const L_km = longitud_m / 1000;
  const R = base.R_ohm_km != null ? (base.R_ohm_km * L_km) / paralelo : null;
  const X = base.X_ohm_km != null ? (base.X_ohm_km * L_km) / paralelo : null;

  return {
    input: {
      material,
      calibre: calibreKey,
      longitud_m,
      paralelo,
      canalizacion: input?.canalizacion || null
    },
    tabla: {
      I_tabla_A: I_tabla
    },
    factores: {
      F_temp,
      F_agrup
    },
    resultados: {
      I_corr_A: I_corr,
      Z_ohm: (R == null || X == null) ? null : { R, X }
    }
  };
}

module.exports = {
  tablaConductores,
  normalizeCalibreKey,
  getFactorTemperatura,
  getFactorAgrupamiento,
  calcularCable
};

