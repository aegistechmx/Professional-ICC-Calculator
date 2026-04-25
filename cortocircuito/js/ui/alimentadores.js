/**
 * alimentadores.js — FASE 9 (ÁRBOL DE NODOS)
 * Gestiona la estructura de nodos en árbol para soportar ramificaciones.
 * Cada nodo puede tener múltiples hijos (derivaciones).
 */
var UIAlimentadores = (function() {

    // Constantes locales
    var MAX_NODOS = 50;
    var nodoExpandido = {}; // Track which nodes are expanded

    // Helper function to get nodos safely
    function getNodos() {
        return (typeof App !== 'undefined' && App.estado && App.estado.nodos) ? App.estado.nodos : [];
    }

    // Helper function to set nodos safely
    function setNodos(nodos) {
        if (typeof App !== 'undefined' && App.estado) {
            App.estado.nodos = nodos;
        }
    }
    
    // Función para obtener ampacidad sugerida (NOM-001-SEDE-2012)
    function getAmpacidadSugerida(material, calibre, carga, tempAmbiente, canalizacion, paralelo, fc, ft, numConductores) {
        // Determinar temperatura de conductor según NOM-001: <100A usa 60°C, >=100A usa 75°C
        var tempConductor = (carga < CONSTANTES.TEMP_CONDUCTOR_POR_CORRIENTE) ? '60' : '75';

        // Obtener ampacidad base de la tabla NOM-001
        var ampacidadBase = (material === 'cobre') ?
            CONSTANTES.AMPACIDAD_CU[tempConductor][calibre] :
            CONSTANTES.AMPACIDAD_AL[tempConductor][calibre];

        if (!ampacidadBase || ampacidadBase === 0) return null;

        // Factor de corrección por temperatura (FT) - default 0.91 para Puerto Vallarta
        var factorTemp = ft ? parseFloat(ft) || CONSTANTES.FACTOR_TEMPERATURA['default'] : CONSTANTES.FACTOR_TEMPERATURA['default'];

        // Factor de ajuste por número de conductores (FC) - usar agrupamiento inteligente si está disponible
        var factorConductores;
        if (typeof AmpacidadReal !== 'undefined' && numConductores) {
            // Usar el resolvedor inteligente de agrupamiento
            var agrupamiento = AmpacidadReal.resolverAgrupamiento({
                numConductores: numConductores,
                F_agrupamiento: fc ? parseFloat(fc) : null,
                paralelos: paralelo || 1
            }, {
                sistema: '3f',
                tieneNeutro: true,
                neutroContado: false,
                tieneArmonicos: false,
                paralelos: paralelo || 1
            });
            factorConductores = agrupamiento.F;
        } else {
            factorConductores = fc ? parseFloat(fc) || CONSTANTES.FACTOR_CONDUCTORES['default'] : CONSTANTES.FACTOR_CONDUCTORES['default'];
        }

        // Considerar conductores en paralelo
        var n = Math.max(1, paralelo || 1);

        // Ampacidad ajustada según NOM-001
        var ampAjustada = ampacidadBase * factorTemp * factorConductores * n;
        var margen = carga > 0 ? ((ampAjustada - carga) / carga) * 100 : Infinity;

        // Buscar calibre mínimo adecuado
        var calibreMin = null;
        var calibres = CONSTANTES.CALIBRES.slice().reverse();

        for (var i = 0; i < calibres.length; i++) {
            var ampBase = (material === 'cobre') ? 
                CONSTANTES.AMPACIDAD_CU[tempConductor][calibres[i]] : 
                CONSTANTES.AMPACIDAD_AL[tempConductor][calibres[i]];
            if (ampBase && ampBase > 0 && (ampBase * factorTemp * factorConductores * n) >= carga) {
                calibreMin = calibres[i];
                break;
            }
        }

        return {
            calibreActual: calibre,
            calibreSugerido: calibreMin,
            ampAjustada: ampAjustada,
            margen: margen,
            tempConductor: tempConductor,
            factorTemp: factorTemp,
            factorConductores: factorConductores,
            ok: ampAjustada >= carga && margen <= 200,
            subdimensionado: carga > 0 && ampAjustada < carga,
            sobredimensionado: carga > 0 && margen > 200
        };
    }
    
    // Generar HTML para sugerencia de calibre
    function generarSugerenciaCalibre(f, i, tempAmbiente) {
        var icarga = f.cargaA || 0;
        
        if (icarga <= 0) {
            return '<div class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[--border] bg-[--surface]">' +
                '<i class="fas fa-info-circle text-[--cyan] text-[0.7rem]"></i>' +
                '<span class="text-[0.7rem] text-[--text-muted]">Capture I carga y FP para ver sugerencia de calibre.</span>' +
                '</div>';
        }
        
        var sugerencia = getAmpacidadSugerida(f.material, f.calibre, icarga, tempAmbiente, f.canalizacion, f.paralelo, f.fc, f.ft, f.numConductores);
        
        if (!sugerencia) {
            return '<div class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[--border] bg-[--surface]">' +
                '<i class="fas fa-exclamation-triangle text-[--orange] text-[0.7rem]"></i>' +
                '<span class="text-[0.7rem] text-[--orange]">Calibre no encontrado en constantes.</span>' +
                '</div>';
        }
        
        if (sugerencia.ok) {
            return '<div class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[--border] bg-[--surface]">' +
                '<i class="fas fa-check-circle text-[--green] text-[0.7rem]"></i>' +
                '<span class="text-[0.7rem] text-[--green]">Calibre ' + f.calibre + ' OK (amp: ' + sugerencia.ampAjustada.toFixed(0) + 'A, margen +' + sugerencia.margen.toFixed(0) + '%)</span>' +
                '</div>';
        }
        
        if (sugerencia.subdimensionado && sugerencia.calibreSugerido) {
            return '<div class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[--border] bg-[--surface]">' +
                '<i class="fas fa-exclamation-triangle text-[--red] text-[0.7rem]"></i>' +
                '<span class="text-[0.7rem] text-[--red]">¡ADVERTENCIA! Calibre ' + f.calibre + ' insuficiente. Usar mínimo ' + sugerencia.calibreSugerido + ' (' + sugerencia.ampAjustada.toFixed(0) + 'A para ' + icarga + 'A)</span>' +
                '</div>';
        }
        
        if (sugerencia.sobredimensionado && sugerencia.calibreSugerido) {
            return '<div class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[--border] bg-[--surface]">' +
                '<i class="fas fa-arrow-down text-[--yellow] text-[0.7rem]"></i>' +
                '<span class="text-[0.7rem] text-[--yellow]">Calibre sobredimensionado. Sugerencia: ' + sugerencia.calibreSugerido + ' (' + sugerencia.ampAjustada.toFixed(0) + 'A, margen ' + sugerencia.margen.toFixed(0) + '%)</span>' +
                '</div>';
        }
        
        return '';
    }
    
    function renderizar() {
        var container = document.getElementById('feeders-container');
        if (!container) return;

        container.textContent = '';
        if (!getNodos() || !getNodos().length) {
            var p = document.createElement('p');
            p.className = 'text-sm text-[--text-muted]';
            p.textContent = 'No hay alimentadores. Agregue uno para comenzar.';
            container.appendChild(p);
            return;
        }

        var tempAmbiente = parseFloat(document.getElementById('temperatura-ambiente')?.value) || 30;

        // Renderizar árbol recursivamente desde la raíz
        var nodosRaiz = (getNodos() || []).filter(function(n) { return !n.parentId; });
        nodosRaiz.forEach(function(nodo) {
            container.appendChild(renderizarNodoRecursivo(nodo, getNodos(), tempAmbiente, 0));
        });
    }

    function renderizarNodoRecursivo(nodo, nodos, tempAmbiente, profundidad) {
        var wrapper = document.createElement('div');
        wrapper.className = 'nodo-wrapper';
        wrapper.style.marginLeft = (profundidad * 20) + 'px';

        var block = document.createElement('div');
        block.className = 'nodo-block';
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = construirHTMLNodo(nodo, tempAmbiente);
        while (tempDiv.firstChild) {
            block.appendChild(tempDiv.firstChild);
        }
        wrapper.appendChild(block);

        // Renderizar hijos si está expandido
        if (nodoExpandido[nodo.id]) {
            var hijos = Impedancias.obtenerHijos(nodo.id, nodos);
            hijos.forEach(function(hijo) {
                wrapper.appendChild(renderizarNodoRecursivo(hijo, nodos, tempAmbiente, profundidad + 1));
            });
        }

        return wrapper;
    }

    function obtenerProfundidad(nodoId, nodos) {
        var profundidad = 0;
        var visitados = new Set();
        var nodo = nodos.find(function(n) { return n.id === nodoId; });
        if (!nodo) return 0;
        while (nodo && nodo.parentId && !visitados.has(nodo.id)) {
            visitados.add(nodo.id);
            profundidad++;
            nodo = nodos.find(function(n) { return n.id === nodo.parentId; });
            if (!nodo) break;
        }
        return profundidad;
    }
    
    function construirHTMLNodo(nodo, tempAmbiente) {
        var f = nodo.feeder || {};
        var calOpts = CONSTANTES.CALIBRES.map(function(c) {
            return '<option value="' + c + '"' + (c === f.calibre ? ' selected' : '') + '>' + c + '</option>';
        }).join('');

        // Opciones de material con íconos
        var materialOpts = '<option value="cobre"' + (f.material === 'cobre' ? ' selected' : '') + '>🔴 Cobre</option>' +
                          '<option value="aluminio"' + (f.material === 'aluminio' ? ' selected' : '') + '>⚪ Aluminio</option>';

        // Opciones de canalización (PVC por default)
        var canalOpts = '<option value="pvc"' + (f.canalizacion === 'pvc' || !f.canalizacion ? ' selected' : '') + '>PVC</option>' +
                       '<option value="acero"' + (f.canalizacion === 'acero' ? ' selected' : '') + '>Acero</option>' +
                       '<option value="directo"' + (f.canalizacion === 'directo' ? ' selected' : '') + '>Directo</option>';

        var hijos = Impedancias.obtenerHijos(nodo.id, getNodos());
        var tieneHijos = hijos.length > 0;
        var expandIcon = tieneHijos ? (nodoExpandido[nodo.id] ? 'fa-chevron-down' : 'fa-chevron-right') : '';

        return '<div class="p-3 rounded-lg border border-[--border] bg-[--surface] mb-2">' +
            '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
            (tieneHijos ? '<button onclick="UIAlimentadores.toggleExpand(\'' + nodo.id + '\')" class="text-[--text-muted] hover:text-[--text] p-1"><i class="fas ' + expandIcon + ' text-[0.7rem]"></i></button>' : '<span class="w-6"></span>') +
            '<span class="font-semibold text-[--amber] text-sm">' + nodo.id + '</span>' +
            '<input type="text" id="feeder-' + nodo.id + '-nombre" name="feeder-' + nodo.id + '-nombre" class="text-[0.7rem] text-[--text-muted] bg-transparent border-none p-0 w-32 focus:outline-none focus:text-[--text]" value="' + (nodo.nombre || nodo.id) + '" onchange="UIAlimentadores.actualizarNombre(\'' + nodo.id + '\', this.value)" placeholder="Nombre del tablero">' +
            '</div>' +
            '<div class="flex gap-1">' +
            '<button onclick="UIAlimentadores.agregarHijo(\'' + nodo.id + '\')" class="px-2 py-1 text-[0.65rem] bg-[--cyan] text-black rounded hover:bg-[--cyan]/80 transition-colors" title="Agregar derivación">+ Rama</button>' +
            '<button onclick="UIAlimentadores.eliminarNodo(\'' + nodo.id + '\')" class="px-2 py-1 text-[0.65rem] bg-[--red] text-white rounded hover:bg-[--red]/80 transition-colors" title="Eliminar nodo">✕</button>' +
            '</div>' +
            '</div>' +
            '<div class="grid grid-cols-4 gap-2 text-[0.7rem]">' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Calibre</label>' +
            '<select id="feeder-' + nodo.id + '-calibre" name="feeder-' + nodo.id + '-calibre" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'calibre\', this.value)">' +
            calOpts +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Material</label>' +
            '<select id="feeder-' + nodo.id + '-material" name="feeder-' + nodo.id + '-material" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'material\', this.value)">' +
            materialOpts +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Canalización</label>' +
            '<select id="feeder-' + nodo.id + '-canalizacion" name="feeder-' + nodo.id + '-canalizacion" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'canalizacion\', this.value)">' +
            canalOpts +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Longitud (m)</label>' +
            '<input type="number" id="feeder-' + nodo.id + '-longitud" name="feeder-' + nodo.id + '-longitud" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + (f.longitud || 0) + '" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'longitud\', this.value)">' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Paralelo</label>' +
            '<input type="number" id="feeder-' + nodo.id + '-paralelo" name="feeder-' + nodo.id + '-paralelo" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + (f.paralelo || 1) + '" min="1" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'paralelo\', this.value)">' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">I Carga (A)</label>' +
            '<input type="number" id="feeder-' + nodo.id + '-cargaa" name="feeder-' + nodo.id + '-cargaa" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + (f.cargaA || 0) + '" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'cargaA\', this.value)">' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">FP</label>' +
            '<input type="number" id="feeder-' + nodo.id + '-cargafp" name="feeder-' + nodo.id + '-cargafp" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + (f.cargaFP || 0.9) + '" step="0.01" min="0" max="1" onchange="UIAlimentadores.actualizarFeeder(\'' + nodo.id + '\', \'cargaFP\', this.value)">' +
            '</div>' +
            '</div>' +
            '<div class="grid grid-cols-4 gap-2 text-[0.7rem] mt-2 pt-2 border-t border-[--border]">' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Tipo Equipo</label>' +
            '<select id="feeder-' + nodo.id + '-equiptipo" name="feeder-' + nodo.id + '-equiptipo" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" onchange="UIAlimentadores.onEquipTipoChange(\'' + nodo.id + '\', this.value)">' +
            '<option value="">Sin equipo</option>' +
            '<option value="int_principal"' + ((nodo.equip && nodo.equip.tipo === 'int_principal') ? ' selected' : '') + '>Int. Principal</option>' +
            '<option value="iline_400a"' + ((nodo.equip && nodo.equip.tipo === 'iline_400a') ? ' selected' : '') + '>I-Line 400A</option>' +
            '<option value="iline_600a"' + ((nodo.equip && nodo.equip.tipo === 'iline_600a') ? ' selected' : '') + '>I-Line 600A</option>' +
            '<option value="iline_800a"' + ((nodo.equip && nodo.equip.tipo === 'iline_800a') ? ' selected' : '') + '>I-Line 800A</option>' +
            '<option value="iline_1200a"' + ((nodo.equip && nodo.equip.tipo === 'iline_1200a') ? ' selected' : '') + '>I-Line 1200A</option>' +
            '<option value="tab_nq_100a"' + ((nodo.equip && nodo.equip.tipo === 'tab_nq_100a') ? ' selected' : '') + '>Tab. NQ 100A</option>' +
            '<option value="tab_nq_225a"' + ((nodo.equip && nodo.equip.tipo === 'tab_nq_225a') ? ' selected' : '') + '>Tab. NQ 225A</option>' +
            '<option value="tab_nq_400a"' + ((nodo.equip && nodo.equip.tipo === 'tab_nq_400a') ? ' selected' : '') + '>Tab. NQ 400A</option>' +
            '<option value="centro_qo_100a"' + ((nodo.equip && nodo.equip.tipo === 'centro_qo_100a') ? ' selected' : '') + '>Centro QO 100A</option>' +
            '<option value="centro_qo_225a"' + ((nodo.equip && nodo.equip.tipo === 'centro_qo_225a') ? ' selected' : '') + '>Centro QO 225A</option>' +
            '<option value="desconectador_30a"' + ((nodo.equip && nodo.equip.tipo === 'desconectador_30a') ? ' selected' : '') + '>Desconectador 30A</option>' +
            '<option value="desconectador_60a"' + ((nodo.equip && nodo.equip.tipo === 'desconectador_60a') ? ' selected' : '') + '>Desconectador 60A</option>' +
            '<option value="desconectador_100a"' + ((nodo.equip && nodo.equip.tipo === 'desconectador_100a') ? ' selected' : '') + '>Desconectador 100A</option>' +
            '<option value="desconectador_200a"' + ((nodo.equip && nodo.equip.tipo === 'desconectador_200a') ? ' selected' : '') + '>Desconectador 200A</option>' +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">I.P / Modelo</label>' +
            '<select id="equip-' + nodo.id + '-modelo" name="equip-' + nodo.id + '-modelo" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" onchange="UIAlimentadores.onEquipModeloChange(\'' + nodo.id + '\', this.value)" disabled>' +
            '<option value="">-- Seleccionar modelo --</option>' +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">Capacidad (kA)</label>' +
            '<input id="equip-' + nodo.id + '-cap" name="equip-' + nodo.id + '-cap" type="number" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + ((nodo.equip && nodo.equip.cap) || 0) + '" step="0.1" min="0" readonly>' +
            '</div>' +
            '<div>' +
            '<label class="block text-[--text-muted] mb-1">I Disparo (A)</label>' +
            '<input id="equip-' + nodo.id + '-idisparo" name="equip-' + nodo.id + '-idisparo" type="number" class="w-full bg-[--bg] border border-[--border] rounded px-2 py-1 text-[--text]" value="' + ((nodo.equip && nodo.equip.iDisparo) || 0) + '" step="1" min="0" onchange="UIAlimentadores.actualizarEquip(\'' + nodo.id + '\', \'iDisparo\', this.value)">' +
            '</div>' +
            '</div>' +
            generarSugerenciaCalibre(f, nodo.id, tempAmbiente) +
            '</div>';
    }

    function toggleExpand(nodoId) {
        nodoExpandido[nodoId] = !nodoExpandido[nodoId];
        renderizar();
    }

    /**
     * Cuando cambia el tipo de equipo en un feeder
     */
    function onEquipTipoChange(nodoId, tipo) {
        // Actualizar estado sin re-renderizar completo
        if (!getNodos()) return;
        var nodo = getNodos().find(function(n) { return n.id === nodoId; });
        if (!nodo) return;

        if (!nodo.equip) nodo.equip = {};
        nodo.equip.tipo = tipo;
        nodo.equip.modelo = '';
        nodo.equip.cap = 0;
        nodo.equip.serie = '';

        // 🔥 Auto-calcular iDisparo para Int. Principal (multiplicador 10 como P0)
        if (tipo === 'int_principal' && nodo.feeder && nodo.feeder.cargaA) {
            var multiplicador = 10;
            nodo.equip.iDisparo = nodo.feeder.cargaA * multiplicador;
        } else {
            nodo.equip.iDisparo = 0;
        }

        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }

        var modeloSel = document.getElementById('equip-' + nodoId + '-modelo');
        var capInp = document.getElementById('equip-' + nodoId + '-cap');
        var iDispInp = document.getElementById('equip-' + nodoId + '-idisparo');

        if (!modeloSel || !capInp) return;

        modeloSel.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar modelo --';
        modeloSel.appendChild(opt);
        modeloSel.disabled = true;
        capInp.value = '';

        // Actualizar campo iDisparo en UI
        if (iDispInp) {
            iDispInp.value = nodo.equip.iDisparo > 0 ? nodo.equip.iDisparo : '';
        }
        
        // Mapear tipos de equipo a series de EQUIPOS
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
        
        var fusibleDefault = {
            'desconectador_30a': 1,
            'desconectador_60a': 2,
            'desconectador_100a': 3,
            'desconectador_200a': 4
        };
        
        var equipoKeys = tipoAModelos[tipo];
        
        if (tipo && equipoKeys && equipoKeys.length > 0) {
            var esDesconectador = tipo.startsWith('desconectador');
            
            equipoKeys.forEach(function(equipoKey) {
                if (EQUIPOS[equipoKey]) {
                    var equipo = EQUIPOS[equipoKey];
                    
                    if (esDesconectador && equipoKey === 'fusible') {
                        var group = document.createElement('optgroup');
                        group.label = equipo.nombre;
                        
                        var optSF = document.createElement('option');
                        optSF.value = equipoKey + '|0';
                        optSF.textContent = (equipo.modelos && equipo.modelos.length > 0) ? equipo.modelos[0].nombre : 'Sin modelo';
                        group.appendChild(optSF);
                        
                        var indiceFusible = fusibleDefault[tipo];
                        if (indiceFusible && equipo.modelos[indiceFusible]) {
                            var optFusible = document.createElement('option');
                            optFusible.value = equipoKey + '|' + indiceFusible;
                            optFusible.textContent = equipo.modelos[indiceFusible].nombre;
                            group.appendChild(optFusible);
                        }
                        
                        modeloSel.appendChild(group);
                    } else {
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
            
            modeloSel.disabled = false;
        }
    }

    /**
     * Cuando cambia el modelo de equipo en un feeder
     */
    function onEquipModeloChange(nodoId, valor) {
        // Actualizar estado sin re-renderizar completo
        if (!getNodos()) return;
        var nodo = getNodos().find(function(n) { return n.id === nodoId; });
        if (!nodo) return;

        if (!nodo.equip) nodo.equip = {};
        
        if (!valor) {
            nodo.equip.modelo = '';
            nodo.equip.cap = 0;
            nodo.equip.serie = '';
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
            
            var capInp = document.getElementById('equip-' + nodoId + '-cap');
            if (capInp) capInp.value = '';
            return;
        }
        
        var partes = (valor || '').split('|');
        if (partes.length !== 2) return;
        var equipoKey = partes[0];
        var indice = parseInt(partes[1], 10) || 0;
        
        if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].modelos[indice]) {
            var modelo = EQUIPOS[equipoKey].modelos[indice];
            nodo.equip.modelo = modelo.nombre;
            nodo.equip.cap = modelo.cap;
            nodo.equip.serie = equipoKey;
            
            // 🔥 Auto-calcular I disparo instantáneo
            var iDisparo = 0;
            if ((modelo.disparo === 'termomagnetico' || modelo.disparo === 'fusible') && modelo.amp !== 'Cualquiera' && !isNaN(modelo.amp)) {
                var multiplicador = 10;
                if (EQUIPOS[equipoKey] && EQUIPOS[equipoKey].curvaDisparo) {
                    multiplicador = EQUIPOS[equipoKey].curvaDisparo.multiplicadorInstantaneo || 10;
                }
                iDisparo = modelo.amp * multiplicador;
            }
            nodo.equip.iDisparo = iDisparo;
            
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
            
            var capInp = document.getElementById('equip-' + nodoId + '-cap');
            if (capInp) capInp.value = modelo.cap;
            
            var iDispInp = document.getElementById('equip-' + nodoId + '-idisparo');
            if (iDispInp) iDispInp.value = iDisparo > 0 ? iDisparo : '';
        }
    }

    function agregarHijo(parentId) {
        if (!getNodos() || getNodos().length >= MAX_NODOS) {
            if (getNodos() && getNodos().length >= MAX_NODOS) {
                UIToast.mostrar('Máximo de nodos alcanzado (' + MAX_NODOS + ')', 'error');
            }
            return;
        }

        var nuevoId = generarNuevoId();
        var nuevoNodo = {
            id: nuevoId,
            parentId: parentId,
            nombre: 'Punto ' + (nuevoId && nuevoId.length > 1 ? nuevoId.substring(1) : nuevoId),
            feeder: {
                calibre: '4/0',
                material: 'cobre',
                canalizacion: 'pvc',
                longitud: 30,
                paralelo: 1,
                cargaA: 0,
                cargaFP: 0.9
            },
            equip: {
                tipo: '',
                modelo: '',
                cap: 0,
                iDisparo: 0,
                nombre: ''
            }
        };

        if (!getNodos()) return;
        var nodos = getNodos();
        nodos.push(nuevoNodo);
        setNodos(nodos);
        nodoExpandido[parentId] = true;
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        renderizar();
        UIDiagrama.dibujar();
    }

    function eliminarNodo(nodoId) {
        if (!getNodos() || getNodos().length === 0) return;
        var hijos = Impedancias.obtenerHijos(nodoId, getNodos());
        if (hijos.length > 0) {
            UIToast.mostrar('No se puede eliminar un nodo con derivaciones. Elimine primero las ramas hijas.', 'error');
            return;
        }

        setNodos((getNodos() || []).filter(function(n) { return n.id !== nodoId; }));
        delete nodoExpandido[nodoId];
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        renderizar();
        UIDiagrama.dibujar();
    }

    function actualizarFeeder(nodoId, campo, valor) {
        if (!getNodos()) return;
        var nodo = getNodos().find(function(n) { return n.id === nodoId; });
        if (!nodo) return;

        if (!nodo.feeder) nodo.feeder = {};

        if (campo === 'longitud' || campo === 'paralelo' || campo === 'cargaA') {
            nodo.feeder[campo] = parseFloat(valor) || 0;
        } else if (campo === 'cargaFP') {
            nodo.feeder[campo] = parseFloat(valor) || 0;
        } else {
            nodo.feeder[campo] = valor;
        }

        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        // No renderizar completo para evitar congelamiento de selectores
        // Solo actualizar diagrama
        UIDiagrama.dibujar();
    }

    function actualizarNombre(nodoId, nombre) {
        if (!getNodos()) return;
        var nodo = getNodos().find(function(n) { return n.id === nodoId; });
        if (!nodo) return;

        nodo.nombre = nombre;
        UIDiagrama.dibujar();
    }

    function actualizarEquip(nodoId, campo, valor) {
        if (!getNodos()) return;
        var nodo = getNodos().find(function(n) { return n.id === nodoId; });
        if (!nodo) return;

        if (!nodo.equip) nodo.equip = {};

        if (campo === 'cap' || campo === 'iDisparo') {
            nodo.equip[campo] = parseFloat(valor) || 0;
        } else {
            nodo.equip[campo] = valor;
        }

        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        // No renderizar completo para evitar congelamiento de selectores
        UIDiagrama.dibujar();
    }

    function generarNuevoId() {
        var maxNum = 0;
        (getNodos() || []).forEach(function(n) {
            if (n.id && n.id.length > 1) {
                var num = parseInt(n.id.substring(1), 10) || 0;
                if (num > maxNum) maxNum = num;
            }
        });
        return 'P' + (maxNum + 1);
    }

    function init() {
        // Initialize nodos if not exists
        if (!getNodos() || !getNodos().length) {
            setNodos([
                {
                    id: 'P0',
                    parentId: null,
                    nombre: 'Punto 0',
                    feeder: {
                        calibre: '4/0',
                        material: 'cobre',
                        canalizacion: 'pvc',
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
            ]);
        }
        renderizar();
    }

    // Convert nodos to feeders for backward compatibility with calculation engine
    function convertirNodosAFeeders() {
        if (!getNodos() || !getNodos().length) return [];

        var feeders = [];
        var nodosOrdenados = Impedancias.ordenarPorNivel(getNodos());

        // Skip root node (P0), convert only child nodes to feeders
        for (var i = 1; i < nodosOrdenados.length; i++) {
            var nodo = nodosOrdenados[i];
            if (nodo.feeder) {
                feeders.push(nodo.feeder);
            }
        }

        return feeders;
    }

    return {
        renderizar: renderizar,
        actualizarFeeder: actualizarFeeder,
        actualizarEquip: actualizarEquip,
        getAmpacidadSugerida: getAmpacidadSugerida,
        onEquipTipoChange: onEquipTipoChange,
        onEquipModeloChange: onEquipModeloChange,
        agregarHijo: agregarHijo,
        eliminarNodo: eliminarNodo,
        actualizarNombre: actualizarNombre,
        init: init
    };
})();

if (typeof window !== 'undefined') {
    window.UIAlimentadores = UIAlimentadores;
}



