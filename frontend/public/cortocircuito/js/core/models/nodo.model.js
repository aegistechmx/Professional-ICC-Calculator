/**
 * core/models/nodo.model.js — Modelo centralizado de Nodo
 * Única fuente de verdad para datos de nodo eléctrico
 * Arquitectura tipo ETAP/SKM: datos inmutables, validación estricta
 */

var NodoModel = (function() {
    
    /**
     * Clase Nodo - Modelo centralizado
     * @param {Object} data - Datos del nodo
     * @param {string} data.id - Identificador único
     * @param {string} data.calibre - Calibre del conductor
     * @param {number} data.paralelos - Número de conductores en paralelo
     * @param {number} data.longitud - Longitud del conductor (m)
     * @param {number} data.I_carga - Corriente de carga (A)
     * @param {number} data.FP - Factor de potencia
     * @param {number} data.tempAmbiente - Temperatura ambiente (°C)
     * @param {number} data.agrupamiento - Número de conductores agrupados
     */
    function Nodo(data) {
        // Validar datos de entrada
        if (!data) {
            throw new Error("Datos de nodo requeridos");
        }
        
        if (!data.id) {
            throw new Error("ID de nodo requerido");
        }
        
        // Identificación
        this.id = data.id;
        this.nombre = data.nombre || data.id;
        
        // Datos eléctricos del conductor
        this.calibre = data.calibre || null;
        this.material = data.material || 'cobre';
        this.paralelos = data.paralelos !== undefined ? Number(data.paralelos) : 1;
        this.longitud = data.longitud !== undefined ? Number(data.longitud) : 0;
        
        // Validación de paralelos
        if (this.paralelos <= 0) {
            throw new Error("Paralelos debe ser >= 1: " + this.paralelos);
        }
        
        // Datos de carga
        this.I_carga = data.I_carga !== undefined ? Number(data.I_carga) : 0;
        this.FP = data.FP !== undefined ? Number(data.FP) : 0.85;
        this.esContinua = data.esContinua !== undefined ? Boolean(data.esContinua) : true;
        
        // Datos de ambiente
        this.tempAmbiente = data.tempAmbiente !== undefined ? Number(data.tempAmbiente) : 30;
        this.tempAislamiento = data.tempAislamiento || 75;
        this.agrupamiento = data.agrupamiento !== undefined ? Number(data.agrupamiento) : 3;
        
        // Datos de equipo (breaker, fusible, etc.)
        this.equipo = data.equipo || null;
        
        // Resultados (solo lectura, calculados por engines)
        this.resultados = {
            ampacidad: null,
            conductor: null,
            falla: null,
            proteccion: null,
            coordinacion: null
        };
        
        // Congelar el objeto para evitar mutaciones no controladas
        Object.freeze(this.resultados);
    }
    
    /**
     * Crear copia del nodo con datos modificados (inmutabilidad)
     * @param {Object} cambios - Datos a modificar
     * @returns {Nodo} Nuevo nodo con cambios aplicados
     */
    Nodo.prototype.conCambios = function(cambios) {
        var nuevoData = {};
        
        // Copiar todas las propiedades actuales
        for (var key in this) {
            if (this.hasOwnProperty(key) && key !== 'resultados') {
                nuevoData[key] = this[key];
            }
        }
        
        // Aplicar cambios
        for (var key in cambios) {
            nuevoData[key] = cambios[key];
        }
        
        return new Nodo(nuevoData);
    };
    
    /**
     * Validar que el nodo tiene datos mínimos para cálculo
     * @returns {boolean} true si es válido
     */
    Nodo.prototype.esValidoParaCalculo = function() {
        return this.calibre !== null && 
               this.I_carga > 0 && 
               this.tempAmbiente > 0;
    };
    
    /**
     * Obtener corriente de diseño con factor de continuidad
     * @param {number} Fcc - Factor de continuidad de carga (default 1.25)
     * @returns {number} I_diseño
     */
    Nodo.prototype.obtenerIDiseño = function(Fcc) {
        Fcc = Fcc || 1.25;
        return this.I_carga * (this.esContinua ? Fcc : 1.0);
    };
    
    /**
     * Factory para crear nodo desde datos legacy
     * @param {Object} legacyData - Datos en formato antiguo
     * @returns {Nodo} Nuevo nodo normalizado
     */
    function desdeLegacy(legacyData) {
        return new Nodo({
            id: legacyData.id || legacyData.nombre || 'nodo',
            nombre: legacyData.nombre,
            calibre: legacyData.calibre || legacyData.feeder?.calibre,
            material: legacyData.material || 'cobre',
            paralelos: legacyData.paralelos || legacyData.feeder?.paralelos || 1,
            longitud: legacyData.longitud || legacyData.feeder?.longitud || 0,
            I_carga: legacyData.I_carga || legacyData.feeder?.cargaA || 0,
            FP: legacyData.FP || 0.85,
            tempAmbiente: legacyData.tempAmbiente || legacyData.feeder?.tempAmbiente || 30,
            tempAislamiento: legacyData.tempAislamiento || 75,
            agrupamiento: legacyData.agrupamiento || legacyData.feeder?.numConductores || 3,
            equipo: legacyData.equip || legacyData.equipo
        });
    }
    
    return {
        Nodo: Nodo,
        desdeLegacy: desdeLegacy
    };
})();

if (typeof window !== 'undefined') {
    window.NodoModel = NodoModel;
}
