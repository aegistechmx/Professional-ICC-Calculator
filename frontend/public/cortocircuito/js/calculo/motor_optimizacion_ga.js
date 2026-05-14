/**
 * motor_optimizacion_ga.js — Motor de Optimización con Algoritmo Genético
 * 
 * Optimización global con:
 * - Restricciones NOM duras (no negociables)
 * - Coordinación por banda min/max (tipo ETAP)
 * - GA estable con elitismo
 * - Cromosoma: calibre, paralelos, breaker, ajustes LSIG
 * 
 * Nivel industrial tipo ETAP/SKM
 */

var MotorOptimizacionGA = (function() {

    /**
     * Configuración del GA
     */
    var CONFIG = {
        poblacion: 40,
        generaciones: 60,
        elitismo: 2,
        probMutacion: 0.15,
        penalizacionDura: -1e6,
        pesos: {
            selectividad: 0.4,
            arcFlash: 0.3,
            margen: 0.2,
            costo: 0.1
        }
    };

    /**
     * Punto de entrada principal
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones de configuración
     * @returns {Object} Mejor individuo encontrado
     */
    function optimizar(sistema, opciones) {
        opciones = opciones || {};
        
        // Sobrescribir config si se proporciona
        if (opciones.poblacion) CONFIG.poblacion = opciones.poblacion;
        if (opciones.generaciones) CONFIG.generaciones = opciones.generaciones;
        if (opciones.probMutacion) CONFIG.probMutacion = opciones.probMutacion;
        if (opciones.pesos) {
            if (opciones.pesos.selectividad !== undefined) CONFIG.pesos.selectividad = opciones.pesos.selectividad;
            if (opciones.pesos.arcFlash !== undefined) CONFIG.pesos.arcFlash = opciones.pesos.arcFlash;
            if (opciones.pesos.margen !== undefined) CONFIG.pesos.margen = opciones.pesos.margen;
            if (opciones.pesos.costo !== undefined) CONFIG.pesos.costo = opciones.pesos.costo;
        }

        console.log('[MotorOptimizacionGA] Iniciando optimización GA con ' + sistema.nodos.length + ' nodos');
        console.log('[MotorOptimizacionGA] Config:', CONFIG);

        var poblacion = crearPoblacionInicial(sistema);

        evaluarPoblacion(poblacion, sistema);

        for (var gen = 0; gen < CONFIG.generaciones; gen++) {
            poblacion = seleccionar(poblacion);
            poblacion = cruzar(poblacion);
            poblacion = mutar(poblacion, sistema);

            evaluarPoblacion(poblacion, sistema);

            poblacion = aplicarElitismo(poblacion);

            debugGen(gen, poblacion);
        }

        var mejor = mejorIndividuo(poblacion);
        console.log('[MotorOptimizacionGA] Optimización completada. Score final: ' + mejor.eval.score.toFixed(4));

        // Aprender de la mejor solución
        if (typeof MotorIA !== 'undefined' && MotorIA.aprender) {
            MotorIA.aprender(sistema, mejor);
        }

        return mejor;
    }

    /**
     * Crear población inicial
     * @param {Object} sistema - Sistema con nodos
     * @returns {Array} Población inicial
     */
    function crearPoblacionInicial(sistema) {
        var poblacion = [];

        // Usar IA para warm-start si hay suficientes datos
        var usarIA = typeof MotorIA !== 'undefined' && MotorIA.getEstadisticas && MotorIA.getEstadisticas().total >= 10;

        for (var i = 0; i < CONFIG.poblacion; i++) {
            if (usarIA && i < Math.floor(CONFIG.poblacion / 2)) {
                // Primera mitad: individuos inteligentes
                poblacion.push(crearIndividuoInteligente(sistema));
            } else {
                // Segunda mitad: individuos aleatorios (diversidad)
                poblacion.push(crearIndividuoRandom(sistema));
            }
        }

        return poblacion;
    }

    /**
     * Crear individuo inteligente usando IA
     * @param {Object} sistema - Sistema con nodos
     * @returns {Array} Cromosoma inteligente
     */
    function crearIndividuoInteligente(sistema) {
        if (typeof MotorIA !== 'undefined' && MotorIA.crearIndividuoInteligente) {
            return MotorIA.crearIndividuoInteligente(sistema);
        }
        return crearIndividuoRandom(sistema);
    }

    /**
     * Crear individuo aleatorio
     * @param {Object} sistema - Sistema con nodos
     * @returns {Array} Cromosoma del individuo
     */
    function crearIndividuoRandom(sistema) {
        return sistema.nodos.map(function(nodo) {
            return {
                calibre: randomDe(nodo.opciones ? nodo.opciones.calibres : [250, 300, 350, 400, 500]),
                paralelos: randomDe(nodo.opciones ? nodo.opciones.paralelos : [1, 2]),
                breaker: randomDe(nodo.opciones ? nodo.opciones.breakers : generarBreakersNodo(nodo)),
                ajustes: randomAjustes(nodo)
            };
        });
    }

    /**
     * Generar breakers para un nodo
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Breakers candidatos
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
            // Fallback genérico
            breakers = [
                { In: 200, Icu: 25, modelo: 'Generic 200A' },
                { In: 300, Icu: 35, modelo: 'Generic 300A' },
                { In: 400, Icu: 50, modelo: 'Generic 400A' }
            ];
        }

        return breakers;
    }

    /**
     * Evaluar población completa
     * @param {Array} poblacion - Población
     * @param {Object} sistema - Sistema
     */
    function evaluarPoblacion(poblacion, sistema) {
        for (var i = 0; i < poblacion.length; i++) {
            var ind = poblacion[i];
            ind.eval = evaluarIndividuo(ind, sistema);
        }
    }

    /**
     * Evaluar individuo
     * @param {Array} ind - Cromosoma del individuo
     * @param {Object} sistema - Sistema
     * @returns {Object} Evaluación
     */
    function evaluarIndividuo(ind, sistema) {
        // 1. HARD CONSTRAINTS NOM
        var hard = validarRestriccionesDuras(ind, sistema);

        if (!hard.ok) {
            return {
                valido: false,
                score: CONFIG.penalizacionDura,
                fallas: hard.fallas
            };
        }

        // 2. SOFT METRICS
        var coord = evaluarCoordinacionBandas(ind);
        var arc = evaluarArcFlash(ind, sistema);
        var margen = evaluarMargenTermico(ind, sistema);
        var costo = evaluarCosto(ind);

        // Normalización: se asume que costo y arc flash son minimizados
        var score = (
            CONFIG.pesos.selectividad * coord.indice +
            CONFIG.pesos.arcFlash * (1 / (1 + arc.energia / 100)) +
            CONFIG.pesos.margen * margen +
            CONFIG.pesos.costo * (1 / (1 + costo / 1000))
        );

        return {
            valido: true,
            score: score,
            detalle: {
                coord: coord,
                arc: arc,
                margen: margen,
                costo: costo
            }
        };
    }

    /**
     * Validar restricciones duras NOM
     * @param {Array} ind - Cromosoma
     * @param {Object} sistema - Sistema
     * @returns {Object} { ok, fallas }
     */
    function validarRestriccionesDuras(ind, sistema) {
        var fallas = [];

        for (var i = 0; i < ind.length; i++) {
            var nodo = ind[i];
            var data = sistema.nodos[i];

            // Ampacidad CDT
            if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.calcularAmpacidadCDT) {
                // Buscar ampacidad base en tabla para el calibre propuesto por el GA
                var ampBaseLookup = AmpacidadReal.ampacidadBase(nodo.calibre, data.tempTerminal || 75);
                
                var amp = AmpacidadReal.calcularAmpacidadCDT({
                    I_carga: data.Icarga || data.carga || 100,
                    factorCarga: data.Fcc || 1.0,
                    F_temp: data.F_temp || 1.0,
                    numConductores: data.numConductores || 3,
                    paralelos: nodo.paralelos || 1,
                    I_tabla: ampBaseLookup,
                    tempTerminal: data.tempTerminal || 75,
                    I_proteccion: nodo.breaker ? nodo.breaker.In : 300
                });

                if (!amp.ok) {
                    fallas.push('Ampacidad nodo ' + i + ': ' + (amp.error || 'Desconocido'));
                }
            }

            // Interruptiva
            var Icu = nodo.breaker ? (nodo.breaker.Icu[480] || nodo.breaker.Icu || 25) : 25;
            var Isc = data.Isc_kA || data.Isc || 10;
            if (Icu < Isc) {
                fallas.push('Icu insuficiente nodo ' + i + ': ' + Icu + 'kA < ' + Isc + 'kA');
            }
        }

        return {
            ok: fallas.length === 0,
            fallas: fallas
        };
    }

    /**
     * Evaluar coordinación por banda real
     * @param {Array} ind - Cromosoma
     * @returns {Object} { indice }
     */
    function evaluarCoordinacionBandas(ind) {
        var conflictos = 0;

        for (var i = 0; i < ind.length - 1; i++) {
            var down = ind[i].breaker ? ind[i].breaker.banda : null;
            var up = ind[i + 1].breaker ? ind[i + 1].breaker.banda : null;

            if (down && up && hayCruceBanda(down, up)) {
                conflictos++;
            }
        }

        return {
            indice: 1 / (1 + conflictos)
        };
    }

    /**
     * Verificar cruce entre bandas
     * @param {Object} b1 - Banda 1
     * @param {Object} b2 - Banda 2
     * @returns {boolean} Hay cruce
     */
    function hayCruceBanda(b1, b2) {
        var corrientes = generarRangoLog(10, 100000, 30);

        for (var i = 0; i < corrientes.length; i++) {
            var I = corrientes[i];
            var t1min = b1.min ? b1.min(I) : 10;
            var t1max = b1.max ? b1.max(I) : 0.1;
            var t2min = b2.min ? b2.min(I) : 10;

            if (t2min <= t1max) return true;
        }

        return false;
    }

    /**
     * Evaluar Arc Flash
     * @param {Array} ind - Cromosoma
     * @param {Object} sistema - Sistema de referencia
     * @returns {Object} { energia }
     */
    function evaluarArcFlash(ind, sistema) {
        var energia = 0;

        for (var i = 0; i < ind.length; i++) {
            var n = ind[i];
            // Usar corriente de falla del sistema, no del objeto breaker del cromosoma
            var I = sistema.nodos[i].Isc_kA || 10;
            var t = n.breaker && n.breaker.banda && n.breaker.banda.max ? n.breaker.banda.max(I) : 0.3;
            energia += I * t;
        }

        return {
            energia: energia
        };
    }

    /**
     * Evaluar margen térmico
     * @param {Array} ind - Cromosoma
     * @param {Object} sistema - Sistema
     * @returns {number} Margen promedio
     */
    function evaluarMargenTermico(ind, sistema) {
        var total = 0;

        for (var i = 0; i < ind.length; i++) {
            var data = sistema.nodos[i];
            // Obtener ampacidad real para el cálculo de margen térmico (no usar el nombre del calibre)
            var ampBase = (typeof AmpacidadReal !== 'undefined') ? 
                AmpacidadReal.ampacidadBase(ind[i].calibre, data.tempTerminal || 75) : 300;
            var Icapacidad = ampBase * (ind[i].paralelos || 1);
            var Icarga = data.Icarga || data.carga || 100;
            total += (Icapacidad / Icarga);
        }

        return total / ind.length;
    }

    /**
     * Evaluar costo
     * @param {Array} ind - Cromosoma
     * @returns {number} Costo total
     */
    function evaluarCosto(ind) {
        var costo = 0;

        for (var i = 0; i < ind.length; i++) {
            costo += (ind[i].breaker ? (ind[i].breaker.costo || 1) : 1);
        }

        return costo;
    }

    /**
     * Selección (torneo)
     * @param {Array} poblacion - Población
     * @returns {Array} Seleccionados
     */
    function seleccionar(poblacion) {
        return poblacion.sort(function(a, b) {
            return b.eval.score - a.eval.score;
        }).slice(0, Math.floor(CONFIG.poblacion / 2));
    }

    /**
     * Cruce
     * @param {Array} poblacion - Población
     * @returns {Array} Hijos
     */
    function cruzar(poblacion) {
        var hijos = [];

        while (hijos.length < CONFIG.poblacion) {
            var p1 = randomDe(poblacion);
            var p2 = randomDe(poblacion);

            hijos.push(crossover(p1, p2));
        }

        return hijos;
    }

    /**
     * Crossover de dos padres
     * @param {Array} p1 - Padre 1
     * @param {Array} p2 - Padre 2
     * @returns {Array} Hijo
     */
    function crossover(p1, p2) {
        return p1.map(function(gen, i) {
            return Math.random() < 0.5 ? gen : p2[i];
        });
    }

    /**
     * Mutación
     * @param {Array} poblacion - Población
     * @param {Object} sistema - Sistema
     * @returns {Array} Población mutada
     */
    function mutar(poblacion, sistema) {
        return poblacion.map(function(ind) {
            if (Math.random() < CONFIG.probMutacion) {
                var idx = randInt(0, ind.length - 1);
                var nodo = sistema.nodos[idx];

                ind[idx] = {
                    calibre: randomDe(nodo.opciones ? nodo.opciones.calibres : [250, 300, 350, 400, 500]),
                    paralelos: randomDe(nodo.opciones ? nodo.opciones.paralelos : [1, 2]),
                    breaker: randomDe(nodo.opciones ? nodo.opciones.breakers : generarBreakersNodo(nodo)),
                    ajustes: randomAjustes(nodo)
                };
            }

            return ind;
        });
    }

    /**
     * Aplicar elitismo
     * @param {Array} poblacion - Población
     * @returns {Array} Población con elitismo
     */
    function aplicarElitismo(poblacion) {
        return poblacion
            .sort(function(a, b) {
                return b.eval.score - a.eval.score;
            })
            .slice(0, CONFIG.poblacion);
    }

    /**
     * Mejor individuo
     * @param {Array} poblacion - Población
     * @returns {Object} Mejor individuo
     */
    function mejorIndividuo(poblacion) {
        return poblacion.reduce(function(best, curr) {
            return curr.eval.score > best.eval.score ? curr : best;
        });
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
     * Elemento aleatorio de array
     * @param {Array} arr - Array
     * @returns {*} Elemento aleatorio
     */
    function randomDe(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Entero aleatorio
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @returns {number} Entero aleatorio
     */
    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

    /**
     * Generar rango logarítmico
     * @param {number} min - Mínimo
     * @param {number} max - Máximo
     * @param {number} n - Número de puntos
     * @returns {Array} Rango log
     */
    function generarRangoLog(min, max, n) {
        n = n || 30;
        var arr = [];
        var logMin = Math.log10(min);
        var logMax = Math.log10(max);

        for (var i = 0; i < n; i++) {
            var val = Math.pow(10, logMin + (i / n) * (logMax - logMin));
            arr.push(val);
        }

        return arr;
    }

    /**
     * Debug de generación
     * @param {number} gen - Número de generación
     * @param {Array} poblacion - Población
     */
    function debugGen(gen, poblacion) {
        var best = mejorIndividuo(poblacion);
        console.log('[MotorOptimizacionGA] Gen ' + gen + ' → Score: ' + best.eval.score.toFixed(4) + ' (válido: ' + best.eval.valido + ')');
    }

    /**
     * Actualizar configuración
     * @param {Object} nuevaConfig - Nueva configuración
     */
    function setConfig(nuevaConfig) {
        if (nuevaConfig.poblacion) CONFIG.poblacion = nuevaConfig.poblacion;
        if (nuevaConfig.generaciones) CONFIG.generaciones = nuevaConfig.generaciones;
        if (nuevaConfig.elitismo) CONFIG.elitismo = nuevaConfig.elitismo;
        if (nuevaConfig.probMutacion) CONFIG.probMutacion = nuevaConfig.probMutacion;
        if (nuevaConfig.penalizacionDura) CONFIG.penalizacionDura = nuevaConfig.penalizacionDura;
        if (nuevaConfig.pesos) {
            if (nuevaConfig.pesos.selectividad !== undefined) CONFIG.pesos.selectividad = nuevaConfig.pesos.selectividad;
            if (nuevaConfig.pesos.arcFlash !== undefined) CONFIG.pesos.arcFlash = nuevaConfig.pesos.arcFlash;
            if (nuevaConfig.pesos.margen !== undefined) CONFIG.pesos.margen = nuevaConfig.pesos.margen;
            if (nuevaConfig.pesos.costo !== undefined) CONFIG.pesos.costo = nuevaConfig.pesos.costo;
        }
    }

    /**
     * Obtener configuración actual
     * @returns {Object} Configuración
     */
    function getConfig() {
        return JSON.parse(JSON.stringify(CONFIG));
    }

    return {
        optimizar: optimizar,
        setConfig: setConfig,
        getConfig: getConfig
    };

})();

if (typeof window !== 'undefined') {
    window.MotorOptimizacionGA = MotorOptimizacionGA;
}
