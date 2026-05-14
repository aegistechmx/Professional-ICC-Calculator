/**
 * Módulo de unidades - Sistema profesional de conversión
 * Regla de oro: SIEMPRE calcular en unidades base SI (A, V, ohm, VA)
 * Convertir solo para display/UI
 */

// Configuración de unidades de display
const Units = {
    current: "kA",   // "A" | "kA"
    voltage: "V",    // "V" | "kV"
    impedance: "ohm" // solo referencia visual
};

// Funciones de conversión
const Convert = {
    // Corriente
    A_to_kA: function(I) {
        return I / 1000;
    },
    
    kA_to_A: function(I) {
        return I * 1000;
    },
    
    // Voltaje
    V_to_kV: function(V) {
        return V / 1000;
    },
    
    kV_to_V: function(V) {
        return V * 1000;
    },
    
    // Auto (según config)
    currentToDisplay: function(I_A) {
        return Units.current === "kA" ? I_A / 1000 : I_A;
    },
    
    currentFromDisplay: function(I_display) {
        return Units.current === "kA" ? I_display * 1000 : I_display;
    },
    
    voltageToDisplay: function(V_V) {
        return Units.voltage === "kV" ? V_V / 1000 : V_V;
    },
    
    voltageFromDisplay: function(V_display) {
        return Units.voltage === "kV" ? V_display * 1000 : V_display;
    }
};

if (typeof window !== 'undefined') {
    window.Convert = Convert;
    window.Units = Units;
}

// Formateador universal de corriente
function formatCurrent(I_A) {
    const value = Convert.currentToDisplay(I_A);
    return value.toFixed(2) + " " + Units.current;
}

// Formateador universal de voltaje
function formatVoltage(V_V) {
    const value = Convert.voltageToDisplay(V_V);
    return value.toFixed(0) + " " + Units.voltage;
}

// Auto-switch de unidades (bonus PRO)
function autoUnitCurrent(I_A) {
    if (I_A >= 1000) {
        return (I_A / 1000).toFixed(2) + " kA";
    }
    return I_A.toFixed(0) + " A";
}

// Formateo completo del sistema (línea profesional)
function formatSystem(isc_A, V, V_prim, iscMT) {
    return "BT: " + formatCurrent(isc_A) + " @ " + formatVoltage(V) + " | MT: " + iscMT + " kA @ " + (V_prim / 1000).toFixed(1) + " kV";
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Units, Convert, formatCurrent, formatVoltage, autoUnitCurrent, formatSystem };
} else {
    window.Units = Units;
    window.Convert = Convert;
    window.formatCurrent = formatCurrent;
    window.formatVoltage = formatVoltage;
    window.autoUnitCurrent = autoUnitCurrent;
    window.formatSystem = formatSystem;
}
