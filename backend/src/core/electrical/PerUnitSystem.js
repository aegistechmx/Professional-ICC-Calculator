/**
 * PerUnitSystem - Complete per-unit system implementation
 * 
 * Ensures consistency and scalability in power system analysis
 * Handles multi-level voltage networks with proper base conversion
 * 
 * Key features:
 * - Global base definition (Sbase_MVA, Vbase_kV per bus)
 * - Base change handling for transformers
 * - Element conversion (lines, transformers, loads, machines)
 * - Multi-level voltage support (13.8 kV / 0.48 kV / etc.)
 */

/**
 * Base definition for per-unit system
 * Each bus has its own voltage base
 */
class Base {
  constructor(data = {}) {
    this.Sbase_MVA = data.Sbase_MVA || 100; // Base MVA
    this.Vbase_kV = data.Vbase_kV || {}; // Map: busId -> kV
  }
  
  /**
   * Set voltage base for a specific bus
   */
  setVbase(busId, kV) {
    this.Vbase_kV[busId] = kV;
    return this;
  }
  
  /**
   * Get voltage base for a bus
   */
  getVbase(busId) {
    return this.Vbase_kV[busId] || 13.8; // Default 13.8 kV
  }
  
  /**
   * Calculate impedance base for a given voltage
   * Zbase = Vbase² / Sbase
   */
  getZbase(kV) {
    return (kV * kV) / this.Sbase_MVA; // ohms
  }
  
  /**
   * Calculate current base for a given voltage
   * Ibase = Sbase / (√3 * Vbase)
   */
  getIbase(kV) {
    return this.Sbase_MVA / (Math.sqrt(3) * kV); // kA (if MVA and kV)
  }
  
  /**
   * Calculate apparent power base
   */
  getSbase() {
    return this.Sbase_MVA; // MVA
  }
}

/**
 * Per-unit utilities
 */
const pu = {
  /**
   * Calculate impedance base
   * Zbase = Vbase² / Sbase
   */
  zBase(kV, MVA) {
    return (kV * kV) / MVA; // ohms
  },
  
  /**
   * Calculate current base
   * Ibase = Sbase / (√3 * Vbase)
   */
  iBase(kV, MVA) {
    return MVA / (Math.sqrt(3) * kV); // kA if MVA and kV
  },
  
  /**
   * Convert ohms to per-unit
   * Z_pu = Z_ohm / Zbase
   */
  ohmToPu(Z_ohm, kV, MVA) {
    return Z_ohm / pu.zBase(kV, MVA);
  },
  
  /**
   * Convert per-unit to ohms
   * Z_ohm = Z_pu * Zbase
   */
  puToOhm(Z_pu, kV, MVA) {
    return Z_pu * pu.zBase(kV, MVA);
  },
  
  /**
   * Convert amps to per-unit current
   * I_pu = I_actual / Ibase
   */
  ampToPu(I_amp, kV, MVA) {
    const Ibase = pu.iBase(kV, MVA) * 1000; // Convert kA to A
    return I_amp / Ibase;
  },
  
  /**
   * Convert per-unit current to amps
   * I_actual = I_pu * Ibase
   */
  puToAmp(I_pu, kV, MVA) {
    const Ibase = pu.iBase(kV, MVA) * 1000; // Convert kA to A
    return I_pu * Ibase;
  },
  
  /**
   * Convert MW/MVAR to per-unit power
   * S_pu = S_actual / Sbase
   */
  mvaToPu(S_MVA, Sbase_MVA) {
    return S_MVA / Sbase_MVA;
  },
  
  /**
   * Convert per-unit power to MVA
   * S_actual = S_pu * Sbase
   */
  puToMva(S_pu, Sbase_MVA) {
    return S_pu * Sbase_MVA;
  },
  
  /**
   * Convert volts to per-unit voltage
   * V_pu = V_actual / Vbase
   */
  voltToPu(V_volt, Vbase_kV) {
    return V_volt / (Vbase_kV * 1000);
  },
  
  /**
   * Convert per-unit voltage to volts
   * V_actual = V_pu * Vbase
   */
  puToVolt(V_pu, Vbase_kV) {
    return V_pu * Vbase_kV * 1000;
  },
  
  /**
   * Base change for impedance
   * Z_pu,new = Z_pu,old * (S_new / S_old) * (V_old / V_new)²
   * 
   * Critical for transformer impedance conversion
   */
  changeBaseZ(Zpu_old, S_old, V_old, S_new, V_new) {
    return Zpu_old * (S_new / S_old) * Math.pow(V_old / V_new, 2);
  },
  
  /**
   * Base change for power
   * S_pu,new = S_pu,old * (S_old / S_new)
   */
  changeBaseS(Spu_old, S_old, S_new) {
    return Spu_old * (S_old / S_new);
  }
};

/**
 * Convert line parameters to per-unit
 * @param {Object} line - Line with R_ohm, X_ohm, B
 * @param {Base} base - Per-unit base
 * @returns {Object} Line in per-unit
 */
function lineToPu(line, base) {
  const kV = base.getVbase(line.from); // Use voltage base at from bus
  const MVA = base.getSbase();
  
  return {
    ...line,
    R: pu.ohmToPu(line.R_ohm || 0.01, kV, MVA),
    X: pu.ohmToPu(line.X_ohm || 0.1, kV, MVA),
    B: line.B_ohm ? pu.ohmToPu(line.B_ohm, kV, MVA) : 0
  };
}

/**
 * Convert transformer parameters to per-unit
 * @param {Object} trafo - Transformer with Z_percent, MVA_rating, kV_primary, kV_secondary
 * @param {Base} base - Per-unit base
 * @returns {Object} Transformer in per-unit
 */
function trafoToPu(trafo, base) {
  // Convert Z% to per-unit on transformer's own base
  const Zpu_old = (trafo.Z_percent || 5.75) / 100;
  
  // Change base to system base
  const Zpu_new = pu.changeBaseZ(
    Zpu_old,
    trafo.MVA_rating || 0.5,
    trafo.kV_primary || 13.8,
    base.getSbase(),
    base.getVbase(trafo.primaryBus || trafo.from)
  );
  
  // Calculate tap ratio
  const tap = (trafo.kV_primary || 13.8) / (trafo.kV_secondary || 0.48);
  
  return {
    ...trafo,
    R: pu.changeBaseZ(
      (trafo.R_percent || 1) / 100,
      trafo.MVA_rating || 0.5,
      trafo.kV_primary || 13.8,
      base.getSbase(),
      base.getVbase(trafo.primaryBus || trafo.from)
    ),
    X: Zpu_new,
    tap: trafo.tap || tap,
    grounding: trafo.grounding || 'yg_solido'
  };
}

/**
 * Convert load parameters to per-unit
 * @param {Object} load - Load with P_MW, Q_MVAR
 * @param {Base} base - Per-unit base
 * @returns {Object} Load in per-unit
 */
function loadToPu(load, base) {
  const Sbase = base.getSbase();
  
  return {
    ...load,
    P: pu.mvaToPu(load.P_MW / 1000, Sbase), // Convert MW to MVA then to pu
    Q: pu.mvaToPu(load.Q_MVAR / 1000, Sbase) // Convert MVAR to MVA then to pu
  };
}

/**
 * Convert motor parameters to per-unit
 * @param {Object} motor - Motor with hp, kW, reactances
 * @param {Base} base - Per-unit base
 * @returns {Object} Motor in per-unit
 */
function motorToPu(motor, base) {
  const kV = base.getVbase(motor.bus);
  const MVA = base.getSbase();
  
  // Convert motor rating to MVA
  const motor_MVA = (motor.kW || (motor.hp * 0.746)) / 1000;
  
  // Change base for reactances
  const xd_pu = pu.changeBaseZ(
    motor.xd || 0.2,
    motor_MVA,
    motor.kV || 0.48,
    MVA,
    kV
  );
  
  const xd_prime_pu = pu.changeBaseZ(
    motor.xd_prime || 0.15,
    motor_MVA,
    motor.kV || 0.48,
    MVA,
    kV
  );
  
  const x0_pu = pu.changeBaseZ(
    motor.x0 || 0.05,
    motor_MVA,
    motor.kV || 0.48,
    MVA,
    kV
  );
  
  return {
    ...motor,
    P_pu: pu.mvaToPu(motor_MVA, MVA),
    xd: xd_pu,
    xd_prime: xd_prime_pu,
    x0: x0_pu,
    r1: pu.ohmToPu(motor.r1 || 0.01, kV, MVA),
    r2: pu.ohmToPu(motor.r2 || 0.01, kV, MVA)
  };
}

/**
 * Convert generator parameters to per-unit
 * @param {Object} generator - Generator with MVA, reactances
 * @param {Base} base - Per-unit base
 * @returns {Object} Generator in per-unit
 */
function generatorToPu(generator, base) {
  const kV = base.getVbase(generator.bus);
  const MVA = base.getSbase();
  
  // Change base for reactances
  const xd_pu = pu.changeBaseZ(
    generator.xd || 1.8,
    generator.MVA || 100,
    generator.kV || 13.8,
    MVA,
    kV
  );
  
  const xd_prime_pu = pu.changeBaseZ(
    generator.xd_prime || 0.3,
    generator.MVA || 100,
    generator.kV || 13.8,
    MVA,
    kV
  );
  
  return {
    ...generator,
    P_pu: pu.mvaToPu(generator.P_MW / 1000, MVA),
    Q_pu: pu.mvaToPu(generator.Q_MVAR / 1000, MVA),
    xd: xd_pu,
    xd_prime: xd_prime_pu,
    xg: pu.ohmToPu(generator.xg || 0.1, kV, MVA),
    rg: pu.ohmToPu(generator.rg || 0, kV, MVA)
  };
}

/**
 * Build complete per-unit system from electrical system
 * @param {Object} system - Electrical system with buses, lines, trafos, loads, motors, generators
 * @param {Base} base - Per-unit base definition
 * @returns {Object} System converted to per-unit
 */
function buildPU(system, base) {
  return {
    base,
    buses: system.buses.map(bus => ({
      ...bus,
      V_pu: pu.voltToPu(bus.V_nominal || base.getVbase(bus.id), base.getVbase(bus.id)),
      Vbase: base.getVbase(bus.id)
    })),
    lines: system.lines.map(l => lineToPu(l, base)),
    trafos: system.trafos ? system.trafos.map(t => trafoToPu(t, base)) : [],
    loads: system.loads ? system.loads.map(l => loadToPu(l, base)) : [],
    motors: system.motors ? system.motors.map(m => motorToPu(m, base)) : [],
    generators: system.generators ? system.generators.map(g => generatorToPu(g, base)) : []
  };
}

/**
 * Auto-detect voltage bases from system
 * Analyzes transformers and buses to determine appropriate voltage levels
 */
function autoDetectBases(system) {
  const base = new Base({ Sbase_MVA: 100 });
  
  // Set voltage bases from buses if available
  system.buses.forEach(bus => {
    if (bus.baseKV) {
      base.setVbase(bus.id, bus.baseKV);
    }
  });
  
  // Infer voltage bases from transformers
  if (system.transformers) {
    system.transformers.forEach(tr => {
      if (tr.primaryKV) {
        base.setVbase(tr.fromBus, tr.primaryKV);
      }
      if (tr.secondaryKV) {
        base.setVbase(tr.toBus, tr.secondaryKV);
      }
    });
  }
  
  // Set default voltage for buses without defined base
  system.buses.forEach(bus => {
    if (!base.Vbase_kV[bus.id]) {
      base.setVbase(bus.id, 13.8); // Default to 13.8 kV
    }
  });
  
  return base;
}

/**
 * Convert ReactFlow data to per-unit system
 * @param {Object} data - ReactFlow nodes and edges
 * @returns {Object} Per-unit system ready for simulation
 */
function reactFlowToPU(data) {
  const { nodes, edges } = data;
  
  // Auto-detect voltage bases
  const base = autoDetectBasesFromReactFlow(nodes);
  
  // Build electrical graph
  const { buses, branches } = buildElectricalGraphFromReactFlow(nodes, edges);
  
  // Separate into lines and transformers
  const lines = branches.filter(b => !b.isTransformer);
  const trafos = branches.filter(b => b.isTransformer);
  
  // Build per-unit system
  const system = {
    buses,
    lines,
    trafos,
    loads: [],
    motors: [],
    generators: []
  };
  
  return buildPU(system, base);
}

/**
 * Helper: Auto-detect bases from ReactFlow nodes
 */
function autoDetectBasesFromReactFlow(nodes) {
  const base = new Base({ Sbase_MVA: 100 });
  
  nodes.forEach(node => {
    const params = node.data.parameters || {};
    
    if (params.voltaje) {
      base.setVbase(node.id, params.voltaje);
    }
    
    // Special handling for transformers
    if (node.type === 'transformer') {
      const params = node.data.parameters || {};
      if (params.primario) {
        base.setVbase(node.id, params.primario);
      }
    }
  });
  
  // Set default for undefined buses
  nodes.forEach(node => {
    if (!base.Vbase_kV[node.id]) {
      base.setVbase(node.id, 13.8);
    }
  });
  
  return base;
}

/**
 * Helper: Build electrical graph from ReactFlow
 */
function buildElectricalGraphFromReactFlow(nodes, edges) {
  const buses = [];
  const branches = [];
  
  nodes.forEach(node => {
    const params = node.data.parameters || {};
    
    const bus = {
      id: node.id,
      type: determineBusType(node.type),
      V_nominal: params.voltaje || 13.8,
      P_MW: 0,
      Q_MVAR: 0
    };
    
    if (node.type === 'load') {
      const kW = params.potencia_kW || 50;
      const fp = params.fp || 0.85;
      bus.P_MW = -kW; // Load is negative generation
      bus.Q_MVAR = -kW * Math.tan(Math.acos(fp));
    }
    
    buses.push(bus);
  });
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    const branch = {
      from: edge.source,
      to: edge.target,
      isTransformer: sourceNode.type === 'transformer' || targetNode.type === 'transformer'
    };
    
    if (branch.isTransformer) {
      const transformerNode = sourceNode.type === 'transformer' ? sourceNode : targetNode;
      const params = transformerNode.data.parameters || {};
      
      branch.Z_percent = params.Z || 5.75;
      branch.MVA_rating = (params.kVA || 500) / 1000;
      branch.kV_primary = params.primario || 13800;
      branch.kV_secondary = params.secundario || 480;
      branch.primaryBus = sourceNode.type === 'transformer' ? edge.source : edge.target;
    } else {
      branch.R_ohm = 0.01;
      branch.X_ohm = 0.1;
      branch.B_ohm = 0;
    }
    
    branches.push(branch);
  });
  
  return { buses, branches };
}

/**
 * Helper: Determine bus type from node type
 */
function determineBusType(nodeType) {
  switch (nodeType) {
  case 'transformer':
    return 'SLACK';
  case 'breaker':
  case 'panel':
    return 'PV';
  case 'load':
  case 'motor':
    return 'PQ';
  default:
    return 'PQ';
  }
}

module.exports = {
  Base,
  pu,
  lineToPu,
  trafoToPu,
  loadToPu,
  motorToPu,
  generatorToPu,
  buildPU,
  autoDetectBases,
  reactFlowToPU
};
