/**
 * catalogo_conductores_nom.js — Catálogo NOM de Conductores
 * Alineado a NOM-001-SEDE-2012 (Tablas tipo 310)
 * Enfocado a BT 600 V: THHN / XHHW, cobre y aluminio
 */

var CatalogoConductoresNOM = (function() {
    
    /**
     * Catálogo de conductores de cobre (75°C, terminal 75°C)
     * Valores NOM/NEC para terminal 75°C (la que manda en tableros)
     */
    var catalogoCobre = [
        { calibre: "14", ampacidad: 20, area_mm2: 2.08 },
        { calibre: "12", ampacidad: 25, area_mm2: 3.31 },
        { calibre: "10", ampacidad: 35, area_mm2: 5.26 },
        { calibre: "8", ampacidad: 50, area_mm2: 8.37 },
        { calibre: "6", ampacidad: 65, area_mm2: 13.3 },
        { calibre: "4", ampacidad: 85, area_mm2: 21.2 },
        { calibre: "3", ampacidad: 100, area_mm2: 26.7 },
        { calibre: "2", ampacidad: 115, area_mm2: 33.6 },
        { calibre: "1", ampacidad: 130, area_mm2: 42.4 },
        { calibre: "1/0", ampacidad: 150, area_mm2: 53.5 },
        { calibre: "2/0", ampacidad: 175, area_mm2: 67.4 },
        { calibre: "3/0", ampacidad: 200, area_mm2: 85.0 },
        { calibre: "4/0", ampacidad: 230, area_mm2: 107.2 },
        { calibre: "250", ampacidad: 255, area_mm2: 126.7 },
        { calibre: "300", ampacidad: 285, area_mm2: 152.0 },
        { calibre: "350", ampacidad: 310, area_mm2: 177.3 },
        { calibre: "400", ampacidad: 335, area_mm2: 202.7 },
        { calibre: "500", ampacidad: 380, area_mm2: 253.4 },
        { calibre: "600", ampacidad: 420, area_mm2: 304.0 },
        { calibre: "700", ampacity: 460, area_mm2: 354.7 },
        { calibre: "750", ampacidad: 475, area_mm2: 380.0 },
        { calibre: "800", ampacidad: 490, area_mm2: 405.4 },
        { calibre: "900", ampacidad: 520, area_mm2: 456.0 },
        { calibre: "1000", ampacidad: 545, area_mm2: 506.7 }
    ];

    /**
     * Catálogo de conductores de aluminio (75°C, terminal 75°C)
     */
    var catalogoAluminio = [
        { calibre: "12", ampacidad: 20, area_mm2: 3.31 },
        { calibre: "10", ampacidad: 30, area_mm2: 5.26 },
        { calibre: "8", ampacidad: 40, area_mm2: 8.37 },
        { calibre: "6", ampacidad: 50, area_mm2: 13.3 },
        { calibre: "4", ampacidad: 65, area_mm2: 21.2 },
        { calibre: "3", ampacidad: 75, area_mm2: 26.7 },
        { calibre: "2", ampacidad: 90, area_mm2: 33.6 },
        { calibre: "1", ampacidad: 100, area_mm2: 42.4 },
        { calibre: "1/0", ampacidad: 120, area_mm2: 53.5 },
        { calibre: "2/0", ampacidad: 135, area_mm2: 67.4 },
        { calibre: "3/0", ampacidad: 155, area_mm2: 85.0 },
        { calibre: "4/0", ampacidad: 180, area_mm2: 107.2 },
        { calibre: "250", ampacidad: 205, area_mm2: 126.7 },
        { calibre: "300", ampacidad: 230, area_mm2: 152.0 },
        { calibre: "350", ampacidad: 250, area_mm2: 177.3 },
        { calibre: "400", ampacidad: 270, area_mm2: 202.7 },
        { calibre: "500", ampacidad: 310, area_mm2: 253.4 },
        { calibre: "600", ampacidad: 340, area_mm2: 304.0 },
        { calibre: "700", ampacidad: 375, area_mm2: 354.7 },
        { calibre: "750", ampacidad: 385, area_mm2: 380.0 },
        { calibre: "800", ampacidad: 395, area_mm2: 405.4 },
        { calibre: "900", ampacidad: 425, area_mm2: 456.0 },
        { calibre: "1000", ampacidad: 445, area_mm2: 506.7 }
    ];

    /**
     * Factores de corrección por temperatura ambiente (NOM típico)
     * Para conductores 75°C
     */
    var factoresTemperatura = {
        21: 1.08,
        26: 1.04,
        30: 1.00,
        31: 0.96,
        35: 0.94,
        40: 0.88,
        45: 0.82,
        50: 0.75,
        55: 0.67,
        60: 0.58
    };

    /**
     * Factor de agrupamiento por número de conductores en canalización
     * @param {number} n - Número de conductores
     * @returns {number} Factor de agrupamiento
     */
    function factorAgrupamiento(n) {
        if (n <= 3) return 1.0;
        if (n <= 6) return 0.80;
        if (n <= 9) return 0.70;
        if (n <= 20) return 0.50;
        return 0.45;
    }

    /**
     * Calcular ampacidad completa con factores de corrección
     * Regla crítica: I_final = min(ampacidad_corregida, limite_terminal)
     * @param {Object} cable - Conductor seleccionado
     * @param {Object} condiciones - { tempAmbiente, nConductores, terminal, sistemaBalanceado }
     * @returns {Object} { base, f_temp, f_agr, corregida, final, violacionTerminal }
     */
    function calcularAmpacidad(cable, condiciones) {
        var base = cable.ampacidad;
        
        // Factor temperatura
        var tempAmbiente = condiciones.tempAmbiente || 30;
        var f_temp = factoresTemperatura[tempAmbiente] || 1.0;
        
        // Factor agrupamiento
        var nConductores = condiciones.nConductores || 1;
        var f_agr = factorAgrupamiento(nConductores);
        
        // Si sistema balanceado, neutro no cuenta
        if (condiciones.sistemaBalanceado && nConductores > 3) {
            nConductores = nConductores - 1;
            f_agr = factorAgrupamiento(nConductores);
        }
        
        // Ampacidad corregida
        var corregida = base * f_temp * f_agr;
        
        // Límite de terminal (75°C es el estándar en tableros)
        var limiteTerminal = condiciones.terminal || 999999;
        
        // Regla crítica NOM: I_final no puede exceder terminal
        var final = Math.min(corregida, limiteTerminal);
        var violacionTerminal = corregida > limiteTerminal;
        
        return {
            base: base,
            f_temp: f_temp,
            f_agr: f_agr,
            corregida: corregida,
            final: final,
            violacionTerminal: violacionTerminal,
            margen: ((final - (condiciones.I_diseño || 0)) / (condiciones.I_diseño || 1)) * 100
        };
    }

    /**
     * Seleccionar cable automáticamente según I_diseño
     * @param {number} I_diseño - Corriente de diseño (A)
     * @param {string} material - "Cu" o "Al"
     * @param {Object} condiciones - Condiciones de instalación
     * @returns {Object|null} Cable seleccionado con ampacidad calculada
     */
    function seleccionarCable(I_diseño, material, condiciones) {
        var catalogo = material === "Al" ? catalogoAluminio : catalogoCobre;
        
        for (var i = 0; i < catalogo.length; i++) {
            var cable = catalogo[i];
            var amp = calcularAmpacidad(cable, condiciones);
            
            if (amp.final >= I_diseño) {
                return {
                    material: material,
                    calibre: cable.calibre,
                    area_mm2: cable.area_mm2,
                    ampacidad: amp
                };
            }
        }
        
        return null;
    }

    /**
     * Calcular ampacidad con paralelos
     * @param {Object} cable - Conductor base
     * @param {number} nParalelos - Número de conductores en paralelo
     * @param {Object} condiciones - Condiciones de instalación
     * @returns {Object} Ampacidad total con paralelos
     */
    function ampacidadParalelo(cable, nParalelos, condiciones) {
        var amp = calcularAmpacidad(cable, condiciones);
        var total = amp.final * nParalelos;
        
        return {
            base: amp.base,
            f_temp: amp.f_temp,
            f_agr: amp.f_agr,
            corregida: amp.corregida,
            finalPorConductor: amp.final,
            finalTotal: total,
            violacionTerminal: amp.violacionTerminal,
            margen: ((total - (condiciones.I_diseño || 0)) / (condiciones.I_diseño || 1)) * 100
        };
    }

    /**
     * Validar diseño de conductor
     * @param {Object} cable - Conductor seleccionado
     * @param {Object} condiciones - Condiciones de instalación
     * @returns {Object} { ok, errores, warnings }
     */
    function validarCable(cable, condiciones) {
        var errores = [];
        var warnings = [];
        var amp = calcularAmpacidad(cable, condiciones);
        var I_diseño = condiciones.I_diseño || 0;
        
        // Validación 1: Subdimensionado
        if (amp.final < I_diseño) {
            errores.push({
                tipo: "SUBDIMENSIONADO",
                mensaje: "Ampacidad insuficiente: " + amp.final.toFixed(1) + "A < " + I_diseño + "A",
                severidad: "CRITICA"
            });
        }
        
        // Validación 2: Sobre terminal
        if (amp.violacionTerminal) {
            errores.push({
                tipo: "TERMINAL",
                mensaje: "Excede límite terminal: " + amp.corregida.toFixed(1) + "A > " + condiciones.terminal + "A (Art. 110.14C)",
                severidad: "CRITICA"
            });
        }
        
        // Validación 3: Margen bajo
        if (amp.margen < 10 && amp.margen >= 0) {
            warnings.push({
                tipo: "MARGEN_BAJO",
                mensaje: "Margen térmico bajo: " + amp.margen.toFixed(1) + "% (<10%)",
                severidad: "MEDIA"
            });
        }
        
        // Validación 4: Paralelos excesivos
        if (condiciones.nParalelos > 4) {
            warnings.push({
                tipo: "PARALELOS",
                mensaje: "Paralelos excesivos: " + condiciones.nParalelos + " (>4)",
                severidad: "MEDIA"
            });
        }
        
        // Validación 5: Caída de tensión
        if (condiciones.longitud && condiciones.I_carga) {
            var caida = calcularCaidaTension(cable, condiciones);
            if (caida.porcentaje > 5) {
                errores.push({
                    tipo: "CAIDA_TENSION",
                    mensaje: "Caída de tensión excesiva: " + caida.porcentaje.toFixed(1) + "% (>5%)",
                    severidad: "ALTA"
                });
            } else if (caida.porcentaje > 3) {
                warnings.push({
                    tipo: "CAIDA_TENSION",
                    mensaje: "Caída de tensión elevada: " + caida.porcentaje.toFixed(1) + "% (>3%)",
                    severidad: "MEDIA"
                });
            }
        }
        
        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings,
            ampacidad: amp
        };
    }

    /**
     * Calcular caída de tensión
     * VD = (2 * L * I * R) / 1000
     * @param {Object} cable - Conductor
     * @param {Object} condiciones - { longitud, I_carga, FP }
     * @returns {Object} { voltios, porcentaje }
     */
    function calcularCaidaTension(cable, condiciones) {
        var longitud = condiciones.longitud || 0;
        var I_carga = condiciones.I_carga || 0;
        var FP = condiciones.FP || 0.9;
        var voltaje = condiciones.voltaje || 480;
        
        // Resistencia aproximada (Ω/km) para cobre a 75°C
        var R = 0.0212 / cable.area_mm2; // Ω/m
        
        var caidaVoltios = (2 * longitud * I_carga * R) / FP;
        var porcentaje = (caidaVoltios / voltaje) * 100;
        
        return {
            voltios: caidaVoltios,
            porcentaje: porcentaje
        };
    }

    /**
     * Obtener catálogo completo
     * @param {string} material - "Cu" o "Al"
     * @returns {Array} Catálogo de conductores
     */
    function obtenerCatalogo(material) {
        return material === "Al" ? catalogoAluminio : catalogoCobre;
    }

    /**
     * Buscar conductor por calibre
     * @param {string} calibre - Calibre a buscar
     * @param {string} material - "Cu" o "Al"
     * @returns {Object|null} Conductor encontrado
     */
    function buscarPorCalibre(calibre, material) {
        var catalogo = material === "Al" ? catalogoAluminio : catalogoCobre;
        return catalogo.find(function(c) { return c.calibre === calibre; }) || null;
    }

    return {
        catalogoCobre: catalogoCobre,
        catalogoAluminio: catalogoAluminio,
        factoresTemperatura: factoresTemperatura,
        factorAgrupamiento: factorAgrupamiento,
        calcularAmpacidad: calcularAmpacidad,
        seleccionarCable: seleccionarCable,
        ampacidadParalelo: ampacidadParalelo,
        validarCable: validarCable,
        calcularCaidaTension: calcularCaidaTension,
        obtenerCatalogo: obtenerCatalogo,
        buscarPorCalibre: buscarPorCalibre
    };
})();

if (typeof window !== 'undefined') {
    window.CatalogoConductoresNOM = CatalogoConductoresNOM;
}
