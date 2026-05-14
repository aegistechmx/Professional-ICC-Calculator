/**
 * core/AutocorreccionETAP.js — Motor de autocorrección tipo ETAP/SKM
 * Sistema iterativo inteligente para corrección automática de sistemas eléctricos
 */

var AutocorreccionETAP = (function() {
    
    /**
     * Evaluar sistema completo y detectar errores
     * @param {Object} sistema - Sistema con nodos y resultados
     * @returns {Array} Lista de errores encontrados
     */
    function evaluarSistema(sistema) {
        var errores = [];
        
        sistema.nodos.forEach(function(nodo, i) {
            if (!nodo.calculos) return;
            
            var calc = nodo.calculos;
            
            // ERROR 1: AMPACIDAD INSUFICIENTE
            if (calc.I_final < calc.I_diseno) {
                errores.push({
                    tipo: "AMPACIDAD",
                    nodo: i,
                    data: {
                        I_final: calc.I_final,
                        I_diseno: calc.I_diseno,
                        deficit: calc.I_diseno - calc.I_final
                    }
                });
            }
            
            // ERROR 2: CAPACIDAD INTERRUPTIVA INSUFICIENTE
            if (calc.Isc && calc.Icu && calc.Icu < calc.Isc) {
                errores.push({
                    tipo: "CORTOCIRCUITO",
                    nodo: i,
                    data: {
                        Icu: calc.Icu,
                        Isc: calc.Isc,
                        deficit: calc.Isc - calc.Icu
                    }
                });
            }
            
            // ERROR 3: VIOLACIÓN DE TERMINAL
            if (calc.I_terminal && calc.I_final > calc.I_terminal) {
                errores.push({
                    tipo: "TERMINAL",
                    nodo: i,
                    data: {
                        I_final: calc.I_final,
                        I_terminal: calc.I_terminal,
                        exceso: calc.I_final - calc.I_terminal
                    }
                });
            }
            
            // ERROR 4: COORDINACIÓN
            // Requiere evaluación con upstream/downstream
            if (i > 0) {
                var upstream = sistema.nodos[i-1];
                if (upstream && upstream.calculos && nodo.calculos) {
                    if (upstream.calculos.I_terminal > nodo.calculos.I_final) {
                        errores.push({
                            tipo: "COORDINACION",
                            nodo: i,
                            data: {
                                upstream: i-1,
                                downstream: i,
                                I_terminal_upstream: upstream.calculos.I_terminal,
                                I_final_downstream: nodo.calculos.I_final
                            }
                        });
                    }
                }
            }
        });
        
        return errores;
    }
    
    /**
     * Aplicar corrección a un error específico
     * @param {Object} sistema - Sistema a modificar
     * @param {Object} error - Error a corregir
     * @returns {Object} Sistema modificado
     */
    function aplicarCorreccion(sistema, error) {
        var nodo = sistema.nodos[error.nodo];
        if (!nodo || !nodo.calculos) return sistema;
        
        switch (error.tipo) {
            case "AMPACIDAD":
                // Usar ConductorSelectorNOM para nuevo conductor
                if (typeof ConductorSelectorNOM !== 'undefined') {
                    var nuevoConductor = ConductorSelectorNOM.seleccionarConductor({
                        I_carga: nodo.calculos.I_carga || 0,
                        F_temp: nodo.calculos.F_temp || 1.0,
                        F_agrup: nodo.calculos.F_agrup || 1.0,
                        paralelo: 1 // Empezar con 1 paralelo
                    });
                    
                    if (nuevoConductor.ok) {
                        nodo.calibre = nuevoConductor.seleccionado.calibre;
                        nodo.calculos.I_final = nuevoConductor.seleccionado.I_terminal;
                        nodo.calculos.I_tabla = nuevoConductor.seleccionado.I_tabla;
                        console.log('[AutocorreccionETAP] Conductor actualizado: ' + nodo.calibre);
                    }
                }
                break;
                
            case "CORTOCIRCUITO":
                // Usar BreakerSelectorNOM para nuevo breaker
                if (typeof BreakerSelectorNOM !== 'undefined') {
                    var nuevoBreaker = BreakerSelectorNOM.seleccionarBreaker({
                        I_diseno: nodo.calculos.I_diseno || 0,
                        Isc: nodo.calculos.Isc || 0
                    });
                    
                    if (nuevoBreaker.ok) {
                        nodo.breaker = nuevoBreaker.breaker;
                        nodo.calculos.Icu = nuevoBreaker.breaker.In;
                        console.log('[AutocorreccionETAP] Breaker actualizado: ' + nuevoBreaker.breaker.In + ' kA');
                    }
                }
                break;
                
            case "TERMINAL":
                // Aumentar calibre para respetar límite terminal
                if (typeof ConductorSelectorNOM !== 'undefined') {
                    var nuevoConductor = ConductorSelectorNOM.seleccionarConductor({
                        I_carga: nodo.calculos.I_carga || 0,
                        F_temp: nodo.calculos.F_temp || 1.0,
                        F_agrup: nodo.calculos.F_agrup || 1.0,
                        paralelo: 1
                    });
                    
                    if (nuevoConductor.ok) {
                        nodo.calibre = nuevoConductor.seleccionado.calibre;
                        nodo.calculos.I_final = nuevoConductor.seleccionado.I_terminal;
                        nodo.calculos.I_tabla = nuevoConductor.seleccionado.I_tabla;
                        console.log('[AutocorreccionETAP] Terminal corregido: ' + nodo.calibre);
                    }
                }
                break;
                
            case "COORDINACION":
                // Ajustar curvas para coordinación
                if (upstream && upstream.breaker && nodo.breaker) {
                    // Lógica simple: ajustar curva del downstream
                    var curvaActual = nodo.breaker.curva || "normal";
                    var relacion = upstream.calculos.I_final / nodo.calculos.I_final;
                    
                    if (relacion < 2.0) {
                        nodo.breaker.curva = "limitador";
                        console.log('[AutocorreccionETAP] Coordinación ajustada: limitador');
                    }
                }
                break;
        }
        
        return sistema;
    }
    
    /**
     * Motor principal de autocorrección tipo ETAP
     * @param {Object} sistema - Sistema a corregir
     * @param {Object} opciones - Opciones de configuración
     * @returns {Object} Resultado de la autocorrección
     */
    function ejecutar(sistema, opciones) {
        opciones = opciones || {};
        var maxIteraciones = opciones.maxIteraciones || 10;
        var iter = 0;
        var cambios = [];
        var sistemaActual = JSON.parse(JSON.stringify(sistema)); // Copia profunda
        
        console.log('[AutocorreccionETAP] Iniciando autocorrección ETAP con ' + maxIteraciones + ' iteraciones máx');
        
        while (iter < maxIteraciones) {
            var errores = evaluarSistema(sistemaActual);
            
            if (errores.length === 0) {
                console.log('[AutocorreccionETAP] Sistema optimizado en ' + iter + ' iteraciones');
                break;
            }
            
            var cambiosIteracion = [];
            
            // Aplicar correcciones (prioridad: críticos primero)
            errores.forEach(function(error) {
                var sistemaAntes = JSON.parse(JSON.stringify(sistemaActual));
                sistemaActual = aplicarCorreccion(sistemaActual, error);
                
                // Verificar que realmente se corrigió
                var erroresDespues = evaluarSistema(sistemaActual);
                var mismoError = erroresDespues.some(function(e) {
                    return e.tipo === error.tipo && e.nodo === error.nodo;
                });
                
                if (!mismoError) {
                    cambiosIteracion.push(error.tipo + '(' + error.nodo + ')');
                    cambios.push(error.tipo + ' en nodo ' + error.nodo);
                }
            });
            
            if (cambiosIteracion.length > 0) {
                console.log('[AutocorreccionETAP] Iteración ' + (iter + 1) + ': ' + cambiosIteracion.join(', '));
            }
            
            iter++;
        }
        
        var erroresFinales = evaluarSistema(sistemaActual);
        
        return {
            sistema: sistemaActual,
            cambios: cambios,
            iteraciones: iter,
            erroresRestantes: erroresFinales.length,
            estado: erroresFinales.length === 0 ? 'OPTIMIZADO' : 'PARCIAL',
            confianza: Math.max(0, 100 - (erroresFinales.length * 10))
        };
    }
    
    return {
        ejecutar: ejecutar,
        evaluarSistema: evaluarSistema,
        aplicarCorreccion: aplicarCorreccion
    };
})();

if (typeof window !== 'undefined') {
    window.AutocorreccionETAP = AutocorreccionETAP;
}
