/**
 * Network solver for short-circuit calculations
 * Calculates equivalent impedance from fault point to sources
 */

const { sumarImpedancias, sumarImpedanciasArray, magnitud } = require('./impedancia');
const { encontrarCamino, obtenerFuentes } = require('./red');

/**
 * Calculate equivalent impedance from fault point to all sources
 * @param {Object} red - Network graph
 * @param {string} nodoFalla - Fault point node ID
 * @returns {Object} Equivalent impedance {R, X}
 */
function calcularZeq(red, nodoFalla) {
  const camino = encontrarCamino(red, nodoFalla);
  const impedancias = [];

  // Sum impedances along the path from fault to source
  for (const nodeId of camino) {
    const nodo = red[nodeId];
    if (nodo && nodo.elemento && typeof nodo.elemento.getImpedancia === 'function') {
      const Z = nodo.elemento.getImpedancia();
      if (Z && (Z.R !== undefined || Z.X !== undefined)) {
        impedancias.push(Z);
      }
    }
  }

  // Sum all impedances in series
  const Ztotal = sumarImpedanciasArray(impedancias);
  return Ztotal;
}

/**
 * Calculate equivalent impedance with motor contributions
 * @param {Object} red - Network graph
 * @param {string} nodoFalla - Fault point node ID
 * @returns {Object} Equivalent impedance with motor contribution {R, X}
 */
function calcularZeqConMotores(red, nodoFalla) {
  const Zeq = calcularZeq(red, nodoFalla);

  // Find all motors in the network
  const motores = Object.values(red).filter(n => n.tipo === 'motor');

  if (motores.length === 0) return Zeq;

  // Calculate parallel impedance of all motors
  const impedanciasMotores = motores.map(m => {
    const Z = m.elemento.getImpedancia();
    return { R: Z, X: 0 }; // Simplified: motors contribute mostly reactance
  });

  const Zmotores = impedanciaParalelo(impedanciasMotores);

  // Combine source impedance with motor impedance in parallel
  const Ztotal = impedanciaParalelo([Zeq, Zmotores]);

  return Ztotal;
}

/**
 * Calculate short-circuit current at a specific node
 * @param {Object} red - Network graph
 * @param {string} nodoFalla - Fault point node ID
 * @param {Object} opciones - Calculation options
 * @param {number} [opciones.V=480] - Voltage (V)
 * @param {boolean} [opciones.conMotores=true] - Include motor contributions
 * @param {string} [opciones.estandar='iec'] - 'iec' or 'ansi'
 * @returns {Object} Short-circuit calculation results
 */
function calcularCortocircuitoNodo(red, nodoFalla, opciones = {}) {
  const {
    V = 480,
    conMotores = true,
    estandar = 'iec'
  } = opciones;

  // Calculate equivalent impedance
  const Zeq = conMotores
    ? calcularZeqConMotores(red, nodoFalla)
    : calcularZeq(red, nodoFalla);

  // Import appropriate calculation module
  const calcularICC = estandar === 'iec'
    ? require('./iec60909').calcularCortocircuitoTrifasico
    : require('./ansi').convertirIECaANSI;

  // Calculate short-circuit current
  const resultado = estandar === 'iec'
    ? calcularICC({ V, Zeq })
    : calcularICC(require('./iec60909').calcularICC({ V, Zeq }), Zeq);

  return {
    nodo: nodoFalla,
    Zeq,
    Z: magnitud(Zeq),
    ...resultado
  };
}

/**
 * Calculate short-circuit currents at all nodes
 * @param {Object} red - Network graph
 * @param {Object} opciones - Calculation options
 * @returns {Array} Array of results for each node
 */
function calcularCortocircuitoTodosNodos(red, opciones = {}) {
  const resultados = [];

  for (const nodeId of Object.keys(red)) {
    const resultado = calcularCortocircuitoNodo(red, nodeId, opciones);
    resultados.push(resultado);
  }

  return resultados;
}

/**
 * Calculate motor contribution to short-circuit
 * @param {Object} red - Network graph
 * @param {string} nodoFalla - Fault point node ID
 * @returns {Object} Motor contribution results
 */
function calcularContribucionMotores(red, nodoFalla) {
  const motores = Object.values(red).filter(n => n.tipo === 'motor');
  const contribuciones = [];

  for (const motor of motores) {
    const contribucion = motor.elemento.getContribucionICC();
    contribuciones.push({
      id: motor.id,
      nombre: motor.data.label,
      contribucion
    });
  }

  const total = contribuciones.reduce((sum, m) => sum + m.contribucion, 0);

  return {
    motores: contribuciones,
    total
  };
}

/**
 * Check if breaker will trip based on short-circuit current
 * @param {Object} breaker - Breaker node
 * @param {number} Ik - Short-circuit current
 * @returns {Object} Trip status
 */
function verificarDisparoBreaker(breaker, Ik) {
  if (!breaker || !breaker.data) {
    return {
      trip: false,
      In: 100,
      Icu: 25000,
      Ik: Ik || 0,
      margen: 25000,
      factor: 0,
      error: 'Invalid breaker data'
    };
  }

  const params = breaker.data.parameters || {};
  const In = params.In || 100;
  const Icu = params.Icu || 25000;

  // Validate Ik
  if (!Ik || Ik < 0) {
    return {
      trip: false,
      In,
      Icu,
      Ik: 0,
      margen: Icu,
      factor: 0,
      error: 'Invalid current value'
    };
  }

  // Trip conditions
  const excedeIcu = Ik > Icu;
  const excedeIn10x = Ik > In * 10;
  const trip = excedeIcu || excedeIn10x;

  return {
    trip,
    In,
    Icu,
    Ik,
    margen: Icu - Ik,
    factor: In > 0 ? Ik / In : 0
  };
}

/**
 * Helper function for parallel impedance (inline to avoid circular dependency)
 */
function impedanciaParalelo(impedancias) {
  if (impedancias.length === 0) return { R: 0, X: 0 };
  if (impedancias.length === 1) return impedancias[0];

  const admitancias = impedancias.map(Z => {
    const Z2 = (Z.R || 0) ** 2 + (Z.X || 0) ** 2;
    return {
      G: (Z.R || 0) / Z2,
      B: -(Z.X || 0) / Z2
    };
  });

  const Gtotal = admitancias.reduce((sum, Y) => sum + Y.G, 0);
  const Btotal = admitancias.reduce((sum, Y) => sum + Y.B, 0);

  const Y2 = Gtotal ** 2 + Btotal ** 2;
  return {
    R: Gtotal / Y2,
    X: -Btotal / Y2
  };
}

module.exports = {
  calcularZeq,
  calcularZeqConMotores,
  calcularCortocircuitoNodo,
  calcularCortocircuitoTodosNodos,
  calcularContribucionMotores,
  verificarDisparoBreaker
};
