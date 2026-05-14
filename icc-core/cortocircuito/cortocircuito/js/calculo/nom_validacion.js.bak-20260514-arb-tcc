/**
 * nom_validacion.js — Motor de validación NOM-001-SEDE-2012
 * Validaciones críticas, warnings y sistema de severidad para cumplimiento normativo
 */

var NOMValidacion = (function() {

    /**
     * Niveles de severidad
     */
    var SEVERITY = {
        ERROR: 'bloquea_calculo',
        WARNING: 'permite_pero_alerta',
        INFO: 'optimizacion'
    };

    /**
     * Validación 1: Ampacidad insuficiente (CRÍTICO)
     */
    function validarAmpacidad(config) {
        var errores = [];
        
        if (config.iCarga > config.ampacidadFinal) {
            errores.push({
                type: 'ERROR',
                code: 'AMPACITY_FAIL',
                message: 'CONDUCTOR SUBDIMENSIONADO',
                severity: SEVERITY.ERROR,
                data: {
                    requerido: config.iCarga,
                    disponible: config.ampacidadFinal,
                    deficit: config.iCarga - config.ampacidadFinal
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 2: Violación de temperatura de terminal (CRÍTICO)
     */
    function validarTemperaturaTerminal(config) {
        var errores = [];
        
        if (config.ampacidadCorregida > config.ampacidadTerminal) {
            errores.push({
                type: 'ERROR',
                code: 'TERMINAL_TEMP_FAIL',
                message: 'VIOLA LÍMITE DE TERMINAL',
                severity: SEVERITY.ERROR,
                data: {
                    corregida: config.ampacidadCorregida,
                    limite: config.ampacidadTerminal,
                    exceso: config.ampacidadCorregida - config.ampacidadTerminal
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 3: Uso incorrecto de columna 90°C (CRÍTICO)
     */
    function validarUso90C(config) {
        var errores = [];
        
        if (config.usa90C && config.ampacidadFinal > config.ampacidad75) {
            errores.push({
                type: 'ERROR',
                code: '90C_MISUSE',
                message: 'USO INCORRECTO DE COLUMNA 90°C',
                severity: SEVERITY.ERROR,
                data: {
                    ampacidad90: config.ampacidadFinal,
                    ampacidad75: config.ampacidad75
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 4: Capacidad interruptiva insuficiente (CRÍTICO)
     */
    function validarCapacidadInterruptiva(config) {
        var errores = [];
        
        if (config.icc && config.interruptorKA) {
            var iccA = config.icc;
            var capacidadA = config.interruptorKA * 1000;
            
            if (iccA > capacidadA) {
                errores.push({
                    type: 'ERROR',
                    code: 'BREAKER_FAIL',
                    message: 'INTERRUPTOR NO SOPORTA CORTO CIRCUITO',
                    severity: SEVERITY.ERROR,
                    data: {
                        icc: iccA,
                        capacidad: capacidadA,
                        deficit: iccA - capacidadA
                    }
                });
            }
        }
        
        return errores;
    }

    /**
     * Validación 5: Factor de agrupamiento incorrecto (CRÍTICO)
     */
    function validarFactorAgrupamiento(config) {
        var errores = [];
        
        var numConductores = config.numConductores || 3;
        var fc = config.fc || 1.0;
        
        if (numConductores > 3 && fc === 1.0) {
            errores.push({
                type: 'ERROR',
                code: 'GROUPING_NOT_APPLIED',
                message: 'FACTOR DE AGRUPAMIENTO NO APLICADO',
                severity: SEVERITY.ERROR,
                data: {
                    numConductores: numConductores,
                    fc: fc,
                    fcEsperado: obtenerFCEsperado(numConductores)
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 6: Neutro mal considerado (WARNING)
     */
    function validarNeutro(config) {
        var errores = [];
        
        if (config.tieneNeutro && !config.neutroContado) {
            if (config.esMonofasico || config.tieneArmonicos) {
                errores.push({
                    type: 'WARNING',
                    code: 'NEUTRO_NOT_COUNTED',
                    message: 'NEUTRO DEBE CONTARSE COMO CONDUCTOR ACTIVO',
                    severity: SEVERITY.WARNING,
                    data: {
                        tieneNeutro: config.tieneNeutro,
                        esMonofasico: config.esMonofasico,
                        tieneArmonicos: config.tieneArmonicos
                    }
                });
            }
        }
        
        return errores;
    }

    /**
     * Validación 7: Demasiados conductores en tubería (WARNING)
     */
    function validarAgrupamientoExcesivo(config) {
        var errores = [];
        
        var numConductores = config.numConductores || 3;
        
        if (numConductores >= 10) {
            errores.push({
                type: 'WARNING',
                code: 'HIGH_GROUPING',
                message: 'ALTO AGRUPAMIENTO - POSIBLE SOBRECALENTAMIENTO',
                severity: SEVERITY.WARNING,
                data: {
                    numConductores: numConductores,
                    fc: config.fc
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 8: Temperatura ambiente alta (WARNING)
     */
    function validarTemperaturaAlta(config) {
        var errores = [];
        
        var temperatura = config.temperatura || 30;
        
        if (temperatura > 40) {
            errores.push({
                type: 'WARNING',
                code: 'HIGH_TEMPERATURE',
                message: 'TEMPERATURA ELEVADA - VERIFICAR AMPACIDAD',
                severity: SEVERITY.WARNING,
                data: {
                    temperatura: temperatura,
                    ft: config.ft
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 9: Paralelos mal balanceados (WARNING)
     */
    function validarParalelos(config) {
        var errores = [];
        
        if (config.paralelos > 1 && !config.balanceado) {
            errores.push({
                type: 'WARNING',
                code: 'UNBALANCED_PARALLELS',
                message: 'CONDUCTORES EN PARALELO NO BALANCEADOS',
                severity: SEVERITY.WARNING,
                data: {
                    paralelos: config.paralelos,
                    balanceado: config.balanceado
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 10: Factor de seguridad no aplicado (WARNING)
     */
    function validarFactorSeguridad(config) {
        var errores = [];
        
        if (config.modo === 'industrial' && config.margen < 1.25) {
            errores.push({
                type: 'WARNING',
                code: 'NO_SAFETY_FACTOR',
                message: 'SIN FACTOR DE SEGURIDAD (125%)',
                severity: SEVERITY.WARNING,
                data: {
                    margen: config.margen,
                    esperado: 1.25
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 11: Caída de tensión alta (WARNING)
     */
    function validarCaidaTension(config) {
        var errores = [];
        
        if (config.caidaTension > 3) {
            errores.push({
                type: 'WARNING',
                code: 'VOLTAGE_DROP_HIGH',
                message: 'CAÍDA DE TENSIÓN MAYOR A 3%',
                severity: SEVERITY.WARNING,
                data: {
                    caidaTension: config.caidaTension,
                    limite: 3
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 12: Factor de temperatura ignorado (ERROR)
     */
    function validarFactorTemperatura(config) {
        var errores = [];
        
        var temperatura = config.temperatura || 30;
        var ft = config.ft || 1.0;
        
        if (temperatura !== 30 && ft === 1.0) {
            errores.push({
                type: 'ERROR',
                code: 'TEMP_FACTOR_NOT_APPLIED',
                message: 'FACTOR DE TEMPERATURA NO APLICADO',
                severity: SEVERITY.ERROR,
                data: {
                    temperatura: temperatura,
                    ft: ft,
                    ftEsperado: obtenerFTEsperado(temperatura)
                }
            });
        }
        if (temperatura === 30 && ft !== 1.0) {
            errores.push({
                type: 'ERROR',
                code: 'TEMP_FACTOR_INCORRECT',
                message: 'FACTOR DE TEMPERATURA INCORRECTO',
                severity: SEVERITY.ERROR,
                data: {
                    temperatura: temperatura,
                    ft: ft,
                    ftEsperado: obtenerFTEsperado(temperatura)
                }
            });
        }
        
        return errores;
    }

    /**
     * Helper: Obtener FC esperado según número de conductores
     */
    function obtenerFCEsperado(numConductores) {
        if (numConductores <= 3) return 1.0;
        if (numConductores <= 6) return 0.8;
        if (numConductores <= 9) return 0.7;
        if (numConductores <= 20) return 0.5;
        if (numConductores <= 30) return 0.45;
        if (numConductores <= 40) return 0.4;
        return 0.35;
    }

    /**
     * Helper: Obtener FT esperado según temperatura
     */
    function obtenerFTEsperado(temperatura) {
        if (temperatura <= 25) return 1.08;
        if (temperatura <= 30) return 1.0;
        if (temperatura <= 35) return 0.91;
        if (temperatura <= 40) return 0.82;
        if (temperatura <= 45) return 0.71;
        if (temperatura <= 50) return 0.58;
        if (temperatura <= 55) return 0.41;
        return 0.33;
    }

    /**
     * Validación 13: Sobredimensionamiento excesivo (INFO)
     */
    function validarSobredimensionamiento(config) {
        var errores = [];
        
        if (config.ampacidadFinal > config.iCarga * 2) {
            errores.push({
                type: 'INFO',
                code: 'OVERSIZED',
                message: 'SOBREDIMENSIONAMIENTO EXCESIVO',
                severity: SEVERITY.INFO,
                data: {
                    ampacidadFinal: config.ampacidadFinal,
                    iCarga: config.iCarga,
                    ratio: config.ampacidadFinal / config.iCarga
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 14: Neutro subdimensionado según contexto de carga (WARNING)
     */
    function validarNeutroContexto(config) {
        var errores = [];
        
        if (!config.loadContext || !config.loadContext.phases) {
            return errores;
        }
        
        var In = config.loadContext.phases.In || 0;
        var neutralAmpacity = config.neutralAmpacity || 0;
        
        if (In > neutralAmpacity && neutralAmpacity > 0) {
            errores.push({
                type: 'WARNING',
                code: 'NEUTRO_UNDERLOAD_CONTEXT',
                message: 'NEUTRO SUBDIMENSIONADO (CONTEXTO REAL)',
                severity: SEVERITY.WARNING,
                data: {
                    In: In,
                    neutralAmpacity: neutralAmpacity,
                    deficit: In - neutralAmpacity,
                    ratio: In / neutralAmpacity
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 15: Armónicos en neutro (WARNING)
     */
    function validarArmonicos(config) {
        var errores = [];
        
        if (!config.loadContext || !config.loadContext.harmonics) {
            return errores;
        }
        
        var In_harm = config.loadContext.harmonics.In_harm || 0;
        var THDi = config.loadContext.harmonics.THDi || 0;
        
        if (In_harm > 0 || THDi > 0.05) {
            errores.push({
                type: 'WARNING',
                code: 'HARMONICS_PRESENT',
                message: 'ARMÓNICOS EN NEUTRO PRESENTES',
                severity: SEVERITY.WARNING,
                data: {
                    In_harm: In_harm,
                    THDi: THDi
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación 16: Desbalance alto (WARNING)
     */
    function validarDesbalance(config) {
        var errores = [];
        
        if (!config.loadContext || !config.loadContext.system) {
            return errores;
        }
        
        var unbalance = config.loadContext.system.unbalance || 0;
        
        if (unbalance > 0.15) {
            errores.push({
                type: 'WARNING',
                code: 'HIGH_UNBALANCE',
                message: 'DESBALANCE ALTO (' + ((unbalance * 100) || 0).toFixed(1) + '%)',
                severity: SEVERITY.WARNING,
                data: {
                    unbalance: unbalance,
                    unbalancePct: unbalance * 100
                }
            });
        }
        
        return errores;
    }

    /**
     * Validación maestra - Ejecuta todas las validaciones
     */
    function validarTodo(config) {
        var errores = [];
        
        // Validaciones críticas (bloquean cálculo)
        errores = errores.concat(validarAmpacidad(config));
        errores = errores.concat(validarTemperaturaTerminal(config));
        errores = errores.concat(validarUso90C(config));
        errores = errores.concat(validarCapacidadInterruptiva(config));
        errores = errores.concat(validarFactorAgrupamiento(config));
        errores = errores.concat(validarFactorTemperatura(config));
        
        // Validaciones importantes (warnings)
        errores = errores.concat(validarNeutro(config));
        errores = errores.concat(validarAgrupamientoExcesivo(config));
        errores = errores.concat(validarTemperaturaAlta(config));
        errores = errores.concat(validarParalelos(config));
        errores = errores.concat(validarFactorSeguridad(config));
        errores = errores.concat(validarCaidaTension(config));
        
        // Validaciones de contexto de carga (warnings)
        errores = errores.concat(validarNeutroContexto(config));
        errores = errores.concat(validarArmonicos(config));
        errores = errores.concat(validarDesbalance(config));
        
        // Validaciones de optimización (info)
        errores = errores.concat(validarSobredimensionamiento(config));
        
        return {
            status: tieneErroresCriticos(errores) ? 'ERROR' : 'OK',
            errores: errores,
            resumen: generarResumen(errores)
        };
    }

    /**
     * Verifica si hay errores críticos
     */
    function tieneErroresCriticos(errores) {
        return errores.some(function(e) {
            return e.type === 'ERROR';
        });
    }

    /**
     * Genera resumen de validaciones
     */
    function generarResumen(errores) {
        var criticos = errores.filter(function(e) { return e.type === 'ERROR'; }).length;
        var warnings = errores.filter(function(e) { return e.type === 'WARNING'; }).length;
        var info = errores.filter(function(e) { return e.type === 'INFO'; }).length;
        
        return {
            total: errores.length,
            criticos: criticos,
            warnings: warnings,
            info: info
        };
    }

    /**
     * Mostrar validaciones en UI
     */
    function mostrarValidaciones(resultado, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        
        if (resultado.errores.length === 0) {
            container.innerHTML = '<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[--green]/10 border border-[--green]">' +
                '<i class="fas fa-check-circle text-[--green]"></i>' +
                '<span class="text-[--green] text-sm">Cumple con NOM-001-SEDE-2012</span>' +
                '</div>';
            return;
        }
        
        container.innerHTML = '';
        
        (resultado.errores || []).forEach(function(error) {
            var bgColor = error.type === 'ERROR' ? 'bg-[--red]/10 border-[--red]' :
                          error.type === 'WARNING' ? 'bg-[--orange]/10 border-[--orange]' :
                          'bg-[--cyan]/10 border-[--cyan]';
            var textColor = error.type === 'ERROR' ? 'text-[--red]' :
                           error.type === 'WARNING' ? 'text-[--orange]' :
                           'text-[--cyan]';
            var icon = error.type === 'ERROR' ? 'fa-times-circle' :
                      error.type === 'WARNING' ? 'fa-exclamation-triangle' :
                      'fa-info-circle';
            
            var errorDiv = document.createElement('div');
            errorDiv.className = 'flex items-start gap-2 px-3 py-2 rounded-lg border ' + bgColor;
            
            var iconEl = document.createElement('i');
            iconEl.className = 'fas ' + icon + ' ' + textColor + ' mt-0.5';
            
            var contentDiv = document.createElement('div');
            contentDiv.className = 'flex-1';
            
            var messageSpan = document.createElement('span');
            messageSpan.className = textColor + ' font-semibold text-sm';
            messageSpan.textContent = error.message || 'Error desconocido';
            contentDiv.appendChild(messageSpan);
            
            if (error.data) {
                var dataDiv = document.createElement('div');
                dataDiv.className = 'text-xs text-[--text-muted] mt-1';
                var dataText = '';
                for (var key in error.data) {
                    if (error.data[key] !== undefined && error.data[key] !== null) {
                        dataText += key + ': ' + error.data[key] + ' | ';
                    }
                }
                dataText = dataText.slice(0, -3);
                dataDiv.textContent = dataText;
                contentDiv.appendChild(dataDiv);
            }
            
            errorDiv.appendChild(iconEl);
            errorDiv.appendChild(contentDiv);
            container.appendChild(errorDiv);
        });
    }

    return {
        validarTodo: validarTodo,
        validarAmpacidad: validarAmpacidad,
        validarTemperaturaTerminal: validarTemperaturaTerminal,
        validarCapacidadInterruptiva: validarCapacidadInterruptiva,
        mostrarValidaciones: mostrarValidaciones,
        SEVERITY: SEVERITY
    };
})();

if (typeof window !== 'undefined') {
    window.NOMValidacion = NOMValidacion;
}
