/**
 * motor_falla_tierra.js — Motor de falla fase-tierra nivel industrial
 * Modelo físico completo con secuencia Z1/Z2/Z0, retorno dinámico, detección automática
 */
var MotorFallaTierra = (function() {

    /**
     * Auto-detección del tipo de sistema de puesta a tierra
     * @param {Object} config - Configuración del sistema
     * @returns {Object} { modelo, usarRetorno, multiplicador, limitarCorriente }
     */
    function autoDetectarSistemaTierra(config) {
        var tipoAter = config.tipoAterrizamiento || 'yg_solido';

        if (tipoAter === 'yg_solido') {
            return {
                modelo: 'baja_impedancia',
                usarRetorno: true,
                multiplicador: 3,
                limitarCorriente: false,
                descripcion: 'Yg sólidamente aterrizado - baja impedancia'
            };
        }

        if (tipoAter === 'yg_resistivo') {
            return {
                modelo: 'alta_impedancia',
                usarRetorno: true,
                multiplicador: 3,
                limitarCorriente: true,
                descripcion: 'Yg con resistencia neutro - alta impedancia'
            };
        }

        if (tipoAter === 'delta') {
            return {
                modelo: 'sin_retorno',
                usarRetorno: false,
                multiplicador: 0,
                limitarCorriente: true,
                descripcion: 'Delta - sin retorno a tierra'
            };
        }

        // Default
        return {
            modelo: 'baja_impedancia',
            usarRetorno: true,
            multiplicador: 3,
            limitarCorriente: false,
            descripcion: 'Default - Yg sólidamente aterrizado'
        };
    }

    /**
     * Calcula impedancia de retorno dinámica basada en configuración
     * @param {Object} config - Configuración del sistema
     * @returns {Object} { Z_retorno, dominante, warnings }
     */
    function calcularRetornoDinamico(config) {
        var sistema = autoDetectarSistemaTierra(config);
        var zRetornoManual = config.zRetornoTierra || 0;
        var zRetornoOhms = zRetornoManual / 1000; // mΩ → Ω

        var warnings = [];

        // Para sistemas yg_solido, usar valor más realista si el manual es muy alto
        if (sistema.modelo === 'baja_impedancia' && zRetornoOhms > 0.01) {
            warnings.push('Z_retorno manual (' + zRetornoManual + ' mΩ) parece alto para Yg sólido');
        }

        // Detectar si el retorno domina el Z0 total
        var Z0_linea = config.Z0_linea || 0;
        var dominante = (3 * zRetornoOhms) > Z0_linea;

        if (dominante) {
            warnings.push('Sistema dominado por retorno a tierra - verificar puesta a tierra');
        }

        return {
            Z_retorno: zRetornoOhms,
            Z_retorno_total: sistema.usarRetorno ? (3 * zRetornoOhms) : 0,
            dominante: dominante,
            warnings: warnings,
            sistema: sistema
        };
    }

    /**
     * Calcula falla fase-tierra con modelo completo
     * @param {Object} opciones - { V, Z1, Z2, Z0_fuente, Z0_trafo, Z0_linea, zRetornoTierra, tipoAterrizamiento }
     * @returns {Object} { If_tierra, Z0_total, Z1_total, sensibilidad, warnings }
     */
    function calcularFallaTierraCompleta(opciones) {
        var V = opciones.V;
        var Z1 = opciones.Z1 || 0;
        var Z2 = opciones.Z2 || Z1; // Asumir Z2 ≈ Z1
        var Z0_fuente = opciones.Z0_fuente || Z1;
        var Z0_trafo = opciones.Z0_trafo || 0;
        var Z0_linea = opciones.Z0_linea || 0;
        var zRetorno = opciones.zRetornoTierra || 0;
        var tipoAter = opciones.tipoAterrizamiento || 'yg_solido';

        // Normalizar unidades
        var zRetornoOhms = zRetorno / 1000;

        // Calcular Z0 total con modelo correcto
        var Z0_total;
        if (tipoAter === 'delta') {
            Z0_total = Infinity; // No hay camino a tierra
        } else {
            Z0_total = Z0_fuente + Z0_trafo + Z0_linea + (3 * zRetornoOhms);
        }

        // Calcular corriente de falla
        var If_tierra;
        if (tipoAter === 'delta') {
            If_tierra = 0;
        } else {
            var Z_suma = Impedancias.magnitud(Z1 + Z2, Z0_total);
            If_tierra = (3 * (V / Math.sqrt(3))) / Z_suma; // If = 3*Vf / |Z1+Z2+Z0|
        }

        // Calcular sensibilidad
        var sensibilidad = {
            detectable: false,
            iDisparoRequerido: 0,
            ratio: 0
        };

        if (opciones.iDisparo && opciones.iDisparo > 0) {
            sensibilidad.ratio = If_tierra / opciones.iDisparo;
            sensibilidad.detectable = sensibilidad.ratio >= 1.2; // 20% de margen
            sensibilidad.iDisparoRequerido = If_tierra / 1.2;
        }

        // Warnings
        var warnings = [];
        if (tipoAter !== 'delta' && If_tierra < 0.1 * (V / (Math.sqrt(3) * Z1))) {
            warnings.push('If-tierra < 10% de I3F - verificar Z0');
        }

        if (opciones.iDisparo && opciones.iDisparo > 0 && !sensibilidad.detectable) {
            warnings.push('Protección no sensible - iDisparo=' + opciones.iDisparo + 'A > If=' + (If_tierra || 0).toFixed(0) + 'A');
        }

        return {
            If_tierra: If_tierra,
            Z0_total: Z0_total,
            Z1_total: Z1,
            sensibilidad: sensibilidad,
            warnings: warnings,
            sistema: autoDetectarSistemaTierra(opciones)
        };
    }

    /**
     * Motor de corrección automática para falla a tierra
     * @param {Object} estado - Estado del sistema
     * @returns {Object} { cambios, sugerencias }
     */
    function corregirFallaTierra(estado) {
        var cambios = [];
        var sugerencias = [];

        if (!estado.nodos || estado.nodos.length === 0) {
            return { cambios: cambios, sugerencias: sugerencias };
        }

        estado.nodos.forEach(function(nodo) {
            if (!nodo.faseTierra) return;

            var I3F = nodo.isc || 0;
            var IFT = nodo.faseTierra.iscFt || 0;

            // Si If-tierra es muy baja (<20% de I3F)
            if (IFT < 0.2 * I3F) {
                sugerencias.push({
                    nodo: nodo.id,
                    accion: 'Reducir impedancia de retorno',
                    opciones: [
                        'Mejorar sistema de puesta a tierra',
                        'Reducir resistencia neutro',
                        'Agregar conductor de protección'
                    ],
                    razon: 'If-tierra (' + (IFT || 0).toFixed(2) + ' kA) < 20% de I3F (' + (I3F || 0).toFixed(2) + ' kA)'
                });
            }

            // Si protección no es sensible
            if (nodo.equip && nodo.equip.iDisparo && nodo.equip.iDisparo > IFT * 1000) {
                var iDisparoSugerido = Math.max(100, IFT * 1000 * 0.5);
                cambios.push({
                    nodo: nodo.id,
                    campo: 'iDisparo',
                    valor: iDisparoSugerido,
                    anterior: nodo.equip.iDisparo,
                    razon: 'Ajustar iDisparo para sensibilidad a falla a tierra'
                });
            }
        });

        return { cambios: cambios, sugerencias: sugerencias };
    }

    return {
        autoDetectarSistemaTierra: autoDetectarSistemaTierra,
        calcularRetornoDinamico: calcularRetornoDinamico,
        calcularFallaTierraCompleta: calcularFallaTierraCompleta,
        corregirFallaTierra: corregirFallaTierra
    };
})();

if (typeof window !== 'undefined') {
    window.MotorFallaTierra = MotorFallaTierra;
}
