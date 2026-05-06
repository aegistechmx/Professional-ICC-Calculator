/**
 * diagrama.js
 * Dibujo del diagrama unifilar en canvas.
 * Solo lee de App.estado y App.estado.resultados (no altera estado).
 */
var UIDiagrama = (function() {

    function dibujar() {
        try {
            var canvas = document.getElementById('diagram');
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var container = canvas.parentElement;
            var dpr = window.devicePixelRatio || 1;
            var hasTransformer = App.estado.modo === 'completo';

            // Fase 9: Usar estructura de nodos en árbol
            var nodos = App.estado.nodos || [];
            var numPuntos = nodos.length || 1;
            var width = container.clientWidth;
            var spacing = 95, headerH = 28, height = headerH + 50 + numPuntos * spacing + 30;

            canvas.width = width * dpr; canvas.height = height * dpr;
            canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
            ctx.scale(dpr, dpr);

            ctx.fillStyle = '#0e1018'; ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(255,255,255,0.018)'; ctx.lineWidth = 0.5;
            for (var x=0; x<width; x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
            for (var y=0;y<height;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}

            var cx = width * 0.32, cy = headerH + 25;

            dibujarFuente(ctx, cx, cy); cy += 35;
            linea(ctx, cx, cy, cx, cy + 15, '#f59e0b', 2); cy += 15;

            if (hasTransformer) {
                dibujarTransformador(ctx, cx, cy + 15); cy += 50;
                linea(ctx, cx, cy, cx, cy + 15, '#f59e0b', 2); cy += 15;
            }

            var tension = parseFloat(document.getElementById('input-tension').value) || 220;

            // Fase 9: Dibujar árbol de nodos
            var nodosOrdenados = Impedancias.ordenarPorNivel(nodos);
            var posiciones = {}; // Store positions for drawing connections
            var idsVistos = new Set();

            nodosOrdenados.forEach(function(nodo, idx) {
                if (idsVistos.has(nodo.id)) return;
                idsVistos.add(nodo.id);

                var camino = Impedancias.obtenerCamino(nodo.id, nodos);
                var profundidad = camino.length - 1;

                // Detección de integridad: un camino válido debe llegar a una raíz real (!parentId)
                var nodoRaiz = camino.length > 0 ? nodos.find(function(n) { return n.id === camino[0]; }) : null;
                var tieneCiclo = !nodoRaiz || !!nodoRaiz.parentId;

                var offsetX = profundidad * 80; // Horizontal offset for depth

                barra(ctx, cx + offsetX, cy, width);
                posiciones[nodo.id] = { x: cx + offsetX, y: cy };

                var punto = App.estado.resultados ? App.estado.resultados.find(function(r) { return r.id === nodo.id; }) : null;
                var equipCap = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0;
                var hasEquip = nodo.equip && nodo.equip.tipo && equipCap > 0;
                if (hasEquip) dibujarSimboloEquipo(ctx, cx + offsetX, cy - 14, nodo.equip.tipo);

                if (tieneCiclo) {
                    ctx.fillStyle = '#ef4444'; // Rojo advertencia
                    ctx.font = 'italic 7px "DM Sans"';
                    ctx.fillText('⚠ Error: Ciclo en jerarquía', cx + offsetX + 45, cy + 24);
                }

                if (punto) {
                    var color = colorPorCorriente(punto.isc || 0);
                    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx + offsetX, cy, 4, 0, Math.PI * 2); ctx.fill();
                    var dataX = cx + offsetX + 55;
                    var maxW = width - dataX - 12;

                    if (maxW > 140) {
                        ctx.font = '600 12px "JetBrains Mono'; ctx.fillStyle = color; ctx.textAlign = 'left';
                        ctx.fillText((punto.iscConMotores || punto.isc || 0).toFixed(2) + ' kA', dataX, cy + 1);
                        ctx.font = '400 9px "JetBrains Mono'; ctx.fillStyle = '#6c7293';
                        ctx.fillText('Z=' + (punto.Z * 1000).toFixed(1) + ' mOhm  X/R=' + (punto.xr > 100 ? '>100' : punto.xr.toFixed(1)), dataX, cy + 14);
                    } else if (maxW > 80) {
                        ctx.font = '600 11px "JetBrains Mono'; ctx.fillStyle = color; ctx.textAlign = 'left';
                        ctx.fillText((punto.iscConMotores || punto.isc || 0).toFixed(2) + ' kA', dataX, cy + 1);
                        ctx.font = '400 9px "JetBrains Mono'; ctx.fillStyle = '#6c7293';
                        ctx.fillText('Z=' + (punto.Z * 1000).toFixed(1) + ' mOhm', dataX, cy + 14);
                    }
                    ctx.font = "600 11px 'JetBrains Mono'"; ctx.fillStyle = "rgba(245,158,11,0.8)"; ctx.textAlign = 'right';
                    ctx.fillText(nodo.id, cx + offsetX - 32, cy + 4);
                    ctx.font = '400 8px "DM Sans'; ctx.fillStyle = '#4a5070';
                    var sn = (nodo.equip && nodo.equip.nombre) ? (nodo.equip.nombre.split('\u2014')[0] || '').trim().substring(0, 18) : ((nodo.nombre || nodo.id) || '').substring(0, 18);
                    ctx.fillText(sn, cx + offsetX - 32, cy + 15);
                } else {
                    ctx.fillStyle = '#4a5070'; ctx.beginPath(); ctx.arc(cx + offsetX, cy, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.font = '600 11px "JetBrains Mono'; ctx.fillStyle = '#4a5070'; ctx.textAlign = 'right';
                    ctx.fillText(nodo.id, cx + offsetX - 32, cy + 4);
                }

                cy += 25;

                // Draw connection to parent
                if (nodo.parentId && posiciones[nodo.parentId]) {
                    var parentPos = posiciones[nodo.parentId];
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = '#3a4060';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(parentPos.x, parentPos.y + 25);
                    ctx.lineTo(parentPos.x, parentPos.y + spacing - 25);
                    ctx.lineTo(cx + offsetX, parentPos.y + spacing - 25);
                    ctx.lineTo(cx + offsetX, cy - 25);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw feeder info
                    if (nodo.feeder) {
                        var f = nodo.feeder;
                        ctx.font = '400 9px "DM Sans'; ctx.fillStyle = '#6c7293'; ctx.textAlign = 'left';
                        var midX = (parentPos.x + cx + offsetX) / 2;
                        ctx.fillText(f.calibre + ' ' + (f.material === 'cobre' ? 'Cu' : 'Al') + ' · ' + f.longitud + 'm', midX, parentPos.y + spacing - 40);
                        if (f.paralelo > 1) {
                            ctx.font = '400 8px "DM Sans"';
                            ctx.fillStyle = '#4a5070';
                            ctx.fillText(f.paralelo + ' en paralelo', midX, parentPos.y + spacing - 30);
                        }
                    }
                } else if (!nodo.parentId) {
                    // Root node connection
                    ctx.setLineDash([4, 4]);
                    linea(ctx, cx + offsetX, cy, cx + offsetX, cy + spacing - 50, '#3a4060', 1.5);
                    ctx.setLineDash([]);
                }

                cy += spacing - 50;
            });

            ctx.font = '500 9px "JetBrains Mono'; ctx.fillStyle = '#4a5070'; ctx.textAlign = 'right';
            var tipoStr = App.estado.tipoSistema === '3f' ? '3f' : '1f';
            ctx.fillText(tension + 'V ' + tipoStr, width - 10, 16);
        } catch (e) {
            console.error('Error dibujando diagrama:', e);
        }
    }

    // --- Funciones auxiliares de dibujo ---

    function linea(ctx, x1, y1, x2, y2, color, w) {
        ctx.strokeStyle = color; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function barra(ctx, cx, y, w) {
        var bw = Math.min(w * 0.38, 160);
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - bw/2, y); ctx.lineTo(cx + bw/2, y); ctx.stroke();
        ctx.lineCap = 'butt';
    }

    function dibujarFuente(ctx, cx, y) {
        var bw = 48, bh = 26;
        ctx.fillStyle = '#1a1e2a'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(cx - bw/2, y - bh/2, bw, bh, 4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (var i = -14; i <= 14; i++) {
            var px = cx + i, py = y + Math.sin(i * 0.35) * 4.5;
            i === -14 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.font = '600 8px "DM Sans"'; ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'center';
        ctx.fillText('FUENTE', cx, y + bh/2 + 11);
    }

    function dibujarTransformador(ctx, cx, y) {
        var r = 11;
        ctx.strokeStyle = '#6c7293'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx - 5, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 5, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, y - r - 6); ctx.lineTo(cx, y - r); ctx.stroke();
        ctx.font = '500 7px "DM Sans"'; ctx.fillStyle = '#6c7293'; ctx.textAlign = 'center';
        ctx.fillText('TRAFO', cx, y + r + 11);
        if (App.estado.modo === 'completo') {
            var kvaEl = document.getElementById('input-trafo-kva');
            var zEl = document.getElementById('input-trafo-z');
            var kva = kvaEl ? kvaEl.value : '';
            var z = zEl ? zEl.value : '';
            ctx.font = '400 7px "JetBrains Mono"'; ctx.fillStyle = '#4a5070';
            ctx.fillText(kva + 'kVA ' + z + '%Z', cx, y + r + 20);
        }
    }

    function dibujarSimboloEquipo(ctx, cx, y, tipo) {
        var s = 8;
        ctx.save();
        switch (tipo) {
            case 'icb': case 'mcb': case 'acb':
                ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.2;
                ctx.strokeRect(cx - s, y - s, s * 2, s * 2);
                ctx.beginPath(); ctx.moveTo(cx - s, y - s); ctx.lineTo(cx + s, y + s); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + s, y - s); ctx.lineTo(cx - s, y + s); ctx.stroke();
                break;
            case 'fusible':
                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.2;
                ctx.strokeRect(cx - s - 2, y - s/2, s * 2 + 4, s);
                ctx.beginPath(); ctx.moveTo(cx - 3, y - s/2); ctx.lineTo(cx + 3, y + s/2); ctx.stroke();
                break;
            case 'contactor':
                ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.arc(cx, y, s, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx - s, y - s); ctx.lineTo(cx + s, y + s); ctx.stroke();
                break;
            case 'tablero':
                ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.2;
                ctx.strokeRect(cx - s, y - s/2, s * 2, s);
                ctx.strokeRect(cx - s + 2, y - s/2 + 2, s * 2 - 4, s - 4);
                break;
            case 'cuchilla':
                ctx.strokeStyle = '#6c7293'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(cx, y - s); ctx.lineTo(cx - s, y + s/2); ctx.lineTo(cx + s, y + s/2); ctx.closePath(); ctx.stroke();
                break;
            default:
                ctx.strokeStyle = '#4a5070'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(cx, y, 4, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    // --- Funciones de verificacion (reutilizadas en diagrama y resultados) ---

    function capacidadMinima(isc) {
        for (var i = 0; i < CONSTANTES.CAPACIDADES_KA.length; i++)
            if (CONSTANTES.CAPACIDADES_KA[i] >= isc) return CONSTANTES.CAPACIDADES_KA[i];
        return 200;
    }

    function verificarEquipo(isc, capEquipo) {
        if (!capEquipo || capEquipo <= 0) return { cls: 'badge-none', icon: 'fa-minus-circle', text: 'Sin equipo' };
        if (capEquipo >= isc) {
            var pct = (isc / capEquipo * 100).toFixed(0);
            if (pct <= 90) return { cls: 'badge-ok', icon: 'fa-check', text: 'Cumple (' + pct + '%)' };
            return { cls: 'badge-warn', icon: 'fa-exclamation', text: 'Margen bajo (' + pct + '%)' };
        }
        var deficit = ((isc - capEquipo) / isc * 100).toFixed(0);
        return { cls: 'badge-danger', icon: 'fa-times-circle', text: 'NO CUMPLE (-' + deficit + '%)' };
    }

    function dibujarSimboloCapacitor(ctx, cx, y) {
        // Símbolo de banco de capacitores: rectángulo con símbolo + línea
        ctx.save();
        ctx.strokeStyle='#facc15';ctx.lineWidth=1.5;ctx.lineCap='round';
        // Rectángulo
        ctx.strokeRect(cx-14,y-12,28,24,24,1.5);
        // Línea del símbolo de onda sinusoidal
        ctx.beginPath();
        for(var i=-10;i<=10;i++){var px=cx+i,py=y+Math.sin(i*0.35)*4.5;i===-10?ctx.moveTo(px,py):ctx.lineTo(px,py);}
        ctx.stroke();
        // Línea inferior
        ctx.strokeStyle='#facc15';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(cx-16,y+12);ctx.lineTo(cx+16,y+12);ctx.stroke();
        ctx.restore();
    }

    function colorPorCorriente(isc) {
        if (isc < 10) return 'var(--green)';
        if (isc < 25) return 'var(--yellow)';
        if (isc < 50) return 'var(--amber)';
        if (isc < 85) return 'var(--orange)';
        return 'var(--red)';
    }

    return {
        dibujar: dibujar,
        capacidadMinima: capacidadMinima,
        verificarEquipo: verificarEquipo,
        colorPorCorriente: colorPorCorriente
    };
})();

if (typeof window !== 'undefined') {
    window.UIDiagrama = UIDiagrama;
}