/**
 * motores.js — FASE 4
 * Calculo del aporte de corriente de motores durante un cortocircuito.
 *
 * Motor de induccion:
 *   S_motor = (HP * 0.746) / Ef
 *   I_aporte = S_motor / (V * sqrt(3)) * (1 / Xd'')
 *
 * Motor sincrono:
 *   Similar pero con Xd'' tipico distinto
 *
 * El aporte se suma como corriente adicional en paralelo
 * en el punto donde estan conectados los motores.
 * Solo afecta los primeros ciclos (0.5-1 s).
 *
 * Referencia: IEEE Std 399 (Brown Book), Cap. 5
 */
const CalculoMotores = (function() {

    // Xd'' subtransitorio tipico
    var XDPP_TIPO = {
        induccion: { bajo: 0.167, alto: 0.20 },   // bajo <1000HP, alto >=1000HP
        sincrono:   { bajo: 0.15,  alto: 0.20 }
    };

    // Eficiencia tipica por rango de HP
    var EFICIENCIA_TIPO = {
        induccion: { bajo: 0.88, medio: 0.92, alto: 0.95 },  // <100HP, 100-500HP, >500HP
        sincrono:   { bajo: 0.90, medio: 0.94, alto: 0.96 }
    };

    // X/R tipico para calculo de pico
    var XR_MOTOR = 10;

    /**
     * Obtiene Xd'' subtransitorio segun tipo y HP
     */
    function getXdpp(tipo, hp) {
        var rango = hp >= 1000 ? 'alto' : 'bajo';
        return XDPP_TIPO[tipo] ? XDPP_TIPO[tipo][rango] : 0.167;
    }

    /**
     * Obtiene eficiencia tipica segun tipo y HP
     */
    function getEficiencia(tipo, hp) {
        if (hp < 100) return EFICIENCIA_TIPO[tipo] ? EFICIENCIA_TIPO[tipo].bajo : 0.88;
        if (hp <= 500) return EFICIENCIA_TIPO[tipo] ? EFICIENCIA_TIPO[tipo].medio : 0.92;
        return EFICIENCIA_TIPO[tipo] ? EFICIENCIA_TIPO[tipo].alto : 0.95;
    }

    /**
     * Calcula el aporte de un grupo de motores
     * @param {Object} motor - { hp, tipo, xdpp, eficiencia }
     * @param {number} V     - Tension del sistema en V
     * @param {number} factor - sqrt(3) trifasico, 2 monofasico
     * @returns {Object} { iAporte (A), iAportePico (A), sMotor (kVA), xdppUsado, efUsada }
     */
    function calcularAporte(motor, V, factor) {
        var hp = Math.max(0, motor.hp || 0);
        if (hp <= 0) return { iAporte: 0, iAportePico: 0, sMotor: 0, xdppUsado: 0, efUsada: 0 };

        var tipo = motor.tipo || 'induccion';

        // Usar valores proporcionados o tipicos
        var xdpp = motor.xdpp > 0 ? motor.xdpp : getXdpp(tipo, hp);
        var ef = motor.eficiencia > 0 ? motor.eficiencia : getEficiencia(tipo, hp);

        // Potencia aparente del motor en kVA
        var sMotor = (hp * 0.746) / ef; // kVA

        // Corriente nominal del motor
        var iNominal = (sMotor * 1000) / (V * factor); // A

        // Corriente de aporte subtransitorio (1/Xd'' veces la nominal)
        var iAporte = iNominal / xdpp; // A

        // Corriente pico con factor de asimetria del motor
        var xrMotor = XR_MOTOR;
        var iAportePico = iAporte * Math.SQRT2 * (1 + Math.exp(-Math.PI / xrMotor));

        return {
            iAporte: iAporte,
            iAportePico: iAportePico,
            sMotor: sMotor,
            xdppUsado: xdpp,
            efUsada: ef
        };
    }

    /**
     * Calcula el aporte acumulado por punto.
     * Los motores conectados en el punto N o en puntos previos aportan.
     *
     * @param {Array} motores - Lista de motores con { hp, tipo, xdpp, eficiencia, punto }
     * @param {number} numPuntos - Numero total de puntos del sistema
     * @param {number} V        - Tension del sistema
     * @param {number} factor   - sqrt(3) o 2
     * @returns {Array} Array de longitud numPuntos con { iAporte, iAportePico, detalle } por punto
     */
    function calcularPorPunto(motores, numPuntos, V, factor) {
        // Inicializar acumuladores por punto
        var acumI = new Array(numPuntos).fill(0);
        var acumIpico = new Array(numPuntos).fill(0);
        var detalle = new Array(numPuntos).fill(null).map(function() { return []; });

        for (var m = 0; m < motores.length; m++) {
            var motor = motores[m];
            var aporte = calcularAporte(motor, V, factor);

            if (aporte.iAporte <= 0) continue;

            var puntoMotor = Math.max(0, Math.min(numPuntos - 1, motor.punto || 0));

            // El motor aporta a su punto y a todos los puntos posteriores
            for (var p = puntoMotor; p < numPuntos; p++) {
                acumI[p] += aporte.iAporte;
                acumIpico[p] += aporte.iAportePico;
            }

            // Guardar detalle del motor en su punto
            detalle[puntoMotor].push({
                hp: motor.hp,
                tipo: motor.tipo,
                iAporte: aporte.iAporte,
                iAportePico: aporte.iAportePico,
                sMotor: aporte.sMotor,
                xdpp: aporte.xdppUsado,
                ef: aporte.efUsada
            });
        }

        var resultado = [];
        for (var i = 0; i < numPuntos; i++) {
            resultado.push({
                iAporte: acumI[i],
                iAportePico: acumIpico[i],
                detalle: detalle[i]
            });
        }
        return resultado;
    }

    /**
     * Calcula corriente nominal de un motor
     * P = √3 * V * I * fp * eficiencia
     * @param {Object} params - Parámetros del motor
     * @param {number} params.potencia_kw - Potencia en kW
     * @param {number} params.voltaje - Voltaje del sistema en V
     * @param {number} params.eficiencia - Eficiencia (default 0.9)
     * @param {number} params.fp - Factor de potencia (default 0.85)
     * @returns {number} Corriente nominal en A
     */
    function corrienteNominal({ potencia_kw, voltaje, eficiencia = 0.9, fp = 0.85 }) {
        if (!potencia_kw || !voltaje) {
            throw new Error('Datos incompletos en motor: potencia_kw y voltaje son requeridos');
        }

        // P = √3 * V * I * fp * eficiencia
        const I = (potencia_kw * 1000) / (Math.sqrt(3) * voltaje * fp * eficiencia);

        return I;
    }

    /**
     * Aporte inicial al cortocircuito (subtransitorio)
     * típicamente 4 a 6 veces la corriente nominal
     * @param {number} I_nominal - Corriente nominal
     * @param {number} factor - Factor de multiplicación (default 5)
     * @returns {number} Aporte inicial en A
     */
    function aporteInicialMotor(I_nominal, factor = 5) {
        return I_nominal * factor;
    }

    /**
     * Factor de decremento exponencial
     * I(t) = I0 * e^(-t / T)
     * @param {number} t - Tiempo en segundos
     * @param {number} T - Constante de tiempo (default 0.05s para subtransitorio)
     * @returns {number} Factor de decremento (0-1)
     */
    function factorDecremento(t, T = 0.05) {
        if (t < 0) return 1; // t=0, sin decremento
        return Math.exp(-t / T);
    }

    /**
     * Aporte de un motor en el tiempo (modelo exponencial)
     * @param {Object} params - Parámetros
     * @param {Object} params.motor - Datos del motor { potencia_kw, voltaje }
     * @param {number} params.t - Tiempo en segundos
     * @param {number} params.factor_aporte - Factor de aporte inicial (default 5)
     * @param {number} params.constante_tiempo - Constante de tiempo T (default 0.05)
     * @param {number} params.eficiencia - Eficiencia del motor
     * @param {number} params.fp - Factor de potencia
     * @returns {Object} { I_nominal, I_inicial, I_t, t }
     */
    function aporteMotorEnTiempo({
        motor,
        t,
        factor_aporte = 5,
        constante_tiempo = 0.05,
        eficiencia = 0.9,
        fp = 0.85
    }) {
        const I_nom = corrienteNominal({
            potencia_kw: motor.potencia_kw || motor.hp * 0.746,
            voltaje: motor.voltaje,
            eficiencia,
            fp
        });

        const I0 = aporteInicialMotor(I_nom, factor_aporte);
        const decay = factorDecremento(t, constante_tiempo);
        const I_t = I0 * decay;

        return {
            I_nominal: I_nom,
            I_inicial: I0,
            I_t: I_t,
            t: t,
            nombre: motor.nombre || `Motor ${motor.potencia_kw || motor.hp}kW`
        };
    }

    /**
     * Aporte total de múltiples motores en el tiempo
     * @param {Object} params - Parámetros
     * @param {Array} params.motores - Lista de motores
     * @param {number} params.t - Tiempo en segundos
     * @param {number} params.factor_aporte - Factor de aporte
     * @param {number} params.constante_tiempo - Constante de tiempo
     * @returns {Object} { total_aporte, motores, tiempo }
     */
    function aporteMotoresTotal({
        motores = [],
        t = 0,
        factor_aporte = 5,
        constante_tiempo = 0.05
    }) {
        let total = 0;
        const detalle = [];

        for (const motor of motores) {
            const res = aporteMotorEnTiempo({
                motor,
                t,
                factor_aporte,
                constante_tiempo
            });

            total += res.I_t;
            detalle.push(res);
        }

        return {
            total_aporte: total,
            motores: detalle,
            tiempo: t
        };
    }

    /**
     * Genera curva de aporte de motores vs tiempo (0-200ms)
     * @param {Array} motores - Lista de motores
     * @param {number} duracion - Duración en segundos (default 0.2)
     * @param {number} pasos - Número de puntos (default 20)
     * @returns {Array} Curva [{ t, icc_motores }]
     */
    function generarCurvaMotores(motores, duracion = 0.2, pasos = 20) {
        const curva = [];
        const dt = duracion / pasos;

        for (let i = 0; i <= pasos; i++) {
            const t = i * dt;
            const aporte = aporteMotoresTotal({ motores, t });

            curva.push({
                t: parseFloat(t.toFixed(4)),
                icc_motores: parseFloat(aporte.total_aporte.toFixed(2)),
                icc_motores_ka: parseFloat((aporte.total_aporte / 1000).toFixed(3))
            });
        }

        return curva;
    }

    return {
        calcularAporte: calcularAporte,
        calcularPorPunto: calcularPorPunto,
        getXdpp: getXdpp,
        getEficiencia: getEficiencia,
        XR_MOTOR: XR_MOTOR,
        // Nuevas funciones con modelo exponencial
        corrienteNominal: corrienteNominal,
        aporteInicialMotor: aporteInicialMotor,
        factorDecremento: factorDecremento,
        aporteMotorEnTiempo: aporteMotorEnTiempo,
        aporteMotoresTotal: aporteMotoresTotal,
        generarCurvaMotores: generarCurvaMotores
    };
})();

module.exports = CalculoMotores;
