/**
 * Voltage color utility for ReactFlow node visualization
 * Industrial standard voltage level coloring
 */

/**
 * Get color based on per-unit voltage level
 * @param {number} Vpu - Voltage in per-unit
 * @returns {string} CSS color code
 */
export function getVoltageColor(Vpu) {
  if (Vpu < 0.9) return '#ff0000';     // Critical (undervoltage)
  if (Vpu < 0.95) return '#ff9900';    // Low voltage
  if (Vpu <= 1.05) return '#00cc00';   // Normal (green)
  if (Vpu <= 1.1) return '#3399ff';    // High voltage
  return '#9900ff';                    // Overvoltage (purple)
}

/**
 * Get voltage status label
 * @param {number} Vpu - Voltage in per-unit
 * @returns {string} Status description
 */
export function getVoltageStatus(Vpu) {
  if (Vpu < 0.9) return 'CRÍTICO';
  if (Vpu < 0.95) return 'BAJO';
  if (Vpu <= 1.05) return 'NORMAL';
  if (Vpu <= 1.1) return 'ALTO';
  return 'SOBREVOLTAJE';
}

/**
 * Get node style based on voltage
 * @param {number} Vpu - Voltage in per-unit
 * @returns {Object} ReactFlow node style
 */
export function getVoltageNodeStyle(Vpu) {
  return {
    background: getVoltageColor(Vpu),
    color: '#fff',
    border: '2px solid #222',
    fontSize: '12px',
    fontWeight: 'bold'
  };
}
