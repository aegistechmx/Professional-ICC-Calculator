/**
 * core/engine.js — Motor Principal (El Cerebro)
 * Arquitectura limpia: pipeline único, sin duplicación
 * INPUT → VALIDADOR → MOTOR → SELECTORES → VERIFICADOR → RESULTADO
 */

var Engine = (function() {
    
    /**
     * Ejecutar motor principal
     * @param {Object} input - Datos de entrada del sistema
     * @returns {Object} Resultado completo
     */
    function ejecutarMotor(input) {
        var ctx = crearContexto(input);
        
        try {
            validarEntrada(ctx);
            calcularSistema(ctx);
            seleccionarEquipos(ctx);
            verificarSistema(ctx);
            return construirResultado(ctx);
        } catch (error) {
            ctx.errores.push("Error fatal: " + error.message);
            console.error("[Engine] Error fatal:", error);
            return construirResultado(ctx);
        }
    }
    
    /**
     * Crear contexto único (clave para evitar undefined)
     * @param {Object} input - Datos de entrada
     * @returns {Object} Contexto del sistema
     */
    function crearContexto(input) {
        return {
            input: input,
            nodos: input.nodos || [],
            sistema: input.sistema || {},
            resultados: {},
            errores: [],
            warnings: [],
            debug: [],
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Validar entrada
     * @param {Object} ctx - Contexto del sistema
     */
    function validarEntrada(ctx) {
        if (!ctx.nodos || ctx.nodos.length === 0) {
            ctx.errores.push("Sistema sin nodos");
            throw new Error("Entrada inválida: sin nodos");
        }
        
        ctx.nodos.forEach(function(nodo, index) {
            if (!nodo.id) {
                nodo.id = "nodo_" + index;
            }
            
            if (!nodo.I_carga || nodo.I_carga <= 0) {
                ctx.errores.push("Nodo " + nodo.id + ": sin corriente de carga válida");
            }
            
            if (!nodo.longitud || nodo.longitud <= 0) {
                ctx.warnings.push("Nodo " + nodo.id + ": longitud no definida");
            }
            
            if (!nodo.material) {
                nodo.material = 'cobre'; // Default
            }
            
            if (!nodo.tempAmbiente) {
                nodo.tempAmbiente = 30; // Default
            }
            
            if (!nodo.agrupamiento) {
                nodo.agrupamiento = 3; // Default
            }
            
            if (!nodo.paralelos) {
                nodo.paralelos = 1; // Default
            }
        });
        
        if (ctx.errores.length > 0) {
            throw new Error("Entrada inválida: " + ctx.errores.join(", "));
        }
        
        log(ctx, "Validación de entrada completada", { nodos: ctx.nodos.length });
    }
    
    /**
     * Calcular sistema
     * @param {Object} ctx - Contexto del sistema
     */
    function calcularSistema(ctx) {
        ctx.nodos.forEach(function(nodo) {
            // Corriente de diseño (NOM 210/215)
            nodo.I_diseño = nodo.I_carga * 1.25;
            
            // Ampacidad usando NOM-001-SEDE-2012
            if (nodo.calibre && typeof ampacidadNOM !== 'undefined') {
                try {
                    nodo.ampacidad = ampacidadNOM({
                        calibre: nodo.calibre,
                        material: nodo.material,
                        aislamiento: nodo.tempAislamiento || 75,
                        tempAmbiente: nodo.tempAmbiente,
                        nConductores: nodo.agrupamiento,
                        paralelos: nodo.paralelos,
                        tempTerminal: 75
                    });
                } catch (error) {
                    ctx.warnings.push("Nodo " + nodo.id + ": error calculando ampacidad: " + error.message);
                }
            }
            
            // Caída de tensión
            if (nodo.longitud && nodo.voltaje && typeof VoltageDropEngine !== 'undefined') {
                try {
                    var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(nodo.calibre, nodo.material) : 0.1;
                    nodo.caida = VoltageDropEngine.caidaTension({
                        sistema: ctx.sistema.tipo || '3F',
                        V: nodo.voltaje,
                        I: nodo.I_carga,
                        FP: nodo.FP || 0.9,
                        longitud_m: nodo.longitud,
                        R: R,
                        X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
                    });
                } catch (error) {
                    ctx.warnings.push("Nodo " + nodo.id + ": error calculando caída de tensión: " + error.message);
                }
            }
        });
        
        log(ctx, "Cálculo del sistema completado", { nodos: ctx.nodos.length });
    }
    
    /**
     * Seleccionar equipos
     * @param {Object} ctx - Contexto del sistema
     */
    function seleccionarEquipos(ctx) {
        // Seleccionar conductores
        if (typeof ConductorSelector !== 'undefined') {
            ctx.nodos.forEach(function(nodo) {
                if (!nodo.calibre) {
                    try {
                        var seleccion = ConductorSelector.seleccionarConductor({
                            I_carga: nodo.I_carga,
                            material: nodo.material,
                            aislamiento: nodo.tempAislamiento || 75,
                            tempAmbiente: nodo.tempAmbiente,
                            nConductores: nodo.agrupamiento,
                            paralelos: nodo.paralelos,
                            terminal: 75
                        });
                        nodo.calibreSeleccionado = seleccion.calibre;
                        nodo.ampacidadFinal = seleccion.ampacidad;
                        nodo.ampacidad = seleccion.detalle;
                    } catch (error) {
                        ctx.errores.push("Nodo " + nodo.id + ": sin conductor válido - " + error.message);
                    }
                }
            });
        }
        
        // Seleccionar breakers
        ctx.nodos.forEach(function(nodo) {
            var In = nodo.I_diseño;
            nodo.breaker = {
                In: redondearBreaker(In),
                Icu: nodo.Isc ? nodo.Isc * 1.25 : 25000,
                tipo: "LSIG"
            };
        });
        
        log(ctx, "Selección de equipos completada");
    }
    
    /**
     * Verificar sistema
     * @param {Object} ctx - Contexto del sistema
     */
    function verificarSistema(ctx) {
        ctx.nodos.forEach(function(nodo) {
            // Verificar ampacidad
            if (nodo.ampacidadFinal && nodo.I_diseño) {
                if (nodo.ampacidadFinal < nodo.I_diseño) {
                    ctx.errores.push("Nodo " + nodo.id + ": no cumple ampacidad (requiere " + nodo.I_diseño.toFixed(1) + "A, tiene " + nodo.ampacidadFinal.toFixed(1) + "A)");
                }
            }
            
            // Verificar caída de tensión
            if (nodo.caida && nodo.caida.porcentaje > 3) {
                ctx.warnings.push("Nodo " + nodo.id + ": caída de tensión > 3% (" + nodo.caida.porcentaje.toFixed(2) + "%)");
            }
            
            // Verificar breaker
            if (!nodo.breaker) {
                ctx.errores.push("Nodo " + nodo.id + ": sin breaker seleccionado");
            } else if (nodo.Isc && nodo.breaker.Icu < nodo.Isc) {
                ctx.errores.push("Nodo " + nodo.id + ": breaker insuficiente (Icu=" + nodo.breaker.Icu + "A < Isc=" + nodo.Isc + "A)");
            }
        });
        
        log(ctx, "Verificación del sistema completada", { errores: ctx.errores.length, warnings: ctx.warnings.length });
    }
    
    /**
     * Construir resultado
     * @param {Object} ctx - Contexto del sistema
     * @returns {Object} Resultado final
     */
    function construirResultado(ctx) {
        return {
            ok: ctx.errores.length === 0,
            errores: ctx.errores,
            warnings: ctx.warnings,
            nodos: ctx.nodos,
            debug: ctx.debug,
            timestamp: ctx.timestamp
        };
    }
    
    /**
     * Redondear breaker a valores estándar
     * @param {number} In - Corriente de diseño
     * @returns {number} Breaker estándar
     */
    function redondearBreaker(In) {
        var breakers = [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
        
        for (var i = 0; i < breakers.length; i++) {
            if (breakers[i] >= In) {
                return breakers[i];
            }
        }
        
        return breakers[breakers.length - 1];
    }
    
    /**
     * Logger profesional
     * @param {Object} ctx - Contexto del sistema
     * @param {string} msg - Mensaje
     * @param {Object} data - Datos adicionales
     */
    function log(ctx, msg, data) {
        ctx.debug.push({
            timestamp: new Date().toISOString(),
            msg: msg,
            data: data || {}
        });
        console.log("[Engine]", msg, data || "");
    }
    
    return {
        ejecutarMotor: ejecutarMotor,
        crearContexto: crearContexto,
        log: log
    };
})();

if (typeof window !== 'undefined') {
    window.Engine = Engine;
}
