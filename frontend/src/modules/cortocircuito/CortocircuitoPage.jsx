import FormICC from './components/FormICC';
import ResultsICC from './components/ResultsICC';
import { useICC } from './hooks/useICC';
import React, { useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';

export default function CortocircuitoPage() {

  const { runICC, runOptimization, loading, result, error, optimization } = useICC();

  // Sincronización con el store principal
  const nodes = useStore(state => state.nodes);
  const edges = useStore(state => state.edges);
  const setNodes = useStore(state => state.setNodes);
  const setEdges = useStore(state => state.setEdges);


  // Sincronización bidireccional
  useEffect(() => {

    // Escuchar cambios desde la ventana principal
    const handleStorageChange = (e) => {
      if (e.key === 'icc-sync-nodes' && e.newValue) {
        try {
          const newNodes = JSON.parse(e.newValue);
          setNodes(newNodes);
        } catch (error) {
          // console.error('SYNC ERROR: Error parsing nodes en módulo:', error)
        }
      } else if (e.key === 'icc-sync-edges' && e.newValue) {
        try {
          const newEdges = JSON.parse(e.newValue);
          setEdges(newEdges);
        } catch (error) {
          // console.error('SYNC ERROR: Error parsing edges en módulo:', error)
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [nodes, edges, setNodes, setEdges]);

  // Sincronizar cambios locales a otras ventanas
  const syncToOtherWindows = useCallback(() => {
    try {
      localStorage.setItem('icc-sync-nodes', JSON.stringify(nodes));
      localStorage.setItem('icc-sync-edges', JSON.stringify(edges));

      // Disparar evento personalizado para notificación inmediata
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'icc-sync-nodes',
        newValue: JSON.stringify(nodes)
      }));
    } catch (error) {
      // console.error('SYNC ERROR: Error guardando en localStorage desde módulo:', error)
    }
  }, [nodes, edges]);

  // Separar el efecto de sincronización para evitar múltiples intervalos
  useEffect(() => {
    let interval = null;

    if (nodes.length > 0 || edges.length > 0) {
      interval = setInterval(syncToOtherWindows, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [nodes.length, edges.length, syncToOtherWindows]);

  // Handler para optimización con breakers de ejemplo
  const handleOptimize = () => {
    // Breakers de ejemplo para demostración
    const breakers = [
      {
        In: 500,
        model: 'MGA36500',
        pickup: 750,
        tms: 0.8,
        inst: 5000,
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
        magnetic: { pickup: 10, clearingTime: 0.02 }
      },
      {
        In: 250,
        model: 'MGA32500',
        pickup: 275,
        tms: 0.1,
        inst: 2500,
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
        magnetic: { pickup: 10, clearingTime: 0.02 }
      }
    ];

    const faults = [
      { I: 1000, I_min: 500 },
      { I: 2000, I_min: 500 },
      { I: 3000, I_min: 500 }
    ];

    runOptimization(breakers, faults);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Módulo de Cortocircuito ⚡</h1>

      <FormICC onCalculate={runICC} />

      <ResultsICC
        result={result}
        loading={loading}
        error={error}
        optimization={optimization}
        onOptimize={handleOptimize}
      />
    </div>
  );
}
