/**
 * Motor ICC Compartido
 * Usado por frontend React y módulo HTML
 * Evita duplicación de código entre ambos mundos
 */

// Cálculos eléctricos base
export function calcICC({ V, Z, factorC = 1.25 }) {
  if (Z <= 0) throw new Error('Impedancia debe ser > 0');
  
  const c = V / (Math.sqrt(3) * Z); // Icc trifásica (A)
  const P = Math.sqrt(3) * V * c / 1000; // Potencia de cortocircuito (kVA)
  
  return {
    V, // Voltaje (V)
    Z, // Impedancia (Ω)
    c: parseFloat(c.toFixed(2)), // Corriente de cortocircuito (A)
    P: parseFloat(P.toFixed(2)), // Potencia de cortocircuito (kVA)
    factorC, // Factor de crecimiento
    metodo: 'IccClasica'
  };
}

// Ampacidad según NOM
export function calcAmpacity({ 
  material = 'Cu', 
  size, 
  ambientC = 30, 
  nConductors = 3 
}) {
  // Tabla simplificada (75°C)
  const table75C = {
    Cu: {
      14: 20, 12: 25, 10: 35, 8: 50, 6: 65, 4: 85, 3: 100, 2: 115, 1: 130,
      '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230,
      250: 255, 300: 285, 350: 310, 400: 335, 500: 380
    },
    Al: {
      12: 20, 10: 30, 8: 40, 6: 50, 4: 65, 3: 75, 2: 90, 1: 100,
      '1/0': 120, '2/0': 135, '3/0': 155, '4/0': 180,
      250: 205, 300: 230, 350: 250, 400: 270, 500: 310
    }
  };
  
  const base = table75C[material]?.[size];
  if (!base) throw new Error(`Calibre ${size} no encontrado para ${material}`);
  
  // Factores de corrección simplificados
  const tempFactor = ambientC <= 30 ? 1.0 : ambientC <= 35 ? 0.96 : 0.91;
  const groupingFactor = nConductors <= 3 ? 1.0 : nConductors <= 6 ? 0.8 : 0.7;
  
  const corrected = base * tempFactor * groupingFactor;
  
  return {
    I_tabla: base,
    F_temp: tempFactor,
    F_group: groupingFactor,
    I_corr: parseFloat(corrected.toFixed(1))
  };
}

// TCC simple (curva IEC Very Inverse)
export function calcTripTime({ I, pickup, tms = 0.1 }) {
  const ratio = I / pickup;
  if (ratio < 1) return Infinity;
  
  // IEC Very Inverse: t = (0.14 * TMS) / ((I/Ip)^0.02 - 1)
  const t = (0.14 * tms) / (Math.pow(ratio, 0.02) - 1);
  return parseFloat(t.toFixed(3));
}

// Coordinación entre breakers
export function checkCoordination({ upstream, downstream, I_fault }) {
  const t_up = calcTripTime({ ...upstream, I: I_fault });
  const t_down = calcTripTime({ ...downstream, I: I_fault });
  
  const margin = t_up - t_down;
  const coordinated = margin > 0.2; // 200ms mínimo
  
  return {
    coordinated,
    margin: parseFloat(margin.toFixed(3)),
    t_up,
    t_down
  };
}

// Caída de tensión trifásica
export function calcVoltageDrop({ I, V, L, R, X, fp = 0.85 }) {
  const L_km = L / 1000;
  const sinPhi = Math.sqrt(1 - fp * fp);
  
  const deltaV = Math.sqrt(3) * I * (R * fp + X * sinPhi) * L_km;
  const percent = (deltaV / V) * 100;
  
  return {
    deltaV: parseFloat(deltaV.toFixed(2)),
    percent: parseFloat(percent.toFixed(2))
  };
}

// Validación completa de alimentador
export function validateFeeder(input) {
  const {
    material = 'Cu',
    size,
    ambientC = 30,
    nConductors = 3,
    I_base,
    Isc_kA
  } = input;
  
  // Ampacidad
  const amp = calcAmpacity({ material, size, ambientC, nConductors });
  
  // Check ampacidad
  const I_design = I_base * 1.25;
  const okAmpacity = amp.I_corr >= I_design;
  
  // Check interruptiva
  const okInterrupting = 35 >= Isc_kA; // asumiendo breaker 35kA
  
  return {
    ok: okAmpacity && okInterrupting,
    ampacity: {
      ...amp,
      I_design: parseFloat(I_design.toFixed(1)),
      check: { ok: okAmpacity }
    },
    interrupting: {
      ok: okInterrupting,
      msg: okInterrupting ? 'Cumple' : 'No cumple'
    }
  };
}

// Exportar todo en un objeto para uso en browser
if (typeof window !== 'undefined') {
  window.ICCEngine = {
    calcICC,
    calcAmpacity,
    calcTripTime,
    checkCoordination,
    calcVoltageDrop,
    validateFeeder
  };
}
