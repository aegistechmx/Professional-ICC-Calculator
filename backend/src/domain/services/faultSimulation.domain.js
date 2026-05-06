const { toElectricalPrecision, formatElectricalValue } = require('../../utils/electricalUtils');
/**
 * backend/src/domain/services/faultSimulation.domain.js
 * Motor de Simulación de Fallas Dinámica
 * Simula cortocircuito, disparo de protecciones y propagación
 */

class FaultSimulationEngine {
  constructor() {
    this.dt = 0.01; // Paso de tiempo en segundos
    this.maxTime = 2.0; // Tiempo máximo de simulación
  }

  /**
   * Simular falla en el sistema
   * @param {Object} sistema - Configuración del sistema
   * @param {Object} falla - Parámetros de la falla
   * @returns {Object} Timeline de eventos
   */
  simulate(sistema, falla) {
    const { tipo = '3F', nodo, tiempoInicio = 0, duracion = 0.2 } = falla;

    // Inicializar estado
    let t = 0;
    const eventos = [];
    const nodosEstado = this._inicializarNodos(sistema);
    const protecciones = this._inicializarProtecciones(sistema);

    // Loop de simulación
    while (t <= this.maxTime) {
      // Determinar estado de la falla
      const fallaActiva = this._isFallaActiva(t, tiempoInicio, duracion, nodo);

      // Calcular corrientes en cada nodo
      const estadoActual = this._calcularEstado(
        nodosEstado,
        protecciones,
        fallaActiva,
        nodo,
        tipo
      );

      // Evaluar disparo de protecciones
      const disparos = this._evaluarDisparos(protecciones, estadoActual, t);

      // Aplicar disparos al estado
      this._aplicarDisparos(nodosEstado, protecciones, disparos);

      // Registrar evento
      eventos.push({
        t: toElectricalPrecision(parseFloat(t.toFixed(3))),
        estado: estadoActual.map(n => ({
          id: n.id,
          corriente: toElectricalPrecision(parseFloat(n.corriente.toFixed(2))),
          voltaje: toElectricalPrecision(parseFloat(n.voltaje.toFixed(1))),
          activo: n.activo,
          protegido: n.protegido
        })),
        disparos: disparos.map(d => ({
          proteccionId: d.proteccionId,
          tiempoDisparo: toElectricalPrecision(parseFloat(d.tiempoDisparo.toFixed(3))),
          tipoDisparo: d.tipoDisparo
        })),
        fallaActiva
      });

      t += this.dt;
    }

    return {
      timeline: eventos,
      resumen: this._generarResumen(eventos, falla),
      estadisticas: this._calcularEstadisticas(eventos)
    };
  }

  /**
   * Inicializar estado de nodos
   */
  _inicializarNodos(sistema) {
    return sistema.nodes.map(node => ({
      id: node.id,
      type: node.type,
      I_base: node.data?.I_carga || 100, // Corriente nominal
      V_base: node.data?.voltaje || 220,
      Z: node.data?.impedancia || 0.1,
      activo: true,
      protegido: false,
      corriente: node.data?.I_carga || 0,
      voltaje: node.data?.voltaje || 0
    }));
  }

  /**
   * Inicializar protecciones
   */
  _inicializarProtecciones(sistema) {
    const protecciones = [];

    sistema.nodes.forEach(node => {
      if (node.type === 'breaker' || node.data?.protection) {
        const prot = node.data?.protection || node.data;

        protecciones.push({
          id: node.id,
          nodeId: node.id,
          In: prot?.In || 100,
          Icu: prot?.Icu || 10,
          tipo: prot?.tipo || 'termomagnético',
          curva: this._getCurvaProteccion(prot?.tipo || 'termomagnético'),
          disparado: false,
          tiempoDisparo: null
        });
      }

      // Protección asociada a cargas
      if (node.data?.protection) {
        const prot = node.data.protection;
        protecciones.push({
          id: `prot-${node.id}`,
          nodeId: node.id,
          In: prot?.In || 100,
          Icu: prot?.Icu || 10,
          tipo: prot?.tipo || 'termomagnético',
          curva: this._getCurvaProteccion(prot?.tipo || 'termomagnético'),
          disparado: false,
          tiempoDisparo: null,
          upstream: true
        });
      }
    });

    return protecciones;
  }

  /**
   * Obtener curva de protección
   */
  _getCurvaProteccion(tipo) {
    switch (tipo) {
      case 'fusible':
        return {
          k: 100,
          n: 2,
          instantaneo: 10
        };
      case 'electronico':
        return {
          k: 50,
          n: 1.5,
          instantaneo: 15
        };
      case 'termomagnético':
      default:
        return {
          k: 80,
          n: 2,
          instantaneo: 10
        };
    }
  }

  /**
   * Verificar si la falla está activa
   */
  _isFallaActiva(t, tiempoInicio, duracion, _nodoFalla) {
    return t >= tiempoInicio && t <= (tiempoInicio + duracion);
  }

  /**
   * Calcular estado del sistema
   */
  _calcularEstado(nodos, protecciones, fallaActiva, nodoFalla, tipoFalla) {
    return nodos.map(node => {
      if (!node.activo) {
        return {
          ...node,
          corriente: 0,
          voltaje: 0
        };
      }

      let I = node.I_base;
      let V = node.V_base;

      // Aplicar efecto de falla
      if (fallaActiva && node.id === nodoFalla) {
        // Multiplicador según tipo de falla
        const multiplicadores = {
          '3F': 10,    // Trifásica
          '2F': 8.66,  // Bifásica
          '1F': 5,     // Monofásica
          'FT': 6      // Fase-tierra
        };

        I *= multiplicadores[tipoFalla] || 10;
        V *= 0.1; // Caída de tensión severa
      } else if (fallaActiva) {
        // Nodos cercanos afectados
        V *= 0.7; // Caída de tensión por falla
      }

      return {
        ...node,
        corriente: I,
        voltaje: V,
        protegido: protecciones.some(p =>
          p.nodeId === node.id && p.disparado
        )
      };
    });
  }

  /**
   * Evaluar disparos de protecciones
   */
  _evaluarDisparos(protecciones, estado, t) {
    const disparos = [];

    protecciones.forEach(prot => {
      if (prot.disparado) return;

      const nodeEstado = estado.find(n => n.id === prot.nodeId);
      if (!nodeEstado) return;

      const I = nodeEstado.corriente; // current (A)
      const In = prot.In;

      // Evaluar si debe disparar
      const tiempoDisparo = this._calcularTiempoDisparo(I, In, prot.curva);

      if (tiempoDisparo !== null && tiempoDisparo <= t) {
        disparos.push({
          proteccionId: prot.id,
          tiempoDisparo: t,
          tipoDisparo: I / In > prot.curva.instantaneo ? 'instantaneo' : 'temporizado'
        });
      }
    });

    return disparos;
  }

  /**
   * Calcular tiempo de disparo según curva
   */
  _calcularTiempoDisparo(I, In, curva) {
    const ratio = I / In;

    // No opera si I < In
    if (ratio < 1.0) {
      return null;
    }

    // Disparo instantáneo
    if (ratio > curva.instantaneo) {
      return 0.02; // 20 ms
    }

    // Curva inversa - prevenir división por cero
    const denominador = Math.pow(ratio - 1, curva.n);
    if (denominador < 1e-6) {
      return 0.1; // Valor mínimo de seguridad
    }

    const tiempo = curva.k / denominador;
    return Math.max(0.1, tiempo / 100); // Normalizar a segundos
  }

  /**
   * Aplicar disparos al estado
   */
  _aplicarDisparos(nodos, protecciones, disparos) {
    disparos.forEach(disparo => {
      const prot = protecciones.find(p => p.id === disparo.proteccionId);
      if (prot) {
        prot.disparado = true;
        prot.tiempoDisparo = disparo.tiempoDisparo;

        // Desactivar nodo protegido
        const node = nodos.find(n => n.id === prot.nodeId);
        if (node) {
          node.activo = false;
          node.protegido = true;
        }
      }
    });
  }

  /**
   * Generar resumen de simulación
   */
  _generarResumen(eventos, falla) {
    const ultimoEstado = eventos[eventos.length - 1];
    const primerDisparo = eventos.find(e => e.disparos.length > 0);

    const nodosDesenergizados = ultimoEstado.estado.filter(n => !n.activo).length;
    const nodosEnergizados = ultimoEstado.estado.filter(n => n.activo).length;
    const proteccionesOperadas = ultimoEstado.estado.filter(n => n.protegido).length;

    return {
      tipoFalla: falla.tipo,
      nodoFalla: falla.nodo,
      tiempoPrimeraOperacion: primerDisparo ? primerDisparo.t : null,
      nodosAfectados: nodosDesenergizados,
      nodosRestaurados: nodosEnergizados,
      proteccionesOperadas: proteccionesOperadas,
      tiempoTotalSimulacion: ultimoEstado.t,
      coordenacionExitosa: this._verificarCoordinacion(eventos)
    };
  }

  /**
   * Verificar coordinación de protecciones
   */
  _verificarCoordinacion(eventos) {
    const disparos = eventos
      .filter(e => e.disparos.length > 0)
      .map(e => e.disparos)
      .flat();

    if (disparos.length < 2) return true;

    // Verificar que hay margen de tiempo entre disparos
    const tiempos = disparos.map(d => d.tiempoDisparo).sort((a, b) => a - b);

    for (let i = 1; i < tiempos.length; i++) {
      const delta = tiempos[i] - tiempos[i - 1];
      if (delta < 0.1) { // Menos de 100ms no es suficiente coordinación
        return false;
      }
    }

    return true;
  }

  /**
   * Calcular estadísticas
   */
  _calcularEstadisticas(eventos) {
    const corrientesMaximas = {}; // current (A)
    const voltajesMinimos = {}; // voltage (V)

    eventos.forEach(e => {
      e.estado.forEach(node => {
        if (!corrientesMaximas[node.id] || node.corriente > corrientesMaximas[node.id]) {
          corrientesMaximas[node.id] = node.corriente; // current (A)
        }
        if (!voltajesMinimos[node.id] || node.voltaje < voltajesMinimos[node.id]) {
          voltajesMinimos[node.id] = node.voltaje; // voltage (V)
        }
      });
    });

    return {
      corrientesMaximas,
      voltajesMinimos,
      pasosSimulacion: eventos.length,
      tiempoTotal: eventos[eventos.length - 1]?.t || 0
    };
  }
}

module.exports = FaultSimulationEngine;
