/**
 * motor_ia_aprendizaje.js — Motor de IA con Aprendizaje
 * 
 * Sistema híbrido GA + aprendizaje que mejora con el tiempo:
 * - Memoria de experiencias
 * - Feature engineering para nodos eléctricos
 * - Modelo KNN para predicción inteligente
 * - Warm-start del GA con sugerencias
 * - Feedback loop automático
 * 
 * Aprende como ingeniero senior patrones de diseño óptimo
 */

var MotorIA = (function() {

    /**
     * Memoria de experiencias
     */
    var memoria = [];
    var maxMemoria = 1000; // Límite para evitar crecimiento infinito

    /**
     * Registrar experiencia en memoria
     * @param {Array} input - Features del nodo
     * @param {Object} resultado - Resultado de evaluación
     */
    function registrarExperiencia(input, resultado) {
        var experiencia = {
            input: input,
            resultado: resultado,
            score: resultado.eval ? resultado.eval.score : 0,
            valido: resultado.eval ? resultado.eval.valido : false,
            timestamp: Date.now()
        };

        memoria.push(experiencia);

        // Limitar tamaño de memoria
        if (memoria.length > maxMemoria) {
            memoria.shift(); // Eliminar experiencia más antigua
        }

        console.log('[MotorIA] Experiencia registrada. Memoria: ' + memoria.length + ' experiencias');
    }

    /**
     * Obtener dataset completo
     * @returns {Array} Dataset de experiencias
     */
    function getDataset() {
        return memoria;
    }

    /**
     * Obtener dataset filtrado (solo válidos)
     * @returns {Array} Dataset filtrado
     */
    function getDatasetValido() {
        return memoria.filter(function(d) {
            return d.valido;
        });
    }

    /**
     * Limpiar memoria
     */
    function limpiarMemoria() {
        memoria = [];
        console.log('[MotorIA] Memoria limpiada');
    }

    /**
     * Feature engineering para nodos eléctricos
     * Convierte nodo eléctrico en vector aprendible
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Features normalizadas
     */
    function extraerFeatures(nodo) {
        var features = [
            nodo.Icarga || nodo.carga || 100,           // Corriente de carga
            nodo.Isc_kA || nodo.Isc || 10,             // Corriente de cortocircuito
            nodo.longitud || 0,                        // Longitud del conductor
            nodo.voltaje || 480,                       // Voltaje
            nodo.numConductores || 3,                  // Número de conductores
            nodo.F_temp || 1.0,                        // Factor de temperatura
            nodo.Fcc || 1.0,                           // Factor de carga
            nodo.tempAmbiente || 40,                    // Temperatura ambiente
            nodo.tempTerminal || 75,                   // Temperatura terminal
            nodo.esContinua ? 1 : 0                    // Es carga continua
        ];

        // Normalizar features (escala 0-1 aprox)
        var maxValues = [1000, 100, 1000, 600, 10, 2.0, 2.0, 60, 90, 1];
        var featuresNormalizadas = features.map(function(f, i) {
            return f / (maxValues[i] || 1);
        });

        return featuresNormalizadas;
    }

    /**
     * Distancia euclidiana entre dos vectores
     * @param {Array} a - Vector 1
     * @param {Array} b - Vector 2
     * @returns {number} Distancia
     */
    function distancia(a, b) {
        var sum = 0;
        for (var i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }

    /**
     * Predecir configuración óptima usando KNN
     * @param {Object} nodo - Nodo del sistema
     * @param {Array} dataset - Dataset de experiencias
     * @param {number} k - Número de vecinos
     * @returns {Object} Configuración sugerida o null
     */
    function predecir(nodo, dataset, k) {
        k = k || 5;

        if (!dataset || dataset.length < k) {
            return null; // No hay suficientes datos
        }

        var f = extraerFeatures(nodo);

        // Encontrar k vecinos más cercanos
        var vecinos = dataset.map(function(d) {
            return {
                dist: distancia(f, d.input),
                data: d
            };
        }).sort(function(a, b) {
            return a.dist - b.dist;
        }).slice(0, k);

        // Filtrar solo válidos
        var vecinosValidos = vecinos.filter(function(v) {
            return v.data.valido;
        });

        if (vecinosValidos.length === 0) {
            return null;
        }

        // Votar mejor configuración (por score)
        var mejor = vecinosValidos.sort(function(a, b) {
            return b.data.score - a.data.score;
        })[0];

        console.log('[MotorIA] Predicción: score=' + mejor.data.score.toFixed(4) + ', distancia=' + mejor.dist.toFixed(4));

        return mejor ? mejor.data.resultado.config : null;
    }

    /**
     * Predecir configuración óptima para todo el sistema
     * @param {Object} sistema - Sistema con nodos
     * @returns {Array} Configuración sugerida por nodo
     */
    function predecirSistema(sistema) {
        var dataset = getDatasetValido();
        var configSugerida = [];

        for (var i = 0; i < sistema.nodos.length; i++) {
            var nodo = sistema.nodos[i];
            var sugerencia = predecir(nodo, dataset, 5);
            
            // La predicción devuelve el objeto de configuración para ese nodo específico
            if (sugerencia) {
                configSugerida.push(sugerencia);
            } else {
                configSugerida.push(null);
            }
        }

        return configSugerida;
    }

    /**
     * Crear individuo inteligente (warm-start del GA)
     * @param {Object} sistema - Sistema con nodos
     * @returns {Array} Cromosoma inteligente
     */
    function crearIndividuoInteligente(sistema) {
        var dataset = getDatasetValido();

        return sistema.nodos.map(function(nodo) {
            var sugerencia = predecir(nodo, dataset, 5);

            if (sugerencia) {
                return sugerencia;
            }

            // Fallback random
            return {
                calibre: randomDe(nodo.opciones ? nodo.opciones.calibres : [250, 300, 350, 400, 500]),
                paralelos: randomDe(nodo.opciones ? nodo.opciones.paralelos : [1, 2]),
                breaker: randomDe(nodo.opciones ? nodo.opciones.breakers : generarBreakersNodo(nodo)),
                ajustes: randomAjustes(nodo)
            };
        });
    }

    /**
     * Generar breakers para un nodo (fallback)
     * @param {Object} nodo - Nodo
     * @returns {Array} Breakers
     */
    function generarBreakersNodo(nodo) {
        var breakers = [];

        if (typeof CatalogoSchneider !== 'undefined' && CatalogoSchneider.obtenerTodosBreakers) {
            var todos = CatalogoSchneider.obtenerTodosBreakers();
            var I_diseno = nodo.I_diseno || nodo.carga || 100;
            var Icc = nodo.Isc_kA || 10;

            for (var i = 0; i < todos.length; i++) {
                var b = todos[i];
                if (b.In >= I_diseno && (b.Icu[480] || b.Icu) >= Icc) {
                    breakers.push(b);
                }
            }
        }

        if (breakers.length === 0) {
            breakers = [
                { In: 200, Icu: 25, modelo: 'Generic 200A' },
                { In: 300, Icu: 35, modelo: 'Generic 300A' },
                { In: 400, Icu: 50, modelo: 'Generic 400A' }
            ];
        }

        return breakers;
    }

    /**
     * Ajustes aleatorios LSIG
     * @param {Object} nodo - Nodo
     * @returns {Object} Ajustes
     */
    function randomAjustes(nodo) {
        return {
            Ir: randFloat(0.8, 1.0),
            Isd: randFloat(2, 10),
            Ii: randFloat(5, 15),
            Ig: randFloat(0.2, 0.6)
        };
    }

    /**
     * Aprender automáticamente de la mejor solución
     * @param {Object} sistema - Sistema original
     * @param {Array} mejorSolucion - Mejor solución encontrada
     */
    function aprender(sistema, resultadoOptimizacion) {
        if (!resultadoOptimizacion) return;
        var mejorSolucion = resultadoOptimizacion.mejorSolucion || (Array.isArray(resultadoOptimizacion) ? resultadoOptimizacion : null);
        var evalObj = resultadoOptimizacion.eval || null;

        if (!mejorSolucion || !evalObj) {
            console.warn('[MotorIA] No se puede aprender: solución inválida');
            return;
        }

        sistema.nodos.forEach(function(nodo, i) {
            var config = mejorSolucion[i];
            if (config) {
                registrarExperiencia(
                    extraerFeatures(nodo),
                    {
                        config: config,
                        eval: mejorSolucion.eval
                    }
                );
            }
        });

        console.log('[MotorIA] Aprendizaje completado. Experiencias totales: ' + memoria.length);
    }

    /**
     * Filtrar configuraciones inválidas
     * @param {Array} dataset - Dataset
     * @returns {Array} Dataset filtrado
     */
    function filtrarConfiguracionesInvalidas(dataset) {
        return dataset.filter(function(d) {
            return d.valido;
        });
    }

    /**
     * Obtener estadísticas de aprendizaje
     * @returns {Object} Estadísticas
     */
    function getEstadisticas() {
        var validas = memoria.filter(function(d) { return d.valido; });
        var invalidas = memoria.filter(function(d) { return !d.valido; });

        var scorePromedio = 0;
        if (validas.length > 0) {
            scorePromedio = validas.reduce(function(a, b) { return a + b.score; }, 0) / validas.length;
        }

        return {
            total: memoria.length,
            validas: validas.length,
            invalidas: invalidas.length,
            scorePromedio: scorePromedio,
            tasaValidacion: memoria.length > 0 ? validas.length / memoria.length : 0
        };
    }

    /**
     * Exportar memoria a JSON
     * @returns {string} JSON de memoria
     */
    function exportarMemoria() {
        return JSON.stringify(memoria);
    }

    /**
     * Importar memoria desde JSON
     * @param {string} json - JSON de memoria
     */
    function importarMemoria(json) {
        try {
            var datos = JSON.parse(json);
            if (Array.isArray(datos)) {
                memoria = datos;
                console.log('[MotorIA] Memoria importada: ' + memoria.length + ' experiencias');
            }
        } catch (e) {
            console.error('[MotorIA] Error importando memoria:', e);
        }
    }

    /**
     * Elemento aleatorio de array
     * @param {Array} arr - Array
     * @returns {*} Elemento aleatorio
     */
    function randomDe(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Float aleatorio
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @returns {number} Float aleatorio
     */
    function randFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    return {
        registrarExperiencia: registrarExperiencia,
        getDataset: getDataset,
        getDatasetValido: getDatasetValido,
        limpiarMemoria: limpiarMemoria,
        extraerFeatures: extraerFeatures,
        predecir: predecir,
        predecirSistema: predecirSistema,
        crearIndividuoInteligente: crearIndividuoInteligente,
        aprender: aprender,
        filtrarConfiguracionesInvalidas: filtrarConfiguracionesInvalidas,
        getEstadisticas: getEstadisticas,
        exportarMemoria: exportarMemoria,
        importarMemoria: importarMemoria
    };

})();

if (typeof window !== 'undefined') {
    window.MotorIA = MotorIA;
}
