/**
 * core/MotorElectricoUnificado.js — Motor Eléctrico Unificado (ETAP/SKM Architecture)
 * SINGLE SOURCE OF TRUTH: Un solo motor, un solo contexto, un solo cálculo
 * 
 * Arquitectura:
 * - Contexto único (elimina corrupción de estado)
 * - Pipeline secuencial (elimina recálculos)
 * - Contratos de entrada/salida (elimina inconsistencias)
 * - Auto-corrección con control de loop (elimina loops infinitos)
 */

const MotorElectricoUnificado = (function() {
    
    /**
     * Crear contexto unificado (elimina duplicidad de estado)
     * @param {Object} input - Datos de entrada del sistema
     * @returns {Object} Contexto unificado
     */
    function crearContexto(input) {
        return {
            // Input original (inmutable)
            input: JSON.parse(JSON.stringify(input)),
            
            // Estado del sistema
            sistema: {
                id: input.id || 'nodo_1',
                voltaje: input.voltaje || 480,
                tipoSistema: (input.tipoSistema || '3F').toUpperCase(),
                FP: input.FP || 0.9
            },
            
            // Carga
            carga: {
                I_carga: Number(input.I_carga) || 0,
                I_diseño: (Number(input.I_carga) || 0) * 1.25
            },
            
            // Conductor
            conductor: {
                calibre: input.calibre || null,
                material: input.material || 'cobre',
                tempAislamiento: input.tempAislamiento || 75,
                tempAmbiente: input.tempAmbiente || 30,
                nConductores: input.nConductores || 3,
                paralelos: input.paralelos || 1,
                tempTerminal: input.tempTerminal || 75,
                longitud: input.longitud || 0,
                I_tabla: 0,
                I_corregida: 0,
                I_terminal: 0,
                I_final: 0
            },
            
            // Protección
            proteccion: {
                tipo: input.proteccion?.tipo || 'MCCB',
                In: input.proteccion?.In || 0,
                Icu: input.proteccion?.Icu || 0,
                Ii: input.proteccion?.Ii || 0,
                terminal: input.proteccion?.terminal || 75
            },
            
            // Falla (cortocircuito)
            falla: {
                Isc_3F: 0,
                Isc_LG: 0,
                X_R: 0
            },
            
            // Caída de tensión
            caida: {
                porcentaje: 0,
                valor: 0
            },
            
            // Resultados finales
            resultados: {
                estadoGlobal: 'PASS',
                severidad: 0
            },
            
            // Errores y warnings
            errores: [],
            warnings: [],
            
            // Trazabilidad
            trazabilidad: [],
            
            // Flag para evitar recálculos
            _calculado: false
        };
    }
    
    /**
     * Pre-validar input (evita errores tempranos)
     * @param {Object} ctx - Contexto unificado
     * @throws {Error} Si el input es inválido
     */
    function preValidar(ctx) {
        if (!ctx.input) {
            throw new Error('Input es requerido');
        }
        
        if (ctx.carga.I_carga < 0) {
            throw new Error('I_carga debe ser >= 0');
        }
        
        if (ctx.conductor.paralelos < 1) {
            throw new Error('Paralelos debe ser >= 1');
        }
        
        if (ctx.sistema.voltaje <= 0) {
            throw new Error('Voltaje debe ser > 0');
        }
        
        ctx.trazabilidad.push({
            step: 'preValidar',
            status: 'OK',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Calcular ampacidad (UNA SOLA VEZ - single source of truth)
     * @param {Object} ctx - Contexto unificado
     */
    function calcularAmpacidad(ctx) {
        // Usar MotorAmpacidadNOM como única fuente de verdad
        if (typeof MotorAmpacidadNOM === 'undefined') {
            ctx.errores.push('MotorAmpacidadNOM no disponible');
            return;
        }
        
        try {
            const resultado = MotorAmpacidadNOM.calcularAmpacidadNOM({
                calibre: ctx.conductor.calibre,
                material: ctx.conductor.material,
                tempAislamiento: ctx.conductor.tempAislamiento,
                tempAmbiente: ctx.conductor.tempAmbiente,
                nConductores: ctx.conductor.nConductores,
                paralelos: ctx.conductor.paralelos,
                tempTerminal: ctx.conductor.tempTerminal
            });
            
            ctx.conductor.I_tabla = resultado.I_tabla;
            ctx.conductor.I_corregida = resultado.I_corregida;
            ctx.conductor.I_terminal = resultado.I_terminal;
            ctx.conductor.I_final = resultado.I_final;
            
            ctx.trazabilidad.push({
                step: 'calcularAmpacidad',
                status: 'OK',
                resultado: resultado,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            ctx.errores.push('Error en cálculo de ampacidad: ' + error.message);
            ctx.trazabilidad.push({
                step: 'calcularAmpacidad',
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Calcular cortocircuito (integrado - NO módulo separado)
     * @param {Object} ctx - Contexto unificado
     */
    function calcularCortoCircuito(ctx) {
        // Usar módulo de cortocircuito existente
        if (typeof FaultAnalysis === 'undefined') {
            ctx.warnings.push('FaultAnalysis no disponible');
            return;
        }
        
        try {
            const V = ctx.sistema.voltaje;
            const Z = ctx.input.impedancia || { R: 0.01, X: 0.02 };
            
            const Z_total = Math.sqrt(Z.R * Z.R + Z.X * Z.X);
            const Isc_3F = V / (Math.sqrt(3) * Z_total);
            
            ctx.falla.Isc_3F = Isc_3F / 1000; // kA
            ctx.falla.Isc_LG = Isc_3F * 0.5 / 1000; // Aproximación
            ctx.falla.X_R = Z.X / Z.R;
            
            ctx.trazabilidad.push({
                step: 'calcularCortoCircuito',
                status: 'OK',
                resultado: ctx.falla,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            ctx.errores.push('Error en cálculo de cortocircuito: ' + error.message);
        }
    }
    
    /**
     * Seleccionar protección
     * @param {Object} ctx - Contexto unificado
     */
    function seleccionarProteccion(ctx) {
        if (ctx.proteccion.In > 0) {
            // Ya tiene protección definida
            return;
        }
        
        // Seleccionar breaker basado en I_diseño
        const I_diseño = ctx.carga.I_diseño;
        const In = Math.ceil(I_diseño / 50) * 50; // Redondear a 50A
        
        ctx.proteccion.In = In;
        ctx.proteccion.Icu = In >= 400 ? 35 : 25; // kA
        ctx.proteccion.Ii = In * 10;
        
        ctx.trazabilidad.push({
            step: 'seleccionarProteccion',
            status: 'OK',
            proteccion: ctx.proteccion,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Verificar normativa NOM (centralizado)
     * @param {Object} ctx - Contexto unificado
     */
    function verificarNormativa(ctx) {
        // 1. Ampacidad NOM 210/215
        if (ctx.conductor.I_final < ctx.carga.I_diseño) {
            ctx.errores.push({
                codigo: 'NOM_210',
                tipo: 'AMPACIDAD',
                severidad: 'CRITICO',
                mensaje: 'Ampacidad insuficiente para carga continua',
                valor: { I_final: ctx.conductor.I_final, I_diseño: ctx.carga.I_diseño }
            });
        }
        
        // 2. Terminal NOM 110.14(C)
        if (ctx.conductor.I_corregida > ctx.conductor.I_terminal) {
            ctx.errores.push({
                codigo: 'NOM_110_14C',
                tipo: 'TERMINAL',
                severidad: 'CRITICO',
                mensaje: 'Violación de terminal',
                valor: { I_corregida: ctx.conductor.I_corregida, I_terminal: ctx.conductor.I_terminal }
            });
        }
        
        // 3. Capacidad interruptiva NOM 110.9
        if (ctx.proteccion.Icu < ctx.falla.Isc_3F) {
            ctx.errores.push({
                codigo: 'NOM_110_9',
                tipo: 'CAPACIDAD_INTERRUPTIVA',
                severidad: 'CRITICO',
                mensaje: 'Capacidad interruptiva insuficiente',
                valor: { Icu: ctx.proteccion.Icu, Isc: ctx.falla.Isc_3F }
            });
        }
        
        // 4. NOM 230.95 GFP (>= 1000A obligatorio)
        if (ctx.falla.Isc_3F >= 1 && !ctx.proteccion.tipo.includes('GFP')) {
            ctx.errores.push({
                codigo: 'NOM_230_95',
                tipo: 'GFP',
                severidad: 'CRITICO',
                mensaje: 'Sistema >= 1000A requiere GFP/LSIG obligatorio',
                valor: { Isc: ctx.falla.Isc_3F }
            });
        } else if (!ctx.proteccion.tipo.includes('GFP')) {
            ctx.warnings.push({
                codigo: 'NOM_230_95',
                tipo: 'GFP',
                mensaje: 'Se recomienda GFP/LSIG'
            });
        }
        
        // Actualizar estado global
        if (ctx.errores.length > 0) {
            ctx.resultados.estadoGlobal = 'FAIL';
            ctx.resultados.severidad = 5;
        }
        
        ctx.trazabilidad.push({
            step: 'verificarNormativa',
            status: ctx.errores.length === 0 ? 'OK' : 'FAIL',
            errores: ctx.errores.length,
            warnings: ctx.warnings.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Calcular caída de tensión
     * @param {Object} ctx - Contexto unificado
     */
    function calcularCaidaTension(ctx) {
        if (ctx.conductor.longitud <= 0) {
            return;
        }
        
        // Cálculo simplificado
        const R = 0.1; // Ω/km (aprox)
        const I = ctx.carga.I_carga;
        const L = ctx.conductor.longitud / 1000; // km
        const V = ctx.sistema.voltaje;
        
        const caida = (I * R * L) / V * 100;
        
        ctx.caida.porcentaje = caida;
        ctx.caida.valor = (I * R * L);
        
        if (caida > 3) {
            ctx.warnings.push({
                codigo: 'NOM_215_2',
                tipo: 'CAIDA_TENSION',
                mensaje: 'Caída de tensión > 3%',
                valor: { porcentaje: caida }
            });
        }
        
        ctx.trazabilidad.push({
            step: 'calcularCaidaTension',
            status: 'OK',
            resultado: ctx.caida,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Auto-corrección con control de loop (NO loop ciego)
     * @param {Object} ctx - Contexto unificado
     * @param {number} maxIntentos - Máximo de intentos (default: 5)
     */
    function autocorregir(ctx, maxIntentos = 5) {
        if (ctx.errores.length === 0) {
            return;
        }
        
        let intentos = 0;
        const erroresOriginales = JSON.parse(JSON.stringify(ctx.errores));
        
        while (ctx.errores.length > 0 && intentos < maxIntentos) {
            intentos++;
            
            // Corregir errores específicos
            for (const err of ctx.errores) {
                if (err.codigo === 'NOM_110_14C') {
                    // Violación de terminal: cambiar conductor (NO breaker)
                    ctx.conductor.calibre = subirCalibre(ctx.conductor.calibre);
                    // Recalcular ampacidad
                    calcularAmpacidad(ctx);
                } else if (err.codigo === 'NOM_110_9') {
                    // Capacidad interruptiva: subir breaker
                    ctx.proteccion.Icu += 10; // kA
                }
            }
            
            // Limpiar errores y revalidar
            ctx.errores = [];
            verificarNormativa(ctx);
            
            // Si no hay cambios, salir del loop
            if (ctx.errores.length === erroresOriginales.length) {
                break;
            }
        }
        
        ctx.trazabilidad.push({
            step: 'autocorregir',
            status: ctx.errores.length === 0 ? 'OK' : 'PARTIAL',
            intentos: intentos,
            erroresRestantes: ctx.errores.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Validación final
     * @param {Object} ctx - Contexto unificado
     */
    function validacionFinal(ctx) {
        ctx._calculado = true;
        
        ctx.trazabilidad.push({
            step: 'validacionFinal',
            status: ctx.resultados.estadoGlobal,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Subir calibre (helper para auto-corrección)
     * @param {string} calibre - Calibre actual
     * @returns {string} Siguiente calibre
     */
    function subirCalibre(calibre) {
        const calibres = ['1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
        const idx = calibres.indexOf(calibre);
        if (idx >= 0 && idx < calibres.length - 1) {
            return calibres[idx + 1];
        }
        return calibre;
    }
    
    /**
     * Motor Eléctrico Unificado (pipeline completo)
     * @param {Object} input - Datos de entrada
     * @param {Object} opciones - Opciones { autocorregir: true, maxIntentos: 5 }
     * @returns {Object} Contexto completo con resultados
     */
    function ejecutar(input, opciones = {}) {
        const ctx = crearContexto(input);
        
        try {
            // Pipeline secuencial
            preValidar(ctx);
            calcularAmpacidad(ctx);
            calcularCortoCircuito(ctx);
            seleccionarProteccion(ctx);
            verificarNormativa(ctx);
            calcularCaidaTension(ctx);
            
            // Auto-corrección (si está habilitada)
            if (opciones.autocorregir && ctx.errores.length > 0) {
                autocorregir(ctx, opciones.maxIntentos || 5);
            }
            
            validacionFinal(ctx);
            
        } catch (error) {
            ctx.errores.push({
                codigo: 'MOTOR_ERROR',
                tipo: 'SISTEMA',
                severidad: 'CRITICO',
                mensaje: 'Error en ejecución del motor: ' + error.message
            });
            ctx.resultados.estadoGlobal = 'FAIL';
        }
        
        return ctx;
    }
    
    /**
     * Solver con contrato de entrada/salida
     * @param {Object} ctx - Contexto unificado
     * @returns {Object} Resultado estructurado
     */
    function solver(ctx) {
        if (!ctx || !ctx._calculado) {
            throw new Error('Contexto no calculado. Ejecutar motor primero.');
        }
        
        return {
            ok: ctx.errores.length === 0,
            status: ctx.resultados.estadoGlobal === 'PASS' ? 'OK' : (ctx.resultados.estadoGlobal === 'FAIL' ? 'ERROR' : 'WARNING'),
            resultado: {
                sistema: ctx.sistema,
                carga: ctx.carga,
                conductor: ctx.conductor,
                proteccion: ctx.proteccion,
                falla: ctx.falla,
                caida: ctx.caida
            },
            errores: ctx.errores,
            warnings: ctx.warnings,
            trazabilidad: ctx.trazabilidad
        };
    }
    
    return {
        ejecutar,
        solver,
        crearContexto
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MotorElectricoUnificado = MotorElectricoUnificado;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotorElectricoUnificado;
}
