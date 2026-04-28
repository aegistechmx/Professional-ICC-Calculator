import React, { useMemo } from 'react';

/**
 * HeatmapVisualization - Heatmap for voltage, current, and overload
 * 
 * Displays color-coded visualization of:
 * - Voltage levels (green = normal, yellow = marginal, red = critical)
 * - Current loading (green = normal, orange = high, red = overload)
 * - Overload conditions (red = critical)
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Simulation data
 * @param {string} props.type - Heatmap type ('voltage', 'current', 'overload')
 * @param {Object} props.style - Additional styles
 */
export default function HeatmapVisualization({ data, type = 'voltage', style = {} }) {
  const heatmapData = useMemo(() => {
    if (!data || !data.buses) return null;
    
    return data.buses.map((bus, index) => {
      const value = getHeatmapValue(bus, data, type, index);
      const color = getHeatmapColor(value, type);
      
      return {
        id: bus.id,
        value,
        color,
        position: bus.position || { x: 0, y: 0 }
      };
    });
  }, [data, type]);

  if (!heatmapData || heatmapData.length === 0) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500" style={style}>
        No data available for heatmap
      </div>
    );
  }

  return (
    <div className="heatmap-container" style={style}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {type} Heatmap
        </h3>
        <Legend type={type} />
      </div>
      
      <div className="relative" style={{ height: '400px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {heatmapData.map(point => (
          <HeatmapPoint
            key={point.id}
            point={point}
            type={type}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * HeatmapPoint - Individual heatmap point
 */
function HeatmapPoint({ point, type }) {
  const getPosition = () => {
    // Calculate position based on index if not provided
    if (point.position.x === 0 && point.position.y === 0) {
      const angle = (point.id.split('_')[1] || 0) * (2 * Math.PI / 10);
      const radius = 150;
      return {
        x: 200 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle)
      };
    }
    return point.position;
  };

  const position = getPosition();

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: point.color,
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
      title={`${point.id}: ${type} = ${point.value.toFixed(3)}`}
    >
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {point.id}: {type} = {point.value.toFixed(3)}
      </div>
    </div>
  );
}

/**
 * Legend - Heatmap legend
 */
function Legend({ type }) {
  const legendItems = getLegendItems(type);

  return (
    <div className="flex items-center gap-2">
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Get heatmap value based on type
 */
function getHeatmapValue(bus, data, type, index) {
  switch (type) {
    case 'voltage':
      return bus.voltage?.magnitude || bus.V_pu || 1.0;
    
    case 'current':
      // Get current from flows if available
      if (data.flows && data.flows[index]) {
        return data.flows[index].current || data.flows[index].I || 0;
      }
      return bus.current || 0;
    
    case 'overload':
      // Calculate loading percentage
      if (data.flows && data.flows[index]) {
        const current = data.flows[index].current || data.flows[index].I || 0;
        const rating = data.lines?.[index]?.rating || 100;
        return (current / rating) * 100;
      }
      return 0;
    
    default:
      return 0;
  }
}

/**
 * Get heatmap color based on value and type
 */
function getHeatmapColor(value, type) {
  switch (type) {
    case 'voltage':
      if (value < 0.90) return '#ef4444'; // Red - Critical
      if (value < 0.95) return '#f59e0b'; // Orange - Warning
      if (value > 1.10) return '#ef4444'; // Red - Critical
      if (value > 1.05) return '#f59e0b'; // Orange - Warning
      return '#22c55e'; // Green - Normal
    
    case 'current': {
      const loading = value;
      if (loading > 120) return '#ef4444'; // Red - Overload
      if (loading > 100) return '#f59e0b'; // Orange - High
      if (loading > 80) return '#eab308'; // Yellow - Moderate
      return '#22c55e'; // Green - Normal
    }
    
    case 'overload': {
      const overload = value;
      if (overload > 100) return '#ef4444'; // Red - Critical
      if (overload > 80) return '#f59e0b'; // Orange - Warning
      if (overload > 50) return '#eab308'; // Yellow - Moderate
      return '#22c55e'; // Green - Normal
    }
    
    default:
      return '#9ca3af'; // Gray
  }
}

/**
 * Get legend items based on type
 */
function getLegendItems(type) {
  switch (type) {
    case 'voltage':
      return [
        { color: '#ef4444', label: '< 0.90 / > 1.10' },
        { color: '#f59e0b', label: '0.90-0.95 / 1.05-1.10' },
        { color: '#22c55e', label: '0.95-1.05' }
      ];
    
    case 'current':
      return [
        { color: '#ef4444', label: '> 120%' },
        { color: '#f59e0b', label: '100-120%' },
        { color: '#eab308', label: '80-100%' },
        { color: '#22c55e', label: '< 80%' }
      ];
    
    case 'overload':
      return [
        { color: '#ef4444', label: '> 100%' },
        { color: '#f59e0b', label: '80-100%' },
        { color: '#eab308', label: '50-80%' },
        { color: '#22c55e', label: '< 50%' }
      ];
    
    default:
      return [];
  }
}

/**
 * AnimatedCurrentFlow - Animated current flow visualization
 */
export function AnimatedCurrentFlow({ data, currentTime = 0 }) {
  const flows = useMemo(() => {
    if (!data || !data.flows) return [];
    
    return data.flows.map((flow, index) => ({
      from: flow.from,
      to: flow.to,
      current: flow.current || flow.I || 0,
      direction: flow.direction || 1
    }));
  }, [data]);

  if (flows.length === 0) {
    return null;
  }

  return (
    <div className="animated-flow-container">
      {flows.map((flow, index) => (
        <FlowLine
          key={`${flow.from}-${flow.to}`}
          flow={flow}
          currentTime={currentTime}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

/**
 * FlowLine - Animated flow line
 */
function FlowLine({ flow, currentTime, delay }) {
  const offset = (currentTime + delay) % 1;
  
  return (
    <div
      className="flow-line"
      style={{
        position: 'absolute',
        height: '2px',
        background: `linear-gradient(90deg, 
          transparent 0%, 
          #3b82f6 ${offset * 100}%, 
          transparent ${offset * 100 + 20}%, 
          transparent 100%)`,
        backgroundSize: '200% 100%',
        animation: 'flowAnimation 2s linear infinite'
      }}
    />
  );
}

/**
 * TripIndicator - Visual trip indicator for protection devices
 */
export function TripIndicator({ devices, currentTime = 0 }) {
  const trippedDevices = useMemo(() => {
    if (!devices) return [];
    
    return devices.filter(device => {
      if (device.tripTime === undefined) return false;
      return device.tripTime <= currentTime && device.tripped;
    });
  }, [devices, currentTime]);

  if (trippedDevices.length === 0) {
    return null;
  }

  return (
    <div className="trip-indicator-container">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-semibold text-red-600">
          {trippedDevices.length} Device(s) Tripped
        </span>
      </div>
      
      {trippedDevices.map(device => (
        <div
          key={device.id}
          className="flex items-center gap-2 text-xs text-red-700"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>{device.id}</span>
          <span className="text-gray-500">
            (tripped at {device.tripTime.toFixed(3)}s)
          </span>
        </div>
      ))}
    </div>
  );
}
