const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * backend/src/domain/services/breakerFamilies.domain.js
 * Modelos de Familias de Breakers Reales (Square D, Eaton, ABB)
 * Curvas térmico-magnéticas y MCCB con tolerancias
 */

class BreakerFamilies {
  constructor() {
    // Catálogo de familias soportadas
    this.families = {
      // Square D NQ - Tipo QO (térmico-magnético residencial)
      NQ: {
        manufacturer: 'Square D',
        type: 'thermal-magnetic',
        description: 'NQ - Tipo QO, breaker residencial térmico-magnético',
        ratings: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        voltage: '120/240V',
        curves: ['QO']
      },

      // Square D NF - Tipo EDB/PowerPact (MCCB industrial)
      NF: {
        manufacturer: 'Square D',
        type: 'mccb',
        description: 'NF - Tipo EDB/PowerPact, MCCB industrial',
        ratings: [15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250],
        voltage: '480V',
        curves: ['EDB', 'EDP', 'EGB', 'EJB', 'HDA', 'HGA']
      },

      // Square D Masterpact (Aparataje industrial)
      Masterpact: {
        manufacturer: 'Square D',
        type: 'acb',
        description: 'Masterpact - ACB, air circuit breaker',
        ratings: [400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
        voltage: '480/600V',
        curves: ['LI', 'LSI', 'LSIG']
      },

      // Eaton/Cutler-Hammer
      Eaton: {
        manufacturer: 'Eaton',
        type: 'thermal-magnetic',
        description: 'Eaton F-Frame / J-Frame',
        ratings: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250],
        voltage: '480V',
        curves: ['FA', 'JA', 'KA', 'LA']
      },

      // ABB Tmax
      ABB_Tmax: {
        manufacturer: 'ABB',
        type: 'mccb',
        description: 'ABB Tmax - MCCB industrial',
        ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600],
        voltage: '480V',
        curves: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      }
    };
  }

  /**
   * Generar curva para familia NQ (QO)
   * Térmico-magnético con características reales
   */
  generateNQCurve(rating, tolerance = 'nominal') {
    // Zona térmica (long-time delay)
    const thermalCurve = [];
    const multipliers = [1.0, 1.3, 2.0, 3.0, 4.0, 6.0, 8.0];

    for (const m of multipliers) {
      const I = rating * m;
      let t;

      if (m === 1.0) {
        t = Infinity; // No opera a corriente nominal
      } else if (m < 1.35) {
        // Zona de incertidumbre - puede operar o no
        t = Math.random() * 500 + 500; // 500-1000s
      } else if (m < 2.0) {
        // Curva térmica - tiempo largo
        t = 500 / Math.pow(m - 1, 1.5);
      } else if (m < 5.0) {
        // Zona de transición
        t = 100 / Math.pow(m - 1, 0.8);
      } else {
        // Zona magnética
        t = 0.1 / (m - 5);
      }

      // Aplicar tolerancia
      if (t !== Infinity && t > 0.02) {
        const tolFactor = this.getToleranceFactor(tolerance);
        t *= tolFactor;
      }

      thermalCurve.push({
        I: toElectricalPrecision(parseFloat(I.toFixed(1))),
        t: t === Infinity ? Infinity : toElectricalPrecision(parseFloat(t.toFixed(3)))
      });
    }

    // Zona magnética (instantáneo)
    const magneticMin = rating * 8;
    const magneticMax = rating * 12;
    const magneticTime = 0.02; // 20ms típico

    // Agregar puntos de la zona magnética
    const magneticCurve = [
      { I: toElectricalPrecision(parseFloat((rating * 8)).toFixed(1)), t: 0.1 },
      { I: toElectricalPrecision(parseFloat((rating * 10)).toFixed(1)), t: magneticTime },
      { I: toElectricalPrecision(parseFloat((rating * 12)).toFixed(1)), t: magneticTime },
      { I: toElectricalPrecision(parseFloat((rating * 15)).toFixed(1)), t: magneticTime }
    ];

    // Combinar curvas
    const fullCurve = [...thermalCurve, ...magneticCurve].sort((a, b) => a.I - b.I);

    return {
      family: 'NQ',
      type: 'thermal-magnetic',
      rating,
      pickup: rating,
      instantaneous: {
        min: magneticMin,
        max: magneticMax,
        typical: rating * 10,
        t: magneticTime
      },
      curve: fullCurve,
      tolerances: {
        thermal: '±10%',
        magnetic: '±20%'
      },
      notes: [
        'Curva térmica: protección contra sobrecarga',
        'Curva magnética: protección contra cortocircuito',
        'Zona de incertidumbre: toElectricalPrecision(1.0 - 1.35)x In'
      ]
    };
  }

  /**
   * Generar curva para familia NF (EDB/PowerPact MCCB)
   * MCCB con Long-Time, Short-Time e Instantáneo
   */
  generateNFCurve(settings, tolerance = 'nominal') {
    const {
      rating,
      Ir = 1.0,        // Long-time pickup (typical 0.8-1.0)
      Tr = 2.0,        // Long-time delay (typical 2-10s @ 6x)
      Isd = 5.0,       // Short-time pickup (typical 2-10x Ir)
      Tsd = 0.1,       // Short-time delay (typical 0.1-0.5s)
      Ii = 10.0,       // Instantaneous pickup (typical 8-15x Ir)
      curveType = 'I2t' // I2t, I4t, o flat
    } = settings;

    const baseCurrent = toElectricalPrecision(parseFloat((rating * Ir)).toFixed(6));
    const curve = [];

    // Generar puntos de la curva
    const multipliers = [0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0];

    for (const m of multipliers) {
      const I = toElectricalPrecision(parseFloat((baseCurrent * m;)).toFixed(6));
      let t;

      if (m < 0.9) {
        t = Infinity; // Debajo del pickup
      } else if (m < Isd * 0.9) {
        // Long-Time (LT)
        t = this.calculateLongTime(m, Tr, curveType);
      } else if (m < Ii * 0.9) {
        // Short-Time (ST)
        t = Tsd * (0.5 + 0.5 * (m / Isd));
      } else {
        // Instantáneo (I)
        t = 0.02;
      }

      // Aplicar tolerancia
      if (t !== Infinity && t > 0.02) {
        const tolFactor = this.getToleranceFactor(tolerance);
        t *= tolFactor;
      }

      curve.push({
        I: toElectricalPrecision(parseFloat(I.toFixed(1))),
        t: t === Infinity ? Infinity : toElectricalPrecision(parseFloat(t.toFixed(3))),
        zone: m < Isd ? 'LT' : m < Ii ? 'ST' : 'I'
      });
    }

    return {
      family: 'NF',
      type: 'mccb',
      rating,
      settings: {
        Ir,
        Tr,
        Isd,
        Tsd,
        Ii,
        curveType
      },
      zones: {
        longTime: {
          active: true,
          pickup: baseCurrent,
          delay: Tr,
          type: curveType
        },
        shortTime: {
          active: true,
          pickup: baseCurrent * Isd,
          delay: Tsd,
          I2t: true
        },
        instantaneous: {
          active: true,
          pickup: baseCurrent * Ii,
          time: 0.02
        }
      },
      curve: curve.sort((a, b) => a.I - b.I),
      tolerances: {
        Ir: '±5%',
        Isd: '±10%',
        Ii: '±15%',
        time: '±20%'
      }
    };
  }

  /**
   * Generar curva para Masterpact (ACB)
   * ACB con todas las funciones de protección
   */
  generateMasterpactCurve(settings) {
    const {
      rating,
      Ir = 1.0,
      Tr = 4.0,
      Isd = 2.5,
      Tsd = 0.2,
      Ii = 12.0,
      Ig = 0.3,      // Ground fault (si aplica)
      Tg = 0.1
    } = settings;

    const baseCurrent = toElectricalPrecision(parseFloat((rating * Ir)).toFixed(6));
    const curve = [];

    // Curva similar a NF pero con más puntos y ajustes finos
    const multipliers = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0];

    for (const m of multipliers) {
      const I = toElectricalPrecision(parseFloat((baseCurrent * m;)).toFixed(6));
      let t;
      let zone;

      if (m < 0.9) {
        t = Infinity;
        zone = 'none';
      } else if (m < Isd * 0.95) {
        // Long-Time con más precisión
        t = this.calculateLongTime(m, Tr, 'I2t');
        zone = 'LT';
      } else if (m < Ii * 0.95) {
        // Short-Time
        t = Tsd * (0.3 + 0.7 * Math.pow(m / Isd, -1));
        zone = 'ST';
      } else if (m < Ig * 100) { // Ground fault es %
        // Instantáneo
        t = 0.02;
        zone = 'I';
      } else {
        // Ground fault
        t = Tg;
        zone = 'G';
      }

      curve.push({
        I: toElectricalPrecision(parseFloat(I.toFixed(1))),
        t: t === Infinity ? Infinity : toElectricalPrecision(parseFloat(t.toFixed(3))),
        zone
      });
    }

    return {
      family: 'Masterpact',
      type: 'acb',
      rating,
      settings: { Ir, Tr, Isd, Tsd, Ii, Ig, Tg },
      zones: {
        longTime: { active: true, pickup: baseCurrent, delay: Tr },
        shortTime: { active: true, pickup: baseCurrent * Isd, delay: Tsd },
        instantaneous: { active: true, pickup: baseCurrent * Ii, time: 0.02 },
        groundFault: { active: Ig > 0, pickup: baseCurrent * Ig, delay: Tg }
      },
      curve: curve.sort((a, b) => a.I - b.I),
      features: [
        'Comunicación Modbus',
        'Medición de corriente',
        'Historial de disparos',
        'ZSI (Zone Selective Interlocking)'
      ]
    };
  }

  /**
   * Calcular tiempo de Long-Time
   */
  calculateLongTime(I_multiple, Tr, curveType = 'I2t') {
    // Fórmulas típicas de curvas I2t
    const k = Tr * Math.pow(6, 2); // Constante para que a 6x sea Tr

    switch (curveType) {
      case 'I2t':
        // t = k / I²
        return k / Math.pow(I_multiple, 2);
      case 'I4t':
        // t = k / I⁴ (más empinada)
        return k / Math.pow(I_multiple, 4);
      case 'flat':
        // Tiempo constante
        return Tr;
      default:
        return k / Math.pow(I_multiple, 2);
    }
  }

  /**
   * Obtener factor de tolerancia
   */
  getToleranceFactor(tolerance) {
    switch (tolerance) {
      case 'min':
        return 0.85; // Mínimo (más rápido)
      case 'max':
        return 1.15; // Máximo (más lento)
      case 'nominal':
      default:
        return 1.0; // Nominal
    }
  }

  /**
   * Obtener lista de familias disponibles
   */
  getAvailableFamilies() {
    return Object.entries(this.families).map(([key, family]) => ({
      key,
      manufacturer: family.manufacturer,
      type: family.type,
      description: family.description,
      ratings: family.ratings,
      voltage: family.voltage,
      curves: family.curves
    }));
  }

  /**
   * Obtener ratings disponibles para una familia
   */
  getRatings(familyKey) {
    const family = this.families[familyKey];
    return family ? family.ratings : [];
  }

  /**
   * Validar configuración de breaker
   */
  validateSettings(family, settings) {
    const errors = [];
    const warnings = [];

    const familyData = this.families[family];
    if (!familyData) {
      errors.push(`Familia no soportada: ${family}`);
      return { valid: false, errors, warnings };
    }

    const { rating } = settings;

    // Validar rating
    if (!familyData.ratings.includes(rating)) {
      warnings.push(`Rating ${rating}A no estándar para ${family}. Ratings disponibles: ${familyData.ratings.join(', ')}`);
    }

    // Validaciones específicas por tipo
    if (familyData.type === 'mccb' || familyData.type === 'acb') {
      const { Ir, Isd, Ii } = settings;

      if (Ir && (Ir < 0.5 || Ir > 1.0)) {
        errors.push(`Ir debe estar entre 0.5 y 1.0 (actual: ${Ir})`);
      }

      if (Isd && Ii && Isd >= Ii) {
        errors.push(`Isd (${Isd}) debe ser menor que Ii (${Ii})`);
      }

      if (Ii && Ii > 15) {
        warnings.push(`Ii muy alto (${Ii}x), verificar capacidad de ruptura`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Crear breaker con parámetros por defecto
   */
  createBreaker(family, rating, customSettings = {}) {
    const defaults = {
      NQ: { rating },
      NF: {
        rating,
        Ir: 1.0,
        Tr: 2.0,
        Isd: 5.0,
        Tsd: 0.1,
        Ii: 10.0,
        curveType: 'I2t'
      },
      Masterpact: {
        rating,
        Ir: 1.0,
        Tr: 4.0,
        Isd: 2.5,
        Tsd: 0.2,
        Ii: 12.0,
        Ig: 0.3,
        Tg: 0.1
      }
    };

    const settings = { ...defaults[family], ...customSettings };
    const validation = this.validateSettings(family, settings);

    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    // Generar curva según familia
    let result;
    switch (family) {
      case 'NQ':
        result = this.generateNQCurve(rating, customSettings.tolerance);
        break;
      case 'NF':
        result = this.generateNFCurve(settings, customSettings.tolerance);
        break;
      case 'Masterpact':
        result = this.generateMasterpactCurve(settings);
        break;
      default:
        throw new Error(`Familia no implementada: ${family}`);
    }

    return {
      ...result,
      validation,
      settings
    };
  }
}

module.exports = BreakerFamilies;
