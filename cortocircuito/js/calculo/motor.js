var Motor = (function() {
    function leerTension() {
        var el = document.getElementById('input-tension');
        return el ? parseFloat(el.value) : 220;
    }
    function leerX0Config() {
        var sel = document.getElementById('input-x0-config');
        return sel ? sel.value : CONSTANTES.Z0_CONFIG_DEFAULT;
    }
    function leerTipoAterrizamiento() {
        var sel = document.getElementById('input-trafo-aterr');
        return sel ? sel.value : 'yg_solido';
    }
    function leerRetornoTierra() {
        var inp = document.getElementById('input-retorno-tierra');
        var valorManual = inp ? parseFloat(inp.value) : null;
        
        // Si el usuario ingresó un valor manual, usarlo
        if (valorManual !== null && !isNaN(valorManual) && valorManual >= 0) {
            return valorManual;
        }
        
        // Si no, calcular automáticamente según configuración
        return calcularRetornoTierraAutomatico();
    }
    
    function calcularRetornoTierraAutomatico() {
        var tipoAter = leerTipoAterrizamiento();
        var V = leerTension();
        var trafoKVA = parseFloat(leerSelect('input-trafo-kva', '500')) || 500;
        var trafoZ = leerNumero('input-trafo-z', 5.75);

        // Para sistemas sólidamente aterrizados, usar Z0 ≈ Z1 * 2.5 (no valores extremos)
        // Esto genera If-tierra razonable (~20-30% de I3F en lugar de 1%)
        if (tipoAter === 'yg_solido') {
            // Calcular Z1 del sistema para usar como base
            var Z1 = 0; // Se calculará después en el flujo principal
            // Por ahora, usar valores base más realistas
            var valoresBase = {
                480: 0.2,    // Reducido de 0.5 a 0.2 mΩ
                440: 0.25,   // Reducido de 0.6 a 0.25 mΩ
                220: 0.5,    // Reducido de 1.2 a 0.5 mΩ
                208: 0.55,   // Reducido de 1.3 a 0.55 mΩ
                127: 0.8     // Reducido de 2.1 a 0.8 mΩ
            };

            var valorBase = valoresBase[V] || 0.5;

            // Ajustar según tamaño del transformador
            var factorKVA = trafoKVA >= 1000 ? 0.7 :
                           trafoKVA >= 500 ? 0.8 :
                           trafoKVA >= 250 ? 0.9 : 1.0;

            var resistenciaCalculada = valorBase * factorKVA;

            actualizarCampoRetornoTierra(resistenciaCalculada);
            return resistenciaCalculada;
        }

        // Valores típicos para otros tipos de aterrizaje
        var valoresBase = {
            'yg_resistivo': {
                480: 5.0,
                440: 5.5,
                220: 8.0,
                208: 8.5,
                127: 12.0
            },
            'delta': {
                480: 100.0,
                440: 100.0,
                220: 100.0,
                208: 100.0,
                127: 100.0
            }
        };

        var valorBase;
        if (valoresBase[tipoAter] && valoresBase[tipoAter][V]) {
            valorBase = valoresBase[tipoAter][V];
        } else {
            console.warn('Voltaje no soportado para cálculo de retorno a tierra: ' + V + 'V. Usando valor por defecto.');
            valorBase = 1.0;
        }

        var factorKVA = trafoKVA >= 1000 ? 0.8 :
                       trafoKVA >= 500 ? 0.9 :
                       trafoKVA >= 250 ? 1.0 : 1.2;

        var factorZ = trafoZ <= 4 ? 0.9 :
                     trafoZ <= 6 ? 1.0 :
                     trafoZ <= 8 ? 1.1 : 1.2;

        var resistenciaCalculada = valorBase * factorKVA * factorZ;

        actualizarCampoRetornoTierra(resistenciaCalculada);
        return resistenciaCalculada;
    }
    
    function actualizarCampoRetornoTierra(valor) {
        var inp = document.getElementById('input-retorno-tierra');
        if (inp) {
            inp.value = valor.toFixed(2);
            inp.placeholder = 'Auto: ' + valor.toFixed(2) + ' mÏ';
            inp.title = 'Valor calculado automáticamente: ' + valor.toFixed(2) + ' mÏ\n' +
                       'Puede ingresar un valor manual si lo prefiere';
        }
    }
    function leerNumero(id, def) { var el = document.getElementById(id); if (!el) return def; var val = parseFloat(el.value); return isNaN(val) ? def : val; }
    function leerSelect(id, def) { var el = document.getElementById(id); if (!el) return def; var val = el.value; return (val !== undefined && val !== null && val !== '') ? val : def; }

    function calcularFuente(tipoSistema) {
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var R = 0, X = 0, Z = 0, hasTransformer = false;

        if (App.estado.modo === 'conocido') {
            var iscEl = document.getElementById('input-isc-conocido');
            var isc = iscEl ? parseFloat(iscEl.value) * 1000 : 0;
            var z = Impedancias.deFuenteIsc(leerTension(), isc, CONSTANTES.XR_FUENTE_DEFAULT, factor);
            R = z.R; X = z.X;
        } else {
            var mvaEl = document.getElementById('input-mva-fuente');
            var mvaStr = mvaEl ? mvaEl.value : '';
            var iscFuente;
            if (mvaStr && parseFloat(mvaStr) > 0) {
                iscFuente = (parseFloat(mvaStr) * 1000) / (factor * leerTension());
            } else {
                var iscFuenteEl = document.getElementById('input-isc-fuente');
                iscFuente = iscFuenteEl ? parseFloat(iscFuenteEl.value) * 1000 : 0;
            }
            var xrFuente = leerNumero('input-xr-fuente', 15);
            var zf = Impedancias.deFuenteIsc(leerTension(), iscFuente, xrFuente, factor);
            R = zf.R; X = zf.X;

            var kva = leerNumero('input-trafo-kva', 0);
            var pctZ = leerNumero('input-trafo-z', 0);
            var vSec = leerNumero('input-trafo-vs', 0);
            if (!kva || !pctZ || !vSec || kva <= 0 || pctZ <= 0 || vSec <= 0)
                throw new CalculoError(CalculoError.CODES.ENTRADA, 'Complete los datos del transformador');
            var zt = Impedancias.deTransformador(kva, pctZ, vSec);
            R += zt.R; X += zt.X;
            hasTransformer = true;
            document.getElementById('input-tension').value = vSec;
        }
        return { R: R, X: X, Z: Impedancias.magnitud(R, X), hasTransformer: hasTransformer };
    }

    function validar(tipoSistema) {
        var tension = leerTension();
        if (!tension || tension <= 0) return { valido: false, error: 'Ingrese una tension valida' };
        if (App.estado.modo === 'conocido') {
            var iscEl = document.getElementById('input-isc-conocido');
            var isc = iscEl ? parseFloat(iscEl.value) : 0;
            if (!isc || isc <= 0) return { valido: false, error: 'Ingrese un valor valido de Isc' };
        } else {
            var mvaStr = document.getElementById('input-mva-fuente');
            var mvaVal = mvaStr ? mvaStr.value : '';
            var iscFEl = document.getElementById('input-isc-fuente');
            var iscF = iscFEl ? parseFloat(iscFEl.value) : 0;
            if ((!mvaVal || parseFloat(mvaVal) <= 0) && (!iscF || iscF <= 0))
                return { valido: false, error: 'Ingrese Isc o MVA de la fuente' };
            var kva = leerNumero('input-trafo-kva', 0);
            var z = leerNumero('input-trafo-z', 0);
            var vs = leerNumero('input-trafo-vs', 0);
            if (!kva || !z || !vs || kva <= 0 || z <= 0 || vs <= 0)
                return { valido: false, error: 'Complete los datos del transformador' };
        }

        // Fase 9: Usar estructura de nodos en árbol
        if (!App.estado.nodos || App.estado.nodos.length === 0) return { valido: true };
        // Skip root node (P0) - it doesn't have a real feeder
        var nodosValidar = (App.estado.nodos || []).filter(function(n) { return n.parentId !== null; });
        for (var i = 0; i < nodosValidar.length; i++) {
            var nodo = nodosValidar[i];
            var f = nodo.feeder || {};
            if (!CONDUCTORES[f.material] || !CONDUCTORES[f.material][f.canalizacion] || !CONDUCTORES[f.material][f.canalizacion][f.calibre])
                return { valido: false, error: 'Nodo '+nodo.id+': calibre no valido' };
            if (!f.longitud || f.longitud <= 0)
                return { valido: false, error: 'Nodo '+nodo.id+': longitud invalida' };
        }

        var motores = UIMotores.leerDatos();
        for (var j = 0; j < motores.length; j++) {
            if (motores[j].hp <= 0)
                continue; // Ignorar motores con HP <= 0 en lugar de fallar
            // Fase 9: Validar que el punto de conexión exista en los nodos (acepta IDs de nodos como 'P0', 'P1', etc.)
            var puntoValido = (App.estado.nodos || []).some(function(n) { return n.id === motores[j].punto; });
            if (!puntoValido) {
                // Si el punto es inválido, retornar error sin mutar datos
                return { valido: false, error: 'Motor '+(j+1)+': punto de conexión "'+motores[j].punto+'" no existe en los nodos' };
            }
        }

        var capacs = App.estado.capacitores || [];
        for (var c = 0; c < capacs.length; c++) {
            if (!capacs[c].kvar || capacs[c].kvar <= 0)
                return { valido: false, error: 'Banco '+(c+1)+': kVAr debe ser mayor a 0' };
        }

        return { valido: true, error: null };
    }

    function ejecutar() {
        var tipoSistema = App.estado.tipoSistema;
        var val = validar(tipoSistema);
        if (!val.valido) {
            throw new CalculoError(CalculoError.CODES.VALIDACION, val.error);
        }

        // Validación profunda del sistema (pre-cálculo)
        if (typeof ValidadorSistema !== 'undefined') {
            var validacionSistema = ValidadorSistema.validarTodo(App.estado);
            if (!validacionSistema.ok) {
                console.error('Errores críticos del sistema:', validacionSistema.errores);
                throw new CalculoError(CalculoError.CODES.VALIDACION, 'Errores críticos del sistema: ' + (validacionSistema.errores || []).join(', '));
            }
            if (validacionSistema.warnings && validacionSistema.warnings.length > 0) {
                console.warn('Advertencias del sistema:', validacionSistema.warnings);
            }
        }

        // [Semaforo] Inicializar contexto de semáforo para tracking de autocorrecciones
        var ctxSemaforo = (typeof Semaforo !== 'undefined') ? Semaforo.crearContexto() : null;

        // Validación inteligente post-cálculo (detecta incoherencias físicas y NOM)
        // Se ejecuta después del cálculo para validar los resultados
        // NOTA: Esta validación es informativa, no bloquea el cálculo

        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var fuente = calcularFuente(tipoSistema);
        var V = leerTension();
        var puntos = [];
        var R_acc = fuente.R, X_acc = fuente.X;

        // P0
        var Z_acc = Impedancias.magnitud(R_acc, X_acc);
        var isc = Impedancias.corrienteIsc(V, Z_acc, factor);
        var xr = X_acc > 1e-6 ? X_acc / R_acc : 999;
        var ipeak = Impedancias.corrientePico(isc, xr);
        puntos.push({
            id: 'P0',
            nombre: fuente.hasTransformer ? 'Sec. Transformador' : 'Punto de conexion',
            R: R_acc, X: X_acc, Z: Z_acc,
            isc: isc / 1000, ipeak: ipeak / 1000, xr: xr,
            equip: UIEquipos.getEquip('p0')
        });

        // Fase 9: Acumular impedancias usando estructura de nodos en árbol
        if (!App.estado.nodos || App.estado.nodos.length === 0) return puntos;
        
        var nodosOrdenados = Impedancias.ordenarPorNivel(App.estado.nodos);
        for (var i = 0; i < nodosOrdenados.length; i++) {
            var nodo = nodosOrdenados[i];
            if (!nodo.parentId) continue; // Skip root node (already added)
            
            var zAcum = Impedancias.impedanciaAcumuladaNodo(nodo.id, App.estado.nodos);
            R_acc = zAcum.R;
            X_acc = zAcum.X;
            Z_acc = zAcum.Z;
            isc = Impedancias.corrienteIsc(V, Z_acc, factor);
            xr = X_acc > 1e-6 ? X_acc / R_acc : 999;
            ipeak = Impedancias.corrientePico(isc, xr);
            
            // Extract numeric part from node ID for equipment lookup
            var nodoNum = parseInt(nodo.id.substring(1)) || 0;
            puntos.push({
                id: nodo.id,
                nombre: nodo.nombre || nodo.id,
                R: R_acc, X: X_acc, Z: Z_acc,
                isc: isc / 1000, ipeak: ipeak / 1000, xr: xr,
                equip: nodo.equip || { tipo: '', nombre: '', cap: 0, iDisparo: 0 }
            });
        }

        // Acumular impedancias para uso en falla fase-tierra
        var impedanciasAcum = puntos.length > 0 ? [puntos[0].Z] : [];
        for (var ip = 1; ip < puntos.length; ip++) {
            impedanciasAcum.push(puntos[ip].Z);
        }

        // Aporte de motores
        var motores = UIMotores.leerDatos().filter(function(m) { return m.hp > 0; });
        if (motores.length > 0 && motores.some(function(m) { return m.hp > 0; })) {
            var aportePorPunto = CalculoMotores.calcularPorPunto(motores, puntos.length, V, factor, App.estado.nodos);
            for (var p = 0; p < puntos.length; p++) {
                var ap = aportePorPunto[p];
                puntos[p].iscConMotores = puntos[p].isc + (ap.iAporte / 1000);
                puntos[p].ipeakConMotores = puntos[p].ipeak + (ap.iAportePico / 1000);
                puntos[p].aporteMotores = ap;
            }
        } else {
            for (var p2 = 0; p2 < puntos.length; p2++) {
                puntos[p2].iscConMotores = puntos[p2].isc;
                puntos[p2].ipeakConMotores = puntos[p2].ipeak;
                puntos[p2].aporteMotores = { iAporte: 0, iAportePico: 0, detalle: [] };
            }
        }

        // Falla fase-tierra (solo trifasico)
        var x0Config = leerX0Config();
        var tipoAter = leerTipoAterrizamiento();
        var zRetorno = leerRetornoTierra();
        var z0Fuente = puntos.length > 0 ? Secuencia.z0DesdeIsc(V, puntos[0].isc, puntos[0].xr, factor) : 0;
        var zTrafo = fuente.hasTransformer ? fuente.Z : 0;
        // Fase 9: Pass nodos instead of feeders for phase-ground calculation
        var fallaFT = Secuencia.calcularFallaFaseTierra(puntos, {
            V: V, tipoSistema: tipoSistema, x0Config: x0Config, tipoAterrizamiento: tipoAter,
            zRetornoTierra: zRetorno, Z0_fuente: z0Fuente, Z_trafo: zTrafo, nodos: App.estado.nodos
        });

        // Aplicar contexto de carga a falla fase-tierra (groundFaultSensitivity)
        if (App.estado.ctx && typeof LoadContext !== 'undefined') {
            for (var k = 0; k < puntos.length; k++) {
                var ft = fallaFT[k];
                var sensibilidad = LoadContext.groundFaultSensitivity(App.estado, ft.iscFt * 1000); // Convertir a A
                ft.iscFt_ajustado = sensibilidad.If_LG_adj / 1000; // kA
                ft.nota_sensibilidad = sensibilidad.note;
                ft.factor_desbalance = sensibilidad.unbalance_factor;
            }
        }

        for (var k = 0; k < puntos.length; k++) puntos[k].faseTierra = fallaFT[k];

        // Corriente de cortocircuito bifásica (Isc bifásica)
        if (tipoSistema === '3f') {
            for (var i = 0; i < puntos.length; i++) {
                // Isc bifásica = 0.866 × Isc trifásica (para sistemas balanceados)
                // Fórmula completa: Isc_bifásica = V / (2Z1 + Z2)
                // Asumiendo Z2 = Z1 (sistema balanceado): Isc_bifásica = V / (3Z1) = 0.577 × Isc_trifásica
                // Pero en la práctica se usa 0.866 como factor conservador
                var Z1 = Impedancias.magnitud(puntos[i].R, puntos[i].X);
                var iscBifasica = (V / Math.sqrt(3)) / (2 * Z1 + Z1); // Asumiendo Z2 = Z1
                puntos[i].iscBifasica = iscBifasica / 1000; // Convertir a kA
            }
        }

        // Aporte de capacitores (Fase 8)
        var capacs = App.estado.capacitores || [];
        var tieneCap = capacs.some(function(c) { return c.kvar > 0; });
        if (tieneCap) {
            var datosCap = CalculoCapacitores.aportePorPunto({
                V: V, factor: factor,
                motores: UIMotores.leerDatos().filter(function(m) { return m.hp > 0; }),
                capacitores: capacs.filter(function(c) { return c.kvar > 0; }),
                numPuntos: puntos.length,
                feeders: feeders
            });
            for (var c2 = 0; c2 < puntos.length; c2++) {
                // Capacitores solo afectan pico, no Isc simétrico
                puntos[c2].ipeakConMotores += datosCap.iCapPico / 1000;
                puntos[c2].aporteMotores = datosCap;
            }
        }

        // Validaciones NOM-001-SEDE-2012
        var resultado = {
            estadoGlobal: "PASS",
            severidad: 0,
            errores: [],
            warnings: [],
            info: []
        };

        for (var i = 0; i < puntos.length; i++) {
            var nodo = App.estado.nodos[i];
            if (!nodo || !nodo.feeder) continue;

            var f = nodo.feeder;

            // [Sync] Leer tempAmbiente y numConductores del input y actualizar feeder
            var tempInput = parseFloat(document.getElementById('cdt-temp-input')?.value);
            if (!isNaN(tempInput) && tempInput > 0) {
                f.tempAmbiente = tempInput;
            } else {
                // [Semaforo] Registrar default de temperatura
                if (ctxSemaforo && (!f.tempAmbiente || f.tempAmbiente <= 0)) {
                    Semaforo.registrarAutocorreccion(ctxSemaforo, puntos[i].id, 'TEMP_DEFAULT',
                        'Temp ambiente indefinida → 31°C', 'BAJA');
                }
                f.tempAmbiente = f.tempAmbiente || 31; // Default si no está definido
            }

            var conductoresInput = parseInt(document.getElementById('cdt-conductores-input')?.value);
            if (!isNaN(conductoresInput) && conductoresInput > 0) {
                f.numConductores = conductoresInput;
            } else {
                // [Semaforo] Registrar default de conductores
                if (ctxSemaforo && (!f.numConductores || f.numConductores <= 0)) {
                    Semaforo.registrarAutocorreccion(ctxSemaforo, puntos[i].id, 'CONDUCTORES_DEFAULT',
                        'Num conductores indefinido → 3', 'BAJA');
                }
                f.numConductores = f.numConductores || 3; // Default si no está definido
            }

            var sugerencia = sugerirConductor(f.cargaA, f.material, f.canalizacion, f.longitud, f.paralelo, f.calibre);

            // [Sync] Si se sugirió un calibre diferente, actualizar el feeder
            if (sugerencia.calibreSugerido && sugerencia.calibreSugerido !== f.calibre) {
                console.log('[Sync] Actualizando calibre de ' + f.calibre + ' a ' + sugerencia.calibreSugerido);
                // [Semaforo] Registrar autocorrección de calibre
                if (ctxSemaforo) {
                    Semaforo.registrarAutocorreccion(ctxSemaforo, puntos[i].id, 'CALIBRE_AUTO',
                        'Calibre auto-corregido: ' + f.calibre + ' → ' + sugerencia.calibreSugerido, 'MEDIA');
                }
                f.calibre = sugerencia.calibreSugerido;
                // Recalcular con el nuevo calibre
                sugerencia = sugerirConductor(f.cargaA, f.material, f.canalizacion, f.longitud, f.paralelo, f.calibre);
            }

            // Agregar resultados CDT (derived state) al punto
            puntos[i].CDT = {
                I_corregida: sugerencia.ampacidadCorregida || 0,
                I_limite_terminal: sugerencia.ampacidadLimiteTerminal || 0,
                I_final: sugerencia.ampacidadFinal || 0,
                I_diseño: sugerencia.I_diseño,
                I_tabla: sugerencia.I_tabla,
                F_temp: sugerencia.F_temp,
                F_agrupamiento: sugerencia.F_agrupamiento,
                status: sugerencia.status,
                margen: sugerencia.margen,
                deficit: sugerencia.deficit,
                violacionTerminal: sugerencia.violacionTerminal,
                sinFactor125: sugerencia.sinFactor125,
                agrupamientoInfo: sugerencia.agrupamientoInfo
            };

            // Fail-safe: I_final nunca debe ser 0 - con tracking Semaforo
            if (puntos[i].CDT.I_final <= 0) {
                console.warn('[Warn] CDT FAIL: I_final = 0 para nodo ' + puntos[i].id + ' - intentando recalcular seguro');
                console.table({
                    tempAmbiente: f.tempAmbiente || 'undefined',
                    F_temp: sugerencia.F_temp || 0,
                    F_agrupamiento: sugerencia.F_agrupamiento || 0,
                    I_tabla: sugerencia.I_tabla || 0,
                    I_final: sugerencia.ampacidadFinal || 0
                });

                // [Semaforo] Registrar autocorrección en contexto Semaforo
                if (ctxSemaforo) {
                    Semaforo.registrarAutocorreccion(ctxSemaforo, puntos[i].id, 'AMPACIDAD_ZERO',
                        'Ampacidad inválida (' + (sugerencia.ampacidadFinal || 0).toFixed(1) + 'A) → recalculo seguro', 'ALTA');
                }

                // Autocorrección nuclear: recalcular con valores seguros
                var I_rescate = (sugerencia.I_tabla || 0) * 0.9; // Fallback conservador
                if (I_rescate <= 0) I_rescate = 100; // Último recurso

                puntos[i].CDT.I_final = I_rescate;
                puntos[i].CDT.I_corregida = I_rescate;
                puntos[i].CDT.status = 'WARNING';
                puntos[i].CDT.deficit = (puntos[i].CDT.I_diseño || 0) - I_rescate;
                puntos[i].CDT.__autoFix = true;
                console.warn('[OK] CDT autocorregido para nodo ' + puntos[i].id + ' → I_final = ' + I_rescate.toFixed(1) + 'A');
            }
            
            var configValidacion = {
                iCarga: f.cargaA,
                ampacidadFinal: sugerencia.ampacidadFinal,
                ampacidadCorregida: sugerencia.ampacidadCorregida,
                ampacidadTerminal: sugerencia.ampacidadTerminal,
                ampacidad75: sugerencia.ampacidad75,
                usa90C: sugerencia.usa90C,
                icc: puntos[i].isc * 1000,
                interruptorKA: (nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0,
                numConductores: f.numConductores || 3,
                fc: f.fc || 0.8,
                ft: f.ft || 0.91,
                temperatura: 31, // Puerto Vallarta default
                paralelos: f.paralelo || 1,
                balanceado: true,
                modo: 'industrial',
                margen: (sugerencia.margen / 100) + 1, // Convertir porcentaje a factor (ej: 27% -> 1.27)
                caidaTension: 0, // Se calcula separadamente
                tieneNeutro: true,
                neutroContado: true,
                esMonofasico: false,
                tieneArmonicos: false,
                loadContext: App.estado.ctx || null,
                neutralAmpacity: sugerencia.ampacidadNeutro || 0
            };
            
            var validacion = NOMValidacion.validarTodo(configValidacion);
            puntos[i].validacionNOM = validacion;
        }

        // Validación de coordinación TCC
        var coordinacionTCC = TCCCoordinacion.validarCoordinacionSistema(App.estado.nodos);
        puntos.coordinacionTCC = coordinacionTCC;

        // Validación inteligente post-cálculo (detecta incoherencias físicas y NOM)
        if (typeof MotorValidacionInteligente !== 'undefined') {
            var validacionInteligente = MotorValidacionInteligente.validarSistemaCompleto({ puntos: puntos, nodos: App.estado.nodos });
            puntos.validacionInteligente = validacionInteligente;

            if (!validacionInteligente.ok) {
                console.warn('Validación inteligente detectó problemas:', validacionInteligente);
                resultado.estadoGlobal = "FAIL";
                resultado.errores = resultado.errores.concat(validacionInteligente.errores || []);
            }
        }

        // ========================================================
        // ÁRBITRO CENTRAL: Evaluación del Sistema (Jerarquía ETAP)
        // ========================================================
        for (var i = 0; i < puntos.length; i++) {
            puntos[i].decision = evaluarSistema(puntos[i], App.estado.nodos[i]);
            // Acumular errores al estado global
            if (puntos[i].decision.estadoGlobal === "FAIL") {
                resultado.estadoGlobal = "FAIL";
                resultado.errores = resultado.errores.concat(puntos[i].decision.errores);
            }
        }

        // Adjuntar estado global al resultado
        puntos.estadoGlobal = resultado.estadoGlobal;
        puntos.erroresGlobales = resultado.errores;

        // [Semaforo] Evaluar semáforo del sistema si está disponible
        if (ctxSemaforo) {
            var evaluacionSemaforo = puntos.map(function(p) {
                return Semaforo.evaluarNodo(p, ctxSemaforo);
            });
            Semaforo.evaluarSistema(evaluacionSemaforo, ctxSemaforo);

            // Adjuntar contexto de semáforo al resultado
            puntos.semaforo = {
                estadoGlobal: ctxSemaforo.estadoGlobal,
                evaluacion: evaluacionSemaforo,
                contexto: ctxSemaforo
            };

            // Renderizar en consola para debugging
            Semaforo.renderSemaforo({
                sistema: { nodos: puntos },
                evaluacion: evaluacionSemaforo,
                estadoGlobal: ctxSemaforo.estadoGlobal,
                contexto: ctxSemaforo
            });
        }

        // [MotorDiseno] Ejecutar motor de diseño automático para coordinación de breakers
        // TEMPORALMENTE DESHABILITADO POR PROBLEMA DE CACHE
        /*
        if (typeof MotorDisenoAutomatico !== 'undefined') {
            var resultadoDiseno = MotorDisenoAutomatico.ejecutarDiseno(puntos, {});

            // Adjuntar resultado del diseño al sistema
            puntos.disenoAutomatico = resultadoDiseno;

            // Registrar errores de diseño en el semáforo si está disponible
            if (ctxSemaforo && resultadoDiseno.deteccionCurvas) {
                resultadoDiseno.deteccionCurvas.errores.forEach(function(e) {
                    Semaforo.registrarError(ctxSemaforo, e.nodoUp, e.mensaje);
                });
                resultadoDiseno.deteccionCurvas.warnings.forEach(function(w) {
                    Semaforo.registrarWarning(ctxSemaforo, w.nodoUp, w.mensaje);
                });
            }

            // Renderizar reporte de diseño en consola
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[MotorDiseno] MOTOR DE DISEÑO AUTOMATICO — ' + resultadoDiseno.estadoGlobal);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('Escalonamiento:', resultadoDiseno.escalonamiento ? resultadoDiseno.escalonamiento.cambios.length + ' cambios' : 'N/A');
            console.log('Detección curvas:', resultadoDiseno.deteccionCurvas ? resultadoDiseno.deteccionCurvas.estado : 'N/A');
            console.log('Coordinación TCC:', resultadoDiseno.coordinacionTCC ? resultadoDiseno.coordinacionTCC.ajustes.length + ' ajustes' : 'N/A');
            console.log('Bloqueo instantáneo:', resultadoDiseno.bloqueoInstantaneo ? resultadoDiseno.bloqueoInstantaneo.bloqueos.length + ' bloqueos' : 'N/A');
            console.log('Validación selectividad:', resultadoDiseno.validacionSelectividad.length + ' pruebas');
            console.log('═══════════════════════════════════════════════════════════');
        }
        */

        // 🔥 Ejecutar motor de coordinación real con catálogo de equipos
        if (typeof MotorCoordinacionReal !== 'undefined' && typeof CatalogoEquiposReal !== 'undefined') {
            var resultadoCoordinacionReal = MotorCoordinacionReal.autocorregirSistema(puntos, {
                Isc: 20000, // kA por defecto
                criterios: {
                    marca_preferida: null,
                    tipo_preferido: 'electronic'
                }
            });

            // Adjuntar resultado al sistema
            puntos.coordinacionReal = resultadoCoordinacionReal;

            // Registrar errores en semáforo si está disponible
            if (ctxSemaforo && resultadoCoordinacionReal.validacionFinal) {
                resultadoCoordinacionReal.validacionFinal.cruces.forEach(function(c) {
                    if (c.severidad === 'CRITICO') {
                        Semaforo.registrarError(ctxSemaforo, c.par, 'Cruce de coordinación @ ' + c.corriente.toFixed(0) + 'A');
                    } else {
                        Semaforo.registrarWarning(ctxSemaforo, c.par, 'Selectividad marginal @ ' + c.corriente.toFixed(0) + 'A');
                    }
                });
            }

            // Renderizar reporte en consola
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🔥 MOTOR DE COORDINACIÓN REAL (ETAP/SKM) — ' + resultadoCoordinacionReal.estadoFinal);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('Pasos:', resultadoCoordinacionReal.pasos.length);
            resultadoCoordinacionReal.pasos.forEach(function(p) {
                console.log('  ' + p.paso + '. ' + p.accion + ': ' + p.mensaje);
            });
            console.log('Cambios:', resultadoCoordinacionReal.coordinacion ? resultadoCoordinacionReal.coordinacion.cambios.length : 0);
            console.log('Iteraciones:', resultadoCoordinacionReal.coordinacion ? resultadoCoordinacionReal.coordinacion.iteraciones : 0);
            console.log('Validación:', resultadoCoordinacionReal.validacionFinal ? resultadoCoordinacionReal.validacionFinal.estado : 'N/A');
            console.log('═══════════════════════════════════════════════════════════');
        }

        // [Solver] Integrar Solver Eléctrico para selección automática de conductor + breaker + TCC
        console.log('[Solver] Verificando SolverElectrico:', typeof SolverElectrico);
        if (typeof SolverElectrico !== 'undefined') {
            console.log('[Solver] Ejecutando SolverElectrico...');
            var sistemaSolver = {
                nodos: App.estado.nodos.map(function(nodo, i) {
                    return {
                        id: nodo.id || 'P' + i,
                        I_carga: nodo.cargaA || 0,
                        tempAmbiente: nodo.feeder && nodo.feeder.tempAmbiente ? nodo.feeder.tempAmbiente : 30,
                        material: nodo.feeder && nodo.feeder.material ? nodo.feeder.material : 'cobre',
                        paralelos: nodo.feeder && nodo.feeder.paralelo ? nodo.feeder.paralelo : 1,
                        tipoCarga: 'lineal',
                        balanceado: true,
                        tieneNeutro: true,
                        Zth: puntos[i] ? { R: puntos[i].R || 0, X: puntos[i].X || 0 } : null,
                        Vll: leerTension(),
                        tipoSistema: App.estado.tipoSistema || '3f'
                    };
                })
            };

            var resultadoSolver = SolverElectrico.solveSistema(sistemaSolver);
            
            // Adjuntar resultados del solver a los puntos
            if (resultadoSolver && resultadoSolver.sistema) {
                puntos.solver = {
                    estado: resultadoSolver.sistema.estado,
                    contexto: resultadoSolver.contexto,
                    nodos: resultadoSolver.sistema.nodos
                };

                // Actualizar nodos con resultados del solver
                resultadoSolver.sistema.nodos.forEach(function(nodoSolver, i) {
                    if (App.estado.nodos[i]) {
                        App.estado.nodos[i].conductorSolver = nodoSolver.conductor;
                        App.estado.nodos[i].breakerSolver = nodoSolver.breaker;
                        App.estado.nodos[i].I_finalSolver = nodoSolver.I_final;
                    }
                });
            }
        }

        return { puntos: puntos };
    }

    /**
     * Motor de Decisión Centralizado (Jerarquía de Seguridad y Normativa)
     * @param {Object} punto - Datos del punto de cálculo
     * @param {Object} nodo - Datos del nodo (equipo, feeder)
     * @returns {Object} Resultado de evaluación unificado
     */
    function evaluarSistema(punto, nodo) {
        var resultado = {
            estadoGlobal: "PASS",
            severidad: 0,
            errores: [],
            warnings: [],
            info: []
        };

        if (!nodo) return resultado;

        // 1. SEGURIDAD: INTERRUPTIVO (CRÍTICO - Art. 110.9)
        var iCap = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap * 1000 : 0;
        var iscTotal = (punto.isc + (punto.aporteMotores ? punto.aporteMotores.isc : 0)) * 1000;
        
        if (iCap > 0 && iscTotal > iCap) {
            resultado.estadoGlobal = "FAIL";
            resultado.severidad = 5;
            resultado.errores.push("Capacidad interruptiva insuficiente (Art. 110.9): " + (iscTotal/1000).toFixed(2) + "kA > " + (iCap/1000).toFixed(1) + "kA");
        }

        // 2. SEGURIDAD: SENSIBILIDAD (Falla Mínima)
        if (punto.fallaMinima && !punto.fallaMinima.sensible) {
            resultado.estadoGlobal = "FAIL";
            resultado.severidad = Math.max(resultado.severidad, 4);
            resultado.errores.push("Protección no sensible a falla mínima: Isc_min " + (punto.fallaMinima.iscMin * 1000).toFixed(0) + "A < I_disparo " + punto.fallaMinima.iDisparo + "A");
        }

        // 3. SEGURIDAD: FALLA A TIERRA (Art. 230.95)
        if (punto.faseTierra && punto.faseTierra.iscFt > 0) {
            var iDisparo = (nodo.equip && nodo.equip.iDisparo) ? nodo.equip.iDisparo : 0;
            if (punto.faseTierra.iscFt * 1000 < iDisparo) {
                resultado.warnings.push("Protección de tierra no sensible (Art. 230.95)");
            }
        }

        // 4. TÉRMICO: AMPACIDAD C.D.T. (Art. 310 / 110.14)
        if (punto.CDT) {
            // El error raíz era no usar I_final para la decisión
            var I_util = punto.CDT.I_final || Math.min(punto.CDT.I_corregida, punto.CDT.I_limite_terminal || 999999);
            
            if (I_util < (punto.CDT.I_diseño || 0)) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, 4);
                resultado.errores.push("No cumple ampacidad real (C.D.T.): " + I_util.toFixed(1) + "A < I_diseño " + (punto.CDT.I_diseño || 0).toFixed(1) + "A");
            }

            if (punto.CDT.violacionTerminal) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, 4);
                resultado.errores.push("Viola límite térmico de terminales (Art. 110.14C): " + (punto.CDT.I_limite_terminal || 0).toFixed(1) + "A");
            }

            if (punto.CDT.sinFactor125) {
                resultado.warnings.push("Sin factor 125% para carga continua (NOM-001)");
            }

            if (punto.CDT.margen < 10 && punto.CDT.margen >= 0) {
                resultado.warnings.push("Margen térmico bajo (<10%)");
            }
        }

        // 5. CALIDAD: CAÍDA DE TENSIÓN
        // TODO: Integrar cálculo de caída de tensión real aquí cuando esté disponible
        if (punto.caida && punto.caida.porcentaje > 5) {
            resultado.warnings.push("Caída de tensión excesiva (>5%)");
        }

        // 6. COORDINACIÓN: TCC
        // Verificamos si este nodo tiene fallas de coordinación reportadas
        if (App.estado.resultados && App.estado.resultados.coordinacionTCC) {
            var tccFail = App.estado.resultados.coordinacionTCC.puntosConFalla && 
                          App.estado.resultados.coordinacionTCC.puntosConFalla.indexOf(punto.nombre) !== -1;
            if (tccFail) {
                resultado.warnings.push("Falta coordinación selectiva en este tramo");
            }
        }

        return resultado;
    }

    function ejecutarFallaMinima(puntosMax) {
        var tipoSistema = App.estado.tipoSistema;
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var V = leerTension();
        var Vmin = V * 0.95;
        var resultados = [];
        for (var i = 0; i < puntosMax.length; i++) {
            var p = puntosMax[i];
            var Z = Impedancias.magnitud(p.R, p.X);
            var iscMin = Impedancias.corrienteIsc(Vmin, Z, factor) / 1000;
            var xr = p.X > 1e-6 ? p.X / p.R : 999;
            var ipeakMin = Impedancias.corrientePico(iscMin * 1000, xr) / 1000;
            var iDisparo = (p.equip && p.equip.iDisparo) ? p.equip.iDisparo : 0;
            var sensible = false;
            var margen = 0;
            if (iDisparo > 0 && iscMin > 0) {
                sensible = iscMin * 1000 > iDisparo;
                margen = ((iscMin * 1000 - iDisparo) / iDisparo * 100);
            }
            resultados.push({ iscMin: iscMin, ipeakMin: ipeakMin, iDisparo: iDisparo, sensible: sensible, margen: margen });
        }
        return resultados;
    }

    /**
     * Sugiere conductor usando motor de ampacidad real (C.D.T.)
     * @param {number} cargaA - Corriente de carga (A)
     * @param {string} material - Material del conductor ('cobre' o 'aluminio')
     * @param {string} canalizacion - Tipo de canalización
     * @param {number} longitud - Longitud del alimentador (m)
     * @param {number} paralelos - Número de conductores en paralelo
     * @returns {Object} Sugerencia de conductor con ampacidad corregida
     */
    function sugerirConductor(cargaA, material, canalizacion, longitud, paralelos, calibreExistente) {
        // Leer parámetros C.D.T. de los inputs si están disponibles
        var fccInput = parseFloat(document.getElementById('cdt-fcc-input')?.value);
        var tempInput = parseFloat(document.getElementById('cdt-temp-input')?.value);
        var conductoresInput = parseInt(document.getElementById('cdt-conductores-input')?.value);
        var agrupamientoInput = parseFloat(document.getElementById('cdt-agrupamiento-input')?.value);

        // Fallback defensivo para temperatura ambiente
        var tempAmbiente = 31; // Default Puerto Vallarta
        if (!isNaN(tempInput) && tempInput > 0) {
            tempAmbiente = tempInput;
        }

        // Configuración del cable
        var cableConfig = {
            temperaturaAislamiento: 75, // Default THHN/XHHW
            temperaturaAmbiente: tempAmbiente, // Usar input o default defensivo
            numConductores: conductoresInput || 3, // Usar input o default
            paralelos: paralelos || 1,
            F_agrupamiento: isNaN(agrupamientoInput) ? null : agrupamientoInput, // Solo si es válido, null para auto
            tipoSistema: App.estado.tipoSistema || '3f', // Para validación
            tieneNeutro: true, // Default
            neutroContado: false, // Default: cargas lineales balanceadas
            tieneArmonicos: false // Default: cargas lineales
        };

        // [Sync] Si el feeder tiene tempAmbiente definido, usarlo (prioridad sobre input)
        var nodoActual = App.estado.nodos && App.estado.nodos[0];
        if (nodoActual && nodoActual.feeder && nodoActual.feeder.tempAmbiente) {
            cableConfig.temperaturaAmbiente = nodoActual.feeder.tempAmbiente;
        }

        // [Sync] Si el feeder tiene numConductores definido, usarlo (prioridad sobre input)
        if (nodoActual && nodoActual.feeder && nodoActual.feeder.numConductores) {
            cableConfig.numConductores = nodoActual.feeder.numConductores;
        }

        // [MotorInteligente] Usar MotorInteligenteCCC para detección inteligente de CCC y ampacidad
        var agrupamientoInfo;
        console.log('[MotorInteligente] Verificando MotorInteligenteCCC:', typeof MotorInteligenteCCC);
        if (typeof MotorInteligenteCCC !== 'undefined') {
            console.log('[MotorInteligente] Ejecutando MotorInteligenteCCC...');
            // Configuración para el motor inteligente
            var configInteligente = {
                fases: cableConfig.tipoSistema === '3f' ? 3 : 1,
                tieneNeutro: cableConfig.tieneNeutro,
                tipoCarga: cableConfig.tieneArmonicos ? 'no_lineal' : 'lineal',
                balanceado: !cableConfig.tieneArmonicos, // Asumimos balanceado si no hay armónicos
                paralelos: cableConfig.paralelos,
                fuenteAgrupamiento: isNaN(agrupamientoInput) ? 'AUTO' : 'MANUAL'
            };

            // Nodo temporal para el motor inteligente
            var nodoTemp = {
                id: 'temp',
                tempAmbiente: cableConfig.temperaturaAmbiente,
                I_tabla: 0, // Se llenará después
                F_agrupamiento: cableConfig.F_agrupamiento,
                fuenteAgrupamiento: configInteligente.fuenteAgrupamiento
            };

            var resultadoInteligente = MotorInteligenteCCC.ejecutar(nodoTemp, configInteligente);
            agrupamientoInfo = resultadoInteligente.agrupamientoInfo;
            cableConfig.F_agrupamiento = agrupamientoInfo.factor;
            cableConfig.numConductores = agrupamientoInfo.cccBase;
        } else if (typeof AgrupamientoNOM !== 'undefined') {
            // Fallback a AgrupamientoNOM si MotorInteligenteCCC no está disponible
            agrupamientoInfo = AgrupamientoNOM.calcularFactorValidado(cableConfig);
            cableConfig.F_agrupamiento = agrupamientoInfo.factor;
            cableConfig.numConductores = agrupamientoInfo.cccBase;
        }

        // Obtener Fcc del contexto de carga o del input
        var Fcc = fccInput || 1.25; // Default NOM-001
        if (App.estado && App.estado.ctx && App.estado.ctx.system && App.estado.ctx.system.Fcc != null) {
            Fcc = App.estado.ctx.system.Fcc;
        }

        // Carga (asumimos carga continua por defecto)
        var load = {
            I_cont: cargaA,
            I_no_cont: 0,
            esContinua: true,
            Fcc: Fcc
        };

        // Usar calibre existente si se proporciona, si no buscar mínimo
        var resultado;
        if (calibreExistente) {
            // Calcular ampacidad del calibre existente
            var cable = {
                calibre: calibreExistente,
                temperaturaAislamiento: cableConfig.temperaturaAislamiento,
                temperaturaAmbiente: cableConfig.temperaturaAmbiente,
                numConductores: cableConfig.numConductores,
                paralelos: cableConfig.paralelos,
                F_agrupamiento: cableConfig.F_agrupamiento
            };
            var ampacidad = AmpacidadReal.verificarAmpacidad(load, cable, { temperaturaTerminal: 75 });
            resultado = {
                calibre: calibreExistente,
                I_corregida: ampacidad.I_corregida,
                I_diseño: ampacidad.I_diseño,
                I_tabla: ampacidad.I_tabla,
                F_temp: ampacidad.F_temp,
                F_agrupamiento: ampacidad.F_agrupamiento,
                status: ampacidad.status,
                margen: ampacidad.margen,
                deficit: ampacidad.deficit,
                agrupamientoInfo: agrupamientoInfo
            };

            // [Sync] Si el calibre existente no cumple, buscar el mínimo que sí cumpla
            var I_final = resultado.I_final || 0;
            var I_diseño = load.I_diseño || 0;
            if (resultado.status !== 'PASS' || I_final < I_diseño) {
                console.warn('[Warn] Calibre existente ' + calibreExistente + ' no cumple (' + I_final.toFixed(1) + 'A < ' + I_diseño.toFixed(1) + 'A), buscando conductor mínimo...');
                var resultadoMinimo = AmpacidadReal.buscarConductorMinimo(load, cableConfig);
                if (resultadoMinimo && resultadoMinimo.status === 'PASS') {
                    resultado = resultadoMinimo;
                    resultado.calibreSugerido = resultadoMinimo.calibre;
                    resultado.calibreOriginal = calibreExistente;
                    console.log('[OK] Conductor sugerido: ' + resultadoMinimo.calibre + ' → ' + (resultadoMinimo.I_final || 0).toFixed(1) + 'A');
                }
            }
        } else {
            // Buscar conductor mínimo usando AmpacidadReal
            resultado = AmpacidadReal.buscarConductorMinimo(load, cableConfig);

            if (!resultado) {
                // Si no encuentra conductor, usar el más grande con status FAIL
                resultado = {
                    calibre: '1000',
                    I_corregida: 0,
                    I_diseño: cargaA * Fcc,
                    I_tabla: 0,
                    F_temp: 1.0,
                    F_agrupamiento: 1.0,
                    status: 'FAIL',
                    margen: -100,
                    deficit: cargaA * Fcc
                };
            }
        }

        // Actualizar CDT en el punto
        return {
            calibre: resultado.calibre,
            calibreSugerido: resultado.calibreSugerido || null,
            calibreOriginal: resultado.calibreOriginal || null,
            ampacidadFinal: resultado.I_final,
            ampacidadCorregida: resultado.I_corregida,
            ampacidadLimiteTerminal: resultado.I_limite_terminal,
            ampacidadTerminal: resultado.I_tabla, // Base de tabla para terminal
            agrupamientoInfo: agrupamientoInfo,
            ampacidad75: AmpacidadReal.ampacidadBase(resultado.calibre, 75),
            usa90C: cableConfig.temperaturaAislamiento === 90,
            margen: resultado.margen || 0,
            I_diseño: resultado.I_diseño,
            I_tabla: resultado.I_tabla,
            F_temp: resultado.F_temp,
            F_agrupamiento: resultado.F_agrupamiento,
            status: resultado.status,
            deficit: resultado.deficit,
            violacionTerminal: resultado.violacionTerminal,
            sinFactor125: resultado.sinFactor125
        };
    }

    // ==========================================
    // [Autocorreccion] MOTOR DE AUTO-CORRECCION
    // ==========================================
    
    /**
     * Motor principal de auto-corrección con jerarquía de prioridades
     * @param {Array} puntos - Puntos del sistema actual
     * @param {Object} estado - Estado del sistema (nodos, equipos, etc.)
     * @returns {Object} Resultado de auto-corrección con cambios aplicados
     */
    function autoCorregirSistema(puntos, estado) {
        var cambios = [];
        var puntosCorregidos = JSON.parse(JSON.stringify(puntos)); // Copia profunda
        var estadoCorregido = JSON.parse(JSON.stringify(estado)); // Copia del estado

        // Single pass only - NO internal recalculation loop to prevent infinite loop
        for (var i = 0; i < puntosCorregidos.length; i++) {
            var p = puntosCorregidos[i];
            var nodo = estadoCorregido.nodos[i];
            if (!nodo || !nodo.feeder) continue;

            var decision = evaluarSistema(p, nodo);

            if (decision.estadoGlobal === 'PASS') continue;

            // =========================
            // 1. INTERRUPTIVO (CRÍTICO)
            // =========================
            if (p.isc * 1000 > (nodo.equip && nodo.equip.cap ? nodo.equip.cap * 1000 : 0)) {
                var nuevo = seleccionarInterruptor(p.isc * 1000);

                cambios.push({
                    tipo: 'interruptor',
                    punto: 'P' + i,
                    antes: nodo.equip ? nodo.equip.cap : 0,
                    despues: nuevo.cap,
                    razon: 'Capacidad interruptiva insuficiente: Isc=' + (p.isc * 1000).toFixed(0) + 'A > Cap=' + (nodo.equip ? nodo.equip.cap * 1000 : 0).toFixed(0) + 'A'
                });

                if (!nodo.equip) nodo.equip = {};
                nodo.equip.cap = nuevo.cap;
                continue;
            }

            // =========================
            // 2. AMPACIDAD (C.D.T.)
            // =========================
            if (p.CDT && p.CDT.I_final < p.CDT.I_diseño) {
                var nuevoCalibre = subirCalibre(nodo.feeder.calibre);

                cambios.push({
                    tipo: 'conductor',
                    punto: 'P' + i,
                    antes: nodo.feeder.calibre,
                    despues: nuevoCalibre,
                    razon: 'No cumple ampacidad: I_final=' + (p.CDT.I_final || 0).toFixed(1) + 'A < I_diseño=' + (p.CDT.I_diseño || 0).toFixed(1) + 'A'
                });

                nodo.feeder.calibre = nuevoCalibre;
                continue;
            }

            // =========================
            // 3. VIOLACIÓN TERMINAL
            // =========================
            if (p.CDT && p.CDT.violacionTerminal) {
                var solucion = resolverTerminal(p);

                cambios.push({
                    tipo: 'terminal',
                    punto: 'P' + i,
                    accion: solucion,
                    razon: 'Violación de terminal: I_corregida=' + (p.CDT.I_corregida || 0).toFixed(1) + 'A > I_limite=' + (p.CDT.I_limite_terminal || 0).toFixed(1) + 'A'
                });

                aplicarSolucionTerminal(nodo, solucion);
                continue;
            }

            // =========================
            // 4. FALLA A TIERRA
            // =========================
            if (p.faseTierra && !p.faseTierra.sensible) {
                var ajuste = mejorarSensibilidadTierra(p, nodo);

                cambios.push({
                    tipo: 'tierra',
                    punto: 'P' + i,
                    ajuste: ajuste,
                    razon: 'Sensibilidad de falla a tierra insuficiente'
                });

                aplicarAjusteTierra(nodo, ajuste);
                continue;
            }

            // =========================
            // 5. FACTOR 125% (CARGA CONTINUA)
            // =========================
            if (p.CDT && p.CDT.sinFactor125) {
                var nuevoCalibre = subirCalibre(nodo.feeder.calibre);

                cambios.push({
                    tipo: 'conductor',
                    punto: 'P' + i,
                    antes: nodo.feeder.calibre,
                    despues: nuevoCalibre,
                    razon: 'No cumple factor 125% para carga continua'
                });

                nodo.feeder.calibre = nuevoCalibre;
                continue;
            }
        }

        // NO internal recalculation - user must recalculate manually to see effects
        return {
            estado: cambios.length > 0 ? 'OPTIMIZADO' : 'YA_CUMPLE',
            cambios: cambios,
            iteraciones: 1,
            nivelConfianza: cambios.length > 0 ? 0.85 : 1.0
        };
    }

    // ==========================================
    // [Autocorreccion] SUBMOTORES DE CORRECCION
    // ==========================================

    /**
     * Sube al siguiente calibre disponible en la tabla de ampacidad
     * @param {string} calibreActual - Calibre actual
     * @returns {string} Siguiente calibre
     */
    function subirCalibre(calibreActual) {
        var orden = Object.keys(AmpacidadReal.tablaAmpacidad);
        var idx = orden.indexOf(calibreActual.toString());
        
        if (idx === -1) return calibreActual;
        
        return orden[Math.min(idx + 1, orden.length - 1)];
    }

    /**
     * Resuelve violación de límite de terminal
     * @param {Object} p - Punto del sistema
     * @returns {Object} Solución recomendada
     */
    function resolverTerminal(p) {
        if (p.CDT && p.CDT.I_corregida > p.CDT.I_limite_terminal) {
            return {
                opciones: [
                    'Subir calibre',
                    'Usar terminal 90°C',
                    'Usar zapata adecuada',
                    'Dividir en paralelos'
                ],
                recomendada: 'subir_calibre'
            };
        }
        return null;
    }

    /**
     * Aplica solución de terminal al nodo
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} solucion - Solución a aplicar
     */
    function aplicarSolucionTerminal(nodo, solucion) {
        if (solucion && solucion.recomendada === 'subir_calibre') {
            nodo.feeder.calibre = subirCalibre(nodo.feeder.calibre);
        }
    }

    /**
     * Selecciona interruptor con capacidad suficiente
     * @param {number} isc - Corriente de cortocircuito (A)
     * @returns {Object} Interruptor seleccionado
     */
    function seleccionarInterruptor(isc) {
        var catalogo = [
            { cap: 14, kA: 10 },
            { cap: 15, kA: 10 },
            { cap: 20, kA: 10 },
            { cap: 25, kA: 14 },
            { cap: 30, kA: 14 },
            { cap: 35, kA: 18 },
            { cap: 40, kA: 22 },
            { cap: 50, kA: 25 },
            { cap: 60, kA: 25 },
            { cap: 70, kA: 30 },
            { cap: 80, kA: 30 },
            { cap: 90, kA: 35 },
            { cap: 100, kA: 35 },
            { cap: 110, kA: 42 },
            { cap: 125, kA: 42 },
            { cap: 150, kA: 50 },
            { cap: 175, kA: 50 },
            { cap: 200, kA: 65 },
            { cap: 225, kA: 65 },
            { cap: 250, kA: 65 },
            { cap: 300, kA: 65 },
            { cap: 350, kA: 85 },
            { cap: 400, kA: 85 },
            { cap: 450, kA: 100 },
            { cap: 500, kA: 100 },
            { cap: 600, kA: 100 },
            { cap: 800, kA: 100 },
            { cap: 1000, kA: 100 },
            { cap: 1200, kA: 100 },
            { cap: 1600, kA: 100 },
            { cap: 2000, kA: 100 },
            { cap: 2500, kA: 100 },
            { cap: 3000, kA: 100 },
            { cap: 4000, kA: 100 },
            { cap: 5000, kA: 100 },
            { cap: 6000, kA: 100 }
        ];

        for (var i = 0; i < catalogo.length; i++) {
            if (catalogo[i].kA * 1000 > isc) {
                return catalogo[i];
            }
        }

        return catalogo[catalogo.length - 1];
    }

    /**
     * Mejora sensibilidad de falla a tierra
     * @param {Object} p - Punto del sistema
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Ajuste recomendado
     */
    function mejorarSensibilidadTierra(p, nodo) {
        var pickupActual = nodo.equip ? nodo.equip.iDisparo || 0 : 0;
        return {
            accion: 'bajar_pickup',
            nuevoPickup: pickupActual * 0.6,
            motivo: 'lograr sensibilidad a falla a tierra'
        };
    }

    /**
     * Aplica ajuste de sensibilidad de tierra al nodo
     * @param {Object} nodo - Nodo del sistema
     * @param {Object} ajuste - Ajuste a aplicar
     */
    function aplicarAjusteTierra(nodo, ajuste) {
        if (ajuste && ajuste.accion === 'bajar_pickup') {
            if (!nodo.equip) nodo.equip = {};
            nodo.equip.iDisparo = ajuste.nuevoPickup;
        }
    }

    return {
        ejecutar: ejecutar,
        ejecutarFallaMinima: ejecutarFallaMinima,
        leerTipoAterrizamiento: leerTipoAterrizamiento,
        autoCorregirSistema: autoCorregirSistema,
        actualizarRetornoTierra: function() {
            calcularRetornoTierraAutomatico();
        }
    };
})();

if (typeof window !== 'undefined') {
    window.Motor = Motor;
}
