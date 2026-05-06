/**
 * optimizador_conductores.js — Optimizador Automático de Calibres de Conductores
 * Encuentra el calibre óptimo según carga, factores NOM-001 y criterios de diseño
 */

var OptimizadorConductores = (function() {

    /**
     * Optimizar calibre para un feeder específico
     * @param {Object} feeder - Datos del feeder {material, canalizacion, cargaA, fc, ft, numConductores, paralelo}
     * @param {Object} opciones - Opciones de optimización {margenSeguridad, preferirCobre, maxCalibre}
     * @returns {Object} Calibre optimizado con justificación
     */
    function optimizarCalibre(feeder, opciones) {
        opciones = opciones || {};
        var margenSeguridad = opciones.margenSeguridad || 1.25; // 125% por defecto
        var preferirCobre = opciones.preferirCobre !== false; // Default cobre
        var maxCalibre = opciones.maxCalibre || '1000';
        
        if (!feeder || !feeder.cargaA || feeder.cargaA <= 0) {
            return { error: 'Carga no especificada' };
        }

        var materiales = preferirCobre ? ['cobre', 'aluminio'] : ['aluminio', 'cobre'];
        var mejorOpcion = null;
        var mejorScore = -Infinity;

        for (var m = 0; m < materiales.length; m++) {
            var material = materiales[m];
            
            for (var i = 0; i < CONSTANTES.CALIBRES.length; i++) {
                var calibre = CONSTANTES.CALIBRES[i];
                
                // Verificar límite de calibre
                if (compararCalibres(calibre, maxCalibre) > 0) continue;
                
                // Calcular ampacidad
                var tempConductor = (feeder.cargaA < CONSTANTES.TEMP_CONDUCTOR_POR_CORRIENTE) ? '60' : '75';
                var ampacidadBase = (material === 'cobre') ? 
                    CONSTANTES.AMPACIDAD_CU[tempConductor][calibre] : 
                    CONSTANTES.AMPACIDAD_AL[tempConductor][calibre];
                
                if (!ampacidadBase || ampacidadBase === 0) continue;
                
                var fc = feeder.fc || CONSTANTES.FACTOR_CONDUCTORES['default'];
                var ft = feeder.ft || CONSTANTES.FACTOR_TEMPERATURA['default'];
                var paralelo = feeder.paralelo || 1;
                
                var ampacidadFinal = ampacidadBase * fc * ft * paralelo;
                var cargaRequerida = feeder.cargaA * margenSeguridad;
                
                // Verificar si cumple con carga
                if (ampacidadFinal < cargaRequerida) continue;
                
                // Calcular score (menor calibre = mejor, pero debe cumplir)
                var sobredimensionamiento = ampacidadFinal / cargaRequerida;
                var score = -sobredimensionamiento;
                
                // Penalizar aluminio si se prefiere cobre
                if (material === 'aluminio' && preferirCobre) {
                    score -= 0.5;
                }
                
                if (score > mejorScore) {
                    mejorScore = score;
                    mejorOpcion = {
                        material: material,
                        calibre: calibre,
                        ampacidadBase: ampacidadBase,
                        ampacidadFinal: ampacidadFinal,
                        tempConductor: tempConductor,
                        fc: fc,
                        ft: ft,
                        paralelo: paralelo,
                        sobredimensionamiento: sobredimensionamiento,
                        margen: ((ampacidadFinal - feeder.cargaA) / feeder.cargaA * 100)
                    };
                }
            }
        }
        
        if (!mejorOpcion) {
            return { error: 'No se encontró calibre adecuado' };
        }
        
        return mejorOpcion;
    }

    /**
     * Comparar dos calibres (para ordenamiento)
     * @param {string} cal1 - Calibre 1
     * @param {string} cal2 - Calibre 2
     * @returns {number} -1 si cal1 < cal2, 1 si cal1 > cal2, 0 si igual
     */
    function compararCalibres(cal1, cal2) {
        var orden = CONSTANTES.CALIBRES;
        var idx1 = orden.indexOf(cal1);
        var idx2 = orden.indexOf(cal2);
        
        if (idx1 === -1 && idx2 === -1) return 0;
        if (idx1 === -1) return 1;
        if (idx2 === -1) return -1;
        
        return idx1 - idx2;
    }

    /**
     * Optimizar todos los feeders del sistema
     * @param {Array} nodos - Nodos del sistema
     * @param {Object} opciones - Opciones globales
     * @returns {Object} Resultados de optimización
     */
    function optimizarSistema(nodos, opciones) {
        if (!nodos || nodos.length === 0) {
            return { error: 'No hay nodos en el sistema' };
        }

        var resultados = {
            optimizados: [],
            sinCambio: [],
            errores: [],
            ahorroEstimado: 0
        };

        for (var i = 0; i < nodos.length; i++) {
            var nodo = nodos[i];
            if (!nodo.feeder || !nodo.feeder.cargaA || nodo.feeder.cargaA <= 0) {
                continue;
            }

            var feederActual = nodo.feeder;
            var optimizacion = optimizarCalibre(feederActual, opciones);
            
            if (optimizacion.error) {
                resultados.errores.push({
                    nodo: nodo.id,
                    error: optimizacion.error
                });
                continue;
            }

            // Comparar con actual
            var mismoMaterial = optimizacion.material === feederActual.material;
            var mismoCalibre = optimizacion.calibre === feederActual.calibre;
            
            if (mismoMaterial && mismoCalibre) {
                resultados.sinCambio.push({
                    nodo: nodo.id,
                    razon: 'Calibre ya óptimo'
                });
            } else {
                var mejora = '';
                if (!mismoMaterial) {
                    mejora += 'Material: ' + feederActual.material + ' → ' + optimizacion.material + ' ';
                }
                if (!mismoCalibre) {
                    mejora += 'Calibre: ' + feederActual.calibre + ' → ' + optimizacion.calibre + ' ';
                }
                
                resultados.optimizados.push({
                    nodo: nodo.id,
                    actual: {
                        material: feederActual.material,
                        calibre: feederActual.calibre
                    },
                    optimizado: optimizacion,
                    mejora: mejora,
                    margenActual: feederActual.ampacidad ? 
                        ((feederActual.ampacidad - feederActual.cargaA) / feederActual.cargaA * 100) : 0,
                    margenNuevo: optimizacion.margen
                });
            }
        }

        return resultados;
    }

    /**
     * Aplicar optimización al sistema
     * @param {Array} nodos - Nodos del sistema
     * @param {Object} opciones - Opciones
     * @returns {Array} Nodos con calibres optimizados
     */
    function aplicarOptimizacion(nodos, opciones) {
        var resultados = optimizarSistema(nodos, opciones);
        
        resultados.optimizados.forEach(function(opt) {
            var nodo = nodos.find(function(n) { return n.id === opt.nodo; });
            if (nodo && nodo.feeder) {
                nodo.feeder.material = opt.optimizado.material;
                nodo.feeder.calibre = opt.optimizado.calibre;
            }
        });
        
        return {
            nodos: nodos,
            resultados: resultados
        };
    }

    /**
     * Calcular costo estimado de conductores (simplificado)
     * @param {string} material - Material
     * @param {string} calibre - Calibre
     * @param {number} longitud - Longitud en metros
     * @param {number} numConductores - Número de conductores
     * @returns {number} Costo estimado
     */
    function calcularCosto(material, calibre, longitud, numConductores) {
        // Costos base por metro (USD) - valores aproximados
        var costosBase = {
            cobre: {
                '14': 0.5, '12': 0.8, '10': 1.2, '8': 2.0, '6': 3.5,
                '4': 5.0, '2': 8.0, '1': 12.0, '1/0': 18.0, '2/0': 25.0,
                '3/0': 35.0, '4/0': 45.0, '250': 60.0, '300': 75.0, '350': 90.0,
                '400': 110.0, '500': 140.0, '600': 170.0, '750': 220.0, '1000': 300.0
            },
            aluminio: {
                '14': 0.3, '12': 0.5, '10': 0.7, '8': 1.2, '6': 2.0,
                '4': 3.0, '2': 4.5, '1': 7.0, '1/0': 10.0, '2/0': 14.0,
                '3/0': 18.0, '4/0': 25.0, '250': 32.0, '300': 40.0, '350': 48.0,
                '400': 58.0, '500': 75.0, '600': 90.0, '750': 115.0, '1000': 150.0
            }
        };
        
        var costoMetro = costosBase[material] ? costosBase[material][calibre] : 0;
        if (costoMetro === 0) return 0;
        
        return costoMetro * longitud * numConductores;
    }

    return {
        optimizarCalibre: optimizarCalibre,
        optimizarSistema: optimizarSistema,
        aplicarOptimizacion: aplicarOptimizacion,
        calcularCosto: calcularCosto,
        compararCalibres: compararCalibres
    };
})();

if (typeof window !== 'undefined') {
    window.OptimizadorConductores = OptimizadorConductores;
}
