/**
 * caida_tension.js — FASE 1
 * Calculo de caida de tension en regimen permanente por alimentador.
 *
 * Trifasico:  Vcaida = sqrt(3) * I * (R*cos(fi) + X*sin(fi)) * L / 1000
 * Monofasico: Vcaida = 2 * I * (R*cos(fi) + X*sin(fi)) * L / 1000
 * %Caida = Vcaida / V * 100
 *
 * Referencia: NEC Art. 215.2(A)(1), NOM-001 Art. 210-19
 */
var CaidaTension = (function() {

    /**
     * Calcula la caida de tension de un alimentador
     * @param {Object} feeder  - Datos del conductor { material, canalizacion, calibre, longitud, paralelo }
     * @param {number} Icarga  - Corriente de carga en amperes
     * @param {number} fp      - Factor de potencia (0 a 1)
     * @param {number} V       - Tension del sistema en V
     * @param {string} tipo    - '3f' o '1f'
     * @returns {Object} { caidaV, caidaPct, ok, limite }
     */
    function calcular(feeder, Icarga, fp, V, tipo) {
        // Sin datos de carga: resultado neutro
        if (!Icarga || Icarga <= 0 || !fp || fp <= 0) {
            return { caidaV: 0, caidaPct: 0, ok: true, limite: CONSTANTES.CAIDA_MAXIMA_ALIMENTADOR };
        }

        // Obtener impedancia del conductor
        var datos = CONDUCTORES[feeder.material] &&
                    CONDUCTORES[feeder.material][feeder.canalizacion] &&
                    CONDUCTORES[feeder.material][feeder.canalizacion][feeder.calibre];

        if (!datos) {
            return { caidaV: 0, caidaPct: 0, ok: true, limite: CONSTANTES.CAIDA_MAXIMA_ALIMENTADOR, error: 'Calibre no encontrado' };
        }

        var n = Math.max(1, feeder.paralelo || 1);
        var L = Math.max(0, feeder.longitud || 0);

        // R y X del tramo en ohms
        var R = (datos.R * L / 1000) / n;
        var X = (datos.X * L / 1000) / n;

        // Componentes de potencia
        var cosFi = Math.min(1, Math.max(0, fp));
        var sinFi = Math.sqrt(Math.max(0, 1 - Math.pow(cosFi, 2)));

        // Factor multiplicador segun tipo de sistema
        var factor = tipo === '3f' ? Math.sqrt(3) : 2;

        // Caida de tension en volts
        var caidaV = factor * Icarga * (R * cosFi + X * sinFi);

        // Porcentaje respecto a la tension
        var caidaPct = (caidaV / V) * 100;

        // Verificar contra limite (3% para alimentadores, tipico NOM-001)
        var limite = CONSTANTES.CAIDA_MAXIMA_ALIMENTADOR;
        var ok = caidaPct <= limite;

        return {
            caidaV: caidaV,
            caidaPct: caidaPct,
            ok: ok,
            limite: limite,
            R_tramo: R,
            X_tramo: X,
            cosFi: cosFi,
            sinFi: sinFi
        };
    }

    /**
     * Calcula la caida acumulada hasta cada punto (suma de caidas parciales)
     * @param {Array} nodos       - Estructura de nodos en árbol
     * @param {number} V          - Tension del sistema
     * @param {string} tipo       - '3f' o '1f'
     * @returns {Array} Array de objetos con caida acumulada por punto
     */
    function calcularAcumulada(nodos, V, tipo) {
        var resultados = [];

        (nodos || []).forEach(function(nodo) {
            var camino = Impedancias.obtenerCamino(nodo.id, nodos);
            var totalV = 0;
            var ultimoParcial = { caidaV: 0, caidaPct: 0 };

            camino.forEach(function(id) {
                var n = nodos.find(function(item) { return item.id === id; });
                if (n && n.feeder && n.parentId) {
                    var p = calcular(n.feeder, n.feeder.cargaA || 0, n.feeder.cargaFP || 0, V, tipo);
                    totalV += p.caidaV;
                    ultimoParcial = p;
                }
            });

            var pct = (totalV / V) * 100;
            resultados.push({
                id: nodo.id,
                caidaV: totalV,
                caidaPct: pct,
                ok: pct <= CONSTANTES.CAIDA_MAXIMA_TOTAL,
                limite: CONSTANTES.CAIDA_MAXIMA_TOTAL,
                parcial: ultimoParcial
            });
        });

        return resultados;
    }

    return {
        calcular: calcular,
        calcularAcumulada: calcularAcumulada
    };
})();

if (typeof window !== 'undefined') {
    window.CaidaTension = CaidaTension;
}