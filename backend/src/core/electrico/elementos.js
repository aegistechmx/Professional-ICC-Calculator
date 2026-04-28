/**
 * Electrical element models for IEC 60909 short-circuit calculations
 * Base classes for Source, Transformer, Line, etc.
 */

class Elemento {
  constructor(id, tipo, data) {
    this.id = id;
    this.tipo = tipo;
    this.data = data;
  }

  /**
   * Get impedance of the element
   * Must be implemented by subclasses
   */
  getImpedancia() {
    throw new Error('getImpedancia must be implemented by subclass');
  }
}

/**
 * Source element (utility grid, generator)
 * Impedance based on short-circuit power (Scc)
 */
class Fuente extends Elemento {
  getImpedancia() {
    const { Scc, V } = this.data;
    // Z = V² / Scc
    return (V * V) / Scc;
  }
}

/**
 * Transformer element
 * Impedance based on voltage, power, and impedance percentage (uk)
 */
class Transformador extends Elemento {
  getImpedancia() {
    const { V, S, uk } = this.data;
    // Z = (uk/100) * (V² / S)
    return (uk / 100) * (V * V / S);
  }

  /**
   * Get R and X components separately
   * Typical X/R ratio for transformers: 5-10
   */
  getImpedanciaCompleta() {
    const Z = this.getImpedancia();
    const XR = this.data.XR || 8; // Default X/R ratio
    const X = Z * XR / Math.sqrt(1 + XR * XR);
    const R = X / XR;
    return { R, X };
  }
}

/**
 * Line/Cable element
 * Impedance based on per-unit resistance and reactance
 */
class Linea extends Elemento {
  getImpedancia() {
    const { R, X, L } = this.data;
    return {
      R: R * L,
      X: X * L
    };
  }
}

/**
 * Breaker element
 * Negligible impedance for short-circuit calculations
 */
class Breaker extends Elemento {
  getImpedancia() {
    return { R: 0, X: 0 };
  }
}

/**
 * Motor element
 * Contributes to short-circuit current
 */
class Motor extends Elemento {
  getImpedancia() {
    const { hp, V, eficiencia, fp } = this.data;
    // Convert HP to kW
    const P_kw = hp * 0.746;
    // Calculate full load current
    const I_fl = (P_kw * 1000) / (Math.sqrt(3) * V * fp * eficiencia);
    // Motor impedance (typically 5-8 times full load impedance)
    const Z_motor = V / (I_fl * 6);
    return Z_motor;
  }

  /**
   * Get motor contribution to short-circuit
   * Typically 4-6 times full load current
   */
  getContribucionICC() {
    const { hp, V, eficiencia, fp } = this.data;
    const P_kw = hp * 0.746;
    const I_fl = (P_kw * 1000) / (Math.sqrt(3) * V * fp * eficiencia);
    // Motor contribution: 4-6 times I_fl
    return I_fl * 5;
  }
}

/**
 * Panel/Busbar element
 * Negligible impedance
 */
class Panel extends Elemento {
  getImpedancia() {
    return { R: 0, X: 0 };
  }
}

/**
 * Load element
 * Does not contribute to short-circuit
 */
class Carga extends Elemento {
  getImpedancia() {
    return { R: Infinity, X: Infinity };
  }
}

module.exports = {
  Elemento,
  Fuente,
  Transformador,
  Linea,
  Breaker,
  Motor,
  Panel,
  Carga
};
