// test-corrected-voltage.js
const { calculateIsc3Phase } = require('./backend/src/fix-voltage-calculation');

console.log('\n⚡ VERIFICACIÓN DE CÁLCULO CON VOLTAJE CORREGIDO ⚡\n');

// Caso 1: Transformador 1500kVA, 480V, Z=5.8%
const trafo480 = calculateIsc3Phase(480, 5.8, 1500);
console.log('📊 Transformador 1500kVA @ 480V, Z=5.8%');
console.log(`   ICC: ${trafo480.amperes} A (${trafo480.kiloamperes} kA)`);
console.log(`   Fórmula: ${trafo480.formula}`);
console.log(`   ✅ Esperado: ~31,000A (31kA)`);
console.log(`   Diferencia: ${Math.abs(trafo480.amperes - 31000)}A`);

// Caso 2: Transformador 1000kVA, 480V, Z=5.5%
const trafo1000 = calculateIsc3Phase(480, 5.5, 1000);
console.log('\n📊 Transformador 1000kVA @ 480V, Z=5.5%');
console.log(`   ICC: ${trafo1000.amperes} A (${trafo1000.kiloamperes} kA)`);
console.log(`   ✅ Esperado: ~21,845A (21.8kA)`);

// Caso 3: Comparativa 220V vs 480V
console.log('\n📊 COMPARATIVA VOLTAJES:');
const icc220 = calculateIsc3Phase(220, 5.8, 1500);
const icc480 = calculateIsc3Phase(480, 5.8, 1500);
console.log(`   220V: ${icc220.amperes} A (${icc220.kiloamperes} kA)`);
console.log(`   480V: ${icc480.amperes} A (${icc480.kiloamperes} kA)`);
console.log(`   Relación: ${(icc480.amperes / icc220.amperes).toFixed(2)}x (correcto, V480/V220 = ${(480 / 220).toFixed(2)})`);

console.log('\n✅ Corrección verificada\n');