import React, { useMemo } from 'react';

/**
 * TimelineVisualization - Visual timeline of events
 * 
 * Displays event sequence: Falla → Pickup → Trip → Estable
 * 
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of events
 * @param {number} props.currentTime - Current simulation time
 * @param {number} props.maxTime - Maximum timeline duration
 * @param {Object} props.style - Additional styles
 */
export default function TimelineVisualization({ events = [], currentTime = 0, maxTime = 5.0, style = {} }) {
  const processedEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return getDefaultEvents();
    }
    
    return events
      .map(event => ({
        ...event,
        type: event.type || event.eventType || 'INFO',
        normalizedTime: event.time || event.timestamp || 0
      }))
      .sort((a, b) => a.normalizedTime - b.normalizedTime);
  }, [events]);

  const eventMarkers = useMemo(() => {
    return processedEvents.map((event, index) => {
      const position = (event.normalizedTime / maxTime) * 100;
      const color = getEventColor(event.type);
      
      return {
        ...event,
        position,
        color,
        isPast: currentTime >= event.normalizedTime,
        isCurrent: Math.abs(currentTime - event.normalizedTime) < 0.05
      };
    });
  }, [processedEvents, currentTime, maxTime]);

  return (
    <div className="timeline-container" style={style}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Event Timeline
        </h3>
        <div className="text-sm text-gray-500">
          Time: {currentTime.toFixed(2)}s / {maxTime.toFixed(1)}s
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${(currentTime / maxTime) * 100}%` }}
          />
        </div>

        {/* Event markers */}
        <div className="relative mt-2">
          {eventMarkers.map((marker, index) => (
            <EventMarker
              key={index}
              marker={marker}
              index={index}
              maxTime={maxTime}
            />
          ))}
        </div>

        {/* Current time indicator */}
        <div
          className="absolute top-0 transform -translate-x-1/2"
          style={{
            left: `${(currentTime / maxTime) * 100}%`
          }}
        >
          <div className="w-1 h-8 bg-red-500"></div>
          <div className="w-3 h-3 bg-red-500 rounded-full -ml-1 -mt-1"></div>
        </div>
      </div>

      {/* Event legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-600">Falla</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-gray-600">Pickup</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-xs text-gray-600">Trip</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">Estable</span>
        </div>
      </div>

      {/* Event list */}
      <div className="mt-4 space-y-2">
        {eventMarkers.map((marker, index) => (
          <EventItem
            key={index}
            marker={marker}
            isActive={marker.isCurrent}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * EventMarker - Timeline event marker
 */
function EventMarker({ marker, index, maxTime }) {
  return (
    <div
      className="absolute transform -translate-x-1/2 cursor-pointer group"
      style={{
        left: `${marker.position}%`,
        top: '-8px'
      }}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125 ${
          marker.isPast ? marker.color : 'bg-gray-300'
        }`}
        style={{
          backgroundColor: marker.isPast ? marker.color : '#d1d5db'
        }}
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        <div className="font-semibold">{marker.type}</div>
        <div>{marker.description || marker.reason || marker.message || ''}</div>
        <div className="text-gray-300">{marker.normalizedTime.toFixed(3)}s</div>
      </div>
    </div>
  );
}

/**
 * EventItem - List item for event
 */
function EventItem({ marker, isActive }) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition ${
        isActive ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: marker.color }}
      />
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-800">{marker.type}</span>
          <span className="text-sm text-gray-500">{marker.normalizedTime.toFixed(3)}s</span>
        </div>
        <div className="text-sm text-gray-600">
          {marker.description || marker.reason || marker.message || ''}
        </div>
        {marker.device && (
          <div className="text-xs text-gray-400">Device: {marker.device}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Get event color based on type
 */
function getEventColor(type) {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('fault') || typeLower.includes('falla') || typeLower === 'fault_detected') {
    return '#ef4444'; // Red
  }
  
  if (typeLower.includes('pickup') || typeLower.includes('pickup')) {
    return '#eab308'; // Yellow
  }
  
  if (typeLower.includes('trip') || typeLower.includes('breaker') || typeLower.includes('relay_trip')) {
    return '#f97316'; // Orange
  }
  
  if (typeLower.includes('stable') || typeLower.includes('estable') || typeLower.includes('convergence')) {
    return '#22c55e'; // Green
  }
  
  return '#6b7280'; // Gray
}

/**
 * Get default events for demo
 */
function getDefaultEvents() {
  return [
    {
      type: 'FAULT_DETECTED',
      time: 0.0,
      description: 'Three-phase fault detected at Bus 3',
      device: 'Bus 3'
    },
    {
      type: 'RELAY_PICKUP',
      time: 0.12,
      description: 'Relay pickup condition met',
      device: 'Relay A'
    },
    {
      type: 'BREAKER_TRIP',
      time: 0.23,
      description: 'Breaker opened to clear fault',
      device: 'Breaker A'
    },
    {
      type: 'SYSTEM_STABLE',
      time: 0.40,
      description: 'System voltage restored to normal levels',
      device: 'System'
    }
  ];
}

/**
 * CompactTimeline - Compact timeline for small displays
 */
export function CompactTimeline({ events = [], currentTime = 0, maxTime = 5.0 }) {
  const processedEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return getDefaultEvents();
    }
    
    return events
      .map(event => ({
        ...event,
        type: event.type || event.eventType || 'INFO',
        normalizedTime: event.time || event.timestamp || 0
      }))
      .sort((a, b) => a.normalizedTime - b.normalizedTime);
  }, [events]);

  return (
    <div className="flex items-center gap-1">
      {processedEvents.map((event, index) => {
        const position = (event.normalizedTime / maxTime) * 100;
        const color = getEventColor(event.type);
        const isPast = currentTime >= event.normalizedTime;
        
        return (
          <div
            key={index}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isPast ? color : '#d1d5db',
              marginLeft: index > 0 ? `${position}%` : '0'
            }}
            title={`${event.type} at ${event.normalizedTime.toFixed(3)}s`}
          />
        );
      })}
    </div>
  );
}

/**
 * SequenceDiagram - Visual sequence diagram
 */
export function SequenceDiagram({ events = [], currentTime = 0 }) {
  const processedEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return getDefaultEvents();
    }
    
    return events
      .map(event => ({
        ...event,
        type: event.type || event.eventType || 'INFO',
        normalizedTime: event.time || event.timestamp || 0
      }))
      .sort((a, b) => a.normalizedTime - b.normalizedTime);
  }, [events]);

  return (
    <div className="sequence-diagram p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Event Sequence
      </h3>
      
      <div className="space-y-4">
        {processedEvents.map((event, index) => {
          const color = getEventColor(event.type);
          const isPast = currentTime >= event.normalizedTime;
          const isNext = index > 0 && currentTime < event.normalizedTime && 
                         currentTime >= processedEvents[index - 1].normalizedTime;
          
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="text-sm text-gray-500 w-16 text-right">
                {event.normalizedTime.toFixed(2)}s
              </div>
              
              <div className="flex-1 relative">
                {/* Timeline line */}
                {index < processedEvents.length - 1 && (
                  <div
                    className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200"
                    style={{ zIndex: 0 }}
                  />
                )}
                
                {/* Event point */}
                <div
                  className={`relative z-10 w-4 h-4 rounded-full border-2 border-white shadow ${
                    isPast ? color : isNext ? color + ' animate-pulse' : 'bg-gray-300'
                  }`}
                  style={{ backgroundColor: isPast || isNext ? color : '#d1d5db' }}
                />
              </div>
              
              <div className={`text-sm ${isPast ? 'text-gray-800' : isNext ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {event.type}
              </div>
              
              <div className={`text-xs ${isPast ? 'text-gray-600' : 'text-gray-400'} flex-1`}>
                {event.description || event.reason || event.message || ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
