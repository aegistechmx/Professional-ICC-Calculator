/**
 * coordinacion_total_pro.js — Motor de Coordinación Total PRO
 * Coordinación selectiva multi-nivel con ajuste automático LSIG
 * Nivel industrial: similar a ETAP/SKM PowerTools
 */

var CoordinacionTotalPro = (function() {
    
    /**
     * Estructura de nodo de protección
     */
    function NodoProteccion(id, parent, breaker, curvaTCC) {
        this.id = id;
        this.parent = parent || null;
        this.children = [];
        this.breaker = breaker || {};
        this.curvaTCC = curvaTCC || [];
    }

    /**
     * Construir árbol de protección desde puntos del sistema
     * @param {Array} puntos - Puntos del sistema
     * @param {Object} estado - Estado del sistema con nodos
     * @returns {Object} Árbol de protección
     */
    function construirArbolProteccion(puntos, estado) {
        var nodos = {};
        var raiz = null;

        // Crear nodos de protección
        for (var i = 0; i < puntos.length; i++) {
            var punto = puntos[i];
            var nodoEstado = estado.nodos[i];
            
            if (!nodoEstado || !nodoEstado.equip) continue;

            // Generar curva TCC si existe CurvasTCCPro
            var curvaTCC = [];
            if (typeof CurvasTCCPro !== 'undefined' && nodoEstado.equip) {
                var params = {
                    In: nodoEstado.equip.cap || 250,
                    long_pickup: nodoEstado.equip.long_pickup || 1.0,
                    long_delay: nodoEstado.equip.long_delay || 6,
                    short_pickup: nodoEstado.equip.short_pickup || 6,
                    short_delay: nodoEstado.equip.short_delay || 0.3,
                    instantaneo: nodoEstado.equip.instantaneo || 10,
                    ground_pickup: nodoEstado.equip.ground_pickup || 0.3,
                    ground_delay: nodoEstado.equip.ground_delay || 0.1
                };
                curvaTCC = CurvasTCCPro.generarCurvaLSIG(params);
            }

            nodos[i] = new NodoProteccion(i, null, nodoEstado.equip, curvaTCC);
        }

        // Establecer relaciones parent-child (asumiendo orden jerárquico)
        for (var i = 0; i < puntos.length; i++) {
            if (!nodos[i]) continue;
            
            // Buscar parent (nodo anterior en el sistema)
            for (var j = i - 1; j >= 0; j--) {
                if (nodos[j]) {
                    nodos[i].parent = nodos[j];
                    nodos[j].children.push(nodos[i]);
                    break;
                }
            }

            if (!nodos[i].parent) {
                raiz = nodos[i];
            }
        }

        return {
            nodos: nodos,
            raiz: raiz
        };
    }

    /**
     * Obtener todos los pares upstream-downstream
     * @param {Object} arbol - Árbol de protección
     * @returns {Array} Pares {up, down}
     */
    function obtenerParesUpDown(arbol) {
        var pares = [];

        function recorrer(nodo) {
            if (!nodo) return;

            for (var i = 0; i < nodo.children.length; i++) {
                var child = nodo.children[i];
                pares.push({ up: nodo, down: child });
                recorrer(child);
            }
        }

        recorrer(arbol.raiz);
        return pares;
    }

    /**
     * Verificar coordinación entre dos curvas
     * Regla: t_upstream >= 1.3 * t_downstream
     * @param {Array} curvaUp - Curva upstream
     * @param {Array} curvaDown - Curva downstream
     * @param {number} margen - Margen de selectividad (default 1.3)
     * @returns {Object} { coordinado, cruces, margenMinimo }
     */
    function verificarCoordinacion(curvaUp, curvaDown, margen) {
        margen = margen || 1.3;
        var cruces = [];
        var margenMinimo = Infinity;

        if (!curvaUp || !curvaDown || curvaUp.length === 0 || curvaDown.length === 0) {
            return { coordinado: false, cruces: [], margenMinimo: 0 };
        }

        for (var i = 0; i < curvaDown.length; i++) {
            var p = curvaDown[i];
            var tUp = null;

            if (typeof CurvasTCCPro !== 'undefined') {
                tUp = CurvasTCCPro.interpolarLogLog(curvaUp, p.I);
            }

            if (tUp) {
                var margenActual = tUp / p.t;
                margenMinimo = Math.min(margenMinimo, margenActual);

                if (tUp < margen * p.t) {
                    cruces.push({
                        I: p.I,
                        t_downstream: p.t,
                        t_upstream: tUp,
                        margen: margenActual
                    });
                }
            }
        }

        return {
            coordinado: cruces.length === 0,
            cruces: cruces,
            margenMinimo: margenMinimo === Infinity ? 0 : margenMinimo
        };
    }

    /**
     * Ajustar parámetros LSIG para mejorar coordinación
     * @param {Object} nodoUp - Nodo upstream
     * @param {Object} nodoDown - Nodo downstream
     * @returns {Object} Cambios aplicados
     */
    function ajustarCoordenacion(nodoUp, nodoDown) {
        var cambios = {};

        // Estrategia 1: Ajustar upstream (primero)
        if (nodoUp.breaker) {
            // Aumentar long_delay
            if (nodoUp.breaker.long_delay !== undefined) {
                nodoUp.breaker.long_delay = Math.min(12, (nodoUp.breaker.long_delay || 6) + 1);
                cambios.long_delay_up = nodoUp.breaker.long_delay;
            }

            // Aumentar short_delay
            if (nodoUp.breaker.short_delay !== undefined) {
                nodoUp.breaker.short_delay = Math.min(0.5, (nodoUp.breaker.short_delay || 0.3) + 0.05);
                cambios.short_delay_up = nodoUp.breaker.short_delay;
            }

            // Subir short_pickup
            if (nodoUp.breaker.short_pickup !== undefined) {
                nodoUp.breaker.short_pickup = Math.min(10, (nodoUp.breaker.short_pickup || 6) + 0.5);
                cambios.short_pickup_up = nodoUp.breaker.short_pickup;
            }

            // Subir instantaneo
            if (nodoUp.breaker.instantaneo !== undefined) {
                nodoUp.breaker.instantaneo = Math.min(12, (nodoUp.breaker.instantaneo || 10) + 1);
                cambios.instantaneo_up = nodoUp.breaker.instantaneo;
            }
        }

        // Estrategia 2: Ajustar downstream (si upstream no basta)
        if (nodoDown.breaker) {
            // Reducir long_delay
            if (nodoDown.breaker.long_delay !== undefined) {
                nodoDown.breaker.long_delay = Math.max(2, (nodoDown.breaker.long_delay || 6) - 0.5);
                cambios.long_delay_down = nodoDown.breaker.long_delay;
            }

            // Reducir short_delay
            if (nodoDown.breaker.short_delay !== undefined) {
                nodoDown.breaker.short_delay = Math.max(0.1, (nodoDown.breaker.short_delay || 0.3) - 0.05);
                cambios.short_delay_down = nodoDown.breaker.short_delay;
            }
        }

        return cambios;
    }

    /**
     * Regenerar curvas TCC después de ajustes
     * @param {Object} arbol - Árbol de protección
     */
    function regenerarCurvas(arbol) {
        for (var id in arbol.nodos) {
            var nodo = arbol.nodos[id];
            if (!nodo.breaker) continue;

            if (typeof CurvasTCCPro !== 'undefined') {
                var params = {
                    In: nodo.breaker.cap || 250,
                    long_pickup: nodo.breaker.long_pickup || 1.0,
                    long_delay: nodo.breaker.long_delay || 6,
                    short_pickup: nodo.breaker.short_pickup || 6,
                    short_delay: nodo.breaker.short_delay || 0.3,
                    instantaneo: nodo.breaker.instantaneo || 10,
                    ground_pickup: nodo.breaker.ground_pickup || 0.3,
                    ground_delay: nodo.breaker.ground_delay || 0.1
                };
                nodo.curvaTCC = CurvasTCCPro.generarCurvaLSIG(params);
            }
        }
    }

    /**
     * Motor iterativo de coordinación
     * @param {Object} arbol - Árbol de protección
     * @param {number} maxIteraciones - Máximo de iteraciones
     * @param {number} margen - Margen de selectividad
     * @returns {Object} Resultado de coordinación
     */
    function motorCoordinacion(arbol, maxIteraciones, margen) {
        maxIteraciones = maxIteraciones || 20;
        margen = margen || 1.3;

        var iteraciones = 0;
        var cambiosTotales = [];
        var todoCoordinado = false;

        while (iteraciones < maxIteraciones && !todoCoordinado) {
            iteraciones++;
            var cambiosIteracion = [];
            var pares = obtenerParesUpDown(arbol);
            var paresCoordinados = 0;

            for (var i = 0; i < pares.length; i++) {
                var par = pares[i];
                var validacion = verificarCoordinacion(par.up.curvaTCC, par.down.curvaTCC, margen);

                if (validacion.coordinado) {
                    paresCoordinados++;
                } else {
                    var cambios = ajustarCoordenacion(par.up, par.down);
                    cambiosIteracion.push({
                        par: par.up.id + "->" + par.down.id,
                        cambios: cambios,
                        cruces: validacion.cruces
                    });
                }
            }

            if (cambiosIteracion.length > 0) {
                cambiosTotales.push({
                    iteracion: iteraciones,
                    cambios: cambiosIteracion
                });
                regenerarCurvas(arbol);
            }

            todoCoordinado = paresCoordinados === pares.length;
        }

        return {
            iteraciones: iteraciones,
            todoCoordinado: todoCoordinado,
            cambios: cambiosTotales,
            margen: margen
        };
    }

    /**
     * Validar coordinación de tierra
     * @param {Object} arbol - Árbol de protección
     * @returns {Object} Validación de tierra
     */
    function validarCoordinacionTierra(arbol) {
        var pares = obtenerParesUpDown(arbol);
        var crucesTierra = [];

        for (var i = 0; i < pares.length; i++) {
            var par = pares[i];
            var IgDown = par.down.breaker.ground_pickup || 0;
            var IgUp = par.up.breaker.ground_pickup || 0;

            // Regla: Ig_down < Ig_up (downstream más sensible)
            if (IgDown >= IgUp) {
                crucesTierra.push({
                    par: par.up.id + "->" + par.down.id,
                    Ig_down: IgDown,
                    Ig_up: IgUp,
                    error: "Downstream no es más sensible que upstream"
                });
            }
        }

        return {
            coordinado: crucesTierra.length === 0,
            cruces: crucesTierra
        };
    }

    /**
     * Calcular score global de coordinación
     * @param {Object} arbol - Árbol de protección
     * @param {number} margen - Margen de selectividad
     * @returns {Object} Score y métricas
     */
    function calcularScoreCoordinacion(arbol, margen) {
        margen = margen || 1.3;
        var pares = obtenerParesUpDown(arbol);
        var margenes = [];
        var tiemposPromedio = [];

        for (var i = 0; i < pares.length; i++) {
            var par = pares[i];
            var validacion = verificarCoordinacion(par.up.curvaTCC, par.down.curvaTCC, margen);
            margenes.push(validacion.margenMinimo);

            // Calcular tiempo promedio de curva downstream
            var sumaT = 0;
            for (var j = 0; j < par.down.curvaTCC.length; j++) {
                sumaT += par.down.curvaTCC[j].t;
            }
            tiemposPromedio.push(sumaT / par.down.curvaTCC.length);
        }

        var margenPromedio = margenes.length > 0 ? margenes.reduce(function(a, b) { return a + b; }, 0) / margenes.length : 0;
        var tiempoPromedio = tiemposPromedio.length > 0 ? tiemposPromedio.reduce(function(a, b) { return a + b; }, 0) / tiemposPromedio.length : 0;

        // Score: selectividad (50%) + rapidez (30%) + cobertura (20%)
        var score = 0;
        score += (margenPromedio / 2) * 0.5; // margen ideal ~2
        score += (1 - Math.min(tiempoPromedio / 10, 1)) * 0.3; // más rápido es mejor
        score += (pares.length > 0 ? 1 : 0) * 0.2; // cobertura

        return {
            score: Math.min(100, Math.max(0, score * 100)),
            margenPromedio: margenPromedio,
            tiempoPromedio: tiempoPromedio,
            paresValidados: pares.length
        };
    }

    /**
     * Ejecutar coordinación total
     * @param {Array} puntos - Puntos del sistema
     * @param {Object} estado - Estado del sistema
     * @param {Object} opciones - Opciones de configuración
     * @returns {Object} Resultado completo
     */
    function ejecutarCoordinacionTotal(puntos, estado, opciones) {
        opciones = opciones || {
            maxIteraciones: 20,
            margen: 1.3,
            validarTierra: true
        };

        // Verificar que hay al menos 2 dispositivos para evaluar coordinación
        var numDispositivos = 0;
        for (var i = 0; i < estado.nodos.length; i++) {
            if (estado.nodos[i] && estado.nodos[i].equip && estado.nodos[i].equip.cap) {
                numDispositivos++;
            }
        }

        if (numDispositivos < 2) {
            return {
                estado: "NO_EVALUABLE",
                iteraciones: 0,
                convergencia: true,
                margen: 0,
                score: { score: 100, margenPromedio: 0, tiempoPromedio: 0, paresValidados: 0 },
                cambios: [],
                validacionTierra: null,
                ajustes: {},
                arbol: null,
                razon: "Se requieren al menos 2 dispositivos para evaluar coordinación"
            };
        }

        // Construir árbol
        var arbol = construirArbolProteccion(puntos, estado);

        // Ejecutar motor de coordinación
        var resultado = motorCoordinacion(arbol, opciones.maxIteraciones, opciones.margen);

        // Validar coordinación de tierra
        var validacionTierra = null;
        if (opciones.validarTierra) {
            validacionTierra = validarCoordinacionTierra(arbol);
        }

        // Calcular score
        var score = calcularScoreCoordinacion(arbol, opciones.margen);

        // Recopilar ajustes finales
        var ajustesFinales = {};
        for (var id in arbol.nodos) {
            var nodo = arbol.nodos[id];
            if (nodo.breaker) {
                ajustesFinales[id] = {
                    id: id,
                    breaker: nodo.breaker
                };
            }
        }

        return {
            estado: resultado.todoCoordinado ? "COORDINADO" : "PARCIALMENTE_COORDINADO",
            iteraciones: resultado.iteraciones,
            convergencia: resultado.todoCoordinado,
            margen: resultado.margen,
            score: score,
            cambios: resultado.cambios,
            validacionTierra: validacionTierra,
            ajustes: ajustesFinales,
            arbol: arbol
        };
    }

    return {
        NodoProteccion: NodoProteccion,
        construirArbolProteccion: construirArbolProteccion,
        obtenerParesUpDown: obtenerParesUpDown,
        verificarCoordinacion: verificarCoordinacion,
        ajustarCoordenacion: ajustarCoordenacion,
        motorCoordinacion: motorCoordinacion,
        validarCoordinacionTierra: validarCoordinacionTierra,
        calcularScoreCoordinacion: calcularScoreCoordinacion,
        ejecutarCoordinacionTotal: ejecutarCoordinacionTotal
    };
})();

if (typeof window !== 'undefined') {
    window.CoordinacionTotalPro = CoordinacionTotalPro;
}
