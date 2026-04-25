/**
 * app.js — FASE 8 — Con todas las mejoras integradas
 */

/**
 * Clase de error tipificado para cálculos
 * Permite diferenciar tipos de error para manejo específico
 */
var CalculoError = (function() {
    function CalculoError(code, message) {
        this.name = 'CalculoError';
        this.code = code;
        this.message = message;
        this.stack = (new Error()).stack;
    }
    
    CalculoError.prototype = Object.create(Error.prototype);
    CalculoError.prototype.constructor = CalculoError;
    
    // Códigos de error estandarizados
    CalculoError.CODES = {
        VALIDACION: 'VALIDACION_FAIL',
        AMPACIDAD: 'AMPACIDAD_FAIL',
        DEPENDENCIA: 'DEPENDENCIA_FAIL',
        CALCULO: 'CALCULO_FAIL',
        ENTRADA: 'ENTRADA_INVALIDA'
    };
    
    return CalculoError;
})();

// Exportar CalculoError globalmente para uso en otros módulos
if (typeof window !== 'undefined') {
    window.CalculoError = CalculoError;
}

var App = (function() {

    var estado = {
        modo: 'conocido',
        tipoSistema: '3f',
        // Fase 2: Leer X/R del estado por punto
        xR: { default: 15 },
        // Fase 5: Configuración X0 por defecto
        x0Config: 'plano_acero',
        // Fase 5: Tipo de aterrizamiento del transformador
        tipoAter: 'yg_solido',
        // Fase 8: Capacitores
        capKvar: 0, capTension: 0, capDistancia: 0,
        // Estado de los motores
        motores: [
            { hp: 100, tipo: 'induccion', xdpp: 0, eficiencia: 0, punto: 'P0' }
        ],
        // Fase 9: Estructura de nodos (árbol) para soportar ramificaciones
        nodos: [
            {
                id: 'P0',
                parentId: null,
                nombre: 'Punto 0',
                feeder: {
                    calibre: '4/0',
                    material: 'cobre',
                    canalizacion: 'acero',
                    longitud: 30,
                    paralelo: 1,
                    cargaA: 200,
                    cargaFP: 0.9
                },
                equip: {
                    tipo: '',
                    modelo: '',
                    cap: 0,
                    iDisparo: 0,
                    nombre: ''
                }
            }
        ],
        resultados: null,
        autocorregirActivo: false
    };

    function verificarDependencias() {
        // Separar dependencias de cálculo de UI
        var dependenciasCalculo = ['Motor', 'CONSTANTES', 'LoadContext', 'AmpacidadReal', 'Convert', 'Impedancias'];
        var dependenciasCalculoOpcionales = [
            'ValidadorSistema',
            'MotorValidacionInteligente',
            'MotorAutocorreccionTotal',
            'MotorAutocorreccion',
            'MotorConsistencia',
            'MotorDiagnostico',
            'MotorProtecciones',
            'MotorInteligenteCCC',
            'MotorDisenoAutomatico',
            'CatalogoEquiposReal',
            'MotorCoordinacionReal',
            'SolverElectrico',
            'TCCDigitalizer',
            'AgrupamientoNOM',
            'Semaforo',
            'DebugVisualPro',
            'TCCChartReal',
            'ExcelExportPro'
        ];
        var dependenciasUI = ['UIAlimentadores', 'UIMotores', 'UIDiagrama', 'UIResultados',
                               'UICoordonograma', 'UIConfiguracion', 'UIEquipos', 'UIToast'];

        var faltantesCalculo = dependenciasCalculo.filter(function(dep) {
            return typeof window[dep] === 'undefined';
        });

        var faltantesCalculoOpcionales = dependenciasCalculoOpcionales.filter(function(dep) {
            return typeof window[dep] === 'undefined';
        });

        var faltantesUI = dependenciasUI.filter(function(dep) {
            return typeof window[dep] === 'undefined';
        });

        if (faltantesCalculo.length > 0) {
            console.error('Módulos de cálculo faltantes:', faltantesCalculo);
            return false;
        }

        if (faltantesCalculoOpcionales.length > 0) {
            console.warn('Módulos de cálculo opcionales faltantes:', faltantesCalculoOpcionales);
        }

        if (faltantesUI.length > 0) {
            console.warn('Módulos de UI faltantes (opcional):', faltantesUI);
        }
        
        // Verificar capacidades reales, no solo existencia
        console.assert(typeof Motor?.ejecutar === 'function', 'Motor.ejecutar debe ser una función');
        console.assert(typeof Convert?.A_to_kA === 'function', 'Convert.A_to_kA debe ser una función');
        console.assert(typeof Impedancias?.magnitud === 'function', 'Impedancias.magnitud debe ser una función');
        console.assert(typeof LoadContext?.validateContext === 'function', 'LoadContext.validateContext debe ser una función');
        
        // Verificar que leerContextoCarga no ha sido sobrescrito
        console.assert(typeof leerContextoCarga === 'function', 'leerContextoCarga debe ser una función');
        
        return true;
    }

    function actualizarEstadoContexto() {
        var ctx = leerContextoCarga();
        var statusDiv = document.getElementById('load-context-status');
        
        if (!statusDiv) return;
        
        if (!ctx) {
            statusDiv.innerHTML = '<span class="text-xs text-[--text-muted]">Sin contexto: modo ideal balanceado</span>';
            return;
        }

        // Validar contexto
        var errs = LoadContext.validateContext(ctx);
        if (errs.length > 0) {
            statusDiv.innerHTML = '<span class="text-xs text-[--red]"><i class="fas fa-exclamation-circle mr-1"></i>Contexto inválido: ' + errs.join(', ') + '</span>';
            return;
        }

        // Aplicar contexto al estado
        try {
            LoadContext.applyLoadContext(estado, ctx);
            
            var summary = LoadContext.getContextSummary(estado);
            var unbalancePct = (ctx.system.unbalance * 100).toFixed(1);
            
            statusDiv.innerHTML = '<span class="text-xs text-[--green]"><i class="fas fa-check-circle mr-1"></i>Datos de operación real aplicados</span>' +
                '<span class="text-xs text-[--text-muted] ml-2">Ia: ' + ctx.phases.Ia + 'A, Ib: ' + ctx.phases.Ib + 'A, Ic: ' + ctx.phases.Ic + 'A, In: ' + ctx.phases.In + 'A | Desbalance: ' + unbalancePct + '%</span>';
        } catch (e) {
            statusDiv.innerHTML = '<span class="text-xs text-[--red]"><i class="fas fa-times-circle mr-1"></i>Error: ' + e.message + '</span>';
        }
    }

    function validarEntradas() {
        var tension = document.getElementById('input-tension');
        if (tension && tension.value !== '' && (tension.value <= 0 || isNaN(tension.value))) {
            UIToast.mostrar('La tensión debe ser un número positivo', 'error');
            return false;
        }
        
        var iscFuente = document.getElementById('input-isc-fuente');
        if (estado.modo === 'desconocido' && iscFuente && iscFuente.value !== '') {
            var iscVal = parseFloat(iscFuente.value);
            if (isNaN(iscVal) || iscVal <= 0) {
                UIToast.mostrar('La corriente de cortocircuito debe ser positiva', 'error');
                return false;
            }
        }
        
        return true;
    }

    function init() {
        if (!verificarDependencias()) {
            console.error('No se pueden inicializar componentes faltantes');
            UIToast.mostrar('Error: Módulos necesarios no cargados. Recargue la página.', 'error');
            return;
        }
        
        try {
            // Poblar dropdowns
            poblarDropdownZonas();
            poblarDropdownCapacidadesTrafo();
        
        // Cargar perfil de usuario si existe (tiene prioridad sobre legacy)
        if (typeof Profile !== 'undefined' && Profile.loadToUI) {
            var profile = Profile.getProfile();
            if (typeof Profile.validateProfile === 'function' && Profile.validateProfile(profile)) {
                Profile.loadToUI();
            } else {
                console.warn('Perfil inválido o incompleto, usando valores por defecto');
            }
        } else {
            // Solo cargar legacy config si no hay perfil
            var guardado = localStorage.getItem('calculadora_cortocircuito_config');
            if (guardado) {
                try {
                    var config = JSON.parse(guardado);
                    estado.modo = config.modo || 'conocido';
                    estado.tipoSistema = config.tipoSistema || '3f';
                    var tensionInput = document.getElementById('input-tension');
                    if (tensionInput) tensionInput.value = config.tension || 220;
                    var zonaInput = document.getElementById('input-zona-electrica');
                    if (zonaInput) {
                        zonaInput.value = config.zona || '';
                        if (config.zona) {
                            actualizarIscPorZona();
                        }
                    }
                } catch (e) {
                    console.error('Error cargando configuración legacy:', e);
                }
            }
        }

        UIEquipos.initP0();
        UIAlimentadores.init();
        UIMotores.init();
        UIDiagrama.dibujar();

        // Campo I disparo para P0
        var p0Cap = document.getElementById('equip-p0-cap');
        if (p0Cap) {
            var p0Parent = p0Cap.parentElement;
            if (p0Parent && p0Parent.parentElement) {
                var idDiv = document.createElement('div');
                idDiv.className = 'mt-3';
                idDiv.innerHTML =
                    '<div class="equip-divider"><span class="equip-divider-label"><i class="fas fa-bolt mr-1"></i> Disparo instantaneo</span></div>' +
                    '<div class="carga-grid">' +
                        '<div><label class="field-label">I disparo (A)</label><input type="number" id="equip-p0-idisparo" value="" min="0" step="1" placeholder="0 = sin dato" oninput="App.clearResults()"></div>' +
                        '<div class="flex items-end col-span-2"><p class="text-[0.65rem] text-[--text-muted] leading-relaxed">Corriente de disparo instantaneo. Se compara contra falla minima para verificar sensibilidad.</p></div>' +
                    '</div>';
                p0Parent.parentElement.appendChild(idDiv);
            }
        }

        // Botón de reset
        var btnCalc = document.querySelector('.btn-primary');
        if (btnCalc && btnCalc.parentElement) {
            var resetBtn = document.createElement('button');
            resetBtn.className = 'btn-sm ml-2';
            resetBtn.innerHTML = '<i class="fas fa-undo text-[0.65rem"></i> Reiniciar';
            resetBtn.onclick = resetTodo;
            btnCalc.parentElement.insertBefore(resetBtn, btnCalc.nextSibling);
        }

        var timer;
        window.addEventListener('resize', function() {
            clearTimeout(timer);
            timer = setTimeout(UIDiagrama.dibujar, 150);
        });

        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (typeof r === 'number') r = [r, r, r, r];
                var tl=r[0], tr=r[1], br=r[2], bl=r[3];
                this.moveTo(x + tl, y); this.lineTo(x + w - tr, y);
                this.quadraticCurveTo(x + w, y, x + w, y + tr);
                this.lineTo(x + w, y + h - br);
                this.lineTo(x + bl, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - bl);
                this.lineTo(x, y + tl);
                this.quadraticCurveTo(x, y, x, y + tl, y);
                this.closePath();
            };
        }
        
        // Inicializar cálculo automático de resistencia de retorno a tierra
        setTimeout(function() {
            if (typeof Motor !== 'undefined' && Motor.actualizarRetornoTierra) {
                Motor.actualizarRetornoTierra();
            }
        }, 100);
        
        } catch (e) {
            console.error('Error en init:', e);
            UIToast.mostrar('Error al inicializar la aplicación', 'error');
        }
    }

    function resetTodo() {
        estado = {
            modo: 'conocido',
            tipoSistema: '3f',
            xR: { default: 15 },
            x0Config: 'plano_acero',
            tipoAter: 'yg_solido',
            capKvar: 0, capTension: 0, capDistancia: 0,
            ctx: null,
            // Fase 9: Estructura de nodos (árbol)
            nodos: [
                {
                    id: 'P0',
                    parentId: null,
                    nombre: 'Punto 0',
                    feeder: {
                        calibre: '4/0',
                        material: 'cobre',
                        canalizacion: 'acero',
                        longitud: 30,
                        paralelo: 1,
                        cargaA: 200,
                        cargaFP: 0.9
                    },
                    equip: {
                        tipo: '',
                        modelo: '',
                        cap: 0,
                        iDisparo: 0,
                        nombre: ''
                    }
                }
            ],
            motores: [
                { hp: 100, tipo: 'induccion', xdpp: 0, eficiencia: 0, punto: 1 }
            ],
            resultados: null
        };
        // Limpiar campos del DOM
        var elements = [
            'input-tension', 'input-isc-conocido', 'input-isc-fuente', 'input-mva-fuente',
            'input-xr-fuente', 'input-trafo-kva', 'input-trafo-z', 'input-trafo-vp',
            'input-trafo-vs', 'input-x0-config', 'input-trafo-aterr', 'input-cap-kvar',
            'input-cap-tension', 'capacidadMaxAlimentadores', 'temperatura-ambiente'
        ];
        elements.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === 'input-tension') el.value = 220;
                else if (id === 'input-isc-conocido') el.value = 10;
                else if (id === 'input-isc-fuente') el.value = 25;
                else if (id === 'input-xr-fuente') el.value = 15;
                else if (id === 'input-trafo-kva') el.value = 500;
                else if (id === 'input-trafo-z') el.value = 5.75;
                else if (id === 'input-trafo-vp') el.value = 13200;
                else if (id === 'input-trafo-vs') el.value = 220;
                else if (id === 'input-x0-config') el.value = 'plano_acero';
                else if (id === 'input-trafo-aterr') el.value = 'yg_solido';
                else if (id === 'capacidadMaxAlimentadores') el.value = '5';
                else if (id === 'temperatura-ambiente') el.value = '30';
                else el.value = '';
            }
        });
        
        var equipTipo = document.getElementById('equip-p0-tipo');
        if (equipTipo) equipTipo.value = '';
        var equipModelo = document.getElementById('equip-p0-modelo');
        if (equipModelo) equipModelo.innerHTML = '<option value="">-- Seleccionar tipo --</option>';
        var equipCap = document.getElementById('equip-p0-cap');
        if (equipCap) equipCap.value = '';
        var equipIdisparo = document.getElementById('equip-p0-idisparo');
        if (equipIdisparo) equipIdisparo.value = '';

        // Re-renderizar todo
        UIAlimentadores.renderizar();
        UIMotores.renderizar();
        UIDiagrama.dibujar();
    }

    function calculate() {
        if (!verificarDependencias()) {
            UIToast.mostrar('Error: Módulos necesarios no cargados', 'error');
            return;
        }
        
        if (!validarEntradas()) {
            return;
        }
        
        // Congelar snapshot del estado para evitar race conditions
        // Si el usuario cambia la UI durante el cálculo, no afectará el resultado
        var estadoSnapshot = JSON.parse(JSON.stringify(estado));
        
        // Aplicar contexto de carga antes de calcular (usando snapshot)
        var ctx = leerContextoCarga();
        if (ctx) {
            estadoSnapshot.ctx = ctx;
        }
        
        var btnCalc = document.querySelector('.btn-primary');
        if (btnCalc) {
            btnCalc.disabled = true;
            btnCalc.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
        }
        
        // Usar Promise para mejor manejo asíncrono
        Promise.resolve().then(function() {
            try {
                // Validar modo antes de calcular
                if (estado.modo === 'conocido') {
                    var iscConocido = parseFloat(document.getElementById('input-isc-conocido')?.value || 0);
                    if (!iscConocido || iscConocido <= 0) {
                        // Auto-fix: cambiar a modo completo
                        console.warn('Isc inválido en modo conocido, cambiando a modo completo');
                        estado.modo = 'completo';
                        UIConfiguracion.setMode('completo');
                        UIToast.mostrar('Isc inválido, cambiado a modo completo automáticamente', 'warning');
                    }
                }

                // Detector de inconsistencias (nivel ETAP/SKM) - SOLO ADVERTENCIA, NO BLOQUEO
                if (typeof MotorConsistencia !== 'undefined') {
                    var sistemaCheck = {
                        modo: estado.modo,
                        Isc: parseFloat(document.getElementById('input-isc-conocido')?.value || 0),
                        kVA: parseFloat(document.getElementById('input-trafo-kva')?.value || 0),
                        Z: parseFloat(document.getElementById('input-trafo-z')?.value || 0),
                        voltaje: estado.tension,
                        estadoGlobalReportado: null,
                        hayFailReal: false
                    };

                    var check = MotorConsistencia.detectarInconsistencias(sistemaCheck);

                    if (!check.ok) {
                        console.warn('Inconsistencias detectadas:', check.issues);
                        if (check.appliedFixes.length > 0) {
                            UIToast.mostrar('Autocorrecciones aplicadas: ' + check.appliedFixes.join(', '), 'warning');
                        }
                        // NO BLOQUEAR - solo advertir y continuar
                    }
                }

                // Usar cálculo local directamente (backend API desactivado)
                if (typeof Motor === 'undefined') {
                    throw new CalculoError(CalculoError.CODES.DEPENDENCIA, 'Motor module no cargado');
                }
                
                // Temporalmente usar el snapshot para el cálculo
                var estadoOriginal = estado;
                estado = estadoSnapshot;
                
                var resultado = Motor.ejecutar();
                
                // Restaurar estado original y guardar resultados
                estado = estadoOriginal;
                if (!resultado || !resultado.puntos || resultado.puntos.length === 0) {
                    throw new CalculoError(CalculoError.CODES.CALCULO, 'No se obtuvieron resultados del cálculo');
                }
                estado.resultados = resultado.puntos;
                UIResultados.mostrar(resultado.puntos);
                UICoordonograma.dibujar(resultado.puntos);
                UIDiagrama.dibujar();

                // Mostrar validación inteligente si está disponible
                if (resultado.puntos.validacionInteligente) {
                    UIResultados.mostrarValidacionInteligente(resultado.puntos.validacionInteligente);
                }

                // 🚦 Mostrar semáforo del sistema si está disponible
                if (resultado.puntos.semaforo && typeof Semaforo !== 'undefined') {
                    var semaforoSection = document.getElementById('semaforo-section');
                    if (!semaforoSection) {
                        // Crear sección si no existe
                        var resultsSection = document.getElementById('results-section');
                        if (resultsSection) {
                            semaforoSection = document.createElement('section');
                            semaforoSection.id = 'semaforo-section';
                            semaforoSection.className = 'card mt-4';
                            resultsSection.parentNode.insertBefore(semaforoSection, resultsSection.nextSibling);
                        }
                    }
                    if (semaforoSection) {
                        semaforoSection.innerHTML = '<div class="card-title"><i class="fas fa-traffic-light mr-2"></i>Estado del Sistema (Semáforo)</div>' +
                            Semaforo.renderHTML(resultado.puntos.semaforo);
                        semaforoSection.classList.remove('hidden');
                    }
                }

                // 🔧 Mostrar motor de diseño automático si está disponible
                if (resultado.puntos.disenoAutomatico && typeof MotorDisenoAutomatico !== 'undefined') {
                    var disenoSection = document.getElementById('diseno-automatico-section');
                    if (!disenoSection) {
                        // Crear sección si no existe
                        var semaforoSection = document.getElementById('semaforo-section');
                        if (semaforoSection) {
                            disenoSection = document.createElement('section');
                            disenoSection.id = 'diseno-automatico-section';
                            disenoSection.className = 'card mt-4';
                            semaforoSection.parentNode.insertBefore(disenoSection, semaforoSection.nextSibling);
                        }
                    }
                    if (disenoSection) {
                        disenoSection.innerHTML = MotorDisenoAutomatico.generarReporteHTML(resultado.puntos.disenoAutomatico);
                        disenoSection.classList.remove('hidden');
                    }
                }

                // 📊 Mostrar visor TCC interactivo si está disponible
                if (resultado.puntos.disenoAutomatico && typeof TCCViewerInteractivo !== 'undefined') {
                    var tccInteractivoSection = document.getElementById('tcc-interactivo-section');
                    if (!tccInteractivoSection) {
                        // Crear sección si no existe
                        var disenoSection = document.getElementById('diseno-automatico-section');
                        if (disenoSection) {
                            tccInteractivoSection = document.createElement('section');
                            tccInteractivoSection.id = 'tcc-interactivo-section';
                            tccInteractivoSection.className = 'card mt-4';
                            disenoSection.parentNode.insertBefore(tccInteractivoSection, disenoSection.nextSibling);
                        }
                    }
                    if (tccInteractivoSection) {
                        tccInteractivoSection.classList.remove('hidden');
                        // Inicializar visor TCC con resultado de diseño
                        setTimeout(function() {
                            TCCViewerInteractivo.cargarDesdeDiseno(resultado.puntos.disenoAutomatico, 'tcc-interactivo-section');
                        }, 200);
                    }
                }

                // 🔥 Mostrar motor de coordinación real si está disponible
                if (resultado.puntos.coordinacionReal && typeof MotorCoordinacionReal !== 'undefined') {
                    var coordinacionRealSection = document.getElementById('coordinacion-real-section');
                    if (!coordinacionRealSection) {
                        // Crear sección si no existe
                        var tccInteractivoSection = document.getElementById('tcc-interactivo-section');
                        if (tccInteractivoSection) {
                            coordinacionRealSection = document.createElement('section');
                            coordinacionRealSection.id = 'coordinacion-real-section';
                            coordinacionRealSection.className = 'card mt-4';
                            tccInteractivoSection.parentNode.insertBefore(coordinacionRealSection, tccInteractivoSection.nextSibling);
                        }
                    }
                    if (coordinacionRealSection) {
                        coordinacionRealSection.innerHTML = MotorCoordinacionReal.generarReporteHTML(resultado.puntos.coordinacionReal);
                        coordinacionRealSection.classList.remove('hidden');
                    }
                }

                // Renderizar debug visual si está activo
                if (typeof DebugVisualPro !== 'undefined' && DebugVisualPro.isDebugMode()) {
                    DebugVisualPro.renderizarDebug(resultado.puntos, App.estado.nodos);
                }

                // Renderizar gráfica TCC
                if (typeof TCCChartReal !== 'undefined') {
                    var tccSection = document.getElementById('tcc-chart-section');
                    if (tccSection) {
                        tccSection.classList.remove('hidden');
                        var tccResultado = TCCChartReal.generarTCCSistema(App.estado.nodos, 'tccChart');

                        // Mostrar cruces
                        var tccCruces = document.getElementById('tcc-cruces');
                        if (tccCruces && tccResultado.cruces) {
                            var crucesHTML = '<div class="space-y-2">';
                            tccResultado.cruces.forEach(function(c) {
                                var color = c.resultado.conflicto ? 'text-[--red]' : 'text-[--green]';
                                crucesHTML += '<div class="text-xs ' + color + '">• ' + c.upstream + ' vs ' + c.downstream + ': ' + c.resultado.mensaje + '</div>';
                            });
                            crucesHTML += '</div>';
                            tccCruces.innerHTML = crucesHTML;
                        }
                    }
                }

                // Inicializar UI de digitalización de curvas TCC
                if (typeof TCCCalibracionUI !== 'undefined') {
                    var calibracionContainer = document.getElementById('tcc-calibracion-container');
                    if (calibracionContainer) {
                        TCCCalibracionUI.inicializar();
                    }
                }

                // Aplicar autocorrección si está disponible y activo
                // TEMPORALMENTE DESACTIVADO para evitar loop infinito
                if (false && typeof MotorAutocorreccion !== 'undefined' && App.autocorregirActivo) {
                    App.aplicarAutocorreccion(resultado.puntos);
                }

                // Ejecutar diagnóstico global y mostrar panel semáforo
                if (typeof MotorDiagnostico !== 'undefined') {
                    var issues = MotorDiagnostico.diagnosticoGlobal(resultado.puntos);
                    var panelHTML = MotorDiagnostico.renderSemaforo(issues);

                    var panelDiv = document.getElementById('diagnostico-panel');
                    var panelSection = document.getElementById('diagnostico-section');
                    if (panelDiv && panelSection) {
                        panelDiv.innerHTML = panelHTML;
                        panelSection.classList.remove('hidden');
                    }
                }

                UIToast.mostrar('Cálculo completado correctamente', 'success');
            } catch (e) {
                console.error('Error en calculate:', e);
                
                // Manejo específico por tipo de error
                var mensaje = e.message;
                var tipo = 'error';
                
                if (e instanceof CalculoError) {
                    switch (e.code) {
                        case CalculoError.CODES.VALIDACION:
                            mensaje = 'Validación: ' + e.message;
                            tipo = 'warning';
                            break;
                        case CalculoError.CODES.ENTRADA:
                            mensaje = 'Datos de entrada: ' + e.message;
                            tipo = 'warning';
                            break;
                        case CalculoError.CODES.AMPACIDAD:
                            mensaje = 'Ampacidad: ' + e.message;
                            tipo = 'error';
                            break;
                        case CalculoError.CODES.DEPENDENCIA:
                            mensaje = 'Dependencia: ' + e.message;
                            tipo = 'error';
                            break;
                        case CalculoError.CODES.CALCULO:
                            mensaje = 'Cálculo: ' + e.message;
                            tipo = 'error';
                            break;
                        default:
                            mensaje = 'Error: ' + e.message;
                    }
                }
                
                UIToast.mostrar(mensaje, tipo);
            } finally {
                if (btnCalc) {
                    btnCalc.disabled = false;
                    btnCalc.innerHTML = '<i class="fas fa-bolt"></i> Calcular';
                }
            }
        });
    }

    /**
     * Auto-corrección del sistema usando el motor de corrección
     */
    function autoCorregir() {
        if (!verificarDependencias()) {
            UIToast.mostrar('Error: Módulos necesarios no cargados', 'error');
            return;
        }

        if (!validarEntradas()) {
            return;
        }

        if (!estado.resultados || estado.resultados.length === 0) {
            UIToast.mostrar('Primero debe ejecutar un cálculo', 'warning');
            return;
        }

        var btnAuto = document.querySelector('.btn-secondary');
        if (btnAuto) {
            btnAuto.disabled = true;
            btnAuto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Corrigiendo...';
        }

        Promise.resolve().then(function() {
            try {
                if (typeof Motor === 'undefined' || typeof Motor.autoCorregirSistema === 'undefined') {
                    throw new Error('Motor de auto-corrección no disponible');
                }

                var resultado = Motor.autoCorregirSistema(estado.resultados, estado);

                UIResultados.mostrarAutoCorreccion(resultado);

                if (resultado.estado === 'OPTIMIZADO') {
                    UIToast.mostrar('Sistema optimizado con ' + resultado.cambios.length + ' correcciones', 'success');
                    // NO recalcular automáticamente para evitar loop infinito
                    // Usuario debe recalcular manualmente si desea ver efectos
                } else {
                    UIToast.mostrar('El sistema ya cumple con todos los criterios', 'success');
                }
            } catch (e) {
                console.error('Error en autoCorregir:', e);
                UIToast.mostrar('Error: ' + e.message, 'error');
            } finally {
                if (btnAuto) {
                    btnAuto.disabled = false;
                    btnAuto.innerHTML = '<i class="fas fa-magic mr-2"></i> Auto-Corregir';
                }
            }
        });
    }

    /**
     * Auto-corrección total del sistema (motor experto)
     */
    function autoCorregirTotal() {
        if (!verificarDependencias()) {
            UIToast.mostrar('Error: Dependencias faltantes', 'error');
            return;
        }

        if (!validarEntradas()) {
            return;
        }

        var btnTotal = document.querySelector('button[onclick*="autoCorregirTotal"]');
        if (btnTotal) {
            btnTotal.disabled = true;
            btnTotal.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Corrigiendo...';
        }

        setTimeout(function() {
            try {
                if (typeof MotorAutocorreccionTotal === 'undefined') {
                    throw new Error('MotorAutocorreccionTotal no cargado');
                }

                var resultado = MotorAutocorreccionTotal.ejecutar(estado);

                if (resultado.ok) {
                    UIToast.mostrar('Sistema 100% NOM optimizado en ' + resultado.iteraciones + ' iteraciones', 'success');
                    console.log('Cambios aplicados:', resultado.cambios);

                    // Mostrar cambios en UI
                    if (resultado.cambios && resultado.cambios.length > 0) {
                        var cambiosHTML = '<div class="mt-4 p-3 bg-[--surface] rounded-lg border border-[--border]">' +
                            '<p class="text-xs font-semibold text-[--cyan] mb-2 uppercase tracking-wider">Cambios Aplicados</p>' +
                            '<div class="space-y-1 max-h-48 overflow-y-auto">' +
                            resultado.cambios.map(function(c) {
                                return '<div class="text-xs text-[--text-muted]">• ' + c + '</div>';
                            }).join('') +
                            '</div>' +
                            '</div>';

                        var testResults = document.getElementById('test-results');
                        if (testResults) {
                            testResults.innerHTML = cambiosHTML;
                        }
                    }

                    // NO recalcular automáticamente para evitar loop infinito
                    // Usuario debe recalcular manualmente si desea ver efectos
                } else {
                    UIToast.mostrar('No converge: ' + resultado.error, 'warning');
                    console.warn('Cambios parciales:', resultado.cambios);
                }
            } catch (e) {
                console.error('Error en autoCorregirTotal:', e);
                UIToast.mostrar('Error: ' + e.message, 'error');
            } finally {
                if (btnTotal) {
                    btnTotal.disabled = false;
                    btnTotal.innerHTML = '<i class="fas fa-robot mr-2"></i> Auto-Corregir Total';
                }
            }
        }, 100);
    }

    /**
     * Cálculo usando backend API
     */
    async function calculateWithBackend() {
        try {
            // Obtener datos del formulario
            var tension = parseFloat(document.getElementById('input-tension').value) || 220;
            var modo = estado.modo;
            var tipoSistema = estado.tipoSistema;
            
            // Obtener datos de motores
            var motores = estado.motores.map(function(m) {
                return {
                    potencia_kw: m.hp * 0.746,
                    voltaje: tension,
                    nombre: 'Motor ' + m.hp + 'HP'
                };
            });
            
            // Llamar a backend para ICC con motores
            var resultado = await API.iccConMotores({
                voltaje: tension,
                resistencia: 0.02,
                reactancia: 0.05,
                tipo: 'trifasico',
                tiempo: 0.02,
                motores: motores,
                generarCurva: true
            });
            
            // Convertir resultado al formato esperado por UI
            var puntos = [{
                nombre: 'Punto Principal',
                R: 0.02,
                X: 0.05,
                Z: Math.sqrt(0.02 * 0.02 + 0.05 * 0.05),
                isc: resultado.icc_total,
                ipeak: resultado.icc_total * 2.3,
                xr: 0.05 / 0.02,
                motores: resultado.detalle_motores
            }];
            
            estado.resultados = puntos;
            UIResultados.mostrar(puntos);
            UICoordonograma.dibujar(puntos);
            UIDiagrama.dibujar();
            UIToast.mostrar('Cálculo completado (backend API)', 'success');
            
            return puntos;
        } catch (e) {
            console.error('Error en backend API, usando cálculo local:', e);
            // Fallback a cálculo local
            if (typeof Motor === 'undefined') {
                throw new Error('Motor module no cargado');
            }
            
            var resultado = Motor.ejecutar();
            if (resultado.error) {
                throw new Error(resultado.error);
            }
            if (!resultado || !resultado.puntos || resultado.puntos.length === 0) {
                throw new Error('No se obtuvieron resultados del cálculo');
            }
            estado.resultados = resultado.puntos;
            UIResultados.mostrar(resultado.puntos);
            UICoordonograma.dibujar(resultado.puntos);
            UIDiagrama.dibujar();
            UIToast.mostrar('Cálculo completado (fallback local)', 'success');
            
            return resultado.puntos;
        }
    }

    function clearResults() {
        estado.resultados = null;
        if (typeof UIResultados !== 'undefined' && UIResultados.ocultar) {
            UIResultados.ocultar();
        }
        var faseTierraSection = document.getElementById('fase-tierra-section');
        if (faseTierraSection) faseTierraSection.classList.add('hidden');
        var coordonogramaSection = document.getElementById('coordonograma-section');
        if (coordonogramaSection) coordonogramaSection.classList.add('hidden');
        if (typeof UIDiagrama !== 'undefined' && UIDiagrama.dibujar) {
            UIDiagrama.dibujar();
        }
    }

    /**
     * Lee el contexto de carga desde la UI
     * @returns {Object|null} Contexto de carga o null si no hay datos
     */
    function leerContextoCarga() {
        var ia = parseFloat(document.getElementById('ctx-ia')?.value) || 0;
        var ib = parseFloat(document.getElementById('ctx-ib')?.value) || 0;
        var ic = parseFloat(document.getElementById('ctx-ic')?.value) || 0;
        var inVal = parseFloat(document.getElementById('ctx-in')?.value) || 0;
        var inHarm = parseFloat(document.getElementById('ctx-in-harm')?.value) || 0;
        var thdi = parseFloat(document.getElementById('ctx-thdi')?.value) || 0;
        var unbalance = parseFloat(document.getElementById('ctx-unbalance')?.value) || 0;
        var fcc = parseFloat(document.getElementById('ctx-fcc')?.value) || 0;
        var hasSinglePhase = document.getElementById('ctx-single-phase')?.checked || false;

        // Si todos los valores son 0, no hay contexto
        if (ia === 0 && ib === 0 && ic === 0 && inVal === 0 && inHarm === 0 && thdi === 0 && unbalance === 0 && fcc === 0) {
            return null;
        }

        return {
            phases: {
                Ia: ia,
                Ib: ib,
                Ic: ic,
                In: inVal
            },
            harmonics: {
                In_harm: inHarm,
                THDi: thdi
            },
            system: {
                unbalance: unbalance,
                hasSinglePhaseLoads: hasSinglePhase,
                Fcc: fcc
            }
        };
    }

    /**
     * Aplica el contexto de carga al sistema antes de calcular
     */
    function aplicarContextoCarga() {
        var ctx = leerContextoCarga();
        
        if (!ctx) {
            // Sin contexto: modo ideal
            estado.ctx = null;
            actualizarStatusContexto(null);
            return;
        }

        // Validar contexto
        if (typeof LoadContext !== 'undefined') {
            var errs = LoadContext.validateContext(ctx);
            if (errs.length > 0) {
                console.warn('Contexto inválido:', errs);
                UIToast.mostrar('Contexto de carga inválido: ' + errs.join(', '), 'warning');
                estado.ctx = null;
                actualizarStatusContexto(null);
                return;
            }

            // Aplicar contexto al estado
            LoadContext.applyLoadContext(estado, ctx);
            actualizarStatusContexto(ctx);
        }
    }

    /**
     * Actualiza el estado del contexto en la UI
     */
    function actualizarStatusContexto(ctx) {
        var statusDiv = document.getElementById('load-context-status');
        if (!statusDiv) return;

        if (!ctx) {
            statusDiv.innerHTML = '<span class="text-xs text-[--text-muted]"><i class="fas fa-info-circle text-[--cyan] mr-1"></i> Sin contexto: modo ideal balanceado</span>';
            return;
        }

        var summary = LoadContext.getContextSummary(estado);
        var status = LoadContext.getSystemStatus(estado, 0); // 0 = sin ampacidad de neutro específica

        var colorClass = status.color === 'green' ? 'text-[--green]' : 
                        status.color === 'yellow' ? 'text-[--yellow]' : 
                        status.color === 'red' ? 'text-[--red]' : 'text-[--text-muted]';

        var iconClass = status.color === 'green' ? 'fa-check-circle' : 
                       status.color === 'yellow' ? 'fa-exclamation-triangle' : 
                       status.color === 'red' ? 'fa-times-circle' : 'fa-info-circle';

        statusDiv.innerHTML = '<span class="text-xs ' + colorClass + '"><i class="fas ' + iconClass + ' mr-1"></i> ' + summary.message + '</span>';
    }

    function printResults() {
        if (!estado.resultados) { UIToast.mostrar('Primero debe calcular', 'info'); return; }
        window.print();
    }

    function addFeeder() {
        try {
            if (typeof UIAlimentadores === 'undefined') {
                UIToast.mostrar('Error: UIAlimentadores no cargado. Recargue la página.', 'error');
                return;
            }
            // Add child to root node (P0)
            UIAlimentadores.agregarHijo('P0');
        } catch (e) {
            console.error('Error en addFeeder:', e);
            UIToast.mostrar('Error al agregar alimentador', 'error');
        }
    }
    function removeFeeder(nodoId) {
        try {
            if (typeof UIAlimentadores === 'undefined') {
                UIToast.mostrar('Error: UIAlimentadores no cargado. Recargue la página.', 'error');
                return;
            }
            UIAlimentadores.eliminarNodo(nodoId);
        } catch (e) {
            console.error('Error en removeFeeder:', e);
            UIToast.mostrar('Error al eliminar alimentador', 'error');
        }
    }
    function updateFeeder(nodoId, campo, valor) {
        try {
            if (typeof UIAlimentadores === 'undefined') {
                UIToast.mostrar('Error: UIAlimentadores no cargado. Recargue la página.', 'error');
                return;
            }
            UIAlimentadores.actualizarFeeder(nodoId, campo, valor);
        } catch (e) {
            console.error('Error en updateFeeder:', e);
            UIToast.mostrar('Error al actualizar alimentador', 'error');
        }
    }

    // Helper function to convert nodos to feeders for backward compatibility
    function getFeeders() {
        // Fase 9: Convert nodos to feeders format for backward compatibility
        if (estado.nodos && estado.nodos.length > 0) {
            var nodosOrdenados = Impedancias.ordenarPorNivel(estado.nodos);
            // Skip root node (P0) - it doesn't have a real feeder
            return nodosOrdenados.slice(1).map(function(nodo) {
                var f = nodo.feeder || {};
                return {
                    calibre: f.calibre || '4/0',
                    material: f.material || 'cobre',
                    canalizacion: f.canalizacion || 'acero',
                    longitud: f.longitud || 0,
                    paralelo: f.paralelo || 1,
                    cargaA: f.cargaA || 0,
                    cargaFP: f.cargaFP || 0.9,
                    equipTipo: (nodo.equip && nodo.equip.tipo) || '',
                    equipModelo: (nodo.equip && nodo.equip.modelo) || '',
                    equipCap: (nodo.equip && nodo.equip.cap) || 0,
                    equipIDisparo: (nodo.equip && nodo.equip.iDisparo) || 0
                };
            });
        }
        return [];
    }
    function onEquipTipoChange(prefix) {
        try {
            if (typeof UIEquipos === 'undefined') {
                UIToast.mostrar('Error: UIEquipos no cargado. Recargue la página.', 'error');
                return;
            }
            UIEquipos.onTipoChange(prefix);
        } catch (e) {
            console.error('Error en onEquipTipoChange:', e);
            UIToast.mostrar('Error al cambiar tipo de equipo', 'error');
        }
    }
    function onEquipModeloChange(prefix) {
        try {
            if (typeof UIEquipos === 'undefined') {
                UIToast.mostrar('Error: UIEquipos no cargado. Recargue la página.', 'error');
                return;
            }
            UIEquipos.onModeloChange(prefix);
        } catch (e) {
            console.error('Error en onEquipModeloChange:', e);
            UIToast.mostrar('Error al cambiar modelo de equipo', 'error');
        }
    }

    function poblarDropdownZonas() {
        var select = document.getElementById('input-zona-electrica');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar zona...</option>';
        
        Object.keys(CONSTANTES.ZONAS_ELECTRICAS).forEach(function(key) {
            var zona = CONSTANTES.ZONAS_ELECTRICAS[key];
            var option = document.createElement('option');
            option.value = key;
            option.textContent = zona.nombre + ' (' + (zona.v_primario / 1000) + ' kV)';
            option.title = zona.descripción + '\nIsc en MT: ' + zona.isc_primario + ' kA @ ' + (zona.v_primario / 1000) + ' kV\nX/R: ' + zona.xr_típico + '\nRango: ' + zona.isc_mínimo + ' - ' + zona.isc_máximo + ' kA';
            select.appendChild(option);
        });
    }
    
    function poblarDropdownCapacidadesTrafo() {
        var select = document.getElementById('input-trafo-kva');
        if (!select) return;
        
        var valorActual = select.value || 500;
        select.innerHTML = '';
        
        CONSTANTES.CAPACIDADES_TRAFO_KVA.forEach(function(kva) {
            var option = document.createElement('option');
            option.value = kva;
            option.textContent = kva + ' kVA';
            if (kva === valorActual) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    function actualizarIscPorZona() {
        var selectZona = document.getElementById('input-zona-electrica');
        var inputIsc = document.getElementById('input-isc-fuente');
        var inputXR = document.getElementById('input-xr-fuente');
        var inputTrafoVp = document.getElementById('input-trafo-vp');
        var inputTrafoVs = document.getElementById('input-trafo-vs');
        
        if (!selectZona || !inputIsc || !inputXR) return;
        
        var zonaKey = selectZona.value;
        if (!zonaKey) {
            inputIsc.placeholder = 'Seleccionar zona...';
            inputIsc.title = 'Seleccione una zona para calcular automáticamente';
            return;
        }
        
        var zona = CONSTANTES.ZONAS_ELECTRICAS[zonaKey];
        if (!zona) {
            UIToast.mostrar('Zona eléctrica no válida. Seleccionando valor personalizado.', 'warning');
            inputIsc.placeholder = 'Ingresar valor manual...';
            inputIsc.value = '';
            inputIsc.focus();
            return;
        }
        
        if (zonaKey === 'CUSTOM') {
            inputIsc.placeholder = 'Ingresar valor manual...';
            inputIsc.title = 'Ingrese el valor de Isc fuente manualmente';
            inputIsc.value = '';
            inputIsc.disabled = false;
            inputIsc.focus();
        } else {
            // Usar el nuevo formato de datos
            inputIsc.value = zona.isc_primario.toFixed(2);
            inputIsc.placeholder = zona.isc_primario.toFixed(2) + ' kA';
            inputIsc.title = zona.nombre + '\n' + zona.descripción + '\n' +
                        'Isc en MT: ' + zona.isc_primario + ' kA @ ' + (zona.v_primario / 1000) + ' kV\n' +
                        'X/R: ' + zona.xr_típico + '\n' +
                        'Rango: ' + zona.isc_mínimo + ' - ' + zona.isc_máximo + ' kA';
            
            // Bloquear edición manual cuando se selecciona zona
            inputIsc.disabled = true;
            
            // Usar X/R específico de la zona
            inputXR.value = zona.xr_típico;
            inputXR.title = 'X/R según zona: ' + zona.xr_típico;
            
            // Ajustar V primario del transformador si es necesario
            if (inputTrafoVp && zona.v_primario) {
                inputTrafoVp.value = zona.v_primario;
                inputTrafoVp.title = 'V primario según zona: ' + (zona.v_primario / 1000) + ' kV';
            }
            
            // Calcular y mostrar Isc equivalente en BT (REGLA: SIEMPRE en unidades base SI)
            if (inputTrafoVp && inputTrafoVs) {
                var vPrim = parseFloat(inputTrafoVp.value) || zona.v_primario;  // V (base SI)
                var vSec = parseFloat(inputTrafoVs.value) || 480;  // V (base SI)
                var trafoKva = parseFloat(document.getElementById('input-trafo-kva').value) || 500;  // kVA
                var trafoZ = parseFloat(document.getElementById('input-trafo-z').value) || 5.75;  // %
                
                // Convertir a unidades base SI
                var trafoVA = trafoKva * 1000;  // VA (base SI)
                
                // Calcular impedancia de la fuente en MT (ohm, base SI)
                var iscPrimario_A = zona.isc_primario * 1000;  // Convertir kA a A
                var zFuenteMT = (vPrim / Math.sqrt(3)) / iscPrimario_A;  // ohm
                
                // Ratio de transformación
                var ratio = vSec / vPrim;
                
                // Referir impedancia de fuente al secundario (lado común) - ohm
                var zFuenteBT = zFuenteMT * Math.pow(ratio, 2);
                
                // Calcular impedancia del transformador con tolerancia ANSI (±7.5%) - ohm
                var zTrafoNominal = (Math.pow(vSec, 2) / trafoVA) * (trafoZ / 100);  // ohm
                var zTrafoMin = zTrafoNominal * 0.925;  // -7.5%
                var zTrafoMax = zTrafoNominal * 1.075;  // +7.5%
                
                // Caso límite: fuente infinita (relativo al transformador)
                if (zFuenteBT < zTrafoNominal * 0.01) {
                    zFuenteBT = 0;
                    UIToast.mostrar('⚠️ Fuente considerada infinita (Z_fuente < 1% de Z_trafo)', 'warning');
                }
                
                // Separar R y X de fuente usando X/R (IEEE Std 399) - ohm
                var xrFuente = zona.xr_típico || 18;
                var rFuenteBT = zFuenteBT / Math.sqrt(1 + Math.pow(xrFuente, 2));  // ohm
                var xFuenteBT = rFuenteBT * xrFuente;  // ohm
                
                // X/R del transformador variable según kVA (IEEE Std C37.91)
                var xrTrafo;
                if (trafoKva < 500) {
                    xrTrafo = 4 + (trafoKva / 500) * 2;  // 4-6 para <500kVA
                } else {
                    xrTrafo = 6 + ((trafoKva - 500) / 4500) * 4;  // 6-10 para 500-5000kVA
                }
                xrTrafo = Math.max(4, Math.min(10, xrTrafo));  // Limitar rango 4-10
                
                // Separar R y X del transformador - ohm
                var rTrafoNominal = zTrafoNominal / Math.sqrt(1 + Math.pow(xrTrafo, 2));  // ohm
                var xTrafoNominal = rTrafoNominal * xrTrafo;  // ohm
                
                // Total de impedancias complejas en BT (caso nominal) - ohm
                // REGLA ESTRICTA: SIEMPRE sumar R y X por separado, nunca magnitudes intermedias
                var rTotalBT = rFuenteBT + rTrafoNominal;  // ohm
                var xTotalBT = xFuenteBT + xTrafoNominal;  // ohm
                var zTotalBT = Math.sqrt(Math.pow(rTotalBT, 2) + Math.pow(xTotalBT, 2));  // ohm
                
                // Validación crítica: impedancia total inválida
                if (zTotalBT <= 0) {
                    console.error('ERROR CRÍTICO: Impedancia total inválida (Z_total <= 0)');
                    UIToast.mostrar('❌ ERROR: Impedancia total inválida', 'error');
                    return;
                }
                
                // Isc equivalente en BT (caso nominal) - A (base SI)
                var iscBT_A = vSec / (Math.sqrt(3) * zTotalBT);  // A
                
                // Isc solo transformador (sin impedancia de red) - A (base SI)
                var iFla = trafoVA / (Math.sqrt(3) * vSec);  // A
                var iscTrafoOnly_A = iFla / (trafoZ / 100);  // A
                
                // Isc mínimo (escenario desfavorable - Z máximos) - A (base SI)
                var zFuenteMax = zFuenteBT * 1.1;  // red débil - ohm
                var zTotalMax = zFuenteMax + zTrafoMax;  // ohm
                var iscMin_A = vSec / (Math.sqrt(3) * zTotalMax);  // A
                
                // Calcular X/R equivalente en BT (con protección división por cero)
                var xrTotalBT;
                if (rTotalBT < 0.0001) {
                    xrTotalBT = Infinity;
                } else {
                    xrTotalBT = xTotalBT / rTotalBT;
                }
                
                // Validación física: Isc máximo teórico del transformador (más preciso) - A
                var iscMaxTeorico_A = iscTrafoOnly_A;  // A
                
                // Validación de Isc anormalmente bajo (relativo a I_FLA) - SIEMPRE en unidades base SI
                if (iscBT_A < iFla * 2) {
                    console.error('ERROR CRÍTICO: Isc demasiado bajo (' + iscBT_A.toFixed(2) + ' A). I_FLA: ' + iFla.toFixed(2) + ' A');
                    UIToast.mostrar('❌ ERROR: Isc demasiado bajo para este transformador', 'error');
                }
                
                // Validación: Isc no puede ser menor que corriente nominal - A
                if (iscBT_A < iFla) {
                    console.error('ERROR: Isc (' + iscBT_A.toFixed(2) + ' A) menor que corriente nominal (' + iFla.toFixed(2) + ' A)');
                    UIToast.mostrar('❌ ERROR: Isc menor que corriente nominal del transformador', 'error');
                }
                
                // Validación física: Isc no puede exceder límite del transformador - A
                if (iscBT_A > iscTrafoOnly_A * 1.2) {
                    console.error('ERROR: Isc supera límite físico del transformador. Calculado: ' + iscBT_A.toFixed(2) + ' A, Máximo: ' + (iscTrafoOnly_A * 1.2).toFixed(2) + ' A');
                    UIToast.mostrar('❌ ERROR: Isc supera límite físico del transformador', 'error');
                }
                
                // Validación: Isc fuera de rango esperado - A
                var desviacion = Math.abs(iscBT_A - iscMaxTeorico_A) / iscMaxTeorico_A;
                if (desviacion > 0.5) {
                    console.warn('WARNING: Isc fuera de rango esperado. Calculado: ' + iscBT_A.toFixed(2) + ' A, Esperado: ' + iscMaxTeorico_A.toFixed(2) + ' A, Desviación: ' + (desviacion * 100).toFixed(1) + '%');
                }
                
                if (iscBT_A > iscMaxTeorico_A * 1.1) {
                    UIToast.mostrar('⚠️ Isc supera límite físico del transformador (' + Convert.A_to_kA(iscMaxTeorico_A).toFixed(2) + ' kA)', 'warning');
                }
                
                // Validación PRO: ratio de rigidez de fuente
                var ratioRigidez = iscBT_A / iscTrafoOnly_A;
                if (ratioRigidez < 0.3) {
                    console.warn('WARNING: Fuente muy débil. Ratio: ' + ratioRigidez.toFixed(2));
                    UIToast.mostrar('⚠️ Fuente muy débil: la red limita fuertemente el cortocircuito (ratio: ' + ratioRigidez.toFixed(2) + ')', 'warning');
                } else if (ratioRigidez > 0.9) {
                    console.warn('WARNING: Fuente muy rígida. Ratio: ' + ratioRigidez.toFixed(2));
                    UIToast.mostrar('⚠️ Fuente muy rígida: el transformador domina el cortocircuito (ratio: ' + ratioRigidez.toFixed(2) + ')', 'warning');
                }
                
                // Validación de rigidez de fuente
                if (zFuenteBT > 0 && zFuenteBT < zTrafoNominal * 0.1) {
                    UIToast.mostrar('⚠️ Fuente muy rígida: el transformador domina el cortocircuito (Z_fuente < 10% de Z_trafo)', 'warning');
                } else if (zFuenteBT > zTrafoNominal * 10) {
                    UIToast.mostrar('⚠️ Fuente débil: caída de tensión significativa (Z_fuente > 10× Z_trafo)', 'warning');
                }
                
                // Mostrar en UI con formato profesional (usar formateador de unidades)
                var iscBtDisplay = document.getElementById('isc-equivalente-bt');
                var iscBtValor = document.getElementById('isc-bt-valor');
                if (iscBtDisplay && iscBtValor) {
                    iscBtDisplay.classList.remove('hidden');
                    var xrDisplay = xrTotalBT === Infinity ? '∞' : xrTotalBT.toFixed(1);
                    var iscBT_kA = Convert.A_to_kA(iscBT_A);
                    var iscMin_kA = Convert.A_to_kA(iscMin_A);
                    iscBtValor.textContent = 'Secundario trafo: ' + iscBT_kA.toFixed(2) + ' kA @ ' + vSec + ' V | MT: ' + zona.isc_primario + ' kA @ ' + (vPrim / 1000).toFixed(1) + ' kV | X/R: ' + xrDisplay + ' | Min: ' + iscMin_kA.toFixed(2) + ' kA';
                }
                
                // Mostrar advertencia de transformación con ambos valores (convertir para display)
                var xrToast = xrTotalBT === Infinity ? '∞' : xrTotalBT.toFixed(1);
                
                // Ejecutar análisis completo de fallas (IEEE Std 399 / IEC 60909)
                if (typeof FaultAnalysis !== 'undefined') {
                    var groundingType = document.getElementById('input-x0-config') ? document.getElementById('input-x0-config').value : 'yg_solido';
                    var R_tierra = 0;  // Se puede configurar en el futuro
                    
                    var faultNode = FaultAnalysis.buildFaultNode({
                        V_ll: vSec,
                        Z_fuente_BT: { R: rFuenteBT, X: xFuenteBT },
                        Z_trafo: { R: rTrafoNominal, X: xTrafoNominal },
                        Z_linea: { R: 0, X: 0 },  // Se agregará cuando se implementen alimentadores
                        XR: xrTotalBT
                    });
                    
                    var faultResults = FaultAnalysis.runFaultAnalysis(faultNode, groundingType, R_tierra);
                    
                    // Validación física de corrientes de falla
                    if (faultResults.I_LLG_A > faultResults.I_3F_A * 1.2) {
                        UIToast.mostrar('⚠ Falla bifásica a tierra inusualmente alta. Verificar configuración de impedancias.', 'warning');
                    }
                    
                    if (faultResults.warnings.length > 0) {
                        faultResults.warnings.forEach(function(w) {
                            UIToast.mostrar('⚠ ' + w, 'warning');
                        });
                    }
                    
                    // Guardar resultados en estado para uso posterior
                    App.estado.faultResults = faultResults;
                    
                    // Mostrar tipos de falla en UI
                    var faultDisplay = document.getElementById('fault-types-display');
                    if (faultDisplay) {
                        faultDisplay.classList.remove('hidden');
                        document.getElementById('fault-3f').textContent = Convert.A_to_kA(faultResults.I_3F_A).toFixed(2);
                        document.getElementById('fault-lg').textContent = Convert.A_to_kA(faultResults.I_LG_A).toFixed(2);
                        document.getElementById('fault-ll').textContent = Convert.A_to_kA(faultResults.I_LL_A).toFixed(2);
                        document.getElementById('fault-llg').textContent = Convert.A_to_kA(faultResults.I_LLG_A).toFixed(2);
                    }
                }
                
                UIToast.mostrar('⚠️ MT: ' + zona.isc_primario + ' kA @ ' + (vPrim / 1000).toFixed(1) + ' kV → BT: ' + Convert.A_to_kA(iscBT_A).toFixed(2) + ' kA @ ' + vSec + ' V (X/R: ' + xrToast + ', transformado automáticamente)', 'info');
            }
        }
        
        // Limpiar resultados para recalcular
        if (typeof App !== 'undefined' && App.clearResults) {
            App.clearResults();
        }
    }

    function setTrafoVs(v, btn) {
        if (typeof UIConfiguracion !== 'undefined' && UIConfiguracion.setTrafoVs) {
            UIConfiguracion.setTrafoVs(v, btn);
        }
    }

    function actualizarCDT() {
        if (!estado.resultados || estado.resultados.length === 0) return;
        
        // Leer valores de inputs de parámetros C.D.T.
        var fcc = parseFloat(document.getElementById('cdt-fcc-input')?.value) || 1.25;
        var tempAmbiente = parseFloat(document.getElementById('cdt-temp-input')?.value) || 31;
        var numConductores = parseInt(document.getElementById('cdt-conductores-input')?.value) || 3;
        var fAgrupamientoManual = parseFloat(document.getElementById('cdt-agrupamiento-input')?.value);
        
        // Actualizar contexto con nuevo Fcc
        if (!estado.ctx) estado.ctx = {};
        if (!estado.ctx.system) estado.ctx.system = {};
        estado.ctx.system.Fcc = fcc;
        
        // Actualizar sync con input de contexto principal
        var ctxFccInput = document.getElementById('ctx-fcc');
        if (ctxFccInput) ctxFccInput.value = fcc;
        
        // Recalcular CDT para el primer punto
        var nodo = estado.nodos[0];
        if (!nodo || !nodo.feeder) return;
        
        var f = nodo.feeder;
        var cableConfig = {
            temperaturaAislamiento: 75,
            temperaturaAmbiente: tempAmbiente,
            numConductores: numConductores,
            paralelos: f.paralelo || 1
        };
        
        var load = {
            I_cont: f.cargaA,
            I_no_cont: 0,
            esContinua: true,
            Fcc: fcc
        };
        
        var cable = {
            calibre: f.calibre || '4/0',
            temperaturaAislamiento: cableConfig.temperaturaAislamiento,
            temperaturaAmbiente: cableConfig.temperaturaAmbiente,
            numConductores: cableConfig.numConductores,
            paralelos: cableConfig.paralelos,
            F_agrupamiento: fAgrupamientoManual // Usar valor manual si se proporciona
        };
        
        var resultado = AmpacidadReal.verificarAmpacidad(load, cable, { temperaturaTerminal: 75 });
        
        // Actualizar CDT en el resultado
        estado.resultados[0].CDT = {
            I_corregida: resultado.I_corregida,
            I_diseño: resultado.I_diseño,
            I_tabla: resultado.I_tabla,
            F_temp: resultado.F_temp,
            F_agrupamiento: resultado.F_agrupamiento,
            status: resultado.status,
            margen: resultado.margen,
            deficit: resultado.deficit
        };
        
        // Actualizar UI
        UIResultados.mostrarAmpacidadReal(estado.resultados);
    }

    function saveProfile() {
        if (typeof Profile !== 'undefined' && Profile.saveFromUI) {
            var saved = Profile.saveFromUI();
            if (saved) {
                UIToast.mostrar('Perfil guardado correctamente', 'success');
            } else {
                UIToast.mostrar('Error al guardar perfil', 'error');
            }
        } else {
            UIToast.mostrar('Módulo de perfil no disponible', 'error');
        }
    }

    function resetProfile() {
        if (typeof Profile !== 'undefined' && Profile.resetProfile) {
            if (confirm('¿Estás seguro de que quieres restablecer el perfil a valores por defecto?')) {
                Profile.resetProfile();
                location.reload();
            }
        } else {
            UIToast.mostrar('Módulo de perfil no disponible', 'error');
        }
    }

    function imprimirModulos() {
        // Fecha dinámica si quieres usarla en UI
        document.querySelectorAll(".fecha-print").forEach(function(el) {
            el.textContent = new Date().toLocaleDateString();
        });

        window.print();
    }

    function exportarExcel() {
        if (!estado.resultados || estado.resultados.length === 0) {
            UIToast.mostrar('No hay resultados para exportar', 'warning');
            return;
        }

        if (typeof ExcelExportPro === 'undefined') {
            UIToast.mostrar('Módulo de exportación Excel no disponible', 'error');
            return;
        }

        var filename = 'Reporte_Calculo_Electrico_' + new Date().toISOString().slice(0,10) + '.xlsx';

        ExcelExportPro.exportarExcel({ puntos: estado.resultados, nodos: estado.nodos, tipoSistema: estado.tipoSistema, tension: estado.tension }, filename)
            .then(function(exito) {
                if (exito) {
                    UIToast.mostrar('Excel exportado: ' + filename, 'success');
                } else {
                    UIToast.mostrar('Error al exportar Excel', 'error');
                }
            })
            .catch(function(e) {
                console.error('Error en exportarExcel:', e);
                UIToast.mostrar('Error: ' + e.message, 'error');
            });
    }

    function aplicarAutocorreccion(puntos) {
        if (!puntos || puntos.length === 0) return;

        var logTotal = [];
        var cambiosAplicados = false;

        puntos.forEach(function(punto, index) {
            var nodo = estado.nodos[index];
            if (!nodo || !nodo.feeder) return;

            var input = {
                carga: nodo.feeder.cargaA,
                calibre: nodo.feeder.calibre,
                material: nodo.feeder.material,
                voltaje: estado.tension || 480,
                kVA: estado.fuente ? estado.fuente.trafoKva : 500,
                Ztrafo: estado.fuente ? estado.fuente.trafoZ : 5.75,
                tempAmbiente: 40,
                terminalTemp: 75,
                instalacion: nodo.feeder.canalizacion === 'pvc' ? 'conduit' : 'conduit',
                numConductores: 3,
                paralelo: nodo.feeder.paralelo || 1
            };

            var resultado = MotorAutocorreccion.motorSistemaV1(input);

            if (resultado.status === 'OK') {
                // Aplicar correcciones al nodo
                if (resultado.amp.calibre !== nodo.feeder.calibre) {
                    nodo.feeder.calibre = resultado.amp.calibre;
                    cambiosAplicados = true;
                }
                if (resultado.amp.paralelo !== nodo.feeder.paralelo) {
                    nodo.feeder.paralelo = resultado.amp.paralelo;
                    cambiosAplicados = true;
                }
                if (resultado.prot.equipo) {
                    nodo.equip.cap = resultado.prot.equipo.In;
                    cambiosAplicados = true;
                }
                logTotal = logTotal.concat(resultado.log);
            }
        });

        if (cambiosAplicados) {
            console.log('Autocorrección aplicada:', logTotal);
            UIToast.mostrar('Autocorrección aplicada: ' + logTotal.length + ' cambios', 'success');
        }
    }

    function toggleAutocorreccion() {
        estado.autocorregirActivo = !estado.autocorregirActivo;
        var btn = document.getElementById('btn-autocorregir');
        if (btn) {
            if (estado.autocorregirActivo) {
                btn.classList.add('active');
                btn.textContent = 'Autocorregir: ON';
            } else {
                btn.classList.remove('active');
                btn.textContent = 'Autocorregir: OFF';
            }
        }
    }

    function autoCorregirTodo() {
        if (!estado.resultados) {
            UIToast.mostrar('Primero ejecute un cálculo', 'warning');
            return;
        }

        if (typeof MotorDiagnostico === 'undefined') {
            UIToast.mostrar('Motor de diagnóstico no disponible', 'error');
            return;
        }

        var issues = MotorDiagnostico.diagnosticoGlobal(estado.resultados);
        var sistema = { puntos: estado.resultados, nodos: estado.nodos };

        var resultado = MotorDiagnostico.autoCorregirSistema(sistema, issues);

        if (resultado.fixes.length > 0) {
            UIToast.mostrar('Auto-correcciones aplicadas: ' + resultado.fixes.join(', '), 'success');
            // NO recalcular automáticamente para evitar loop infinito
            // Usuario debe recalcular manualmente si desea ver efectos
        } else {
            UIToast.mostrar('No se encontraron correcciones automáticas', 'info');
        }
    }

    function autoCorregirInteligente() {
        if (!estado.resultados) {
            UIToast.mostrar('Primero ejecute un cálculo', 'warning');
            return;
        }

        if (typeof MotorAutocorreccion === 'undefined') {
            UIToast.mostrar('Motor de autocorrección no disponible', 'error');
            return;
        }

        var sistema = { puntos: estado.resultados, nodos: estado.nodos };
        var resultado = MotorAutocorreccion.autoCorregirInteligente(sistema);

        if (resultado.log.length > 0) {
            UIToast.mostrar('Auto-correcciones ingeniero: ' + resultado.log.join(', '), 'success');
            // NO recalcular automáticamente para evitar loop infinito
            // Usuario debe recalcular manualmente si desea ver efectos
        } else {
            UIToast.mostrar('Sistema ya está óptimo', 'info');
        }
    }

    return {
        init: init,
        estado: estado,
        resultados: estado.resultados,
        calculate: calculate,
        autoCorregir: autoCorregir,
        autoCorregirTotal: autoCorregirTotal,
        autoCorregirTodo: autoCorregirTodo,
        autoCorregirInteligente: autoCorregirInteligente,
        aplicarAutocorreccion: aplicarAutocorreccion,
        toggleAutocorreccion: toggleAutocorreccion,
        clearResults: clearResults,
        printResults: printResults,
        addFeeder: addFeeder,
        removeFeeder: removeFeeder,
        updateFeeder: updateFeeder,
        getFeeders: getFeeders,
        onEquipTipoChange: onEquipTipoChange,
        onEquipModeloChange: onEquipModeloChange,
        setMode: typeof UIConfiguracion !== 'undefined' ? UIConfiguracion.setMode : function() {},
        setTipo: typeof UIConfiguracion !== 'undefined' ? UIConfiguracion.setTipo : function() {},
        setVoltage: typeof UIConfiguracion !== 'undefined' ? UIConfiguracion.setVoltage : function() {},
        setTrafoVs: setTrafoVs,
        toggleCollapse: typeof UIConfiguracion !== 'undefined' ? UIConfiguracion.toggleCollapse : function() {},
        poblarDropdownZonas: poblarDropdownZonas,
        poblarDropdownCapacidadesTrafo: poblarDropdownCapacidadesTrafo,
        actualizarIscPorZona: actualizarIscPorZona,
        actualizarCDT: actualizarCDT,
        imprimirModulos: imprimirModulos,
        exportarExcel: exportarExcel,
        saveProfile: saveProfile,
        resetProfile: resetProfile
    };
})();

if (typeof window !== 'undefined') {
    window.App = App;
}

document.addEventListener('DOMContentLoaded', function() { 
        App.init(); 
    });