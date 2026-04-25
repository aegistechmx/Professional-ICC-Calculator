/**
 * sqd_real.js - Real SQD Curves from Digitized PDF Data
 * 
 * Carga curvas reales de breakers Schneider/Square D
 * digitalizadas desde PDFs de fabricante.
 * 
 * Usa interpolación log-log para máxima precisión en
 * curvas tiempo-corriente.
 */

const { parseCSV, loadCurvesFromDirectory } = require('../../utils/csvParser');
const { interpolarLogLog } = require('./interpolacion');
const path = require('path');

// Ruta al directorio de curvas
const CURVAS_DIR = path.join(__dirname, '../../../data/sqd_curvas');

// Cache de curvas cargadas
let curvasCache = {};
let curvasCargadas = false;

/**
 * Carga todas las curvas disponibles
 */
function cargarCurvas() {
  if (!curvasCargadas) {
    curvasCache = loadCurvesFromDirectory(CURVAS_DIR);
    curvasCargadas = true;
    console.log(`Curvas SQD cargadas: ${Object.keys(curvasCache).join(', ')}`);
  }
  return curvasCache;
}

/**
 * Obtiene una curva específica por nombre
 * @param {string} nombre - Nombre del archivo sin extensión (ej: 'NSX250_curve')
 * @returns {Array|null} Array de { corriente, tiempo } o null
 */
function obtenerCurva(nombre) {
  cargarCurvas();
  return curvasCache[nombre] || null;
}

/**
 * Calcula tiempo de disparo usando curva real digitalizada
 * @param {string} nombreCurva - Nombre de la curva a usar
 * @param {number} corriente - Corriente en amperes
 * @returns {number} Tiempo de disparo en segundos
 */
function tiempoDisparoReal(nombreCurva, corriente) {
  const curva = obtenerCurva(nombreCurva);
  
  if (!curva || curva.length === 0) {
    throw new Error(`Curva '${nombreCurva}' no encontrada o vacía`);
  }
  
  return interpolarLogLog(curva, corriente);
}

/**
 * Lista todas las curvas disponibles
 * @returns {Array} Lista de nombres de curvas
 */
function listarCurvas() {
  cargarCurvas();
  return Object.keys(curvasCache);
}

/**
 * Carga una curva desde archivo CSV específico
 * @param {string} filePath - Ruta completa al archivo
 * @returns {Array} Curva cargada
 */
function cargarCurvaDesdeArchivo(filePath) {
  return parseCSV(filePath);
}

/**
 * Genera curva completa a partir de puntos digitalizados
 * @param {string} nombreCurva - Nombre de la curva
 * @param {number} I_min - Corriente mínima
 * @param {number} I_max - Corriente máxima
 * @param {number} puntos - Número de puntos (default 100)
 * @returns {Array} Curva generada
 */
function generarCurvaReal(nombreCurva, I_min, I_max, puntos = 100) {
  const curvaBase = obtenerCurva(nombreCurva);
  
  if (!curvaBase) {
    throw new Error(`Curva '${nombreCurva}' no encontrada`);
  }
  
  // Usar los límites de la curva si no se especifican
  const I_min_calc = I_min || curvaBase[0].corriente;
  const I_max_calc = I_max || curvaBase[curvaBase.length - 1].corriente;
  
  const curva = [];
  
  // Distribución logarítmica de puntos
  const logI_min = Math.log10(I_min_calc);
  const logI_max = Math.log10(I_max_calc);
  const step = (logI_max - logI_min) / (puntos - 1);
  
  for (let i = 0; i < puntos; i++) {
    const logI = logI_min + i * step;
    const corriente = Math.pow(10, logI);
    const tiempo = interpolarLogLog(curvaBase, corriente);
    
    curva.push({
      corriente: parseFloat(corriente.toFixed(4)),
      tiempo: parseFloat(tiempo.toFixed(6))
    });
  }
  
  return curva;
}

module.exports = {
  cargarCurvas,
  obtenerCurva,
  tiempoDisparoReal,
  listarCurvas,
  cargarCurvaDesdeArchivo,
  generarCurvaReal,
  CURVAS_DIR
};
