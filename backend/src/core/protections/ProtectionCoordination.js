/**
 * ProtectionCoordination - Protection coordination analysis
 * 
 * Implements protection coordination logic for selective tripping:
 * - Time-current coordination between protection devices
 * - Selectivity analysis
 * - Auto-adjustment of protection settings
 * - Cascade coordination (multi-level systems)
 */

const { calculateOperatingTime, generateTCCCurve, compareCurves } = require('./TCCCurves');

/**
 * Protection device class
 */
class ProtectionDevice {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || `Protection ${data.id}`;
    this.busId = data.busId;
    this.type = data.type || 'breaker'; // breaker, relay, fuse
    this.pickup = data.pickup || 100; // A
    this.tms = data.tms || 0.1; // Time multiplier setting
    this.curveType = data.curveType || 'standard';
    this.standard = data.standard || 'iec';
    this.breakerRating = data.breakerRating || 25000; // A
    this.position = data.position || 'downstream'; // upstream or downstream
    this.level = data.level || 1; // Coordination level (1 = closest to load)
  }
  
  /**
   * Get operating time for a given current
   */
  getOperatingTime(current) {
    return calculateOperatingTime({
      pickup: this.pickup,
      current,
      tms: this.tms,
      curveType: this.curveType,
      standard: this.standard
    });
  }
  
  /**
   * Generate TCC curve for this device
   */
  generateCurve(I_min, I_max, points) {
    return generateTCCCurve({
      pickup: this.pickup,
      tms: this.tms,
      curveType: this.curveType,
      standard: this.standard,
      I_min,
      I_max,
      points
    });
  }
  
  /**
   * Check if current exceeds pickup
   */
  isAbovePickup(current) {
    return current > this.pickup;
  }
  
  /**
   * Check if current exceeds breaker rating
   */
  exceedsRating(current) {
    return current > this.breakerRating;
  }
}

/**
 * Analyze coordination between two protection devices
 * @param {ProtectionDevice} upstream - Upstream device
 * @param {ProtectionDevice} downstream - Downstream device
 * @param {Object} options - Analysis options
 * @returns {Object} Coordination analysis result
 */
function analyzeCoordination(upstream, downstream, options = {}) {
  const {
    faultCurrents = [downstream.pickup * 2, downstream.pickup * 10, downstream.pickup * 20],
    coordinationMargin = 0.2, // 20% margin
    checkPoints = 50
  } = options;
  
  const results = [];
  let coordinated = true;
  let minMargin = Infinity;
  
  // Check coordination at each fault current
  faultCurrents.forEach(current => {
    const t_upstream = upstream.getOperatingTime(current);
    const t_downstream = downstream.getOperatingTime(current);
    
    const margin = (t_upstream - t_downstream) / t_downstream;
    
    if (margin < coordinationMargin) {
      coordinated = false;
    }
    
    minMargin = Math.min(minMargin, margin);
    
    results.push({
      current,
      upstreamTime: t_upstream,
      downstreamTime: t_downstream,
      margin,
      coordinated: margin >= coordinationMargin
    });
  });
  
  // Generate full TCC curves for visualization
  const I_min = Math.min(upstream.pickup, downstream.pickup) * 1.1;
  const I_max = Math.max(upstream.breakerRating, downstream.breakerRating);
  
  const upstreamCurve = upstream.generateCurve(I_min, I_max, checkPoints);
  const downstreamCurve = downstream.generateCurve(I_min, I_max, checkPoints);
  
  return {
    coordinated,
    minMargin,
    requiredMargin: coordinationMargin,
    results,
    curves: {
      upstream: upstreamCurve,
      downstream: downstreamCurve
    },
    recommendation: coordinated 
      ? 'Devices are properly coordinated' 
      : `Adjust upstream TMS to achieve ${coordinationMargin * 100}% margin`
  };
}

/**
 * Analyze cascade coordination (multi-level protection system)
 * @param {Array} devices - Array of ProtectionDevice sorted by level
 * @param {Object} options - Analysis options
 * @returns {Object} Cascade coordination analysis
 */
function analyzeCascadeCoordination(devices, options = {}) {
  const {
    faultCurrents = [1000, 5000, 10000, 20000],
    coordinationMargin = 0.2
  } = options;
  
  // Sort devices by level (1 = closest to load, highest number = source)
  const sortedDevices = [...devices].sort((a, b) => b.level - a.level);
  
  if (sortedDevices.length < 2) {
    return {
      error: 'At least 2 devices required for cascade analysis'
    };
  }
  
  const coordinationResults = [];
  let overallCoordinated = true;
  
  // Analyze each adjacent pair
  for (let i = 0; i < sortedDevices.length - 1; i++) {
    const upstream = sortedDevices[i];
    const downstream = sortedDevices[i + 1];
    
    const result = analyzeCoordination(upstream, downstream, {
      faultCurrents,
      coordinationMargin
    });
    
    coordinationResults.push({
      pair: `${upstream.name} (${upstream.level}) -> ${downstream.name} (${downstream.level})`,
      ...result
    });
    
    if (!result.coordinated) {
      overallCoordinated = false;
    }
  }
  
  // Calculate selectivity matrix
  const selectivityMatrix = buildSelectivityMatrix(sortedDevices, faultCurrents);
  
  return {
    overallCoordinated,
    coordinationResults,
    selectivityMatrix,
    recommendation: overallCoordinated
      ? 'Cascade is properly coordinated'
      : 'Adjust TMS settings to achieve proper coordination'
  };
}

/**
 * Build selectivity matrix for protection devices
 * Shows which device trips first at each current level
 */
function buildSelectivityMatrix(devices, faultCurrents) {
  const matrix = [];
  
  faultCurrents.forEach(current => {
    const tripTimes = devices.map(device => ({
      device: device.name,
      time: device.getOperatingTime(current),
      level: device.level
    }));
    
    // Sort by trip time (fastest first)
    tripTimes.sort((a, b) => a.time - b.time);
    
    matrix.push({
      current,
      tripOrder: tripTimes.map(t => t.device),
      fastestTrip: tripTimes[0]?.device,
      fastestTime: tripTimes[0]?.time
    });
  });
  
  return matrix;
}

/**
 * Auto-adjust protection settings for coordination
 * @param {Array} devices - Array of ProtectionDevice
 * @param {Object} options - Adjustment options
 * @returns {Object} Adjusted settings
 */
function autoAdjustSettings(devices, options = {}) {
  const {
    faultCurrent = 10000,
    coordinationMargin = 0.2,
    maxTMS = 1.0,
    minTMS = 0.05
  } = options;
  
  // Sort by level (highest = source)
  const sortedDevices = [...devices].sort((a, b) => b.level - a.level);
  
  const adjustedSettings = [];
  
  // Start from downstream and work upstream
  for (let i = sortedDevices.length - 1; i >= 0; i--) {
    const device = sortedDevices[i];
    
    if (i === sortedDevices.length - 1) {
      // Downmost device - keep current settings
      adjustedSettings.push({
        device: device.name,
        pickup: device.pickup,
        tms: device.tms,
        adjusted: false
      });
    } else {
      // Calculate required TMS for coordination with downstream
      const downstream = sortedDevices[i + 1];
      const t_downstream = downstream.getOperatingTime(faultCurrent);
      const t_required = t_downstream * (1 + coordinationMargin);
      
      // Calculate current operating time at TMS=1
      const t_ref = calculateOperatingTime({
        pickup: device.pickup,
        current: faultCurrent,
        tms: 1,
        curveType: device.curveType,
        standard: device.standard
      });
      
      // Calculate required TMS
      let tms_required = t_required / t_ref;
      
      // Clamp to limits
      tms_required = Math.max(minTMS, Math.min(maxTMS, tms_required));
      
      adjustedSettings.push({
        device: device.name,
        pickup: device.pickup,
        tms: device.tms,
        newTMS: tms_required,
        adjusted: Math.abs(tms_required - device.tms) > 0.01
      });
    }
  }
  
  return {
    faultCurrent,
    coordinationMargin,
    adjustedSettings,
    summary: {
      totalDevices: devices.length,
      adjustedCount: adjustedSettings.filter(s => s.adjusted).length
    }
  };
}

/**
 * Evaluate protection selectivity for a fault
 * @param {Array} devices - Array of ProtectionDevice
 * @param {number} faultCurrent - Fault current in amps
 * @returns {Object} Selectivity analysis
 */
function evaluateSelectivity(devices, faultCurrent) {
  const tripTimes = devices.map(device => ({
    device: device.name,
    time: device.getOperatingTime(faultCurrent),
    abovePickup: device.isAbovePickup(faultCurrent),
    exceedsRating: device.exceedsRating(faultCurrent),
    level: device.level
  }));
  
  // Filter devices that see the fault
  const activeDevices = tripTimes.filter(t => t.abovePickup);
  
  if (activeDevices.length === 0) {
    return {
      faultCurrent,
      tripping: false,
      message: 'No device sees the fault (current below all pickups)'
    };
  }
  
  // Sort by trip time
  activeDevices.sort((a, b) => a.time - b.time);
  
  const fastest = activeDevices[0];
  const coordinated = activeDevices.length > 1 
    ? (activeDevices[1].time - fastest.time) / fastest.time > 0.2
    : true;
  
  return {
    faultCurrent,
    tripping: true,
    fastestTrip: fastest.device,
    fastestTime: fastest.time,
    allTripTimes: activeDevices,
    coordinated,
    selectivity: coordinated ? 'selective' : 'non-selective'
  };
}

/**
 * Generate coordination report
 * @param {Object} analysis - Coordination analysis result
 * @returns {Object} Formatted report
 */
function generateCoordinationReport(analysis) {
  const {
    overallCoordinated,
    coordinationResults,
    selectivityMatrix
  } = analysis;
  
  return {
    summary: {
      status: overallCoordinated ? 'COORDINATED' : 'NOT COORDINATED',
      totalPairs: coordinationResults.length,
      coordinatedPairs: coordinationResults.filter(r => r.coordinated).length
    },
    pairs: coordinationResults.map(r => ({
      devices: r.pair,
      status: r.coordinated ? 'OK' : 'FAIL',
      minMargin: `${(r.minMargin * 100).toFixed(1)}%`,
      recommendation: r.recommendation
    })),
    selectivity: selectivityMatrix.map(m => ({
      current: m.current,
      fastestTrip: m.fastestTrip,
      tripTime: `${m.fastestTime.toFixed(3)}s`,
      tripOrder: m.tripOrder.join(' > ')
    }))
  };
}

module.exports = {
  ProtectionDevice,
  analyzeCoordination,
  analyzeCascadeCoordination,
  buildSelectivityMatrix,
  autoAdjustSettings,
  evaluateSelectivity,
  generateCoordinationReport
};
