/**
 * debug_visual_pro.js — Debug visual profesional tipo ETAP
 * Muestra flujo completo de cálculo, factores aplicados, resultados y alertas
 */
var DebugVisualPro = (function() {

    var DEBUG_MODE = false;
    var debugNodes = [];

    /**
     * Activa/desactiva modo debug
     */
    function toggleDebug() {
        DEBUG_MODE = !DEBUG_MODE;
        console.log('🐛 Debug mode:', DEBUG_MODE ? 'ON' : 'OFF');
        return DEBUG_MODE;
    }

    /**
     * Logger profundo con console.group/table
     */
    function logCDT(etapa, data) {
        if (!DEBUG_MODE) return;

        console.group('📊 CDT: ' + etapa);
        console.table(data);
        console.groupEnd();
    }

    /**
     * Genera estructura de debug para un nodo
     */
    function generarDebugNode(punto, nodo) {
        if (!punto || !nodo) return null;

        var debug = {
            id: punto.id || nodo.id,
            entrada: {},
            diseno: {},
            ampacidad: {},
            terminal: {},
            final: {},
            cortocircuito: {},
            errores: [],
            warnings: []
        };

        // Usar debugCDT si está disponible
        if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.debugCDT) {
            var load = {
                I_no_cont: nodo.feeder ? nodo.feeder.cargaA : 0,
                I_cont: nodo.feeder ? nodo.feeder.cargaA : 0,
                esContinua: false
            };

            var cable = {
                calibre: nodo.feeder ? nodo.feeder.calibre : 'N/A',
                temperaturaAislamiento: 75,
                temperaturaAmbiente: nodo.feeder ? nodo.feeder.tempAmbiente : 30,
                numConductores: 3,
                paralelos: nodo.feeder ? nodo.feeder.paralelo : 1,
                canalizacion: nodo.feeder ? nodo.feeder.canalizacion : 'desconocido'
            };

            var config = {
                temperaturaTerminal: 75
            };

            try {
                var cdtDebug = AmpacidadReal.debugCDT(load, cable, config);

                debug.entrada = cdtDebug.entrada;
                debug.diseno = {
                    I_diseño: cdtDebug.calculo.I_diseño
                };
                debug.ampacidad = {
                    calibre: cdtDebug.entrada.calibre,
                    I_tabla: cdtDebug.calculo.I_tabla,
                    F_temp: cdtDebug.calculo.F_temp,
                    F_agrupamiento: cdtDebug.calculo.F_agrupamiento,
                    paralelos: cdtDebug.entrada.paralelos,
                    I_corregida: cdtDebug.limites.I_corregida
                };
                debug.terminal = {
                    tempTerminal: 75,
                    I_terminal: cdtDebug.limites.I_terminal
                };
                debug.final = {
                    I_final: cdtDebug.limites.I_final,
                    status: cdtDebug.diagnostico.status,
                    margen: cdtDebug.diagnostico.margen,
                    violacionTerminal: cdtDebug.diagnostico.violacionTerminal,
                    error: cdtDebug.diagnostico.error
                };
            } catch (e) {
                console.error('Error en debugCDT:', e);
            }
        }

        // Fallback si debugCDT falló
        if (debug.entrada.I_base === undefined) {
            if (nodo.feeder) {
                debug.entrada = {
                    I_base: nodo.feeder.cargaA || 0,
                    I_cont: nodo.feeder.cargaA || 0,
                    temperaturaAmbiente: nodo.feeder.tempAmbiente || 30
                };
            }
        }

        if (debug.diseno.I_diseño === undefined && punto.CDT) {
            debug.diseno = {
                I_diseño: punto.CDT.I_diseño || 0
            };
        }

        if (debug.ampacidad.I_tabla === undefined && punto.CDT) {
            debug.ampacidad = {
                calibre: nodo.feeder ? nodo.feeder.calibre : 'N/A',
                I_tabla: punto.CDT.I_tabla || 0,
                F_temp: punto.CDT.F_temp || 0,
                F_agrupamiento: punto.CDT.F_agrupamiento || 0,
                paralelos: nodo.feeder ? nodo.feeder.paralelo : 1,
                I_corregida: punto.CDT.I_corregida || 0
            };
        }

        if (debug.terminal.I_terminal === undefined && punto.CDT) {
            debug.terminal = {
                tempTerminal: 75,
                I_terminal: punto.CDT.I_limite_terminal || 0
            };
        }

        if (debug.final.I_final === undefined && punto.CDT) {
            debug.final = {
                I_final: punto.CDT.I_final || 0,
                status: punto.CDT.status || 'UNKNOWN',
                margen: punto.CDT.margen || 0,
                violacionTerminal: punto.CDT.violacionTerminal || false
            };
        }

        // Cortocircuito
        debug.cortocircuito = {
            Isc: punto.isc || 0,
            Ipeak: punto.ipeak || 0,
            X_R: punto.xr || 0,
            If_tierra: punto.faseTierra ? punto.faseTierra.iscFt : 0
        };

        // Detectar anomalías
        var anomalias = detectarAnomalias(debug);
        debug.errores = anomalias.errores;
        debug.warnings = anomalias.warnings;

        return debug;
    }

    /**
     * Detector automático de bugs
     */
    function detectarAnomalias(debug) {
        var errores = [];
        var warnings = [];

        // Terminal en 0
        if (debug.terminal.I_terminal === 0) {
            errores.push('[X] BUG CRÍTICO: terminal en 0 - lookup falló');
        }

        // Ampacidad inflada
        if (debug.ampacidad.I_corregida > debug.ampacidad.I_tabla * 2) {
            errores.push('[!] Ampacidad inflada (paralelos mal aplicados): I_corr=' + debug.ampacidad.I_corregida + ' > 2×I_tabla=' + (debug.ampacidad.I_tabla * 2));
        }

        // Agrupamiento extremo
        if (debug.ampacidad.F_agrupamiento < 0.5) {
            warnings.push('[!] Agrupamiento extremo: F=' + debug.ampacidad.F_agrupamiento);
        }

        // I_tabla en 0
        if (debug.ampacidad.I_tabla === 0) {
            errores.push('[X] BUG: I_tabla en 0 - calibre no encontrado');
        }

        // F_temp inválido
        if (debug.ampacidad.F_temp <= 0 || debug.ampacidad.F_temp > 1.5) {
            errores.push('[X] BUG: F_temp inválido: ' + debug.ampacidad.F_temp);
        }

        // I_final > I_corregida (físicamente imposible)
        if (debug.final.I_final > debug.ampacidad.I_corregida + 1) {
            errores.push('[X] BUG: I_final > I_corregida (físicamente imposible)');
        }

        // If-tierra > 3×Isc (irreal)
        if (debug.cortocircuito.If_tierra > debug.cortocircuito.Isc * 3) {
            errores.push('[X] BUG: If-tierra irreal (>3×Isc)');
        }

        // If-tierra < 1% de Isc (ridículamente baja)
        if (debug.cortocircuito.Isc > 0 && debug.cortocircuito.If_tierra < 0.01 * debug.cortocircuito.Isc) {
            warnings.push('[!] If-tierra ridículamente baja (<1% de Isc)');
        }

        // X/R extremo
        if (debug.cortocircuito.X_R < 0.1 || debug.cortocircuito.X_R > 100) {
            warnings.push('[!] X/R extremo: ' + debug.cortocircuito.X_R);
        }

        return { errores: errores, warnings: warnings };
    }

    /**
     * Color de estado según valor vs límite
     */
    function colorEstado(valor, limite) {
        if (!valor || !limite) return 'gray';
        if (valor >= limite * 1.25) return 'green';
        if (valor >= limite) return 'yellow';
        return 'red';
    }

    /**
     * Genera HTML para debug node
     */
    function generarHTMLDebugNode(debug) {
        if (!debug) return '';

        var colorFinal = debug.final.status === 'PASS' ? 'text-[--green]' :
                         debug.final.status === 'WARNING' ? 'text-[--yellow]' : 'text-[--red]';

        var html = '<div class="debug-node-card p-4 rounded-lg bg-[--surface] border border-[--border] mb-3">' +
            '<div class="flex items-center justify-between mb-3">' +
            '<span class="text-sm font-bold text-[--text]">[' + debug.id + ']</span>' +
            '<span class="text-xs font-bold ' + colorFinal + '">' + debug.final.status + '</span>' +
            '</div>';

        // Entrada
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Entrada</p>' +
            '<div class="grid grid-cols-2 gap-2 text-xs">' +
            '<div>I_base: <span class="text-[--text]">' + (debug.entrada.I_base !== undefined ? debug.entrada.I_base : 'N/A') + ' A</span></div>' +
            '<div>Temp amb: <span class="text-[--text]">' + (debug.entrada.temperaturaAmbiente !== undefined ? debug.entrada.temperaturaAmbiente : 'N/A') + '°C</span></div>' +
            '</div>' +
            '</div>';

        // Diseño
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Diseño</p>' +
            '<div class="text-xs">I_diseño: <span class="text-[--text] font-bold">' + (debug.diseno.I_diseño !== undefined ? debug.diseno.I_diseño : 'N/A') + ' A</span></div>' +
            '</div>';

        // Ampacidad
        var colorAmp = colorEstado(debug.ampacidad.I_corregida, debug.diseno.I_diseño);
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Ampacidad</p>' +
            '<div class="grid grid-cols-2 gap-2 text-xs">' +
            '<div>Calibre: <span class="text-[--text]">' + (debug.ampacidad.calibre || 'N/A') + '</span></div>' +
            '<div>I_tabla: <span class="text-[--text]">' + (debug.ampacidad.I_tabla || 0) + ' A</span></div>' +
            '<div>F_temp: <span class="text-[--text]">' + (debug.ampacidad.F_temp || 0).toFixed(2) + '</span></div>' +
            '<div>F_agrup: <span class="text-[--text]">' + (debug.ampacidad.F_agrupamiento || 0).toFixed(2) + '</span></div>' +
            '<div>Paralelos: <span class="text-[--text]">' + (debug.ampacidad.paralelos || 1) + '</span></div>' +
            '<div>I_corr: <span class="' + colorAmp + ' font-bold">' + (debug.ampacidad.I_corregida || 0).toFixed(1) + ' A</span></div>' +
            '</div>' +
            '</div>';

        // Terminal
        var colorTerm = debug.final.violacionTerminal ? 'text-[--red]' : 'text-[--green]';
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Terminal</p>' +
            '<div class="text-xs">I_terminal: <span class="' + colorTerm + ' font-bold">' + (debug.terminal.I_terminal || 0) + ' A</span></div>' +
            '</div>';

        // Final
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Final</p>' +
            '<div class="grid grid-cols-2 gap-2 text-xs">' +
            '<div>I_final: <span class="' + colorFinal + ' font-bold">' + (debug.final.I_final || 0) + ' A</span></div>' +
            '<div>Margen: <span class="text-[--text]">' + (debug.final.margen || 0).toFixed(1) + '%</span></div>' +
            '</div>' +
            '</div>';

        // Cortocircuito
        html += '<div class="mb-3 p-2 rounded bg-[--surface-alt] border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-1 uppercase">Cortocircuito</p>' +
            '<div class="grid grid-cols-2 gap-2 text-xs">' +
            '<div>Isc: <span class="text-[--text]">' + (debug.cortocircuito.Isc || 0).toFixed(2) + ' kA</span></div>' +
            '<div>Ipeak: <span class="text-[--text]">' + (debug.cortocircuito.Ipeak || 0).toFixed(2) + ' kA</span></div>' +
            '<div>X/R: <span class="text-[--text]">' + (debug.cortocircuito.X_R || 0).toFixed(2) + '</span></div>' +
            '<div>If-tierra: <span class="text-[--text]">' + (debug.cortocircuito.If_tierra || 0).toFixed(2) + ' kA</span></div>' +
            '</div>' +
            '</div>';

        // Errores
        if (debug.errores.length > 0) {
            html += '<div class="mb-3 p-2 rounded bg-[--red]/10 border border-[--red]">' +
                '<p class="text-xs font-semibold text-[--red] mb-1 uppercase">Errores</p>' +
                debug.errores.map(function(e) {
                    return '<div class="text-xs text-[--red]">• ' + e + '</div>';
                }).join('') +
                '</div>';
        }

        // Warnings
        if (debug.warnings.length > 0) {
            html += '<div class="mb-3 p-2 rounded bg-[--yellow]/10 border border-[--yellow]">' +
                '<p class="text-xs font-semibold text-[--yellow] mb-1 uppercase">Warnings</p>' +
                debug.warnings.map(function(w) {
                    return '<div class="text-xs text-[--yellow]">• ' + w + '</div>';
                }).join('') +
                '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Genera HTML para TCC debug
     */
    function generarHTMLTCCDebug(coordinacion) {
        if (!coordinacion || !coordinacion.puntos) return '';

        var html = '<div class="debug-tcc-card p-4 rounded-lg bg-[--surface] border border-[--border] mb-3">' +
            '<p class="text-sm font-bold text-[--text] mb-3">📉 Coordinación TCC</p>';

        coordinacion.puntos.forEach(function(p) {
            var color = p.coordinado ? 'text-[--green]' : 'text-[--red]';
            var barWidth = Math.min(100, (p.tiempo / 2) * 100); // Normalizar a 2s max

            html += '<div class="mb-2">' +
                '<div class="flex items-center justify-between text-xs mb-1">' +
                '<span class="text-[--text]">' + p.id + '</span>' +
                '<span class="' + color + '">' + p.tiempo.toFixed(2) + 's</span>' +
                '</div>' +
                '<div class="w-full bg-[--surface-alt] rounded h-2">' +
                '<div class="h-2 rounded ' + (p.coordinado ? 'bg-[--green]' : 'bg-[--red]') + '" style="width: ' + barWidth + '%"></div>' +
                '</div>' +
                '</div>';
        });

        html += '</div>';
        return html;
    }

    /**
     * Renderiza debug visual en UI
     */
    function renderizarDebug(puntos, nodos) {
        if (!DEBUG_MODE) return;

        var container = document.getElementById('debug-visual-container');
        if (!container) {
            // Crear container si no existe
            var resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                container = document.createElement('div');
                container.id = 'debug-visual-container';
                container.className = 'card mt-4';
                resultsSection.parentNode.insertBefore(container, resultsSection.nextSibling);
            } else {
                return;
            }
        }

        debugNodes = [];

        var html = '<div class="card-title mb-3"><i class="fas fa-bug mr-2"></i>Debug Visual Pro</div>';

        // Generar debug nodes
        for (var i = 0; i < puntos.length; i++) {
            var debug = generarDebugNode(puntos[i], nodos[i]);
            if (debug) {
                debugNodes.push(debug);
                html += generarHTMLDebugNode(debug);
            }
        }

        // TCC debug
        if (puntos.coordinacionTCC) {
            html += generarHTMLTCCDebug(puntos.coordinacionTCC);
        }

        container.innerHTML = html;
        container.classList.remove('hidden');
        container.classList.add('fade-in');
    }

    /**
     * Oculta debug visual
     */
    function ocultarDebug() {
        var container = document.getElementById('debug-visual-container');
        if (container) {
            container.classList.add('hidden');
        }
    }

    return {
        toggleDebug: toggleDebug,
        logCDT: logCDT,
        generarDebugNode: generarDebugNode,
        detectarAnomalias: detectarAnomalias,
        renderizarDebug: renderizarDebug,
        ocultarDebug: ocultarDebug,
        isDebugMode: function() { return DEBUG_MODE; }
    };
})();

if (typeof window !== 'undefined') {
    window.DebugVisualPro = DebugVisualPro;
}
