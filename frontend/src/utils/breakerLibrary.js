/**
 * utils/breakerLibrary.js - Biblioteca de Breakers Realistas
 * Catálogo de interruptores con características técnicas reales
 */

// ========================================
// BIBLIOTECA DE BREAKERS REALISTAS
// ========================================

export const BreakerLibrary = {
  // ========================================
  // MINIATURE CIRCUIT BREAKERS (MCB)
  // ========================================
  QO: (In) => ({
    type: "MCB",
    manufacturer: "Square D",
    series: "QO",
    ratings: {
      In,                    // Corriente nominal
      Ir: 1.0,              // Pickup de long time (1.0x In)
      tr: 5,                 // Tiempo de long time a 6x In (5s)
      Isd: 5,                // Pickup de short time (5x In)
      tsd: 0.2,              // Tiempo de short time (200ms)
      Ii: 10                 // Pickup instantáneo (10x In)
    },
    characteristics: {
      breakingCapacity: "10kA",
      voltage: "240V AC",
      poles: 1,
      tripUnit: "Thermal-Magnetic"
    }
  }),

  // ========================================
  // MOLDED CASE CIRCUIT BREAKERS (MCCB)
  // ========================================
  EDB: (In) => ({
    type: "MCCB",
    manufacturer: "Square D",
    series: "Energy Breaker",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 10,                // Tiempo de long time a 6x In (10s)
      Isd: 6,                // Pickup de short time (6x In)
      tsd: 0.3,              // Tiempo de short time (300ms)
      Ii: 10                 // Pickup instantáneo (10x In)
    },
    characteristics: {
      breakingCapacity: "25kA",
      voltage: "480V AC",
      poles: 3,
      tripUnit: "Thermal-Magnetic Adjustable"
    }
  }),

  // ========================================
  // POWER CIRCUIT BREAKERS (PCB)
  // ========================================
  PowerPact: (In) => ({
    type: "PCB",
    manufacturer: "Square D",
    series: "PowerPact",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 12,                // Tiempo de long time a 6x In (12s)
      Isd: 5,                // Pickup de short time (5x In)
      tsd: 0.25,             // Tiempo de short time (250ms)
      Ii: 8                  // Pickup instantáneo (8x In)
    },
    characteristics: {
      breakingCapacity: "35kA",
      voltage: "600V AC",
      poles: 3,
      tripUnit: "Electronic Adjustable"
    }
  }),

  // ========================================
  // ELECTRONIC TRIP UNITS
  // ========================================
  ILINE_MGL: (In) => ({
    type: "Electronic",
    manufacturer: "Schneider Electric",
    series: "I-Line MGL",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 12,                // Tiempo de long time a 6x In (12s)
      Isd: 5,                // Pickup de short time (5x In)
      tsd: 0.25,             // Tiempo de short time (250ms)
      Ii: 8                  // Pickup instantáneo (8x In)
    },
    characteristics: {
      breakingCapacity: "42kA",
      voltage: "600V AC",
      poles: 3,
      tripUnit: "MicroLogic",
      communication: "Modbus"
    }
  }),

  // ========================================
  // LOW VOLTAGE AIR CIRCUIT BREAKERS
  // ========================================
  MasterPact: (In) => ({
    type: "ACB",
    manufacturer: "Schneider Electric",
    series: "MasterPact",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 15,                // Tiempo de long time a 6x In (15s)
      Isd: 4,                // Pickup de short time (4x In)
      tsd: 0.3,              // Tiempo de short time (300ms)
      Ii: 6                  // Pickup instantáneo (6x In)
    },
    characteristics: {
      breakingCapacity: "65kA",
      voltage: "600V AC",
      poles: 3,
      tripUnit: "MicroLogic",
      communication: "Modbus TCP"
    }
  }),

  // ========================================
  // MEDIUM VOLTAGE BREAKERS
  // ========================================
  Vacuum: (In, voltage = 4160) => ({
    type: "VCB",
    manufacturer: "Siemens",
    series: "3AH1",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 20,                // Tiempo de long time a 6x In (20s)
      Isd: 3,                // Pickup de short time (3x In)
      tsd: 0.4,              // Tiempo de short time (400ms)
      Ii: 5                  // Pickup instantáneo (5x In)
    },
    characteristics: {
      breakingCapacity: "25kA",
      voltage: `${voltage}V AC`,
      poles: 3,
      tripUnit: "Digital",
      communication: "IEC 61850"
    }
  }),

  // ========================================
  // SPECIAL PURPOSE BREAKERS
  // ========================================
  GFI: (In) => ({
    type: "GFCI",
    manufacturer: "Square D",
    series: "QO-GFI",
    ratings: {
      In,
      Ir: 1.0,              // Pickup de long time
      tr: 5,                 // Tiempo de long time a 6x In (5s)
      Isd: 5,                // Pickup de short time (5x In)
      tsd: 0.2,              // Tiempo de short time (200ms)
      Ii: 10,                // Pickup instantáneo (10x In)
      GfTrip: 0.005          // Trip de falla a tierra (5mA)
    },
    characteristics: {
      breakingCapacity: "10kA",
      voltage: "120V AC",
      poles: 1,
      tripUnit: "GFCI",
      gfProtection: true
    }
  }),

  // ========================================
  // MOTOR PROTECTION BREAKERS
  // ========================================
  MotorProtection: (In, motorHP) => ({
    type: "MPCB",
    manufacturer: "Allen-Bradley",
    series: "140M",
    ratings: {
      In,
      Ir: 1.25,             // Pickup de long time (125% para motores)
      tr: 8,                 // Tiempo de long time a 6x In (8s)
      Isd: 6,                // Pickup de short time (6x In)
      tsd: 0.25,             // Tiempo de short time (250ms)
      Ii: 12                 // Pickup instantáneo (12x In)
    },
    characteristics: {
      breakingCapacity: "35kA",
      voltage: "480V AC",
      poles: 3,
      tripUnit: "Motor Protection",
      motorHP,
      overloadClass: "10"
    }
  })
};

// ========================================
// UTILIDADES DE BIBLIOTECA
// ========================================

export const getBreakerByType = (type, In, options = {}) => {
  const breakerFn = BreakerLibrary[type];
  if (!breakerFn) {
    throw new Error(`Tipo de breaker no encontrado: ${type}`);
  }
  
  return breakerFn(In, options.voltage, options.motorHP);
};

export const getAvailableTypes = () => {
  return Object.keys(BreakerLibrary);
};

export const getBreakerInfo = (type) => {
  const sample = BreakerLibrary[type](100);
  return {
    type: sample.type,
    manufacturer: sample.manufacturer,
    series: sample.series,
    characteristics: sample.characteristics
  };
};

// ========================================
// PRECONFIGURACIONES COMUNES
// ========================================

export const CommonConfigurations = {
  // Panel de distribución residencial
  ResidentialPanel: [
    { id: "MAIN", ...BreakerLibrary.QO(200) },
    { id: "BRANCH_1", ...BreakerLibrary.QO(20) },
    { id: "BRANCH_2", ...BreakerLibrary.QO(20) },
    { id: "BRANCH_3", ...BreakerLibrary.QO(15) },
    { id: "BRANCH_4", ...BreakerLibrary.QO(15) }
  ],

  // Panel comercial pequeño
  CommercialPanel: [
    { id: "MAIN", ...BreakerLibrary.EDB(400) },
    { id: "LIGHTING", ...BreakerLibrary.QO(100) },
    { id: "HVAC_1", ...BreakerLibrary.EDB(50) },
    { id: "HVAC_2", ...BreakerLibrary.EDB(50) },
    { id: "OUTLETS", ...BreakerLibrary.QO(30) }
  ],

  // Panel industrial mediano
  IndustrialPanel: [
    { id: "MAIN", ...BreakerLibrary.PowerPact(800) },
    { id: "MCC_1", ...BreakerLibrary.EDB(200) },
    { id: "MCC_2", ...BreakerLibrary.EDB(150) },
    { id: "LIGHTING", ...BreakerLibrary.QO(100) },
    { id: "CONTROL", ...BreakerLibrary.QO(50) }
  ],

  // Sistema de baja tensión completo
  LowVoltageSystem: [
    { id: "UTILITY", ...BreakerLibrary.MasterPact(2000) },
    { id: "MAIN_SWBD", ...BreakerLibrary.PowerPact(1200) },
    { id: "MCC_1", ...BreakerLibrary.ILINE_MGL(400) },
    { id: "MCC_2", ...BreakerLibrary.ILINE_MGL(300) },
    { id: "LIGHTING", ...BreakerLibrary.EDB(200) },
    { id: "PANEL_1", ...BreakerLibrary.QO(100) }
  ],

  // Sistema de media tensión
  MediumVoltageSystem: [
    { id: "UTILITY", ...BreakerLibrary.Vacuum(1200, 4160) },
    { id: "MAIN_XFMR", ...BreakerLibrary.Vacuum(800, 4160) },
    { id: "FEEDER_1", ...BreakerLibrary.Vacuum(400, 4160) },
    { id: "FEEDER_2", ...BreakerLibrary.Vacuum(300, 4160) }
  ]
};

// ========================================
// VALIDACIÓN DE COMPATIBILIDAD
// ========================================

export const validateCompatibility = (breakers) => {
  const issues = [];
  
  for (let i = 0; i < breakers.length - 1; i++) {
    const upstream = breakers[i];
    const downstream = breakers[i + 1];
    
    // Verificar que downstream no sea más grande que upstream
    if (downstream.ratings.In > upstream.ratings.In) {
      issues.push({
        type: "rating_mismatch",
        upstream: upstream.id,
        downstream: downstream.id,
        message: `Downstream breaker (${downstream.ratings.In}A) es más grande que upstream (${upstream.ratings.In}A)`
      });
    }
    
    // Verificar capacidad de interrupción
    if (downstream.characteristics.breakingCapacity > upstream.characteristics.breakingCapacity) {
      issues.push({
        type: "breaking_capacity",
        upstream: upstream.id,
        downstream: downstream.id,
        message: `Downstream tiene mayor capacidad de interrupción que upstream`
      });
    }
  }
  
  return {
    compatible: issues.length === 0,
    issues
  };
};

export default {
  BreakerLibrary,
  getBreakerByType,
  getAvailableTypes,
  getBreakerInfo,
  CommonConfigurations,
  validateCompatibility
};
