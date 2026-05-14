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
            '14':{amp:0,tam:2.1},'12':{amp:15,tam:3.3},'10':{amp:25,tam:5.3},'8':{amp:30,tam:8.4},
            '6':{amp:40,tam:13.3},'4':{amp:55,tam:21.2},'2':{amp:75,tam:33.6},'1':{amp:85,tam:42.4},
            '1/0':{amp:100,tam:53.5},'2/0':{amp:115,tam:67.4},'3/0':{amp:130,tam:85},
            '4/0':{amp:150,tam:107.2},'250':{amp:170,tam:127},'300':{amp:190,tam:152},
            '350':{amp:210,tam:177},'400':{amp:225,tam:203},'500':{amp:260,tam:253},
            '600':{amp:285,tam:304},'750':{amp:320,tam:385},'1000':{amp:375,tam:507}
        },
        pvc: {
            '14':{amp:0,tam:2.1},'12':{amp:15,tam:3.3},'10':{amp:25,tam:5.3},'8':{amp:30,tam:8.4},
            '6':{amp:40,tam:13.3},'4':{amp:55,tam:21.2},'2':{amp:75,tam:33.6},'1':{amp:85,tam:42.4},
            '1/0':{amp:100,tam:53.5},'2/0':{amp:115,tam:67.4},'3/0':{amp:130,tam:85},
            '4/0':{amp:150,tam:107.2},'250':{amp:170,tam:127},'300':{amp:190,tam:152},
            '350':{amp:210,tam:177},'400':{amp:225,tam:203},'500':{amp:260,tam:253},
            '600':{amp:285,tam:304},'750':{amp:320,tam:385},'1000':{amp:375,tam:507}
        }
    }
};

/**
 * Obtiene la ampacidad de un conductor
 * @returns {Object|null} { ampacidad, tamConductor }
 */
function getAmpacidad(material, canalizacion, calibre) {
    // Normalizar material para búsqueda (ej: "Cobre (Cu)" -> "cobre")
    var mat = (material || 'cobre').toLowerCase();
    if (mat.includes('cobre') || mat.includes('cu')) mat = 'cobre';
    if (mat.includes('aluminio') || mat.includes('al')) mat = 'aluminio';

    // Normalizar canalización (ej: "conduit" -> "acero")
    var cond = (canalizacion || 'acero').toLowerCase();
    if (cond.includes('pvc')) cond = 'pvc';
    if (cond.includes('acero') || cond.includes('conduit') || cond.includes('emt')) cond = 'acero';

    var cal = String(calibre);

    var datos = AMPACIDAD[mat] && AMPACIDAD[mat][cond] && AMPACIDAD[mat][cond][cal];
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

    // Factor de corrección por temperatura (NOM-001 Tabla 310.15) corregido a columna 90C
    var factorTemp = 1.0;
    if (typeof CONSTANTES !== 'undefined' && CONSTANTES.FACTOR_TEMPERATURA) {
        var tempKey = 'default';
        var keys = Object.keys(CONSTANTES.FACTOR_TEMPERATURA);
        for (var k = 0; k < keys.length; k++) {
            if (keys[k] === 'default') continue;
            var range = keys[k].split('-');
            if (tempAmbiente >= parseInt(range[0]) && tempAmbiente <= parseInt(range[1])) {
                tempKey = keys[k];
                break;
            }
        }
        factorTemp = CONSTANTES.FACTOR_TEMPERATURA[tempKey]['90'] || CONSTANTES.FACTOR_TEMPERATURA.default;
    }

    var calibres = CONSTANTES.CALIBRES;
    var resultados = [];

    // Determinar temperatura base segun carga (NOM-001 Art. 110.14C)
    // < 100A usa columna de 60°C, >= 100A usa columna de 75°C
    var limiteTransicion = CONSTANTES.TEMP_CONDUCTOR_POR_CORRIENTE || 100;
    var tempRating = (icarga < limiteTransicion) ? '60' : '75';
    var tablaAmp = (material.toLowerCase().includes('al')) ? CONSTANTES.AMPACIDAD_AL : CONSTANTES.AMPACIDAD_CU;

    for (var i = 0; i < calibres.length; i++) {
        var calibre = calibres[i];
        var datos = getAmpacidad(material, canalizacion, calibre);
        if (!datos) continue;

        // Obtener ampacidad base segun transicion de temperatura (prioriza datos de CONSTANTES)
        var ampBase = (tablaAmp && tablaAmp[tempRating]) ? (tablaAmp[tempRating][calibre] || datos.amp) : datos.amp;
        if (ampBase <= 0) continue;

        // Ampacidad ajustada por temperatura ambiente (columna 90C) y agrupamiento
        var ampAjustada = ampBase * factorTemp * factorNumConductores;

        if (ampAjustada >= icarga) {
            resultados.push({
                calibre: calibre,
                ampacidad: ampBase,
                ampAjustada: ampAjustada,
                tamConductor: datos.tam,
                factorTemp: factorTemp,
                factorNumCond: factorNumConductores,
                margen: ((ampAjustada / icarga - 1) * 100),
                calibreActual: calibre
            });
        }
    }

    // Si no encontró ninguno, sugerir el más grande disponible
    if (resultados.length === 0) {
        for (var j = calibres.length - 1; j >= 0; j--) {
            var calibreFallback = calibres[j];
            var d = getAmpacidad(material, canalizacion, calibreFallback);
            if (d) {
                var ampBaseFallback = (tablaAmp && tablaAmp[tempRating]) ? (tablaAmp[tempRating][calibreFallback] || d.amp) : d.amp;
                if (ampBaseFallback > 0) {
                    resultados.push({
                        calibre: calibreFallback,
                        ampacidad: ampBaseFallback,
                        ampAjustada: ampBaseFallback * factorTemp * factorNumConductores,
                        tamConductor: d.tam,
                        factorTemp: factorTemp,
                        factorNumCond: factorNumConductores,
                        margen: ((ampBaseFallback * factorTemp * factorNumConductores / icarga - 1) * 100),
                        calibreActual: calibreFallback
                    });
                    break;
                }
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

        var opciones = sugerirCalibre(ic, V, f.material, f.canalizacion, f.numConductores || 1, f.tempAmbiente || 30);
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
