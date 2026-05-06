/**
 * backend/src/domain/services/breakerSelector.domain.js
 * Selector automático de breakers con capacidad interruptiva real
 * Nivel ETAP/SKM - Selección inteligente de hardware
 */

class BreakerSelector {
  constructor() {
    // Tabla de capacidades interruptivas I-Line Schneider
    this.interruptCapacity = {
      G: {
        240: 65000,
        480: 35000,
        600: 18000
      },
      J: {
        240: 100000,
        480: 65000,
        600: 25000
      },
      K: {
        240: 65000,
        480: 50000,
        600: 50000
      },
      L: {
        240: 125000,
        480: 100000,
        600: 25000
      }
    };

    // Base de datos de breakers reales
    this.breakersDB = [
      // NQ / QO - Térmico-magnético residencial
      { code: "QO120", rating: 20, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO130", rating: 30, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO140", rating: 40, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO150", rating: 50, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO160", rating: 60, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO170", rating: 70, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO180", rating: 80, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO190", rating: 90, family: "NQ", interrupt: "G", voltage: [240] },
      { code: "QO1100", rating: 100, family: "NQ", interrupt: "G", voltage: [240] },

      // NF / EDB - MCCB industrial
      { code: "EDB34020", rating: 20, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34030", rating: 30, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34040", rating: 40, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34050", rating: 50, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34060", rating: 60, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34070", rating: 70, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34080", rating: 80, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34090", rating: 90, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34100", rating: 100, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34125", rating: 125, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34150", rating: 150, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34175", rating: 175, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34200", rating: 200, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34225", rating: 225, family: "NF", interrupt: "J", voltage: [240, 480, 600] },
      { code: "EDB34250", rating: 250, family: "NF", interrupt: "J", voltage: [240, 480, 600] },

      // I-Line - Distribución industrial
      { code: "HGL36100", rating: 100, family: "ILINE", interrupt: "G", voltage: [240, 480, 600] },
      { code: "HGL36150", rating: 150, family: "ILINE", interrupt: "G", voltage: [240, 480, 600] },
      { code: "HGL36225", rating: 225, family: "ILINE", interrupt: "G", voltage: [240, 480, 600] },
      { code: "HGL36400", rating: 400, family: "ILINE", interrupt: "G", voltage: [240, 480, 600] },

      { code: "JGL36100", rating: 100, family: "ILINE", interrupt: "J", voltage: [240, 480, 600] },
      { code: "JGL36150", rating: 150, family: "ILINE", interrupt: "J", voltage: [240, 480, 600] },
      { code: "JGL36225", rating: 225, family: "ILINE", interrupt: "J", voltage: [240, 480, 600] },
      { code: "JGL36400", rating: 400, family: "ILINE", interrupt: "J", voltage: [240, 480, 600] },
      { code: "JGL36600", rating: 600, family: "ILINE", interrupt: "J", voltage: [240, 480, 600] },

      { code: "LGL36100", rating: 100, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL36150", rating: 150, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL36225", rating: 225, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL36400", rating: 400, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL36600", rating: 600, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL36800", rating: 800, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL361000", rating: 1000, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] },
      { code: "LGL361200", rating: 1200, family: "ILINE", interrupt: "L", voltage: [240, 480, 600] }
    ];
  }

  /**
   * Parsear código de breaker Schneider
   * Ejemplo: HGL36100 -> {frame: H, interrupt: G, type: L, rating: 100}
   */
  parseBreakerCode(code) {
    if (code.startsWith('QO')) {
      return {
        family: 'NQ',
        type: 'QO',
        rating: parseInt(code.substring(2))
      };
    }

    if (code.startsWith('EDB')) {
      return {
        family: 'NF',
        type: 'EDB',
        rating: parseInt(code.substring(5))
      };
    }

    // I-Line: HGL36100
    if (code.length >= 7) {
      return {
        family: 'ILINE',
        frame: code[0],          // H, J, L
        interruptClass: code[1], // G, J, K, L
        type: code[2],           // G, L
        rating: parseInt(code.substring(3))
      };
    }

    return null;
  }

  /**
   * Obtener capacidad interruptiva de un breaker
   */
  getInterruptCapacity(code, voltage) {
    const parsed = this.parseBreakerCode(code);

    if (!parsed || !parsed.interruptClass) {
      return null;
    }

    const table = this.interruptCapacity[parsed.interruptClass];

    if (!table) {
      return null;
    }

    return table[voltage] || null;
  }

  /**
   * Validar breaker contra corriente de cortocircuito
   */
  validateBreaker(Icc, breakerCode, voltage) {
    const ic = this.getInterruptCapacity(breakerCode, voltage); // voltage (V)

    if (!ic) {
      return {
        ok: false,
        error: "Breaker desconocido o voltaje no soportado",
        breakerCode,
        voltage
      };
    }

    if (Icc > ic) {
      return {
        ok: false,
        error: "Capacidad interruptiva insuficiente",
        Icc,
        ic,
        deficit: Icc - ic,
        breakerCode,
        voltage
      };
    }

    return {
      ok: true,
      message: "Capacidad interruptiva OK",
      Icc,
      ic,
      margin: ((ic - Icc) / ic * 100).toFixed(1),
      breakerCode,
      voltage
    };
  }

  /**
   * Seleccionar breaker según criterios
   */
  selectBreaker({ I_carga, Icc, voltage, family = null, options: _options = {} }) { // voltage (V)
    const I_design = I_carga * 1.25; // 125% de carga continua

    // 1. Filtrar por familia si se especifica
    let candidates = family
      ? this.breakersDB.filter(b => b.family === family)
      : [...this.breakersDB];

    // 2. Filtrar por voltaje
    candidates = candidates.filter(b => b.voltage.includes(voltage)); // voltage (V)

    // 3. Filtrar por corriente (rating >= I_design)
    candidates = candidates.filter(b => b.rating >= I_design);

    // 4. Filtrar por capacidad interruptiva
    candidates = candidates.filter(b => {
      const ic = this.getInterruptCapacity(b.code, voltage); // voltage (V)
      return ic && ic >= Icc;
    });

    if (candidates.length === 0) {
      return {
        ok: false,
        error: "No existe breaker que cumpla todas las condiciones",
        criteria: { I_design, Icc, voltage, family },
        message: this.generateErrorMessage(I_design, Icc, voltage, family)
      };
    }

    // 5. Ordenar por rating (más pequeño que cumpla)
    candidates.sort((a, b) => a.rating - b.rating);

    const selected = candidates[0];
    const validation = this.validateBreaker(Icc, selected.code, voltage); // voltage (V)

    return {
      ok: true,
      breaker: selected,
      I_design,
      Icc,
      voltage,
      validation,
      alternatives: candidates.slice(1, 3), // 2 alternativas
      message: "Breaker seleccionado correctamente",
      criteria: {
        I_carga,
        I_design,
        Icc,
        voltage,
        family
      }
    };
  }

  /**
   * Selección automática (prueba todas las familias)
   */
  autoSelectBreaker({ I_carga, Icc, voltage, options = {} }) { // voltage (V)
    const families = ["NQ", "NF", "ILINE"];
    const results = [];

    // Intentar cada familia en orden de preferencia
    for (const family of families) {
      const result = this.selectBreaker({ I_carga, Icc, voltage, family, options }); // voltage (V)

      if (result.ok) {
        results.push({
          family,
          ...result,
          preference: this.getFamilyPreference(family, I_carga, Icc)
        });
      }
    }

    if (results.length === 0) {
      return {
        ok: false,
        error: "Ninguna familia tiene breaker adecuado",
        criteria: { I_carga, Icc, voltage }
      };
    }

    // Ordenar por preferencia
    results.sort((a, b) => b.preference - a.preference);

    const best = results[0];

    return {
      ok: true,
      breaker: best.breaker,
      family: best.family,
      I_design: best.I_design,
      validation: best.validation,
      alternatives: results.slice(1).map(r => ({
        family: r.family,
        breaker: r.breaker,
        reason: "Alternativa válida"
      })),
      message: `Breaker seleccionado de familia ${best.family}`,
      allOptions: results
    };
  }

  /**
   * Obtener preferencia de familia según aplicación
   */
  getFamilyPreference(family, I_carga, Icc) {
    let score = 0;

    switch (family) {
      case 'NQ':
        // Preferible para cargas pequeñas
        score = I_carga <= 100 ? 10 : 0;
        break;

      case 'NF':
        // Bueno para cargas medias industriales
        score = I_carga > 100 && I_carga <= 250 ? 10 : 5;
        break;

      case 'ILINE':
        // Mejor para distribución y cargas grandes
        score = I_carga > 100 ? 10 : 3;
        if (Icc > 35000) score += 5; // Necesario para altas corrientes de falla
        break;
    }

    return score;
  }

  /**
   * Generar mensaje de error detallado
   */
  generateErrorMessage(I_design, Icc, voltage, family) {
    let message = "No se encontró breaker que cumpla: ";

    const conditions = [];
    conditions.push(`I_diseño = ${I_design.toFixed(1)}A`);
    conditions.push(`Icc = ${Icc}A`);
    conditions.push(`V = ${voltage}V`); // voltage (V)

    if (family) {
      conditions.push(`Familia = ${family}`);
    }

    message += conditions.join(", ");

    // Sugerencias específicas
    if (Icc > 100000) {
      message += ". Considerar usar Masterpact (ACB) o aumentar calibre de conductores.";
    } else if (I_design > 1200) {
      message += ". Considerar usar interruptor en caja o sistema de barras.";
    } else {
      message += ". Verificar cálculos o considerar configuración diferente.";
    }

    return message;
  }

  /**
   * Obtener breakers disponibles por familia
   */
  getAvailableBreakers(family = null, voltage = null) { // voltage (V)
    let breakers = [...this.breakersDB];

    if (family) {
      breakers = breakers.filter(b => b.family === family);
    }

    if (voltage) {
      breakers = breakers.filter(b => b.voltage.includes(voltage)); // voltage (V)
    }

    return breakers.map(b => ({
      ...b,
      interruptCapacity: this.getInterruptCapacity(b.code, 480) // Default 480V
    }));
  }

  /**
   * Analizar sistema completo
   */
  analyzeSystem(nodes, systemVoltage = 480) { // Unit: V (Volts)
    const analysis = {
      totalNodes: nodes.length,
      validNodes: 0,
      invalidNodes: 0,
      recommendations: [],
      summary: {
        families: {},
        voltageLevels: {},
        currentRanges: {}
      }
    };

    nodes.forEach(node => {
      if (!node.I_carga || !node.Icc) {
        analysis.invalidNodes++;
        return;
      }

      const result = this.autoSelectBreaker({
        I_carga: node.I_carga,
        Icc: node.Icc,
        voltage: systemVoltage
      });

      if (result.ok) {
        analysis.validNodes++;

        // Estadísticas
        const family = result.family;
        analysis.summary.families[family] = (analysis.summary.families[family] || 0) + 1;

        const range = this.getCurrentRange(node.I_carga);
        analysis.summary.currentRanges[range] = (analysis.summary.currentRanges[range] || 0) + 1; // current (A)
      } else {
        analysis.invalidNodes++;
        analysis.recommendations.push({
          nodeId: node.id,
          issue: result.error,
          suggestion: "Verificar cálculos o considerar equipo diferente"
        });
      }
    });

    return analysis;
  }

  /**
   * Clasificar rango de corriente
   */
  getCurrentRange(I) {
    if (I <= 30) return "0-30A";
    if (I <= 100) return "31-100A";
    if (I <= 250) return "101-250A";
    if (I <= 600) return "251-600A";
    return "601A+";
  }

  /**
   * Exportar catálogo completo
   */
  exportCatalog() {
    return {
      families: {
        NQ: "Térmico-magnético residencial (QO)",
        NF: "MCCB industrial (EDB/PowerPact)",
        ILINE: "I-Line distribución industrial"
      },
      interruptClasses: {
        G: "42kA @ 480V",
        J: "65kA @ 480V",
        K: "50kA @ 480V",
        L: "100kA @ 480V"
      },
      breakers: this.breakersDB.map(b => ({
        ...b,
        interruptCapacity: this.getInterruptCapacity(b.code, 480)
      }))
    };
  }
}

module.exports = BreakerSelector;
