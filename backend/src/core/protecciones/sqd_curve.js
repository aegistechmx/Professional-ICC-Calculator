/**
 * sqd_curve.js - LSIG Curve Calculation for Schneider Electric / Square D Breakers
 * Modelo LSIG (Long, Short, Instantaneous, Ground) para curvas reales de fabricante
 * 
 * Zonas de protección:
 * - L (Long-time): Sobrecarga térmica - curva inversa
 * - S (Short-time): Falla de corta duración - tiempo fijo
 * - I (Instantaneous): Disparo magnético - instantáneo
 * - G (Ground): Falla a tierra - opcional
 */

/**
 * Calcula tiempo de disparo según modelo LSIG de SQD
 * @param {Object} params - Parámetros de cálculo
 * @param {number} params.corriente - Corriente en amperes
 * @param {Object} params.breaker - Objeto breaker con ajustes LSIG
 * @param {Object} params.ajustesPersonalizados - Ajustes opcionales (sobreescriben defaults)
 * @returns {number} Tiempo de disparo en segundos
 */
function calcularTiempoDisparoSQD({
  corriente,
  breaker,
  ajustesPersonalizados = {}
}) {
  if (!corriente || corriente <= 0) {
    throw new Error('Corriente debe ser mayor a 0');
  }

  const { In, ajustes } = breaker;

  // Usar ajustes personalizados o defaults del breaker
  const Ir = (ajustesPersonalizados.Ir || ajustes.Ir.default) * In;
  const tr = ajustesPersonalizados.tr || ajustes.tr.default;
  const Isd = (ajustesPersonalizados.Isd || ajustes.Isd.default) * Ir;
  const tsd = ajustesPersonalizados.tsd || ajustes.tsd.default;
  const Ii = (ajustesPersonalizados.Ii || ajustes.Ii.default) * In;

  // 🔵 Zona 1: Long-time (sobrecarga térmica)
  // Curva inversa tipo térmica: t = tr / (I/Ir)^2
  if (corriente >= Ir && corriente < Isd) {
    const relacion = corriente / Ir;
    const t = tr / Math.pow(relacion, 2);
    return t;
  }

  // 🟠 Zona 2: Short-time (retardo para fallas de corta duración)
  // Tiempo fijo
  if (corriente >= Isd && corriente < Ii) {
    return tsd;
  }

  // 🔴 Zona 3: Instantaneous (disparo magnético)
  // Disparo inmediato (~20ms)
  if (corriente >= Ii) {
    return 0.02;
  }

  // 🟢 Zona 0: Normal (sin disparo)
  return Infinity;
}

/**
 * Genera curva completa LSIG para un breaker SQD
 * @param {Object} breaker - Objeto breaker
 * @param {Object} ajustes - Ajustes personalizados (opcional)
 * @param {number} I_min - Corriente mínima para graficar
 * @param {number} I_max - Corriente máxima para graficar
 * @param {number} puntos - Número de puntos a generar
 * @returns {Array} Array de objetos { corriente, tiempo, zona }
 */
function generarCurvaSQD({
  breaker,
  ajustes = {},
  I_min,
  I_max = 50000,
  puntos = 100
}) {
  if (!breaker || !breaker.In) {
    throw new Error('Breaker inválido');
  }

  const I_min_calc = I_min || (breaker.In * 0.5);
  const data = [];

  const step = (I_max - I_min_calc) / puntos;

  for (let i = 0; i <= puntos; i++) {
    const I = I_min_calc + i * step;

    const t = calcularTiempoDisparoSQD({
      corriente: I,
      breaker,
      ajustesPersonalizados: ajustes
    });

    if (isFinite(t) && t > 0 && t < 10000) {
      // Determinar zona
      const { In, ajustes: breakerAjustes } = breaker;
      const Ir = (ajustes.Ir || breakerAjustes.Ir.default) * In;
      const Isd = (ajustes.Isd || breakerAjustes.Isd.default) * Ir;
      const Ii = (ajustes.Ii || breakerAjustes.Ii.default) * In;

      let zona = 'normal';
      if (I >= Ii) zona = 'instantaneo';
      else if (I >= Isd) zona = 'short_time';
      else if (I >= Ir) zona = 'long_time';

      data.push({ 
        corriente: I, 
        tiempo: t,
        zona
      });
    }
  }

  return data;
}

/**
 * Obtiene los puntos de transición entre zonas LSIG
 * @param {Object} breaker - Objeto breaker
 * @param {Object} ajustes - Ajustes personalizados (opcional)
 * @returns {Object} { Ir, Isd, Ii, tiempos: { Ir, Isd, Ii } }
 */
function obtenerPuntosTransicion(breaker, ajustes = {}) {
  const { In, ajustes: ajustesDefault } = breaker;

  const Ir = (ajustes.Ir || ajustesDefault.Ir.default) * In;
  const tr = ajustes.tr || ajustesDefault.tr.default;
  const Isd = (ajustes.Isd || ajustesDefault.Isd.default) * Ir;
  const tsd = ajustes.tsd || ajustesDefault.tsd.default;
  const Ii = (ajustes.Ii || ajustesDefault.Ii.default) * In;

  return {
    Ir,
    Isd,
    Ii,
    tiempos: {
      Ir: tr, // Tiempo en Ir
      Isd: tsd, // Tiempo en Isd
      Ii: 0.02 // Tiempo en Ii
    }
  };
}

/**
 * Verifica si una corriente específica disparará el breaker
 * @param {Object} params - Parámetros de evaluación
 * @returns {Object} { dispara: boolean, tiempo: number, zona: string }
 */
function evaluarDisparoSQD({
  corriente,
  breaker,
  ajustes = {}
}) {
  const tiempo = calcularTiempoDisparoSQD({ corriente, breaker, ajustesPersonalizados: ajustes });
  const dispara = isFinite(tiempo) && tiempo < Infinity;

  const { In, ajustes: ajustesDefault } = breaker;
  const Ir = (ajustes.Ir || ajustesDefault.Ir.default) * In;
  const Isd = (ajustes.Isd || ajustesDefault.Isd.default) * Ir;
  const Ii = (ajustes.Ii || ajustesDefault.Ii.default) * In;

  let zona = 'normal';
  if (corriente >= Ii) zona = 'instantaneo';
  else if (corriente >= Isd) zona = 'short_time';
  else if (corriente >= Ir) zona = 'long_time';

  return {
    dispara,
    tiempo,
    zona
  };
}

module.exports = {
  calcularTiempoDisparoSQD,
  generarCurvaSQD,
  obtenerPuntosTransicion,
  evaluarDisparoSQD
};
