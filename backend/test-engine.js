// Test del motor de validación con caso P0 - Pipeline completo
const { validateFeeder } = require('./src/engine/validator');

console.log('🧪 Test caso P0 - Pipeline Completo (90°C calculado, 75°C terminal)\n');

const testCase = {
  material: 'Cu',
  size: 300,
  ambientC: 32,
  nConductors: 4,
  parallels: 3,
  terminalTempC: 75,
  I_base: 300,
  Fcc: 1.25,
  Icu_kA: 35,
  Isc_kA: 5.38,
  // Caída de tensión (opcional)
  voltageDrop: {
    V: 480,
    L: 100,
    R: 0.15,
    X: 0.08,
    fp: 0.85
  },
  // Coordinación TCC (opcional)
  coordination: {
    upstream: { pickup: 400, tms: 0.1 },
    downstream: { pickup: 200, tms: 0.05 }
  }
};

try {
  const result = validateFeeder(testCase);

  console.log('✅ Resultado:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n📊 Resumen:');
  console.log(`Estado global: ${result.ok ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
  console.log(`Ampacidad: ${result.ampacity.check.ok ? '✅' : '❌'} - ${result.ampacity.check.msg}`);
  console.log(`  I_tabla (90°C): ${result.ampacity.I_tabla} A`);
  console.log(`  I_corr: ${result.ampacity.I_corr.toFixed(1)} A`);
  console.log(`  I_terminal (75°C): ${result.ampacity.I_terminal} A`);
  console.log(`  I_final: ${result.ampacity.I_final.toFixed(1)} A`);
  console.log(`Interruptiva: ${result.interrupting.ok ? '✅' : '❌'} - ${result.interrupting.msg}`);

  if (result.voltageDrop) {
    console.log(`Caída de tensión: ${result.voltageDrop.check.ok ? '✅' : result.voltageDrop.check.level === 'LÍMITE' ? '⚠️' : '❌'} - ${result.voltageDrop.check.msg}`);
  }

  if (result.coordination) {
    console.log(`Coordinación TCC: ${result.coordination.coordinated ? '✅' : '❌'} - ${result.coordination.msg}`);
  }

  console.log(`Invariantes: ${Object.values(result.invariants).every(Boolean) ? '✅' : '❌'}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
