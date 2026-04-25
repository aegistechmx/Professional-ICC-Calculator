/**
 * tcc_coordinacion.js — Motor de Coordinación TCC (Time-Current Curves)
 * Nivel ETAP/SKM - Validación y auto-coordinación de protecciones
 */

var TCCCoordinacion = (function() {

    /**
     * Interpolación log-log para curvas TCC
     * @param {number} I - Corriente (en múltiplos de In)
     * @param {Array} curve - Array de puntos [{I: multiple, t: tiempo}]
     * @returns {number|null} Tiempo interpolado o null si fuera de rango
     */
    function interpLogLog(I, curve) {
        if (!curve || curve.length < 2) return null;
        
        for (var i = 0; i < curve.length - 1; i++) {
            var p1 = curve[i];
            var p2 = curve[i + 1];

            if (I >= p1.I && I <= p2.I) {
                var logI = Math.log10(I);
                var logI1 = Math.log10(p1.I);
                var logI2 = Math.log10(p2.I);

                var logT1 = Math.log10(p1.t);
                var logT2 = Math.log10(p2.t);

                var logT = logT1 + ((logI - logI1) / (logI2 - logI1)) * (logT2 - logT1);

                return Math.pow(10, logT);
            }
        }
        
        // Extrapolación si está fuera de rango (conservador)
        if (I < curve[0].I) return curve[0].t;
        if (I > curve[curve.length - 1].I) return curve[curve.length - 1].t;
        
        return null;
    }

    /**
     * Calcular tiempo de disparo para un dispositivo
     * @param {number} I - Corriente de falla en Amperes
     * @param {Object} device - Dispositivo con In, settings, curve
     * @returns {number|null} Tiempo de disparo en segundos
     */
    function tripTime(I, device) {
        if (!device || !device.In || device.In <= 0) return null;
        
        var mult = I / device.In;
        var instantPickup = (device.settings && device.settings.instantPickup) ? 
            device.settings.instantPickup : 10;
        var timeDial = (device.settings && device.settings.timeDial) ? 
            device.settings.timeDial : 1;

        // Zona magnética (instantáneo)
        if (mult >= instantPickup) {
            if (device.curve && device.curve.magnetic) {
                return interpLogLog(mult, device.curve.magnetic);
            }
            return 0.02; // Default 20ms
        }

        // Zona térmica con timeDial
        if (device.curve && device.curve.thermal) {
            var t = interpLogLog(mult, device.curve.thermal);
            return t ? t * timeDial : null;
        }

        return null;
    }

    /**
     * Métrica de margen de coordinación
     * @param {number} tUp - Tiempo upstream
     * @param {number} tDown - Tiempo downstream
     * @returns {number} Margen en segundos
     */
    function coordinationMargin(tUp, tDown) {
        return tUp - tDown;
    }

    /**
     * Verificar si hay selectividad
     * @param {number} tUp - Tiempo upstream
     * @param {number} tDown - Tiempo downstream
     * @param {number} margin - Margen deseado (default 0.2s para térmico)
     * @returns {boolean} True si es selectivo
     */
    function isSelective(tUp, tDown, margin) {
        margin = margin !== undefined ? margin : 0.2;
        return tUp > (tDown + margin);
    }

    /**
     * Verificar selectividad en un punto de corriente
     * @param {Object} up - Dispositivo upstream
     * @param {Object} down - Dispositivo downstream
     * @param {number} I - Corriente de falla
     * @param {number} margin - Margen deseado
     * @returns {Object|null} Error si no hay selectividad
     */
    function checkSelectivity(up, down, I, margin) {
        var tUp = tripTime(I, up);
        var tDown = tripTime(I, down);

        if (tUp == null || tDown == null) return null;

        // Margen menor en zona magnética es aceptable
        var multDown = I / down.In;
        var instantPickupDown = (down.settings && down.settings.instantPickup) ? 
            down.settings.instantPickup : 10;
        var effectiveMargin = (multDown >= instantPickupDown) ? 0.02 : (margin || 0.2);

        if (!isSelective(tUp, tDown, effectiveMargin)) {
            return {
                type: 'ERROR',
                code: 'NO_SELECTIVITY',
                I: I,
                tUp: tUp,
                tDown: tDown,
                margin: effectiveMargin,
                actualMargin: tUp - tDown
            };
        }

        return null;
    }

    /**
     * Barrido completo de coordinación para un par
     * @param {Object} up - Dispositivo upstream
     * @param {Object} down - Dispositivo downstream
     * @param {Array} faultRange - Rango de corrientes de falla
     * @param {number} margin - Margen deseado
     * @returns {Array} Lista de issues encontrados
     */
    function scanPair(up, down, faultRange, margin) {
        var issues = [];

        for (var i = 0; i < faultRange.length; i++) {
            var I = faultRange[i];
            var res = checkSelectivity(up, down, I, margin);
            if (res) {
                issues.push(res);
            }
        }

        return issues;
    }

    /**
     * Verificar sensibilidad (falla mínima)
     * @param {number} Imin - Corriente de falla mínima
     * @param {Object} device - Dispositivo
     * @returns {Object|null} Error si no es sensible
     */
    function checkSensitivity(Imin, device) {
        if (!device || !device.In || device.In <= 0) return null;
        
        var instantPickup = (device.settings && device.settings.instantPickup) ? 
            device.settings.instantPickup : 10;
        var pickup = instantPickup * device.In;
        
        if (Imin < pickup) {
            return {
                type: 'ERROR',
                code: 'INSENSITIVE_PROTECTION',
                Imin: Imin,
                pickup: pickup,
                deficit: pickup - Imin
            };
        }
        
        return null;
    }

    /**
     * Detectar cruces de curvas
     * @param {Object} up - Dispositivo upstream
     * @param {Object} down - Dispositivo downstream
     * @param {Array} faultRange - Rango de corrientes
     * @returns {Array} Puntos donde se cruzan las curvas
     */
    function detectCurveCross(up, down, faultRange) {
        var crosses = [];

        for (var i = 0; i < faultRange.length; i++) {
            var I = faultRange[i];
            var tUp = tripTime(I, up);
            var tDown = tripTime(I, down);

            if (tUp != null && tDown != null && tUp <= tDown) {
                crosses.push({
                    I: I,
                    tUp: tUp,
                    tDown: tDown
                });
            }
        }

        return crosses;
    }

    /**
     * Generar rango de fallas (espacio logarítmico)
     * @param {Object} params - {In, IccMax, steps}
     * @returns {Array} Rango de corrientes
     */
    function buildFaultRange(params) {
        var In = params.In || 100;
        var IccMax = params.IccMax || 50000;
        var steps = params.steps || 60;
        
        var arr = [];
        var min = Math.log10(1.2 * In);
        var max = Math.log10(IccMax);

        for (var i = 0; i < steps; i++) {
            var v = min + (i / (steps - 1)) * (max - min);
            arr.push(Math.pow(10, v));
        }
        
        return arr;
    }

    /**
     * Generar rango de valores para optimización
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @param {number} step - Paso
     * @returns {Array} Array de valores
     */
    function range(min, max, step) {
        var arr = [];
        for (var v = min; v <= max + 1e-9; v += step) {
            arr.push(Number((v || 0).toFixed(3)));
        }
        return arr;
    }

    /**
     * Auto-coordinación de un par de dispositivos
     * @param {Object} up - Dispositivo upstream
     * @param {Object} down - Dispositivo downstream
     * @param {Object} opts - Opciones {faultRange, IminFault, maxIterations}
     * @returns {Object} Resultado de auto-coordinación
     */
    function autoCoordinatePair(up, down, opts) {
        var faultRange = opts.faultRange || buildFaultRange({In: down.In, IccMax: 50000});
        var IminFault = opts.IminFault || 0;
        var maxIterations = opts.maxIterations || 5000;

        var best = {
            score: -Infinity,
            up: JSON.parse(JSON.stringify(up)),
            down: JSON.parse(JSON.stringify(down)),
            issues: []
        };

        // Rangos ajustables (defaults si no especificados)
        var upKMin = (up.adjustable && up.adjustable.instantPickup) ? up.adjustable.instantPickup.min : 5;
        var upKMax = (up.adjustable && up.adjustable.instantPickup) ? up.adjustable.instantPickup.max : 12;
        var upKStep = (up.adjustable && up.adjustable.instantPickup) ? up.adjustable.instantPickup.step : 0.5;

        var upTDMin = (up.adjustable && up.adjustable.timeDial) ? up.adjustable.timeDial.min : 0.5;
        var upTDMax = (up.adjustable && up.adjustable.timeDial) ? up.adjustable.timeDial.max : 10;
        var upTDStep = (up.adjustable && up.adjustable.timeDial) ? up.adjustable.timeDial.step : 0.5;

        var downKMin = (down.adjustable && down.adjustable.instantPickup) ? down.adjustable.instantPickup.min : 5;
        var downKMax = (down.adjustable && down.adjustable.instantPickup) ? down.adjustable.instantPickup.max : 12;
        var downKStep = (down.adjustable && down.adjustable.instantPickup) ? down.adjustable.instantPickup.step : 0.5;

        var upK = range(upKMin, upKMax, upKStep);
        var upTD = range(upTDMin, upTDMax, upTDStep);
        var downK = range(downKMin, downKMax, downKStep);

        var it = 0;

        for (var i = 0; i < upK.length; i++) {
            for (var j = 0; j < upTD.length; j++) {
                for (var k = 0; k < downK.length; k++) {
                    if (++it > maxIterations) break;

                    var u = JSON.parse(JSON.stringify(up));
                    var d = JSON.parse(JSON.stringify(down));

                    if (!u.settings) u.settings = {};
                    if (!d.settings) d.settings = {};
                    
                    u.settings.instantPickup = upK[i];
                    u.settings.timeDial = upTD[j];
                    d.settings.instantPickup = downK[k];

                    // Verificar sensibilidad
                    var sUp = checkSensitivity(IminFault, u);
                    var sDn = checkSensitivity(IminFault, d);
                    
                    // Downstream debe ser sensible sí o sí
                    if (sDn) continue;

                    var issues = scanPair(u, d, faultRange, 0.2);

                    // Scoring: menos issues + menor tiempo total upstream
                    var penalty = issues.length * 1000;
                    var avgUpTime = 0;
                    var count = 0;
                    for (var m = 0; m < faultRange.length; m++) {
                        var t = tripTime(faultRange[m], u);
                        if (t != null) {
                            avgUpTime += t;
                            count++;
                        }
                    }
                    avgUpTime = count > 0 ? avgUpTime / count : 0;

                    var score = -penalty - avgUpTime;

                    if (score > best.score) {
                        best.score = score;
                        best.up = u;
                        best.down = d;
                        best.issues = issues;
                    }

                    // Solución perfecta encontrada
                    if (issues.length === 0) {
                        return {
                            status: 'OK',
                            up: u,
                            down: d,
                            issues: [],
                            iterations: it
                        };
                    }
                }
            }
        }

        return {
            status: best.issues.length ? 'PARTIAL' : 'OK',
            up: best.up,
            down: best.down,
            issues: best.issues,
            iterations: it
        };
    }

    /**
     * Auto-coordinación de sistema completo (cadena)
     * @param {Object} devices - Mapa de dispositivos {id: device}
     * @param {Array} topology - Topología ordenada downstream→upstream
     * @param {Object} opts - Opciones
     * @returns {Array} Resultados por par
     */
    function autoCoordinateSystem(devices, topology, opts) {
        var results = [];

        for (var i = 0; i < topology.length; i++) {
            var chain = topology[i];
            
            for (var j = 0; j < chain.length - 1; j++) {
                var downId = chain[j];
                var upId = chain[j + 1];
                
                var down = devices[downId];
                var up = devices[upId];
                
                if (!down || !up) continue;

                var res = autoCoordinatePair(up, down, opts);

                // Aplicar ajustes al pool
                devices[upId] = res.up;
                devices[downId] = res.down;

                results.push({
                    pair: [downId, upId],
                    status: res.status,
                    up: res.up,
                    down: res.down,
                    issues: res.issues,
                    iterations: res.iterations
                });
            }
        }

        return results;
    }

    /**
     * Convertir datos de breaker existentes a formato TCC
     * @param {Object} equipo - Datos del equipo desde EQUIPOS
     * @param {number} In - Corriente nominal
     * @returns {Object} Dispositivo en formato TCC
     */
    function breakerToTCCDevice(equipo, In) {
        if (!equipo || !equipo.curvaDisparo) return null;
        
        var curva = equipo.curvaDisparo;
        
        // Convertir estructura existente a formato TCC
        var thermal = [];
        var magnetic = [];
        
        if (curva.curvaTermica && curva.curvaTermica.puntos) {
            thermal = curva.curvaTermica.puntos.map(function(p) {
                return { I: p.multiple, t: p.tiempo };
            });
        } else if (curva.puntos) {
            // Estructura antigua
            thermal = curva.puntos.filter(function(p) {
                return p.corriente < 8 && p.tiempo > 0.1;
            }).map(function(p) {
                return { I: p.corriente, t: p.tiempo };
            });
        }
        
        if (curva.curvaMagnetica && curva.curvaMagnetica.puntos) {
            magnetic = curva.curvaMagnetica.puntos.map(function(p) {
                return { I: p.multiple, t: p.tiempo };
            });
        } else if (curva.puntos) {
            // Estructura antigua
            magnetic = curva.puntos.filter(function(p) {
                return p.corriente >= 8 || p.tiempo <= 0.1;
            }).map(function(p) {
                return { I: p.corriente, t: p.tiempo };
            });
        }
        
        return {
            id: equipo.nombre || 'breaker',
            In: In,
            type: 'breaker',
            adjustable: {
                instantPickup: { min: 5, max: 12, step: 0.5 },
                timeDial: { min: 0.5, max: 10, step: 0.5 }
            },
            settings: {
                instantPickup: curva.multiplicadorInstantaneo || 10,
                timeDial: 1
            },
            curve: {
                thermal: thermal,
                magnetic: magnetic
            }
        };
    }

    /**
     * Validar coordinación del sistema actual
     * @param {Array} nodos - Nodos del sistema
     * @returns {Object} Resultado de validación
     */
    function validarCoordinacionSistema(nodos) {
        var results = {
            status: 'OK',
            pairs: [],
            totalIssues: 0
        };
        
        if (!nodos || nodos.length < 2) return results;
        
        // Construir dispositivos TCC desde nodos
        var devices = {};
        var topology = [[]];
        
        for (var i = 0; i < nodos.length; i++) {
            var nodo = nodos[i];
            if (!nodo.equip || !nodo.feeder) continue;
            
            var device = breakerToTCCDevice(
                { nombre: nodo.id, curvaDisparo: EQUIPOS[nodo.equip.serie]?.curvaDisparo },
                nodo.feeder.cargaA || 100
            );
            
            if (device) {
                devices[nodo.id] = device;
                topology[0].push(nodo.id);
            }
        }
        
        // Validar cada par consecutivo
        if (topology[0].length >= 2) {
            for (var j = 0; j < topology[0].length - 1; j++) {
                var downId = topology[0][j];
                var upId = topology[0][j + 1];
            
                var down = devices[downId];
                var up = devices[upId];
            
                if (!down || !up) continue;
            
                var faultRange = buildFaultRange({ In: down.In, IccMax: 50000 });
                var issues = scanPair(up, down, faultRange, 0.2);
            
                var pairResult = {
                    pair: [downId, upId],
                    issues: issues,
                    status: issues.length === 0 ? 'OK' : 'FAIL'
                };
            
                results.pairs.push(pairResult);
                results.totalIssues += issues.length;
            }
        }
        
        results.status = results.totalIssues === 0 ? 'OK' : 'FAIL';
        
        return results;
    }

    return {
        interpLogLog: interpLogLog,
        tripTime: tripTime,
        coordinationMargin: coordinationMargin,
        isSelective: isSelective,
        checkSelectivity: checkSelectivity,
        scanPair: scanPair,
        checkSensitivity: checkSensitivity,
        detectCurveCross: detectCurveCross,
        buildFaultRange: buildFaultRange,
        autoCoordinatePair: autoCoordinatePair,
        autoCoordinateSystem: autoCoordinateSystem,
        breakerToTCCDevice: breakerToTCCDevice,
        validarCoordinacionSistema: validarCoordinacionSistema
    };
})();

if (typeof window !== 'undefined') {
    window.TCCCoordinacion = TCCCoordinacion;
}
