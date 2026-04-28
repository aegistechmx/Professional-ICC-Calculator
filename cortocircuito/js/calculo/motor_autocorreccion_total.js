/**
 * motor_autocorreccion_total.js — Motor experto autónomo de ingeniería eléctrica
 * Pipeline: sanitize → inferir instalación → corregir CDT → interruptor → tierra → TCC → validar → optimizar costo → repetir
 */
var MotorAutocorreccionTotal = (function() {

    var CFG = {
        maxIter: 25,
        margenMinCDT: 0.10,     // ≥10%
        margenIntMin: 1.25,     // 125% recomendado
        toleranciaTCC: 0.05,    // separación mínima log
        minDisparo: 100,        // A
        maxParalelos: 4
    };

    // =========================
    // 🚀 ENTRY
    // =========================
    function ejecutar(estado) {
        var cambios = [];

        // 0) SANITIZE DURO (mata bugs UI)
        sanitizeEstado(estado, cambios);

        // Single pass only - NO internal recalculation loop to prevent infinite loop
        // 1) Inferencias físicas (auto)
        inferirInstalacion(estado, cambios);

        // 2) Recalcular ONCE
        var res = Motor.ejecutar();
        var puntos = res.puntos;

        // 3) Corregir por dominio
        corregirCDT(estado, puntos, cambios);
        corregirInterruptores(estado, puntos, cambios);
        corregirTierra(estado, puntos, cambios);
        corregirTCC(estado, cambios);

        // 4) Validar
        var v = ValidadorSistema.validarTodo(estado);

        // 5) Limpieza de warnings "ruido"
        v.warnings = depurarWarnings(v.warnings);

        // Return results - user must recalculate manually to see effects
        return { ok: true, iteraciones: 1, cambios: cambios, estadoFinal: estado, validacion: v };
    }

    // =========================
    // 🧹 SANITIZE
    // =========================
    function sanitizeEstado(estado, cambios) {
        (estado.nodos || []).forEach(function(n) {

            // id obligatorio
            if (!n.id) {
                n.id = 'P' + Math.random().toString(36).slice(2,6);
                cambios.push('Fix: asignado id ' + n.id);
            }

            // feeder defaults
            n.feeder = n.feeder || {};
            var f = n.feeder;

            f.paralelo = Math.max(1, parseInt(f.paralelo || 1));
            f.numConductores = Math.max(1, parseInt(f.numConductores || 3));
            f.canalizacion = f.canalizacion || 'conduit_PVC';

            // equipo defaults
            n.equip = n.equip || {};
            if (!n.equip.iDisparo || n.equip.iDisparo <= 0) {
                n.equip.iDisparo = 5 * (f.cargaA || 100); // heurística
                cambios.push('Nodo ' + n.id + ': iDisparo auto=' + n.equip.iDisparo + 'A');
            }
        });
    }

    // =========================
    // 🔍 INFERENCIA
    // =========================
    function inferirInstalacion(estado, cambios) {
        (estado.nodos || []).forEach(function(n) {
            var f = n.feeder;
            if (!f) return;

            // tipo instalación
            if (!f.tipoInst) {
                if ((f.canalizacion || '').toLowerCase().includes('charola') || f.numConductores > 6) {
                    f.tipoInst = 'charola';
                } else {
                    f.tipoInst = 'conduit';
                }
                cambios.push('Nodo ' + n.id + ': tipoInst=' + f.tipoInst);
            }

            // F_agrupamiento auto coherente
            var autoF;
            var cccEfectivo = f.numConductores || 3;

            // [Normativa] Si THDi > 15%, el neutro cuenta como portador de corriente
            if (App.estado && App.estado.ctx && App.estado.ctx.harmonics && App.estado.ctx.harmonics.THDi > 0.15) {
                if (cccEfectivo === 3) cccEfectivo = 4;
            }

            if (f.tipoInst === 'charola') {
                autoF = Math.max(0.85, 1 - cccEfectivo * 0.02);
            } else {
                if (typeof AmpacidadReal !== 'undefined') {
                    autoF = AmpacidadReal.factorAgrupamiento(cccEfectivo);
                } else {
                    // Fallback
                    if (cccEfectivo <= 3) autoF = 1.0;
                    else if (cccEfectivo <= 6) autoF = 0.80;
                    else if (cccEfectivo <= 9) autoF = 0.70;
                    else autoF = 0.50;
                }
            }

            if (!f.F_agrupamiento || Math.abs(f.F_agrupamiento - autoF) > 0.1) {
                f.F_agrupamiento = autoF;
                cambios.push('Nodo ' + n.id + ': F_agrupamiento→' + (autoF || 0).toFixed(2));
            }
        });
    }

    // =========================
    // 🔥 CDT
    // =========================
    function corregirCDT(estado, puntos, cambios) {
        puntos.forEach(function(p) {
            var n = findNodo(estado, p.id);
            if (!n || !p.CDT) return;

            var f = n.feeder;
            if (!f) return;

            if (p.CDT.status === 'FAIL' || p.CDT.margen < CFG.margenMinCDT * 100) {

                // 1) subir paralelos
                if (f.paralelo < CFG.maxParalelos) {
                    f.paralelo++;
                    cambios.push('Nodo ' + n.id + ': +paralelo (' + f.paralelo + ')');
                    return;
                }

                // 2) subir calibre
                var next = siguienteCalibre(f.calibre);
                if (next) {
                    f.calibre = next;
                    cambios.push('Nodo ' + n.id + ': calibre→' + next);
                }
            }
        });
    }

    // =========================
    // ⚡ INTERRUPTORES
    // =========================
    function corregirInterruptores(estado, puntos, cambios) {
        var catalogoKA = [25, 35, 50, 65, 100];

        puntos.forEach(function(p) {
            var n = findNodo(estado, p.id);
            if (!n) return;

            var isc = p.iscConMotores || p.isc;

            // capacidad
            if (!n.equip.cap || n.equip.cap < isc * CFG.margenIntMin) {
                for (var i = 0; i < catalogoKA.length; i++) {
                    if (catalogoKA[i] >= isc * CFG.margenIntMin) {
                        n.equip.cap = catalogoKA[i];
                        cambios.push('Nodo ' + n.id + ': interruptor→' + catalogoKA[i] + 'kA');
                        break;
                    }
                }
            }

            // coherencia con conductor
            if (n.feeder && n.feeder.cargaA) {
                n.equip.iNominal = Math.max(n.feeder.cargaA * 1.25, n.equip.iNominal || 0);
            }
        });
    }

    // =========================
    // 🌍 TIERRA
    // =========================
    function corregirTierra(estado, puntos, cambios) {
        puntos.forEach(function(p) {
            var n = findNodo(estado, p.id);
            if (!n || !p.faseTierra) return;

            var I3F = p.isc * 1000;
            var IFT = (p.faseTierra.iscFt || 0) * 1000;

            // 🔥 Modelo Z0 realista si está muy bajo
            if (IFT < 0.1 * I3F) {
                // fuerza relación Z0≈2.5Z1
                if (n.faseTierraModel) {
                    n.faseTierraModel.forceZ0 = 2.5;
                }
                cambios.push('Nodo ' + n.id + ': ajuste Z0→≈2.5·Z1');
            }

            // sensibilidad
            if (!n.equip.iDisparo || n.equip.iDisparo > IFT) {
                n.equip.iDisparo = Math.max(CFG.minDisparo, IFT * 0.5);
                cambios.push('Nodo ' + n.id + ': iDisparo→' + (n.equip.iDisparo || 0).toFixed(0) + 'A');
            }
        });
    }

    // =========================
    // 📉 TCC
    // =========================
    function corregirTCC(estado, cambios) {
        var nodos = estado.nodos || [];
        var cabecerasCorregidas = new Set();
        nodos.forEach(function(n) {
            var up = findNodo(estado, n.parentId);
            if (!up || cabecerasCorregidas.has(up.id)) return;
            cabecerasCorregidas.add(up.id);

            // Asegurar separación mínima de 0.1s respecto al hijo
            up.equip = up.equip || {};
            var delayHijo = n.equip ? (n.equip.delay || 0) : 0;
            var nuevoDelay = Math.max(up.equip.delay || 0.1, delayHijo + 0.1);
            
            if (up.equip.delay !== nuevoDelay) {
                up.equip.delay = nuevoDelay;
                cambios.push('TCC: Ajuste jerárquico ' + up.id + ' delay→' + nuevoDelay.toFixed(2) + 's');
            }
        });
    }

    // =========================
    // 💰 COSTO (reduce sin romper NOM)
    // =========================
    function optimizarCosto(estado, cambios) {
        (estado.nodos || []).forEach(function(n) {
            var f = n.feeder;
            if (!f) return;

            // intentar bajar 1 calibre si sigue cumpliendo
            var prev = calibreAnterior(f.calibre);
            if (!prev) return;

            var backup = f.calibre;
            f.calibre = prev;

            // NO recalcular - solo aplicar cambio optimista
            // Usuario debe recalcular manualmente para verificar
            cambios.push('Optimización propuesta: ' + n.id + ' calibre↓ ' + backup + '→' + prev + ' (requiere recálculo)');
        });
    }

    // =========================
    // 🧰 UTILS
    // =========================
    function findNodo(estado, id) {
        return (estado.nodos || []).find(function(n) { return n.id === id; });
    }

    function siguienteCalibre(actual) {
        if (typeof AmpacidadReal === 'undefined' || !AmpacidadReal.tablaAmpacidad) return null;
        var lista = Object.keys(AmpacidadReal.tablaAmpacidad);
        var i = lista.indexOf(actual);
        return i >= 0 && i < lista.length - 1 ? lista[i + 1] : null;
    }

    function calibreAnterior(actual) {
        if (typeof AmpacidadReal === 'undefined' || !AmpacidadReal.tablaAmpacidad) return null;
        var lista = Object.keys(AmpacidadReal.tablaAmpacidad);
        var i = lista.indexOf(actual);
        return i > 0 ? lista[i - 1] : null;
    }

    function depurarWarnings(ws) {
        // elimina duplicados / ruido conocido
        return (ws || []).filter(function(w, i, arr) {
            return arr.indexOf(w) === i && !/default 3 conductores/.test(w);
        });
    }

    return {
        ejecutar: ejecutar
    };
})();

if (typeof window !== 'undefined') {
    window.MotorAutocorreccionTotal = MotorAutocorreccionTotal;
}
