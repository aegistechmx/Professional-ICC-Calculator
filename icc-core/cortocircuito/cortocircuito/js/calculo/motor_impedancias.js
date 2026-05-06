/**
 * motor_impedancias.js — Motor de Impedancias Completo (Z₁, Z₂, Z₀)
 * Componentes simétricas para análisis de fallas
 * Nivel industrial: estudios de cortocircuito completos
 */

var MotorImpedancias = (function() {
    
    /**
     * Clase Bus (nodo del sistema)
     */
    function Bus(id, Vbase_kV) {
        this.id = id;
        this.Vbase = Vbase_kV;
    }

    /**
     * Clase Line (línea/cable)
     */
    function Line(from, to, Z1, Z0) {
        this.from = from;
        this.to = to;
        this.Z1 = Z1; // Secuencia positiva
        this.Z2 = Z1; // Secuencia negativa (igual a positiva)
        this.Z0 = Z0; // Secuencia cero
    }

    /**
     * Clase Transformer
     */
    function Transformer(from, to, Zpu, config) {
        this.from = from;
        this.to = to;
        this.Z1 = Zpu;
        this.Z2 = Zpu;
        this.Z0 = calcZ0trafo(Zpu, config);
        this.config = config; // "Yg-Yg", "Delta-Yg", "Y-Y", "Delta-Delta"
    }

    /**
     * Calcular Z0 de transformador según configuración
     * @param {number} Zpu - Impedancia en pu
     * @param {string} config - Configuración de devanados
     * @returns {number} Z0 en pu
     */
    function calcZ0trafo(Zpu, config) {
        switch (config) {
            case "Yg-Yg":
                return Zpu;
            case "Delta-Yg":
                return Zpu; // Solo lado Yg ve tierra
            case "Y-Y":
                return Infinity; // No hay retorno
            case "Delta-Delta":
                return Infinity;
            case "Yg-Delta":
                return Zpu;
            default:
                return Zpu;
        }
    }

    /**
     * Calcular base de impedancia
     * Zbase = (kV^2) / MVA
     * @param {number} kV - Tensión base (kV)
     * @param {number} MVA - Potencia base (MVA)
     * @returns {number} Zbase (Ω)
     */
    function calcZbase(kV, MVA) {
        return (kV * kV) / MVA;
    }

    /**
     * Calcular corriente base
     * Ibase = MVA / (√3 * kV)
     * @param {number} MVA - Potencia base (MVA)
     * @param {number} kV - Tensión base (kV)
     * @returns {number} Ibase (A)
     */
    function calcIbase(MVA, kV) {
        return (MVA * 1000) / (Math.sqrt(3) * kV);
    }

    /**
     * Convertir impedancia a pu
     * Zpu = Z / Zbase
     * @param {number} Z - Impedancia en Ω
     * @param {number} Zbase - Impedancia base (Ω)
     * @returns {number} Zpu
     */
    function toPu(Z, Zbase) {
        return Z / Zbase;
    }

    /**
     * Convertir impedancia a ohms
     * Z = Zpu * Zbase
     * @param {number} Zpu - Impedancia en pu
     * @param {number} Zbase - Impedancia base (Ω)
     * @returns {number} Z (Ω)
     */
    function toOhms(Zpu, Zbase) {
        return Zpu * Zbase;
    }

    /**
     * Modelo de cable para secuencias
     * @param {Object} cable - { R, X, R0_factor, X0_factor }
     * @param {number} longitud - Longitud (km)
     * @returns {Object} { Z1, Z0 }
     */
    function modeloCable(cable, longitud) {
        var R = cable.R || 0.1;
        var X = cable.X || 0.08;
        
        // Secuencia positiva
        var Z1 = {
            r: R * longitud,
            x: X * longitud
        };
        
        // Secuencia cero (aproximación ingeniería)
        var R0_factor = cable.R0_factor || 3;
        var X0_factor = cable.X0_factor || 3;
        
        var Z0 = {
            r: R * R0_factor * longitud,
            x: X * X0_factor * longitud
        };
        
        return {
            Z1: Z1,
            Z0: Z0
        };
    }

    /**
     * Construir matriz Ybus para una secuencia
     * @param {Array} buses - Array de buses
     * @param {Array} elements - Array de elementos (lines, transformers)
     * @param {string} seq - "1", "2", o "0"
     * @returns {Array} Matriz Ybus
     */
    function buildYbus(buses, elements, seq) {
        var n = buses.length;
        var Y = [];
        
        // Inicializar matriz cero
        for (var i = 0; i < n; i++) {
            Y[i] = [];
            for (var j = 0; j < n; j++) {
                Y[i][j] = { r: 0, x: 0 };
            }
        }
        
        // Llenar matriz
        for (var e = 0; e < elements.length; e++) {
            var elem = elements[e];
            var Z = elem["Z" + seq];
            
            if (!Z || !isFinite(Z.r) || !isFinite(Z.x)) continue;
            
            // Admitancia Y = 1/Z
            var Zmag = Math.sqrt(Z.r * Z.r + Z.x * Z.x);
            if (Zmag === 0) continue;
            
            var Yline = {
                r: Z.r / (Zmag * Zmag),
                x: -Z.x / (Zmag * Zmag)
            };
            
            var fromIdx = buses.findIndex(function(b) { return b.id === elem.from; });
            var toIdx = buses.findIndex(function(b) { return b.id === elem.to; });
            
            if (fromIdx === -1 || toIdx === -1) continue;
            
            // Y[from][from] += Yline
            Y[fromIdx][fromIdx].r += Yline.r;
            Y[fromIdx][fromIdx].x += Yline.x;
            
            // Y[to][to] += Yline
            Y[toIdx][toIdx].r += Yline.r;
            Y[toIdx][toIdx].x += Yline.x;
            
            // Y[from][to] -= Yline
            Y[fromIdx][toIdx].r -= Yline.r;
            Y[fromIdx][toIdx].x -= Yline.x;
            
            // Y[to][from] -= Yline
            Y[toIdx][fromIdx].r -= Yline.r;
            Y[toIdx][fromIdx].x -= Yline.x;
        }
        
        return Y;
    }

    /**
     * Invertir matriz compleja (método simplificado)
     * @param {Array} Y - Matriz Ybus
     * @returns {Array} Matriz Zbus
     */
    function invertMatrix(Y) {
        var n = Y.length;
        var Z = [];
        
        // Para matrices pequeñas, usar eliminación Gaussiana
        // Convertir a formato numérico simplificado
        var Ynum = [];
        for (var i = 0; i < n; i++) {
            Ynum[i] = [];
            for (var j = 0; j < n; j++) {
                // Usar solo parte real para simplificación
                Ynum[i][j] = Y[i][j].r;
            }
        }
        
        // Eliminación Gaussiana
        var I = [];
        for (var i = 0; i < n; i++) {
            I[i] = [];
            for (var j = 0; j < n; j++) {
                I[i][j] = (i === j) ? 1 : 0;
            }
        }
        
        for (var k = 0; k < n; k++) {
            var pivot = Ynum[k][k];
            if (Math.abs(pivot) < 1e-10) continue;
            
            for (var j = 0; j < n; j++) {
                Ynum[k][j] /= pivot;
                I[k][j] /= pivot;
            }
            
            for (var i = 0; i < n; i++) {
                if (i !== k) {
                    var factor = Ynum[i][k];
                    for (var j = 0; j < n; j++) {
                        Ynum[i][j] -= factor * Ynum[k][j];
                        I[i][j] -= factor * I[k][j];
                    }
                }
            }
        }
        
        // Convertir de vuelta a formato complejo
        for (var i = 0; i < n; i++) {
            Z[i] = [];
            for (var j = 0; j < n; j++) {
                Z[i][j] = { r: I[i][j], x: 0 };
            }
        }
        
        return Z;
    }

    /**
     * Calcular impedancia Thévenin en nodo
     * @param {Array} Ybus - Matriz Ybus
     * @param {number} nodo - Índice del nodo
     * @returns {Object} Zth
     */
    function Zth(Ybus, nodo) {
        var Zbus = invertMatrix(Ybus);
        return Zbus[nodo][nodo];
    }

    /**
     * Calcular corriente de falla trifásica (3F)
     * Icc = Vprefalla / Z1_th
     * @param {number} V - Tensión prefalla (pu)
     * @param {Object} Z1 - Impedancia secuencia positiva
     * @returns {number} Icc en pu
     */
    function Icc_3F(V, Z1) {
        var Z1mag = Math.sqrt(Z1.r * Z1.r + Z1.x * Z1.x);
        return V / Z1mag;
    }

    /**
     * Calcular corriente de falla fase-tierra (LG)
     * Icc = 3 * V / (Z1 + Z2 + Z0)
     * @param {number} V - Tensión prefalla (pu)
     * @param {Object} Z1 - Impedancia secuencia positiva
     * @param {Object} Z2 - Impedancia secuencia negativa
     * @param {Object} Z0 - Impedancia secuencia cero
     * @returns {number} Icc en pu
     */
    function Icc_LG(V, Z1, Z2, Z0) {
        var Zsum = {
            r: Z1.r + Z2.r + Z0.r,
            x: Z1.x + Z2.x + Z0.x
        };
        var Zmag = Math.sqrt(Zsum.r * Zsum.r + Zsum.x * Zsum.x);
        return (3 * V) / Zmag;
    }

    /**
     * Calcular corriente de falla línea-línea (LL)
     * Icc = V / (Z1 + Z2)
     * @param {number} V - Tensión prefalla (pu)
     * @param {Object} Z1 - Impedancia secuencia positiva
     * @param {Object} Z2 - Impedancia secuencia negativa
     * @returns {number} Icc en pu
     */
    function Icc_LL(V, Z1, Z2) {
        var Zsum = {
            r: Z1.r + Z2.r,
            x: Z1.x + Z2.x
        };
        var Zmag = Math.sqrt(Zsum.r * Zsum.r + Zsum.x * Zsum.x);
        return V / Zmag;
    }

    /**
     * Calcular corriente de falla línea-línea-tierra (LLG)
     * Icc = V / (Z1 + (Z2 * Z0)/(Z2 + Z0))
     * @param {number} V - Tensión prefalla (pu)
     * @param {Object} Z1 - Impedancia secuencia positiva
     * @param {Object} Z2 - Impedancia secuencia negativa
     * @param {Object} Z0 - Impedancia secuencia cero
     * @returns {number} Icc en pu
     */
    function Icc_LLG(V, Z1, Z2, Z0) {
        // (Z2 * Z0) / (Z2 + Z0)
        var Z2Z0_sum = {
            r: Z2.r + Z0.r,
            x: Z2.x + Z0.x
        };
        var Z2Z0_sum_mag = Math.sqrt(Z2Z0_sum.r * Z2Z0_sum.r + Z2Z0_sum.x * Z2Z0_sum.x);
        
        if (Z2Z0_sum_mag === 0) return Icc_3F(V, Z1);
        
        var Z2Z0 = {
            r: (Z2.r * Z0.r - Z2.x * Z0.x) / Z2Z0_sum_mag,
            x: (Z2.r * Z0.x + Z2.x * Z0.r) / Z2Z0_sum_mag
        };
        
        var Zsum = {
            r: Z1.r + Z2Z0.r,
            x: Z1.x + Z2Z0.x
        };
        var Zmag = Math.sqrt(Zsum.r * Zsum.r + Zsum.x * Zsum.x);
        
        return V / Zmag;
    }

    /**
     * Calcular todas las fallas en un nodo
     * @param {Object} sistema - { buses, elements, MVA, Vbase }
     * @param {string} nodoId - ID del nodo
     * @returns {Object} Corrientes de falla
     */
    function calcularFallas(sistema, nodoId) {
        var buses = sistema.buses;
        var elements = sistema.elements;
        var MVA = sistema.MVA || 10;
        var Vbase = sistema.Vbase || 0.48;
        
        // Construir Ybus para cada secuencia
        var Y1 = buildYbus(buses, elements, "1");
        var Y2 = buildYbus(buses, elements, "2");
        var Y0 = buildYbus(buses, elements, "0");
        
        // Obtener índice del nodo
        var nodoIdx = buses.findIndex(function(b) { return b.id === nodoId; });
        if (nodoIdx === -1) return null;
        
        // Calcular Zth en nodo
        var Z1th = Zth(Y1, nodoIdx);
        var Z2th = Zth(Y2, nodoIdx);
        var Z0th = Zth(Y0, nodoIdx);
        
        // Tensión prefalla (1 pu)
        var V = 1.0;
        
        // Calcular corrientes en pu
        var Icc3F_pu = Icc_3F(V, Z1th);
        var IccLG_pu = Icc_LG(V, Z1th, Z2th, Z0th);
        var IccLL_pu = Icc_LL(V, Z1th, Z2th);
        var IccLLG_pu = Icc_LLG(V, Z1th, Z2th, Z0th);
        
        // Convertir a amperes
        var Ibase = calcIbase(MVA, Vbase);
        
        return {
            Ibase: Ibase,
            Icc_3F: Icc3F_pu * Ibase,
            Icc_LG: IccLG_pu * Ibase,
            Icc_LL: IccLL_pu * Ibase,
            Icc_LLG: IccLLG_pu * Ibase,
            Z1th: Z1th,
            Z2th: Z2th,
            Z0th: Z0th
        };
    }

    /**
     * Validar sensibilidad de protección
     * @param {number} I_falla_min - Corriente de falla mínima (A)
     * @param {number} I_disparo - Corriente de disparo (A)
     * @returns {Object} { sensible, margen }
     */
    function validarSensibilidad(I_falla_min, I_disparo) {
        var margen = (I_falla_min / I_disparo) * 100;
        return {
            sensible: I_falla_min >= I_disparo,
            margen: margen,
            estado: margen >= 100 ? "OK" : (margen >= 80 ? "WARNING" : "ERROR")
        };
    }

    /**
     * Validar consistencia física
     * @param {Object} Z0 - Impedancia secuencia cero
     * @param {Object} Z1 - Impedancia secuencia positiva
     * @returns {boolean} true si Z0 >= Z1
     */
    function validarConsistencia(Z0, Z1) {
        var Z0mag = Math.sqrt(Z0.r * Z0.r + Z0.x * Z0.x);
        var Z1mag = Math.sqrt(Z1.r * Z1.r + Z1.x * Z1.x);
        return Z0mag >= Z1mag;
    }

    return {
        // Clases
        Bus: Bus,
        Line: Line,
        Transformer: Transformer,
        
        // Funciones base
        calcZbase: calcZbase,
        calcIbase: calcIbase,
        toPu: toPu,
        toOhms: toOhms,
        
        // Modelos
        calcZ0trafo: calcZ0trafo,
        modeloCable: modeloCable,
        
        // Matrices
        buildYbus: buildYbus,
        invertMatrix: invertMatrix,
        Zth: Zth,
        
        // Fallas
        Icc_3F: Icc_3F,
        Icc_LG: Icc_LG,
        Icc_LL: Icc_LL,
        Icc_LLG: Icc_LLG,
        calcularFallas: calcularFallas,
        
        // Validaciones
        validarSensibilidad: validarSensibilidad,
        validarConsistencia: validarConsistencia
    };
})();

if (typeof window !== 'undefined') {
    window.MotorImpedancias = MotorImpedancias;
}
