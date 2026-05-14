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
var CalculoMotores = (function() {

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
     * @param {Array} nodos     - Lista de nodos para mapear IDs a índices
     * @returns {Array} Array de longitud numPuntos con { iAporte, iAportePico, detalle } por punto
     */
    function calcularPorPunto(motores, numPuntos, V, factor, nodos) {
        // Inicializar acumuladores por punto
        var acumI = new Array(numPuntos).fill(0);
        var acumIpico = new Array(numPuntos).fill(0);
        var detalle = new Array(numPuntos).fill(null).map(function() { return []; });

        // Crear mapa de ID de nodo a índice
        var nodoMap = {};
        if (nodos && nodos.length > 0) {
            for (var i = 0; i < nodos.length; i++) {
                nodoMap[nodos[i].id] = i;
            }
        }

        for (var m = 0; m < motores.length; m++) {
            var motor = motores[m];
            var aporte = calcularAporte(motor, V, factor);

            if (aporte.iAporte <= 0) continue;

            // Convertir ID de nodo a índice (ej. 'P0' -> 0)
            var puntoMotor = 0;
            if (typeof motor.punto === 'string' && nodoMap[motor.punto] !== undefined) {
                puntoMotor = nodoMap[motor.punto];
            } else if (typeof motor.punto === 'number') {
                puntoMotor = Math.max(0, Math.min(numPuntos - 1, motor.punto));
            }

            // Validar que el índice esté en rango
            if (puntoMotor < 0 || puntoMotor >= numPuntos) {
                puntoMotor = 0; // Default al primer punto
            }

            // El motor aporta a su punto y a todos los puntos posteriores
            for (var p = puntoMotor; p < numPuntos; p++) {
                acumI[p] += aporte.iAporte;
                acumIpico[p] += aporte.iAportePico;
            }

            // Guardar detalle del motor en su punto
            if (detalle[puntoMotor]) {
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
        }

        var resultado = [];
        for (var i = 0; i < numPuntos; i++) {
            resultado.push({
                iAporte: acumI[i],
                iAportePico: acumIpico[i],
                detalle: detalle[i] || []
            });
        }
        return resultado;
    }

    return {
        calcularAporte: calcularAporte,
        calcularPorPunto: calcularPorPunto,
        getXdpp: getXdpp,
        getEficiencia: getEficiencia,
        XR_MOTOR: XR_MOTOR
    };
})();

if (typeof window !== 'undefined') {
    window.CalculoMotores = CalculoMotores;
}