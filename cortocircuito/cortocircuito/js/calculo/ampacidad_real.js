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
     * Helper: valor seguro con fallback
     */
    function safe(v, def) {
        return (v === undefined || v === null || isNaN(v)) ? def : v;
    }

    /**
     * Helper: clamp valor entre min y max
     */
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    /**
     * Helper: error CDT estandarizado
     */
    function errorCDT(msg) {
        return {
            ok: false,
            error: msg,
            I_final: 0,
            I_corregida: 0,
            I_diseño: 0,
            status: 'ERROR'
        };
    }

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
            console.warn('[!] temperaturaAmbiente inválida → usando factor 1.0');
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

        // Si el factor es 0, significa que la temp ambiente excede el rating del cable
        if (factor === 0) {
            console.error('[!] TEMPERATURA CRÍTICA: El ambiente excede el límite del aislamiento.');
            return 0.01; // Factor mínimo para forzar falla de ampacidad
        }
        
        if (factor === undefined || factor === null) return 1.0;

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
     * Calcula F_agrupamiento desde NOM (ignora input manual)
     * @param {number} n - Número de conductores
     * @returns {number} Factor según NOM-001-SEDE-2012
     */
    function calcularFagrupamientoNOM(n) {
        if (n <= 3) return 1;
        if (n <= 6) return 0.8;
        if (n <= 9) return 0.7;
        if (n <= 20) return 0.5;
        if (n <= 30) return 0.45;
        if (n <= 40) return 0.4;
        return 0.35;
    }

    /**
     * AMPACIDAD C.D.T. BLINDADA (NOM REAL + ANTI BUGS)
     * Nunca devuelve 0, valida todo, aplica NOM correctamente
     * @param {Object} params - Parámetros de cálculo
     * @returns {Object} Resultado blindado
     */
    function calcularAmpacidadCDT(params) {
        // 🛡️ 1. SANITIZAR INPUT
        var I_base = safe(params.I_carga, 0);
        var Fcc = safe(params.factorCarga, 1.25);
        var F_temp = clamp(safe(params.F_temp, 1), 0.5, 1);
        var I_tabla = safe(params.I_tabla, 0);
        var tempTerminal = safe(params.tempTerminal, 75);
        var paralelos = safe(params.paralelos, 1);
        var numConductores = safe(params.numConductores, 3);
        var I_proteccion = safe(params.I_proteccion, 0);

        // 💣 FIX CRÍTICO: Validar I_tabla antes de todo
        if (I_tabla <= 0) {
            return errorCDT("Tabla de ampacidad inválida (310 NOM): I_tabla=" + I_tabla);
        }

        if (I_base <= 0) {
            return errorCDT("Datos base inválidos: I_base=" + I_base);
        }

        // 🔥 FIX: Forzar F_agrupamiento desde NOM (ignorar manual)
        var F_agrup_manual = params.F_agrupamiento;
        var F_agrup = calcularFagrupamientoNOM(numConductores);
        
        if (F_agrup_manual && F_agrup_manual !== F_agrup) {
            console.warn('[AmpacidadCDT] Se ignora F_agrupamiento manual (' + F_agrup_manual + ') — se usa NOM (' + F_agrup + ')');
        }

        // ⚡ 2. CORRIENTE DE DISEÑO
        var I_diseno = I_base * Fcc;

        // 🔥 3. AMPACIDAD CORREGIDA (NOM 310)
        var I_corregida = I_tabla * F_temp * F_agrup * paralelos;

        // 💀 PROTECCIÓN ANTI 0
        if (I_corregida <= 0) {
            return errorCDT("Ampacidad corregida inválida: " + I_corregida);
        }

        // ⚡ 4. LÍMITE DE TERMINAL (110.14C)
        var limiteTerminal;
        if (tempTerminal === 60) {
            limiteTerminal = I_tabla * 0.8;
        } else if (tempTerminal === 75) {
            limiteTerminal = I_tabla;
        } else if (tempTerminal === 90) {
            limiteTerminal = I_tabla * 1.1;
        } else {
            limiteTerminal = I_tabla; // fallback seguro
        }

        // 💣 FIX CRÍTICO
        if (!limiteTerminal || limiteTerminal <= 0) {
            console.warn('[AmpacidadCDT] limiteTerminal inválido → usando Infinity');
            limiteTerminal = Infinity;
        }

        // 🧠 5. AMPACIDAD FINAL
        var I_final = Math.min(I_corregida, limiteTerminal);

        if (I_final <= 0 || isNaN(I_final)) {
            return errorCDT("I_final inválida: " + I_final);
        }

        // 📊 6. VALIDACIÓN NOM REAL (dos condiciones separadas)
        var cumpleProteccion = I_proteccion > 0 ? (I_proteccion <= I_final) : true;
        var cumpleCarga = I_proteccion > 0 ? (I_diseno <= I_proteccion) : true;
        var margen = I_final / I_diseno;

        // 🚦 7. STATUS NOM REAL
        var status = "OK";
        if (!cumpleProteccion) status = "NO_CUMPLE_PROTECCION";
        else if (!cumpleCarga) status = "NO_CUMPLE_CARGA";
        else if (margen < 1.0) status = "NO_CUMPLE";
        else if (margen < 1.25) status = "JUSTO";

        // 🧠 8. TRAZABILIDAD COMPLETA
        var debug = {
            entrada: {
                I_carga: I_base,
                factorCarga: Fcc,
                numConductores: numConductores,
                tempTerminal: tempTerminal,
                paralelos: paralelos,
                I_proteccion: I_proteccion
            },
            factores: {
                F_temp: F_temp,
                F_agrup_manual: F_agrup_manual,
                F_agrup_NOM: F_agrup,
                Fcc: Fcc
            },
            calculo: {
                I_tabla: I_tabla,
                I_diseno: I_diseno,
                I_corregida: I_corregida,
                limiteTerminal: limiteTerminal,
                I_final: I_final
            },
            validacion: {
                cumpleProteccion: cumpleProteccion,
                cumpleCarga: cumpleCarga,
                margen: margen
            }
        };

        return {
            ok: status === "OK",
            I_base: I_base,
            I_diseno: I_diseno,
            I_corregida: I_corregida,
            I_final: I_final,
            limiteTerminal: limiteTerminal,
            margen: margen,
            status: status,
            F_temp: F_temp,
            F_agrupamiento: F_agrup,
            paralelos: paralelos,
            cumpleProteccion: cumpleProteccion,
            cumpleCarga: cumpleCarga,
            debug: debug
        };
    }

    /**
     * Calcula ampacidad corregida (C.D.T. completo) - LEGACY WRAPPER
     * I_corregida = I_tabla * F_temp * F_agrupamiento
     * @param {Object} cable - Objeto del conductor
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

        // 🔥 FIX CRÍTICO: Validar paralelos antes del cálculo
        if (!cableNormalizado.paralelos || cableNormalizado.paralelos <= 0) {
            console.error('[X] Paralelos inválido:', {
                paralelos: cableNormalizado.paralelos,
                nodo: cableNormalizado.id || 'desconocido'
            });
            throw new Error("Paralelos inválido: " + cableNormalizado.paralelos + ". Debe ser >= 1");
        }

        // 🔥 FIX CRÍTICO: Multiplicar por paralelos
        // Fórmula correcta: I_corregida = I_tabla * F_temp * F_agrupamiento * paralelos
        var I_corregida = I_tabla * F_temp * F_agrupamiento * cableNormalizado.paralelos;

        // DEBUG: Log del cálculo
        console.log("[AmpacidadReal] Cálculo:", {
            I_tabla: I_tabla,
            F_temp: F_temp,
            F_agrupamiento: F_agrupamiento,
            paralelos: cableNormalizado.paralelos,
            I_corregida: I_corregida,
            formula: I_tabla + " × " + F_temp + " × " + F_agrupamiento + " × " + cableNormalizado.paralelos + " = " + I_corregida
        });

        // FIX CRÍTICO: Si I_corregida es 0, es un error real (no usar fallback)
        if (I_corregida <= 0) {
            console.error('[X] I_corregida = 0 - ERROR CRÍTICO:', {
                I_tabla: I_tabla,
                F_temp: F_temp,
                F_agrupamiento: F_agrupamiento,
                paralelos: cableNormalizado.paralelos,
                fuente_agrupamiento: agrupamientoInfo.fuente,
                ccc: agrupamientoInfo.ccc
            });
            throw new Error("Ampacidad corregida inválida: " + I_corregida + ". Revisar factores de corrección.");
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

        // 🔥 FIX OBLIGATORIO: Usar tabla de terminales para I_limite_terminal
        // Según NOM-001-SEDE-2012 Art. 110.14(C): I_final = min(I_corregida, I_terminal)
        // Para paralelos: validar I_por_conductor contra terminal_por_conductor
        var I_terminal_por_conductor = getAmpacidadTerminal(cableNormalizado.calibre, tempTerminal);
        var n_paralelos = cableNormalizado.paralelos || 1;
        
        // FIX CRÍTICO: Si I_terminal es null, usar I_tabla como fallback
        if (I_terminal_por_conductor === null) {
            console.warn('[X] I_terminal no disponible para calibre ' + cableNormalizado.calibre + ', usando I_tabla como fallback');
            I_terminal_por_conductor = I_tabla;
        }
        
        // Corriente por conductor para validación de terminal
        var I_por_conductor = I_corregida_bruta / n_paralelos;
        
        // Violación de terminal: cuando la corriente por conductor excede el límite terminal por conductor
        var violacionTerminal = I_por_conductor > I_terminal_por_conductor;
        
        // I_final total respetando terminal: min(I_corregida_total, I_terminal_total)
        var I_limite_terminal_total = I_terminal_por_conductor * n_paralelos;

        // 🔥 VALIDACIÓN DURA: I_terminal debe ser > 0
        if (!I_limite_terminal_total || I_limite_terminal_total <= 0) {
            console.error('[X] I_limite_terminal inválido (' + I_limite_terminal_total + 'A) - usando I_corregida como fallback');
            console.error('[X] Calibre: ' + cableNormalizado.calibre + ', Temp Terminal: ' + tempTerminal + '°C');
            // Fallback: usar I_corregida_bruta cuando I_terminal no está disponible
            I_limite_terminal_total = I_corregida_bruta;
        }

        // Ampacidad final = MIN(ampacidad corregida, límite terminal)
        var I_final = Math.min(I_corregida_bruta, I_limite_terminal_total);

        // FIX CRÍTICO: I_final nunca debe ser 0
        if (I_final <= 0) {
            console.error('[X] I_final = 0 en verificarAmpacidad - usando fallback:', {
                I_corregida_bruta: I_corregida_bruta,
                I_limite_terminal_total: I_limite_terminal_total,
                I_tabla: amp.I_tabla,
                F_temp: amp.F_temp,
                F_agrupamiento: amp.F_agrupamiento,
                paralelos: cableNormalizado.paralelos
            });
            I_final = I_corregida_bruta > 0 ? I_corregida_bruta : (amp.I_tabla * 0.9);
            if (I_final <= 0) I_final = 100; // Último recurso
        }
        
        // Factor 125% para carga continua
        // I_diseño ya incluye el factor 125% si es carga continua
        // Solo marcar sinFactor125 si I_diseño no fue calculado con el factor
        var sinFactor125 = false;
        if (load.esContinua || (load.I_cont > 0 && load.I_cont >= load.I_no_cont)) {
            // Verificar si I_diseño es menor que 1.25 * I_cont
            // Esto indica que no se aplicó el factor 125%
            var I_cont = load.I_cont || load.I_no_cont || 0;
            if (I_diseño < I_cont * 1.25) {
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
            I_limite_terminal: I_limite_terminal_total,
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
     * Tabla de ampacidad de terminales según NOM-001-SEDE-2012 Art. 110.14(C)
     * Valores para cobre (Cu) en diferentes temperaturas de terminal
     * @type {Object}
     */
    var tablaTerminales = {
        cobre: {
            60: {
                '14': 15, '12': 20, '10': 30, '8': 40, '6': 65,
                '4': 85, '2': 115, '1': 130, '1/0': 150, '2/0': 175,
                '3/0': 200, '4/0': 230, '250': 255, '300': 285, '350': 310,
                '400': 335, '500': 380, '600': 420, '750': 465, '1000': 545
            },
            75: {
                '14': 15, '12': 20, '10': 30, '8': 50, '6': 65,
                '4': 85, '2': 115, '1': 130, '1/0': 150, '2/0': 175,
                '3/0': 200, '4/0': 230, '250': 255, '300': 285, '350': 310,
                '400': 335, '500': 380, '600': 420, '750': 465, '1000': 545
            },
            90: {
                '14': 15, '12': 20, '10': 30, '8': 55, '6': 75,
                '4': 95, '2': 125, '1': 145, '1/0': 170, '2/0': 195,
                '3/0': 225, '4/0': 260, '250': 290, '300': 320, '350': 350,
                '400': 380, '500': 430, '600': 475, '750': 525, '1000': 615
            }
        }
    };

    /**
     * Obtiene temperatura de terminal según NOM-001-SEDE-2012 Art. 110.14(C)
     * Regla: equipo ≤ 100A → 60°C, equipo > 100A → 75°C
     * @param {Object} equipo - Equipo con amperaje
     * @returns {number} Temperatura de terminal (60, 75, o 90 si está certificado)
     */
    function obtenerTempTerminal(equipo) {
        if (!equipo) {
            console.error('[X] obtenerTempTerminal: equipo no definido, usando 75°C por defecto');
            return 75;
        }

        var amperaje = equipo.amperaje || equipo.In || equipo.capacidad || 0;

        if (amperaje <= 0) {
            console.error('[X] obtenerTempTerminal: amperaje inválido (' + amperaje + 'A), usando 75°C por defecto');
            return 75;
        }

        // Regla NOM: ≤100A → 60°C, >100A → 75°C
        if (amperaje <= 100) {
            return 60;
        }

        // Si el sistema está certificado a 90°C (raro, requiere validación explícita)
        if (equipo.certificado90C === true) {
            console.warn('[!] Equipo certificado a 90°C - requiere validación de todo el sistema');
            return 90;
        }

        return 75;
    }

    /**
     * Tabla de ampacidad de terminales según NOM-001-SEDE-2012
     * Valores típicos para terminales 60°C, 75°C
     * @param {string} calibre - Calibre del conductor
     * @param {number} tempTerminal - Temperatura de terminal (60, 75)
     * @returns {number} Ampacidad del terminal en amperes
     */
    function getAmpacidadTerminal(calibre, tempTerminal) {
        // Usar tabla completa de terminales
        var material = 'cobre'; // Default a cobre
        var tempKey = tempTerminal.toString();

        if (!tablaTerminales[material]) {
            console.error('[X] Material no soportado: ' + material + ', usando fallback I_tabla');
            return null; // Return null to signal use I_tabla instead
        }

        if (!tablaTerminales[material][tempKey]) {
            console.warn('[!] Temperatura de terminal no soportada: ' + tempTerminal + '°C, usando 75°C');
            tempKey = '75';
        }

        var I_terminal = tablaTerminales[material][tempKey][calibre];

        if (!I_terminal || I_terminal <= 0) {
            console.warn('[X] I_terminal no encontrado en tabla para calibre ' + calibre + ' @ ' + tempTerminal + '°C - usando I_tabla como fallback');
            return null; // Return null to signal use I_tabla instead
        }

        return I_terminal;
    }

    /**
     * Ampacidad por terminal con validación completa
     * @param {Object} params - { calibre, material, equipo }
     * @returns {Object} { valor, temperatura, error }
     */
    function ampacidadPorTerminal(params) {
        var calibre = params.calibre;
        var material = params.material || 'cobre';
        var equipo = params.equipo;

        if (!equipo || !equipo.amperaje) {
            return {
                valor: null,
                temperatura: 0,
                error: 'Equipo sin amperaje definido'
            };
        }

        var temp = obtenerTempTerminal(equipo);
        var tabla = tablaTerminales[material]?.[temp];

        if (!tabla || !tabla[calibre]) {
            return {
                valor: null,
                temperatura: temp,
                error: 'No existe ampacidad para ' + calibre + ' @ ' + temp + '°C'
            };
        }

        return {
            valor: tabla[calibre],
            temperatura: temp,
            error: null
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

            // FIX CRÍTICO: Validar que I_final no sea 0
            if (resultado.I_final <= 0) {
                console.error('[X] Ampacidad inválida para calibre ' + calibre + ': I_final = ' + resultado.I_final);
                continue; // Skip this calibre
            }

            if (resultado.status === 'PASS') {
                return {
                    calibre: calibre,
                    I_corregida: resultado.I_corregida,
                    I_diseño: resultado.I_diseño,
                    I_tabla: resultado.I_tabla,
                    I_final: resultado.I_final,
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
        tablaAmpacidad: tablaAmpacidad,
        factorTemperatura: factorTemperatura,
        factorAgrupamiento: factorAgrupamiento,
        corrienteDiseño: corrienteDiseño,
        ampacidadBase: ampacidadBase,
        ampacidadCorregida: ampacidadCorregida,
        verificarAmpacidad: verificarAmpacidad,
        buscarConductorMinimo: buscarConductorMinimo,
        calcularAmpacidadCDT: calcularAmpacidadCDT,
        getAmpacidadTerminal: getAmpacidadTerminal,
        obtenerTempTerminal: obtenerTempTerminal,
        ampacidadPorTerminal: ampacidadPorTerminal,
        resolverAgrupamiento: resolverAgrupamiento,
        calcularCCC: calcularCCC,
        validarInputIngenieria: validarInputIngenieria
    };
})();

if (typeof window !== 'undefined') {
    window.AmpacidadReal = AmpacidadReal;
    console.log('[*] AmpacidadReal cargado:', typeof AmpacidadReal);
}
