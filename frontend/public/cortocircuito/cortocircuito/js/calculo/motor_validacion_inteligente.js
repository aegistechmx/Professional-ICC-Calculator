/**
 * motor_validacion_inteligente.js — Motor de validación inteligente y auto-corrección
 * Detecta incoherencias físicas, normativas y ofrece correcciones automáticas
 */
var MotorValidacionInteligente = (function() {

    /**
     * Valida consistencia física de un punto del sistema
     * @param {Object} punto - Punto del sistema con { isc, xr, faseTierra, ... }
     * @returns {Array} Lista de errores físicos detectados
     */
    function validarFisicaSistema(punto) {
        var errores = [];

        if (!punto) {
            errores.push('Punto inválido (null/undefined)');
            return errores;
        }

        // Validar Isc
        if (punto.isc === undefined || punto.isc === null) {
            errores.push('Isc no definida');
        } else if (punto.isc <= 0) {
            errores.push('Isc no física (debe ser > 0): ' + punto.isc + ' kA');
        } else if (punto.isc > 200) {
            errores.push('Isc extremadamente alta (>200 kA): ' + punto.isc + ' kA - verificar datos');
        }

        // Validar X/R
        if (punto.xr === undefined || punto.xr === null) {
            errores.push('X/R no definido');
        } else if (punto.xr < 0) {
            errores.push('X/R negativo imposible: ' + punto.xr);
        } else if (punto.xr > 100) {
            errores.push('X/R extremadamente alto (>100): ' + punto.xr + ' - verificar datos');
        } else if (punto.xr < 0.1) {
            errores.push('X/R extremadamente bajo (<0.1): ' + punto.xr + ' - verificar datos');
        }

        // Validar impedancias
        if (punto.R !== undefined && punto.R < 0) {
            errores.push('Resistencia negativa imposible: ' + punto.R + ' Ω');
        }
        if (punto.X !== undefined && punto.X < 0) {
            errores.push('Reactancia negativa imposible: ' + punto.X + ' Ω');
        }

        // Validar falla a tierra
        if (punto.faseTierra && punto.faseTierra.iscFt) {
            var I3F = punto.isc || 0;
            var IFT = punto.faseTierra.iscFt || 0;

            if (IFT > I3F * 3) {
                errores.push('Falla a tierra irreal (mayor que 3× trifásica): If-tierra=' + (IFT || 0).toFixed(2) + ' kA > 3×I3F=' + ((I3F * 3) || 0).toFixed(2) + ' kA');
            }

            if (IFT < 0) {
                errores.push('Falla a tierra negativa imposible: ' + IFT + ' kA');
            }

            if (I3F > 0 && IFT < 0.01 * I3F) {
                errores.push('Falla a tierra ridículamente baja (<1% de I3F): If-tierra=' + (IFT || 0).toFixed(2) + ' kA vs I3F=' + (I3F || 0).toFixed(2) + ' kA');
            }
        }

        // Validar tensión
        if (punto.tension !== undefined) {
            if (punto.tension <= 0) {
                errores.push('Tensión inválida (debe ser > 0): ' + punto.tension + ' V');
            } else if (punto.tension > 35000) {
                errores.push('Tensión fuera de rango típico (>35 kV): ' + punto.tension + ' V');
            }
        }

        return errores;
    }

    /**
     * Valida cumplimiento automático de NOM
     * @param {Object} punto - Punto del sistema con { CDT, validacionNOM, equip, ... }
     * @returns {Array} Lista de flags de violación NOM
     */
    function validarNOMAutomatico(punto) {
        var flags = [];

        if (!punto) {
            flags.push('Punto inválido');
            return flags;
        }

        // Validar ampacidad
        if (punto.CDT) {
            if (punto.CDT.I_final === undefined || punto.CDT.I_final === null) {
                flags.push('Ampacidad final no calculada');
            } else if (punto.CDT.I_diseño && punto.CDT.I_final < punto.CDT.I_diseño) {
                flags.push('No cumple ampacidad: I_final=' + (punto.CDT.I_final || 0).toFixed(1) + 'A < I_diseño=' + (punto.CDT.I_diseño || 0).toFixed(1) + 'A');
            }

            if (punto.CDT.I_corregida && punto.CDT.I_corregida <= 0) {
                flags.push('Ampacidad corregida cero (bug crítico)');
            }

            if (punto.CDT.F_temp && (punto.CDT.F_temp <= 0 || punto.CDT.F_temp > 1.5)) {
                flags.push('Factor temperatura fuera de rango: ' + punto.CDT.F_temp);
            }

            if (punto.CDT.F_agrupamiento && (punto.CDT.F_agrupamiento <= 0 || punto.CDT.F_agrupamiento > 1)) {
                flags.push('Factor agrupamiento fuera de rango: ' + punto.CDT.F_agrupamiento);
            }
        }

        // Validar terminal
        if (punto.validacionNOM && punto.validacionNOM.violacionTerminal) {
            flags.push('Violación de terminal (cable soporta más que terminales)');
        }

        // Validar interruptor
        if (punto.equip) {
            if (punto.equip.cap && punto.iscConMotores && punto.equip.cap < punto.iscConMotores) {
                flags.push('Interruptor insuficiente: Cap=' + punto.equip.cap + 'kA < Isc=' + (punto.iscConMotores || 0).toFixed(2) + 'kA');
            }

            if (punto.equip.iDisparo && punto.equip.iDisparo <= 0) {
                flags.push('Corriente de disparo inválida: ' + punto.equip.iDisparo + 'A');
            }

            if (punto.faseTierra && punto.faseTierra.iscFt && punto.equip.iDisparo) {
                var IFT = punto.faseTierra.iscFt * 1000;
                if (punto.equip.iDisparo > IFT) {
                    flags.push('Protección no sensible a falla a tierra: iDisparo=' + punto.equip.iDisparo + 'A > If-tierra=' + (IFT || 0).toFixed(0) + 'A');
                }
            }
        }

        // Validar conductor
        if (punto.feeder) {
            if (punto.feeder.numConductores && punto.feeder.numConductores > 20) {
                flags.push('Número de conductores excesivo (>20): ' + punto.feeder.numConductores);
            }

            if (punto.feeder.paralelos && punto.feeder.paralelos > 4) {
                flags.push('Paralelos excesivos (>4): ' + punto.feeder.paralelos);
            }

            if (punto.feeder.longitud && punto.feeder.longitud > 1000) {
                flags.push('Longitud excesiva (>1000m): ' + punto.feeder.longitud + 'm');
            }
        }

        return flags;
    }

    /**
     * Genera acciones de auto-corrección para un punto
     * @param {Object} punto - Punto del sistema
     * @returns {Array} Lista de acciones sugeridas
     */
    function autoCorregir(punto) {
        var acciones = [];

        if (!punto) {
            acciones.push('Error: punto inválido');
            return acciones;
        }

        // 🔥 AMPACIDAD
        if (punto.CDT && punto.CDT.I_diseño && punto.CDT.I_final < punto.CDT.I_diseño) {
            acciones.push({
                tipo: 'AMPACIDAD',
                severidad: 'ALTA',
                accion: 'Aumentar calibre',
                razon: 'I_final=' + (punto.CDT.I_final || 0).toFixed(1) + 'A < I_diseño=' + (punto.CDT.I_diseño || 0).toFixed(1) + 'A'
            });
            acciones.push({
                tipo: 'AMPACIDAD',
                severidad: 'MEDIA',
                accion: 'Agregar conductor en paralelo',
                razon: 'Alternativa para aumentar ampacidad sin cambiar calibre'
            });
        }

        // 🔥 TERMINAL
        if (punto.validacionNOM && punto.validacionNOM.violacionTerminal) {
            acciones.push({
                tipo: 'TERMINAL',
                severidad: 'ALTA',
                accion: 'Subir terminal a 75°C o 90°C',
                razon: 'Violación de terminal detectada'
            });
            acciones.push({
                tipo: 'TERMINAL',
                severidad: 'MEDIA',
                accion: 'Cambiar interruptor con terminales de mayor capacidad',
                razon: 'Alternativa si no se puede cambiar temperatura de terminal'
            });
        }

        // 🔥 INTERRUPTOR
        if (punto.equip && punto.equip.cap && punto.iscConMotores && punto.equip.cap < punto.iscConMotores) {
            acciones.push({
                tipo: 'INTERRUPTOR',
                severidad: 'CRÍTICA',
                accion: 'Seleccionar interruptor mayor kA',
                razon: 'Cap=' + punto.equip.cap + 'kA < Isc=' + (punto.iscConMotores || 0).toFixed(2) + 'kA'
            });
        }

        // 🔥 FALLA A TIERRA - CRÍTICO
        if (punto.faseTierra && punto.faseTierra.iscFt && punto.equip && punto.equip.iDisparo) {
            var IFT = punto.faseTierra.iscFt * 1000;
            if (punto.equip.iDisparo > IFT) {
                acciones.push({
                    tipo: 'FALLA_TIERRA',
                    severidad: 'CRÍTICA',
                    accion: 'Agregar protección diferencial (GFP)',
                    razon: 'iDisparo=' + punto.equip.iDisparo + 'A > If-tierra=' + (IFT || 0).toFixed(0) + 'A. Riesgo: Daño a equipo, incendio, tensiones peligrosas'
                });
                acciones.push({
                    tipo: 'FALLA_TIERRA',
                    severidad: 'ALTA',
                    accion: 'Bajar instantáneo a ~2500-3000A',
                    razon: 'Alternativa si no se puede agregar GFP. Precaución: Puede afectar coordinación'
                });
                acciones.push({
                    tipo: 'FALLA_TIERRA',
                    severidad: 'MEDIA',
                    accion: 'Reducir impedancia de retorno a tierra',
                    razon: 'Para aumentar If-tierra y hacer protección sensible'
                });
            }
        }

        // 🔥 CONDUCTORES EXCESIVOS
        if (punto.feeder && punto.feeder.numConductores > 20) {
            acciones.push({
                tipo: 'CONDUCTOR',
                severidad: 'MEDIA',
                accion: 'Reducir número de conductores o usar charola',
                razon: 'Num conductores=' + punto.feeder.numConductores + ' (>20) no práctico en conduit'
            });
        }

        // 🔥 PARALELOS EXCESIVOS
        if (punto.feeder && punto.feeder.paralelos > 4) {
            acciones.push({
                tipo: 'CONDUCTOR',
                severidad: 'MEDIA',
                accion: 'Usar calibre mayor en lugar de paralelos',
                razon: 'Paralelos=' + punto.feeder.paralelos + ' (>4) complejo de instalar'
            });
        }

        return acciones;
    }

    /**
     * Valida todo el sistema y genera reporte completo
     * @param {Object} estado - Estado del sistema con { puntos, nodos }
     * @returns {Object} { ok, erroresFisicos, violacionesNOM, accionesCorreccion }
     */
    function validarSistemaCompleto(estado) {
        var erroresFisicos = [];
        var violacionesNOM = [];
        var accionesCorreccion = [];

        var puntos = estado.puntos || [];

        puntos.forEach(function(punto, index) {
            var id = punto.id || ('P' + index);

            // Validación física
            var erroresFis = validarFisicaSistema(punto);
            if (erroresFis.length > 0) {
                erroresFis.push({
                    punto: id,
                    errores: erroresFis
                });
            }

            // Validación NOM
            var violaciones = validarNOMAutomatico(punto);
            if (violaciones.length > 0) {
                violacionesNOM.push({
                    punto: id,
                    violaciones: violaciones
                });
            }

            // Auto-corrección
            var acciones = autoCorregir(punto);
            if (acciones.length > 0) {
                accionesCorreccion.push({
                    punto: id,
                    acciones: acciones
                });
            }
        });

        var ok = erroresFisicos.length === 0 && violacionesNOM.length === 0;

        return {
            ok: ok,
            erroresFisicos: erroresFisicos,
            violacionesNOM: violacionesNOM,
            accionesCorreccion: accionesCorreccion,
            resumen: {
                totalPuntos: puntos.length,
                puntosConErroresFisicos: erroresFisicos.length,
                puntosConViolacionesNOM: violacionesNOM.length,
                puntosConAcciones: accionesCorreccion.length
            }
        };
    }

    /**
     * Genera casos de prueba extremos para fuzzing
     * @returns {Array} Lista de casos de prueba
     */
    function generarCasosExtremos() {
        return [
            {
                nombre: 'Z retorno extremo bajo',
                descripcion: 'Z_retorno = 0.01 mΩ (casi corto)',
                config: { zRetornoTierra: 0.01 }
            },
            {
                nombre: 'Z retorno extremo alto',
                descripcion: 'Z_retorno = 100 mΩ (casi abierto)',
                config: { zRetornoTierra: 100 }
            },
            {
                nombre: 'Conductores absurdos',
                descripcion: '20 conductores en conduit',
                config: { numConductores: 20, canalizacion: 'conduit_PVC' }
            },
            {
                nombre: 'Factor manual inconsistente',
                descripcion: '1 conductor pero F_agrupamiento manual 0.5',
                config: { numConductores: 1, F_agrupamiento: 0.5 }
            },
            {
                nombre: 'Interruptor ridículo',
                descripcion: '5 kA con Isc 30 kA',
                config: { equipCap: 5, iscEsperado: 30 }
            },
            {
                nombre: 'Temperatura irreal',
                descripcion: '70°C ambiente',
                config: { temperaturaAmbiente: 70 }
            },
            {
                nombre: 'Motor exagerado',
                descripcion: '500 HP en baja tensión',
                config: { motorHP: 500 }
            }
        ];
    }

    return {
        validarFisicaSistema: validarFisicaSistema,
        validarNOMAutomatico: validarNOMAutomatico,
        autoCorregir: autoCorregir,
        validarSistemaCompleto: validarSistemaCompleto,
        generarCasosExtremos: generarCasosExtremos
    };
})();

if (typeof window !== 'undefined') {
    window.MotorValidacionInteligente = MotorValidacionInteligente;
}
