/**
 * Motor ICC Completo - Compartido entre React y HTML
 * Contiene todas las funciones de cálculo eléctrico del sistema
 */

// Importar funciones básicas del motor principal
import { calcICC, calcAmpacity, calcTripTime, checkCoordination, calcVoltageDrop, validateFeeder } from './index.js';

// Constantes eléctricas
export const CONSTANTES = {
  // Configuración Z0 por defecto
  Z0_CONFIG_DEFAULT: 'plano_acero',
  
  // Factores de multiplicación para X0 según configuración
  Z0_FACTORES: {
    'plano_acero': 2.5,
    'plano_aluminio': 2.0,
    'plano_cobre': 1.8,
    'cable_acero': 3.0,
    'cable_aluminio': 2.5,
    'cable_cobre': 2.2
  },
  
  // Factores de X/R por punto
  XR_DEFAULT: 15,
  
  // Factores de crecimiento típicos
  FACTOR_CRECIMIENTO: 1.25,
  
  // Temperaturas base
  TEMP_BASE: 75,
  TEMP_AMBIENTE_DEFAULT: 30
};

// Cálculo de impedancias
export function calcularImpedancias({
  V,
  kVA,
  Z_pct,
  X_R = CONSTANTES.XR_DEFAULT,
  tipoSistema = '3f'
}) {
  const Z_base = (V * V) / (kVA * 1000); // Impedancia base en ohmios
  const Z_pu = Z_pct / 100; // Impedancia en por unidad
  const Z = Z_base * Z_pu; // Impedancia real en ohmios
  
  const R = Z / Math.sqrt(1 + X_R * X_R);
  const X = Z * X_R / Math.sqrt(1 + X_R * X_R);
  
  return {
    Z: parseFloat(Z.toFixed(6)),
    R: parseFloat(R.toFixed(6)),
    X: parseFloat(X.toFixed(6)),
    Z_pu: parseFloat(Z_pu.toFixed(4)),
    X_R: X_R
  };
}

// Cálculo de corrientes de cortocircuito completas
export function calcularCorrientesCortocircuito({
  V,
  Z1,
  Z2 = Z1,
  Z0,
  tipoSistema = '3f',
  X_R = CONSTANTES.XR_DEFAULT
}) {
  const V_ln = V / Math.sqrt(3); // Voltaje línea-neutro
  
  // Corriente trifásica (I3F)
  const I3F = V_ln / Z1;
  
  // Corriente fase-tierra (If-tierra)
  let IfTierra = 0;
  if (tipoSistema === '3f' && Z0 !== undefined) {
    const Z_fase_tierra = (Z1 + Z2 + Z0) / 3;
    IfTierra = (3 * V_ln) / (Z1 + Z2 + Z0);
  }
  
  // Corriente bifásica (I2F)
  const I2F = (Math.sqrt(3) * V_ln) / (Z1 + Z2);
  
  return {
    I3F: parseFloat(I3F.toFixed(2)),
    I2F: parseFloat(I2F.toFixed(2)),
    IfTierra: parseFloat(IfTierra.toFixed(2)),
    V_ln: parseFloat(V_ln.toFixed(2)),
    relacion: IfTierra > 0 ? parseFloat((IfTierra / I3F).toFixed(3)) : 0
  };
}

// Cálculo de CDT (Corriente de Diseño del Terminal)
export function calcularCDT({
  I_carga,
  factor_crecimiento = CONSTANTES.FACTOR_CRECIMIENTO,
  factor_demanda = 1.0
}) {
  const I_diseño = I_carga * factor_crecimiento * factor_demanda;
  
  return {
    I_carga: parseFloat(I_carga.toFixed(2)),
    I_diseño: parseFloat(I_diseño.toFixed(2)),
    factor_crecimiento,
    factor_demanda
  };
}

// Validación de conductor
export function validarConductor({
  material,
  calibre,
  I_carga,
  I_cortocircuito,
  longitud,
  temp_ambiente = CONSTANTES.TEMP_AMBIENTE_DEFAULT,
  n_conductores = 3
}) {
  // Ampacidad del conductor
  const ampacidad = calcAmpacity({
    material,
    size: calibre,
    ambientC: temp_ambiente,
    nConductors: n_conductores
  });
  
  // Cálculo de caída de tensión
  const resistencia = obtenerResistenciaConductor(material, calibre, longitud);
  const reactancia = obtenerReactanciaConductor(material, calibre, longitud);
  
  const caidaTension = calcVoltageDrop({
    I: I_carga,
    V: 220, // Voltaje base (ajustar según sistema)
    L: longitud,
    R: resistencia,
    X: reactancia
  });
  
  // Validaciones
  const okAmpacidad = ampacidad.I_corr >= I_carga;
  const okCaidaTension = caidaTension.percent <= 3; // 3% máximo
  const okCortocircuito = I_cortocircuito <= 35000; // 35kA máximo típico
  
  return {
    ok: okAmpacidad && okCaidaTension && okCortocircuito,
    ampacidad: {
      ...ampacidad,
      check: okAmpacidad
    },
    caidaTension: {
      ...caidaTension,
      check: okCaidaTension
    },
    cortocircuito: {
      I_sc: I_cortocircuito,
      check: okCortocircuito
    }
  };
}

// Obtener resistencia del conductor
function obtenerResistenciaConductor(material, calibre, longitud) {
  // Resistividad a 75°C (Ohm/km)
  const resistividad = {
    cobre: 0.0216,
    aluminio: 0.0360,
    acero: 0.1200
  };
  
  // Área de sección transversal (mm²)
  const areas = {
    '14': 2.08, '12': 3.31, '10': 5.26, '8': 8.37, '6': 13.3,
    '4': 21.2, '3': 26.7, '2': 33.6, '1': 42.4, '1/0': 53.5,
    '2/0': 67.4, '3/0': 85.0, '4/0': 107.2, '250': 126.7,
    '300': 152.0, '350': 177.3, '400': 202.7, '500': 253.3
  };
  
  const area = areas[calibre] || areas['4/0'];
  const R = (resistividad[material] || resistividad.cobre) * longitud / 1000 / area;
  
  return parseFloat(R.toFixed(6));
}

// Obtener reactancia del conductor
function obtenerReactanciaConductor(material, calibre, longitud) {
  // Reactancia típica por fase (Ohm/km)
  const reactancia = {
    cobre: 0.08,
    aluminio: 0.08,
    acero: 0.12
  };
  
  const X = (reactancia[material] || reactancia.cobre) * longitud / 1000;
  
  return parseFloat(X.toFixed(6));
}

// Cálculo completo del sistema
export function calcularSistemaCompleto({
  tension,
  modo = 'conocido',
  tipoSistema = '3f',
  isc_conocido = null,
  mva_fuente = null,
  xr_fuente = CONSTANTES.XR_DEFAULT,
  trafo_kva = 500,
  trafo_z = 5.75,
  trafo_vp = 13200,
  trafo_vs = 220,
  x0_config = CONSTANTES.Z0_CONFIG_DEFAULT,
  tipo_aterrizaje = 'yg_solido',
  nodos = [],
  motores = []
}) {
  // Calcular impedancias del transformador
  const impedanciasTrafo = calcularImpedancias({
    V: trafo_vs,
    kVA: trafo_kva,
    Z_pct: trafo_z,
    X_R: xr_fuente,
    tipoSistema
  });
  
  // Calcular Z0 según configuración
  const Z0_factor = CONSTANTES.Z0_FACTORES[x0_config] || 2.5;
  const Z0 = impedanciasTrafo.Z * Z0_factor;
  
  // Calcular corrientes de cortocircuito en P0
  const corrientesP0 = calcularCorrientesCortocircuito({
    V: trafo_vs,
    Z1: impedanciasTrafo.Z,
    Z2: impedanciasTrafo.Z,
    Z0: Z0,
    tipoSistema,
    X_R: xr_fuente
  });
  
  // Procesar nodos del sistema
  const resultadosNodos = nodos.map(nodo => {
    // Calcular impedancias acumuladas hasta el nodo
    const Z_acumuladas = calcularImpedanciasAcumuladas(nodo, impedanciasTrafo);
    
    // Calcular corrientes en el nodo
    const corrientesNodo = calcularCorrientesCortocircuito({
      V: trafo_vs,
      Z1: Z_acumuladas.Z1,
      Z2: Z_acumuladas.Z2,
      Z0: Z_acumuladas.Z0,
      tipoSistema,
      X_R: xr_fuente
    });
    
    // Validar conductor
    const validacionConductor = validarConductor({
      material: nodo.feeder?.material || 'cobre',
      calibre: nodo.feeder?.calibre || '4/0',
      I_carga: nodo.feeder?.cargaA || 0,
      I_cortocircuito: corrientesNodo.I3F,
      longitud: nodo.feeder?.longitud || 30
    });
    
    return {
      id: nodo.id,
      nombre: nodo.nombre || nodo.id,
      ...corrientesNodo,
      impedancias: Z_acumuladas,
      validacion: validacionConductor,
      feeder: nodo.feeder,
      equip: nodo.equip
    };
  });
  
  return {
    tension,
    modo,
    tipoSistema,
    trafo: {
      kva: trafo_kva,
      z: trafo_z,
      vp: trafo_vp,
      vs: trafo_vs
    },
    impedancias_trafo: impedanciasTrafo,
    corrientes_p0: corrientesP0,
    nodos: resultadosNodos,
    resumen: generarResumen(resultadosNodos)
  };
}

// Calcular impedancias acumuladas hasta un nodo
function calcularImpedanciasAcumuladas(nodo, impedanciasBase) {
  // Implementación simplificada - en sistema real se calcularía acumulando
  // impedancias de todos los tramos hasta el nodo
  
  const longitud = nodo.feeder?.longitud || 30;
  const material = nodo.feeder?.material || 'cobre';
  const calibre = nodo.feeder?.calibre || '4/0';
  
  // Impedancias del alimentador
  const R_feeder = obtenerResistenciaConductor(material, calibre, longitud);
  const X_feeder = obtenerReactanciaConductor(material, calibre, longitud);
  
  return {
    Z1: impedanciasBase.Z + Math.sqrt(R_feeder * R_feeder + X_feeder * X_feeder),
    Z2: impedanciasBase.Z + Math.sqrt(R_feeder * R_feeder + X_feeder * X_feeder),
    Z0: impedanciasBase.Z * 2.5 + Math.sqrt(R_feeder * R_feeder + X_feeder * X_feeder)
  };
}

// Generar resumen del sistema
function generarResumen(nodos) {
  const nodosConProblemas = nodos.filter(n => !n.validacion.ok);
  
  return {
    total_nodos: nodos.length,
    nodos_con_problemas: nodosConProblemas.length,
    problemas: nodosConProblemas.map(n => ({
      id: n.id,
      problemas: [
        !n.validacion.ampacidad.check && 'Ampacidad insuficiente',
        !n.validacion.caidaTension.check && 'Caída de tensión excesiva',
        !n.validacion.cortocircuito.check && 'Corriente de cortocircuito excesiva'
      ].filter(Boolean)
    }))
  };
}

// Exportar todo para uso en browser
if (typeof window !== 'undefined') {
  window.ICCEngine = {
    ...window.ICCEngine,
    calcularImpedancias,
    calcularCorrientesCortocircuito,
    calcularCDT,
    validarConductor,
    calcularSistemaCompleto,
    CONSTANTES
  };
}

export default {
  calcICC,
  calcAmpacity,
  calcTripTime,
  checkCoordination,
  calcVoltageDrop,
  validateFeeder,
  calcularImpedancias,
  calcularCorrientesCortocircuito,
  calcularCDT,
  validarConductor,
  calcularSistemaCompleto,
  CONSTANTES
};
