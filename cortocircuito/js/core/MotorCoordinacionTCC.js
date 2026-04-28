/**
 * core/MotorCoordinacionTCC.js — Motor de Coordinación TCC Real
 * Coordinación de protecciones con interpolación log-log
 * Arquitectura tipo ETAP/SKM: curvas reales, detección de cruces
 */

const MotorCoordinacionTCC = (function() {
    
    /**
     * Interpolación log-log (CRÍTICO para curvas TCC reales)
     * @param {Array} curva - Curva definida por puntos [{I, t}, ...]
     * @param {number} I - Corriente a interpolar
     * @returns {number|null} Tiempo interpolado o null si fuera de rango
     */
    function interpolarLogLog(curva, I) {
        if (!curva || curva.length < 2) return null;
        
        // FIX: Validar I > 0 para evitar Math.log10(0)
        if (I <= 0) return null;
        
        for (let i = 0; i < curva.length - 1; i++) {
            const p1 = curva[i];
            const p2 = curva[i + 1];
            
            // FIX: Validar p1.I > 0, p2.I > 0, p1.t > 0, p2.t > 0
            if (p1.I <= 0 || p2.I <= 0 || p1.t <= 0 || p2.t <= 0) continue;
            
            if (I >= p1.I && I <= p2.I) {
                const logI = Math.log10(I);
                const logI1 = Math.log10(p1.I);
                const logI2 = Math.log10(p2.I);
                
                const logT1 = Math.log10(p1.t);
                const logT2 = Math.log10(p2.t);
                
                const logT = logT1 + (logI - logI1) * (logT2 - logT1) / (logI2 - logI1);
                
                return Math.pow(10, logT);
            }
        }
        
        return null;
    }
    
    /**
     * Generar rango logarítmico de corrientes
     * @param {number} Imin - Corriente mínima
     * @param {number} Imax - Corriente máxima
     * @param {number} puntos - Número de puntos
     * @returns {Array} Array de corrientes
     */
    function generarRangoLog(Imin, Imax, puntos) {
        // FIX: Validar puntos >= 2 para evitar división por cero
        if (puntos < 2) {
            throw new Error("puntos debe ser >= 2");
        }
        
        // FIX: Validar Imin > 0 e Imax > 0 para evitar Math.log10(0)
        if (Imin <= 0 || Imax <= 0) {
            throw new Error("Imin e Imax deben ser > 0");
        }
        
        const resultado = [];
        const logMin = Math.log10(Imin);
        const logMax = Math.log10(Imax);
        const paso = (logMax - logMin) / (puntos - 1);
        
        for (let i = 0; i < puntos; i++) {
            resultado.push(Math.pow(10, logMin + i * paso));
        }
        
        return resultado;
    }
    
    /**
     * Generar curva de breaker real (modelo LSIG)
     * @param {Object} config - Configuración del breaker
     * @returns {Array} Curva definida por puntos
     */
    function generarCurvaBreaker(config) {
        // FIX: Validar config
        if (!config) {
            config = { In: 100 };
        }
        
        let In = config.In || 100;
        let Ir = config.Ir || In * 1.0;
        let tr = config.tr || 100;
        let Isd = config.Isd || In * 6;
        let tsd = config.tsd || 0.4;
        let Ii = config.Ii || In * 10;
        
        // FIX: Validar valores positivos
        if (In <= 0) In = 100;
        if (Ir <= 0) Ir = In;
        if (tr <= 0) tr = 100;
        if (Isd <= 0) Isd = In * 6;
        if (tsd <= 0) tsd = 0.4;
        if (Ii <= 0) Ii = In * 10;
        
        return [
            // zona térmica (long time)
            { I: Ir, t: tr },
            { I: Isd * 0.5, t: tr * 0.8 },
            { I: Isd, t: tsd },
            
            // instantáneo
            { I: Ii, t: 0.02 }
        ];
    }
    
    /**
     * Densificar curva (interpolar más puntos)
     * @param {Array} curva - Curva base
     * @param {number} puntos - Número de puntos a generar
     * @returns {Array} Curva densificada
     */
    function densificarCurva(curva, puntos) {
        if (!curva || curva.length < 2) return curva;
        
        // FIX: Validar que la curva esté ordenada por corriente
        for (let i = 0; i < curva.length - 1; i++) {
            if (curva[i].I > curva[i + 1].I) {
                // Curva no ordenada, ordenar automáticamente
                curva.sort(function(a, b) { return a.I - b.I; });
                break;
            }
        }
        
        const resultado = [];
        const Imin = curva[0].I;
        const Imax = curva[curva.length - 1].I;
        const rangoLog = generarRangoLog(Imin, Imax, puntos);
        
        for (let j = 0; j < rangoLog.length; j++) {
            const t = interpolarLogLog(curva, rangoLog[j]);
            if (t !== null) {
                resultado.push({ I: rangoLog[j], t: t });
            }
        }
        
        return resultado;
    }
    
    /**
     * Detectar cruce entre dos curvas
     * @param {Array} curvaUp - Curva upstream
     * @param {Array} curvaDown - Curva downstream
     * @returns {Object} { hayCruce, cruce }
     */
    function hayCruce(curvaUp, curvaDown) {
        const corrientes = generarRangoLog(10, 10000, 50);
        const cruces = [];
        
        for (let i = 0; i < corrientes.length; i++) {
            const I = corrientes[i];
            const tUp = interpolarLogLog(curvaUp, I);
            const tDown = interpolarLogLog(curvaDown, I);
            
            if (!tUp || !tDown) continue;
            
            // ❌ cruce peligroso: downstream >= upstream
            if (tDown >= tUp * 0.9) {
                cruces.push({ I: I, tUp: tUp, tDown: tDown });
            }
        }
        
        return {
            hayCruce: cruces.length > 0,
            cruces: cruces
        };
    }
    
    /**
     * Coordinar breakers automáticamente
     * @param {Object} upstream - Breaker upstream
     * @param {Object} downstream - Breaker downstream
     * @returns {Object} Resultado de coordinación
     */
    function coordinarBreakers(upstream, downstream) {
        var intentos = 0;
        var maxIntentos = 20;
        
        // FIX: Clonar objetos para evitar mutación del input
        var upstreamClone = JSON.parse(JSON.stringify(upstream));
        var downstreamClone = JSON.parse(JSON.stringify(downstream));
        
        while (intentos < maxIntentos) {
            var curvaUp = generarCurvaBreaker(upstreamClone);
            var curvaDown = generarCurvaBreaker(downstreamClone);
            
            var cruce = hayCruce(curvaUp, curvaDown);
            
            if (!cruce.hayCruce) {
                return {
                    ok: true,
                    upstream: upstreamClone,
                    downstream: downstreamClone,
                    intentos: intentos
                };
            }
            
            // 🔧 ajuste automático (usar clon)
            upstreamClone.tr += 0.5;
            upstreamClone.Ii += upstreamClone.In * 0.5;
            
            intentos++;
        }
        
        return {
            ok: false,
            upstream: upstreamClone,
            downstream: downstreamClone,
            intentos: intentos,
            error: "No se logró coordinación después de " + maxIntentos + " intentos"
        };
    }
    
    /**
     * Coordinar sistema completo
     * @param {Array} protecciones - Lista de protecciones
     * @returns {Object} Resultado de coordinación
     */
    function coordinarSistema(protecciones) {
        // FIX: Validar array no vacío
        if (!protecciones || protecciones.length < 2) {
            return {
                ok: true,
                resultados: [],
                mensaje: "Menos de 2 protecciones, no requiere coordinación"
            };
        }
        
        var resultados = [];
        
        for (var i = 0; i < protecciones.length - 1; i++) {
            var down = protecciones[i];
            var up = protecciones[i + 1];
            
            var result = coordinarBreakers(up, down);
            
            resultados.push({
                upstream: up,
                downstream: down,
                ...result
            });
        }
        
        return {
            ok: resultados.every(function(r) { return r.ok; }),
            resultados: resultados
        };
    }
    
    /**
     * Generar puntos para gráfica log-log
     * @param {Array} curva - Curva del breaker
     * @param {number} puntos - Número de puntos
     * @returns {Array} Puntos para graficar
     */
    function generarPuntosGrafica(curva, puntos) {
        if (!curva || curva.length < 2) return [];
        
        var densificada = densificarCurva(curva, puntos || 100);
        
        return densificada.map(function(p) {
            return {
                I: p.I,
                t: p.t,
                logI: Math.log10(p.I),
                logT: Math.log10(p.t)
            };
        });
    }
    
    /**
     * Calcular margen de coordinación
     * @param {Array} curvaUp - Curva upstream
     * @param {Array} curvaDown - Curva downstream
     * @param {number} I - Corriente de evaluación
     * @returns {Object} { margen, tUp, tDown }
     */
    function calcularMargen(curvaUp, curvaDown, I) {
        var tUp = interpolarLogLog(curvaUp, I);
        var tDown = interpolarLogLog(curvaDown, I);
        
        if (!tUp || !tDown) {
            return { margen: 0, tUp: 0, tDown: 0 };
        }
        
        // FIX: Validar tUp > 0 para evitar división por cero
        if (tUp === 0) {
            return { margen: 0, tUp: tUp, tDown: tDown };
        }
        
        var margen = (tUp - tDown) / tUp * 100;
        
        return {
            margen: margen,
            tUp: tUp,
            tDown: tDown
        };
    }
    
    return {
        interpolarLogLog: interpolarLogLog,
        generarRangoLog: generarRangoLog,
        generarCurvaBreaker: generarCurvaBreaker,
        densificarCurva: densificarCurva,
        hayCruce: hayCruce,
        coordinarBreakers: coordinarBreakers,
        coordinarSistema: coordinarSistema,
        generarPuntosGrafica: generarPuntosGrafica,
        calcularMargen: calcularMargen
    };
})();

if (typeof window !== 'undefined') {
    window.MotorCoordinacionTCC = MotorCoordinacionTCC;
}
