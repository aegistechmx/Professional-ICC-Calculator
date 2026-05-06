/**
 * Catálogo de Breakers Reales (datos de fabricantes)
 * Curvas TCC con puntos en escala log-log
 * Ejemplo: Schneider Electric
 */

const BREAKER_CATALOG = {
  // Schneider Electric - Compact NSX
  Schneider: {
    MGA36500: {
      brand: 'Schneider',
      model: 'MGA36500',
      In: 500, // Corriente nominal en A
      Icu: 50, // Capacidad interruptiva en kA
      thermal: {
        // Puntos de curva térmica (I/In vs t en segundos)
        points: [
          { I: 1.05, t: 7200 }, // 2 horas a 105%
          { I: 1.2, t: 1200 },  // 20 min a 120%
          { I: 1.5, t: 180 },   // 3 min a 150%
          { I: 2.0, t: 60 },    // 1 min a 200%
          { I: 4.0, t: 10 },    // 10s a 400%
          { I: 6.0, t: 3 },     // 3s a 600%
          { I: 8.0, t: 1.5 },   // 1.5s a 800%
          { I: 10.0, t: 0.8 }   // 0.8s a 1000%
        ]
      },
      magnetic: {
        pickup: 10, // 10x In (instantáneo)
        tolerance: 0.2, // ±20%
        clearingTime: 0.02 // 20ms
      }
    },
    MGA32500: {
      brand: 'Schneider',
      model: 'MGA32500',
      In: 250,
      Icu: 35,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: {
        pickup: 10,
        tolerance: 0.2,
        clearingTime: 0.02
      }
    },
    MGA31600: {
      brand: 'Schneider',
      model: 'MGA31600',
      In: 160,
      Icu: 25,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: {
        pickup: 10,
        tolerance: 0.2,
        clearingTime: 0.02
      }
    }
  },

  // ABB - SACE Smax
  ABB: {
    SACE_Smax_E1: {
      brand: 'ABB',
      model: 'SACE Smax E1',
      In: 630,
      Icu: 50,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: {
        pickup: 10,
        tolerance: 0.2,
        clearingTime: 0.02
      }
    }
  },

  // Eaton - Cutler-Hammer
  Eaton: {
    CH: {
      brand: 'Eaton',
      model: 'Cutler-Hammer',
      In: 400,
      Icu: 42,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: {
        pickup: 10,
        tolerance: 0.2,
        clearingTime: 0.02
      }
    }
  }
};

/**
 * Obtiene breaker del catálogo
 * @param {string} brand - Marca (Schneider, ABB, Eaton)
 * @param {string} model - Modelo (MGA36500, etc.)
 * @returns {Object} Datos del breaker
 * @throws {Error} Si no se encuentra el breaker
 */
function getBreaker(brand, model) {
  if (!BREAKER_CATALOG[brand]) {
    throw new Error(`Marca no encontrada: ${brand}`);
  }
  if (!BREAKER_CATALOG[brand][model]) {
    throw new Error(`Modelo no encontrado: ${brand} ${model}`);
  }
  return BREAKER_CATALOG[brand][model];
}

/**
 * Lista todos los breakers disponibles
 * @returns {Array} Lista de breakers
 */
function listBreakers() {
  const list = [];
  for (const brand in BREAKER_CATALOG) {
    for (const model in BREAKER_CATALOG[brand]) {
      list.push({
        brand,
        model,
        ...BREAKER_CATALOG[brand][model]
      });
    }
  }
  return list;
}

module.exports = {
  BREAKER_CATALOG,
  getBreaker,
  listBreakers
};
