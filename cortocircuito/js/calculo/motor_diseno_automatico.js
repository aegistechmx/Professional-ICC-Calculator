/**
 * motor_diseno_automatico.js — Motor de Diseño Automático tipo ETAP/SKM
 * Sistema de coordinación inteligente de interruptores con escalonamiento automático
 * 
 * Objetivo: Transformar cálculo pasivo en diseño activo
 * - Escalonar frames de breakers automáticamente
 * - Ajustar curvas TCC para selectividad
 * - Bloquear instantáneos cuando necesario
 * - Validar selectividad real
 */

console.log('[MotorDiseno] motor_diseno_automatico.js - INICIO DE PARSEO');

var MotorDisenoAutomatico = (function() {
    console.log('[MotorDiseno] MotorDisenoAutomatico IIFE ejecutándose');
    /**
     * Frames estándar de interruptores (Square D / Schneider)
     * Ordenados de menor a mayor para escalonamiento
     */
    var FRAMES_BREAKERS = [
        15, 20, 30, 40, 50, 60, 70, 80, 90, 100,    // QO, HDL pequeños
        125, 150, 175, 200, 225, 250, 300, 350, 400, // HDL, HDA, JDL, JDA
        450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000 // MG, PowerPact
    ];

    /**
     * Redondear al frame estándar más cercano (hacia arriba)
     * @param {number} corriente - Corriente de diseño
     * @returns {number} Frame estándar
     */
    function redondearBreaker(corriente) {
        for (var i = 0; i < FRAMES_BREAKERS.length; i++) {
            if (FRAMES_BREAKERS[i] >= corriente) {
                return FRAMES_BREAKERS[i];
            }
        }
        return FRAMES_BREAKERS[FRAMES_BREAKERS.length - 1]; // Máximo disponible
    }

    /**
     * Obtener siguiente frame estándar (escalón)
     * @param {number} frameActual - Frame actual
     * @returns {number} Siguiente frame
     */
    function siguienteFrame(frameActual) {
        for (var i = 0; i < FRAMES_BREAKERS.length - 1; i++) {
            if (FRAMES_BREAKERS[i] === frameActual) {
                return FRAMES_BREAKERS[i + 1];
            }
        }
        return frameActual; // Ya está en el máximo
    }

    /**
     * PASO 1 — Escalonamiento automático de breakers
     * Crea jerarquía real desde downstream hacia upstream
     * @param {Array} nodos - Array de nodos ordenados (P0 upstream, Pn downstream)
     * @returns {Object} Resultado del escalonamiento
     */
    function escalarBreakers(nodos) {
        var resultado = {
            nodos: [],
            cambios: [],
            estado: 'OK'
        };

        // Recorrer de downstream a upstream
        for (var i = nodos.length - 1; i >= 0; i--) {
            var nodo = nodos[i];
            var breakerActual = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap * 1000 : 0; // kA a A
            var I_diseño = nodo.CDT ? nodo.CDT.I_diseño : (nodo.feeder ? nodo.feeder.cargaA * 1.25 : 0);
            var breakerNuevo;

            if (i === nodos.length - 1) {
                // Downstream más lejano: redondear a I_diseño
                breakerNuevo = redondearBreaker(I_diseño);
            } else {
                // Upstream: siguiente frame del downstream
                var downstream = resultado.nodos[i + 1];
                breakerNuevo = siguienteFrame(downstream.breakerIn);
            }

            // Detectar cambio
            if (breakerActual !== breakerNuevo) {
                resultado.cambios.push({
                    nodo: nodo.id,
                    antes: breakerActual,
                    despues: breakerNuevo,
                    razon: i === nodos.length - 1 ? 'I_diseño' : 'Escalonamiento'
                });
            }

            resultado.nodos.unshift({
                id: nodo.id,
                breakerIn: breakerNuevo,
                I_diseño: I_diseño,
                breakerActual: breakerActual
            });
        }

        // Validar si hubo cambios significativos
        if (resultado.cambios.length > 0) {
            resultado.estado = 'CAMBIOS_PENDIENTES';
        }

        return resultado;
    }

    /**
     * Detectar curvas idénticas en cascada
     * @param {Array} nodos - Array de nodos con breakers
     * @returns {Object} Resultado de detección
     */
    function detectarCurvasIguales(nodos) {
        var errores = [];
        var warnings = [];

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i];
            var down = nodos[i + 1];

            var upFrame = up.breakerIn || 0;
            var downFrame = down.breakerIn || 0;
            var upSerie = (up.equip && up.equip.serie) ? up.equip.serie : '';
            var downSerie = (down.equip && down.equip.serie) ? down.equip.serie : '';

            // Error crítico: mismo frame
            if (upFrame === downFrame && upFrame > 0) {
                errores.push({
                    tipo: 'FRAME_IDENTICO',
                    nodoUp: up.id,
                    nodoDown: down.id,
                    mensaje: 'Breakers con mismo frame en cascada (' + upFrame + 'A) → imposible coordinar'
                });
            }

            // Warning: misma serie
            if (upSerie === downSerie && upSerie !== '') {
                warnings.push({
                    tipo: 'SERIE_IDENTICA',
                    nodoUp: up.id,
                    nodoDown: down.id,
                    mensaje: 'Misma serie de breaker (' + upSerie + ') → curvas similares'
                });
            }
        }

        return {
            errores: errores,
            warnings: warnings,
            estado: errores.length > 0 ? 'ERROR' : (warnings.length > 0 ? 'WARNING' : 'OK')
        };
    }

    /**
     * PASO 2 — Ajuste TCC automático
     * Ajusta retardos y pickups para selectividad
     * @param {Array} nodos - Array de nodos ordenados
     * @returns {Object} Resultado del ajuste TCC
     */
    function coordinarTCC(nodos) {
        var resultado = {
            nodos: [],
            ajustes: [],
            estado: 'OK'
        };

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i];
            var down = nodos[i + 1];

            // Parámetros TCC base (si existen)
            var tccUp = up.tcc || {
                longDelay: 0,
                shortDelay: 0,
                pickup: up.breakerIn || 0,
                instantaneous: (up.breakerIn || 0) * 10
            };

            var tccDown = down.tcc || {
                longDelay: 0,
                shortDelay: 0,
                pickup: down.breakerIn || 0,
                instantaneous: (down.breakerIn || 0) * 10
            };

            // Ajustar upstream basado en downstream
            var tccUpNuevo = {
                longDelay: tccDown.longDelay + 0.4,    // +400ms para selectividad térmica
                shortDelay: tccDown.shortDelay + 0.1,  // +100ms para selectividad magnética
                pickup: tccDown.pickup * 1.25,         // 25% más alto
                instantaneous: tccDown.instantaneous * 1.5  // 50% más alto
            };

            // Registrar ajustes
            resultado.ajustes.push({
                nodoUp: up.id,
                nodoDown: down.id,
                antes: tccUp,
                despues: tccUpNuevo
            });

            resultado.nodos.push({
                id: up.id,
                tcc: tccUpNuevo
            });
        }

        // Agregar último nodo (downstream más lejano) sin cambios
        if (nodos.length > 0) {
            var ultimo = nodos[nodos.length - 1];
            resultado.nodos.push({
                id: ultimo.id,
                tcc: ultimo.tcc || {
                    longDelay: 0,
                    shortDelay: 0,
                    pickup: ultimo.breakerIn || 0,
                    instantaneous: (ultimo.breakerIn || 0) * 10
                }
            });
        }

        if (resultado.ajustes.length > 0) {
            resultado.estado = 'AJUSTES_PENDIENTES';
        }

        return resultado;
    }

    /**
     * PASO 3 — Bloqueo de instantáneo para selectividad
     * Desactiva instantáneo upstream si Isc < instantaneous_downstream
     * @param {Array} nodos - Array de nodos con Isc
     * @returns {Object} Resultado del bloqueo
     */
    function bloquearInstantaneo(nodos) {
        var resultado = {
            nodos: [],
            bloqueos: [],
            estado: 'OK'
        };

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i];
            var down = nodos[i + 1];

            var IscUp = up.isc || 0;
            var instantaneousDown = (down.tcc && down.tcc.instantaneous) ? down.tcc.instantaneous : 
                                     ((down.breakerIn || 0) * 10);

            var tccUp = up.tcc || {
                longDelay: 0,
                shortDelay: 0,
                pickup: up.breakerIn || 0,
                instantaneous: (up.breakerIn || 0) * 10
            };

            // Si Isc upstream < instantaneous downstream, bloquear instantáneo upstream
            if (IscUp < instantaneousDown) {
                tccUp.instantaneous = 'OFF';
                resultado.bloqueos.push({
                    nodoUp: up.id,
                    nodoDown: down.id,
                    razon: 'Isc_up (' + IscUp.toFixed(0) + 'A) < Inst_down (' + instantaneousDown.toFixed(0) + 'A)',
                    accion: 'Instantáneo upstream desactivado'
                });
            }

            resultado.nodos.push({
                id: up.id,
                tcc: tccUp,
                Isc: IscUp
            });
        }

        // Agregar último nodo
        if (nodos.length > 0) {
            var ultimo = nodos[nodos.length - 1];
            resultado.nodos.push({
                id: ultimo.id,
                tcc: ultimo.tcc,
                Isc: ultimo.isc || 0
            });
        }

        if (resultado.bloqueos.length > 0) {
            resultado.estado = 'BLOQUEOS_APLICADOS';
        }

        return resultado;
    }

    /**
     * PASO 4 — Validación de selectividad
     * Verifica t_up >= t_down * 1.3
     * @param {Object} up - Nodo upstream
     * @param {Object} down - Nodo downstream
     * @param {number} corriente - Corriente de prueba
     * @returns {Object} Resultado de validación
     */
    function validarSelectividad(up, down, corriente) {
        // Simular curvas TCC (simplificado)
        var tUp = calcularTiempoTCC(up.tcc, corriente);
        var tDown = calcularTiempoTCC(down.tcc, corriente);

        var ratio = tUp / tDown;
        var selectividadMinima = 1.3;

        return {
            corriente: corriente,
            tUp: tUp,
            tDown: tDown,
            ratio: ratio,
            selectiva: ratio >= selectividadMinima,
            selectividadMinima: selectividadMinima,
            mensaje: ratio >= selectividadMinima ? 
                'Selectiva (ratio=' + ratio.toFixed(2) + ')' : 
                'NO selectiva (ratio=' + ratio.toFixed(2) + ' < ' + selectividadMinima + ')'
        };
    }

    /**
     * Calcular tiempo en curva TCC (modelo simplificado)
     * @param {Object} tcc - Parámetros TCC
     * @param {number} corriente - Corriente de prueba
     * @returns {number} Tiempo en segundos
     */
    function calcularTiempoTCC(tcc, corriente) {
        if (!tcc) return 0;

        var pickup = tcc.pickup || 100;
        var instantaneous = tcc.instantaneous;
        
        // Si instantáneo está OFF o es número
        var instValue = (instantaneous === 'OFF') ? Infinity : (instantaneous || pickup * 10);

        // Si corriente >= instantáneo, tiempo = 0 (disparo instantáneo)
        if (corriente >= instValue) {
            return 0.01; // Tiempo mínimo de disparo
        }

        // Zona de larga duración (térmica)
        if (corriente < pickup * 2) {
            var I_ratio = corriente / pickup;
            // Curva IEC inversa: t = k / (I^α - 1)
            var k = 100; // Constante típica
            var alpha = 0.02; // Exponente típico
            var tTermico = k / (Math.pow(I_ratio, alpha) - 1);
            return Math.min(tTermico, 10000); // Máximo 10000s
        }

        // Zona de corta duración (magnética)
        var tccUp = tcc.shortDelay || 0.1;
        return tccUp;
    }

    /**
     * Pipeline completo de diseño automático
     * @param {Array} nodos - Array de nodos del sistema
     * @param {Object} config - Configuración adicional
     * @returns {Object} Resultado completo del diseño
     */
    function ejecutarDiseno(nodos, config) {
        config = config || {};

        var resultado = {
            escalonamiento: null,
            deteccionCurvas: null,
            coordinacionTCC: null,
            bloqueoInstantaneo: null,
            validacionSelectividad: [],
            estadoGlobal: 'OK',
            recomendaciones: []
        };

        // PASO 1: Escalonamiento de breakers
        resultado.escalonamiento = escalarBreakers(nodos);

        // PASO 2: Detectar curvas idénticas
        resultado.deteccionCurvas = detectarCurvasIguales(resultado.escalonamiento.nodos);

        // Si hay errores críticos, detener
        if (resultado.deteccionCurvas.estado === 'ERROR') {
            resultado.estadoGlobal = 'ERROR';
            resultado.recomendaciones.push({
                tipo: 'CRITICO',
                mensaje: 'Breakers idénticos en cascada. Escalone frames manualmente o use diseño automático.'
            });
            return resultado;
        }

        // PASO 3: Coordinación TCC
        resultado.coordinacionTCC = coordinarTCC(resultado.escalonamiento.nodos);

        // PASO 4: Bloqueo de instantáneo
        resultado.bloqueoInstantaneo = bloquearInstantaneo(resultado.coordinacionTCC.nodos);

        // PASO 5: Validación de selectividad
        for (var i = 0; i < resultado.bloqueoInstantaneo.nodos.length - 1; i++) {
            var up = resultado.bloqueoInstantaneo.nodos[i];
            var down = resultado.bloqueoInstantaneo.nodos[i + 1];

            // Validar a diferentes corrientes
            var corrientesPrueba = [
                down.tcc.pickup * 1.5,      // Sobrecarga
                down.tcc.pickup * 5,       // Corto moderado
                down.tcc.pickup * 10       // Corto severo
            ];

            for (var j = 0; j < corrientesPrueba.length; j++) {
                var validacion = validarSelectividad(up, down, corrientesPrueba[j]);
                resultado.validacionSelectividad.push(validacion);
            }
        }

        // Evaluar estado global
        var selectividadOK = resultado.validacionSelectividad.every(function(v) { return v.selectiva; });
        
        if (selectividadOK) {
            resultado.estadoGlobal = 'OK';
            resultado.recomendaciones.push({
                tipo: 'EXITO',
                mensaje: 'Coordinación correcta en rango térmico y magnético.'
            });
        } else {
            resultado.estadoGlobal = 'WARNING';
            resultado.recomendaciones.push({
                tipo: 'PARCIAL',
                mensaje: 'Selectividad parcial. Ajuste retardos manualmente si es necesario.'
            });
        }

        return resultado;
    }

    /**
     * Generar reporte HTML del diseño
     * @param {Object} resultado - Resultado del diseño
     * @returns {string} HTML del reporte
     */
    function generarReporteHTML(resultado) {
        var html = '<div class="card mt-4">';
        html += '<div class="card-title"><i class="fas fa-cogs mr-2"></i>Motor de Diseño Automático</div>';

        // Estado global
        var estadoColor = resultado.estadoGlobal === 'OK' ? 'text-green-400' : 
                         (resultado.estadoGlobal === 'WARNING' ? 'text-yellow-400' : 'text-red-400');
        var estadoIcono = resultado.estadoGlobal === 'OK' ? '[OK]' : 
                         (resultado.estadoGlobal === 'WARNING' ? '[WARN]' : '[ERROR]');
        
        html += '<div class="p-4 rounded bg-[--border] mb-4">';
        html += '<span class="font-bold ' + estadoColor + '">' + estadoIcono + ' ' + resultado.estadoGlobal + '</span>';
        html += '</div>';

        // Escalonamiento
        if (resultado.escalonamiento && resultado.escalonamiento.cambios.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Escalonamiento de Breakers</h4>';
            html += '<div class="space-y-1">';
            resultado.escalonamiento.cambios.forEach(function(c) {
                html += '<div class="text-xs text-[--cyan]">-> ' + c.nodo + ': ' + c.antes + 'A -> ' + c.despues + 'A (' + c.razon + ')</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        // Detección de curvas
        if (resultado.deteccionCurvas) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Detección de Curvas</h4>';
            
            if (resultado.deteccionCurvas.errores.length > 0) {
                html += '<div class="space-y-1">';
                resultado.deteccionCurvas.errores.forEach(function(e) {
                    html += '<div class="text-xs text-[--red]">[X] ' + e.mensaje + '</div>';
                });
                html += '</div>';
            }
            
            if (resultado.deteccionCurvas.warnings.length > 0) {
                html += '<div class="space-y-1">';
                resultado.deteccionCurvas.warnings.forEach(function(w) {
                    html += '<div class="text-xs text-[--yellow]">[!] ' + w.mensaje + '</div>';
                });
                html += '</div>';
            }
            
            if (resultado.deteccionCurvas.errores.length === 0 && resultado.deteccionCurvas.warnings.length === 0) {
                html += '<div class="text-xs text-[--green]">[OK] No se detectaron curvas idénticas</div>';
            }
            
            html += '</div>';
        }

        // Coordinación TCC
        if (resultado.coordinacionTCC && resultado.coordinacionTCC.ajustes.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Ajustes TCC Automáticos</h4>';
            html += '<div class="space-y-1">';
            resultado.coordinacionTCC.ajustes.forEach(function(a) {
                html += '<div class="text-xs text-[--cyan]">-> ' + a.nodoUp + ' (upstream): Pickup ' + 
                       (a.antes.pickup || 0).toFixed(0) + 'A → ' + (a.despues.pickup || 0).toFixed(0) + 'A</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        // Bloqueo de instantáneo
        if (resultado.bloqueoInstantaneo && resultado.bloqueoInstantaneo.bloqueos.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Bloqueo de Instantáneo</h4>';
            html += '<div class="space-y-1">';
            resultado.bloqueoInstantaneo.bloqueos.forEach(function(b) {
                html += '<div class="text-xs text-[--yellow]">[!] ' + b.accion + ' - ' + b.razon + '</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        // Recomendaciones
        if (resultado.recomendaciones.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="font-semibold mb-2">Recomendaciones</h4>';
            html += '<div class="space-y-1">';
            resultado.recomendaciones.forEach(function(r) {
                var color = r.tipo === 'CRITICO' ? 'text-[--red]' : 
                           (r.tipo === 'PARCIAL' ? 'text-[--yellow]' : 'text-[--green]');
                html += '<div class="text-xs ' + color + '">' + r.mensaje + '</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    return {
        FRAMES_BREAKERS: FRAMES_BREAKERS,
        redondearBreaker: redondearBreaker,
        siguienteFrame: siguienteFrame,
        escalarBreakers: escalarBreakers,
        detectarCurvasIguales: detectarCurvasIguales,
        coordinarTCC: coordinarTCC,
        bloquearInstantaneo: bloquearInstantaneo,
        validarSelectividad: validarSelectividad,
        calcularTiempoTCC: calcularTiempoTCC,
        ejecutarDiseno: ejecutarDiseno,
        generarReporteHTML: generarReporteHTML
    };
})();

if (typeof window !== 'undefined') {
    window.MotorDisenoAutomatico = MotorDisenoAutomatico;
    console.log('[MotorDiseno] MotorDisenoAutomatico cargado correctamente');
}
