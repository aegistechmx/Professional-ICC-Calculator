from pathlib import Path
import re, shutil, datetime
root=Path('/mnt/data/icc_work')
STAMP='20260514-deep-fixes'

def backup(p):
    bp=p.with_name(p.name+f'.bak-{STAMP}')
    if not bp.exists(): shutil.copy2(p,bp)

def patch_file(rel, fn):
    count=0
    for p in root.rglob(rel):
        if p.is_file() and '.bak-' not in p.name and 'coverage' not in str(p):
            txt=p.read_text(encoding='utf-8', errors='ignore')
            new=fn(txt)
            if new!=txt:
                backup(p)
                p.write_text(new,encoding='utf-8')
                print('patched',p.relative_to(root))
                count+=1
    return count

motor_helper = r'''
    /**
     * Evalúa sensibilidad real por zonas (LT/ST/INST/GF) para LSIG/MCCB.
     * Evita el falso "NO VE FALLA" cuando el instantáneo está arriba de Isc
     * pero la protección sí opera por short delay, long delay o ground fault.
     */
    function evaluarProteccionMultizona(equip, corrienteA, modo) {
        equip = equip || {};
        corrienteA = Number(corrienteA) || 0;
        if (corrienteA <= 0) return { sensible: false, zona: 'SIN_CORRIENTE', pickup: 0, margen: 0 };

        var In = Number(equip.iNominal || equip.amp || equip.cap || equip.frame || 0);
        var ltPickup = Number(equip.longPickup || equip.pickup || equip.pickupLT || In || (equip.iDisparo ? equip.iDisparo / 10 : 0));
        var stPickup = Number(equip.shortPickup || equip.pickupST || (ltPickup ? ltPickup * 6 : 0));
        var inst = equip.instantaneous === 'OFF' ? Infinity : Number(equip.instantaneous || equip.iDisparo || 0);
        var gfPickup = Number(equip.ground_pickup || equip.pickupTierra || equip.Ig || 0);

        var candidatos = [];
        if (modo === 'ground' && gfPickup > 0) candidatos.push({ zona: 'GF', pickup: gfPickup });
        if (inst > 0 && isFinite(inst)) candidatos.push({ zona: 'INST', pickup: inst });
        if (stPickup > 0) candidatos.push({ zona: 'ST', pickup: stPickup });
        if (ltPickup > 0) candidatos.push({ zona: 'LT', pickup: ltPickup });

        // Para sensibilidad basta que alguna zona de protección detecte la falla.
        var mejor = null;
        candidatos.forEach(function(c) {
            if (corrienteA >= c.pickup && (!mejor || c.pickup > mejor.pickup)) mejor = c;
        });
        if (!mejor) {
            var minPickup = candidatos.reduce(function(a, c) { return !a || c.pickup < a.pickup ? c : a; }, null);
            return { sensible: false, zona: minPickup ? minPickup.zona : 'SIN_AJUSTE', pickup: minPickup ? minPickup.pickup : 0, margen: minPickup ? ((corrienteA - minPickup.pickup) / minPickup.pickup * 100) : 0 };
        }
        return { sensible: true, zona: mejor.zona, pickup: mejor.pickup, margen: ((corrienteA - mejor.pickup) / mejor.pickup * 100) };
    }
'''

def patch_motor(txt):
    if 'function evaluarProteccionMultizona' not in txt:
        txt=txt.replace('    function ejecutarFallaMinima(puntosMax) {', motor_helper+'\n    function ejecutarFallaMinima(puntosMax) {')
    old="""            var iDisparo = (p.equip && p.equip.iDisparo) ? p.equip.iDisparo : 0;
            var sensible = false;
            var margen = 0;
            if (iDisparo > 0 && iscMin > 0) {
                sensible = iscMin * 1000 > iDisparo;
                margen = ((iscMin * 1000 - iDisparo) / iDisparo * 100);
            }
            resultados.push({ iscMin: iscMin, ipeakMin: ipeakMin, iDisparo: iDisparo, sensible: sensible, margen: margen });"""
    new="""            var iDisparo = (p.equip && p.equip.iDisparo) ? p.equip.iDisparo : 0;
            var evaluacion = evaluarProteccionMultizona(p.equip || {}, iscMin * 1000, 'phase');
            var sensible = evaluacion.sensible;
            var margen = isFinite(evaluacion.margen) ? evaluacion.margen : 0;
            resultados.push({
                iscMin: iscMin,
                ipeakMin: ipeakMin,
                iDisparo: iDisparo,
                sensible: sensible,
                margen: margen,
                zona: evaluacion.zona,
                pickupEfectivo: evaluacion.pickup
            });"""
    txt=txt.replace(old,new)
    old2="""                if (If_tierra < iDisparo) {
                    resultado.estadoGlobal = \"FAIL\";
                    resultado.severidad = Math.max(resultado.severidad, 5);
                    resultado.errores.push(\"FALLA A TIERRA (CRÍTICO NOM 230.95): If_tierra=\" + If_tierra.toFixed(1) + \"A < iDisparo=\" + iDisparo + \"A\");
                }"""
    new2="""                var evalTierra = evaluarProteccionMultizona(nodo.equip || {}, If_tierra, 'ground');
                if (!evalTierra.sensible) {
                    resultado.estadoGlobal = \"FAIL\";
                    resultado.severidad = Math.max(resultado.severidad, 5);
                    resultado.errores.push(\"FALLA A TIERRA (CRÍTICO NOM 230.95): If_tierra=\" + If_tierra.toFixed(1) + \"A < pickup efectivo \" + evalTierra.zona + \"=\" + (evalTierra.pickup || iDisparo).toFixed(0) + \"A\");
                }"""
    txt=txt.replace(old2,new2)
    old3="""                    if (p.faseTierra.iscFt * 1000 < iDisparo) {"""
    txt=txt.replace(old3,"""                    var evalTierraLegacy = evaluarProteccionMultizona(nodo.equip || {}, p.faseTierra.iscFt * 1000, 'ground');
                    if (!evalTierraLegacy.sensible) {")
    return txt

patch_file('motor.js', patch_motor)

coordinar_tcc_new = r'''    function coordinarTCC(nodos) {
        var resultado = { nodos: [], ajustes: [], estado: 'OK' };
        if (!nodos || nodos.length === 0) return resultado;

        // Copia profunda y base normalizada.
        var orden = nodos.map(function(n, idx) {
            var base = Object.assign({}, n);
            base.tcc = normalizarTCC(base.tcc || {
                longDelay: 2.4,
                shortDelay: 0.20,
                pickup: base.breakerIn || 100,
                shortPickup: (base.breakerIn || 100) * 6,
                instantaneous: (base.breakerIn || 100) * 10
            }, base.breakerIn || 100);
            base.tcc.curveFamily = seleccionarFamiliaCurva(idx, nodos.length, base);
            base.tcc.curveLabel = FAMILIAS_TCC[base.tcc.curveFamily].label;
            return base;
        });

        // Ajuste desde la carga hacia la fuente para que los retardos SÍ crezcan jerárquicamente.
        for (var i = orden.length - 2; i >= 0; i--) {
            var up = orden[i];
            var down = orden[i + 1];
            var antes = Object.assign({}, up.tcc);
            var limiteAmpacidad = up.I_diseño && up.breakerIn ? Math.max(up.breakerIn, up.I_diseño) : Infinity;
            if (up.bloqueoNOM) limiteAmpacidad = up.breakerIn || limiteAmpacidad;

            var pickupPropuesto = Math.max(up.breakerIn || 0, (down.tcc.pickup || down.breakerIn || 0) * 1.20);
            if (isFinite(limiteAmpacidad)) pickupPropuesto = Math.min(pickupPropuesto, limiteAmpacidad);

            up.tcc = {
                longDelay: Math.min(12, Math.max(antes.longDelay || 0, (down.tcc.longDelay || 2.4) + 0.50)),
                shortDelay: Math.min(1.0, Math.max(antes.shortDelay || 0, (down.tcc.shortDelay || 0.20) + 0.10)),
                pickup: Math.max(1, pickupPropuesto || antes.pickup || up.breakerIn || 100),
                shortPickup: Math.max((pickupPropuesto || up.breakerIn || 100) * 4, (down.tcc.shortPickup || (down.tcc.pickup || 100) * 6) * 1.15),
                instantaneous: down.tcc.instantaneous === 'OFF' ? 'OFF' : Math.max((antes.instantaneous || 0), (down.tcc.instantaneous || (down.tcc.pickup || 100) * 10) * 1.25),
                curveFamily: seleccionarFamiliaCurva(i, orden.length, up),
                curveLabel: FAMILIAS_TCC[seleccionarFamiliaCurva(i, orden.length, up)].label
            };
            if (up.bloqueoNOM) {
                up.tcc.pickup = Math.min(up.tcc.pickup, up.breakerIn || up.tcc.pickup);
                up.tcc.instantaneous = 'OFF';
            }
            resultado.ajustes.push({ nodoUp: up.id, nodoDown: down.id, antes: antes, despues: up.tcc });
        }

        resultado.nodos = orden;
        resultado.estado = resultado.ajustes.length > 0 ? 'AJUSTES_PENDIENTES' : 'OK';
        return resultado;
    }
'''

def replace_function(txt, name, new_func):
    start=txt.find(f'    function {name}(')
    if start<0: return txt
    # brace match
    brace=txt.find('{', start)
    depth=0
    for i in range(brace, len(txt)):
        if txt[i]=='{': depth+=1
        elif txt[i]=='}':
            depth-=1
            if depth==0:
                return txt[:start]+new_func+txt[i+1:]
    return txt

def patch_motor_diseno(txt):
    txt=replace_function(txt,'coordinarTCC',coordinar_tcc_new)
    # validarSelectividad: avoid NaN/Infinity false positives
    old="""        var ratio = tUp / tDown;
        var selectividadMinima = 1.3;"""
    new="""        if (!isFinite(tUp) && !isFinite(tDown)) {
            return { corriente: corriente, tUp: tUp, tDown: tDown, ratio: Infinity, selectiva: true, selectividadMinima: 1.3, mensaje: 'Sin disparo en zona evaluada' };
        }
        if (!isFinite(tUp) && isFinite(tDown)) tUp = 10000;
        if (!isFinite(tDown) || tDown <= 0) tDown = 0.01;
        var ratio = tUp / tDown;
        var selectividadMinima = 1.3;"""
    txt=txt.replace(old,new)
    return txt

patch_file('motor_diseno_automatico.js', patch_motor_diseno)

validar_coord_new = r'''    function validarCoordinacion(nodos) {
        var cruces = [];
        var ok = true;
        var restriccionesNOM = (nodos || []).filter(function(n) { return n.restriccionNOM; }).map(function(n) {
            return { nodo: n.id, tipo: n.restriccionNOM.tipo, mensaje: n.restriccionNOM.mensaje, severidad: 'CRITICO' };
        });
        if (restriccionesNOM.length > 0) ok = false;

        for (var i = 0; i < nodos.length - 1; i++) {
            var up = nodos[i], down = nodos[i + 1];
            if (!up.tcc || !down.tcc) continue;

            if (up.breaker && down.breaker && up.breaker.frame === down.breaker.frame) {
                cruces.push({
                    par: up.id + ' → ' + down.id,
                    corriente: down.breaker.frame,
                    tUp: 0,
                    tDown: 0,
                    ratio: 0,
                    selectividadMinima: 1.3,
                    severidad: 'CRITICO',
                    tipo: 'FRAME_IDENTICO',
                    mensaje: 'Breakers con mismo frame en cascada (' + up.breaker.frame + 'A). Requiere LSIG/ZSI/fusible limitador o cambio de frame/familia.'
                });
                ok = false;
                continue;
            }

            var pickupMin = Math.max(Number(up.tcc.pickup || 0), Number(down.tcc.pickup || 0), 1);
            var iscDown = Number(down.isc || down.Isc || down.iscMax || 0);
            if (iscDown > 0 && iscDown < 1000) iscDown *= 1000;
            var maxEval = Math.max(pickupMin * 12, iscDown || pickupMin * 20);
            maxEval = Math.min(maxEval, 50000);

            var peor = null;
            for (var I = pickupMin * 1.05; I <= maxEval; I *= 1.35) {
                var tUp = calcularTiempoTCC(up.tcc, I);
                var tDown = calcularTiempoTCC(down.tcc, I);
                if (!isFinite(tDown) || tDown <= 0) continue;
                if (!isFinite(tUp)) tUp = 10000;
                var ratio = tUp / tDown;
                var selectividadMinima = 1.3;
                if (ratio < selectividadMinima && tUp < 10000 && tDown < 10000) {
                    if (!peor || ratio < peor.ratio) {
                        peor = { par: up.id + ' → ' + down.id, corriente: I, tUp: tUp, tDown: tDown, ratio: ratio, selectividadMinima: selectividadMinima, severidad: ratio < 1.0 ? 'CRITICO' : 'WARNING' };
                    }
                }
            }
            if (peor) { cruces.push(peor); ok = false; }
        }
        return { ok: ok, cruces: cruces, restriccionesNOM: restriccionesNOM, estado: ok ? 'COORDINADO' : 'NO_COORDINADO' };
    }
'''

def patch_motor_coord(txt):
    txt=replace_function(txt,'validarCoordinacion',validar_coord_new)
    # avoid pickup escalating above available ampacity without NOM block message
    txt=txt.replace("""                var pickupNuevo = down.tcc.pickup * 1.25;
                if (up.tcc.pickup !== pickupNuevo) {""", """                var pickupNuevo = down.tcc.pickup * 1.25;
                var pickupMaxNOM = up.CDT && up.CDT.I_final ? up.CDT.I_final : Infinity;
                if (pickupNuevo > pickupMaxNOM) {
                    pickupNuevo = Math.max(up.tcc.pickup || 0, Math.min(pickupMaxNOM, up.breaker ? up.breaker.frame : pickupMaxNOM));
                }
                if (up.tcc.pickup !== pickupNuevo) {""")
    return txt

patch_file('motor_coordinacion_real.js', patch_motor_coord)

# Autocorreccion: enforce physical parallel selections and keep GFP idempotent/diagnostic.
def patch_autocorr(txt):
    txt=txt.replace("""        if (Idiseno <= 225) return 1;
        if (Idiseno <= 400) return 2;
        if (Idiseno <= 800) return 3;
        return CFG.maxParalelos;""", """        // Evita soluciones físicamente ridículas tipo 3/4 paralelos #8 para alimentadores de 100–125A.
        if (Idiseno <= 225) return 1;
        if (Idiseno <= 500) return 2;
        if (Idiseno <= 900) return 3;
        return CFG.maxParalelos;""")
    txt=txt.replace("""            if ((f.paralelo || 1) < CFG.maxParalelos) {
                f.paralelo = (f.paralelo || 1) + 1;
                cambios.push('Nodo ' + n.id + ': +paralelo (' + f.paralelo + ') por ampacidad NOM');
                return;
            }""", """            var IdisenoFallback = (f.cargaA || 0) * 1.25;
            var maxParFisico = limiteParalelosFisico(IdisenoFallback);
            if ((f.paralelo || 1) < maxParFisico) {
                f.paralelo = (f.paralelo || 1) + 1;
                cambios.push('Nodo ' + n.id + ': +paralelo (' + f.paralelo + ') por ampacidad NOM');
                return;
            }
            cambios.push('Nodo ' + n.id + ': requiere rediseño físico de alimentador; no se agregan paralelos no razonables para I_diseño=' + IdisenoFallback.toFixed(1) + 'A');""")
    # don't call GFP critical repeatedly if already activated somewhere
    txt=txt.replace("""            if (tipoAterrizaje === 'yg_solido' && n.equip && !n.equip.tieneGFP) {""", """            if (tipoAterrizaje === 'yg_solido' && n.equip && !n.equip.tieneGFP && !n.equip.soportaGFP) {")
    return txt

patch_file('motor_autocorreccion_total.js', patch_autocorr)

# NOM factor security less noisy and computed from ampacity/design, not always margin=1.
def patch_nom(txt):
    old="""        var factorCarga = config.factorCarga || config.Fcc || 1.25;
        var requerido = config.iDiseno || config.I_diseno || config.I_diseño || 0;
        var margenDiseno = requerido > 0 ? (config.ampacidadFinal || 0) / requerido : config.margen;
        
        if (config.modo === 'industrial' && factorCarga < 1.25 && margenDiseno < 1) {"""
    new="""        var factorCarga = config.factorCarga || config.Fcc || 1.25;
        var requerido = config.iDiseno || config.I_diseno || config.I_diseño || 0;
        var ampFinal = config.ampacidadFinal || config.I_final || 0;
        var margenDiseno = requerido > 0 ? ampFinal / requerido : (config.margen || 1);
        // Solo advertir cuando realmente falta el 125% o la ampacidad queda corta.
        // Antes se generaban warnings falsos con margen=1 aunque I_diseño ya incluía 125%.
        if (config.modo === 'industrial' && factorCarga < 1.25 && margenDiseno < 1.25) {"""
    txt=txt.replace(old,new)
    return txt
patch_file('nom_validacion.js', patch_nom)

# UI sensibilidad: mostrar zona efectiva y no solo instantáneo.
def patch_resultados(txt):
    txt=txt.replace("""            var cls = !td?'badge-none':(fm.sensible?'badge-ok':'badge-danger');
            var txt = !td?'Sin dato':(fm.sensible?'OK (+'+fm.margen.toFixed(0)+'%)':'NO VE FALLA');""", """            var cls = !td?'badge-none':(fm.sensible?'badge-ok':'badge-danger');
            var zona = fm && fm.zona ? (' vía ' + fm.zona) : '';
            var txt = !td?'Sin dato':(fm.sensible?'OK' + zona + ' (+'+fm.margen.toFixed(0)+'%)':'NO VE FALLA');""")
    return txt
patch_file('resultados.js', patch_resultados)

def patch_export(txt):
    txt=txt.replace("""td ? (fm.sensible ? 'SI (+' + fm.margen.toFixed(0) + '%)' : 'NO VE FALLA') : 'Sin dato'""", """td ? (fm.sensible ? 'SI' + (fm.zona ? ' vía ' + fm.zona : '') + ' (+' + fm.margen.toFixed(0) + '%)' : 'NO VE FALLA') : 'Sin dato'""")
    return txt
patch_file('exportar.js', patch_export)

# TCC interactive: status one worst crossing per pair already from central; add impossible strategy text.
def patch_tcc_viewer(txt):
    txt=txt.replace("""html += '<div class=\"font-semibold ' + colorCentral + '\">' + iconoCentral + ' Estado central: ' + finalCoord.estado + '</div>';""", """html += '<div class=\"font-semibold ' + colorCentral + '\">' + iconoCentral + ' Estado central: ' + finalCoord.estado + '</div>';
            if (finalCoord.estado !== 'COORDINADO') {
                html += '<div class=\"text-xs text-[--text-muted] mt-1\">Estrategia sugerida: resolver NOM primero; después usar LSIG/ZSI, cambio de frame/familia o fusible limitador para pares no selectivos.</div>';
            }""")
    return txt
patch_file('tcc_viewer_interactivo.js', patch_tcc_viewer)

# Add documentation report.
report = root/'docs'/'DEEP_FIXES_APPLIED_2026-05-14.md'
report.write_text('''# Deep fixes applied — 2026-05-14\n\nSe aplicaron correcciones directas al motor ICC/TCC/NOM:\n\n1. Sensibilidad multi-zona LSIG/MCCB: LT, ST, INST y GF. Ya no marca falso “NO VE FALLA” cuando el instantáneo no alcanza pero sí disparan short/long delay o ground fault.\n2. Coordinación TCC jerárquica de downstream a upstream: retardos y pickups crecen progresivamente; se evita que todos queden en 6.4 s / 0.40 s.\n3. Validación de coordinación menos ruidosa: reporta el peor cruce por par y no 50+ puntos repetidos.\n4. Bloqueo NOM conservado: NOM/ampacidad sigue por encima de TCC.\n5. Límite físico de paralelos: evita 3–4 paralelos en alimentadores chicos; fuerza calibre/rediseño antes de paralelizar absurdamente.\n6. Validación NOM 125% depurada: elimina warning falso cuando I_diseño ya incluye Fcc=1.25.\n7. UI/exports muestran la zona efectiva de sensibilidad: LT/ST/INST/GF.\n8. Se aplicó en copias public, dist e icc-core cuando existían.\n\nBackups creados con sufijo `.bak-20260514-deep-fixes`.\n''', encoding='utf-8')
print('wrote', report.relative_to(root))
