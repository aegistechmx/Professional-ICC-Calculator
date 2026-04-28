/**
 * core/domain/coordination.engine.js — Motor de Coordinación
 * Arquitectura tipo ETAP/SKM: coordinación selectiva entre dispositivos
 * Integrado con MotorCoordinacionTCC para coordinación automática
 */

var CoordinationEngine = (function() {
    
    /**
     * Verificar coordinación entre dos dispositivos
     * @param {Object} upstream - Dispositivo aguas arriba
     * @param {Object} downstream - Dispositivo aguas abajo
     * @param {Object} opciones - Opciones de coordinación
     * @returns {Object} Resultado de coordinación
     */
    function coordinar(upstream, downstream, opciones) {
        opciones = opciones || {};
        var margen = opciones.margen || 1.3; // Margen de selectividad (default 1.3)
        
        if (!upstream || !downstream) {
            return {
                status: "ERROR",
                razon: "Dispositivos no especificados"
            };
        }
        
        // FIX: Clonar objetos para evitar mutación del input
        var upstreamClone = JSON.parse(JSON.stringify(upstream));
        var downstreamClone = JSON.parse(JSON.stringify(downstream));
        
        // Si no hay curvas TCC, intentar generarlas con MotorCoordinacionTCC
        if (!upstreamClone.curvaTCC && typeof MotorCoordinacionTCC !== 'undefined') {
            upstreamClone.curvaTCC = MotorCoordinacionTCC.generarCurvaBreaker(upstreamClone);
        }
        
        if (!downstreamClone.curvaTCC && typeof MotorCoordinacionTCC !== 'undefined') {
            downstreamClone.curvaTCC = MotorCoordinacionTCC.generarCurvaBreaker(downstreamClone);
        }
        
        // Si no hay curvas TCC, no se puede evaluar coordinación
        if (!upstreamClone.curvaTCC || !downstreamClone.curvaTCC) {
            return {
                status: "NO_EVALUABLE",
                razon: "Curvas TCC no disponibles"
            };
        }
        
        var cruces = [];
        var margenMinimo = Infinity;
        
        // Verificar puntos de la curva downstream
        for (var i = 0; i < downstreamClone.curvaTCC.length; i++) {
            var p = downstreamClone.curvaTCC[i];
            var tUp = interpolarLogLog(upstreamClone.curvaTCC, p.I);
            
            if (tUp) {
                var margenActual = tUp / p.t;
                margenMinimo = Math.min(margenMinimo, margenActual);
                
                if (tUp < margen * p.t) {
                    cruces.push({
                        I: p.I,
                        t_downstream: p.t,
                        t_upstream: tUp,
                        margen: margenActual
                    });
                }
            }
        }
        
        return {
            status: cruces.length === 0 ? "COORDINADO" : "NO_COORDINADO",
            coordinado: cruces.length === 0,
            cruces: cruces,
            margenMinimo: margenMinimo === Infinity ? 0 : margenMinimo,
            margenRequerido: margen
        };
    }
    
    /**
     * Interpolación log-log para curvas TCC
     * @param {Array} curva - Curva TCC [{I, t}, ...]
     * @param {number} I - Corriente a interpolar
     * @returns {number} Tiempo interpolado
     */
    function interpolarLogLog(curva, I) {
        if (!curva || curva.length === 0) return null;
        
        // FIX: Validar I > 0 para evitar Math.log10(0)
        if (I <= 0) return null;
        
        // Usar MotorCoordinacionTCC si está disponible
        if (typeof MotorCoordinacionTCC !== 'undefined') {
            return MotorCoordinacionTCC.interpolarLogLog(curva, I);
        }
        
        // Fallback a implementación local
        var i1 = 0, i2 = curva.length - 1;
        var found = false;
        
        for (var i = 0; i < curva.length - 1; i++) {
            if (curva[i].I <= I && curva[i + 1].I >= I) {
                i1 = i;
                i2 = i + 1;
                found = true;
                break;
            }
        }
        
        // FIX: Validar que se encontró el segmento
        if (!found) return null;
        
        var p1 = curva[i1];
        var p2 = curva[i2];
        
        // FIX: Validar p1.I > 0 y p2.I > 0 para evitar Math.log10(0)
        if (p1.I <= 0 || p2.I <= 0 || p1.t <= 0 || p2.t <= 0) return null;
        
        var logI1 = Math.log10(p1.I);
        var logI2 = Math.log10(p2.I);
        var logt1 = Math.log10(p1.t);
        var logt2 = Math.log10(p2.t);
        var logI = Math.log10(I);
        
        var logt = logt1 + (logI - logI1) * (logt2 - logt1) / (logI2 - logI1);
        
        return Math.pow(10, logt);
    }
    
    /**
     * Coordinar automáticamente dos breakers
     * @param {Object} upstream - Breaker upstream
     * @param {Object} downstream - Breaker downstream
     * @returns {Object} Resultado de coordinación automática
     */
    function coordinarAutomaticamente(upstream, downstream) {
        if (typeof MotorCoordinacionTCC !== 'undefined') {
            return MotorCoordinacionTCC.coordinarBreakers(upstream, downstream);
        }
        
        return {
            ok: false,
            error: "MotorCoordinacionTCC no está disponible"
        };
    }
    
    /**
     * Coordinar sistema completo automáticamente
     * @param {Array} protecciones - Lista de protecciones
     * @returns {Object} Resultado de coordinación
     */
    function coordinarSistemaAutomaticamente(protecciones) {
        if (typeof MotorCoordinacionTCC !== 'undefined') {
            return MotorCoordinacionTCC.coordinarSistema(protecciones);
        }
        
        return {
            ok: false,
            error: "MotorCoordinacionTCC no está disponible"
        };
    }
    
    /**
     * Verificar coordinación de tierra
     * @param {Object} upstream - Dispositivo aguas arriba
     * @param {Object} downstream - Dispositivo aguas abajo
     * @returns {Object} Resultado de coordinación de tierra
     */
    function coordinarTierra(upstream, downstream) {
        if (!upstream || !downstream) {
            return {
                status: "ERROR",
                razon: "Dispositivos no especificados"
            };
        }
        
        if (!upstream.pickupTierra || !downstream.pickupTierra) {
            return {
                status: "NO_EVALUABLE",
                razon: "Pickup de tierra no especificado"
            };
        }
        
        var margen = upstream.pickupTierra / downstream.pickupTierra;
        var coordinado = margen >= 1.3;
        
        return {
            status: coordinado ? "COORDINADO" : "NO_COORDINADO",
            coordinado: coordinado,
            pickupUpstream: upstream.pickupTierra,
            pickupDownstream: downstream.pickupTierra,
            margen: margen
        };
    }
    
    /**
     * Calcular score de coordinación del sistema
     * @param {Array} pares - Lista de pares {up, down}
     * @param {number} margen - Margen de selectividad
     * @returns {Object} Score de coordinación
     */
    function calcularScoreCoordinacion(pares, margen) {
        if (!pares || pares.length === 0) {
            return {
                score: 100,
                paresValidados: 0,
                paresCoordinados: 0,
                margenPromedio: 0
            };
        }
        
        var paresCoordinados = 0;
        var margenTotal = 0;
        
        for (var i = 0; i < pares.length; i++) {
            var resultado = coordinar(pares[i].up, pares[i].down, { margen: margen });
            if (resultado.coordinado) {
                paresCoordinados++;
            }
            if (resultado.margenMinimo !== Infinity) {
                margenTotal += resultado.margenMinimo;
            }
        }
        
        var margenPromedio = pares.length > 0 ? margenTotal / pares.length : 0;
        var score = (paresCoordinados / pares.length) * 100;
        
        return {
            score: score,
            paresValidados: pares.length,
            paresCoordinados: paresCoordinados,
            margenPromedio: margenPromedio
        };
    }
    
    /**
     * Generar puntos para gráfica TCC
     * @param {Array} curva - Curva del breaker
     * @param {number} puntos - Número de puntos
     * @returns {Array} Puntos para graficar
     */
    function generarPuntosGrafica(curva, puntos) {
        if (typeof MotorCoordinacionTCC !== 'undefined') {
            return MotorCoordinacionTCC.generarPuntosGrafica(curva, puntos);
        }
        
        return [];
    }
    
    return {
        coordinar: coordinar,
        coordinarTierra: coordinarTierra,
        coordinarAutomaticamente: coordinarAutomaticamente,
        coordinarSistemaAutomaticamente: coordinarSistemaAutomaticamente,
        calcularScoreCoordinacion: calcularScoreCoordinacion,
        generarPuntosGrafica: generarPuntosGrafica,
        interpolarLogLog: interpolarLogLog
    };
})();

if (typeof window !== 'undefined') {
    window.CoordinationEngine = CoordinationEngine;
}
