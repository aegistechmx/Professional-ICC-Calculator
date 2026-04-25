import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import BreakerNode from './nodes/BreakerNode';
import TransformerNode from './nodes/TransformerNode';
import PanelNode from './nodes/PanelNode';
import LoadNode from './nodes/LoadNode';
import MotorNode from './nodes/MotorNode';
import PropertiesPanel from './PropertiesPanel';
import GridBackground from './GridBackground';
import { useStore } from '../store/useStore';
import { snap } from '../utils/snap';

const nodeTypes = {
  breaker: BreakerNode,
  transformer: TransformerNode,
  panel: PanelNode,
  load: LoadNode,
  motor: MotorNode
};

function Editor() {
  const reactFlowWrapper = useRef(null);
  const { setNodes, setEdges, setSelectedNode } = useStore();
  const [nodes, onNodesChange] = useNodesState([]);
  const [edges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (sourceNode && targetNode) {
        // Validate connection
        const { validateConnection } = require('../utils/validation');
        if (!validateConnection(sourceNode.type, targetNode.type)) {
          alert(`Conexión inválida: ${sourceNode.type} → ${targetNode.type}`);
          return;
        }
      }

      setEdges((eds) => addEdge(params, eds));
    },
    [nodes, setEdges]
  );

  const onNodesChangeHandler = useCallback(
    (changes) => {
      onNodesChange(changes);
      setNodes(nodes);
    },
    [onNodesChange, nodes, setNodes]
  );

  const onEdgesChangeHandler = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setEdges(edges);
    },
    [onEdgesChange, edges, setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      const rawPosition = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      };

      // Snap to grid and other nodes
      const position = snap(rawPosition, nodes, 20, 10);

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          parameters: getDefaultParameters(type)
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, nodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex w-full h-full">
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChangeHandler}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionLineType="step"
          defaultEdgeOptions={{
            type: 'step',
            style: { strokeWidth: 2, stroke: '#374151' },
            animated: true
          }}
          fitView
        >
          <GridBackground gap={20} color="#e5e7eb" size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'breaker': return '#ef4444';
                case 'transformer': return '#3b82f6';
                case 'panel': return '#10b981';
                case 'load': return '#f59e0b';
                case 'motor': return '#8b5cf6';
                default: return '#6b7280';
              }
            }}
          />
        </ReactFlow>
      </div>
      <PropertiesPanel />
    </div>
  );
}

function getDefaultParameters(type) {
  switch (type) {
    case 'breaker':
      return { In: 100, Icu: 25000, tipo: 'molded_case' };
    case 'transformer':
      return { kVA: 500, primario: 13800, secundario: 480, Z: 5.75 };
    case 'panel':
      return { tension: 480, fases: 3 };
    case 'load':
      return { potencia_kW: 50, potencia_kVAR: 25, fp: 0.85, voltaje: 480 };
    case 'motor':
      return { hp: 75, voltaje: 480, eficiencia: 0.92, fp: 0.85 };
    default:
      return {};
  }
}

export default function EditorWithProvider() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
