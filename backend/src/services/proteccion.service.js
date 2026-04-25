const tcc = require('../core/protecciones/tcc');
const coord = require('../core/protecciones/coordinacion');
const selector = require('../core/protecciones/selector');
const sqdCurve = require('../core/protecciones/sqd_curve');
const sqdBreakers = require('../data/sqd_breakers');

/**
 * Analiza protección individual (TCC curve)
 */
exports.analizarTCC = async (data) => {
  const { pickup, tms, tipo, I_min, I_max, puntos } = data;

  const curva = tcc.generarCurva({
    pickup,
    tms,
    tipo,
    I_min,
    I_max,
    puntos
  });

  return {
    curva,
    parametros: { pickup, tms, tipo }
  };
};

/**
 * Evalúa disparo para una corriente específica
 */
exports.evaluarDisparo = async (data) => {
  const { corriente, pickup, tms, tipo, tiempoMaximo } = data;

  const resultado = tcc.evaluarDisparo({
    corriente,
    pickup,
    tms,
    tipo,
    tiempoMaximo
  });

  return resultado;
};

/**
 * Analiza coordinación entre dos dispositivos
 */
exports.analizarCoordinacion = async (data) => {
  const { dispositivo1, dispositivo2, margen } = data;

  const curva1 = tcc.generarCurva(dispositivo1);
  const curva2 = tcc.generarCurva(dispositivo2);

  const resultado = coord.evaluarCoordinacion({
    curva1,
    curva2,
    margen
  });

  const reporte = coord.generarReporteCoordinacion(resultado);

  return {
    curva1,
    curva2,
    coordinacion: resultado,
    reporte
  };
};

/**
 * Analiza coordinación en cascada (múltiples dispositivos)
 */
exports.analizarCoordinacionCascada = async (data) => {
  const { dispositivos, margen } = data;

  const curvas = dispositivos.map(d => tcc.generarCurva(d));

  const resultado = coord.evaluarCoordinacionCascada({
    curvas,
    margen
  });

  return {
    dispositivos: dispositivos.length,
    curvas,
    coordinacion: resultado
  };
};

/**
 * Obtiene constantes de curva IEC
 */
exports.getConstantesCurva = async (data) => {
  const { tipo } = data;
  return tcc.getConstantesCurva(tipo);
};

/**
 * Genera curva TCC completa
 */
exports.generarCurva = async (data) => {
  const curva = tcc.generarCurva(data);
  return curva;
};

/**
 * Selecciona protección SQD óptima
 */
exports.seleccionarSQD = async (data) => {
  const { icc_total, corriente_carga, categoria, polos } = data;

  const resultado = selector.seleccionarSQD({
    icc_total,
    corriente_carga,
    categoria,
    polos
  });

  return resultado;
};

/**
 * Genera curva LSIG para breaker SQD
 */
exports.generarCurvaSQD = async (data) => {
  const { breaker, ajustes, I_min, I_max, puntos } = data;

  const curva = sqdCurve.generarCurvaSQD({
    breaker,
    ajustes,
    I_min,
    I_max,
    puntos
  });

  return curva;
};

/**
 * Evalúa disparo para breaker SQD
 */
exports.evaluarDisparoSQD = async (data) => {
  const { corriente, breaker, ajustes } = data;

  const resultado = sqdCurve.evaluarDisparoSQD({
    corriente,
    breaker,
    ajustes
  });

  return resultado;
};

/**
 * Coordinación entre protecciones SQD
 */
exports.coordinarProteccionesSQD = async (data) => {
  const { downstream, upstream, margen } = data;

  const resultado = selector.coordinarProteccionesSQD({
    downstream,
    upstream,
    margen
  });

  return resultado;
};

/**
 * Selección y coordinación en cascada
 */
exports.seleccionarCoordinacionCascada = async (data) => {
  const { niveles, margen } = data;

  const resultado = selector.seleccionarCoordinacionCascada({
    niveles,
    margen
  });

  return resultado;
};

/**
 * Obtiene lista de breakers SQD disponibles
 */
exports.getBreakersSQD = async () => {
  return sqdBreakers;
};
