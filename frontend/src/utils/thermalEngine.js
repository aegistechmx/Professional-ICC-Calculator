/**
 * utils/thermalEngine.js - Motor de Heatmap Térmico en Tiempo Real
 * Sistema simplificado pero útil para cálculo térmico de conductores
 */

// === CÁLCULO TÉRMICO DE CONDUCTOR ===

export function calcularTemperaturaConductor(edge, results) {
  const I = edge.current || 0;
  
  // Capacidad del conductor (ampacidad) - desde backend o configuración
  const Imax = edge.Imax || edge.data?.ampacity || 200;
  
  // Parámetros térmicos típicos para conductores de cobre
  const Tamb = 30;     // Temperatura ambiente (°C)
  const Tmax = 90;     // Temperatura máxima del aislamiento (°C) - XLPE típico
  
  // Factor de carga (loading)
  const loading = I / Imax;
  
  // Temperatura estimada usando modelo simplificado
  // T = Tamb + (Tmax - Tamb) * (loading^2)
  // El cuadrado representa el calentamiento por I²R
  const T = Tamb + (Tmax - Tamb) * Math.pow(loading, 2);
  
  // Clamp loading para visualización (máximo 2x = 200% de carga)
  const clampedLoading = Math.min(loading, 2);
  
  return {
    T,                           // Temperatura estimada (°C)
    loading: clampedLoading,      // Factor de carga (0-2)
    current: I,                   // Corriente actual (A)
    Imax,                        // Corriente máxima (A)
    Tamb,                        // Temperatura ambiente (°C)
    Tmax,                        // Temperatura máxima (°C)
    // Estado térmico
    status: getThermalStatus(loading, T),
    // Porcentaje de capacidad térmica usada
    thermalCapacity: Math.min(100, (loading * 100)),
    // Tiempo estimado hasta sobrecarga (simplificado)
    timeToOverload: loading >= 1 ? 0 : Math.max(0, (1 - loading) * 3600) // horas
  };
}

// === ESTADO TÉRMICO ===

function getThermalStatus(loading, temperature) {
  if (loading < 0.5) return 'safe';
  if (loading < 0.8) return 'normal';
  if (loading < 1.0) return 'caution';
  if (loading < 1.2) return 'warning';
  if (loading < 1.5) return 'danger';
  return 'critical';
}

// === MAPEO DE COLOR HEATMAP (REAL) ===

export function getThermalColor(loading, temperature = null) {
  // Basado en estándares de color térmico industrial
  if (loading < 0.5) return '#00c853';      // Verde - circuito sano
  if (loading < 0.8) return '#ffd600';      // Amarillo - carga media
  if (loading < 1.0) return '#ff6d00';      // Naranja - diseño apretado
  if (loading < 1.2) return '#ff3d00';      // Rojo - peligro
  return '#d50000';                         // Rojo oscuro - sobrecarga crítica
}

// === COLOR CON GRADIENTE SUAVE ===

export function getThermalGradient(loading) {
  // Gradiente más suave para mejor visualización
  const colors = [
    { stop: 0.0, color: '#00c853' },   // Verde
    { stop: 0.5, color: '#ffd600' },   // Amarillo
    { stop: 0.8, color: '#ff6d00' },   // Naranja
    { stop: 1.0, color: '#ff3d00' },   // Rojo
    { stop: 1.2, color: '#d50000' }    // Rojo oscuro
  ];
  
  for (let i = 0; i < colors.length - 1; i++) {
    const current = colors[i];
    const next = colors[i + 1];
    
    if (loading >= current.stop && loading <= next.stop) {
      const progress = (loading - current.stop) / (next.stop - current.stop);
      return interpolateColor(current.color, next.color, progress);
    }
  }
  
  return colors[colors.length - 1].color;
}

// === INTERPOLACIÓN DE COLOR ===

function interpolateColor(color1, color2, progress) {
  // Convertir hex a RGB
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  // Interpolar
  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// === PULSO TÉRMICO (EFECTO "CONDUCTOR RESPIRANDO") ===

export function thermalPulse(time, loading, frequency = 0.005) {
  // Pulso más rápido con mayor carga
  const adjustedFrequency = frequency * (1 + loading);
  const amplitude = Math.min(2, loading * 1.5); // Amplitud proporcional a carga
  
  return Math.sin(time * adjustedFrequency + loading * 3) * amplitude;
}

// === RENDER DE EDGE TÉRMICO ===

export function drawThermalEdge(ctx, edge, thermal, time = 0) {
  const { x1, y1, x2, y2 } = edge;
  const color = getThermalColor(thermal.loading, thermal.T);
  const pulse = thermalPulse(time, thermal.loading);
  
  ctx.save();
  
  // Glow proporcional a la carga térmica
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 + thermal.loading * 25;
  
  // Línea principal con grosor variable
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + thermal.loading * 4 + pulse;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // Efecto de "respiración" para cargas altas
  if (thermal.loading > 0.8) {
    ctx.globalAlpha = 0.3 + Math.sin(time * 0.003) * 0.2;
    ctx.lineWidth = (3 + thermal.loading * 4) * 1.5;
    ctx.strokeStyle = getThermalGradient(thermal.loading);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  ctx.restore();
}

// === INDICADOR DE TEMPERATURA ===

export function drawTemperatureIndicator(ctx, x, y, thermal, size = 20) {
  const color = getThermalColor(thermal.loading, thermal.T);
  
  ctx.save();
  
  // Círculo principal
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fill();
  
  // Texto de temperatura
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(thermal.T)}°`, x, y);
  
  ctx.restore();
}

// === ACTUALIZACIÓN DE CAPA TÉRMICA ===

export function updateThermalLayer(edges, results, deltaTime = 0.016) {
  return edges.map(edge => {
    const thermal = calcularTemperaturaConductor(edge, results);
    
    // Inercia térmica (suavizado de cambios)
    if (edge.thermal) {
      const smoothingFactor = 0.1; // Suavizado 10%
      thermal.T = edge.thermal.T * (1 - smoothingFactor) + thermal.T * smoothingFactor;
      thermal.loading = edge.thermal.loading * (1 - smoothingFactor) + thermal.loading * smoothingFactor;
    }
    
    return {
      ...edge,
      thermal
    };
  });
}

// === ANÁLISIS TÉRMICO DEL SISTEMA ===

export function analyzeThermalSystem(edges) {
  const analysis = {
    totalEdges: edges.length,
    safeEdges: 0,
    normalEdges: 0,
    cautionEdges: 0,
    warningEdges: 0,
    dangerEdges: 0,
    criticalEdges: 0,
    averageLoading: 0,
    maxTemperature: 0,
    maxLoading: 0,
    overloadedEdges: []
  };
  
  let totalLoading = 0;
  
  edges.forEach(edge => {
    if (!edge.thermal) return;
    
    const { loading, T, status } = edge.thermal;
    
    totalLoading += loading;
    analysis.maxTemperature = Math.max(analysis.maxTemperature, T);
    analysis.maxLoading = Math.max(analysis.maxLoading, loading);
    
    // Contar por estado
    switch (status) {
      case 'safe': analysis.safeEdges++; break;
      case 'normal': analysis.normalEdges++; break;
      case 'caution': analysis.cautionEdges++; break;
      case 'warning': analysis.warningEdges++; break;
      case 'danger': analysis.dangerEdges++; break;
      case 'critical': 
        analysis.criticalEdges++;
        analysis.overloadedEdges.push(edge.id);
        break;
    }
  });
  
  analysis.averageLoading = edges.length > 0 ? totalLoading / edges.length : 0;
  
  // Calcular score de salud térmica (0-100)
  const statusWeights = {
    safe: 100,
    normal: 80,
    caution: 60,
    warning: 40,
    danger: 20,
    critical: 0
  };
  
  let totalScore = 0;
  let edgeCount = 0;
  
  edges.forEach(edge => {
    if (edge.thermal) {
      totalScore += statusWeights[edge.thermal.status] || 0;
      edgeCount++;
    }
  });
  
  analysis.thermalHealthScore = edgeCount > 0 ? totalScore / edgeCount : 100;
  
  return analysis;
}

// === SIMULACIÓN DE ENFRIAMIENTO ===

export function simulateCooling(thermal, ambientTemp = 30, deltaTime = 1) {
  // Constante de tiempo térmica (simplificada)
  const tau = 1800; // 30 minutos en segundos
  
  // Enfriamiento exponencial hacia temperatura ambiente
  const coolingRate = deltaTime / tau;
  
  return {
    ...thermal,
    T: thermal.T + (ambientTemp - thermal.T) * coolingRate,
    loading: Math.max(0, thermal.loading - coolingRate * 0.1) // Reducción gradual de carga
  };
}

// === ALERTAS TÉRMICAS ===

export function checkThermalAlerts(thermal) {
  const alerts = [];
  
  if (thermal.T > 85) {
    alerts.push({
      type: 'critical',
      message: `Temperatura crítica: ${thermal.T.toFixed(1)}°C`,
      threshold: 85
    });
  } else if (thermal.T > 75) {
    alerts.push({
      type: 'warning',
      message: `Temperatura elevada: ${thermal.T.toFixed(1)}°C`,
      threshold: 75
    });
  }
  
  if (thermal.loading > 1.2) {
    alerts.push({
      type: 'critical',
      message: `Sobrecarga severa: ${(thermal.loading * 100).toFixed(0)}%`,
      threshold: 120
    });
  } else if (thermal.loading > 1.0) {
    alerts.push({
      type: 'warning',
      message: `Sobrecarga: ${(thermal.loading * 100).toFixed(0)}%`,
      threshold: 100
    });
  }
  
  return alerts;
}

export default {
  calcularTemperaturaConductor,
  getThermalColor,
  getThermalGradient,
  thermalPulse,
  drawThermalEdge,
  drawTemperatureIndicator,
  updateThermalLayer,
  analyzeThermalSystem,
  simulateCooling,
  checkThermalAlerts
};
