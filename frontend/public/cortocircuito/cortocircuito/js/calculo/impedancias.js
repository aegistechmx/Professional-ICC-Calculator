/**
 * impedancias.js
 * Funciones puras de calculo de impedancia.
 * Sin dependencias de DOM ni estado global.
 */
var Impedancias = (function () {

    /**
     * Calcula la impedancia magnitud a partir de R y X
     */
    function magnitud(R, X) {
        return Math.sqrt(R * R + X * X);
    }

    /**
     * Obtiene la impedancia de un conductor por longitud
     * @param {Object} feeder - { material, canalizacion, calibre, longitud, paralelo }
     * @returns {Object|null} { R, X, Z } en ohms, o null si datos no existen
     */
    function delConductor(feeder) {
        var datos = CONDUCTORES[feeder.material] &&
            CONDUCTORES[feeder.material][feeder.canalizacion] &&
            CONDUCTORES[feeder.material][feeder.canalizacion][feeder.calibre];
        if (!datos) return null;

        var n = Math.max(1, feeder.paralelo || 1);
        var L = Math.max(0, feeder.longitud || 0);
        var R = (datos.R * L / 1000) / n;
        var X = (datos.X * L / 1000) / n;

        return { R: R, X: X, Z: magnitud(R, X) };
    }

    /**
     * Calcula R y X de fuente a partir de Isc conocido
     * @param {number} tension - Tension en V
     * @param {number} isc - Isc en A
     * @param {number} xr - Relacion X/R
     * @param {number} factor - sqrt(3) trifasico, 2 monofasico
     * @returns {Object} { R, X }
     */
    function deFuenteIsc(tension, isc, xr, factor) {
        // Validar entrada para prevenir división por cero
        if (!isc || isc <= 0) {
            console.error('[Impedancias] Isc inválido:', isc);
            return { R: Infinity, X: Infinity };
        }
        if (!factor || factor <= 0) {
            console.error('[Impedancias] Factor inválido:', factor);
            factor = Math.sqrt(3); // Default trifásico
        }
        if (!tension || tension <= 0) {
            console.error('[Impedancias] Tensión inválida:', tension);
            return { R: Infinity, X: Infinity };
        }

        var Z = tension / (factor * isc);
        var R = Z / Math.sqrt(1 + xr * xr);
        var X = R * xr;
        return { R: R, X: X };
    }

    /**
     * Calcula R y X de un transformador
     * @param {number} kva - Capacidad en kVA
     * @param {number} pctZ - Impedancia en porcentaje
     * @param {number} vSec - Tension secundaria en V
     * @returns {Object} { R, X }
     */
    function deTransformador(kva, pctZ, vSec) {
        var Z = (pctZ / 100) * (vSec * vSec) / (kva * 1000);
        // X/R segun tamano del transformador
        var xr = kva <= 500 ? 5 : kva <= 1500 ? 7 : 10;
        var R = Z / Math.sqrt(1 + xr * xr);
        var X = R * xr;
        return { R: R, X: X };
    }

    /**
     * Calcula corriente de cortocircuito simetrica
     * @param {number} V - Tension linea-linea
     * @param {number} Z - Impedancia total en ohms
     * @param {number} factor - sqrt(3) trifasico, 2 monofasico
     * @returns {number} Isc en amperes
     */
    function corrienteIsc(V, Z, factor) {
        return V / (factor * Z);
    }

    /**
     * Calcula corriente pico asimetrica
     * @param {number} isc - Corriente simetrica en A
     * @param {number} xr - Relacion X/R total
     * @returns {number} Corriente pico en A
     */
    function corrientePico(isc, xr) {
        var xrClamped = Math.min(xr, 500);
        return isc * Math.SQRT2 * (1 + Math.exp(-Math.PI / xrClamped));
    }

    /**
     * Fase 9: Calcula impedancia acumulada hasta un nodo en estructura de árbol
     * @param {string} nodoId - ID del nodo destino
     * @param {Array} nodos - Array de nodos con estructura { id, parentId, feeder }
     * @param {Set} [visitados] - Interno para detectar recursión infinita por ciclos
     * @returns {Object} { R, X, Z } en ohms
     */
    function impedanciaAcumuladaNodo(nodoId, nodos, visitados) {
        if (!visitados) visitados = new Set();

        if (visitados.has(nodoId)) {
            console.error('Ciclo detectado en la jerarquía de nodos para:', nodoId);
            return { R: 0, X: 0, Z: 0 };
        }
        visitados.add(nodoId);

        var nodo = (nodos || []).find(function (n) { return n.id === nodoId; });
        if (!nodo) return { R: 0, X: 0, Z: 0 };

        if (!nodo.parentId) {
            // Nodo raíz, solo impedancia del feeder si existe
            if (nodo.feeder) {
                var zFeeder = delConductor(nodo.feeder);
                return zFeeder || { R: 0, X: 0, Z: 0 };
            }
            return { R: 0, X: 0, Z: 0 };
        }

        // Recursión: impedancia del padre + impedancia del feeder actual
        var zPadre = impedanciaAcumuladaNodo(nodo.parentId, nodos, visitados);
        var zFeeder = nodo.feeder ? delConductor(nodo.feeder) : { R: 0, X: 0, Z: 0 };

        return {
            R: zPadre.R + (zFeeder ? zFeeder.R : 0),
            X: zPadre.X + (zFeeder ? zFeeder.X : 0),
            Z: magnitud(zPadre.R + (zFeeder ? zFeeder.R : 0), zPadre.X + (zFeeder ? zFeeder.X : 0))
        };
    }

    /**
     * Fase 9: Obtiene el camino completo desde la raíz hasta un nodo
     * @param {string} nodoId - ID del nodo destino
     * @param {Array} nodos - Array de nodos
     * @returns {Array} Array de IDs desde raíz hasta el nodo (inclusive)
     */
    function obtenerCamino(nodoId, nodos) {
        var camino = [];
        var visitados = new Set();
        var nodoActual = nodos.find(function (n) { return n.id === nodoId; });
        if (!nodoActual) return camino;

        while (nodoActual && !visitados.has(nodoActual.id)) {
            visitados.add(nodoActual.id);
            camino.unshift(nodoActual.id);
            if (!nodoActual.parentId) break;
            nodoActual = nodos.find(function (n) { return n.id === nodoActual.parentId; });
            if (!nodoActual) break; // Parent reference is invalid
        }

        return camino;
    }

    /**
     * Fase 9: Obtiene todos los hijos directos de un nodo
     * @param {string} parentId - ID del nodo padre
     * @param {Array} nodos - Array de nodos
     * @returns {Array} Array de nodos hijos
     */
    function obtenerHijos(parentId, nodos) {
        return nodos.filter(function (n) { return n.parentId === parentId; });
    }

    /**
     * Fase 9: Convierte estructura de nodos a lista plana ordenada por profundidad (BFS)
     * @param {Array} nodos - Array de nodos
     * @returns {Array} Nodos ordenados por nivel (útil para cálculos secuenciales)
     */
    function ordenarPorNivel(nodos) {
        var visitados = [];
        var idsVistos = new Set();
        var cola = nodos.filter(function (n) { return !n.parentId; });

        while (cola.length > 0) {
            var nodo = cola.shift();
            if (idsVistos.has(nodo.id)) continue;

            idsVistos.add(nodo.id);
            visitados.push(nodo);

            var hijos = obtenerHijos(nodo.id, nodos);
            cola = cola.concat(hijos);
        }

        return visitados;
    }

    /**
     * Detecta si existe una referencia circular en la jerarquía de nodos.
     * @param {Array} nodos - Estructura de nodos a validar
     * @returns {string|null} ID del nodo causante del ciclo o null si es válido.
     */
    function detectarCiclos(nodos) {
        if (!nodos || !Array.isArray(nodos)) return null;

        for (var i = 0; i < nodos.length; i++) {
            var visitados = new Set();
            var actual = nodos[i];

            while (actual && actual.parentId) {
                if (visitados.has(actual.id)) {
                    return actual.id; // Ciclo detectado
                }
                visitados.add(actual.id);
                var pid = actual.parentId;
                actual = nodos.find(function (n) { return n.id === pid; });
            }
        }
        return null;
    }

    // API publica
    return {
        magnitud: magnitud,
        delConductor: delConductor,
        deFuenteIsc: deFuenteIsc,
        deTransformador: deTransformador,
        corrienteIsc: corrienteIsc,
        corrientePico: corrientePico,
        impedanciaAcumuladaNodo: impedanciaAcumuladaNodo,
        obtenerCamino: obtenerCamino,
        obtenerHijos: obtenerHijos,
        ordenarPorNivel: ordenarPorNivel,
        detectarCiclos: detectarCiclos
    };
})();

if (typeof window !== 'undefined') {
    window.Impedancias = Impedancias;
}