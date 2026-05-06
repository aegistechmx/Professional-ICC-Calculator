/**
 * hooks/useFaultSimulation.js - Hook para simulación de fallas
 * Facilita la integración de simulación dinámica en el editor
 */

import { useState, useCallback } from 'react';

export default function useFaultSimulation() {
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const [nodoFalla, setNodoFalla] = useState(null);
  const [tipoFalla, setTipoFalla] = useState('3F');
  const [estadoSimulacion, setEstadoSimulacion] = useState(null);

  /**
   * Iniciar simulación
   */
  const iniciarSimulacion = useCallback((config) => {
    setSimulacionActiva(true);
    setNodoFalla(config.nodo);
    setTipoFalla(config.tipo);
  }, []);

  /**
   * Finalizar simulación
   */
  const finalizarSimulacion = useCallback(() => {
    setSimulacionActiva(false);
    setEstadoSimulacion(null);
  }, []);

  /**
   * Aplicar estado de simulación a nodos
   */
  const aplicarEstadoSimulacion = useCallback((nodes, estado) => {
    if (!estado || !estado.estado) return nodes;

    return nodes.map(node => {
      const estadoNodo = estado.estado.find(e => e.id === node.id);
      
      if (!estadoNodo) return node;

      // Determinar color basado en estado
      let color;
      let status;

      if (node.id === nodoFalla) {
        color = '#dc2626'; // Rojo - punto de falla
        status = 'fault';
      } else if (estadoNodo.protegido) {
        color = '#f59e0b'; // Amarillo - disparado
        status = 'tripped';
      } else if (!estadoNodo.activo) {
        color = '#6b7280'; // Gris - desenergizado
        status = 'inactive';
      } else if (estadoNodo.corriente > estadoNodo.I_base * 1.5) {
        color = '#f97316'; // Naranja - sobrecarga
        status = 'overload';
      } else {
        color = '#10b981'; // Verde - normal
        status = 'normal';
      }

      return {
        ...node,
        style: {
          ...node.style,
          backgroundColor: color,
          transition: 'all 0.1s ease'
        },
        data: {
          ...node.data,
          _simStatus: status,
          _simCurrent: estadoNodo.corriente,
          _simVoltage: estadoNodo.voltaje
        }
      };
    });
  }, [nodoFalla]);

  /**
   * Aplicar estado de simulación a edges
   */
  const aplicarEstadoEdges = useCallback((edges, estado) => {
    if (!estado || !estado.estado) return edges;

    return edges.map(edge => {
      const sourceEstado = estado.estado.find(e => e.id === edge.source);
      
      if (!sourceEstado || !sourceEstado.activo) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#6b7280',
            strokeDasharray: '5,5',
            opacity: 0.5
          },
          animated: false
        };
      }

      // Color basado en flujo
      const flujo = sourceEstado.corriente;
      let color = '#3b82f6';
      
      if (flujo > 200) color = '#dc2626';
      else if (flujo > 150) color = '#f97316';
      else if (flujo > 100) color = '#eab308';

      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: color,
          strokeWidth: Math.min(5, 1 + flujo / 50)
        },
        data: {
          ...edge.data,
          current: flujo,
          _simActive: true
        }
      };
    });
  }, []);

  /**
   * Resetear estilos de simulación
   */
  const resetearEstilos = useCallback((nodes, edges) => {
    const resetNodes = nodes.map(node => ({
      ...node,
      style: undefined,
      data: {
        ...node.data,
        _simStatus: undefined,
        _simCurrent: undefined,
        _simVoltage: undefined
      }
    }));

    const resetEdges = edges.map(edge => ({
      ...edge,
      style: undefined,
      animated: undefined,
      data: {
        ...edge.data,
        _simActive: undefined
      }
    }));

    return { nodes: resetNodes, edges: resetEdges };
  }, []);

  return {
    simulacionActiva,
    nodoFalla,
    tipoFalla,
    estadoSimulacion,
    setEstadoSimulacion,
    iniciarSimulacion,
    finalizarSimulacion,
    aplicarEstadoSimulacion,
    aplicarEstadoEdges,
    resetearEstilos
  };
}
