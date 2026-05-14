/**
 * equipos.js — FASE 8 (MEJORADO)
 * Gestiona la selección de equipos en cascada (tipo -> modelo -> capacidad).
 * Incluye soporte para marcas reales: Square D (QO, HDL, JDL, LA, etc.)
 */
var UIEquipos = (function() {

    /**
     * Llena el select de tipos de equipo (se llama una vez al init)
     */
    function initP0() {
        var sel = document.getElementById('equip-p0-tipo');
        if (!sel) return;

        // Tipos de equipo personalizados
        var tiposEquipos = [
            { key: 'int_principal', nombre: 'Int. Principal' },
            { key: 'iline_400a', nombre: 'I-Line 400A' },
            { key: 'iline_600a', nombre: 'I-Line 600A' },
            { key: 'iline_800a', nombre: 'I-Line 800A' },
            { key: 'iline_1200a', nombre: 'I-Line 1200A' },
            { key: 'tab_nq_100a', nombre: 'Tab. NQ 100A' },
            { key: 'tab_nq_225a', nombre: 'Tab. NQ 225A' },
            { key: 'tab_nq_400a', nombre: 'Tab. NQ 400A' },
            { key: 'centro_qo_100a', nombre: 'Centro de Carga QO 100A' },
            { key: 'centro_qo_225a', nombre: 'Centro de Carga QO 225A' },
            { key: 'desconectador_30a', nombre: 'Desconectador de Cuchillas 30A' },
            { key: 'desconectador_60a', nombre: 'Desconectador de Cuchillas 60A' },
            { key: 'desconectador_100a', nombre: 'Desconectador de Cuchillas 100A' },
            { key: 'desconectador_200a', nombre: 'Desconectador de Cuchillas 200A' }
        ];

        // Limpiar opciones existentes
        sel.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar tipo de equipo --';
        sel.appendChild(opt);

        // Llenar con tipos personalizados
        tiposEquipos.forEach(function(tipo) {
            var opt = document.createElement('option');
            opt.value = tipo.key;
            opt.textContent = tipo.nombre;
            sel.appendChild(opt);
        });
    }

    /**
     * Cuando cambia el tipo de equipo: llenar modelos, limpiar capacidad
     */
    function onTipoChange(prefix) {
        var tipoEl = document.getElementById('equip-' + prefix + '-tipo');
        var modeloSel = document.getElementById('equip-' + prefix + '-modelo');
        var capInp = document.getElementById('equip-' + prefix + '-cap');
        var detallesDiv = document.getElementById('equip-' + prefix + '-detalles');

        if (!tipoEl || !modeloSel || !capInp) return;

        var tipo = tipoEl.value;

        modeloSel.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar modelo --';
        modeloSel.appendChild(opt);
        modeloSel.disabled = true;
        
        // Agregar evento onchange
        modeloSel.onchange = function() {
            onModeloChange(prefix);
        };

        capInp.value = '';

        // Mapear tipos de equipo a series de EQUIPOS
        var tipoAModelos = {
            'int_principal': ['sqd_qo', 'sqd_hdl', 'sqd_jdl', 'sqd_lal', 'sqd_mg'], // HDL, JDL, LAL, MG para Int. Principal
            'iline_400a': ['sqd_hda', 'sqd_jda', 'sqd_mg'], // HDA, JDA, MG para I-Line
            'iline_600a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'iline_800a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'iline_1200a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'tab_nq_100a': ['sqd_hdl', 'sqd_lal'], // HDL y LAL para Tab. NQ
            'tab_nq_225a': ['sqd_hdl', 'sqd_lal'],
            'tab_nq_400a': ['sqd_hdl', 'sqd_lal'],
            'centro_qo_100a': ['sqd_qo'], // Solo QO
            'centro_qo_225a': ['sqd_qo'], // Solo QO
            'desconectador_30a': ['fusible'], // Fusibles
            'desconectador_60a': ['fusible'],
            'desconectador_100a': ['fusible'],
            'desconectador_200a': ['fusible']
        };

        // Mapeo de fusibles por default para desconectadores
        var fusibleDefault = {
            'desconectador_30a': 1, // Índice del Fusible 30A
            'desconectador_60a': 2, // Índice del Fusible 60A
            'desconectador_100a': 3, // Índice del Fusible 100A
            'desconectador_200a': 4  // Índice del Fusible 200A
        };

        var equipoKeys = tipoAModelos[tipo];

        if (tipo && equipoKeys && equipoKeys.length > 0) {
            // Verificar si es un desconectador
            var esDesconectador = tipo.startsWith('desconectador');

            // Llenar modelos de todas las series disponibles
            equipoKeys.forEach(function(equipoKey) {
                if (EQUIPOS[equipoKey]) {
                    var equipo = EQUIPOS[equipoKey];

                    // Para desconectadores, solo mostrar 2 opciones: S/F y fusible de capacidad
                    if (esDesconectador && equipoKey === 'fusible') {
                        var group = document.createElement('optgroup');
                        group.label = equipo.nombre;

                        // Opción 1: S/F (Sin Fusible) - índice 0
                        var optSF = document.createElement('option');
                        optSF.value = equipoKey + '|0';
                        optSF.textContent = (equipo.modelos && equipo.modelos.length > 0) ? equipo.modelos[0].nombre : 'Sin modelo';
                        group.appendChild(optSF);

                        // Opción 2: Fusible de capacidad según tipo
                        var indiceFusible = fusibleDefault[tipo];
                        if (indiceFusible && equipo.modelos[indiceFusible]) {
                            var optFusible = document.createElement('option');
                            optFusible.value = equipoKey + '|' + indiceFusible;
                            optFusible.textContent = equipo.modelos[indiceFusible].nombre;
                            group.appendChild(optFusible);
                        }

                        modeloSel.appendChild(group);
                    } else {
                        // Para otros equipos, mostrar todos los modelos
                        var group = document.createElement('optgroup');
                        group.label = equipo.nombre;

                        equipo.modelos.forEach(function(m, i) {
                            var opt = document.createElement('option');
                            opt.value = equipoKey + '|' + i;
                            opt.textContent = m.nombre + ' (' + m.cap + ' kA @ ' + (m.amp === 'Cualquiera' ? '240/480V' : m.amp + 'A') + ')';
                            group.appendChild(opt);
                        });

                        modeloSel.appendChild(group);
                    }
                }
            });

            // Habilitar el selector si hay opciones
            modeloSel.disabled = false;

            // Mostrar información adicional
            if (detallesDiv) {
                var seriesNombres = equipoKeys.map(function(k) {
                    return EQUIPOS[k] ? EQUIPOS[k].nombre : k;
                }).join(', ');
                detallesDiv.textContent = 'Series: ' + seriesNombres;
            }

            // Seleccionar fusible de capacidad por default para desconectadores
            if (esDesconectador && fusibleDefault[tipo]) {
                var indiceFusible = fusibleDefault[tipo];
                var valorFusible = 'fusible|' + indiceFusible;
                modeloSel.value = valorFusible;
                onModeloChange(prefix);
            }
        } else if (detallesDiv) {
            detallesDiv.textContent = '';
        }

        if (typeof App !== 'undefined' && App.clearResults) {
            App.clearResults();
        }
    }

    /**
     * Cuando cambia el modelo: llenar capacidad automáticamente
     */
    function onModeloChange(prefix) {
        var tipoEl = document.getElementById('equip-' + prefix + '-tipo');
        var modeloEl = document.getElementById('equip-' + prefix + '-modelo');
        var capInp = document.getElementById('equip-' + prefix + '-cap');
        var ampInp = document.getElementById('equip-' + prefix + '-amp');
        var infoDiv = document.getElementById('equip-' + prefix + '-info');

        if (!tipoEl || !modeloEl || !capInp) return;

        var tipo = tipoEl.value;
        var modeloVal = modeloEl.value;

        if (tipo && modeloVal !== '') {
            // Parsear el valor que ahora es "equipoKey|index"
            var parts = (modeloVal || '').split('|');
            if (parts.length === 2) {
                var equipoKey = parts[0];
                var mIdx = parseInt(parts[1], 10) || 0;

                if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].modelos[mIdx]) {
                    var m = EQUIPOS[equipoKey].modelos[mIdx];
                    capInp.value = m.cap > 0 ? m.cap : '';

                    // Calcular I disparo instantáneo (usar multiplicador de la curva o 10x por defecto)
                    var iDisparo = 0;
                    if ((m.disparo === 'termomagnetico' || m.disparo === 'fusible') && m.amp !== 'Cualquiera' && !isNaN(m.amp)) {
                        var multiplicador = 10;
                        if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].curvaDisparo) {
                            multiplicador = EQUIPOS[equipoKey].curvaDisparo.multiplicadorInstantaneo || 10;
                        }
                        iDisparo = m.amp * multiplicador;
                    }

                    // Llenar campo de I disparo si existe
                    var iDispInp = document.getElementById('equip-' + prefix + '-idisparo');
                    if (iDispInp) {
                        iDispInp.value = iDisparo > 0 ? iDisparo : '';
                        
                        // Actualizar el estado del nodo directamente
                        if (prefix === 'p0' && typeof App !== 'undefined' && App.estado && App.estado.nodos) {
                            var nodo = (App.estado.nodos || []).find(function(n) { return n.id === 'p0'; });
                            if (nodo) {
                                if (!nodo.equip) nodo.equip = {};
                                nodo.equip.iDisparo = iDisparo;
                            }
                        }
                    }

                    // Mostrar información adicional del modelo
                    if (infoDiv) {
                        var curvaHTML = '';
                        var curvaCanvasId = 'curva-canvas-' + prefix + '-' + Date.now();
                        var multiplicadorHTML = '';
                        
                        if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].curvaDisparo) {
                            var multiplicador = EQUIPOS[equipoKey].curvaDisparo.multiplicadorInstantaneo || 10;
                            multiplicadorHTML = '<div class="mt-2 flex items-center gap-2">' +
                                '<label class="text-[0.6rem]" for="mult-' + prefix + '">Multiplicador instantáneo (xIn):</label>' +
                                '<input type="number" id="mult-' + prefix + '" name="mult-' + prefix + '" value="' + multiplicador + '" min="5" max="20" step="0.5" ' +
                                'class="border rounded px-2 py-1 text-[0.65rem] w-16" ' +
                                'onchange="UIEquipos.actualizarMultiplicador(\'' + prefix + '\', \'' + equipoKey + '\', ' + mIdx + ', this.value)">' +
                                '</div>';
                            
                            curvaHTML = '<div class="mt-4 p-3 rounded bg-[--surface] border border-[--border]">' +
                                '<div class="text-xs font-semibold mb-2">📈 Curva de Disparo</div>' +
                                multiplicadorHTML +
                                '<div class="relative" style="height: 250px;">' +
                                '<canvas id="' + curvaCanvasId + '"></canvas>' +
                                '</div>' +
                                '</div>';
                            
                            // Graficar la curva después de un pequeño delay para que el canvas exista
                            setTimeout(function() {
                                graficarCurvaEnCanvas(curvaCanvasId, equipoKey, mIdx, m.amp);
                            }, 100);
                        }
                        
                        var infoDivContent = document.createElement('div');
                        infoDivContent.className = 'mt-1 p-2 rounded bg-[--surface] border border-[--border]';
                        var infoText = document.createElement('div');
                        infoText.className = 'text-[0.65rem]';
                        
                        var titleSpan = document.createElement('span');
                        titleSpan.className = 'font-semibold';
                        titleSpan.textContent = '📊 Datos técnicos:';
                        infoText.appendChild(titleSpan);
                        infoText.appendChild(document.createElement('br'));
                        
                        var datos = [
                            {label: 'Capacidad interruptiva:', value: (m.cap || 0) + ' kA'},
                            {label: 'Corriente nominal:', value: m.amp === 'Cualquiera' ? 'Según selección' : (m.amp || 0) + ' A'},
                            {label: 'I disparo instantáneo:', value: iDisparo > 0 ? iDisparo + ' A' : 'N/A'},
                            {label: 'Marco:', value: m.marco || 'N/A'},
                            {label: 'Tipo de disparo:', value: m.disparo === 'termomagnetico' ? 'Termomagnético' : 'Fusible'}
                        ];
                        
                        datos.forEach(function(d) {
                            var line = document.createElement('div');
                            line.textContent = '• ' + d.label + ' ';
                            var strong = document.createElement('strong');
                            strong.textContent = d.value;
                            line.appendChild(strong);
                            infoText.appendChild(line);
                        });
                        
                        infoDivContent.appendChild(infoText);
                        
                        var tempDiv = document.createElement('div');
                        // Note: innerHTML is safe here as curvaHTML is generated internally from catalog data, not user input
                        tempDiv.innerHTML = curvaHTML;
                        while (tempDiv.firstChild) {
                            infoDivContent.appendChild(tempDiv.firstChild);
                        }
                        
                        infoDiv.textContent = '';
                        infoDiv.appendChild(infoDivContent);
                    }

                    // Si hay campo de amperaje, llenarlo
                    if (ampInp && m.amp !== 'Cualquiera' && !isNaN(m.amp)) {
                        ampInp.value = m.amp;
                    }
                }
            }
        } else if (infoDiv) {
            infoDiv.textContent = '';
        }

        if (typeof App !== 'undefined' && App.clearResults) {
            App.clearResults();
        }
    }
    
    /**
     * Obtiene el rango de capacidades de una lista de modelos
     */
    function getRangoCapacidad(modelos) {
        var caps = modelos.map(function(m) { return m.cap; });
        var minCap = caps.length > 0 ? Math.min.apply(null, caps) : 0;
        var maxCap = caps.length > 0 ? Math.max.apply(null, caps) : 0;
        
        if (minCap === maxCap) {
            return minCap + ' kA';
        }
        return minCap + ' - ' + maxCap + ' kA';
    }
    
    /**
     * Busca un modelo específico por nombre de modelo
     */
    function buscarModelo(nombreModelo) {
        if (typeof EQUIPOS === 'undefined') {
            console.error('EQUIPOS no está definido');
            return null;
        }
        
        for (var tipo in EQUIPOS) {
            var modelos = EQUIPOS[tipo].modelos;
            if (!modelos) continue;
            
            for (var i = 0; i < modelos.length; i++) {
                if (modelos[i].nombre === nombreModelo) {
                    return {
                        equipoKey: tipo,
                        indice: i,
                        modelo: modelos[i],
                        equipo: EQUIPOS[tipo]
                    };
                }
            }
        }
        return null;
    }

    /**
     * Mapeo inverso: de equipoKey a tipo de equipo
     */
    function getTipoFromEquipoKey(equipoKey) {
        var tipoAModelos = {
            'int_principal': ['sqd_qo', 'sqd_hdl', 'sqd_jdl', 'sqd_lal', 'sqd_mg'],
            'iline_400a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'iline_600a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'iline_800a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'iline_1200a': ['sqd_hda', 'sqd_jda', 'sqd_mg'],
            'tab_nq_100a': ['sqd_hdl', 'sqd_lal'],
            'tab_nq_225a': ['sqd_hdl', 'sqd_lal'],
            'tab_nq_400a': ['sqd_hdl', 'sqd_lal'],
            'centro_qo_100a': ['sqd_qo'],
            'centro_qo_225a': ['sqd_qo'],
            'desconectador_30a': ['fusible'],
            'desconectador_60a': ['fusible'],
            'desconectador_100a': ['fusible'],
            'desconectador_200a': ['fusible']
        };

        for (var tipo in tipoAModelos) {
            if (tipoAModelos[tipo] && Array.isArray(tipoAModelos[tipo]) && tipoAModelos[tipo].indexOf(equipoKey) !== -1) {
                return tipo;
            }
        }
        return null;
    }
    
    /**
     * Obtiene la capacidad recomendada según corriente de cortocircuito
     */
    function recomendarCapacidad(isc_kA) {
        var recomendaciones = [
            { maxISC: 10, capacidad: 14, modelo: 'QO115' },
            { maxISC: 14, capacidad: 18, modelo: 'QO2100' },
            { maxISC: 18, capacidad: 22, modelo: 'QOH115' },
            { maxISC: 22, capacidad: 25, modelo: 'ED100' },
            { maxISC: 25, capacidad: 35, modelo: 'LA36100' },
            { maxISC: 35, capacidad: 50, modelo: 'T3N250' },
            { maxISC: 50, capacidad: 65, modelo: 'HDL36100' },
            { maxISC: 65, capacidad: 85, modelo: 'T6N800' },
            { maxISC: 85, capacidad: 100, modelo: 'JDL36100' },
            { maxISC: Infinity, capacidad: 200, modelo: 'Clase L' }
        ];
        
        for (var i = 0; i < recomendaciones.length; i++) {
            if (isc_kA <= recomendaciones[i].maxISC) {
                return recomendaciones[i];
            }
        }
        
        return { capacidad: 200, modelo: 'Clase L' };
    }

    /**
     * Lee los datos del equipo para un prefix dado
     * @returns {Object} { tipo, nombre, cap, amp, marco, disparo }
     */
    function getEquip(prefix) {
        var tipo = document.getElementById('equip-' + prefix + '-tipo');
        var modelo = document.getElementById('equip-' + prefix + '-modelo');
        var cap = document.getElementById('equip-' + prefix + '-cap');
        var iDisparo = document.getElementById('equip-' + prefix + '-idisparo');

        if (!tipo || !modelo || !cap) {
            return { tipo: '', nombre: '', cap: 0, amp: 0, marco: '', disparo: '', iDisparo: 0 };
        }

        var tipoVal = tipo.value || '';
        var modeloVal = modelo.value || '';
        var capVal = parseFloat(cap.value) || 0;
        var iDisparoVal = iDisparo ? parseFloat(iDisparo.value) || 0 : 0;
        var nombre = '';
        var ampVal = 0;
        var marco = '';
        var disparo = '';

        if (tipoVal && modeloVal !== '') {
            // Parsear el valor que ahora es "equipoKey|index"
            var parts = (modeloVal || '').split('|');
            if (parts.length === 2) {
                var equipoKey = parts[0];
                var mIdx = parseInt(parts[1], 10) || 0;

                if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].modelos[mIdx]) {
                    var equipo = EQUIPOS[equipoKey];
                    var modeloData = equipo.modelos[mIdx];
                    nombre = modeloData.nombre;
                    ampVal = typeof modeloData.amp === 'number' ? modeloData.amp : 0;
                    marco = equipo.serie;
                    disparo = modeloData.disparo || 'termomagnetico';

                    // Si la capacidad no se ingresó manualmente, usar la del modelo
                    if (capVal === 0 && modeloData.cap) {
                        capVal = modeloData.cap;
                    }
                }
            }
        }

        return {
            tipo: tipoVal,
            nombre: nombre,
            cap: capVal,
            amp: ampVal,
            iDisparo: iDisparoVal,
            marco: marco,
            disparo: disparo
        };
    }
    
    /**
     * Actualiza el multiplicador instantáneo y recalcula
     */
    function actualizarMultiplicador(prefix, equipoKey, modeloIdx, valor) {
        var multiplicador = parseFloat(valor) || 10;
        if (isNaN(multiplicador) || multiplicador < 5 || multiplicador > 20) {
            UIToast.mostrar('Multiplicador debe estar entre 5 y 20', 'error');
            return;
        }

        // Actualizar en la estructura de datos
        if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].curvaDisparo) {
            EQUIPOS[equipoKey].curvaDisparo.multiplicadorInstantaneo = multiplicador;
        }

        // Recalcular I disparo
        var ampInp = document.getElementById('equip-' + prefix + '-amp');
        var iDispInp = document.getElementById('equip-' + prefix + '-idisparo');
        
        if (ampInp && iDispInp) {
            var amp = parseFloat(ampInp.value) || 0;
            if (!isNaN(amp) && amp > 0) {
                var nuevoIDisparo = amp * multiplicador;
                iDispInp.value = nuevoIDisparo;
                
                // Actualizar estado
                if (prefix === 'p0' && typeof App !== 'undefined' && App.estado && App.estado.nodos) {
                    var nodo = (App.estado.nodos || []).find(function(n) { return n.id === 'p0'; });
                    if (nodo) {
                        if (!nodo.equip) nodo.equip = {};
                        nodo.equip.iDisparo = nuevoIDisparo;
                    }
                }
            }
        }

        // Regenerar curva
        onModeloChange(prefix);
    }

    /**
     * Grafica la curva de disparo en un canvas específico
     */
    function graficarCurvaEnCanvas(canvasId, equipoKey, modeloIdx, corrienteNominal) {
        if (!EQUIPOS[equipoKey] || !EQUIPOS[equipoKey].curvaDisparo) {
            return;
        }

        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        var curva = EQUIPOS[equipoKey].curvaDisparo;
        var modeloNombre = EQUIPOS[equipoKey].modelos[modeloIdx].nombre;

        // Generar puntos de datos (nueva estructura)
        var datos = generarPuntosCurvaModal(curva, corrienteNominal);

        // Destruir gráfico anterior si existe
        if (window['chart_' + canvasId]) {
            window['chart_' + canvasId].destroy();
        }

        // Crear gráfico
        var ctx = canvas.getContext('2d');
        window['chart_' + canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: modeloNombre,
                    data: datos,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Corriente (A)',
                            font: { size: 10 }
                        },
                        min: 1,
                        ticks: {
                            font: { size: 9 },
                            callback: function(value, index, values) {
                                if (value >= 1000) {
                                    return (value / 1000) + 'k';
                                }
                                return value;
                            }
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Tiempo (s)',
                            font: { size: 10 }
                        },
                        min: 0.001,
                        max: 10000,
                        ticks: {
                            font: { size: 9 },
                            callback: function(value, index, values) {
                                if (value >= 3600) {
                                    return (value / 3600).toFixed(1) + 'h';
                                } else if (value >= 60) {
                                    return (value / 60).toFixed(0) + 'm';
                                } else if (value >= 1) {
                                    return value + 's';
                                } else {
                                    return (value * 1000).toFixed(0) + 'ms';
                                }
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var corriente = context.parsed.x;
                                var tiempo = context.parsed.y;
                                return 'I: ' + corriente.toFixed(1) + 'A, T: ' + formatoTiempoModal(tiempo);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Muestra la curva de disparo en un modal
     */
    function mostrarCurvaDisparo(equipoKey, modeloIdx, corrienteNominal) {
        if (!EQUIPOS[equipoKey] || !EQUIPOS[equipoKey].curvaDisparo) {
            UIToast.mostrar('Curva de disparo no disponible para este equipo', 'error');
            return;
        }

        var curva = EQUIPOS[equipoKey].curvaDisparo;
        var modeloNombre = EQUIPOS[equipoKey].modelos[modeloIdx].nombre;

        // Crear modal si no existe
        var modal = document.getElementById('curvaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'curvaModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            var modalContent = document.createElement('div');
            modalContent.className = 'bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto';

            var header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';

            var title = document.createElement('h3');
            title.className = 'text-lg font-semibold';
            title.appendChild(document.createTextNode('Curva de Disparo - '));
            var titleSpan = document.createElement('span');
            titleSpan.id = 'curvaModalTitle';
            title.appendChild(titleSpan);

            var closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-500 hover:text-gray-700';
            closeBtn.onclick = function() { document.getElementById('curvaModal').style.display = 'none'; };
            var closeIcon = document.createElement('i');
            closeIcon.className = 'fas fa-times text-xl';
            closeBtn.appendChild(closeIcon);

            header.appendChild(title);
            header.appendChild(closeBtn);

            var canvasContainer = document.createElement('div');
            canvasContainer.className = 'relative';
            canvasContainer.style.height = '400px';
            var canvas = document.createElement('canvas');
            canvas.id = 'curvaModalCanvas';
            canvasContainer.appendChild(canvas);

            modalContent.appendChild(header);
            modalContent.appendChild(canvasContainer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        }

        document.getElementById('curvaModalTitle').textContent = modeloNombre + ' (' + corrienteNominal + 'A)';
        modal.style.display = 'flex';

        // Generar puntos de datos (nueva estructura)
        var datos = generarPuntosCurvaModal(curva, corrienteNominal);

        // Destruir gráfico anterior si existe
        if (window.curvaModalChart) {
            window.curvaModalChart.destroy();
        }

        // Crear gráfico
        var ctx = document.getElementById('curvaModalCanvas').getContext('2d');
        window.curvaModalChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: modeloNombre + ' (' + corrienteNominal + 'A)',
                    data: datos,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Corriente (Amperes) - Escala Logarítmica'
                        },
                        min: 1,
                        ticks: {
                            callback: function(value, index, values) {
                                if (value >= 1000) {
                                    return (value / 1000) + 'k';
                                }
                                return value;
                            }
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Tiempo (segundos) - Escala Logarítmica'
                        },
                        min: 0.001,
                        max: 10000,
                        ticks: {
                            callback: function(value, index, values) {
                                if (value >= 3600) {
                                    return (value / 3600).toFixed(1) + 'h';
                                } else if (value >= 60) {
                                    return (value / 60).toFixed(0) + 'm';
                                } else if (value >= 1) {
                                    return value + 's';
                                } else {
                                    return (value * 1000).toFixed(0) + 'ms';
                                }
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var corriente = context.parsed.x;
                                var tiempo = context.parsed.y;
                                return 'Corriente: ' + corriente.toFixed(1) + 'A, Tiempo: ' + formatoTiempoModal(tiempo);
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    /**
     * Generar puntos de datos para la curva en el modal (modelo nivel ETAP)
     */
    function generarPuntosCurvaModal(curva, corrienteNominal) {
        var datos = [];
        
        // Verificar si tiene la nueva estructura (separada térmica/magnética)
        if (curva.curvaTermica && curva.curvaMagnetica) {
            // Generar puntos de curva térmica
            (curva.curvaTermica.puntos || []).forEach(function(punto) {
                datos.push({
                    x: punto.multiple * corrienteNominal,
                    y: punto.tiempo,
                    zona: 'termica'
                });
            });

            // Generar puntos de curva magnética
            (curva.curvaMagnetica.puntos || []).forEach(function(punto) {
                datos.push({
                    x: punto.multiple * corrienteNominal,
                    y: punto.tiempo,
                    zona: 'magnetica'
                });
            });

            // Interpolar puntos adicionales para curva térmica
            for (var i = 0; i < curva.curvaTermica.puntos.length - 1; i++) {
                var p1 = curva.curvaTermica.puntos[i];
                var p2 = curva.curvaTermica.puntos[i + 1];
                if (!p1 || !p2) continue;
                
                var pasos = 3;
                for (var j = 1; j < pasos; j++) {
                    var t = j / pasos;
                    var multipleInterp = p1.multiple + (p2.multiple - p1.multiple) * t;
                    var tiempoInterp = p1.tiempo + (p2.tiempo - p1.tiempo) * t;
                    
                    datos.push({
                        x: multipleInterp * corrienteNominal,
                        y: tiempoInterp,
                        zona: 'termica'
                    });
                }
            }

            // Interpolar puntos adicionales para curva magnética
            for (var k = 0; k < curva.curvaMagnetica.puntos.length - 1; k++) {
                var pm1 = curva.curvaMagnetica.puntos[k];
                var pm2 = curva.curvaMagnetica.puntos[k + 1];
                if (!pm1 || !pm2) continue;
                
                var pasosM = 3;
                for (var j = 1; j < pasosM; j++) {
                    var t = j / pasosM;
                    var multipleInterp = pm1.multiple + (pm2.multiple - pm1.multiple) * t;
                    var tiempoInterp = pm1.tiempo + (pm2.tiempo - pm1.tiempo) * t;
                    
                    datos.push({
                        x: multipleInterp * corrienteNominal,
                        y: tiempoInterp,
                        zona: 'magnetica'
                    });
                }
            }
        } else if (curva.puntos) {
            // Estructura antigua (compatibilidad)
            (curva.puntos || []).forEach(function(punto) {
                if (punto.tiempo !== Infinity) {
                    datos.push({
                        x: punto.corriente * corrienteNominal,
                        y: punto.tiempo,
                        zona: 'termica'
                    });
                }
            });

            // Interpolar puntos adicionales
            if (!curva.puntos || curva.puntos.length < 2) return;
            for (var i = 0; i < curva.puntos.length - 1; i++) {
                var p1 = curva.puntos[i];
                var p2 = curva.puntos[i + 1];
                if (!p1 || !p2) continue;
                
                if (p1.tiempo === Infinity || p2.tiempo === Infinity) continue;
                
                var pasos = 5;
                for (var j = 1; j < pasos; j++) {
                    var t = j / pasos;
                    var corrienteInterp = p1.corriente + (p2.corriente - p1.corriente) * t;
                    var tiempoInterp = p1.tiempo + (p2.tiempo - p1.tiempo) * t;
                    
                    datos.push({
                        x: corrienteInterp * corrienteNominal,
                        y: tiempoInterp,
                        zona: 'termica'
                    });
                }
            }
        }

        datos.sort(function(a, b) {
            return a.x - b.x;
        });

        return datos;
    }

    /**
     * Formatear tiempo para display en modal
     */
    function formatoTiempoModal(segundos) {
        if (segundos >= 3600) {
            return (segundos / 3600).toFixed(2) + 'h';
        } else if (segundos >= 60) {
            return (segundos / 60).toFixed(1) + 'm';
        } else if (segundos >= 1) {
            return segundos.toFixed(2) + 's';
        } else {
            return (segundos * 1000).toFixed(0) + 'ms';
        }
    }

    /**
     * Establece un equipo por su nombre de modelo
     */
    function setEquipByModelo(prefix, nombreModelo) {
        var encontrado = buscarModelo(nombreModelo);
        if (!encontrado) return false;
        
        var tipoSelect = document.getElementById('equip-' + prefix + '-tipo');
        var modeloSelect = document.getElementById('equip-' + prefix + '-modelo');
        
        if (!tipoSelect || !modeloSelect) return false;
        
        // Obtener el tipo de equipo desde el equipoKey
        var tipoEquipo = getTipoFromEquipoKey(encontrado.equipoKey);
        if (!tipoEquipo) return false;
        
        tipoSelect.value = tipoEquipo;
        onTipoChange(prefix);
        
        // Esperar a que se llenen los modelos
        setTimeout(function() {
            // El valor debe ser "equipoKey|index"
            modeloSelect.value = encontrado.equipoKey + '|' + encontrado.indice;
            onModeloChange(prefix);
        }, 50);
        
        return true;
    }

    return {
        initP0: initP0,
        onTipoChange: onTipoChange,
        onModeloChange: onModeloChange,
        getEquip: getEquip,
        setEquipByModelo: setEquipByModelo,
        buscarModelo: buscarModelo,
        mostrarCurvaDisparo: mostrarCurvaDisparo,
        actualizarMultiplicador: actualizarMultiplicador
    };
})();

if (typeof window !== 'undefined') {
    window.UIEquipos = UIEquipos;
}