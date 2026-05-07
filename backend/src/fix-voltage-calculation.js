// backend/src/fix-voltage-calculation.js
// Fórmula CORRECTA para ICC trifásico según IEEE 1584

function calculateIsc3Phase(voltage, impedancePercent, kVA) {
  const V = voltage || 480;  // Default a 480V si no hay dato
  const Z = impedancePercent / 100;  // Convertir porcentaje a decimal
  const Isc = V / (Math.sqrt(3) * Z);  // En amperes

  // Siempre retornar el valor calculado, sin importar si hay kVA o no
  let Icc_final = Isc;
  let method = 'simple_icc';

  // Validación adicional con método de kVA si está disponible
  if (kVA) {
    const I_fl = (kVA * 1000) / (V * Math.sqrt(3));  // Corriente plena de carga
    const Isc_kva = I_fl / Z;  // ICC basado en kVA
    Icc_final = Math.min(Isc, Isc_kva);  // Usar el valor más conservador
    method = 'conservative_icc_with_kva_validation';
  }

  return {
    amperes: Math.round(Icc_final),
    kiloamperes: (Icc_final / 1000).toFixed(3),
    formula: kVA ?
      'Isc = min[V/(√3×Z), (kVA×1000)/(V×√3×Z)]' :
      'Isc = V/(√3×Z)',
    method: method
  };
}

module.exports = {
  calculateIsc3Phase
};
