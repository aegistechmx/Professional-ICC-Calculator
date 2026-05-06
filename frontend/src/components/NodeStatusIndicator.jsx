/**
 * components/NodeStatusIndicator.jsx - Indicador de Semáforo para Nodos
 * Componente visual que muestra el status de cada nodo en tiempo real
 */

import React from 'react';
import { useNodeStatus } from './SimulationEngine.jsx';
import { useGraphStore } from '../store/graphStore.js';

export const NodeStatusIndicator = ({ nodeId, size = 12, showLabel = false }) => {
  const { status, color, isFault, isWarning, isNormal } = useNodeStatus(nodeId);
  const { nodes } = useGraphStore();
  
  const node = nodes.find(n => n.id === nodeId);
  const nodeLabel = node?.data?.label || nodeId;

  // Status colors and meanings
  const statusConfig = {
    gray: { color: '#94a3b8', label: 'Sin carga', icon: 'circle' },
    green: { color: '#22c55e', label: 'Normal', icon: 'check-circle' },
    yellow: { color: '#eab308', label: 'Precaución', icon: 'alert-triangle' },
    orange: { color: '#f97316', label: 'Breaker Trip', icon: 'alert-circle' },
    red: { color: '#ef4444', label: 'Falla/Sobrecarga', icon: 'x-circle' }
  };

  const config = statusConfig[status] || statusConfig.gray;

  // Animation classes based on status
  const getAnimationClass = () => {
    if (isFault) return 'animate-pulse';
    if (isWarning) return 'animate-bounce';
    return '';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div 
        className={`
          relative rounded-full transition-all duration-300
          ${getAnimationClass()}
          ${isFault ? 'ring-4 ring-red-200 ring-opacity-50' : ''}
          ${isWarning ? 'ring-2 ring-yellow-200 ring-opacity-50' : ''}
        `}
        style={{ 
          width: size, 
          height: size, 
          backgroundColor: color 
        }}
        title={`${config.label}: ${nodeLabel}`}
      >
        {/* Inner glow effect for active states */}
        {(isFault || isWarning) && (
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: color }}
          />
        )}
        
        {/* Center dot */}
        <div 
          className="absolute inset-1 rounded-full bg-white"
          style={{ opacity: isNormal ? 0.3 : 0.5 }}
        />
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className="text-xs font-medium text-gray-600">
          {nodeLabel}
        </span>
      )}
    </div>
  );
};

// === PANEL DE ESTADO DEL SISTEMA ===
export const SystemStatusPanel = () => {
  const { nodes, simulation } = useGraphStore();
  const nodeStatuses = simulation.status;

  // Count nodes by status
  const statusCounts = Object.values(nodeStatuses).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalNodes = nodes.length;
  const activeNodes = totalNodes - (statusCounts.gray || 0);
  const faultNodes = statusCounts.red || 0;
  const warningNodes = statusCounts.yellow || 0;
  const normalNodes = statusCounts.green || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Sistema</h3>
      
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{totalNodes}</div>
          <div className="text-xs text-gray-500">Total Nodos</div>
        </div>
        
        <div className="bg-green-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{normalNodes}</div>
          <div className="text-xs text-green-500">Normal</div>
        </div>
        
        <div className="bg-yellow-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{warningNodes}</div>
          <div className="text-xs text-yellow-500">Advertencia</div>
        </div>
        
        <div className="bg-red-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{faultNodes}</div>
          <div className="text-xs text-red-500">Falla</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Sistema Operativo</span>
          <span>{Math.round((activeNodes / totalNodes) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(activeNodes / totalNodes) * 100}%` }}
          />
        </div>
      </div>

      {/* Active fault indicator */}
      {simulation.fault && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-800">
              Falla activa en nodo: {nodes.find(n => n.id === simulation.fault)?.data?.label || simulation.fault}
            </span>
          </div>
        </div>
      )}

      {/* Breaker trips */}
      {simulation.breakerTrips.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-2">
          <div className="text-sm font-medium text-orange-800 mb-2">
            Breakers Tripados ({simulation.breakerTrips.length})
          </div>
          <div className="space-y-1">
            {simulation.breakerTrips.map(breakerId => {
              const breaker = nodes.find(n => n.id === breakerId);
              return (
                <div key={breakerId} className="text-xs text-orange-600">
                  {breaker?.data?.label || breakerId}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// === INDICADOR DE ESTADO PARA NODO INDIVIDUAL ===
export const NodeStatusBadge = ({ nodeId, className = "" }) => {
  const { status, color, isFault, isWarning } = useNodeStatus(nodeId);
  const { nodes } = useGraphStore();
  
  const node = nodes.find(n => n.id === nodeId);

  const statusConfig = {
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Inactivo' },
    green: { bg: 'bg-green-100', text: 'text-green-600', label: 'Normal' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Precaución' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Trip' },
    red: { bg: 'bg-red-100', text: 'text-red-600', label: 'Falla' }
  };

  const config = statusConfig[status] || statusConfig.gray;

  return (
    <div className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
      ${config.bg} ${config.text} ${className}
      ${isFault ? 'animate-pulse' : ''}
    `}>
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{config.label}</span>
      {node?.data?.label && (
        <span className="text-xs opacity-75">
          ({node.data.label})
        </span>
      )}
    </div>
  );
};

// === PANEL DE DETALLES DE NODO ===
export const NodeDetailsPanel = ({ nodeId }) => {
  const { status, color, isFault, isWarning, isNormal } = useNodeStatus(nodeId);
  const { nodes, results } = useGraphStore();
  
  const node = nodes.find(n => n.id === nodeId);
  const nodeResult = results?.nodos?.find(n => n.id === nodeId);

  if (!node) return null;

  const statusConfig = {
    gray: { label: 'Inactivo', description: 'Sin carga conectada' },
    green: { label: 'Normal', description: 'Operando dentro de parámetros normales' },
    yellow: { label: 'Precaución', description: 'Carga elevada o baja tensión' },
    orange: { label: 'Breaker Trip', description: 'Breaker ha operado por protección' },
    red: { label: 'Falla', description: 'Sobrecarga o condición de falla' }
  };

  const config = statusConfig[status] || statusConfig.gray;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {node.data?.label || node.id}
        </h3>
        <NodeStatusBadge nodeId={nodeId} />
      </div>

      {/* Status details */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-gray-700">{config.label}</span>
        </div>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>

      {/* Electrical parameters */}
      {nodeResult && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Parámetros Eléctricos</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Corriente:</span>
              <span className="ml-2 font-medium">
                {nodeResult.I?.toFixed(2) || '0'} A
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Voltaje:</span>
              <span className="ml-2 font-medium">
                {nodeResult.V?.toFixed(1) || '0'} V
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Potencia:</span>
              <span className="ml-2 font-medium">
                {nodeResult.P?.toFixed(1) || '0'} kW
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Factor:</span>
              <span className="ml-2 font-medium">
                {nodeResult.pf?.toFixed(3) || '0'}
              </span>
            </div>
          </div>

          {/* Load percentage */}
          {node.data?.I_nominal && nodeResult?.I && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Carga</span>
                <span>{Math.round((nodeResult.I / node.data.I_nominal) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isFault ? 'bg-red-500' : 
                    isWarning ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (nodeResult.I / node.data.I_nominal) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Node type info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <span>Tipo: </span>
          <span className="font-medium text-gray-700 capitalize">
            {node.type || 'desconocido'}
          </span>
        </div>
        
        {node.data?.voltaje && (
          <div className="text-sm text-gray-500 mt-1">
            <span>Voltaje Nominal: </span>
            <span className="font-medium text-gray-700">
              {node.data.voltaje} V
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeStatusIndicator;
