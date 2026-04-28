var UIResultados = (function() {

    function mostrar(puntos) {
        if (!puntos || !puntos.length) return;
        var fallaMin = Motor.ejecutarFallaMinima(puntos);
        mostrarTabla(puntos);
        mostrarContextoCarga();
        mostrarAmpacidadReal(puntos);
        mostrarCaidaTension();
        mostrarFallaMinima(puntos, fallaMin);
        mostrarFaseTierra(puntos);
        mostrarImpedancias(puntos);
        mostrarRecomendaciones(puntos);
        mostrarValidacionesNOM(puntos);
        mostrarCoordinacionTCC(puntos);
    }

    function ocultar() {
        var resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.classList.add('hidden');
        var recomendacionesSection = document.getElementById('recomendaciones-section');
        if (recomendacionesSection) recomendacionesSection.classList.add('hidden');
        var impedanciasSection = document.getElementById('impedancias-section');
        if (impedanciasSection) impedanciasSection.classList.add('hidden');
        var caidaSection = document.getElementById('caida-section');
        if (caidaSection) caidaSection.classList.add('hidden');
        var fallaMinSection = document.getElementById('falla-min-section');
        if (fallaMinSection) fallaMinSection.classList.add('hidden');
        var faseTierraSection = document.getElementById('fase-tierra-section');
        if (faseTierraSection) faseTierraSection.classList.add('hidden');
    }

    function mostrarContextoCarga() {
        var section = document.getElementById('load-context-results');
        if (!section) return;
        
        var ctx = App.estado.ctx;
        
        if (!ctx) {
            // Note: innerHTML is safe here as content is static, not from user input
            section.innerHTML = '<div class="flex items-center gap-2 px-4 py-3 rounded-lg bg-[--cyan]/10 border border-[--cyan]/30">' +
                '<i class="fas fa-info-circle text-[--cyan]"></i>' +
                '<div>' +
                '<span class="text-[--cyan] font-semibold">Modo ideal balanceado</span>' +
                '<span class="text-[--text-muted] text-sm ml-2">Sin contexto de carga real: se asume sistema balanceado</span>' +
                '</div>' +
                '</div>';
            section.classList.remove('hidden');
            return;
        }
        
        // Calcular promedio de corrientes de fase
        var avgPhase = (ctx.phases.Ia + ctx.phases.Ib + ctx.phases.Ic) / 3;
        var unbalancePct = ctx.system.unbalance * 100;
        var fccPct = ctx.system.Fcc ? (ctx.system.Fcc * 100).toFixed(1) : 'N/A';
        
        // Determinar estado del sistema
        var status = 'OK';
        var statusColor = 'text-[--green]';
        var statusBg = 'bg-[--green]/10';
        var statusBorder = 'border-[--green]';
        var statusIcon = 'fa-check-circle';
        
        if (ctx.harmonics.THDi > 0.05 || ctx.harmonics.In_harm > 0) {
            status = 'WARNING';
            statusColor = 'text-[--yellow]';
            statusBg = 'bg-[--yellow]/10';
            statusBorder = 'border-[--yellow]';
            statusIcon = 'fa-exclamation-triangle';
        }
        
        if (unbalancePct > 15) {
            status = 'WARNING';
            statusColor = 'text-[--yellow]';
            statusBg = 'bg-[--yellow]/10';
            statusBorder = 'border-[--yellow]';
            statusIcon = 'fa-exclamation-triangle';
        }
        
        // Note: innerHTML is safe here as variables (status, statusBg, etc.) are internally generated, not from user input
        section.innerHTML = '<div class="rounded-lg border ' + statusBg + ' ' + statusBorder + ' p-4">' +
            '<div class="flex items-center gap-2 mb-3">' +
            '<i class="fas ' + statusIcon + ' ' + statusColor + '"></i>' +
            '<span class="' + statusColor + ' font-semibold">Contexto de carga real</span>' +
            '<span class="text-[--text-muted] text-sm ml-auto">Estado: ' + String(status).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-6 gap-4 text-sm">' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">Ia (A)</span>' +
            '<span class="font-semibold">' + ctx.phases.Ia.toFixed(1) + '</span>' +
            '</div>' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">Ib (A)</span>' +
            '<span class="font-semibold">' + ctx.phases.Ib.toFixed(1) + '</span>' +
            '</div>' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">Ic (A)</span>' +
            '<span class="font-semibold">' + ctx.phases.Ic.toFixed(1) + '</span>' +
            '</div>' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">In (A)</span>' +
            '<span class="font-semibold">' + ctx.phases.In.toFixed(1) + '</span>' +
            '</div>' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">Desbalance</span>' +
            '<span class="font-semibold ' + (unbalancePct > 15 ? 'text-[--yellow]' : '') + '">' + unbalancePct.toFixed(1) + '%</span>' +
            '</div>' +
            '<div>' +
            '<span class="text-[--text-muted] block text-xs">Fcc</span>' +
            '<span class="font-semibold">' + fccPct + '%</span>' +
            '</div>' +
            '</div>' +
            (ctx.harmonics.THDi > 0.05 ? '<div class="mt-2 text-xs text-[--yellow]"><i class="fas fa-exclamation-triangle mr-1"></i>Armónicos detectados: THDi = ' + (ctx.harmonics.THDi * 100).toFixed(1) + '%</div>' : '') +
            '</div>';
        
        section.classList.remove('hidden');
    }

    function mostrarAmpacidadReal(puntos) {
        var section = document.getElementById('ampacidad-real-section');
        var content = document.getElementById('ampacidad-real-content');
        if (!section || !content) return;
        
        if (!puntos || puntos.length === 0) return;
        
        // Usar CDT del cálculo (derived state) en lugar de recalcular
        var punto = puntos && puntos.length > 0 ? puntos[0] : null;
        if (!punto) return;
        var cdt = punto.CDT;
        
        if (!cdt) {
            // Note: innerHTML is safe here as content is static, not from user input
        content.innerHTML = '<div class="p-4 text-sm text-[--text-muted]">Datos C.D.T. no disponibles</div>';
            section.classList.remove('hidden');
            return;
        }
        
        var nodo = App.estado.nodos && App.estado.nodos.length > 0 ? App.estado.nodos[0] : null;
        var f = nodo ? nodo.feeder : null;
        var cargaA = f ? f.cargaA : 0;
        
        // Obtener Fcc del contexto si está disponible
        var Fcc = 1.25; // Default NOM-001
        if (App.estado && App.estado.ctx && App.estado.ctx.system && App.estado.ctx.system.Fcc != null) {
            Fcc = App.estado.ctx.system.Fcc;
        }
        
        var statusColor = cdt.status === 'PASS' ? 'text-[--green]' : 
                          cdt.status === 'WARNING' ? 'text-[--yellow]' : 'text-[--red]';
        var statusBg = cdt.status === 'PASS' ? 'border-[--green]/30 bg-[--green]/5' : 
                       cdt.status === 'WARNING' ? 'border-[--yellow]/30 bg-[--yellow]/5' : 'border-[--red]/30 bg-[--red]/5';
        var statusIcon = cdt.status === 'PASS' ? 'fa-check-circle' : 
                        cdt.status === 'WARNING' ? 'fa-exclamation-triangle' : 'fa-times-circle';
        
        content.innerHTML = '<div class="rounded-lg border ' + statusBg + ' p-4">' +
            '<div class="flex items-center gap-2 mb-4">' +
            '<i class="fas ' + statusIcon + ' ' + statusColor + '"></i>' +
            '<span class="' + statusColor + ' font-semibold">C.D.T. (Capacidad de Diseño Térmico)</span>' +
            '<span class="text-[--text-muted] text-sm ml-auto">Estado Final: ' + cdt.status + '</span>' +
            '</div>' +
            
            // Flujo de cálculo
            '<div class="mb-4 p-3 bg-[--surface] rounded-lg border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-2 uppercase tracking-wider">Flujo de Cálculo Normativo</p>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">' +
            '<div class="flex items-center gap-2">' +
            '<span class="text-[--text-muted] text-xs">I_base (carga):</span>' +
            '<span class="font-semibold">' + cargaA.toFixed(1) + ' A</span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
            '<span class="text-[--text-muted] text-xs">Factor Carga Continua:</span>' +
            '<span class="font-semibold text-[--cyan]">× ' + Fcc.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
            '<span class="text-[--text-muted] text-xs">I_diseño (requerida):</span>' +
            '<span class="font-semibold text-[--cyan]">' + cdt.I_diseño.toFixed(1) + ' A</span>' +
            '</div>' +
            '</div>' +
            '</div>' +
            
            // Factores de Acondicionamiento
            '<div class="mb-4 p-3 bg-[--surface] rounded-lg border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-2 uppercase tracking-wider">Factores de Acondicionamiento Térmico</p>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">' +
            '<div>' +
            '<div class="flex justify-between mb-1">' +
            '<span class="text-[--text-muted] text-xs">F_temp (Ambiente):</span>' +
            '<span class="font-semibold">' + (cdt.F_temp || 0).toFixed(2) + '</span>' +
            '</div>' +
            '<div class="text-[10px] text-[--text-muted]">Corrección por temperatura ambiente</div>' +
            '</div>' +
            '<div>' +
            '<div class="flex justify-between mb-1">' +
            '<span class="text-[--text-muted] text-xs">F_agrupamiento:</span>' +
            '<span class="font-semibold">' + (cdt.F_agrupamiento || 0).toFixed(2) + '</span>' +
            '</div>' +
            '<div class="text-[10px] text-[--text-muted]">Corrección por agrupamiento de conductores</div>' +
            (cdt.agrupamientoInfo ? '<div class="mt-1 space-y-1">' +
                (cdt.agrupamientoInfo.fuente === 'AUTO_CORREGIDO' && cdt.agrupamientoInfo.autocorreccion ? '<div class="text-[10px] text-[--yellow]"><i class="fas fa-exclamation-triangle mr-1"></i>' + cdt.agrupamientoInfo.autocorreccion.msg + '</div>' : '') +
                (cdt.agrupamientoInfo.fuente ? '<div class="text-[10px] text-[--cyan]"><i class="fas fa-info-circle mr-1"></i>' + cdt.agrupamientoInfo.fuente + (cdt.agrupamientoInfo.ccc ? ' (CCC=' + cdt.agrupamientoInfo.ccc + ')' : '') + '</div>' : '') +
                (cdt.agrupamientoInfo.razonCCC ? '<div class="text-[10px] text-[--text-muted]">' + cdt.agrupamientoInfo.razonCCC + '</div>' : '') +
                '</div>' : '') +
            '</div>' +
            '</div>' +
            '</div>' +

            // Resultado Normativo (CLAVE)
            '<div class="mb-4 p-3 bg-[--surface] rounded-lg border border-[--border]">' +
            '<p class="text-xs font-semibold text-[--text-muted] mb-2 uppercase tracking-wider">Resultado Normativo (Art. 110.14C)</p>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">' +
            '<div>' +
            '<div class="flex justify-between mb-1">' +
            '<span class="text-[--text-muted] text-xs">Ampacidad Corregida:</span>' +
            '<span class="font-semibold">' + (cdt.I_corregida || 0).toFixed(1) + ' A</span>' +
            '</div>' +
            '<div class="text-[10px] text-[--text-muted]">Capacidad bruta del cable (ambiente + agrupamiento)</div>' +
            '</div>' +
            '<div>' +
            '<div class="flex justify-between mb-1">' +
            '<span class="text-[--text-muted] text-xs">Límite de Terminal:</span>' +
            '<span class="font-semibold ' + (cdt.violacionTerminal ? 'text-[--red]' : 'text-[--green]') + '">' + ((cdt.I_limite_terminal && cdt.I_limite_terminal > 0) ? cdt.I_limite_terminal.toFixed(1) : (cdt.I_corregida || 0).toFixed(1)) + ' A</span>' +
            '</div>' +
            '<div class="text-[10px] text-[--text-muted]">Límite por temperatura de terminales (75°C)</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            
            // Resultado Final
            '<div class="p-3 rounded-lg ' + (cdt.status === 'PASS' ? 'bg-[--green]/10' : cdt.status === 'WARNING' ? 'bg-[--yellow]/10' : 'bg-[--red]/10') + '">' +
            '<div class="flex justify-between items-center">' +
            '<div>' +
            '<div class="text-xs text-[--text-muted] uppercase">Ampacidad Final (I_corregida)</div>' +
            '<div class="text-xl font-bold ' + statusColor + '">' + (cdt.I_final || 0).toFixed(1) + ' A</div>' +
            '</div>' +
            '<div class="text-right">' +
            '<div class="text-xs text-[--text-muted] uppercase">Margen</div>' +
            '<div class="text-xl font-bold ' + statusColor + '">' + (cdt.margen || 0).toFixed(1) + '%</div>' +
            '</div>' +
            '</div>' +
            (cdt.violacionTerminal ? '<div class="mt-2 text-xs text-[--red] font-bold"><i class="fas fa-exclamation-circle mr-1"></i>FAIL: El cable soporta ' + (cdt.I_corregida || 0).toFixed(1) + 'A, pero las terminales limitan a ' + (cdt.I_limite_terminal || 0).toFixed(1) + 'A.</div>' : '') +
            (cdt.sinFactor125 ? '<div class="mt-2 text-xs text-[--yellow] font-bold"><i class="fas fa-exclamation-triangle mr-1"></i>WARNING: Ampacidad cumple con la carga, pero no tiene el factor de seguridad de 125%.</div>' : '') +
            '</div>' +
            // Validaciones de input (si existen)
            (cdt.validacionInput && ((cdt.validacionInput.warnings && cdt.validacionInput.warnings.length > 0) || (cdt.validacionInput.errors && cdt.validacionInput.errors.length > 0)) ? '<div class="mt-3">' +
                (cdt.validacionInput.errors && cdt.validacionInput.errors.length > 0 ? cdt.validacionInput.errors.map(function(e) {
                    return '<div class="text-xs text-[--red] p-2 bg-[--red]/10 rounded border border-[--red] mb-1"><i class="fas fa-times-circle mr-1"></i>' + e + '</div>';
                }).join('') : '') +
                (cdt.validacionInput.warnings && cdt.validacionInput.warnings.length > 0 ? cdt.validacionInput.warnings.map(function(w) {
                    return '<div class="text-xs text-[--yellow] p-2 bg-[--yellow]/10 rounded border border-[--yellow] mb-1"><i class="fas fa-exclamation-triangle mr-1"></i>' + w + '</div>';
                }).join('') : '') +
                '</div>' : '') +
            // Validaciones (si existen en CDT)
            (cdt.validaciones && cdt.validaciones.length > 0 ? '<div class="mt-3">' + (cdt.validaciones || []).map(function(v) {
                var vColor = v.type === 'ERROR' ? 'text-[--red]' : 'text-[--yellow]';
                return '<div class="text-xs ' + vColor + ' p-2 bg-[--surface] rounded border border-[--border]"><i class="fas fa-exclamation-circle mr-1"></i>' + v.message + '</div>';
            }).join('') + '</div>' : '') +
            '</div>';
        
        section.classList.remove('hidden');
        section.classList.add('fade-in');
    }

    function mostrarTabla(puntos) {
        var section = document.getElementById('results-section');
        var tbody = document.getElementById('results-tbody');
        if (!section || !tbody) return;
        section.classList.remove('hidden'); section.classList.add('fade-in');
        tbody.textContent = '';
        if (!puntos || puntos.length === 0) return;
        var tieneMotores = puntos.some(function(p) { return p.aporteMotores && p.aporteMotores.iAporte > 0; });
        var thead = section.querySelector('thead tr');
        if (thead) {
            thead.textContent = '';
            var th1 = document.createElement('th');
            th1.textContent = 'Punto / Equipo';
            thead.appendChild(th1);
            var th2 = document.createElement('th');
            th2.textContent = 'Isc red (kA)';
            thead.appendChild(th2);
            if (tieneMotores) {
                var th3 = document.createElement('th');
                th3.textContent = 'Isc+Mot (kA)';
                thead.appendChild(th3);
                var th4 = document.createElement('th');
                th4.textContent = 'Ipico+Mot (kA)';
                thead.appendChild(th4);
            } else {
                var th3 = document.createElement('th');
                th3.textContent = 'Ipico (kA)';
                thead.appendChild(th3);
            }
            var thXR = document.createElement('th');
            thXR.textContent = 'X/R';
            thead.appendChild(thXR);
            var thCap = document.createElement('th');
            thCap.textContent = 'Cap. Equipo';
            thead.appendChild(thCap);
            var thMin = document.createElement('th');
            thMin.textContent = 'Cap. Min';
            thead.appendChild(thMin);
            var thVerif = document.createElement('th');
            thVerif.textContent = 'Verif.';
            thead.appendChild(thVerif);
        }

        (puntos || []).forEach(function(p, i) {
            var capMin = UIDiagrama.capacidadMinima(p.iscConMotores);
            var equipCap = (p.equip && p.equip.cap) ? p.equip.cap : 0;
            var verif = UIDiagrama.verificarEquipo(p.iscConMotores, equipCap);
            var hasEquip = p.equip && p.equip.tipo && equipCap > 0;
            var iscM = tieneMotores ? (p.iscConMotores || p.isc || 0) : (p.isc || 0);
            var ipM = tieneMotores ? (p.ipeakConMotores || p.ipeak || 0) : (p.ipeak || 0);
            var color = UIDiagrama.colorPorCorriente(iscM);
            var tr = document.createElement('tr');

            var td1 = document.createElement('td');
            var span1 = document.createElement('span');
            span1.className = 'text-[--amber] font-mono text-xs';
            span1.textContent = 'P' + i;
            var span2 = document.createElement('span');
            span2.className = 'block text-[0.6rem] text-[--text-muted] max-w-[180px] truncate';
            span2.textContent = (p.equip && p.equip.nombre) || p.nombre || '';
            span2.title = (p.equip && p.equip.nombre) || p.nombre || '';
            td1.appendChild(span1);
            td1.appendChild(span2);
            tr.appendChild(td1);

            if (tieneMotores) {
                var td2 = document.createElement('td');
                td2.textContent = p.isc.toFixed(2);
                tr.appendChild(td2);
                var td3 = document.createElement('td');
                td3.className = 'font-semibold';
                td3.style.color = color;
                td3.textContent = iscM.toFixed(2);
                tr.appendChild(td3);
                var td4 = document.createElement('td');
                td4.textContent = p.ipeak.toFixed(2) + ' / ';
                var strong = document.createElement('strong');
                strong.textContent = ipM.toFixed(2);
                td4.appendChild(strong);
                tr.appendChild(td4);
            } else {
                var td2 = document.createElement('td');
                td2.className = 'font-semibold';
                td2.style.color = color;
                td2.textContent = iscM.toFixed(2);
                tr.appendChild(td2);
                var td3 = document.createElement('td');
                td3.textContent = ipM.toFixed(2);
                tr.appendChild(td3);
            }

            var tdXR = document.createElement('td');
            tdXR.textContent = p.xr > 100 ? '>100' : p.xr.toFixed(1);
            tr.appendChild(tdXR);

            var tdCap = document.createElement('td');
            tdCap.className = hasEquip ? (verif.cls === 'badge-danger' ? 'text-[--red] font-semibold' : 'text-[--text] font-semibold') : 'text-[--text]';
            tdCap.textContent = hasEquip ? equipCap.toFixed(1) : '\u2014';
            tr.appendChild(tdCap);

            var tdMin = document.createElement('td');
            tdMin.className = 'text-[--cyan]';
            tdMin.textContent = capMin;
            tr.appendChild(tdMin);

            var tdVerif = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'badge ' + verif.cls;
            var icon = document.createElement('i');
            icon.className = 'fas ' + verif.icon;
            icon.style.fontSize = '0.5rem';
            badge.appendChild(icon);
            badge.appendChild(document.createTextNode(' ' + verif.text));
            tdVerif.appendChild(badge);
            tr.appendChild(tdVerif);

            tbody.appendChild(tr);
        });
        if (tieneMotores) {
            var nota = document.createElement('tr');
            var tdNota = document.createElement('td');
            tdNota.colSpan = 8;
            tdNota.className = 'text-[0.6rem] text-[--text-muted] text-left py-1';
            tdNota.style.fontFamily = 'DM Sans';
            tdNota.textContent = 'Isc red = sin motores. Isc+Mot = incluye aporte subtransitorio de motores. Verificacion usa Isc+Mot (peor caso).';
            nota.appendChild(tdNota);
            tbody.appendChild(nota);
        }
    }

    function mostrarCaidaTension() {
        // Fase 9: Usar estructura de nodos en árbol
        var nodos = App.estado.nodos || [];
        var V = parseFloat(document.getElementById('input-tension').value) || 220;
        var tipo = App.estado.tipoSistema;
        var tieneCarga = (nodos || []).some(function(n) { return n.feeder && n.feeder.cargaA > 0; });
        if (!tieneCarga) return;

        var caidas = CaidaTension.calcularAcumulada(nodos, V, tipo);

        var section = document.getElementById('caida-section');
        var tbody = document.getElementById('caida-tbody');
        if (!section || !tbody) return;
        section.classList.remove('hidden'); section.classList.add('fade-in');
        tbody.textContent = '';
        var tr0 = document.createElement('tr');
        var td0_1 = document.createElement('td');
        var span0 = document.createElement('span');
        span0.className = 'text-[--amber] font-mono text-xs';
        span0.textContent = 'P0';
        td0_1.appendChild(span0);
        tr0.appendChild(td0_1);
        var td0_2 = document.createElement('td');
        td0_2.className = 'text-[--text-muted]';
        td0_2.textContent = '\u2014';
        tr0.appendChild(td0_2);
        var td0_3 = document.createElement('td');
        td0_3.className = 'text-[--text-muted]';
        td0_3.textContent = '\u2014';
        tr0.appendChild(td0_3);
        var td0_4 = document.createElement('td');
        td0_4.textContent = '0.0';
        tr0.appendChild(td0_4);
        var td0_5 = document.createElement('td');
        td0_5.textContent = '0.0%';
        tr0.appendChild(td0_5);
        var td0_6 = document.createElement('td');
        var badge0 = document.createElement('span');
        badge0.className = 'badge badge-ok';
        var icon0 = document.createElement('i');
        icon0.className = 'fas fa-check';
        icon0.style.fontSize = '0.5rem';
        badge0.appendChild(icon0);
        badge0.appendChild(document.createTextNode(' 0%'));
        td0_6.appendChild(badge0);
        tr0.appendChild(td0_6);
        tbody.appendChild(tr0);

        var nodosOrdenados = Impedancias.ordenarPorNivel(nodos);
        for (var i = 0; i < nodosOrdenados.length; i++) {
            var nodo = nodosOrdenados[i];
            if (!nodo.parentId) continue; // Saltarse la raíz
            
            var f = nodo.feeder || {}; // Obtener el feeder asociado al nodo
            var nodoId = nodo.id; // ID del nodo actual

            // Buscar la caída correspondiente al ID del nodo para evitar desajustes en sistemas ramificados
            var c = (caidas || []).find(function(res) { return res.id === nodoId; }) || 
                    { parcial: { caidaV: 0, caidaPct: 0 }, caidaV: 0, caidaPct: 0, ok: true };
            
            var par = c.parcial;
            var td = f.cargaA > 0 && f.cargaFP > 0;
            var cls = !td?'badge-none':(c.ok?'badge-ok':'badge-danger');
            var txt = !td?'Sin datos':(c.ok?'Cumple':'Excede '+CONSTANTES.CAIDA_MAXIMA_TOTAL+'%');
            var icon = !td?'fa-minus-circle':(c.ok?'fa-check':'fa-times-circle');
            var tr = document.createElement('tr');
            var tdId = document.createElement('td');
            var spanId = document.createElement('span');
            spanId.className = 'text-[--amber] font-mono text-xs';
            spanId.textContent = nodo.id;
            var spanNombre = document.createElement('span');
            spanNombre.className = 'block text-[0.6rem] text-[--text-muted]';
            spanNombre.textContent = nodo.nombre || nodo.id;
            tdId.appendChild(spanId);
            tdId.appendChild(spanNombre);
            tr.appendChild(tdId);
            
            var tdCargaA = document.createElement('td');
            tdCargaA.textContent = td ? (f.cargaA || 0).toFixed(0) : '\u2014';
            tr.appendChild(tdCargaA);
            
            var tdCargaFP = document.createElement('td');
            tdCargaFP.textContent = td ? (f.cargaFP || 0).toFixed(2) : '\u2014';
            tr.appendChild(tdCargaFP);
            
            var tdCaidaV = document.createElement('td');
            tdCaidaV.className = (!td ? 'text-[--text-muted]' : (c.ok ? '' : 'text-[--red] font-semibold'));
            tdCaidaV.textContent = td ? par.caidaV.toFixed(1) : '\u2014';
            tr.appendChild(tdCaidaV);
            
            var tdCaidaPct = document.createElement('td');
            tdCaidaPct.className = (!td ? 'text-[--text-muted]' : (c.ok ? 'text-[--green]' : 'text-[--red] font-semibold'));
            tdCaidaPct.textContent = td ? c.caidaPct.toFixed(2) + '%' : '\u2014';
            tr.appendChild(tdCaidaPct);
            
            var tdStatus = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'badge ' + cls;
            var badgeIcon = document.createElement('i');
            badgeIcon.className = 'fas ' + icon;
            badge.appendChild(badgeIcon);
            badge.appendChild(document.createTextNode(' ' + txt));
            tdStatus.appendChild(badge);
            tr.appendChild(tdStatus);
            
            tbody.appendChild(tr);
        }
    }

    function mostrarFallaMinima(puntos, fallaMin) {
        if (!puntos || puntos.length === 0) return;
        var tieneDisparo = puntos.some(function(p) { return p.equip && p.equip.iDisparo > 0; });
        if (!tieneDisparo) return;
        var section = document.getElementById('falla-min-section');
        var tbody = document.getElementById('falla-min-tbody');
        if (!section || !tbody) return;
        section.classList.remove('hidden'); section.classList.add('fade-in');
        tbody.textContent = '';
        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i]; var fm = fallaMin[i]; var td = p.equip && p.equip.iDisparo > 0;
            var cls = !td?'badge-none':(fm.sensible?'badge-ok':'badge-danger');
            var txt = !td?'Sin dato':(fm.sensible?'OK (+'+fm.margen.toFixed(0)+'%)':'NO VE FALLA');
            var icon = !td?'fa-minus-circle':(fm.sensible?'fa-check':'fa-times-circle');
            var tr = document.createElement('tr');

            var td1 = document.createElement('td');
            var span1 = document.createElement('span');
            span1.className = 'text-[--amber] font-mono text-xs';
            span1.textContent = 'P' + i;
            td1.appendChild(span1);
            tr.appendChild(td1);

            var td2 = document.createElement('td');
            td2.className = 'font-semibold';
            td2.style.color = UIDiagrama.colorPorCorriente(p.isc);
            td2.textContent = p.isc.toFixed(2);
            tr.appendChild(td2);

            var td3 = document.createElement('td');
            td3.className = 'text-[--cyan]';
            td3.textContent = fm.iscMin.toFixed(2);
            tr.appendChild(td3);

            var td4 = document.createElement('td');
            td4.className = !td ? 'text-[--text-muted]' : 'text-[--text]';
            td4.textContent = td ? p.equip.iDisparo.toFixed(0) : '\u2014';
            tr.appendChild(td4);

            var td5 = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'badge ' + cls;
            var badgeIcon = document.createElement('i');
            badgeIcon.className = 'fas ' + icon;
            badgeIcon.style.fontSize = '0.5rem';
            badge.appendChild(badgeIcon);
            badge.appendChild(document.createTextNode(' ' + txt));
            td5.appendChild(badge);
            tr.appendChild(td5);

            tbody.appendChild(tr);
        }
    }

    function mostrarFaseTierra(puntos) {
        if (App.estado.tipoSistema !== '3f') return;
        if (!puntos || puntos.length === 0) return;
        var tieneFT = puntos.some(function(p) { return p.faseTierra && p.faseTierra.iscFt > 0; });
        if (!tieneFT) return;
        var section = document.getElementById('fase-tierra-section');
        var tbody = document.getElementById('fase-tierra-tbody');
        if (!section || !tbody) return;
        section.classList.remove('hidden'); section.classList.add('fade-in');
        tbody.textContent = '';
        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i]; var ft = p.faseTierra;
            if (!ft) continue; // Skip if faseTierra is undefined
            var ratio = ft.iscFt > 0 ? (ft.iscFt / p.isc * 100).toFixed(0) : '—';
            var ratioNum = ft.iscFt > 0 ? (ft.iscFt / p.isc) : 0;
            var clsRatio = ratioNum < 0.5 ? 'text-[--green]' : (ratioNum < 0.8 ? 'text-[--yellow]' : 'text-[--orange]');
            var iDisparo = p.equip && p.equip.iDisparo > 0 ? p.equip.iDisparo : 0;
            var tr = document.createElement('tr');

            var td1 = document.createElement('td');
            var span1 = document.createElement('span');
            span1.className = 'text-[--amber] font-mono text-xs';
            span1.textContent = 'P' + i;
            td1.appendChild(span1);
            tr.appendChild(td1);

            var td2 = document.createElement('td');
            td2.className = 'font-semibold';
            td2.style.color = UIDiagrama.colorPorCorriente(p.isc);
            td2.textContent = p.isc.toFixed(2);
            tr.appendChild(td2);

            var td3 = document.createElement('td');
            td3.className = 'text-[--cyan] font-semibold';
            td3.textContent = ft.iscFt.toFixed(2);
            tr.appendChild(td3);

            var td4 = document.createElement('td');
            td4.className = clsRatio;
            td4.textContent = ratio + '%';
            tr.appendChild(td4);

            var td5 = document.createElement('td');
            td5.textContent = (ft.Z0_total * 1000).toFixed(1);
            tr.appendChild(td5);

            var td6 = document.createElement('td');
            td6.textContent = (ft.Z1_total * 1000).toFixed(1);
            tr.appendChild(td6);

            var td7 = document.createElement('td');
            td7.textContent = iDisparo ? iDisparo.toFixed(0) : '—';
            tr.appendChild(td7);

            var td8 = document.createElement('td');
            if (iDisparo > 0 && ft.iscFt < 0.2 * iDisparo) {
                var spanSens = document.createElement('span');
                spanSens.className = 'text-[--red] font-semibold';
                spanSens.textContent = 'NO SENSIBLE';
                td8.appendChild(spanSens);
            } else if (iDisparo > 0) {
                var spanSens = document.createElement('span');
                spanSens.className = 'text-[--green]';
                spanSens.textContent = 'OK';
                td8.appendChild(spanSens);
            } else {
                td8.textContent = '—';
            }
            tr.appendChild(td8);

            tbody.appendChild(tr);
        }
        
        // Agregar nota explicativa
        var nota = document.createElement('tr');
        var tdNota = document.createElement('td');
        tdNota.colSpan = 8;
        tdNota.className = 'text-[0.6rem] text-[--text-muted] text-left py-1';
        tdNota.style.fontFamily = 'DM Sans';
        var iconNota = document.createElement('i');
        iconNota.className = 'fas fa-info-circle text-[--cyan] mr-1';
        tdNota.appendChild(iconNota);
        tdNota.appendChild(document.createTextNode(' I 3F = cortocircuito trifasico simetrico. I F-T = falla fase-tierra (secuencia cero). Ratio indica I F-T / I 3F. Z0 incluye R0 (neutro mismo calibre) y X0 segun configuracion geometrica de cables. Aterrizamiento: ' + (Motor.leerTipoAterrizamiento() || 'N/A')));
        nota.appendChild(tdNota);
        tbody.appendChild(nota);
    }

    function mostrarImpedancias(puntos) {
        var section = document.getElementById('impedancias-section');
        var tbody = document.getElementById('impedancias-tbody');
        if (!section || !tbody) return;
        section.classList.remove('hidden'); section.classList.add('fade-in');
        tbody.textContent = '';
        var V = parseFloat(document.getElementById('input-tension').value) || 220;
        var Vfase = App.estado.tipoSistema === '3f' ? V / Math.sqrt(3) : V;
        (puntos || []).forEach(function(p, i) {
            var tr = document.createElement('tr');

            var td1 = document.createElement('td');
            var span1 = document.createElement('span');
            span1.className = 'text-[--amber] font-mono text-xs';
            span1.textContent = 'P' + i;
            td1.appendChild(span1);
            tr.appendChild(td1);

            var td2 = document.createElement('td');
            td2.textContent = (p.R * 1000).toFixed(3);
            tr.appendChild(td2);

            var td3 = document.createElement('td');
            td3.textContent = (p.X * 1000).toFixed(3);
            tr.appendChild(td3);

            var td4 = document.createElement('td');
            td4.className = 'font-semibold text-[--cyan]';
            td4.textContent = (p.Z * 1000).toFixed(3);
            tr.appendChild(td4);

            var td5 = document.createElement('td');
            td5.textContent = Vfase.toFixed(1);
            tr.appendChild(td5);
        });
    }

    function mostrarRecomendaciones(puntos) {
        var section = document.getElementById('recomendaciones-section');
        var container = document.getElementById('recomendaciones-content');
        if (!section || !container) return;

        var recs = [];

        // ==========================================
        // ÁRBITRO CENTRAL: Decisiones Globales
        // ==========================================
        var fallasCriticas = puntos.filter(function(p) { return p.decision && p.decision.estadoGlobal === 'FAIL'; });
        
        if (fallasCriticas.length > 0) {
            recs.push('<div class="mb-4">');
            recs.push('<p class="text-[--red] font-bold mb-2"><i class="fas fa-times-circle mr-1"></i> FALLAS CRÍTICAS DE SEGURIDAD/NORMATIVA (' + fallasCriticas.length + ')</p>');
            fallasCriticas.forEach(function(p) {
                var idx = puntos.indexOf(p);
                recs.push('<div class="ml-4 mb-2 p-2 bg-[--red]/5 border-l-2 border-[--red] rounded">');
                recs.push('<p class="text-xs font-bold text-[--red]">Punto P' + idx + ':</p>');
                p.decision.errores.forEach(function(err) {
                    recs.push('<p class="text-xs text-[--red] ml-2">• ' + err + '</p>');
                });
                recs.push('</div>');
            });
            recs.push('</div>');
        }

        // Warnings de Sistema
        var todosWarnings = [];
        puntos.forEach(function(p) {
            if (p.decision && p.decision.warnings && p.decision.warnings.length > 0) {
                p.decision.warnings.forEach(function(w) {
                    todosWarnings.push({ punto: puntos.indexOf(p), msg: w });
                });
            }
        });

        if (todosWarnings.length > 0) {
            recs.push('<div class="mb-4">');
            recs.push('<p class="text-[--yellow] font-bold mb-2"><i class="fas fa-exclamation-triangle mr-1"></i> ADVERTENCIAS Y CUMPLIMIENTO</p>');
            todosWarnings.forEach(function(w) {
                recs.push('<p class="text-xs text-[--text] ml-4 mb-1">• <span class="text-[--yellow] font-semibold">P' + w.punto + ':</span> ' + w.msg + '</p>');
            });
            recs.push('</div>');
        }

        if (recs.length === 0) {
            container.innerHTML = '<p class="text-sm text-[--green]"><i class="fas fa-check-circle mr-1"></i> El sistema cumple con todos los criterios de seguridad y normativa analizados.</p>';
        } else {
            // Caida de tension
            var V = parseFloat(document.getElementById('input-tension').value) || 220;
            var tipo = App.estado.tipoSistema;
            if (App.estado.nodos && App.estado.nodos.length > 0) {
                var feedersForCalc = App.estado.nodos.map(function(n) { return n.feeder || {}; });
                var caidas = CaidaTension.calcularAcumulada(feedersForCalc, V, tipo);
                var caidaFinal = caidas[caidas.length - 1];
                var tieneCaida = App.estado.nodos.some(function(n){return n.feeder && n.feeder.cargaA > 0 && n.feeder.cargaFP > 0;});
                if (tieneCaida) {
                    recs.push('<div class="separator mt-2 mb-2"></div>');
                    recs.push('<p><i class="fas fa-arrow-down text-[--cyan] mr-1"></i> <strong>Caida de tension:</strong> <strong class="text-[--text]">'+caidaFinal.caidaPct.toFixed(2)+'%</strong> ('+caidaFinal.caidaV.toFixed(1)+' V).</p>');
                    if (!caidaFinal.ok) recs.push('<p class="text-[--red] text-xs"><i class="fas fa-exclamation-triangle mr-1"></i> Excede el límite máximo permitido.</p>');
                }
            }
            
            recs.push('<p class="text-xs border-t border-[--border] pt-2 mt-2"><i class="fas fa-gavel text-[--text-muted] mr-1"></i> <strong>Art. 110.9:</strong> Capacidad interruptiva. <strong>Art. 110.14:</strong> Terminales. <strong>Art. 230.95:</strong> Tierra. <strong>Art. 310:</strong> Ampacidad.</p>');
            
            container.innerHTML = '';
            recs.forEach(function(html) {
                var div = document.createElement('div');
                // Note: innerHTML is safe here as html is generated internally, not from user input
                div.innerHTML = html;
                while (div.firstChild) container.appendChild(div.firstChild);
            });
        }
        
        section.classList.remove('hidden');
        section.classList.add('fade-in');
    }

    function mostrarValidacionesNOM(puntos) {
        var section = document.getElementById('nom-validacion-section');
        if (!section) {
            var resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                section = document.createElement('div');
                section.id = 'nom-validacion-section';
                section.className = 'mt-6 p-4 rounded-lg border border-[--border] bg-[--surface]';

                var h3 = document.createElement('h3');
                h3.className = 'text-sm font-semibold mb-3 text-[--amber]';
                var icon = document.createElement('i');
                icon.className = 'fas fa-clipboard-check mr-2';
                h3.appendChild(icon);
                h3.appendChild(document.createTextNode('Validaciones NOM-001-SEDE-2012'));

                var contentDiv = document.createElement('div');
                contentDiv.id = 'nom-validacion-content';

                section.appendChild(h3);
                section.appendChild(contentDiv);
                resultsSection.parentNode.insertBefore(section, resultsSection.nextSibling);
            }
        }
        
        var content = document.getElementById('nom-validacion-content');
        if (!content) return;
        
        section.classList.remove('hidden');
        content.textContent = '';
        
        var tieneValidaciones = false;
        
        (puntos || []).forEach(function(p, i) {
            if (p.validacionNOM && p.validacionNOM.errores && p.validacionNOM.errores.length > 0) {
                tieneValidaciones = true;
                var nodoId = 'P' + i;
                
                var div = document.createElement('div');
                div.className = 'mb-3 p-3 rounded-lg border border-[--border] bg-[--bg]';
                
                var header = document.createElement('div');
                header.className = 'flex items-center justify-between mb-2';
                
                var spanId = document.createElement('span');
                spanId.className = 'font-semibold text-[--amber] text-sm';
                spanId.textContent = nodoId;
                
                var spanStatus = document.createElement('span');
                spanStatus.className = 'text-xs px-2 py-1 rounded ' + (p.validacionNOM.status === 'ERROR' ? 'bg-[--red]/20 text-[--red]' : 'bg-[--green]/20 text-[--green]');
                spanStatus.textContent = p.validacionNOM.status;
                
                header.appendChild(spanId);
                header.appendChild(spanStatus);
                div.appendChild(header);
                
                (p.validacionNOM.errores || []).forEach(function(error) {
                    var bgColor = error.type === 'ERROR' ? 'bg-[--red]/10 border-[--red]' :
                                  error.type === 'WARNING' ? 'bg-[--orange]/10 border-[--orange]' :
                                  'bg-[--cyan]/10 border-[--cyan]';
                    var textColor = error.type === 'ERROR' ? 'text-[--red]' :
                                   error.type === 'WARNING' ? 'text-[--orange]' :
                                   'text-[--cyan]';
                    var icon = error.type === 'ERROR' ? 'fa-times-circle' :
                              error.type === 'WARNING' ? 'fa-exclamation-triangle' :
                              'fa-info-circle';
                    
                    var errorDiv = document.createElement('div');
                    errorDiv.className = 'flex items-start gap-2 px-3 py-2 rounded-lg border ' + bgColor + ' mb-1';
                    
                    var errorIcon = document.createElement('i');
                    errorIcon.className = 'fas ' + icon + ' ' + textColor + ' mt-0.5 text-xs';
                    
                    var errorContent = document.createElement('div');
                    errorContent.className = 'flex-1';
                    
                    var errorMsg = document.createElement('span');
                    errorMsg.className = textColor + ' font-semibold text-xs';
                    errorMsg.textContent = error.message;
                    errorContent.appendChild(errorMsg);
                    
                    if (error.data) {
                        var dataDiv = document.createElement('div');
                        dataDiv.className = 'text-xs text-[--text-muted] mt-1';
                        var dataText = '';
                        for (var key in error.data) {
                            if (error.data[key] !== undefined && error.data[key] !== null) {
                                dataText += key + ': ' + error.data[key] + ' | ';
                            }
                        }
                        dataDiv.textContent = dataText.slice(0, -3);
                        errorContent.appendChild(dataDiv);
                    }
                    
                    errorDiv.appendChild(errorIcon);
                    errorDiv.appendChild(errorContent);
                    div.appendChild(errorDiv);
                });
                
                content.appendChild(div);
            }
        });
        
        if (!tieneValidaciones) {
            var okDiv = document.createElement('div');
            okDiv.className = 'flex items-center gap-2 px-3 py-2 rounded-lg bg-[--green]/10 border border-[--green]';
            var okIcon = document.createElement('i');
            okIcon.className = 'fas fa-check-circle text-[--green]';
            var okText = document.createElement('span');
            okText.className = 'text-[--green] text-sm';
            okText.textContent = 'Todos los puntos cumplen con NOM-001-SEDE-2012';
            okDiv.appendChild(okIcon);
            okDiv.appendChild(okText);
            content.appendChild(okDiv);
        }
    }

    function mostrarCoordinacionTCC(puntos) {
        var section = document.getElementById('tcc-coordinacion-section');
        if (!section) {
            var nomSection = document.getElementById('nom-validacion-section');
            if (nomSection) {
                section = document.createElement('div');
                section.id = 'tcc-coordinacion-section';
                section.className = 'mt-6 p-4 rounded-lg border border-[--border] bg-[--surface]';

                var h3 = document.createElement('h3');
                h3.className = 'text-sm font-semibold mb-3 text-[--cyan]';
                var icon = document.createElement('i');
                icon.className = 'fas fa-project-diagram mr-2';
                h3.appendChild(icon);
                h3.appendChild(document.createTextNode('Coordinación TCC (Curvas Tiempo-Corriente)'));

                var contentDiv = document.createElement('div');
                contentDiv.id = 'tcc-coordinacion-content';

                section.appendChild(h3);
                section.appendChild(contentDiv);
                nomSection.parentNode.insertBefore(section, nomSection.nextSibling);
            }
        }
        
        var content = document.getElementById('tcc-coordinacion-content');
        if (!content) return;
        
        section.classList.remove('hidden');
        content.textContent = '';
        
        var coordinacion = puntos.coordinacionTCC;
        
        if (!coordinacion || !coordinacion.pairs || coordinacion.pairs.length === 0) {
            var infoDiv = document.createElement('div');
            infoDiv.className = 'flex items-center gap-2 px-3 py-2 rounded-lg bg-[--cyan]/10 border border-[--cyan]';
            var infoIcon = document.createElement('i');
            infoIcon.className = 'fas fa-info-circle text-[--cyan]';
            var infoText = document.createElement('span');
            infoText.className = 'text-[--cyan] text-sm';
            infoText.textContent = 'No hay suficientes dispositivos con curvas para validar coordinación';
            infoDiv.appendChild(infoIcon);
            infoDiv.appendChild(infoText);
            content.appendChild(infoDiv);
            return;
        }
        
        var btnDiv = document.createElement('div');
        btnDiv.className = 'mb-3';
        var tccBtn = document.createElement('button');
        tccBtn.onclick = TCCTViewer.mostrarCoordinacionSistema;
        tccBtn.className = 'px-3 py-1 bg-[--cyan] text-black rounded text-sm hover:bg-[--cyan]/80';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-chart-line mr-1';
        tccBtn.appendChild(btnIcon);
        tccBtn.appendChild(document.createTextNode('Ver Curvas TCC'));
        btnDiv.appendChild(tccBtn);
        content.appendChild(btnDiv);
        
        var pairsDiv = document.createElement('div');
        pairsDiv.className = 'space-y-3';
        
        coordinacion.pairs.forEach(function(pair) {
            var statusColor = (pair.status === 'OK') ? 'text-[--green]' : 'text-[--red]';
            var statusIcon = (pair.status === 'OK') ? 'fa-check-circle' : 'fa-times-circle';
            var statusBg = (pair.status === 'OK') ? 'bg-[--green]/10 border-[--green]' : 'bg-[--red]/10 border-[--red]';
            
            var pairDiv = document.createElement('div');
            pairDiv.className = 'p-3 rounded-lg border border-[--border] bg-[--bg]';
            
            var pairHeader = document.createElement('div');
            pairHeader.className = 'flex items-center justify-between mb-2';
            
            var pairSpan = document.createElement('span');
            pairSpan.className = 'font-semibold text-[--cyan] text-sm';
            pairSpan.textContent = (pair.pair[0] || '?') + ' → ' + (pair.pair[1] || '?');
            
            var statusSpan = document.createElement('span');
            statusSpan.className = 'text-xs px-2 py-1 rounded ' + statusBg + ' ' + statusColor;
            var statusI = document.createElement('i');
            statusI.className = 'fas ' + statusIcon + ' mr-1';
            statusSpan.appendChild(statusI);
            statusSpan.appendChild(document.createTextNode(pair.status));
            
            pairHeader.appendChild(pairSpan);
            pairHeader.appendChild(statusSpan);
            pairDiv.appendChild(pairHeader);
            
            if (pair.issues && pair.issues.length > 0) {
                var issuesDiv = document.createElement('div');
                issuesDiv.className = 'mt-2 space-y-1';
                (pair.issues || []).forEach(function(issue) {
                    var issueDiv = document.createElement('div');
                    issueDiv.className = 'flex items-start gap-2 px-2 py-1 rounded bg-[--red]/5 border border-[--red]/20';
                    var issueIcon = document.createElement('i');
                    issueIcon.className = 'fas fa-exclamation-triangle text-[--red] text-xs mt-0.5';
                    var issueContent = document.createElement('div');
                    issueContent.className = 'flex-1';
                    var issueText = document.createElement('span');
                    issueText.className = 'text-[--red] text-xs';
                    issueText.textContent = 'Sin selectividad a ' + issue.I.toFixed(0) + ' A (tUp=' + issue.tUp.toFixed(3) + 's, tDown=' + issue.tDown.toFixed(3) + 's)';
                    issueContent.appendChild(issueText);
                    issueDiv.appendChild(issueIcon);
                    issueDiv.appendChild(issueContent);
                    issuesDiv.appendChild(issueDiv);
                });
                pairDiv.appendChild(issuesDiv);
            }
            
            pairsDiv.appendChild(pairDiv);
        });
        
        content.appendChild(pairsDiv);
    }

    function mostrarAutoCorreccion(resultado) {
        var section = document.getElementById('autocorreccion-section');
        if (!section) {
            var resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                section = document.createElement('div');
                section.id = 'autocorreccion-section';
                section.className = 'mt-6 p-4 rounded-lg border border-[--border] bg-[--surface]';

                var h3 = document.createElement('h3');
                h3.className = 'text-sm font-semibold mb-3 text-[--cyan]';
                var icon = document.createElement('i');
                icon.className = 'fas fa-magic mr-2';
                h3.appendChild(icon);
                h3.appendChild(document.createTextNode('Auto-Corrección del Sistema'));

                var contentDiv = document.createElement('div');
                contentDiv.id = 'autocorreccion-content';

                section.appendChild(h3);
                section.appendChild(contentDiv);
                resultsSection.parentNode.insertBefore(section, resultsSection.nextSibling);
            }
        }

        var content = document.getElementById('autocorreccion-content');
        if (!content) return;

        section.classList.remove('hidden');
        content.textContent = '';

        if (!resultado || resultado.cambios.length === 0) {
            var okDiv = document.createElement('div');
            okDiv.className = 'flex items-center gap-2 px-3 py-2 rounded-lg bg-[--green]/10 border border-[--green]';
            var okIcon = document.createElement('i');
            okIcon.className = 'fas fa-check-circle text-[--green]';
            var okText = document.createElement('span');
            okText.className = 'text-[--green] text-sm';
            okText.textContent = 'El sistema ya cumple con todos los criterios. No se requieren correcciones.';
            okDiv.appendChild(okIcon);
            okDiv.appendChild(okText);
            content.appendChild(okDiv);
            return;
        }

        var headerDiv = document.createElement('div');
        headerDiv.className = 'mb-4 p-3 rounded-lg bg-[--cyan]/10 border border-[--cyan]';
        // Note: innerHTML is safe here as variables are internally generated, but we escape for safety
        headerDiv.innerHTML = '<p class="text-sm text-[--cyan] font-semibold"><i class="fas fa-cogs mr-1"></i> Estado: ' + String(resultado.estado).replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' | Iteraciones: ' + resultado.iteraciones + ' | Confianza: ' + (resultado.nivelConfianza * 100).toFixed(0) + '%</p>';
        content.appendChild(headerDiv);

        var cambiosDiv = document.createElement('div');
        cambiosDiv.className = 'space-y-3';

        var cambiosPorPunto = {};
        resultado.cambios.forEach(function(c) {
            if (!cambiosPorPunto[c.punto]) {
                cambiosPorPunto[c.punto] = [];
            }
            cambiosPorPunto[c.punto].push(c);
        });

        for (var punto in cambiosPorPunto) {
            var puntoDiv = document.createElement('div');
            puntoDiv.className = 'p-3 rounded-lg border border-[--border] bg-[--bg]';

            var puntoHeader = document.createElement('div');
            puntoHeader.className = 'flex items-center justify-between mb-2';
            puntoHeader.innerHTML = '<span class="font-semibold text-[--text] text-sm">' + punto + '</span><span class="text-xs text-[--text-muted]">' + cambiosPorPunto[punto].length + ' cambio(s)</span>';
            puntoDiv.appendChild(puntoHeader);

            cambiosPorPunto[punto].forEach(function(c) {
                var cambioDiv = document.createElement('div');
                cambioDiv.className = 'flex items-start gap-2 px-2 py-2 rounded bg-[--surface] border border-[--border] mb-1';

                var tipoIcon = '';
                var tipoColor = '';
                switch (c.tipo) {
                    case 'interruptor':
                        tipoIcon = 'fa-bolt';
                        tipoColor = 'text-[--yellow]';
                        break;
                    case 'conductor':
                        tipoIcon = 'fa-plug';
                        tipoColor = 'text-[--cyan]';
                        break;
                    case 'terminal':
                        tipoIcon = 'fa-plug';
                        tipoColor = 'text-[--orange]';
                        break;
                    case 'tierra':
                        tipoIcon = 'fa-ground';
                        tipoColor = 'text-[--green]';
                        break;
                    default:
                        tipoIcon = 'fa-wrench';
                        tipoColor = 'text-[--text]';
                }

                var icon = document.createElement('i');
                icon.className = 'fas ' + tipoIcon + ' ' + tipoColor + ' mt-0.5 text-xs';

                var cambioContent = document.createElement('div');
                cambioContent.className = 'flex-1';

                var cambioTitle = document.createElement('div');
                cambioTitle.className = 'text-xs font-semibold text-[--text]';
                cambioTitle.textContent = c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1);
                cambioContent.appendChild(cambioTitle);

                if (c.antes !== undefined && c.despues !== undefined) {
                    var cambioValues = document.createElement('div');
                    cambioValues.className = 'text-xs text-[--text-muted] mt-1';
                    cambioValues.textContent = c.antes + ' → ' + c.despues;
                    cambioContent.appendChild(cambioValues);
                }

                if (c.razon) {
                    var cambioRazon = document.createElement('div');
                    cambioRazon.className = 'text-xs text-[--text-muted] mt-1 italic';
                    cambioRazon.textContent = c.razon;
                    cambioContent.appendChild(cambioRazon);
                }

                cambioDiv.appendChild(icon);
                cambioDiv.appendChild(cambioContent);
                puntoDiv.appendChild(cambioDiv);
            });

            cambiosDiv.appendChild(puntoDiv);
        }

        content.appendChild(cambiosDiv);
    }

    function mostrarValidacionInteligente(validacion) {
        if (!validacion) return;

        var section = document.getElementById('validacion-inteligente-section');
        if (!section) {
            // Crear sección si no existe
            var resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                section = document.createElement('div');
                section.id = 'validacion-inteligente-section';
                section.className = 'card mt-4';
                resultsSection.parentNode.insertBefore(section, resultsSection.nextSibling);
            } else {
                return;
            }
        }

        var html = '<div class="card-title mb-3"><i class="fas fa-brain mr-2"></i>Validación Inteligente</div>';

        // Resumen
        html += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">' +
            '<div class="p-2 rounded bg-[--surface] border border-[--border] text-center">' +
            '<div class="text-lg font-bold text-[--text]">' + validacion.resumen.totalPuntos + '</div>' +
            '<div class="text-xs text-[--text-muted]">Puntos</div>' +
            '</div>' +
            '<div class="p-2 rounded bg-[--red]/10 border border-[--red] text-center">' +
            '<div class="text-lg font-bold text-[--red]">' + validacion.resumen.puntosConErroresFisicos + '</div>' +
            '<div class="text-xs text-[--text-muted]">Errores Físicos</div>' +
            '</div>' +
            '<div class="p-2 rounded bg-[--yellow]/10 border border-[--yellow] text-center">' +
            '<div class="text-lg font-bold text-[--yellow]">' + validacion.resumen.puntosConViolacionesNOM + '</div>' +
            '<div class="text-xs text-[--text-muted]">Violaciones NOM</div>' +
            '</div>' +
            '<div class="p-2 rounded bg-[--cyan]/10 border border-[--cyan] text-center">' +
            '<div class="text-lg font-bold text-[--cyan]">' + validacion.resumen.puntosConAcciones + '</div>' +
            '<div class="text-xs text-[--text-muted]">Acciones Sugeridas</div>' +
            '</div>' +
            '</div>';

        // Errores físicos
        if (validacion.erroresFisicos && validacion.erroresFisicos.length > 0) {
            html += '<div class="mb-4">' +
                '<p class="text-xs font-semibold text-[--red] mb-2 uppercase tracking-wider">Errores Físicos Detectados</p>' +
                '<div class="space-y-2">';
            validacion.erroresFisicos.forEach(function(item) {
                html += '<div class="p-2 rounded bg-[--red]/10 border border-[--red]">' +
                    '<div class="text-xs font-semibold text-[--red]">Punto ' + item.punto + '</div>' +
                    '<div class="text-xs text-[--text-muted] mt-1">' + item.errores.join('<br>') + '</div>' +
                    '</div>';
            });
            html += '</div></div>';
        }

        // Violaciones NOM
        if (validacion.violacionesNOM && validacion.violacionesNOM.length > 0) {
            html += '<div class="mb-4">' +
                '<p class="text-xs font-semibold text-[--yellow] mb-2 uppercase tracking-wider">Violaciones NOM</p>' +
                '<div class="space-y-2">';
            validacion.violacionesNOM.forEach(function(item) {
                html += '<div class="p-2 rounded bg-[--yellow]/10 border border-[--yellow]">' +
                    '<div class="text-xs font-semibold text-[--yellow]">Punto ' + item.punto + '</div>' +
                    '<div class="text-xs text-[--text-muted] mt-1">' + item.violaciones.join('<br>') + '</div>' +
                    '</div>';
            });
            html += '</div></div>';
        }

        // Acciones de corrección
        if (validacion.accionesCorreccion && validacion.accionesCorreccion.length > 0) {
            html += '<div class="mb-4">' +
                '<p class="text-xs font-semibold text-[--cyan] mb-2 uppercase tracking-wider">Acciones de Auto-Corrección Sugeridas</p>' +
                '<div class="space-y-2">';
            validacion.accionesCorreccion.forEach(function(item) {
                html += '<div class="p-2 rounded bg-[--cyan]/10 border border-[--cyan]">' +
                    '<div class="text-xs font-semibold text-[--cyan]">Punto ' + item.punto + '</div>' +
                    '<div class="text-xs text-[--text-muted] mt-1 space-y-1">';
                item.acciones.forEach(function(acc) {
                    var severidadColor = acc.severidad === 'CRÍTICA' ? 'text-[--red]' :
                                        acc.severidad === 'ALTA' ? 'text-[--orange]' :
                                        acc.severidad === 'MEDIA' ? 'text-[--yellow]' : 'text-[--cyan]';
                    html += '<div class="' + severidadColor + '">[' + acc.severidad + '] ' + acc.accion + '</div>';
                    html += '<div class="text-[10px] text-[--text-muted] ml-2">' + acc.razon + '</div>';
                });
                html += '</div></div>';
            });
            html += '</div></div>';
        }

        if (validacion.ok) {
            html += '<div class="p-3 rounded bg-[--green]/10 border border-[--green] text-center">' +
                '<i class="fas fa-check-circle text-[--green] mr-2"></i>' +
                '<span class="text-sm text-[--green]">Sistema validado correctamente</span>' +
                '</div>';
        }

        // Note: innerHTML is safe here as html is generated internally, not from user input
        section.innerHTML = html;
        section.classList.remove('hidden');
        section.classList.add('fade-in');
    }

    return {
        mostrar: mostrar,
        ocultar: ocultar,
        mostrarAutoCorreccion: mostrarAutoCorreccion,
        mostrarValidacionInteligente: mostrarValidacionInteligente
    };
})();

if (typeof window !== 'undefined') {
    window.UIResultados = UIResultados;
}