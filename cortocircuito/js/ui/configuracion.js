/**
 * configuracion.js
 * Maneja los controles de modo, tipo de sistema y tension.
 */
var UIConfiguracion = (function() {

    function setMode(m) {
        try {
            if (typeof App !== 'undefined' && App.estado) {
                App.estado.modo = m;
            }
            var btnConocido = document.getElementById('btn-conocido');
            var btnCompleto = document.getElementById('btn-completo');
            var modoConocido = document.getElementById('modo-conocido');
            var modoCompleto = document.getElementById('modo-completo');
            if (btnConocido) btnConocido.classList.toggle('active', m === 'conocido');
            if (btnCompleto) btnCompleto.classList.toggle('active', m === 'completo');
            if (modoConocido) modoConocido.classList.toggle('hidden', m !== 'conocido');
            if (modoCompleto) modoCompleto.classList.toggle('hidden', m !== 'completo');
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        } catch (e) {
            console.error('Error en setMode:', e);
        }
    }

    function setTipo(t) {
        try {
            if (typeof App !== 'undefined' && App.estado) {
                App.estado.tipoSistema = t;
            }
            var btn3f = document.getElementById('btn-3f');
            var btn1f = document.getElementById('btn-1f');
            if (btn3f) btn3f.classList.toggle('active', t === '3f');
            if (btn1f) btn1f.classList.toggle('active', t === '1f');
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        } catch (e) {
            console.error('Error en setTipo:', e);
        }
    }

    function setVoltage(v, btn) {
        try {
            var inputTension = document.getElementById('input-tension');
            if (inputTension) inputTension.value = v;
            var voltageBtns = document.querySelectorAll('.voltage-btn');
            if (voltageBtns) {
                voltageBtns.forEach(function(b) { b.classList.remove('active'); });
            }
            if (btn) btn.classList.add('active');
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        } catch (e) {
            console.error('Error en setVoltage:', e);
        }
    }

    function setTrafoVs(v, btn) {
        try {
            var inputTrafoVs = document.getElementById('input-trafo-vs');
            if (inputTrafoVs) inputTrafoVs.value = v;
            var parent = btn ? btn.parentElement : null;
            if (parent) {
                var trafoVsBtns = parent.querySelectorAll('.voltage-btn');
                if (trafoVsBtns) {
                    trafoVsBtns.forEach(function(b) { b.classList.remove('active'); });
                }
            }
            if (btn) btn.classList.add('active');
            if (typeof App !== 'undefined' && App.clearResults) { App.clearResults(); }
        } catch (e) {
            console.error('Error en setTrafoVs:', e);
        }
    }

    function toggleCollapse(id, btn) {
        try {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('open');
            var icon = btn ? btn.querySelector('.fa-chevron-down') : null;
            if (icon) icon.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
        } catch (e) {
            console.error('Error en toggleCollapse:', e);
        }
    }

    return {
        setMode: setMode,
        setTipo: setTipo,
        setVoltage: setVoltage,
        setTrafoVs: setTrafoVs,
        toggleCollapse: toggleCollapse
    };
})();

if (typeof window !== 'undefined') {
    window.UIConfiguracion = UIConfiguracion;
}


