/**
 * solver_electrico.js — Solver Eléctrico Integrado
 * Sistema de convergencia determinística con autocorrección NOM
 * Ampacidad → Cortocircuito → Breaker → TCC → Validación → Autofix
 */

var SolverElectrico = (function() {
    /**
     * Crear contexto de ingeniería para tracking
     */
    function crearContextoIngenieria() {
        return {
            autocorrecciones: [],
            warnings: [],
            errores: [],
            iteraciones: 0,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Preparar nodo para cálculo
     */
    function prepararNodo(nodo, ctx) {
        // Asegurar valores mínimos
        nodo.tempAmbiente = nodo.tempAmbiente || 30;
        nodo.material = nodo.material || 'cobre';
        nodo.paralelos = nodo.paralelos || 1;
        nodo.tipoCarga = nodo.tipoCarga || 'lineal';
        nodo.balanceado = nodo.balanceado !== false;
        nodo.tieneNeutro = nodo.tieneNeutro !== false;
    }

    /**
     * Selección de calibre con margen real NOM
     */
    function seleccionarCalibre(nodo, ctx) {
        if (typeof CONSTANTES === 'undefined' || !CONSTANTES.CONDUCTORES) {
            ctx.errores.push({ nodo: nodo.id, tipo: 'SIN_TABLA_CONDUCTORES' });
            return;
        }

        var Ireq = nodo.I_carga * 1.25; // Factor 1.25 para carga continua NOM-001

        // Usar MotorInteligenteCCC si está disponible
        var cccInfo;
        if (typeof MotorInteligenteCCC !== 'undefined') {
            var config = {
                fases: 3,
                tieneNeutro: nodo.tieneNeutro,
                tipoCarga: nodo.tipoCarga,
                balanceado: nodo.balanceado,
                paralelos: nodo.paralelos,
                fuenteAgrupamiento: 'AUTO'
            };
            var nodoTemp = { id: nodo.id, tempAmbiente: nodo.tempAmbiente };
            var resultado = MotorInteligenteCCC.ejecutar(nodoTemp, config);
            cccInfo = resultado.agrupamientoInfo;
        } else {
            // Fallback simple
            cccInfo = { ccc: 3, factor: 1.0 };
        }

        // Factor de temperatura
        var F_temp = factorTemperatura(nodo.tempAmbiente);
        var F_agrup = cccInfo.factor;

        // Filtrar y calcular ampacidad corregida
        var candidatos = CONSTANTES.CONDUCTORES
            .filter(function(c) { return c.material === nodo.material; })
            .map(function(c) {
                var Icorr = (c.I_tabla || 0) * F_temp * F_agrup * (nodo.paralelos || 1);
                return {
                    calibre: c.calibre,
                    I_tabla: c.I_tabla,
                    Icorr: Icorr,
                    area: c.area
                };
            })
            .filter(function(c) { return c.Icorr >= Ireq; })
            .sort(function(a, b) { return a.Icorr - b.Icorr; });

        if (!candidatos.length) {
            ctx.errores.push({ 
                nodo: nodo.id, 
                tipo: 'SIN_CALIBRE',
                msg: 'No hay conductor que cumpla Ireq=' + Ireq.toFixed(1) + 'A'
            });
            // Último recurso: usar el más grande
            var maxCable = CONSTANTES.CONDUCTORES
                .filter(function(c) { return c.material === nodo.material; })
                .sort(function(a, b) { return (b.I_tabla || 0) - (a.I_tabla || 0); })[0];
            if (maxCable) {
                nodo.conductor = maxCable;
                nodo.I_final = (maxCable.I_tabla || 0) * F_temp * F_agrup;
            }
            return;
        }

        nodo.conductor = candidatos[0];
        nodo.I_final = candidatos[0].Icorr;
        nodo.cccInfo = cccInfo;

        ctx.autocorrecciones.push({
            nodo: nodo.id,
            tipo: 'CALIBRE_SELECCIONADO',
            severidad: 'BAJA',
            msg: 'Calibre ' + candidatos[0].calibre + ' → ' + candidatos[0].Icorr.toFixed(1) + 'A (Ireq=' + Ireq.toFixed(1) + 'A)'
        });
    }

    /**
     * Factor de temperatura según NOM-001
     */
    function factorTemperatura(tempAmbiente) {
        if (typeof CONSTANTES !== 'undefined' && CONSTANTES.FACTOR_TEMPERATURA) {
            var tempKey = tempAmbiente.toString();
            return CONSTANTES.FACTOR_TEMPERATURA[tempKey] || CONSTANTES.FACTOR_TEMPERATURA['default'] || 0.91;
        }
        // Fallback
        if (tempAmbiente <= 35) return 1.0;
        if (tempAmbiente <= 40) return 0.91;
        if (tempAmbiente <= 45) return 0.82;
        if (tempAmbiente <= 50) return 0.71;
        return 0.58;
    }

    /**
     * Cálculo de corto circuito
     */
    function calcularCorto(nodo, ctx) {
        if (!nodo.Zth || !nodo.Vll) {
            ctx.warnings.push({ 
                nodo: nodo.id, 
                tipo: 'DATOS_CORTO_INCOMPLETOS',
                msg: 'Faltan Zth o Vll para cálculo de corto'
            });
            return;
        }

        var Z = Math.sqrt(Math.pow(nodo.Zth.R || 0, 2) + Math.pow(nodo.Zth.X || 0, 2));
        var factor = nodo.tipoSistema === '3f' ? Math.sqrt(3) : 2;
        
        nodo.Isc = (nodo.Vll / (Z * factor)) / 1000; // kA
        nodo.Isc_min = nodo.Isc * 0.95; // Sensibilidad

        if (!isFinite(nodo.Isc) || nodo.Isc <= 0) {
            ctx.errores.push({ 
                nodo: nodo.id, 
                tipo: 'ISC_INVALIDO',
                msg: 'Isc inválido: ' + nodo.Isc
            });
        }
    }

    /**
     * Selección de breaker con catálogo real
     */
    function seleccionarBreaker(nodo, ctx) {
        if (typeof CONSTANTES === 'undefined' || !CONSTANTES.BREAKERS) {
            ctx.errores.push({ nodo: nodo.id, tipo: 'SIN_CATALOGO_BREAKERS' });
            return;
        }

        var In_req = nodo.I_carga * 1.25;
        var Isc_req = nodo.Isc || 0;

        var candidatos = CONSTANTES.BREAKERS
            .filter(function(b) { return b.In >= In_req; })
            .filter(function(b) { return b.Icu >= Isc_req; })
            .sort(function(a, b) { 
                return a.In - b.In || a.Icu - b.Icu; 
            });

        if (!candidatos.length) {
            ctx.errores.push({ 
                nodo: nodo.id, 
                tipo: 'SIN_BREAKER',
                msg: 'No hay breaker que cumpla In>=' + In_req.toFixed(1) + 'A, Icu>=' + Isc_req.toFixed(1) + 'kA'
            });
            return;
        }

        // Clonar breaker seleccionado
        nodo.breaker = JSON.parse(JSON.stringify(candidatos[0]));

        // Settings base IEC
        nodo.breaker.Ir = nodo.breaker.In;       // Long pickup
        nodo.breaker.tr = 5;                     // Long time (s)
        nodo.breaker.Isd = 5 * nodo.breaker.In;  // Short pickup
        nodo.breaker.tsd = 0.3;                  // Short time (s)
        nodo.breaker.Ii = 10 * nodo.breaker.In;  // Instantáneo

        ctx.autocorrecciones.push({
            nodo: nodo.id,
            tipo: 'BREAKER_SELECCIONADO',
            severidad: 'BAJA',
            msg: 'Breaker ' + nodo.breaker.modelo + ' In=' + nodo.breaker.In + 'A Icu=' + nodo.breaker.Icu + 'kA'
        });
    }

    /**
     * Curva TCC modelo IEC simplificada
     */
    function tccTime(brk, I) {
        if (!brk || !isFinite(I) || I <= 0) return Infinity;

        // Instantáneo
        if (I >= brk.Ii) return 0.02;

        // Corto tiempo
        if (I >= brk.Isd) return brk.tsd;

        // Largo tiempo (IEC inversa estándar simplificada)
        var Ip = brk.Ir;
        if (Ip <= 0) return Infinity;
        
        var TMS = brk.tr / 5; // Normalización práctica
        var x = I / Ip;

        if (x <= 1) return Infinity;

        // IEC Standard Inverse: t = 0.14 * TMS / (x^0.02 - 1)
        var t = (0.14 * TMS) / (Math.pow(x, 0.02) - 1);
        
        return isFinite(t) && t > 0 ? t : Infinity;
    }

    /**
     * Coordinación automática par upstream/downstream
     */
    function coordinarPar(up, down, ctx) {
        if (!up.breaker || !down.breaker) return;

        var margen = 0.2; // 200 ms
        var coordina = true;

        // Barrido de corrientes desde pickup downstream hasta Isc
        for (var I = down.breaker.Ir; I <= down.Isc; I *= 1.15) {
            var td = tccTime(down.breaker, I);
            var tu = tccTime(up.breaker, I);

            if (tu <= td + margen) {
                coordina = false;
                break;
            }
        }

        if (!coordina) {
            ajustarUpstream(up, down, ctx);
        } else {
            ctx.autocorrecciones.push({
                nodo: up.id + '→' + down.id,
                tipo: 'COORDINACION_OK',
                severidad: 'BAJA',
                msg: 'Coordinación selectiva OK'
            });
        }
    }

    /**
     * Autocorrección de coordinación upstream
     */
    function ajustarUpstream(up, down, ctx) {
        // 1) Aumentar delay
        up.breaker.tsd += 0.1;
        up.breaker.tr += 0.5;

        if (coordinaCheck(up, down)) {
            ctx.autocorrecciones.push({
                nodo: up.id,
                tipo: 'COORDINACION_AJUSTE_DELAY',
                severidad: 'MEDIA',
                msg: 'Ajuste de delay: tsd=' + up.breaker.tsd.toFixed(1) + 's tr=' + up.breaker.tr.toFixed(1) + 's'
            });
            return;
        }

        // 2) Subir pickup corto
        up.breaker.Isd *= 1.2;

        if (coordinaCheck(up, down)) {
            ctx.autocorrecciones.push({
                nodo: up.id,
                tipo: 'COORDINACION_AJUSTE_PICKUP',
                severidad: 'MEDIA',
                msg: 'Ajuste de pickup corto: Isd=' + up.breaker.Isd.toFixed(1) + 'A'
            });
            return;
        }

        // 3) Elevar instantáneo
        up.breaker.Ii *= 1.2;

        if (coordinaCheck(up, down)) {
            ctx.autocorrecciones.push({
                nodo: up.id,
                tipo: 'COORDINACION_AJUSTE_INSTANTANEO',
                severidad: 'MEDIA',
                msg: 'Ajuste de instantáneo: Ii=' + up.breaker.Ii.toFixed(1) + 'A'
            });
            return;
        }

        // 4) Cambiar breaker (siguiente tamaño)
        var alt = buscarBreakerSuperior(up);
        if (alt) {
            up.breaker = alt;
            ctx.autocorrecciones.push({
                nodo: up.id,
                tipo: 'COORDINACION_CAMBIO_BREAKER',
                severidad: 'ALTA',
                msg: 'Cambio de breaker: ' + alt.modelo
            });
            return;
        }

        // 5) Último recurso: marcar conflicto
        ctx.warnings.push({
            nodo: up.id,
            tipo: 'SIN_SELECTIVIDAD_TOTAL',
            msg: 'No se logró coordinación con ' + down.id
        });
    }

    /**
     * Verificar si coordina
     */
    function coordinaCheck(up, down) {
        var margen = 0.2;
        for (var I = down.breaker.Ir; I <= down.Isc; I *= 1.15) {
            var td = tccTime(down.breaker, I);
            var tu = tccTime(up.breaker, I);
            if (tu <= td + margen) return false;
        }
        return true;
    }

    /**
     * Buscar breaker superior
     */
    function buscarBreakerSuperior(nodo) {
        if (typeof CONSTANTES === 'undefined' || !CONSTANTES.BREAKERS) return null;

        var In_actual = nodo.breaker.In;
        var Icu_actual = nodo.breaker.Icu;

        return CONSTANTES.BREAKERS
            .filter(function(b) { return b.In > In_actual || b.Icu > Icu_actual; })
            .sort(function(a, b) { return a.In - b.In || a.Icu - b.Icu; })[0] || null;
    }

    /**
     * Validación NOM del nodo
     */
    function validarNodo(nodo, ctx) {
        // Validar ampacidad
        if (!nodo.I_final || nodo.I_final <= 0) {
            ctx.errores.push({
                nodo: nodo.id,
                tipo: 'AMPACIDAD_INVALIDA',
                msg: 'Ampacidad final inválida: ' + (nodo.I_final || 0)
            });
        }

        // Validar breaker
        if (!nodo.breaker) {
            ctx.errores.push({
                nodo: nodo.id,
                tipo: 'SIN_BREAKER',
                msg: 'No se seleccionó breaker'
            });
        }

        // Validar capacidad interruptiva
        if (nodo.breaker && nodo.Isc && nodo.breaker.Icu < nodo.Isc) {
            ctx.errores.push({
                nodo: nodo.id,
                tipo: 'ICU_INSUFICIENTE',
                msg: 'Icu=' + nodo.breaker.Icu + 'kA < Isc=' + nodo.Isc.toFixed(2) + 'kA'
            });
        }
    }

    /**
     * Reparación local (máx 3 intentos)
     */
    function repararNodo(nodo, ctx) {
        var intentos = 0;

        while (intentos < 3) {
            var necesitaReparacion = false;

            if (!nodo.I_final || nodo.I_final <= 0) {
                nodo.tempAmbiente = nodo.tempAmbiente || 30;
                seleccionarCalibre(nodo, ctx);
                necesitaReparacion = true;
            }

            if (nodo.breaker && nodo.Isc && nodo.breaker.Icu < nodo.Isc) {
                seleccionarBreaker(nodo, ctx);
                necesitaReparacion = true;
            }

            if (nodo.upstream) {
                coordinarPar(nodo.upstream, nodo, ctx);
            }

            if (!necesitaReparacion && nodoValido(nodo)) {
                return;
            }

            intentos++;
        }

        ctx.errores.push({
            nodo: nodo.id,
            tipo: 'NO_CONVERGE',
            msg: 'Nodo no converge después de 3 intentos'
        });
    }

    /**
     * Verificar si nodo es válido
     */
    function nodoValido(nodo) {
        return nodo.I_final > 0 && 
               nodo.breaker && 
               (!nodo.Isc || nodo.breaker.Icu >= nodo.Isc);
    }

    /**
     * Evaluar sistema completo
     */
    function evaluarSistema(sistema, ctx) {
        var hayError = ctx.errores.length > 0;
        var hayWarn = ctx.warnings.length > 0;

        sistema.estado = hayError ? 'ROJO' : (hayWarn ? 'AMARILLO' : 'VERDE');
        sistema.contexto = ctx;
    }

    /**
     * Solver principal del sistema
     */
    function solveSistema(sistema) {
        var ctx = crearContextoIngenieria();

        // Ordenar nodos (si hay jerarquía)
        var nodosOrdenados = sistema.nodos || [];
        if (sistema.nodosOrdenados) {
            nodosOrdenados = sistema.nodosOrdenados;
        }

        for (var i = 0; i < nodosOrdenados.length; i++) {
            var nodo = nodosOrdenados[i];

            prepararNodo(nodo, ctx);
            seleccionarCalibre(nodo, ctx);
            calcularCorto(nodo, ctx);
            seleccionarBreaker(nodo, ctx);

            if (nodo.upstream) {
                coordinarPar(nodo.upstream, nodo, ctx);
            }

            validarNodo(nodo, ctx);
            repararNodo(nodo, ctx);
        }

        evaluarSistema(sistema, ctx);

        return { sistema: sistema, contexto: ctx };
    }

    return {
        crearContextoIngenieria: crearContextoIngenieria,
        prepararNodo: prepararNodo,
        seleccionarCalibre: seleccionarCalibre,
        calcularCorto: calcularCorto,
        seleccionarBreaker: seleccionarBreaker,
        tccTime: tccTime,
        coordinarPar: coordinarPar,
        ajustarUpstream: ajustarUpstream,
        validarNodo: validarNodo,
        repararNodo: repararNodo,
        evaluarSistema: evaluarSistema,
        solveSistema: solveSistema
    };
})();

if (typeof window !== 'undefined') {
    window.SolverElectrico = SolverElectrico;
}
