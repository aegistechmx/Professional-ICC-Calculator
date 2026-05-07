// backend/src/gfpProtection.js
// NOM-001-SEDE-2012 Artículo 230.95 - Protección de falla a tierra

class GFPProtection {
    constructor(config) {
        this.systemType = config.systemType || 'Yg_solidly'; // Yg_solidly, Delta, Y_resistance
        this.mainBreakerSize = config.mainBreakerSize || 0;
        this.IscMax = config.IscMax || 0;
        this.isRequired = false;
        this.settings = null;
    }

    // Determinar si GFP es requerido según NOM 230.95
    isGfpRequired() {
        // Art. 230.95: Obligatorio para servicios > 150V a tierra, > 1000A
        if (this.systemType === 'Yg_solidly' && this.mainBreakerSize >= 1000) {
            this.isRequired = true;
            return { required: true, reason: "Servicio > 1000A en sistema Yg sólidamente aterrizado" };
        }

        // Art. 215.10: Alimentadores > 1000A
        if (this.mainBreakerSize >= 1000) {
            this.isRequired = true;
            return { required: true, reason: "Alimentador > 1000A" };
        }

        return { required: false, reason: "No aplica según NOM-001" };
    }

    // Calcular ajustes recomendados para GFP/LSIG
    calculateGfpSettings() {
        if (!this.isRequired) return null;

        // Según NEC 230.95 / NOM-001
        const settings = {
            // Pickup: 1200A máximo (o 300A mínimo para sistemas de 480V)
            pickup: Math.min(1200, Math.max(300, this.mainBreakerSize * 0.3)),

            // Time delay: Máx 1 segundo para coordinación
            timeDelay: 0.5,

            // Tipo de protección
            type: 'LSIG', // Long-Time, Short-Time, Instantaneous, Ground

            // Ajustes de tierra según IEEE 1584
            groundFault: {
                enabled: true,
                pickup: Math.min(1200, this.mainBreakerSize * 0.2),
                timeDelay: 0.3,
                accuracy: '±10%'
            },

            // Neutral protection for 4-wire systems
            neutralProtection: {
                enabled: true,
                ratio: 1.0, // 100% del conductor de fase
                pickup: this.mainBreakerSize * 0.5
            }
        };

        this.settings = settings;
        return settings;
    }

    // Verificar sensibilidad de GFP contra falla mínima
    verifySensitivity(minGroundFault, gfpPickup) {
        const ratio = minGroundFault / gfpPickup;

        return {
            sensitive: ratio >= 1.5, // Mínimo 150% según buenas prácticas
            ratio: ratio.toFixed(2),
            message: ratio >= 1.5 ? "SENSIBLE" : "NO SENSIBLE - Ajustar GFP",
            recommendedPickup: ratio < 1.5 ? (minGroundFault / 1.5).toFixed(0) : null
        };
    }

    // Generar recomendación completa
    generateRecommendation(groundFaultCurrent) {
        const requirement = this.isGfpRequired();

        if (!requirement.required) {
            return {
                required: false,
                message: requirement.reason,
                action: "No se requiere GFP/LSIG según NOM-001"
            };
        }

        const settings = this.calculateGfpSettings();
        const sensitivity = this.verifySensitivity(groundFaultCurrent, settings.pickup);

        return {
            required: true,
            standard: "NOM-001-SEDE-2012 Art. 230.95 y 215.10",
            type: "LSIG (Long-Time, Short-Time, Instantaneous, Ground)",
            settings: settings,
            sensitivity: sensitivity,
            recommendation: sensitivity.sensitive ?
                "Configuración OK - GFP funcionará correctamente" :
                `Ajustar GFP pickup a ${sensitivity.recommendedPickup}A para sensibilidad adecuada`,
            installation: {
                sensorType: "Zero-sequence CT or Residual CT",
                location: "Main breaker or service entrance",
                tripUnit: "Electronic trip unit with GFP module"
            }
        };
    }
}

// Función de alto nivel para integrar en el motor de cálculo
function autoConfigureGfp(mainBreakerSize, systemType, groundFaultCurrent) {
    const gfp = new GFPProtection({
        systemType: systemType,
        mainBreakerSize: mainBreakerSize,
        IscMax: groundFaultCurrent
    });

    return gfp.generateRecommendation(groundFaultCurrent);
}

module.exports = { GFPProtection, autoConfigureGfp };