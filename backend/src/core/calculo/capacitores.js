/**
 * capacitores.js — FASE 8
 * Aporte de corriente de banco de capacitores durante un cortocircuito.
 *
 * Durante los primeros ciclos de la falla, el banco de capacitores se descarga produciendo una
 * corriente de alta frecuencia y alta magnitud que se suma al cortocircuito simétrico.
 *
 * Metodologia:
 *   I_cap = Vcaida * sqrt(2) / Xc
 *   donde Xc = Vcaida^2 / Q_banco  (reactancia del banco)
 *   Xc del capacitor: depende del tipo (electrolítico: ~2-3% del impedance, instalación típica: Xc ≈ V²/Q × 0.025)
 *
 * Solo afecta la corriente pico asimétrica (no la simétrica, el capacitor se descarga en ~1/2 ciclo).
 * Se modela como un pulso exponencial: I_cap(t) = I_cap0 × e^(-t/Tc)
 * Donde Tc = Xc / (2 × π × f)
 * I_cap0 = Vcaida × sqrt(2) / Xc
 *
 * El aporte pico se suma como: I_pico_total = I_pico_red + I_pico_cap
 * No se suma a Isc simétrico porque el capacitor se descarga antes del primer cero de la onda.
 *
 * Referencia: IEEE Std 399 (Brown Book) Cap. 5.5, IEC 60909
 */
const CalculoCapacitores = (function() {

    /**
     * Constante: frecuencia del sistema (Hz)
     */
    var F_SISTEMA = 60;

    /**
     * Constante: reactancia típica de instalación (fracción de Xc nominal)
     * Xc_instalacion ≈ 0.025 × V²/Q (teórico: 1/(2πfC) → ajuste por instalación real)
     */
    var XC_FACTOR_INSTALACION = 0.025;

    /**
     * Calcula el aporte del banco de capacitores
     * @param {number} kvar     - Potencia reactiva del banco en kVAr
     * @param {number} Vcaida   - Tension del banco en V
     * @param {number} distancia - Distancia al punto de falla en metros (0 = en el punto)
     * @param {number} XcManual - Reactancia del banco en ohms (0 = calcular automáticamente)
     * @param {Array} feeders   - Array of feeder objects for resistance calculation
     * @param {Object} conductores - Conductor data structure
     * @returns {Object} { R, X, iCap0, Tc, iCap0_mA, iCapAmp, iCapPico, iCapPicoAmp }
     */
    function aporte(kvar, Vcaida, distancia, XcManual, feeders, conductores) {
        if (!kvar || kvar <= 0 || !Vcaida || Vcaida <= 0) {
            return { R: 0, X: 0, iCap0: 0, Tc: 0, iCap0_mA: 0, iCapAmp: 0, iCapPicoAmp: 0 };
        }

        var S_mva = kvar; // kVA (para simplificar, se usa directamente)
        var V_kV = Vcaida / 1000;
        var Xc;
        if (XcManual && XcManual > 0) {
            Xc = XcManual;
        } else {
            // Xc ≈ (Vcaida^2 / (kvar × 1000)) × XC_FACTOR_INSTALACION
            Xc = (Vcaida * Vcaida / (S_mva * 1000)) * XC_FACTOR_INSTALACION;
            // Asegurar que Xc sea razonable
            if (Xc < 0.01) Xc = 0.01;
        }

        // Resistencia de alimentador (usando los conductores del alimentador hasta el punto)
        var R_alim = 0;
        if (distancia > 0 && feeders && feeders.length > 0) {
            var R_acc = 0, X_acc = 0;
            var numTramos = Math.min(feeders.length, 8); // Máximo 8 tramos para cálculo de Z del alimentador
            for (var i = 0; i < numTramos; i++) {
                var datos = conductores[feeders[i].material] &&
                            conductores[feeders[i].canalizacion] &&
                            conductores[feeders[i].canalizacion][feeders[i].calibre];
                if (!datos) break;
                var n = Math.max(1, feeders[i].paralelo || 1);
                var L = feeders[i].longitud || 0;
                R_acc += (datos.R * L / 1000) / n;
                X_acc += (datos.X * L / 1000) / n;
            }
            R_alim = R_acc;
            // Si no hay datos, estimar con un valor mínimo
            if (R_alim < 0.001) R_alim = 0.01;
        }

        // Constante de tiempo del capacitor
        var Tc = Xc / (2 * Math.PI * F_SISTEMA); // Segundos
        if (Tc < 0.001) Tc = 0.001;

        // Corriente inicial de descarga (pico del pulso)
        var iCap0 = Vcaida * Math.SQRT2 / Xc; // Amperes
        var iCap0_mA = iCap0 * 1000; // miliamperes (para la curva de descarga)
        var iCapAmp = iCap0 / 1000; // kA (para sumar al pico)

        // Corriente pico del capacitor (en el primer cero de la onda de la corriente)
        var iCapPicoAmp = iCap0 * 1.42; // Factor de pico de capacitor (~1.42, IEEE 399 Cap. 5.5)
        // Nota: hay varias referencias: 1.42, √2, 1.33; uso 1.42 como promedio conservador

        return {
            R: R_alim,
            X: Xc,
            iCap0: iCapAmp,
            Tc: Tc,
            iCap0_mA: iCap0_mA,
            iCapAmp: iCapAmp,
            iCapPicoAmp: iCapPicoAmp,
            S_mva: S_mva,
            Vcaida: Vcaida,
            Xc: Xc,
            Tc_ms: Tc * 1000
        };
    }

    /**
     * Calcula el aporte de capacitor y lo agrega al pico asimétrico de cada punto
     * @param {number} numPuntos - Number of calculation points
     * @param {number} kvar - Capacitor bank power in kVAr
     * @param {number} Vcaida - Capacitor bank voltage in V
     * @param {number} distancia - Distance to fault point in meters
     * @param {Array} feeders - Array of feeder objects
     * @param {Object} conductores - Conductor data structure
     * @param {Array} aporteMotores - Motor contribution array with iAportePico
     * @returns {Array} Array of length numPuntos with { iCapPicoAmp, iCapPicoTotal, iCapPicoMotores }
     */
    function calcularPorPunto(numPuntos, kvar, Vcaida, distancia, feeders, conductores, aporteMotores) {
        if (!kvar || kvar <= 0 || !Vcaida || Vcaida <= 0 || distancia < 0) {
            return Array(numPuntos).fill({ iCapPicoAmp: 0, iCapPicoTotal: 0, iCapPicoMotores: 0 });
        }

        var aporte = aporte(kvar, Vcaida, distancia, 0, feeders, conductores);
        var resultados = [];
        var iCapPicoTotal = 0;
        var iCapPicoMotores = 0;
        var iCapPicoAmp = aporte.iCapPicoAmp;

        // El capacitor aporta a TODOS los puntos (es paralelo en el bus, afecta el primer cero)
        for (var i = 0; i < numPuntos; i++) {
            var ipMotores = 0;
            if (aporteMotores && aporteMotores[i]) {
                ipMotores = aporteMotores[i].iAportePico || 0;
            }
            iCapPicoTotal = iCapPicoAmp + ipMotores;
            resultados.push({
                iCapPicoAmp: iCapPicoAmp,
                iCapPicoTotal: iCapPicoTotal,
                iCapPicoMotores: ipMotores
            });
        }
        return resultados;
    }

    return {
        aporte: aporte,
        calcularPorPunto: calcularPorPunto,
        F_SISTEMA: F_SISTEMA,
        XC_FACTOR_INSTALACION: XC_FACTOR_INSTALACION
    };
})();

module.exports = CalculoCapacitores;
