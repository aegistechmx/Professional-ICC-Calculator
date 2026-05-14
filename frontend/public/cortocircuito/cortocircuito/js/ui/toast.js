/**
 * toast.js
 * Sistema de notificaciones flotantes.
 */
var UIToast = (function() {

    var ICONOS = { error: 'fa-times-circle', success: 'fa-check-circle', info: 'fa-info-circle' };
    var COLORES = { error: 'var(--red)', success: 'var(--green)', info: 'var(--cyan)' };

    function mostrar(msg, tipo) {
        tipo = tipo || 'info';
        var container = document.getElementById('toast-container');
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + tipo;
        var icono = document.createElement('i');
        icono.className = 'fas ' + (ICONOS[tipo] || 'fa-info-circle');
        icono.style.color = COLORES[tipo] || COLORES.info;
        var span = document.createElement('span');
        span.textContent = msg;
        toast.appendChild(icono);
        toast.appendChild(span);
        container.appendChild(toast);

        setTimeout(function() {
            toast.style.animation = 'toastOut .3s ease-in forwards';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3500);
    }

    return { mostrar: mostrar };
})();

if (typeof window !== 'undefined') {
    window.UIToast = UIToast;
}