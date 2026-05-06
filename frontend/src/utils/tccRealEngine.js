/**
 * utils/tccRealEngine.js - Motor TCC Real para Ingeniería Eléctrica
 * Implementación de curvas TCC estándar con evaluación en tiempo real
 */

// === CURVAS TCC ESTÁNDAR ===

// Curva IEC Normal Inverse (más común)
export function tccIEC(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TMS * (0.14 / (Math.pow(ratio, 0.02) - 1));
}

// Curva IEC Very Inverse
export function tccIECVeryInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TMS * (13.5 / (Math.pow(ratio, 1) - 1));
}

// Curva IEC Extremely Inverse
export function tccIECExtremelyInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TMS * (80 / (Math.pow(ratio, 2) - 1));
}

// Curva IEEE Moderately Inverse
export function tccIEEEModeratelyInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TMS * (0.0515 / (Math.pow(ratio, 0.02) - 1));
}

// Curva IEEE Very Inverse
export function tccIEEEVeryInverse(I, Ip, TMS = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TMS * (19.61 / (Math.pow(ratio, 2) - 1));
}

// Curva ANSI Device 51 (Time Overcurrent)
export function tccANSI51(I, Ip, TD = 1) {
  if (I <= Ip) return Infinity;

  const ratio = I / Ip;
  return TD * (3.9 / (Math.pow(ratio, 0.02) - 1));
}

// === EVALUACIÓN EN TIEMPO REAL ===

export class BreakerState {
  constructor(id, config = {}) {
    this.id = id;
    this.pickup = config.pickup || 100;
    this.TMS = config.TMS || 1;
    this.TD = config.TD || 1;
    this.curveType = config.curveType || 'IEC';
    this.instantaneous = config.instantaneous || 1000;

    // Estado de tiempo real
    this.accumulatedTime = 0;
    this.tripped = false;
    this.tripTime = null;
    this.lastUpdateTime = performance.now();
  }

  // Evaluar si debe disparar
  evaluate(I, currentTime) {
    if (this.tripped) return false;

    const dt = (currentTime - this.lastUpdateTime) / 1000; // Convertir a segundos
    this.lastUpdateTime = currentTime;

    // Verificar disparo instantáneo
    if (I >= this.instantaneous) {
      this.tripped = true;
      this.tripTime = currentTime;
      return true;
    }

    // Calcular tiempo de disparo según curva
    let tripTime;
    switch (this.curveType) {
      case 'IEC':
        tripTime = tccIEC(I, this.pickup, this.TMS);
        break;
      case 'IEC_Very':
        tripTime = tccIECVeryInverse(I, this.pickup, this.TMS);
        break;
      case 'IEC_Extremely':
        tripTime = tccIECExtremelyInverse(I, this.pickup, this.TMS);
        break;
      case 'IEEE_Moderately':
        tripTime = tccIEEEModeratelyInverse(I, this.pickup, this.TMS);
        break;
      case 'IEEE_Very':
        tripTime = tccIEEEVeryInverse(I, this.pickup, this.TMS);
        break;
      case 'ANSI_51':
        tripTime = tccANSI51(I, this.pickup, this.TD);
        break;
      default:
        tripTime = tccIEC(I, this.pickup, this.TMS);
    }

    if (tripTime === Infinity) return false;

    this.accumulatedTime += dt;

    if (this.accumulatedTime >= tripTime) {
      this.tripped = true;
      this.tripTime = currentTime;
      return true;
    }

    return false;
  }

  // Reset breaker
  reset() {
    this.accumulatedTime = 0;
    this.tripped = false;
    this.tripTime = null;
    this.lastUpdateTime = performance.now();
  }

  // Obtener progreso hacia disparo
  getProgress(I) {
    if (this.tripped) return 1;

    let tripTime;
    switch (this.curveType) {
      case 'IEC':
        tripTime = tccIEC(I, this.pickup, this.TMS);
        break;
      default:
        tripTime = tccIEC(I, this.pickup, this.TMS);
    }

    if (tripTime === Infinity) return 0;

    return Math.min(1, this.accumulatedTime / tripTime);
  }

  // Obtener tiempo restante
  getTimeRemaining(I) {
    if (this.tripped) return 0;

    let tripTime;
    switch (this.curveType) {
      case 'IEC':
        tripTime = tccIEC(I, this.pickup, this.TMS);
        break;
      default:
        tripTime = tccIEC(I, this.pickup, this.TMS);
    }

    if (tripTime === Infinity) return Infinity;

    return Math.max(0, tripTime - this.accumulatedTime);
  }
}

// === MOTOR DE EVALUACIÓN DE SISTEMA ===

export class TCCEvaluationEngine {
  constructor() {
    this.breakers = new Map();
    this.lastEvaluation = performance.now();
  }

  // Registrar breaker
  registerBreaker(id, config) {
    this.breakers.set(id, new BreakerState(id, config));
  }

  // Evaluar todo el sistema
  evaluateSystem(edges, currentTime = performance.now()) {
    const results = [];

    edges.forEach(edge => {
      let current = edge.current || 0;

      // Aumentar corriente si hay falla
      if (edge.isFault) {
        current *= 20; // ICC brutal
      }

      // Buscar breaker asociado
      const breakerId = edge.breakerId;
      const breaker = this.breakers.get(breakerId);

      if (breaker) {
        const tripped = breaker.evaluate(current, currentTime);

        results.push({
          edgeId: edge.id,
          breakerId,
          current,
          tripped,
          progress: breaker.getProgress(current),
          timeRemaining: breaker.getTimeRemaining(current),
          accumulatedTime: breaker.accumulatedTime,
          tripTime: breaker.tripTime
        });
      }
    });

    this.lastEvaluation = currentTime;
    return results;
  }

  // Reset todos los breakers
  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }

  // Reset breaker específico
  resetBreaker(id) {
    const breaker = this.breakers.get(id);
    if (breaker) breaker.reset();
  }

  // Obtener estado de breaker
  getBreakerState(id) {
    return this.breakers.get(id);
  }

  // Obtener todos los estados
  getAllStates() {
    const states = {};
    this.breakers.forEach((breaker, id) => {
      states[id] = {
        id: breaker.id,
        pickup: breaker.pickup,
        TMS: breaker.TMS,
        curveType: breaker.curveType,
        tripped: breaker.tripped,
        tripTime: breaker.tripTime,
        accumulatedTime: breaker.accumulatedTime
      };
    });
    return states;
  }
}

// === UTILIDADES DE CURVAS ===

// Generar puntos para visualización de curva
export function generateTCCCurve(curveType, Ip, TMS = 1, points = 100) {
  const curve = [];
  // const maxCurrent = Ip * 100; // 100x pickup // Unused variable removed

  for (let i = 1; i <= points; i++) {
    const I = Ip * Math.pow(100, i / points); // Escala logarítmica
    let t;

    switch (curveType) {
      case 'IEC':
        t = tccIEC(I, Ip, TMS);
        break;
      case 'IEC_Very':
        t = tccIECVeryInverse(I, Ip, TMS);
        break;
      case 'IEC_Extremely':
        t = tccIECExtremelyInverse(I, Ip, TMS);
        break;
      case 'IEEE_Moderately':
        t = tccIEEEModeratelyInverse(I, Ip, TMS);
        break;
      case 'IEEE_Very':
        t = tccIEEEVeryInverse(I, Ip, TMS);
        break;
      case 'ANSI_51':
        t = tccANSI51(I, Ip, TMS);
        break;
      default:
        t = tccIEC(I, Ip, TMS);
    }

    if (t < 10000) { // Límite de 10 segundos
      curve.push({ current: I, time: t });
    }
  }

  return curve;
}

// Interpolar tiempo para una corriente dada
export function interpolateTripTime(curve, current) {
  if (!curve || curve.length < 2) return 0.02;

  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];

    if (current >= p1.current && current <= p2.current) {
      // Interpolación logarítmica
      const logI = Math.log10(current);
      const logI1 = Math.log10(p1.current);
      const logI2 = Math.log10(p2.current);
      const logT1 = Math.log10(p1.time);
      const logT2 = Math.log10(p2.time);

      const logT = logT1 + ((logI - logI1) * (logT2 - logT1)) / (logI2 - logI1);
      return Math.pow(10, logT);
    }
  }

  // Fuera de rango
  if (current < curve[0].current) return curve[0].time;
  return curve[curve.length - 1].time;
}

export default {
  tccIEC,
  tccIECVeryInverse,
  tccIECExtremelyInverse,
  tccIEEEModeratelyInverse,
  tccIEEEVeryInverse,
  tccANSI51,
  BreakerState,
  TCCEvaluationEngine,
  generateTCCCurve,
  interpolateTripTime
};
