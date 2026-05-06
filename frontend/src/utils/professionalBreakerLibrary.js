/**
 * utils/professionalBreakerLibrary.js - Biblioteca Profesional de Breakers
 * Mapeo exacto a Square D/Schneider con ratings reales y características técnicas
 */

// ========================================
// MAPEO SQUARE D / SCHNEIDER REALISTA
// ========================================

export const ProfessionalBreakerLibrary = {
  // ========================================
  // QO - TERMOMAGNÉTICOS RESIDENCIALES
  // ========================================
  QO: {
    family: "QO",
    type: "Thermal-Magnetic",
    manufacturer: "Square D",
    description: "Miniature Circuit Breaker - Residential",
    
    // Ratings estándar
    getRatings: (In) => ({
      In,                    // Corriente nominal
      Ir: 1.0,              // Long-time pickup (1.0x In)
      tr: 5,                 // Long-time delay a 6x In (5s)
      Isd: 5,                // Short-time pickup (5x In)
      tsd: 0.2,              // Short-time delay (200ms)
      Ii: 10                 // Instantaneous pickup (10x In)
    }),
    
    // Características técnicas
    characteristics: {
      breakingCapacity: "10kA RMS",
      voltage: "240V AC",
      poles: [1, 2],
      tripUnit: "Thermal-Magnetic Fixed",
      standards: ["UL 489", "CSA C22.2"]
    },
    
    // Modelos disponibles
    models: [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 200, 225]
  },

  // ========================================
  // NQ - QO INDUSTRIAL
  // ========================================
  NQ: {
    family: "NQ",
    type: "Thermal-Magnetic",
    manufacturer: "Square D",
    description: "QO Industrial - Heavy Duty",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,
      tr: 6,                 // Ligeramente más lento que QO residencial
      Isd: 5,
      tsd: 0.25,             // 250ms para mayor robustez
      Ii: 10
    }),
    
    characteristics: {
      breakingCapacity: "10kA RMS",
      voltage: "240V AC",
      poles: [1, 2, 3],
      tripUnit: "Thermal-Magnetic Fixed",
      standards: ["UL 489", "NEMA AB1"]
    },
    
    models: [70, 100, 125, 150, 200, 225]
  },

  // ========================================
  // NF - EDB (MOLDED CASE COMMERCIAL)
  // ========================================
  NF: {
    family: "NF",
    type: "MCCB",
    manufacturer: "Square D",
    description: "Energy Breaker - Commercial",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,              // Adjustable 0.7-1.0x In
      tr: 10,                // 10s a 6x In
      Isd: 6,                // Adjustable 4-8x In
      tsd: 0.3,              // 300ms
      Ii: 10                 // Adjustable 8-12x In
    }),
    
    characteristics: {
      breakingCapacity: "25kA RMS",
      voltage: "480V AC",
      poles: [2, 3, 4],
      tripUnit: "Thermal-Magnetic Adjustable",
      standards: ["UL 489", "IEC 60947-2"]
    },
    
    models: [100, 125, 150, 200, 250, 300, 400, 500, 600, 800]
  },

  // ========================================
  // I-LINE - ELECTRÓNICOS LSIG (LEVEL INDUSTRIAL)
  // ========================================
  ILine: {
    family: "I-Line",
    type: "Electronic",
    manufacturer: "Schneider Electric",
    description: "I-Line MGL - Electronic Trip Unit (LSIG)",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,              // Long-time adjustable 0.4-1.0x In
      tr: 12,                // 12s a 6x In
      Isd: 5,                // Short-time adjustable 2-8x In
      tsd: 0.25,             // 250ms adjustable 0.1-0.5s
      Ii: 8,                 // Instantaneous adjustable 4-12x In
      Igr: 0.2,             // Ground pickup 0.2x In
      tgr: 0.5              // Ground delay 500ms
    }),
    
    characteristics: {
      breakingCapacity: "42kA RMS",
      voltage: "600V AC",
      poles: [3, 4],
      tripUnit: "MicroLogic 2.0/3.0/5.0/6.0/7.0",
      communication: "Modbus",
      standards: ["UL 489", "IEC 60947-2", "ANSI/IEEE C37.13"]
    },
    
    models: [800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000]
  },

  // ========================================
  // POWERPACT - POWER CIRCUIT BREAKERS
  // ========================================
  PowerPact: {
    family: "PowerPact",
    type: "Electronic",
    manufacturer: "Schneider Electric",
    description: "PowerPact H/J Frame - Industrial",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,              // Adjustable 0.5-1.0x In
      tr: 12,                // 12s a 6x In
      Isd: 5,                // Adjustable 2-6x In
      tsd: 0.25,             // 250ms adjustable 0.1-0.5s
      Ii: 8                  // Adjustable 4-10x In
    }),
    
    characteristics: {
      breakingCapacity: "35kA RMS",
      voltage: "600V AC",
      poles: [3, 4],
      tripUnit: "PowerPact Trip Unit",
      communication: "Modbus",
      standards: ["UL 489", "IEC 60947-2"]
    },
    
    models: [400, 600, 800, 1000, 1200, 1600, 2000, 2500]
  },

  // ========================================
  // MASTERPACT - AIR CIRCUIT BREAKERS
  // ========================================
  MasterPact: {
    family: "MasterPact",
    type: "ACB",
    manufacturer: "Schneider Electric",
    description: "MasterPact NW/HW - Low Voltage Air Circuit Breaker",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,              // Adjustable 0.4-1.0x In
      tr: 15,                // 15s a 6x In
      Isd: 4,                // Adjustable 2-6x In
      tsd: 0.3,              // 300ms adjustable 0.1-0.8s
      Ii: 6,                 // Adjustable 2-12x In
      Igr: 0.3,             // Ground pickup 0.3x In
      tgr: 0.6              // Ground delay 600ms
    }),
    
    characteristics: {
      breakingCapacity: "65kA RMS",
      voltage: "690V AC",
      poles: [3, 4],
      tripUnit: "MicroLogic Trip Unit",
      communication: "Modbus TCP",
      standards: ["IEC 60947-2", "ANSI/IEEE C37.13"]
    },
    
    models: [800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6300]
  },

  // ========================================
  // COMPACT NS - EUROPEAN STYLE MCCB
  // ========================================
  CompactNS: {
    family: "Compact NS",
    type: "MCCB",
    manufacturer: "Schneider Electric",
    description: "Compact NS - European Style MCCB",
    
    getRatings: (In) => ({
      In,
      Ir: 1.0,              // Adjustable 0.8-1.0x In
      tr: 8,                 // 8s a 6x In
      Isd: 6,                // Adjustable 4-8x In
      tsd: 0.2,              // 200ms
      Ii: 10                 // Adjustable 8-12x In
    }),
    
    characteristics: {
      breakingCapacity: "36kA RMS",
      voltage: "415V AC",
      poles: [3, 4],
      tripUnit: "MicroLogic Trip Unit",
      standards: ["IEC 60947-2"]
    },
    
    models: [100, 125, 160, 200, 250, 400, 630]
  }
};

// ========================================
// CONFIGURACIONES DE SISTEMA REALES
// ========================================

export const RealSystemConfigurations = {
  // Panel residencial típico
  ResidentialSystem: {
    name: "Panel Residencial QO",
    description: "Sistema residencial con QO breakers",
    breakers: [
      { id: "MAIN", family: "QO", In: 200 },
      { id: "BRANCH_1", family: "QO", In: 20 },
      { id: "BRANCH_2", family: "QO", In: 20 },
      { id: "BRANCH_3", family: "QO", In: 15 },
      { id: "BRANCH_4", family: "QO", In: 15 },
      { id: "BRANCH_5", family: "QO", In: 30 },
      { id: "BRANCH_6", family: "QO", In: 50 }
    ]
  },

  // Panel comercial pequeño
  CommercialSystem: {
    name: "Panel Comercial NF",
    description: "Sistema comercial con Energy Breakers",
    breakers: [
      { id: "MAIN", family: "NF", In: 400 },
      { id: "LIGHTING", family: "QO", In: 100 },
      { id: "HVAC_1", family: "NF", In: 50 },
      { id: "HVAC_2", family: "NF", In: 50 },
      { id: "OUTLETS", family: "QO", In: 30 },
      { id: "EQUIPMENT", family: "NF", In: 100 }
    ]
  },

  // Panel industrial mediano
  IndustrialSystem: {
    name: "Panel Industrial I-Line",
    description: "Sistema industrial con I-Line electrónicos",
    breakers: [
      { id: "UTILITY", family: "MasterPact", In: 2000 },
      { id: "MAIN_SWBD", family: "I-Line", In: 1200 },
      { id: "MCC_1", family: "PowerPact", In: 400 },
      { id: "MCC_2", family: "PowerPact", In: 300 },
      { id: "LIGHTING", family: "NF", In: 200 },
      { id: "PANEL_1", family: "QO", In: 100 }
    ]
  },

  // Sistema de baja tensión completo
  LowVoltageSystem: {
    name: "Sistema BT Completo",
    description: "Sistema completo de baja tensión",
    breakers: [
      { id: "UTILITY", family: "MasterPact", In: 4000 },
      { id: "MAIN_XFMR", family: "MasterPact", In: 2500 },
      { id: "SWBD_MAIN", family: "I-Line", In: 2000 },
      { id: "MCC_1", family: "I-Line", In: 800 },
      { id: "MCC_2", family: "I-Line", In: 600 },
      { id: "MCC_3", family: "PowerPact", In: 400 },
      { id: "LIGHTING", family: "NF", In: 300 },
      { id: "PANEL_1", family: "QO", In: 100 }
    ]
  }
};

// ========================================
// UTILIDADES DE BIBLIOTECA PROFESIONAL
// ========================================

export function createBreaker(family, In, id = null) {
  const breakerDef = ProfessionalBreakerLibrary[family];
  if (!breakerDef) {
    throw new Error(`Familia de breaker no encontrada: ${family}`);
  }
  
  // Validar que el In esté disponible para esta familia
  if (breakerDef.models && !breakerDef.models.includes(In)) {
    console.warn(`In=${In}A no está disponible para ${family}, modelos disponibles: ${breakerDef.models.join(', ')}`);
  }
  
  return {
    id: id || `${family}_${In}`,
    family,
    type: breakerDef.type,
    manufacturer: breakerDef.manufacturer,
    description: breakerDef.description,
    ratings: breakerDef.getRatings(In),
    characteristics: breakerDef.characteristics,
    In
  };
}

export function getSystemConfiguration(configName) {
  const config = RealSystemConfigurations[configName];
  if (!config) {
    throw new Error(`Configuración no encontrada: ${configName}`);
  }
  
  return {
    ...config,
    breakers: config.breakers.map(b => createBreaker(b.family, b.In, b.id))
  };
}

export function getAvailableFamilies() {
  return Object.keys(ProfessionalBreakerLibrary);
}

export function getBreakerInfo(family) {
  const breakerDef = ProfessionalBreakerLibrary[family];
  if (!breakerDef) return null;
  
  return {
    family: breakerDef.family,
    type: breakerDef.type,
    manufacturer: breakerDef.manufacturer,
    description: breakerDef.description,
    characteristics: breakerDef.characteristics,
    models: breakerDef.models
  };
}

export function validateSystemCompatibility(breakers) {
  const issues = [];
  
  for (let i = 0; i < breakers.length - 1; i++) {
    const upstream = breakers[i];
    const downstream = breakers[i + 1];
    
    // Verificar ratings decrecientes
    if (downstream.In > upstream.In) {
      issues.push({
        type: "rating_violation",
        upstream: upstream.id,
        downstream: downstream.id,
        message: `Downstream breaker (${downstream.In}A) no debe ser mayor que upstream (${upstream.In}A)`
      });
    }
    
    // Verificar capacidad de interrupción
    const upCapacity = parseInt(upstream.characteristics.breakingCapacity);
    const downCapacity = parseInt(downstream.characteristics.breakingCapacity);
    
    if (downCapacity > upCapacity) {
      issues.push({
        type: "breaking_capacity_violation",
        upstream: upstream.id,
        downstream: downstream.id,
        message: `Downstream tiene mayor capacidad de interrupción (${downCapacity}kA) que upstream (${upCapacity}kA)`
      });
    }
    
    // Verificar compatibilidad de voltaje
    const upVoltage = parseInt(upstream.characteristics.voltage);
    const downVoltage = parseInt(downstream.characteristics.voltage);
    
    if (downVoltage > upVoltage) {
      issues.push({
        type: "voltage_mismatch",
        upstream: upstream.id,
        downstream: downstream.id,
        message: `Downstream tiene mayor voltaje (${downVoltage}V) que upstream (${upVoltage}V)`
      });
    }
  }
  
  return {
    compatible: issues.length === 0,
    issues,
    score: Math.max(0, 100 - issues.length * 10)
  };
}

export function generateSystemReport(breakers) {
  const validation = validateSystemCompatibility(breakers);
  
  // Análisis de tipos
  const typeAnalysis = breakers.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {});
  
  // Análisis de familias
  const familyAnalysis = breakers.reduce((acc, b) => {
    acc[b.family] = (acc[b.family] || 0) + 1;
    return acc;
  }, {});
  
  // Análisis de capacidades
  const capacityAnalysis = breakers.map(b => ({
    id: b.id,
    type: b.type,
    family: b.family,
    In: b.In,
    breakingCapacity: b.characteristics.breakingCapacity,
    voltage: b.characteristics.voltage
  }));
  
  return {
    summary: {
      totalBreakers: breakers.length,
      types: typeAnalysis,
      families: familyAnalysis,
      compatibility: validation
    },
    details: capacityAnalysis,
    recommendations: generateRecommendations(breakers, validation)
  };
}

function generateRecommendations(breakers, validation) {
  const recommendations = [];
  
  if (!validation.compatible) {
    recommendations.push({
      type: "compatibility",
      severity: "error",
      message: "El sistema tiene violaciones de compatibilidad que deben corregirse"
    });
  }
  
  // Verificar si hay mezcla de tipos incompatibles
  const hasElectronic = breakers.some(b => b.type === "Electronic");
  const hasThermal = breakers.some(b => b.type === "Thermal-Magnetic");
  
  if (hasElectronic && hasThermal) {
    recommendations.push({
      type: "mixing",
      severity: "warning",
      message: "Mezcla de breakers térmicos y electrónicos puede afectar coordinación"
    });
  }
  
  // Verificar si hay muchos breakers pequeños
  const smallBreakers = breakers.filter(b => b.In < 100).length;
  if (smallBreakers > breakers.length * 0.7) {
    recommendations.push({
      type: "sizing",
      severity: "info",
      message: "Considerar consolidar breakers pequeños para mejorar selectividad"
    });
  }
  
  return recommendations;
}

export default {
  ProfessionalBreakerLibrary,
  RealSystemConfigurations,
  createBreaker,
  getSystemConfiguration,
  getAvailableFamilies,
  getBreakerInfo,
  validateSystemCompatibility,
  generateSystemReport
};
