/**
 * Core calculation engine for short circuit analysis
 * Contains the main mathematical algorithms
 */

class CoreEngine {
    constructor() {
        this.constants = {
            // Physical constants
            MU0: 4 * Math.PI * 1e-7, // Permeability of free space
            EPSILON0: 8.854e-12,    // Permittivity of free space

            // Standard temperatures
            T_BASE: 20,  // Base temperature (°C)
            T_COPPER: 234.5,  // Temperature coefficient for copper
            T_ALUMINUM: 228,   // Temperature coefficient for aluminum
        };
    }

    /**
     * Calculate short circuit current using IEC 60909 method
     * @param {object} params - System parameters
     * @returns {object} - Calculation results
     */
    calculateShortCircuit(params) {
        try {
            // Extract parameters
            const {
                tension,      // System voltage (V)
                corriente,    // Load current (A)
                fp,          // Power factor
                longitud,    // Cable length (m)
                calibre,     // Cable gauge
                temperatura  // Ambient temperature (°C)
            } = params;

            // Get conductor data
            const conductorData = this.getConductorData(calibre);
            if (!conductorData) {
                throw new Error(`Datos del conductor no encontrados para calibre: ${calibre}`);
            }

            // Calculate resistance and reactance
            const R = this.calculateResistance(conductorData, longitud, temperatura);
            const X = this.calculateReactance(conductorData, longitud);

            // Calculate short circuit currents
            const results = this.calculateCurrents(tension, corriente, fp, R, X);

            return {
                success: true,
                data: {
                    ...results,
                    conductor: conductorData,
                    parameters: {
                        R_total: R,
                        X_total: X,
                        Z_total: Math.sqrt(R*R + X*X)
                    }
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get conductor electrical data
     * @param {string} calibre - Conductor gauge
     * @returns {object} - Conductor data
     */
    getConductorData(calibre) {
        // Simplified conductor database
        // In a real implementation, this would be a comprehensive database
        const conductors = {
            '350': {
                area: 177.3,  // mm²
                resistance: 0.052,  // Ω/km at 20°C
                reactance: 0.082,   // Ω/km
                material: 'Cu'
            },
            '4/0': {
                area: 107.2,
                resistance: 0.082,
                reactance: 0.091,
                material: 'Cu'
            },
            '3/0': {
                area: 85.0,
                resistance: 0.103,
                reactance: 0.095,
                material: 'Cu'
            },
            '12': {
                area: 3.31,
                resistance: 5.21,
                reactance: 0.122,
                material: 'Cu'
            }
        };

        return conductors[calibre] || null;
    }

    /**
     * Calculate conductor resistance at given temperature
     * @param {object} conductor - Conductor data
     * @param {number} length - Length in meters
     * @param {number} temperature - Temperature in °C
     * @returns {number} - Resistance in ohms
     */
    calculateResistance(conductor, length, temperature) {
        // Base resistance at 20°C per km
        const R20_per_km = conductor.resistance;

        // Temperature correction factor
        const alpha = conductor.material === 'Cu' ? 1/this.constants.T_COPPER : 1/this.constants.T_ALUMINUM;
        const correction = 1 + alpha * (temperature - this.constants.T_BASE);

        // Resistance per meter
        const R_per_m = (R20_per_km * correction) / 1000;

        return R_per_m * length;
    }

    /**
     * Calculate conductor reactance
     * @param {object} conductor - Conductor data
     * @param {number} length - Length in meters
     * @returns {number} - Reactance in ohms
     */
    calculateReactance(conductor, length) {
        // Base reactance per km
        const X_per_km = conductor.reactance;

        // Reactance per meter
        const X_per_m = X_per_km / 1000;

        return X_per_m * length;
    }

    /**
     * Calculate short circuit currents
     * @param {number} V - System voltage (V)
     * @param {number} I_load - Load current (A)
     * @param {number} pf - Power factor
     * @param {number} R - Resistance (Ω)
     * @param {number} X - Reactance (Ω)
     * @returns {object} - Current calculations
     */
    calculateCurrents(V, I_load, pf, R, X) {
        // System impedance
        const Z = Math.sqrt(R*R + X*X);
        const angle = Math.atan2(X, R);

        // For three-phase systems, use line-to-line voltage
        const V_ll = V * Math.sqrt(3); // Line-to-line voltage

        // Calculate symmetrical short circuit current
        const I_3F = V_ll / (Math.sqrt(3) * Z);

        // Asymmetrical current (considering DC component)
        // Simplified calculation - in practice this is more complex
        const MF_3F = 1.02 + 0.98 * Math.exp(-3 * R/X); // Multiplying factor
        const I_3F_asym = I_3F * MF_3F;

        // Single-phase short circuit current
        const I_1F = V / Z;
        const MF_1F = 1.0 + 0.8 * Math.exp(-3 * R/X);
        const I_1F_asym = I_1F * MF_1F;

        // Two-phase short circuit current
        const I_2F = V_ll / (2 * Z);
        const MF_2F = 1.01 + 0.99 * Math.exp(-2.5 * R/X);
        const I_2F_asym = I_2F * MF_2F;

        // Voltage drop calculation
        const V_drop_percent = (I_load * Z / V) * 100;
        const V_min_percent = Math.max(0, 100 - V_drop_percent);

        return {
            I_3F_kA: I_3F / 1000,
            I_3F_asym_kA: I_3F_asym / 1000,
            MF_3F: MF_3F,

            I_1F_kA: I_1F / 1000,
            I_1F_asym_kA: I_1F_asym / 1000,
            MF_1F: MF_1F,

            I_2F_kA: I_2F / 1000,
            I_2F_asym_kA: I_2F_asym / 1000,
            MF_2F: MF_2F,

            V_nom: V,
            V_drop: V_drop_percent,
            V_min: V_min_percent,

            Z_total: Z,
            R_total: R,
            X_total: X,
            angle_deg: (angle * 180 / Math.PI)
        };
    }

    /**
     * Validate calculation parameters
     * @param {object} params - Parameters to validate
     * @returns {boolean} - Whether parameters are valid
     */
    validateParameters(params) {
        const required = ['tension', 'corriente', 'fp', 'longitud', 'calibre', 'temperatura'];

        for (const param of required) {
            if (params[param] === undefined || params[param] === null) {
                throw new Error(`Parámetro requerido faltante: ${param}`);
            }
        }

        // Range validation
        if (params.tension < 120 || params.tension > 500000) {
            throw new Error(`Tensión fuera de rango: ${params.tension}V (120-500000V)`);
        }

        if (params.corriente <= 0 || params.corriente > 100000) {
            throw new Error(`Corriente fuera de rango: ${params.corriente}A (0.1-100000A)`);
        }

        if (params.fp < 0.1 || params.fp > 1.0) {
            throw new Error(`Factor de potencia fuera de rango: ${params.fp} (0.1-1.0)`);
        }

        return true;
    }
}

// Export for use in other modules
window.CoreEngine = CoreEngine;