/**
 * Advanced Visualization Utilities
 * Enhanced visual feedback for power system analysis
 */

import { calcTripTime } from './protection';
import { getVoltageColor as getVoltageColorUtil } from './voltageColor';

/**
 * Generate heat map data for voltage levels
 * @param {Array} buses - Bus data with voltages
 * @returns {Object} Heat map data
 */
export function generateVoltageHeatMap(buses) {
  return buses.map(bus => ({
    id: bus.id,
    value: bus.V_pu || 1.0,
    x: bus.position?.x || 0,
    y: bus.position?.y || 0,
    color: getVoltageColorUtil(bus.V_pu || 1.0),
    label: `${bus.id}: ${(bus.V_pu || 1.0).toFixed(3)} pu`
  }));
}

/**
 * Generate flow visualization data
 * @param {Array} flows - Flow data
 * @returns {Object} Flow visualization data
 */
export function generateFlowVisualization(flows) {
  const maxFlow = Math.max(...flows.map(f => Math.abs(f.P || 0)));
  
  return flows.map(flow => ({
    from: flow.from,
    to: flow.to,
    value: Math.abs(flow.P || 0),
    percentage: maxFlow > 0 ? (Math.abs(flow.P || 0) / maxFlow) * 100 : 0,
    direction: (flow.P || 0) >= 0 ? 'forward' : 'reverse',
    color: getFlowColor(Math.abs(flow.P || 0)),
    width: 2 + (maxFlow > 0 ? (Math.abs(flow.P || 0) / maxFlow) * 6 : 0)
  }));
}

/**
 * Generate protection coordination matrix
 * @param {Array} relays - Relay configurations
 * @param {Array} flows - Current flows
 * @returns {Object} Coordination matrix
 */
export function generateCoordinationMatrix(relays, flows) {
  const matrix = [];
  
  relays.forEach(relay1 => {
    const row = [];
    relays.forEach(relay2 => {
      if (relay1.id === relay2.id) {
        row.push({ status: 'self' });
      } else {
        // Check if relay2 is upstream of relay1
        const isUpstream = relay1.upstream === relay2.id;
        const isDownstream = relay2.upstream === relay1.id;
        
        if (isUpstream || isDownstream) {
          const flow1 = flows.find(f => f.from === relay1.bus);
          const flow2 = flows.find(f => f.from === relay2.bus);
          
          const t1 = flow1 ? calculateTripTimeHelper(flow1.IkA, relay1) : Infinity;
          const t2 = flow2 ? calculateTripTimeHelper(flow2.IkA, relay2) : Infinity;
          
          const margin = isUpstream ? t2 - t1 : t1 - t2;
          const coordinated = margin >= 0.3;
          
          row.push({
            status: coordinated ? 'coordinated' : 'not_coordinated',
            margin: margin,
            t1,
            t2
          });
        } else {
          row.push({ status: 'unrelated' });
        }
      }
    });
    matrix.push({ relay: relay1.id, row });
  });
  
  return matrix;
}

/**
 * Generate TCC curve data for plotting
 * @param {Object} relay - Relay configuration
 * @param {Object} options - Plot options
 * @returns {Object} TCC curve data
 */
export function generateTCCCurve(relay, options = {}) {
  const {
    maxCurrent = relay.pickup_kA * 20,
    points = 50,
    curveType = relay.curve || 'standard'
  } = options;
  
  const data = [];
  const stepFactor = Math.pow(maxCurrent / relay.pickup_kA, 1 / points);
  
  for (let i = 0; i < points; i++) {
    const current = relay.pickup_kA * Math.pow(stepFactor, i);
    const time = calculateTripTimeHelper(current, relay);
    
    if (time !== Infinity && time < 1000) {
      data.push({ current, time });
    }
  }
  
  return {
    relayId: relay.id,
    pickup_kA: relay.pickup_kA,
    TMS: relay.TMS,
    curveType,
    data
  };
}

/**
 * Generate multi-relay TCC comparison
 * @param {Array} relays - Relay configurations
 * @returns {Object} Multi-relay TCC data
 */
export function generateMultiRelayTCC(relays) {
  return relays.map(relay => generateTCCCurve(relay));
}

/**
 * Generate voltage profile along a path
 * @param {Array} buses - Bus data
 * @param {Array} path - Array of bus IDs in order
 * @returns {Object} Voltage profile data
 */
export function generateVoltageProfile(buses, path) {
  const profile = path.map(busId => {
    const bus = buses.find(b => b.id === busId);
    return {
      id: busId,
      voltage: bus?.V_pu || 1.0,
      angle: bus?.theta_deg || 0
    };
  });
  
  const minVoltage = Math.min(...profile.map(p => p.voltage));
  const maxVoltage = Math.max(...profile.map(p => p.voltage));
  const voltageDrop = profile[0].voltage - profile[profile.length - 1].voltage;
  
  return {
    profile,
    minVoltage,
    maxVoltage,
    voltageDrop,
    violations: profile.filter(p => p.voltage < 0.95 || p.voltage > 1.05)
  };
}

/**
 * Generate loading summary
 * @param {Array} buses - Bus data
 * @param {Array} flows - Flow data
 * @returns {Object} Loading summary
 */
export function generateLoadingSummary(buses, flows) {
  const totalLoad = buses.reduce((sum, b) => sum + (b.P_final_MW || 0), 0);
  const totalGeneration = buses.reduce((sum, b) => sum + Math.max(0, b.P_final_MW || 0), 0);
  
  const branchLoading = flows.map(flow => ({
    from: flow.from,
    to: flow.to,
    power: Math.abs(flow.P || 0),
    percentage: 50 // Would need thermal limit for actual percentage
  }));
  
  return {
    totalLoad,
    totalGeneration,
    netLoad: totalLoad - totalGeneration,
    branchLoading,
    heavilyLoaded: branchLoading.filter(b => b.percentage > 80)
  };
}

/**
 * Helper: Calculate trip time
 */
function calculateTripTimeHelper(current, relay) {
  return calcTripTime(current, relay);
}

/**
 * Helper: Get flow color
 */
function getFlowColor(flow) {
  if (flow < 0.5) return '#00cc00';
  if (flow < 1.0) return '#ffcc00';
  return '#ff0000';
}

/**
 * Generate dashboard data
 * @param {Object} simulationResult - Complete simulation result
 * @returns {Object} Dashboard visualization data
 */
export function generateDashboardData(simulationResult) {
  const { buses, flows, relays } = simulationResult;
  
  return {
    voltageHeatMap: generateVoltageHeatMap(buses),
    flowVisualization: generateFlowVisualization(flows),
    coordinationMatrix: relays ? generateCoordinationMatrix(relays, flows) : null,
    tccCurves: relays ? generateMultiRelayTCC(relays) : null,
    loadingSummary: generateLoadingSummary(buses, flows)
  };
}
