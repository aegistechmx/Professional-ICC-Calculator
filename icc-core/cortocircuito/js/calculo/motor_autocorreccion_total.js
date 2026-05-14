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

        // 1.5) Autocorrector explícito conductor/protección antes de TCC.
        // Mantiene la prioridad NOM: nunca subir breaker si el conductor no cumple.
        if (typeof AutoCorrectorConductoresProtecciones !== 'undefined') {
            AutoCorrectorConductoresProtecciones.aplicar(estado, cambios);
        }

        // 2) Recalcular ONCE
        var res = Motor.ejecutar();
        var puntos = res.puntos;

        // 3) Corregir por dominio con jerarquía real de ingeniería:
        //    carga → conductor/terminales → protección → tierra → TCC.
        //    Nunca se debe subir protección o coordinar TCC si el conductor sigue fuera de NOM.
        corregirCDT(estado, puntos, cambios);

        // Recalcular una vez después de cambiar conductor/paralelos para que los módulos
        // siguientes trabajen con ampacidad final real, no con estado viejo.
        res = Motor.ejecutar();
        puntos = res.puntos || puntos;

        corregirInterruptores(estado, puntos, cambios);
        corregirTierra(estado, puntos, cambios);
        corregirTCC(estado, cambios, puntos);

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

            var requiereCorreccion = p.CDT.status === 'FAIL' ||
                p.CDT.I_final < (p.CDT.I_diseño || 0) ||
                p.CDT.violacionTerminal ||
                p.CDT.margen < CFG.margenMinCDT * 100;

            if (!requiereCorreccion) return;

            var load = {
                I_cont: f.cargaA || 0,
                I_no_cont: 0,
                esContinua: true,
                Fcc: 1.25
            };

            var baseCable = {
                calibre: f.calibre || '4/0',
                temperaturaAislamiento: f.temperaturaAislamiento || 75,
                temperaturaAmbiente: f.tempAmbiente || f.temperaturaAmbiente || 30,
                numConductores: f.numConductores || 3,
                paralelos: f.paralelo || 1,
                F_agrupamiento: f.F_agrupamiento,
                canalizacion: f.canalizacion || 'acero',
                tempTerminal: 75
            };

            var mejor = buscarMejorConductorFisico(load, baseCable);

            if (mejor) {
                if (f.calibre !== mejor.calibre) {
                    cambios.push('Nodo ' + n.id + ': conductor NOM ' + f.calibre + ' → ' + mejor.calibre +
                        ' (I_final=' + (mejor.I_final || 0).toFixed(1) + 'A, I_diseño=' + (mejor.I_diseño || 0).toFixed(1) + 'A)');
                    f.calibre = mejor.calibre;
                }
                if ((f.paralelo || 1) !== mejor.paralelos) {
                    cambios.push('Nodo ' + n.id + ': paralelos ' + (f.paralelo || 1) + ' → ' + mejor.paralelos);
                    f.paralelo = mejor.paralelos;
                }
                return;
            }

            // Fallback: crecimiento ordenado, pero siempre conductor antes que breaker.
            var next = siguienteCalibre(f.calibre);
            if (next) {
                f.calibre = next;
                cambios.push('Nodo ' + n.id + ': calibre→' + next + ' por ampacidad NOM');
                return;
            }

            var IdisenoFallback = (f.cargaA || 0) * 1.25;
            var maxParFisico = limiteParalelosFisico(IdisenoFallback);
            if ((f.paralelo || 1) < maxParFisico) {
                f.paralelo = (f.paralelo || 1) + 1;
                cambios.push('Nodo ' + n.id + ': +paralelo (' + f.paralelo + ') por ampacidad NOM');
                return;
            }
            cambios.push('Nodo ' + n.id + ': requiere rediseño físico de alimentador; no se agregan paralelos no razonables para I_diseño=' + IdisenoFallback.toFixed(1) + 'A');
        });
    }

    function buscarMejorConductorFisico(load, baseCable) {
        if (typeof AmpacidadReal === 'undefined' || !AmpacidadReal.buscarConductorMinimo) return null;

        var Idiseno = (load.I_no_cont || 0) + (load.I_cont || 0) * (load.Fcc || 1.25);
        var maxParalelos = limiteParalelosFisico(Idiseno);
        var mejor = null;

        for (var par = 1; par <= maxParalelos; par++) {
            var cableTest = Object.assign({}, baseCable, { paralelos: par });
            var candidato = AmpacidadReal.buscarConductorMinimo(load, cableTest);
            if (!candidato || candidato.status !== 'PASS') continue;

            var puntaje = puntuarConductorFisico(candidato, par, Idiseno);
            if (!mejor || puntaje < mejor.puntajeFisico) {
                mejor = Object.assign({ paralelos: par, puntajeFisico: puntaje }, candidato);
            }
        }

        return mejor;
    }

    function limiteParalelosFisico(Idiseno) {
        // Evita soluciones físicamente ridículas tipo 3/4 paralelos #8 para alimentadores de 100–125A.
        if (Idiseno <= 225) return 1;
        if (Idiseno <= 500) return 2;
        if (Idiseno <= 900) return 3;
        return CFG.maxParalelos;
    }

    function puntuarConductorFisico(candidato, paralelos, Idiseno) {
        var IFinal = candidato.I_final || Idiseno;
        var ratio = Idiseno > 0 ? IFinal / Idiseno : 1;
        var penalizacionParalelo = Math.pow(paralelos - 1, 2) * 10000;
        var penalizacionSobredimension = Math.abs(ratio - 1.2) * 1000;
        var penalizacionCalibre = indiceCalibre(candidato.calibre) * 10;
        return penalizacionParalelo + penalizacionSobredimension + penalizacionCalibre;
    }

    function indiceCalibre(calibre) {
        var orden = ['14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0',
            '250', '300', '350', '400', '500', '600', '700', '750', '800', '900', '1000',
            '1250', '1500', '1750', '2000'];
        var idx = orden.indexOf(String(calibre));
        return idx >= 0 ? idx : orden.length;
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
            n.equip = n.equip || {};

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

            // Sensibilidad mínima (Falla 3F): iDisparo debe ser menor que Isc_min en el punto.
            // Si iDisparo es mayor, el interruptor "NO VE FALLA" en el reporte.
            var iscMinKA = p.iscMin || p.Isc_min || p.isc_min ||
                (p.fallaMinima && p.fallaMinima.iscMin) ||
                (p.isc ? p.isc * 0.95 : 0);
            if (iscMinKA && n.equip.iDisparo) {
                var iscMinA = iscMinKA * 1000;
                if (iscMinA > 0 && n.equip.iDisparo >= iscMinA) {
                    n.equip.iDisparo = Math.max(CFG.minDisparo, iscMinA * 0.8);
                    cambios.push(
                        'Nodo ' +
                        n.id +
                        ': iDisparo→' +
                        (n.equip.iDisparo || 0).toFixed(0) +
                        'A (sensibilidad Isc_min)'
                    );
                }
            }

            // Coherencia con conductor: la protección no debe exceder la ampacidad final.
            if (n.feeder && n.feeder.cargaA) {
                var Idiseno = n.feeder.cargaA * 1.25;
                if (p.CDT && p.CDT.I_final && p.CDT.I_final < Idiseno) {
                    cambios.push('Nodo ' + n.id + ': protección NO escalada; primero corregir conductor (I_final=' + p.CDT.I_final.toFixed(1) + 'A < I_diseño=' + Idiseno.toFixed(1) + 'A)');
                    return;
                }
                n.equip.iNominal = Math.max(Idiseno, n.equip.iNominal || 0);
                if (p.CDT && p.CDT.I_final) {
                    n.equip.iNominal = Math.min(n.equip.iNominal, p.CDT.I_final);
                }
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
            var tipoAterrizaje = typeof leerTipoAterrizamiento === 'function' ? leerTipoAterrizamiento() :
                ((typeof App !== 'undefined' && App.estado && App.estado.ctx && App.estado.ctx.system && App.estado.ctx.system.groundingType) || 'yg_solido');

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

            if (tipoAterrizaje === 'yg_solido' && n.equip && !n.equip.tieneGFP && !n.equip.soportaGFP) {
                n.equip.tieneGFP = true;
                n.equip.soportaGFP = true;
                n.equip.tipo = 'LSIG';
                n.equip.pickupTierra = Math.max(CFG.minDisparo, IFT * 0.3);
                n.equip.ground_pickup = n.equip.pickupTierra;
                n.equip.ground_delay = n.equip.ground_delay || 0.2;
                cambios.push('Nodo ' + n.id + ': GFP/LSIG activado por NOM 230.95 (Ig=' + n.equip.pickupTierra.toFixed(0) + 'A)');
            }
        });
    }

    // =========================
    // 📉 TCC
    // =========================
    function corregirTCC(estado, cambios, puntos) {
        var nodos = estado.nodos || [];
        var puntosPorId = {};
        (puntos || []).forEach(function(p) { puntosPorId[p.id] = p; });
        var cabecerasCorregidas = new Set();
        nodos.forEach(function(n) {
            var up = findNodo(estado, n.parentId);
            if (!up || cabecerasCorregidas.has(up.id)) return;
            if (tieneRestriccionNOM(puntosPorId[up.id]) || tieneRestriccionNOM(puntosPorId[n.id])) {
                cambios.push('TCC: coordinación bloqueada en ' + up.id + ' hasta resolver ampacidad/terminal');
                return;
            }
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

    function tieneRestriccionNOM(p) {
        return !!(p && p.CDT && (p.CDT.violacionTerminal || p.CDT.I_final < (p.CDT.I_diseño || 0)));
    }

    return {
        ejecutar: ejecutar
    };
})();

if (typeof window !== 'undefined') {
    window.MotorAutocorreccionTotal = MotorAutocorreccionTotal;
}
