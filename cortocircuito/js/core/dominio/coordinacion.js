/**
 * core/dominio/coordinacion.js — Dominio de Coordinación
 * Módulo de coordinación de protecciones
 */

var DominioCoordinacion = (function() {
    
    /**
     * Coordinar protecciones
     * @param {Object} params - Parámetros de coordinación
     * @returns {Object} Resultado de coordinación
     */
    function coordinarProtecciones(params) {
        var protecciones = params.proteccion;
        var sistema = params.sistema;
        
        // Coordinación básica: verificar que el breaker tenga capacidad suficiente
        var coordinada = true;
        var mensaje = "Coordinación básica OK";
        
        // FIX: Comparación invertida - debe ser Icu >= Isc para cumplir
        if (protecciones.Icu < sistema.Isc) {
            coordinada = false;
            mensaje = "Protección insuficiente para cortocircuito";
        }
        
        return {
            coordinada: coordinada,
            mensaje: mensaje
        };
    }
    
    /**
     * Validar coordinación selectiva
     * @param {Array} protecciones - Lista de protecciones
     * @returns {Object} Resultado de validación
     */
    function validarCoordinacionSelectiva(protecciones) {
        var errores = [];
        
        if (protecciones.length < 2) {
            return {
                ok: true,
                mensaje: "Solo una protección, no requiere coordinación"
            };
        }
        
        // Verificar que las protecciones estén en orden descendente
        for (var i = 0; i < protecciones.length - 1; i++) {
            if (protecciones[i].In <= protecciones[i + 1].In) {
                errores.push("Protecciones no en orden descendente");
            }
        }
        
        return {
            ok: errores.length === 0,
            errores: errores
        };
    }
    
    return {
        coordinarProtecciones: coordinarProtecciones,
        validarCoordinacionSelectiva: validarCoordinacionSelectiva
    };
})();

if (typeof window !== 'undefined') {
    window.DominioCoordinacion = DominioCoordinacion;
}
