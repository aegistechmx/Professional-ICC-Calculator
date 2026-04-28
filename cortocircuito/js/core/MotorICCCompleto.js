/**
 * core/MotorICCCompleto.js — Motor ICC completo tipo ETAP/SKM
 * Sistema unificado de cálculo, autocorrección y optimización
 */

var MotorICCCompleto = (function() {
    
    /**
     * Construir sistema completo desde graph
     * @param {Object} graph - Grafo con nodos y edges
     * @returns {Object} Sistema estructurado
     */
    function construirSistema(graph) {
        var sistema = {
            nodos: graph.nodes || [],
            edges: graph.edges || [],
            configuracion: graph.configuracion || {},
            timestamp: new Date().toISOString()
        };
        
        // Detectar ramas
        if (typeof RamasDetector !== 'undefined') {
            var estructuraRamas = RamasDetector.construirRamas(sistema.nodos, sistema.edges);
            sistema.ramas = estructuraRamas.ramas;
            sistema.nodosPorRama = estructuraRamas.nodosPorRama;
            
            console.log('[MotorICCCompleto] Ramas detectadas:', Object.keys(sistema.ramas).length);
        }
        
        return sistema;
    }
    
    /**
     * Calcular todo el sistema
     * @param {Object} sistema - Sistema a calcular
     * @returns {Object} Sistema con cálculos
     */
    function calcularTodo(sistema) {
        console.log('[MotorICCCompleto] Iniciando cálculo completo...');
        
        sistema.nodos.forEach(function(nodo, i) {
            // Usar MotorAmpacidadNOM para cálculo de ampacidad
            if (typeof MotorAmpacidadNOM !== 'undefined' && nodo.feeder) {
                try {
                    var resultadoAmpacidad = MotorAmpacidadNOM.calcularAmpacidadNOM({
                        calibre: nodo.feeder.calibre || '4/0',
                        material: nodo.material || 'cobre',
                        tempAislamiento: 75,
                        tempAmbiente: nodo.feeder.tempAmbiente || 30,
                        nConductores: nodo.feeder.numConductores || 3,
                        paralelos: nodo.feeder.paralelo || 1,
                        tempTerminal: 75
                    });
                    
                    // Agregar cálculos al nodo
                    nodo.calculos = {
                        I_carga: nodo.feeder.cargaA || 0,
                        I_diseno: (nodo.feeder.cargaA || 0) * 1.25,
                        I_tabla: resultadoAmpacidad.I_tabla,
                        I_corregida: resultadoAmpacidad.I_corregida,
                        I_terminal: resultadoAmpacidad.I_terminal,
                        I_final: resultadoAmpacidad.I_final,
                        F_temp: resultadoAmpacidad.F_temp,
                        F_agrup: resultadoAmpacidad.F_agrup,
                        Isc: nodo.isc || 0,
                        Icu: (nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0
                    };
                    
                    console.log('[MotorICCCompleto] Nodo ' + nodo.id + ' calculado:', {
                        I_final: resultadoAmpacidad.I_final,
                        Icu: nodo.calculos.Icu,
                        Isc: nodo.calculos.Isc
                    });
                    
                } catch (error) {
                    console.error('[MotorICCCompleto] Error calculando nodo ' + nodo.id + ':', error);
                    nodo.calculos = { error: error.message };
                }
            }
        });
        
        return sistema;
    }
    
    /**
     * Evaluar sistema completo
     * @param {Object} sistema - Sistema a evaluar
     * @returns {Object} Resultado de evaluación
     */
    function evaluarSistema(sistema) {
        if (typeof AutocorreccionETAP !== 'undefined') {
            return AutocorreccionETAP.evaluarSistema(sistema);
        }
        
        // Fallback simple
        var errores = [];
        sistema.nodos.forEach(function(nodo, i) {
            if (!nodo.calculos) return;
            
            if (nodo.calculos.I_final < nodo.calculos.I_diseno) {
                errores.push({
                    tipo: "AMPACIDAD",
                    nodo: i,
                    data: nodo.calculos
                });
            }
        });
        
        return errores;
    }
    
    /**
     * Autocorregir sistema completo
     * @param {Object} sistema - Sistema a corregir
     * @param {Object} opciones - Opciones de autocorrección
     * @returns {Object} Sistema corregido
     */
    function autocorregirSistema(sistema, opciones) {
        if (typeof AutocorreccionETAP !== 'undefined') {
            return AutocorreccionETAP.ejecutar(sistema, opciones);
        }
        
        // Fallback simple
        return {
            sistema: sistema,
            cambios: [],
            iteraciones: 0,
            estado: 'SIN_AUTOCORRECCION'
        };
    }
    
    /**
     * Motor principal ICC completo tipo ETAP/SKM
     * @param {Object} graph - Grafo del sistema eléctrico
     * @param {Object} opciones - Opciones de cálculo
     * @returns {Object} Resultado completo
     */
    function motorICCCompleto(graph, opciones) {
        opciones = opciones || {};
        
        console.log('[MotorICCCompleto] Iniciando motor ICC completo tipo ETAP/SKM');
        
        // 1. Construir sistema
        var sistema = construirSistema(graph);
        
        // 2. Calcular todo
        sistema.calculos = calcularTodo(sistema);
        
        // 3. Evaluar sistema
        sistema.validacion = evaluarSistema(sistema);
        
        // 4. Autocorregir si se solicita
        var resultadoFinal;
        if (opciones.autocorregir !== false) {
            resultadoFinal = autocorregirSistema(sistema, {
                maxIteraciones: opciones.maxIteraciones || 10
            });
        } else {
            resultadoFinal = {
                sistema: sistema,
                cambios: [],
                iteraciones: 0,
                estado: 'SIN_AUTOCORRECCION'
            };
        }
        
        // 5. Validación final
        resultadoFinal.validacionFinal = evaluarSistema(resultadoFinal.sistema);
        
        // 6. Generar reporte
        if (opciones.reporte) {
            resultadoFinal.reporte = generarReporte(resultadoFinal);
        }
        
        console.log('[MotorICCCompleto] Motor completado:', {
            estado: resultadoFinal.estado,
            cambios: resultadoFinal.cambios.length,
            iteraciones: resultadoFinal.iteraciones,
            erroresRestantes: resultadoFinal.validacionFinal.length
        });
        
        return resultadoFinal;
    }
    
    /**
     * Generar reporte completo
     * @param {Object} resultado - Resultado del motor
     * @returns {string} Reporte en formato texto
     */
    function generarReporte(resultado) {
        var reporte = '=== REPORTE MOTOR ICC COMPLETO ===\n\n';
        reporte += 'Estado: ' + resultado.estado + '\n';
        reporte += 'Iteraciones: ' + resultado.iteraciones + '\n';
        reporte += 'Cambios aplicados: ' + resultado.cambios.length + '\n';
        reporte += 'Errores restantes: ' + resultado.validacionFinal.length + '\n\n';
        
        if (resultado.cambios.length > 0) {
            reporte += 'CAMBIOS APLICADOS:\n';
            resultado.cambios.forEach(function(cambio, i) {
                reporte += (i + 1) + '. ' + cambio + '\n';
            });
            reporte += '\n';
        }
        
        if (resultado.validacionFinal.length > 0) {
            reporte += 'ERRORES RESTANTES:\n';
            resultado.validacionFinal.forEach(function(error, i) {
                reporte += (i + 1) + '. ' + error.tipo + ' en nodo ' + error.nodo + '\n';
            });
        }
        
        return reporte;
    }
    
    return {
        motorICCCompleto: motorICCCompleto,
        construirSistema: construirSistema,
        calcularTodo: calcularTodo,
        evaluarSistema: evaluarSistema,
        autocorregirSistema: autocorregirSistema,
        generarReporte: generarReporte
    };
})();

if (typeof window !== 'undefined') {
    window.MotorICCCompleto = MotorICCCompleto;
}
