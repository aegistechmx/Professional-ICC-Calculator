/**
 * curvas.js
 * Gestión de la interfaz para curvas tiempo-corriente.
 * Renderizado de gráficos y manejo de interacciones.
 */
var UICurvas = (function() {

    var canvas = null;
    var ctx = null;
    var curvasActivas = [];
    var escala = { x: 1, y: 1 };
    var offset = { x: 0, y: 0 };
    var colores = {
        termomagnetico: '#3498db',
        fusible: '#e74c3c',
        releTermico: '#27ae60',
        danioConductor: '#f39c12',
        seguridadPersona: '#9b59b6'
    };

    /**
     * Inicializa el canvas de curvas
     */
    function init() {
        canvas = document.getElementById('curvas-canvas');
        if (!canvas) return false;
        
        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        // Event listeners
        canvas.addEventListener('wheel', handleZoom);
        canvas.addEventListener('mousedown', handlePan);
        canvas.addEventListener('mousemove', handlePanMove);
        canvas.addEventListener('mouseup', handlePanEnd);
        
        window.addEventListener('resize', resizeCanvas);
        
        return true;
    }

    /**
     * Redimensiona el canvas
     */
    function resizeCanvas() {
        if (!canvas) return;
        
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        dibujar();
    }

    /**
     * Maneja el zoom con la rueda del mouse
     */
    function handleZoom(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Zoom centrado en el mouse
        offset.x = x - (x - offset.x) * delta;
        offset.y = y - (y - offset.y) * delta;
        escala.x *= delta;
        escala.y *= delta;
        
        // Limitar zoom
        escala.x = Math.max(0.1, Math.min(10, escala.x));
        escala.y = Math.max(0.1, Math.min(10, escala.y));
        
        dibujar();
    }

    /**
     * Maneja el pan (desplazamiento)
     */
    function handlePan(e) {
        if (!canvas) return;
        
        canvas.isPanning = true;
        canvas.panStart = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
        
        canvas.style.cursor = 'grabbing';
    }

    function handlePanMove(e) {
        if (!canvas.isPanning) return;
        
        offset.x = e.clientX - canvas.panStart.x;
        offset.y = e.clientY - canvas.panStart.y;
        
        dibujar();
    }

    function handlePanEnd() {
        canvas.isPanning = false;
        canvas.style.cursor = 'grab';
    }

    /**
     * Convierte coordenadas de mundo a pantalla
     */
    function mundoAPantalla(x, y) {
        return {
            x: x * escala.x + offset.x,
            y: canvas.height - (y * escala.y + offset.y)
        };
    }

    /**
     * Convierte coordenadas de pantalla a mundo
     */
    function pantallaAMundo(x, y) {
        return {
            x: (x - offset.x) / escala.x,
            y: (canvas.height - y - offset.y) / escala.y
        };
    }

    /**
     * Dibuja todo el canvas
     */
    function dibujar() {
        if (!ctx || !canvas) return;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fondo
        ctx.fillStyle = '#0a0c12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid
        dibujarGrid();
        
        // Ejes
        dibujarEjes();
        
        // Curvas
        curvasActivas.forEach(curva => {
            dibujarCurva(curva);
        });
        
        // Leyenda
        dibujarLeyenda();
    }

    /**
     * Dibuja la cuadrícula logarítmica
     */
    function dibujarGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        
        // Líneas verticales (corriente - logarítmico)
        for (let x = 0.1; x <= 10000; x *= 10) {
            const pantalla = mundoAPantalla(Math.log10(x), 0);
            ctx.beginPath();
            ctx.moveTo(pantalla.x, 0);
            ctx.lineTo(pantalla.x, canvas.height);
            ctx.stroke();
            
            // Subdivisiones
            for (let i = 2; i <= 9; i++) {
                const subX = x * i;
                if (subX <= 10000) {
                    const subPantalla = mundoAPantalla(Math.log10(subX), 0);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
                    ctx.beginPath();
                    ctx.moveTo(subPantalla.x, 0);
                    ctx.lineTo(subPantalla.x, canvas.height);
                    ctx.stroke();
                }
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        }
        
        // Líneas horizontales (tiempo - logarítmico)
        for (let y = 0.001; y <= 10000; y *= 10) {
            const pantalla = mundoAPantalla(0, Math.log10(y));
            ctx.beginPath();
            ctx.moveTo(0, pantalla.y);
            ctx.lineTo(canvas.width, pantalla.y);
            ctx.stroke();
            
            // Subdivisiones
            for (let i = 2; i <= 9; i++) {
                const subY = y * i;
                if (subY <= 10000) {
                    const subPantalla = mundoAPantalla(0, Math.log10(subY));
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
                    ctx.beginPath();
                    ctx.moveTo(0, subPantalla.y);
                    ctx.lineTo(canvas.width, subPantalla.y);
                    ctx.stroke();
                }
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        }
    }

    /**
     * Dibuja los ejes coordenados
     */
    function dibujarEjes() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        // Eje X (corriente)
        const ejeX = mundoAPantalla(-1, 0);
        ctx.beginPath();
        ctx.moveTo(0, ejeX.y);
        ctx.lineTo(canvas.width, ejeX.y);
        ctx.stroke();
        
        // Eje Y (tiempo)
        const ejeY = mundoAPantalla(0, -3);
        ctx.beginPath();
        ctx.moveTo(ejeY.x, 0);
        ctx.lineTo(ejeY.x, canvas.height);
        ctx.stroke();
        
        // Etiquetas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Etiquetas del eje X
        for (let x = 0.1; x <= 10000; x *= 10) {
            const pantalla = mundoAPantalla(Math.log10(x), 0);
            ctx.fillText(x + 'A', pantalla.x, canvas.height - 10);
        }
        
        // Etiquetas del eje Y
        ctx.textAlign = 'right';
        for (let y = 0.001; y <= 10000; y *= 10) {
            const pantalla = mundoAPantalla(0, Math.log10(y));
            const etiqueta = y < 1 ? (y * 1000) + 'ms' : y + 's';
            ctx.fillText(etiqueta, 30, pantalla.y + 4);
        }
        
        // Títulos
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('Corriente (A)', canvas.width / 2, canvas.height - 5);
        
        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Tiempo', 0, 0);
        ctx.restore();
    }

    /**
     * Dibuja una curva individual
     */
    function dibujarCurva(curva) {
        if (!curva.puntos || curva.puntos.length < 2) return;
        
        ctx.strokeStyle = curva.color || colores[curva.tipo] || '#ffffff';
        ctx.lineWidth = curva.ancho || 2;
        ctx.beginPath();
        
        let primerPunto = true;
        (curva.puntos || []).forEach(punto => {
            if (punto.y === Infinity) return;
            
            const pantalla = mundoAPantalla(Math.log10(punto.x), Math.log10(punto.y));
            
            if (primerPunto) {
                ctx.moveTo(pantalla.x, pantalla.y);
                primerPunto = false;
            } else {
                ctx.lineTo(pantalla.x, pantalla.y);
            }
        });
        
        ctx.stroke();
        
        // Dibujar puntos si está habilitado
        if (curva.mostrarPuntos) {
            ctx.fillStyle = curva.color || colores[curva.tipo] || '#ffffff';
            (curva.puntos || []).forEach(punto => {
                if (punto.y === Infinity) return;
                
                const pantalla = mundoAPantalla(Math.log10(punto.x), Math.log10(punto.y));
                ctx.beginPath();
                ctx.arc(pantalla.x, pantalla.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    /**
     * Dibuja la leyenda
     */
    function dibujarLeyenda() {
        if (curvasActivas.length === 0) return;
        
        const x = canvas.width - 200;
        const y = 20;
        const altoLinea = 25;
        
        // Fondo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 10, 190, curvasActivas.length * altoLinea + 20);
        
        // Borde
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 10, y - 10, 190, curvasActivas.length * altoLinea + 20);
        
        // Curvas
        curvasActivas.forEach((curva, i) => {
            const yPos = y + i * altoLinea;
            
            // Línea de color
            ctx.strokeStyle = curva.color || colores[curva.tipo] || '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, yPos);
            ctx.lineTo(x + 30, yPos);
            ctx.stroke();
            
            // Texto
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(curva.nombre || curva.tipo, x + 40, yPos + 4);
        });
    }

    /**
     * Agrega una curva termomagnética
     */
    function agregarCurvaTermomagnetico(nominal, tipo, nombre) {
        const puntos = Curvas.generarPuntosCurva(
            Curvas.curvaTermomagnetico,
            nominal * 1.1,
            nominal * 20,
            100,
            [nominal, tipo]
        );
        
        curvasActivas.push({
            tipo: 'termomagnetico',
            nombre: nombre || `MCB ${nominal}A ${tipo}`,
            puntos: puntos,
            color: colores.termomagnetico,
            datos: { nominal, tipo }
        });
        
        dibujar();
    }

    /**
     * Agrega una curva de fusible
     */
    function agregarCurvaFusible(nominal, clase, nombre) {
        const puntos = Curvas.generarPuntosCurva(
            Curvas.curvaFusible,
            nominal * 1.1,
            nominal * 50,
            100,
            [nominal, clase]
        );
        
        curvasActivas.push({
            tipo: 'fusible',
            nombre: nombre || `Fusible ${nominal}A ${clase}`,
            puntos: puntos,
            color: colores.fusible,
            datos: { nominal, clase }
        });
        
        dibujar();
    }

    /**
     * Agrega una curva de relé térmico
     */
    function agregarCurvaReleTermico(ajuste, curva, nombre) {
        const puntos = Curvas.generarPuntosCurva(
            Curvas.curvaReleTermico,
            ajuste * 1.1,
            ajuste * 10,
            100,
            [ajuste, curva]
        );
        
        curvasActivas.push({
            tipo: 'releTermico',
            nombre: nombre || `Relé ${ajuste}A ${curva}`,
            puntos: puntos,
            color: colores.releTermico,
            datos: { ajuste, curva }
        });
        
        dibujar();
    }

    /**
     * Agrega curva de daño de conductor
     */
    function agregarCurvaDanioConductor(area, material, nombre) {
        const puntos = Curvas.generarPuntosCurva(
            Curvas.curvaDanioConductor,
            100,
            50000,
            100,
            [area, material]
        );
        
        curvasActivas.push({
            tipo: 'danioConductor',
            nombre: nombre || `Conductor ${area}mm² ${material}`,
            puntos: puntos,
            color: colores.danioConductor,
            datos: { area, material }
        });
        
        dibujar();
    }

    /**
     * Limpia todas las curvas
     */
    function limpiarCurvas() {
        curvasActivas = [];
        dibujar();
    }

    /**
     * Elimina una curva específica
     */
    function eliminarCurva(indice) {
        curvasActivas.splice(indice, 1);
        dibujar();
    }

    /**
     * Exporta el gráfico como imagen
     */
    function exportarImagen() {
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'curvas_tiempo_corriente.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    /**
     * Verifica coordinación entre curvas activas
     */
    function verificarCoordinacionActiva() {
        if (curvasActivas.length < 2) return null;
        
        const resultados = [];
        
        for (let i = 0; i < curvasActivas.length - 1; i++) {
            for (let j = i + 1; j < curvasActivas.length; j++) {
                const curva1 = curvasActivas[i];
                const curva2 = curvasActivas[j];
                
                if (curva1.tipo === 'termomagnetico' && curva2.tipo === 'termomagnetico') {
                    const resultado = Curvas.verificarCoordinacion(
                        curva1.datos,
                        curva2.datos,
                        Math.max(curva1.datos.nominal, curva2.datos.nominal) * 20
                    );
                    
                    resultados.push({
                        dispositivo1: curva1.nombre,
                        dispositivo2: curva2.nombre,
                        coordinada: resultado.coordinada,
                        problema: resultado.problema,
                        margenMinimo: resultado.margenMinimo
                    });
                }
            }
        }
        
        return resultados;
    }

    /**
     * Genera reporte de coordinación
     */
    function generarReporteCoordinacion() {
        const resultados = verificarCoordinacionActiva();
        if (!resultados || resultados.length === 0) return;
        
        let html = '<div class="reporte-coordinacion">';
        html += '<h3>Reporte de Coordinación</h3>';
        
        resultados.forEach(resultado => {
            html += '<div class="resultado-coordinacion">';
            html += `<h4>${resultado.dispositivo1} vs ${resultado.dispositivo2}</h4>`;
            
            if (resultado.coordinada) {
                html += '<div class="coordinacion-ok">Coordinación OK</div>';
                html += `<p>Margen mínimo: ${resultado.margenMinimo.toFixed(2)}x</p>`;
            } else {
                html += '<div class="coordinacion-error">Falta de coordinación</div>';
                if (resultado.problema) {
                    html += `<p>${resultado.problema.mensaje}</p>`;
                    html += `<p>Corriente problemática: ${resultado.problema.corriente.toFixed(1)}A</p>`;
                }
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        
        return html;
    }

    // API pública
    return {
        init: init,
        dibujar: dibujar,
        agregarCurvaTermomagnetico: agregarCurvaTermomagnetico,
        agregarCurvaFusible: agregarCurvaFusible,
        agregarCurvaReleTermico: agregarCurvaReleTermico,
        agregarCurvaDanioConductor: agregarCurvaDanioConductor,
        limpiarCurvas: limpiarCurvas,
        eliminarCurva: eliminarCurva,
        exportarImagen: exportarImagen,
        verificarCoordinacionActiva: verificarCoordinacionActiva,
        generarReporteCoordinacion: generarReporteCoordinacion
    };
})();

if (typeof window !== 'undefined') {
    window.UICurvas = UICurvas;
}
