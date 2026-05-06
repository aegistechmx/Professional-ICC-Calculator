// Cable calculation utilities using HTML conductor table data
import { conductoresCu } from '../catalogs/conductores'

// Conductor impedance data from HTML (simplified version)
const CONDUCTORES_IMPEDANCIA = {
  cobre: {
    acero: {
      '14': { R: 8.28, X: 0.187 },
      '12': { R: 5.21, X: 0.176 },
      '10': { R: 3.28, X: 0.164 },
      '8': { R: 2.06, X: 0.154 },
      '6': { R: 1.30, X: 0.143 },
      '4': { R: 0.815, X: 0.134 },
      '2': { R: 0.513, X: 0.125 },
      '1': { R: 0.407, X: 0.120 },
      '1/0': { R: 0.323, X: 0.116 },
      '2/0': { R: 0.256, X: 0.113 },
      '3/0': { R: 0.203, X: 0.110 },
      '4/0': { R: 0.161, X: 0.107 },
      '250': { R: 0.138, X: 0.105 },
      '300': { R: 0.115, X: 0.103 },
      '350': { R: 0.099, X: 0.101 },
      '400': { R: 0.087, X: 0.100 },
      '500': { R: 0.069, X: 0.098 },
      '600': { R: 0.058, X: 0.096 },
      '750': { R: 0.046, X: 0.094 },
      '1000': { R: 0.035, X: 0.092 }
    },
    pvc: {
      '14': { R: 8.28, X: 0.159 },
      '12': { R: 5.21, X: 0.148 },
      '10': { R: 3.28, X: 0.137 },
      '8': { R: 2.06, X: 0.127 },
      '6': { R: 1.30, X: 0.117 },
      '4': { R: 0.815, X: 0.109 },
      '2': { R: 0.513, X: 0.102 },
      '1': { R: 0.407, X: 0.097 },
      '1/0': { R: 0.323, X: 0.094 },
      '2/0': { R: 0.256, X: 0.091 },
      '3/0': { R: 0.203, X: 0.088 },
      '4/0': { R: 0.161, X: 0.086 },
      '250': { R: 0.138, X: 0.084 },
      '300': { R: 0.115, X: 0.082 },
      '350': { R: 0.099, X: 0.081 },
      '400': { R: 0.087, X: 0.080 },
      '500': { R: 0.069, X: 0.078 },
      '600': { R: 0.058, X: 0.077 },
      '750': { R: 0.046, X: 0.075 },
      '1000': { R: 0.035, X: 0.073 }
    }
  },
  aluminio: {
    acero: {},
    pvc: {}
  }
}

// Factor for aluminum (from HTML)
const FACTOR_AL_COBRE = 1.6

// Initialize aluminum impedances
Object.keys(CONDUCTORES_IMPEDANCIA.cobre).forEach(tipo => {
  Object.keys(CONDUCTORES_IMPEDANCIA.cobre[tipo]).forEach(calibre => {
    const d = CONDUCTORES_IMPEDANCIA.cobre[tipo][calibre]
    CONDUCTORES_IMPEDANCIA.aluminio[tipo][calibre] = {
      R: +(d.R * FACTOR_AL_COBRE).toFixed(4),
      X: d.X
    }
  })
})

/**
 * Get cable name based on material, calibre, and conduit
 */
export function getCableName(material, calibre, canalizacion) {
  const matLabel = material === 'cobre' ? 'Cu' : 'Al'
  const condLabel = canalizacion === 'acero' ? 'Acero' : 'PVC'
  return `${matLabel} ${calibre} AWG - ${condLabel}`
}

/**
 * Get cable ampacity from catalog
 */
export function getCableAmpacity(calibre) {
  const conductor = conductoresCu.find(c => c.calibre === calibre)
  return conductor ? conductor.ampacidad : null
}

/**
 * Calculate cable impedance per km
 */
export function getCableImpedance(material, calibre, canalizacion) {
  const mat = material || 'cobre'
  const cond = canalizacion || 'pvc'
  return CONDUCTORES_IMPEDANCIA[mat]?.[cond]?.[calibre] || null
}

/**
 * Calculate voltage drop
 * @param {number} current - Current in Amperes
 * @param {number} length - Length in meters
 * @param {object} impedance - {R, X} impedance per km
 * @param {number} voltage - System voltage in Volts
 * @param {number} paralelo - Number of parallel conductors
 * @returns {object} { voltageDrop, voltageDropPercent, impedanceTotal }
 */
export function calculateVoltageDrop(current, length, impedance, voltage = 480, paralelo = 1) {
  if (!impedance || !current || !length) {
    return { voltageDrop: 0, voltageDropPercent: 0, impedanceTotal: { R: 0, X: 0 } }
  }

  const lengthKm = length / 1000
  const R_total = (impedance.R * lengthKm) / Math.max(1, paralelo)
  const X_total = (impedance.X * lengthKm) / Math.max(1, paralelo)
  const Z_total = Math.sqrt(R_total ** 2 + X_total ** 2)

  // Voltage drop = I * Z (simplified, assuming unity power factor)
  const voltageDrop = current * Z_total
  const voltageDropPercent = (voltageDrop / voltage) * 100

  return {
    voltageDrop,
    voltageDropPercent,
    impedanceTotal: { R: R_total, X: X_total, Z: Z_total }
  }
}

/**
 * Calculate cable results
 * @param {object} edge - Edge data with material, calibre, canalizacion, longitud, paralelo, temp, numConductores
 * @param {number} current - Current in Amperes (optional, defaults to ampacity)
 * @param {number} voltage - System voltage in Volts
 * @returns {object} Cable calculation results
 */
export function calculateCableResults(edge, current = null, voltage = 480) {
  const { material, calibre, canalizacion, longitud, paralelo, temp, numConductores } = edge

  // Get cable data
  const cableName = getCableName(material, calibre, canalizacion)
  const ampacity = getCableAmpacity(calibre)
  const impedance = getCableImpedance(material, calibre, canalizacion)

  // Use provided current or default to ampacity
  const I = current || ampacity || 0

  // Calculate voltage drop
  const voltageDropData = calculateVoltageDrop(
    I,
    longitud || 10,
    impedance,
    voltage,
    paralelo || 1
  )

  // Determine status
  const maxVoltageDrop = 3 // 3% max voltage drop
  const status = voltageDropData.voltageDropPercent <= maxVoltageDrop ? 'OK' : 'Excede límite'

  return {
    cable: cableName,
    ampacity,
    I_corr: I,
    caida: voltageDropData.voltageDropPercent,
    impedance: voltageDropData.impedanceTotal,
    estado: status,
    parameters: {
      material,
      calibre,
      canalizacion,
      longitud,
      paralelo,
      temp,
      numConductores
    }
  }
}
