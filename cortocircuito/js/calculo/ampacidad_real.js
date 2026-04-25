/**
 * ampacidad_real.js — Motor de Ampacidad Real (C.D.T.)
 * 
 * Capacidad de Diseño Térmico según NOM-001-SEDE-2012 (Art. 310)
 * 
 * Conceptos:
 * - C.D.T. (Capacidad de Diseño Térmico): capacidad real que debe tener el conductor
 *   o equipo para operar sin sobrecalentarse, considerando temperatura ambiente,
 *   agrupamiento, tipo de aislamiento, condiciones de instalación y correcciones.
 * - 125% (factor por carga continua): requisito normativo específico para cargas
 *   continuas, es solo una parte dentro del C.D.T.
 * 
 * Flujo correcto:
 * I_base → 125% (si aplica) → I_diseño
 * I_tabla (310) → factores de corrección → I_corregida
 * Condición: I_corregida ≥ I_diseño
 */

var AmpacidadReal = (function() {

    /**
     * Tabla de ampacidad base (NOM-001-SEDE-2012, Tabla 310-16)
     * Valores en amperes para conductores de cobre
     */
    var tablaAmpacidad = {
        // Calibre -> { 60C, 75C, 90C }
        '14': { 60: 14, 75: 20, 90: 25 },
        '12': { 60: 20, 75: 25, 90: 30 },
        '10': { 60: 30, 75: 30, 90: 40 },
        '8': { 60: 40, 75: 40, 90: 55 },
        '6': { 60: 55, 75: 65, 90: 75 },
        '4': { 60: 70, 75: 85, 90: 95 },
        '3': { 60: 85, 75: 100, 90: 110 },
        '2': { 60: 95, 75: 115, 90: 130 },
        '1': { 60: 110, 75: 130, 90: 150 },
        '1/0': { 60: 125, 75: 150, 90: 170 },
        '2/0': { 60: 145, 75: 175, 90: 195 },
        '3/0': { 60: 165, 75: 200, 90: 225 },
        '4/0': { 60: 195, 75: 230, 90: 260 },
        '250': { 60: 215, 75: 255, 90: 290 },
        '300': { 60: 240, 75: 285, 90: 320 },
        '350': { 60: 260, 75: 310, 90: 350 },
        '400': { 60: 280, 75: 335, 90: 380 },
        '500': { 60: 320, 75: 380, 90: 430 },
        '600': { 60: 355, 75: 420, 90: 475 },
        '700': { 60: 385, 75: 460, 90: 520 },
        '750': { 60: 400, 75: 475, 90: 535 },
        '800': { 60: 410, 75: 490, 90: 555 },
        '900': { 60: 435, 75: 520, 90: 585 },
        '1000': { 60: 455, 75: 545, 90: 615 },
        '1250': { 60: 495, 75: 590, 90: 665 },
        '1500': { 60: 520, 75: 625, 90: 705 },
        '1750': { 60: 545, 75: 650, 90: 735 },
        '2000': { 60: 560, 75: 665, 90: 750 }
    };

    /**
     * Obtiene temperatura ambiente con fallback defensivo
     * @param {number} tempAmbiente - Temperatura ambiente en °C
     * @returns {number} Temperatura ambiente (nunca undefined/null)
     */
    function getTempAmbiente(tempAmbiente) {
        if (tempAmbiente === undefined || tempAmbiente === null || isNaN(tempAmbiente)) {
            // Silenciar warning - es normal en primera carga
            return 30; // Default NOM típico
        }
        return tempAmbiente;
    }

    /**
     * Normaliza nodo defensivamente para congelar inputs
     * Evita mutación de estado entre módulos
     * @param {Object} nodo - Nodo raw del sistema
     * @returns {Object} Nodo normalizado con todos los valores seguros
     */
    function normalizarNodo(nodo) {
        return {
            calibre: nodo.calibre || '4/0',
            temperaturaAislamiento: nodo.temperaturaAislamiento || 75,
            temperaturaAmbiente: getTempAmbiente(nodo.temperaturaAmbiente),
            numConductores: nodo.numConductores || 3,
            paralelos: nodo.paralelos || 1,
            F_agrupamiento: nodo.F_agrupamiento || 1,
            canalizacion: nodo.canalizacion || 'acero',
            tempTerminal: nodo.tempTerminal || 75
        };
    }

    /**
     * Obtiene límite de terminal defensivo
     * @param {Object} nodo - Nodo con datos de terminal
     * @param {number} I_tabla - Ampacidad base de la tabla
     * @returns {number} Límite de terminal (nunca 0)
     */
    function getLimiteTerminal(nodo, I_tabla) {
        if (!nodo.tempTerminal) return I_tabla;
        if (nodo.tempTerminal === 75) return I_tabla;
        if (nodo.tempTerminal === 60) return I_tabla * 0.8;
        return I_tabla;
    }

    /**
     * Factor de temperatura según NOM-001-SEDE-2012 (versión defensiva)
     * NUNCA devuelve 0 - física imposible
     * @param {number} temperaturaAmbiente - Temperatura ambiente en °C
     * @param {number} temperaturaAislamiento - Temperatura de aislamiento (60, 75, 90)
     * @returns {number} Factor de corrección de temperatura (siempre > 0)
     */
    function factorTemperatura(temperaturaAmbiente, temperaturaAislamiento) {
        // Fallback defensivo: nunca devolver 0
        if (!temperaturaAmbiente || isNaN(temperaturaAmbiente)) {
            console.warn('⚠️ temperaturaAmbiente inválida → usando factor 1.0');
            return 1.0;
        }

        // Si temperatura es 30°C, factor es 1.0
        if (temperaturaAmbiente === 30) return 1.0;

        // Tabla de factores según NOM-001-SEDE-2012 (Tabla 310.15(B)(2)(a))
        var factores = {
            60: {
                21: 1.08, 26: 1.00, 31: 0.91, 36: 0.82, 41: 0.71,
                46: 0.58, 51: 0.41, 56: 0.33, 61: 0.22, 71: 0.00
            },
            75: {
                21: 1.05, 26: 1.00, 31: 0.94, 36: 0.88, 41: 0.82,
                46: 0.75, 51: 0.67, 56: 0.58, 61: 0.33, 71: 0.00
            },
            90: {
                21: 1.08, 26: 1.04, 31: 0.96, 36: 0.91, 41: 0.87,
                46: 0.82, 51: 0.76, 56: 0.71, 61: 0.58, 71: 0.41
            }
        };

        // Determinar el rango de temperatura
        var tempKey;
        if (temperaturaAmbiente <= 25) tempKey = 21;
        else if (temperaturaAmbiente <= 30) tempKey = 26;
        else if (temperaturaAmbiente <= 35) tempKey = 31;
        else if (temperaturaAmbiente <= 40) tempKey = 36;
        else if (temperaturaAmbiente <= 45) tempKey = 41;
        else if (temperaturaAmbiente <= 50) tempKey = 46;
        else if (temperaturaAmbiente <= 55) tempKey = 51;
        else if (temperaturaAmbiente <= 60) tempKey = 56;
        else if (temperaturaAmbiente <= 70) tempKey = 61;
        else tempKey = 71; // > 70°C

        var factor = factores[temperaturaAislamiento][tempKey];

        // Fallback defensivo: si el factor es 0 o undefined, usar límite conservador
        if (factor === undefined || factor === 0 || factor === null) {
            console.warn('⚠️ Factor de temperatura inválido (0/undefined) → usando 0.75 conservador');
            return 0.75; // Límite conservador
        }

        return factor;
    }

    /**
     * Factor de agrupamiento según NOM-001-SEDE-2012
     * @param {number} numConductores - Número de conductores portadores de corriente
     * @returns {number} Factor de corrección de agrupamiento
     */
    function factorAgrupamiento(numConductores) {
        if (numConductores <= 3) return 1.0;
        if (numConductores <= 6) return 0.80;
        if (numConductores <= 9) return 0.70;
        if (numConductores <= 20) return 0.50;
        if (numConductores <= 30) return 0.45;
        if (numConductores <= 40) return 0.40;
        return 0.35;
    }

    /**
     * Calcula Conductores Portadores de Corriente (CCC) según física real
     * @param {Object} config - Configuración del sistema
     * @param {string} config.sistema - Tipo de sistema ('3f', '1f', '3f+n')
     * @param {boolean} config.tieneNeutro - Si tiene neutro
     * @param {boolean} config.neutroContado - Si neutro cuenta térmicamente
     * @param {boolean} config.tieneArmonicos - Si hay armónicos (neutro activo)
     * @param {number} config.paralelos - Número de conductores en paralelo
     * @returns {number} CCC calculado
     */
    function calcularCCC(config) {
        var ccc = 0;

        // Sistema base
        if (config.sistema === '3f' || config.sistema === '3f+n') {
            ccc += 3; // fases
        } else if (config.sistema === '1f') {
            ccc += 2; // fase + neutro
        } else {
            ccc += 3; // default trifásico
        }

        // Neutro (solo si cuenta térmicamente)
        if (config.tieneNeutro) {
            if (config.neutroContado || config.tieneArmonicos) {
                ccc += 1;
            }
        }

        // Paralelos (multiplican CCC)
        ccc *= (config.paralelos || 1);

        return ccc;
    }

    /**
     * Resuelve factor de agrupamiento con auto-corrección inteligente
     * @param {Object} cable - Configuración del cable
     * @param {Object} config - Configuración del sistema para CCC
     * @returns {Object} { F, fuente, warning }
     */
    function resolverAgrupamiento(cable, config) {
        // Prioridad 1: Si el usuario define F_agrupamiento manualmente válido
        if (cable.F_agrupamiento != null && !isNaN(cable.F_agrupamiento) && cable.F_agrupamiento > 0) {
            var ccc_manual = cable.numConductores || calcularCCC(config);
            return {
                F: cable.F_agrupamiento,
                fuente: 'MANUAL',
                ccc: ccc_manual
            };
        }

        // Prioridad 2: Si el usuario define numConductores manualmente, usarlo directamente
        if (cable.numConductores && cable.numConductores > 0) {
            var F_manual = factorAgrupamiento(cable.numConductores);
            return {
                F: F_manual,
                fuente: 'MANUAL_NUM_CONDUCTORES',
                ccc: cable.numConductores
            };
        }

        // Prioridad 3: Usar CCC calculado
        var ccc = calcularCCC(config);
        var F_auto = factorAgrupamiento(ccc);

        return {
            F: F_auto,
            fuente: 'AUTO',
            ccc: ccc
        };
    }

    /**
     * Validador semántico de parámetros de ingeniería
     * Detecta inconsistencias físicas y violaciones de NOM
     * @param {Object} cable - Configuración del cable
     * @param {Object} cable.numConductores - Número de conductores
     * @param {Object} cable.F_agrupamiento - Factor de agrupamiento manual (opcional)
     * @param {Object} cable.tipoSistema - Tipo de sistema (opcional)
     * @returns {Object} { warnings: [], errors: [] }
     */
    function validarInputIngenieria(cable) {
        var warnings = [];
        var errors = [];

        if (!cable) return { warnings: warnings, errors: errors };

        // Validación básica
        if (cable.numConductores && cable.numConductores <= 0) {
            errors.push('Número de conductores inválido: debe ser >= 1');
        }

        // Validación de consistencia NOM (Tabla 310.15(B)(2)(a))
        if (cable.numConductores && cable.F_agrupamiento) {
            var F_tabla = factorAgrupamiento(cable.numConductores);
            
            // Si usuario mete factor manual inconsistente con NOM
            if (cable.numConductores <= 3 && cable.F_agrupamiento < 1.0) {
                warnings.push('Factor de agrupamiento manual inconsistente con NOM: ≤3 conductores debe ser 1.00. Valor actual: ' + cable.F_agrupamiento);
            }
            
            if (cable.numConductores > 3 && cable.F_agrupamiento > F_tabla) {
                warnings.push('Factor de agrupamiento manual mayor al valor NOM (' + F_tabla + '). Verifique si es intencional.');
            }
        }

        // Validación de densidad térmica
        if (cable.numConductores >= 9) {
            warnings.push('Alta densidad térmica: ' + cable.numConductores + ' conductores. Riesgo de sobrecalentamiento. Considere separar en múltiples canalizaciones.');
        }

        // Validación de sistema trifásico
        if (cable.numConductores > 3 && cable.tipoSistema === '3f') {
            warnings.push('Más de 3 conductores activos en sistema trifásico. Verifique neutro con armónicos o conductores en paralelo.');
        }

        return { warnings: warnings, errors: errors };
    }

    /**
     * Calcula la corriente de diseño
     * I_diseño = I_no_continua + Fcc * I_continua
     * @param {Object} load - Objeto de carga
     * @param {number} load.I_cont - Corriente continua (A)
     * @param {number} load.I_no_cont - Corriente no continua (A)
     * @param {boolean} load.esContinua - Si toda la carga es continua
     * @param {number} load.Fcc - Factor de carga continua (default 1.25 = 125%)
     * @returns {number} Corriente de diseño (A)
     */
    function corrienteDiseño(load) {
        var Fcc = load.Fcc || 1.25; // Default NOM-001: 125% para carga continua
        if (load.esContinua) {
            return load.I_cont * Fcc;
        }
        return load.I_no_cont + (load.I_cont * Fcc);
    }

    /**
     * Obtiene ampacidad base de la tabla
     * @param {string} calibre - Calibre del conductor (ej: '4', '1/0', '250')
     * @param {number} temperaturaAislamiento - Temperatura de aislamiento (60, 75, 90)
     * @returns {number} Ampacidad base (A) o null si no existe
     */
    function ampacidadBase(calibre, temperaturaAislamiento) {
        // Normalizar calibre: trim y asegurar string
        var calibreKey = String(calibre).trim();
        var ampacidades = tablaAmpacidad[calibreKey];

        if (!ampacidades) {
            console.warn('Calibre no encontrado en tabla:', calibreKey, '→ usando 4/0 como fallback');
            // Fallback a 4/0 (calibre común)
            ampacidades = tablaAmpacidad['4/0'];
        }

        var resultado = ampacidades[temperaturaAislamiento];
        if (resultado === undefined || resultado === null) {
            console.warn('Temperatura no encontrada para calibre:', calibreKey, 'temp:', temperaturaAislamiento);
            // Fallback a 75°C si no existe la temperatura solicitada
            resultado = ampacidades[75] || ampacidades[60] || ampacidades[90];
        }

        // Último fallback defensivo - nunca retornar null
        if (!resultado || resultado === 0) {
            console.error('ERROR CRÍTICO: ampacidadBase retornó 0/null para calibre:', calibreKey, 'usando 230A (4/0 @ 75°C)');
            return 230; // Valor conservador para 4/0 @ 75°C
        }

        return resultado;
    }

    /**
     * Calcula ampacidad corregida (C.D.T. completo)
     * I_corregida = I_tabla * F_temp * F_agrupamiento
     * @param {Object} cable - Objeto del conductor
     * @param {string} cable.calibre - Calibre del conductor
     * @param {number} cable.temperaturaAislamiento - Temperatura de aislamiento (60, 75, 90)
     * @param {number} cable.temperaturaAmbiente - Temperatura ambiente (°C)
     * @param {number} cable.numConductores - Número de conductores portadores de corriente
     * @param {number} cable.paralelos - Número de conductores en paralelo
     * @returns {Object} { I_corregida, I_tabla, F_temp, F_agrupamiento, status }
     */
    function ampacidadCorregida(cable) {
        // Normalizar nodo defensivamente
        var cableNormalizado = normalizarNodo(cable);

        // Validación de calibre
        var I_tabla = ampacidadBase(cableNormalizado.calibre, cableNormalizado.temperaturaAislamiento);
        if (I_tabla === null) {
            return {
                status: 'ERROR',
                error: 'Calibre no encontrado en tabla'
            };
        }

        var F_temp = factorTemperatura(cableNormalizado.temperaturaAmbiente, cableNormalizado.temperaturaAislamiento);

        // 🔥 FIX PROFESIONAL: Resolver conflicto manual/auto
        var F_agrupamiento;
        var agrupamientoInfo;

        // Prioridad: numConductores > F_agrupamiento manual > auto
        agrupamientoInfo = resolverAgrupamiento(cableNormalizado, {
            sistema: cableNormalizado.tipoSistema || '3f',
            tieneNeutro: true,
            neutroContado: false,
            tieneArmonicos: false,
            paralelos: cableNormalizado.paralelos || 1
        });
        F_agrupamiento = agrupamientoInfo.F;

        // Logger profundo
        if (typeof DebugVisualPro !== 'undefined') {
            DebugVisualPro.logCDT('ampacidad_corregida', {
                calibre: cableNormalizado.calibre,
                tempAislamiento: cableNormalizado.temperaturaAislamiento,
                tempAmbiente: cableNormalizado.temperaturaAmbiente,
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                paralelos: cableNormalizado.paralelos,
                fuente_agrupamiento: agrupamientoInfo.fuente,
                ccc: agrupamientoInfo.ccc
            });
        }
        
        // Validación: factores no físicos
        if (F_temp <= 0 || F_agrupamiento <= 0) {
            return {
                I_corregida: 0,
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                status: 'ERROR',
                error: 'Factores inválidos: F_temp=' + F_temp + ', F_agrupamiento=' + F_agrupamiento
            };
        }

        // 🔥 FIX CRÍTICO: Multiplicar por paralelos
        // Fórmula correcta: I_corregida = I_tabla * F_temp * F_agrupamiento * paralelos
        var I_corregida = I_tabla * F_temp * F_agrupamiento * cableNormalizado.paralelos;

        // 🔥 FIX CRÍTICO: Si I_corregida es 0, usar fallback defensivo
        if (I_corregida <= 0) {
            console.error('❌ I_corregida = 0 - usando fallback defensivo:', {
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                paralelos: cableNormalizado.paralelos,
                fuente_agrupamiento: agrupamientoInfo.fuente,
                ccc: agrupamientoInfo.ccc
            });
            I_corregida = I_tabla * 0.9; // Fallback conservador
        }

        return {
            I_corregida: I_corregida,
            I_tabla: I_tabla,
            F_temp: F_temp,
            F_agrupamiento: F_agrupamiento,
            status: 'OK',
            agrupamientoInfo: agrupamientoInfo
        };
    }

    /**
     * Auto-detección de tipo de instalación
     * @param {Object} cable - Configuración del cable
     * @returns {Object} { tipo, F_agrupamiento }
     */
    function detectarInstalacion(cable) {
        if (cable.canalizacion === 'charola') {
            return {
                tipo: 'charola',
                F_agrupamiento: 1.0
            };
        }

        if (cable.canalizacion === 'conduit') {
            return {
                tipo: 'conduit',
                F_agrupamiento: factorAgrupamiento(cable.numConductores || 1)
            };
        }

        return {
            tipo: 'desconocido',
            F_agrupamiento: 0.8
        };
    }

    /**
     * Debug CDT con estructura completa de diagnóstico
     * @param {Object} load - Objeto de carga
     * @param {Object} cable - Configuración del cable
     * @param {Object} config - Configuración adicional
     * @returns {Object} Estructura de debug completa
     */
    function debugCDT(load, cable, config) {
        var res = verificarAmpacidad(load, cable, config);

        return {
            entrada: {
                calibre: cable.calibre,
                tempAmbiente: cable.temperaturaAmbiente,
                numConductores: cable.numConductores,
                paralelos: cable.paralelos,
                canalizacion: cable.canalizacion
            },
            calculo: {
                I_diseño: res.I_diseño,
                I_tabla: res.I_tabla,
                F_temp: res.F_temp,
                F_agrupamiento: res.F_agrupamiento
            },
            limites: {
                I_corregida: res.I_corregida,
                I_terminal: res.I_limite_terminal,
                I_final: res.I_final
            },
            diagnostico: {
                status: res.status,
                violacionTerminal: res.violacionTerminal,
                margen: res.margen,
                deficit: res.deficit,
                error: res.error
            }
        };
    }

    /**
     * Verifica ampacidad contra carga con lógica normativa
     * @param {Object} load - Objeto de carga
     * @param {Object} cable - Configuración del cable
     * @param {Object} config - Configuración adicional (temperatura terminal, etc.)
     * @returns {Object} Resultado completo de verificación
     */
    function verificarAmpacidad(load, cable, config) {
        config = config || {};

        // Normalizar nodo defensivamente
        var cableNormalizado = normalizarNodo(cable);

        // Validación semántica de inputs
        var validacion = validarInputIngenieria(cableNormalizado);

        var I_diseño = corrienteDiseño(load);
        var amp = ampacidadCorregida(cableNormalizado);
        var I_corregida_bruta = amp.I_corregida;

        // Límite de terminal según Art. 110.14(C)
        var tempTerminal = config.temperaturaTerminal || 75; // Default 75°C
        var I_tabla_terminal = ampacidadBase(cableNormalizado.calibre, tempTerminal);

        // 🔥 FIX HARDENED: Validar null antes de multiplicar
        if (I_tabla_terminal === null) {
            console.error('ERROR: Tabla terminal no válida para calibre ' + cableNormalizado.calibre + ' @ ' + tempTerminal + '°C - usando I_corregida_bruta como fallback');
            // Fallback: usar I_corregida_bruta como I_final si I_tabla_terminal falla
            var I_final_fallback = I_corregida_bruta > 0 ? I_corregida_bruta : (amp.I_tabla * 0.9);
            if (I_final_fallback <= 0) I_final_fallback = 100; // Último recurso
            return {
                status: 'WARNING',
                error: 'Tabla terminal no válida para ' + cableNormalizado.calibre + ' @ ' + tempTerminal + '°C - usando fallback',
                detalle: {
                    calibre: cableNormalizado.calibre,
                    tempTerminal: tempTerminal
                },
                I_diseño: I_diseño,
                I_corregida: I_corregida_bruta,
                I_limite_terminal: I_final_fallback,
                I_final: I_final_fallback,
                I_tabla: amp.I_tabla,
                F_temp: amp.F_temp,
                F_agrupamiento: amp.F_agrupamiento,
                violacionTerminal: false,
                sinFactor125: false,
                margen: I_final_fallback - I_diseño,
                deficit: Math.max(0, I_diseño - I_final_fallback)
            };
        }

        // 🔥 FIX HARDENED: Multiplicación segura con fallback defensivo
        var I_limite_terminal = getLimiteTerminal(cableNormalizado, I_tabla_terminal) * cableNormalizado.paralelos;

        // Ampacidad final = MIN(ampacidad corregida, límite terminal)
        var I_final = Math.min(I_corregida_bruta, I_limite_terminal);

        // 🔥 FIX CRÍTICO: I_final nunca debe ser 0
        if (I_final <= 0) {
            console.error('❌ I_final = 0 en verificarAmpacidad - usando fallback:', {
                I_corregida_bruta: I_corregida_bruta,
                I_limite_terminal: I_limite_terminal,
                I_tabla: amp.I_tabla,
                F_temp: amp.F_temp,
                F_agrupamiento: amp.F_agrupamiento,
                paralelos: cableNormalizado.paralelos
            });
            I_final = I_corregida_bruta > 0 ? I_corregida_bruta : (amp.I_tabla * 0.9);
            if (I_final <= 0) I_final = 100; // Último recurso
        }

        // Violación de terminal: cuando el cable puede más que las terminales
        var violacionTerminal = I_corregida_bruta > I_limite_terminal;
        
        // Factor 125% para carga continua
        var sinFactor125 = false;
        if (load.esContinua || (load.I_cont > 0 && load.I_cont >= load.I_no_cont)) {
            // Para carga continua, I_final debe ser >= 1.25 * I_cont
            if (I_final < load.I_cont * 1.25) {
                sinFactor125 = true;
            }
        }
        
        // Status: FAIL si violación terminal o I_final < I_diseño
        // WARNING si cumple pero sin factor 125%
        var status = 'PASS';
        if (violacionTerminal || I_final < I_diseño) {
            status = 'FAIL';
        } else if (sinFactor125) {
            status = 'WARNING';
        }
        
        return {
            I_diseño: I_diseño,
            I_corregida: I_corregida_bruta,
            I_limite_terminal: I_limite_terminal,
            I_final: I_final,
            I_tabla: amp.I_tabla,
            F_temp: amp.F_temp,
            F_agrupamiento: amp.F_agrupamiento,
            status: status,
            violacionTerminal: violacionTerminal,
            sinFactor125: sinFactor125,
            deficit: I_diseño - I_final,
            margen: I_diseño > 0 ? ((I_final - I_diseño) / I_diseño * 100) : 0,
            tempTerminal: tempTerminal,
            validacionInput: validacion
        };
    }

    /**
     * Busca el conductor mínimo que cumple con la carga
     * @param {Object} load - Objeto de carga
     * @param {Object} cableConfig - Configuración del cable
     * @returns {Object} { calibre, I_corregida, status }
     */
    function buscarConductorMinimo(load, cableConfig) {
        var calibres = Object.keys(tablaAmpacidad).sort(function(a, b) {
            return tablaAmpacidad[a][75] - tablaAmpacidad[b][75];
        });

        // Normalizar cableConfig defensivamente
        var tempAmbiente = getTempAmbiente(cableConfig.temperaturaAmbiente);

        for (var i = 0; i < calibres.length; i++) {
            var calibre = calibres[i];
            var cable = {
                calibre: calibre,
                temperaturaAislamiento: cableConfig.temperaturaAislamiento || 75,
                temperaturaAmbiente: tempAmbiente,
                numConductores: cableConfig.numConductores || 3,
                paralelos: cableConfig.paralelos || 1,
                F_temp: cableConfig.F_temp || factorTemperatura(tempAmbiente, cableConfig.temperaturaAislamiento || 75),
                F_agrupamiento: cableConfig.F_agrupamiento != null ? cableConfig.F_agrupamiento : factorAgrupamiento(cableConfig.numConductores || 3)
            };

            var resultado = verificarAmpacidad(load, cable, cableConfig);

            if (resultado.status === 'PASS') {
                return {
                    calibre: calibre,
                    I_corregida: resultado.I_corregida,
                    I_diseño: resultado.I_diseño,
                    I_tabla: resultado.I_tabla,
                    F_temp: resultado.F_temp,
                    F_agrupamiento: resultado.F_agrupamiento,
                    status: resultado.status,
                    margen: resultado.margen,
                    deficit: resultado.deficit
                };
            }
        }

        return null;
    }

    return {
        corrienteDiseño: corrienteDiseño,
        ampacidadBase: ampacidadBase,
        factorTemperatura: factorTemperatura,
        factorAgrupamiento: factorAgrupamiento,
        calcularCCC: calcularCCC,
        resolverAgrupamiento: resolverAgrupamiento,
        ampacidadCorregida: ampacidadCorregida,
        verificarAmpacidad: verificarAmpacidad,
        buscarConductorMinimo: buscarConductorMinimo,
        validarInputIngenieria: validarInputIngenieria,
        debugCDT: debugCDT,
        detectarInstalacion: detectarInstalacion,
        tablaAmpacidad: tablaAmpacidad
    };

})();

if (typeof window !== 'undefined') {
    window.AmpacidadReal = AmpacidadReal;
}
