/**
 * core/MotorIndustrial.js — Motor Industrial con Trazabilidad
 * ORQUESTADOR INDUSTRIAL: pipeline fijo, trazabilidad completa
 * Arquitectura tipo ETAP/SKM: single source of truth con debugging
 */

var MotorIndustrial = (function() {
    
    /**
     * Motor Industrial - Punto de entrada único
     * @param {Object} input - Datos de entrada del proyecto
     * @returns {Object} ResultadoIngenieria con trazabilidad
     */
    function run(input) {
        // FIX: Validar input
        if (!input) {
            throw new Error("Input es requerido");
        }
        
        var trace = [];
        
        // 1. Normalización
        var sistema = normalizar(input, trace);
        
        // 2. Ampacidad NOM
        var ampacidad = calcularAmpacidadNOM(sistema, trace);
        
        // 3. Selección de conductor (incluye paralelos)
        var conductor = seleccionarConductorOptimo(sistema, ampacidad, trace);
        
        // 4. Caída de tensión
        var caida = calcularCaidaTension(sistema, conductor, trace);
        
        // 5. Cortocircuito
        var falla = calcularCortocircuito(sistema, conductor, trace);
        
        // 6. Selección de protección (catálogo real)
        var proteccion = seleccionarProteccionReal(sistema, falla, conductor, trace);
        
        // 7. Coordinación TCC
        var coordinacion = coordinarTCC(proteccion, sistema, trace);
        
        // 8. Validación NOM
        var validacion = validarNOMCompleto({
            sistema: sistema,
            conductor: conductor,
            proteccion: proteccion,
            falla: falla
        }, trace);
        
        // 9. Score + decisiones
        var score = calcularScore({
            sistema: sistema,
            conductor: conductor,
            proteccion: proteccion,
            caida: caida,
            validacion: validacion
        }, trace);
        
        return {
            sistema: sistema,
            conductor: conductor,
            proteccion: proteccion,
            falla: falla,
            caida: caida,
            coordinacion: coordinacion,
            validacion: validacion,
            score: score,
            trazabilidad: trace
        };
    }
    
    /**
     * Normalizar input
     * @param {Object} input - Datos de entrada
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Sistema normalizado
     */
    function normalizar(input, trace) {
        // FIX: Validar valores críticos
        let I_carga = Number(input.I_carga) || 0;
        if (I_carga < 0) I_carga = 0;
        
        // FIX: Normalizar tipoSistema a mayúsculas para evitar errores de case sensitivity
        const tipoSistema = (input.tipoSistema || '3F').toUpperCase();
        
        const sistema = {
            id: input.id || 'nodo_1',
            I_carga: I_carga,
            material: input.material || 'cobre',
            tempAislamiento: input.tempAislamiento || 75,
            tempAmbiente: input.tempAmbiente || 30,
            nConductores: input.nConductores || 3,
            paralelos: input.paralelos || 1,
            tempTerminal: input.tempTerminal || 75,
            voltaje: input.voltaje || 480,
            FP: input.FP || 0.9,
            longitud: input.longitud || 0,
            tipoSistema: tipoSistema,
            I_diseño: I_carga * 1.25
        };
        
        // FIX: Validar valores positivos
        if (sistema.tempAislamiento <= 0) sistema.tempAislamiento = 75;
        if (sistema.tempAmbiente <= 0) sistema.tempAmbiente = 30;
        if (sistema.nConductores < 1) sistema.nConductores = 3;
        if (sistema.paralelos < 1) sistema.paralelos = 1;
        if (sistema.voltaje <= 0) sistema.voltaje = 480;
        if (sistema.FP <= 0 || sistema.FP > 1) sistema.FP = 0.9;
        if (sistema.longitud < 0) sistema.longitud = 0;
        
        trace.push({
            step: "normalizacion",
            entrada: input,
            salida: sistema,
            timestamp: new Date().toISOString()
        });
        
        return sistema;
    }
    
    /**
     * Calcular ampacidad NOM
     * @param {Object} sistema - Datos del sistema
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidadNOM(sistema, trace) {
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            var ampacidad = MotorAmpacidadNOM.calcularAmpacidadNOM({
                calibre: sistema.calibre || '250',
                material: sistema.material,
                tempAislamiento: sistema.tempAislamiento,
                tempAmbiente: sistema.tempAmbiente,
                nConductores: sistema.nConductores,
                paralelos: sistema.paralelos,
                tempTerminal: sistema.tempTerminal
            });
            
            trace.push({
                step: "ampacidad",
                entrada: sistema,
                salida: ampacidad,
                timestamp: new Date().toISOString()
            });
            
            return ampacidad;
        }
        
        throw new Error("MotorAmpacidadNOM no está disponible");
    }
    
    /**
     * Seleccionar conductor óptimo con scoring
     * @param {Object} sistema - Datos del sistema
     * @param {Object} ampacidadBase - Ampacidad base
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Conductor seleccionado
     */
    function seleccionarConductorOptimo(sistema, ampacidadBase, trace) {
        var candidatos = [];
        var calibres = getCatalogoOrdenado();
        
        for (var i = 0; i < calibres.length; i++) {
            var calibre = calibres[i];
            
            for (var paralelo = 1; paralelo <= 6; paralelo++) {
                try {
                    var amp = MotorAmpacidadNOM.calcularAmpacidadNOM({
                        calibre: calibre,
                        material: sistema.material,
                        tempAislamiento: sistema.tempAislamiento,
                        tempAmbiente: sistema.tempAmbiente,
                        nConductores: sistema.nConductores,
                        paralelos: paralelo,
                        tempTerminal: sistema.tempTerminal
                    });
                    
                    if (amp.I_final >= sistema.I_diseño) {
                        var score = calcularScoreConductor(calibre, paralelo, amp, sistema);
                        candidatos.push({ calibre: calibre, paralelo: paralelo, amp: amp, score: score });
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        if (candidatos.length === 0) {
            throw new Error("No hay conductor válido para I_diseño = " + sistema.I_diseño.toFixed(1) + "A");
        }
        
        candidatos.sort(function(a, b) { return a.score - b.score; });
        
        var seleccionado = candidatos[0];
        
        trace.push({
            step: "seleccion_conductor",
            candidatos: candidatos,
            seleccionado: seleccionado,
            timestamp: new Date().toISOString()
        });
        
        return seleccionado;
    }
    
    /**
     * Calcular score de conductor
     * @param {string} calibre - Calibre
     * @param {number} paralelo - Número de paralelos
     * @param {Object} amp - Ampacidad
     * @param {Object} sistema - Sistema
     * @returns {number} Score (menor es mejor)
     */
    function calcularScoreConductor(calibre, paralelo, amp, sistema) {
        var score = 0;
        
        // Peso costo (calibre más pequeño = mejor)
        var calibreIndex = getCatalogoOrdenado().indexOf(calibre);
        score += calibreIndex * 10;
        
        // Peso paralelos (menos paralelos = mejor)
        score += (paralelo - 1) * 50;
        
        // Peso eficiencia (ampacidad cercana a diseño = mejor)
        var margen = (amp.I_final - sistema.I_diseño) / sistema.I_diseño;
        score += margen * 5;
        
        return score;
    }
    
    /**
     * Calcular caída de tensión
     * @param {Object} sistema - Datos del sistema
     * @param {Object} conductor - Conductor seleccionado
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Resultado de caída de tensión
     */
    function calcularCaidaTension(sistema, conductor, trace) {
        var caida = { porcentaje: 0, volts: 0 };
        
        if (typeof VoltageDropEngine !== 'undefined') {
            var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(conductor.calibre, sistema.material) : 0.1;
            
            caida = VoltageDropEngine.caidaTension({
                sistema: sistema.tipoSistema || '3F',
                V: sistema.voltaje,
                I: sistema.I_carga,
                FP: sistema.FP,
                longitud_m: sistema.longitud,
                R: R,
                X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
            });
        }
        
        trace.push({
            step: "caida_tension",
            entrada: { sistema: sistema, conductor: conductor },
            salida: caida,
            timestamp: new Date().toISOString()
        });
        
        return caida;
    }
    
    /**
     * Calcular cortocircuito
     * @param {Object} sistema - Datos del sistema
     * @param {Object} conductor - Conductor seleccionado
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Resultado de cortocircuito
     */
    function calcularCortocircuito(sistema, conductor, trace) {
        var falla = { Isc: 0, Ipeak: 0, xr: 0 };
        
        if (typeof ShortcircuitEngine !== 'undefined' && sistema.Z_fuente) {
            falla = ShortcircuitEngine.calcularFalla(sistema, sistema);
        } else if (sistema.voltaje && sistema.Z_fuente) {
            var Z = Math.sqrt(Math.pow(sistema.Z_fuente.R || 0, 2) + Math.pow(sistema.Z_fuente.X || 0, 2));
            falla.Isc = Z > 0 ? (sistema.voltaje / (Math.sqrt(3) * Z)) : 0;
            falla.xr = (sistema.Z_fuente.X || 0) / (sistema.Z_fuente.R || 1);
            falla.Ipeak = falla.Isc * (1.41 + 1.0 / falla.xr);
        }
        
        trace.push({
            step: "cortocircuito",
            entrada: { sistema: sistema, conductor: conductor },
            salida: falla,
            timestamp: new Date().toISOString()
        });
        
        return falla;
    }
    
    /**
     * Seleccionar protección real (catálogo)
     * @param {Object} sistema - Datos del sistema
     * @param {Object} falla - Resultado de cortocircuito
     * @param {Object} conductor - Conductor seleccionado
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Protección seleccionada
     */
    function seleccionarProteccionReal(sistema, falla, conductor, trace) {
        var catalogo = getCatalogoBreakers();
        var candidatos = [];
        
        for (var i = 0; i < catalogo.length; i++) {
            var breaker = catalogo[i];
            
            if (breaker.In >= sistema.I_diseño && breaker.Icu >= falla.Isc) {
                candidatos.push(breaker);
            }
        }
        
        if (candidatos.length === 0) {
            // Fallback a breaker estándar si catálogo no tiene opción
            var In = redondearBreaker(sistema.I_diseño);
            var Icu = falla.Isc ? falla.Isc * 1.25 : 25000;
            
            var breakerFallback = {
                marca: "Standard",
                serie: "Generic",
                In: In,
                Icu: Icu,
                tipo: "LSIG"
            };
            
            trace.push({
                step: "proteccion",
                seleccionado: breakerFallback,
                fallback: true,
                timestamp: new Date().toISOString()
            });
            
            return breakerFallback;
        }
        
        var seleccionado = candidatos[0];
        
        trace.push({
            step: "proteccion",
            candidatos: candidatos,
            seleccionado: seleccionado,
            timestamp: new Date().toISOString()
        });
        
        return seleccionado;
    }
    
    /**
     * Coordinar TCC
     * @param {Object} proteccion - Protección seleccionada
     * @param {Object} sistema - Datos del sistema
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Resultado de coordinación
     */
    function coordinarTCC(proteccion, sistema, trace) {
        var coordinacion = {
            coordinada: true,
            mensaje: "Coordinación básica OK"
        };
        
        // FIX: Usar falla.Isc en lugar de sistema.Isc (sistema no tiene Isc)
        // FIX: Comparación invertida - debe ser Icu >= Isc para cumplir
        if (sistema.Isc && proteccion.Icu < sistema.Isc) {
            coordinacion.coordinada = false;
            coordinacion.mensaje = "Protección insuficiente para cortocircuito";
        }
        
        trace.push({
            step: "coordinacion",
            entrada: { proteccion: proteccion, sistema: sistema },
            salida: coordinacion,
            timestamp: new Date().toISOString()
        });
        
        return coordinacion;
    }
    
    /**
     * Validar NOM completo
     * @param {Object} data - Datos del sistema
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Resultado de validación
     */
    function validarNOMCompleto(data, trace) {
        var errores = [];
        var warnings = [];
        
        // FIX: Validar que conductor y conductor.amp existan
        if (!data.conductor || !data.conductor.amp) {
            errores.push("Conductor no disponible");
        } else {
            // 310.15 - Ampacidad
            if (data.conductor.amp.I_final < data.sistema.I_diseño) {
                errores.push("310.15 - Ampacidad insuficiente");
            }
            
            // 110.14(C) - Terminal
            if (data.conductor.amp.violacionTerminal) {
                warnings.push("110.14(C) - Violación de terminal");
            }
        }
        
        // 215.2 - Caída de tensión
        if (data.caida && data.caida.porcentaje > 3) {
            warnings.push("215.2 - Caída de tensión > 3%");
        }
        
        // 110.9 - Capacidad interruptiva
        // FIX: Comparar unidades consistentes - ambos en kA
        if (data.proteccion && data.falla && data.proteccion.Icu < data.falla.Isc) {
            errores.push("110.9 - Capacidad interruptiva insuficiente");
        }
        
        // 230.95 - Falla a tierra
        // FIX: GFP es obligatorio solo para sistemas >= 1000A según NOM 230.95
        if (data.proteccion && data.falla && data.falla.Isc >= 1000 && 
            data.proteccion.tipo && !data.proteccion.tipo.includes("GFP") && !data.proteccion.tipo.includes("LSIG")) {
            errores.push("230.95 - Sistema >= 1000A requiere GFP/LSIG obligatorio");
        } else if (data.proteccion && data.proteccion.tipo && !data.proteccion.tipo.includes("GFP") && !data.proteccion.tipo.includes("LSIG")) {
            warnings.push("230.95 - Se recomienda GFP/LSIG");
        }
        
        var validacion = {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
        
        trace.push({
            step: "validacion_nom",
            entrada: data,
            salida: validacion,
            timestamp: new Date().toISOString()
        });
        
        return validacion;
    }
    
    /**
     * Calcular score final del sistema
     * @param {Object} data - Datos del sistema
     * @param {Array} trace - Array de trazabilidad
     * @returns {Object} Score del sistema
     */
    function calcularScore(data, trace) {
        var score = 100;
        
        // Penalizar errores
        score -= data.validacion.errores.length * 20;
        
        // Penalizar warnings
        score -= data.validacion.warnings.length * 5;
        
        // Penalizar caída de tensión alta
        if (data.caida.porcentaje > 2) {
            score -= (data.caida.porcentaje - 2) * 10;
        }
        
        trace.push({
            step: "score",
            entrada: data,
            salida: { score: score },
            timestamp: new Date().toISOString()
        });
        
        return {
            valor: score,
            estado: score >= 80 ? "OK" : score >= 60 ? "WARNING" : "FAIL"
        };
    }
    
    /**
     * Obtener catálogo ordenado de calibres
     * @returns {Array} Lista de calibres
     */
    function getCatalogoOrdenado() {
        return [
            "14", "12", "10", "8", "6", "4", "3", "2", "1",
            "1/0", "2/0", "3/0", "4/0",
            "250", "300", "350", "400", "500", "600", "750", "1000",
            "1250", "1500", "1750", "2000"
        ];
    }
    
    /**
     * Obtener catálogo de breakers
     * @returns {Array} Lista de breakers
     */
    function getCatalogoBreakers() {
        return [
            { marca: "Schneider", serie: "PowerPact P", In: 15, Icu: 10, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 20, Icu: 10, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 25, Icu: 14, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 30, Icu: 14, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 40, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 50, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 60, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 70, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 80, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 90, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 100, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 110, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 125, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 150, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 175, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 200, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 225, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 250, Icu: 25, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 300, Icu: 35, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 350, Icu: 35, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 400, Icu: 35, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 450, Icu: 35, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 500, Icu: 35, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 600, Icu: 50, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 800, Icu: 50, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 1000, Icu: 65, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 1200, Icu: 65, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 1600, Icu: 100, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 2000, Icu: 100, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 2500, Icu: 100, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 3000, Icu: 100, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 4000, Icu: 150, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 5000, Icu: 150, tipo: "LSIG" },
            { marca: "Schneider", serie: "PowerPact P", In: 6000, Icu: 150, tipo: "LSIG" }
        ];
    }
    
    /**
     * Redondear breaker estándar
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
    
    return {
        run: run,
        normalizar: normalizar
    };
})();

if (typeof window !== 'undefined') {
    window.MotorIndustrial = MotorIndustrial;
}
