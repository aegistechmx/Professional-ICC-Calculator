/**
 * validator.js — Validador duro con asserts estructurados
 * No más silencios: falla explícitamente con tracking
 */

var DebugValidator = (function() {
    
    /**
     * Assert con logging estructurado
     * @param {boolean} condition - Condición a validar
     * @param {string} message - Mensaje de error si falla
     * @param {Object} data - Datos adicionales para debugging
     * @throws {Error} Si la condición es falsa
     */
    function assert(condition, message, data) {
        if (!condition) {
            DebugLogger.logStep("ASSERT_FAIL", {
                message: message,
                data: data ? JSON.parse(JSON.stringify(data)) : {}
            }, "error");
            
            throw new Error(message);
        }
    }
    
    /**
     * Assert que un valor no es null/undefined
     * @param {*} value - Valor a validar
     * @param {string} name - Nombre del valor para mensaje
     */
    function assertNotNull(value, name) {
        assert(value !== null && value !== undefined, name + " no debe ser null/undefined", { value: value });
    }
    
    /**
     * Assert que un valor es mayor que cero
     * @param {number} value - Valor a validar
     * @param {string} name - Nombre del valor para mensaje
     */
    function assertPositive(value, name) {
        assert(value > 0, name + " debe ser mayor que cero", { value: value });
    }
    
    /**
     * Assert que un valor es un número válido
     * @param {*} value - Valor a validar
     * @param {string} name - Nombre del valor para mensaje
     */
    function assertNumber(value, name) {
        assert(typeof value === 'number' && !isNaN(value), name + " debe ser un número válido", { value: value });
    }
    
    /**
     * Assert que un objeto tiene una propiedad
     * @param {Object} obj - Objeto a validar
     * @param {string} prop - Propiedad requerida
     */
    function assertHasProperty(obj, prop) {
        assert(obj && obj.hasOwnProperty(prop), "Objeto debe tener propiedad: " + prop, { obj: obj });
    }
    
    /**
     * Assert que un array no está vacío
     * @param {Array} arr - Array a validar
     * @param {string} name - Nombre del array para mensaje
     */
    function assertNotEmpty(arr, name) {
        assert(Array.isArray(arr) && arr.length > 0, name + " no debe estar vacío", { length: arr ? arr.length : 0 });
    }
    
    /**
     * Assert que un valor está en rango
     * @param {number} value - Valor a validar
     * @param {number} min - Mínimo inclusive
     * @param {number} max - Máximo inclusive
     * @param {string} name - Nombre del valor para mensaje
     */
    function assertInRange(value, min, max, name) {
        assert(value >= min && value <= max, name + " debe estar en rango [" + min + ", " + max + "]", { value: value, min: min, max: max });
    }
    
    /**
     * Validar sistema completo
     * @param {Object} sistema - Sistema a validar
     * @returns {Object} Resultado de validación
     */
    function validateSistema(sistema) {
        var errores = [];
        
        try {
            assertNotNull(sistema, "sistema");
            assertHasProperty(sistema, "puntos", "sistema");
            assertHasProperty(sistema, "estado", "sistema");
            assertHasProperty(sistema.estado, "nodos", "sistema.estado");
            assertNotEmpty(sistema.puntos, "sistema.puntos");
            assertNotEmpty(sistema.estado.nodos, "sistema.estado.nodos");
            
            // Validar que puntos y nodos tengan misma longitud
            assert(sistema.puntos.length === sistema.estado.nodos.length, 
                "puntos.length debe igualar nodos.length", 
                { puntos: sistema.puntos.length, nodos: sistema.estado.nodos.length });
            
        } catch (error) {
            errores.push(error.message);
        }
        
        return {
            valido: errores.length === 0,
            errores: errores
        };
    }
    
    return {
        assert: assert,
        assertNotNull: assertNotNull,
        assertPositive: assertPositive,
        assertNumber: assertNumber,
        assertHasProperty: assertHasProperty,
        assertNotEmpty: assertNotEmpty,
        assertInRange: assertInRange,
        validateSistema: validateSistema
    };
})();

if (typeof window !== 'undefined') {
    window.DebugValidator = DebugValidator;
}
