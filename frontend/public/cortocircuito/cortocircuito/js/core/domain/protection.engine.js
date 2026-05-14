/**
 * core/domain/protection.engine.js — Motor de Protección
 * Arquitectura tipo ETAP/SKM: validación de protección eléctrica
 */

var ProtectionEngine = (function() {
    
    /**
     * Validar protección del equipo
     * @param {NodoModel.Nodo} nodo - Nodo del sistema
     * @param {Object} falla - Resultado de ShortcircuitEngine.calcularFalla
     * @param {Object} equipo - Datos del equipo (breaker, fusible)
     * @returns {Object} Resultado de validación
     */
    function validarProteccion(nodo, falla, equipo) {
        if (!equipo) {
            return {
                status: "SIN_EQUIPO",
                errores: ["No hay equipo de protección especificado"]
            };
        }
        
        var errores = [];
        var warnings = [];
        
        // 1. Validar capacidad interruptiva
        var capacidadInterruptiva = ShortcircuitEngine.validarCapacidadInterruptiva(falla, equipo);
        if (!capacidadInterruptiva.cumple) {
            errores.push("Capacidad interruptiva insuficiente: Icu=" + capacidadInterruptiva.Icu + "kA < Icc=" + capacidadInterruptiva.Icc.toFixed(2) + "kA");
        }
        
        // 2. Validar protección contra falla a tierra (NOM 230.95)
        if (falla.faseTierra && falla.faseTierra.I_ft > 0) {
            var iDisparo = equipo.iDisparo || 0;
            var If_tierra = falla.faseTierra.I_ft;
            
            if (If_tierra < iDisparo) {
                errores.push("Falla a tierra no detectada: If_tierra=" + If_tierra.toFixed(1) + "A < iDisparo=" + iDisparo + "A");
            }
            
            // Validar GFP obligatorio para Yg sólido
            var tipoAterrizaje = nodo.tipoAterrizaje || 'solido';
            if (tipoAterrizaje === 'yg_solido' && !equipo.tieneGFP) {
                errores.push("NOM 230.95: Sistema Yg sólido requiere GFP/LSIG");
            }
        }
        
        // 3. Validar coordinación con carga
        if (equipo.cap && nodo.I_carga) {
            var margenCarga = (equipo.cap - nodo.I_carga) / nodo.I_carga * 100;
            if (margenCarga < 20) {
                warnings.push("Margen entre breaker y carga bajo: " + margenCarga.toFixed(1) + "%");
            }
        }
        
        return {
            status: errores.length > 0 ? "FAIL" : (warnings.length > 0 ? "WARNING" : "OK"),
            errores: errores,
            warnings: warnings,
            capacidadInterruptiva: capacidadInterruptiva
        };
    }
    
    /**
     * Validar protección contra sobrecarga
     * @param {number} I_carga - Corriente de carga
     * @param {number} I_proteccion - Corriente de protección del equipo
     * @param {boolean} esContinua - Si la carga es continua
     * @returns {Object} { cumple, margen }
     */
    function validarSobrecarga(I_carga, I_proteccion, esContinua) {
        var Fcc = esContinua ? 1.25 : 1.0;
        var I_diseño = I_carga * Fcc;
        
        var margen = I_proteccion - I_diseño;
        var cumple = I_proteccion >= I_diseño;
        
        return {
            cumple: cumple,
            I_diseño: I_diseño,
            I_proteccion: I_proteccion,
            margen: margen,
            porcentajeMargen: I_proteccion > 0 ? (margen / I_proteccion * 100) : 0
        };
    }
    
    /**
     * Validar sensibilidad a falla a tierra
     * @param {number} If_tierra - Corriente de falla a tierra
     * @param {Object} equipo - Datos del equipo
     * @returns {Object} { sensible, margen }
     */
    function validarSensibilidadTierra(If_tierra, equipo) {
        if (!equipo || !equipo.iDisparo) {
            return {
                sensible: false,
                razon: "Equipo sin iDisparo especificado"
            };
        }
        
        var margen = If_tierra - equipo.iDisparo;
        var sensible = If_tierra >= equipo.iDisparo;
        
        return {
            sensible: sensible,
            If_tierra: If_tierra,
            iDisparo: equipo.iDisparo,
            margen: margen,
            porcentajeMargen: equipo.iDisparo > 0 ? (margen / equipo.iDisparo * 100) : 0
        };
    }
    
    return {
        validarProteccion: validarProteccion,
        validarSobrecarga: validarSobrecarga,
        validarSensibilidadTierra: validarSensibilidadTierra
    };
})();

if (typeof window !== 'undefined') {
    window.ProtectionEngine = ProtectionEngine;
}
