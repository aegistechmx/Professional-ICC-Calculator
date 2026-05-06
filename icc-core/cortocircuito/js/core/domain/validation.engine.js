/**
 * validation.engine.js — Validation Engine Central (Punto Único de Verdad)
 * Arquitectura ETAP/SKM: Todas las validaciones pasan por aquí
 * Reemplaza: nom_validacion.js, motor_validacion_inteligente.js, validator.js
 * 
 * @author Professional ICC Calculator Team
 * @version 2.0.0
 */

const ValidationEngine = (function() {
    'use strict';

    // ============================================================
    // CONSTANTES Y CONFIGURACIÓN
    // ============================================================
    
    const SEVERITY = {
        CRITICAL: 'CRITICAL',    // Bloquea cálculo, riesgo eléctrico
        ERROR: 'ERROR',          // No cumple norma, debe corregirse
        WARNING: 'WARNING',      // Alerta, permite continuar
        INFO: 'INFO'             // Optimización sugerida
    };

    const CODES = {
        // Cortocircuito
        ICC_SUPERA_CAPACIDAD: 'ICC_SUPERA_CAPACIDAD',
        ICC_FUERA_DE_RANGO: 'ICC_FUERA_DE_RANGO',
        XR_INVALIDO: 'XR_INVALIDO',
        
        // Ampacidad
        SOBRECARGA_CONDUCTOR: 'SOBRECARGA_CONDUCTOR',
        VIOLACION_TERMINAL: 'VIOLACION_TERMINAL',
        USO_INCORRECTO_90C: 'USO_INCORRECTO_90C',
        FACTOR_AGRUPAMIENTO_NO_APLICADO: 'FACTOR_AGRUPAMIENTO_NO_APLICADO',
        FACTOR_TEMPERATURA_NO_APLICADO: 'FACTOR_TEMPERATURA_NO_APLICADO',
        
        // Protección
        NO_DISPARA_PROTECCION: 'NO_DISPARA_PROTECCION',
        CAPACIDAD_INTERRUPTIVA_INSUFICIENTE: 'CAPACIDAD_INTERRUPTIVA_INSUFICIENTE',
        PROTECCION_NO_SENSIBLE_TIERRA: 'PROTECCION_NO_SENSIBLE_TIERRA',
        
        // Caída de tensión
        CAIDA_EXCESIVA: 'CAIDA_EXCESIVA',
        CAIDA_TENSION_ALTA: 'CAIDA_TENSION_ALTA',
        
        // Coordinación
        CRUCE_TCC: 'CRUCE_TCC',
        COORDINACION_FALLIDA: 'COORDINACION_FALLIDA',
        
        // Neutro y armónicos
        NEUTRO_SUBDIMENSIONADO: 'NEUTRO_SUBDIMENSIONADO',
        ARMONICOS_PRESENTES: 'ARMONICOS_PRESENTES',
        DESBALANCE_ALTO: 'DESBALANCE_ALTO',
        
        // Físicos
        FISICA_IMPOSIBLE: 'FISICA_IMPOSIBLE',
        VALOR_NEGATIVO: 'VALOR_NEGATIVO',
        
        // Optimización
        SOBREDIMENSIONAMIENTO: 'SOBREDIMENSIONAMIENTO'
    };

    // ============================================================
    // API PÚBLICA PRINCIPAL
    // ============================================================

    /**
     * Ejecuta todas las validaciones sobre el contexto del sistema
     * @param {Object} context - Contexto normalizado del sistema
     * @returns {Object} Resultado normalizado con errors, warnings, info
     */
    function runAll(context) {
        if (!context) {
            return {
                errors: [{ type: SEVERITY.CRITICAL, code: 'NO_CONTEXT', message: 'Contexto no proporcionado' }],
                warnings: [],
                info: [],
                valid: false
            };
        }

        const results = [];

        // Validaciones eléctricas críticas
        results.push(validateShortCircuit(context));
        results.push(validateAmpacity(context));
        results.push(validateVoltageDrop(context));
        results.push(validateProtection(context));
        results.push(validateCoordination(context));
        
        // Validaciones físicas
        results.push(validatePhysicalConstraints(context));
        
        // Validaciones de contexto de carga
        results.push(validateLoadContext(context));
        
        // Validaciones de optimización
        results.push(validateOversizing(context));

        return normalize(results);
    }

    /**
     * Valida un nodo específico del sistema
     * @param {Object} node - Nodo individual
     * @param {Object} systemContext - Contexto del sistema completo
     * @returns {Object} Resultado de validación del nodo
     */
    function validateNode(node, systemContext) {
        const nodeContext = buildNodeContext(node, systemContext);
        return runAll(nodeContext);
    }

    // ============================================================
    // VALIDACIONES ESPECÍFICAS
    // ============================================================

    /**
     * Validación de cortocircuito
     */
    function validateShortCircuit(ctx) {
        const results = [];

        // ICC vs capacidad del equipo
        if (ctx.Isc && ctx.equipmentCapacity) {
            if (ctx.Isc > ctx.equipmentCapacity) {
                results.push(error(CODES.ICC_SUPERA_CAPACIDAD, {
                    isc: ctx.Isc,
                    capacity: ctx.equipmentCapacity,
                    deficit: ctx.Isc - ctx.equipmentCapacity,
                    message: `Isc (${ctx.Isc.toFixed(2)} kA) supera capacidad del equipo (${ctx.equipmentCapacity} kA)`
                }, SEVERITY.CRITICAL));
            }
        }

        // Rango físico de ICC
        if (ctx.Isc !== undefined) {
            if (ctx.Isc <= 0) {
                results.push(error(CODES.ICC_FUERA_DE_RANGO, {
                    isc: ctx.Isc,
                    message: 'Isc debe ser mayor que 0'
                }, SEVERITY.CRITICAL));
            } else if (ctx.Isc > 200) {
                results.push(warning(CODES.ICC_FUERA_DE_RANGO, {
                    isc: ctx.Isc,
                    message: 'Isc > 200 kA - verificar datos'
                }));
            }
        }

        // Validación X/R
        if (ctx.xrRatio !== undefined) {
            if (ctx.xrRatio < 0) {
                results.push(error(CODES.XR_INVALIDO, {
                    xr: ctx.xrRatio,
                    message: 'X/R negativo imposible'
                }, SEVERITY.CRITICAL));
            } else if (ctx.xrRatio > 100) {
                results.push(warning(CODES.XR_INVALIDO, {
                    xr: ctx.xrRatio,
                    message: 'X/R > 100 - verificar datos'
                }));
            } else if (ctx.xrRatio < 0.1) {
                results.push(warning(CODES.XR_INVALIDO, {
                    xr: ctx.xrRatio,
                    message: 'X/R < 0.1 - verificar datos'
                }));
            }
        }

        // Validación de falla a tierra
        if (ctx.faultPhaseToGround && ctx.Isc) {
            const ift = ctx.faultPhaseToGround;
            const i3f = ctx.Isc;
            
            if (ift > i3f * 3) {
                results.push(error(CODES.FISICA_IMPOSIBLE, {
                    ift: ift,
                    i3f: i3f,
                    message: `Falla tierra (${ift.toFixed(2)} kA) > 3× trifásica (${(i3f*3).toFixed(2)} kA)`
                }, SEVERITY.CRITICAL));
            }
        }

        return results;
    }

    /**
     * Validación de ampacidad
     */
    function validateAmpacity(ctx) {
        const results = [];

        // Sobrecarga del conductor
        if (ctx.current && ctx.ampacity) {
            if (ctx.current > ctx.ampacity) {
                results.push(error(CODES.SOBRECARGA_CONDUCTOR, {
                    current: ctx.current,
                    ampacity: ctx.ampacity,
                    deficit: ctx.current - ctx.ampacity,
                    deficitPct: ((ctx.current - ctx.ampacity) / ctx.ampacity * 100).toFixed(1),
                    message: `Conductor subdimensionado: ${ctx.current.toFixed(1)}A > ${ctx.ampacity.toFixed(1)}A`
                }, SEVERITY.CRITICAL));
            }
        }

        // Violación de temperatura de terminal
        if (ctx.ampacityCorrected && ctx.ampacityTerminal) {
            if (ctx.ampacityCorrected > ctx.ampacityTerminal) {
                results.push(error(CODES.VIOLACION_TERMINAL, {
                    corrected: ctx.ampacityCorrected,
                    terminal: ctx.ampacityTerminal,
                    message: 'Violación de límite de terminal (Art. 110.14C)'
                }, SEVERITY.CRITICAL));
            }
        }

        // Uso incorrecto de columna 90°C
        if (ctx.uses90C && ctx.ampacity75) {
            if (ctx.ampacityFinal > ctx.ampacity75) {
                results.push(error(CODES.USO_INCORRECTO_90C, {
                    amp90: ctx.ampacityFinal,
                    amp75: ctx.ampacity75,
                    message: 'Uso incorrecto de columna 90°C sin autorización'
                }, SEVERITY.ERROR));
            }
        }

        // Factor de agrupamiento
        if (ctx.numConductors && ctx.groupingFactor) {
            if (ctx.numConductors > 3 && ctx.groupingFactor === 1.0) {
                results.push(error(CODES.FACTOR_AGRUPAMIENTO_NO_APLICADO, {
                    conductors: ctx.numConductors,
                    factor: ctx.groupingFactor,
                    expected: getExpectedGroupingFactor(ctx.numConductors),
                    message: `Factor de agrupamiento no aplicado (${ctx.numConductors} conductores)`
                }, SEVERITY.ERROR));
            }
        }

        // Factor de temperatura
        if (ctx.ambientTemp !== undefined && ctx.tempFactor) {
            const expectedFactor = getExpectedTempFactor(ctx.ambientTemp);
            if (Math.abs(ctx.tempFactor - expectedFactor) > 0.01) {
                results.push(error(CODES.FACTOR_TEMPERATURA_NO_APLICADO, {
                    temp: ctx.ambientTemp,
                    factor: ctx.tempFactor,
                    expected: expectedFactor,
                    message: `Factor de temperatura incorrecto para ${ctx.ambientTemp}°C`
                }, SEVERITY.ERROR));
            }
        }

        return results;
    }

    /**
     * Validación de caída de tensión
     */
    function validateVoltageDrop(ctx) {
        const results = [];

        if (ctx.voltageDropPercent !== undefined) {
            // Límite del 5% (NOM)
            if (ctx.voltageDropPercent > 5) {
                results.push(error(CODES.CAIDA_EXCESIVA, {
                    drop: ctx.voltageDropPercent,
                    limit: 5,
                    message: `Caída de tensión ${ctx.voltageDropPercent.toFixed(2)}% > 5% (NOM)`
                }, SEVERITY.ERROR));
            }
            // Alerta al 3%
            else if (ctx.voltageDropPercent > 3) {
                results.push(warning(CODES.CAIDA_TENSION_ALTA, {
                    drop: ctx.voltageDropPercent,
                    limit: 3,
                    message: `Caída de tensión ${ctx.voltageDropPercent.toFixed(2)}% > 3% (recomendado)`
                }));
            }
        }

        return results;
    }

    /**
     * Validación de protección
     */
    function validateProtection(ctx) {
        const results = [];

        // Capacidad interruptiva
        if (ctx.Isc && ctx.breakerCapacity) {
            if (ctx.Isc > ctx.breakerCapacity) {
                results.push(error(CODES.CAPACIDAD_INTERRUPTIVA_INSUFICIENTE, {
                    isc: ctx.Isc,
                    capacity: ctx.breakerCapacity,
                    message: `Interruptor ${ctx.breakerCapacity} kA < Isc ${ctx.Isc.toFixed(2)} kA`
                }, SEVERITY.CRITICAL));
            }
        }

        // Sensibilidad a falla a tierra
        if (ctx.faultPhaseToGround && ctx.groundFaultPickup) {
            const ift = ctx.faultPhaseToGround * 1000; // Convertir a A
            if (ctx.groundFaultPickup > ift) {
                results.push(error(CODES.PROTECCION_NO_SENSIBLE_TIERRA, {
                    pickup: ctx.groundFaultPickup,
                    fault: ift,
                    message: `Protección no sensible: pickup ${ctx.groundFaultPickup}A > falla ${ift.toFixed(0)}A`
                }, SEVERITY.CRITICAL));
            }
        }

        // El breaker dispara?
        if (ctx.breakerTrips === false) {
            results.push(error(CODES.NO_DISPARA_PROTECCION, {
                message: 'Protección no dispara ante condición de falla'
            }, SEVERITY.CRITICAL));
        }

        return results;
    }

    /**
     * Validación de coordinación
     */
    function validateCoordination(ctx) {
        const results = [];

        if (ctx.curvesOverlap) {
            results.push(warning(CODES.CRUCE_TCC, {
                message: 'Cruce de curvas TCC detectado'
            }));
        }

        if (ctx.coordinationMargin !== undefined) {
            if (ctx.coordinationMargin < 1.3) {
                results.push(warning(CODES.COORDINACION_FALLIDA, {
                    margin: ctx.coordinationMargin,
                    required: 1.3,
                    message: `Margen de coordinación ${ctx.coordinationMargin.toFixed(2)} < 1.3 requerido`
                }));
            }
        }

        return results;
    }

    /**
     * Validación de restricciones físicas
     */
    function validatePhysicalConstraints(ctx) {
        const results = [];

        // Validar valores negativos imposibles
        const physicalValues = [
            { name: 'Resistencia', value: ctx.resistance },
            { name: 'Reactancia', value: ctx.reactance },
            { name: 'Corriente', value: ctx.current },
            { name: 'Voltaje', value: ctx.voltage }
        ];

        physicalValues.forEach(pv => {
            if (pv.value !== undefined && pv.value < 0) {
                results.push(error(CODES.VALOR_NEGATIVO, {
                    parameter: pv.name,
                    value: pv.value,
                    message: `${pv.name} negativo imposible: ${pv.value}`
                }, SEVERITY.CRITICAL));
            }
        });

        // Validar tensión
        if (ctx.voltage !== undefined) {
            if (ctx.voltage <= 0) {
                results.push(error(CODES.FISICA_IMPOSIBLE, {
                    voltage: ctx.voltage,
                    message: 'Tensión debe ser > 0'
                }, SEVERITY.CRITICAL));
            } else if (ctx.voltage > 35000) {
                results.push(warning(CODES.FISICA_IMPOSIBLE, {
                    voltage: ctx.voltage,
                    message: 'Tensión > 35 kV - verificar datos'
                }));
            }
        }

        return results;
    }

    /**
     * Validación de contexto de carga
     */
    function validateLoadContext(ctx) {
        const results = [];

        if (!ctx.loadContext) return results;

        const lc = ctx.loadContext;

        // Neutro subdimensionado
        if (lc.neutralCurrent && lc.neutralAmpacity) {
            if (lc.neutralCurrent > lc.neutralAmpacity) {
                results.push(warning(CODES.NEUTRO_SUBDIMENSIONADO, {
                    current: lc.neutralCurrent,
                    ampacity: lc.neutralAmpacity,
                    message: `Neutro subdimensionado: ${lc.neutralCurrent.toFixed(1)}A > ${lc.neutralAmpacity.toFixed(1)}A`
                }));
            }
        }

        // Armónicos presentes
        if (lc.harmonicCurrent || (lc.thdi && lc.thdi > 0.05)) {
            results.push(warning(CODES.ARMONICOS_PRESENTES, {
                inHarm: lc.harmonicCurrent,
                thdi: lc.thdi,
                message: 'Armónicos en neutro detectados'
            }));
        }

        // Desbalance alto
        if (lc.unbalance && lc.unbalance > 0.15) {
            results.push(warning(CODES.DESBALANCE_ALTO, {
                unbalance: lc.unbalance,
                unbalancePct: (lc.unbalance * 100).toFixed(1),
                message: `Desbalance alto: ${(lc.unbalance * 100).toFixed(1)}%`
            }));
        }

        return results;
    }

    /**
     * Validación de sobredimensionamiento (optimización)
     */
    function validateOversizing(ctx) {
        const results = [];

        if (ctx.ampacity && ctx.current && ctx.current > 0) {
            const ratio = ctx.ampacity / ctx.current;
            if (ratio > 2.5) {
                results.push(info(CODES.SOBREDIMENSIONAMIENTO, {
                    ampacity: ctx.ampacity,
                    current: ctx.current,
                    ratio: ratio.toFixed(2),
                    message: `Sobredimensionamiento: ratio ${ratio.toFixed(2)}x`
                }));
            }
        }

        return results;
    }

    // ============================================================
    // HELPERS Y UTILIDADES
    // ============================================================

    /**
     * Normaliza resultados de todas las validaciones
     */
    function normalize(results) {
        const flat = results.flat();
        
        return {
            errors: flat.filter(r => r.severity === SEVERITY.CRITICAL || r.severity === SEVERITY.ERROR),
            warnings: flat.filter(r => r.severity === SEVERITY.WARNING),
            info: flat.filter(r => r.severity === SEVERITY.INFO),
            valid: !flat.some(r => r.severity === SEVERITY.CRITICAL || r.severity === SEVERITY.ERROR),
            summary: {
                total: flat.length,
                critical: flat.filter(r => r.severity === SEVERITY.CRITICAL).length,
                errors: flat.filter(r => r.severity === SEVERITY.ERROR).length,
                warnings: flat.filter(r => r.severity === SEVERITY.WARNING).length,
                info: flat.filter(r => r.severity === SEVERITY.INFO).length
            }
        };
    }

    /**
     * Construye un error
     */
    function error(code, data, severity) {
        return {
            type: 'error',
            severity: severity || SEVERITY.ERROR,
            code: code,
            message: data.message || code,
            data: data,
            timestamp: Date.now()
        };
    }

    /**
     * Construye una advertencia
     */
    function warning(code, data) {
        return {
            type: 'warning',
            severity: SEVERITY.WARNING,
            code: code,
            message: data.message || code,
            data: data,
            timestamp: Date.now()
        };
    }

    /**
     * Construye un mensaje informativo
     */
    function info(code, data) {
        return {
            type: 'info',
            severity: SEVERITY.INFO,
            code: code,
            message: data.message || code,
            data: data,
            timestamp: Date.now()
        };
    }

    /**
     * Construye un resultado OK
     */
    function ok() {
        return { type: 'ok', severity: SEVERITY.INFO };
    }

    /**
     * Obtiene factor de agrupamiento esperado según NOM
     */
    function getExpectedGroupingFactor(numConductors) {
        if (numConductors <= 3) return 1.0;
        if (numConductors <= 6) return 0.8;
        if (numConductors <= 9) return 0.7;
        if (numConductors <= 20) return 0.5;
        if (numConductors <= 30) return 0.45;
        if (numConductors <= 40) return 0.4;
        return 0.35;
    }

    /**
     * Obtiene factor de temperatura esperado según NOM
     */
    function getExpectedTempFactor(temp) {
        if (temp <= 25) return 1.08;
        if (temp <= 30) return 1.0;
        if (temp <= 35) return 0.91;
        if (temp <= 40) return 0.82;
        if (temp <= 45) return 0.71;
        if (temp <= 50) return 0.58;
        if (temp <= 55) return 0.41;
        return 0.33;
    }

    /**
     * Construye contexto para un nodo específico
     */
    function buildNodeContext(node, systemContext) {
        return {
            // Datos eléctricos
            Isc: node.isc || systemContext.Isc,
            current: node.I_carga,
            voltage: systemContext.V,
            
            // Capacidades
            equipmentCapacity: node.equip?.cap,
            breakerCapacity: node.equip?.cap,
            ampacity: node.resultados?.ampacidad?.I_final,
            ampacityCorrected: node.CDT?.I_corregida,
            ampacityTerminal: node.CDT?.I_terminal,
            
            // Factores
            groupingFactor: node.agrupamiento,
            tempFactor: node.CDT?.F_temp,
            ambientTemp: node.tempAmbiente,
            numConductors: node.numConductores || 3,
            uses90C: node.tempAislamiento === 90,
            ampacity75: node.CDT?.I_75,
            ampacityFinal: node.CDT?.I_final,
            
            // Protección
            breakerTrips: node.resultados?.proteccion?.dispara,
            groundFaultPickup: node.equip?.iDisparo,
            
            // Caída de tensión
            voltageDropPercent: node.resultados?.caidaTension?.porcentaje,
            
            // Coordinación
            curvesOverlap: node.resultados?.coordinacion?.cruce,
            coordinationMargin: node.resultados?.coordinacion?.margen,
            
            // Físicos
            xrRatio: node.xr,
            resistance: node.R,
            reactance: node.X,
            
            // Fallas
            faultPhaseToGround: node.faseTierra?.iscFt,
            
            // Contexto de carga
            loadContext: node.loadContext,
            
            // Referencias
            nodeId: node.id,
            node: node
        };
    }

    // ============================================================
    // EXPORTAR API
    // ============================================================

    return {
        // Métodos principales
        runAll: runAll,
        validateNode: validateNode,
        
        // Validaciones individuales (para uso específico)
        validateShortCircuit: validateShortCircuit,
        validateAmpacity: validateAmpacity,
        validateVoltageDrop: validateVoltageDrop,
        validateProtection: validateProtection,
        validateCoordination: validateCoordination,
        validatePhysicalConstraints: validatePhysicalConstraints,
        validateLoadContext: validateLoadContext,
        validateOversizing: validateOversizing,
        
        // Constantes
        SEVERITY: SEVERITY,
        CODES: CODES,
        
        // Helpers
        getExpectedGroupingFactor: getExpectedGroupingFactor,
        getExpectedTempFactor: getExpectedTempFactor
    };

})();

// Exportar para diferentes entornos
if (typeof window !== 'undefined') {
    window.ValidationEngine = ValidationEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationEngine;
}
