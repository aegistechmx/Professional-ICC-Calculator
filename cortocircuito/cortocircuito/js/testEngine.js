/**
 * testEngine.js — Motor de pruebas para QA interno
 * Ejecuta casos de prueba, detecta freezes, valida ingeniería
 */
var TestEngine = (function() {

    var resultados = [];
    var freezeWarnings = [];

    // =============================
    // 🧪 CASOS DE PRUEBA BASE
    // =============================
    function getCasos() {
        return [
            {
                nombre: "Agrupamiento inconsistente",
                run: function() {
                    if (typeof AmpacidadReal === 'undefined') {
                        throw new Error('AmpacidadReal no cargado');
                    }
                    return AmpacidadReal.resolverAgrupamiento({
                        numConductores: 3,
                        F_agrupamiento: 0.5,
                        paralelos: 1
                    }, {
                        sistema: '3f',
                        tieneNeutro: true,
                        neutroContado: true,
                        tieneArmonicos: false,
                        paralelos: 1
                    });
                },
                validar: function(res) {
                    return res.fuente === "AUTO_CORREGIDO";
                }
            },
            {
                nombre: "CCC correcto con neutro",
                run: function() {
                    if (typeof AmpacidadReal === 'undefined') {
                        throw new Error('AmpacidadReal no cargado');
                    }
                    return AmpacidadReal.calcularCCC({
                        sistema: '3f',
                        tieneNeutro: true,
                        neutroContado: true,
                        tieneArmonicos: false,
                        paralelos: 1
                    });
                },
                validar: function(res) {
                    return res === 4;
                }
            },
            {
                nombre: "Factor agrupamiento manual válido",
                run: function() {
                    if (typeof AmpacidadReal === 'undefined') {
                        throw new Error('AmpacidadReal no cargado');
                    }
                    return AmpacidadReal.resolverAgrupamiento({
                        numConductores: 3,
                        F_agrupamiento: 1.0,
                        paralelos: 1
                    }, {
                        sistema: '3f',
                        tieneNeutro: true,
                        neutroContado: false,
                        tieneArmonicos: false,
                        paralelos: 1
                    });
                },
                validar: function(res) {
                    return res.fuente === "MANUAL_VALIDO" && res.F === 1.0;
                }
            },
            {
                nombre: "Cálculo completo sistema",
                run: function() {
                    if (typeof Motor === 'undefined') {
                        throw new Error('Motor no cargado');
                    }
                    return Motor.ejecutar();
                },
                validar: function(res) {
                    return res && res.puntos && res.puntos.length > 0;
                }
            },
            {
                nombre: "Validación input ingeniería",
                run: function() {
                    if (typeof AmpacidadReal === 'undefined') {
                        throw new Error('AmpacidadReal no cargado');
                    }
                    return AmpacidadReal.validarInputIngenieria({
                        numConductores: 3,
                        F_agrupamiento: 0.8,
                        tipoSistema: '3f'
                    });
                },
                validar: function(res) {
                    return res && res.warnings && res.warnings.length > 0;
                }
            }
        ];
    }

    // =============================
    // ⚡ DETECTOR DE FREEZE
    // =============================
    function monitorUI() {
        var last = performance.now();

        return setInterval(function() {
            var now = performance.now();
            var delta = now - last;

            if (delta > 200) {
                freezeWarnings.push(delta);
                console.warn("⚠️ Freeze detectado:", delta.toFixed(1), "ms");
            }

            last = now;
        }, 100);
    }

    // =============================
    // 🧠 VALIDACIÓN INGENIERÍA
    // =============================
    function validarIngenieria(res) {
        var errores = [];

        if (!res || !res.puntos) return ["Resultado inválido"];

        res.puntos.forEach(function(p) {
            if (p.CDT && p.CDT.I_final < p.CDT.I_diseño) {
                errores.push("Punto " + p.id + ": ampacidad insuficiente");
            }

            if (p.equip && p.isc && p.equip.cap && p.isc * 1000 > p.equip.cap * 1000) {
                errores.push("Punto " + p.id + ": interruptor insuficiente");
            }

            if (p.faseTierra && p.equip && p.faseTierra.iscFt && p.equip.iDisparo && p.faseTierra.iscFt * 1000 < p.equip.iDisparo) {
                errores.push("Punto " + p.id + ": no detecta falla a tierra");
            }
        });

        return errores;
    }

    // =============================
    // 🚀 RUNNER
    // =============================
    function run() {
        resultados = [];
        freezeWarnings = [];

        var casos = getCasos();
        var freezeMonitor = monitorUI();

        console.log("🧪 Ejecutando pruebas...");

        for (var i = 0; i < casos.length; i++) {
            var test = casos[i];
            var inicio = performance.now();

            try {
                var res = test.run();
                var tiempo = performance.now() - inicio;

                var ok = test.validar(res);

                resultados.push({
                    nombre: test.nombre,
                    status: ok ? "OK" : "FAIL",
                    tiempo: tiempo.toFixed(2),
                    detalle: res
                });
            } catch (e) {
                resultados.push({
                    nombre: test.nombre,
                    status: "ERROR",
                    error: e.message
                });
            }
        }

        clearInterval(freezeMonitor);

        // Validación global del sistema
        try {
            if (typeof Motor !== 'undefined') {
                var sistema = Motor.ejecutar();
                var erroresIng = validarIngenieria(sistema);

                if (erroresIng.length > 0) {
                    resultados.push({
                        nombre: "Validación ingeniería",
                        status: "FAIL",
                        errores: erroresIng
                    });
                } else {
                    resultados.push({
                        nombre: "Validación ingeniería",
                        status: "OK"
                    });
                }
            } else {
                resultados.push({
                    nombre: "Validación ingeniería",
                    status: "SKIP",
                    error: "Motor no cargado"
                });
            }
        } catch (e) {
            resultados.push({
                nombre: "Validación ingeniería",
                status: "ERROR",
                error: e.message
            });
        }

        renderResultados();

        return resultados;
    }

    // =============================
    // 📊 UI RESULTADOS
    // =============================
    function renderResultados() {
        console.table(resultados);

        var resumen = {
            total: resultados.length,
            ok: resultados.filter(function(r) { return r.status === "OK"; }).length,
            fail: resultados.filter(function(r) { return r.status === "FAIL"; }).length,
            error: resultados.filter(function(r) { return r.status === "ERROR"; }).length,
            skip: resultados.filter(function(r) { return r.status === "SKIP"; }).length,
            freezes: freezeWarnings.length
        };

        console.log("📊 RESUMEN:", resumen);

        // Pintar en UI
        var el = document.getElementById("test-results");
        if (el) {
            var html = '<div class="p-4 rounded-lg border border-[--border] bg-[--surface]">' +
                '<h3 class="text-sm font-semibold mb-3 text-[--cyan]"><i class="fas fa-flask mr-2"></i>Resultados de Prueba</h3>' +
                '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">' +
                '<div class="p-2 rounded bg-[--green]/10 border border-[--green] text-center">' +
                '<div class="text-2xl font-bold text-[--green]">' + resumen.ok + '</div>' +
                '<div class="text-xs text-[--text-muted]">OK</div>' +
                '</div>' +
                '<div class="p-2 rounded bg-[--red]/10 border border-[--red] text-center">' +
                '<div class="text-2xl font-bold text-[--red]">' + resumen.fail + '</div>' +
                '<div class="text-xs text-[--text-muted]">FAIL</div>' +
                '</div>' +
                '<div class="p-2 rounded bg-[--yellow]/10 border border-[--yellow] text-center">' +
                '<div class="text-2xl font-bold text-[--yellow]">' + resumen.error + '</div>' +
                '<div class="text-xs text-[--text-muted]">ERROR</div>' +
                '</div>' +
                '<div class="p-2 rounded bg-[--orange]/10 border border-[--orange] text-center">' +
                '<div class="text-2xl font-bold text-[--orange]">' + resumen.skip + '</div>' +
                '<div class="text-xs text-[--text-muted]">SKIP</div>' +
                '</div>' +
                (resumen.freezes > 0 ? '<div class="p-2 rounded bg-[--purple]/10 border border-[--purple] text-center">' +
                '<div class="text-2xl font-bold text-[--purple]">' + resumen.freezes + '</div>' +
                '<div class="text-xs text-[--text-muted]">FREEZES</div>' +
                '</div>' : '') +
                '</div>' +
                '<div class="space-y-2 max-h-64 overflow-y-auto">' +
                resultados.map(function(r) {
                    var color = r.status === 'OK' ? 'text-[--green]' : 
                               r.status === 'FAIL' ? 'text-[--red]' : 
                               r.status === 'ERROR' ? 'text-[--yellow]' : 'text-[--orange]';
                    var icon = r.status === 'OK' ? 'fa-check-circle' : 
                              r.status === 'FAIL' ? 'fa-times-circle' : 
                              r.status === 'ERROR' ? 'fa-exclamation-circle' : 'fa-minus-circle';
                    return '<div class="flex items-center gap-2 p-2 rounded bg-[--bg] border border-[--border]">' +
                        '<i class="fas ' + icon + ' ' + color + '"></i>' +
                        '<div class="flex-1">' +
                        '<div class="text-sm font-semibold ' + color + '">' + r.nombre + '</div>' +
                        '<div class="text-xs text-[--text-muted]">Tiempo: ' + r.tiempo + 'ms</div>' +
                        (r.error ? '<div class="text-xs text-[--red] mt-1">' + r.error + '</div>' : '') +
                        (r.errores ? '<div class="text-xs text-[--red] mt-1">' + r.errores.join(', ') + '</div>' : '') +
                        '</div>' +
                        '</div>';
                }).join('') +
                '</div>' +
                '</div>';
            el.innerHTML = html;
        }
    }

    return {
        run: run
    };
})();

if (typeof window !== 'undefined') {
    window.TestEngine = TestEngine;
}
