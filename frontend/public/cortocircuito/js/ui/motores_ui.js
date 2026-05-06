/**
 * motores_ui.js — FASE 4
 * Interfaz para capturar grupos de motores y punto de conexion.
 */
var UIMotores = (function() {

    function getMotores() {
        return (typeof App !== 'undefined' && App.estado && App.estado.motores) ? App.estado.motores : [];
    }

    function getNodos() {
        return (typeof App !== 'undefined' && App.estado && App.estado.nodos) ? App.estado.nodos : [];
    }

    function init() {
        if (typeof App !== 'undefined' && App.estado) {
            if (!App.estado.motores) App.estado.motores = [];
        }
        renderizar();
    }

    function agregar() {
        if (typeof App !== 'undefined' && App.estado) {
            if (!App.estado.motores) App.estado.motores = [];
            if (App.estado.motores.length >= CONSTANTES.MAX_MOTORES) {
                UIToast.mostrar('Maximo ' + CONSTANTES.MAX_MOTORES + ' grupos de motores', 'error');
                return;
            }
            // Fase 9: Usar ID del primer nodo disponible como punto de conexión default
            var nodos = getNodos();
            var primerNodo = (nodos && nodos.length > 0) ? nodos[0].id : 'P0';
            App.estado.motores.push({ hp: 50, tipo: 'induccion', xdpp: 0, eficiencia: 0, punto: primerNodo });
        }
        renderizar();
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
    }

    function eliminar(i) {
        var motores = getMotores();
        if (!motores || motores.length <= 0) return;
        if (typeof App !== 'undefined' && App.estado && App.estado.motores) {
            App.estado.motores.splice(i, 1);
        }
        renderizar();
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
    }

    function actualizar(i, campo, valor) {
        var motores = getMotores();
        if (!motores || !motores[i]) return;
        if (typeof App !== 'undefined' && App.estado && App.estado.motores) {
            if (campo === 'hp') App.estado.motores[i][campo] = parseFloat(valor) || 0;
            else if (campo === 'punto') App.estado.motores[i][campo] = valor; // Fase 9: punto es ID de nodo (string)
            else App.estado.motores[i][campo] = valor;
        }
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
    }

    function renderizar() {
        var lista = document.getElementById('motores-lista');
        if (!lista) return;
        lista.textContent = '';

        var motores = getMotores();
        if (!motores || motores.length === 0) {
            var p = document.createElement('p');
            p.className = 'text-xs text-[--text-muted] py-2';
            p.textContent = 'Sin grupos de motores. No se aplica aporte.';
            lista.appendChild(p);
            return;
        }

        // Fase 9: Usar IDs de nodos en lugar de números para puntos de conexión
        var nodos = getNodos();
        motores.forEach(function(m, i) {
            var puntoOpts = '';
            nodos.forEach(function(n) {
                var selected = (m.punto === n.id || (n.id && n.id.length > 1 && m.punto === n.id.substring(1))) ? ' selected' : '';
                puntoOpts += '<option value="'+n.id+'"'+selected+'>'+n.id+' ('+(n.nombre||n.id)+')</option>';
            });

            var row = document.createElement('div');
            row.className = 'motor-row';
            
            var hpDiv = document.createElement('div');
            var hpLabel = document.createElement('label');
            hpLabel.className = 'field-label';
            hpLabel.textContent = 'HP';
            var hpInput = document.createElement('input');
            hpInput.type = 'number';
            hpInput.value = m.hp;
            hpInput.min = '0';
            hpInput.step = '1';
            hpInput.onchange = function() { UIMotores.actualizar(i, 'hp', this.value); };
            hpDiv.appendChild(hpLabel);
            hpDiv.appendChild(hpInput);
            
            var tipoDiv = document.createElement('div');
            var tipoLabel = document.createElement('label');
            tipoLabel.className = 'field-label';
            tipoLabel.textContent = 'Tipo';
            var tipoSelect = document.createElement('select');
            tipoSelect.onchange = function() { UIMotores.actualizar(i, 'tipo', this.value); };
            var opt1 = document.createElement('option');
            opt1.value = 'induccion';
            opt1.textContent = 'Induccion';
            if (m.tipo === 'induccion') opt1.selected = true;
            var opt2 = document.createElement('option');
            opt2.value = 'sincrono';
            opt2.textContent = 'Sincrono';
            if (m.tipo === 'sincrono') opt2.selected = true;
            tipoSelect.appendChild(opt1);
            tipoSelect.appendChild(opt2);
            tipoDiv.appendChild(tipoLabel);
            tipoDiv.appendChild(tipoSelect);
            
            var puntoDiv = document.createElement('div');
            var puntoLabel = document.createElement('label');
            puntoLabel.className = 'field-label';
            puntoLabel.textContent = 'En punto';
            var puntoSelect = document.createElement('select');
            puntoSelect.onchange = function() { UIMotores.actualizar(i, 'punto', this.value); };
            nodos.forEach(function(n) {
                var opt = document.createElement('option');
                opt.value = n.id;
                opt.textContent = n.id + ' (' + (n.nombre || n.id) + ')';
                if (m.punto === n.id || (n.id && n.id.length > 1 && m.punto === n.id.substring(1))) {
                    opt.selected = true;
                }
                puntoSelect.appendChild(opt);
            });
            puntoDiv.appendChild(puntoLabel);
            puntoDiv.appendChild(puntoSelect);
            
            var btnDiv = document.createElement('div');
            btnDiv.className = 'flex items-end';
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-sm danger';
            deleteBtn.title = 'Eliminar';
            var deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-times text-[0.6rem]';
            deleteBtn.appendChild(deleteIcon);
            if (motores && motores.length <= 0) {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '.3';
                deleteBtn.style.pointerEvents = 'none';
            }
            deleteBtn.onclick = function() { UIMotores.eliminar(i); };
            btnDiv.appendChild(deleteBtn);
            
            row.appendChild(hpDiv);
            row.appendChild(tipoDiv);
            row.appendChild(puntoDiv);
            row.appendChild(btnDiv);
            lista.appendChild(row);

            // Fila de datos avanzados
            var row2 = document.createElement('div');
            row2.className = 'motor-row';
            row2.style.marginTop = '-4px';
            
            var xdppDiv = document.createElement('div');
            var xdppLabel = document.createElement('label');
            xdppLabel.className = 'field-label';
            xdppLabel.textContent = 'Xd\'\'\' (0=auto)';
            var xdppInput = document.createElement('input');
            xdppInput.type = 'number';
            xdppInput.value = m.xdpp || '';
            xdppInput.min = '0';
            xdppInput.step = '0.001';
            xdppInput.placeholder = 'auto';
            xdppInput.onchange = function() { UIMotores.actualizar(i, 'xdpp', parseFloat(this.value)); };
            xdppDiv.appendChild(xdppLabel);
            xdppDiv.appendChild(xdppInput);
            
            var efDiv = document.createElement('div');
            var efLabel = document.createElement('label');
            efLabel.className = 'field-label';
            efLabel.textContent = 'Eficiencia (0=auto)';
            var efInput = document.createElement('input');
            efInput.type = 'number';
            efInput.value = m.eficiencia || '';
            efInput.min = '0';
            efInput.step = '0.01';
            efInput.max = '1';
            efInput.placeholder = 'auto';
            efInput.onchange = function() { UIMotores.actualizar(i, 'eficiencia', parseFloat(this.value)); };
            efDiv.appendChild(efLabel);
            efDiv.appendChild(efInput);
            
            var infoDiv = document.createElement('div');
            infoDiv.className = 'flex items-end';
            var infoP = document.createElement('p');
            infoP.className = 'text-[0.6rem] text-[--text-muted] leading-relaxed';
            infoP.textContent = 'Xd\'\'\' tipico: 0.167 (ind <1kHP), 0.20 (ind >=1kHP). Ef=0.88-0.95 segun HP.';
            infoDiv.appendChild(infoP);
            
            var emptyDiv = document.createElement('div');
            
            row2.appendChild(xdppDiv);
            row2.appendChild(efDiv);
            row2.appendChild(infoDiv);
            row2.appendChild(emptyDiv);
            lista.appendChild(row2);
        });
    }

    function leerDatos() { return getMotores(); }

    return { init: init, agregar: agregar, eliminar: eliminar, actualizar: actualizar, renderizar: renderizar, leerDatos: leerDatos };
})();

if (typeof window !== 'undefined') {
    window.UIMotores = UIMotores;
}


