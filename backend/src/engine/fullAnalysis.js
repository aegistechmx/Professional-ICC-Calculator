/**
 * Motor de Análisis Completo ICC
 * Combina: ICC + Ampacidad + Caída de Tensión + Coordinación TCC
 * Pipeline unificado para el live engine
 */

const { validateFeeder } = require('./validator.js');
const { generateCurve, checkCoordinationReal } = require('./tccCoordination.js');

/**
 * Ejecuta análisis completo del sistema
 * @param {Object} systemModel - Modelo del sistema
 * @param {Array} systemModel.buses - Nodos/barras
 * @param {Array} systemModel.branches - Ramas/líneas
 * @param {Array} systemModel.breakers - Breakers/protecciones
 * @param {Array} systemModel.loads - Cargas
 * @param {Object} systemModel.settings - Configuración
 * @returns {Object} Resultado completo del análisis
 */
function runFullAnalysis(systemModel) {
  const { buses, branches, breakers, loads, settings } = systemModel;

  const results = {
    // Resultados por barra
    buses: [],

    // Resultados por rama
    branches: [],

    // Resultados de protecciones
    tcc: [],
    coordination: null,

    // Falla actual
    fault: null,

    // Estado global
    status: 'ok',
    warnings: []
  };

  // 1) Calcular ICC en cada barra
  if (buses && buses.length > 0) {
    for (const bus of buses) {
      // Simulación de cálculo ICC (en implementación real usarías impedancias)
      const isc = calculateBusICC(bus, branches, settings);

      results.buses.push({
        id: bus.id,
        name: bus.name,
        voltage: bus.voltage,
        Isc: isc, // kA
        position: bus.position
      });
    }
  }

  // 2) Calcular ampacidad en ramas
  if (branches && branches.length > 0) {
    for (const branch of branches) {
      try {
        // Usar el motor de ampacidad existente
        const ampResult = validateFeeder({
          material: branch.material || 'Cu',
          size: branch.size || 300,
          ambientC: settings?.ambientC || 30,
          nConductors: branch.nConductors || 3,
          parallels: branch.parallels || 1,
          terminalTempC: 75,
          I_base: branch.current || 300,
          Fcc: 1.25,
          Icu_kA: branch.Icu || 35,
          Isc_kA: getBranchISC(branch, results.buses)
        });

        results.branches.push({
          id: branch.id,
          from: branch.from,
          to: branch.to,
          ampacity: ampResult
        });
      } catch (e) {
        results.warnings.push(`Error en rama ${branch.id}: ${e.message}`);
      }
    }
  }

  // 3) Generar curvas TCC
  if (breakers && breakers.length > 0) {
    for (const breaker of breakers) {
      if (breaker.thermal && breaker.magnetic) {
        const curve = generateCurve(breaker, 100);
        results.tcc.push({
          label: breaker.model || breaker.id,
          breaker,
          points: curve
        });
      }
    }
  }

  // 4) Verificar coordinación si hay falla configurada
  if (settings?.faultBus && breakers && breakers.length >= 2) {
    const faultBus = results.buses.find(b => b.id === settings.faultBus);
    if (faultBus) {
      const I_fault = faultBus.Isc * 1000; // A

      // Ordenar breakers por posición lógica (upstream → downstream)
      const sortedBreakers = sortBreakersByHierarchy(breakers, branches);

      if (sortedBreakers.length >= 2) {
        const upstream = sortedBreakers[0];
        const downstream = sortedBreakers[1];

        results.coordination = checkCoordinationReal({
          upstream,
          downstream,
          I_fault
        });

        results.fault = {
          busId: settings.faultBus,
          Isc: faultBus.Isc,
          tripTime: results.coordination.t_down,
          clearingDevice: downstream.id
        };
      }
    }
  }

  return results;
}

/**
 * Calcula ICC aproximada en una barra
 * @param {Object} bus - Barra
 * @param {Array} branches - Ramas conectadas
 * @param {Object} settings - Configuración
 * @returns {number} Corriente de cortocircuito en kA
 */
function calculateBusICC(bus, branches, settings) {
  // Cálculo simplificado: Isc = V / Z_total
  // En implementación real usarías matriz de impedancias Ybus

  const baseVoltage = bus.voltage || 480; // V
  const basePower = settings?.baseMVA || 10; // MVA

  // Impedancia base
  const Z_base = Math.pow(baseVoltage, 2) / (basePower * 1000000);

  // Impedancia de fuente (simplificada)
  const Z_source = 0.05; // pu (5%)

  // Impedancia de ramas conectadas
  let Z_branches = 0;
  if (branches) {
    const connectedBranches = branches.filter(
      b => b.from === bus.id || b.to === bus.id
    );
    for (const branch of connectedBranches) {
      Z_branches += (branch.impedance || 0.02); // pu
    }
  }

  const Z_total = Z_source + Z_branches;
  const I_base = (basePower * 1000000) / (Math.sqrt(3) * baseVoltage);
  const Isc = I_base / Z_total / 1000; // kA

  return Math.max(1, Isc); // Mínimo 1kA
}

/**
 * Obtiene corriente de cortocircuito en una rama
 * @param {Object} branch - Rama
 * @param {Array} buses - Barras con ICC calculada
 * @returns {number} Corriente de cortocircuito en kA
 */
function getBranchISC(branch, buses) {
  const fromBus = buses.find(b => b.id === branch.from);
  const toBus = buses.find(b => b.id === branch.to);

  // Tomar el mayor de las dos barras
  const isc = Math.max(
    fromBus?.Isc || 5,
    toBus?.Isc || 5
  );

  return isc;
}

/**
 * Ordena breakers por jerarquía (upstream → downstream)
 * @param {Array} breakers - Breakers
 * @param {Array} branches - Ramas para determinar topología
 * @returns {Array} Breakers ordenados
 */
function sortBreakersByHierarchy(breakers, branches) {
  // Simplificación: ordenar por In descendente (mayor upstream)
  return [...breakers].sort((a, b) => (b.In || 0) - (a.In || 0));
}

module.exports = {
  runFullAnalysis
};
