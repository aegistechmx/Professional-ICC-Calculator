var Motor = (function() {
    // Debug system initialization
    var DEBUG = typeof DebugSystem !== 'undefined' && DebugSystem.isEnabled();
    
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
        
        // Si el usuario ingresó un valor manual positivo, usarlo
        // 0 o vacío se considera "auto-calcular"
        if (valorManual !== null && !isNaN(valorManual) && valorManual > 0) {
            return valorManual;
        }
        
        // Si no, calcular automáticamente según configuración
        return calcularRetornoTierraAutomatico();
    }

    /**
     * Selecciona breaker default para nodo sin equipo especificado
     * @param {Object} nodo - Nodo del sistema
     * @returns {Object} Equipo con breaker default
     */
    function seleccionarBreakerDefault(nodo) {
        var cargaA = nodo.feeder ? nodo.feeder.cargaA : 0;
        var I_diseño = nodo.CDT ? nodo.CDT.I_diseño : (cargaA * 1.25);
        
        // Redondear al frame estándar más cercano
        var frames = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000];
        var frame = 400; // Default
        for (var i = 0; i < frames.length; i++) {
            if (frames[i] >= I_diseño) {
                frame = frames[i];
                break;
            }
        }
        
        if (typeof Debug !== 'undefined') {
            Debug.log('[Motor] Seleccionando breaker default para nodo ' + nodo.id + ': ' + frame + 'A (I_diseño=' + I_diseño.toFixed(1) + 'A)');
        }
        
        return {
            tipo: 'mccb',
            nombre: 'MCCB ' + frame + 'A',
            cap: frame / 1000, // kA
            iDisparo: frame * 10, // 10x In default
            serie: 'mccb_generico'
        };
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

        // Fase 9: Validar integridad jerárquica para evitar recursión infinita
        if (typeof Impedancias !== 'undefined' && typeof Impedancias.detectarCiclos === 'function') {
            var idCiclo = Impedancias.detectarCiclos(App.estado.nodos);
            if (idCiclo) {
                return { valido: false, error: 'Error de integridad: Referencia circular detectada en nodo ' + idCiclo };
            }
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
        if (DEBUG) DebugSystem.log("MOTOR_EJECUTAR:START", { tipoSistema: App.estado.tipoSistema }, "info");
        
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

        // 🔥 FIX: Forzar modelo de breaker para nodos sin equipo
        for (var nb = 0; nb < puntos.length; nb++) {
            var puntoActual = puntos[nb];
            // Buscar el nodo correspondiente por ID para asegurar consistencia
            var nodoBase = App.estado.nodos.find(function(n) { return n.id === puntoActual.id; });
            
            if (!nodoBase.equip || !nodoBase.equip.modelo || nodoBase.equip.cap <= 0) {
                nodoBase.equip = seleccionarBreakerDefault(nodoBase);
                puntoActual.equip = nodoBase.equip;
            }
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
        // z0Fuente ya incluye el trafo si existe (es la impedancia total en P0)
        var z0Fuente = (puntos.length > 0 && typeof Secuencia !== 'undefined') ? Secuencia.z0DesdeIsc(V, puntos[0].isc, puntos[0].xr, factor) : 0;
        // Pasamos 0 a zTrafo para evitar doble conteo en Secuencia.js, ya que z0Fuente es el total en bornes secundarios
        var zTrafo = 0; 
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
                // Isc bifásica (L-L) = V_LL / (Z1 + Z2). Asumiendo Z1 ≈ Z2:
                // Isc_bifásica = V_LL / (2 * Z1) ≈ 0.866 * Isc_trifásica
                var Z1 = Impedancias.magnitud(puntos[i].R, puntos[i].X);
                var iscBifasica = Z1 > 0 ? (V / (2 * Z1)) : 0;
                puntos[i].iscBifasica = iscBifasica / 1000; // kA
            }
        }

        // Aporte de capacitores (Fase 8)
        var capacs = App.estado.capacitores || [];
        var tieneCap = capacs.some(function(c) { return c.kvar > 0; });
        if (tieneCap) {
            var datosCap = CalculoCapacitores.aportePorPunto(puntos.length);
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

            var sugerencia = sugerirConductor(f.cargaA, f.material, f.canalizacion, f.longitud, f.paralelo || 1, f.calibre, puntos[i].isc, nodo);

            // [Sync] Si se sugirió un calibre diferente, actualizar el feeder
            if (sugerencia.calibreSugerido && sugerencia.calibreSugerido !== f.calibre) {
                if (typeof Debug !== 'undefined') {
                    Debug.log('[Sync] Actualizando calibre de ' + f.calibre + ' a ' + sugerencia.calibreSugerido);
                }
                // [Semaforo] Registrar autocorrección de calibre
                if (ctxSemaforo) {
                    Semaforo.registrarAutocorreccion(ctxSemaforo, puntos[i].id, 'CALIBRE_AUTO',
                        'Calibre auto-corregido: ' + f.calibre + ' → ' + sugerencia.calibreSugerido, 'MEDIA');
                }
                f.calibre = sugerencia.calibreSugerido;
                // Recalcular con el nuevo calibre
                sugerencia = sugerirConductor(f.cargaA, f.material, f.canalizacion, f.longitud, f.paralelo, f.calibre, puntos[i].isc, nodo);
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

            // Validación crítica: I_final nunca debe ser 0 o inválido
            if (!puntos[i].CDT.I_final || puntos[i].CDT.I_final <= 0 || isNaN(puntos[i].CDT.I_final)) {
                var errorData = {
                    nodo: puntos[i].id,
                    I_final: puntos[i].CDT.I_final,
                    tempAmbiente: f.tempAmbiente,
                    F_temp: sugerencia.F_temp,
                    F_agrupamiento: sugerencia.F_agrupamiento,
                    I_tabla: sugerencia.I_tabla
                };
                
                if (DEBUG) DebugSystem.log("CDT_VALIDACION:FAIL", errorData, "error");
                console.error('[ERROR] CDT INVÁLIDO para nodo ' + puntos[i].id + ': I_final = ' + puntos[i].CDT.I_final);
                
                if (typeof Debug !== 'undefined') {
                    console.table(errorData);
                }
                
                if (typeof DebugValidator !== 'undefined') {
                    DebugValidator.assert(false, 'CDT inválido para nodo ' + puntos[i].id, errorData);
                }
                
                throw new Error('CDT inválido para nodo ' + puntos[i].id + ': I_final = ' + puntos[i].CDT.I_final + '. El cálculo de ampacidad falló. Revise: temperatura, agrupamiento, calibre.');
            }
            
            if (DEBUG) DebugSystem.log("CDT_CALCULADO:OK", { 
                nodo: puntos[i].id, 
                I_final: puntos[i].CDT.I_final,
                I_diseño: puntos[i].CDT.I_diseño 
            }, "info");
            
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
            // Buscar el nodo original por ID para garantizar consistencia en sistemas ramificados
            var nodoOriginal = App.estado.nodos.find(function(n) { return n.id === puntos[i].id; });
            puntos[i].decision = evaluarSistema(puntos[i], nodoOriginal);
            // Acumular errores al estado global
            if (puntos[i].decision.estadoGlobal === "FAIL") {
                resultado.estadoGlobal = "FAIL";
                resultado.errores = resultado.errores.concat(puntos[i].decision.errores);
            }
        }

        // Adjuntar estado global al resultado
        puntos.estadoGlobal = resultado.estadoGlobal;
        puntos.erroresGlobales = resultado.errores;
        
        // FIX: Estructurar resultado con contrato de salida consistente
        var resultadoFinal = {
            status: resultado.estadoGlobal === "PASS" ? "OK" : (resultado.estadoGlobal === "FAIL" ? "ERROR" : "WARNING"),
            estadoGlobal: resultado.estadoGlobal,
            errores: resultado.errores,
            warnings: resultado.warnings,
            resultados: {
                puntos: puntos,
                numPuntos: puntos.length
            }
        };
        
        if (DEBUG) DebugSystem.log("MOTOR_EJECUTAR:END", { 
            estadoGlobal: resultado.estadoGlobal,
            numErrores: resultado.errores.length,
            numPuntos: puntos.length
        }, "info");

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
        if (typeof MotorDisenoAutomatico !== 'undefined') {
            var resultadoDiseno = MotorDisenoAutomatico.ejecutarDiseno(puntos, {});

            // Adjuntar resultado del diseño al sistema
            puntos.disenoAutomatico = resultadoDiseno;

            // Registrar errores de diseño en el semáforo si está disponible
            if (ctxSemaforo && resultadoDiseno.deteccionCurvas) {
                if (Array.isArray(resultadoDiseno.deteccionCurvas.errores)) {
                    resultadoDiseno.deteccionCurvas.errores.forEach(function(e) {
                        Semaforo.registrarError(ctxSemaforo, e.nodoUp, e.mensaje);
                    });
                }
                if (Array.isArray(resultadoDiseno.deteccionCurvas.warnings)) {
                    resultadoDiseno.deteccionCurvas.warnings.forEach(function(w) {
                        Semaforo.registrarWarning(ctxSemaforo, w.nodoUp, w.mensaje);
                    });
                }
            }

            // Renderizar reporte de diseño en consola
            if (typeof Debug !== 'undefined') {
                Debug.log('═══════════════════════════════════════════════════════════');
                Debug.log('[MotorDiseno] MOTOR DE DISEÑO AUTOMATICO — ' + resultadoDiseno.estadoGlobal);
                Debug.log('═══════════════════════════════════════════════════════════');
                Debug.log('Escalonamiento:', resultadoDiseno.escalonamiento ? resultadoDiseno.escalonamiento.cambios.length + ' cambios' : 'N/A');
                Debug.log('Detección curvas:', resultadoDiseno.deteccionCurvas ? resultadoDiseno.deteccionCurvas.estado : 'N/A');
                Debug.log('Coordinación TCC:', resultadoDiseno.coordinacionTCC ? resultadoDiseno.coordinacionTCC.ajustes.length + ' ajustes' : 'N/A');
                Debug.log('Bloqueo instantáneo:', resultadoDiseno.bloqueoInstantaneo ? resultadoDiseno.bloqueoInstantaneo.bloqueos.length + ' bloqueos' : 'N/A');
                Debug.log('Validación selectividad:', Array.isArray(resultadoDiseno.validacionSelectividad) ? resultadoDiseno.validacionSelectividad.length + ' pruebas' : 'N/A');
                Debug.log('═══════════════════════════════════════════════════════════');
            }
        }

        // Ejecutar motor de coordinación real con catálogo de equipos
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
            if (ctxSemaforo && resultadoCoordinacionReal.validacionFinal && Array.isArray(resultadoCoordinacionReal.validacionFinal.cruces)) {
                resultadoCoordinacionReal.validacionFinal.cruces.forEach(function(c) {
                    if (c.severidad === 'CRITICO') {
                        Semaforo.registrarError(ctxSemaforo, c.par, 'Cruce de coordinación @ ' + c.corriente.toFixed(0) + 'A');
                    } else {
                        Semaforo.registrarWarning(ctxSemaforo, c.par, 'Selectividad marginal @ ' + c.corriente.toFixed(0) + 'A');
                    }
                });
            }

            // Renderizar reporte en consola
            if (typeof Debug !== 'undefined') {
                Debug.log('═══════════════════════════════════════════════════════════');
                Debug.log('[MotorCoordinacion] MOTOR DE COORDINACION REAL (ETAP/SKM) — ' + resultadoCoordinacionReal.estadoFinal);
                Debug.log('═══════════════════════════════════════════════════════════');
                Debug.log('Pasos:', Array.isArray(resultadoCoordinacionReal.pasos) ? resultadoCoordinacionReal.pasos.length : 'N/A');
                if (Array.isArray(resultadoCoordinacionReal.pasos)) {
                    resultadoCoordinacionReal.pasos.forEach(function(p) {
                        Debug.log('  ' + p.paso + '. ' + p.accion + ': ' + p.mensaje);
                    });
                }
                Debug.log('Cambios:', resultadoCoordinacionReal.coordinacion ? resultadoCoordinacionReal.coordinacion.cambios.length : 0);
                Debug.log('Iteraciones:', resultadoCoordinacionReal.coordinacion ? resultadoCoordinacionReal.coordinacion.iteraciones : 0);
                Debug.log('Validación:', resultadoCoordinacionReal.validacionFinal ? resultadoCoordinacionReal.validacionFinal.estado : 'N/A');
                Debug.log('═══════════════════════════════════════════════════════════');
            }
        }

        // [Solver] Integrar Solver Eléctrico para selección automática de conductor + breaker + TCC
        if (typeof Debug !== 'undefined') {
            Debug.log('[Solver] Verificando SolverElectrico:', typeof SolverElectrico);
        }
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

        // FIX: Retornar resultado estructurado con contrato de salida consistente
        return resultadoFinal;
    }

    /**
     * Motor de Decisión Centralizado (Jerarquía de Seguridad y Normativa)
     * @param {Object} punto - Datos del punto de cálculo
     * @param {Object} nodo - Datos del nodo (equipo, feeder)
     * @returns {Object} Resultado de evaluación unificado
     */
    function evaluarSistema(punto, nodo) {
        if (DEBUG) DebugSystem.log("EVALUAR_SISTEMA:START", { puntoId: punto.id }, "info");
        
        var resultado = {
            estadoGlobal: "PASS",
            severidad: 0,
            errores: [],
            warnings: [],
            info: []
        };

        if (!nodo) {
            if (DEBUG) DebugSystem.log("EVALUAR_SISTEMA:SKIP", { reason: "nodo is null" }, "warn");
            return resultado;
        }

        // USAR CORE NOM (única fuente de verdad)
        if (typeof CoreNOM !== 'undefined') {
            var validacionCore = CoreNOM.validarPunto(punto, nodo);
            
            // Convertir formato CoreNOM a formato interno
            validacionCore.errores.forEach(function(err) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, err.severidad === "CRITICO" ? 5 : 3);
                resultado.errores.push(err.mensaje);
            });
            
            validacionCore.warnings.forEach(function(warn) {
                resultado.warnings.push(warn.mensaje);
            });
        } else {
            // Fallback a lógica legacy si CoreNOM no está disponible
            var tipoSistema = App.estado.tipoSistema || '3f';

            // PRIORIDAD 1: NOM (OBLIGATORIO)
            // 1.1 VIOLACIÓN TERMINAL (Art. 110.14C) - CRÍTICO
            if (punto.CDT && punto.CDT.violacionTerminal) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, 5);
                resultado.errores.push("VIOLACIÓN NOM 110.14C (CRÍTICO): I_corregida=" + (punto.CDT.I_corregida || 0).toFixed(1) + "A > I_limite_terminal=" + (punto.CDT.I_limite_terminal || 0).toFixed(1) + "A");
            }

            // 1.2 AMPACIDAD INSUFICIENTE (Art. 310) - CRÍTICO
            if (punto.CDT && punto.CDT.I_final < (punto.CDT.I_diseño || 0)) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, 5);
                resultado.errores.push("AMPACIDAD INSUFICIENTE (CRÍTICO NOM 310): I_final=" + (punto.CDT.I_final || 0).toFixed(1) + "A < I_diseño=" + (punto.CDT.I_diseño || 0).toFixed(1) + "A");
            }

            // PRIORIDAD 2: PROTECCIÓN (SEGURIDAD)
            // 2.1 FALLA A TIERRA (Art. 230.95) - CRÍTICO
            if (punto.faseTierra && punto.faseTierra.iscFt > 0) {
                var iDisparo = (nodo.equip && nodo.equip.iDisparo) ? nodo.equip.iDisparo : 0;
                var If_tierra = punto.faseTierra.iscFt * 1000;
                
                if (If_tierra < iDisparo) {
                    resultado.estadoGlobal = "FAIL";
                    resultado.severidad = Math.max(resultado.severidad, 5);
                    resultado.errores.push("FALLA A TIERRA (CRÍTICO NOM 230.95): If_tierra=" + If_tierra.toFixed(1) + "A < iDisparo=" + iDisparo + "A");
                }
            }

            // 2.2 GFP OBLIGATORIO PARA YG SÓLIDO
            var tipoAterrizaje = leerTipoAterrizamiento();
            if (tipoAterrizaje === 'yg_solido' && nodo.equip && !nodo.equip.tieneGFP) {
                resultado.estadoGlobal = "FAIL";
                resultado.severidad = Math.max(resultado.severidad, 5);
                resultado.errores.push("NOM 230.95: Sistema Yg sólido requiere GFP/LSIG");
            }

            // PRIORIDAD 3: CAPACIDAD INTERRUPTIVA
            if (punto.isc && nodo.equip && nodo.equip.cap) {
                var Icu = nodo.equip.cap || 0; // kA
                var Isc_kA = punto.isc; // Already in kA (from calculation)
                
                // FIX: Comparar ambos en kA para evitar errores de conversión
                // Icu está en kA, punto.isc está en kA
                if (Icu < Isc_kA) {
                    resultado.estadoGlobal = "FAIL";
                    resultado.severidad = Math.max(resultado.severidad, 5);
                    resultado.errores.push("CAPACIDAD INTERRUPTIVA INSUFICIENTE: Icu=" + Icu + "kA < Isc=" + Isc_kA.toFixed(2) + "kA");
                }
            }
        }

        // PRIORIDAD 5: OPTIMIZACIÓN (WARNING)
        if (punto.CDT) {
            if (punto.CDT.sinFactor125) {
                resultado.warnings.push("Sin factor 125% para carga continua (NOM-001)");
            }

            if (punto.CDT.margen < 10 && punto.CDT.margen >= 0) {
                resultado.warnings.push("Margen térmico bajo (<10%)");
            }
        }

        // PRIORIDAD 6: COORDINACIÓN TCC (WARNING)
        // Solo evaluar si hay al menos 2 dispositivos en el sistema
        var nDispositivos = App.estado ? App.estado.nodos.filter(function(n) { return n.equip && n.equip.cap; }).length : 0;
        if (nDispositivos >= 2 && App.estado.resultados && App.estado.resultados.coordinacionTCC) {
            var tccFail = App.estado.resultados.coordinacionTCC.puntosConFalla && 
                          App.estado.resultados.coordinacionTCC.puntosConFalla.indexOf(punto.nombre) !== -1;
            if (tccFail) {
                resultado.warnings.push("Falta coordinación selectiva en este tramo");
            }
        } else if (nDispositivos < 2) {
            resultado.info.push("Evaluación completada para punto " + punto.id);
        }

        if (DEBUG) DebugSystem.log("EVALUAR_SISTEMA:END", { 
            puntoId: punto.id, 
            estado: resultado.estadoGlobal,
            severidad: resultado.severidad,
            numErrores: resultado.errores.length,
            numWarnings: resultado.warnings.length
        }, "info");
        
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
    function sugerirConductor(cargaA, material, canalizacion, longitud, paralelos, calibreExistente, isc, nodo) {
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

        // USAR MotorIndustrial (motor industrial con trazabilidad) - ÚNICO ENTRYPOINT
        if (typeof MotorIndustrial !== 'undefined') {
            try {
                var resultadoIndustrial = MotorIndustrial.run({
                    I_carga: cargaA,
                    material: material || 'cobre',
                    tempAislamiento: 75,
                    tempAmbiente: tempAmbiente,
                    nConductores: conductoresInput || 3,
                    paralelos: paralelos || 1,
                    tempTerminal: 75,
                    voltaje: 480,
                    FP: 0.9,
                    longitud: longitud || 0,
                    tipoSistema: App.estado.tipoSistema || '3F',
                    calibre: calibreExistente
                });
                
                console.log("[MotorIndustrial] Resultado completo:", resultadoIndustrial);
                console.log("[MotorIndustrial] Trazabilidad:", resultadoIndustrial.trazabilidad);
                
                // FIX: Validar estructura de resultadoIndustrial
                if (!resultadoIndustrial.conductor || !resultadoIndustrial.conductor.amp) {
                    throw new Error("MotorIndustrial returned invalid conductor structure");
                }
                
                // Adaptar resultado al formato esperado
                var resultado = resultadoIndustrial.conductor.amp;
                resultado.calibre = resultadoIndustrial.conductor.calibre;
                resultado.paralelos = resultadoIndustrial.conductor.paralelo;
                resultado.I_diseño = resultadoIndustrial.sistema.I_diseño;
                resultado.ampacidadFinal = resultado.I_final;
                resultado.ampacidadCorregida = resultado.I_corregida;
                resultado.ampacidadTerminal = resultado.I_terminal;
                resultado.ampacidad75 = resultado.I_tabla;
                resultado.F_temp = resultado.F_temp;
                resultado.F_agrupamiento = resultado.F_agrup;
                resultado.violacionTerminal = resultado.violacionTerminal;
                resultado.score = resultadoIndustrial.score;
                resultado.validacion = resultadoIndustrial.validacion;
                
                return resultado;
            } catch (error) {
                console.error("[MotorIndustrial] Error:", error.message);
                throw new Error("MotorIndustrial falló: " + error.message + ". Este es el único entrypoint permitido.");
            }
        }
        
        throw new Error("MotorIndustrial no está disponible. Debe cargar core/MotorIndustrial.js como único entrypoint.");

        // ============================================================
        // CÓDIGO LEGACY NO ALCANZABLE (mantenido temporalmente para referencia)
        // Este código ya no se ejecuta porque MotorIndustrial es el único entrypoint
        // ============================================================

        // Configuración del cable
        var cableConfig = {
            temperaturaAislamiento: 75, // Default THHN/XHHW
            temperaturaAmbiente: tempAmbiente, // Usar input o default defensivo
            numConductores: conductoresInput || 3, // Usar input o default
            paralelos: paralelos || 1,
            F_agrupamiento: null, // Siempre null inicialmente, se calcula vía MotorInteligenteCCC
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
        if (typeof Debug !== 'undefined') {
            Debug.log('[MotorInteligente] Verificando MotorInteligenteCCC:', typeof MotorInteligenteCCC);
        }
        if (typeof MotorInteligenteCCC !== 'undefined') {
            if (typeof Debug !== 'undefined') {
                Debug.log('[MotorInteligente] Ejecutando MotorInteligenteCCC...');
            }
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
            // FIX CRÍTICO: Solo datos necesarios para agrupamiento (NO para ampacidad)
            var nodoTemp = {
                id: 'temp',
                tempAmbiente: cableConfig.temperaturaAmbiente,
                I_tabla: 0, // Se llenará después - NO usar para cálculo de ampacidad
                F_agrupamiento: cableConfig.F_agrupamiento,
                fuenteAgrupamiento: configInteligente.fuenteAgrupamiento,
                paralelos: cableConfig.paralelos || 1
                // F_temp NO incluido - MotorInteligenteCCC solo calcula agrupamiento
            };

            // FIX CRÍTICO: Solo usar MotorInteligenteCCC para agrupamiento, NO para ampacidad
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

        // USAR MotorAmpacidadNOM (único motor unificado)
        var resultado;
        
        if (typeof MotorAmpacidadNOM !== 'undefined') {
            // Nueva arquitectura unificada: usar MotorAmpacidadNOM
            if (calibreExistente) {
                resultado = MotorAmpacidadNOM.calcularAmpacidadNOM({
                    calibre: calibreExistente,
                    material: material || 'cobre',
                    tempAislamiento: cableConfig.temperaturaAislamiento,
                    tempAmbiente: cableConfig.temperaturaAmbiente,
                    nConductores: cableConfig.numConductores,
                    paralelos: cableConfig.paralelos,
                    tempTerminal: 75
                });
                console.log("[MotorAmpacidadNOM] Resultado calcularAmpacidad:", {
                    calibre: resultado.calibre,
                    I_final: resultado.I_final,
                    I_corregida: resultado.I_corregida,
                    I_terminal: resultado.I_terminal,
                    I_tabla: resultado.I_tabla
                });
            } else {
                // Usar MotorAmpacidadNOM para selección automática
                try {
                    var I_diseño = cargaA * Fcc;
                    var seleccion = MotorAmpacidadNOM.seleccionarConductor(I_diseño, {
                        material: material || 'cobre',
                        tempAislamiento: cableConfig.temperaturaAislamiento,
                        tempAmbiente: cableConfig.temperaturaAmbiente,
                        nConductores: cableConfig.numConductores,
                        paralelos: cableConfig.paralelos,
                        tempTerminal: 75
                    });
                    resultado = seleccion;
                    console.log("[MotorAmpacidadNOM] Resultado seleccionarConductor:", {
                        calibre: seleccion.calibre,
                        I_final: seleccion.I_final
                    });
                } catch (error) {
                    console.error("[MotorAmpacidadNOM] Error:", error.message);
                    // Fallback a cálculo manual si falla
                    resultado = MotorAmpacidadNOM.calcularAmpacidadNOM({
                        calibre: '250', // Default seguro
                        material: material || 'cobre',
                        tempAislamiento: cableConfig.temperaturaAislamiento,
                        tempAmbiente: cableConfig.temperaturaAmbiente,
                        nConductores: cableConfig.numConductores,
                        paralelos: cableConfig.paralelos,
                        tempTerminal: 75
                    });
                }
            }
        } else if (typeof ampacidadNOM !== 'undefined') {
            // Fallback a ampacidadNOM si MotorAmpacidadNOM no está disponible
            if (calibreExistente) {
                resultado = ampacidadNOM({
                    calibre: calibreExistente,
                    material: material || 'cobre',
                    aislamiento: cableConfig.temperaturaAislamiento,
                    tempAmbiente: cableConfig.temperaturaAmbiente,
                    nConductores: cableConfig.numConductores,
                    paralelos: cableConfig.paralelos,
                    tempTerminal: 75
                });
                console.log("[ampacidadNOM] Resultado calcularAmpacidad:", {
                    calibre: calibreExistente,
                    I_final: resultado.I_final,
                    I_corregida: resultado.I_corregida,
                    I_terminal: resultado.I_terminal,
                    I_base: resultado.I_base
                });
            } else {
                // Usar ConductorSelector para selección automática
                try {
                    var seleccion = ConductorSelector.seleccionarConductor({
                        I_carga: cargaA,
                        material: material || 'cobre',
                        aislamiento: cableConfig.temperaturaAislamiento,
                        tempAmbiente: cableConfig.temperaturaAmbiente,
                        nConductores: cableConfig.numConductores,
                        paralelos: cableConfig.paralelos,
                        terminal: 75
                    });
                    resultado = seleccion.detalle;
                    console.log("[ConductorSelector] Resultado seleccionarConductor:", {
                        calibre: seleccion.calibre,
                        I_final: seleccion.ampacidad
                    });
                } catch (error) {
                    console.error("[ConductorSelector] Error:", error.message);
                    resultado = ampacidadNOM({
                        calibre: '250',
                        material: material || 'cobre',
                        aislamiento: cableConfig.temperaturaAislamiento,
                        tempAmbiente: cableConfig.temperaturaAmbiente,
                        nConductores: cableConfig.numConductores,
                        paralelos: cableConfig.paralelos,
                        tempTerminal: 75
                    });
                }
            }
        } else if (typeof CoreAmpacidad !== 'undefined') {
            // Fallback a CoreAmpacidad si ampacidadNOM no está disponible
            if (calibreExistente) {
                resultado = CoreAmpacidad.calcularAmpacidad({
                    calibre: calibreExistente,
                    material: material,
                    tempAislamiento: cableConfig.temperaturaAislamiento,
                    tempAmbiente: cableConfig.temperaturaAmbiente,
                    numConductores: cableConfig.numConductores,
                    paralelos: cableConfig.paralelos,
                    tempTerminal: 75,
                    carga: cargaA,
                    Fcc: Fcc
                });
                console.log("[CoreAmpacity] Resultado calcularAmpacidad:", {
                    calibre: resultado.calibre,
                    I_final: resultado.I_final,
                    I_corregida: resultado.I_corregida,
                    I_terminal: resultado.I_terminal,
                    I_tabla: resultado.I_tabla
                });
            } else {
                resultado = CoreAmpacidad.seleccionarCalibreMinimo(cargaA, {
                    material: material,
                    tempAislamiento: cableConfig.temperaturaAislamiento,
                    tempAmbiente: cableConfig.temperaturaAmbiente,
                    numConductores: cableConfig.numConductores,
                    paralelos: cableConfig.paralelos,
                    tempTerminal: 75,
                    Fcc: Fcc
                });
                console.log("[CoreAmpacity] Resultado seleccionarCalibreMinimo:", {
                    calibre: resultado.calibre,
                    I_final: resultado.I_final,
                    I_corregida: resultado.I_corregida,
                    I_terminal: resultado.I_terminal,
                    I_tabla: resultado.I_tabla
                });
            }
        } else {
            // Fallback a AmpacidadReal si CoreAmpacidad no está disponible
            if (calibreExistente) {
                var cable = {
                    calibre: calibreExistente,
                    temperaturaAislamiento: cableConfig.temperaturaAislamiento,
                    temperaturaAmbiente: cableConfig.temperaturaAmbiente,
                    numConductores: cableConfig.numConductores,
                    paralelos: cableConfig.paralelos,
                    F_agrupamiento: cableConfig.F_agrupamiento
                };
                var load = {
                    I_cont: cargaA,
                    I_no_cont: 0,
                    esContinua: true,
                    Fcc: Fcc
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
                
                // FIX CRÍTICO: Detectar bug de 0 vs 0
                if (I_final <= 0) {
                    console.error('[X] I_final inválido para calibre existente ' + calibreExistente + ': ' + I_final + 'A');
                    throw new Error("Ampacidad inválida detectada para calibre existente: I_final = " + I_final);
                }
                
                if (resultado.status !== 'PASS' || I_final < I_diseño) {
                    console.warn('[Warn] Calibre existente ' + calibreExistente + ' no cumple (' + I_final.toFixed(1) + 'A < ' + I_diseño.toFixed(1) + 'A), buscando conductor mínimo...');
                    var resultadoMinimo = AmpacidadReal.buscarConductorMinimo(load, cableConfig);
                    if (resultadoMinimo && resultadoMinimo.status === 'PASS') {
                        // FIX CRÍTICO: Validar que resultadoMinimo.I_final no sea 0
                        if (resultadoMinimo.I_final <= 0) {
                            console.error('[X] Conductor sugerido tiene ampacidad inválida: ' + resultadoMinimo.I_final + 'A');
                            throw new Error("Conductor sugerido tiene ampacidad inválida: " + resultadoMinimo.I_final);
                        }
                        resultado = resultadoMinimo;
                        resultado.calibreSugerido = resultadoMinimo.calibre;
                        resultado.calibreOriginal = calibreExistente;
                        if (typeof Debug !== 'undefined') {
                            Debug.log('[OK] Conductor sugerido: ' + resultadoMinimo.calibre + ' → ' + resultadoMinimo.I_final.toFixed(1) + 'A');
                        }
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
        }

        // Actualizar CDT en el punto
        // Normalizar formato de resultado (CoreAmpacidad vs AmpacidadReal)
        var I_final = resultado.I_final || resultado.ampacidadFinal || 0;
        var I_corregida = resultado.I_corregida || resultado.ampacidadCorregida || 0;
        var I_terminal = resultado.I_terminal || resultado.ampacidadTerminal || 0;
        var I_tabla = resultado.I_tabla || resultado.ampacidad75 || 0;
        
        // Adaptar resultado al formato esperado por el sistema
        var I_final = resultado.I_final || resultado.I_corregida;
        var I_corregida = resultado.I_corregida;
        var I_terminal = resultado.I_terminal || resultado.I_final;
        var I_tabla = resultado.I_tabla || resultado.I_base75;
        
        return {
            calibre: resultado.calibre,
            calibreSugerido: resultado.calibreSugerido || null,
            calibreOriginal: resultado.calibreOriginal || null,
            ampacidadFinal: I_final,
            ampacidadCorregida: I_corregida,
            ampacidadTerminal: I_terminal,
            ampacidad75: I_tabla,
            usa90C: resultado.usa90C || false,
            icc: (isc || 0) * 1000,
            interruptorKA: (nodo && nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0,
            numConductores: f.numConductores || 3,
            fc: f.fc || 0.8,
            ft: f.ft || 0.91,
            temperatura: 31, // Puerto Vallarta default
            Fcc: Fcc,
            F_temp: resultado.F_temp || 1.0,
            F_agrupamiento: resultado.F_agrup || resultado.F_agrupamiento || 1.0,
            status: resultado.status || (resultado.valido ? 'PASS' : 'FAIL'),
            margen: resultado.margen || 0,
            deficit: resultado.deficit || 0,
            violacionTerminal: resultado.violacionTerminal || false,
            sinFactor125: resultado.sinFactor125 || false,
            agrupamientoInfo: resultado.agrupamientoInfo || null,
            I_diseño: resultado.I_diseño || (cargaA * Fcc)
        };
    }

    // ==========================================
    // [Autocorreccion] MOTOR DE AUTO-CORRECCION
    // ==========================================

    /**
     * AutoFix PRO v2 - Motor de Ingeniería Real
     * Resuelve sistema eléctrico completo bajo múltiples restricciones
     * @param {Array} puntos - Puntos del sistema actual
     * @param {Object} estado - Estado del sistema (nodos, equipos, etc.)
     * @param {Object} opciones - Opciones de configuración { modo: 'conservador'|'optimo'|'economico' }
     * @returns {Object} Resultado de auto-corrección con cambios aplicados
     */
    function autoCorregirSistema(puntos, estado, opciones) {
        if (DEBUG) DebugSystem.log("AUTOFIX:START", { modo: opciones ? opciones.modo : 'optimo' }, "info");
        
        opciones = opciones || { modo: 'optimo' };

        // STEP 1: Inicializar sistema
        var sistema = initSistema(puntos, estado);
        
        if (DEBUG) DebugSystem.snapshot("AUTOFIX:INIT", sistema);

        // STEP 2: Sizing inicial (base inteligente)
        sizingInicial(sistema);

        // STEP 3: Loop global
        var resultadoLoop = loopGlobal(sistema, opciones);

        // STEP 4: Validación final
        var validacionFinal = validarFinal(sistema);

        if (DEBUG) DebugSystem.log("AUTOFIX:END", { 
            estado: validacionFinal.estado,
            confianza: validacionFinal.confianza,
            iteraciones: resultadoLoop.iteraciones,
            numCambios: resultadoLoop.cambios.length
        }, "info");

        return {
            estado: validacionFinal.estado,
            confianza: validacionFinal.confianza,
            cambios: resultadoLoop.cambios,
            iteraciones: resultadoLoop.iteraciones,
            convergencia: resultadoLoop.convergencia,
            riesgosResiduales: validacionFinal.riesgosResiduales,
            modo: opciones.modo
        };
    }

    /**
     * STEP 1: Inicializar sistema con copia profunda
     * @param {Array} puntos - Puntos del sistema
     * @param {Object} estado - Estado del sistema
     * @returns {Object} Sistema inicializado
     */
    function initSistema(puntos, estado) {
        return {
            puntos: JSON.parse(JSON.stringify(puntos)),
            estado: JSON.parse(JSON.stringify(estado)),
            iteracion: 0,
            cambios: [],
            convergencia: false
        };
    }

    /**
     * STEP 2: Sizing inicial desde base validada
     * @param {Object} sistema - Sistema a dimensionar
     */
    function sizingInicial(sistema) {
        for (var i = 0; i < sistema.estado.nodos.length; i++) {
            var nodo = sistema.estado.nodos[i];
            if (!nodo.feeder) continue;

            // Calcular I_diseño desde carga, no usar valor del usuario sin validar
            var I_carga = nodo.feeder.cargaA || 0;
            var I_diseño = I_carga * 1.25;

            // Seleccionar cable base usando catálogo NOM (respeta terminales)
            if (!nodo.feeder.calibre || nodo.feeder.calibre === '') {
                if (typeof CatalogoConductoresNOM !== 'undefined') {
                    var condiciones = {
                        tempAmbiente: 31,
                        nConductores: 3,
                        terminal: 285, // Terminal 75°C típico
                        sistemaBalanceado: true,
                        I_diseño: I_diseño
                    };
                    var cable = CatalogoConductoresNOM.seleccionarCable(I_diseño, "Cu", condiciones);
                    if (cable) {
                        nodo.feeder.calibre = cable.calibre;
                    } else {
                        nodo.feeder.calibre = seleccionarCableBase(I_diseño);
                    }
                } else {
                    nodo.feeder.calibre = seleccionarCableBase(I_diseño);
                }
            }

            // Seleccionar breaker base
            if (!nodo.equip || !nodo.equip.cap) {
                var breakerBase = seleccionarBreakerBase(I_diseño);
                if (!nodo.equip) nodo.equip = {};
                nodo.equip.cap = breakerBase.cap;
                nodo.equip.iDisparo = breakerBase.iDisparo;
            }
        }
    }

    /**
     * STEP 3: Loop global con iteración inteligente
     * @param {Object} sistema - Sistema a optimizar
     * @param {Object} opciones - Opciones de configuración
     * @returns {Object} Resultado del loop
     */
    function loopGlobal(sistema, opciones) {
        var maxIteraciones = 15;
        var iteracion = 0;
        var cambiosEnIteracion = true;
        var cambios = [];

        while (cambiosEnIteracion && iteracion < maxIteraciones) {
            iteracion++;
            cambiosEnIteracion = false;
            var cambiosIteracion = [];

            // Recalcular sistema completo
            recalcularSistema(sistema);

            // Evaluar sistema
            var errores = evaluarSistemaCompleto(sistema);

            // Si no hay errores críticos, convergió
            if (errores.criticos.length === 0) {
                sistema.convergencia = true;
                break;
            }

            // Resolver por prioridad
            resolverCriticos(sistema, errores.criticos, cambiosIteracion);
            resolverMedios(sistema, errores.medios, cambiosIteracion);
            resolverOptimizacion(sistema, errores.bajos, cambiosIteracion, opciones);

            if (cambiosIteracion.length > 0) {
                cambios = cambios.concat(cambiosIteracion);
                cambiosEnIteracion = true;
            }
        }

        sistema.cambios = cambios;
        sistema.iteracion = iteracion;

        return {
            cambios: cambios,
            iteraciones: iteracion,
            convergencia: iteracion < maxIteraciones
        };
    }

    /**
     * Recalcular sistema completo (simulación de cálculo)
     * @param {Object} sistema - Sistema a recalcular
     */
    function recalcularSistema(sistema) {
        // Aquí se llamaría al motor de cálculo completo
        // Por ahora, marcamos que necesita recálculo
        sistema.needsRecalc = true;
    }

    /**
     * Evaluar sistema completo y clasificar errores por severidad
     * @param {Object} sistema - Sistema a evaluar
     * @returns {Object} Errores clasificados
     */
    function evaluarSistemaCompleto(sistema) {
        var criticos = [];
        var medios = [];
        var bajos = [];

        for (var i = 0; i < sistema.puntos.length; i++) {
            var p = sistema.puntos[i];
            var nodo = sistema.estado.nodos[i];
            if (!nodo) continue;

            var decision = evaluarSistema(p, nodo);

            // Clasificar errores por severidad
            if (decision.estadoGlobal === "FAIL") {
                decision.errores.forEach(function(err) {
                    // Extraer tipo de error para deduplicación
                    var tipo = err.split(':')[0] || err;
                    if (err.includes('CRÍTICO') || err.includes('FALLA A TIERRA') || err.includes('interruptiva')) {
                        // Verificar si ya existe error de este tipo para este punto
                        var existe = criticos.some(function(c) { return c.punto === i && c.error.split(':')[0] === tipo; });
                        if (!existe) {
                            criticos.push({ punto: i, error: err });
                        }
                    } else {
                        var existeMedio = medios.some(function(m) { return m.punto === i && m.error.split(':')[0] === tipo; });
                        if (!existeMedio) {
                            medios.push({ punto: i, error: err });
                        }
                    }
                });
            }

            decision.warnings.forEach(function(warn) {
                var tipo = warn.split(':')[0] || warn;
                if (warn.includes('coordinación') || warn.includes('tensión')) {
                    var existeMedio = medios.some(function(m) { return m.punto === i && m.error.split(':')[0] === tipo; });
                    if (!existeMedio) {
                        medios.push({ punto: i, error: warn });
                    }
                } else {
                    var existeBajo = bajos.some(function(b) { return b.punto === i && b.error.split(':')[0] === tipo; });
                    if (!existeBajo) {
                        bajos.push({ punto: i, error: warn });
                    }
                }
            });
        }

        return { criticos: criticos, medios: medios, bajos: bajos };
    }

    /**
     * Resolver errores críticos
     * @param {Object} sistema - Sistema
     * @param {Array} criticos - Errores críticos
     * @param {Array} cambios - Cambios acumulados
     */
    function resolverCriticos(sistema, criticos, cambios) {
        criticos.forEach(function(critico) {
            var nodo = sistema.estado.nodos[critico.punto];
            var p = sistema.puntos[critico.punto];

            // Regla: Falla a tierra - REEMPLAZO OBLIGATORIO (no solo sugerencia)
            if (critico.error.includes('FALLA A TIERRA') || critico.error.includes('FALTA GFP')) {
                var I_diseño = nodo.CDT ? nodo.CDT.I_diseño : (nodo.feeder ? nodo.feeder.cargaA * 1.25 : 0);
                var If_tierra = p.faseTierra ? p.faseTierra.iscFt * 1000 : 0;

                // Usar catálogo profesional para seleccionar breaker con GFP
                if (typeof CatalogoBreakersPro !== 'undefined') {
                    var breakerGFP = CatalogoBreakersPro.seleccionarBreaker({
                        voltaje: leerTension(),
                        I_diseño: I_diseño,
                        Isc: p.isc * 1000,
                        requiereGFP: true,
                        If_tierra: If_tierra,
                        requiereCoordinacion: true
                    });

                    if (breakerGFP) {
                        var reporte = CatalogoBreakersPro.generarReporte(breakerGFP, {
                            voltaje: leerTension(),
                            I_diseño: I_diseño,
                            Isc: p.isc * 1000,
                            requiereGFP: true,
                            If_tierra: If_tierra,
                            requiereCoordinacion: true
                        });

                        // MUTAR EL MODELO REAL (no solo sugerir)
                        if (!nodo.equip) nodo.equip = {};
                        nodo.equip.cap = breakerGFP.In_options ? Math.max.apply(Math, breakerGFP.In_options) : breakerGFP.frame;
                        nodo.equip.iDisparo = breakerGFP.ajustes ? (breakerGFP.ajustes.Ig_amperes || (If_tierra * 0.3)) : (If_tierra * 0.3);
                        nodo.equip.tieneGFP = true;
                        nodo.equip.soportaGFP = true;
                        nodo.equip.tipo = "LSIG";
                        nodo.equip.fabricante = breakerGFP.brand;
                        nodo.equip.modelo = breakerGFP.family + " " + breakerGFP.frame;
                        nodo.equip.disparo = breakerGFP.trip;
                        nodo.equip.long_pickup = breakerGFP.ajustes ? breakerGFP.ajustes.Ir : 1.0;
                        nodo.equip.long_delay = breakerGFP.ajustes ? breakerGFP.ajustes.t_long : 6;
                        nodo.equip.short_pickup = breakerGFP.ajustes ? breakerGFP.ajustes.Isd : 6;
                        nodo.equip.short_delay = breakerGFP.ajustes ? breakerGFP.ajustes.t_short : 0.3;
                        if (breakerGFP.ajustes && breakerGFP.ajustes.Ig_amperes) {
                            nodo.equip.pickupTierra = breakerGFP.ajustes.Ig_amperes;
                            nodo.equip.ground_pickup = breakerGFP.ajustes.Ig;
                        }

                        cambios.push({
                            tipo: 'BREAKER_LSIG',
                            punto: critico.punto,
                            prioridad: 'CRITICA',
                            accion: 'REEMPLAZO: ' + breakerGFP.brand + ' ' + breakerGFP.family + ' ' + breakerGFP.frame + 'A LSIG',
                            razon: 'Protección no ve falla a tierra - REEMPLAZO OBLIGATORIO a LSIG con GFP (NOM 230.95)',
                            reporte: reporte,
                            mutacion: true // Indica que el modelo fue mutado
                        });
                    }
                } else {
                    // Fallback a lógica simple - activar GFP si el breaker lo soporta
                    if (nodo.equip && nodo.equip.soportaGFP) {
                        cambios.push({
                            tipo: 'GFP',
                            punto: critico.punto,
                            prioridad: 'CRITICA',
                            accion: 'ACTIVAR GFP',
                            razon: 'Protección no ve falla a tierra - activar GFP existente'
                        });
                        if (!nodo.equip) nodo.equip = {};
                        nodo.equip.tieneGFP = true;
                        nodo.equip.pickupTierra = (p.faseTierra.iscFt * 1000) * 0.3; // 30% de If_tierra
                    } else {
                        // Si no soporta GFP, marcar para reemplazo manual
                        cambios.push({
                            tipo: 'BREAKER_LSIG',
                            punto: critico.punto,
                            prioridad: 'CRITICA',
                            accion: 'REEMPLAZO MANUAL REQUERIDO',
                            razon: 'Protección no ve falla a tierra - breaker actual no soporta GFP, requiere reemplazo a LSIG'
                        });
                    }
                }
            }

            // Regla: Terminal
            if (critico.error.includes('terminal')) {
                var I_diseño = nodo.CDT ? nodo.CDT.I_diseño : (nodo.feeder ? nodo.feeder.cargaA * 1.25 : 0);

                if (typeof CatalogoBreakersPro !== 'undefined') {
                    var breakerTerminal = CatalogoBreakersPro.seleccionarBreaker({
                        voltaje: leerTension(),
                        I_diseño: I_diseño,
                        Isc: p.isc * 1000,
                        requiereGFP: false,
                        requiereCoordinacion: true
                    });

                    if (breakerTerminal) {
                        var reporte = CatalogoBreakersPro.generarReporte(breakerTerminal, {
                            voltaje: leerTension(),
                            I_diseño: I_diseño,
                            Isc: p.isc * 1000,
                            requiereGFP: false,
                            requiereCoordinacion: true
                        });

                        // MUTAR EL MODELO REAL
                        if (!nodo.equip) nodo.equip = {};
                        nodo.equip.cap = breakerTerminal.frame;
                        nodo.equip.modelo = breakerTerminal.family + " " + breakerTerminal.frame;
                        nodo.equip.fabricante = breakerTerminal.brand;
                        nodo.equip.tipo = breakerTerminal.type || "MCCB";

                        cambios.push({
                            tipo: 'TERMINAL',
                            punto: critico.punto,
                            prioridad: 'CRITICA',
                            accion: 'CAMBIAR_CONDUCTOR: ' + breakerTerminal.brand + ' ' + breakerTerminal.family + ' ' + breakerTerminal.frame + 'A',
                            razon: 'Violación de terminal NOM 110.14C - cambiar conductor (no breaker)',
                            reporte: reporte,
                            mutacion: true
                        });
                    }
                } else {
                    cambios.push({
                        tipo: 'TERMINAL',
                        punto: critico.punto,
                        prioridad: 'CRITICA',
                        accion: 'Subir breaker o dividir circuito',
                        razon: 'Violación de terminal NOM 110.14C'
                    });
                }
            }

            // Regla: Interruptiva
            if (critico.error.includes('interruptiva')) {
                var I_diseño = nodo.CDT ? nodo.CDT.I_diseño : (nodo.feeder ? nodo.feeder.cargaA * 1.25 : 0);

                if (typeof CatalogoBreakersPro !== 'undefined') {
                    var breakerIcu = CatalogoBreakersPro.seleccionarBreaker({
                        voltaje: leerTension(),
                        I_diseño: I_diseño,
                        Isc: p.isc * 1000,
                        requiereGFP: false,
                        requiereCoordinacion: true
                    });

                    if (breakerIcu) {
                        var reporte = CatalogoBreakersPro.generarReporte(breakerIcu, {
                            voltaje: leerTension(),
                            I_diseño: I_diseño,
                            Isc: p.isc * 1000,
                            requiereGFP: false,
                            requiereCoordinacion: true
                        });

                        // MUTAR EL MODELO REAL
                        if (!nodo.equip) nodo.equip = {};
                        nodo.equip.cap = breakerIcu.frame;
                        nodo.equip.modelo = breakerIcu.family + " " + breakerIcu.frame;
                        nodo.equip.fabricante = breakerIcu.brand;
                        nodo.equip.tipo = breakerIcu.type || "MCCB";
                        nodo.equip.Icu = breakerIcu.Icu;

                        cambios.push({
                            tipo: 'INTERRUPTOR',
                            punto: critico.punto,
                            prioridad: 'CRITICA',
                            accion: 'REEMPLAZO: ' + breakerIcu.brand + ' ' + breakerIcu.family + ' ' + breakerIcu.frame + 'A',
                            razon: 'Capacidad interruptiva insuficiente - upgrade breaker',
                            reporte: reporte,
                            mutacion: true
                        });
                    }
                } else {
                    var nuevo = seleccionarInterruptor(p.isc * 1000);
                    cambios.push({
                        tipo: 'INTERRUPTOR',
                        punto: critico.punto,
                        prioridad: 'CRITICA',
                        accion: 'Subir capacidad',
                        razon: 'Capacidad interruptiva insuficiente'
                    });
                    if (!nodo.equip) nodo.equip = {};
                    nodo.equip.cap = nuevo.cap;
                }
            }
        });
    }

    /**
     * Resolver errores medios
     * @param {Object} sistema - Sistema
     * @param {Array} medios - Errores medios
     * @param {Array} cambios - Cambios acumulados
     */
    function resolverMedios(sistema, medios, cambios) {
        medios.forEach(function(medio) {
            var nodo = sistema.estado.nodos[medio.punto];
            var p = sistema.puntos[medio.punto];

            // Regla: Ampacidad
            if (medio.error.includes('ampacidad')) {
                var nuevoCalibre = subirCalibre(nodo.feeder.calibre);
                
                // MUTAR EL MODELO REAL
                nodo.feeder.calibre = nuevoCalibre;
                
                cambios.push({
                    tipo: 'CALIBRE',
                    punto: medio.punto,
                    prioridad: 'ALTA',
                    accion: 'Subir calibre a ' + nuevoCalibre,
                    razon: 'No cumple ampacidad',
                    mutacion: true
                });
            }

            // Regla: Coordinación
            if (medio.error.includes('coordinación')) {
                cambios.push({
                    tipo: 'COORDINACION',
                    punto: medio.punto,
                    prioridad: 'ALTA',
                    accion: 'Ajustar curvas TCC',
                    razon: 'Falta coordinación selectiva'
                });
            }
        });
    }

    /**
     * Resolver optimización (errores bajos)
     * @param {Object} sistema - Sistema
     * @param {Array} bajos - Errores bajos
     * @param {Array} cambios - Cambios acumulados
     * @param {Object} opciones - Opciones de modo
     */
    function resolverOptimizacion(sistema, bajos, cambios, opciones) {
        if (opciones.modo === 'economico') {
            // Modo económico: solo mínimo cumplimiento
            return;
        }

        bajos.forEach(function(bajo) {
            // Modo conservador: sobredimensionar
            if (opciones.modo === 'conservador') {
                cambios.push({
                    tipo: 'OPTIMIZACION',
                    punto: bajo.punto,
                    prioridad: 'BAJA',
                    accion: 'Sobredimensionar para margen adicional',
                    razon: 'Modo conservador'
                });
            }
        });
    }

    /**
     * STEP 4: Validación final con output inteligente
     * @param {Object} sistema - Sistema validado
     * @returns {Object} Resultado de validación
     */
    function validarFinal(sistema) {
        var errores;

        // Usar la misma validación que el flujo principal (MotorValidacionInteligente)
        if (typeof MotorValidacionInteligente !== 'undefined') {
            var validacionInteligente = MotorValidacionInteligente.validarSistemaCompleto({
                puntos: sistema.puntos,
                nodos: sistema.estado.nodos
            });

            // Convertir formato de MotorValidacionInteligente a formato interno
            errores = {
                criticos: (validacionInteligente.errores || []).map(function(err, idx) {
                    return { punto: idx, error: err };
                }),
                medios: (validacionInteligente.warnings || []).map(function(warn, idx) {
                    return { punto: idx, error: warn };
                }),
                bajos: []
            };
        } else {
            // Fallback a validación interna
            errores = evaluarSistemaCompleto(sistema);
        }

        var estado = errores.criticos.length === 0 && errores.medios.length === 0 ? 'OK' : 'WARNING';
        var confianza = 1.0 - (errores.criticos.length * 0.5 + errores.medios.length * 0.2 + errores.bajos.length * 0.1);
        confianza = Math.max(0, Math.min(1, confianza));

        return {
            estado: estado,
            confianza: confianza,
            riesgosResiduales: errores.medios.concat(errores.bajos)
        };
    }

    /**
     * Seleccionar cable base según I_diseño
     * @param {number} I_diseño - Corriente de diseño
     * @returns {string} Calibre seleccionado
     */
    function seleccionarCableBase(I_diseño) {
        var orden = Object.keys(AmpacidadReal.tablaAmpacidad);
        for (var i = 0; i < orden.length; i++) {
            var calibre = orden[i];
            var ampacidad = AmpacidadReal.tablaAmpacidad[calibre].I_75 || 0;
            if (ampacidad >= I_diseño) {
                return calibre;
            }
        }
        return orden[orden.length - 1];
    }

    /**
     * Seleccionar breaker base según I_diseño
     * @param {number} I_diseño - Corriente de diseño
     * @returns {Object} Breaker seleccionado
     */
    function seleccionarBreakerBase(I_diseño) {
        var catalogo = [
            { cap: 15, kA: 10, iDisparo: 150 },
            { cap: 20, kA: 10, iDisparo: 200 },
            { cap: 30, kA: 14, iDisparo: 300 },
            { cap: 40, kA: 22, iDisparo: 400 },
            { cap: 50, kA: 25, iDisparo: 500 },
            { cap: 60, kA: 25, iDisparo: 600 },
            { cap: 70, kA: 30, iDisparo: 700 },
            { cap: 100, kA: 35, iDisparo: 1000 },
            { cap: 125, kA: 42, iDisparo: 1250 },
            { cap: 150, kA: 50, iDisparo: 1500 },
            { cap: 200, kA: 65, iDisparo: 2000 },
            { cap: 250, kA: 65, iDisparo: 2500 },
            { cap: 300, kA: 65, iDisparo: 3000 },
            { cap: 400, kA: 85, iDisparo: 4000 },
            { cap: 600, kA: 100, iDisparo: 6000 }
        ];

        for (var i = 0; i < catalogo.length; i++) {
            if (catalogo[i].cap >= I_diseño) {
                return catalogo[i];
            }
        }

        return catalogo[catalogo.length - 1];
    }

    /**
     * Legacy auto-corrección (mantenido para compatibilidad)
     * @param {Array} puntos - Puntos del sistema actual
     * @param {Object} estado - Estado del sistema (nodos, equipos, etc.)
     * @returns {Object} Resultado de auto-corrección con cambios aplicados
     */
    function autoCorregirSistemaLegacy(puntos, estado) {
        var cambios = [];
        var puntosCorregidos = JSON.parse(JSON.stringify(puntos));
        var estadoCorregido = JSON.parse(JSON.stringify(estado));
        var maxIteraciones = 10;
        var iteracion = 0;
        var cambiosEnIteracion = true;

        // Global iteration loop - continues until all constraints satisfied or max iterations
        while (cambiosEnIteracion && iteracion < maxIteraciones) {
            iteracion++;
            cambiosEnIteracion = false;
            var cambiosIteracion = [];

            for (var i = 0; i < puntosCorregidos.length; i++) {
                var p = puntosCorregidos[i];
                var nodo = estadoCorregido.nodos[i];
                if (!nodo || !nodo.feeder) continue;

                var decision = evaluarSistema(p, nodo);

                if (decision.estadoGlobal === 'PASS') continue;

                // =========================
                // PRIORIDAD 1: CRÍTICO - FALLA A TIERRA
                // =========================
                if (p.faseTierra && p.faseTierra.iscFt > 0) {
                    var iDisparo = (nodo.equip && nodo.equip.iDisparo) ? nodo.equip.iDisparo : 0;
                    if (p.faseTierra.iscFt * 1000 < iDisparo) {
                        var ajuste = mejorarSensibilidadTierra(p, nodo);

                        cambiosIteracion.push({
                            tipo: 'tierra',
                            punto: 'P' + i,
                            prioridad: 'CRITICA',
                            ajuste: ajuste,
                            razon: 'PROTECCIÓN NO VE FALLA A TIERRA (CRÍTICO): If-tierra=' + (p.faseTierra.iscFt * 1000).toFixed(0) + 'A < I_disparo=' + iDisparo + 'A'
                        });

                        aplicarAjusteTierra(nodo, ajuste);
                        cambiosEnIteracion = true;
                        continue;
                    }
                }

                // =========================
                // PRIORIDAD 1: CRÍTICO - INTERRUPTIVO
                // =========================
                if (p.isc * 1000 > (nodo.equip && nodo.equip.cap ? nodo.equip.cap * 1000 : 0)) {
                    var nuevo = seleccionarInterruptor(p.isc * 1000);

                    cambiosIteracion.push({
                        tipo: 'interruptor',
                        punto: 'P' + i,
                        prioridad: 'CRITICA',
                        antes: nodo.equip ? nodo.equip.cap : 0,
                        despues: nuevo.cap,
                        razon: 'Capacidad interruptiva insuficiente: Isc=' + (p.isc * 1000).toFixed(0) + 'A > Cap=' + (nodo.equip ? nodo.equip.cap * 1000 : 0).toFixed(0) + 'A'
                    });

                    if (!nodo.equip) nodo.equip = {};
                    nodo.equip.cap = nuevo.cap;
                    cambiosEnIteracion = true;
                    continue;
                }

                // =========================
                // PRIORIDAD 1: CRÍTICO - VIOLACIÓN TERMINAL
                // =========================
                if (p.CDT && p.CDT.violacionTerminal) {
                    var solucion = resolverTerminal(p);

                    cambiosIteracion.push({
                        tipo: 'terminal',
                        punto: 'P' + i,
                        prioridad: 'CRITICA',
                        accion: solucion,
                        razon: 'Violación de terminal (Art. 110.14C): I_corregida=' + (p.CDT.I_corregida || 0).toFixed(1) + 'A > I_limite=' + (p.CDT.I_limite_terminal || 0).toFixed(1) + 'A'
                    });

                    aplicarSolucionTerminal(nodo, solucion);
                    cambiosEnIteracion = true;
                    continue;
                }

                // =========================
                // PRIORIDAD 2: ALTA - AMPACIDAD
                // =========================
                if (p.CDT && p.CDT.I_final < p.CDT.I_diseño) {
                    var nuevoCalibre = subirCalibre(nodo.feeder.calibre);

                    cambiosIteracion.push({
                        tipo: 'conductor',
                        punto: 'P' + i,
                        prioridad: 'ALTA',
                        antes: nodo.feeder.calibre,
                        despues: nuevoCalibre,
                        razon: 'No cumple ampacidad (Art. 310): I_final=' + (p.CDT.I_final || 0).toFixed(1) + 'A < I_diseño=' + (p.CDT.I_diseño || 0).toFixed(1) + 'A'
                    });

                    nodo.feeder.calibre = nuevoCalibre;
                    cambiosEnIteracion = true;
                    continue;
                }

                // =========================
                // PRIORIDAD 3: MEDIA - FACTOR 125%
                // =========================
                if (p.CDT && p.CDT.sinFactor125) {
                    var nuevoCalibre = subirCalibre(nodo.feeder.calibre);

                    cambiosIteracion.push({
                        tipo: 'conductor',
                        punto: 'P' + i,
                        prioridad: 'MEDIA',
                        antes: nodo.feeder.calibre,
                        despues: nuevoCalibre,
                        razon: 'No cumple factor 125% para carga continua (NOM-001)'
                    });

                    nodo.feeder.calibre = nuevoCalibre;
                    cambiosEnIteracion = true;
                    continue;
                }
            }

            if (cambiosIteracion.length > 0) {
                cambios = cambios.concat(cambiosIteracion);
            }
        }

        return {
            estado: cambios.length > 0 ? 'OPTIMIZADO' : 'YA_CUMPLE',
            cambios: cambios,
            iteraciones: iteracion,
            nivelConfianza: cambios.length > 0 ? 0.85 : 1.0,
            convergencia: iteracion < maxIteraciones
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
