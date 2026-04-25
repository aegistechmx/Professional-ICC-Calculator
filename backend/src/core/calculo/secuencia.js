/**
 * secuencia.js — FASE 5
 * Calculo de falla fase-tierra con componentes de secuencia.
 *
 * Para un sistema trifasico con neutro solidamente aterrizado:
 *   If = 3*Vf / (Z1 + Z2 + Z0)
 *   Si Z2 ≈ Z1 (componentes estaticos):
 *   If = 3*Vf / (2*Z1 + Z0) = V_LL / (sqrt(3) * (2*Z1 + Z0))
 *
 * Para monofasico (fase-neutro):
 *   If = V_FN / (Z1 + Z0)
 *
 * Z0 = Z0_fuente + Z0_trafo + sum(Z0_cables) + Z0_retorno_tierra
 *
 * Donde:
 *   Z0_cable = (R0 + jX0) * L / 1000 / n
 *   R0 = R_fase * FACTOR_R0_NEUTRO (neutro mismo calibre, default 2)
 *   X0 = de tabla segun configuracion geometrica
 *   Z0_retorno_tierra = R_tierra (resistiva, parametro configurable)
 *
 * Para transformador:
 *   Yg solido: Z0_trafo ≈ Z_trafo
 *   Yg resistencia: Z0_trafo ≈ Z_trafo + Z_neutro (modelo simplificado: Z_trafo * FACTOR)
 *   Delta: Z0_trafo → infinito (no hay camino de falla a tierra en delta)
 *
 * Referencia: IEEE Std 399 (Brown Book) Cap. 4-5, IEC 60909
 */
const Impedancias = require('./impedancias');
const CONSTANTES = require('./constantes');

const Secuencia = (function() {

    /**
     * Calcula Z0 de un tramo de conductor para secuencia cero
     * @param {Object} feeder - { material, canalizacion, calibre, longitud, paralelo }
     * @param {string} x0Config - Configuracion geometrica ('plano_acero', etc.)
     * @param {Object} conductoresX0 - Data structure with X0 values
     * @param {Object} conductores - Data structure with conductor impedances
     * @returns {Object} { R0, X0, Z0 } en ohms
     */
    function impedanciaCero(feeder, x0Config, conductoresX0, conductores) {
        // Obtener X0 de la tabla segun configuracion
        var x0Tabla = conductoresX0[x0Config];
        if (!x0Tabla) x0Tabla = conductoresX0[CONSTANTES.Z0_CONFIG_DEFAULT] || conductoresX0.plano_acero;
        var x0Valor = x0Tabla[feeder.calibre];
        if (!x0Valor) return { R0: 0, X0: 0, Z0: 0 };

        // R0 = R_fase * factor (neutro del mismo calibre)
        var datos = conductores[feeder.material] &&
                    conductores[feeder.material][feeder.canalizacion] &&
                    conductores[feeder.material][feeder.canalizacion][feeder.calibre];
        var r1 = datos ? datos.R : 0;

        var n = Math.max(1, feeder.paralelo || 1);
        var L = Math.max(0, feeder.longitud || 0);

        var R0 = (r1 * CONSTANTES.FACTOR_R0_NEUTRO * L / 1000) / n;
        var X0 = (x0Valor * L / 1000) / n;
        var Z0 = Impedancias.magnitud(R0, X0);

        return { R0: R0, X0: X0, Z0: Z0 };
    }

    /**
     * Calcula la falla fase-tierra en todos los puntos del sistema
     * @param {Array} puntosMax - Puntos ya calculados con { R, X, Z, isc, ... }
     * @param {Object} opciones
     *   - tipoSistema: '3f' | '1f'
     *   - x0Config: configuracion X0 de cables
     *   - tipoAterrizamiento: 'yg_solido' | 'yg_resistencia' | 'delta'
     *   - zRetornoTierra: impedancia de retorno por tierra en ohms (default 0)
     *   - Z0_fuente: impedancia de secuencia cero de la fuente (ohms)
     *   - Z_trafo: impedancia del transformador (ohms, si aplica)
     *   - feeders: array of feeder objects
     *   - conductoresX0: data structure with X0 values
     *   - conductores: data structure with conductor impedances
     * @returns {Array} Mismo largo que puntosMax, cada uno con { iscFt, Z0_total, Z1_total }
     */
    function calcularFallaFaseTierra(puntosMax, opciones) {
        var V = opciones.V;
        var factor = opciones.tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var x0Config = opciones.x0Config || CONSTANTES.Z0_CONFIG_DEFAULT;
        var tipoAter = opciones.tipoAterrizamiento || 'yg_solido';
        var zRetorno = opciones.zRetornoTierra || 0;
        var feeders = opciones.feeders || [];
        var conductoresX0 = opciones.conductoresX0;
        var conductores = opciones.conductores;

        // Z0 de la fuente (aproximacion: Z0_f ≈ Z1_f para red CFE Yg solido)
        var z0Fuente = opciones.Z0_fuente || (puntosMax[0] ? puntosMax[0].Z : 0);

        // Z0 del transformador (si aplica)
        var z0Trafo = 0;
        if (opciones.Z_trafo && opciones.Z_trafo > 0) {
            if (tipoAter === 'yg_solido') {
                z0Trafo = opciones.Z_trafo * CONSTANTES.FACTOR_Z0_TRAFO_YG;
            } else if (tipoAter === 'yg_resistencia') {
                // Modelo simplificado: Z_trafo + resistencia de neutro
                // La resistencia de neutro tipica es del orden de Z_trafo * 1 a 3
                z0Trafo = opciones.Z_trafo * CONSTANTES.FACTOR_Z0_TRAFO_YG_R;
            }
            // Delta: z0Trafo permanece en 0 (no hay camino a tierra)
        }

        // Acumular Z0 por punto
        var R0_acc = z0Fuente / Math.sqrt(2); // Aproximar Z0_f = R_f/sqrt(2) + j*X_f/sqrt(2)
        var X0_acc = z0Fuente / Math.sqrt(2);
        R0_acc += z0Trafo / Math.sqrt(2);
        X0_acc += z0Trafo / Math.sqrt(2);

        // Agregar retorno por tierra (resistivo, solo R)
        R0_acc += zRetorno;

        var resultados = [];

        // P0
        var Z0_total = Impedancias.magnitud(R0_acc, X0_acc);
        var Z1_total = puntosMax[0].Z;
        var iscFt = calcularIscFt(V, Z1_total, Z0_total, factor, opciones.tipoSistema);
        resultados.push({ iscFt: iscFt, Z0_total: Z0_total, Z1_total: Z1_total });

        // Puntos subsiguientes
        for (var i = 0; i < feeders.length; i++) {
            var z0c = impedanciaCero(feeders[i], x0Config, conductoresX0, conductores);
            R0_acc += z0c.R0;
            X0_acc += z0c.X0;
            Z0_total = Impedancias.magnitud(R0_acc, X0_acc);
            Z1_total = puntosMax[i + 1].Z;
            iscFt = calcularIscFt(V, Z1_total, Z0_total, factor, opciones.tipoSistema);
            resultados.push({ iscFt: iscFt, Z0_total: Z0_total, Z1_total: Z1_total });
        }

        return resultados;
    }

    /**
     * Calcula la corriente de falla fase-tierra
     * @param {number} V         - Tension del sistema
     * @param {number} Z1        - Impedancia de secuencia positiva (ohms)
     * @param {number} Z0        - Impedancia de secuencia cero (ohms)
     * @param {number} factor    - sqrt(3) trifasico, 2 monofasico
     * @param {string} tipoSist  - '3f' o '1f'
     * @returns {number} Corriente de falla fase-tierra en kA
     */
    function calcularIscFt(V, Z1, Z0, factor, tipoSist) {
        if (tipoSist === '3f') {
            // If = V_LL / (sqrt(3) * |Z1 + Z2 + Z0|) con Z2 ≈ Z1
            var Z_suma = Impedancias.magnitud(2 * Z1, Z0);
            return (V / (factor * Z_suma)) / 1000; // kA
        } else {
            // Monofasico: If = V_FN / |Z1 + Z0|, V_FN = V (monofasico)
            var Z_mono = Impedancias.magnitud(Z1, Z0);
            return (V / Z_mono) / 1000; // kA
        }
    }

    /**
     * Calcula Z0 de fuente a partir de Isc y tension (aproximacion)
     * Z0_f ≈ Z1_f para redes solidamente aterrizadas
     */
    function z0DesdeIsc(V, isc_kA, xr, factor) {
        var Z1 = V / (factor * isc_kA * 1000);
        // Para red Yg solido, Z0 ≈ Z1 con pequeña diferencia
        // Usamos Z0 = Z1 como aproximacion conservadora
        return Z1;
    }

    return {
        impedanciaCero: impedanciaCero,
        calcularFallaFaseTierra: calcularFallaFaseTierra,
        calcularIscFt: calcularIscFt,
        z0DesdeIsc: z0DesdeIsc
    };
})();

module.exports = Secuencia;
