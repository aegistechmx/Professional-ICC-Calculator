/**
 * tcc_viewer.js — Visualizador Interactivo de Curvas TCC
 * Gráficas de tiempo-corriente con Chart.js para coordinación de protecciones
 */

var TCCTViewer = (function() {

    var chartInstance = null;
    var canvasId = 'tcc-canvas';

    /**
     * Generar puntos de curva para graficación
     * @param {Object} device - Dispositivo TCC
     * @param {Array} currentRange - Rango de corrientes
     * @returns {Array} Puntos {x: I, y: t}
     */
    function generateCurvePoints(device, currentRange) {
        if (!device || !device.curve) return [];
        
        var points = [];
        
        for (var i = 0; i < currentRange.length; i++) {
            var I = currentRange[i];
            var t = TCCCoordinacion.tripTime(I, device);
            
            if (t != null && t > 0) {
                points.push({ x: I, y: t });
            }
        }
        
        return points;
    }

    /**
     * Generar rango de corrientes para graficación (espacio logarítmico)
     * @param {number} minI - Corriente mínima
     * @param {number} maxI - Corriente máxima
     * @param {number} steps - Número de puntos
     * @returns {Array} Rango de corrientes
     */
    function generateCurrentRange(minI, maxI, steps) {
        var arr = [];
        var min = Math.log10(minI);
        var max = Math.log10(maxI);

        for (var i = 0; i < steps; i++) {
            var v = min + (i / (steps - 1)) * (max - min);
            arr.push(Math.pow(10, v));
        }
        
        return arr;
    }

    /**
     * Mostrar visualizador TCC
     * @param {Array} devices - Dispositivos a graficar
     * @param {Object} options - Opciones de configuración
     */
    function mostrarViewer(devices, options) {
        options = options || {};
        
        // Crear modal si no existe
        var modal = document.getElementById('tcc-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tcc-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            var modalContent = document.createElement('div');
            modalContent.className = 'bg-white rounded-lg shadow-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto';

            var header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';

            var title = document.createElement('h3');
            title.className = 'text-lg font-semibold';
            title.textContent = 'Curvas TCC - Coordinación de Protecciones';

            var closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-500 hover:text-gray-700';
            closeBtn.onclick = TCCTViewer.cerrar;
            var closeIcon = document.createElement('i');
            closeIcon.className = 'fas fa-times text-xl';
            closeBtn.appendChild(closeIcon);

            header.appendChild(title);
            header.appendChild(closeBtn);

            var controls = document.createElement('div');
            controls.className = 'mb-4 flex gap-4 items-center';

            var minLabel = document.createElement('label');
            minLabel.className = 'text-sm font-medium';
            minLabel.textContent = 'Corriente Mín (A):';
            var minInput = document.createElement('input');
            minInput.type = 'number';
            minInput.id = 'tcc-min-current';
            minInput.value = '100';
            minInput.className = 'border rounded px-2 py-1 w-24';

            var maxLabel = document.createElement('label');
            maxLabel.className = 'text-sm font-medium';
            maxLabel.textContent = 'Corriente Máx (A):';
            var maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.id = 'tcc-max-current';
            maxInput.value = '50000';
            maxInput.className = 'border rounded px-2 py-1 w-24';

            var updateBtn = document.createElement('button');
            updateBtn.className = 'px-3 py-1 bg-[--cyan] text-black rounded text-sm hover:bg-[--cyan]/80';
            updateBtn.textContent = 'Actualizar';
            updateBtn.onclick = TCCTViewer.actualizar;

            controls.appendChild(minLabel);
            controls.appendChild(minInput);
            controls.appendChild(maxLabel);
            controls.appendChild(maxInput);
            controls.appendChild(updateBtn);

            var canvasContainer = document.createElement('div');
            canvasContainer.className = 'relative';
            canvasContainer.style.height = '500px';
            var canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvasContainer.appendChild(canvas);

            var legendSection = document.createElement('div');
            legendSection.className = 'mt-4';
            var legendTitle = document.createElement('h4');
            legendTitle.className = 'text-sm font-semibold mb-2';
            legendTitle.textContent = 'Leyenda';
            var legendDiv = document.createElement('div');
            legendDiv.id = 'tcc-legend';
            legendDiv.className = 'flex flex-wrap gap-2';
            legendSection.appendChild(legendTitle);
            legendSection.appendChild(legendDiv);

            modalContent.appendChild(header);
            modalContent.appendChild(controls);
            modalContent.appendChild(canvasContainer);
            modalContent.appendChild(legendSection);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        
        // Guardar dispositivos para actualización
        modal.devices = devices;
        
        graficarCurvas(devices, options);
    }

    /**
     * Graficar curvas TCC
     * @param {Array} devices - Dispositivos
     * @param {Object} options - Opciones
     */
    function graficarCurvas(devices, options) {
        var minI = parseFloat(document.getElementById('tcc-min-current')?.value) || 100;
        var maxI = parseFloat(document.getElementById('tcc-max-current')?.value) || 50000;
        
        var currentRange = generateCurrentRange(minI, maxI, 100);
        
        // Destruir gráfico anterior
        if (chartInstance) {
            chartInstance.destroy();
        }

        var ctx = document.getElementById(canvasId).getContext('2d');
        
        var datasets = [];
        var colors = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(75, 192, 192)',
            'rgb(255, 205, 86)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)'
        ];

        devices.forEach(function(device, index) {
            var points = generateCurvePoints(device, currentRange);
            
            if (points.length > 0) {
                datasets.push({
                    label: device.id + ' (In=' + device.In + 'A)',
                    data: points,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length] + '20',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.1,
                    fill: false
                });
            }
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    x: {
                        type: 'logarithmic',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Corriente (A) - Escala Log'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Tiempo (s) - Escala Log'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        min: 0.001,
                        max: 10000
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += 'I=' + context.parsed.x.toFixed(0) + 'A, t=' + context.parsed.y.toFixed(3) + 's';
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Actualizar leyenda
        actualizarLeyenda(devices, colors);
    }

    /**
     * Actualizar leyenda de colores
     * @param {Array} devices - Dispositivos
     * @param {Array} colors - Colores
     */
    function actualizarLeyenda(devices, colors) {
        var legend = document.getElementById('tcc-legend');
        if (!legend) return;
        
        legend.textContent = '';
        
        devices.forEach(function(device, index) {
            var color = colors[index % colors.length];
            var pickup = (device.settings && device.settings.instantPickup) ? 
                device.settings.instantPickup : 10;
            var timeDial = (device.settings && device.settings.timeDial) ? 
                device.settings.timeDial : 1;
            
            var item = document.createElement('div');
            item.className = 'flex items-center gap-2 px-3 py-1 rounded border';
            item.style.borderColor = color;
            
            var colorBox = document.createElement('div');
            colorBox.className = 'w-4 h-4 rounded';
            colorBox.style.backgroundColor = color;
            
            var idSpan = document.createElement('span');
            idSpan.className = 'text-xs';
            idSpan.textContent = device.id || 'N/A';
            
            var infoSpan = document.createElement('span');
            infoSpan.className = 'text-xs text-gray-500';
            infoSpan.textContent = '(Pickup: ' + pickup + 'x, TD: ' + timeDial + ')';
            
            item.appendChild(colorBox);
            item.appendChild(idSpan);
            item.appendChild(infoSpan);
            legend.appendChild(item);
        });
    }

    /**
     * Actualizar gráfico con nuevos rangos
     */
    function actualizar() {
        var modal = document.getElementById('tcc-modal');
        if (modal && modal.devices) {
            graficarCurvas(modal.devices);
        }
    }

    /**
     * Cerrar visualizador
     */
    function cerrar() {
        var modal = document.getElementById('tcc-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Mostrar curvas de coordinación del sistema actual
     */
    function mostrarCoordinacionSistema() {
        if (!App.estado || !App.estado.nodos) {
            UIToast.mostrar('No hay nodos en el sistema', 'error');
            return;
        }

        var devices = [];
        
        App.estado.nodos.forEach(function(nodo) {
            if (!nodo.equip || !nodo.feeder) return;
            
            var device = TCCCoordinacion.breakerToTCCDevice(
                { nombre: nodo.id, curvaDisparo: EQUIPOS[nodo.equip.serie]?.curvaDisparo },
                nodo.feeder.cargaA || 100
            );
            
            if (device) {
                devices.push(device);
            }
        });

        if (devices.length < 2) {
            UIToast.mostrar('Se requieren al menos 2 dispositivos con curvas para mostrar coordinación', 'error');
            return;
        }

        mostrarViewer(devices);
    }

    return {
        mostrarViewer: mostrarViewer,
        mostrarCoordinacionSistema: mostrarCoordinacionSistema,
        actualizar: actualizar,
        cerrar: cerrar
    };
})();

if (typeof window !== 'undefined') {
    window.TCCTViewer = TCCTViewer;
}
