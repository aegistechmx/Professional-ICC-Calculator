/**
 * app/orchestrator.js — Orquestador Central (El Cerebro)
 * Arquitectura tipo ETAP/SKM: coordinación de todos los engines
 * ÚNICO punto de entrada para cálculos del sistema
 * 
 * V2.0 - Integración con ValidationEngine (Single Source of Truth)
 * Reemplaza validaciones duplicadas por ValidationEngine.runAll()
 */

var Orchestrator = (function () {

    /**
     * Calcular sistema completo
     * @param {Object} sistema - Sistema con nodos y catálogos
     * @param {Object} opciones - Opciones de cálculo
     * @returns {Object} Sistema con resultados
     */
    function calcularSistema(sistema, opciones) {
        opciones = opciones || {};
        var Fcc = opciones.Fcc || 1.25;

        console.log("[Orchestrator] Iniciando cálculo del sistema con " + sistema.nodos.length + " nodos");

        // Validar sistema
        if (!sistema || !sistema.nodos || sistema.nodos.length === 0) {
            throw new Error("Sistema sin nodos");
        }

        // === NUEVO: Construir contexto normalizado para validación ===
        var systemContext = SimulationContext.buildContext({
            nodes: sistema.nodos,
            voltage: sistema.V,
            Isc: sistema.Isc,
            xrRatio: sistema.xrRatio,
            transformer: sistema.trafo,
            config: opciones
        });

        // Procesar cada nodo
        for (var i = 0; i < sistema.nodos.length; i++) {
            var nodo = sistema.nodos[i];

            console.log("[Orchestrator] Procesando nodo " + nodo.id);

            try {
                // 1. Ampacidad usando NOM (única fuente de verdad)
                if (nodo.calibre) {
                    nodo.resultados.ampacidad = ampacidadNOM({
                        calibre: nodo.calibre,
                        material: nodo.material || 'cobre',
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente || 30,
                        nConductores: nodo.agrupamiento || 3,
                        paralelos: nodo.paralelos || 1,
                        tempTerminal: 75
                    });
                }

                // 2. Selección automática de conductor (si no tiene calibre)
                if (!nodo.calibre || opciones.forzarSeleccion) {
                    nodo.resultados.conductor = ConductorSelector.seleccionarConductor({
                        I_carga: nodo.I_carga,
                        material: nodo.material || 'cobre',
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente || 30,
                        nConductores: nodo.agrupamiento || 3,
                        paralelos: nodo.paralelos || 1,
                        terminal: 75
                    });
                    // Actualizar nodo con calibre seleccionado
                    nodo.calibre = nodo.resultados.conductor.calibre;
                    nodo.resultados.ampacidad = nodo.resultados.conductor.detalle;
                } else {
                    // Validar conductor existente
                    nodo.resultados.conductor = ConductorSelector.validarConductorExistente({
                        calibre: nodo.calibre,
                        I_carga: nodo.I_carga,
                        material: nodo.material || 'cobre',
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente || 30,
                        nConductores: nodo.agrupamiento || 3,
                        paralelos: nodo.paralelos || 1,
                        terminal: 75
                    });
                }

                // 3. Caída de tensión (si hay datos de longitud)
                if (nodo.longitud && nodo.longitud > 0 && sistema.V) {
                    try {
                        var R = obtenerResistencia(nodo.calibre, nodo.material);
                        nodo.resultados.caidaTension = VoltageDropEngine.caidaTension({
                            sistema: sistema.tipoSistema || '3F',
                            V: sistema.V,
                            I: nodo.I_carga,
                            FP: nodo.FP || 0.9,
                            longitud_m: nodo.longitud,
                            R: R,
                            X: REACTANCIA_TIPICA
                        });

                        // Validar caída de tensión
                        var validacionCaida = VoltageDropEngine.validarCaidaTension(nodo.resultados.caidaTension, 3);
                        if (!validacionCaida.cumple) {
                            console.warn("[Orchestrator] Caída de tensión excede 3% en nodo " + nodo.id + ": " + validacionCaida.porcentaje.toFixed(2) + "%");
                        }
                    } catch (error) {
                        console.warn("[Orchestrator] No se pudo calcular caída de tensión para nodo " + nodo.id + ":", error.message);
                    }
                }

                // 4. === NUEVO: Validación centralizada con ValidationEngine ===
                // Extraer contexto de validación para el nodo
                var validationCtx = SimulationContext.extractValidationContext(nodo, systemContext);

                // Ejecutar todas las validaciones
                var validationResult = ValidationEngine.runAll(validationCtx);

                // Almacenar resultado de validación
                nodo.resultados.validacion = validationResult;
                nodo.resultados.valid = validationResult.valid;

                // Retro-compatibilidad: mantener validacionNOM para código legacy
                nodo.resultados.validacionNOM = convertValidationToNOMFormat(validationResult);

                // Log de errores críticos
                if (validationResult.errors.length > 0) {
                    console.error("[Orchestrator] Validación fallida para nodo " + nodo.id + ":",
                        validationResult.errors.map(function (e) { return e.code; }).join(', '));
                }

                // 5. Cortocircuito (si hay datos de impedancia)
                if (sistema.Z_fuente && sistema.V) {
                    nodo.resultados.falla = ShortcircuitEngine.calcularFalla(nodo, sistema);
                }

                // 6. Protección (si hay equipo y falla)
                if (nodo.equipo && nodo.resultados.falla) {
                    nodo.resultados.proteccion = ProtectionEngine.validarProteccion(nodo, nodo.resultados.falla, nodo.equipo);
                }

                console.log("[Orchestrator] Nodo " + nodo.id + " procesado correctamente");

            } catch (error) {
                console.error("[Orchestrator] Error procesando nodo " + nodo.id + ":", error.message);
                nodo.resultados.error = error.message;
            }
        }

        // 7. Coordinación (si hay múltiples dispositivos)
        if (opciones.evaluarCoordinacion && sistema.nodos.length >= 2) {
            sistema.resultadosCoordinacion = evaluarCoordinacionSistema(sistema, opciones);

            // === NUEVO: Validar coordinación con ValidationEngine ===
            var coordCtx = {
                curvesOverlap: sistema.resultadosCoordinacion?.hayCruce || false,
                coordinationMargin: sistema.resultadosCoordinacion?.margen || 0
            };
            var coordValidation = ValidationEngine.validateCoordination(coordCtx);
            sistema.resultadosCoordinacion.validacion = coordValidation;
        }

        // === NUEVO: Almacenar contexto del sistema para uso posterior ===
        sistema._context = systemContext;

        console.log("[Orchestrator] Cálculo del sistema completado");

        return sistema;
    }

    /**
     * Convierte resultado de ValidationEngine al formato legacy de NOMValidacion
     * Para retro-compatibilidad con código existente
     */
    function convertValidationToNOMFormat(validationResult) {
        return {
            status: validationResult.valid ? 'OK' : 'ERROR',
            errores: validationResult.errors.map(function (e) {
                return {
                    type: e.severity === 'CRITICAL' ? 'ERROR' : e.severity,
                    code: e.code,
                    message: e.message,
                    severity: e.severity,
                    data: e.data
                };
            }),
            resumen: validationResult.summary
        };
    }

    /**
     * Evaluar coordinación del sistema
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones de coordinación
     * @returns {Object} Resultado de coordinación
     */
    function evaluarCoordinacionSistema(sistema, opciones) {
        opciones = opciones || {};
        var margen = opciones.margen || 1.3;

        // Obtener pares upstream-downstream
        var pares = [];
        for (var i = 0; i < sistema.nodos.length - 1; i++) {
            var up = sistema.nodos[i];
            var down = sistema.nodos[i + 1];

            if (up.equipo && down.equipo) {
                pares.push({
                    up: up.equipo,
                    down: down.equipo,
                    nodoUp: up.id,
                    nodoDown: down.id
                });
            }
        }

        if (pares.length === 0) {
            return {
                status: "NO_EVALUABLE",
                razon: "Menos de 2 dispositivos con equipo"
            };
        }

        // Evaluar cada par
        var resultadosPares = [];
        for (var i = 0; i < pares.length; i++) {
            var resultado = CoordinationEngine.coordinar(pares[i].up, pares[i].down, { margen: margen });
            resultadosPares.push({
                nodoUp: pares[i].nodoUp,
                nodoDown: pares[i].nodoDown,
                resultado: resultado
            });
        }

        // Calcular score
        var score = CoordinationEngine.calcularScoreCoordinacion(pares, margen);

        return {
            status: score.score === 100 ? "COORDINADO" : "PARCIALMENTE_COORDINADO",
            score: score,
            pares: resultadosPares,
            margen: margen
        };
    }

    /**
     * Auto-corregir sistema (AutoFix usando nueva arquitectura)
     * @param {Object} sistema - Sistema con nodos
     * @param {Object} opciones - Opciones de corrección
     * @returns {Object} Sistema corregido con cambios
     */
    function autoCorregirSistema(sistema, opciones) {
        opciones = opciones || {};
        var cambios = [];

        console.log("[Orchestrator] Iniciando auto-corrección del sistema");

        for (var i = 0; i < sistema.nodos.length; i++) {
            var nodo = sistema.nodos[i];

            // 1. Corregir conductor si no cumple
            if (nodo.resultados.conductor && !nodo.resultados.conductor.cumple) {
                var sugerencia = nodo.resultados.conductor.sugerencia;
                if (sugerencia) {
                    var calibreAnterior = nodo.calibre;
                    nodo.calibre = sugerencia.calibre;

                    cambios.push({
                        tipo: 'CONDUCTOR',
                        nodo: nodo.id,
                        accion: 'Cambiar calibre ' + calibreAnterior + ' → ' + sugerencia.calibre,
                        razon: 'Ampacidad insuficiente'
                    });

                    // Recalcular ampacidad con nuevo calibre
                    nodo.resultados.ampacidad = ampacidadNOM({
                        calibre: nodo.calibre,
                        material: nodo.material || 'cobre',
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente || 30,
                        nConductores: nodo.agrupamiento || 3,
                        paralelos: nodo.paralelos || 1,
                        tempTerminal: 75
                    });
                }
            }

            // 2. Corregir protección si hay errores
            if (nodo.resultados.proteccion && nodo.resultados.proteccion.status === "FAIL") {
                // Aquí se podría implementar lógica de reemplazo de breaker
                // Por ahora solo registrar el error
                cambios.push({
                    tipo: 'PROTECCION',
                    nodo: nodo.id,
                    accion: 'REVISAR EQUIPO',
                    razon: nodo.resultados.proteccion.errores.join(', ')
                });
            }
        }

        console.log("[Orchestrator] Auto-corrección completada con " + cambios.length + " cambios");

        return {
            sistema: sistema,
            cambios: cambios,
            numCambios: cambios.length
        };
    }

    /**
     * === NUEVO: Obtiene resultado de validación para un nodo ===
     * Usa ValidationEngine como única fuente de verdad
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} sistema - Sistema completo (para contexto)
     * @returns {Object} Resultado de validación
     */
    function obtenerValidacionNodo(nodo, sistema) {
        var ctx = SimulationContext.extractValidationContext(nodo, {
            voltage: sistema?.V,
            Isc: sistema?.Isc
        });
        return ValidationEngine.runAll(ctx);
    }

    /**
     * === NUEVO: Valida todo el sistema con ValidationEngine ===
     * @param {Object} sistema - Sistema con nodos
     * @returns {Object} Validación completa del sistema
     */
    function validarSistema(sistema) {
        if (!sistema || !sistema.nodos) {
            return { valid: false, errors: [{ message: 'Sistema inválido' }] };
        }

        var systemContext = SimulationContext.buildContext({
            nodes: sistema.nodos,
            voltage: sistema.V,
            Isc: sistema.Isc
        });

        var resultadosNodos = [];
        var allErrors = [];
        var allWarnings = [];

        for (var i = 0; i < sistema.nodos.length; i++) {
            var nodo = sistema.nodos[i];
            var ctx = SimulationContext.extractValidationContext(nodo, systemContext);
            var validation = ValidationEngine.runAll(ctx);

            resultadosNodos.push({
                nodoId: nodo.id,
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings
            });

            allErrors = allErrors.concat(validation.errors);
            allWarnings = allWarnings.concat(validation.warnings);
        }

        return {
            valid: allErrors.length === 0,
            nodos: resultadosNodos,
            errors: allErrors,
            warnings: allWarnings,
            summary: {
                totalNodos: sistema.nodos.length,
                nodosValidos: resultadosNodos.filter(function (n) { return n.valid; }).length,
                totalErrors: allErrors.length,
                totalWarnings: allWarnings.length
            }
        };
    }

    return {
        calcularSistema: calcularSistema,
        evaluarCoordinacionSistema: evaluarCoordinacionSistema,
        autoCorregirSistema: autoCorregirSistema,
        // === NUEVO: Métodos de validación ===
        obtenerValidacionNodo: obtenerValidacionNodo,
        validarSistema: validarSistema
    };
})();

if (typeof window !== 'undefined') {
    window.Orchestrator = Orchestrator;
}
