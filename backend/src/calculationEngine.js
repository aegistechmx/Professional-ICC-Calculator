const { calculateCorrectedAmpacity } = require('./ampacityTable');
const { autoConfigureGfp } = require('./gfpProtection');

// Reemplazar el lookup fallido
function validateAmpacity(calibre, corrienteDiseño, temperatura, agrupamiento) {
    const result = calculateCorrectedAmpacity(calibre, temperatura, agrupamiento);

    if (!result) {
        return {
            success: false,
            error: `Calibre ${calibre} no encontrado en tabla NOM-001`,
            suggestedCalibre: suggestCalibre(corrienteDiseño)
        };
    }

    const cumple = result.corrected >= corrienteDiseño;

    return {
        success: cumple,
        I_corregida: result.corrected,
        I_base: result.base,
        I_terminal: result.terminalLimit,
        F_temp: result.F_temp,
        F_agrup: result.F_agrup,
        message: cumple ? 'OK' : `Requiere calibre mayor (mínimo ${suggestCalibre(corrienteDiseño)})`
    };
}

function suggestCalibre(corrienteRequerida) {
    const calibres = ['1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500'];
    for (const cal of calibres) {
        const amp = getAmpacity(cal);
        if (amp >= corrienteRequerida * 1.25) return cal;
    }

    return '500 o mayor';
}

// Agregar al flujo de cálculo principal
function validateGroundFaultProtection(systemData) {
    const { mainBreakerSize = 0, systemType = 'Yg_solidly', groundFaultCurrent = 0 } = systemData;

    const gfpConfig = autoConfigureGfp(mainBreakerSize, systemType, groundFaultCurrent);

    if (gfpConfig.required && !gfpConfig.sensitivity.sensitive) {
        return {
            status: 'WARNING',
            message: 'NOM 230.95: Se requiere GFP/LSIG',
            config: gfpConfig,
            action: 'Instalar protección de falla a tierra con ajustes recomendados'
        };
    }

    return {
        status: gfpConfig.required ? 'REQUIRED' : 'NOT_REQUIRED',
        config: gfpConfig
    };
}

module.exports = {
    validateAmpacity,
    suggestCalibre,
    validateGroundFaultProtection
};