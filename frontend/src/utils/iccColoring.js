/**
 * ICC Level Coloring Utilities
 * Provides color coding based on short-circuit current levels
 */

/**
 * Get ICC level classification
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {Object} Level info with color and classification
 */
export function getICCLevel(isc_kA) {
  if (!isc_kA || isc_kA <= 0) {
    return {
      level: 'unknown',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      textColor: '#1f2937',
      description: 'Sin datos',
      range: 'N/A'
    };
  }

  // ICC Level Classification (based on typical industrial systems)
  if (isc_kA < 1) {
    return {
      level: 'very_low',
      color: '#dc2626',
      bgColor: '#fee2e2',
      textColor: '#7f1d1d',
      description: 'Muy Bajo',
      range: '< 1 kA',
      warning: 'Corriente de falla muy baja - verificar parámetros'
    };
  } else if (isc_kA < 5) {
    return {
      level: 'low',
      color: '#ea580c',
      bgColor: '#fff7ed',
      textColor: '#92400e',
      description: 'Bajo',
      range: '1-5 kA',
      warning: 'Corriente de falla baja - posible subdimensionamiento'
    };
  } else if (isc_kA < 10) {
    return {
      level: 'normal',
      color: '#d97706',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      description: 'Normal',
      range: '5-10 kA',
      status: 'Adecuado para la mayoría de aplicaciones'
    };
  } else if (isc_kA < 25) {
    return {
      level: 'high',
      color: '#65a30d',
      bgColor: '#f0fdf4',
      textColor: '#14532d',
      description: 'Alto',
      range: '10-25 kA',
      status: 'Adecuado para sistemas industriales'
    };
  } else if (isc_kA < 42) {
    return {
      level: 'very_high',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      textColor: '#14532d',
      description: 'Muy Alto',
      range: '25-42 kA',
      status: 'Requiere breakers de alta capacidad'
    };
  } else {
    return {
      level: 'extreme',
      color: '#dc2626',
      bgColor: '#fee2e2',
      textColor: '#7f1d1d',
      description: 'Extremo',
      range: '> 42 kA',
      warning: 'Corriente de falla extremadamente alta - verificar equipamiento',
      critical: 'Peligro de arco flash - revisar PPE'
    };
  }
}

/**
 * Get ICC color for display
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {string} Hex color code
 */
export function getICCColor(isc_kA) {
  return getICCLevel(isc_kA).color;
}

/**
 * Get ICC background color for display
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {string} Hex background color code
 */
export function getICCBackgroundColor(isc_kA) {
  return getICCLevel(isc_kA).bgColor;
}

/**
 * Get ICC text color for contrast
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {string} Hex text color code
 */
export function getICCTextColor(isc_kA) {
  return getICCLevel(isc_kA).textColor;
}

/**
 * Get breaker recommendation based on ICC level
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {Object} Breaker recommendation
 */
export function getBreakerRecommendation(isc_kA) {
  const level = getICCLevel(isc_kA);
  
  // Minimum breaker rating should be 125% of available fault current
  const minRating = isc_kA * 1.25;
  
  // Standard breaker ratings (kA)
  const standardRatings = [0.5, 1, 2, 3, 5, 10, 15, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  
  // Find next standard rating
  const recommendedRating = standardRatings.find(rating => rating >= minRating) || standardRatings[standardRatings.length - 1];
  
  return {
    minRating: minRating,
    recommendedRating: recommendedRating,
    level: level.level,
    adequate: recommendedRating >= minRating,
    message: level.warning || level.status || 'Breaker adecuado para el nivel de corriente de falla'
  };
}

/**
 * Format ICC value with color coding
 * @param {number} isc_kA - Short circuit current in kA
 * @param {number} decimals - Number of decimal places
 * @returns {Object} Formatted value with styling
 */
export function formatICCWithColor(isc_kA, decimals = 2) {
  const level = getICCLevel(isc_kA);
  
  return {
    value: isc_kA.toFixed(decimals),
    unit: 'kA',
    level: level.level,
    style: {
      color: level.color,
      backgroundColor: level.bgColor,
      fontWeight: 'bold',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '12px',
      display: 'inline-block',
      border: `1px solid ${level.color}20`
    },
    levelInfo: level
  };
}

/**
 * Get arc flash risk level
 * @param {number} isc_kA - Short circuit current in kA
 * @returns {Object} Arc flash risk assessment
 */
export function getArcFlashRisk(isc_kA) {
  if (!isc_kA || isc_kA <= 0) {
    return { risk: 'unknown', description: 'Sin datos', color: '#6b7280' };
  }

  // Simplified arc flash risk based on incident energy
  if (isc_kA < 5) {
    return {
      risk: 'low',
      description: 'Bajo riesgo',
      color: '#16a34a',
      ppeCategory: '0',
      workingDistance: 'Seguro'
    };
  } else if (isc_kA < 15) {
    return {
      risk: 'moderate',
      description: 'Riesgo moderado',
      color: '#eab308',
      ppeCategory: '1-2',
      workingDistance: 'Mantenimiento'
    };
  } else if (isc_kA < 30) {
    return {
      risk: 'high',
      description: 'Alto riesgo',
      color: '#f59e0b',
      ppeCategory: '2-3',
      workingDistance: 'Precaución'
    };
  } else {
    return {
      risk: 'extreme',
      description: 'Riesgo extremo',
      color: '#dc2626',
      ppeCategory: '3-4',
      workingDistance: 'Solo personal autorizado'
    };
  }
}
