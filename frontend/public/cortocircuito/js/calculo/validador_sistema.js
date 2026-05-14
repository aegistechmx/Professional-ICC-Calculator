/**
 * validador_sistema.js — Validador profundo del sistema
 * Nivel: pre-cálculo + sanity check + protección anti-basura
 * Detecta inputs válidos pero físicamente imposibles
 */
var ValidadorSistema = (function() {

    /**
     * Validación completa del sistema
     * @param {Object} estado - Estado del sistema (nodos, equipos, etc.)
     * @returns {Object} { ok: boolean, errores: [], warnings: [] }
     */
    function validarTodo(estado) {
        var errores = [];
        var warnings = [];

        validarConductores(estado, errores, warnings);
        validarInterruptores(estado, errores, warnings);
        validarCDT(estado, errores, warnings);
        validarSistemaElectrico(estado, errores, warnings);

        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }

    // =========================
    // 🔌 CONDUCTORES
    // =========================
    function validarConductores(estado, errores, warnings) {
        if (!estado.nodos) return;

        estado.nodos.forEach(function(nodo) {
            var f = nodo.feeder;
            if (!f) return;

            // Validar calibre existe en tabla
            if (typeof AmpacidadReal !== 'undefined' && AmpacidadReal.tablaAmpacidad) {
                if (!AmpacidadReal.tablaAmpacidad[f.calibre]) {
                    errores.push('Nodo ' + nodo.id + ': calibre inválido (' + f.calibre + ') no existe en tabla');
                }
            }

            // Validar número de conductores
            if (f.numConductores && f.numConductores <= 0) {
                errores.push('Nodo ' + nodo.id + ': número de conductores inválido (debe ser >= 1)');
            }

            // Validar paralelos
            if (f.paralelo && f.paralelo <= 0) {
                errores.push('Nodo ' + nodo.id + ': paralelos inválidos (debe ser >= 1)');
            }

            // Validar longitud
            if (f.longitud && f.longitud <= 0) {
                errores.push('Nodo ' + nodo.id + ': longitud inválida (debe ser > 0)');
            }

            // Validar carga
            if (f.cargaA && f.cargaA <= 0) {
                errores.push('Nodo ' + nodo.id + ': carga inválida (debe ser > 0)');
            }

            // Validar factor de potencia
            if (f.cargaFP && (f.cargaFP <= 0 || f.cargaFP > 1)) {
                errores.push('Nodo ' + nodo.id + ': factor de potencia inválido (debe estar entre 0 y 1)');
            }

            // Validar consistencia material-calibre
            if (f.material === 'aluminio' && f.calibre && parseInt(f.calibre) < 250) {
                warnings.push('Nodo ' + nodo.id + ': aluminio con calibre pequeño (<250 kcmil) puede tener problemas mecánicos');
            }
        });
    }

    // =========================
    // ⚡ INTERRUPTORES
    // =========================
    function validarInterruptores(estado, errores, warnings) {
        if (!estado.nodos) return;

        estado.nodos.forEach(function(nodo) {
            var eq = nodo.equip;
            if (!eq) return;

            // Validar capacidad
            if (eq.cap && eq.cap <= 0) {
                errores.push('Nodo ' + nodo.id + ': capacidad interruptiva inválida (debe ser > 0)');
            }

            // Validar consistencia nominal vs capacidad
            if (eq.iNominal && eq.cap && eq.iNominal > eq.cap * 1000) {
                warnings.push('Nodo ' + nodo.id + ': nominal (' + eq.iNominal + 'A) > capacidad interruptiva (' + (eq.cap * 1000) + 'A)');
            }

            // Validar tipo de equipo
            if (!eq.tipo && !eq.modelo) {
                warnings.push('Nodo ' + nodo.id + ': sin tipo/modelo de equipo especificado');
            }

            // Validar capacidad vs Isc (si ya calculado)
            if (nodo.isc && eq.cap && nodo.isc * 1000 > eq.cap * 1000) {
                errores.push('Nodo ' + nodo.id + ': interruptor insuficiente: Isc=' + ((nodo.isc * 1000) || 0).toFixed(0) + 'A > Cap=' + ((eq.cap * 1000) || 0).toFixed(0) + 'A');
            }
        });
    }

    // =========================
    // 🌡️ CDT (CRÍTICO)
    // =========================
    function validarCDT(estado, errores, warnings) {
        if (!estado.nodos) return;

        estado.nodos.forEach(function(nodo) {
            var cdt = nodo.CDT;
            if (!cdt) return;

            // Validar F_temp
            if (cdt.F_temp && (cdt.F_temp <= 0 || cdt.F_temp > 1.5)) {
                errores.push('Nodo ' + nodo.id + ': F_temp fuera de rango físico (' + cdt.F_temp + ')');
            }

            // Validar F_agrupamiento
            if (cdt.F_agrupamiento && (cdt.F_agrupamiento <= 0 || cdt.F_agrupamiento > 1)) {
                errores.push('Nodo ' + nodo.id + ': F_agrupamiento fuera de rango (' + cdt.F_agrupamiento + ')');
            }

            // Validar ampacidad corregida
            if (cdt.I_corregida && cdt.I_corregida <= 0) {
                errores.push('Nodo ' + nodo.id + ': ampacidad corregida cero (bug crítico)');
            }

            // Validar ampacidad final
            if (cdt.I_final && cdt.I_final <= 0) {
                errores.push('Nodo ' + nodo.id + ': ampacidad final cero (bug crítico)');
            }

            // Detectar ampacidad inflada
            if (cdt.I_corregida && cdt.I_tabla && cdt.I_corregida > cdt.I_tabla * 2) {
                warnings.push('Nodo ' + nodo.id + ': ampacidad inflada (I_corregida=' + (cdt.I_corregida || 0).toFixed(1) + 'A > 2*I_tabla=' + ((cdt.I_tabla * 2) || 0).toFixed(1) + 'A) - posible error de factores');
            }

            // Validar violación de terminal
            if (cdt.violacionTerminal) {
                warnings.push('Nodo ' + nodo.id + ': violación de terminal detectada - cable soporta más que terminales');
            }

            // Validar factor 125%
            if (cdt.sinFactor125) {
                warnings.push('Nodo ' + nodo.id + ': no cumple factor 125% para carga continua');
            }
        });
    }

    // =========================
    // ⚙️ SISTEMA ELÉCTRICO
    // =========================
    function validarSistemaElectrico(estado, errores, warnings) {
        if (!estado.nodos || estado.nodos.length === 0) {
            errores.push('No hay nodos en el sistema');
            return;
        }

        estado.nodos.forEach(function(nodo) {
            // Validar impedancias
            if (nodo.R && nodo.R < 0) {
                errores.push('Nodo ' + nodo.id + ': resistencia negativa (físicamente imposible)');
            }

            if (nodo.X && nodo.X < 0) {
                errores.push('Nodo ' + nodo.id + ': reactancia negativa (físicamente imposible)');
            }

            // Validar X/R razonable
            if (nodo.R && nodo.X && nodo.R > 0) {
                var xr = nodo.X / nodo.R;
                if (xr > 50) {
                    warnings.push('Nodo ' + nodo.id + ': X/R extremadamente alto (' + (xr || 0).toFixed(1) + ') - verificar datos');
                }
                if (xr < 0.1) {
                    warnings.push('Nodo ' + nodo.id + ': X/R extremadamente bajo (' + (xr || 0).toFixed(1) + ') - verificar datos');
                }
            }

            // Validar corriente de falla
            if (nodo.isc && nodo.isc <= 0) {
                errores.push('Nodo ' + nodo.id + ': corriente de falla inválida (debe ser > 0)');
            }

            // Validar tensión
            if (nodo.tension && nodo.tension <= 0) {
                errores.push('Nodo ' + nodo.id + ': tensión inválida (debe ser > 0)');
            }

            // Validar conexión padre-hijo
            if (nodo.parentId) {
                var padre = estado.nodos.find(function(n) { return n.id === nodo.parentId; });
                if (!padre) {
                    errores.push('Nodo ' + nodo.id + ': referencia a padre inexistente (' + nodo.parentId + ')');
                }
            }
        });

        // Validar tipo de sistema
        if (!estado.tipoSistema) {
            warnings.push('Tipo de sistema no especificado (default: trifásico)');
        }
    }

    // =========================
    // 🔍 DETECCIÓN DE TIPO DE INSTALACIÓN
    // =========================
    function detectarTipoInstalacion(feeder) {
        if (!feeder) return 'conduit';

        if (feeder.canalizacion && feeder.canalizacion.includes('charola')) {
            return 'charola';
        }
        if (feeder.canalizacion && feeder.canalizacion.includes('conduit')) {
            return 'conduit';
        }
        if (feeder.canalizacion && feeder.canalizacion.includes('directo')) {
            return 'directo';
        }

        // Heurística automática
        if (feeder.numConductores > 6) {
            return 'charola';
        }

        return 'conduit';
    }

    // =========================
    // 🔍 DETECCIÓN DE AGRUPAMIENTO REAL
    // =========================
    function detectarAgrupamientoReal(feeder) {
        if (!feeder) return 1.0;

        if (feeder.canalizacion && feeder.canalizacion.includes('charola')) {
            // Charola: menos severo que conduit
            var numCond = feeder.numConductores || 3;
            return Math.max(0.85, 1 - numCond * 0.02);
        }

        if (feeder.canalizacion && feeder.canalizacion.includes('PVC')) {
            // PVC: usar tabla NOM estándar
            if (typeof AmpacidadReal !== 'undefined') {
                return AmpacidadReal.factorAgrupamiento(feeder.numConductores || 3);
            }
            // Fallback
            if (feeder.numConductores <= 3) return 1.0;
            if (feeder.numConductores <= 6) return 0.80;
            if (feeder.numConductores <= 9) return 0.70;
            return 0.50;
        }

        return 1.0;
    }

    // =========================
    // 🧪 VALIDACIÓN RÁPIDA (para UI)
    // =========================
    function validarRapido(nodo) {
        var errores = [];
        var warnings = [];

        if (!nodo) {
            errores.push('Nodo inválido');
            return { ok: false, errores: errores, warnings: warnings };
        }

        var f = nodo.feeder;
        if (f) {
            if (!f.calibre) errores.push('Falta calibre');
            if (!f.material) errores.push('Falta material');
            if (!f.canalizacion) errores.push('Falta canalización');
            if (!f.longitud) errores.push('Falta longitud');
            if (!f.cargaA) errores.push('Falta carga');
        }

        var eq = nodo.equip;
        if (eq) {
            if (!eq.tipo && !eq.modelo) warnings.push('Sin equipo especificado');
        }

        return {
            ok: errores.length === 0,
            errores: errores,
            warnings: warnings
        };
    }

    return {
        validarTodo: validarTodo,
        validarRapido: validarRapido,
        detectarTipoInstalacion: detectarTipoInstalacion,
        detectarAgrupamientoReal: detectarAgrupamientoReal
    };
})();

if (typeof window !== 'undefined') {
    window.ValidadorSistema = ValidadorSistema;
}
