/**
 * core/data/catalog.adapter.js — Adaptador de Catálogo
 * Puente entre datos NOM (conductores.nom.js) y nueva arquitectura
 */

var CatalogAdapter = (function() {
    
    /**
     * Crear catálogo desde datos NOM-001-SEDE-2012 (única fuente de verdad)
     * @returns {Object} Catálogo compatible con nueva arquitectura
     */
    function desdeNOM() {
        if (typeof CONDUCTORES_NOM === 'undefined') {
            throw new Error("CONDUCTORES_NOM no está disponible");
        }
        
        var tabla = CONDUCTORES_NOM;
        
        return {
            /**
             * Obtener ampacidad base de tabla NOM
             * @param {string} calibre - Calibre del conductor
             * @param {string} material - Material (cobre, aluminio)
             * @param {number} tempAislamiento - Temperatura de aislamiento
             * @returns {number} Ampacidad base
             */
            getAmpacidadBase: function(calibre, material, tempAislamiento) {
                material = material || 'cobre';
                tempAislamiento = tempAislamiento || 75;
                
                if (!tabla[material]) {
                    throw new Error("Material no soportado: " + material);
                }
                
                if (!tabla[material][calibre]) {
                    throw new Error("Calibre no encontrado: " + calibre);
                }
                
                if (!tabla[material][calibre][tempAislamiento]) {
                    throw new Error("Temperatura de aislamiento no soportada: " + tempAislamiento);
                }
                
                var ampacidad = tabla[material][calibre][tempAislamiento];
                
                if (!ampacidad || ampacidad <= 0) {
                    throw new Error("Ampacidad inválida para calibre " + calibre);
                }
                
                return ampacidad;
            },
            
            /**
             * Obtener ampacidad terminal según NOM 110.14C
             * @param {string} calibre - Calibre del conductor
             * @param {string} material - Material
             * @param {number} tempTerminal - Temperatura de terminal
             * @returns {number} Ampacidad terminal
             */
            getAmpacidadTerminal: function(calibre, material, tempTerminal) {
                material = material || 'cobre';
                tempTerminal = tempTerminal || 75;
                
                if (!tabla[material] || !tabla[material][calibre]) {
                    return null; // Signal to use I_corregida
                }
                
                var base75 = tabla[material][calibre][75];
                if (!base75) {
                    return null;
                }
                
                // Aplicar límite de terminal según NOM 110.14C
                if (tempTerminal === 60) {
                    return base75 * 0.8;
                }
                
                if (tempTerminal === 75) {
                    return base75;
                }
                
                // 90°C solo si TODO el sistema lo permite
                return null; // Usar I_corregida
            },
            
            /**
             * Obtener lista de calibres ordenados por ampacidad
             * @returns {Array} Lista de calibres
             */
            listaOrdenada: function() {
                var calibres = Object.keys(tabla['cobre']);
                
                // Ordenar por ampacidad a 75°C ascendente
                calibres.sort(function(a, b) {
                    return tabla['cobre'][a][75] - tabla['cobre'][b][75];
                });
                
                return calibres;
            },
            
            /**
             * Verificar si calibre existe
             * @param {string} calibre - Calibre a verificar
             * @returns {boolean} true si existe
             */
            existeCalibre: function(calibre) {
                return tabla['cobre'][calibre] !== undefined;
            },
            
            /**
             * Obtener factor de temperatura
             * @param {number} tempAmbiente - Temperatura ambiente
             * @param {number} aislamiento - Temperatura de aislamiento
             * @returns {number} Factor de temperatura
             */
            getFactorTemperatura: function(tempAmbiente, aislamiento) {
                if (typeof factorTemperatura !== 'undefined') {
                    return factorTemperatura(tempAmbiente, aislamiento);
                }
                // Fallback si no está disponible
                return 1.0;
            },
            
            /**
             * Obtener factor de agrupamiento
             * @param {number} nConductores - Número de conductores
             * @returns {number} Factor de agrupamiento
             */
            getFactorAgrupamiento: function(nConductores) {
                if (typeof factorAgrupamiento !== 'undefined') {
                    return factorAgrupamiento(nConductores);
                }
                // Fallback si no está disponible
                return 1.0;
            }
        };
    }
    
    /**
     * Crear catálogo desde AmpacidadReal (legacy fallback)
     * @returns {Object} Catálogo compatible con nueva arquitectura
     */
    function desdeAmpacidadReal() {
        if (typeof AmpacidadReal === 'undefined') {
            throw new Error("AmpacidadReal no está disponible");
        }
        
        console.warn("[CatalogAdapter] Usando AmpacidadReal (legacy) en lugar de datos NOM");
        
        var tabla = AmpacidadReal.tablaAmpacidad;
        var terminales = AmpacidadReal.tablaTerminales;
        
        return {
            getAmpacidadBase: function(calibre, material, tempAislamiento) {
                material = material || 'cobre';
                tempAislamiento = tempAislamiento || 75;
                
                if (!tabla[material]) {
                    throw new Error("Material no soportado: " + material);
                }
                
                if (!tabla[material][tempAislamiento]) {
                    throw new Error("Temperatura de aislamiento no soportada: " + tempAislamiento);
                }
                
                var ampacidad = tabla[material][tempAislamiento][calibre];
                
                if (!ampacidad || ampacidad <= 0) {
                    throw new Error("Calibre no encontrado: " + calibre);
                }
                
                return ampacidad;
            },
            
            getAmpacidadTerminal: function(calibre, material, tempTerminal) {
                material = material || 'cobre';
                tempTerminal = tempTerminal || 75;
                
                if (!terminales[material]) {
                    return null;
                }
                
                var tempKey = tempTerminal.toString();
                if (!terminales[material][tempKey]) {
                    tempKey = '75';
                }
                
                var ampacidad = terminales[material][tempKey][calibre];
                
                if (!ampacidad || ampacidad <= 0) {
                    return null;
                }
                
                return ampacidad;
            },
            
            listaOrdenada: function() {
                var calibres = Object.keys(tabla['cobre'][75]);
                calibres.sort(function(a, b) {
                    return tabla['cobre'][75][a] - tabla['cobre'][75][b];
                });
                return calibres;
            },
            
            existeCalibre: function(calibre) {
                return tabla['cobre'][75][calibre] !== undefined;
            },
            
            getFactorTemperatura: function() {
                return 1.0;
            },
            
            getFactorAgrupamiento: function() {
                return 1.0;
            }
        };
    }
    
    /**
     * Obtener catálogo automáticamente (prioriza datos NOM)
     * @returns {Object} Catálogo
     */
    function obtenerCatalogo() {
        try {
            return desdeNOM();
        } catch (e) {
            console.warn("[CatalogAdapter] Datos NOM no disponibles, usando AmpacidadReal (legacy):", e.message);
            return desdeAmpacidadReal();
        }
    }
    
    return {
        desdeNOM: desdeNOM,
        desdeAmpacidadReal: desdeAmpacidadReal,
        obtenerCatalogo: obtenerCatalogo
    };
})();

if (typeof window !== 'undefined') {
    window.CatalogAdapter = CatalogAdapter;
}
