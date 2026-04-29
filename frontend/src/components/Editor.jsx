import React, { useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  addEdge,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'

import BreakerNode from './nodes/BreakerNode'
import TransformerNode from './nodes/TransformerNode'
import PanelNode from './nodes/PanelNode'
import LoadNode from './nodes/LoadNode'
import MotorNode from './nodes/MotorNode'
import GeneratorNode from './nodes/GeneratorNode'
import ATSNode from './nodes/ATSNode'
import PropertiesPanel from './PropertiesPanel'
import GridBackground from './GridBackground'
import { useStore } from '../store/useStore'
import { snap } from '../utils/snap'
import { validateConnection } from '../utils/validation'
import CableEdge from './edges/CableEdge'

const nodeTypes = {
  breaker: BreakerNode,
  transformer: TransformerNode,
  panel: PanelNode,
  load: LoadNode,
  motor: MotorNode,
  generator: GeneratorNode,
  ats: ATSNode,
}

const edgeTypes = {
  cable: CableEdge,
}

function Editor() {
  const reactFlowWrapper = useRef(null)
  const {
    getNodes,
    getEdges,
    setNodes: setReactFlowNodes,
    setEdges: setReactFlowEdges,
  } = useReactFlow()
  const setNodesStore = useStore(state => state.setNodes)
  const setEdgesStore = useStore(state => state.setEdges)
  const setSelectedNode = useStore(state => state.setSelectedNode)
  const setSelectedEdge = useStore(state => state.setSelectedEdge)
  const storeNodes = useStore(state => state.nodes)
  const storeEdges = useStore(state => state.edges)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Función para eliminar elementos seleccionados
  const deleteSelected = useCallback(() => {
    const selectedNodes = getNodes().filter(node => node.selected)
    const selectedEdges = getEdges().filter(edge => edge.selected)

    if (selectedNodes.length === 0 && selectedEdges.length === 0) return

    // Confirmación con más detalles
    const nodeNames = selectedNodes.map(n => n.data?.label || n.type).join(', ')
    const message = `¿Eliminar ${selectedNodes.length} nodo(s)${nodeNames ? ': ' + nodeNames : ''} y ${selectedEdges.length} conexión(es)?\n\nEsta acción no se puede deshacer.`
    if (!confirm(message)) return

    // Eliminar nodos seleccionados
    setReactFlowNodes(nodes => nodes.filter(node => !node.selected))

    // Eliminar edges seleccionados
    setReactFlowEdges(edges => edges.filter(edge => !edge.selected))

    // Limpiar selecciones
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [
    getNodes,
    getEdges,
    setReactFlowNodes,
    setReactFlowEdges,
    setSelectedNode,
    setSelectedEdge,
  ])

  // Escuchar tecla DELETE
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected])

  // Keep Zustand store in sync with real React Flow state
  // Use refs to track last synced state and prevent circular updates
  const lastSyncedNodes = useRef(null)
  const lastSyncedEdges = useRef(null)

  // Helper to compare nodes/edges by content (not reference)
  const nodesEqual = (a, b) => {
    if (a === b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    return a.every(
      (node, i) =>
        node.id === b[i]?.id &&
        JSON.stringify(node.data) === JSON.stringify(b[i]?.data) &&
        node.position?.x === b[i]?.position?.x &&
        node.position?.y === b[i]?.position?.y
    )
  }

  const edgesEqual = (a, b) => {
    if (a === b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    return a.every(
      (edge, i) =>
        edge.id === b[i]?.id &&
        edge.source === b[i]?.source &&
        edge.target === b[i]?.target &&
        JSON.stringify(edge.data) === JSON.stringify(b[i]?.data)
    )
  }

  // Sync React Flow -> Store (only when nodes actually change)
  useEffect(() => {
    if (!nodesEqual(nodes, lastSyncedNodes.current)) {
      lastSyncedNodes.current = nodes
      setNodesStore(nodes)
    }
  }, [nodes, setNodesStore])

  useEffect(() => {
    if (!edgesEqual(edges, lastSyncedEdges.current)) {
      lastSyncedEdges.current = edges
      setEdgesStore(edges)
    }
  }, [edges, setEdgesStore])

  // Sync Store -> React Flow (only when store data actually changes)
  useEffect(() => {
    if (
      Array.isArray(storeNodes) &&
      !nodesEqual(storeNodes, lastSyncedNodes.current)
    ) {
      lastSyncedNodes.current = storeNodes
      setNodes(storeNodes)
    }
  }, [storeNodes, setNodes])

  useEffect(() => {
    if (
      Array.isArray(storeEdges) &&
      !edgesEqual(storeEdges, lastSyncedEdges.current)
    ) {
      lastSyncedEdges.current = storeEdges
      setEdges(storeEdges)
    }
  }, [storeEdges, setEdges])

  const onConnect = useCallback(
    params => {
      const sourceNode = nodes.find(n => n.id === params.source)
      const targetNode = nodes.find(n => n.id === params.target)

      if (sourceNode && targetNode) {
        // Validate connection
        if (!validateConnection(sourceNode.type, targetNode.type)) {
          // Show user-friendly error message
          alert(
            `Conexión inválida: No se puede conectar ${sourceNode.type} → ${targetNode.type}\n\nConexiones permitidas:\n• Transformador/Generador → Panel/Breaker\n• Panel → Panel/Breaker/Carga/Motor\n• Breaker → Panel/Carga/Motor`
          )
          return
        }
      }

      setEdges(eds =>
        addEdge(
          {
            ...params,
            type: 'cable',
            data: {
              material: 'cobre',
              calibre: '350',
              canalizacion: 'pvc',
              longitud: 10,
              paralelo: 1,
              temp: 30,
              numConductores: 3,
            },
            animated: false,
            style: { stroke: '#374151', strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [nodes, setEdges]
  )

  const onNodesChangeHandler = useCallback(
    changes => {
      onNodesChange(changes)
    },
    [onNodesChange]
  )

  const onEdgesChangeHandler = useCallback(
    changes => {
      onEdgesChange(changes)
    },
    [onEdgesChange]
  )

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node)
      setSelectedEdge(null)
    },
    [setSelectedNode, setSelectedEdge]
  )

  const onEdgeClick = useCallback(
    (event, edge) => {
      setSelectedEdge(edge)
      setSelectedNode(null)
    },
    [setSelectedEdge, setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [setSelectedNode, setSelectedEdge])

  // Export to calculator function
  const exportToCalculator = useCallback(() => {
    const graphData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.data,
      })),
    }

    // Debug: verificar datos antes de exportar

    // Validar que haya datos
    if (graphData.nodes.length === 0 && graphData.edges.length === 0) {
      alert('⚠️ No hay datos para exportar. Agrega nodos y conexiones primero.')
      return
    }

    // Open calculator with data - usar origin dinámico
    const baseUrl = window.location.origin
    const calculatorUrl = `${baseUrl}/cortocircuito/index.html?data=${encodeURIComponent(JSON.stringify(graphData))}`
    window.open(calculatorUrl, '_blank')
  }, [nodes, edges])

  const onDrop = useCallback(
    event => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')

      if (!type) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()

      const rawPosition = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      // Snap to grid and other nodes
      const position = snap(rawPosition, nodes, 20, 10)

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          parameters: getDefaultParameters(type),
        },
      }

      // Explicitly persist position to state
      const updatedNodes = nodes.concat(newNode)
      setNodes(updatedNodes)
      // Sync to Zustand store after render
      setTimeout(() => setNodesStore(updatedNodes), 0)
    },
    [setNodes, nodes, setNodesStore]
  )

  const onDragOver = useCallback(event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

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
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <MiniMap
            nodeColor={node => {
              switch (node.type) {
                case 'breaker':
                  return '#ef4444'
                case 'transformer':
                  return '#3b82f6'
                case 'panel':
                  return '#10b981'
                case 'load':
                  return '#f59e0b'
                case 'motor':
                  return '#8b5cf6'
                default:
                  return '#6b7280'
              }
            }}
          />
          <Controls />
          <GridBackground />
        </ReactFlow>
      </div>
      <PropertiesPanel />

      {/* Export button */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={exportToCalculator}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Exportar a Calculadora
        </button>
      </div>
    </div>
  )
}

function getDefaultParameters(type) {
  switch (type) {
    case 'breaker': {
      return { In: 100, Icu: 25000, tipo: 'molded_case' }
    }
    case 'transformer': {
      return { kVA: 500, primario: 13800, secundario: 480, Z: 5.75 }
    }
    case 'panel': {
      return { tension: 480, fases: 3 }
    }
    case 'load': {
      return { potencia_kW: 50, potencia_kVAR: 25, fp: 0.85, voltaje: 480 }
    }
    case 'motor': {
      return { hp: 75, voltaje: 480, eficiencia: 0.92, fp: 0.85 }
    }
    case 'generator': {
      return { kVA: 100, voltaje: 480, fp: 0.8, Xd: 0.15 }
    }
    case 'ats': {
      return { mode: 'normal', transferTime: 10 }
    }
    default: {
      return {}
    }
  }
}

Editor.propTypes = {
  // No props - uses Zustand store
}

export default function EditorWithProvider() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}
