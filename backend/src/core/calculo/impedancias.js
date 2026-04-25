/**
 * impedancias.js
 * Funciones puras de calculo de impedancia.
 * Sin dependencias de DOM ni estado global.
 */
const Impedancias = (function() {

    /**
     * Calcula la impedancia magnitud a partir de R y X
     */
    function magnitud(R, X) {
        return Math.sqrt(R * R + X * X);
    }

    /**
     * Obtiene la impedancia de un conductor por longitud
     * @param {Object} feeder - { material, canalizacion, calibre, longitud, paralelo }
     * @param {Object} conductores - Data structure with conductor impedances
     * @returns {Object|null} { R, X, Z } en ohms, o null si datos no existen
     */
    function delConductor(feeder, conductores) {
        var datos = conductores[feeder.material] &&
                    conductores[feeder.material][feeder.canalizacion] &&
                    conductores[feeder.material][feeder.canalizacion][feeder.calibre];
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

    // API publica
    return {
        magnitud: magnitud,
        delConductor: delConductor,
        deFuenteIsc: deFuenteIsc,
        deTransformador: deTransformador,
        corrienteIsc: corrienteIsc,
        corrientePico: corrientePico
    };
})();

module.exports = Impedancias;
