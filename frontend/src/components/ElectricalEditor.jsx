/**
 * components/ElectricalEditor.jsx - Editor Eléctrico tipo ETAP
 * Editor visual con React Flow para sistemas eléctricos
 */

import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore } from '../store/graphStore';
import { useAutoCalculate } from '../hooks/useAutoCalculate';
import SourceNode from './nodes/SourceNode';
import LoadNode from './nodes/LoadNode';
import TransformerNode from './nodes/TransformerNode';
import BreakerNode from './nodes/BreakerNode';
import BusNode from './nodes/BusNode';
import CustomEdge from './edges/CustomEdge';
import NodeToolbar from './NodeToolbar';
import ResultsPanel from './ResultsPanel';
import './ElectricalEditor.css';

// Tipos de nodos personalizados
const nodeTypes = {
  source: SourceNode,
  load: LoadNode,
  transformer: TransformerNode,
  breaker: BreakerNode,
  bus: BusNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Paleta de componentes
const componentPalette = [
  { type: 'source', label: 'Fuente', icon: 'source', description: 'Fuente de alimentación' },
  { type: 'load', label: 'Carga', icon: 'load', description: 'Carga eléctrica' },
  { type: 'transformer', label: 'Transformador', icon: 'transformer', description: 'Transformador' },
  { type: 'breaker', label: 'Interruptor', icon: 'breaker', description: 'Interruptor automático' },
  { type: 'bus', label: 'Barra', icon: 'bus', description: 'Barra de conexión' },
];

export default function ElectricalEditor() {
  const { config, nodes, edges, results, loading, addNode, addEdge, updateNode, updateEdge } = useGraphStore();

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Auto-cálculo hook
  useAutoCalculate();

  // Sincronizar store con ReactFlow
  React.useEffect(() => {
    setReactFlowNodes(nodes);
  }, [nodes, setReactFlowNodes]);

  React.useEffect(() => {
    setReactFlowEdges(edges);
  }, [edges, setReactFlowEdges]);

  // Manejar conexión de nodos
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: params.source,
        target: params.target,
        type: 'custom',
        data: {
          impedance: 0.05,
          length: 10,
          material: config?.material || 'cobre'
        }
      };

      addEdge(newEdge);
    },
    [addEdge, config]
  );

  // Manejar selección de nodos
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Manejar selección de edges
  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Manejar arrastre desde paleta
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = event.target.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodes.length + 1}`,
          voltaje: type === 'source' ? config?.voltajeBase || 480 : undefined,
          I_carga: type === 'load' ? 150 : undefined,
          longitud: type === 'load' ? 30 : undefined
        }
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode, nodes.length, config]
  );

  // Manejar arrastre desde paleta
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Actualizar datos de nodo
  const updateNodeData = useCallback((nodeId, data) => {
    updateNode(nodeId, data);
  }, [updateNode]);

  // Actualizar datos de edge
  const updateEdgeData = useCallback((edgeId, data) => {
    updateEdge(edgeId, data);
  }, [updateEdge]);

  // Obtener nodos con resultados
  const nodesWithResults = useMemo(() => {
    if (!results?.data?.graphAnalysis?.nodes) return reactFlowNodes;

    return reactFlowNodes.map(node => {
      const nodeResult = results.data.graphAnalysis.nodes.find(n => n.id === node.id);

      return {
        ...node,
        data: {
          ...node.data,
          results: nodeResult?.calculatedData || {},
          status: nodeResult?.calculatedData ? 'calculated' : 'pending'
        }
      };
    });
  }, [reactFlowNodes, results]);

  // Obtener edges con resultados
  const edgesWithResults = useMemo(() => {
    if (!results?.data?.graphAnalysis?.edges) return reactFlowEdges;

    return reactFlowEdges.map(edge => {
      const edgeResult = results.data.graphAnalysis.edges.find(e =>
        e.from === edge.source && e.to === edge.target
      );

      return {
        ...edge,
        data: {
          ...edge.data,
          results: edgeResult?.calculatedData || {},
          status: edgeResult?.calculatedData ? 'calculated' : 'pending'
        }
      };
    });
  }, [reactFlowEdges, results]);

  // Renderizar paleta de componentes
  const renderComponentPalette = () => (
    <div className="component-palette">
      <h3>Componentes</h3>
      <div className="palette-grid">
        {componentPalette.map((component) => (
          <div
            key={component.type}
            className="palette-item"
            draggable
            onDragStart={(event) => onDragStart(event, component.type)}
          >
            <div className={`palette-icon ${component.type}`}>
              {getComponentIcon(component.type)}
            </div>
            <span className="palette-label">{component.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Obtener icono de componente
  const getComponentIcon = (type) => {
    const icons = {
      source: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      load: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
      transformer: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      ),
      breaker: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm0 16H5V5h14v14z" />
        </svg>
      ),
      bus: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.31-2.69-6-6-6H10c-3.31 0-6 2.69-6 6v10z" />
        </svg>
      )
    };
    return icons[type] || icons.source;
  };

  if (!config) {
    return (
      <div className="no-config">
        <h2>Configuración del Proyecto</h2>
        <p>Por favor configure el proyecto antes de comenzar a diseñar el sistema eléctrico.</p>
      </div>
    );
  }

  return (
    <div className="electrical-editor">
      {/* Paleta de componentes */}
      {renderComponentPalette()}

      {/* Editor principal */}
      <div className="editor-container">
        <ReactFlow
          nodes={nodesWithResults}
          edges={edgesWithResults}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f0f0f0" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data.status === 'calculated') return '#10b981';
              if (node.data.status === 'error') return '#ef4444';
              return '#6b7280';
            }}
            maskColor="rgba(255, 255, 255, 0.8)"
          />

          {/* Panel de información */}
          <Panel position="top-left" className="info-panel">
            <div className="project-info">
              <h3>{config.proyecto}</h3>
              <div className="project-stats">
                <span>Nodos: {nodes.length}</span>
                <span>Conexiones: {edges.length}</span>
                <span>Voltaje: {config.voltajeBase}V</span>
              </div>
              {loading && <div className="loading-indicator">Calculando...</div>}
            </div>
          </Panel>

          {/* Panel de resultados */}
          {results && (
            <Panel position="top-right">
              <ResultsPanel results={results} />
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Toolbar de nodos */}
      {selectedNode && (
        <NodeToolbar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          config={config}
        />
      )}

      {/* Toolbar de edges */}
      {selectedEdge && (
        <div className="edge-toolbar">
          <h4>Conexión</h4>
          <div className="edge-properties">
            <label>
              Impedancia (ohms):
              <input
                type="number"
                step="0.01"
                value={selectedEdge.data?.impedance || 0.05}
                onChange={(e) => updateEdgeData(selectedEdge.id, {
                  impedance: parseFloat(e.target.value)
                })}
              />
            </label>
            <label>
              Longitud (m):
              <input
                type="number"
                value={selectedEdge.data?.length || 10}
                onChange={(e) => updateEdgeData(selectedEdge.id, {
                  length: parseFloat(e.target.value)
                })}
              />
            </label>
            <label>
              Material:
              <select
                value={selectedEdge.data?.material || 'cobre'}
                onChange={(e) => updateEdgeData(selectedEdge.id, {
                  material: e.target.value
                })}
              >
                <option value="cobre">Cobre</option>
                <option value="aluminio">Aluminio</option>
              </select>
            </label>
          </div>
          <button onClick={() => setSelectedEdge(null)}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
