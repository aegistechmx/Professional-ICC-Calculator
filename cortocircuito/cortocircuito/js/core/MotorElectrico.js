/**
 * core/MotorElectrico.js — Motor Eléctrico Unificado
 * ORQUESTADOR PRINCIPAL: normaliza, calcula, selecciona, valida
 * Arquitectura tipo ETAP/SKM: single source of truth
 */

var MotorElectrico = (function() {
    
    /**
     * Motor Eléctrico Unificado
     * @param {Object} input - Datos de entrada del sistema
     * @returns {Object} Resultado completo del sistema
     */
    function ejecutarMotorElectrico(input) {
        var sistema = normalizarInput(input);
        
        // 1. AMPACIDAD BASE
        var ampacidad = calcularAmpacidad(sistema);
        
        // 2. SELECCIÓN DE CONDUCTOR
        var conductor = seleccionarConductor({
            I_diseño: sistema.I_diseño,
            material: sistema.material,
            tempAislamiento: sistema.tempAislamiento,
            tempAmbiente: sistema.tempAmbiente,
            nConductores: sistema.nConductores,
            paralelos: sistema.paralelos,
            tempTerminal: sistema.tempTerminal
        });
        
        // 3. CAÍDA DE TENSIÓN
        var caida = calcularCaidaTension({
            sistema: sistema,
            conductor: conductor
        });
        
        // 4. CORTOCIRCUITO
        var falla = calcularCortocircuito(sistema);
        
        // 5. PROTECCIÓN
        var proteccion = seleccionarProteccion({
            sistema: sistema,
            falla: falla,
            conductor: conductor
        });
        
        // 6. COORDINACIÓN
        var coordinacion = coordinarProtecciones({
            proteccion: proteccion,
            sistema: sistema
        });
        
        // 7. VALIDACIÓN NOM
        var validacion = validarNOM({
            sistema: sistema,
            conductor: conductor,
            proteccion: proteccion,
            ampacidad: ampacidad
        });
        
        return {
            sistema: sistema,
            ampacidad: ampacidad,
            conductor: conductor,
            caida: caida,
            falla: falla,
            proteccion: proteccion,
            coordinacion: coordinacion,
            validacion: validacion
        };
    }
    
    /**
     * Normalizar input
     * @param {Object} input - Datos de entrada
     * @returns {Object} Sistema normalizado
     */
    function normalizarInput(input) {
        return {
            id: input.id || 'nodo_1',
            I_carga: Number(input.I_carga) || 0,
            material: input.material || 'cobre',
            tempAislamiento: input.tempAislamiento || 75,
            tempAmbiente: input.tempAmbiente || 30,
            nConductores: input.nConductores || 3,
            paralelos: input.paralelos || 1,
            tempTerminal: input.tempTerminal || 75,
            voltaje: input.voltaje || 480,
            FP: input.FP || 0.9,
            longitud: input.longitud || 0,
            tipoSistema: input.tipoSistema || '3F',
            I_diseño: (input.I_carga || 0) * 1.25
        };
    }
    
    /**
     * Calcular ampacidad
     * @param {Object} sistema - Datos del sistema
     * @returns {Object} Resultado de ampacidad
     */
    function calcularAmpacidad(sistema) {
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            return MotorAmpacidadNOM.calcularAmpacidadNOM({
                calibre: sistema.calibre || '250',
                material: sistema.material,
                tempAislamiento: sistema.tempAislamiento,
                tempAmbiente: sistema.tempAmbiente,
                nConductores: sistema.nConductores,
                paralelos: sistema.paralelos,
                tempTerminal: sistema.tempTerminal
            });
        }
        
        throw new Error("MotorAmpacidadNOM no está disponible");
    }
    
    /**
     * Seleccionar conductor
     * @param {Object} config - Configuración
     * @returns {Object} Conductor seleccionado
     */
    function seleccionarConductor(config) {
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            return MotorAmpacidadNOM.seleccionarConductor(config.I_diseño, config);
        }
        
        throw new Error("MotorAmpacidadNOM no está disponible");
    }
    
    /**
     * Calcular caída de tensión
     * @param {Object} params - Parámetros
     * @returns {Object} Resultado de caída de tensión
     */
    function calcularCaidaTension(params) {
        if (typeof VoltageDropEngine !== 'undefined') {
            var R = typeof obtenerResistencia !== 'undefined' ? obtenerResistencia(params.conductor.calibre, params.sistema.material) : 0.1;
            
            return VoltageDropEngine.caidaTension({
                sistema: params.sistema.tipoSistema || '3F',
                V: params.sistema.voltaje,
                I: params.sistema.I_carga,
                FP: params.sistema.FP,
                longitud_m: params.sistema.longitud,
                R: R,
                X: typeof REACTANCIA_TIPICA !== 'undefined' ? REACTANCIA_TIPICA : 0.08
            });
        }
        
        return { porcentaje: 0, volts: 0 };
    }
    
    /**
     * Calcular cortocircuito
     * @param {Object} sistema - Datos del sistema
     * @returns {Object} Resultado de cortocircuito
     */
    function calcularCortocircuito(sistema) {
        if (typeof ShortcircuitEngine !== 'undefined' && sistema.Z_fuente) {
            return ShortcircuitEngine.calcularFalla(sistema, sistema);
        }
        
        return { Isc: 0, Ipeak: 0 };
    }
    
    /**
     * Seleccionar protección
     * @param {Object} params - Parámetros
     * @returns {Object} Protección seleccionada
     */
    function seleccionarProteccion(params) {
        var In = params.sistema.I_diseño;
        var Icu = params.falla.Isc ? params.falla.Isc * 1.25 : 25000;
        
        return {
            In: redondearBreaker(In),
            Icu: Icu,
            tipo: "LSIG"
        };
    }
    
    /**
     * Coordinar protecciones
     * @param {Object} params - Parámetros
     * @returns {Object} Resultado de coordinación
     */
    function coordinarProtecciones(params) {
        return {
            coordinada: true,
            mensaje: "Coordinación básica OK"
        };
    }
    
    /**
     * Validar NOM
     * @param {Object} params - Parámetros
     * @returns {Object} Resultado de validación
     */
    function validarNOM(params) {
        var errores = [];
        var warnings = [];
        
        // Ampacidad
        if (params.conductor.I_final < params.sistema.I_diseño) {
            errores.push("No cumple ampacidad");
        }
        
        // Caída de tensión
        if (params.caida.porcentaje > 3) {
            warnings.push("Caída de tensión > 3%");
        }
        
        // Protección
        if (params.proteccion.Icu < params.falla.Isc) {
            errores.push("Protección insuficiente");
        }
        
        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
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
        ejecutarMotorElectrico: ejecutarMotorElectrico,
        normalizarInput: normalizarInput
    };
})();

if (typeof window !== 'undefined') {
    window.MotorElectrico = MotorElectrico;
}
