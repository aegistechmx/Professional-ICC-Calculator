/**
 * Calculation utilities for cortocircuito analysis
 * Specialized calculation functions and algorithms
 */

class CalculoUtils {
    constructor() {
        this.constants = {
            // IEC 60909 constants
            c_max: 1.1,  // Maximum voltage factor
            c_min: 0.95, // Minimum voltage factor

            // Standard frequencies
            f_50: 50,    // 50 Hz
            f_60: 60,    // 60 Hz

            // Correction factors
            k_s: 1.02,   // Symmetrical short-circuit factor
        };
    }

    /**
     * Calculate multiplying factor for asymmetrical current
     * @param {number} R - Resistance (Ω)
     * @param {number} X - Reactance (Ω)
     * @param {number} phases - Number of phases (1, 2, or 3)
     * @returns {number} - Multiplying factor
     */
    calculateMultiplyingFactor(R, X, phases = 3) {
        const tau = X / (2 * Math.PI * 60 * R); // Time constant

        switch (phases) {
            case 1: // Single phase
                return 1 + 0.8 * Math.exp(-3 / tau);
            case 2: // Two phase
                return 1.01 + 0.99 * Math.exp(-2.5 / tau);
            case 3: // Three phase
                return 1.02 + 0.98 * Math.exp(-3 / tau);
            default:
                return 1.0;
        }
    }

    /**
     * Calculate short-circuit power
     * @param {number} V - Voltage (V)
     * @param {number} I_sc - Short-circuit current (A)
     * @returns {number} - Short-circuit power (MVA)
     */
    calculateShortCircuitPower(V, I_sc) {
        return (V * I_sc * Math.sqrt(3)) / 1000000; // MVA
    }

    /**
     * Calculate voltage drop
     * @param {number} I - Current (A)
     * @param {number} Z - Impedance (Ω)
     * @param {number} V_nom - Nominal voltage (V)
     * @returns {number} - Voltage drop percentage
     */
    calculateVoltageDrop(I, Z, V_nom) {
        const V_drop = I * Z;
        return (V_drop / V_nom) * 100;
    }

    /**
     * Calculate cable ampacity correction factor for temperature
     * @param {number} T_ambient - Ambient temperature (°C)
     * @param {number} T_conductor - Conductor temperature (°C)
     * @param {string} material - Conductor material ('Cu' or 'Al')
     * @returns {number} - Correction factor
     */
    calculateTemperatureCorrection(T_ambient, T_conductor = 75, material = 'Cu') {
        // Simplified calculation - in practice this is more complex
        const delta_T = T_conductor - T_ambient;

        if (delta_T <= 0) return 1.0;

        // Temperature coefficient
        const alpha = material === 'Cu' ? 0.00393 : 0.00403;

        return 1 / Math.sqrt(1 + alpha * delta_T);
    }

    /**
     * Calculate conductor resistance at temperature
     * @param {number} R20 - Resistance at 20°C (Ω/km)
     * @param {number} length - Length (m)
     * @param {number} temperature - Temperature (°C)
     * @param {string} material - Conductor material
     * @returns {number} - Resistance at temperature (Ω)
     */
    calculateResistanceAtTemp(R20, length, temperature, material = 'Cu') {
        // Temperature coefficient
        const alpha = material === 'Cu' ? 0.00393 : 0.00403;

        // Resistance at 20°C per meter
        const R20_per_m = R20 / 1000;

        // Corrected resistance
        const R_corrected = R20_per_m * (1 + alpha * (temperature - 20));

        return R_corrected * length;
    }

    /**
     * Calculate conductor reactance
     * @param {number} X_per_km - Reactance per km (Ω/km)
     * @param {number} length - Length (m)
     * @returns {number} - Reactance (Ω)
     */
    calculateReactance(X_per_km, length) {
        return (X_per_km / 1000) * length;
    }

    /**
     * Calculate impedance
     * @param {number} R - Resistance (Ω)
     * @param {number} X - Reactance (Ω)
     * @returns {object} - Impedance {magnitude, angle}
     */
    calculateImpedance(R, X) {
        return {
            magnitude: Math.sqrt(R*R + X*X),
            angle: Math.atan2(X, R) * 180 / Math.PI // degrees
        };
    }

    /**
     * Validate calculation results
     * @param {object} results - Calculation results
     * @returns {object} - Validation result {valid, errors}
     */
    validateResults(results) {
        const errors = [];

        // Check for NaN values
        Object.keys(results).forEach(key => {
            if (typeof results[key] === 'number' && isNaN(results[key])) {
                errors.push(`${key} contiene valor NaN`);
            }
        });

        // Check physical limits
        if (results.I_3F_kA && (results.I_3F_kA < 0 || results.I_3F_kA > 1000)) {
            errors.push(`Corriente trifásica fuera de rango: ${results.I_3F_kA} kA`);
        }

        if (results.V_min && (results.V_min < 0 || results.V_min > 100)) {
            errors.push(`Voltaje mínimo fuera de rango: ${results.V_min}%`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Format calculation results for display
     * @param {object} results - Raw calculation results
     * @returns {object} - Formatted results
     */
    formatResults(results) {
        return {
            I_3F_kA: results.I_3F_kA ? results.I_3F_kA.toFixed(2) : 'N/A',
            I_3F_asym_kA: results.I_3F_asym_kA ? results.I_3F_asym_kA.toFixed(2) : 'N/A',
            MF_3F: results.MF_3F ? results.MF_3F.toFixed(3) : 'N/A',

            I_1F_kA: results.I_1F_kA ? results.I_1F_kA.toFixed(2) : 'N/A',
            I_1F_asym_kA: results.I_1F_asym_kA ? results.I_1F_asym_kA.toFixed(2) : 'N/A',
            MF_1F: results.MF_1F ? results.MF_1F.toFixed(3) : 'N/A',

            I_2F_kA: results.I_2F_kA ? results.I_2F_kA.toFixed(2) : 'N/A',
            I_2F_asym_kA: results.I_2F_asym_kA ? results.I_2F_asym_kA.toFixed(2) : 'N/A',
            MF_2F: results.MF_2F ? results.MF_2F.toFixed(3) : 'N/A',

            V_nom: results.V_nom ? results.V_nom.toFixed(0) : 'N/A',
            V_drop: results.V_drop ? results.V_drop.toFixed(1) : 'N/A',
            V_min: results.V_min ? results.V_min.toFixed(1) : 'N/A',

            Z_total: results.Z_total ? results.Z_total.toFixed(3) : 'N/A',
            R_total: results.R_total ? results.R_total.toFixed(3) : 'N/A',
            X_total: results.X_total ? results.X_total.toFixed(3) : 'N/A',
            angle_deg: results.angle_deg ? results.angle_deg.toFixed(1) : 'N/A'
        };
    }

    /**
     * Generate calculation report
     * @param {object} params - Input parameters
     * @param {object} results - Calculation results
     * @returns {string} - Formatted report
     */
    generateReport(params, results) {
        const formatted = this.formatResults(results);

        let report = '📊 REPORTE DE CÁLCULO DE CORTOCIRCUITO\n';
        report += '=' .repeat(50) + '\n\n';

        report += 'PARAMETROS DE ENTRADA:\n';
        report += `- Tensión: ${params.tension} V\n`;
        report += `- Corriente de carga: ${params.corriente} A\n`;
        report += `- Factor de potencia: ${params.fp}\n`;
        report += `- Longitud del cable: ${params.longitud} m\n`;
        report += `- Calibre: ${params.calibre} kcmil\n`;
        report += `- Temperatura: ${params.temperatura} °C\n\n`;

        report += 'RESULTADOS:\n';
        report += `Corriente Trifásica: ${formatted.I_3F_kA} kA\n`;
        report += `Corriente Trifásica Asimétrica: ${formatted.I_3F_asym_kA} kA\n`;
        report += `Factor Trifásico: ${formatted.MF_3F}\n\n`;

        report += `Corriente Monofásica: ${formatted.I_1F_kA} kA\n`;
        report += `Corriente Monofásica Asimétrica: ${formatted.I_1F_asym_kA} kA\n`;
        report += `Factor Monofásico: ${formatted.MF_1F}\n\n`;

        report += `Voltaje Nominal: ${formatted.V_nom} V\n`;
        report += `Caída de Voltaje: ${formatted.V_drop}%\n`;
        report += `Voltaje Mínimo: ${formatted.V_min}%\n\n`;

        report += 'IMPEDANCIA TOTAL:\n';
        report += `Z: ${formatted.Z_total} Ω\n`;
        report += `R: ${formatted.R_total} Ω\n`;
        report += `X: ${formatted.X_total} Ω\n`;
        report += `Ángulo: ${formatted.angle_deg}°\n`;

        return report;
    }
}

// Export for use in other modules
window.CalculoUtils = CalculoUtils;