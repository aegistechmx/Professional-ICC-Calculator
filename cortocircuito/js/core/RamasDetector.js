/**
 * core/RamasDetector.js — Detección de ramas tipo ETAP/SKM
 * Convierte estructura planar en árbol de alimentación
 */

var RamasDetector = (function() {
    
    /**
     * Construir estructura de ramas desde nodos y edges
     * @param {Array} nodos - Lista de nodos
     * @param {Array} edges - Lista de conexiones
     * @returns {Object} Estructura de ramas
     */
    function construirRamas(nodos, edges) {
        var ramas = {};
        var nodosPorRama = {};
        
        // Inicializar estructura
        nodos.forEach(function(nodo) {
            if (!nodo.parentId || nodo.parentId === 'P0') {
                // Nodos raíz (panel principal)
                var ramaId = 'MAIN';
                ramas[ramaId] = {
                    id: ramaId,
                    nombre: 'Panel Principal',
                    tipo: 'panel',
                    nodos: [],
                    subRamas: {}
                };
                nodosPorRama[nodo.id] = ramaId;
            }
        });
        
        // Construir árbol de ramas
        edges.forEach(function(edge) {
            var sourceId = edge.source;
            var targetId = edge.target;
            var sourceNodo = nodos.find(n => n.id === sourceId);
            var targetNodo = nodos.find(n => n.id === targetId);
            
            if (!sourceNodo || !targetNodo) return;
            
            var ramaId = nodosPorRama[sourceId] || 'MAIN';
            
            if (!ramas[ramaId]) {
                ramas[ramaId] = {
                    id: ramaId,
                    nombre: 'Rama ' + ramaId,
                    tipo: 'subpanel',
                    nodos: [],
                    subRamas: {}
                };
            }
            
            // Agregar nodo a la rama
            ramas[ramaId].nodos.push(targetNodo);
            nodosPorRama[targetId] = ramaId;
            
            // Detectar sub-ramas (derivaciones)
            if (targetNodo.tipo === 'subpanel') {
                var subRamaId = 'SUB_' + targetId;
                ramas[ramaId].subRamas[subRamaId] = {
                    id: subRamaId,
                    nombre: 'Subpanel ' + targetId,
                    tipo: 'subpanel',
                    nodos: []
                };
                nodosPorRama[targetId] = subRamaId;
            }
        });
        
        // Organizar nodos por nivel jerárquico
        Object.keys(ramas).forEach(function(ramaId) {
            var rama = ramas[ramaId];
            rama.nodos.sort(function(a, b) {
                // Ordenar por nivel jerárquico
                var nivelA = obtenerNivel(a, edges);
                var nivelB = obtenerNivel(b, edges);
                return nivelA - nivelB;
            });
        });
        
        return {
            ramas: ramas,
            nodosPorRama: nodosPorRama,
            totalRamas: Object.keys(ramas).length
        };
    }
    
    /**
     * Obtener nivel jerárquico de un nodo
     * @param {Object} nodo - Nodo a evaluar
     * @param {Array} edges - Conexiones
     * @returns {number} Nivel del nodo
     */
    function obtenerNivel(nodo, edges) {
        if (!nodo.parentId || nodo.parentId === 'P0') return 0;
        
        var nivel = 0;
        var actual = nodo;
        
        while (actual && actual.parentId && actual.parentId !== 'P0') {
            nivel++;
            actual = edges.find(e => e.target === actual.parentId)?.source;
            if (nivel > 10) break; // Prevenir loops infinitos
        }
        
        return nivel;
    }
    
    /**
     * Validar estructura de ramas
     * @param {Object} ramas - Estructura de ramas a validar
     * @returns {Object} Resultado de validación
     */
    function validarRamas(ramas) {
        var errores = [];
        var warnings = [];
        
        Object.keys(ramas).forEach(function(ramaId) {
            var rama = ramas[ramaId];
            
            if (rama.nodos.length === 0) {
                warnings.push('Rama ' + ramaId + ' sin nodos');
            }
            
            // Validar que todos los nodos tengan parentId correcto
            rama.nodos.forEach(function(nodo, index) {
                if (index === 0 && !nodo.parentId) {
                    // Primer nodo puede no tener parentId si viene del panel principal
                } else if (index > 0 && !nodo.parentId) {
                    errores.push('Nodo ' + nodo.id + ' en rama ' + ramaId + ' sin parentId');
                }
            });
        });
        
        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings,
            totalRamas: Object.keys(ramas).length
        };
    }
    
    /**
     * Generar reporte de ramas
     * @param {Object} ramas - Estructura de ramas
     * @returns {string} Reporte en formato texto
     */
    function generarReporte(ramas) {
        var reporte = '=== ESTRUCTURA DE RAMAS ===\n\n';
        
        Object.keys(ramas).forEach(function(ramaId, index) {
            var rama = ramas[ramaId];
            reporte += 'RAMA ' + (index + 1) + ': ' + rama.nombre + '\n';
            reporte += '  Tipo: ' + rama.tipo + '\n';
            reporte += '  Nodos: ' + rama.nodos.length + '\n';
            
            rama.nodos.forEach(function(nodo, nodoIndex) {
                reporte += '    ' + (nodoIndex + 1) + '. ' + nodo.id + ' (' + (nodo.nombre || 'Sin nombre') + ')\n';
            });
            
            if (Object.keys(rama.subRamas).length > 0) {
                reporte += '  Sub-ramas: ' + Object.keys(rama.subRamas).length + '\n';
                Object.keys(rama.subRamas).forEach(function(subId) {
                    var subRama = rama.subRamas[subId];
                    reporte += '    - ' + subRama.nombre + ': ' + subRama.nodos.length + ' nodos\n';
                });
            }
            
            reporte += '\n';
        });
        
        return reporte;
    }
    
    return {
        construirRamas: construirRamas,
        validarRamas: validarRamas,
        generarReporte: generarReporte
    };
})();

if (typeof window !== 'undefined') {
    window.RamasDetector = RamasDetector;
}
