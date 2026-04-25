/**
 * curvas_equipo.js — FASE 7
 * Parametros de curvas de disparo para coordonograma.
 *
 * Las curvas están basadas en los ajustes tipicos de interruptores Square D
 * (Schneider Electric / Marca Registrada), que es la referencia dominante
 * en el mercado mexicano.
 *
 * Cada equipo tiene:
 *   - Longitud: rango de corriente de ajuste
 *   - Tipo: 'termomagnetico' | 'electronico' | 'fusible'
 *   - Puntos de curva: [{ I (A), t (s) }] para graficar
 *
 * Curvas de disparo de Square D:
 * - ICB/MCCB (curvas tipo LI/LMI): normal inversa, muy inversa, fija
 *   - MCB (curvas tipo C/B): curvas B, C, D, K
 * - Fusibles: curvas tipo gG, aM, aR, clase CC
 *
 * Referencia: Catálogo Square D 2024, guías de coordinación Schneider
 */
var CURVAS_EQUIPO = {
    icb: {
        nombre: 'ICB/MCCB Square D',
        modelos: [
            {
                nombre: 'ICB 100A 10kA',
                rango: [50, 125],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(100, 50, 125, 0.08, 5.0)
            },
            {
                nombre: 'ICB 250A 25kA',
                rango: [125, 300],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(250, 125, 300, 0.06, 4.0)
            },
            {
                nombre: 'ICB 250A 35kA',
                rango: [125, 300],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(250, 125, 300, 0.04, 2.5)
            },
            {
                nombre: 'ICB 600A 42kA',
                rango: [300, 720],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(600, 300, 720, 0.04, 3.0)
            },
            {
                nombre: 'ICB 800A 65kA',
                rango: [400, 960],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(800, 400, 960, 0.04, 3.0)
            },
            {
                nombre: 'ICB 1000A 85kA',
                rango: [500, 1200],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(1000, 500, 1200, 0.03, 2.5)
            },
            {
                nombre: 'ICB 1600A 100kA',
                rango: [800, 1920],
                tipo: 'electronica',
                puntos: generadorPuntosElectronico(1600, 800, 1920, 0.025, 2.5)
            }
        ]
    },
    mcb: {
        nombre: 'MCB Square D (curva tipo C)',
        modelos: [
            { nombre: 'MCB 20A curva C', rango: [60, 100], tipo: 'curvaC', puntos: generadorCurvaC(20, 60, 100) },
            { nombre: 'MCB 32A curva C', rango: [80, 160], tipo: 'curvaC', puntos: generadorCurvaC(32, 80, 160) },
            { nombre: 'MCB 50A curva C', rango: [125, 250], tipo: 'curvaC', puntos: generadorCurvaC(50, 125, 250) },
            { nombre: 'MCB 63A curva C', rango: [160, 315], tipo: 'curvaC', puntos: generadorCurvaC(63, 160, 315) },
            { nombre: 'MCB 100A curva C', rango: [250, 500], tipo: 'curvaC', puntos: generadorCurvaC(100, 250, 500) }
        ]
    },
    fusible: {
        nombre: 'Fusibles Square D',
        modelos: [
            { nombre: 'Fusible gG 30A', rango: [40, 200], tipo: 'fusible', puntos: generadorPuntosFusible(30, 40, 200, 0.12, 4.0) },
            { nombre: 'Fusible gG 60A', rango: [70, 400], tipo: 'fusible', puntos: generadorPuntosFusible(60, 70, 400, 0.10, 3.5) },
            { nombre: 'Fusible gG 100A', rango: [125, 600], tipo: 'fusible', puntos: generadorPuntosFusible(100, 125, 600, 0.08, 3.0) },
            { nombre: 'Fusible gG 200A', rango: [250, 1200], tipo: 'fusible', puntos: generadorPuntosFusible(200, 250, 1200, 0.06, 2.5) },
            { nombre: 'Fusible clase CC 30A', rango: [30, 300], tipo: 'fusible', puntos: generadorPuntosFusible(30, 30, 300, 0.06, 3.5) }
        ]
    },
    contacto_respaldo: {
        nombre: 'Contactor con relevo Square D',
        modelos: [
            { nombre: 'Contactor LC1D09 9A', rango: [5, 100], tipo: 'fijo', puntos: generadorPuntosFijo(9, 5, 100, 0.10) },
            { nombre: 'Contactor LC1D18 25A', rango: [15, 250], tipo: 'fijo', puntos: generadorPuntosFijo(25, 15, 250, 0.10) },
            { nombre: 'Contactor LC1D25 40A', rango: [25, 400], tipo: 'fijo', puntos: generadorPuntosFijo(40, 25, 400, 0.10) },
            { nombre: 'Contactor LC1D32 65A', rango: [40, 650], tipo: 'fijo', puntos: generadorPuntosFijo(65, 40, 650, 0.10) }
        ]
    }
};

/**
 * Genera puntos de curva para interruptor electrónico Square D (curva tipo LI/LMI)
 * Iec 60255: t = k / (I^n - 1)
 * @param {number} inNom  - Corriente nominal del interruptor
 * @param {number} iMin   - Inicio del rango
 * @param {number} iMax   - Fin del rango
 * @param {number} exponente - Exponente n (tipico 0.04-0.08)
 * @param {number} kBase  - Constante de tiempo en segundos
 * @returns {Array} Puntos { I, t }
 */
function generadorPuntosElectronico(inNom, iMin, iMax, exponente, kBase) {
    var puntos = [];
    var numPuntos = 40;
    var paso = (iMax - iMin) / numPuntos;
    for (var i = 0; i <= numPuntos; i++) {
        var I = iMin + paso * i;
        var Iref = Math.max(I, inNom);
        var t;
        if (I <= inNom) {
            // Debajo de In: tiempo infinito (no dispara)
            t = 9999;
        } else {
            // Por encima de In: t = k * (In/I - 1)^n
            var ratio = inNom / Iref;
            t = kBase * Math.pow(ratio - 1, exponente);
            t = Math.min(t, 9999);
        }
        puntos.push({ I: I, t: t });
    }
    return puntos;
}

/**
 * Genera puntos de curva tipo C para MCB Square D (IEC 60255)
 * Valores aproximados basados en datos de catálogo
 * @param {number} inNom - Corriente nominal del MCB
 * @param {number} iMin  - Inicio del rango
 * @param {number} iMax  - Fin del rango
 * @returns {Array} Puntos { I, t }
 */
function generadorCurvaC(inNom, iMin, iMax) {
    // Datos aproximados de curvas tipo C de Square D
    // Relación tiempo-corriente no sigue una fórmula simple, se generan puntos empíricos
    var curvasC = {
        20:  [ {i:60,t:100},{i:70,t:30},{i:80,t:12},{i:90,t:6},{i:100,t:2.5},{i:120,t:1.0},{i:150,t:0.45},{i:200,t:0.2}  ],
        32:  [ {i:80,t:120},{i:100,t:20},{i:120,t:8},{i:150,t:3.5},{i:160,t:2.5},{i:200,t:1.0},{i:250,t:0.5},{i:320,t:0.2}  ],
        50:  [ {i:125,t:150},{i:150,t:30},{i:175,t:12},{i:200,t:6},{i:225,t:3.5},{i:250,t:2.0},{i:300,t:0.8},{i:400,t:0.3}  ],
        63:  [ {i:160,t:180},{i:200,t:25},{i:225,t:10},{i:250,t:6},{i:275,t:4},{i:315,t:2.0},{i:400,t:0.8},{i:500,t:0.3}  ],
        100: [ {i:250,t:200},{i:300,t:40},{i:350,t:15},{i:400,t:7},{i:450,t:4},{i:500,t:2.0},{i:600,t:0.8},{i:750,t:0.3}  ]
    };
    var datos = curvasC[inNom] || curvasC[20];
    return datos.map(function(d) { return { I: d.i, t: d.t }; });
}

/**
 * Genera puntos de curva de fusible (log-log)
 * I = k * 10^((V - log10(t)) / a)
 * Simplificado: puntos empíricos basados en catálogos Square D
 * @param {number} inNom  - Corriente nominal del fusible
 * @param {number} iMin   - Inicio del rango
 * @param {number} iMax   - Fin del rango
 * @param {number} iFusible - Corriente nominal del fusible
 * @param {number} a      - Pendiente log-log (típicamente 2.0-4.0)
 * @param {number} tMax   - Tiempo máximo (s) para el rango
 * @returns {Array} Puntos { I, t }
 */
function generadorPuntosFusible(inNom, iMin, iMax, a, tMax) {
    var puntos = [];
    var numPuntos = 35;
    var paso = (iMax - iMin) / numPuntos;
    a = a || 2.5;
    tMax = tMax || 5;

    for (var i = 0; i <= numPuntos; i++) {
        var I = iMin + paso * i;
        var t;
        if (I <= inNom) {
            t = 9999;
        } else {
            // Modelo log-log simplificado: t = tMax * (inNom / I)^(10 / a)
            t = tMax * Math.pow(inNom / I, 10 / a);
            t = Math.min(t, 9999);
        }
        puntos.push({ I: I, t: t });
    }
    return puntos;
}

/**
 * Genera puntos de curva fija (tiempo constante)
 * Usado para contactores con relevé
 */
function generadorPuntosFijo(inNom, iMin, iMax, tFijo) {
    tFijo = tFijo || 0.1;
    var puntos = [];
    var numPuntos = 15;
    var paso = (iMax - iMin) / numPuntos;
    for (var i = 0; i <= numPuntos; i++) {
        var I = iMin + paso * i;
        var t = I > inNom ? tFijo : 9999;
        puntos.push({ I: I, t: t });
    }
    return puntos;
}

/**
 * Encuentra la curva asociada a un equipo dado su tipo y modelo
 */
function getCurvaEquipo(equipTipo, modeloIdx) {
    if (!equipTipo || modeloIdx === '' || modeloIdx === null) return null;
    var modeloIdxNum = parseInt(modeloIdx, 10) || 0;
    var datos = CURVAS_EQUIPO[equipTipo];
    if (!datos) return null;
    if (modeloIdxNum >= 0 && modeloIdxNum < datos.modelos.length) {
        return datos.modelos[modeloIdxNum];
    }
    return null;
}