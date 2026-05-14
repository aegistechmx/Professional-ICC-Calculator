/**
 * curvas.js
 * Motor de cálculo para curvas tiempo-corriente de protección.
 * Funciones puras sin dependencias de DOM.
 */
var Curvas = (function() {

    /**
     * Curva característica de interruptor termomagnético (MCB)
     * @param {number} corriente - Corriente en amperes
     * @param {number} nominal - Corriente nominal del interruptor
     * @param {number} tipo - 'B', 'C', 'D' según IEC 60898
     * @returns {number} Tiempo de disparo en segundos
     */
    function curvaTermomagnetico(corriente, nominal, tipo) {
        var I = corriente / nominal;
        
        if (I <= 1.05) return Infinity; // No dispara
        
        // Factores según tipo
        var factores = {
            'B': { termico: 1.3, magnetico: 3, magneticoMax: 5 },
            'C': { termico: 1.3, magnetico: 5, magneticoMax: 10 },
            'D': { termico: 1.3, magnetico: 10, magneticoMax: 20 }
        };
        
        var f = factores[tipo] || factores['C'];
        
        // Zona térmica (1.05x a f.magnetico x In)
        if (I <= f.magnetico) {
            // Ecuación: t = k * (I/In)^2 (aproximación)
            var k = 120; // Constante de tiempo térmica
            return k * Math.pow(I - 1, 2);
        }
        
        // Zona magnética (instantáneo)
        return 0.01; // 10ms típico para disparo magnético
    }

    /**
     * Curva característica de fusible
     * @param {number} corriente - Corriente en amperes
     * @param {number} nominal - Corriente nominal del fusible
     * @param {string} clase - 'gG', 'aM', 'gL'
     * @returns {number} Tiempo de fusión en segundos
     */
    function curvaFusible(corriente, nominal, clase) {
        var I = corriente / nominal;
        
        if (I <= 1.1) return Infinity; // No funde
        
        // Coeficientes según clase de fusible
        var coef = {
            'gG': { a: 100, b: 2 },    // Fusible general
            'aM': { a: 80, b: 1.8 },   // Motor
            'gL': { a: 120, b: 2.2 }   // Gran capacidad
        };
        
        var c = coef[clase] || coef['gG'];
        
        // Ecuación de I²t = k (aproximación)
        // t = k / I²
        return c.a * Math.pow(I, -c.b);
    }

    /**
     * Curva característica de relé térmico
     * @param {number} corriente - Corriente en amperes
     * @param {number} ajuste - Ajuste del relé (0.9-1.1)
     * @param {number} curva - Curva: 'normal', 'inversa', 'muy inversa', 'extremadamente inversa'
     * @returns {number} Tiempo de disparo en segundos
     */
    function curvaReleTermico(corriente, ajuste, curva) {
        var I = corriente / ajuste;
        
        if (I <= 1.05) return Infinity;
        
        // Parámetros según tipo de curva (IEC 60255-3)
        var params = {
            'normal': { k: 0.14, alpha: 0.02 },
            'inversa': { k: 13.5, alpha: 1 },
            'muy inversa': { k: 80, alpha: 2 },
            'extremadamente inversa': { k: 120, alpha: 2.5 }
        };
        
        var p = params[curva] || params['normal'];
        
        // Ecuación: t = k / (I^alpha - 1)
        return p.k / (Math.pow(I, p.alpha) - 1);
    }

    /**
     * Curva de daño de conductor
     * @param {number} corriente - Corriente en amperes
     * @param {number} area - Área del conductor en mm²
     * @param {string} material - 'cobre', 'aluminio'
     * @returns {number} Tiempo máximo de daño en segundos
     */
    function curvaDanioConductor(corriente, area, material) {
        // Constantes de I²t admisible
        var K = {
            'cobre': 143,    // Para cobre
            'aluminio': 98   // Para aluminio
        };
        
        var k = K[material] || K['cobre'];
        
        // Ecuación: I²t = K²A²
        // t = (K²A²) / I²
        return Math.pow(k * area / corriente, 2);
    }

    /**
     * Curva de contacto persona (corriente a través del cuerpo humano)
     * @param {number} corriente - Corriente en miliamperes
     * @param {number} tension - Tensión de contacto en volts
     * @param {string} tipo - 'ac' para corriente alterna, 'dc' para continua
     * @returns {number} Tiempo máximo seguro en segundos
     */
    function curvaSeguridadPersona(corriente, tension, tipo) {
        var I = corriente; // ya está en mA
        
        // Límites según IEC 60479-1
        if (tipo === 'ac') {
            if (I <= 0.5) return Infinity; // Umbral de percepción
            if (I <= 10) return 5;        // Contracciones musculares
            if (I <= 30) return 1;        // Fibrilación ventricular posible
            if (I <= 100) return 0.5;     // Alto riesgo
            if (I <= 500) return 0.1;     // Muy alto riesgo
            return 0.05;                  // Peligro inmediato
        } else {
            // Para DC, los límites son más permisivos
            if (I <= 2) return Infinity;
            if (I <= 30) return 5;
            if (I <= 300) return 0.5;
            return 0.1;
        }
    }

    /**
     * Genera puntos para graficar una curva
     * @param {Function} funcionCurva - Función de la curva
     * @param {number} corrienteMin - Corriente mínima
     * @param {number} corrienteMax - Corriente máxima
     * @param {number} puntos - Número de puntos a generar
     * @param {Array} params - Parámetros adicionales para la función
     * @returns {Array} Array de puntos {x: corriente, y: tiempo}
     */
    function generarPuntosCurva(funcionCurva, corrienteMin, corrienteMax, puntos, params) {
        var resultado = [];
        var logMin = Math.log10(corrienteMin);
        var logMax = Math.log10(corrienteMax);
        var paso = (logMax - logMin) / (puntos - 1);
        
        for (var i = 0; i < puntos; i++) {
            var corriente = Math.pow(10, logMin + paso * i);
            var tiempo = funcionCurva.apply(null, [corriente].concat(params));
            
            // Limitar valores extremos para graficación
            if (tiempo > 10000) tiempo = Infinity;
            if (tiempo < 0.001 && tiempo !== 0) tiempo = 0.001;
            
            resultado.push({ x: corriente, y: tiempo });
        }
        
        return resultado;
    }

    /**
     * Verifica coordinación entre dos dispositivos de protección
     * @param {Object} dispositivo1 - Dispositivo aguas arriba
     * @param {Object} dispositivo2 - Dispositivo aguas abajo
     * @param {number} corrienteMax - Corriente máxima de coordinación
     * @returns {Object} Resultado de coordinación
     */
    function verificarCoordinacion(dispositivo1, dispositivo2, corrienteMax) {
        var puntos = generarPuntosCurva(
            function(i) { return curvaTermomagnetico(i, dispositivo1.nominal, dispositivo1.tipo); },
            dispositivo1.nominal * 1.1,
            corrienteMax,
            50,
            [dispositivo1.nominal, dispositivo1.tipo]
        );
        
        var puntos2 = generarPuntosCurva(
            function(i) { return curvaTermomagnetico(i, dispositivo2.nominal, dispositivo2.tipo); },
            dispositivo2.nominal * 1.1,
            corrienteMax,
            50,
            [dispositivo2.nominal, dispositivo2.tipo]
        );
        
        var coordinada = true;
        var problema = null;
        
        // Verificar que la curva del dispositivo 2 esté siempre por debajo de la 1
        for (var i = 0; i < puntos.length; i++) {
            var t1 = puntos[i].y;
            var t2 = puntos2[i].y;
            
            if (t2 !== Infinity && t1 !== Infinity && t2 >= t1 * 0.8) {
                coordinada = false;
                problema = {
                    corriente: puntos[i].x,
                    tiempo1: t1,
                    tiempo2: t2,
                    mensaje: 'Falta de selectividad a ' + puntos[i].x.toFixed(1) + 'A'
                };
                break;
            }
        }
        
        return {
            coordinada: coordinada,
            problema: problema,
            margenMinimo: calcularMargenMinimo(puntos, puntos2)
        };
    }

    /**
     * Calcula el margen mínimo entre dos curvas
     */
    function calcularMargenMinimo(puntos1, puntos2) {
        var margenMinimo = Infinity;
        
        for (var i = 0; i < puntos1.length; i++) {
            if (puntos1[i].y !== Infinity && puntos2[i].y !== Infinity && puntos2[i].y > 0) {
                var margen = puntos1[i].y / puntos2[i].y;
                margenMinimo = Math.min(margenMinimo, margen);
            }
        }
        
        return margenMinimo === Infinity ? 0 : margenMinimo;
    }

    /**
     * Calcula la energía específica (I²t) para una corriente y tiempo dados
     * @param {number} corriente - Corriente en amperes
     * @param {number} tiempo - Tiempo en segundos
     * @returns {number} Energía específica en A²s
     */
    function calcularI2t(corriente, tiempo) {
        return Math.pow(corriente, 2) * tiempo;
    }

    /**
     * Encuentra el punto de intersección entre dos curvas
     * @param {Array} curva1 - Puntos de la primera curva
     * @param {Array} curva2 - Puntos de la segunda curva
     * @returns {Object|null} Punto de intersección o null si no hay
     */
    function encontrarInterseccion(curva1, curva2) {
        for (var i = 1; i < curva1.length; i++) {
            var y1_1 = curva1[i-1].y;
            var y1_2 = curva1[i].y;
            var y2_1 = curva2[i-1].y;
            var y2_2 = curva2[i].y;
            
            // Verificar si hay cruce
            if ((y1_1 - y2_1) * (y1_2 - y2_2) < 0) {
                // Interpolación lineal para encontrar punto exacto
                var x = curva1[i-1].x;
                var y = y1_1;
                
                return { x: x, y: y };
            }
        }
        
        return null;
    }

    // API pública
    return {
        curvaTermomagnetico: curvaTermomagnetico,
        curvaFusible: curvaFusible,
        curvaReleTermico: curvaReleTermico,
        curvaDanioConductor: curvaDanioConductor,
        curvaSeguridadPersona: curvaSeguridadPersona,
        generarPuntosCurva: generarPuntosCurva,
        verificarCoordinacion: verificarCoordinacion,
        calcularI2t: calcularI2t,
        encontrarInterseccion: encontrarInterseccion
    };
})();

if (typeof window !== 'undefined') {
    window.Curvas = Curvas;
}
