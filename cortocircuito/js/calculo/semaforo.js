/**
 * semaforo.js — Sistema de Severidad y Tracking de Ingeniería
 * Modelo tipo ETAP/SKM para evaluación de estado del sistema
 */

var Semaforo = (function() {
    /**
     * Estados de severidad del sistema
     */
    var ESTADOS = {
        OK: 'OK',
        WARNING: 'WARNING',
        ERROR: 'ERROR'
    };

    /**
     * Colores para UI
     */
    var COLORES = {
        OK: 'green',
        WARNING: 'yellow',
        ERROR: 'red'
    };

    /**
     * Iconos para UI
     */
    var ICONOS = {
        OK: '🟢',
        WARNING: '🟡',
        ERROR: '🔴'
    };

    /**
     * Crear contexto de ingeniería para tracking
     */
    function crearContexto() {
        return {
            autocorrecciones: [],
            warnings: [],
            errores: [],
            estadoGlobal: ESTADOS.OK,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Registrar autocorrección
     */
    function registrarAutocorreccion(ctx, nodoId, tipo, mensaje, severidad) {
        ctx.autocorrecciones.push({
            nodo: nodoId,
            tipo: tipo,
            msg: mensaje,
            severidad: severidad || 'MEDIA',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Registrar warning
     */
    function registrarWarning(ctx, nodoId, mensaje) {
        ctx.warnings.push({
            nodo: nodoId,
            msg: mensaje,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Registrar error crítico
     */
    function registrarError(ctx, nodoId, mensaje) {
        ctx.errores.push({
            nodo: nodoId,
            msg: mensaje,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Calcular ampacidad con tracking de contexto
     */
    function calcularAmpacidadSeguro(nodo, ctx) {
        var temp = nodo.tempAmbiente;
        var tempDefault = 30;

        // Validar temperatura ambiente
        if (!temp || !isFinite(temp) || temp <= 0) {
            registrarAutocorreccion(ctx, nodo.id, 'TEMP_DEFAULT', 
                'Temp ambiente indefinida → ' + tempDefault + '°C', 'BAJA');
            temp = tempDefault;
        }

        // Validar F_agrupamiento
        var F_agr = nodo.F_agrupamiento;
        if (!F_agr || !isFinite(F_agr) || F_agr <= 0) {
            registrarAutocorreccion(ctx, nodo.id, 'F_AGR_DEFAULT', 
                'F_agrupamiento inválido → 1.0', 'BAJA');
            F_agr = 1.0;
        }

        // Calcular F_temp (usar CONSTANTES si está disponible)
        var F_temp = 1.0;
        if (typeof CONSTANTES !== 'undefined' && CONSTANTES.FACTOR_TEMPERATURA) {
            var tempKey = temp.toString();
            F_temp = CONSTANTES.FACTOR_TEMPERATURA[tempKey] || CONSTANTES.FACTOR_TEMPERATURA['default'] || 0.91;
        } else {
            // Fallback
            F_temp = temp <= 35 ? 1.0 : (temp <= 40 ? 0.91 : 0.82);
        }

        var I_tabla = nodo.I_tabla || 0;
        var I = I_tabla * F_temp * F_agr;

        // Detector crítico: ampacidad inválida
        if (!isFinite(I) || I <= 0) {
            registrarAutocorreccion(ctx, nodo.id, 'AMPACIDAD_ZERO', 
                'Ampacidad inválida (' + I.toFixed(1) + 'A) → recalculo seguro', 'ALTA');
            
            // Fallback técnico
            I = I_tabla * 0.9;
            if (I <= 0) I = 100; // Último recurso
            
            nodo.__autofix = true;
        }

        return I;
    }

    /**
     * Evaluar estado de un nodo individual
     */
    function evaluarNodo(nodo, ctx) {
        var estado = ESTADOS.OK;
        var fixes = ctx.autocorrecciones.filter(function(a) {
            return a.nodo === nodo.id;
        });

        var warnings = ctx.warnings.filter(function(w) {
            return w.nodo === nodo.id;
        });

        var errores = ctx.errores.filter(function(e) {
            return e.nodo === nodo.id;
        });

        // Si hay autocorrecciones de severidad ALTA, WARNING
        if (fixes.some(function(f) { return f.severidad === 'ALTA'; })) {
            estado = ESTADOS.WARNING;
        }

        // Si hay errores críticos, ERROR
        if (errores.length > 0) {
            estado = ESTADOS.ERROR;
        }

        // Si I_final es inválido, ERROR
        if (!isFinite(nodo.I_final) || nodo.I_final <= 0) {
            estado = ESTADOS.ERROR;
        }

        // Si hay autocorrecciones de cualquier tipo, al menos WARNING
        if (fixes.length > 0 && estado === ESTADOS.OK) {
            estado = ESTADOS.WARNING;
        }

        return {
            nodo: nodo.id,
            estado: estado,
            fixes: fixes,
            warnings: warnings,
            errores: errores
        };
    }

    /**
     * Evaluar estado global del sistema
     */
    function evaluarSistema(nodosEvaluados, ctx) {
        // Si algún nodo está en ERROR, global es ERROR
        if (nodosEvaluados.some(function(n) { return n.estado === ESTADOS.ERROR; })) {
            ctx.estadoGlobal = ESTADOS.ERROR;
            return;
        }

        // Si algún nodo está en WARNING, global es WARNING
        if (nodosEvaluados.some(function(n) { return n.estado === ESTADOS.WARNING; })) {
            ctx.estadoGlobal = ESTADOS.WARNING;
            return;
        }

        ctx.estadoGlobal = ESTADOS.OK;
    }

    /**
     * Pipeline completo de cálculo con semáforo
     */
    function ejecutarCalculoConSemaforo(sistema) {
        var ctx = crearContexto();

        sistema.nodos.forEach(function(nodo) {
            nodo.I_final = calcularAmpacidadSeguro(nodo, ctx);
        });

        var evaluacion = sistema.nodos.map(function(n) {
            return evaluarNodo(n, ctx);
        });

        evaluarSistema(evaluacion, ctx);

        return {
            sistema: sistema,
            evaluacion: evaluacion,
            estadoGlobal: ctx.estadoGlobal,
            contexto: ctx
        };
    }

    /**
     * Renderizar semáforo tipo ETAP (consola)
     */
    function renderSemaforo(resultado) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚦 SEMÁFORO DEL SISTEMA — ' + ICONOS[resultado.estadoGlobal] + ' ' + resultado.estadoGlobal);
        console.log('═══════════════════════════════════════════════════════════');

        resultado.evaluacion.forEach(function(n) {
            console.log(ICONOS[n.estado] + ' Nodo ' + n.nodo + ' — ' + n.estado);
            
            n.fixes.forEach(function(f) {
                console.log('  ↳ [' + f.severidad + '] ' + f.msg);
            });

            n.warnings.forEach(function(w) {
                console.log('  ⚠️ ' + w.msg);
            });

            n.errores.forEach(function(e) {
                console.log('  ❌ ' + e.msg);
            });
        });

        console.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Generar HTML para UI tipo ETAP
     */
    function renderHTML(resultado) {
        var colorClass = {
            OK: 'bg-green-500',
            WARNING: 'bg-yellow-500',
            ERROR: 'bg-red-500'
        };

        var textColorClass = {
            OK: 'text-green-400',
            WARNING: 'text-yellow-400',
            ERROR: 'text-red-400'
        };

        var html = '<div class="p-4 rounded-lg border border-[--border] bg-[--surface]">';
        
        // Header con semáforo global
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="w-4 h-4 rounded-full ' + colorClass[resultado.estadoGlobal] + '"></div>';
        html += '<span class="font-bold ' + textColorClass[resultado.estadoGlobal] + '">' + resultado.estadoGlobal + '</span>';
        html += '</div>';
        html += '<span class="text-xs text-[--text-muted]">' + resultado.contexto.timestamp + '</span>';
        html += '</div>';

        // Resumen
        html += '<div class="grid grid-cols-3 gap-2 mb-4">';
        html += '<div class="p-2 rounded bg-[--border] text-center">';
        html += '<div class="text-lg font-bold text-[--text]">' + resultado.contexto.autocorrecciones.length + '</div>';
        html += '<div class="text-xs text-[--text-muted]">Autocorrecciones</div>';
        html += '</div>';
        html += '<div class="p-2 rounded bg-[--border] text-center">';
        html += '<div class="text-lg font-bold text-[--yellow]">' + resultado.contexto.warnings.length + '</div>';
        html += '<div class="text-xs text-[--text-muted]">Warnings</div>';
        html += '</div>';
        html += '<div class="p-2 rounded bg-[--border] text-center">';
        html += '<div class="text-lg font-bold text-[--red]">' + resultado.contexto.errores.length + '</div>';
        html += '<div class="text-xs text-[--text-muted]">Errores</div>';
        html += '</div>';
        html += '</div>';

        // Detalle por nodo
        html += '<div class="space-y-2">';
        resultado.evaluacion.forEach(function(n) {
            var nodeColor = textColorClass[n.estado];
            html += '<div class="p-2 rounded bg-[--border]">';
            html += '<div class="flex items-center justify-between">';
            html += '<span class="font-semibold ' + nodeColor + '">' + ICONOS[n.estado] + ' ' + n.nodo + '</span>';
            html += '<span class="text-xs ' + nodeColor + '">' + n.estado + '</span>';
            html += '</div>';
            
            if (n.fixes.length > 0) {
                html += '<div class="mt-1 space-y-1">';
                n.fixes.forEach(function(f) {
                    html += '<div class="text-xs text-[--cyan]">↳ ' + f.msg + '</div>';
                });
                html += '</div>';
            }

            if (n.warnings.length > 0) {
                html += '<div class="mt-1 space-y-1">';
                n.warnings.forEach(function(w) {
                    html += '<div class="text-xs text-[--yellow]">⚠️ ' + w.msg + '</div>';
                });
                html += '</div>';
            }

            if (n.errores.length > 0) {
                html += '<div class="mt-1 space-y-1">';
                n.errores.forEach(function(e) {
                    html += '<div class="text-xs text-[--red]">❌ ' + e.msg + '</div>';
                });
                html += '</div>';
            }

            html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        return html;
    }

    return {
        ESTADOS: ESTADOS,
        COLORES: COLORES,
        ICONOS: ICONOS,
        crearContexto: crearContexto,
        registrarAutocorreccion: registrarAutocorreccion,
        registrarWarning: registrarWarning,
        registrarError: registrarError,
        calcularAmpacidadSeguro: calcularAmpacidadSeguro,
        evaluarNodo: evaluarNodo,
        evaluarSistema: evaluarSistema,
        ejecutarCalculoConSemaforo: ejecutarCalculoConSemaforo,
        renderSemaforo: renderSemaforo,
        renderHTML: renderHTML
    };
})();

if (typeof window !== 'undefined') {
    window.Semaforo = Semaforo;
}
