/**
 * simulacion_fallas.js — Simulación de Fallas por Nodo en Tiempo Real
 * Permite simular fallas en puntos específicos y ver el impacto en el sistema
 */

var UISimulacionFallas = (function() {

    /**
     * Mostrar modal de simulación de fallas
     */
    function mostrarSimulacion() {
        if (!App.estado || !App.estado.nodos || App.estado.nodos.length === 0) {
            UIToast.mostrar('No hay nodos en el sistema', 'error');
            return;
        }

        // Crear modal si no existe
        var modal = document.getElementById('simulacion-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'simulacion-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            var modalContent = document.createElement('div');
            modalContent.className = 'bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto';

            var header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';

            var title = document.createElement('h3');
            title.className = 'text-lg font-semibold';
            title.textContent = 'Simulación de Fallas por Nodo';

            var closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-500 hover:text-gray-700';
            closeBtn.onclick = UISimulacionFallas.cerrar;
            var closeIcon = document.createElement('i');
            closeIcon.className = 'fas fa-times text-xl';
            closeBtn.appendChild(closeIcon);

            header.appendChild(title);
            header.appendChild(closeBtn);

            var grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 gap-4 mb-4';

            var nodoDiv = document.createElement('div');
            var nodoLabel = document.createElement('label');
            nodoLabel.className = 'block text-sm font-medium mb-1';
            nodoLabel.textContent = 'Punto de Falla';
            var nodoSelect = document.createElement('select');
            nodoSelect.id = 'sim-nodo';
            nodoSelect.className = 'w-full border rounded px-3 py-2';
            nodoSelect.onchange = UISimulacionFallas.simular;

            var tipoDiv = document.createElement('div');
            var tipoLabel = document.createElement('label');
            tipoLabel.className = 'block text-sm font-medium mb-1';
            tipoLabel.textContent = 'Tipo de Falla';
            var tipoSelect = document.createElement('select');
            tipoSelect.id = 'sim-tipo';
            tipoSelect.className = 'w-full border rounded px-3 py-2';
            tipoSelect.onchange = UISimulacionFallas.simular;

            var tipos = [
                {val: '3f', txt: 'Trifásica (3F)'},
                {val: '2f', txt: 'Bifásica (2F)'},
                {val: '1f', txt: 'Fase-Tierra (1F)'},
                {val: '2g', txt: 'Bifásica-Tierra (2G)'}
            ];
            tipos.forEach(function(t) {
                var opt = document.createElement('option');
                opt.value = t.val;
                opt.textContent = t.txt;
                tipoSelect.appendChild(opt);
            });

            nodoDiv.appendChild(nodoLabel);
            nodoDiv.appendChild(nodoSelect);
            tipoDiv.appendChild(tipoLabel);
            tipoDiv.appendChild(tipoSelect);
            grid.appendChild(nodoDiv);
            grid.appendChild(tipoDiv);

            var resultadosDiv = document.createElement('div');
            resultadosDiv.id = 'sim-resultados';

            modalContent.appendChild(header);
            modalContent.appendChild(grid);
            modalContent.appendChild(resultadosDiv);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        }

        // Poblar select de nodos
        var nodoSelect = document.getElementById('sim-nodo');
        nodoSelect.textContent = '';
        var nodos = (typeof App !== 'undefined' && App.estado ? App.estado.nodos : []) || [];
        nodos.forEach(function(n, i) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = n.id + (n.nombre ? ' - ' + n.nombre : '');
            nodoSelect.appendChild(opt);
        });

        modal.style.display = 'flex';
        simular();
    }

    /**
     * Simular falla en el nodo seleccionado
     */
    function simular() {
        var nodoSelect = document.getElementById('sim-nodo');
        var tipoSelect = document.getElementById('sim-tipo');
        if (!nodoSelect || !tipoSelect) return;
        
        var nodoIdx = parseInt(nodoSelect.value, 10) || 0;
        var tipoFalla = tipoSelect.value || '3f';
        
        if (!App.estado.resultados || !App.estado.resultados[nodoIdx]) {
            return;
        }

        var nodo = App.estado.nodos[nodoIdx];
        var resultado = App.estado.resultados[nodoIdx];
        
        var resultadosDiv = document.getElementById('sim-resultados');
        if (!resultadosDiv) return;
        resultadosDiv.textContent = '';
        
        // Corriente de falla según tipo
        var isc = 0;
        var tipoTexto = '';
        
        switch(tipoFalla) {
            case '3f':
                isc = resultado.iscConMotores || resultado.isc || 0;
                tipoTexto = 'Trifásica Simétrica';
                break;
            case '2f':
                isc = (resultado.iscBifasica || (resultado.isc || 0) * 0.866);
                tipoTexto = 'Bifásica';
                break;
            case '1f':
                isc = (resultado.faseTierra && resultado.faseTierra.iscFt) || (resultado.isc || 0) * 0.5;
                tipoTexto = 'Monofásica a Tierra';
                break;
            default:
                isc = resultado.iscConMotores || resultado.isc || 0;
                tipoTexto = 'Trifásica Simétrica';
        }
        
        var ipico = resultado.ipeakConMotores || resultado.ipeak || 0;
        
        // Verificar disparo de protección
        var iDisparo = (nodo.equip && nodo.equip.iDisparo) ? nodo.equip.iDisparo : 0;
        var capInterruptiva = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap * 1000 : 0;
        
        var disparara = iDisparo > 0 && isc * 1000 >= iDisparo;
        var soporta = capInterruptiva > 0 && isc * 1000 <= capInterruptiva;
        
        // Calcular tiempo de disparo si hay curva
        var tiempoDisparo = 0;
        if (nodo.equip && nodo.equip.serie) {
            var device = TCCCoordinacion.breakerToTCCDevice(
                { nombre: nodo.id, curvaDisparo: EQUIPOS[nodo.equip.serie]?.curvaDisparo },
                nodo.feeder?.cargaA || 100
            );
            if (device) {
                tiempoDisparo = TCCCoordinacion.tripTime(isc * 1000, device);
            }
        }
        
        // Crear contenedor de resultados
        var resultContainer = document.createElement('div');
        resultContainer.className = 'p-4 rounded-lg border border-[--border] bg-[--surface]';
        
        var title = document.createElement('h4');
        title.className = 'font-semibold mb-3 text-[--amber]';
        title.textContent = 'Resultados en ' + (nodo ? nodo.id : 'N/A');
        resultContainer.appendChild(title);
        
        // Grid de valores
        var grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-4 mb-4';
        
        var tipos = [
            {label: 'Tipo de Falla', value: tipoTexto},
            {label: 'Corriente de Falla', value: isc.toFixed(2) + ' kA', color: 'text-[--cyan]'},
            {label: 'Corriente Pico', value: ipico.toFixed(2) + ' kA'},
            {label: 'X/R', value: ((resultado.xr || 0) > 100 ? '>100' : (resultado.xr || 0).toFixed(1))}
        ];
        
        tipos.forEach(function(t) {
            var div = document.createElement('div');
            div.className = 'p-3 rounded bg-[--bg]';
            var label = document.createElement('div');
            label.className = 'text-xs text-[--text-muted] mb-1';
            label.textContent = t.label;
            var value = document.createElement('div');
            value.className = 'font-semibold' + (t.color ? ' ' + t.color : '');
            value.textContent = t.value;
            div.appendChild(label);
            div.appendChild(value);
            grid.appendChild(div);
        });
        
        resultContainer.appendChild(grid);
        
        // Protección
        var protTitle = document.createElement('h4');
        protTitle.className = 'font-semibold mb-3 text-[--amber]';
        protTitle.textContent = 'Evaluación de Protección';
        resultContainer.appendChild(protTitle);
        
        var protDiv = document.createElement('div');
        protDiv.className = 'space-y-2';
        
        if (iDisparo > 0) {
            var iDiv = document.createElement('div');
            iDiv.className = 'flex items-center justify-between p-2 rounded ' + 
                (disparara ? 'bg-[--green]/10 border border-[--green]' : 'bg-[--red]/10 border border-[--red]');
            var span1 = document.createElement('span');
            span1.className = 'text-sm';
            span1.textContent = 'I Disparo: ' + iDisparo + ' A';
            var span2 = document.createElement('span');
            span2.className = 'text-sm font-semibold ' + (disparara ? 'text-[--green]' : 'text-[--red]');
            span2.textContent = disparara ? '✓ Dispara' : '✗ No dispara';
            iDiv.appendChild(span1);
            iDiv.appendChild(span2);
            protDiv.appendChild(iDiv);
        }
        
        if (capInterruptiva > 0) {
            var capDiv = document.createElement('div');
            capDiv.className = 'flex items-center justify-between p-2 rounded ' + 
                (soporta ? 'bg-[--green]/10 border border-[--green]' : 'bg-[--red]/10 border border-[--red]');
            var capSpan1 = document.createElement('span');
            capSpan1.className = 'text-sm';
            capSpan1.textContent = 'Cap. Interruptiva: ' + (capInterruptiva / 1000).toFixed(1) + ' kA';
            var capSpan2 = document.createElement('span');
            capSpan2.className = 'text-sm font-semibold ' + (soporta ? 'text-[--green]' : 'text-[--red]');
            capSpan2.textContent = soporta ? '✓ Adecuada' : '✗ Insuficiente';
            capDiv.appendChild(capSpan1);
            capDiv.appendChild(capSpan2);
            protDiv.appendChild(capDiv);
        }
        
        if (tiempoDisparo > 0) {
            var timeDiv = document.createElement('div');
            timeDiv.className = 'flex items-center justify-between p-2 rounded bg-[--cyan]/10 border border-[--cyan]';
            var timeSpan1 = document.createElement('span');
            timeSpan1.className = 'text-sm';
            timeSpan1.textContent = 'Tiempo Estimado de Disparo';
            var timeSpan2 = document.createElement('span');
            timeSpan2.className = 'text-sm font-semibold text-[--cyan]';
            timeSpan2.textContent = tiempoDisparo.toFixed(3) + ' s';
            timeDiv.appendChild(timeSpan1);
            timeDiv.appendChild(timeSpan2);
            protDiv.appendChild(timeDiv);
        }
        
        resultContainer.appendChild(protDiv);
        
        // Impacto en nodos upstream
        var impactTitle = document.createElement('h4');
        impactTitle.className = 'font-semibold mb-3 text-[--amber] mt-4';
        impactTitle.textContent = 'Impacto en Nodos Upstream';
        resultContainer.appendChild(impactTitle);
        
        var tableDiv = document.createElement('div');
        tableDiv.className = 'overflow-x-auto';
        
        var table = document.createElement('table');
        table.className = 'w-full text-sm';
        
        var thead = document.createElement('thead');
        thead.className = 'bg-[--bg]';
        var headerRow = document.createElement('tr');
        ['Nodo', 'Isc (kA)', 'Ve Falla', 'Estado'].forEach(function(h) {
            var th = document.createElement('th');
            th.className = 'px-3 py-2 text-left';
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        var tbody = document.createElement('tbody');
        
        var nodos = (typeof App !== 'undefined' && App.estado ? App.estado.nodos : []) || [];
        var resultados = (typeof App !== 'undefined' && App.estado ? App.estado.resultados : []) || [];
        for (var i = 0; i <= nodoIdx && i < nodos.length; i++) {
            var n = nodos[i];
            var r = resultados[i];
            var veFalla = i === nodoIdx;
            var estado = 'Normal';
            
            if (i === nodoIdx) {
                estado = 'Punto de Falla';
            } else if (r && r.isc > 0) {
                estado = 'Expuesto';
            }
            
            var tr = document.createElement('tr');
            tr.className = 'border-b border-[--border]';
            
            var td1 = document.createElement('td');
            td1.className = 'px-3 py-2';
            td1.textContent = n ? n.id : 'N/A';
            
            var td2 = document.createElement('td');
            td2.className = 'px-3 py-2';
            td2.textContent = r ? (r.isc || 0).toFixed(2) : 'N/A';
            
            var td3 = document.createElement('td');
            td3.className = 'px-3 py-2';
            td3.textContent = veFalla ? 'Sí' : 'No';
            
            var td4 = document.createElement('td');
            td4.className = 'px-3 py-2';
            td4.textContent = estado;
            
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        tableDiv.appendChild(table);
        resultContainer.appendChild(tableDiv);
        
        resultadosDiv.appendChild(resultContainer);
    }

    /**
     * Cerrar modal
     */
    function cerrar() {
        var modal = document.getElementById('simulacion-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    return {
        mostrarSimulacion: mostrarSimulacion,
        simular: simular,
        cerrar: cerrar
    };
})();

if (typeof window !== 'undefined') {
    window.UISimulacionFallas = UISimulacionFallas;
}
