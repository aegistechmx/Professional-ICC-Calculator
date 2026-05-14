/**
 * coordonograma.js — FASE 7
 * Curvas tiempo-corriente de protecciones en escala logaritmica con selección de curvas y detalle de puntos de cortocircuito.
 */
var UICoordonograma = (function() {

    var lastWarningTime = 0;
    var WARNING_THROTTLE_MS = 5000; // 5 segundos entre warnings

    function dibujar(puntos) {
        // Recopilar curvas de los equipos seleccionados
        var selected = [];
        for (var i = 0; i < puntos.length; i++) {
            var p = puntos[i];
            if (!p.equip || !p.equip.tipo || p.equip.modelo === '' || p.equip.modelo === null) continue;

            var modeloIdx = parseInt(p.equip.modelo || 0, 10) || 0;
            var curva = getCurvaEquipo(p.equip.tipo, modeloIdx);

            if (curva && curva.puntos && curva.puntos.length > 0) {
                var isSelected = p.equip._coordonogramaSeleccionada;
                if (isSelected === undefined) p.equip._coordonogramaSeleccionada = false; // Sin selección: mostrar todos
                if (isSelected === false) p.equip._coordonogramaSeleccionada = false;
                selected.push(curva);
            }
        }

        var section = document.getElementById('coordonograma-section');
        section.classList.remove('hidden');
        section.classList.add('fade-in');

        // Controles del coordonograma
        var controlsDiv = document.getElementById('coordonograma-controls');
        if (!controlsDiv) return;

        if (selected.length === 0) {
            var canvas = document.getElementById('coordonograma');
            var ctx = canvas.getContext('2d');
            var container = canvas.parentElement;
            var W = container.clientWidth, H = 440;
            var dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr; canvas.height = H * dpr;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.scale(dpr, dpr);
            ctx.fillStyle = '#0e1018'; ctx.fillRect(0, 0, W, H);
            ctx.font = '500 14px "DM Sans"'; ctx.fillStyle = '#4a5070'; ctx.textAlign = 'center';
            ctx.fillText('Seleccione equipos en cada punto para mostrar sus curvas', W / 2, 160);
            ctx.font = '400 11px "DM Sans"'; ctx.fillStyle = '#3a4060';
            ctx.fillText('ICB/MCCB, MCB y fusibles Square D tienen curvas predefinidas. Marque la casilla para activar el gráfico del punto.', W / 2, 190);
            return;
        }

        if (selected.length < 2) {
            var now = Date.now();
            if (now - lastWarningTime > WARNING_THROTTLE_MS) {
                UIToast.mostrar('⚠ Se requieren al menos 2 dispositivos para análisis de coordinación', 'warning');
                lastWarningTime = now;
            }
        }

        var canvas = document.getElementById('coordonograma');
        var ctx = canvas.getContext('2d');
        var container = canvas.parentElement;
        var W = container.clientWidth;
        var H = 440;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.height = H + 'px';
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#0e1018'; ctx.fillRect(0, 0, W, H);

        // Rangos
        var iMin = 10, iMax = 100000;
        var tMin = 0.01, tMax = 1000;

        function mapI(I) {
            if (I <= iMin) I = iMin;
            if (I >= iMax) I = iMax;
            return mL + (Math.log10(I) - Math.log10(iMin)) / (Math.log10(iMax) - Math.log10(iMin)) * gW;
        }
        function mapT(t) {
            if (t <= tMin) t = tMin;
            if (t >= tMax) t = tMax;
            return mT + (Math.log10(t) - Math.log10(tMin)) / (Math.log10(tMax) - Math.log10(tMin)) * gH;
        }
        function unmapI(x) {
            return Math.pow(10, Math.log10(iMin) + (x - mL) / gW * (Math.log10(iMax) - Math.log10(iMin)));
        }
        function unmapT(y) {
            return Math.pow(10, Math.log10(tMin) + (y - mT) / gH * (Math.log10(tMax) - Math.log10(tMin)));
        }

        // Margenes
        var mL = 60, mR = 20, mT = 25, mB = 55;
        var gW = W - mL - mR;
        var gH = H - mT - mB;

        // Rejillas
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.font = '400 9px "JetBrains Mono"';
        var tMarcas = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
        tMarcas.forEach(function(t) {
            var y = mapT(t);
            ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(mL + gW, y); ctx.stroke();
            ctx.fillStyle = '#3a4060'; ctx.textAlign = 'right';
            var label;
            if (t >= 1) label = t + ' s';
            else if (t >= 0.1) label = (t * 1000).toFixed(0) + ' ms';
            else label = (t * 10000).toFixed(0) + ' ms';
            ctx.fillText(label, mL - 4, y + 3);
        });

        var iMarcas = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
        iMarcas.forEach(function(i) {
            var x = mapI(i);
            ctx.beginPath(); ctx.moveTo(x, mT); ctx.lineTo(x, mT + gH); ctx.stroke();
            ctx.fillStyle = '#3a4060'; ctx.textAlign = 'center';
            var label = i >= 1000 ? (i / 1000).toFixed(0) + ' kA' : i + ' A';
            ctx.fillText(label, x, mT + gH + 12);
        });

        // Ejes
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mL, mT); ctx.lineTo(mL, mT + gH); ctx.lineTo(mL + gW, mT + gH); ctx.lineTo(mL + gW, mT);
        ctx.stroke();
        ctx.font = '600 9px "DM Sans'; ctx.fillStyle = '#6c7293'; ctx.textAlign = 'center';
        ctx.fillText('Tiempo (s)', mL + gW / 2, mT - 8);
        ctx.save();
        ctx.translate(12, mT + gH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('I (A)', 0, 0);
        ctx.restore();

        // Dibujar cada curva seleccionada
        selected.forEach(function(curva, idx) {
            var pts = (curva.puntos || []).filter(function(p) { return p.I > 0 && p.t < 9000; });
            if (pts.length < 2) return;

            var color = curva.color;
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            ctx.beginPath();
            for (var i = 0; i < pts.length; i++) {
                var x = mapI(pts[i].I);
                var y = mapT(pts[i].t);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Punto de In (si está en rango)
            var inX = mapI(curva.rango ? Math.min(curva.rango[0], curva.rango[1]) : 0);
            if (inX > mL && inX < mL + gW) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(inX, curva.rango ? mapT(5) : 0, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Línea de I disparo
            if (curva.iDisparo > 0) {
                var xDisp = mapI(curva.iDisparo);
                if (xDisp > mL && xDisp < mL + gW) {
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(xDisp, mT); ctx.lineTo(xDisp, mT + gH); ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = color;
                    ctx.font = '600 9px "JetBrains Mono"'; ctx.textAlign = 'center';
                    ctx.save();
                    ctx.translate(xDisp + 5, mT + gH + 12);
                    ctx.fillText((curva.iDisparo / 1000).toFixed(1) + ' kA', 0, 0);
                    ctx.restore();
                }
            }

            // Isc del punto como línea vertical
            var pIdx = curva.puntoIdx;
            if (pIdx !== undefined && App.estado.resultados && App.estado.resultados[pIdx]) {
                var iscPoint = App.estado.resultados[pIdx].iscConMotores;
                var xIsc = mapI(iscPoint);
                if (xIsc > mL && xIsc < mL + gW) {
                    ctx.setLineDash([6, 3]);
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(xIsc, mT); ctx.lineTo(xIsc, mT + gH); ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = '#e2e5ed';
                    ctx.font = '500 8px "JetBrains Mono"'; ctx.textAlign = 'left';
                    ctx.fillText(iscPoint.toFixed(2) + ' kA', xIsc + 5, mT + gH + 4);
                }
            }

            // Nombre de la curva
            var labelX = pts[pts.length - 1] ? mapI(pts[pts.length - 1].I) : mL;
            if (labelX > mL + 10 && labelX < mL + gW - 10) {
                ctx.font = '500 9px "DM Sans'; ctx.fillStyle = color;
                ctx.textAlign = ctx.getTransform() === 'none' ? 'center' : 'left';
                var shortName = (curva.nombre || '').split('—')[0].trim().substring(0, 28);
                var labelY = mapT(pts[Math.floor(pts.length / 2)].t) - 8;
                ctx.fillText(shortName, Math.min(labelX, mL + gW - 5), labelY);
            }
        });

        // Pie de página para PDF
        ctx.font = '400 8px "DM Sans'; ctx.fillStyle = '#4a5070'; ctx.textAlign = 'left';
        ctx.fillText('Eje vertical: Corriente I(A) — Eje horizontal: Tiempo(s)', mL + 10, mT + gH + 20);
        ctx.textAlign = 'center';
        ctx.translate(12, mT + gH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Corriente (A)', 0, 0);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.font = '400 8px "DM Sans'; ctx.fillStyle = '#4a5070';
        ctx.fillText('Tiempo (s)', mL + gW / 2, mT - 8);
    }

    return { dibujar: dibujar };
})();

if (typeof window !== 'undefined') {
    window.UICoordonograma = UICoordonograma;
}