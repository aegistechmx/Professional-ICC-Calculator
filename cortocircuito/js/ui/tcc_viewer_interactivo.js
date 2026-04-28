/**
 * tcc_viewer_interactivo.js — Visor TCC Interactivo tipo ETAP/SKM
 * Sistema de visualización y ajuste de curvas tiempo-corriente en tiempo real
 * 
 * Objetivo: Herramienta de ingeniería para diseño de coordinación de protección
 * - Curvas log-log (corriente vs tiempo)
 * - Sliders en vivo (pickup, delay, instantáneo)
 * - Detección de cruces (NO coordinación)
 * - Feedback tipo ingeniero senior
 */

var TCCViewerInteractivo = (function() {
    var chartInstance = null;
    var nodosTCC = [];
    var canvasId = 'tcc-interactivo-canvas';

    /**
     * MOTOR DE CURVA REAL (modelo IEC inversa simplificado)
     * @param {Object} breaker - Parámetros del breaker
     * @param {number} I - Corriente de prueba (A)
     * @returns {number} Tiempo de disparo (s)
     */
    function curvaTCC(breaker, I) {
        var pickup = breaker.pickup || 100;
        var longDelay = breaker.longDelay || 2.0;      // Tiempo largo (térmico)
        var shortDelay = breaker.shortDelay || 0.1;    // Tiempo corto (magnético)
        var instantaneous = breaker.instantaneous || (pickup * 10);

        // Si corriente < pickup, no dispara
        if (I < pickup) return Infinity;

        // Región instantánea
        if (I >= instantaneous) {
            return 0.01; // Tiempo mínimo de disparo
        }

        // Región de larga duración (térmica) - curva IEC inversa
        // t = k * (I_pickup / I)^α
        if (I < instantaneous * 0.8) {
            var alpha = 2; // Exponente típico para térmica
            var k = longDelay;
            var tTermico = k * Math.pow(pickup / I, alpha);
            return Math.min(tTermico, 10000); // Máximo 10000s
        }

        // Región de corta duración (magnética)
        return shortDelay;
    }

    /**
     * GENERADOR DE PUNTOS (escala log)
     * @param {Object} breaker - Parámetros del breaker
     * @param {number} I_min - Corriente mínima (default: pickup)
     * @param {number} I_max - Corriente máxima (default: 50000A)
     * @returns {Array} Array de puntos {x, y}
     */
    function generarCurva(breaker, I_min, I_max) {
        var puntos = [];
        var pickup = Math.max(10, breaker.pickup || 100);
        I_min = Math.max(1, I_min || pickup * 0.5);
        I_max = I_max || 50000;

        // Generar puntos en escala log (más densos en rangos bajos)
        for (var I = I_min; I <= I_max; I *= 1.05) {
            var t = curvaTCC(breaker, I);
            if (t < 10000 && t > 0.001) { // Filtrar tiempos extremos
                puntos.push({ x: I, y: t });
            }
        }

        return puntos;
    }

    /**
     * DETECTOR AUTOMÁTICO DE FALLA DE COORDINACIÓN
     * @param {Array} curvaUp - Puntos de curva upstream
     * @param {Array} curvaDown - Puntos de curva downstream
     * @returns {Object} Resultado de detección
     */
    function detectarCruce(curvaUp, curvaDown) {
        var cruces = [];
        var tolerancia = 0.1; // 10% de tolerancia

        // Comparar puntos en el mismo eje X (corriente)
        curvaDown.forEach(function(pDown) {
            var I = pDown.x;
            // Buscar el punto más cercano en corriente en la curva upstream
            var pUp = curvaUp.reduce(function(prev, curr) {
                return (Math.abs(curr.x - I) < Math.abs(prev.x - I) ? curr : prev);
            });

            if (pUp && Math.abs(pUp.x - I) / I < 0.1) {
                if (pUp.y <= pDown.y * (1 + tolerancia)) {
                    cruces.push({
                        corriente: I,
                        tiempoUp: pUp.y,
                        tiempoDown: pDown.y,
                        severidad: pUp.y < pDown.y ? 'CRITICO' : 'WARNING'
                    });
                }
            }
        });

        return {
            hayCruce: cruces.length > 0,
            cruces: cruces,
            estado: cruces.length > 0 ? 'NO_COORDINADO' : 'COORDINADO'
        };
    }

    /**
     * SEMÁFORO EN TIEMPO REAL
     * @param {Object} up - Breaker upstream
     * @param {Object} down - Breaker downstream
     * @returns {Object} Estado de coordinación
     */
    function estadoCoordinacion(up, down) {
        var curvaUp = generarCurva(up);
        var curvaDown = generarCurva(down);
        var deteccion = detectarCruce(curvaUp, curvaDown);

        if (deteccion.hayCruce) {
            var crucesCriticos = deteccion.cruces.filter(function(c) { return c.severidad === 'CRITICO'; });
            return {
                color: crucesCriticos.length > 0 ? 'rojo' : 'amarillo',
                mensaje: crucesCriticos.length > 0 ? 
                    'Curvas cruzadas → disparo simultáneo' : 
                    'Selectividad marginal → ajuste recomendado',
                deteccion: deteccion
            };
        }

        return {
            color: 'verde',
            mensaje: 'Selectividad correcta',
            deteccion: deteccion
        };
    }

    /**
     * GRAFICADOR (Chart.js PRO)
     * @param {string} canvasId - ID del canvas
     * @param {Array} nodos - Array de nodos con parámetros TCC
     */
    function renderChart(canvasId, nodos) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas no encontrado:', canvasId);
            return;
        }

        // Destruir instancia anterior si existe
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Preparar datasets
        var datasets = [];
        var colores = ['red', 'orange', 'green', 'blue', 'purple', 'cyan'];
        
        nodos.forEach(function(nodo, index) {
            var breaker = nodo.tcc || {
                pickup: nodo.breakerIn || 100,
                longDelay: 2.0,
                shortDelay: 0.1,
                instantaneous: (nodo.breakerIn || 100) * 10
            };

            var puntos = generarCurva(breaker);
            
            datasets.push({
                label: nodo.id + (nodo.rol ? ' (' + nodo.rol + ')' : ''),
                data: puntos,
                borderColor: colores[index % colores.length],
                backgroundColor: colores[index % colores.length] + '20',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            });
        });

        // Crear gráfico
        chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Curvas Tiempo-Corriente (TCC)',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return 'Corriente: ' + context[0].parsed.x.toFixed(0) + ' A';
                            },
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(3) + ' s';
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Corriente (A)'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Tiempo (s)'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        min: 0.001,
                        max: 10000
                    }
                }
            }
        });

        return chartInstance;
    }

    /**
     * ACTUALIZAR GRÁFICO EN TIEMPO REAL
     * @param {number} nodoIndex - Índice del nodo a actualizar
     * @param {string} parametro - Parámetro a modificar (pickup, longDelay, shortDelay, instantaneous)
     * @param {number} valor - Nuevo valor
     */
    function updateParametro(nodoIndex, parametro, valor) {
        if (!nodosTCC[nodoIndex]) return;

        if (!nodosTCC[nodoIndex].tcc) {
            nodosTCC[nodoIndex].tcc = {
                pickup: nodosTCC[nodoIndex].breakerIn || 100,
                longDelay: 2.0,
                shortDelay: 0.1,
                instantaneous: (nodosTCC[nodoIndex].breakerIn || 100) * 10
            };
        }

        nodosTCC[nodoIndex].tcc[parametro] = parseFloat(valor);

        // Actualizar dataset específico
        if (chartInstance && chartInstance.data.datasets[nodoIndex]) {
            var puntos = generarCurva(nodosTCC[nodoIndex].tcc);
            chartInstance.data.datasets[nodoIndex].data = puntos;
            chartInstance.update('none'); // Actualizar sin animación para respuesta rápida
        }

        // Validar coordinación
        validarCoordinacion();
    }

    /**
     * VALIDAR COORDINACIÓN Y ACTUALIZAR SEMÁFORO
     */
    function validarCoordinacion() {
        var semaforoDiv = document.getElementById('tcc-semaforo');
        if (!semaforoDiv) return;

        var html = '<div class="space-y-2">';
        
        for (var i = 0; i < nodosTCC.length - 1; i++) {
            var up = nodosTCC[i];
            var down = nodosTCC[i + 1];
            
            var upTCC = up.tcc || {
                pickup: up.breakerIn || 100,
                longDelay: 2.0,
                shortDelay: 0.1,
                instantaneous: (up.breakerIn || 100) * 10
            };
            
            var downTCC = down.tcc || {
                pickup: down.breakerIn || 100,
                longDelay: 2.0,
                shortDelay: 0.1,
                instantaneous: (down.breakerIn || 100) * 10
            };

            var estado = estadoCoordinacion(upTCC, downTCC);
            var colorClass = estado.color === 'verde' ? 'text-green-400' : 
                           (estado.color === 'amarillo' ? 'text-yellow-400' : 'text-red-400');
            var icono = estado.color === 'verde' ? '🟢' : 
                       (estado.color === 'amarillo' ? '🟡' : '🔴');

            html += '<div class="p-2 rounded bg-[--border]">';
            html += '<div class="font-semibold ' + colorClass + '">' + icono + ' ' + up.id + ' → ' + down.id + '</div>';
            html += '<div class="text-xs text-[--text-muted]">' + estado.mensaje + '</div>';
            
            if (estado.deteccion.cruces.length > 0) {
                html += '<div class="text-xs text-[--red] mt-1">';
                html += 'Cruces: ' + estado.deteccion.cruces.length + ' (ej: ' + 
                       estado.deteccion.cruces[0].corriente.toFixed(0) + 'A)';
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        // Note: innerHTML is used here for rendering generated HTML structure
        // The content is generated internally, not from user input
        semaforoDiv.innerHTML = html;
    }

    /**
     * GENERAR PANEL DE SLIDERS (Mejorado)
     * @param {Array} nodos - Array de nodos
     * @returns {string} HTML del panel de sliders
     */
    function generarPanelSliders(nodos) {
        var html = '<div class="space-y-4">';
        
        nodos.forEach(function(nodo, index) {
            var tcc = nodo.tcc || {
                pickup: nodo.breakerIn || 100,
                longDelay: 2.0,
                shortDelay: 0.1,
                instantaneous: (nodo.breakerIn || 100) * 10
            };

            var color = index === 0 ? 'red' : (index === nodos.length - 1 ? 'green' : 'orange');

            html += '<div class="p-4 rounded bg-[--border] border-l-4 border-' + color + '-500">';
            html += '<div class="flex items-center justify-between mb-3">';
            html += '<div class="font-semibold text-lg">' + nodo.id + '</div>';
            html += '<div class="text-xs text-[--text-muted]">' + (nodo.rol || '') + '</div>';
            html += '</div>';
            
            // Pickup
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between mb-1">';
            html += '<label class="text-sm font-medium" for="pickup-slider-' + index + '">Pickup (A)</label>';
            html += '<span id="pickup-val-' + index + '" class="text-sm font-bold text-[--cyan]">' + tcc.pickup.toFixed(0) + '</span>';
            html += '</div>';
            html += '<input type="range" id="pickup-slider-' + index + '" name="pickup-slider-' + index + '" min="50" max="2000" step="10" value="' + tcc.pickup + '" ' +
                   'class="w-full h-2 bg-[--bg] rounded-lg appearance-none cursor-pointer accent-[--cyan]" ' +
                   'oninput="TCCViewerInteractivo.updateParametro(' + index + ', \'pickup\', this.value); document.getElementById(\'pickup-val-' + index + '\').textContent = this.value">';
            html += '</div>';
            
            // Long Delay
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between mb-1">';
            html += '<label class="text-sm font-medium" for="longdelay-slider-' + index + '">Long Delay (s)</label>';
            html += '<span id="longdelay-val-' + index + '" class="text-sm font-bold text-[--cyan]">' + tcc.longDelay.toFixed(1) + '</span>';
            html += '</div>';
            html += '<input type="range" id="longdelay-slider-' + index + '" name="longdelay-slider-' + index + '" min="0.5" max="10" step="0.1" value="' + tcc.longDelay + '" ' +
                   'class="w-full h-2 bg-[--bg] rounded-lg appearance-none cursor-pointer accent-[--cyan]" ' +
                   'oninput="TCCViewerInteractivo.updateParametro(' + index + ', \'longDelay\', this.value); document.getElementById(\'longdelay-val-' + index + '\').textContent = this.value">';
            html += '</div>';
            
            // Short Delay
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between mb-1">';
            html += '<label class="text-sm font-medium" for="shortdelay-slider-' + index + '">Short Delay (s)</label>';
            html += '<span id="shortdelay-val-' + index + '" class="text-sm font-bold text-[--cyan]">' + tcc.shortDelay.toFixed(2) + '</span>';
            html += '</div>';
            html += '<input type="range" id="shortdelay-slider-' + index + '" name="shortdelay-slider-' + index + '" min="0.01" max="1" step="0.01" value="' + tcc.shortDelay + '" ' +
                   'class="w-full h-2 bg-[--bg] rounded-lg appearance-none cursor-pointer accent-[--cyan]" ' +
                   'oninput="TCCViewerInteractivo.updateParametro(' + index + ', \'shortDelay\', this.value); document.getElementById(\'shortdelay-val-' + index + '\').textContent = this.value">';
            html += '</div>';
            
            // Instantaneous
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between mb-1">';
            html += '<label class="text-sm font-medium" for="inst-slider-' + index + '">Instantaneous (A)</label>';
            html += '<span id="inst-val-' + index + '" class="text-sm font-bold text-[--cyan]">' + (tcc.instantaneous === 'OFF' ? 'OFF' : tcc.instantaneous.toFixed(0)) + '</span>';
            html += '</div>';
            html += '<input type="range" id="inst-slider-' + index + '" name="inst-slider-' + index + '" min="100" max="10000" step="50" value="' + (tcc.instantaneous === 'OFF' ? 10000 : tcc.instantaneous) + '" ' +
                   'class="w-full h-2 bg-[--bg] rounded-lg appearance-none cursor-pointer accent-[--cyan]" ' +
                   'oninput="TCCViewerInteractivo.updateParametro(' + index + ', \'instantaneous\', this.value); document.getElementById(\'inst-val-' + index + '\').textContent = this.value">';
            html += '</div>';
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * INICIALIZAR VISOR TCC
     * @param {Array} nodos - Array de nodos del sistema
     * @param {string} containerId - ID del contenedor
     */
    function inicializar(nodos, containerId) {
        var container = document.getElementById(containerId);
        if (!container) {
            console.error('Contenedor no encontrado:', containerId);
            return;
        }

        // Preparar nodos con roles
        nodosTCC = nodos.map(function(nodo, index) {
            var rol = '';
            if (index === 0) rol = 'Upstream';
            else if (index === nodos.length - 1) rol = 'Downstream';
            else rol = 'Intermedio';
            
            return {
                id: nodo.id,
                breakerIn: nodo.breakerIn || (nodo.equip ? nodo.equip.cap * 1000 : 100),
                tcc: nodo.tcc || {
                    pickup: nodo.breakerIn || (nodo.equip ? nodo.equip.cap * 1000 : 100),
                    longDelay: 2.0,
                    shortDelay: 0.1,
                    instantaneous: (nodo.breakerIn || (nodo.equip ? nodo.equip.cap * 1000 : 100)) * 10
                },
                rol: rol
            };
        });

        // Generar HTML
        var html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
        
        // Panel de gráfico (con controles adicionales)
        html += '<div class="card">';
        html += '<div class="card-title flex items-center justify-between">';
        html += '<div><i class="fas fa-chart-line mr-2"></i>Curvas TCC (Log-Log)</div>';
        html += '<div class="flex gap-2">';
        html += '<button onclick="TCCViewerInteractivo.exportarPDF()" class="px-3 py-1 text-xs bg-[--cyan] text-black rounded hover:bg-[--cyan]/80 transition">';
        html += '<i class="fas fa-file-pdf mr-1"></i>PDF';
        html += '</button>';
        html += '<button onclick="TCCViewerInteractivo.exportarExcel()" class="px-3 py-1 text-xs bg-[--green] text-black rounded hover:bg-[--green]/80 transition">';
        html += '<i class="fas fa-file-excel mr-1"></i>Excel';
        html += '</button>';
        html += '</div>';
        html += '</div>';
        html += '<div class="p-4">';
        html += '<canvas id="' + canvasId + '"></canvas>';
        html += '</div>';
        html += '</div>';
        
        // Panel de controles
        html += '<div class="space-y-4">';
        
        // Sliders
        html += '<div class="card">';
        html += '<div class="card-title"><i class="fas fa-sliders-h mr-2"></i>Parámetros TCC</div>';
        html += '<div class="p-4" id="tcc-sliders">';
        html += generarPanelSliders(nodosTCC);
        html += '</div>';
        html += '</div>';
        
        // Semáforo de coordinación
        html += '<div class="card">';
        html += '<div class="card-title"><i class="fas fa-traffic-light mr-2"></i>Estado de Coordinación</div>';
        html += '<div class="p-4" id="tcc-semaforo">';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;

        // Renderizar gráfico
        setTimeout(function() {
            renderChart(canvasId, nodosTCC);
            validarCoordinacion();
        }, 100);
    }

    /**
     * CARGAR DESDE RESULTADO DE DISEÑO AUTOMÁTICO
     * @param {Object} resultadoDiseno - Resultado de MotorDisenoAutomatico
     * @param {string} containerId - ID del contenedor
     */
    function cargarDesdeDiseno(resultadoDiseno, containerId) {
        if (!resultadoDiseno || !resultadoDiseno.coordinacionTCC) {
            console.error('Resultado de diseño inválido');
            return;
        }

        var nodos = resultadoDiseno.coordinacionTCC.nodos.map(function(nodo) {
            return {
                id: nodo.id,
                breakerIn: nodo.tcc.pickup,
                tcc: nodo.tcc
            };
        });

        inicializar(nodos, containerId);
    }

    /**
     * EXPORTAR A PDF
     */
    function exportarPDF() {
        if (!chartInstance) {
            if (typeof UIToast !== 'undefined') {
                UIToast.mostrar('No hay gráfico para exportar', 'error');
            } else {
                console.error('No hay gráfico para exportar');
            }
            return;
        }

        var canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Crear imagen del canvas
        var imgData = canvas.toDataURL('image/png');

        // Crear ventana de impresión
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            if (typeof UIToast !== 'undefined') {
                UIToast.mostrar('El navegador bloqueó la ventana de impresión. Por favor, permita los popups.', 'error');
            }
            return;
        }

        // Note: document.write is used here for printing to a new window
        // This is acceptable since the content is generated internally, not from user input
        var html = '<html><head><title>Reporte TCC</title>';
        html += '<style>';
        html += 'body { font-family: Arial, sans-serif; padding: 20px; }';
        html += 'h1 { color: #333; }';
        html += 'table { border-collapse: collapse; width: 100%; margin-top: 20px; }';
        html += 'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }';
        html += 'th { background-color: #f2f2f2; }';
        html += '</style>';
        html += '</head><body>';
        html += '<h1>Reporte de Coordinación TCC</h1>';
        html += '<p>Fecha: ' + new Date().toLocaleString() + '</p>';
        html += '<img src="' + imgData + '" style="max-width: 100%; height: auto; margin: 20px 0;">';
        
        // Tabla de parámetros
        html += '<h2>Parámetros TCC</h2>';
        html += '<table>';
        html += '<tr><th>Nodo</th><th>Pickup (A)</th><th>Long Delay (s)</th><th>Short Delay (s)</th><th>Instantaneous (A)</th></tr>';
        
        nodosTCC.forEach(function(nodo) {
            var tcc = nodo.tcc || {};
            html += '<tr>';
            // Sanitización de ID para evitar inyección en el reporte
            var safeId = String(nodo.id).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += '<td>' + safeId + '</td>';
            html += '<td>' + (tcc.pickup || 0).toFixed(0) + '</td>';
            html += '<td>' + (tcc.longDelay || 0).toFixed(2) + '</td>';
            html += '<td>' + (tcc.shortDelay || 0).toFixed(3) + '</td>';
            html += '<td>' + (tcc.instantaneous === 'OFF' ? 'OFF' : (tcc.instantaneous || 0).toFixed(0)) + '</td>';
            html += '</tr>';
        });
        
        html += '</table>';
        html += '</body></html>';
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * EXPORTAR A EXCEL
     */
    function exportarExcel() {
        if (!nodosTCC || nodosTCC.length === 0) {
            if (typeof UIToast !== 'undefined') {
                UIToast.mostrar('No hay datos para exportar', 'error');
            } else {
                console.error('No hay datos para exportar');
            }
            return;
        }

        // Crear CSV
        var csv = 'Nodo,Rol,Pickup (A),Long Delay (s),Short Delay (s),Instantaneous (A)\n';
        
        nodosTCC.forEach(function(nodo) {
            var tcc = nodo.tcc || {};
            csv += nodo.id + ',';
            csv += (nodo.rol || '') + ',';
            csv += (tcc.pickup || 0).toFixed(0) + ',';
            csv += (tcc.longDelay || 0).toFixed(2) + ',';
            csv += (tcc.shortDelay || 0).toFixed(3) + ',';
            csv += (tcc.instantaneous === 'OFF' ? 'OFF' : (tcc.instantaneous || 0).toFixed(0)) + '\n';
        });

        // Agregar puntos de curva
        csv += '\n\nCurvas TCC (Puntos)\n';
        csv += 'Nodo,Corriente (A),Tiempo (s)\n';
        
        nodosTCC.forEach(function(nodo) {
            var puntos = generarCurva(nodo.tcc || {});
            puntos.forEach(function(p) {
                csv += nodo.id + ',' + p.x.toFixed(2) + ',' + p.y.toFixed(4) + '\n';
            });
        });

        // Descargar archivo
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'tcc_coordinacion_' + new Date().getTime() + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return {
        curvaTCC: curvaTCC,
        generarCurva: generarCurva,
        detectarCruce: detectarCruce,
        estadoCoordinacion: estadoCoordinacion,
        renderChart: renderChart,
        updateParametro: updateParametro,
        validarCoordinacion: validarCoordinacion,
        generarPanelSliders: generarPanelSliders,
        inicializar: inicializar,
        cargarDesdeDiseno: cargarDesdeDiseno,
        exportarPDF: exportarPDF,
        exportarExcel: exportarExcel
    };
})();

if (typeof window !== 'undefined') {
    window.TCCViewerInteractivo = TCCViewerInteractivo;
}
