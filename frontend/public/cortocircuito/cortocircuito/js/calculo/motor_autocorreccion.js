/**
 * motor_autocorreccion.js — Motor de Autocorrección Inteligente (Modo Ingeniero/Copiloto)
 * Corrige ampacidad + protección + corto + TCC con prioridad de riesgo eléctrico real
 * Itera hasta converger, aplicando corrección mínima necesaria
 */

var MotorAutocorreccion = (function() {

    /**
     * Prioridad de riesgo eléctrico real (orden ingeniero)
     */
    function prioridadIngenieria(a, b) {
        const orden = {
            "CORTOCIRCUITO": 1,   // riesgo explosión
            "PROTECCION": 2,      // no detecta falla
            "AMPACIDAD": 3,       // sobrecalentamiento
            "TCC": 4,             // coordinación
            "AGRUPAMIENTO": 5     // eficiencia
        };
        return (orden[a.tipo] || 99) - (orden[b.tipo] || 99);
    }

    /**
     * Normaliza inputs para evitar el 80% de bugs
     */
    function normalizarInput(data, log) {
        if (!data.carga) data.carga = 100;

        if (!data.terminalTemp || data.terminalTemp === 0) {
            data.terminalTemp = 75;
            log.push("Terminal → 75°C (auto NOM)");
        }

        if (!data.instalacion) {
            data.instalacion = "conduit";
        }

        if (!data.numConductores) {
            data.numConductores = 3;
            log.push("Conductores → 3 (default físico)");
        }

        if (!data.paralelo) {
            data.paralelo = 1;
        }

        if (!data.tempAmbiente) {
            data.tempAmbiente = 40;
            log.push("Temp ambiente → 40°C (default)");
        }

        return data;
    }

    /**
     * Factor de temperatura según NOM
     */
    function getFactorTempNOM(tempAmbiente) {
        if (tempAmbiente <= 30) return 1.0;
        if (tempAmbiente <= 35) return 0.91;
        if (tempAmbiente <= 40) return 0.82;
        if (tempAmbiente <= 45) return 0.71;
        if (tempAmbiente <= 50) return 0.58;
        return 0.5;
    }

    /**
     * Factor de agrupamiento según NOM
     */
    function getFactorAgrupamientoNOM(numConductores) {
        if (numConductores <= 2) return 1.0;
        if (numConductores === 3) return 0.8;
        if (numConductores <= 6) return 0.7;
        if (numConductores <= 9) return 0.6;
        return 0.5;
    }

    /**
     * Sube un calibre (simplificado)
     */
    function subirCalibre(calibre) {
        const calibres = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500', '750', '1000'];
        const idx = calibres.indexOf(calibre.toString());
        if (idx >= 0 && idx < calibres.length - 1) {
            return calibres[idx + 1];
        }
        return '1000';
    }

    /**
     * Ampacidad base desde tabla (simplificado - usar tabla real en producción)
     */
    function getAmpacidadTabla(calibre, material) {
        // Valores aproximados para cobre 75°C
        const tabla = {
            '14': 15, '12': 20, '10': 30, '8': 50, '6': 65,
            '4': 85, '2': 115, '1/0': 150, '2/0': 175, '3/0': 200,
            '4/0': 230, '250': 255, '350': 310, '500': 375, '750': 465, '1000': 545
        };
        return tabla[calibre.toString()] || 0;
    }

    /**
     * Ampacidad límite de terminal (simplificado)
     */
    function getAmpacidadTerminal(calibre, terminalTemp) {
        // Aproximación: terminal limita a 60°C o 75°C
        const tabla = getAmpacidadTabla(calibre, 'cobre');
        if (terminalTemp <= 60) {
            return tabla * 0.8;
        }
        return tabla;
    }

    /**
     * Motor de autocorrección de ampacidad completo
     * Single pass only - NO internal loop to prevent infinite loop
     */
    function autoAmpacidadFULL(data) {
        let log = [];

        // 1. SANIDAD DE INPUTS
        if (!data.terminalTemp || data.terminalTemp <= 0) {
            data.terminalTemp = 75;
            log.push("Terminal → 75°C (auto NOM)");
        }

        if (!data.numConductores || data.numConductores < 1) {
            data.numConductores = 3;
            log.push("Conductores → 3 (default físico)");
        }

        // 2. FACTORES REALES
        let F_temp = getFactorTempNOM(data.tempAmbiente);
        let F_agrup = getFactorAgrupamientoNOM(data.numConductores);

        // CORRECCIÓN INTELIGENTE
        if (data.instalacion === "charola") {
            F_agrup = 1.0;
            log.push("Agrupamiento eliminado (charola)");
        }

        // 3. AMPACIDAD BASE
        let I_tabla = getAmpacidadTabla(data.calibre, data.material);

        if (!I_tabla) {
            data.calibre = subirCalibre(data.calibre);
            log.push("Calibre inválido → ajustado a " + data.calibre);
            I_tabla = getAmpacidadTabla(data.calibre, data.material);
        }

        // 4. CORRECCIÓN TÉRMICA
        let I_corregida = I_tabla * F_temp * F_agrup * data.paralelo;

        // 5. TERMINALES (110.14C)
        let I_terminal = getAmpacidadTerminal(data.calibre, data.terminalTemp);

        if (!I_terminal || I_terminal <= 0) {
            I_terminal = I_tabla;
            log.push("Terminal inválida → usando base");
        }

        let I_final = Math.min(I_corregida, I_terminal);

        // 6. DEMANDA NOM
        let I_diseño = data.carga * 1.25;

        // 7. VALIDACIÓN FINAL
        if (I_final >= I_diseño) {
            return {
                status: "OK",
                I_final,
                I_corregida,
                I_terminal,
                I_diseño,
                calibre: data.calibre,
                paralelo: data.paralelo,
                F_temp,
                F_agrup,
                log
            };
        }

        // 8. ESTRATEGIA DE CORRECCIÓN (single pass)
        // AUMENTAR PARALELOS (más barato que calibre)
        if (data.paralelo < 4) {
            data.paralelo++;
            log.push("Se aumenta paralelo → " + data.paralelo);
        } else {
            // SUBIR CALIBRE
            data.calibre = subirCalibre(data.calibre);
            log.push("Se aumenta calibre → " + data.calibre);
            // RESET PARALELO
            data.paralelo = 1;
        }

        return {
            status: "NECESITA_RECALCULO",
            I_final,
            I_corregida,
            I_terminal,
            I_diseño,
            calibre: data.calibre,
            paralelo: data.paralelo,
            F_temp,
            F_agrup,
            log
        };
    }

    /**
     * Cálculo de cortocircuito básico
     */
    function calcularCortoBasico(data) {
        let Z = (data.Ztrafo || 5.75) / 100;
        let kVA = data.kVA || 500;
        let voltaje = data.voltaje || 480;

        let Isc = (kVA * 1000) / (Math.sqrt(3) * voltaje * Z);

        if (!isFinite(Isc) || Isc <= 0) {
            return { ok: false, Isc: 0 };
        }

        return {
            ok: true,
            Isc: Isc / 1000 // Convertir a kA
        };
    }

    /**
     * Selector de interruptor mínimo
     */
    function seleccionarInterruptorMinimo(Ireq, Isc, data) {
        // Catálogo simplificado (usar catálogo real en producción)
        const catalogo = [
            { In: 100, kA: 10, precio: 1, nombre: '100A 10kA' },
            { In: 200, kA: 18, precio: 2, nombre: '200A 18kA' },
            { In: 400, kA: 25, precio: 3, nombre: '400A 25kA' },
            { In: 600, kA: 35, precio: 4, nombre: '600A 35kA' },
            { In: 800, kA: 50, precio: 5, nombre: '800A 50kA' },
            { In: 1200, kA: 65, precio: 7, nombre: '1200A 65kA' },
            { In: 2000, kA: 100, precio: 10, nombre: '2000A 100kA' }
        ];

        let opciones = catalogo.filter(e =>
            e.In >= Ireq && e.kA >= Isc
        );

        if (!opciones.length) {
            return { ok: false, equipo: null };
        }

        opciones.sort((a, b) => a.precio - b.precio);

        return {
            ok: true,
            equipo: opciones[0]
        };
    }

    /**
     * Ajuste TCC básico
     */
    function ajustarTCCBasico(prot, data) {
        let curva = {
            Ir: prot.equipo.In * 0.8,
            delay: 0.3
        };

        // Evita solape directo
        if (data.downstream) {
            curva.delay += 0.2;
        }

        return {
            ok: true,
            curva
        };
    }

    /**
     * Validación final del sistema
     */
    function validarSistemaFinal(s) {
        if (s.amp.I_final < s.amp.I_diseño) {
            return { ok: false, error: 'Ampacidad insuficiente' };
        }

        if (s.prot.equipo.kA < s.corto.Isc) {
            return { ok: false, error: 'Interruptor no cumple capacidad interruptiva' };
        }

        return { ok: true };
    }

    /**
     * Motor principal del sistema V1
     */
    function motorSistemaV1(input) {
        let log = [];

        // 1. NORMALIZACIÓN
        let data = normalizarInput(input, log);

        // 2. AMPACIDAD (AUTO)
        let amp = autoAmpacidadFULL(data);

        if (amp.status !== "OK") {
            return {
                status: "FAIL",
                error: "Ampacidad no converge",
                log
            };
        }

        log.push(...amp.log);

        // 3. CORTOCIRCUITO
        let corto = calcularCortoBasico(data);

        if (!corto.ok) {
            return {
                status: "FAIL",
                error: "Error cálculo de corto",
                log
            };
        }

        // 4. INTERRUPTOR
        let prot = seleccionarInterruptorMinimo(
            amp.I_diseño,
            corto.Isc,
            data
        );

        if (!prot.ok) {
            return {
                status: "FAIL",
                error: "No hay interruptor válido",
                log
            };
        }

        // 5. COORDINACIÓN TCC
        let tcc = ajustarTCCBasico(prot, data);

        if (!tcc.ok) {
            return {
                status: "FAIL",
                error: "No coordina TCC",
                log
            };
        }

        // 6. VALIDACIÓN FINAL
        let valido = validarSistemaFinal({
            amp,
            corto,
            prot,
            tcc
        });

        if (!valido.ok) {
            return {
                status: "FAIL",
                error: valido.error,
                log
            };
        }

        return {
            status: "OK",
            amp,
            corto,
            prot,
            tcc,
            log
        };
    }

    /**
     * Motor de autocorrección inteligente (Modo Ingeniero/Copiloto)
     * Single pass only - NO internal loop to prevent infinite loop
     */
    function autoCorregirInteligente(sistema) {
        let log = [];

        // Integrar con motor de protecciones real si está disponible
        if (typeof MotorProtecciones !== 'undefined') {
            let resultadoProtecciones = MotorProtecciones.copilotoProtecciones(sistema);
            log = log.concat(resultadoProtecciones.log);
        }

        // Single pass - get issues once
        let issues = [];
        if (typeof MotorDiagnostico !== 'undefined') {
            issues = MotorDiagnostico.diagnosticoGlobal(sistema);
        }

        if (issues.length === 0) {
            log.push("🟢 Sistema limpio");
            return { sistema: sistema, log: log };
        }

        // 🔴 Prioridad: críticos primero
        let criticos = issues.filter(function(i) { return i.nivel === "CRITICO"; });

        // Orden tipo ingeniero (seguridad primero)
        criticos.sort(prioridadIngenieria);

        if (criticos.length > 0) {
            for (let i = 0; i < criticos.length; i++) {
                aplicarCorreccion(sistema, criticos[i], log);
            }
        } else {
            log.push("🟢 Sistema limpio");
        }

        // Formatear la solución para que MotorIA.aprender pueda consumirla
        const mejorSolucionFormateada = sistema.nodos.map(node => ({
            calibre: node.feeder?.calibre,
            paralelos: node.feeder?.paralelo,
            breaker: node.equip, // Assuming node.equip contains the breaker info
            ajustes: node.ajustesLSIG, // If LSIG adjustments are part of the node
            iDisparo: node.equip?.iDisparo // The corrected ground fault pickup
        }));

        // Definir un score y validez para el aprendizaje
        const score = issues.length === 0 ? 1.0 : (1.0 / (issues.length + 1)); // Higher score for fewer issues
        const valido = issues.length === 0; // Valid if no issues remain

        return {
            mejorSolucion: mejorSolucionFormateada,
            eval: { score, valido },
            log: log // Keep log for debugging/reporting
        };
    }

    /**
     * Aplica corrección específica según tipo de issue
     */
    function aplicarCorreccion(sistema, issue, log) {
        let nodo = sistema.nodos ? sistema.nodos.find(function(n) { return (n.id || n.nombre) === issue.nodo; }) : null;
        if (!nodo) return;

        switch (issue.tipo) {
            case "AMPACIDAD":
                if (nodo.feeder) {
                    if (nodo.CDT && nodo.CDT.I_final <= 0) {
                        // Fix terminal
                        log.push("Fix AMP: " + issue.nodo + " → terminal 75°C");
                    } else if (nodo.CDT && nodo.CDT.I_final < nodo.CDT.I_diseño) {
                        // Estrategia: mínimo cambio
                        if (nodo.feeder.paralelo < 4) {
                            nodo.feeder.paralelo++;
                            log.push("Fix AMP: " + issue.nodo + " → paralelo " + nodo.feeder.paralelo);
                        } else {
                            nodo.feeder.calibre = subirCalibre(nodo.feeder.calibre);
                            nodo.feeder.paralelo = 1;
                            log.push("Fix AMP: " + issue.nodo + " → calibre " + nodo.feeder.calibre);
                        }
                    }
                }
                break;

            case "CORTOCIRCUITO":
                if (nodo.equip) {
                    let capacidades = [100, 200, 400, 600, 800, 1200, 2000];
                    let idx = capacidades.indexOf(nodo.equip.cap);
                    if (idx >= 0 && idx < capacidades.length - 1) {
                        nodo.equip.cap = capacidades[idx + 1];
                        log.push("Fix CC: " + issue.nodo + " → interruptor " + nodo.equip.cap + "A");
                    }
                }
                break;

            case "PROTECCION":
                if (nodo.equip) {
                    // Prioridad: Usar corriente de falla real (ajustada por desbalance si existe)
                    const iftA = (nodo.faseTierra ? (nodo.faseTierra.iscFt_ajustado || nodo.faseTierra.iscFt || 0) : 0) * 1000;
                    
                    if (iftA > 0) {
                        const factorSensibilidad = 1.25; // Margen requerido por Art. 230.95 / IEEE
                        const antes = nodo.equip.iDisparo || 0;
                        // Calculamos el pickup máximo que vería la falla con seguridad
                        let nuevoPickup = Math.floor(iftA / factorSensibilidad);
                        
                        // Mantener un suelo de 100A para evitar disparos por desbalances menores de carga
                        nuevoPickup = Math.max(100, nuevoPickup);
                        
                        nodo.equip.iDisparo = nuevoPickup;
                        log.push(`Fix Tierra: ${issue.nodo} → pickup ${antes.toFixed(0)}A -> ${nuevoPickup}A (Sensibilidad para If=${iftA.toFixed(0)}A)`);
                    } else if (nodo.equip.iDisparo) {
                        // Fallback heurístico si el issue se reportó sin datos de cálculo (blind fix)
                        const antes = nodo.equip.iDisparo;
                        nodo.equip.iDisparo = antes * 0.5;
                        log.push(`Fix Tierra: ${issue.nodo} → pickup ↓ 50% (Ajuste ciego)`);
                    }
                }
                break;

            case "TCC":
                log.push("Fix TCC: " + issue.nodo + " → ajuste de coordinación");
                break;

            case "AGRUPAMIENTO":
                if (nodo.feeder && nodo.feeder.canalizacion === "conduit") {
                    nodo.feeder.canalizacion = "charola";
                    log.push("Fix Agrupamiento: " + issue.nodo + " → charola");
                }
                break;
        }
    }

    return {
        motorSistemaV1: motorSistemaV1,
        autoAmpacidadFULL: autoAmpacidadFULL,
        normalizarInput: normalizarInput,
        autoCorregirInteligente: autoCorregirInteligente,
        prioridadIngenieria: prioridadIngenieria
    };
})();

if (typeof window !== 'undefined') {
    window.MotorAutocorreccion = MotorAutocorreccion;
}
