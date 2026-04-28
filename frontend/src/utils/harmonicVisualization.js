/**
 * Harmonic Visualization Utilities
 * Visualizes harmonic analysis results
 */

/**
 * Generate harmonic spectrum data for plotting
 * @param {Object} harmonicAnalysis - Harmonic analysis results
 * @returns {Object} Spectrum visualization data
 */
export function generateHarmonicSpectrum(harmonicAnalysis) {
  const { harmonicCurrents, thd } = harmonicAnalysis;
  
  const spectrum = [];
  
  Object.keys(harmonicCurrents).forEach(order => {
    const orderNum = parseInt(order);
    if (orderNum === 1) return; // Skip fundamental
    
    harmonicCurrents[order].forEach(current => {
      spectrum.push({
        order: orderNum,
        magnitude: current.current,
        angle: current.angle,
        bus: current.bus,
        percentage: (current.current / harmonicAnalysis.fundamentalCurrent) * 100
      });
    });
  });
  
  return spectrum.sort((a, b) => a.order - b.order);
}

/**
 * Generate THD visualization data
 * @param {Object} harmonicAnalysis - Harmonic analysis results
 * @returns {Object} THD visualization data
 */
export function generateTHDVisualization(harmonicAnalysis) {
  const { thd, thdv, voltageDistortion } = harmonicAnalysis;
  
  return {
    thd: thd.toFixed(2) + '%',
    thdv: thdv.toFixed(2) + '%',
    voltageDistortion: voltageDistortion || {},
    compliant: thd < 5 && thdv < 5,
    limit: 5 // IEEE 519 limit
  };
}

/**
 * Generate filter design data
 * @param {Object} filterDesign - Filter design parameters
 * @returns {Object} Filter visualization data
 */
export function generateFilterVisualization(filterDesign) {
  return {
    order: filterDesign.order,
    capacitance: filterDesign.capacitance.toFixed(6) + ' F',
    inductance: filterDesign.inductance.toFixed(6) + ' H',
    resistance: filterDesign.resistance.toFixed(2) + ' Ω',
    tunedFrequency: filterDesign.tunedFrequency.toFixed(1) + ' Hz',
    reactivePower: filterDesign.reactivePower.toFixed(2) + ' MVAR'
  };
}

/**
 * Get harmonic color based on order
 * @param {number} order - Harmonic order
 * @returns {string} Hex color
 */
export function getHarmonicColor(order) {
  const colors = {
    3: '#ff0000',
    5: '#ff6600',
    7: '#ffcc00',
    11: '#ffff00',
    13: '#ccff00',
    17: '#66ff00',
    19: '#00ff00',
    23: '#00ff66',
    25: '#00ffcc'
  };
  return colors[order] || '#999999';
}

/**
 * Generate harmonic heat map
 * @param {Object} harmonicAnalysis - Harmonic analysis results
 * @returns {Object} Heat map data
 */
export function generateHarmonicHeatMap(harmonicAnalysis) {
  const heatMap = [];
  const { harmonicCurrents } = harmonicAnalysis;
  
  Object.keys(harmonicCurrents).forEach(order => {
    const orderNum = parseInt(order);
    harmonicCurrents[order].forEach(current => {
      heatMap.push({
        bus: current.bus,
        harmonic: orderNum,
        magnitude: current.current,
        color: getHarmonicColor(orderNum)
      });
    });
  });
  
  return heatMap;
}
