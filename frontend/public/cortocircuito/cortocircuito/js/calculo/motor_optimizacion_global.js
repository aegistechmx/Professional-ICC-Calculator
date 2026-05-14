/**
 * motor_optimizacion_global.js — Motor de Optimización Global
 * 
 * Optimización multi-objetivo del sistema completo:
 * - Ampacidad NOM
 * - Breakers (catálogo real)
 * - Coordinación TCC (sin cruces)
 * - Arc Flash (minimizar energía)
 * - Costo (opcional)
 * 
 * Arquitectura tipo ETAP/SKM para nivel industrial
 */

var MotorOptimizacionGlobal = (function() {

    /**
     * Pesos para función de score multi-objetivo
     */
    var pesos = {
        seguridad: 0.4,      // Margen de ampacidad
        selectividad: 0.3,   // Índice de coordinación
        arcFlash: 0.2,       // Inverso de energía incidente
        costo: 0.1           // Inverso de costo
    };

    /**
     * Optimizar sistema completo
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones de optimización
     * @returns {Object} Mejor solución encontrada
     */
    function optimizarSistema(sistema, opciones) {
        opciones = opciones || {};
        var maxIteraciones = opciones.maxIteraciones || 1000;
        var usarGenetico = opciones.usarGenetico || false;

        console.log('[MotorOptimizacionGlobal] Iniciando optimización global con ' + sistema.nodos.length + ' nodos');

        var mejorSolucion = null;
        var mejorScore = -Infinity;

        if (usarGenetico) {
            console.log('[MotorOptimizacionGlobal] Usando algoritmo genético');
            mejorSolucion = evolucionar(sistema, opciones);
        } else {
            console.log('[MotorOptimizacionGlobal] Usando búsqueda exhaustiva limitada');
            var candidatos = generarCandidatosSistema(sistema, opciones);
            var evaluados = 0;

            for (var i = 0; i < candidatos.length && evaluados < maxIteraciones; i++) {
                var config = candidatos[i];
                var evaluacion = evaluarSistema(config);

                if (!evaluacion.valido) continue;

                if (evaluacion.score > mejorScore) {
                    mejorScore = evaluacion.score;
                    mejorSolucion = {
                        config: config,
                        evaluacion: evaluacion,
                        iteracion: evaluados
                    };
                    console.log('[MotorOptimizacionGlobal] Nuevo mejor score: ' + mejorScore.toFixed(4));
                }

                evaluados++;
            }

            console.log('[MotorOptimizacionGlobal] Evaluados: ' + evaluados + ' de ' + candidatos.length + ' candidatos');
        }

        if (!mejorSolucion) {
            console.warn('[MotorOptimizacionGlobal] No se encontró solución válida');
            return {
                ok: false,
                error: 'No se encontró solución válida'
            };
        }

        console.log('[MotorOptimizacionGlobal] Optimización completada. Score final: ' + mejorScore.toFixed(4));
        return {
            ok: true,
            solucion: mejorSolucion,
            score: mejorScore
        };
    }

    /**
     * Generar candidatos del sistema (producto cartesiano)
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones de generación
     * @returns {Array} Array de configuraciones candidatas
     */
    function generarCandidatosSistema(sistema, opciones) {
        opciones = opciones || {};
        var maxCandidatosPorNodo = opciones.maxCandidatosPorNodo || 5;

        var nodosCandidatos = [];

        for (var i = 0; i < sistema.nodos.length; i++) {
            var nodo = sistema.nodos[i];
            var candidatosNodo = generarCandidatosNodo(nodo, maxCandidatosPorNodo);
            nodosCandidatos.push(candidatosNodo);
        }

        var combinaciones = productoCartesiano(nodosCandidatos);
        console.log('[MotorOptimizacionGlobal] Candidatos generados: ' + combinaciones.length);

        return combinaciones;
    }

    /**
     * Generar candidatos para un nodo
     * @param {Object} nodo - Nodo del sistema
     * @param {number} maxCandidatos - Máximo de candidatos
     * @returns {Array} Candidatos para el nodo
     */
    function generarCandidatosNodo(nodo, maxCandidatos) {
        var candidatos = [];

        // Generar calibres de conductor
        var calibres = generarCalibres(nodo);
        
        // Generar breakers del catálogo
        var breakers = generarBreakers(nodo);

        // Producto cartesiano limitado
        var count = 0;
        for (var i = 0; i < calibres.length && count < maxCandidatos; i++) {
            for (var j = 0; j < breakers.length && count < maxCandidatos; j++) {
                candidatos.push({
                    calibre: calibres[i],
                    breaker: breakers[j],
                    nodoId: nodo.id
                });
                count++;
            }
        }

        return candidatos;
    }

    /**
     * Generar calibres de conductor para un nodo
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Calibres candidatos
     */
    function generarCalibres(nodo) {
        var I_diseno = nodo.I_diseno || nodo.carga || 100;
        var calibres = [];

        // Calibres estándar AWG/kcmil
        var calibresEstandar = [14, 12, 10, 8, 6, 4, 2, 1, 1/0, 2/0, 3/0, 4/0, 250, 300, 350, 400, 500, 600, 750, 800, 900, 1000];

        for (var i = 0; i < calibresEstandar.length; i++) {
            var calibre = calibresEstandar[i];
            if (calibre >= I_diseno * 0.8 && calibre <= I_diseno * 2) {
                calibres.push(calibre);
            }
        }

        return calibres;
    }

    /**
     * Generar breakers del catálogo para un nodo
     * @param {Object} nodo - Nodo del sistema
     * @returns {Array} Breakers candidatos
     */
    function generarBreakers(nodo) {
        var breakers = [];

        if (typeof CatalogoSchneider !== 'undefined' && CatalogoSchneider.obtenerTodosBreakers) {
            var todos = CatalogoSchneider.obtenerTodosBreakers();
            var I_diseno = nodo.I_diseno || nodo.carga || 100;
            var Icc = nodo.Isc_kA || 10;

            for (var i = 0; i < todos.length; i++) {
                var b = todos[i];
                if (b.In >= I_diseno && b.Icu[480] >= Icc) {
                    breakers.push(b);
                }
            }
        }

        return breakers;
    }

    /**
     * Producto cartesiano de arrays
     * @param {Array} arrays - Array de arrays
     * @returns {Array} Producto cartesiano
     */
    function productoCartesiano(arrays) {
        if (arrays.length === 0) return [[]];
        if (arrays.length === 1) return arrays[0].map(function(x) { return [x]; });

        var resultado = [[]];
        for (var i = 0; i < arrays.length; i++) {
            var nuevoResultado = [];
            for (var j = 0; j < resultado.length; j++) {
                for (var k = 0; k < arrays[i].length; k++) {
                    nuevoResultado.push(resultado[j].concat([arrays[i][k]]));
                }
            }
            resultado = nuevoResultado;
        }

        return resultado;
    }

    /**
     * Evaluar configuración del sistema
     * @param {Array} config - Configuración de nodos
     * @returns {Object} Evaluación completa
     */
    function evaluarSistema(config) {
        var resultado = {
            valido: true,
            score: 0,
            detalle: {}
        };

        // 1. Ampacidad NOM
        var amp = evaluarAmpacidad(config);
        if (!amp.ok) {
            resultado.valido = false;
            resultado.detalle.amp = amp;
            return resultado;
        }

        // 2. Cortocircuito
        var corto = evaluarCorto(config);
        if (!corto.ok) {
            resultado.valido = false;
            resultado.detalle.corto = corto;
            return resultado;
        }

        // 3. Coordinación TCC
        var coord = evaluarCoordinacion(config);
        if (!coord.ok) {
            resultado.valido = false;
            resultado.detalle.coord = coord;
            return resultado;
        }

        // 4. Arc Flash
        var arc = evaluarArcFlash(config);

        // 5. Score multi-objetivo
        resultado.score = calcularScore({
            amp: amp,
            corto: corto,
            coord: coord,
            arc: arc
        });

        resultado.detalle = {
            amp: amp,
            corto: corto,
            coord: coord,
            arc: arc
        };

        return resultado;
    }

    /**
     * Evaluar ampacidad NOM
     * @param {Array} config - Configuración
     * @returns {Object} Evaluación de ampacidad
     */
    function evaluarAmpacidad(config) {
        var margenTotal = 0;
        var violaciones = 0;

        for (var i = 0; i < config.length; i++) {
            var c = config[i];
            var I_diseno = c.nodo.I_diseno || c.nodo.carga || 100;
            var calibre = c.calibre;

            if (calibre < I_diseno) {
                violaciones++;
            } else {
                margenTotal += (calibre / I_diseno - 1);
            }
        }

        return {
            ok: violaciones === 0,
            margen: margenTotal / config.length,
            violaciones: violaciones
        };
    }

    /**
     * Evaluar cortocircuito
     * @param {Array} config - Configuración
     * @returns {Object} Evaluación de cortocircuito
     */
    function evaluarCorto(config) {
        var violaciones = 0;
        var costoTotal = 0;

        for (var i = 0; i < config.length; i++) {
            var c = config[i];
            var Icc = c.nodo.Isc_kA || 10;
            var Icu = c.breaker.Icu[480] || 25;

            if (Icu < Icc) {
                violaciones++;
            }

            costoTotal += c.breaker.In * 0.1 + c.calibre * 0.05; // Costo simplificado
        }

        return {
            ok: violaciones === 0,
            violaciones: violaciones,
            costo: costoTotal
        };
    }

    /**
     * Evaluar coordinación TCC
     * @param {Array} config - Configuración
     * @returns {Object} Evaluación de coordinación
     */
    function evaluarCoordinacion(config) {
        var conflictos = 0;

        for (var i = 0; i < config.length - 1; i++) {
            var down = config[i];
            var up = config[i + 1];

            var hayCruce = verificarCruce(down, up);
            if (hayCruce) conflictos++;
        }

        return {
            ok: conflictos === 0,
            conflictos: conflictos,
            indice: 1 / (1 + conflictos)
        };
    }

    /**
     * Verificar cruce entre dos nodos
     * @param {Object} down - Nodo downstream
     * @param {Object} up - Nodo upstream
     * @returns {boolean} Hay cruce
     */
    function verificarCruce(down, up) {
        // Verificación simplificada: upstream debe tener tiempos mayores
        var InDown = down.breaker.In;
        var InUp = up.breaker.In;

        // Regla básica: upstream debe tener In mayor
        if (InUp <= InDown) return true;

        // Verificación de TCC si está disponible
        if (typeof TCCDigitalizerPro !== 'undefined' && TCCDigitalizerPro.verificarCoordinacionBanda) {
            // Aquí se usarían curvas reales
            // Por ahora, regla simplificada
        }

        return false;
    }

    /**
     * Evaluar Arc Flash
     * @param {Array} config - Configuración
     * @returns {Object} Evaluación de arc flash
     */
    function evaluarArcFlash(config) {
        var energiaTotal = 0;

        for (var i = 0; i < config.length; i++) {
            var c = config[i];
            var Icc = c.nodo.Isc_kA || 10;
            var In = c.breaker.In;

            // Tiempo de disparo estimado
            var t = estimarTiempoDisparo(Icc, In);

            // Energía incidente (simplificado: E ∝ I² × t)
            var energia = Math.pow(Icc, 2) * t;
            energiaTotal += energia;
        }

        return {
            energia: energiaTotal
        };
    }

    /**
     * Estimar tiempo de disparo
     * @param {number} Icc - Corriente de cortocircuito
     * @param {number} In - Corriente nominal
     * @returns {number} Tiempo en segundos
     */
    function estimarTiempoDisparo(Icc, In) {
        var Ipu = Icc / In;

        if (Ipu >= 10) return 0.02; // Instantáneo
        if (Ipu >= 5) return 0.3; // Short delay
        if (Ipu >= 1) return 5; // Long delay
        return 10; // Sobrecarga
    }

    /**
     * Calcular score multi-objetivo
     * @param {Object} res - Resultados parciales
     * @returns {number} Score total
     */
    function calcularScore(res) {
        var scoreSeguridad = res.amp.margen;
        var scoreSelectividad = res.coord.indice;
        var scoreArc = 1 / (res.arc.energia + 0.01);
        var scoreCosto = 1 / (res.corto.costo + 1);

        return (
            pesos.seguridad * scoreSeguridad +
            pesos.selectividad * scoreSelectividad +
            pesos.arcFlash * scoreArc +
            pesos.costo * scoreCosto
        );
    }

    /**
     * Algoritmo genético para optimización inteligente
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones del algoritmo
     * @returns {Object} Mejor solución
     */
    function evolucionar(sistema, opciones) {
        opciones = opciones || {};
        var tamPoblacion = opciones.tamPoblacion || 50;
        var generaciones = opciones.generaciones || 100;
        var tasaMutacion = opciones.tasaMutacion || 0.1;

        // Generar población inicial
        var poblacion = generarPoblacionInicial(sistema, tamPoblacion);

        for (var gen = 0; gen < generaciones; gen++) {
            // Evaluar población
            for (var i = 0; i < poblacion.length; i++) {
                if (!poblacion[i].evaluacion) {
                    poblacion[i].evaluacion = evaluarSistema(poblacion[i].config);
                }
            }

            // Ordenar por score
            poblacion.sort(function(a, b) {
                return (b.evaluacion.score || -Infinity) - (a.evaluacion.score || -Infinity);
            });

            // Selección (torneo)
            var seleccionados = seleccionar(poblacion, tamPoblacion / 2);

            // Cruce
            var hijos = cruzar(seleccionados, tamPoblacion / 2);

            // Mutación
            mutar(hijos, sistema, tasaMutacion);

            // Reemplazar
            poblacion = seleccionados.concat(hijos);

            if (gen % 10 === 0) {
                console.log('[MotorOptimizacionGlobal] Generación ' + gen + ', mejor score: ' + (poblacion[0].evaluacion.score || 0).toFixed(4));
            }
        }

        return poblacion[0];
    }

    /**
     * Generar población inicial
     * @param {Object} sistema - Sistema
     * @param {number} tam - Tamaño de población
     * @returns {Array} Población inicial
     */
    function generarPoblacionInicial(sistema, tam) {
        var poblacion = [];
        var candidatos = generarCandidatosSistema(sistema, { maxCandidatosPorNodo: 3 });

        for (var i = 0; i < tam; i++) {
            var idx = Math.floor(Math.random() * candidatos.length);
            poblacion.push({
                config: candidatos[idx],
                evaluacion: null
            });
        }

        return poblacion;
    }

    /**
     * Selección por torneo
     * @param {Array} poblacion - Población
     * @param {number} cantidad - Cantidad a seleccionar
     * @returns {Array} Seleccionados
     */
    function seleccionar(poblacion, cantidad) {
        var seleccionados = [];

        for (var i = 0; i < cantidad; i++) {
            var idx1 = Math.floor(Math.random() * poblacion.length);
            var idx2 = Math.floor(Math.random() * poblacion.length);
            var ganador = poblacion[idx1].evaluacion.score > poblacion[idx2].evaluacion.score ? poblacion[idx1] : poblacion[idx2];
            seleccionados.push(JSON.parse(JSON.stringify(ganador)));
        }

        return seleccionados;
    }

    /**
     * Cruce de individuos
     * @param {Array} padres - Padres
     * @param {number} cantidad - Cantidad de hijos
     * @returns {Array} Hijos
     */
    function cruzar(padres, cantidad) {
        var hijos = [];

        for (var i = 0; i < cantidad; i++) {
            var idx1 = Math.floor(Math.random() * padres.length);
            var idx2 = Math.floor(Math.random() * padres.length);
            var padre1 = padres[idx1].config;
            var padre2 = padres[idx2].config;

            var hijo = [];
            for (var j = 0; j < padre1.length; j++) {
                hijo.push(Math.random() < 0.5 ? padre1[j] : padre2[j]);
            }

            hijos.push({
                config: hijo,
                evaluacion: null
            });
        }

        return hijos;
    }

    /**
     * Mutación de individuos
     * @param {Array} individuos - Individuos
     * @param {Object} sistema - Sistema original
     * @param {number} tasa - Tasa de mutación
     */
    function mutar(individuos, sistema, tasa) {
        for (var i = 0; i < individuos.length; i++) {
            if (Math.random() < tasa) {
                var idxNodo = Math.floor(Math.random() * individuos[i].config.length);
                var nodo = sistema.nodos[idxNodo];
                var nuevosCandidatos = generarCandidatosNodo(nodo, 3);
                var idxNuevo = Math.floor(Math.random() * nuevosCandidatos.length);
                individuos[i].config[idxNodo] = nuevosCandidatos[idxNuevo];
                individuos[i].evaluacion = null;
            }
        }
    }

    /**
     * Actualizar pesos de optimización
     * @param {Object} nuevosPesos - Nuevos pesos
     */
    function setPesos(nuevosPesos) {
        if (nuevosPesos.seguridad !== undefined) pesos.seguridad = nuevosPesos.seguridad;
        if (nuevosPesos.selectividad !== undefined) pesos.selectividad = nuevosPesos.selectividad;
        if (nuevosPesos.arcFlash !== undefined) pesos.arcFlash = nuevosPesos.arcFlash;
        if (nuevosPesos.costo !== undefined) pesos.costo = nuevosPesos.costo;
    }

    /**
     * Obtener pesos actuales
     * @returns {Object} Pesos actuales
     */
    function getPesos() {
        return JSON.parse(JSON.stringify(pesos));
    }

    return {
        optimizarSistema: optimizarSistema,
        generarCandidatosSistema: generarCandidatosSistema,
        evaluarSistema: evaluarSistema,
        calcularScore: calcularScore,
        evolucionar: evolucionar,
        setPesos: setPesos,
        getPesos: getPesos
    };

})();

if (typeof window !== 'undefined') {
    window.MotorOptimizacionGlobal = MotorOptimizacionGlobal;
}
