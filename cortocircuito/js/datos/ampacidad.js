/**
 * ampacidad.js — FASE 7
 * Ampacidad de conductores segun NOM-001 (Art. 310, tabla 310.15 y 310.16).
 *
 * Datos basados en catálogos de conductores Square D (Marca Registrada Schneider Electric).
 * Valores a 30°C ambiente, en canalización.
 * Para canalización en techo expuesto al sol: usar factor de corrección 0.58 (tabla 310.15 col. 2).
 * Para 3 conductores portadores de corriente en una canalización: multiplicar por 0.8 (tabla 310.15 col. 4).
 *
 * La ampacidad se reduce con temperatura ambiente > 30°C usando el factor de la NOM-001.
 *
 * Estructura: AMPACIDAD[material][canalizacion][calibre] = { ampacidad (A), tamConductor (mm²) }
 *
 * Nota: Los valores son representativos y orientativos. Para proyectos formales,
 * usar las tablas actualizadas de NOM-001-SEDE-2012 o los catálogos de Square D.
 */
var AMPACIDAD = {
    cobre: {
        acero: {
            '14':{amp:15, tam:2.1},'12':{amp:20,tam:3.3},'10':{amp:30,tam:5.3},'8':{amp:40,tam:8.4},
            '6':{amp:55,tam:13.3},'4':{amp:70,tam:21.2},'2':{amp:95,tam:33.6},'1':{amp:110,tam:42.4},
            '1/0':{amp:125,tam:53.5},'2/0':{amp:145,tam:67.4},'3/0':{amp:165,tam:85},
            '4/0':{amp:195,tam:107.2},'250':{amp:215,tam:127},'300':{amp:240,tam:152},
            '350':{amp:260,tam:177},'400':{amp:280,tam:203},'500':{amp:320,tam:253},
            '600':{amp:355,tam:304},'750':{amp:400,tam:385},'1000':{amp:455,tam:507}
        },
        pvc: {
            '14':{amp:15,tam:2.1},'12':{amp:20,tam:3.3},'10':{amp:30,tam:5.3},'8':{amp:40,tam:8.4},
            '6':{amp:55,tam:13.3},'4':{amp:70,tam:21.2},'2':{amp:95,tam:33.6},'1':{amp:110,tam:42.4},
            '1/0':{amp:125,tam:53.5},'2/0':{amp:145,tam:67.4},'3/0':{amp:165,tam:85},
            '4/0':{amp:195,tam:107.2},'250':{amp:215,tam:127},'300':{amp:240,tam:152},
            '350':{amp:260,tam:177},'400':{amp:280,tam:203},'500':{amp:320,tam:253},
            '600':{amp:355,tam:304},'750':{amp:400,tam:385},'1000':{amp:455,tam:507}
        }
    },
    aluminio: {
        acero: {
            '14':{amp:0,tam:0},'12':{amp:0,tam:0},'10':{amp:0,tam:0},'8':{amp:0,tam:0},
            '6':{amp:0,tam:0},'4':{amp:0,tam:0},'2':{amp:0,tam:0},'1':{amp:0,tam:0},
            '1/0':{amp:0,tam:0},'2/0':{amp:0,tam:0},'3/0':{amp:0,tam:0},'4/0':{amp:0,tam:0},
            '250':{amp:0,tam:0},'300':{amp:0,tam:0},'350':{amp:0,tam:0},'400':{amp:0,tam:0},
            '500':{amp:0,tam:0},'600':{amp:0,tam:0},'750':{amp:0,tam:0},'1000':{amp:0,tam:0}
        },
        pvc: {
            '14':{amp:0,tam:0},'12':{amp:0,tam:0},'10':{amp:0,tam:0},'8':{amp:0,tam:0},
            '6':{amp:0,tam:0},'4':{amp:0,tam:0},'2':{amp:0,tam:0},'1':{amp:0,tam:0},
            '1/0':{amp:0,tam:0},'2/0':{amp:0,tam:0},'3/0':{amp:0,tam:0},'4/0':{amp:0,tam:0},
            '250':{amp:0,tam:0},'300':{amp:0,tam:0},'350':{amp:0,tam:0},'400':{amp:0,tam:0},
            '500':{amp:0,tam:0},'600':{amp:0,tam:0},'750':{amp:0,tam:0},'1000':{amp:0,tam:0}
        }
    }
};

/**
 * Obtiene la ampacidad de un conductor
 * @returns {Object|null} { ampacidad, tamConductor }
 */
function getAmpacidad(material, canalizacion, calibre) {
    var datos = AMPACIDAD[material] && AMPACIDAD[material][canalizacion] && AMPACIDAD[material][canalizacion][calibre];
    return datos || null;
}

/**
 * Sugerencia de calibre por corriente de carga y tension
 * @param {number} icarga - Corriente de carga en amperes
 * @param {number} v - Tension del sistema
 * @param {string} material - 'cobre' | 'aluminio'
 * @param {string} canalizacion - 'acero' | 'pvc'
 * @param {number} numConductores - 1, 2 o 3 (para cable multiplexado)
 * @param {number} tempAmbiente - Temperatura ambiente en °C (default 30)
 * @returns {Array} Lista de calibres que cumplen, ordenados de menor a mayor
 */
function sugerirCalibre(icarga, v, material, canalizacion, numConductores, tempAmbiente) {
    icarga = icarga || 0;
    material = material || 'cobre';
    canalizacion = canalizacion || 'acero';
    numConductores = numConductores || 1;
    tempAmbiente = tempAmbiente || 30;

    if (icarga <= 0) return [];

    // Factor por número de conductores portadores (NOM-001 Tabla 310.15 Col. 4)
    var factorN = {1: 1.0, 2: 0.8, 3: 0.7};
    var factorNumConductores = factorN[numConductores] || 1;

    // Factor de corrección por temperatura (NOM-001 Tabla 310.15)
    // Simplificado: lineal entre 30°C (factor 1.0) y valores mayores
    var factorTemp;
    if (tempAmbiente <= 30) {
        factorTemp = 1.0;
    } else if (tempAmbiente <= 35) {
        factorTemp = 0.96;
    } else if (tempAmbiente <= 40) {
        factorTemp = 0.91;
    } else if (tempAmbiente <= 45) {
        factorTemp = 0.87;
    } else if (tempAmbiente <= 50) {
        factorTemp = 0.82;
    } else if (tempAmbiente <= 55) {
        factorTemp = 0.76;
    } else if (tempAmbiente <= 60) {
        factorTemp = 0.71;
    } else if (tempAmbiente <= 65) {
        factorTemp = 0.65;
    } else if (tempAmbiente <= 70) {
        factorTemp = 0.58;
    } else {
        factorTemp = 0.50;
    }

    var calibres = CONSTANTES.CALIBRES;
    var resultados = [];

    for (var i = 0; i < calibres.length; i++) {
        var datos = getAmpacidad(material, canalizacion, calibres[i]);
        if (!datos || datos.ampacidad <= 0) continue;

        // Ampacidad ajustada por temperatura y número de conductores
        var ampAjustada = datos.ampacidad * factorTemp * factorNumConductores;

        if (ampAjustada >= icarga) {
            resultados.push({
                calibre: calibres[i],
                ampacidad: datos.ampacidad,
                ampAjustada: ampAjustada,
                tamConductor: datos.tamConductor,
                factorTemp: factorTemp,
                factorNumCond: factorNumConductores,
                margen: ((ampAjustada / icarga - 1) * 100),
                calibreActual: calibres[i]
            });
        }
    }

    // Si no encontró ninguno, sugerir el más grande disponible
    if (resultados.length === 0) {
        for (var j = calibres.length - 1; j >= 0; j--) {
            var d = getAmpacidad(material, canalizacion, calibres[j]);
            if (d && d.ampacidad > 0) {
                resultados.push({
                    calibre: calibres[j],
                    ampacidad: d.ampacidad,
                    ampAjustada: d.ampacidad * factorTemp * factorNumConductores,
                    tamConductor: d.tamConductor,
                    factorTemp: factorTemp,
                    factorNumCond: factorNumConductores,
                    margen: ((d.ampacidad * factorTemp * factorNumConductores / icarga - 1) * 100),
                    calibreActual: calibres[j]
                });
                break;
            }
        }
    }

    return resultados;
}

/**
 * Convierte calibre AWG a área en mm² (aproximado por fórmula estándar)
 */
function awgAMm2(calibre) {
    if (calibre === '0') return 53.5;
    var n = parseInt(calibre, 10);
    if (calibre.startsWith('1/0')) n = 1;
    else if (calibre.startsWith('2/0')) n = 2;
    else if (calibre.startsWith('3/0')) n = 3;
    else if (calibre.startsWith('4/0')) n = 4;
    else n = parseInt(calibre, 10);
    if (isNaN(n)) return 0;
    return 0.0507 * Math.pow(92, (36 - n) / 39);
}

/**
 * Sugiere el calibre mínimo para todos los alimentadores
 * @returns {Array} Array de objetos { alimIdx, icarga, sugerido }
 */
function sugerirTodosAlimentadores() {
    var feeders = App.getFeeders ? App.getFeeders() : [];
    var V = parseFloat(document.getElementById('input-tension').value) || 220;
    var resultados = [];

    for (var i = 0; i < feeders.length; i++) {
        var f = feeders[i];
        var ic = f.cargaA || 0;
        if (ic <= 0) {
            resultados.push({ alimIdx: i, icarga: 0, sugerido: null, calibreActual: f.calibre, estado: 'sin-datos' });
            continue;
        }

        var opciones = sugerirCalibre(ic, V, f.material, f.canalizacion, 1, 30);
        if (opciones.length > 0) {
            var mejor = opciones[0]; // El primero ya es el más pequeño que cumple
            var mismoCalibre = mejor.calibre === f.calibre;
            resultados.push({
                alimIdx: i,
                icarga: ic,
                sugerido: mejor,
                calibreActual: f.calibre,
                estado: mismoCalibre ? 'correcto' : (mejor.ampAjustada < ic * 1.3 ? 'subdimensionado' : 'sobredimensionado')
            });
        } else {
            resultados.push({ alimIdx: i, icarga: ic, sugerido: null, calibreActual: f.calibre, estado: 'no-aplica' });
        }
    }

    return resultados;
}

if (typeof window !== 'undefined') {
    window.AMPACIDAD = AMPACIDAD;
}