/**
 * motor_inteligente_ccc.js — Motor Inteligente de CCC y Ampacidad
 * Sistema de inferencia eléctrica anti-errores humanos + anti-datos corruptos
 */

var MotorInteligenteCCC = (function() {
    /**
     * Crear contexto de tracking para el motor inteligente
     */
    function crearContexto() {
        return {
            autocorrecciones: [],
            warnings: [],
            errores: [],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calcular CCC real según tipo de sistema y carga
     * @param {Object} nodo - Datos del nodo
     * @param {Object} ctx - Contexto de tracking
     * @returns {number} CCC real
     */
    function calcularCCC(nodo, ctx) {
        var fases = nodo.fases || 3;
        var tieneNeutro = nodo.tieneNeutro !== false;
        var tipoCarga = nodo.tipoCarga || 'lineal'; // lineal | no_lineal
        var balanceado = nodo.balanceado !== false;
        var paralelos = nodo.paralelos || 1;

        var ccc = fases;

        // 🔹 Neutro: cuenta o no según carga y balance
        if (tieneNeutro) {
            if (tipoCarga === 'no_lineal') {
                // Cargas no lineales: neutro siempre cuenta (armónicos)
                ccc += 1;
                if (ctx) {
                    ctx.autocorrecciones.push({
                        nodo: nodo.id,
                        tipo: 'NEUTRO_CUENTA',
                        severidad: 'MEDIA',
                        msg: 'Neutro cuenta por armónicos (carga no lineal)'
                    });
                }
            } else if (!balanceado) {
                // Sistema desbalanceado: neutro considerado
                ccc += 1;
                if (ctx) {
                    ctx.warnings.push({
                        nodo: nodo.id,
                        tipo: 'NEUTRO_PUEDE_CARGARSE',
                        msg: 'Sistema desbalanceado → neutro considerado'
                    });
                }
                // Si está balanceado, neutro NO cuenta (cargas lineales)
            }
        }

        var cccFinal = ccc * paralelos;

        return {
            ccc: cccFinal,
            cccBase: ccc,
            paralelos: paralelos,
            razon: tieneNeutro ? (tipoCarga === 'no_lineal' ? 'Cargas no lineales: neutro cuenta' : 
                                   (balanceado ? 'Cargas lineales balanceadas: neutro no cuenta' : 'Sistema desbalanceado: neutro cuenta')) : 
                    'Sin neutro',
            tieneNeutro: tieneNeutro,
            tipoCarga: tipoCarga,
            balanceado: balanceado
        };
    }

    /**
     * Obtener factor de agrupamiento según Tabla 310-15(g) NOM-001-SEDE-2012
     * @param {number} ccc - Número de conductores
     * @returns {number} Factor de agrupamiento
     */
    function getFactorAgrupamiento(ccc) {
        if (!ccc || ccc <= 0) return 1.0;
        if (ccc <= 3) return 1.0;
        if (ccc <= 6) return 0.80;
        if (ccc <= 9) return 0.70;
        if (ccc <= 20) return 0.50;
        if (ccc <= 30) return 0.45;
        if (ccc <= 40) return 0.40;
        return 0.35;
    }

    /**
     * Corregir agrupamiento inteligentemente
     * @param {Object} nodo - Datos del nodo
     * @param {Object} ctx - Contexto de tracking
     * @returns {Object} Información de corrección
     */
    function corregirAgrupamiento(nodo, ctx) {
        var cccInfo = calcularCCC(nodo, ctx);
        var esperado = getFactorAgrupamiento(cccInfo.ccc);
        var actual = nodo.F_agrupamiento;
        var fuente = nodo.fuenteAgrupamiento || 'AUTO';

        var resultado = {
            ccc: cccInfo.ccc,
            cccBase: cccInfo.cccBase,
            factor: esperado,
            fuente: fuente,
            razonCCC: cccInfo.razon,
            autocorreccion: null
        };

        if (!actual || fuente === 'AUTO') {
            // Sin factor manual: usar calculado automáticamente
            nodo.F_agrupamiento = esperado;
            nodo.ccc_real = cccInfo.ccc;
            resultado.fuente = 'AUTO';
            
            if (ctx) {
                ctx.autocorrecciones.push({
                    nodo: nodo.id,
                    tipo: 'FACTOR_AUTO',
                    severidad: 'BAJA',
                    msg: 'Factor calculado automáticamente: ' + esperado.toFixed(2) + ' (CCC=' + cccInfo.ccc + ')'
                });
            }
        } else {
            // Con factor manual: validar consistencia
            var tolerancia = 0.05;
            if (Math.abs(actual - esperado) > tolerancia) {
                // Inconsistencia detectada: corregir
                nodo.F_agrupamiento = esperado;
                nodo.ccc_real = cccInfo.ccc;
                resultado.fuente = 'AUTO_CORREGIDO';
                resultado.autocorreccion = {
                    antes: actual,
                    despues: esperado,
                    msg: 'Factor corregido: ' + actual.toFixed(2) + ' → ' + esperado.toFixed(2) + ' (CCC=' + cccInfo.ccc + ')'
                };

                if (ctx) {
                    ctx.autocorrecciones.push({
                        nodo: nodo.id,
                        tipo: 'FACTOR_CORREGIDO',
                        severidad: 'ALTA',
                        msg: resultado.autocorreccion.msg
                    });
                }
            } else {
                // Factor manual es consistente
                nodo.ccc_real = cccInfo.ccc;
                resultado.fuente = 'MANUAL_VALIDADO';
            }
        }

        return resultado;
    }

    /**
     * Validar datos críticos (anti-corrupción)
     * @param {Object} nodo - Datos del nodo
     * @param {Object} ctx - Contexto de tracking
     */
    function validarDatosCriticos(nodo, ctx) {
        // Validar temperatura ambiente
        if (!nodo.tempAmbiente || !isFinite(nodo.tempAmbiente) || nodo.tempAmbiente <= 0) {
            nodo.tempAmbiente = 30; // Default Puerto Vallarta
            if (ctx) {
                ctx.autocorrecciones.push({
                    nodo: nodo.id,
                    tipo: 'TEMP_DEFAULT',
                    severidad: 'BAJA',
                    msg: 'Temperatura inválida → 30°C'
                });
            }
        }

        // Validar ampacidad base de tabla
        if (!nodo.I_tabla || !isFinite(nodo.I_tabla) || nodo.I_tabla <= 0) {
            if (ctx) {
                ctx.errores.push({
                    nodo: nodo.id,
                    tipo: 'TABLA_INVALIDA',
                    severidad: 'CRITICA',
                    msg: 'Ampacidad base inválida: ' + (nodo.I_tabla || 0)
                });
            }
        }

        // Validar factor de temperatura
        if (!nodo.F_temp || !isFinite(nodo.F_temp) || nodo.F_temp <= 0) {
            if (ctx) {
                ctx.autocorrecciones.push({
                    nodo: nodo.id,
                    tipo: 'F_TEMP_DEFAULT',
                    severidad: 'MEDIA',
                    msg: 'Factor temperatura inválido → 1.0'
                });
            }
            nodo.F_temp = 1.0;
        }
    }

    /**
     * Calcular factor de temperatura según NOM-001
     * @param {number} tempAmbiente - Temperatura ambiente (°C)
     * @returns {number} Factor de temperatura
     */
    function factorTemperatura(tempAmbiente) {
        if (typeof CONSTANTES !== 'undefined' && CONSTANTES.FACTOR_TEMPERATURA) {
            var tempKey = tempAmbiente.toString();
            return CONSTANTES.FACTOR_TEMPERATURA[tempKey] || CONSTANTES.FACTOR_TEMPERATURA['default'] || 0.91;
        }
        // Fallback
        if (tempAmbiente <= 35) return 1.0;
        if (tempAmbiente <= 40) return 0.91;
        if (tempAmbiente <= 45) return 0.82;
        if (tempAmbiente <= 50) return 0.71;
        return 0.58;
    }

    /**
     * Calcular ampacidad final blindada
     * @param {Object} nodo - Datos del nodo
     * @param {Object} ctx - Contexto de tracking
     * @returns {number} Ampacidad final
     */
    function calcularAmpacidad(nodo, ctx) {
        validarDatosCriticos(nodo, ctx);
        var agrupamientoInfo = corregirAgrupamiento(nodo, ctx);

        var F_temp = factorTemperatura(nodo.tempAmbiente);
        var I = nodo.I_tabla * F_temp * nodo.F_agrupamiento;

        // Fail-safe: ampacidad inválida
        if (!isFinite(I) || I <= 0) {
            if (ctx) {
                ctx.autocorrecciones.push({
                    nodo: nodo.id,
                    tipo: 'AMPACIDAD_FIX',
                    severidad: 'ALTA',
                    msg: 'Ampacidad inválida (' + I.toFixed(1) + 'A) → fallback 85%'
                });
            }
            I = nodo.I_tabla * 0.85;
            if (I <= 0) I = 100; // Último recurso
        }

        nodo.I_final = I;
        nodo.agrupamientoInfo = agrupamientoInfo;

        return {
            I_final: I,
            agrupamientoInfo: agrupamientoInfo
        };
    }

    /**
     * Pipeline completo del motor inteligente
     * @param {Object} nodo - Datos del nodo
     * @param {Object} config - Configuración adicional
     * @returns {Object} Resultado completo
     */
    function ejecutar(nodo, config) {
        var ctx = crearContexto();

        // Enriquecer nodo con configuración
        nodo.fases = config.fases || 3;
        nodo.tieneNeutro = config.tieneNeutro !== false;
        nodo.tipoCarga = config.tipoCarga || 'lineal';
        nodo.balanceado = config.balanceado !== false;
        nodo.paralelos = config.paralelos || 1;
        nodo.fuenteAgrupamiento = config.fuenteAgrupamiento || 'AUTO';

        // Ejecutar pipeline
        var resultado = calcularAmpacidad(nodo, ctx);

        return {
            nodo: nodo,
            I_final: resultado.I_final,
            agrupamientoInfo: resultado.agrupamientoInfo,
            contexto: ctx,
            estadoGlobal: ctx.errores.length > 0 ? 'ERROR' : (ctx.autocorrecciones.length > 0 ? 'WARNING' : 'OK')
        };
    }

    return {
        crearContexto: crearContexto,
        calcularCCC: calcularCCC,
        getFactorAgrupamiento: getFactorAgrupamiento,
        corregirAgrupamiento: corregirAgrupamiento,
        validarDatosCriticos: validarDatosCriticos,
        factorTemperatura: factorTemperatura,
        calcularAmpacidad: calcularAmpacidad,
        ejecutar: ejecutar
    };
})();

if (typeof window !== 'undefined') {
    window.MotorInteligenteCCC = MotorInteligenteCCC;
}
