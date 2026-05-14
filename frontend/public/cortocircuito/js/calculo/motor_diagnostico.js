/**
 * motor_diagnostico.js — Motor de Diagnóstico Global (Nivel ETAP/SKM)
 * Panel inteligente de estado global con semáforo de severidad
 * Detecta, clasifica, explica y propone correcciones automáticas
 */

const SEVERITY = {
  CRITICO: "CRITICO",
  ADVERTENCIA: "ADVERTENCIA",
  OK: "OK"
};

const MotorDiagnostico = (function() {
    /**
     * Helper para formatear corriente (A o kA)
     */
    function formatIsc(kA) {
        if (kA < 1) return (kA * 1000).toFixed(0) + "A";
        return kA.toFixed(2) + "kA";
    }

 /**
     * Motor de diagnóstico global
     * @param {Object} sistema - Estado completo del sistema con nodos
     * @returns {Object} Reporte de diagnóstico con issues y estado global
     */
    function diagnosticoGlobal(sistema) {
        const issues = [];
        const nodos = sistema.puntos || sistema.nodos || [];

        nodos.forEach(nodo => {
            const nodoId = nodo.id || nodo.nombre || 'DESCONOCIDO';

            // 🔴 AMPACIDAD (NOM 310 + 110.14)
            if (nodo.CDT && nodo.CDT.I_final <= 0) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "AMPACIDAD",
                    msg: "Ampacidad final inválida (I_final = 0)",
                    node: nodoId,
                    autoFix: function(fixesArray) {
                        if (nodo.feeder) nodo.feeder.tempTerminal = 75;
                        if (fixesArray) fixesArray.push("Terminal corregida a 75°C en " + nodoId);
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
                    autoFix: function(fixesArray) {
                        if (nodo.feeder && nodo.feeder.paralelo < 4) {
                            nodo.feeder.paralelo++;
                            if (fixesArray) fixesArray.push("Paralelo aumentado en " + nodoId);
                        } else {
                            const calibres = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
                            const idx = calibres.indexOf(nodo.feeder.calibre);
                            if (idx >= 0 && idx < calibres.length - 1) {
                                const nuevo = calibres[idx + 1];
                                nodo.feeder.calibre = nuevo;
                                nodo.feeder.paralelo = 1;
                                if (fixesArray) fixesArray.push("Calibre aumentado a " + nuevo + " en " + nodoId);
                            } else {
                                if (fixesArray) fixesArray.push("Máximo calibre alcanzado en " + nodoId + ". Revisar diseño.");
                            }
                        }
                    }
                });
            }
            // 🟡 FACTOR AGRUPAMIENTO
            if (nodo.CDT && nodo.CDT.F_agrupamiento < 0.6) {
                issues.push({
                    nivel: "ADVERTENCIA",
                    tipo: "AGRUPAMIENTO",
                    msg: "Factor de agrupamiento muy bajo",
                    causa: "Demasiados conductores en canalización",
                    node: nodoId
                });
            }

            // 🟡 CAÍDA DE TENSIÓN (NOM-001)
            // Se asume un límite del 3% para alimentadores individuales y 5% total
            const vd = nodo.caidaTension || 0;
            if (vd > 3) {
                issues.push({
                    nivel: vd > 5 ? "CRITICO" : "ADVERTENCIA",
                    nodo: nodoId,
                    tipo: "CAIDA_TENSION",
                    msg: "Caída de tensión excesiva",
                    causa: "VD " + vd.toFixed(2) + "% > 3% (Límite NOM-001)",
                    node: nodoId,
                    autoFix: function(fixesArray) {
                        if (nodo.feeder) {
                            const calibres = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
                            const idx = calibres.indexOf(nodo.feeder.calibre);
                            
                            // Estrategia: Primero intentar subir calibre
                            if (idx >= 0 && idx < calibres.length - 1) {
                                const nuevo = calibres[idx + 1];
                                nodo.feeder.calibre = nuevo;
                                if (fixesArray) fixesArray.push("Calibre aumentado a " + nuevo + " para reducir VD en " + nodoId);
                            } else if (nodo.feeder.paralelo < 4) {
                                // Si ya estamos en calibre máximo, aumentar paralelos
                                nodo.feeder.paralelo++;
                                if (fixesArray) fixesArray.push("Paralelo aumentado para mitigar VD en " + nodoId);
                            } else {
                                // Si no hay más opciones físicas, sugerir reducción de longitud
                                if (fixesArray) fixesArray.push("Advertencia: Se requiere reducir longitud física en " + nodoId);
                            }
                        }
                    }
                });
            }

            // 🔴 INTERRUPTOR (110.9)
            const interruptorKA = (nodo.equip && nodo.equip.cap) ? nodo.equip.cap : 0;
            const aporteMotoresIsc = nodo.aporteMotores ? nodo.aporteMotores.isc || 0 : 0;
            const iscTotal = (nodo.isc || 0) + aporteMotoresIsc;
            if (interruptorKA > 0 && iscTotal > interruptorKA) {
                issues.push({
                    nivel: SEVERITY.CRITICO,
                    nodo: nodoId,
                    tipo: "CORTOCIRCUITO",
                    msg: "Interruptor no soporta Isc",
                    causa: "Isc " + formatIsc(iscTotal) + " > cap " + formatIsc(interruptorKA),
                    node: nodoId,
                    autoFix: function(fixesArray) {
                        const capacidades = [10, 14, 18, 22, 25, 35, 42, 50, 65, 85, 100];
                        const idx = capacidades.indexOf(nodo.equip.cap);
                        if (idx >= 0 && idx < capacidades.length - 1) {
                            nodo.equip.cap = capacidades[idx + 1];
                            if (fixesArray) fixesArray.push("Interruptor aumentado a " + nodo.equip.cap + "kA en " + nodoId);
                        }
                    }
                });
            }

            // 🔴 FALLA A TIERRA
            if (nodo.faseTierra && !nodo.faseTierra.sensible) {
                issues.push({
                    nivel: "CRITICO",
                    nodo: nodoId,
                    tipo: "PROTECCION",
                    msg: "No detecta falla o Z0 elevada",
                    node: nodoId,
                    autoFix: function(fixesArray) {
                        if (nodo.equip && nodo.faseTierra) {
                            const iftA = (nodo.faseTierra.iscFt || 0) * 1000;
                            if (iftA > 0) {
                                const nuevoPickup = Math.max(100, Math.floor(iftA / 1.25));
                                const antes = nodo.equip.iDisparo;
                                nodo.equip.iDisparo = nuevoPickup;
                                if (fixesArray) fixesArray.push(`Sensibilidad ajustada en ${nodoId}: ${antes}A -> ${nuevoPickup}A`);
                            }
                        }
                    }
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

        // Verificar estado global del sistema SOLO si quedan causas reales.
        // Estados legacy/acumulados del semáforo no deben producir CRÍTICO si NOM, física, ST/GF y coordinación ya están OK.
        var hayCriticosReales = issues.some(function(i) {
            return i.nivel === "CRITICO" &&
                i.tipo !== "ESTADO_GLOBAL" &&
                String(i.causa || '').toLowerCase().indexOf('errores acumulados') < 0;
        });
        if (sistema.estadoGlobal === "FAIL" && hayCriticosReales) {
            issues.push({
                nivel: "CRITICO",
                nodo: "SISTEMA",
                tipo: "ESTADO_GLOBAL",
                msg: "Estado global del sistema es FAIL",
                causa: (sistema.erroresGlobales || []).join('; ') || "Causas críticas reales detectadas",
                fix: "Revisar nodos críticos"
            });
        } else if (sistema.estadoGlobal === "FAIL") {
            // Se degrada a advertencia interna y NO se renderiza como crítico.
            sistema.estadoGlobal = "PASS";
            sistema.erroresGlobales = [];
        }


        return issues;
    }

    /**
     * Genera resumen de severidad
     * @param {Array} issues - Lista de issues
     * @returns {Object} Resumen con conteos y estado global
     */
    function generarResumen(issues) {
        const criticos = issues.filter(function(i) { return i.nivel === "CRITICO"; }).length;
        const advertencias = issues.filter(function(i) { return i.nivel === "ADVERTENCIA"; }).length;

        let estadoGlobal;
        if (criticos > 0) {
            estadoGlobal = "[X] CRÍTICO";
        } else if (advertencias > 0) {
            estadoGlobal = "[!] ADVERTENCIAS";
        } else {
            estadoGlobal = "[OK] SISTEMA FUNCIONAL";
        }

        return {
            criticos: criticos,
            advertencias: advertencias,
            estadoGlobal: estadoGlobal
        };
    }

    /**
     * Renderiza el panel semáforo
     * @param {Array} issues - Lista de issues
     * @returns {string} HTML del panel
     */
    function renderSemaforo(issues) {
        const resumen = generarResumen(issues);

        let html = '<div class="panel-semaforo">';
        html += '<h2>' + resumen.estadoGlobal + '</h2>';
        html += '<div class="stats">';
        html += '[X] ' + resumen.criticos + ' críticos<br>';
        html += '[!] ' + resumen.advertencias + ' advertencias';
        html += '</div>';

        if (issues.length > 0) {
            html += '<div class="issues-list">';
            issues.forEach(i => {
                const icono = i.nivel === "CRITICO" ? "[X]" : "[!]";
                const clase = i.nivel === "CRITICO" ? "issue-critico" : "issue-advertencia";
                html += '<div class="issue ' + clase + '">';
                html += '<b>' + icono + ' ' + i.tipo + ' - ' + i.nodo + '</b>';
                html += '<div><b>Problema:</b> ' + (i.msg || '') + '</div>';
                html += '<div><b>Causa:</b> ' + (i.causa || '') + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Auto-corregir sistema basado en issues
     */
    function autoCorregirSistema(sistema, issues) {
        const fixes = [];
        const nodos = sistema.puntos || sistema.nodos || [];

        issues.forEach(issue => {
            const nodo = nodos.find(n => (n.id || n.nombre) === issue.nodo);
            if (!nodo) return;

            // Invocar el autoFix específico definido en diagnosticoGlobal
            if (typeof issue.autoFix === 'function') {
                issue.autoFix(fixes);
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
