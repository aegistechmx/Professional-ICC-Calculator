/**
 * motor_consistencia.js — Detector de Inconsistencias (Nivel ETAP/SKM)
 * Detecta, explica, bloquea y autocorrige antes de correr el motor principal
 * Reglas físicas + NOM con scoring de severidad y trazabilidad
 */

var MotorConsistencia = (function() {

    /**
     * Sube al siguiente interruptor disponible
     */
    function subirInterruptor(prot) {
        const catalogo = [
            { In: 100, kA: 10, nombre: '100A 10kA' },
            { In: 200, kA: 18, nombre: '200A 18kA' },
            { In: 400, kA: 25, nombre: '400A 25kA' },
            { In: 600, kA: 35, nombre: '600A 35kA' },
            { In: 800, kA: 50, nombre: '800A 50kA' },
            { In: 1200, kA: 65, nombre: '1200A 65kA' },
            { In: 2000, kA: 100, nombre: '2000A 100kA' }
        ];

        var idx = catalogo.findIndex(e => e.In === prot.In);
        if (idx >= 0 && idx < catalogo.length - 1) {
            return catalogo[idx + 1];
        }
        return prot;
    }

    /**
     * Detecta inconsistencias en el sistema
     * @param {Object} sistema - Estado completo del sistema
     * @returns {Object} Reporte de consistencia
     */
    function detectarInconsistencias(sistema) {
        var issues = [];
        var fixes = [];

        function push(issue) {
            issues.push(issue);
        }

        // =========================
        // A. FUENTE / MODO
        // =========================
        if (sistema.modo === "conocido") {
            var iscConocido = sistema.Isc || 0;
            if (!iscConocido || iscConocido <= 0) {
                push({
                    code: "SRC_MODE_001",
                    level: "ERROR",
                    message: "Modo conocido sin Isc válido",
                    node: "FUENTE",
                    autoFix: function() {
                        sistema.modo = "completo";
                        fixes.push("Modo cambiado a completo (SRC_MODE_001)");
                    }
                });
            }
        }

        if (sistema.modo === "completo") {
            if (!sistema.kVA || !sistema.Z || !sistema.voltaje) {
                push({
                    code: "SRC_MODE_002",
                    level: "ERROR",
                    message: "Datos de trafo incompletos (kVA, Z% o V)",
                    node: "FUENTE"
                });
            }
        }

        // =========================
        // B. AMPACIDAD (NOM 310 / 110.14)
        // =========================
        if (sistema.amp) {
            if (!sistema.amp.I_final || sistema.amp.I_final <= 0) {
                push({
                    code: "AMP_001",
                    level: "ERROR",
                    message: "Ampacidad final inválida (I_final = 0)",
                    node: sistema.amp.node || "DESCONOCIDO"
                });
            }

            if (sistema.amp.I_final < sistema.amp.I_diseño) {
                push({
                    code: "AMP_002",
                    level: "ERROR",
                    message: "No cumple 125% NOM: I_final=" + (sistema.amp.I_final || 0).toFixed(1) + "A < I_diseño=" + (sistema.amp.I_diseño || 0).toFixed(1) + "A",
                    node: sistema.amp.node || "DESCONOCIDO",
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

            if (sistema.numConductores > 9 && sistema.instalacion === "conduit") {
                push({
                    code: "AMP_003",
                    level: "WARN",
                    message: "Exceso de conductores en conduit (>9). Sugerir charola.",
                    node: sistema.amp.node || "DESCONOCIDO"
                });
            }

            if (!sistema.amp.I_terminal || sistema.amp.I_terminal <= 0) {
                push({
                    code: "AMP_TERM_004",
                    level: "ERROR",
                    message: "Límite de terminal inválido (I_terminal = 0)",
                    node: sistema.amp.node || "DESCONOCIDO",
                    autoFix: function() {
                        sistema.amp.I_terminal = sistema.amp.I_tabla || 0;
                        fixes.push("Terminal corregida a valor de tabla (AMP_TERM_004)");
                    }
                });
            }
        }

        // =========================
        // C. CORTOCIRCUITO (110.9)
        // =========================
        if (!sistema.corto || sistema.corto.Isc <= 0) {
            push({
                code: "SCC_001",
                level: "ERROR",
                message: "Isc inválido (<= 0)",
                node: "FUENTE"
            });
        }

        if (sistema.prot && sistema.corto) {
            if (sistema.prot.kA < sistema.corto.Isc) {
                push({
                    code: "SCC_002",
                    level: "ERROR",
                    message: "Interruptor insuficiente: kA=" + sistema.prot.kA + " < Isc=" + (sistema.corto.Isc || 0).toFixed(2),
                    node: sistema.prot.node || "DESCONOCIDO",
                    autoFix: function() {
                        sistema.prot = subirInterruptor(sistema.prot);
                        fixes.push("Interruptor aumentado (SCC_002)");
                    }
                });
            }
        }

        // =========================
        // D. TCC / COORDINACIÓN
        // =========================
        if (sistema.tcc && sistema.tcc.cruce) {
            push({
                code: "TCC_001",
                level: "ERROR",
                message: "Sin selectividad: curvas se cruzan",
                node: sistema.tcc.node || "DESCONOCIDO",
                autoFix: function() {
                    sistema.tcc.delay = (sistema.tcc.delay || 0) + 0.2;
                    fixes.push("Delay aumentado para selectividad (TCC_001)");
                }
            });
        }

        if (sistema.tcc && sistema.tcc.selectividadParcial) {
            push({
                code: "TCC_002",
                level: "WARN",
                message: "Selectividad parcial (zona limitada)",
                node: sistema.tcc.node || "DESCONOCIDO"
            });
        }

        // =========================
        // E. FALLA A TIERRA (230.95)
        // =========================
        if (sistema.gnd) {
            if (!sistema.gnd.sensible) {
                push({
                    code: "GND_001",
                    level: "ERROR",
                    message: "No detecta falla a tierra: I_falla_min > I_pickup",
                    node: sistema.gnd.node || "DESCONOCIDO"
                });
            }
        }

        // =========================
        // F. ESTADO GLOBAL
        // =========================
        if (sistema.estadoGlobalReportado === "OK" && sistema.hayFailReal) {
            push({
                code: "SYS_001",
                level: "ERROR",
                message: "Inconsistencia: reporte dice OK pero hay FAIL real",
                node: "SISTEMA"
            });
        }

        // =========================
        // APLICAR AUTOFIX (SOLO ERRORES) - DESACTIVADO PARA EVITAR LOOP INFINITO
        // =========================
        // for (var i = 0; i < issues.length; i++) {
        //     if (issues[i].level === "ERROR" && issues[i].autoFix) {
        //         issues[i].autoFix();
        //     }
        // }

        var hasError = issues.some(function(i) { return i.level === "ERROR"; });

        return {
            ok: !hasError,
            issues: issues,
            appliedFixes: [] // No aplicar fixes automáticamente
        };
    }

    /**
     * Sube un calibre (helper)
     */
    function subirCalibre(calibre) {
        const calibres = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
        const idx = calibres.indexOf(calibre.toString());
        if (idx >= 0 && idx < calibres.length - 1) {
            return calibres[idx + 1];
        }
        return '1000';
    }

    return {
        detectarInconsistencias: detectarInconsistencias
    };
})();

if (typeof window !== 'undefined') {
    window.MotorConsistencia = MotorConsistencia;
}
