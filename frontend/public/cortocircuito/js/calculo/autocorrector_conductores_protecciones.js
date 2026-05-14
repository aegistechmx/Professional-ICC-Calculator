/**
 * autocorrector_conductores_protecciones.js
 * Autocorrector compacto: conductor -> terminal -> protección -> coordinación.
 * No sustituye al TCC; prepara el estado para que TCC no escale protecciones sobre conductores fuera de NOM.
 */
var AutoCorrectorConductoresProtecciones = (function() {
    var BREAKERS = [15,20,30,40,50,60,70,80,90,100,110,125,150,175,200,225,250,300,350,400,450,500,600,630,700,800,1000,1200,1250,1600,2000];

    function safeNum(v, def) {
        v = Number(v);
        return isFinite(v) ? v : def;
    }

    function normalizarParalelos(idiseno) {
        if (idiseno <= 225) return 1;
        if (idiseno <= 500) return 2;
        if (idiseno <= 900) return 3;
        return 4;
    }

    function breakerEstandar(idiseno, ampacidadFinal) {
        for (var i = 0; i < BREAKERS.length; i++) {
            if (BREAKERS[i] >= idiseno && (!ampacidadFinal || BREAKERS[i] <= ampacidadFinal)) return BREAKERS[i];
        }
        return null;
    }

    function aplicar(estado, cambios) {
        cambios = cambios || [];
        if (!estado || !estado.nodos || typeof AmpacidadReal === 'undefined' || !AmpacidadReal.buscarConductorMinimo) {
            return { ok: false, cambios: cambios, error: 'Dependencias no disponibles' };
        }

        (estado.nodos || []).forEach(function(n) {
            if (!n || !n.feeder) return;
            var f = n.feeder;
            var carga = safeNum(f.cargaA || f.I_carga || f.corriente, 0);
            if (carga <= 0) return;

            var fcc = safeNum(f.Fcc || f.factorCargaContinua || f.factorCarga, 1.25);
            var idiseno = carga * fcc;
            var maxPar = normalizarParalelos(idiseno);
            var mejor = null;

            for (var par = 1; par <= maxPar; par++) {
                var candidato = AmpacidadReal.buscarConductorMinimo({
                    I_cont: carga,
                    I_no_cont: 0,
                    esContinua: true,
                    Fcc: fcc
                }, {
                    calibre: f.calibre || '4/0',
                    temperaturaAislamiento: f.temperaturaAislamiento || 75,
                    temperaturaAmbiente: f.tempAmbiente || f.temperaturaAmbiente || 30,
                    numConductores: f.numConductores || 3,
                    paralelos: par,
                    F_agrupamiento: f.F_agrupamiento,
                    canalizacion: f.canalizacion || 'conduit',
                    temperaturaTerminal: f.tempTerminal || 75
                });

                if (!candidato || candidato.status !== 'PASS') continue;
                var ratio = candidato.I_final / idiseno;
                var score = Math.pow(par - 1, 2) * 10000 + Math.abs(ratio - 1.15) * 1000;
                if (!mejor || score < mejor.score) mejor = Object.assign({ paralelos: par, score: score }, candidato);
            }

            if (!mejor) {
                n.requiereRedisenoFisico = true;
                cambios.push('Nodo ' + n.id + ': requiere rediseño físico; no se encontró conductor/protección estándar para I_diseño=' + idiseno.toFixed(1) + 'A');
                return;
            }

            if (String(f.calibre) !== String(mejor.calibre)) {
                cambios.push('Nodo ' + n.id + ': autocorrector conductor ' + f.calibre + ' → ' + mejor.calibre + ' (I_final=' + mejor.I_final.toFixed(1) + 'A)');
                f.calibre = mejor.calibre;
            }
            if (safeNum(f.paralelo || f.paralelos, 1) !== mejor.paralelos) {
                cambios.push('Nodo ' + n.id + ': autocorrector paralelos ' + (f.paralelo || 1) + ' → ' + mejor.paralelos);
                f.paralelo = mejor.paralelos;
                f.paralelos = mejor.paralelos;
            }

            n.equip = n.equip || {};
            var br = breakerEstandar(idiseno, mejor.I_final);
            if (br) {
                var previo = n.equip.iNominal || n.equip.amperaje || n.equip.frame || 0;
                n.equip.iNominal = br;
                n.equip.amperaje = n.equip.amperaje || br;
                if (previo && previo !== br) cambios.push('Nodo ' + n.id + ': autocorrector protección ' + previo + 'A → ' + br + 'A');
            } else {
                cambios.push('Nodo ' + n.id + ': protección bloqueada; ampacidad final ' + mejor.I_final.toFixed(1) + 'A < I_diseño ' + idiseno.toFixed(1) + 'A');
            }
        });

        return { ok: true, cambios: cambios };
    }

    return { aplicar: aplicar };
})();

if (typeof window !== 'undefined') {
    window.AutoCorrectorConductoresProtecciones = AutoCorrectorConductoresProtecciones;
}
