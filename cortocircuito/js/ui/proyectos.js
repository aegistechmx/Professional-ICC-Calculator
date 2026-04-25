/**
 * proyectos.js — FASE 3
 * Gestion de proyectos: guardar, cargar, borrar, exportar e importar JSON.
 * Usa localStorage como almacenamiento local.
 */
var UIProyectos = (function() {

    var STORAGE_KEY = 'cc_proyectos';

    /**
     * Lee todos los proyectos del localStorage
     */
    function leerTodos() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    /**
     * Guarda todos los proyectos al localStorage
     */
    function escribirTodos(proyectos) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(proyectos));
        } catch (e) {
            console.error('Error guardando proyectos:', e);
            UIToast.mostrar('Error guardando proyecto. Espacio insuficiente o modo privado.', 'error');
        }
    }

    /**
     * Extrae el estado actual de la app como objeto serializable
     * (sin resultados calculados, solo inputs)
     */
    function serializarEstado() {
        return {
            modo: (typeof App !== 'undefined' && App.estado ? App.estado.modo : ''),
            tipoSistema: (typeof App !== 'undefined' && App.estado ? App.estado.tipoSistema : ''),
            tension: parseFloat(document.getElementById('input-tension').value) || 220,
            fuente: {
                iscConocido: parseFloat(document.getElementById('input-isc-conocido')?.value) || 0,
                iscFuente: parseFloat(document.getElementById('input-isc-fuente')?.value) || 0,
                xrFuente: parseFloat(document.getElementById('input-xr-fuente')?.value) || 15,
                trafoKva: parseFloat(document.getElementById('input-trafo-kva').value) || 0,
                trafoZ: parseFloat(document.getElementById('input-trafo-z').value) || 0,
                trafoVp: parseFloat(document.getElementById('input-trafo-vp').value) || 0,
                trafoVs: parseFloat(document.getElementById('input-trafo-vs').value) || 0
            },
            equipP0: {
                tipo: document.getElementById('equip-p0-tipo').value || '',
                modelo: document.getElementById('equip-p0-modelo').value || '',
                cap: parseFloat(document.getElementById('equip-p0-cap').value) || 0
            },
            // Fase 9: Save nodos (tree structure) instead of feeders
            nodos: ((typeof App !== 'undefined' && App.estado ? App.estado.nodos : []) || []).map(function(n) {
                return {
                    id: n.id,
                    parentId: n.parentId,
                    nombre: n.nombre,
                    feeder: n.feeder,
                    equip: n.equip
                };
            }),
            // Guardar configuración de FC y FT
            fcConfig: ((typeof App !== 'undefined' && App.estado ? App.estado.nodos : []) || []).map(function(n) {
                return {
                    id: n.id,
                    fc: n.feeder ? n.feeder.fc : null,
                    ft: n.feeder ? n.feeder.ft : null,
                    numConductores: n.feeder ? n.feeder.numConductores : null
                };
            }),
            fechaGuardado: new Date().toISOString()
        };
    }

    /**
     * Restaura el estado de la app desde un objeto serializado
     */
    function restaurarEstado(data) {
        if (!data) return false;

        // Modo y tipo
        App.setMode(data.modo || 'conocido');
        App.setTipo(data.tipoSistema || '3f');

        // Tension
        var tensionBtn = document.querySelector('.voltage-btn.active');
        document.getElementById('input-tension').value = data.tension || 220;

        // Fuente
        if (data.fuente) {
            var elIscConocido = document.getElementById('input-isc-conocido');
            if (elIscConocido) elIscConocido.value = data.fuente.iscConocido || '';
            var elIscFuente = document.getElementById('input-isc-fuente');
            if (elIscFuente) elIscFuente.value = data.fuente.iscFuente || '';
            var elXrFuente = document.getElementById('input-xr-fuente');
            if (elXrFuente) elXrFuente.value = data.fuente.xrFuente || 15;
            var elTrafoKva = document.getElementById('input-trafo-kva');
            if (elTrafoKva) elTrafoKva.value = data.fuente.trafoKva || '';
            var elTrafoZ = document.getElementById('input-trafo-z');
            if (elTrafoZ) elTrafoZ.value = data.fuente.trafoZ || '';
            var elTrafoVp = document.getElementById('input-trafo-vp');
            if (elTrafoVp) elTrafoVp.value = data.fuente.trafoVp || '';
            var elTrafoVs = document.getElementById('input-trafo-vs');
            if (elTrafoVs) elTrafoVs.value = data.fuente.trafoVs || '';
        }

        // Equipo P0
        if (data.equipP0) {
            document.getElementById('equip-p0-tipo').value = data.equipP0.tipo || '';
            UIEquipos.onTipoChange('p0');
            setTimeout(function() {
                document.getElementById('equip-p0-modelo').value = data.equipP0.modelo || '';
                UIEquipos.onModeloChange('p0');
                document.getElementById('equip-p0-cap').value = data.equipP0.cap || '';
            }, 50);
        }

        // Nodos / Feeders (Fase 9: Support both old and new structure)
        if (data.nodos && Array.isArray(data.nodos)) {
            // New tree structure
            if (typeof App !== 'undefined' && App.estado) {
                App.estado.nodos = data.nodos.map(function(n) {
                    return {
                        id: n.id || 'P0',
                        parentId: n.parentId || null,
                        nombre: n.nombre || n.id,
                        feeder: {
                            calibre: (n.feeder && n.feeder.calibre) || '4/0',
                            material: (n.feeder && n.feeder.material) || 'cobre',
                            canalizacion: (n.feeder && n.feeder.canalizacion) || 'acero',
                            longitud: (n.feeder && n.feeder.longitud) || 20,
                            paralelo: (n.feeder && n.feeder.paralelo) || 1,
                            cargaA: (n.feeder && n.feeder.cargaA) || 0,
                            cargaFP: (n.feeder && n.feeder.cargaFP) || 0,
                            fc: (n.feeder && n.feeder.fc) || 0.8,
                            ft: (n.feeder && n.feeder.ft) || 0.91,
                            numConductores: (n.feeder && n.feeder.numConductores) || 3
                        },
                        equip: {
                            tipo: (n.equip && n.equip.tipo) || '',
                            modelo: (n.equip && n.equip.modelo) || '',
                            cap: (n.equip && n.equip.cap) || 0,
                            iDisparo: (n.equip && n.equip.iDisparo) || 0,
                            nombre: (n.equip && n.equip.nombre) || ''
                        }
                    };
                });
            }
        } else if (data.feeders && Array.isArray(data.feeders)) {
            // Legacy linear structure - convert to tree
            if (typeof App !== 'undefined' && App.estado) {
                App.estado.nodos = data.feeders.map(function(f, i) {
                    return {
                        id: 'P' + i,
                        parentId: i === 0 ? null : 'P' + (i - 1),
                        nombre: 'Punto ' + i,
                        feeder: {
                            calibre: f.calibre || '4/0',
                            material: f.material || 'cobre',
                            canalizacion: f.canalizacion || 'acero',
                            longitud: f.longitud || 20,
                            paralelo: f.paralelo || 1,
                            cargaA: f.cargaA || 0,
                            cargaFP: f.cargaFP || 0
                        },
                        equip: {
                            tipo: f.equipTipo || '',
                            modelo: f.equipModelo || '',
                            cap: f.equipCap || 0,
                            iDisparo: f.equipIDisparo || 0,
                            nombre: ''
                        }
                    };
                });
            }
        }

        // Re-renderizar
        UIAlimentadores.renderizar();
        if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        return true;
    }

    /**
     * Abre el modal de proyectos
     */
    function abrirModal() {
        document.getElementById('modal-proyectos').classList.remove('hidden');
        renderLista();
    }

    /**
     * Cierra el modal
     */
    function cerrarModal() {
        document.getElementById('modal-proyectos').classList.add('hidden');
    }

    /**
     * Renderiza la lista de proyectos guardados
     */
    function renderLista() {
        var lista = document.getElementById('proyectos-lista');
        var proyectos = leerTodos();
        var keys = Object.keys(proyectos);

        if (keys.length === 0) {
            lista.textContent = '';
            var p = document.createElement('p');
            p.className = 'text-sm text-[--text-muted] text-center py-4';
            p.textContent = 'No hay proyectos guardados.';
            lista.appendChild(p);
            return;
        }

        lista.textContent = '';
        keys.sort().reverse().forEach(function(nombre) {
            var p = proyectos[nombre];
            var fecha = p.fechaGuardado ? new Date(p.fechaGuardado).toLocaleString('es-MX') : 'Sin fecha';
            // Fase 9: Use nodos if available, fallback to feeders
            var numNodos = p.nodos ? p.nodos.length : (p.feeders ? p.feeders.length : 0);
            var tension = p.tension ? p.tension + 'V' : '';
            var tipo = p.tipoSistema === '3f' ? '3\u03c6' : '1\u03c6';

            var div = document.createElement('div');
            div.className = 'bg-[--surface] p-3 rounded-lg border border-[--border] hover:border-[--border-light] transition-colors';
            
            var header = document.createElement('div');
            header.className = 'flex justify-between items-start mb-2';
            
            var leftDiv = document.createElement('div');
            var titleP = document.createElement('p');
            titleP.className = 'text-sm font-semibold text-[--text]';
            titleP.textContent = nombre;
            var infoP = document.createElement('p');
            infoP.className = 'text-[0.65rem] text-[--text-muted]';
            infoP.textContent = tension + ' ' + tipo + ' · ' + numNodos + ' nodos · ' + fecha;
            leftDiv.appendChild(titleP);
            leftDiv.appendChild(infoP);
            
            var rightDiv = document.createElement('div');
            rightDiv.className = 'flex gap-1';
            
            var loadBtn = document.createElement('button');
            loadBtn.className = 'btn-sm';
            loadBtn.title = 'Cargar';
            var loadIcon = document.createElement('i');
            loadIcon.className = 'fas fa-folder-open text-[0.65rem]';
            loadBtn.appendChild(loadIcon);
            loadBtn.onclick = function() { UIProyectos.cargar(nombre); };
            
            var renameBtn = document.createElement('button');
            renameBtn.className = 'btn-sm';
            renameBtn.title = 'Renombrar';
            var renameIcon = document.createElement('i');
            renameIcon.className = 'fas fa-pen text-[0.65rem]';
            renameBtn.appendChild(renameIcon);
            renameBtn.onclick = function() { UIProyectos.renombrar(nombre); };
            
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-sm danger';
            deleteBtn.title = 'Borrar';
            var deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash text-[0.65rem]';
            deleteBtn.appendChild(deleteIcon);
            deleteBtn.onclick = function() { UIProyectos.borrar(nombre); };
            
            rightDiv.appendChild(loadBtn);
            rightDiv.appendChild(renameBtn);
            rightDiv.appendChild(deleteBtn);
            
            header.appendChild(leftDiv);
            header.appendChild(rightDiv);
            div.appendChild(header);
            lista.appendChild(div);
        });
    }

    /**
     * Guarda el estado actual con un nombre
     */
    function guardar() {
        try {
            var nombre = prompt('Nombre del proyecto:');
            if (!nombre || !nombre.trim()) { UIToast.mostrar('Nombre vacio, no se guardo', 'info'); return; }
            nombre = nombre.trim();

            // Si ya existe, confirmar sobreescribir
            var proyectos = leerTodos();
            if (proyectos[nombre]) {
                if (!confirm('El proyecto "' + nombre + '" ya existe. \u00bfSobreescribir?')) return;
            }

            var estado = serializarEstado();
            proyectos[nombre] = estado;
            escribirTodos(proyectos);
            renderLista();
            UIToast.mostrar('Proyecto "' + nombre + '" guardado', 'success');
        } catch (e) {
            console.error('Error guardando proyecto:', e);
            UIToast.mostrar('Error al guardar: ' + e.message, 'error');
        }
    }

    /**
     * Carga un proyecto por nombre
     */
    function cargar(nombre) {
        var proyectos = leerTodos();
        if (!proyectos[nombre]) { UIToast.mostrar('Proyecto no encontrado', 'error'); return; }

        var exito = restaurarEstado(proyectos[nombre]);
        if (exito) {
            cerrarModal();
            UIToast.mostrar('Proyecto "' + nombre + '" cargado', 'success');
        } else {
            UIToast.mostrar('Error al restaurar el proyecto', 'error');
        }
    }

    /**
     * Renombra un proyecto
     */
    function renombrar(nombreActual) {
        var nuevoNombre = prompt('Nuevo nombre:', nombreActual);
        if (!nuevoNombre || !nuevoNombre.trim() || nuevoNombre.trim() === nombreActual) return;
        nuevoNombre = nuevoNombre.trim();

        var proyectos = leerTodos();
        if (!proyectos[nombreActual]) return;
        if (proyectos[nuevoNombre]) { UIToast.mostrar('Ya existe un proyecto con ese nombre', 'error'); return; }

        proyectos[nuevoNombre] = proyectos[nombreActual];
        delete proyectos[nombreActual];
        escribirTodos(proyectos);
        renderLista();
        UIToast.mostrar('Proyecto renombrado', 'success');
    }

    /**
     * Borra un proyecto por nombre
     */
    function borrar(nombre) {
        if (!confirm('\u00bfBorrar el proyecto "' + nombre + '"?')) return;
        var proyectos = leerTodos();
        delete proyectos[nombre];
        escribirTodos(proyectos);
        renderLista();
        UIToast.mostrar('Proyecto borrado', 'info');
    }

    /**
     * Exporta el estado actual como archivo JSON descargable
     */
    function exportarJSON() {
        var data = serializarEstado();
        var json = JSON.stringify(data, null, 2);
        var nombreArchivo = 'cortocircuito_' + (data.tension || 220) + 'V_' + new Date().toISOString().slice(0, 10) + '.json';
        descargarArchivo(nombreArchivo, json, 'application/json');
        UIToast.mostrar('Archivo JSON exportado', 'success');
    }

    /**
     * Importa un proyecto desde archivo JSON
     */
    function importarJSON(event) {
        var archivo = event.target && event.target.files && event.target.files[0];
        if (!archivo) return;

        var lector = new FileReader();
        lector.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                // Fase 9: Accept both nodos (new) and feeders (legacy)
                if (!data.nodos && !data.feeders) { UIToast.mostrar('Archivo no valido: no contiene datos de nodos o alimentadores', 'error'); return; }
                var exito = restaurarEstado(data);
                if (exito) {
                    UIToast.mostrar('Proyecto importado: ' + archivo.name, 'success');
                } else {
                    UIToast.mostrar('Error al importar el proyecto', 'error');
                }
            } catch (err) {
                UIToast.mostrar('Error al leer el archivo JSON', 'error');
            }
        };
        lector.readAsText(archivo);
        // Limpiar el input para permitir re-importar el mismo archivo
        event.target.value = '';
    }

    /**
     * Descarga un archivo generado en el navegador
     */
    function descargarArchivo(nombre, contenido, tipo) {
        var blob = new Blob([contenido], { type: tipo });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        abrirModal: abrirModal,
        cerrarModal: cerrarModal,
        renderLista: renderLista,
        guardar: guardar,
        cargar: cargar,
        renombrar: renombrar,
        borrar: borrar,
        exportarJSON: exportarJSON,
        importarJSON: importarJSON
    };
})();

if (typeof window !== 'undefined') {
    window.UIProyectos = UIProyectos;
}


