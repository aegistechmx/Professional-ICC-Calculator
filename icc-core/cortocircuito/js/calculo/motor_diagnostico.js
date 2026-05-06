/**
 * motor_diagnostico.js — Motor de Diagnóstico Global (Nivel ETAP/SKM)
 * Panel inteligente de estado global con semáforo de severidad
 * Detecta, clasifica, explica y propone correcciones automáticas
 */

var SEVERITY = {
    CRITICO: "CRITICO",
    ADVERTENCIA: "ADVERTENCIA",
    OK: "OK"
};

var MotorDiagnostico = (function() {

    /**
     * Motor de diagnóstico global
     * @param {Object} sistema - Estado completo del sistema con nodos
     * @returns {Object} Reporte de diagnóstico con issues y estado global
     */
    function diagnosticoGlobal(sistema) {
        var issues = [];
        var nodos = sistema.puntos || sistema.nodos || [];

        nodos.forEach(function(nodo) {
            var nodoId = nodo.id || nodo.nombre || 'DESCONOCIDO';

            // 🔴 AMPACIDAD (NOM 310 + 110.14)
            if (nodo.CDT && nodo.CDT.I_final <= 0) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "AMPACIDAD",
                    msg: "Ampacidad final inválida (I_final = 0)",
                    node: nodoId,
                    autoFix: function() {
                        sistema.amp.I_terminal = sistema.amp.I_tabla || 0;
                        fixes.push("Terminal corregida a valor de tabla (AMP_TERM_004)");
                    }
                });
            }

            if (nodo.CDT && nodo.CDT.I_final < nodo.CDT.I_diseño) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "AMPACIDAD",
                    msg: "Cable subdimensionado",
                    causa: "I_final " + (nodo.CDT.I_final || 0).toFixed(1) + "A < I_diseño " + (nodo.CDT.I_diseño || 0).toFixed(1) + "A",
                    node: nodoId,
                    autoFix: function() {
                        if (sistema.paralelo < 4) {
                            sistema.paralelo++;
                            fixes.push("Paralelo aumentado (AMP_002)");
                        } else {
                            sistema.calibre = subirCalibre(sistema.calibre);
                            sistema.paralelo = 1;
                            fixes.push("Calibre aumentado (AMP_002)");
                        }
                    }
                });
            }

            // 🟡 FACTOR AGRUPAMIENTO
            if (nodo.CDT && nodo.CDT.F_agrupamiento < 0.6) {
                issues.push({
                    nivel: "ADVERTENCIA",
                    nodo: nodoId,
                    tipo: "AGRUPAMIENTO",
                    msg: "Factor de agrupamiento muy bajo",
                    causa: "Demasiados conductores en canalización",
                    node: nodoId
                });
            }

            // 🔴 INTERRUPTOR (110.9)
            var interruptorKA = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0;
            var iscTotal = (nodo.isc + (nodo.aporteMotores ? nodo.aporteMotores.isc : 0));
            if (interruptorKA > 0 && iscTotal > interruptorKA) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "CORTOCIRCUITO",
                    msg: "Interruptor no soporta Isc",
                    causa: "Isc " + (iscTotal || 0).toFixed(2) + "kA > Capacidad " + interruptorKA + "kA",
                    node: nodoId,
                    autoFix: function() {
                        sistema.prot = subirInterruptor(sistema.prot);
                        fixes.push("Interruptor aumentado (SCC_002)");
                    }
                });
            }

            // 🔴 FALLA A TIERRA
            if (nodo.faseTierra && !nodo.faseTierra.sensible) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "PROTECCION",
                    msg: "No detecta falla a tierra",
                    causa: "Pickup muy alto o Z0 elevada",
                    node: nodoId
                });
            }

            // 🔴 COORDINACIÓN
            if (nodo.decision && nodo.decision.estadoGlobal === "FAIL") {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "SISTEMA",
                    msg: "Estado global FAIL",
                    causa: (nodo.decision.errores || []).join('; ') || "Error desconocido",
                    fix: "Revisar validaciones NOM"
                });
            }
        });

        // Verificar estado global del sistema
        if (sistema.estadoGlobal === "FAIL") {
            issues.push({
                nivel: "CRITICO",
                nodo: "SISTEMA",
                tipo: "ESTADO_GLOBAL",
                msg: "Estado global del sistema es FAIL",
                causa: (sistema.erroresGlobales || []).join('; ') || "Errores acumulados",
                fix: "Revisar todos los nodos"
            });
        }

        return issues;
    }

    /**
     * Genera resumen de severidad
     * @param {Array} issues - Lista de issues
     * @returns {Object} Resumen con conteos y estado global
     */
    function generarResumen(issues) {
        var criticos = issues.filter(function(i) { return i.nivel === "CRITICO"; }).length;
        var advertencias = issues.filter(function(i) { return i.nivel === "ADVERTENCIA"; }).length;

        var estadoGlobal;
        if (criticos > 0) {
            estadoGlobal = "[X] CRÍTICO";
        } else if (advertencias > 0) {
            estadoGlobal = "[!] ADVERTENCIAS";
        } else {
            estadoGlobal = "[OK] SISTEMA ÓPTIMO";
        }

        return {
            criticos: criticos,
            advertencias: advertencias,
            estadoGlobal: estadoGlobal
        };
    }

    /**
     * Genera HTML del panel semáforo
     * @param {Array} issues - Lista de issues
     * @returns {string} HTML del panel
     */
    function renderSemaforo(issues) {
        var resumen = generarResumen(issues);

        var html = '<div class="panel-semaforo">';
        html += '<h2>' + resumen.estadoGlobal + '</h2>';
        html += '<div class="stats">';
        html += '[X] ' + resumen.criticos + ' críticos<br>';
        html += '[!] ' + resumen.advertencias + ' advertencias';
        html += '</div>';

        if (issues.length > 0) {
            html += '<div class="issues-list">';
            issues.forEach(function(i) {
                var icono = i.nivel === "CRITICO" ? "[X]" : "[!]";
                var clase = i.nivel === "CRITICO" ? "issue-critico" : "issue-advertencia";
                html += '<div class="issue ' + clase + '">';
                html += '<b>' + icono + ' ' + i.tipo + ' - ' + i.nodo + '</b>';
                html += '<div><b>Problema:</b> ' + i.msg + '</div>';
                html += '<div><b>Causa:</b> ' + i.causa + '</div>';
                html += '<div><b>Corrección:</b> ' + i.fix + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Auto-corregir sistema basado en issues
     * @param {Object} sistema - Estado del sistema
     * @param {Array} issues - Lista de issues
     * @returns {Object} Resultado con fixes aplicados
     */
    function autoCorregirSistema(sistema, issues) {
        var fixes = [];
        var nodos = sistema.puntos || sistema.nodos || [];

        issues.forEach(function(issue) {
            if (issue.nivel !== "CRITICO") return;

            var nodo = nodos.find(function(n) { return (n.id || n.nombre) === issue.nodo; });
            if (!nodo) return;

            switch (issue.tipo) {
                case "AMPACIDAD":
                    if (nodo.feeder) {
                        if (nodo.feeder.paralelo < 4) {
                            nodo.feeder.paralelo++;
                            fixes.push("Paralelo aumentado en " + issue.nodo);
                        } else {
                            // Subir calibre
                            var calibres = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
                            var idx = calibres.indexOf(nodo.feeder.calibre);
                            if (idx >= 0 && idx < calibres.length - 1) {
                                nodo.feeder.calibre = calibres[idx + 1];
                                nodo.feeder.paralelo = 1;
                                fixes.push("Calibre aumentado en " + issue.nodo);
                            }
                        }
                    }
                    break;

                case "CORTOCIRCUITO":
                    if (nodo.equip) {
                        // Subir capacidad del interruptor
                        var capacidades = [100, 200, 400, 600, 800, 1200, 2000];
                        var idx = capacidades.indexOf(nodo.equip.cap);
                        if (idx >= 0 && idx < capacidades.length - 1) {
                            nodo.equip.cap = capacidades[idx + 1];
                            fixes.push("Interruptor aumentado en " + issue.nodo);
                        }
                    }
                    break;
            }
        });

        return {
            ok: true,
            fixes: fixes
        };
    }

    return {
        diagnosticoGlobal: diagnosticoGlobal,
        generarResumen: generarResumen,
        renderSemaforo: renderSemaforo,
        autoCorregirSistema: autoCorregirSistema,
        SEVERITY: SEVERITY
    };
})();

if (typeof window !== 'undefined') {
    window.MotorDiagnostico = MotorDiagnostico;
}
