/**
 * motor.js - Adapted for Node.js backend
 * Motor de cálculo principal para cortocircuito.
 * Sin dependencias de DOM ni estado global.
 */
const Impedancias = require('./impedancias');
const CONSTANTES = require('./constantes');
const CalculoMotores = require('./motores');
const Secuencia = require('./secuencia');

const Motor = (function() {

    /**
     * Calcula la resistencia de retorno a tierra automática
     * @param {string} tipoAter - Tipo de aterrizamiento ('yg_solido', 'yg_resistivo', 'delta')
     * @param {number} V - Tensión en V
     * @param {number} trafoKVA - Capacidad del transformador en kVA
     * @param {number} trafoZ - Impedancia del transformador en %
     * @returns {number} Resistencia de retorno en mΩ
     */
    function calcularRetornoTierraAutomatico(tipoAter, V, trafoKVA, trafoZ) {
        // Valores típicos según tipo de aterrizaje y tensión
        var valoresBase = {
            'yg_solido': {
                480: 0.5,
                440: 0.6,
                220: 1.2,
                208: 1.3,
                127: 2.1
            },
            'yg_resistivo': {
                480: 5.0,
                440: 5.5,
                220: 8.0,
                208: 8.5,
                127: 12.0
            },
            'delta': {
                480: 100.0,
                440: 100.0,
                220: 100.0,
                208: 100.0,
                127: 100.0
            }
        };

        // Obtener valor base según tensión y tipo de aterrizaje
        var valorBase;
        if (valoresBase[tipoAter] && valoresBase[tipoAter][V]) {
            valorBase = valoresBase[tipoAter][V];
        } else {
            // Voltaje no soportado, usar valor por defecto
            valorBase = 1.0;
        }

        // Ajustar según tamaño del transformador
        var factorKVA = trafoKVA >= 1000 ? 0.8 : 
                       trafoKVA >= 500 ? 0.9 : 
                       trafoKVA >= 250 ? 1.0 : 1.2;

        // Ajustar según impedancia del transformador
        var factorZ = trafoZ <= 4 ? 0.9 : 
                     trafoZ <= 6 ? 1.0 : 
                     trafoZ <= 8 ? 1.1 : 1.2;

        var resistenciaCalculada = valorBase * factorKVA * factorZ;

        return resistenciaCalculada;
    }

    /**
     * Calcula la impedancia de la fuente
     * @param {string} modo - 'conocido' o 'mva'
     * @param {string} tipoSistema - '3f' o '1f'
     * @param {number} V - Tensión en V
     * @param {number} iscConocido - Isc conocido en kA (modo 'conocido')
     * @param {number} mvaFuente - MVA de la fuente (modo 'mva')
     * @param {number} iscFuente - Isc de la fuente en kA (modo 'mva')
     * @param {number} xrFuente - Relación X/R de la fuente
     * @param {number} trafoKVA - Capacidad del transformador en kVA
     * @param {number} trafoZ - Impedancia del transformador en %
     * @param {number} trafoVs - Tensión secundaria del transformador en V
     * @returns {Object} { R, X, Z, hasTransformer, error }
     */
    function calcularFuente(modo, tipoSistema, V, iscConocido, mvaFuente, iscFuente, xrFuente, trafoKVA, trafoZ, trafoVs) {
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var R = 0, X = 0, Z = 0, hasTransformer = false;

        if (modo === 'conocido') {
            var isc = iscConocido * 1000;
            var z = Impedancias.deFuenteIsc(V, isc, CONSTANTES.XR_FUENTE_DEFAULT, factor);
            R = z.R; X = z.X;
        } else {
            var iscFuenteA;
            if (mvaFuente && mvaFuente > 0) {
                iscFuenteA = (mvaFuente * 1000) / (factor * V);
            } else {
                iscFuenteA = iscFuente * 1000;
            }
            var xrFuenteVal = xrFuente || CONSTANTES.XR_FUENTE_DEFAULT;
            var zf = Impedancias.deFuenteIsc(V, iscFuenteA, xrFuenteVal, factor);
            R = zf.R; X = zf.X;

            if (!trafoKVA || !trafoZ || !trafoVs || trafoKVA <= 0 || trafoZ <= 0 || trafoVs <= 0)
                return { valido: false, error: 'Complete los datos del transformador', R: 0, X: 0, Z: 0, hasTransformer: false };
            var zt = Impedancias.deTransformador(trafoKVA, trafoZ, trafoVs);
            R += zt.R; X += zt.X;
            hasTransformer = true;
            V = trafoVs; // Actualizar tensión a la secundaria del transformador
        }
        return { R: R, X: X, Z: Impedancias.magnitud(R, X), hasTransformer: hasTransformer, V: V, valido: true, error: null };
    }

    /**
     * Valida los datos de entrada
     * @param {Object} data - Datos de cálculo
     * @returns {Object} { valido: boolean, error: string }
     */
    function validar(data) {
        var tension = data.tension;
        if (!tension || tension <= 0) return { valido: false, error: 'Ingrese una tension valida' };
        
        if (data.modo === 'conocido') {
            var isc = data.iscConocido;
            if (!isc || isc <= 0) return { valido: false, error: 'Ingrese un valor valido de Isc' };
        } else {
            var mvaVal = data.mvaFuente;
            var iscF = data.iscFuente;
            if ((!mvaVal || parseFloat(mvaVal) <= 0) && (!iscF || iscF <= 0))
                return { valido: false, error: 'Ingrese Isc o MVA de la fuente' };
            var kva = data.trafoKVA;
            var z = data.trafoZ;
            var vs = data.trafoVs;
            if (!kva || !z || !vs || kva <= 0 || z <= 0 || vs <= 0)
                return { valido: false, error: 'Complete los datos del transformador' };
        }

        if (!data.feeders || data.feeders.length === 0) return { valido: true };
        
        // Validar alimentadores
        for (var i = 0; i < data.feeders.length; i++) {
            var f = data.feeders[i];
            if (!f.material || !f.canalizacion || !f.calibre)
                return { valido: false, error: 'Alim. '+(i+1)+': calibre no valido' };
            if (!f.longitud || f.longitud <= 0)
                return { valido: false, error: 'Alim. '+(i+1)+': longitud invalida' };
        }

        // Validar motores
        var motores = data.motores || [];
        for (var j = 0; j < motores.length; j++) {
            if (motores[j].hp <= 0)
                return { valido: false, error: 'Motor '+(j+1)+': HP debe ser mayor a 0' };
            if (motores[j].punto < 0 || motores[j].punto > data.feeders.length)
                return { valido: false, error: 'Motor '+(j+1)+': punto de conexion invalido' };
        }

        // Validar capacitores
        var capacs = data.capacitores || [];
        for (var c = 0; c < capacs.length; c++) {
            if (!capacs[c].kvar || capacs[c].kvar <= 0)
                return { valido: false, error: 'Banco '+(c+1)+': kVAr debe ser mayor a 0' };
        }

        return { valido: true, error: null };
    }

    /**
     * Ejecuta el cálculo principal de cortocircuito
     * @param {Object} data - Datos de cálculo completos
     * @returns {Object} { puntos: Array, error: string }
     */
    function ejecutar(data) {
        var val = validar(data);
        if (!val.valido) return { error: val.error };

        var tipoSistema = data.tipoSistema || '3f';
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        
        // Calcular fuente
        var fuente = calcularFuente(
            data.modo,
            tipoSistema,
            data.tension,
            data.iscConocido,
            data.mvaFuente,
            data.iscFuente,
            data.xrFuente,
            data.trafoKVA,
            data.trafoZ,
            data.trafoVs
        );
        
        if (!fuente.valido) return { error: fuente.error };

        var V = fuente.V;
        var puntos = [];
        var R_acc = fuente.R, X_acc = fuente.X;

        // P0
        var Z_acc = Impedancias.magnitud(R_acc, X_acc);
        var isc = Impedancias.corrienteIsc(V, Z_acc, factor);
        var xr = X_acc > 1e-6 ? X_acc / R_acc : 999;
        var ipeak = Impedancias.corrientePico(isc, xr);
        puntos.push({
            nombre: fuente.hasTransformer ? 'Sec. Transformador' : 'Punto de conexion',
            R: R_acc, X: X_acc, Z: Z_acc,
            isc: isc / 1000, ipeak: ipeak / 1000, xr: xr,
            equip: data.equipP0 || { tipo: '', nombre: '', cap: 0, amp: 0, marco: '', disparo: '' }
        });

        // Acumular impedancias y calcular cada punto
        if (!data.feeders || data.feeders.length === 0) return { puntos: puntos };
        
        var { CONDUCTORES } = require('./conductores');
        
        for (var i = 0; i < data.feeders.length; i++) {
            var zc = Impedancias.delConductor(data.feeders[i], CONDUCTORES);
            if (!zc) return { error: 'Alim. '+(i+1)+': datos de conductor no validos' };
            R_acc += zc.R; X_acc += zc.X;
            Z_acc = Impedancias.magnitud(R_acc, X_acc);
            isc = Impedancias.corrienteIsc(V, Z_acc, factor);
            xr = X_acc > 1e-6 ? X_acc / R_acc : 999;
            ipeak = Impedancias.corrientePico(isc, xr);
            puntos.push({
                nombre: 'Tras alim. ' + (i + 1),
                R: R_acc, X: X_acc, Z: Z_acc,
                isc: isc / 1000, ipeak: ipeak / 1000, xr: xr,
                equip: data.equipFeeder && data.equipFeeder[i] ? data.equipFeeder[i] : { tipo: '', nombre: '', cap: 0, amp: 0, marco: '', disparo: '' }
            });
        }

        // Aporte de motores
        var motores = (data.motores || []).filter(function(m) { return m.hp > 0; });
        if (motores.length > 0) {
            var aportePorPunto = CalculoMotores.calcularPorPunto(motores, puntos.length, V, factor);
            for (var p = 0; p < puntos.length; p++) {
                var ap = aportePorPunto[p];
                puntos[p].iscConMotores = puntos[p].isc + (ap.iAporte / 1000);
                puntos[p].ipeakConMotores = puntos[p].ipeak + (ap.iAportePico / 1000);
                puntos[p].aporteMotores = ap;
            }
        } else {
            for (var p2 = 0; p2 < puntos.length; p2++) {
                puntos[p2].iscConMotores = puntos[p2].isc;
                puntos[p2].ipeakConMotores = puntos[p2].ipeak;
                puntos[p2].aporteMotores = { iAporte: 0, iAportePico: 0, detalle: [] };
            }
        }

        // Falla fase-tierra (solo trifasico)
        if (tipoSistema === '3f') {
            var x0Config = data.x0Config || CONSTANTES.Z0_CONFIG_DEFAULT;
            var tipoAter = data.tipoAterrizamiento || 'yg_solido';
            var zRetorno = data.zRetornoTierra;
            
            if (zRetorno === undefined || zRetorno === null) {
                // Calcular automáticamente si no se proporciona
                zRetorno = calcularRetornoTierraAutomatico(tipoAter, V, data.trafoKVA, data.trafoZ);
            }
            
            var z0Fuente = Secuencia.z0DesdeIsc(V, puntos[0].isc, puntos[0].xr, factor);
            var zTrafo = fuente.hasTransformer ? fuente.Z : 0;
            
            var { CONDUCTORES_X0 } = require('./conductores');
            
            var fallaFT = Secuencia.calcularFallaFaseTierra(puntos, {
                V: V, tipoSistema: tipoSistema, x0Config: x0Config, tipoAterrizamiento: tipoAter,
                zRetornoTierra: zRetorno, Z0_fuente: z0Fuente, Z_trafo: zTrafo, feeders: data.feeders,
                conductoresX0: CONDUCTORES_X0, conductores: CONDUCTORES
            });
            for (var k = 0; k < puntos.length; k++) puntos[k].faseTierra = fallaFT[k];
        }

        // Corriente de cortocircuito bifásica (Isc bifásica)
        if (tipoSistema === '3f') {
            for (var i = 0; i < puntos.length; i++) {
                var Z1 = Impedancias.magnitud(puntos[i].R, puntos[i].X);
                var iscBifasica = (V / Math.sqrt(3)) / (2 * Z1 + Z1);
                puntos[i].iscBifasica = iscBifasica / 1000;
            }
        }

        // Aporte de capacitores
        var capacs = data.capacitores || [];
        var tieneCap = capacs.some(function(c) { return c.kvar > 0; });
        if (tieneCap) {
            var CalculoCapacitores = require('./capacitores');
            var { CONDUCTORES } = require('./conductores');
            
            var datosCap = CalculoCapacitores.calcularPorPunto(
                puntos.length,
                capacs[0].kvar,
                capacs[0].tension,
                capacs[0].distancia || 0,
                data.feeders,
                CONDUCTORES,
                puntos.map(function(p) { return p.aporteMotores; })
            );
            for (var c2 = 0; c2 < puntos.length; c2++) {
                puntos[c2].ipeakConMotores += datosCap[c2].iCapPicoAmp / 1000;
                puntos[c2].aporteCapacitores = datosCap[c2];
            }
        }

        return { puntos: puntos };
    }

    /**
     * Ejecuta el cálculo de falla mínima
     * @param {Array} puntosMax - Puntos calculados con valores máximos
     * @param {string} tipoSistema - '3f' o '1f'
     * @returns {Array} Resultados de falla mínima por punto
     */
    function ejecutarFallaMinima(puntosMax, tipoSistema) {
        var factor = tipoSistema === '3f' ? Math.sqrt(3) : 2;
        var V = puntosMax[0].equip ? (puntosMax[0].equip.tension || 480) : 480;
        var Vmin = V * 0.95;
        var resultados = [];
        for (var i = 0; i < puntosMax.length; i++) {
            var p = puntosMax[i];
            var Z = Impedancias.magnitud(p.R, p.X);
            var iscMin = Impedancias.corrienteIsc(Vmin, Z, factor) / 1000;
            var xr = p.X > 1e-6 ? p.X / p.R : 999;
            var ipeakMin = Impedancias.corrientePico(iscMin * 1000, xr) / 1000;
            var iDisparo = p.equip && p.equip.iDisparo ? p.equip.iDisparo : 0;
            var sensible = false;
            var margen = 0;
            if (iDisparo > 0 && iscMin > 0) {
                sensible = iscMin * 1000 > iDisparo;
                margen = ((iscMin * 1000 - iDisparo) / iDisparo * 100);
            }
            resultados.push({ iscMin: iscMin, ipeakMin: ipeakMin, iDisparo: iDisparo, sensible: sensible, margen: margen });
        }
        return resultados;
    }

    return {
        ejecutar: ejecutar,
        ejecutarFallaMinima: ejecutarFallaMinima,
        calcularRetornoTierraAutomatico: calcularRetornoTierraAutomatico
    };
})();

module.exports = Motor;
