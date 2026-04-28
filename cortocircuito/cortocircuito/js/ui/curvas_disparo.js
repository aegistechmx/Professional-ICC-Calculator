// Componente para visualizar curvas de disparo de interruptores
var CurvasDisparo = (function() {
    var chart = null;
    var chartCanvas = null;

    /**
     * Inicializar el componente
     */
    function init() {
        // Buscar o crear el canvas para el gráfico
        chartCanvas = document.getElementById('curvasDisparoCanvas');
        if (!chartCanvas) {
            // Crear el canvas si no existe - agregar al main content
            var mainContent = document.querySelector('main');
            if (mainContent) {
                var section = document.createElement('section');
                section.className = 'card mb-6';
                section.id = 'curvas-disparo-section';

                var cardTitle = document.createElement('div');
                cardTitle.className = 'card-title';
                var icon = document.createElement('i');
                icon.className = 'fas fa-chart-line';
                cardTitle.appendChild(icon);
                cardTitle.appendChild(document.createTextNode(' Curvas de Disparo'));

                var p4 = document.createElement('div');
                p4.className = 'p-4';

                var mainControls = document.createElement('div');
                mainControls.className = 'mb-4 flex gap-4 flex-wrap';

                var serieDiv = document.createElement('div');
                var serieLabel = document.createElement('label');
                serieLabel.className = 'block text-sm font-medium mb-1';
                serieLabel.textContent = 'Serie Principal';
                var serieSelect = document.createElement('select');
                serieSelect.id = 'curvaSerie';
                serieSelect.className = 'border rounded px-3 py-2 text-sm';
                var opt1 = document.createElement('option');
                opt1.value = '';
                opt1.textContent = '-- Seleccionar serie --';
                serieSelect.appendChild(opt1);
                serieDiv.appendChild(serieLabel);
                serieDiv.appendChild(serieSelect);

                var modeloDiv = document.createElement('div');
                var modeloLabel = document.createElement('label');
                modeloLabel.className = 'block text-sm font-medium mb-1';
                modeloLabel.textContent = 'Modelo Principal';
                var modeloSelect = document.createElement('select');
                modeloSelect.id = 'curvaModelo';
                modeloSelect.className = 'border rounded px-3 py-2 text-sm';
                var opt2 = document.createElement('option');
                opt2.value = '';
                opt2.textContent = '-- Seleccionar modelo --';
                modeloSelect.appendChild(opt2);
                modeloDiv.appendChild(modeloLabel);
                modeloDiv.appendChild(modeloSelect);

                var corrienteDiv = document.createElement('div');
                var corrienteLabel = document.createElement('label');
                corrienteLabel.className = 'block text-sm font-medium mb-1';
                corrienteLabel.textContent = 'Corriente Nominal (A)';
                var corrienteInput = document.createElement('input');
                corrienteInput.type = 'number';
                corrienteInput.id = 'curvaCorrienteNominal';
                corrienteInput.className = 'border rounded px-3 py-2 text-sm w-24';
                corrienteInput.value = '100';
                corrienteInput.min = '1';
                corrienteDiv.appendChild(corrienteLabel);
                corrienteDiv.appendChild(corrienteInput);

                var btnDiv = document.createElement('div');
                btnDiv.className = 'flex items-end';
                var graficarBtn = document.createElement('button');
                graficarBtn.id = 'btnGraficarCurva';
                graficarBtn.className = 'bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700';
                graficarBtn.textContent = 'Graficar Curva';
                btnDiv.appendChild(graficarBtn);

                mainControls.appendChild(serieDiv);
                mainControls.appendChild(modeloDiv);
                mainControls.appendChild(corrienteDiv);
                mainControls.appendChild(btnDiv);

                var compSection = document.createElement('div');
                compSection.className = 'mb-4 p-4 bg-gray-50 rounded-lg';
                var compTitle = document.createElement('h4');
                compTitle.className = 'text-sm font-semibold mb-3';
                compTitle.textContent = 'Coordinación - Agregar Curva de Comparación';

                var compControls = document.createElement('div');
                compControls.className = 'flex gap-4 flex-wrap items-end';

                var compSerieDiv = document.createElement('div');
                var compSerieLabel = document.createElement('label');
                compSerieLabel.className = 'block text-sm font-medium mb-1';
                compSerieLabel.textContent = 'Serie Comparación';
                var compSerieSelect = document.createElement('select');
                compSerieSelect.id = 'compSerie';
                compSerieSelect.className = 'border rounded px-3 py-2 text-sm';
                var opt3 = document.createElement('option');
                opt3.value = '';
                opt3.textContent = '-- Seleccionar serie --';
                compSerieSelect.appendChild(opt3);
                compSerieDiv.appendChild(compSerieLabel);
                compSerieDiv.appendChild(compSerieSelect);

                var compModeloDiv = document.createElement('div');
                var compModeloLabel = document.createElement('label');
                compModeloLabel.className = 'block text-sm font-medium mb-1';
                compModeloLabel.textContent = 'Modelo Comparación';
                var compModeloSelect = document.createElement('select');
                compModeloSelect.id = 'compModelo';
                compModeloSelect.className = 'border rounded px-3 py-2 text-sm';
                var opt4 = document.createElement('option');
                opt4.value = '';
                opt4.textContent = '-- Seleccionar modelo --';
                compModeloSelect.appendChild(opt4);
                compModeloDiv.appendChild(compModeloLabel);
                compModeloDiv.appendChild(compModeloSelect);

                var compCorrienteDiv = document.createElement('div');
                var compCorrienteLabel = document.createElement('label');
                compCorrienteLabel.className = 'block text-sm font-medium mb-1';
                compCorrienteLabel.textContent = 'Corriente Nominal (A)';
                var compCorrienteInput = document.createElement('input');
                compCorrienteInput.type = 'number';
                compCorrienteInput.id = 'compCorrienteNominal';
                compCorrienteInput.className = 'border rounded px-3 py-2 text-sm w-24';
                compCorrienteInput.value = '50';
                compCorrienteInput.min = '1';
                compCorrienteDiv.appendChild(compCorrienteLabel);
                compCorrienteDiv.appendChild(compCorrienteInput);

                var colorDiv = document.createElement('div');
                var colorLabel = document.createElement('label');
                colorLabel.className = 'block text-sm font-medium mb-1';
                colorLabel.textContent = 'Color';
                var colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.id = 'compColor';
                colorInput.className = 'border rounded px-3 py-2 text-sm w-16 h-10';
                colorInput.value = '#ef4444';
                colorDiv.appendChild(colorLabel);
                colorDiv.appendChild(colorInput);

                var agregarBtn = document.createElement('button');
                agregarBtn.id = 'btnAgregarComparacion';
                agregarBtn.className = 'bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700';
                agregarBtn.textContent = 'Agregar Comparación';

                var limpiarBtn = document.createElement('button');
                limpiarBtn.id = 'btnLimpiarComparacion';
                limpiarBtn.className = 'bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700';
                limpiarBtn.textContent = 'Limpiar Comparaciones';

                compControls.appendChild(compSerieDiv);
                compControls.appendChild(compModeloDiv);
                compControls.appendChild(compCorrienteDiv);
                compControls.appendChild(colorDiv);
                compControls.appendChild(agregarBtn);
                compControls.appendChild(limpiarBtn);

                compSection.appendChild(compTitle);
                compSection.appendChild(compControls);

                var canvasContainer = document.createElement('div');
                canvasContainer.className = 'relative';
                canvasContainer.style.height = '400px';
                var canvas = document.createElement('canvas');
                canvas.id = 'curvasDisparoCanvas';
                canvasContainer.appendChild(canvas);

                p4.appendChild(mainControls);
                p4.appendChild(compSection);
                p4.appendChild(canvasContainer);

                section.appendChild(cardTitle);
                section.appendChild(p4);

                mainContent.appendChild(section);
                chartCanvas = document.getElementById('curvasDisparoCanvas');
            }
        }

        // Llenar selectores de series
        llenarSelectorSeries();
        llenarSelectorSeriesComparacion();

        // Event listeners - verificar que los elementos existan
        var curvaSerie = document.getElementById('curvaSerie');
        var compSerie = document.getElementById('compSerie');
        var btnGraficar = document.getElementById('btnGraficarCurva');
        var btnAgregar = document.getElementById('btnAgregarComparacion');
        var btnLimpiar = document.getElementById('btnLimpiarComparacion');

        if (curvaSerie) curvaSerie.addEventListener('change', onSerieChange);
        if (compSerie) compSerie.addEventListener('change', onCompSerieChange);
        if (btnGraficar) btnGraficar.addEventListener('click', graficarCurva);
        if (btnAgregar) btnAgregar.addEventListener('click', agregarComparacion);
        if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarComparaciones);
    }

    /**
     * Llenar el selector de series
     */
    function llenarSelectorSeries() {
        var select = document.getElementById('curvaSerie');
        if (!select) return;

        select.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar serie --';
        select.appendChild(opt);
        
        for (var key in EQUIPOS) {
            if (EQUIPOS[key] && EQUIPOS[key].curvaDisparo) {
                var opt = document.createElement('option');
                opt.value = key;
                opt.textContent = EQUIPOS[key].nombre;
                select.appendChild(opt);
            }
        }
    }

    /**
     * Llenar el selector de series para comparación
     */
    function llenarSelectorSeriesComparacion() {
        var select = document.getElementById('compSerie');
        if (!select) return;

        select.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar serie --';
        select.appendChild(opt);
        
        for (var key in EQUIPOS) {
            if (EQUIPOS[key] && EQUIPOS[key].curvaDisparo) {
                var opt = document.createElement('option');
                opt.value = key;
                opt.textContent = EQUIPOS[key].nombre;
                select.appendChild(opt);
            }
        }
    }

    /**
     * Cuando cambia la serie, llenar modelos
     */
    function onSerieChange() {
        var serieKey = document.getElementById('curvaSerie').value;
        var modeloSelect = document.getElementById('curvaModelo');
        
        modeloSelect.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar modelo --';
        modeloSelect.appendChild(opt);
        
        if (serieKey && EQUIPOS[serieKey]) {
            EQUIPOS[serieKey].modelos.forEach(function(m, i) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = m.nombre + ' (' + m.amp + 'A)';
                modeloSelect.appendChild(opt);
            });
            
            // Seleccionar el primer modelo y actualizar corriente nominal
            if (EQUIPOS[serieKey].modelos.length > 0) {
                modeloSelect.value = 0;
                document.getElementById('curvaCorrienteNominal').value = EQUIPOS[serieKey].modelos[0].amp;
            }
        }
    }

    /**
     * Cuando cambia la serie de comparación, llenar modelos
     */
    function onCompSerieChange() {
        var serieKey = document.getElementById('compSerie').value;
        var modeloSelect = document.getElementById('compModelo');
        
        modeloSelect.textContent = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- Seleccionar modelo --';
        modeloSelect.appendChild(opt);
        
        if (serieKey && EQUIPOS[serieKey]) {
            EQUIPOS[serieKey].modelos.forEach(function(m, i) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = m.nombre + ' (' + m.amp + 'A)';
                modeloSelect.appendChild(opt);
            });
            
            // Seleccionar el primer modelo y actualizar corriente nominal
            if (EQUIPOS[serieKey].modelos.length > 0) {
                modeloSelect.value = 0;
                document.getElementById('compCorrienteNominal').value = EQUIPOS[serieKey].modelos[0].amp;
            }
        }
    }

    /**
     * Graficar la curva de disparo
     */
    function graficarCurva() {
        var serieKey = document.getElementById('curvaSerie').value;
        var modeloIndex = document.getElementById('curvaModelo').value;
        var corrienteNominal = parseFloat(document.getElementById('curvaCorrienteNominal')?.value) || 100;

        if (!serieKey || !EQUIPOS[serieKey] || !EQUIPOS[serieKey].curvaDisparo) {
            UIToast.mostrar('Por favor seleccione una serie con curva de disparo disponible', 'error');
            return;
        }

        var curva = EQUIPOS[serieKey].curvaDisparo;
        var modeloNombre = modeloIndex !== '' ? EQUIPOS[serieKey].modelos[modeloIndex].nombre : EQUIPOS[serieKey].nombre;

        // Generar puntos de datos para el gráfico
        var datos = generarPuntosCurva(curva.puntos || [], corrienteNominal);

        // Destruir gráfico anterior si existe
        if (chart) {
            chart.destroy();
        }

        // Crear nuevo gráfico
        chart = new Chart(chartCanvas, {
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
                    title: {
                        display: true,
                        text: 'Curva de Disparo - ' + modeloNombre,
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var corriente = context.parsed.x;
                                var tiempo = context.parsed.y;
                                return 'Corriente: ' + corriente.toFixed(1) + 'A, Tiempo: ' + formatoTiempo(tiempo);
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
     * Generar puntos de datos para la curva
     */
    function generarPuntosCurva(puntos, corrienteNominal) {
        var datos = [];
        
        // Agregar puntos definidos
        puntos.forEach(function(punto) {
            if (punto.tiempo !== Infinity) {
                datos.push({
                    x: punto.corriente * corrienteNominal,
                    y: punto.tiempo
                });
            }
        });

        // Interpolar puntos adicionales para una curva más suave
        for (var i = 0; i < puntos.length - 1; i++) {
            var p1 = puntos[i];
            var p2 = puntos[i + 1];
            
            if (p1.tiempo === Infinity || p2.tiempo === Infinity) continue;
            
            // Agregar puntos intermedios
            var pasos = 5;
            for (var j = 1; j < pasos; j++) {
                var t = j / pasos;
                var corrienteInterp = p1.corriente + (p2.corriente - p1.corriente) * t;
                var tiempoInterp = p1.tiempo + (p2.tiempo - p1.tiempo) * t;
                
                datos.push({
                    x: corrienteInterp * corrienteNominal,
                    y: tiempoInterp
                });
            }
        }

        // Ordenar por corriente
        datos.sort(function(a, b) {
            return a.x - b.x;
        });

        return datos;
    }

    /**
     * Formatear tiempo para display
     */
    function formatoTiempo(segundos) {
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
     * Agregar una curva adicional para comparación (coordinación)
     */
    function agregarCurvaComparacion(serieKey, modeloIndex, corrienteNominal, color) {
        if (!chart || !EQUIPOS[serieKey] || !EQUIPOS[serieKey].curvaDisparo) {
            return;
        }

        var curva = EQUIPOS[serieKey].curvaDisparo;
        var modeloNombre = modeloIndex !== '' ? EQUIPOS[serieKey].modelos[modeloIndex].nombre : EQUIPOS[serieKey].nombre;
        var datos = generarPuntosCurva(curva.puntos || [], corrienteNominal);

        chart.data.datasets.push({
            label: modeloNombre + ' (' + corrienteNominal + 'A)',
            data: datos,
            borderColor: color || 'rgb(239, 68, 68)',
            backgroundColor: (color || 'rgb(239, 68, 68)').replace('rgb', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: color || 'rgb(239, 68, 68)',
            tension: 0.1,
            fill: false
        });

        chart.update();
    }

    /**
     * Limpiar todas las curvas excepto la principal
     */
    function limpiarCurvasComparacion() {
        if (chart && chart.data.datasets.length > 1) {
            chart.data.datasets = [chart.data.datasets[0]];
            chart.update();
        }
    }

    /**
     * Agregar curva de comparación desde la UI
     */
    function agregarComparacion() {
        var serieKey = document.getElementById('compSerie').value;
        var modeloIndex = document.getElementById('compModelo').value;
        var corrienteNominal = parseFloat(document.getElementById('compCorrienteNominal')?.value) || 50;
        var color = document.getElementById('compColor').value;

        if (!chart) {
            UIToast.mostrar('Primero grafique la curva principal', 'error');
            return;
        }

        if (!serieKey || !EQUIPOS[serieKey] || !EQUIPOS[serieKey].curvaDisparo) {
            UIToast.mostrar('Por favor seleccione una serie con curva de disparo disponible', 'error');
            return;
        }

        agregarCurvaComparacion(serieKey, modeloIndex, corrienteNominal, color);
    }

    /**
     * Limpiar todas las curvas de comparación desde la UI
     */
    function limpiarComparaciones() {
        limpiarCurvasComparacion();
    }

    // API pública
    return {
        init: init,
        graficarCurva: graficarCurva,
        agregarCurvaComparacion: agregarCurvaComparacion,
        limpiarCurvasComparacion: limpiarCurvasComparacion
    };
})();

if (typeof window !== 'undefined') {
    window.CurvasDisparo = CurvasDisparo;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', CurvasDisparo.init);
} else {
    CurvasDisparo.init();
}
