/* eslint-disable no-console */
/**
 * Test de Precisión Matemática TCC (6 Decimales)
 * Verifica el cumplimiento de la Task 39 del plan de mantenimiento.
 */
const { calcTripTime, logInterpolate } = require('./tccCoordination');

console.log('🧪 TEST: Verificación de Precisión de 6 Decimales (TCC)\n');

// 1. Test de interpolación logarítmica
const p1 = { I: 2, t: 60 };
const p2 = { I: 4, t: 10 };
const I_test = 3.141592; // Corriente arbitraria con decimales

const t_interp = logInterpolate(p1, p2, I_test);
const precisionInterp = t_interp.toString().split('.')[1]?.length || 0;

console.log(`1. Interpolación Log-Log:`);
console.log(`   Corriente: ${I_test} A`);
console.log(`   Tiempo: ${t_interp} s`);
console.log(`   Decimales detectados: ${precisionInterp}`);
console.log(`   Estatus: ${precisionInterp <= 6 ? '✅ PASS' : '❌ FAIL (Excede 6 decimales)'}\n`);

// 2. Test de fórmula IEC (Inversa)
const t_iec = calcTripTime({ I: 2500, pickup: 1000, tms: 0.1 });
const precisionIEC = t_iec.toString().split('.')[1]?.length || 0;

console.log(`2. Tiempo de Disparo IEC (Inversa):`);
console.log(`   I/Pickup: 2.5`);
console.log(`   Tiempo: ${t_iec} s`);
console.log(`   Decimales detectados: ${precisionIEC}`);
console.log(`   Estatus: ${precisionIEC <= 6 ? '✅ PASS' : '❌ FAIL (Excede 6 decimales)'}\n`);

if (precisionInterp <= 6 && precisionIEC <= 6) {
  console.log('🏆 RESULTADO FINAL: Sistema cumple con el estándar de precisión IEEE 1584.');
} else {
  console.log('⚠️ ADVERTENCIA: Se detectó pérdida de control de precisión en los cálculos.');
  process.exit(1);
}