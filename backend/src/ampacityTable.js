// backend/src/ampacityTable.js
// Tabla 310-16 NOM-001-SEDE-2012 - Conductores de cobre, 75°C

const AMPACITY_TABLE_75C = {
    // Calibre AWG/kcmil: Ampacidad (A)
    '14': 25,
    '12': 30,
    '10': 40,
    '8': 55,
    '6': 75,
    '4': 95,
    '2': 130,
    '1': 150,
    '1/0': 170,
    '2/0': 195,
    '3/0': 225,
    '4/0': 260,        // ← Valor corregido (era 0)
    '250': 290,
    '300': 320,
    '350': 350,
    '400': 380,
    '500': 430,
    '600': 475,
    '750': 520,
    '1000': 590
};

// Límites de terminales NOM 110.14(C) - 75°C
const TERMINAL_LIMITS = {
    '14': 20,
    '12': 25,
    '10': 35,
    '8': 50,
    '6': 65,
    '4': 85,
    '2': 115,
    '1': 130,
    '1/0': 150,
    '2/0': 175,
    '3/0': 200,
    '4/0': 230,        // ← Valor corregido
    '250': 255,
    '300': 285,
    '350': 310,
    '400': 335,
    '500': 380,
    '600': 420,
    '750': 460,
    '1000': 520
};

function getAmpacity(calibre, material = 'cobre', temperatura = 75) {
    if (material.toLowerCase() !== 'cobre') {
        console.warn('Solo soporte para cobre implementado');
    }

    const ampacidad = AMPACITY_TABLE_75C[calibre.toString()];
    if (!ampacidad) {
        console.error(`Calibre no encontrado: ${calibre}`);
        return null;
    }
    return ampacidad;
}

function getTerminalLimit(calibre) {
    const limite = TERMINAL_LIMITS[calibre.toString()];
    if (!limite) {
        console.error(`Límite de terminal no encontrado para calibre: ${calibre}`);
        return null;
    }
    return limite;
}

function calculateCorrectedAmpacity(calibre, temperatura, agrupamiento, paralelos = 1) {
    const baseAmpacity = getAmpacity(calibre);
    if (!baseAmpacity) return null;

    // Factores de corrección por temperatura (Tabla 310-16)
    const tempFactors = { 31: 0.88, 35: 0.82, 40: 0.75, 45: 0.67 };
    const F_temp = tempFactors[Math.round(temperatura)] || 1.0;

    // Factor de agrupamiento (Tabla 310-15)
    const F_agrup = agrupamiento || 1.0;

    const corrected = baseAmpacity * F_temp * F_agrup * paralelos;
    const terminalLimit = getTerminalLimit(calibre);

    return {
        base: baseAmpacity,
        corrected: Math.min(corrected, terminalLimit),
        terminalLimit: terminalLimit,
        F_temp: F_temp,
        F_agrup: F_agrup,
        paralelos: paralelos
    };
}

module.exports = {
    getAmpacity,
    getTerminalLimit,
    calculateCorrectedAmpacity,
    AMPACITY_TABLE_75C,
    TERMINAL_LIMITS
};