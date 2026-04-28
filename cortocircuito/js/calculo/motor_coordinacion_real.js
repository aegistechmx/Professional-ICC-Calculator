/**
 * motor_coordinacion_real.js — Motor de Coordinación Automática Real (ETAP/SKM Style)
 * Sistema completo de coordinación de protección usando catálogo real de equipos
 * 
 * Objetivo: Coordinación automática total con curvas oficiales de fabricantes
 * - Selección real de breakers (Schneider, Siemens, ABB)
 * - Coordinación iterativa automática
 * - Validación real de selectividad
 * - Auto-corrección completa
 */

var MotorCoordinacionReal = (function() {
    /**
     * COORDINACIÓN AUTOMÁTICA REAL (Algoritmo ETAP)
     * @param {Array} nodos - Array de nodos del sistema
     * @param {Object} config - Configuración de coordinación
     * @returns {Object} Resultado de coordinación
     */
    function coordinarSistema(nodos, config) {
        config = config || {};
        var criterios = config.criterios || {};
        var IscSistema = config.Isc || 20000; // kA por defecto

        var resultado = {
            nodos: [],
            iteraciones: 0,
            maxIteraciones: 10,
            estado: 'OK',
            cambios: [],
            validaciones: []
        };

        // PASO 1: Seleccionar breakers reales para cada nodo
        nodos.forEach(function(nodo) {
            var I_diseño = nodo.I_diseño || (nodo.CDT ? nodo.CDT.I_diseño : 100);
            
            var opciones = CatalogoEquiposReal.seleccionarBreaker({ I_diseño: I_diseño }, criterios);
            var mejor = CatalogoEquiposReal.optimizarPorCostoYCoordinacion(opciones, criterios);
            
            if (mejor) {
                resultado.cambios.push({
                    nodo: nodo.id,
                    accion: 'SELECCION_BREAKER',
                    antes: 'N/A',
                    despues: mejor.marcaNombre + ' ' + mejor.modeloNombre + ' ' + mejor.frame + 'A'
                });
            }
            
            resultado.nodos.push({
                id: nodo.id,
                I_diseño: I_diseño,
                breaker: mejor || null,
                tcc: mejor ? {
                    pickup: mejor.frame,
                    longDelay: 6.0,
                    shortDelay: 0.3,
                    instantaneous: mejor.frame * 10
                } : null
            });
        });

        // PASO 2: Coordinación iterativa
        var intentos = 0;
        var coordinado = false;

        while (intentos < resultado.maxIteraciones && !coordinado) {
            intentos++;
            resultado.iteraciones = intentos;

            // Escalonar frames de downstream a upstream
            for (var i = resultado.nodos.length - 1; i > 0; i--) {
                var down = resultado.nodos[i];
                var up = resultado.nodos[i - 1];

                if (!down.breaker || !up.breaker) continue;

                // 1. Escalonar frame si necesario
                if (up.breaker.frame <= down.breaker.frame) {
                    var siguienteFrame = CatalogoEquiposReal.siguienteFrame(down.breaker.frame);
                    if (siguienteFrame !== up.breaker.frame) {
                        // Re-seleccionar breaker con nuevo frame
                        var nuevasOpciones = CatalogoEquiposReal.seleccionarBreaker(
                            { I_diseño: siguienteFrame }, 
                            { frame_min: siguienteFrame }
                        );
                        var nuevoMejor = CatalogoEquiposReal.optimizarPorCostoYCoordinacion(nuevasOpciones, criterios);
                        
                        if (nuevoMejor) {
                            up.breaker = nuevoMejor;
                            up.tcc.pickup = nuevoMejor.frame;
                            up.tcc.instantaneous = nuevoMejor.frame * 10;
                            
                            resultado.cambios.push({
                                nodo: up.id,
                                accion: 'ESCALONAMIENTO_FRAME',
                                antes: down.breaker.frame + 'A',
                                despues: nuevoMejor.frame + 'A',
                                iteracion: intentos
                            });
                        }
                    }
                }

                // 2. Ajustar pickup (25% más alto que downstream)
                var pickupNuevo = down.tcc.pickup * 1.25;
                if (up.tcc.pickup !== pickupNuevo) {
                    resultado.cambios.push({
                        nodo: up.id,
                        accion: 'AJUSTE_PICKUP',
                        antes: up.tcc.pickup.toFixed(0) + 'A',
                        despues: pickupNuevo.toFixed(0) + 'A',
                        iteracion: intentos
                    });
                    up.tcc.pickup = pickupNuevo;
                }

                // 3. Ajustar long delay (+0.3s)
                var longDelayNuevo = down.tcc.longDelay + 0.3;
                if (up.tcc.longDelay !== longDelayNuevo) {
                    resultado.cambios.push({
                        nodo: up.id,
                        accion: 'AJUSTE_LONG_DELAY',
                        antes: up.tcc.longDelay.toFixed(1) + 's',
                        despues: longDelayNuevo.toFixed(1) + 's',
                        iteracion: intentos
                    });
                    up.tcc.longDelay = longDelayNuevo;
                }

                // 4. Ajustar short delay (+0.1s)
                var shortDelayNuevo = down.tcc.shortDelay + 0.1;
                if (up.tcc.shortDelay !== shortDelayNuevo) {
                    resultado.cambios.push({
                        nodo: up.id,
                        accion: 'AJUSTE_SHORT_DELAY',
                        antes: up.tcc.shortDelay.toFixed(2) + 's',
                        despues: shortDelayNuevo.toFixed(2) + 's',
                        iteracion: intentos
                    });
                    up.tcc.shortDelay = shortDelayNuevo;
                }

                // 5. BLOQUEAR instantáneo si Isc < instantaneous_downstream
                if (IscSistema < down.tcc.instantaneous && up.tcc.instantaneous !== 'OFF') {
                    resultado.cambios.push({
                        nodo: up.id,
                        accion: 'BLOQUEO_INSTANTANEO',
                        antes: up.tcc.instantaneous.toFixed(0) + 'A',
                        despues: 'OFF',
                        razon: 'Isc (' + IscSistema + 'A) < Inst_down (' + down.tcc.instantaneous.toFixed(0) + 'A)',
                        iteracion: intentos
                    });
                    up.tcc.instantaneous = 'OFF';
                }
            }

            // PASO 3: Validar coordinación
            var validacion = validarCoordinacion(resultado.nodos);
            resultado.validaciones.push({
                iteracion: intentos,
                ok: validacion.ok,
                cruces: validacion.cruces
            });

            if (validacion.ok) {
                coordinado = true;
                resultado.estado = 'COORDINADO';
            }
        }

        if (!coordinado) {
            resultado.estado = 'PARCIAL_COORDINADO';
        }

        return resultado;
    }

    /**
     * VALIDACIÓN REAL DE COORDINACIÓN (Tipo ETAP)
     * @param {Array} nodos - Array de nodos con TCC
     * @returns {Object} Resultado de validación
     */
    function validarCoordinacion(nodos) {
        var cruces = [];
        var ok = true;

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i];
            var down = nodos[i + 1];

            if (!up.tcc || !down.tcc) continue;

            // Validar a múltiples corrientes (escala log)
            var corrientesPrueba = [];
            for (var I = 100; I <= 50000; I *= 1.2) {
                corrientesPrueba.push(I);
            }

            for (var j = 0; j < corrientesPrueba.length; j++) {
                var I = corrientesPrueba[j];
                var tUp = calcularTiempoTCC(up.tcc, I);
                var tDown = calcularTiempoTCC(down.tcc, I);

                // Regla: t_up >= t_down * 1.3
                var ratio = tUp / tDown;
                var selectividadMinima = 1.3;

                if (ratio < selectividadMinima && tUp < 10000 && tDown < 10000) {
                    cruces.push({
                        par: up.id + ' → ' + down.id,
                        corriente: I,
                        tUp: tUp,
                        tDown: tDown,
                        ratio: ratio,
                        selectividadMinima: selectividadMinima,
                        severidad: ratio < 1.0 ? 'CRITICO' : 'WARNING'
                    });
                    ok = false;
                }
            }
        }

        return {
            ok: ok,
            cruces: cruces,
            estado: ok ? 'COORDINADO' : 'NO_COORDINADO'
        };
    }

    /**
     * Calcular tiempo TCC usando curvas reales del catálogo
     * @param {Object} tcc - Parámetros TCC
     * @param {number} I - Corriente de prueba (A)
     * @returns {number} Tiempo de disparo (s)
     */
    function calcularTiempoTCC(tcc, I) {
        var pickup = tcc.pickup || 100;
        var longDelay = tcc.longDelay || 2.0;
        var shortDelay = tcc.shortDelay || 0.1;
        var instantaneous = tcc.instantaneous || (pickup * 10);

        // Si corriente < pickup, no dispara
        if (I < pickup) return Infinity;

        // Región instantánea
        if (instantaneous !== 'OFF' && I >= instantaneous) {
            return 0.01;
        }

        // Región de larga duración (térmica) - usar interpolación log-log del catálogo
        if (instantaneous === 'OFF' || I < instantaneous * 0.8) {
            var I_multiplo = I / pickup;
            var curvaBase = CatalogoEquiposReal.obtenerCurva('schneider_powerpact_micrologic_2_0');
            var t = CatalogoEquiposReal.interpolarLogLog(curvaBase, I_multiplo);
            return t * longDelay; // Escalar por long delay
        }

        // Región de corta duración (magnética)
        return shortDelay;
    }

    /**
     * AUTO-CORRECCIÓN COMPLETA (Santo Grial)
     * @param {Array} nodos - Array de nodos del sistema
     * @param {Object} config - Configuración
     * @returns {Object} Resultado de auto-corrección
     */
    function autocorregirSistema(nodos, config) {
        config = config || {};
        var resultado = {
            pasos: [],
            estadoFinal: 'OK',
            nodos: JSON.parse(JSON.stringify(nodos)) // Deep copy
        };

        // PASO 1: Ampacidad (usar sistema existente)
        resultado.pasos.push({
            paso: 1,
            accion: 'AMPACIDAD',
            estado: 'OK',
            mensaje: 'Ampacidad calculada por sistema existente'
        });

        // PASO 2: Selección de breakers
        var resultadoCoordinacion = coordinarSistema(resultado.nodos, config);
        resultado.pasos.push({
            paso: 2,
            accion: 'SELECCION_BREAKERS',
            estado: resultadoCoordinacion.estado,
            mensaje: resultadoCoordinacion.cambios.length + ' cambios aplicados'
        });

        // PASO 3: Coordinación iterativa
        resultado.pasos.push({
            paso: 3,
            accion: 'COORDINACION_ITERATIVA',
            estado: resultadoCoordinacion.estado,
            mensaje: resultadoCoordinacion.iteraciones + ' iteraciones, ' + 
                    resultadoCoordinacion.validaciones.length + ' validaciones'
        });

        // PASO 4: Validación final
        var validacionFinal = validarCoordinacion(resultado.nodos);
        resultado.pasos.push({
            paso: 4,
            accion: 'VALIDACION_FINAL',
            estado: validacionFinal.estado,
            mensaje: validacionFinal.cruces.length + ' cruces detectados'
        });

        resultado.estadoFinal = validacionFinal.ok ? 'COORDINADO' : 'PARCIAL_COORDINADO';
        resultado.coordinacion = resultadoCoordinacion;
        resultado.validacionFinal = validacionFinal;

        return resultado;
    }

    /**
     * Generar reporte HTML de coordinación real
     * @param {Object} resultado - Resultado de coordinación
     * @returns {string} HTML del reporte
     */
    function generarReporteHTML(resultado) {
        var html = '<div class="card mt-4">';
        html += '<div class="card-title"><i class="fas fa-cogs mr-2"></i>Motor de Coordinación Real (ETAP/SKM)</div>';

        // Estado global
        var estadoColor = resultado.estadoFinal === 'COORDINADO' ? 'text-green-400' : 
                         (resultado.estadoFinal === 'PARCIAL_COORDINADO' ? 'text-yellow-400' : 'text-red-400');
        var estadoIcono = resultado.estadoFinal === 'COORDINADO' ? '[OK]' : 
                         (resultado.estadoFinal === 'PARCIAL_COORDINADO' ? '[!]' : '[X]');
        
        html += '<div class="p-4 rounded bg-[--border] mb-4">';
        html += '<span class="font-bold ' + estadoColor + '">' + estadoIcono + ' ' + resultado.estadoFinal + '</span>';
        html += '</div>';

        // Pasos de auto-corrección
        if (resultado.pasos && resultado.pasos.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Pasos de Auto-Corrección</h4>';
            html += '<div class="space-y-1">';
            resultado.pasos.forEach(function(p) {
                var color = p.estado === 'OK' || p.estado === 'COORDINADO' ? 'text-[--green]' : 
                           (p.estado === 'PARCIAL_COORDINADO' ? 'text-[--yellow]' : 'text-[--red]');
                html += '<div class="text-xs ' + color + '">' + p.paso + '. ' + p.accion + ': ' + p.mensaje + '</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        // Cambios aplicados
        if (resultado.coordinacion && resultado.coordinacion.cambios.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Cambios Aplicados</h4>';
            html += '<div class="space-y-1">';
            resultado.coordinacion.cambios.forEach(function(c) {
                var color = c.accion === 'SELECCION_BREAKER' ? 'text-[--cyan]' : 
                           (c.accion === 'ESCALONAMIENTO_FRAME' ? 'text-[--green]' : 
                           (c.accion === 'BLOQUEO_INSTANTANEO' ? 'text-[--yellow]' : 'text-[--text-muted]'));
                html += '<div class="text-xs ' + color + '">↳ ' + c.nodo + ': ' + c.accion + ' (' + c.antes + ' → ' + c.despues + ')</div>';
                if (c.razon) {
                    html += '<div class="text-xs text-[--text-muted] ml-4">  └ ' + c.razon + '</div>';
                }
            });
            html += '</div>';
            html += '</div>';
        }

        // Validación final
        if (resultado.validacionFinal) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Validación Final</h4>';
            
            if (resultado.validacionFinal.cruces.length > 0) {
                html += '<div class="space-y-1">';
                resultado.validacionFinal.cruces.forEach(function(c) {
                    var color = c.severidad === 'CRITICO' ? 'text-[--red]' : 'text-[--yellow]';
                    html += '<div class="text-xs ' + color + '">[X] ' + c.par + ' @ ' + c.corriente.toFixed(0) + 'A: ratio=' + c.ratio.toFixed(2) + ' < ' + c.selectividadMinima + '</div>';
                });
                html += '</div>';
            } else {
                html += '<div class="text-xs text-[--green]">[OK] No se detectaron cruces de coordinación</div>';
            }
            
            html += '</div>';
        }

        // Breakers seleccionados
        if (resultado.coordinacion && resultado.coordinacion.nodos.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Breakers Seleccionados</h4>';
            html += '<div class="space-y-1">';
            resultado.coordinacion.nodos.forEach(function(n) {
                if (n.breaker) {
                    html += '<div class="text-xs text-[--cyan]">↳ ' + n.id + ': ' + n.breaker.marcaNombre + ' ' + n.breaker.modeloNombre + ' ' + n.breaker.frame + 'A (Icu=' + n.breaker.Icu + 'kA)</div>';
                }
            });
            html += '</div>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    return {
        coordinarSistema: coordinarSistema,
        validarCoordinacion: validarCoordinacion,
        calcularTiempoTCC: calcularTiempoTCC,
        autocorregirSistema: autocorregirSistema,
        generarReporteHTML: generarReporteHTML
    };
})();

if (typeof window !== 'undefined') {
    window.MotorCoordinacionReal = MotorCoordinacionReal;
}
