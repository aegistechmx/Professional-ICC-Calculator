/**
 * app/orchestrator.js — Orquestador Central (El Cerebro)
 * Arquitectura tipo ETAP/SKM: coordinación de todos los engines
 * ÚNICO punto de entrada para cálculos del sistema
 */

var Orchestrator = (function() {
    
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
                
                // 4. Validación NOM automática
                if (nodo.resultados.ampacidad && nodo.equipo) {
                    nodo.resultados.validacionNOM = NOMValidator.validarNOM({
                        I_carga: nodo.I_carga,
                        ampacidad: nodo.resultados.ampacidad.I_final,
                        Isc: sistema.Isc || 0,
                        interruptor: nodo.equipo,
                        esContinua: nodo.esContinua !== undefined ? nodo.esContinua : true,
                        violacionTerminal: nodo.resultados.ampacidad.violacionTerminal
                    });
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
        }
        
        console.log("[Orchestrator] Cálculo del sistema completado");
        
        return sistema;
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
    
    return {
        calcularSistema: calcularSistema,
        evaluarCoordinacionSistema: evaluarCoordinacionSistema,
        autoCorregirSistema: autoCorregirSistema
    };
})();

if (typeof window !== 'undefined') {
    window.Orchestrator = Orchestrator;
}
