/**
 * tcc_calibracion_ui.js — UI de Calibración Manual Asistida para Digitalización de Curvas TCC
 * Permite al usuario calibrar ejes y digitalizar curvas manualmente
 */

var TCCCalibracionUI = (function() {
    
    var estado = {
        pdf: null,
        pagina: 1,
        canvas: null,
        ctx: null,
        puntosEjeX: [],
        puntosEjeY: [],
        puntosCurva: [],
        calibracion: null,
        curvaDigitalizada: null
    };

    /**
     * Inicializar la UI de calibración
     */
    function inicializar() {
        var container = document.getElementById('tcc-calibracion-container');
        if (!container) {
            console.warn('[TCCCalibracionUI] Contenedor no encontrado');
            return;
        }

        container.innerHTML = generarHTML();
        configurarEventos();
    }

    /**
     * Generar HTML de la UI
     */
    function generarHTML() {
        return `
            <div class="card mt-4">
                <div class="card-title">
                    <i class="fas fa-crosshairs mr-2"></i>Digitalización de Curvas TCC
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <!-- Panel izquierdo: PDF -->
                    <div>
                        <div class="mb-4">
                            <label class="block text-sm font-semibold mb-2">Cargar PDF de Curva TCC</label>
                            <input type="file" id="tcc-pdf-input" accept=".pdf" class="w-full p-2 border rounded">
                        </div>
                        
                        <div class="relative border rounded bg-gray-100" style="height: 500px;">
                            <canvas id="tcc-pdf-canvas" class="w-full h-full"></canvas>
                            <div id="tcc-overlay" class="absolute inset-0 pointer-events-none"></div>
                        </div>
                        
                        <div class="mt-2 flex gap-2">
                            <button id="tcc-prev-page" class="px-3 py-1 bg-gray-200 rounded text-sm">Anterior</button>
                            <span id="tcc-page-info" class="px-3 py-1 text-sm">Página 1</span>
                            <button id="tcc-next-page" class="px-3 py-1 bg-gray-200 rounded text-sm">Siguiente</button>
                        </div>
                    </div>
                    
                    <!-- Panel derecho: Calibración -->
                    <div>
                        <div class="mb-4">
                            <h4 class="font-semibold mb-2">Calibración de Ejes</h4>
                            
                            <div class="mb-3">
                                <label class="block text-sm mb-1">Eje X (Corriente)</label>
                                <div class="text-xs text-gray-500 mb-1">Haz clic en 2 puntos del eje X</div>
                                <div id="tcc-eje-x-puntos" class="text-xs"></div>
                                <div class="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label class="text-xs">Punto 1 I (A):</label>
                                        <input type="number" id="tcc-x1-i" name="tcc-x1-i" class="w-full p-1 border rounded text-sm" placeholder="Ej: 1">
                                    </div>
                                    <div>
                                        <label class="text-xs">Punto 2 I (A):</label>
                                        <input type="number" id="tcc-x2-i" name="tcc-x2-i" class="w-full p-1 border rounded text-sm" placeholder="Ej: 10000">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="block text-sm mb-1">Eje Y (Tiempo)</label>
                                <div class="text-xs text-gray-500 mb-1">Haz clic en 2 puntos del eje Y</div>
                                <div id="tcc-eje-y-puntos" class="text-xs"></div>
                                <div class="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label class="text-xs">Punto 1 t (s):</label>
                                        <input type="number" id="tcc-y1-t" name="tcc-y1-t" class="w-full p-1 border rounded text-sm" placeholder="Ej: 10000">
                                    </div>
                                    <div>
                                        <label class="text-xs">Punto 2 t (s):</label>
                                        <input type="number" id="tcc-y2-t" name="tcc-y2-t" class="w-full p-1 border rounded text-sm" placeholder="Ej: 0.01">
                                    </div>
                                </div>
                            </div>
                            
                            <button id="tcc-calibrar" class="w-full py-2 bg-blue-500 text-white rounded text-sm font-semibold">
                                Calibrar Ejes
                            </button>
                        </div>
                        
                        <div class="mb-4">
                            <h4 class="font-semibold mb-2">Digitalización de Curva</h4>
                            <div class="text-xs text-gray-500 mb-1">Haz clic en puntos de la curva para digitalizar</div>
                            <div id="tcc-curva-puntos" class="text-xs mb-2"></div>
                            <div class="flex gap-2">
                                <button id="tcc-limpiar-curva" class="px-3 py-1 bg-gray-200 rounded text-sm">Limpiar Puntos</button>
                                <button id="tcc-digitalizar" class="px-3 py-1 bg-green-500 text-white rounded text-sm">Digitalizar</button>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h4 class="font-semibold mb-2">Datos del Breaker</h4>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-xs">Marca:</label>
                                    <input type="text" id="tcc-marca" name="tcc-marca" class="w-full p-1 border rounded text-sm" placeholder="Ej: ABB">
                                </div>
                                <div>
                                    <label class="text-xs">Modelo:</label>
                                    <input type="text" id="tcc-modelo" name="tcc-modelo" class="w-full p-1 border rounded text-sm" placeholder="Ej: Tmax T4">
                                </div>
                                <div>
                                    <label class="text-xs">Frame (A):</label>
                                    <input type="number" id="tcc-frame" name="tcc-frame" class="w-full p-1 border rounded text-sm" placeholder="Ej: 250">
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <h4 class="font-semibold mb-2">Curva Digitalizada</h4>
                            <div id="tcc-curva-resultados" class="text-xs max-h-40 overflow-y-auto bg-gray-50 p-2 rounded"></div>
                            <button id="tcc-guardar-curva" class="w-full mt-2 py-2 bg-purple-500 text-white rounded text-sm font-semibold">
                                Guardar Curva
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configurar eventos de la UI
     */
    function configurarEventos() {
        // Cargar PDF
        document.getElementById('tcc-pdf-input').addEventListener('change', cargarPDF);
        
        // Navegación de páginas
        document.getElementById('tcc-prev-page').addEventListener('click', paginaAnterior);
        document.getElementById('tcc-next-page').addEventListener('click', paginaSiguiente);
        
        // Calibración
        document.getElementById('tcc-calibrar').addEventListener('click', calibrarEjes);
        
        // Digitalización
        document.getElementById('tcc-limpiar-curva').addEventListener('click', limpiarPuntosCurva);
        document.getElementById('tcc-digitalizar').addEventListener('click', digitalizarCurva);
        document.getElementById('tcc-guardar-curva').addEventListener('click', guardarCurva);
        
        // Canvas clicks
        var canvas = document.getElementById('tcc-pdf-canvas');
        canvas.addEventListener('click', manejarClickCanvas);
    }

    /**
     * Cargar PDF
     */
    async function cargarPDF(e) {
        var file = e.target.files[0];
        if (!file) return;
        
        try {
            var arrayBuffer = await file.arrayBuffer();
            var pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            estado.pdf = pdf;
            estado.pagina = 1;
            
            renderizarPagina(estado.pagina);
            actualizarInfoPagina();
        } catch (error) {
            console.error('[TCCCalibracionUI] Error cargando PDF:', error);
            alert('Error al cargar el PDF');
        }
    }

    /**
     * Renderizar página del PDF
     */
    async function renderizarPagina(numPagina) {
        if (!estado.pdf) return;
        
        var page = await estado.pdf.getPage(numPagina);
        var canvas = document.getElementById('tcc-pdf-canvas');
        var ctx = canvas.getContext('2d');
        
        estado.canvas = canvas;
        estado.ctx = ctx;
        
        var viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
    }

    /**
     * Navegar a página anterior
     */
    function paginaAnterior() {
        if (estado.pagina > 1) {
            estado.pagina--;
            renderizarPagina(estado.pagina);
            actualizarInfoPagina();
        }
    }

    /**
     * Navegar a página siguiente
     */
    function paginaSiguiente() {
        if (estado.pdf && estado.pagina < estado.pdf.numPages) {
            estado.pagina++;
            renderizarPagina(estado.pagina);
            actualizarInfoPagina();
        }
    }

    /**
     * Actualizar información de página
     */
    function actualizarInfoPagina() {
        var info = document.getElementById('tcc-page-info');
        if (estado.pdf) {
            info.textContent = 'Página ' + estado.pagina + ' de ' + estado.pdf.numPages;
        }
    }

    /**
     * Manejar click en canvas
     */
    function manejarClickCanvas(e) {
        if (!estado.canvas) return;
        
        var rect = estado.canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        // Determinar qué tipo de punto se está agregando
        if (estado.puntosEjeX.length < 2) {
            estado.puntosEjeX.push({ x, y });
            actualizarPuntosEjeX();
        } else if (estado.puntosEjeY.length < 2) {
            estado.puntosEjeY.push({ x, y });
            actualizarPuntosEjeY();
        } else {
            estado.puntosCurva.push({ x, y });
            actualizarPuntosCurva();
        }
        
        dibujarPuntos();
    }

    /**
     * Actualizar display de puntos del eje X
     */
    function actualizarPuntosEjeX() {
        var container = document.getElementById('tcc-eje-x-puntos');
        container.innerHTML = estado.puntosEjeX.map((p, i) => 
            `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1">P${i + 1}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})</span>`
        ).join('');
    }

    /**
     * Actualizar display de puntos del eje Y
     */
    function actualizarPuntosEjeY() {
        var container = document.getElementById('tcc-eje-y-puntos');
        container.innerHTML = estado.puntosEjeY.map((p, i) => 
            `<span class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded mr-1">P${i + 1}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})</span>`
        ).join('');
    }

    /**
     * Actualizar display de puntos de la curva
     */
    function actualizarPuntosCurva() {
        var container = document.getElementById('tcc-curva-puntos');
        container.innerHTML = `Puntos: ${estado.puntosCurva.length}`;
    }

    /**
     * Dibujar puntos en el canvas
     */
    function dibujarPuntos() {
        if (!estado.ctx) return;
        
        // Redibujar PDF
        renderizarPagina(estado.pagina);
        
        // Dibujar puntos del eje X (azul)
        estado.puntosEjeX.forEach(p => {
            estado.ctx.fillStyle = 'blue';
            estado.ctx.beginPath();
            estado.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            estado.ctx.fill();
        });
        
        // Dibujar puntos del eje Y (verde)
        estado.puntosEjeY.forEach(p => {
            estado.ctx.fillStyle = 'green';
            estado.ctx.beginPath();
            estado.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            estado.ctx.fill();
        });
        
        // Dibujar puntos de la curva (rojo)
        estado.puntosCurva.forEach(p => {
            estado.ctx.fillStyle = 'red';
            estado.ctx.beginPath();
            estado.ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
            estado.ctx.fill();
        });
    }

    /**
     * Calibrar ejes
     */
    function calibrarEjes() {
        if (estado.puntosEjeX.length !== 2 || estado.puntosEjeY.length !== 2) {
            alert('Debes seleccionar 2 puntos en cada eje');
            return;
        }
        
        var x1I = parseFloat(document.getElementById('tcc-x1-i').value);
        var x2I = parseFloat(document.getElementById('tcc-x2-i').value);
        var y1T = parseFloat(document.getElementById('tcc-y1-t').value);
        var y2T = parseFloat(document.getElementById('tcc-y2-t').value);
        
        if (!x1I || !x2I || !y1T || !y2T) {
            alert('Debes ingresar los valores de calibración');
            return;
        }
        
        estado.calibracion = {
            x1: estado.puntosEjeX[0].x,
            y1: estado.puntosEjeX[0].y,
            x2: estado.puntosEjeX[1].x,
            y2: estado.puntosEjeX[1].y,
            I1: x1I,
            I2: x2I,
            t1: y1T,
            t2: y2T
        };
        
        console.log('[TCCCalibracionUI] Calibración:', estado.calibracion);
        alert('Ejes calibrados correctamente');
    }

    /**
     * Limpiar puntos de la curva
     */
    function limpiarPuntosCurva() {
        estado.puntosCurva = [];
        actualizarPuntosCurva();
        dibujarPuntos();
    }

    /**
     * Digitalizar curva
     */
    async function digitalizarCurva() {
        if (!estado.calibracion) {
            alert('Debes calibrar los ejes primero');
            return;
        }
        
        if (estado.puntosCurva.length < 2) {
            alert('Debes seleccionar al menos 2 puntos de la curva');
            return;
        }
        
        if (typeof TCCDigitalizer === 'undefined') {
            alert('Módulo TCCDigitalizer no disponible');
            return;
        }
        
        var marca = document.getElementById('tcc-marca').value || 'Desconocido';
        var modelo = document.getElementById('tcc-modelo').value || 'Desconocido';
        var frame = parseFloat(document.getElementById('tcc-frame').value) || 0;
        
        var opciones = {
            calibracion: estado.calibracion,
            puntosManuales: estado.puntosCurva,
            marca: marca,
            modelo: modelo,
            frame: frame
        };
        
        try {
            var resultado = await TCCDigitalizer.digitalizarPDF(estado.pdf, opciones);
            estado.curvaDigitalizada = resultado;
            
            mostrarResultados(resultado);
        } catch (error) {
            console.error('[TCCCalibracionUI] Error digitalizando:', error);
            alert('Error al digitalizar la curva');
        }
    }

    /**
     * Mostrar resultados de digitalización
     */
    function mostrarResultados(resultado) {
        var container = document.getElementById('tcc-curva-resultados');
        
        if (!resultado.curva || resultado.curva.length === 0) {
            container.innerHTML = '<div class="text-red-500">No se pudo digitalizar la curva</div>';
            return;
        }
        
        var html = '<div class="font-semibold mb-1">Puntos I-t:</div>';
        html += '<table class="w-full text-xs">';
        html += '<tr><th class="text-left">I (A)</th><th class="text-left">t (s)</th></tr>';
        
        resultado.curva.forEach(p => {
            html += `<tr><td>${p.I.toFixed(2)}</td><td>${p.t.toFixed(4)}</td></tr>`;
        });
        
        html += '</table>';
        html += `<div class="mt-2 ${resultado.valida ? 'text-green-600' : 'text-red-600'}">`;
        html += resultado.valida ? 'Curva válida' : 'Curva inválida';
        html += '</div>';
        
        container.innerHTML = html;
    }

    /**
     * Guardar curva
     */
    function guardarCurva() {
        if (!estado.curvaDigitalizada || !estado.curvaDigitalizada.valida) {
            alert('No hay una curva válida para guardar');
            return;
        }
        
        // TODO: Implementar guardado en base de datos o local storage
        console.log('[TCCCalibracionUI] Guardando curva:', estado.curvaDigitalizada);
        alert('Curva guardada (implementación pendiente)');
    }

    return {
        inicializar: inicializar,
        cargarPDF: cargarPDF,
        calibrarEjes: calibrarEjes,
        digitalizarCurva: digitalizarCurva
    };
})();

if (typeof window !== 'undefined') {
    window.TCCCalibracionUI = TCCCalibracionUI;
    console.log('[TCCCalibracionUI] Módulo cargado correctamente');
}
